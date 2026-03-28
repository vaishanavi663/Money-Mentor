export interface Transaction {
  id: string;
  type: "income" | "expense";
  category: string;
  description: string;
  amount: number;
  date: string;
}

export interface FinanceStats {
  summary: {
    income: number;
    expenses: number;
    savings: number;
    totalBalance: number;
    monthlyChange: number;
  };
  byCategory: Array<{ name: string; value: number }>;
  monthlyTrend: Array<{ month: string; income: number; expenses: number }>;
  meta?: {
    transactionCount: number;
  };
}
