import { useCallback, useEffect, useMemo, useState } from 'react';
import { TrendingUp, TrendingDown, Wallet, CreditCard, AlertCircle, ArrowUp } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { NextFinancialMove } from './NextFinancialMove';
import type { NextMoveAppPage } from '../lib/nextFinancialMove';
import { FinancialStatusStrip } from './FinancialStatusStrip';
import { useUserProfile } from '../context/UserProfileContext';
import { useTransactionSummary, useTransactionsList } from '@/hooks/useTransactions';
import { SMSImport } from '@/components/SMSImport';
import { TaxTips } from '@/components/TaxTips';
import { Skeleton } from './ui/skeleton';

function getTimeBasedGreeting(date: Date = new Date()): string {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  if (hour >= 17 && hour < 22) return 'Good evening';
  return 'Good night';
}

function monthLabel(month: number, year: number): string {
  return new Date(year, month - 1, 1).toLocaleString('en-IN', { month: 'short' });
}

interface MainDashboardProps {
  onNavigateToPage?: (page: NextMoveAppPage) => void;
}

export function MainDashboard({ onNavigateToPage }: MainDashboardProps = {}) {
  const { profile } = useUserProfile();
  const { data: summary, isLoading: summaryLoading, isError: summaryError } = useTransactionSummary();
  const { data: recentPage, isLoading: recentLoading } = useTransactionsList({ limit: 10, offset: 0 });

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

  const income = summary?.currentMonth.credit ?? 0;
  const expenses = summary?.currentMonth.debit ?? 0;
  const net = income - expenses;
  const monthlyChangePct = income > 0 ? (net / income) * 100 : 0;
  const countThisMonth = summary?.currentMonth.count ?? 0;

  const hasTransactions = useMemo(() => {
    if (!summary) return false;
    if (countThisMonth > 0) return true;
    return summary.last6Months.some((m) => m.debit > 0 || m.credit > 0);
  }, [summary, countThisMonth]);

  const stats = useMemo(
    () => [
      {
        title: 'Net this month',
        value: `₹${net.toLocaleString('en-IN')}`,
        change: `${monthlyChangePct.toFixed(1)}%`,
        trend: net >= 0 ? 'up' : 'down',
        icon: Wallet,
        color: 'from-green-600 to-green-500',
      },
      {
        title: 'Total income (credit)',
        value: `₹${income.toLocaleString('en-IN')}`,
        change: 'This month',
        trend: 'up',
        icon: TrendingUp,
        color: 'from-blue-600 to-blue-500',
      },
      {
        title: 'Total expenses (debit)',
        value: `₹${expenses.toLocaleString('en-IN')}`,
        change: 'This month',
        trend: 'down',
        icon: CreditCard,
        color: 'from-orange-600 to-red-500',
      },
      {
        title: 'Transactions (month)',
        value: String(countThisMonth),
        change: 'Logged',
        trend: 'up',
        icon: TrendingUp,
        color: 'from-purple-600 to-pink-500',
      },
    ],
    [countThisMonth, expenses, income, monthlyChangePct, net],
  );

  const colors = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#14b8a6'];
  const expenseData = (summary?.topCategories || []).map((item, index) => ({
    name: item.category,
    value: item.amount,
    color: colors[index % colors.length],
  }));

  const monthlyTrend = (summary?.last6Months || []).map((m) => ({
    month: monthLabel(m.month, m.year),
    income: m.credit,
    expenses: m.debit,
  }));

  const hasExpenseThisMonth = expenses > 0;
  const monthIncome = income;
  const monthExpenses = expenses;
  const topCategory = expenseData[0];

  const transactionSnapshot = useMemo(
    () => ({
      hasTransactions,
      monthIncome,
      monthExpenses,
      monthNet: net,
      topCategoryName: topCategory?.name,
    }),
    [hasTransactions, monthIncome, monthExpenses, net, topCategory?.name],
  );

  const scrollToSmsImport = useCallback(() => {
    document.getElementById('sms-import-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

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
        mainText: 'No transactions yet',
        subText: 'Import your first UPI SMS above or add entries from Expenses — all totals below come from your database.',
        actionText: 'Paste an SMS to get started',
      };
    }
    if (!hasExpenseThisMonth) {
      return {
        status: 'good' as const,
        mainText: 'No debit transactions this month yet',
        subText: 'You may have credits on file — add or import spending to see category breakdown.',
        actionText: 'Log or import expenses',
      };
    }

    if (monthIncome > 0 && monthExpenses > monthIncome) {
      return {
        status: 'risk' as const,
        mainText: 'Spending exceeded recorded income this month',
        subText: `Debits ₹${monthExpenses.toLocaleString('en-IN')} are above credits ₹${monthIncome.toLocaleString('en-IN')} in your logs — adjust or add missing income.`,
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
          ? `Logged credits ₹${monthIncome.toLocaleString('en-IN')} and debits ₹${monthExpenses.toLocaleString('en-IN')} — keep categories consistent.`
          : 'Keep logging transactions so trends stay accurate.',
      actionText: actionForTopCategory,
    };
  }, [
    hasTransactions,
    hasExpenseThisMonth,
    monthExpenses,
    monthIncome,
    monthlyTrend,
    topCategory,
  ]);

  const recentRows = recentPage?.transactions ?? [];
  const loading = summaryLoading || recentLoading;

  return (
    <div className="h-full overflow-y-auto bg-white/45 backdrop-blur-[2px] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            {timeGreeting}, {profile.name || 'there'} 👋
          </h1>
          <p className="text-gray-600">
            {hasTransactions
              ? 'Here’s your financial overview from transactions stored for your account.'
              : 'No transactions yet — import your first UPI SMS above!'}
          </p>
        </div>

        {summaryError && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Could not load live summary. Check that the API is running and you are logged in.
          </div>
        )}

        <SMSImport />

        <div>
          <h2 className="mb-3 text-lg font-semibold text-gray-900">Tax tips</h2>
          <TaxTips variant="dashboard" />
        </div>

        <FinancialStatusStrip
          status={statusStrip.status}
          mainText={statusStrip.mainText}
          subText={statusStrip.subText}
          actionText={statusStrip.actionText}
        />

        <NextFinancialMove
          transactionContext={transactionSnapshot}
          onNavigateToPage={onNavigateToPage}
          onScrollToSmsImport={scrollToSmsImport}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {loading
            ? Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="rounded-2xl border border-gray-200 bg-white p-6">
                  <Skeleton className="mb-4 h-12 w-12 rounded-xl" />
                  <Skeleton className="mb-2 h-4 w-24" />
                  <Skeleton className="h-8 w-36" />
                </div>
              ))
            : stats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={index}
                    className="bg-white rounded-2xl p-6 border border-gray-200 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div
                        className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}
                      >
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div
                        className={`flex items-center gap-1 text-sm font-medium ${
                          stat.trend === 'up' ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {stat.trend === 'up' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                        {stat.change}
                      </div>
                    </div>
                    <h3 className="text-gray-600 text-sm mb-1">{stat.title}</h3>
                    <p className="text-3xl font-bold mb-2">{stat.value}</p>
                    <p className="text-xs text-gray-500">Live from your transaction ledger</p>
                  </div>
                );
              })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl p-6 border border-gray-200">
            <div className="mb-6 p-5 bg-gradient-to-br from-orange-50 to-red-50 rounded-xl border border-orange-200">
              <h3 className="text-sm font-semibold text-gray-600 mb-2">Where your money is going</h3>
              {!hasExpenseThisMonth ? (
                <>
                  <p className="text-2xl font-bold text-gray-900 mb-2">
                    {hasTransactions ? 'No debit data for this month' : 'No spending data yet'}
                  </p>
                  <p className="text-sm text-gray-700 mb-3">
                    Category shares update from debit transactions recorded this month.
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
                    <p className="text-orange-700 font-medium">Review this category in Expenses to trim discretionary spend</p>
                  </div>
                </>
              )}
            </div>

            <h2 className="text-lg font-semibold mb-3 text-gray-500">Breakdown</h2>
            {loading ? (
              <Skeleton className="h-[240px] w-full rounded-xl" />
            ) : expenseData.length > 0 ? (
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
                No debit categories for this month yet.
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl p-6 border border-gray-200">
            <div className="mb-6 p-5 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border border-blue-200">
              <h3 className="text-sm font-semibold text-gray-600 mb-2">Your spending trend</h3>
              {!hasTransactions ? (
                <>
                  <p className="text-xl font-bold text-gray-900 mb-2">Trends need transaction history</p>
                  <p className="text-sm text-gray-700">
                    Import SMS or add transactions — charts recalc automatically from your data.
                  </p>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <ArrowUp className="w-5 h-5 text-emerald-600" />
                    <p className="text-2xl font-bold text-gray-900">6-month snapshot from your data</p>
                  </div>
                  <p className="text-sm text-gray-700 mb-2">
                    Credits and debits are summed per calendar month from your ledger.
                  </p>
                </>
              )}
            </div>

            <h2 className="text-lg font-semibold mb-3 text-gray-500">6-Month View</h2>
            {loading ? (
              <Skeleton className="h-[200px] w-full rounded-xl" />
            ) : monthlyTrend.length > 0 && monthlyTrend.some((m) => m.income > 0 || m.expenses > 0) ? (
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
                No multi-month data yet. Add or import transactions across months to see this chart.
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h2 className="font-semibold text-lg">Latest transactions</h2>
            <p className="text-sm text-gray-500">Most recent 10 entries from your account</p>
          </div>
          {loading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : recentRows.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">
              No transactions yet — import your first UPI SMS above!
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {recentRows.map((t) => (
                <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                  <div>
                    <p className="font-medium text-gray-900">{t.merchant || t.description || 'Transaction'}</p>
                    <p className="text-gray-500">
                      {t.category} · {new Date(t.transactionDate).toLocaleDateString('en-IN')}
                    </p>
                  </div>
                  <div
                    className={`text-lg font-semibold ${t.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}
                  >
                    {t.type === 'credit' ? '+' : '-'}₹{t.amount.toLocaleString('en-IN')}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
