import { useQuery } from "@tanstack/react-query";
import { getApiBaseUrl, getStoredToken } from "@/app/lib/api";

function authHeaders() {
  const token = getStoredToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export interface MutualFund {
  code: number;
  schemeCode: number;
  name: string;
  category: string;
  type: string;
  nav: string;
  navDate: string;
  change: string;
  url: string;
  investUrl: string;
}

export function useTopMutualFunds() {
  return useQuery<MutualFund[]>({
    queryKey: ["mf-top"],
    queryFn: async () => {
      const res = await fetch(`${getApiBaseUrl()}/mf/top`, {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error("Failed to fetch funds");
      return res.json();
    },
    staleTime: 1000 * 60 * 60,
    refetchOnWindowFocus: false,
  });
}

export function useMFSearch(query: string) {
  return useQuery({
    queryKey: ["mf-search", query],
    queryFn: async () => {
      if (!query.trim()) return [];
      const res = await fetch(`${getApiBaseUrl()}/mf/search?q=${encodeURIComponent(query)}`, {
        headers: authHeaders(),
      });
      return res.json();
    },
    enabled: query.length >= 2,
    staleTime: 1000 * 60 * 5,
  });
}
