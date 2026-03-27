import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, startOfMonth, subMonths } from 'date-fns';
import type { Transaction } from './TransactionList';

interface IncomeExpenseTrendProps {
  transactions: Transaction[];
}

export function IncomeExpenseTrend({ transactions }: IncomeExpenseTrendProps) {
  const getLast6Months = () => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const date = startOfMonth(subMonths(new Date(), i));
      months.push(date);
    }
    return months;
  };

  const months = getLast6Months();

  const data = months.map(month => {
    const monthTransactions = transactions.filter(t => {
      const transactionDate = new Date(t.date);
      return (
        transactionDate.getMonth() === month.getMonth() &&
        transactionDate.getFullYear() === month.getFullYear()
      );
    });

    const income = monthTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const expenses = monthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      month: format(month, 'MMM yyyy'),
      Income: parseFloat(income.toFixed(2)),
      Expenses: parseFloat(expenses.toFixed(2)),
    };
  });

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <h2 className="mb-4">Income vs Expenses (Last 6 Months)</h2>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip formatter={(value) => `$${value}`} />
          <Legend />
          <Bar dataKey="Income" fill="#22c55e" />
          <Bar dataKey="Expenses" fill="#ef4444" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
