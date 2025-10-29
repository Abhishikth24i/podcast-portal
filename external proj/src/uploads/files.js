import express from "express";
import { ObjectId } from "mongodb";
import { getBucket, getDb } from "../db.js";

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const db = getDb();
    const q = (req.query.q || "").toString().trim();
    const filter = q
      ? {
          $or: [
            { filename: { $regex: q, $options: "i" } },
            { "metadata.title": { $regex: q, $options: "i" } },
            { "metadata.description": { $regex: q, $options: "i" } },
          ],
        }
      : {};
    const raw = await db
      .collection("podcasts.files")
      .find(filter, { projection: { chunkSize: 0 } })
      .sort({ uploadDate: -1 })
      .toArray();
    const files = raw.map((d) => ({ ...d, _id: d._id?.toString?.() || d._id }));
    res.json(files);
  } catch (err) {
    next(err);
  }
});

router.get("/:id/stream", async (req, res, next) => {
  try {
    const bucket = getBucket();
    const id = new ObjectId(req.params.id);

    const cursor = bucket.find({ _id: id });
    const file = await cursor.next();
    if (!file) return res.status(404).json({ message: "Not found" });

    const total = file.length || 0;
    const contentType = file.contentType || "application/octet-stream";
    res.setHeader("Accept-Ranges", "bytes");

    const range = req.headers.range;
    if (!range) {
      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Length", String(total));
      const stream = bucket.openDownloadStream(id);
      stream.on("error", (err) => next(err));
      return stream.pipe(res);
    }

    const matches = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!matches) return res.status(416).end();
    let start = matches[1] ? parseInt(matches[1], 10) : 0;
    let end = matches[2] ? parseInt(matches[2], 10) : total - 1;
    if (isNaN(start) || isNaN(end) || start > end || start >= total) {
      return res.status(416).setHeader("Content-Range", `bytes */${total}`).end();
    }
    if (end >= total) end = total - 1;

    const chunkSize = end - start + 1;
    res.status(206);
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Length", String(chunkSize));
    res.setHeader("Content-Range", `bytes ${start}-${end}/${total}`);

    const stream = bucket.openDownloadStream(id, { start, end });
    stream.on("error", (err) => next(err));
    return stream.pipe(res);
  } catch (err) {
    next(err);
  }
});

router.get("/:id/download", async (req, res, next) => {
  try {
    const bucket = getBucket();
    const id = new ObjectId(req.params.id);
    const cursor = bucket.find({ _id: id });
    const file = await cursor.next();
    if (!file) return res.status(404).json({ message: "Not found" });
    const filename = file?.filename || `${id}.audio`;
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    const stream = bucket.openDownloadStream(id);
    if (file?.contentType) res.setHeader("Content-Type", file.contentType);
    stream.on("error", (err) => next(err));
    stream.pipe(res);
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const bucket = getBucket();
    const id = new ObjectId(req.params.id);
    await bucket.delete(id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// Update title/description (metadata)
router.patch("/:id", async (req, res, next) => {
  try {
    const db = getDb();
    let id;
    try {
      id = new ObjectId(req.params.id);
    } catch {
      return res.status(400).json({ message: "Invalid id" });
    }

    const { title, description } = req.body || {};

    const update = {};
    if (typeof title === "string") update["metadata.title"] = title;
    if (typeof description === "string") update["metadata.description"] = description;

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ message: "No fields to update" });
    }

    const files = db.collection("podcasts.files");
    const resUpdate = await files.updateOne({ _id: id }, { $set: update });
    if (resUpdate.matchedCount === 0) {
      return res.status(404).json({ message: "Not found" });
    }
    const doc = await files.findOne({ _id: id }, { projection: { chunkSize: 0 } });
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json(doc);
  } catch (err) {
    next(err);
  }
});

export default router;


