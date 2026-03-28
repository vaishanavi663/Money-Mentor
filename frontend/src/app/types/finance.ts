export type TransactionType = "debit" | "credit";

export interface Transaction {
  id: string;
  type: TransactionType;
  category: string;
  description: string;
  amount: number;
  date: string;
}

export interface TransactionListResponse {
  transactions: Array<{
    id: string;
    amount: number;
    type: TransactionType;
    merchant: string | null;
    category: string;
    description: string;
    upiRef?: string | null;
    source?: string;
    rawSms?: string | null;
    transactionDate: string;
    createdAt?: string;
  }>;
  total: number;
  totalDebit: number;
  totalCredit: number;
}

export interface ParsedSmsResult {
  amount: number;
  type: TransactionType;
  merchant: string;
  category: string;
  upiRef: string | null;
  date: string;
  confidence: number;
  rawSms: string;
}

export interface TransactionSummaryResponse {
  currentMonth: {
    total: number;
    debit: number;
    credit: number;
    count: number;
  };
  last6Months: Array<{ month: number; year: number; debit: number; credit: number }>;
  topCategories: Array<{ category: string; amount: number; count: number }>;
}

export interface TaxTipDto {
  id: string;
  category: string | null;
  tip: string;
  potentialSavings: number | null;
  icon: string | null;
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
