import { MongoClient, GridFSBucket } from "mongodb";
import { config } from "./config.js";

let client;
let db;
let bucket;

export async function connectToDatabase() {
  if (db && bucket) {
    return { client, db, bucket };
  }

  client = new MongoClient(config.mongoUri, { 
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 10000,
  });
  await client.connect();

  db = config.dbName ? client.db(config.dbName) : client.db();
  bucket = new GridFSBucket(db, { bucketName: "podcasts" });

  return { client, db, bucket };
}

export function getBucket() {
  if (!bucket) throw new Error("Database not initialized. Call connectToDatabase() first.");
  return bucket;
}

export function getDb() {
  if (!db) throw new Error("Database not initialized. Call connectToDatabase() first.");
  return db;
}

export async function closeDatabase() {
  if (client) {
    await client.close();
    client = undefined;
    db = undefined;
    bucket = undefined;
  }
}


