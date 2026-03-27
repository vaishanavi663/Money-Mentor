import express from "express";
import cors from "cors";
import { pool } from "./db.js";
import crypto from "crypto";
import jwt from "jsonwebtoken";

const app = express();
const port = Number(process.env.PORT || 4000);
const JWT_SECRET = process.env.JWT_SECRET || "change-me-in-production";
const JWT_EXPIRES_IN = "7d";

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  if (!req.path.startsWith("/api/auth")) {
    return next();
  }

  const startedAt = Date.now();
  res.on("finish", () => {
    const durationMs = Date.now() - startedAt;
    const safeEmail =
      typeof req.body?.email === "string" ? req.body.email.toLowerCase() : "n/a";
    console.log(
      `[auth] ${req.method} ${req.path} -> ${res.statusCode} (${durationMs}ms) email=${safeEmail}`,
    );
  });
  next();
});

async function ensureSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGSERIAL PRIMARY KEY,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_sessions (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      jwt_id TEXT NOT NULL UNIQUE,
      token_hash TEXT NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      revoked_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS transactions (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
      date DATE NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    ALTER TABLE transactions
    ADD COLUMN IF NOT EXISTS user_id BIGINT REFERENCES users(id) ON DELETE CASCADE;
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_transactions_user_id_date
    ON transactions(user_id, date DESC, created_at DESC);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id
    ON user_sessions(user_id);
  `);
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function validateRegisterInput({ fullName, email, password }) {
  if (!String(fullName || "").trim()) {
    return "Full name is required";
  }

  if (String(fullName).trim().length < 2) {
    return "Full name must be at least 2 characters";
  }

  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    return "Email is required";
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalizedEmail)) {
    return "Please enter a valid email";
  }

  if (!String(password || "").trim()) {
    return "Password is required";
  }

  if (String(password).length < 8) {
    return "Password must be at least 8 characters";
  }

  return null;
}

function validateLoginInput({ email, password }) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    return "Email is required";
  }

  if (!String(password || "")) {
    return "Password is required";
  }

  return null;
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto
    .scryptSync(password, salt, 64)
    .toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  const [salt, originalHash] = String(storedHash || "").split(":");
  if (!salt || !originalHash) {
    return false;
  }

  const hashBuffer = crypto.scryptSync(password, salt, 64);
  const originalBuffer = Buffer.from(originalHash, "hex");

  if (hashBuffer.length !== originalBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(hashBuffer, originalBuffer);
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function issueJwtToken(user) {
  const jwtId = crypto.randomUUID();
  const payload = {
    sub: String(user.id),
    email: user.email,
    jti: jwtId,
  };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  const decoded = jwt.decode(token);
  const expiresAt = new Date(decoded.exp * 1000);

  return {
    token,
    jwtId,
    expiresAt,
  };
}

async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const [scheme, token] = authHeader.split(" ");
  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Authorization token required" });
  }

  let decodedToken;
  try {
    decodedToken = jwt.verify(token, JWT_SECRET);
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  const tokenHash = hashToken(token);
  const { rows } = await pool.query(
    `
      SELECT user_id
      FROM user_sessions
      WHERE jwt_id = $1
        AND token_hash = $2
        AND revoked_at IS NULL
        AND expires_at > NOW()
      LIMIT 1
    `,
    [decodedToken.jti, tokenHash],
  );

  if (!rows[0]) {
    return res.status(401).json({ error: "Session not found or already logged out" });
  }

  req.auth = {
    userId: Number(rows[0].user_id),
    tokenId: decodedToken.jti,
  };

  next();
}

app.get("/api/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true, database: "connected" });
  } catch (error) {
    console.error("Health check DB error:", error.message);
    res.status(500).json({ ok: false, database: "error", message: error.message });
  }
});

app.get("/api/debug/db-status", async (_req, res) => {
  const [userCountResult, transactionCountResult] = await Promise.all([
    pool.query("SELECT COUNT(*)::int AS count FROM users"),
    pool.query("SELECT COUNT(*)::int AS count FROM transactions"),
  ]);

  res.json({
    ok: true,
    database: "connected",
    users: userCountResult.rows[0].count,
    transactions: transactionCountResult.rows[0].count,
  });
});

app.post("/api/auth/register", async (req, res) => {
  const { fullName, email, password } = req.body || {};
  const validationError = validateRegisterInput({ fullName, email, password });
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const normalizedEmail = normalizeEmail(email);
  const passwordHash = hashPassword(password);

  try {
    const { rows } = await pool.query(
      "INSERT INTO users (full_name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, id::text AS id_text, full_name AS name, email",
      [String(fullName).trim(), normalizedEmail, passwordHash],
    );

    const authToken = issueJwtToken({ id: rows[0].id, email: rows[0].email });
    await pool.query(
      "INSERT INTO user_sessions (user_id, jwt_id, token_hash, expires_at) VALUES ($1, $2, $3, $4)",
      [rows[0].id, authToken.jwtId, hashToken(authToken.token), authToken.expiresAt],
    );

    return res.status(201).json({
      message: "Registration successful",
      token: authToken.token,
      user: {
        id: rows[0].id_text,
        name: rows[0].name,
        email: rows[0].email,
      },
    });
  } catch (error) {
    if (error?.code === "23505") {
      return res.status(409).json({ error: "Email already registered" });
    }
    throw error;
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body || {};
  const validationError = validateLoginInput({ email, password });
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const normalizedEmail = normalizeEmail(email);
  const { rows } = await pool.query(
    "SELECT id, id::text AS id_text, full_name, email, password_hash FROM users WHERE email = $1 LIMIT 1",
    [normalizedEmail],
  );
  const user = rows[0];

  if (!user || !verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const authToken = issueJwtToken(user);
  await pool.query(
    "INSERT INTO user_sessions (user_id, jwt_id, token_hash, expires_at) VALUES ($1, $2, $3, $4)",
    [user.id, authToken.jwtId, hashToken(authToken.token), authToken.expiresAt],
  );

  return res.json({
    message: "Login successful",
    token: authToken.token,
    user: {
      id: user.id_text,
      name: user.full_name,
      email: user.email,
    },
  });
});

app.get("/api/auth/me", requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    "SELECT id::text AS id, full_name AS name, email FROM users WHERE id = $1 LIMIT 1",
    [req.auth.userId],
  );

  if (!rows[0]) {
    return res.status(404).json({ error: "User not found" });
  }

  return res.json({ user: rows[0] });
});

app.post("/api/auth/logout", requireAuth, async (req, res) => {
  await pool.query(
    "UPDATE user_sessions SET revoked_at = NOW() WHERE jwt_id = $1 AND user_id = $2 AND revoked_at IS NULL",
    [req.auth.tokenId, req.auth.userId],
  );
  return res.json({ message: "Logged out successfully" });
});

app.get("/api/transactions", requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    "SELECT id::text AS id, type, category, description, amount, date FROM transactions WHERE user_id = $1 ORDER BY date DESC, created_at DESC",
    [req.auth.userId],
  );
  res.json(rows);
});

app.post("/api/transactions", requireAuth, async (req, res) => {
  const { type, category, description, amount, date } = req.body;
  if (!type || !category || !description || !amount || !date) {
    return res.status(400).json({ error: "Missing required transaction fields" });
  }

  if (type !== "income" && type !== "expense") {
    return res.status(400).json({ error: "Invalid transaction type" });
  }

  const { rows } = await pool.query(
    "INSERT INTO transactions (user_id, type, category, description, amount, date) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id::text AS id, type, category, description, amount, date",
    [req.auth.userId, type, category, description, amount, date],
  );
  return res.status(201).json(rows[0]);
});

app.delete("/api/transactions/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: "Invalid transaction id" });
  }

  const result = await pool.query("DELETE FROM transactions WHERE id = $1 AND user_id = $2", [
    id,
    req.auth.userId,
  ]);
  if (result.rowCount === 0) {
    return res.status(404).json({ error: "Transaction not found" });
  }

  return res.status(204).send();
});

app.get("/api/stats", requireAuth, async (req, res) => {
  const [summaryResult, byCategoryResult, monthlyResult] = await Promise.all([
    pool.query(`
      SELECT
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS expenses
      FROM transactions
      WHERE user_id = $1
        AND date >= date_trunc('month', CURRENT_DATE)
        AND date < date_trunc('month', CURRENT_DATE) + interval '1 month'
    `, [req.auth.userId]),
    pool.query(`
      SELECT category, COALESCE(SUM(amount), 0) AS value
      FROM transactions
      WHERE user_id = $1
        AND type = 'expense'
        AND date >= date_trunc('month', CURRENT_DATE)
        AND date < date_trunc('month', CURRENT_DATE) + interval '1 month'
      GROUP BY category
      ORDER BY value DESC
    `, [req.auth.userId]),
    pool.query(`
      SELECT
        TO_CHAR(date_trunc('month', date), 'Mon') AS month,
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS expenses
      FROM transactions
      WHERE user_id = $1
        AND date >= date_trunc('month', CURRENT_DATE) - interval '5 months'
      GROUP BY date_trunc('month', date)
      ORDER BY date_trunc('month', date)
    `, [req.auth.userId]),
  ]);

  const income = Number(summaryResult.rows[0].income || 0);
  const expenses = Number(summaryResult.rows[0].expenses || 0);
  const savings = income - expenses;
  const monthlyChange = income > 0 ? (savings / income) * 100 : 0;

  res.json({
    summary: {
      income,
      expenses,
      savings,
      totalBalance: savings,
      monthlyChange,
    },
    byCategory: byCategoryResult.rows.map((row) => ({
      name: row.category,
      value: Number(row.value),
    })),
    monthlyTrend: monthlyResult.rows.map((row) => ({
      month: row.month,
      income: Number(row.income),
      expenses: Number(row.expenses),
    })),
  });
});

async function start() {
  try {
    await ensureSchema();
    // eslint-disable-next-line no-console
    console.log("Database schema ready.");
  } catch (error) {
    console.error("Failed to connect or migrate database:", error.message);
    process.exit(1);
  }

  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`API server running on http://localhost:${port}`);
  });
}

start();
