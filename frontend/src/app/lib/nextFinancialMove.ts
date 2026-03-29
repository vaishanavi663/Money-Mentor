import type { UserProfile } from "../types/userProfile";

export type NextMoveAppPage = "chat" | "expenses" | "health" | "tax-tips" | "simulator" | "schemes";

export type NextMoveNavigateTarget = NextMoveAppPage | "sms-import";

export interface TransactionSnapshot {
  hasTransactions: boolean;
  monthIncome: number;
  monthExpenses: number;
  monthNet: number;
  topCategoryName?: string;
}

export interface NextFinancialMoveResult {
  title: string;
  subtitle: string;
  rationale: string;
  supportingTips: string[];
  navigateTo: NextMoveNavigateTarget;
  ctaLabel: string;
  confidence: "high" | "medium" | "exploratory";
}

/** Display cap for SIP amounts in “Next Financial Move” copy */
const MAX_SIP_MONTHLY = 3000;

function fmt(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

function capSip(amount: number): number {
  return Math.min(Math.max(0, amount), MAX_SIP_MONTHLY);
}

function hasMutualOrSip(profile: UserProfile): boolean {
  return profile.currentInvestments.some(
    (i) => i.includes("Mutual Fund") || i.includes("SIP") || i.includes("MF"),
  );
}

type Candidate = Omit<NextFinancialMoveResult, "supportingTips"> & { score: number };

export function computeNextFinancialMove(
  profile: UserProfile,
  tx: TransactionSnapshot,
): NextFinancialMoveResult {
  const concern = (profile.primaryConcern || "").toLowerCase();
  const hasMF = hasMutualOrSip(profile);
  const emergencyInGoals = profile.goals.includes("Emergency Fund");
  const shortfallProfile = profile.monthlySavings < 0;
  const savingsRate = profile.savingsRate;
  const goalsLine = profile.goals.length ? profile.goals.join(", ") : "your stated goals";

  const candidates: Candidate[] = [];

  if (tx.hasTransactions && tx.monthNet < -500) {
    candidates.push({
      score: 100,
      title: `Stop the leak: ${fmt(Math.abs(tx.monthNet))} more went out than came in this month`,
      subtitle:
        "Your ledger shows more debits than credits — trim discretionary spends before the pattern repeats.",
      rationale: `This month’s activity shows ₹${tx.monthIncome.toLocaleString("en-IN")} credited vs ₹${tx.monthExpenses.toLocaleString("en-IN")} debited. Closing the gap protects credit scores and goal funding. Start with the largest debit categories, pause non-essential subscriptions, and schedule a weekly spend check until credits consistently exceed debits.`,
      navigateTo: "expenses",
      ctaLabel: "Open Expenses",
      confidence: "high",
    });
  }

  if (shortfallProfile && (!tx.hasTransactions || tx.monthNet >= 0)) {
    candidates.push({
      score: 96,
      title: `Align cash flow with your ~${fmt(profile.monthlyIncome)}/mo income`,
      subtitle: `Onboarding implies about ${fmt(Math.abs(profile.monthlySavings))}/mo shortfall — adjust the biggest expense lines.`,
      rationale: `Using your saved monthly income (${fmt(profile.monthlyIncome)}) and expenses (${fmt(profile.monthlyExpenses)}), spending exceeds income in the profile. Log real transactions in Expenses to validate, then cut or postpone the largest flexible costs until monthly savings turn positive.`,
      navigateTo: "expenses",
      ctaLabel: "Review spending",
      confidence: tx.hasTransactions ? "medium" : "exploratory",
    });
  }

  if (concern.includes("spend") || concern.includes("leak") || concern.includes("more than i earn")) {
    candidates.push({
      score: 91,
      title: "Stabilise spending vs income this month",
      subtitle: "Pick one category to cap (dining, shopping, or transfers) and track it weekly.",
      rationale: `You signalled spending stress. Pair a simple weekly budget for your weakest category with UPI SMS import so the dashboard reflects reality. Small caps beat vague “spend less” resolutions.`,
      navigateTo: "expenses",
      ctaLabel: "Inspect categories",
      confidence: "high",
    });
  }

  if (concern.includes("debt")) {
    candidates.push({
      score: 92,
      title: "Structure debt payoff: highest interest first",
      subtitle: "Keep all minimums paid, then throw extra at the costliest balance.",
      rationale: `List EMIs and card balances with APRs. The avalanche method minimises interest paid. If cash flow is tight, Chat can help you sequence payments and negotiate timelines without hurting essentials.`,
      navigateTo: "chat",
      ctaLabel: "Plan in AI Chat",
      confidence: "high",
    });
  }

  if (concern.includes("tax")) {
    candidates.push({
      score: 88,
      title: `Explore up to ~${fmt(profile.estimatedTaxSavings)} in estimated tax savings`,
      subtitle: "80C, NPS, and 80D are common levers — validate with your CA for your regime.",
      rationale: `At your income band, systematic 80C (ELSS, PPF, EPF), NPS, and health insurance premiums often reduce taxable income. Numbers here are indicative; use Tax tips as a checklist, not tax advice.`,
      navigateTo: "tax-tips",
      ctaLabel: "Open Tax tips",
      confidence: "medium",
    });
  }

  if (!emergencyInGoals && savingsRate >= 8 && profile.monthlySavings > 0) {
    const target = Math.round(profile.monthlyExpenses * 6);
    candidates.push({
      score: 84,
      title: `Target ${fmt(target)} in emergency savings (~6× monthly spend)`,
      subtitle: "Treat “Emergency Fund” as your top goal until the buffer is funded in liquid instruments.",
      rationale: `Before chasing returns, liquid savings prevent high-interest debt when income pauses. Six months of expenses (≈${fmt(profile.monthlyExpenses)}/mo) is a common benchmark; adjust down slightly if you have dual income or strong job security.`,
      navigateTo: "health",
      ctaLabel: "Check Money Health",
      confidence: "medium",
    });
  }

  if (savingsRate < 12 && profile.monthlySavings >= 0 && !shortfallProfile) {
    candidates.push({
      score: 80,
      title: `Lift savings from ${savingsRate.toFixed(0)}% toward 15–20%`,
      subtitle: `Try capping lifestyle spend near ${fmt(Math.round(profile.monthlyIncome * 0.78))}/mo and auto-transfer the rest.`,
      rationale: `Higher savings rates shorten goal timelines and improve resilience. One concrete win — cancel or downgrade a subscription, or pack lunch twice more per week — often funds the first step without drastic lifestyle cuts.`,
      navigateTo: "expenses",
      ctaLabel: "Find savings",
      confidence: "medium",
    });
  }

  if (!tx.hasTransactions) {
    candidates.push({
      score: 78,
      title: "Add real transactions so guidance matches your behaviour",
      subtitle: "Paste UPI/bank SMS — we parse merchants, amounts, and categories.",
      rationale: `Recommendations currently blend your profile with estimates. Importing even a short history unlocks category insights, month-to-month trends, and better detection of overspending versus your plan.`,
      navigateTo: "sms-import",
      ctaLabel: "Scroll to SMS import",
      confidence: "high",
    });
  }

  if (
    tx.hasTransactions &&
    tx.topCategoryName &&
    tx.monthExpenses > profile.monthlyExpenses * 1.12 &&
    profile.monthlyExpenses > 0
  ) {
    candidates.push({
      score: 76,
      title: `This month is running hot — ${tx.topCategoryName} leads spending`,
      subtitle: "Compare debits to your onboarding budget and adjust before it normalises.",
      rationale: `Recorded debits are above your profile expense estimate, with ${tx.topCategoryName} at the top. Review that category for repeat or impulse spends; small cuts there often free the most rupees per effort.`,
      navigateTo: "expenses",
      ctaLabel: "Open Expenses",
      confidence: "high",
    });
  }

  if (!hasMF && profile.recommendedSIP >= 1000 && profile.monthlySavings > 3000) {
    const sipDisplay = capSip(profile.recommendedSIP);
    candidates.push({
      score: 74,
      title: `Start a monthly SIP near ${fmt(sipDisplay)}`,
      subtitle: `Aligned to your ${profile.riskProfile} risk band and current surplus.`,
      rationale: `Rupee-cost averaging into diversified mutual funds suits long horizons. The suggested amount scales from your surplus and risk profile (capped at ${fmt(MAX_SIP_MONTHLY)}/mo for guidance) — confirm fund choice, KYC, and suitability with a SEBI-registered advisor or dig deeper in Chat.`,
      navigateTo: "chat",
      ctaLabel: "Talk SIPs in Chat",
      confidence: "medium",
    });
  }

  if (hasMF && profile.monthlySavings > 2000) {
    const stepped = capSip(Math.round(profile.recommendedSIP * 1.1));
    candidates.push({
      score: 70,
      title: `Consider stepping SIPs toward ${fmt(stepped)}/mo`,
      subtitle: "A modest annual bump keeps contributions aligned with raises and inflation.",
      rationale: `You already invest via mutual funds/SIP. Many investors raise SIPs ~10% yearly. If your income recently increased, capturing part of the raise in investments avoids lifestyle creep.`,
      navigateTo: "simulator",
      ctaLabel: "Model in Simulator",
      confidence: "medium",
    });
  }

  if (profile.goals.some((g) => g.includes("House"))) {
    candidates.push({
      score: 68,
      title: "Build a dedicated home down-payment corpus",
      subtitle: "Aim for a sizeable down payment to reduce EMI interest and LTV stress.",
      rationale: `Property goals need liquid savings for registration, down payment, and buffer. Keep this bucket separate from volatile equity so you are not forced to sell in a downturn when you book a home.`,
      navigateTo: "simulator",
      ctaLabel: "Project home timeline",
      confidence: "exploratory",
    });
  }

  if (profile.goals.some((g) => g.includes("FIRE") || g.includes("Retire"))) {
    candidates.push({
      score: 66,
      title: "Stress-test retirement with your savings rate and equity mix",
      subtitle: `Long horizons favour growth assets consistent with ${profile.riskProfile} risk.`,
      rationale: `FIRE-style goals need sustained high savings and disciplined equity exposure. The simulator helps visualise how rate-of-return and spend assumptions change your timeline.`,
      navigateTo: "simulator",
      ctaLabel: "Run scenario",
      confidence: "exploratory",
    });
  }

  if (profile.goals.some((g) => g.includes("Child") || g.includes("Education"))) {
    candidates.push({
      score: 65,
      title: "Start an education-specific goal with a clear monthly amount",
      subtitle: "Use dedicated debt/equity balance based on years until school fees spike.",
      rationale: `Education costs rise faster than general inflation. Naming a target year and monthly contribution (PPF, mutual funds, or Sukanya where applicable) reduces last-minute borrowing.`,
      navigateTo: "chat",
      ctaLabel: "Plan in Chat",
      confidence: "exploratory",
    });
  }

  if (profile.moneyHealthScore < 50) {
    candidates.push({
      score: 64,
      title: "Raise your money health score with two concrete habits",
      subtitle: "Automate one transfer to savings and cancel or downgrade one recurring bill.",
      rationale: `Your score blends savings rate, goals, and investment signals from your profile. The Money Health page breaks down pillars so you can attack the weakest link first.`,
      navigateTo: "health",
      ctaLabel: "Open Money Health",
      confidence: "medium",
    });
  }

  if (concern.includes("invest") || concern.includes("saving")) {
    candidates.push({
      score: 62,
      title: "Turn monthly surplus into a dated investment habit",
      subtitle: `With ~${fmt(profile.monthlySavings)}/mo free cash, automate one instrument this week.`,
      rationale: `You flagged weak savings or investments. Automating a fixed date SIP or recurring deposit removes willpower from the equation. Start small if needed — consistency beats size early on.`,
      navigateTo: "chat",
      ctaLabel: "Ask where to start",
      confidence: "medium",
    });
  }

  candidates.push({
    score: 35,
    title:
      profile.recommendedSIP >= 500
        ? `Stay consistent: ~${fmt(capSip(profile.recommendedSIP))}/mo toward ${goalsLine}`
        : `Keep saving toward ${goalsLine}`,
    subtitle: `You are putting away ~${savingsRate.toFixed(0)}% of income — maintain or nudge it up as earnings grow.`,
    rationale: `Your goals (${goalsLine}) and ${profile.riskProfile} risk profile suggest steady, boring investing beats timing markets. Revisit amounts after salary changes, large expenses, or new dependents.`,
    navigateTo: "chat",
    ctaLabel: "Refine in Chat",
    confidence: "exploratory",
  });

  candidates.sort((a, b) => b.score - a.score);
  const primary = candidates[0];

  const sipForTip = capSip(profile.recommendedSIP);
  const fixedNextMoveTips = [
    `You can invest ${fmt(sipForTip)}/month in SIP. Start growing your money today 🚀`,
    "You have used 90% of your budget ⚠️ Try to reduce spending this week.",
    "You spent ₹3,500 on food this week. Save ₹500 by reducing Swiggy orders.",
  ];

  const dynamicTips = candidates
    .slice(1, 8)
    .filter((c) => c.title !== primary.title)
    .slice(0, 3)
    .map((c) => c.subtitle);

  const supportingTips = [...fixedNextMoveTips, ...dynamicTips];

  return {
    title: primary.title,
    subtitle: primary.subtitle,
    rationale: primary.rationale,
    supportingTips,
    navigateTo: primary.navigateTo,
    ctaLabel: primary.ctaLabel,
    confidence: primary.confidence,
  };
}
