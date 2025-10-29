import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: process.env.PORT || 4000,
  mongoUri: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/podcast_portal",
  dbName: process.env.MONGODB_DB || undefined,
  maxFileSizeBytes: Number(process.env.MAX_FILE_SIZE_BYTES || 1024 * 1024 * 200),
  allowedMimeTypes: (process.env.ALLOWED_AUDIO_MIMES || "audio/mpeg,audio/mp3,audio/x-mp3,audio/mp4,audio/x-m4a,audio/aac,audio/wav,audio/x-wav,audio/flac,audio/ogg,audio/webm").split(","),
};


