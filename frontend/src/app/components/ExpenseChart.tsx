import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import type { Transaction } from './TransactionList';

interface ExpenseChartProps {
  transactions: Transaction[];
  seededMonthlyExpense?: number;
}

const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9'];

export function ExpenseChart({ transactions, seededMonthlyExpense = 0 }: ExpenseChartProps) {
  const expensesByCategory = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, transaction) => {
      acc[transaction.category] = (acc[transaction.category] || 0) + transaction.amount;
      return acc;
    }, {} as Record<string, number>);

  let data = Object.entries(expensesByCategory).map(([name, value]) => ({
    name,
    value: parseFloat(value.toFixed(2)),
  }));

  if (data.length === 0 && seededMonthlyExpense > 0) {
    data = [
      { name: 'Essentials', value: parseFloat((seededMonthlyExpense * 0.55).toFixed(2)) },
      { name: 'Lifestyle', value: parseFloat((seededMonthlyExpense * 0.25).toFixed(2)) },
      { name: 'Bills', value: parseFloat((seededMonthlyExpense * 0.2).toFixed(2)) },
    ];
  }

  if (data.length === 0) {
    return (
      <div className="bg-card rounded-lg border border-border p-6">
        <h2 className="mb-4">Expenses by Category</h2>
        <div className="h-[300px] flex items-center justify-center text-muted-foreground">
          No expense data to display
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <h2 className="mb-4">Expenses by Category</h2>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => `$${value}`} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
