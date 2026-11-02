import Database from "better-sqlite3";
import path from "node:path";

const DB_FILE_PATH = path.join(process.cwd(), "data", "app.db");

const globalForDb = globalThis as unknown as { db?: Database.Database };

function openDatabase(): Database.Database {
  const db = new Database(DB_FILE_PATH);
  db.pragma("journal_mode = WAL");
  return db;
}

export const db = globalForDb.db ?? openDatabase();

if (process.env.NODE_ENV !== "production") globalForDb.db = db;
