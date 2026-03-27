import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import type { Transaction } from './TransactionList';

export interface Budget {
  id: string;
  category: string;
  limit: number;
}

interface BudgetTrackerProps {
  budgets: Budget[];
  transactions: Transaction[];
  onAddBudget: (budget: { category: string; limit: number }) => void;
  onDeleteBudget: (id: string) => void;
  categories: string[];
}

export function BudgetTracker({ budgets, transactions, onAddBudget, onDeleteBudget, categories }: BudgetTrackerProps) {
  const [showForm, setShowForm] = useState(false);
  const [category, setCategory] = useState('');
  const [limit, setLimit] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!category || !limit) return;

    onAddBudget({
      category,
      limit: parseFloat(limit),
    });

    setCategory('');
    setLimit('');
    setShowForm(false);
  };

  const getBudgetSpent = (budgetCategory: string) => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    return transactions
      .filter(t => {
        const transactionDate = new Date(t.date);
        return (
          t.type === 'expense' &&
          t.category === budgetCategory &&
          transactionDate.getMonth() === currentMonth &&
          transactionDate.getFullYear() === currentYear
        );
      })
      .reduce((sum, t) => sum + t.amount, 0);
  };

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <div className="flex items-center justify-between mb-4">
        <h2>Budget Tracker</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="p-2 hover:bg-secondary rounded-md transition-colors"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-4 p-4 bg-secondary/50 rounded-md space-y-3">
          <div>
            <label htmlFor="budget-category" className="block mb-2 text-[14px]">Category</label>
            <select
              id="budget-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 bg-input-background rounded-md border border-border focus:outline-none focus:ring-2 focus:ring-ring"
              required
            >
              <option value="">Select category</option>
              {categories.filter(cat => !budgets.find(b => b.category === cat)).map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="budget-limit" className="block mb-2 text-[14px]">Monthly Limit</label>
            <input
              id="budget-limit"
              type="number"
              step="0.01"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2 bg-input-background rounded-md border border-border focus:outline-none focus:ring-2 focus:ring-ring"
              required
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 bg-primary text-primary-foreground py-2 px-4 rounded-md hover:bg-primary/90 transition-colors"
            >
              Add Budget
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="flex-1 bg-secondary text-secondary-foreground py-2 px-4 rounded-md hover:bg-secondary/80 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="space-y-4">
        {budgets.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            No budgets set. Add a budget to track your spending.
          </div>
        ) : (
          budgets.map((budget) => {
            const spent = getBudgetSpent(budget.category);
            const percentage = (spent / budget.limit) * 100;
            const isOverBudget = spent > budget.limit;

            return (
              <div key={budget.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{budget.category}</p>
                    <p className="text-[14px] text-muted-foreground">
                      ${spent.toFixed(2)} of ${budget.limit.toFixed(2)}
                    </p>
                  </div>
                  <button
                    onClick={() => onDeleteBudget(budget.id)}
                    className="p-2 hover:bg-destructive/10 rounded-md text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      isOverBudget ? 'bg-red-600' : percentage > 80 ? 'bg-yellow-600' : 'bg-green-600'
                    }`}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  />
                </div>
                {isOverBudget && (
                  <p className="text-[14px] text-red-600">
                    Over budget by ${(spent - budget.limit).toFixed(2)}
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
