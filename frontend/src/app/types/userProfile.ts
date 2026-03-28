export type UserPlan = "free" | "pro";

export interface UserProfile {
  name: string;
  email: string;
  plan: UserPlan;
  planExpiresAt: string | null;
  age: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  goals: string[];
  currentInvestments: string[];
  riskProfile: "conservative" | "moderate" | "aggressive";
  primaryConcern: string;
  monthlySavings: number;
  savingsRate: number;
  annualIncome: number;
  moneyHealthScore: number;
  fireAge: number;
  recommendedSIP: number;
  estimatedTaxSavings: number;
  hasCompletedOnboarding: boolean;
  onboardingCompletedAt: string;
}
