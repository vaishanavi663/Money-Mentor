import { Wallet, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

interface DashboardProps {
  totalBalance: number;
  income: number;
  expenses: number;
  monthlyChange: number;
}

export function Dashboard({ totalBalance, income, expenses, monthlyChange }: DashboardProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div className="bg-card rounded-lg p-6 border border-border">
        <div className="flex items-center justify-between mb-2">
          <p className="text-muted-foreground">Total Balance</p>
          <Wallet className="w-5 h-5 text-muted-foreground" />
        </div>
        <h3 className="text-[32px]">${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
      </div>

      <div className="bg-card rounded-lg p-6 border border-border">
        <div className="flex items-center justify-between mb-2">
          <p className="text-muted-foreground">Income</p>
          <TrendingUp className="w-5 h-5 text-green-600" />
        </div>
        <h3 className="text-[32px] text-green-600">${income.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
      </div>

      <div className="bg-card rounded-lg p-6 border border-border">
        <div className="flex items-center justify-between mb-2">
          <p className="text-muted-foreground">Expenses</p>
          <TrendingDown className="w-5 h-5 text-red-600" />
        </div>
        <h3 className="text-[32px] text-red-600">${expenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
      </div>

      <div className="bg-card rounded-lg p-6 border border-border">
        <div className="flex items-center justify-between mb-2">
          <p className="text-muted-foreground">Monthly Change</p>
          <DollarSign className="w-5 h-5 text-muted-foreground" />
        </div>
        <h3 className={`text-[32px] ${monthlyChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {monthlyChange >= 0 ? '+' : ''}{monthlyChange.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
        </h3>
      </div>
    </div>
  );
}
