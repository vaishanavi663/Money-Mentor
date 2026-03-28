export interface UserProfile {
  name: string;
  email: string;
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
