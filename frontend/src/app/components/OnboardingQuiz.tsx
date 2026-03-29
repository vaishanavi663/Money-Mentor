import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Slider } from "./ui/slider";
import { Progress } from "./ui/progress";
import { useUserProfile } from "../context/UserProfileContext";

interface OnboardingQuizProps {
  onCompleted: () => void;
}

type RiskProfile = "conservative" | "moderate" | "aggressive";

const INCOME_OPTIONS = [
  { label: "Under ₹35,000 (early career)", value: 25000, display: "🌱 Under ₹35,000 (early career)" },
  { label: "₹35K – ₹1 Lakh (growing)", value: 67500, display: "📈 ₹35K – ₹1 Lakh (growing)" },
  { label: "₹1L – ₹2.5L (senior professional)", value: 175000, display: "🚀 ₹1L – ₹2.5L (senior professional)" },
  { label: "₹2.5L+ (high earner)", value: 300000, display: "💎 ₹2.5L+ (high earner)" },
];

const EXPENSE_OPTIONS = [
  { label: "Under ₹25K", value: 20000, display: "🏠 Under ₹25K" },
  { label: "₹25K – ₹60K", value: 42500, display: "🛵 ₹25K – ₹60K" },
  { label: "₹60K – ₹1.5L", value: 105000, display: "🚗 ₹60K – ₹1.5L" },
  { label: "₹1.5L+", value: 180000, display: "✈️ ₹1.5L+" },
];

const GOALS = [
  "Early Retirement (FIRE)",
  "Buy a House",
  "Child's Education",
  "Travel & Experiences",
  "Emergency Fund",
  "Wealth Creation",
];

const TOTAL_STEPS = 5;

function OptionCard({
  isSelected,
  title,
  onClick,
}: {
  isSelected: boolean;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-2xl border px-4 py-4 text-left transition-all ${
        isSelected ? "border-green-500 bg-green-50 shadow-sm" : "border-gray-200 bg-white hover:border-gray-300"
      }`}
    >
      <p className="font-medium text-gray-900">{title}</p>
    </button>
  );
}

export function OnboardingQuiz({ onCompleted }: OnboardingQuizProps) {
  const { completeOnboarding, profile } = useUserProfile();
  const [step, setStep] = useState(1);
  const [age, setAge] = useState(28);
  const [monthlyIncome, setMonthlyIncome] = useState<number>(67500);
  const [manualIncome, setManualIncome] = useState("");
  const [monthlyExpenses, setMonthlyExpenses] = useState<number>(42500);
  const [manualExpenses, setManualExpenses] = useState("");
  const [goals, setGoals] = useState<string[]>([]);
  const [riskProfile, setRiskProfile] = useState<RiskProfile | null>(null);

  const selectedIncome = useMemo(() => {
    const manual = Number(manualIncome);
    return manual > 0 ? manual : monthlyIncome;
  }, [manualIncome, monthlyIncome]);

  const selectedExpenses = useMemo(() => {
    const manual = Number(manualExpenses);
    return manual > 0 ? manual : monthlyExpenses;
  }, [manualExpenses, monthlyExpenses]);

  const savingsHint = useMemo(() => {
    const savings = selectedIncome - selectedExpenses;
    const rate = selectedIncome > 0 ? (savings / selectedIncome) * 100 : 0;
    return {
      savings,
      rate,
    };
  }, [selectedExpenses, selectedIncome]);

  const canProceed = useMemo(() => {
    if (step === 1) return age >= 18 && age <= 65;
    if (step === 2) return selectedIncome > 0;
    if (step === 3) return selectedExpenses > 0;
    if (step === 4) return goals.length > 0;
    if (step === 5) return Boolean(riskProfile);
    return false;
  }, [age, goals.length, riskProfile, selectedExpenses, selectedIncome, step]);

  const goNext = () => {
    if (!canProceed) return;
    if (step < TOTAL_STEPS) {
      setStep((prev) => prev + 1);
      return;
    }
    completeOnboarding({
      age,
      monthlyIncome: selectedIncome,
      monthlyExpenses: selectedExpenses,
      goals,
      currentInvestments: [],
      riskProfile: riskProfile || "moderate",
      primaryConcern: "",
    });
    onCompleted();
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 p-4 sm:p-6">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-4xl flex-col">
        <div className="mb-6 rounded-2xl bg-white/10 p-4 backdrop-blur-md">
          <div className="mb-2 flex items-center justify-between text-sm text-emerald-100">
            <span>{profile.name ? `Welcome ${profile.name}, let's personalize your dashboard` : "Let's personalize your dashboard"}</span>
            <span>
              Step {step} of {TOTAL_STEPS}
            </span>
          </div>
          <Progress value={(step / TOTAL_STEPS) * 100} className="h-2 bg-white/20" />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -60 }}
            transition={{ duration: 0.25 }}
            className="flex flex-1 flex-col rounded-3xl bg-white p-6 shadow-2xl sm:p-10"
          >
            {step === 1 && (
              <div className="my-auto">
                <h2 className="text-3xl font-bold text-gray-900">How old are you?</h2>
                <p className="mt-2 text-gray-600">Helps us build an age-appropriate investment strategy</p>
                <div className="mt-10">
                  <p className="mb-4 text-5xl font-bold text-emerald-600">{age}</p>
                  <Slider min={18} max={65} step={1} value={[age]} onValueChange={(value) => setAge(value[0] || 18)} />
                  <div className="mt-2 flex justify-between text-xs text-gray-500">
                    <span>18</span>
                    <span>65</span>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="my-auto">
                <h2 className="text-3xl font-bold text-gray-900">What's your monthly income?</h2>
                <div className="mt-6 grid gap-3">
                  {INCOME_OPTIONS.map((option) => (
                    <OptionCard
                      key={option.label}
                      title={option.display}
                      isSelected={monthlyIncome === option.value}
                      onClick={() => setMonthlyIncome(option.value)}
                    />
                  ))}
                </div>
                <div className="mt-5">
                  <label className="mb-2 block text-sm text-gray-600">Or enter manually</label>
                  <input
                    type="number"
                    value={manualIncome}
                    onChange={(event) => setManualIncome(event.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-emerald-500"
                    placeholder="e.g. 80000"
                  />
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="my-auto">
                <h2 className="text-3xl font-bold text-gray-900">How much do you spend per month?</h2>
                <p className="mt-2 text-gray-600">Include rent, food, EMIs, subscriptions</p>
                <div className="mt-6 grid gap-3">
                  {EXPENSE_OPTIONS.map((option) => (
                    <OptionCard
                      key={option.label}
                      title={option.display}
                      isSelected={monthlyExpenses === option.value}
                      onClick={() => setMonthlyExpenses(option.value)}
                    />
                  ))}
                </div>
                <div className="mt-5">
                  <label className="mb-2 block text-sm text-gray-600">Or enter manually</label>
                  <input
                    type="number"
                    value={manualExpenses}
                    onChange={(event) => setManualExpenses(event.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-emerald-500"
                    placeholder="e.g. 40000"
                  />
                </div>
                <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                  You can save ₹{Math.max(0, savingsHint.savings).toLocaleString("en-IN")}/month - that's{" "}
                  {Math.max(0, savingsHint.rate).toFixed(1)}% savings rate
                </p>
              </div>
            )}

            {step === 4 && (
              <div className="my-auto">
                <h2 className="text-3xl font-bold text-gray-900">What are your top financial goals?</h2>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {GOALS.map((goal) => (
                    <OptionCard
                      key={goal}
                      title={goal}
                      isSelected={goals.includes(goal)}
                      onClick={() =>
                        setGoals((prev) => (prev.includes(goal) ? prev.filter((item) => item !== goal) : [...prev, goal]))
                      }
                    />
                  ))}
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="my-auto">
                <h2 className="text-3xl font-bold text-gray-900">How do you feel about investment risk?</h2>
                <div className="mt-6 grid gap-3">
                  <OptionCard
                    title="😴 Conservative — I want safety over returns"
                    isSelected={riskProfile === "conservative"}
                    onClick={() => setRiskProfile("conservative")}
                  />
                  <OptionCard
                    title="⚖️ Moderate — balanced growth is fine"
                    isSelected={riskProfile === "moderate"}
                    onClick={() => setRiskProfile("moderate")}
                  />
                  <OptionCard
                    title="🚀 Aggressive — I want maximum growth"
                    isSelected={riskProfile === "aggressive"}
                    onClick={() => setRiskProfile("aggressive")}
                  />
                </div>
                <div className="mt-6 rounded-xl bg-slate-100 p-4">
                  <div className="mb-2 h-2 w-full rounded-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500" />
                  <p className="text-sm text-gray-600">Risk-o-meter: conservative to aggressive</p>
                </div>
              </div>
            )}

            <div className="mt-8 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep((prev) => Math.max(1, prev - 1))}
                className="rounded-xl border border-gray-300 px-5 py-3 text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-40"
                disabled={step === 1}
              >
                Back
              </button>
              <button
                type="button"
                onClick={goNext}
                disabled={!canProceed}
                className="rounded-xl bg-gradient-to-r from-emerald-600 to-blue-600 px-6 py-3 font-semibold text-white transition-opacity disabled:opacity-50"
              >
                {step === TOTAL_STEPS ? "Complete onboarding" : "Continue"}
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
