import { useEffect, useMemo, useState } from 'react';
import { TrendingUp, TrendingDown, Wallet, PiggyBank, CreditCard, AlertCircle, ArrowUp } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { NextFinancialMove } from './NextFinancialMove';
import { FinancialStatusStrip } from './FinancialStatusStrip';
import { api } from '../lib/api';
import type { FinanceStats } from '../types/finance';
import { useUserProfile } from '../context/UserProfileContext';

function getTimeBasedGreeting(date: Date = new Date()): string {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  if (hour >= 17 && hour < 22) return 'Good evening';
  return 'Good night';
}

export function MainDashboard() {
  const { profile } = useUserProfile();
  const [statsData, setStatsData] = useState<FinanceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeGreeting, setTimeGreeting] = useState(() => getTimeBasedGreeting());

  useEffect(() => {
    const update = () => setTimeGreeting(getTimeBasedGreeting());
    const intervalId = window.setInterval(update, 60_000);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') update();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const response = await api.getStats();
        setStatsData(response);
      } finally {
        setLoading(false);
      }
    };

    void loadStats();
  }, []);

  const stats = useMemo(() => [
    {
      title: 'Total Balance',
      value: `₹${(statsData?.summary.totalBalance || 0).toLocaleString('en-IN')}`,
      change: `${(statsData?.summary.monthlyChange || 0).toFixed(1)}%`,
      trend: (statsData?.summary.totalBalance || 0) >= 0 ? 'up' : 'down',
      icon: Wallet,
      color: 'from-green-600 to-green-500',
    },
    {
      title: 'This Month Income',
      value: `₹${(statsData?.summary.income || 0).toLocaleString('en-IN')}`,
      change: '+Live',
      trend: 'up',
      icon: TrendingUp,
      color: 'from-blue-600 to-blue-500',
    },
    {
      title: 'This Month Expenses',
      value: `₹${(statsData?.summary.expenses || 0).toLocaleString('en-IN')}`,
      change: '-Live',
      trend: 'down',
      icon: CreditCard,
      color: 'from-orange-600 to-red-500',
    },
    {
      title: 'Monthly Savings',
      value: `₹${profile.monthlySavings.toLocaleString('en-IN')}`,
      change: `${profile.savingsRate.toFixed(1)}%`,
      trend: profile.monthlySavings >= 0 ? 'up' : 'down',
      icon: PiggyBank,
      color: 'from-purple-600 to-pink-500',
    },
    {
      title: 'Recommended SIP',
      value: `₹${profile.recommendedSIP.toLocaleString('en-IN')}`,
      change: profile.riskProfile,
      trend: 'up',
      icon: TrendingUp,
      color: 'from-emerald-600 to-teal-500',
    },
    {
      title: 'Estimated Tax Savings',
      value: `₹${profile.estimatedTaxSavings.toLocaleString('en-IN')}`,
      change: 'Annual',
      trend: 'up',
      icon: Wallet,
      color: 'from-indigo-600 to-blue-500',
    },
  ], [profile.estimatedTaxSavings, profile.monthlySavings, profile.recommendedSIP, profile.riskProfile, profile.savingsRate, statsData]);

  const colors = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#14b8a6'];
  const expenseData = (statsData?.byCategory || []).map((item, index) => ({
    ...item,
    color: colors[index % colors.length],
  }));

  const monthlyTrend = statsData?.monthlyTrend || [];
  const transactionCount = statsData?.meta?.transactionCount ?? 0;
  const hasTransactions = transactionCount > 0;
  const monthIncome = statsData?.summary.income ?? 0;
  const monthExpenses = statsData?.summary.expenses ?? 0;
  const hasExpenseThisMonth = monthExpenses > 0;
  const topCategory = expenseData[0];

  const statusStrip = useMemo(() => {
    const actionForTopCategory = topCategory
      ? `Review spending in ${topCategory.name}`
      : 'Review your highest spending categories in Expenses';

    let trendDelta: number | null = null;
    let trendPct: number | null = null;
    if (monthlyTrend.length >= 2) {
      const curr = monthlyTrend[monthlyTrend.length - 1];
      const prev = monthlyTrend[monthlyTrend.length - 2];
      trendDelta = curr.expenses - prev.expenses;
      trendPct = prev.expenses > 0 ? (trendDelta / prev.expenses) * 100 : null;
    }

    if (!hasTransactions) {
      return {
        status: 'good' as const,
        mainText: 'Start with your first transaction',
        subText: profile.hasCompletedOnboarding
          ? `Your profile estimates ₹${profile.monthlyExpenses.toLocaleString('en-IN')}/mo spending — we will replace this with real data once you log expenses.`
          : 'Complete onboarding, then add income and expenses to unlock spending insights.',
        actionText: 'Open Expenses and add a transaction',
      };
    }
    if (!hasExpenseThisMonth) {
      return {
        status: 'good' as const,
        mainText: 'No expenses logged this month yet',
        subText: 'You have transactions on file, but nothing tagged as spending for the current month.',
        actionText: 'Log this month’s expenses to see category breakdown',
      };
    }

    if (monthIncome > 0 && monthExpenses > monthIncome) {
      return {
        status: 'risk' as const,
        mainText: 'Spending exceeded recorded income this month',
        subText: `Expenses ₹${monthExpenses.toLocaleString('en-IN')} are above income ₹${monthIncome.toLocaleString('en-IN')} in your logs — adjust or add missing income.`,
        actionText: actionForTopCategory,
      };
    }

    if (monthIncome > 0 && monthExpenses > monthIncome * 0.9) {
      const subParts = [
        `Expenses are ${((monthExpenses / monthIncome) * 100).toFixed(0)}% of income recorded this month.`,
      ];
      if (trendDelta != null && trendDelta > 0 && trendPct != null && trendPct >= 3) {
        subParts.push(`Up ~${trendPct.toFixed(0)}% vs last month in the trend data.`);
      } else if (trendDelta != null && trendDelta < 0 && trendPct != null && trendPct <= -3) {
        subParts.push(`Down ~${Math.abs(trendPct).toFixed(0)}% vs last month — nice discipline.`);
      }
      return {
        status: 'warning' as const,
        mainText: 'You are slightly off track this month',
        subText: subParts.join(' '),
        actionText: actionForTopCategory,
      };
    }

    if (trendDelta != null && trendDelta > 0 && trendPct != null && trendPct >= 8) {
      return {
        status: 'warning' as const,
        mainText: 'Expenses increased compared to last month',
        subText: `About ${trendPct.toFixed(0)}% higher than the prior month in your 6‑month view (₹${monthExpenses.toLocaleString('en-IN')} this month).`,
        actionText: actionForTopCategory,
      };
    }

    if (trendDelta != null && trendDelta < 0 && trendPct != null && trendPct <= -5) {
      return {
        status: 'good' as const,
        mainText: 'You are on a good track this month',
        subText: `Spending is down ~${Math.abs(trendPct).toFixed(0)}% vs last month in your logged data.`,
        actionText: actionForTopCategory,
      };
    }

    return {
      status: 'good' as const,
      mainText: 'You are tracking spending this month',
      subText:
        monthIncome > 0
          ? `Logged income ₹${monthIncome.toLocaleString('en-IN')} and expenses ₹${monthExpenses.toLocaleString('en-IN')} — keep categories consistent.`
          : 'Keep logging transactions so trends stay accurate.',
      actionText: actionForTopCategory,
    };
  }, [
    hasTransactions,
    hasExpenseThisMonth,
    monthExpenses,
    monthIncome,
    monthlyTrend,
    profile.hasCompletedOnboarding,
    profile.monthlyExpenses,
    topCategory,
  ]);

  return (
    <div className="h-full overflow-y-auto bg-white/45 backdrop-blur-[2px] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            {timeGreeting}, {profile.name || 'there'} 👋
          </h1>
          <p className="text-gray-600">
            {hasTransactions
              ? 'Here’s your financial overview from the transactions you’ve logged.'
              : 'Add transactions to see live spending and trends — until then, some numbers reflect your profile or empty month data.'}
          </p>
        </div>
        {loading && <div className="text-gray-500">Loading dashboard data...</div>}

        {/* Financial Status Strip */}
        <FinancialStatusStrip
          status={statusStrip.status}
          mainText={statusStrip.mainText}
          subText={statusStrip.subText}
          actionText={statusStrip.actionText}
        />

        {/* Hero Component - Your Next Financial Move */}
        <NextFinancialMove />

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            
            // Add contextual insight for each card
            let contextText = '';
            if (stat.title === 'Total Balance') {
              contextText = hasTransactions
                ? 'Based on this month’s logged income and expenses'
                : 'Add transactions to see a real month-to-date balance';
            } else if (stat.title === 'This Month Income') {
              contextText = hasExpenseThisMonth || monthIncome > 0
                ? 'Income logged for the current month'
                : 'No income logged this month yet';
            } else if (stat.title === 'This Month Expenses') {
              contextText = hasExpenseThisMonth
                ? 'Expenses logged for the current month'
                : 'No expenses logged this month yet';
            } else if (stat.title === 'Monthly Savings') {
              contextText = `Profile-based savings rate ${profile.savingsRate.toFixed(1)}% (from onboarding)`;
            } else if (stat.title === 'Recommended SIP') {
              contextText = 'Risk-adjusted SIP recommendation';
            } else if (stat.title === 'Estimated Tax Savings') {
              contextText = 'Potential annual tax optimization';
            }
            
            return (
              <div
                key={index}
                className="bg-white rounded-2xl p-6 border border-gray-200 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div className={`flex items-center gap-1 text-sm font-medium ${
                    stat.trend === 'up' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {stat.trend === 'up' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    {stat.change}
                  </div>
                </div>
                <h3 className="text-gray-600 text-sm mb-1">{stat.title}</h3>
                <p className="text-3xl font-bold mb-2">{stat.value}</p>
                
                {/* Contextual insight */}
                <p className="text-xs text-gray-600 mt-2 flex items-center gap-1">
                  {stat.title === 'Monthly Savings' && <AlertCircle className="w-3 h-3 text-orange-500" />}
                  {contextText}
                </p>
                {stat.title === 'Monthly Savings' && (
                  <p className="text-xs text-orange-600 mt-1">⚠️ Ideal is 30%</p>
                )}
              </div>
            );
          })}
        </div>

        {/* Charts Row with Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Spending Insight Card + Expense Breakdown */}
          <div className="bg-white rounded-2xl p-6 border border-gray-200">
            {/* Spending Insight Card */}
            <div className="mb-6 p-5 bg-gradient-to-br from-orange-50 to-red-50 rounded-xl border border-orange-200">
              <h3 className="text-sm font-semibold text-gray-600 mb-2">Where your money is going</h3>
              {!hasExpenseThisMonth ? (
                <>
                  <p className="text-2xl font-bold text-gray-900 mb-2">
                    {hasTransactions ? 'No expense data for this month' : 'No spending data yet'}
                  </p>
                  <p className="text-sm text-gray-700 mb-3">
                    {profile.hasCompletedOnboarding ? (
                      <>
                        From onboarding you estimated about{' '}
                        <span className="font-semibold text-orange-600">
                          ₹{profile.monthlyExpenses.toLocaleString('en-IN')}/month
                        </span>{' '}
                        in expenses. Add real transactions to see category insights.
                      </>
                    ) : (
                      'Complete onboarding and log expenses to see which categories use most of your budget.'
                    )}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-2xl font-bold text-gray-900 mb-2">
                    {topCategory ? `You spend the most on ${topCategory.name}` : 'Expense breakdown'}
                  </p>
                  <p className="text-sm text-gray-700 mb-3">
                    <span className="font-semibold text-orange-600">
                      ₹{topCategory.value.toLocaleString('en-IN')}
                    </span>{' '}
                    this month in that category
                  </p>
                  <div className="flex items-center gap-2 text-sm">
                    <AlertCircle className="w-4 h-4 text-orange-600" />
                    <p className="text-orange-700 font-medium">
                      Review this category in Expenses to trim discretionary spend
                    </p>
                  </div>
                </>
              )}
            </div>
            
            {/* Small Pie Chart */}
            <h2 className="text-lg font-semibold mb-3 text-gray-500">Breakdown</h2>
            {expenseData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={expenseData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {expenseData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `₹${value.toLocaleString('en-IN')}`} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[240px] items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50 text-center text-sm text-gray-500">
                Category chart appears after you log expenses for this month.
              </div>
            )}
          </div>

          {/* Trend Insight + Monthly Trend */}
          <div className="bg-white rounded-2xl p-6 border border-gray-200">
            {/* Trend Insight Card */}
            <div className="mb-6 p-5 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border border-blue-200">
              <h3 className="text-sm font-semibold text-gray-600 mb-2">Your spending trend</h3>
              {!hasTransactions ? (
                <>
                  <p className="text-xl font-bold text-gray-900 mb-2">Trends need transaction history</p>
                  <p className="text-sm text-gray-700">
                    Once you log a few months of income and expenses, we will show whether spending is rising or
                    falling over time.
                  </p>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <ArrowUp className="w-5 h-5 text-emerald-600" />
                    <p className="text-2xl font-bold text-gray-900">6-month snapshot from your data</p>
                  </div>
                  <p className="text-sm text-gray-700 mb-2">
                    Totals below are based only on transactions you have recorded — keep logging for sharper trends.
                  </p>
                  <div className="flex items-center gap-2 text-sm">
                    <AlertCircle className="w-4 h-4 text-blue-600" />
                    <p className="text-blue-800 font-medium">
                      Tip: log weekly so this chart reflects real life, not gaps.
                    </p>
                  </div>
                </>
              )}
            </div>
            
            {/* Small Bar Chart */}
            <h2 className="text-lg font-semibold mb-3 text-gray-500">6-Month View</h2>
            {monthlyTrend.length > 0 && monthlyTrend.some((m) => m.income > 0 || m.expenses > 0) ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={(value) => `₹${value / 1000}k`} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value: number) => `₹${value.toLocaleString('en-IN')}`} />
                  <Bar dataKey="income" fill="#10b981" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="expenses" fill="#ef4444" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[200px] items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50 text-center text-sm text-gray-500">
                No multi-month data yet. Add transactions dated across months to see this chart fill in.
              </div>
            )}
          </div>
        </div>

        {/* What to Fix Section */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span>What you can improve</span>
            <span className="text-sm font-normal text-gray-500">(Simple actions)</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {!hasTransactions ? (
              <>
                <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                  <div className="w-5 h-5 rounded-full border-2 border-blue-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">Log your first transactions</p>
                    <p className="text-xs text-gray-600 mt-1">
                      Insights here use real category data — add expenses to unlock them.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <div className="w-5 h-5 rounded-full border-2 border-emerald-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">Revisit your goals</p>
                    <p className="text-xs text-gray-600 mt-1">
                      {profile.goals.length > 0
                        ? `You chose: ${profile.goals.slice(0, 2).join(', ')}${profile.goals.length > 2 ? '…' : ''}`
                        : 'Complete onboarding to set goals, then track progress with real spends.'}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
                  <div className="w-5 h-5 rounded-full border-2 border-green-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">Plan a starter SIP</p>
                    <p className="text-xs text-gray-600 mt-1">
                      Suggested from your profile: ₹{profile.recommendedSIP.toLocaleString('en-IN')}/month.
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-start gap-3 p-4 bg-orange-50 border border-orange-200 rounded-xl hover:shadow-md transition-all">
                  <div className="w-5 h-5 rounded-full border-2 border-orange-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">
                      {topCategory ? `Watch ${topCategory.name}` : 'Review top categories'}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      {topCategory
                        ? `Largest spend this month: ₹${topCategory.value.toLocaleString('en-IN')}`
                        : 'Log categorized expenses to see your top area'}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-orange-50 border border-orange-200 rounded-xl hover:shadow-md transition-all">
                  <div className="w-5 h-5 rounded-full border-2 border-orange-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">Keep income &amp; expense dates current</p>
                    <p className="text-xs text-gray-600 mt-1">
                      Accurate dates improve monthly summaries and trend charts.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-xl hover:shadow-md transition-all">
                  <div className="w-5 h-5 rounded-full border-2 border-green-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">Increase SIP toward your goals</p>
                    <p className="text-xs text-gray-600 mt-1">
                      Profile suggests ₹{profile.recommendedSIP.toLocaleString('en-IN')}/mo — adjust as cashflow allows.
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}