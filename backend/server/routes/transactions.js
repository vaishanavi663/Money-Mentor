import { Router } from "express";
import { pool } from "../db.js";

export const INDIAN_CATEGORIES = [
  "Food & Dining",
  "Transport",
  "Shopping",
  "Entertainment",
  "UPI Transfer",
  "Health",
  "Utilities",
  "Insurance",
  "Investments",
  "Others",
];

const router = Router();

/** Categorize from merchant / SMS text (Indian defaults). */
export function categorizeFromMerchant(text) {
  const s = String(text || "").toLowerCase();
  if (!s.trim()) return "Others";
  if (/swiggy|zomato|dominos|pizza/.test(s)) return "Food & Dining";
  if (/uber|ola|rapido|metro|irctc|redbus/.test(s)) return "Transport";
  if (/amazon|flipkart|myntra|meesho/.test(s)) return "Shopping";
  if (/netflix|spotify|hotstar|youtube|prime/.test(s)) return "Entertainment";
  if (/gpay|phonepe|paytm|bhim/.test(s)) return "UPI Transfer";
  if (/hospital|pharmacy|medplus|apollo|1mg/.test(s)) return "Health";
  if (/electricity|bescom|tata power|bses|msedcl/.test(s)) return "Utilities";
  if (/hdfc|lic|sbi life|term insurance/.test(s)) return "Insurance";
  if (/mutual fund|sip|zerodha|groww|upstox/.test(s)) return "Investments";
  return "Others";
}

function parseAmountFromText(text) {
  const normalized = text.replace(/,/g, "");
  const patterns = [
    /(?:rs\.?|inr|₹)\s*([\d]+(?:\.\d{1,2})?)/i,
    /(?:rs\.?|inr|₹)\s*([\d]+(?:\.\d{1,2})?)/i,
    /(?:debited|credited|paid|for)\s+(?:rs\.?|inr|₹)?\s*([\d]+(?:\.\d{1,2})?)/i,
    /([\d]+(?:\.\d{1,2})?)\s*(?:rs\.?|inr)/i,
  ];
  for (const re of patterns) {
    const m = normalized.match(re);
    if (m) {
      const n = parseFloat(m[1]);
      if (Number.isFinite(n) && n > 0) return n;
    }
  }
  const loose = normalized.match(/([\d]{1,9}(?:\.\d{1,2})?)/);
  if (loose) {
    const n = parseFloat(loose[1]);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

function parseUpiRef(text) {
  const m =
    text.match(/(?:upi ref|ref no|utr|reference)[\s.:]*([A-Za-z0-9]{6,32})/i) ||
    text.match(/\b(?:UPI|Ref)[\s.:]*([A-Za-z0-9]{6,32})/i);
  return m ? m[1].trim() : null;
}

function parseMerchant(text) {
  const lower = text.toLowerCase();
  let m = text.match(/(?:paid to|to vpa|to)\s+([^\s]+(?:@[^\s,]+)?)/i);
  if (m) return m[1].replace(/[.,;]+$/, "").trim();
  m = text.match(/(?:^|\.)\s*₹[\d,.]+\s+paid to\s+([^.\n]+?)(?:\s+via|\s+on\.|$)/i);
  if (m) return m[1].trim();
  m = text.match(/\bto\s+([A-Za-z0-9][A-Za-z0-9\s@._-]{2,60}?)(?:\s+on|\s+via|\s+by|$)/i);
  if (m) return m[1].trim();
  m = text.match(/\bfrom\s+([A-Za-z0-9][A-Za-z0-9\s@._-]{2,60}?)(?:\s+on|\s+via|$)/i);
  if (m && !/a\/c|account/i.test(m[1])) return m[1].trim();
  m = text.match(/\bat\s+([A-Za-z][A-Za-z0-9\s&.-]{2,50}?)(?:\s+on|\s+via|$)/i);
  if (m) return m[1].trim();
  if (/swiggy/i.test(lower)) return "Swiggy";
  if (/zomato/i.test(lower)) return "Zomato";
  return null;
}

function parseTxnType(text) {
  const lower = text.toLowerCase();
  if (
    /\b(credited|received|deposit)\b/.test(lower) ||
    (/\bcredit\b/.test(lower) && !/\bcredited\b/.test(lower) && /to your a\/c/.test(lower))
  ) {
    return "credit";
  }
  if (/\b(debited|withdrawn|paid|debit|sent)\b/.test(lower) || /\bis debited\b/.test(lower)) {
    return "debit";
  }
  if (/credited/.test(lower)) return "credit";
  if (/debited/.test(lower)) return "debit";
  return null;
}

function parseSmsDate(text) {
  let m = text.match(/\b(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})\b/);
  if (m) {
    let d = parseInt(m[1], 10);
    let mo = parseInt(m[2], 10);
    let y = parseInt(m[3], 10);
    if (y < 100) y += 2000;
    return new Date(Date.UTC(y, mo - 1, d));
  }
  m = text.match(/\b(\d{1,2})([A-Za-z]{3})(\d{2,4})\b/i);
  if (m) {
    const months = {
      jan: 0,
      feb: 1,
      mar: 2,
      apr: 3,
      may: 4,
      jun: 5,
      jul: 6,
      aug: 7,
      sep: 8,
      oct: 9,
      nov: 10,
      dec: 11,
    };
    const moKey = m[2].toLowerCase().slice(0, 3);
    const mo = months[moKey];
    if (mo == null) return null;
    let y = parseInt(m[3], 10);
    if (y < 100) y += 2000;
    const d = parseInt(m[1], 10);
    return new Date(Date.UTC(y, mo, d));
  }
  return null;
}

function confidenceForParsed({ amount, type, merchant }) {
  let c = 0.3;
  if (amount != null) c += 0.35;
  if (type) c += 0.2;
  if (merchant) c += 0.15;
  return Math.min(1, Math.round(c * 100) / 100);
}

export function parseBankSmsLine(line) {
  const raw = String(line || "").trim();
  if (!raw) return null;
  const amount = parseAmountFromText(raw);
  const type = parseTxnType(raw);
  const merchant = parseMerchant(raw) || (amount != null ? "Unknown merchant" : null);
  const upiRef = parseUpiRef(raw);
  const dateObj = parseSmsDate(raw);
  const date = dateObj ? dateObj.toISOString() : new Date().toISOString();
  const category = categorizeFromMerchant(`${merchant || ""} ${raw}`);
  const confidence = confidenceForParsed({ amount, type, merchant });
  if (amount == null || !type) return null;
  return {
    amount,
    type,
    merchant: merchant || "Unknown",
    category,
    upiRef: upiRef || null,
    date,
    confidence,
    rawSms: raw,
  };
}

router.post("/parse-sms", (req, res) => {
  try {
    const smsText = String(req.body?.smsText || "");
    const lines = smsText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const results = lines.map((line) => parseBankSmsLine(line)).filter(Boolean);
    return res.json({ results });
  } catch (e) {
    console.error("[transactions] parse-sms", e);
    return res.status(500).json({ error: "Failed to parse SMS" });
  }
});

router.post("/", async (req, res) => {
  const userId = req.auth.userId;
  const body = req.body || {};
  const {
    amount,
    merchant,
    category,
    upiRef,
    source,
    rawSms,
    transactionDate,
    description,
    date,
  } = body;
  let { type } = body;
  if (type === "income") type = "credit";
  if (type === "expense") type = "debit";

  const amt = Number(amount);
  if (!Number.isFinite(amt) || amt < 0) {
    return res.status(400).json({ error: "Invalid amount" });
  }
  if (type !== "debit" && type !== "credit") {
    return res.status(400).json({ error: "type must be debit or credit (or income/expense)" });
  }
  const cat = String(category || "Others").trim() || "Others";
  const merch = String(merchant ?? description ?? "").trim();
  const desc = merch || String(description || "").trim() || "Transaction";
  const src = String(source || "manual").trim() || "manual";
  const ref = upiRef != null ? String(upiRef).trim() : null;
  const raw = rawSms != null ? String(rawSms) : null;
  const rawDate = transactionDate ?? date;
  let txDate = rawDate ? new Date(rawDate) : new Date();
  if (Number.isNaN(txDate.getTime())) txDate = new Date();

  try {
    const { rows } = await pool.query(
      `
        INSERT INTO transactions (
          user_id, amount, type, merchant, category, description,
          upi_ref, source, raw_sms, transaction_date
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING
          id::text AS id,
          amount::float8 AS amount,
          type,
          merchant,
          category,
          description,
          upi_ref AS "upiRef",
          source,
          raw_sms AS "rawSms",
          transaction_date AS "transactionDate",
          created_at AS "createdAt"
      `,
      [userId, amt, type, merch || null, cat, desc, ref, src, raw, txDate.toISOString()],
    );
    return res.status(201).json(rows[0]);
  } catch (e) {
    console.error("[transactions] POST", e);
    return res.status(500).json({ error: "Could not save transaction" });
  }
});

router.get("/", async (req, res) => {
  const userId = req.auth.userId;
  const month = req.query.month != null ? parseInt(String(req.query.month), 10) : null;
  const year = req.query.year != null ? parseInt(String(req.query.year), 10) : null;
  const categoryFilter = req.query.category ? String(req.query.category).trim() : null;
  const limit = Math.min(parseInt(String(req.query.limit || "50"), 10) || 50, 200);
  const offset = Math.max(parseInt(String(req.query.offset || "0"), 10) || 0, 0);

  const conditions = ["user_id = $1"];
  const params = [userId];
  let p = 2;

  if (month != null && year != null && Number.isFinite(month) && Number.isFinite(year)) {
    conditions.push(
      `transaction_date >= $${p}::timestamptz AND transaction_date < ($${p}::timestamptz + interval '1 month')`,
    );
    params.push(new Date(Date.UTC(year, month - 1, 1)).toISOString());
    p++;
  }
  if (categoryFilter) {
    conditions.push(`category = $${p}`);
    params.push(categoryFilter);
    p++;
  }

  const where = conditions.join(" AND ");

  try {
    const listParams = [...params, limit, offset];
    const { rows } = await pool.query(
      `
        SELECT
          id::text AS id,
          amount::float8 AS amount,
          type,
          COALESCE(merchant, description) AS merchant,
          category,
          description,
          upi_ref AS "upiRef",
          source,
          raw_sms AS "rawSms",
          transaction_date AS "transactionDate",
          created_at AS "createdAt"
        FROM transactions
        WHERE ${where}
        ORDER BY transaction_date DESC, created_at DESC
        LIMIT $${p} OFFSET $${p + 1}
      `,
      listParams,
    );

    const { rows: agg } = await pool.query(
      `
        SELECT
          COUNT(*)::int AS total,
          COALESCE(SUM(CASE WHEN type = 'debit' THEN amount ELSE 0 END), 0)::float8 AS "totalDebit",
          COALESCE(SUM(CASE WHEN type = 'credit' THEN amount ELSE 0 END), 0)::float8 AS "totalCredit"
        FROM transactions
        WHERE ${where}
      `,
      params,
    );

    return res.json({
      transactions: rows,
      total: Number(agg[0]?.total || 0),
      totalDebit: Number(agg[0]?.totalDebit || 0),
      totalCredit: Number(agg[0]?.totalCredit || 0),
    });
  } catch (e) {
    console.error("[transactions] GET", e);
    return res.status(500).json({ error: "Could not load transactions" });
  }
});

router.get("/summary", async (req, res) => {
  const userId = req.auth.userId;

  try {
    const { rows: cur } = await pool.query(
      `
        SELECT
          COALESCE(SUM(amount), 0)::float8 AS total,
          COALESCE(SUM(CASE WHEN type = 'debit' THEN amount ELSE 0 END), 0)::float8 AS debit,
          COALESCE(SUM(CASE WHEN type = 'credit' THEN amount ELSE 0 END), 0)::float8 AS credit,
          COUNT(*)::int AS count
        FROM transactions
        WHERE user_id = $1
          AND transaction_date >= date_trunc('month', CURRENT_TIMESTAMP)
          AND transaction_date < date_trunc('month', CURRENT_TIMESTAMP) + interval '1 month'
      `,
      [userId],
    );

    const { rows: months } = await pool.query(
      `
        SELECT
          EXTRACT(MONTH FROM d)::int AS month,
          EXTRACT(YEAR FROM d)::int AS year,
          COALESCE(SUM(CASE WHEN t.type = 'debit' THEN t.amount ELSE 0 END), 0)::float8 AS debit,
          COALESCE(SUM(CASE WHEN t.type = 'credit' THEN t.amount ELSE 0 END), 0)::float8 AS credit
        FROM generate_series(
          date_trunc('month', CURRENT_TIMESTAMP) - interval '5 months',
          date_trunc('month', CURRENT_TIMESTAMP),
          interval '1 month'
        ) AS d
        LEFT JOIN transactions t
          ON t.user_id = $1
          AND t.transaction_date >= d
          AND t.transaction_date < d + interval '1 month'
        GROUP BY d
        ORDER BY d
      `,
      [userId],
    );

    const { rows: topCat } = await pool.query(
      `
        SELECT
          category,
          COALESCE(SUM(amount), 0)::float8 AS amount,
          COUNT(*)::int AS count
        FROM transactions
        WHERE user_id = $1
          AND type = 'debit'
          AND transaction_date >= date_trunc('month', CURRENT_TIMESTAMP)
          AND transaction_date < date_trunc('month', CURRENT_TIMESTAMP) + interval '1 month'
        GROUP BY category
        ORDER BY amount DESC
        LIMIT 8
      `,
      [userId],
    );

    const current = cur[0] || {};
    return res.json({
      currentMonth: {
        total: Number(current.total || 0),
        debit: Number(current.debit || 0),
        credit: Number(current.credit || 0),
        count: Number(current.count || 0),
      },
      last6Months: months.map((row) => ({
        month: Number(row.month),
        year: Number(row.year),
        debit: Number(row.debit || 0),
        credit: Number(row.credit || 0),
      })),
      topCategories: topCat.map((row) => ({
        category: row.category,
        amount: Number(row.amount || 0),
        count: Number(row.count || 0),
      })),
    });
  } catch (e) {
    console.error("[transactions] summary", e);
    return res.status(500).json({ error: "Could not load summary" });
  }
});

router.delete("/:id", async (req, res) => {
  const userId = req.auth.userId;
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: "Invalid transaction id" });
  }
  try {
    const result = await pool.query("DELETE FROM transactions WHERE id = $1 AND user_id = $2", [id, userId]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Transaction not found" });
    }
    return res.status(204).send();
  } catch (e) {
    console.error("[transactions] DELETE", e);
    return res.status(500).json({ error: "Could not delete transaction" });
  }
});

export function createTransactionsRouter() {
  return router;
}
