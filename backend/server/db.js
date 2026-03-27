import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Always load backend/.env (works whether you run from repo root or backend/)
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const { Pool } = pg;

function hasDatabaseUrl() {
  return Boolean(process.env.DATABASE_URL?.trim());
}

function hasIndividualConfig() {
  return ["DB_HOST", "DB_PORT", "DB_NAME", "DB_USER", "DB_PASSWORD"].every(
    (key) => Boolean(process.env[key]?.trim()),
  );
}

if (!hasDatabaseUrl() && !hasIndividualConfig()) {
  throw new Error(
    "Database config missing: set DATABASE_URL or all of DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD (see backend/.env.example)",
  );
}

const ssl =
  process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : undefined;

export const pool = hasDatabaseUrl()
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl,
    })
  : new Pool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl,
    });
