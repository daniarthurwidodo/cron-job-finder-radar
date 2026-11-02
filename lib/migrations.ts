import type Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const MIGRATIONS_DIR = path.join(process.cwd(), "migrations");
const UP_SUFFIX = ".up.sql";
const DOWN_SUFFIX = ".down.sql";

const CREATE_MIGRATIONS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS schema_migrations (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`;

function listMigrationNames(migrationsDir: string): string[] {
  return fs
    .readdirSync(migrationsDir)
    .filter((fileName) => fileName.endsWith(UP_SUFFIX))
    .map((fileName) => fileName.slice(0, -UP_SUFFIX.length))
    .sort();
}

function readMigrationSql({ migrationsDir, name, suffix }: { migrationsDir: string; name: string; suffix: string }): string {
  return fs.readFileSync(path.join(migrationsDir, `${name}${suffix}`), "utf8");
}

function listAppliedNames(db: Database.Database): string[] {
  const rows = db.prepare("SELECT name FROM schema_migrations ORDER BY id").all() as { name: string }[];
  return rows.map((row) => row.name);
}

export function migrateUp(db: Database.Database, migrationsDir: string = MIGRATIONS_DIR): string[] {
  db.exec(CREATE_MIGRATIONS_TABLE_SQL);
  const applied = new Set(listAppliedNames(db));
  const pendingNames = listMigrationNames(migrationsDir).filter((name) => !applied.has(name));
  for (const name of pendingNames) {
    const sql = readMigrationSql({ migrationsDir, name, suffix: UP_SUFFIX });
    db.transaction(() => {
      db.exec(sql);
      db.prepare("INSERT INTO schema_migrations (name) VALUES (?)").run(name);
    })();
  }
  return pendingNames;
}

export function migrateDown(db: Database.Database, migrationsDir: string = MIGRATIONS_DIR): string | null {
  db.exec(CREATE_MIGRATIONS_TABLE_SQL);
  const lastName = listAppliedNames(db).at(-1);
  if (!lastName) return null;
  const sql = readMigrationSql({ migrationsDir, name: lastName, suffix: DOWN_SUFFIX });
  db.transaction(() => {
    db.exec(sql);
    db.prepare("DELETE FROM schema_migrations WHERE name = ?").run(lastName);
  })();
  return lastName;
}
