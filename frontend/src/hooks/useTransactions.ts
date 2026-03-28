import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type SaveTransactionPayload } from "../app/lib/api";
import type { ParsedSmsResult, TransactionListResponse, TransactionSummaryResponse } from "../app/types/finance";

export const transactionSummaryKey = ["transactionSummary"] as const;
export const taxTipsKey = ["taxTips"] as const;

export function transactionsListKey(filters: {
  month?: number;
  year?: number;
  category?: string;
  limit?: number;
  offset?: number;
}) {
  return [
    "transactions",
    filters.month ?? null,
    filters.year ?? null,
    filters.category ?? null,
    filters.limit ?? null,
    filters.offset ?? null,
  ] as const;
}

export function useTransactionSummary() {
  return useQuery({
    queryKey: transactionSummaryKey,
    queryFn: () => api.getTransactionSummary(),
  });
}

export function useTransactionsList(filters: {
  month?: number;
  year?: number;
  category?: string;
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: transactionsListKey(filters),
    queryFn: (): Promise<TransactionListResponse> =>
      api.getTransactionsList({
        month: filters.month,
        year: filters.year,
        category: filters.category,
        limit: filters.limit,
        offset: filters.offset,
      }),
  });
}

export function useParseSms() {
  return useMutation({
    mutationFn: (smsText: string) => api.parseTransactionSms(smsText),
  });
}

export function useSaveTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: SaveTransactionPayload) => api.saveTransaction(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: transactionSummaryKey });
      void qc.invalidateQueries({ queryKey: ["transactions"] });
      void qc.invalidateQueries({ queryKey: taxTipsKey });
    },
  });
}

export function useInvalidateTransactionQueries() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: transactionSummaryKey });
    void qc.invalidateQueries({ queryKey: ["transactions"] });
    void qc.invalidateQueries({ queryKey: taxTipsKey });
  };
}

/** Imperative helpers (same auth + base URL as api.ts) */
export async function fetchSummary(): Promise<TransactionSummaryResponse> {
  return api.getTransactionSummary();
}

export async function fetchTransactions(
  filters: Parameters<typeof api.getTransactionsList>[0],
): Promise<TransactionListResponse> {
  return api.getTransactionsList(filters);
}

export async function parseSMS(text: string): Promise<ParsedSmsResult[]> {
  const r = await api.parseTransactionSms(text);
  return r.results;
}

export async function saveTransaction(data: SaveTransactionPayload) {
  return api.saveTransaction(data);
}
