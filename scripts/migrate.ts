import { openDatabase } from "@/lib/db";
import { migrateDown, migrateUp } from "@/lib/migrations";
import { logger } from "@/lib/logger";

const DIRECTION_UP = "up";
const DIRECTION_DOWN = "down";

function run(direction: string | undefined): void {
  const db = openDatabase();
  if (direction === DIRECTION_UP) {
    logger.info("migrations applied", { names: migrateUp(db) });
    return;
  }
  if (direction === DIRECTION_DOWN) {
    logger.info("migration rolled back", { name: migrateDown(db) });
    return;
  }
  throw new Error(`Usage: migrate.ts <${DIRECTION_UP}|${DIRECTION_DOWN}>`);
}

run(process.argv[2]);
