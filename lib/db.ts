import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { migrateUp } from "@/lib/migrations";

export const DB_FILE_PATH = path.join(process.cwd(), "data", "app.db");

const globalForDb = globalThis as unknown as { db?: Database.Database };

export function openDatabase(): Database.Database {
  fs.mkdirSync(path.dirname(DB_FILE_PATH), { recursive: true });
  const db = new Database(DB_FILE_PATH);
  db.pragma("journal_mode = WAL");
  return db;
}

export function getDb(): Database.Database {
  if (globalForDb.db) return globalForDb.db;
  const db = openDatabase();
  migrateUp(db);
  globalForDb.db = db;
  return db;
}
