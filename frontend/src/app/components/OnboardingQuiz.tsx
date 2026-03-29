import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Slider } from "./ui/slider";
import { Progress } from "./ui/progress";
import { useUserProfile } from "../context/UserProfileContext";
import { VoiceAssistant } from "./VoiceAssistant";

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

const INVESTMENTS = [
  "FD / Savings Account",
  "Mutual Funds / SIPs",
  "Direct Stocks",
  "PPF / NPS",
  "Life Insurance",
  "Nothing yet — just starting",
];

const CONCERNS = [
  "I'm spending more than I earn",
  "I'm paying too much tax",
  "I have no investments / savings",
  "I want to buy property",
  "I don't know when I can retire",
  "I have debt I want to clear",
];

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
  const [investments, setInvestments] = useState<string[]>([]);
  const [riskProfile, setRiskProfile] = useState<RiskProfile | null>(null);
  const [primaryConcern, setPrimaryConcern] = useState("");

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

  const handleVoiceNavigate = (page: string) => {
    const command = page.toLowerCase().trim();
    
    if (command.includes('next') || command.includes('continue')) {
      if (canProceed) {
        goNext();
      }
    } else if (command.includes('back') || command.includes('previous')) {
      setStep(prev => Math.max(1, prev - 1));
    }
  };

  const handleVoiceType = (text: string) => {
    const lower = text.toLowerCase().trim();
    console.log(`🎙️ Voice input on step ${step}: "${text}"`);

    const isIncomeIntent = (cmd: string) =>
      cmd.includes('under') || cmd.includes('35') || cmd.includes('lakh') || cmd.includes('income') || /\b\d{5,6}\b/.test(cmd);

    const isExpenseIntent = (cmd: string) =>
      cmd.includes('expense') || cmd.includes('spend') || cmd.includes('bill') || /\b\d{4,6}\b/.test(cmd);

    let activeStep = step;

    // Step 1: Age setting
    if (activeStep === 1) {
      const ageMatch = lower.match(/(\d+)/);
      if (ageMatch) {
        const newAge = parseInt(ageMatch[1]);
        if (newAge >= 18 && newAge <= 65) {
          setAge(newAge);
          console.log(`✓ Age set to: ${newAge}`);
          return;
        }
      }

      // If voice looks like income info while on age step, advance to income.
      if (isIncomeIntent(lower)) {
        setStep(2);
        activeStep = 2;
        console.log('➡️ Interpreted as income command; moving to Step 2');
      } else if (isExpenseIntent(lower)) {
        setStep(3);
        activeStep = 3;
        console.log('➡️ Interpreted as expense command; moving to Step 3');
      }
    }
    
    // Step 2: Monthly income
    if (activeStep === 2) {
      // First try to extract direct number
      const incomeMatch = lower.match(/(\d+)/);
      if (incomeMatch) {
        const num = parseInt(incomeMatch[1]);
        // If it's a 5-6 digit number, treat it as income value
        if (num >= 10000) {
          setManualIncome(num.toString());
          setMonthlyIncome(67500); // Reset preset
          console.log(`✓ Income set to: ${num}`);
          return;
        }
      }
      
      // Handle preset options with various wordings
      if (lower.includes('under') || lower.includes('early') || lower.includes('35') && !lower.includes('lakh')) {
        setMonthlyIncome(25000);
        setManualIncome('');
        console.log(`✓ Income set to: Under 35K`);
      } else if (lower.includes('lakh') && (lower.includes('1') || lower.includes('100')) || lower.includes('growing') || lower.includes('67') || lower.includes('70')) {
        setMonthlyIncome(67500);
        setManualIncome('');
        console.log(`✓ Income set to: 35K-1L`);
      } else if (lower.includes('2.5') || lower.includes('175') || lower.includes('senior')) {
        setMonthlyIncome(175000);
        setManualIncome('');
        console.log(`✓ Income set to: 1L-2.5L`);
      } else if (lower.includes('high') || lower.includes('earner') || lower.includes('300') || lower.includes('2.5l')) {
        setMonthlyIncome(300000);
        setManualIncome('');
        console.log(`✓ Income set to: 2.5L+`);
      }
      return;
    }
    
    // Step 3: Monthly expenses
    if (activeStep === 3) {
      // First try to extract direct number
      const expenseMatch = lower.match(/(\d+)/);
      if (expenseMatch) {
        const num = parseInt(expenseMatch[1]);
        // If it's a 4-6 digit number, treat it as expense value
        if (num >= 10000) {
          setManualExpenses(num.toString());
          setMonthlyExpenses(42500); // Reset preset
          console.log(`✓ Expense set to: ${num}`);
          return;
        }
      }
      
      // Handle preset options with various wordings
      if (lower.includes('under') || lower.includes('25') && !lower.includes('lakh')) {
        setMonthlyExpenses(20000);
        setManualExpenses('');
        console.log(`✓ Expense set to: Under 25K`);
      } else if (lower.includes('42') || lower.includes('60') || lower.includes('growing')) {
        setMonthlyExpenses(42500);
        setManualExpenses('');
        console.log(`✓ Expense set to: 25K-60K`);
      } else if (lower.includes('105') || lower.includes('1.5') || lower.includes('lakh')) {
        setMonthlyExpenses(105000);
        setManualExpenses('');
        console.log(`✓ Expense set to: 60K-1.5L`);
      } else if (lower.includes('high') || lower.includes('180') || lower.includes('150')) {
        setMonthlyExpenses(180000);
        setManualExpenses('');
        console.log(`✓ Expense set to: 1.5L+`);
      }
      return;
    }
    
    // Step 4: Goals (multi-select)
    if (activeStep === 4) {
      let foundAny = false;
      const normalizedGoalPhrase = lower.replace(/[‘’']/g, '');

      for (const goal of GOALS) {
        const goalNormalized = goal.toLowerCase().replace(/[‘’']/g, '');
        const goalKeyword = goalNormalized.split(' ')[0];

        if (normalizedGoalPhrase.includes(goalNormalized) || normalizedGoalPhrase.includes(goalKeyword)) {
          if (!goals.includes(goal)) {
            setGoals(prev => [...prev, goal]);
            console.log(`✓ Goal selected: ${goal}`);
            foundAny = true;
          }
        }
      }

      if (foundAny) {
        setStep(5); // Advance to next question automatically
        console.log('➡️ Goal set; moving to step 5');
      }
      return;
    }
    
    // Step 5: Investments (multi-select)
    if (activeStep === 5) {
      let foundAny = false;
      const normalizedInvestmentPhrase = lower.replace(/[‘’']/g, '');

      for (const investment of INVESTMENTS) {
        const investNormalized = investment.toLowerCase().replace(/[‘’']/g, '');
        const investmentKeyword = investNormalized.split(' ')[0];

        if (normalizedInvestmentPhrase.includes(investNormalized) || normalizedInvestmentPhrase.includes(investmentKeyword)) {
          if (!investments.includes(investment)) {
            setInvestments(prev => [...prev, investment]);
            console.log(`✓ Investment selected: ${investment}`);
            foundAny = true;
          }
        }
      }

      if (foundAny) {
        setStep(6); // Advance to next question automatically
        console.log('➡️ Investment set; moving to step 6');
      }
      return;
    }
    
    // Step 6: Risk profile
    if (activeStep === 6) {
      let riskSet = false;
      if (lower.includes('conservative') || lower.includes('safety') || lower.includes('sleep')) {
        setRiskProfile('conservative');
        console.log(`✓ Risk profile set to: Conservative`);
        riskSet = true;
      } else if (lower.includes('moderate') || lower.includes('balanced') || lower.includes('average')) {
        setRiskProfile('moderate');
        console.log(`✓ Risk profile set to: Moderate`);
        riskSet = true;
      } else if (lower.includes('aggressive') || lower.includes('growth') || lower.includes('risk') || lower.includes('rocket')) {
        setRiskProfile('aggressive');
        console.log(`✓ Risk profile set to: Aggressive`);
        riskSet = true;
      }

      if (riskSet) {
        setStep(7);
        console.log('➡️ Risk profile set; moving to step 7');
      }
      return;
    }
    
    // Step 7: Primary concern
    if (activeStep === 7) {
      const normalizedConcernPhrase = lower.replace(/[‘’']/g, '');
      let foundConcern = false;

      for (const concern of CONCERNS) {
        const concernNormalized = concern.toLowerCase().replace(/[‘’']/g, '');
        if (normalizedConcernPhrase.includes(concernNormalized) || concernNormalized.includes(normalizedConcernPhrase)) {
          setPrimaryConcern(concern);
          console.log(`✓ Concern selected: ${concern}`);
          foundConcern = true;
          break;
        }

        const keywords = concernNormalized.split(' ');
        for (const keyword of keywords) {
          if (keyword.length > 3 && normalizedConcernPhrase.includes(keyword)) {
            setPrimaryConcern(concern);
            console.log(`✓ Concern selected: ${concern}`);
            foundConcern = true;
            break;
          }
        }

        if (foundConcern) break;
      }

      if (foundConcern) {
        console.log('✅ Concern step complete');
      }

      return;
    }
  };

  const canProceed = useMemo(() => {
    if (step === 1) return age >= 18 && age <= 65;
    if (step === 2) return selectedIncome > 0;
    if (step === 3) return selectedExpenses > 0;
    if (step === 4) return goals.length > 0;
    if (step === 5) return investments.length > 0;
    if (step === 6) return Boolean(riskProfile);
    if (step === 7) return Boolean(primaryConcern);
    return false;
  }, [age, goals.length, investments.length, primaryConcern, riskProfile, selectedExpenses, selectedIncome, step]);

  const goNext = () => {
    if (!canProceed) return;
    if (step < 7) {
      setStep((prev) => prev + 1);
      return;
    }
    completeOnboarding({
      age,
      monthlyIncome: selectedIncome,
      monthlyExpenses: selectedExpenses,
      goals,
      currentInvestments: investments,
      riskProfile: riskProfile || "moderate",
      primaryConcern,
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
              Step {step} of 7
            </span>
          </div>
          <Progress value={(step / 7) * 100} className="h-2 bg-white/20" />
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
                <h2 className="text-3xl font-bold text-gray-900">What do you currently invest in?</h2>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {INVESTMENTS.map((item) => (
                    <OptionCard
                      key={item}
                      title={item}
                      isSelected={investments.includes(item)}
                      onClick={() =>
                        setInvestments((prev) => (prev.includes(item) ? prev.filter((value) => value !== item) : [...prev, item]))
                      }
                    />
                  ))}
                </div>
              </div>
            )}

            {step === 6 && (
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

            {step === 7 && (
              <div className="my-auto">
                <h2 className="text-3xl font-bold text-gray-900">What's your biggest financial worry today?</h2>
                <div className="mt-6 grid gap-3">
                  {CONCERNS.map((item) => (
                    <OptionCard
                      key={item}
                      title={item}
                      isSelected={primaryConcern === item}
                      onClick={() => setPrimaryConcern(item)}
                    />
                  ))}
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
                {step === 7 ? "Complete onboarding" : "Continue"}
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
      <VoiceAssistant onNavigate={handleVoiceNavigate} onType={handleVoiceType} />
    </div>
  );
}
