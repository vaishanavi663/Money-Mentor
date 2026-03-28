import express from "express";
import cors from "cors";
import { pool } from "./db.js";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { withDerivedFields, profileToApiResponse } from "./profileHelpers.js";

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

  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_profiles (
      user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      age INTEGER NOT NULL DEFAULT 28,
      monthly_income NUMERIC(12, 2) NOT NULL DEFAULT 0,
      monthly_expenses NUMERIC(12, 2) NOT NULL DEFAULT 0,
      goals JSONB NOT NULL DEFAULT '[]'::jsonb,
      current_investments JSONB NOT NULL DEFAULT '[]'::jsonb,
      risk_profile TEXT NOT NULL DEFAULT 'moderate',
      primary_concern TEXT NOT NULL DEFAULT '',
      has_completed_onboarding BOOLEAN NOT NULL DEFAULT false,
      onboarding_completed_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id
    ON user_profiles(user_id);
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
    return res.status(401).json({
      error: "Authorization token required",
      hint:
        "Browsers do not send Bearer tokens when you open a URL in the tab. Log in via the app (token is stored automatically), or use curl/Postman/Thunder Client with: Authorization: Bearer <token from login/register response>.",
    });
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

async function getProfileHandler(req, res) {
  const { rows } = await pool.query(
    `
      SELECT
        u.full_name AS name,
        u.email,
        up.user_id AS has_profile_row,
        up.age,
        up.monthly_income,
        up.monthly_expenses,
        up.goals,
        up.current_investments,
        up.risk_profile,
        up.primary_concern,
        up.has_completed_onboarding,
        up.onboarding_completed_at
      FROM users u
      LEFT JOIN user_profiles up ON up.user_id = u.id
      WHERE u.id = $1
      LIMIT 1
    `,
    [req.auth.userId],
  );
  const row = rows[0];
  if (!row) {
    console.warn(`[profile] no users row for user_id=${req.auth.userId}`);
    return res.status(401).json({ error: "Account not found for this session", code: "USER_MISSING" });
  }

  let raw;
  if (row.has_profile_row != null) {
    raw = {
      name: row.name,
      email: row.email,
      age: Number(row.age),
      monthlyIncome: Number(row.monthly_income),
      monthlyExpenses: Number(row.monthly_expenses),
      goals: row.goals || [],
      currentInvestments: row.current_investments || [],
      riskProfile: row.risk_profile || "moderate",
      primaryConcern: row.primary_concern || "",
      hasCompletedOnboarding: Boolean(row.has_completed_onboarding),
      onboardingCompletedAt: row.onboarding_completed_at
        ? new Date(row.onboarding_completed_at).toISOString()
        : "",
    };
  } else {
    raw = {
      name: row.name,
      email: row.email,
      age: 28,
      monthlyIncome: 60000,
      monthlyExpenses: 35000,
      goals: [],
      currentInvestments: [],
      riskProfile: "moderate",
      primaryConcern: "",
      hasCompletedOnboarding: false,
      onboardingCompletedAt: "",
    };
  }

  const profile = withDerivedFields(raw);
  return res.json({ profile: profileToApiResponse(profile) });
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

app.get("/api/profile", requireAuth, getProfileHandler);
app.get("/api/profile/", requireAuth, getProfileHandler);
app.get("/profile", requireAuth, getProfileHandler);

app.put("/api/profile", requireAuth, async (req, res) => {
  const b = req.body || {};
  const userId = req.auth.userId;

  const { rows: userRows } = await pool.query("SELECT full_name AS name, email FROM users WHERE id = $1 LIMIT 1", [
    userId,
  ]);
  if (!userRows[0]) {
    return res.status(404).json({ error: "User not found" });
  }

  const merged = {
    name: String(b.name ?? userRows[0].name ?? ""),
    email: String(b.email ?? userRows[0].email ?? ""),
    age: b.age,
    monthlyIncome: b.monthlyIncome,
    monthlyExpenses: b.monthlyExpenses,
    goals: b.goals,
    currentInvestments: b.currentInvestments,
    riskProfile: b.riskProfile,
    primaryConcern: b.primaryConcern,
    hasCompletedOnboarding: b.hasCompletedOnboarding,
    onboardingCompletedAt: b.onboardingCompletedAt,
  };

  const profile = withDerivedFields(merged);

  await pool.query(
    `
      INSERT INTO user_profiles (
        user_id,
        age,
        monthly_income,
        monthly_expenses,
        goals,
        current_investments,
        risk_profile,
        primary_concern,
        has_completed_onboarding,
        onboarding_completed_at,
        updated_at
      )
      VALUES (
        $1, $2, $3, $4, $5::jsonb, $6::jsonb, $7, $8, $9, $10, NOW()
      )
      ON CONFLICT (user_id) DO UPDATE SET
        age = EXCLUDED.age,
        monthly_income = EXCLUDED.monthly_income,
        monthly_expenses = EXCLUDED.monthly_expenses,
        goals = EXCLUDED.goals,
        current_investments = EXCLUDED.current_investments,
        risk_profile = EXCLUDED.risk_profile,
        primary_concern = EXCLUDED.primary_concern,
        has_completed_onboarding = EXCLUDED.has_completed_onboarding,
        onboarding_completed_at = EXCLUDED.onboarding_completed_at,
        updated_at = NOW()
    `,
    [
      userId,
      profile.age,
      profile.monthlyIncome,
      profile.monthlyExpenses,
      JSON.stringify(profile.goals),
      JSON.stringify(profile.currentInvestments),
      profile.riskProfile,
      profile.primaryConcern,
      profile.hasCompletedOnboarding,
      profile.onboardingCompletedAt ? profile.onboardingCompletedAt : null,
    ],
  );

  return res.json({ profile: profileToApiResponse(profile) });
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
  const [summaryResult, byCategoryResult, monthlyResult, countResult] = await Promise.all([
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
    pool.query(`SELECT COUNT(*)::int AS c FROM transactions WHERE user_id = $1`, [req.auth.userId]),
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
    meta: {
      transactionCount: Number(countResult.rows[0].c || 0),
    },
  });
});

app.use((req, res) => {
  res.status(404).json({
    error: "Not found",
    path: req.originalUrl,
    method: req.method,
    hint: "API routes live under /api (e.g. GET /api/profile with Authorization: Bearer <token>).",
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
