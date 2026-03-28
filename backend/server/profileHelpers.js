/**
 * Mirrors frontend UserProfile derived fields for GET/PUT /api/profile.
 */

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function calculateMoneyHealthScore(p) {
  let score = 0;
  const savingsRate = p.savingsRate;

  if (savingsRate >= 40) score += 30;
  else if (savingsRate >= 25) score += 20;
  else if (savingsRate >= 10) score += 10;

  const invCount = (p.currentInvestments || []).filter((i) => i !== "Nothing yet — just starting").length;
  score += Math.min(30, invCount * 8);

  const ageScore = Math.max(0, 20 - Math.floor(toNum(p.age) / 5));
  score += ageScore;

  if ((p.currentInvestments || []).includes("Life Insurance")) score += 10;

  if (
    (p.goals || []).includes("Emergency Fund") ||
    (p.currentInvestments || []).includes("FD / Savings Account")
  ) {
    score += 10;
  }

  return Math.min(100, score);
}

export function calculateFireAge(p) {
  const age = toNum(p.age);
  const monthlySavings = Math.max(1, toNum(p.monthlySavings));
  const monthlyExpenses = toNum(p.monthlyExpenses);
  const savingsRate = toNum(p.savingsRate) / 100;
  const yearsToFire =
    savingsRate > 0
      ? Math.log(1 + ((monthlyExpenses * 12 * 25) / (monthlySavings * 12)) * 0.12) / Math.log(1.12)
      : 40;
  return Math.min(70, Math.round(age + Math.max(5, yearsToFire)));
}

function calculateRecommendedSIP(p) {
  const ratioByRisk = {
    conservative: 0.35,
    moderate: 0.5,
    aggressive: 0.65,
  };
  const r = ratioByRisk[p.riskProfile] ?? 0.5;
  return Math.max(0, Math.round(toNum(p.monthlySavings) * r));
}

function calculateEstimatedTaxSavings(p) {
  const annualIncome = toNum(p.annualIncome);
  const monthlyIncome = toNum(p.monthlyIncome);
  const annualEligible = Math.min(150000, annualIncome * 0.2);
  const taxRate = monthlyIncome >= 250000 ? 0.3 : monthlyIncome >= 100000 ? 0.2 : 0.1;
  return Math.round(annualEligible * taxRate);
}

export function withDerivedFields(raw) {
  const monthlyIncome = toNum(raw.monthlyIncome ?? raw.monthly_income);
  const monthlyExpenses = toNum(raw.monthlyExpenses ?? raw.monthly_expenses);
  const monthlySavings = monthlyIncome - monthlyExpenses;
  const savingsRate = monthlyIncome > 0 ? Number(((monthlySavings / monthlyIncome) * 100).toFixed(2)) : 0;
  const annualIncome = monthlyIncome * 12;

  const goals = Array.isArray(raw.goals) ? raw.goals : [];
  const currentInvestments = Array.isArray(raw.currentInvestments ?? raw.current_investments)
    ? raw.currentInvestments ?? raw.current_investments
    : [];

  const base = {
    name: String(raw.name ?? ""),
    email: String(raw.email ?? ""),
    age: Math.max(18, Math.min(65, Math.round(toNum(raw.age)) || 28)),
    monthlyIncome,
    monthlyExpenses,
    goals,
    currentInvestments,
    riskProfile: ["conservative", "moderate", "aggressive"].includes(raw.riskProfile)
      ? raw.riskProfile
      : "moderate",
    primaryConcern: String(raw.primaryConcern ?? raw.primary_concern ?? ""),
    monthlySavings,
    savingsRate,
    annualIncome,
    hasCompletedOnboarding: Boolean(raw.hasCompletedOnboarding ?? raw.has_completed_onboarding),
    onboardingCompletedAt: raw.onboardingCompletedAt ?? raw.onboarding_completed_at ?? "",
  };

  const withScores = {
    ...base,
    moneyHealthScore: 0,
    fireAge: 60,
    recommendedSIP: 0,
    estimatedTaxSavings: 0,
  };

  withScores.moneyHealthScore = calculateMoneyHealthScore(withScores);
  withScores.fireAge = calculateFireAge(withScores);
  withScores.recommendedSIP = calculateRecommendedSIP(withScores);
  withScores.estimatedTaxSavings = calculateEstimatedTaxSavings(withScores);

  return withScores;
}

export function profileToApiResponse(profile) {
  return {
    name: profile.name,
    email: profile.email,
    age: profile.age,
    monthlyIncome: profile.monthlyIncome,
    monthlyExpenses: profile.monthlyExpenses,
    goals: profile.goals,
    currentInvestments: profile.currentInvestments,
    riskProfile: profile.riskProfile,
    primaryConcern: profile.primaryConcern,
    monthlySavings: profile.monthlySavings,
    savingsRate: profile.savingsRate,
    annualIncome: profile.annualIncome,
    moneyHealthScore: profile.moneyHealthScore,
    fireAge: profile.fireAge,
    recommendedSIP: profile.recommendedSIP,
    estimatedTaxSavings: profile.estimatedTaxSavings,
    hasCompletedOnboarding: profile.hasCompletedOnboarding,
    onboardingCompletedAt: profile.onboardingCompletedAt || "",
  };
}
