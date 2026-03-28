import { Router } from "express";

const TOP_FUNDS = [
  { code: 120503, name: "SBI Bluechip Fund", category: "Large Cap", type: "Equity" },
  { code: 125497, name: "HDFC Top 100 Fund", category: "Large Cap", type: "Equity" },
  { code: 120465, name: "Axis Long Term Equity", category: "ELSS (Tax Saving)", type: "Equity" },
  { code: 119598, name: "Mirae Asset Emerging Bluechip", category: "Large & Mid Cap", type: "Equity" },
  { code: 147622, name: "Parag Parikh Flexi Cap Fund", category: "Flexi Cap", type: "Equity" },
  { code: 120837, name: "ICICI Pru Liquid Fund", category: "Liquid", type: "Debt" },
  { code: 101305, name: "HDFC Gilt Fund", category: "Gilt", type: "Debt" },
  { code: 130503, name: "Nippon India Gold ETF", category: "Gold ETF", type: "Gold" },
];

export function createMfRouter() {
  const router = Router();

  router.get("/search", async (req, res) => {
    try {
      const q = String(req.query.q || "").trim();
      if (!q) return res.json([]);
      const response = await fetch(`https://api.mfapi.in/mf/search?q=${encodeURIComponent(q)}`);
      const data = await response.json();
      res.json(data);
    } catch {
      res.status(502).json({ error: "MF API unavailable" });
    }
  });

  router.get("/top", async (_req, res) => {
    try {
      const results = await Promise.allSettled(
        TOP_FUNDS.map(async (fund) => {
          const r = await fetch(`https://api.mfapi.in/mf/${fund.code}/latest`);
          const data = await r.json();
          const latest = data.data?.[0];
          const prev = data.data?.[1];
          const nav = parseFloat(latest?.nav || "0");
          const prevNav = parseFloat(prev?.nav || "0");
          const change = prevNav > 0 ? ((nav - prevNav) / prevNav) * 100 : 0;
          return {
            ...fund,
            nav: nav.toFixed(4),
            navDate: latest?.date || "",
            change: change.toFixed(2),
            schemeCode: fund.code,
            url: `https://www.amfiindia.com/nav-history-download?mfID=${fund.code}`,
            investUrl: `https://groww.in/mutual-funds/${fund.code}`,
          };
        }),
      );

      const funds = results.filter((r) => r.status === "fulfilled").map((r) => r.value);
      res.json(funds);
    } catch {
      res.status(502).json({ error: "MF API unavailable" });
    }
  });

  return router;
}
