import type {
  FinanceStats,
  ParsedSmsResult,
  TaxTipDto,
  Transaction,
  TransactionListResponse,
  TransactionSummaryResponse,
  TransactionType,
} from "../types/finance";
import type { UserProfile } from "../types/userProfile";

export type UserPlan = "free" | "pro";

export type AiChatTurn = { role: "user" | "model"; parts: { text: string }[] };

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  plan: UserPlan;
  planExpiresAt: string | null;
}

export interface AuthResponse {
  message: string;
  user: AuthUser;
  token: string;
}

/** Ensures requests hit .../api/profile, not .../profile (which returns 404). */
function normalizeApiBaseUrl(): string {
  const raw = (import.meta.env.VITE_API_URL || "http://localhost:4000/api").trim().replace(/\/+$/, "");
  if (/\/api$/i.test(raw)) {
    return raw;
  }
  return `${raw}/api`;
}

const baseUrl = normalizeApiBaseUrl();
const AUTH_TOKEN_KEY = "moneymentor-token";

/** Same origin as other API calls (handles VITE_API_URL with or without trailing `/api`). */
export function getApiBaseUrl(): string {
  return baseUrl;
}

export function getStoredToken() {
  const raw =
    localStorage.getItem(AUTH_TOKEN_KEY) || localStorage.getItem("token") || "";
  return raw.trim();
}

export function setStoredToken(token: string) {
  const t = token.trim();
  localStorage.setItem(AUTH_TOKEN_KEY, t);
}

export function clearStoredToken() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem("token");
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options?.headers || undefined);
  headers.set("Content-Type", "application/json");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${baseUrl}${path}`, {
    headers,
    ...options,
  });

  if (!response.ok) {
    let errorMessage = `API request failed: ${response.status}`;
    try {
      const body = (await response.json()) as { error?: string; message?: string };
      errorMessage = body.error || body.message || errorMessage;
    } catch {
      const text = await response.text();
      if (text) {
        errorMessage = text;
      }
    }
    const err = new Error(errorMessage) as Error & { status: number };
    err.status = response.status;
    throw err;
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

function transactionListQuery(params: {
  month?: number;
  year?: number;
  category?: string;
  limit?: number;
  offset?: number;
}) {
  const q = new URLSearchParams();
  if (params.month != null) q.set("month", String(params.month));
  if (params.year != null) q.set("year", String(params.year));
  if (params.category) q.set("category", params.category);
  if (params.limit != null) q.set("limit", String(params.limit));
  if (params.offset != null) q.set("offset", String(params.offset));
  const s = q.toString();
  return s ? `?${s}` : "";
}

export interface SaveTransactionPayload {
  amount: number;
  type: TransactionType;
  merchant?: string;
  category: string;
  upiRef?: string | null;
  source?: string;
  rawSms?: string | null;
  transactionDate?: string;
  description?: string;
  date?: string;
}

export const api = {
  getTransactionsList: (params?: {
    month?: number;
    year?: number;
    category?: string;
    limit?: number;
    offset?: number;
  }) => request<TransactionListResponse>(`/transactions${transactionListQuery(params || {})}`),

  getTransactionSummary: () => request<TransactionSummaryResponse>("/transactions/summary"),

  parseTransactionSms: (smsText: string) =>
    request<{ results: ParsedSmsResult[] }>("/transactions/parse-sms", {
      method: "POST",
      body: JSON.stringify({ smsText }),
    }),

  saveTransaction: (body: SaveTransactionPayload) =>
    request<Record<string, unknown>>("/transactions", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  getTaxTips: () => request<{ tips: TaxTipDto[] }>("/tax-tips"),

  dismissTaxTip: (id: string) =>
    request<{ ok: boolean; id: string }>(`/tax-tips/${encodeURIComponent(id)}/dismiss`, {
      method: "POST",
    }),

  getTransactions: async () => {
    const res = await request<TransactionListResponse>(`/transactions${transactionListQuery({ limit: 200, offset: 0 })}`);
    const transactions = res.transactions.map((row) => ({
      id: row.id,
      type: row.type,
      category: row.category,
      description: row.description || row.merchant || "",
      amount: row.amount,
      date: (row.transactionDate || "").slice(0, 10),
    })) as Transaction[];
    return { transactions, total: res.total };
  },

  addTransaction: (transaction: Omit<Transaction, "id">) =>
    request<Record<string, unknown>>("/transactions", {
      method: "POST",
      body: JSON.stringify({
        amount: transaction.amount,
        type: transaction.type,
        merchant: transaction.description,
        category: transaction.category,
        description: transaction.description,
        transactionDate: transaction.date,
        source: "manual",
      }),
    }),

  deleteTransaction: (id: string) =>
    request<void>(`/transactions/${id}`, { method: "DELETE" }),
  getStats: () => request<FinanceStats>("/stats"),
  getUserProfile: () => request<{ profile: UserProfile }>("/profile"),
  putUserProfile: (profile: UserProfile) =>
    request<{ profile: UserProfile }>("/profile", {
      method: "PUT",
      body: JSON.stringify(profile),
    }),
  register: (payload: { fullName: string; email: string; password: string; plan?: UserPlan }) =>
    request<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  upgradeToPro: () =>
    request<{ user: AuthUser; message: string }>("/auth/upgrade-pro", { method: "POST" }),
  login: (payload: { email: string; password: string }) =>
    request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getMe: () => request<{ user: AuthUser }>("/auth/me"),
  logout: () => request<{ message: string }>("/auth/logout", { method: "POST" }),

  aiChat: (body: { message: string; conversationHistory: AiChatTurn[] }) =>
    request<{ reply: string }>("/ai/chat", {
      method: "POST",
      body: JSON.stringify(body),
    }),
};
