import assert from "node:assert/strict";
import { test } from "node:test";
import Database from "better-sqlite3";
import { COUNTRY_CODES, JOB_STATUSES, SENIORITIES, WORK_MODES } from "@/lib/constants";
import { migrateDown, migrateUp } from "@/lib/migrations";

const LOOKUP_TABLES = ["countries", "work_modes", "seniorities", "job_statuses"];
const MIGRATION_NAMES = ["0001_init", "0002_financials", "0003_documents"];

function listTableNames(db: Database.Database): string[] {
  const rows = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'").all() as {
    name: string;
  }[];
  return rows.map((row) => row.name);
}

function listCodes({ db, table }: { db: Database.Database; table: string }): string[] {
  const rows = db.prepare(`SELECT code FROM ${table} ORDER BY sort_order`).all() as { code: string }[];
  return rows.map((row) => row.code);
}

test("up, down, up succeeds on an empty database", () => {
  const db = new Database(":memory:");
  assert.deepEqual(migrateUp(db), MIGRATION_NAMES);
  assert.ok(listTableNames(db).includes("col_benchmarks"));
  assert.equal(migrateDown(db), MIGRATION_NAMES[2]);
  assert.equal(migrateDown(db), MIGRATION_NAMES[1]);
  assert.equal(migrateDown(db), MIGRATION_NAMES[0]);
  assert.deepEqual(listTableNames(db), ["schema_migrations"]);
  assert.deepEqual(migrateUp(db), MIGRATION_NAMES);
  assert.deepEqual(migrateUp(db), []);
});

test("seeded lookup codes match constants", () => {
  const db = new Database(":memory:");
  migrateUp(db);
  const expected: Record<string, string[]> = {
    countries: Object.values(COUNTRY_CODES),
    work_modes: Object.values(WORK_MODES),
    seniorities: Object.values(SENIORITIES),
    job_statuses: Object.values(JOB_STATUSES),
  };
  for (const table of LOOKUP_TABLES) {
    assert.deepEqual(listCodes({ db, table }).sort(), [...expected[table]].sort(), table);
  }
});
