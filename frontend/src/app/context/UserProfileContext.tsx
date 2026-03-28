import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, getStoredToken } from "../lib/api";
import type { UserProfile } from "../types/userProfile";

export const USER_PROFILE_STORAGE_KEY = "mm_user_profile";

export type { UserProfile };

const DEFAULT_PROFILE: UserProfile = {
  name: "",
  email: "",
  age: 28,
  monthlyIncome: 60000,
  monthlyExpenses: 35000,
  goals: [],
  currentInvestments: [],
  riskProfile: "moderate",
  primaryConcern: "",
  monthlySavings: 25000,
  savingsRate: 41.67,
  annualIncome: 720000,
  moneyHealthScore: 0,
  fireAge: 60,
  recommendedSIP: 0,
  estimatedTaxSavings: 0,
  hasCompletedOnboarding: false,
  onboardingCompletedAt: "",
};

function toSafeNumber(value: number) {
  return Number.isFinite(value) ? value : 0;
}

export function calculateMoneyHealthScore(profile: UserProfile): number {
  let score = 0;

  if (profile.savingsRate >= 40) score += 30;
  else if (profile.savingsRate >= 25) score += 20;
  else if (profile.savingsRate >= 10) score += 10;

  const invCount = profile.currentInvestments.filter((i) => i !== "Nothing yet — just starting").length;
  score += Math.min(30, invCount * 8);

  const ageScore = Math.max(0, 20 - Math.floor(profile.age / 5));
  score += ageScore;

  if (profile.currentInvestments.includes("Life Insurance")) score += 10;

  if (
    profile.goals.includes("Emergency Fund") ||
    profile.currentInvestments.includes("FD / Savings Account")
  ) {
    score += 10;
  }

  return Math.min(100, score);
}

export function calculateFireAge(profile: UserProfile): number {
  const savingsRate = profile.savingsRate / 100;
  const safeMonthlySavings = Math.max(1, profile.monthlySavings);
  const yearsToFire =
    savingsRate > 0
      ? Math.log(1 + ((profile.monthlyExpenses * 12 * 25) / (safeMonthlySavings * 12)) * 0.12) / Math.log(1.12)
      : 40;
  return Math.min(70, Math.round(profile.age + Math.max(5, yearsToFire)));
}

function calculateRecommendedSIP(profile: UserProfile) {
  const ratioByRisk = {
    conservative: 0.35,
    moderate: 0.5,
    aggressive: 0.65,
  } as const;
  return Math.max(0, Math.round(profile.monthlySavings * ratioByRisk[profile.riskProfile]));
}

function calculateEstimatedTaxSavings(profile: UserProfile) {
  const annualEligible = Math.min(150000, profile.annualIncome * 0.2);
  const taxRate = profile.monthlyIncome >= 250000 ? 0.3 : profile.monthlyIncome >= 100000 ? 0.2 : 0.1;
  return Math.round(annualEligible * taxRate);
}

function withDerivedFields(profile: UserProfile): UserProfile {
  const monthlySavings = toSafeNumber(profile.monthlyIncome - profile.monthlyExpenses);
  const savingsRate = profile.monthlyIncome > 0 ? toSafeNumber((monthlySavings / profile.monthlyIncome) * 100) : 0;
  const annualIncome = toSafeNumber(profile.monthlyIncome * 12);

  const merged = {
    ...profile,
    monthlySavings,
    savingsRate: Number(savingsRate.toFixed(2)),
    annualIncome,
  };

  return {
    ...merged,
    moneyHealthScore: calculateMoneyHealthScore(merged),
    fireAge: calculateFireAge(merged),
    recommendedSIP: calculateRecommendedSIP(merged),
    estimatedTaxSavings: calculateEstimatedTaxSavings(merged),
  };
}

interface UserProfileContextValue {
  profile: UserProfile;
  updateProfile: (updates: Partial<UserProfile>) => void;
  completeOnboarding: (
    payload: Pick<
      UserProfile,
      | "age"
      | "monthlyIncome"
      | "monthlyExpenses"
      | "goals"
      | "currentInvestments"
      | "riskProfile"
      | "primaryConcern"
    >,
  ) => void;
  setIdentity: (identity: Pick<UserProfile, "name" | "email">) => void;
  hydrateFromServer: (serverProfile: UserProfile) => void;
  clearProfile: () => void;
}

const UserProfileContext = createContext<UserProfileContextValue | null>(null);

function getStoredProfile(): UserProfile {
  try {
    const raw = localStorage.getItem(USER_PROFILE_STORAGE_KEY);
    if (!raw) return withDerivedFields(DEFAULT_PROFILE);
    const parsed = JSON.parse(raw) as Partial<UserProfile>;
    return withDerivedFields({ ...DEFAULT_PROFILE, ...parsed });
  } catch {
    return withDerivedFields(DEFAULT_PROFILE);
  }
}

export function UserProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile>(() => getStoredProfile());

  useEffect(() => {
    localStorage.setItem(USER_PROFILE_STORAGE_KEY, JSON.stringify(profile));
  }, [profile]);

  const value = useMemo<UserProfileContextValue>(
    () => ({
      profile,
      updateProfile: (updates) => {
        setProfile((previous) => withDerivedFields({ ...previous, ...updates }));
      },
      completeOnboarding: (payload) => {
        setProfile((previous) => {
          const next = withDerivedFields({
            ...previous,
            ...payload,
            hasCompletedOnboarding: true,
            onboardingCompletedAt: new Date().toISOString(),
          });
          if (getStoredToken()) {
            void api.putUserProfile(next).catch(() => {});
          }
          return next;
        });
      },
      setIdentity: (identity) => {
        setProfile((previous) => withDerivedFields({ ...previous, ...identity }));
      },
      hydrateFromServer: (serverProfile) => {
        setProfile(withDerivedFields({ ...DEFAULT_PROFILE, ...serverProfile }));
      },
      clearProfile: () => {
        localStorage.removeItem(USER_PROFILE_STORAGE_KEY);
        setProfile(withDerivedFields(DEFAULT_PROFILE));
      },
    }),
    [profile],
  );

  return <UserProfileContext.Provider value={value}>{children}</UserProfileContext.Provider>;
}

export function useUserProfile() {
  const context = useContext(UserProfileContext);
  if (!context) {
    throw new Error("useUserProfile must be used within UserProfileProvider");
  }
  return context;
}
