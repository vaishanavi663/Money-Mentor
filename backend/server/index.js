import express from "express";
import cors from "cors";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { pool } from "./db.js";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { withDerivedFields, profileToApiResponse } from "./profileHelpers.js";
import { applyMigrations } from "./migrationsRunner.js";
import { createTransactionsRouter } from "./routes/transactions.js";
import { createTaxTipsRouter } from "./routes/taxTips.js";
import { createMfRouter } from "./routes/mf.js";

const app = express();
const port = Number(process.env.PORT || 4000);
const JWT_SECRET = process.env.JWT_SECRET || "change-me-in-production";
const JWT_EXPIRES_IN = "7d";

function createCorsMiddleware() {
  const raw = process.env.CORS_ORIGIN?.trim();
  if (!raw) {
    return cors();
  }
  const allowedExact = new Set(
    raw.split(",").map((s) => s.trim()).filter(Boolean),
  );
  const allowVercelPreviews =
    process.env.CORS_ALLOW_VERCEL_PREVIEWS === "1" ||
    process.env.CORS_ALLOW_VERCEL_PREVIEWS === "true";

  return cors({
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }
      if (allowedExact.has(origin)) {
        return callback(null, true);
      }
      if (allowVercelPreviews) {
        try {
          const { hostname } = new URL(origin);
          if (hostname === "vercel.app" || hostname.endsWith(".vercel.app")) {
            return callback(null, true);
          }
        } catch {
          /* ignore invalid Origin */
        }
      }
      return callback(null, false);
    },
  });
}

app.use(createCorsMiddleware());
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
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      amount DECIMAL(12, 2) NOT NULL CHECK (amount >= 0),
      type VARCHAR(10) NOT NULL CHECK (type IN ('debit', 'credit')),
      merchant VARCHAR(255),
      category VARCHAR(100) NOT NULL DEFAULT 'Others',
      description TEXT NOT NULL DEFAULT '',
      upi_ref VARCHAR(100),
      source VARCHAR(50) NOT NULL DEFAULT 'manual',
      raw_sms TEXT,
      transaction_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_transactions_user_txdate
    ON transactions(user_id, transaction_date DESC, created_at DESC);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id
    ON user_sessions(user_id);
  `);

  await pool.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'free';
  `);
  await pool.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ;
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

function normalizePlan(plan) {
  const p = String(plan || "").trim().toLowerCase();
  return p === "pro" ? "pro" : "free";
}

async function getUserPlanPayload(userId) {
  const { rows } = await pool.query(
    "SELECT plan, plan_expires_at FROM users WHERE id = $1 LIMIT 1",
    [userId],
  );
  const row = rows[0];
  if (!row) {
    return { plan: "free", planExpiresAt: null };
  }
  return {
    plan: normalizePlan(row.plan),
    planExpiresAt: row.plan_expires_at ? new Date(row.plan_expires_at).toISOString() : null,
  };
}

function userRowToApiUser(row) {
  if (!row) return null;
  return {
    id: row.id_text ?? String(row.id),
    name: row.name ?? row.full_name,
    email: row.email,
    plan: normalizePlan(row.plan),
    planExpiresAt: row.plan_expires_at ? new Date(row.plan_expires_at).toISOString() : null,
  };
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

app.use("/api/mf", requireAuth, createMfRouter());

async function getProfileHandler(req, res) {
  const { rows } = await pool.query(
    `
      SELECT
        u.full_name AS name,
        u.email,
        u.plan,
        u.plan_expires_at,
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
  const planPayload = {
    plan: normalizePlan(row.plan),
    planExpiresAt: row.plan_expires_at ? new Date(row.plan_expires_at).toISOString() : null,
  };
  return res.json({
    profile: { ...profileToApiResponse(profile), ...planPayload },
  });
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
  const { fullName, email, password, plan: rawPlan } = req.body || {};
  const validationError = validateRegisterInput({ fullName, email, password });
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const normalizedEmail = normalizeEmail(email);
  const passwordHash = hashPassword(password);
  const signupPlan = normalizePlan(rawPlan);
  const planExpiresAt = null;

  try {
    const { rows } = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, plan, plan_expires_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, id::text AS id_text, full_name AS name, email, plan, plan_expires_at`,
      [String(fullName).trim(), normalizedEmail, passwordHash, signupPlan, planExpiresAt],
    );

    const authToken = issueJwtToken({ id: rows[0].id, email: rows[0].email });
    await pool.query(
      "INSERT INTO user_sessions (user_id, jwt_id, token_hash, expires_at) VALUES ($1, $2, $3, $4)",
      [rows[0].id, authToken.jwtId, hashToken(authToken.token), authToken.expiresAt],
    );

    return res.status(201).json({
      message: "Registration successful",
      token: authToken.token,
      user: userRowToApiUser(rows[0]),
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
    "SELECT id, id::text AS id_text, full_name, email, password_hash, plan, plan_expires_at FROM users WHERE email = $1 LIMIT 1",
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
    user: userRowToApiUser({ ...user, name: user.full_name }),
  });
});

app.get("/api/auth/me", requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    "SELECT id::text AS id_text, id, full_name AS name, email, plan, plan_expires_at FROM users WHERE id = $1 LIMIT 1",
    [req.auth.userId],
  );

  if (!rows[0]) {
    return res.status(404).json({ error: "User not found" });
  }

  return res.json({ user: userRowToApiUser(rows[0]) });
});

app.post("/api/auth/upgrade-pro", requireAuth, async (req, res) => {
  await pool.query("UPDATE users SET plan = 'pro', plan_expires_at = NULL WHERE id = $1", [req.auth.userId]);
  const { rows } = await pool.query(
    "SELECT id::text AS id_text, id, full_name AS name, email, plan, plan_expires_at FROM users WHERE id = $1 LIMIT 1",
    [req.auth.userId],
  );
  if (!rows[0]) {
    return res.status(404).json({ error: "User not found" });
  }
  return res.json({ user: userRowToApiUser(rows[0]), message: "Upgraded to Pro" });
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

  const planPayload = await getUserPlanPayload(userId);
  return res.json({
    profile: { ...profileToApiResponse(profile), ...planPayload },
  });
});

app.use("/api/transactions", requireAuth, createTransactionsRouter());
app.use("/api/tax-tips", requireAuth, createTaxTipsRouter());

app.get("/api/stats", requireAuth, async (req, res) => {
  const [summaryResult, byCategoryResult, monthlyResult, countResult] = await Promise.all([
    pool.query(`
      SELECT
        COALESCE(SUM(CASE WHEN type = 'credit' THEN amount ELSE 0 END), 0) AS income,
        COALESCE(SUM(CASE WHEN type = 'debit' THEN amount ELSE 0 END), 0) AS expenses
      FROM transactions
      WHERE user_id = $1
        AND transaction_date >= date_trunc('month', CURRENT_TIMESTAMP)
        AND transaction_date < date_trunc('month', CURRENT_TIMESTAMP) + interval '1 month'
    `, [req.auth.userId]),
    pool.query(`
      SELECT category, COALESCE(SUM(amount), 0) AS value
      FROM transactions
      WHERE user_id = $1
        AND type = 'debit'
        AND transaction_date >= date_trunc('month', CURRENT_TIMESTAMP)
        AND transaction_date < date_trunc('month', CURRENT_TIMESTAMP) + interval '1 month'
      GROUP BY category
      ORDER BY value DESC
    `, [req.auth.userId]),
    pool.query(`
      SELECT
        TO_CHAR(date_trunc('month', transaction_date), 'Mon') AS month,
        COALESCE(SUM(CASE WHEN type = 'credit' THEN amount ELSE 0 END), 0) AS income,
        COALESCE(SUM(CASE WHEN type = 'debit' THEN amount ELSE 0 END), 0) AS expenses
      FROM transactions
      WHERE user_id = $1
        AND transaction_date >= date_trunc('month', CURRENT_TIMESTAMP) - interval '5 months'
      GROUP BY date_trunc('month', transaction_date)
      ORDER BY date_trunc('month', transaction_date)
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

function formatInrForPrompt(n) {
  const num = Number(n) || 0;
  return `₹${num.toLocaleString("en-IN")}`;
}

/** Gemini requires history to start with `user` and to alternate user/model. */
function normalizeChatHistoryForGemini(history) {
  const out = [];
  for (const h of history) {
    if (!h?.parts?.[0] || typeof h.parts[0].text !== "string") continue;
    const role = h.role === "model" ? "model" : "user";
    const text = String(h.parts[0].text).trim();
    if (!text) continue;
    const last = out[out.length - 1];
    if (last && last.role === role) {
      last.parts[0].text = `${last.parts[0].text}\n${text}`;
      continue;
    }
    out.push({ role, parts: [{ text }] });
  }
  while (out.length > 0 && out[0].role !== "user") {
    out.shift();
  }
  return out;
}

app.post("/api/ai/chat", requireAuth, async (req, res) => {
  try {
    const { message, conversationHistory } = req.body || {};
    const userMessage = String(message || "").trim();
    if (!userMessage) {
      return res.status(400).json({ error: "message is required" });
    }

    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      return res.status(500).json({ error: "AI unavailable" });
    }

    const { rows: profileRows } = await pool.query(
      `
      SELECT monthly_income, monthly_expenses, goals, current_investments, risk_profile
      FROM user_profiles
      WHERE user_id = $1
      LIMIT 1
      `,
      [req.auth.userId],
    );

    let monthly_income = 0;
    let monthly_expenses = 0;
    let goals = "[]";
    let investments = "[]";
    let risk_profile = "moderate";

    if (profileRows[0]) {
      monthly_income = Number(profileRows[0].monthly_income) || 0;
      monthly_expenses = Number(profileRows[0].monthly_expenses) || 0;
      goals = JSON.stringify(profileRows[0].goals ?? []);
      investments = JSON.stringify(profileRows[0].current_investments ?? []);
      risk_profile = String(profileRows[0].risk_profile || "moderate");
    }

    const savings = monthly_income - monthly_expenses;
    const savings_rate = monthly_income > 0 ? ((savings / monthly_income) * 100).toFixed(1) : "0";

    const { rows: txRows } = await pool.query(
      `
      SELECT
        COALESCE(SUM(CASE WHEN type = 'debit' THEN amount ELSE 0 END), 0) AS total_debit,
        COALESCE(SUM(CASE WHEN type = 'credit' THEN amount ELSE 0 END), 0) AS total_credit
      FROM transactions
      WHERE user_id = $1
        AND transaction_date >= date_trunc('month', CURRENT_TIMESTAMP)
        AND transaction_date < date_trunc('month', CURRENT_TIMESTAMP) + interval '1 month'
      `,
      [req.auth.userId],
    );

    const { rows: catRows } = await pool.query(
      `
      SELECT category, COALESCE(SUM(amount), 0) AS value
      FROM transactions
      WHERE user_id = $1
        AND type = 'debit'
        AND transaction_date >= date_trunc('month', CURRENT_TIMESTAMP)
        AND transaction_date < date_trunc('month', CURRENT_TIMESTAMP) + interval '1 month'
      GROUP BY category
      ORDER BY value DESC
      LIMIT 3
      `,
      [req.auth.userId],
    );

    const total_debit = Number(txRows[0]?.total_debit || 0);
    const total_credit = Number(txRows[0]?.total_credit || 0);
    const top_categories =
      catRows.length > 0
        ? catRows.map((r) => `${r.category}: ${formatInrForPrompt(r.value)}`).join(", ")
        : "none yet";

    const voiceMode = Boolean(req.body?.voiceMode);
    const voiceReplyLanguage = String(req.body?.voiceReplyLanguage || "")
      .trim()
      .toLowerCase();

    let voiceLanguageBlock = "";
    if (voiceMode) {
      if (voiceReplyLanguage === "en" || voiceReplyLanguage === "english") {
        voiceLanguageBlock = `

VOICE MODE — LANGUAGE (non-negotiable):
- The user spoke in English. Your entire reply must be in English only.
- Do not use Hindi, Urdu, or Hinglish words or sentence structure.
- Indian financial terms may stay as standard English abbreviations (SIP, EMI, PPF, NPS, ELSS).
- If prior messages in history are in Hindi, ignore that for this reply — follow this English-only rule.`;
      } else if (voiceReplyLanguage === "hi" || voiceReplyLanguage === "hindi") {
        voiceLanguageBlock = `

VOICE MODE — LANGUAGE (non-negotiable):
- The user spoke in Hindi (Devanagari). Your entire reply must be in Hindi.
- Do not switch to English except for standard product abbreviations (SIP, EMI, NPS) where natural.`;
      } else if (voiceReplyLanguage === "hinglish") {
        voiceLanguageBlock = `

VOICE MODE — LANGUAGE:
- The user spoke in Roman Hinglish (Hindi in Latin letters, possibly mixed with English).
- Reply in the same style: natural Hindi–English mix matching their tone.`;
      } else {
        voiceLanguageBlock = `

VOICE MODE — LANGUAGE:
- Mirror the user's latest message only: English → English only; Hindi script → Hindi; mixed Roman Hinglish → match that mix.
- Do not default to Hindi or Hinglish when the latest message is plain English.`;
      }
    }

    const systemPrompt = `You are Money Mentor, a friendly AI financial advisor. You understand Indian taxes, UPI, SIPs, and rupee budgeting. Do not assume the user wants Hindi — follow their language.
Be casual, warm, and helpful. Use simple, clear language. Keep responses under 3 sentences when the user is on voice.

Language (very important):
- Reply in the SAME language as the user's latest message. Match them closely.
- If they write or speak in English only, answer in natural English only — do not mix Hindi or Hinglish unless they did.
- If they use Hindi, answer in Hindi.
- If they naturally mix Hindi and English (Hinglish), you may reply in the same mixed style.
- Never default to Hindi or Hinglish when the user used plain English.
${voiceLanguageBlock}
Current user's financial snapshot:
- Monthly income: ${formatInrForPrompt(monthly_income)}
- Monthly expenses: ${formatInrForPrompt(monthly_expenses)}  
- Monthly savings: ${formatInrForPrompt(savings)}
- Savings rate: ${savings_rate}%
- Risk profile: ${risk_profile}
- Current investments: ${investments}
- Financial goals: ${goals}
- This month's spending: ${formatInrForPrompt(total_debit)} spent, ${formatInrForPrompt(total_credit)} received
- Top spending categories this month: ${top_categories}

Rules:
- Always use the user's REAL numbers above, never make up figures
- For voice, keep it under 3 sentences
- Give actionable, specific advice based on their actual data
- If they ask about expenses/spending, use the real DB numbers
- Be encouraging, not preachy`;

    const geminiModel = String(process.env.GEMINI_MODEL || "gemini-2.5-flash").trim();

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: geminiModel,
      systemInstruction: systemPrompt,
    });

    const rawHistory = Array.isArray(conversationHistory) ? conversationHistory : [];
    const sanitized = rawHistory
      .filter(
        (h) =>
          h &&
          (h.role === "user" || h.role === "model") &&
          Array.isArray(h.parts) &&
          h.parts[0] &&
          typeof h.parts[0].text === "string",
      )
      .map((h) => ({
        role: h.role,
        parts: [{ text: String(h.parts[0].text) }],
      }));

    let past = normalizeChatHistoryForGemini(sanitized);
    if (
      past.length > 0 &&
      past[past.length - 1].role === "user" &&
      past[past.length - 1].parts[0].text === userMessage
    ) {
      past = past.slice(0, -1);
    }

    const chat = model.startChat({ history: past });
    const result = await chat.sendMessage(userMessage);
    let reply = "";
    try {
      reply = (await result.response.text())?.trim() || "";
    } catch (textErr) {
      console.error("[ai/chat] empty or blocked response:", textErr?.message || textErr);
    }

    if (!reply) {
      return res.status(500).json({ error: "AI unavailable" });
    }

    return res.json({ reply });
  } catch (err) {
    console.error(
      "[ai/chat]",
      err?.message || err,
      err?.status ?? err?.statusCode ?? "",
      process.env.GEMINI_MODEL || "gemini-2.5-flash",
    );
    return res.status(500).json({ error: "AI unavailable" });
  }
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
  if (!process.env.GEMINI_API_KEY?.trim()) {
    console.error(
      "FATAL: GEMINI_API_KEY is missing. Set it in backend/.env (free key: https://aistudio.google.com).",
    );
    process.exit(1);
  }

  try {
    await ensureSchema();
    await applyMigrations(pool);
    // eslint-disable-next-line no-console
    console.log("Database schema ready.");
  } catch (error) {
    console.error("Failed to connect or migrate database:", error.message);
    process.exit(1);
  }

  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`API server running on http://localhost:${port}`);
    // eslint-disable-next-line no-console
    console.log(`Gemini model: ${String(process.env.GEMINI_MODEL || "gemini-2.5-flash").trim()}`);
  });
}

start();
