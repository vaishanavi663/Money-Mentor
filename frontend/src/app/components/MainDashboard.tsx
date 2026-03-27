import { useEffect, useMemo, useState } from 'react';
import { TrendingUp, TrendingDown, Wallet, PiggyBank, CreditCard, AlertCircle, ArrowUp } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { NextFinancialMove } from './NextFinancialMove';
import { FinancialStatusStrip } from './FinancialStatusStrip';
import { api } from '../lib/api';
import type { FinanceStats } from '../types/finance';

export function MainDashboard() {
  const [statsData, setStatsData] = useState<FinanceStats | null>(null);
  const [loading, setLoading] = useState(true);

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
      title: 'Savings',
      value: `₹${(statsData?.summary.savings || 0).toLocaleString('en-IN')}`,
      change: `${Math.abs(statsData?.summary.monthlyChange || 0).toFixed(1)}%`,
      trend: (statsData?.summary.savings || 0) >= 0 ? 'up' : 'down',
      icon: PiggyBank,
      color: 'from-purple-600 to-pink-500',
    },
  ], [statsData]);

  const colors = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#14b8a6'];
  const expenseData = (statsData?.byCategory || []).map((item, index) => ({
    ...item,
    color: colors[index % colors.length],
  }));

  const monthlyTrend = statsData?.monthlyTrend || [];

  return (
    <div className="h-full overflow-y-auto bg-white/45 backdrop-blur-[2px] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Welcome back! 👋</h1>
          <p className="text-gray-600">Here&apos;s your financial overview from live transactions</p>
        </div>
        {loading && <div className="text-gray-500">Loading dashboard data...</div>}

        {/* Financial Status Strip */}
        <FinancialStatusStrip 
          status="warning"
          mainText="You are slightly off track this month"
          subText="Your expenses increased compared to last month"
          actionText="Review your food spending"
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
              contextText = 'Growing steadily! 💪';
            } else if (stat.title === 'This Month Income') {
              contextText = 'Stable income this month';
            } else if (stat.title === 'This Month Expenses') {
              contextText = 'Higher than last month';
            } else if (stat.title === 'Savings') {
              contextText = 'You are saving 29% of income';
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
                  {stat.title === 'Savings' && <AlertCircle className="w-3 h-3 text-orange-500" />}
                  {contextText}
                </p>
                {stat.title === 'Savings' && (
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
              <p className="text-2xl font-bold text-gray-900 mb-2">
                You spend the most on food
              </p>
              <p className="text-sm text-gray-700 mb-3">
                <span className="font-semibold text-orange-600">₹12,500</span> this month 
                <span className="text-orange-600 font-medium"> (30% higher than usual)</span>
              </p>
              <div className="flex items-center gap-2 text-sm">
                <AlertCircle className="w-4 h-4 text-orange-600" />
                <p className="text-orange-700 font-medium">
                  Cut ₹3,000 here to improve savings
                </p>
              </div>
            </div>
            
            {/* Small Pie Chart */}
            <h2 className="text-lg font-semibold mb-3 text-gray-500">Breakdown</h2>
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
          </div>

          {/* Trend Insight + Monthly Trend */}
          <div className="bg-white rounded-2xl p-6 border border-gray-200">
            {/* Trend Insight Card */}
            <div className="mb-6 p-5 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border border-blue-200">
              <h3 className="text-sm font-semibold text-gray-600 mb-2">Your spending trend</h3>
              <div className="flex items-center gap-2 mb-2">
                <ArrowUp className="w-5 h-5 text-orange-600" />
                <p className="text-2xl font-bold text-gray-900">
                  Your expenses are increasing
                </p>
              </div>
              <p className="text-sm text-gray-700 mb-2">
                <span className="font-semibold text-orange-600">+₹8,000</span> in last 3 months
              </p>
              <p className="text-sm text-gray-700 mb-2">
                <span className="font-medium">Main reason:</span> Shopping
              </p>
              <div className="flex items-center gap-2 text-sm">
                <AlertCircle className="w-4 h-4 text-orange-600" />
                <p className="text-orange-700 font-medium">
                  This may affect your savings goal
                </p>
              </div>
            </div>
            
            {/* Small Bar Chart */}
            <h2 className="text-lg font-semibold mb-3 text-gray-500">6-Month View</h2>
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
          </div>
        </div>

        {/* What to Fix Section */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span>What you can improve</span>
            <span className="text-sm font-normal text-gray-500">(Simple actions)</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-start gap-3 p-4 bg-orange-50 border border-orange-200 rounded-xl hover:shadow-md transition-all">
              <div className="w-5 h-5 rounded-full border-2 border-orange-500 flex-shrink-0 mt-0.5"></div>
              <div>
                <p className="font-medium text-gray-900">Reduce food spending</p>
                <p className="text-xs text-gray-600 mt-1">This is your highest spending area</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-4 bg-orange-50 border border-orange-200 rounded-xl hover:shadow-md transition-all">
              <div className="w-5 h-5 rounded-full border-2 border-orange-500 flex-shrink-0 mt-0.5"></div>
              <div>
                <p className="font-medium text-gray-900">Control shopping expenses</p>
                <p className="text-xs text-gray-600 mt-1">Trending upward monthly</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-xl hover:shadow-md transition-all">
              <div className="w-5 h-5 rounded-full border-2 border-green-500 flex-shrink-0 mt-0.5"></div>
              <div>
                <p className="font-medium text-gray-900">Increase your SIP contributions</p>
                <p className="text-xs text-gray-600 mt-1">Build long-term wealth</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}