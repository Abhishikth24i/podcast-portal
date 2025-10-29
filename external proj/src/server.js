import express from "express";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";
import { connectToDatabase } from "./db.js";
import { config } from "./config.js";
import uploadsRouter from "./uploads/routes.js";
import filesRouter from "./uploads/files.js";

const app = express();

app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Landing page must come before static middleware
app.get(["/", "/home"], (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "home.html"));
});
// Disable default index so our home route is used
app.use(express.static(path.join(__dirname, "public"), { index: false }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/upload", uploadsRouter);
app.use("/api/files", filesRouter);

// Global error handler
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  res.status(status).json({ message: err.message || "Internal Server Error" });
});

async function start() {
  await connectToDatabase();
  app.listen(config.port, () => {
    // eslint-disable-next-line no-console
    console.log(`Server listening on http://localhost:${config.port}`);
  });
}

start().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Failed to start server", err);
  process.exit(1);
});


