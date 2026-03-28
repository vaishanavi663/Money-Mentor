import { useState } from 'react';
import { Home, Car, GraduationCap, Palmtree, Plane, ShieldAlert, Coffee, Pizza, Tv, ShoppingBag, PartyPopper, CheckCircle, XCircle, TrendingUp, ArrowRight, AlertTriangle } from 'lucide-react';
import { useUserProfile } from '../context/UserProfileContext';

interface Goal {
  id: string;
  icon: any;
  label: string;
  target: number; // in lakhs
  years: number;
  description: string;
  urgencyMessage: string;
}

interface MoneyLeak {
  id: string;
  icon: any;
  label: string;
  amount: number; // monthly
  description: string;
}

const goals: Goal[] = [
  {
    id: 'home',
    icon: Home,
    label: 'Own a Home',
    target: 75,
    years: 10,
    description: 'Down payment for 2BHK',
    urgencyMessage: 'Property prices rise 8% per year. Every year you delay, your target goes up by ₹6L'
  },
  {
    id: 'car',
    icon: Car,
    label: 'Buy a Car',
    target: 12,
    years: 4,
    description: 'No EMI stress',
    urgencyMessage: 'Car prices increase yearly. Buy with cash, save ₹2-3L in interest compared to loan'
  },
  {
    id: 'education',
    icon: GraduationCap,
    label: "Child's Education",
    target: 50,
    years: 15,
    description: 'Engineering/Medical',
    urgencyMessage: 'Education costs double every 8 years. Starting early makes it 3X easier'
  },
  {
    id: 'retirement',
    icon: Palmtree,
    label: 'Retire Comfortably',
    target: 300,
    years: 25,
    description: '₹1L/month income',
    urgencyMessage: 'Starting 5 years late means you need to invest 2X more every month'
  },
  {
    id: 'vacation',
    icon: Plane,
    label: 'Dream Vacation',
    target: 4,
    years: 2,
    description: 'Europe/Japan',
    urgencyMessage: 'Flight prices surge 15-20% yearly. Book your dream trip before it becomes unaffordable'
  },
  {
    id: 'emergency',
    icon: ShieldAlert,
    label: 'Emergency Fund',
    target: 3,
    years: 1,
    description: '6 months salary',
    urgencyMessage: 'Medical emergencies cost ₹2-5L on average. Without this, you might take expensive loans'
  }
];

const moneyLeaks: MoneyLeak[] = [
  {
    id: 'coffee',
    icon: Coffee,
    label: 'Daily Coffee/Tea Outside',
    amount: 3000,
    description: '₹100/day = ₹3,000/month'
  },
  {
    id: 'food',
    icon: Pizza,
    label: 'Eating Out & Zomato',
    amount: 6000,
    description: '₹200/order = ₹6,000/month'
  },
  {
    id: 'ott',
    icon: Tv,
    label: 'OTT Subscriptions',
    amount: 1200,
    description: 'Netflix, Prime, Hotstar = ₹1,200/month'
  },
  {
    id: 'shopping',
    icon: ShoppingBag,
    label: 'Impulsive Online Shopping',
    amount: 4000,
    description: '₹4,000/month avg'
  },
  {
    id: 'weekend',
    icon: PartyPopper,
    label: 'Weekend Impulse Spends',
    amount: 3000,
    description: '₹3,000/month'
  }
];

interface FutureSimulatorProps {
  onNavigateToChat?: () => void;
}

export function FutureSimulator({ onNavigateToChat }: FutureSimulatorProps) {
  const { profile } = useUserProfile();
  const [monthlyIncome, setMonthlyIncome] = useState(profile.monthlyIncome || 50000);
  const [currentSavings, setCurrentSavings] = useState(Math.max(0, profile.monthlySavings || 10000));
  const [selectedGoal, setSelectedGoal] = useState<string>(goals[0].id);
  const [checkedLeaks, setCheckedLeaks] = useState<Set<string>>(new Set());

  const annualReturn = 12; // 12% annual returns

  // Calculate required monthly SIP for selected goal
  const calculateRequiredSIP = (targetLakhs: number, years: number): number => {
    const targetAmount = targetLakhs * 100000;
    const monthlyRate = annualReturn / 100 / 12;
    const months = years * 12;
    
    // Rearranged SIP formula to solve for P
    const requiredSIP = targetAmount / (((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) * (1 + monthlyRate));
    return Math.round(requiredSIP);
  };

  // Calculate future value using SIP formula
  const calculateSIPFutureValue = (monthlyAmount: number, years: number): number => {
    const monthlyRate = annualReturn / 100 / 12;
    const months = years * 12;
    const futureValue = monthlyAmount * (((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) * (1 + monthlyRate));
    return Math.round(futureValue);
  };

  // Format to Indian currency
  const formatIndianCurrency = (amount: number): string => {
    if (amount >= 10000000) {
      return `₹${(amount / 10000000).toFixed(2)} Cr`;
    } else if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(2)} L`;
    } else {
      return `₹${amount.toLocaleString('en-IN')}`;
    }
  };

  const goal = goals.find(g => g.id === selectedGoal) || goals[0];
  const requiredSIP = calculateRequiredSIP(goal.target, goal.years);
  const coveragePercent = Math.min((currentSavings / requiredSIP) * 100, 100);
  const canAffordGoal = currentSavings >= requiredSIP;

  // Calculate total money leaks
  const totalLeaksAmount = Array.from(checkedLeaks).reduce((sum, leakId) => {
    const leak = moneyLeaks.find(l => l.id === leakId);
    return sum + (leak?.amount || 0);
  }, 0);

  // Calculate future value of leaks over 20 years
  const leaksFutureValue20Years = calculateSIPFutureValue(totalLeaksAmount, 20);

  // Calculate how much closer to goal
  const goalProgressWithLeaks = totalLeaksAmount > 0 ? 
    Math.min(((currentSavings + totalLeaksAmount) / requiredSIP) * 100, 100) : coveragePercent;

  // Current path vs optimized path comparison
  const currentPathValue = calculateSIPFutureValue(currentSavings, 20);
  const optimizedPathValue = calculateSIPFutureValue(currentSavings + totalLeaksAmount, 20);
  const difference = optimizedPathValue - currentPathValue;

  // Years of financial freedom (assuming ₹1L/month = ₹12L/year)
  const extraYearsOfFreedom = (difference / 1200000).toFixed(1);

  const toggleLeak = (leakId: string) => {
    const newChecked = new Set(checkedLeaks);
    if (newChecked.has(leakId)) {
      newChecked.delete(leakId);
    } else {
      newChecked.add(leakId);
    }
    setCheckedLeaks(newChecked);
  };

  return (
    <div className="h-full overflow-y-auto bg-white/45 backdrop-blur-[2px] p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900">
            Your Money. Your Future. Your Choice.
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            See the real cost of your daily habits — and what investing them could do for you
          </p>

          {/* Input Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto mt-8">
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
              <label className="text-sm text-gray-600 mb-2 block">Monthly Income</label>
              <div className="flex items-center gap-2">
                <span className="text-gray-500 text-xl">₹</span>
                <input
                  type="number"
                  value={monthlyIncome}
                  onChange={(e) => setMonthlyIncome(Number(e.target.value))}
                  className="w-full text-3xl font-bold bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 rounded-lg px-2 border border-transparent focus:border-green-500"
                />
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
              <label className="text-sm text-gray-600 mb-2 block">Current Monthly Savings</label>
              <div className="flex items-center gap-2">
                <span className="text-gray-500 text-xl">₹</span>
                <input
                  type="number"
                  value={currentSavings}
                  onChange={(e) => setCurrentSavings(Number(e.target.value))}
                  className="w-full text-3xl font-bold bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 rounded-lg px-2 border border-transparent focus:border-green-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Pick Your Goal */}
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Pick Your Real-Life Goal</h2>
            <p className="text-gray-600">What are you working towards?</p>
          </div>

          {/* Goal Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {goals.map((g) => {
              const Icon = g.icon;
              const isSelected = selectedGoal === g.id;
              return (
                <button
                  key={g.id}
                  onClick={() => setSelectedGoal(g.id)}
                  className={`p-6 rounded-2xl border-2 transition-all text-left ${
                    isSelected
                      ? 'bg-emerald-50 border-emerald-500 shadow-lg shadow-emerald-500/15'
                      : 'bg-white border-gray-200 hover:border-gray-300 shadow-sm'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      isSelected ? 'bg-green-600' : 'bg-gray-100'
                    }`}>
                      <Icon className={`w-6 h-6 ${isSelected ? 'text-white' : 'text-gray-700'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 mb-1">{g.label}</h3>
                      <p className="text-sm text-gray-600 mb-2">{g.description}</p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-amber-600">
                          {formatIndianCurrency(g.target * 100000)}
                        </span>
                        <span className="text-sm text-gray-500">in {g.years} years</span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Goal Details */}
          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  canAffordGoal ? 'bg-green-500' : 'bg-red-500'
                }`}>
                  {canAffordGoal ? (
                    <CheckCircle className="w-6 h-6 text-white" />
                  ) : (
                    <XCircle className="w-6 h-6 text-white" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-gray-900 text-lg mb-2">
                    You need to invest <span className="font-bold text-amber-600">{formatIndianCurrency(requiredSIP)}/month</span> via SIP at {annualReturn}% returns to reach this goal
                  </p>
                  
                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Your current savings coverage</span>
                      <span className="text-gray-900 font-bold">{coveragePercent.toFixed(0)}%</span>
                    </div>
                    <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 ${
                          canAffordGoal ? 'bg-green-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${coveragePercent}%` }}
                      />
                    </div>
                  </div>

                  {canAffordGoal ? (
                    <p className="text-green-600 font-medium mt-3 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5" />
                      Great! Your savings can cover this goal
                    </p>
                  ) : (
                    <p className="text-red-600 font-medium mt-3 flex items-center gap-2">
                      <XCircle className="w-5 h-5" />
                      You need ₹{(requiredSIP - currentSavings).toLocaleString('en-IN')} more per month
                    </p>
                  )}
                </div>
              </div>

              {/* Urgency Message */}
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <p className="text-orange-900 text-sm">{goal.urgencyMessage}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Money Leak Detector */}
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Where is your money quietly disappearing? 🔍
            </h2>
            <p className="text-gray-600">Check what you spend on. We'll show you what it costs you over time.</p>
          </div>

          {/* Leak Checkboxes */}
          <div className="space-y-3">
            {moneyLeaks.map((leak) => {
              const Icon = leak.icon;
              const isChecked = checkedLeaks.has(leak.id);
              const futureValue = calculateSIPFutureValue(leak.amount, 20);

              return (
                <div
                  key={leak.id}
                  className={`rounded-2xl p-6 border-2 transition-all cursor-pointer bg-white shadow-sm ${
                    isChecked ? 'border-red-400 bg-red-50/80' : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => toggleLeak(leak.id)}
                >
                  <div className="flex items-start gap-4">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleLeak(leak.id)}
                      className="w-5 h-5 mt-1 rounded border-gray-300 text-red-500 focus:ring-red-500 focus:ring-offset-0 cursor-pointer"
                    />
                    <div className="flex-1">
                      <div className="flex items-start gap-3 mb-2">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          isChecked ? 'bg-red-500' : 'bg-gray-100'
                        }`}>
                          <Icon className={`w-5 h-5 ${isChecked ? 'text-white' : 'text-gray-700'}`} />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-900 mb-1">{leak.label}</h3>
                          <p className="text-sm text-gray-600">{leak.description}</p>
                        </div>
                      </div>

                      {isChecked && (
                        <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                          <p className="text-emerald-800 font-medium">
                            💡 If you invested this instead: <span className="font-bold">{formatIndianCurrency(leak.amount)}/month</span> → grows to{' '}
                            <span className="text-amber-600 font-bold">{formatIndianCurrency(futureValue)}</span> in 20 years at {annualReturn}%
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Running Total */}
          {checkedLeaks.size > 0 && (
            <div className="bg-gradient-to-br from-rose-50 to-emerald-50 border border-emerald-200 rounded-2xl p-6 shadow-sm">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-gray-900">Total Money Leaks Selected</h3>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-amber-600">
                      {formatIndianCurrency(totalLeaksAmount)}/month
                    </div>
                    <div className="text-sm text-gray-600">
                      → {formatIndianCurrency(leaksFutureValue20Years)} in 20 years
                    </div>
                  </div>
                </div>

                <div className="bg-white/80 border border-emerald-200 rounded-xl p-4">
                  <p className="text-emerald-800 font-medium text-lg">
                    ✨ Fixing these leaks gets you <span className="text-amber-600 font-bold">{(goalProgressWithLeaks - coveragePercent).toFixed(0)}%</span> closer to your <span className="font-bold">{goal.label}</span> goal!
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Side-by-Side Outcome Comparison */}
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Your Future: Two Paths</h2>
            <p className="text-gray-600">The choice you make today shapes the life you live tomorrow</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Current Path */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto">
                  <TrendingUp className="w-8 h-8 text-gray-500" />
                </div>
                <h3 className="text-xl font-bold text-gray-600">If you keep spending the same way</h3>
                <div className="text-5xl font-bold text-gray-900">
                  {formatIndianCurrency(currentPathValue)}
                </div>
                <p className="text-gray-500">in 20 years</p>
              </div>
            </div>

            {/* Optimized Path */}
            <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-2xl p-6 border border-green-500 shadow-xl shadow-green-500/20">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-green-800 rounded-2xl flex items-center justify-center mx-auto">
                  <TrendingUp className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white">If you fix your leaks and invest the difference</h3>
                <div className="text-5xl font-bold text-white">
                  {formatIndianCurrency(optimizedPathValue)}
                </div>
                <p className="text-green-100">in 20 years</p>
              </div>
            </div>
          </div>

          {/* Difference Highlight */}
          {totalLeaksAmount > 0 && (
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-8 text-center shadow-2xl">
              <p className="text-sm uppercase tracking-wider text-amber-100 mb-2">The Difference</p>
              <div className="text-6xl font-bold text-white mb-4">
                +{formatIndianCurrency(difference)}
              </div>
              <p className="text-2xl text-white font-medium">
                That's <span className="font-bold">{extraYearsOfFreedom} extra years</span> of financial freedom
              </p>
            </div>
          )}
        </div>

        {/* Personalized Action Plan */}
        <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
          <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">
            Your 3-Step Plan Starting This Month
          </h2>

          <div className="space-y-4 mb-8">
            <div className="flex items-start gap-4 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
              <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-white">
                1
              </div>
              <div>
                <p className="text-gray-900 text-lg">
                  <span className="font-bold">Open a SIP</span> for{' '}
                  <span className="text-amber-600 font-bold">{formatIndianCurrency(requiredSIP)}/month</span>{' '}
                  in an index fund today
                </p>
                <p className="text-gray-600 text-sm mt-1">Zerodha Coin, Groww, or ET Money make it easy</p>
              </div>
            </div>

            {checkedLeaks.size > 0 && (
              <div className="flex items-start gap-4 p-4 bg-amber-50 rounded-xl border border-amber-100">
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-white">
                  2
                </div>
                <div>
                  <p className="text-gray-900 text-lg">
                    <span className="font-bold">Cut {moneyLeaks.find(l => l.id === Array.from(checkedLeaks)[0])?.label}</span> — save{' '}
                    <span className="text-amber-600 font-bold">
                      {formatIndianCurrency(moneyLeaks.find(l => l.id === Array.from(checkedLeaks)[0])?.amount || 0)}/month
                    </span>{' '}
                    immediately
                  </p>
                  <p className="text-gray-600 text-sm mt-1">Small changes, massive long-term impact</p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
              <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-white">
                3
              </div>
              <div>
                <p className="text-gray-900 text-lg">
                  <span className="font-bold">Set up auto-debit</span> on salary day so you never miss an investment
                </p>
                <p className="text-gray-600 text-sm mt-1">Pay yourself first, spend what's left</p>
              </div>
            </div>
          </div>

          {/* CTA Button */}
          <button
            onClick={onNavigateToChat}
            className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold text-xl py-5 rounded-2xl transition-all shadow-lg shadow-green-500/30 hover:shadow-xl hover:shadow-green-500/40 flex items-center justify-center gap-3"
          >
            Start My Plan → Talk to AI Mentor
            <ArrowRight className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
}
