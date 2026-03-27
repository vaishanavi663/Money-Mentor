import type { FinanceStats, Transaction } from "../types/finance";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

export interface AuthResponse {
  message: string;
  user: AuthUser;
  token: string;
}

const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:4000/api";
const AUTH_TOKEN_KEY = "moneymentor-token";

export function getStoredToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY) || "";
}

export function setStoredToken(token: string) {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function clearStoredToken() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
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
    throw new Error(errorMessage);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const api = {
  getTransactions: () => request<Transaction[]>("/transactions"),
  addTransaction: (transaction: Omit<Transaction, "id">) =>
    request<Transaction>("/transactions", {
      method: "POST",
      body: JSON.stringify(transaction),
    }),
  deleteTransaction: (id: string) =>
    request<void>(`/transactions/${id}`, { method: "DELETE" }),
  getStats: () => request<FinanceStats>("/stats"),
  register: (payload: { fullName: string; email: string; password: string }) =>
    request<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  login: (payload: { email: string; password: string }) =>
    request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getMe: () => request<{ user: AuthUser }>("/auth/me"),
  logout: () => request<{ message: string }>("/auth/logout", { method: "POST" }),
};
