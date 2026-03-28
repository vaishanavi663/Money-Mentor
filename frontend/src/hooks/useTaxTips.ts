import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../app/lib/api";
import { taxTipsKey } from "./useTransactions";

export function useTaxTips() {
  return useQuery({
    queryKey: taxTipsKey,
    queryFn: () => api.getTaxTips(),
  });
}

export function useDismissTaxTip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.dismissTaxTip(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: taxTipsKey });
    },
  });
}
