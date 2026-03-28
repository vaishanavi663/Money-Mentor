import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { taxTipsKey, transactionSummaryKey } from '@/hooks/useTransactions';
import { Plus, Filter, Calendar, TrendingDown, Receipt, Trash2 } from 'lucide-react';
import { AddTransactionForm } from './AddTransactionForm';
import { BudgetTracker, type Budget } from './BudgetTracker';
import { ExpenseChart } from './ExpenseChart';
import { api } from '../lib/api';
import type { Transaction } from '../types/finance';
import { useUserProfile } from '../context/UserProfileContext';

export function ExpensesDashboard() {
  const queryClient = useQueryClient();
  const { profile } = useUserProfile();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const categoryIcons: { [key: string]: string } = {
    'Food & Dining': '🍽️',
    Transport: '🚗',
    Transportation: '🚗',
    Shopping: '🛍️',
    Utilities: '💡',
    'Bills & Utilities': '💡',
    Entertainment: '🎬',
    Health: '🏥',
    Healthcare: '🏥',
    'UPI Transfer': '📲',
    Insurance: '🛡️',
    Investments: '📈',
    Salary: '💰',
    Freelance: '💼',
    Other: '📝',
    Others: '📝',
  };

  const categories = useMemo(
    () => [
      'Food & Dining',
      'Transport',
      'Shopping',
      'Entertainment',
      'UPI Transfer',
      'Health',
      'Utilities',
      'Insurance',
      'Investments',
      'Salary',
      'Freelance',
      'Others',
    ],
    [],
  );

  const loadTransactions = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getTransactions();
      setTransactions(data);
    } catch (loadError) {
      setError('Could not load transactions. Start API server and check DB connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTransactions();
  }, []);

  useEffect(() => {
    setBudgets((previous) => {
      if (previous.length > 0) return previous;
      return [
        {
          id: 'seed-food',
          category: 'Food & Dining',
          limit: Math.max(5000, Math.round(profile.monthlyExpenses * 0.2)),
        },
        {
          id: 'seed-bills',
          category: 'Bills & Utilities',
          limit: Math.max(4000, Math.round(profile.monthlyExpenses * 0.25)),
        },
      ];
    });
  }, [profile.monthlyExpenses]);

  const invalidateLedger = () => {
    void queryClient.invalidateQueries({ queryKey: transactionSummaryKey });
    void queryClient.invalidateQueries({ queryKey: taxTipsKey });
    void queryClient.invalidateQueries({
      predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === 'transactions',
    });
  };

  const handleAddTransaction = async (transaction: Omit<Transaction, 'id'>) => {
    await api.addTransaction(transaction);
    await loadTransactions();
    invalidateLedger();
    setShowAddForm(false);
  };

  const handleDeleteTransaction = async (id: string) => {
    await api.deleteTransaction(id);
    await loadTransactions();
    invalidateLedger();
  };
  const handleAddBudget = (budget: { category: string; limit: number }) => {
    setBudgets((previous) => [...previous, { ...budget, id: crypto.randomUUID() }]);
  };
  const handleDeleteBudget = (id: string) => {
    setBudgets((previous) => previous.filter((budget) => budget.id !== id));
  };

  const expenseTransactions = transactions.filter((t) => t.type === 'debit');
  const totalSpent = expenseTransactions.reduce((sum, t) => sum + t.amount, 0);
  const avgDailySpend = expenseTransactions.length > 0 ? totalSpent / expenseTransactions.length : 0;

  const insightLines = useMemo(() => {
    if (transactions.length === 0) {
      return [
        `No transactions yet. Your profile estimates ₹${profile.monthlyExpenses.toLocaleString('en-IN')}/month in expenses — add real entries to replace this with actual spending insights.`,
        profile.primaryConcern
          ? `You shared this concern: "${profile.primaryConcern}". Once we have transaction data, tips here will tie to that.`
          : 'After you add expenses, we will highlight top categories and spending patterns.',
      ];
    }
    if (expenseTransactions.length === 0) {
      return [
        'Only income is logged so far. Add expense transactions to see category insights and comparisons to your profile.',
        `Onboarding spend estimate: ₹${profile.monthlyExpenses.toLocaleString('en-IN')}/mo — logging helps verify if that matches reality.`,
      ];
    }
    const byCategory = expenseTransactions.reduce<Record<string, number>>((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {});
    const sorted = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
    const top = sorted[0];
    const pct =
      totalSpent > 0 && top ? ((top[1] / totalSpent) * 100).toFixed(0) : '0';
    return [
      top
        ? `Highest share of your recorded expenses: ${top[0]} (${pct}% of ₹${totalSpent.toLocaleString('en-IN')} total).`
        : 'Keep categorizing expenses for clearer breakdowns.',
      `You have ${expenseTransactions.length} expense line items — more consistent categories make trends easier to read.`,
      profile.goals.length > 0
        ? `Your goals include: ${profile.goals.slice(0, 4).join(', ')}${profile.goals.length > 4 ? '…' : ''}.`
        : 'Complete onboarding goals so we can align tips with what you are saving for.',
    ];
  }, [expenseTransactions, profile.goals, profile.monthlyExpenses, profile.primaryConcern, totalSpent, transactions.length]);

  return (
    <div className="h-full overflow-y-auto bg-white/45 backdrop-blur-[2px] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Expense Tracking</h1>
            <p className="text-gray-600">Track karo apne har ek rupaye ko</p>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-xl hover:shadow-lg transition-all"
          >
            <Plus className="w-5 h-5" />
            Add Transaction
          </button>
        </div>

        {showAddForm && (
          <AddTransactionForm onAdd={handleAddTransaction} categories={categories} />
        )}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3">
            {error}
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Spent</p>
                <p className="text-2xl font-bold text-red-600">₹{totalSpent.toLocaleString('en-IN')}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <TrendingDown className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Transactions</p>
                <p className="text-2xl font-bold">{transactions.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Receipt className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Avg Daily Spend</p>
                <p className="text-2xl font-bold">₹{Math.round(avgDailySpend).toLocaleString('en-IN')}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <Calendar className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center gap-4 flex-wrap">
            <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
              <Filter className="w-4 h-4" />
              All Categories
            </button>
            <button className="px-4 py-2 text-sm hover:bg-gray-100 rounded-lg transition-colors">
              This Month
            </button>
            <button className="px-4 py-2 text-sm hover:bg-gray-100 rounded-lg transition-colors">
              Last 7 Days
            </button>
            <button className="px-4 py-2 text-sm hover:bg-gray-100 rounded-lg transition-colors">
              Custom Range
            </button>
          </div>
        </div>

        {/* Transactions List */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h2 className="font-semibold">Recent Transactions</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {loading ? (
              <div className="p-4 text-gray-500">Loading transactions...</div>
            ) : transactions.length === 0 ? (
              <div className="p-4 text-gray-500">No transactions found. Add your first transaction.</div>
            ) : transactions.map((transaction) => (
              <div key={transaction.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${
                    transaction.type === 'credit' ? 'bg-green-100' : 'bg-red-100'
                  }`}>
                    {categoryIcons[transaction.category] || '📝'}
                  </div>

                  <div className="flex-1">
                    <h3 className="font-medium">{transaction.description}</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span>{transaction.category}</span>
                      <span>•</span>
                      <span>{new Date(transaction.date).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className={`text-xl font-bold ${
                      transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {transaction.type === 'credit' ? '+' : '-'}₹{transaction.amount.toLocaleString('en-IN')}
                    </div>
                    <button
                      onClick={() => void handleDeleteTransaction(transaction.id)}
                      className="p-2 rounded-md hover:bg-red-100 text-gray-500 hover:text-red-600"
                      aria-label="Delete transaction"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Insights */}
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-6">
          <h3 className="font-semibold mb-3">💡 AI Insights</h3>
          <ul className="space-y-2 text-sm text-gray-700">
            {insightLines.map((line, i) => (
              <li key={i}>• {line}</li>
            ))}
          </ul>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <BudgetTracker
            budgets={budgets}
            transactions={transactions}
            onAddBudget={handleAddBudget}
            onDeleteBudget={handleDeleteBudget}
            categories={categories}
          />
          <ExpenseChart transactions={transactions} />
        </div>
      </div>
    </div>
  );
}
