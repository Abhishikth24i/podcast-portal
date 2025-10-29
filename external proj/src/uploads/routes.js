import express from "express";
import busboy from "busboy";
import { nanoid } from "nanoid";
import { config } from "../config.js";
import { getBucket } from "../db.js";
import mime from "mime-types";

const router = express.Router();

router.post("/audio", async (req, res, next) => {
  const contentType = req.headers["content-type"] || "";
  if (!contentType.toLowerCase().includes("multipart/form-data")) {
    return res.status(415).json({ message: "Content-Type must be multipart/form-data with a file field 'audio'" });
  }
  const bb = busboy({ headers: req.headers, limits: { fileSize: config.maxFileSizeBytes, files: 1, fields: 10 } });

  let title = null;
  let description = null;
  let responded = false;
  let fileReceived = false;

  function fail(status, message) {
    if (!responded) {
      responded = true;
      res.status(status).json({ message });
    }
  }

  bb.on("field", (name, val) => {
    if (name === "title") title = val;
    if (name === "description") description = val;
  });

  bb.on("file", (name, file, info) => {
    if (name !== "audio") {
      // Ignore unexpected file fields
      file.resume();
      return;
    }
    fileReceived = true;
    const { filename: originalName, mimeType } = info;
    let effectiveType = mimeType || "";
    // Accept common generic type and infer from filename when needed
    if (!effectiveType || effectiveType === "application/octet-stream" || !config.allowedMimeTypes.includes(effectiveType)) {
      const inferred = mime.lookup(originalName) || "";
      if (inferred && config.allowedMimeTypes.includes(inferred)) {
        effectiveType = inferred;
      }
    }
    if (!effectiveType || !config.allowedMimeTypes.includes(effectiveType)) {
      file.resume();
      return fail(400, "Unsupported audio type");
    }

    const safeBase = (originalName || "upload").replace(/[^a-zA-Z0-9-_\.]+/g, "_");
    const filename = `${Date.now()}-${nanoid(6)}-${safeBase}`;
    const bucket = getBucket();
    const uploadStream = bucket.openUploadStream(filename, {
      contentType: effectiveType,
      metadata: { originalName, title, description },
    });

    file.on("limit", () => {
      uploadStream.abort().catch(() => {});
      fail(413, "File too large");
    });

    uploadStream.on("error", (err) => {
      if (!responded) next(err);
    });

    uploadStream.on("finish", () => {
      if (!responded) {
        responded = true;
        res.status(201).json({ id: uploadStream.id, filename: uploadStream.filename, contentType: effectiveType });
      }
    });

    file.pipe(uploadStream);
  });

  bb.on("filesLimit", () => fail(400, "Only one file allowed"));
  bb.on("error", (err) => next(err));
  bb.on("finish", () => {
    if (!responded && !fileReceived) fail(400, "No file uploaded (expecting form-data field 'audio')");
  });

  req.pipe(bb);
  req.on("aborted", () => {
    // Client canceled upload
    if (!responded) {
      responded = true;
      res.status(499).json({ message: "Client closed request during upload" });
    }
  });
});

export default router;


