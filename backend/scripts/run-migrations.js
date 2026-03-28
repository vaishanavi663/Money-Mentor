import { pool } from "../server/db.js";
import { applyMigrations } from "../server/migrationsRunner.js";

async function main() {
  await applyMigrations(pool);
  await pool.end();
}

main().catch(() => process.exit(1));
