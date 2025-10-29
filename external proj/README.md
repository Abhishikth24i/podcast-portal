# Podcast Publishing Portal (Node.js + Express + MongoDB GridFS)

A minimal portal to upload, store, stream, download, and delete podcast audio using MongoDB GridFS.

## Features
- Upload audio via HTML form (Multer in-memory, validated by MIME type)
- Store files in MongoDB GridFS (`podcasts.files`/`podcasts.chunks`)
- List all files with metadata
- Stream and download audio
- Delete files

## Tech stack
- Node.js, Express
- MongoDB, GridFSBucket
- Multer for uploads

## Getting started

### Prerequisites
- Node.js 18+
- MongoDB running locally or in the cloud (e.g., Atlas)

### Install
```bash
npm install
```

### Configure
Create a `.env` file in project root (optional):
```bash
PORT=4000
MONGODB_URI=mongodb://127.0.0.1:27017/podcast_portal
MONGODB_DB=podcast_portal
MAX_FILE_SIZE_BYTES=209715200
ALLOWED_AUDIO_MIMES=audio/mpeg,audio/mp4,audio/x-m4a,audio/aac,audio/wav,audio/x-wav,audio/flac,audio/ogg,audio/webm
```

### Run
```bash
npm run dev
# or
npm start
```
Open `http://localhost:4000`.

## Deploy to Render (one click)

1. Push this repo to GitHub.
2. Visit Render and choose New → Blueprint, then select your repo.
3. Render reads `render.yaml` and creates a Web Service.
4. In the service → Environment → add variables:
   - `MONGODB_URI` = your MongoDB/Atlas connection string
   - `MONGODB_DB` = podcast_portal (or any db name you prefer)
   - `PORT` = 4000 (already set in render.yaml)
5. Click Deploy. After build, open the Render URL.

Notes
- Health check: `/health`
- Static UI: `/` (landing) and `/portal.html` (upload portal)
- API base: `/api`

### Exam quickstart
1. Start MongoDB.
2. In one terminal:
   ```bash
   npm install
   npm run dev
   ```
3. Open `http://localhost:4000`.
4. Upload an MP3, then click Stream/Download.
5. Show scrubbing: stream endpoint supports HTTP Range.

## API

- POST `/api/upload/audio`
  - form-data: `audio` (file), `title` (string), `description` (string)
  - returns: `{ id, filename, contentType }`

- GET `/api/files`
  - returns: array of files from `podcasts.files`

- GET `/api/files/:id/stream`
  - streams audio; sets `Content-Type` and `Content-Length` if available

- GET `/api/files/:id/download`
  - forces file download with `Content-Disposition`

- DELETE `/api/files/:id`
  - deletes a file by its ObjectId

## Notes
- This example uses in-memory uploads. For very large files, consider streaming directly into GridFS using `multer-gridfs-storage` or manual stream piping.
- Enable authentication/authorization, rate limits, and validation in production.

## License
MIT
