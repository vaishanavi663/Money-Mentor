import { Router } from "express";
import { pool } from "../db.js";

const router = Router();

function fyStartDate(d = new Date()) {
  const y = d.getFullYear();
  const m = d.getMonth();
  if (m >= 3) {
    return new Date(Date.UTC(y, 3, 1));
  }
  return new Date(Date.UTC(y - 1, 3, 1));
}

function fyEndDate(d = new Date()) {
  const start = fyStartDate(d);
  return new Date(Date.UTC(start.getUTCFullYear() + 1, 2, 31, 23, 59, 59, 999));
}

function monthStart(d = new Date()) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

function tipMonthKey(d = new Date()) {
  const s = monthStart(d);
  return s.toISOString().slice(0, 10);
}

function formatInr(n) {
  return `₹${Math.round(Number(n) || 0).toLocaleString("en-IN")}`;
}

router.get("/", async (req, res) => {
  const userId = req.auth.userId;
  const fyStart = fyStartDate();
  const fyEnd = fyEndDate();
  const monthKey = tipMonthKey();

  const client = await pool.connect();
  let inTxn = false;
  try {
    const { rows: dismissedCats } = await client.query(
      `
        SELECT DISTINCT category
        FROM tax_tips
        WHERE user_id = $1 AND tip_month = $2::date AND is_dismissed = TRUE AND category IS NOT NULL
      `,
      [userId, monthKey],
    );
    const dismissed = new Set(dismissedCats.map((r) => r.category).filter(Boolean));

    const tipsToInsert = [];

    const inv = await client.query(
      `
        SELECT COALESCE(SUM(amount), 0)::float8 AS s
        FROM transactions
        WHERE user_id = $1
          AND category = 'Investments'
          AND type = 'debit'
          AND transaction_date >= $2::timestamptz
          AND transaction_date <= $3::timestamptz
      `,
      [userId, fyStart.toISOString(), fyEnd.toISOString()],
    );
    const invested = Number(inv.rows[0]?.s || 0);
    const cap80c = 150000;
    if (invested < cap80c && !dismissed.has("80C")) {
      const more = cap80c - invested;
      const estRate = 0.3;
      const potentialSavings = Math.round(more * estRate);
      tipsToInsert.push({
        category: "80C",
        tip: `You've invested ${formatInr(invested)} so far this financial year. You can save up to ${formatInr(
          potentialSavings,
        )} more in tax by investing ${formatInr(more)} more in ELSS/PPF/NPS before March 31.`,
        potentialSavings,
        icon: "piggy-bank",
      });
    }

    const healthIns = await client.query(
      `
        SELECT COALESCE(SUM(amount), 0)::float8 AS s
        FROM transactions
        WHERE user_id = $1
          AND category = 'Insurance'
          AND type = 'debit'
          AND (merchant ILIKE '%health%' OR description ILIKE '%health%')
          AND transaction_date >= $2::timestamptz
          AND transaction_date <= $3::timestamptz
      `,
      [userId, fyStart.toISOString(), fyEnd.toISOString()],
    );
    const hSum = Number(healthIns.rows[0]?.s || 0);
    if (hSum === 0 && !dismissed.has("80D")) {
      tipsToInsert.push({
        category: "80D",
        tip: "No health insurance payments detected. Premiums up to ₹25,000 are tax-deductible under Section 80D.",
        potentialSavings: 7500,
        icon: "heart-pulse",
      });
    }

    const rent = await client.query(
      `
        SELECT COALESCE(SUM(amount), 0)::float8 AS s
        FROM transactions
        WHERE user_id = $1
          AND type = 'debit'
          AND (
            merchant ILIKE '%rent%' OR merchant ILIKE '%landlord%'
            OR description ILIKE '%rent%' OR description ILIKE '%landlord%'
          )
      `,
      [userId],
    );
    const rentSum = Number(rent.rows[0]?.s || 0);
    if (rentSum > 0 && !dismissed.has("HRA")) {
      tipsToInsert.push({
        category: "HRA",
        tip: `We detected rent payments of ${formatInr(rentSum)}. Make sure you're submitting rent receipts to HR to claim HRA exemption.`,
        potentialSavings: null,
        icon: "home",
      });
    }

    const food = await client.query(
      `
        SELECT COALESCE(SUM(amount), 0)::float8 AS s
        FROM transactions
        WHERE user_id = $1
          AND category = 'Food & Dining'
          AND type = 'debit'
          AND transaction_date >= date_trunc('month', CURRENT_TIMESTAMP)
          AND transaction_date < date_trunc('month', CURRENT_TIMESTAMP) + interval '1 month'
      `,
      [userId],
    );
    const foodSum = Number(food.rows[0]?.s || 0);
    const benchmark = 5000;
    if (foodSum > benchmark && !dismissed.has("Spending Alert")) {
      const over = foodSum - benchmark;
      tipsToInsert.push({
        category: "Spending Alert",
        tip: `You've spent ${formatInr(foodSum)} on food delivery this month — ${formatInr(
          over,
        )} above the ₹5,000 healthy benchmark for your income level.`,
        potentialSavings: null,
        icon: "utensils",
      });
    }

    await client.query("BEGIN");
    inTxn = true;
    await client.query(
      `DELETE FROM tax_tips WHERE user_id = $1 AND tip_month = $2::date AND is_dismissed = FALSE`,
      [userId, monthKey],
    );

    const saved = [];
    for (const t of tipsToInsert) {
      const { rows } = await client.query(
        `
          INSERT INTO tax_tips (user_id, category, tip, potential_savings, icon, tip_month)
          VALUES ($1, $2, $3, $4, $5, $6::date)
          RETURNING id::text AS id, category, tip, potential_savings AS "potentialSavings", icon
        `,
        [userId, t.category, t.tip, t.potentialSavings ?? null, t.icon, monthKey],
      );
      saved.push(rows[0]);
    }

    await client.query("COMMIT");
    inTxn = false;
    return res.json({ tips: saved });
  } catch (e) {
    if (inTxn) {
      await client.query("ROLLBACK").catch(() => {});
    }
    console.error("[tax-tips] GET", e);
    return res.status(500).json({ error: "Could not load tax tips" });
  } finally {
    client.release();
  }
});

router.post("/:id/dismiss", async (req, res) => {
  const userId = req.auth.userId;
  const id = String(req.params.id || "").trim();
  if (!id) {
    return res.status(400).json({ error: "Invalid id" });
  }
  try {
    const result = await pool.query(
      `
        UPDATE tax_tips
        SET is_dismissed = TRUE
        WHERE id = $1::uuid AND user_id = $2
        RETURNING id::text AS id
      `,
      [id, userId],
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Tip not found" });
    }
    return res.json({ ok: true, id: result.rows[0].id });
  } catch (e) {
    console.error("[tax-tips] dismiss", e);
    return res.status(500).json({ error: "Could not dismiss tip" });
  }
});

export function createTaxTipsRouter() {
  return router;
}
