import { useState } from "react";
import { toast } from "sonner";
import { Card } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Textarea } from "@/app/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import type { ParsedSmsResult } from "@/app/types/finance";
import { useParseSms, useSaveTransaction, useInvalidateTransactionQueries } from "@/hooks/useTransactions";

export const INDIAN_SMS_CATEGORIES = [
  "Food & Dining",
  "Transport",
  "Shopping",
  "Entertainment",
  "UPI Transfer",
  "Health",
  "Utilities",
  "Insurance",
  "Investments",
  "Others",
] as const;

type PreviewRow = ParsedSmsResult & { category: string };

export function SMSImport() {
  const [smsText, setSmsText] = useState("");
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const parseMut = useParseSms();
  const saveMut = useSaveTransaction();
  const invalidateAll = useInvalidateTransactionQueries();

  const handleParse = () => {
    parseMut.mutate(smsText, {
      onSuccess: (data) => {
        const next = (data.results || []).map((r) => ({
          ...r,
          category: r.category || "Others",
        }));
        setRows(next);
        if (next.length === 0) {
          toast.message("No transactions parsed", {
            description: "Check that each line looks like a bank/UPI SMS with amount and debit/credit wording.",
          });
        }
      },
      onError: (e) => toast.error(e instanceof Error ? e.message : "Parse failed"),
    });
  };

  const setRowCategory = (index: number, category: string) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, category } : r)));
  };

  const handleSaveAll = async () => {
    if (rows.length === 0) return;
    let ok = 0;
    for (const r of rows) {
      try {
        await saveMut.mutateAsync({
          amount: r.amount,
          type: r.type,
          merchant: r.merchant,
          category: r.category,
          upiRef: r.upiRef,
          source: "sms",
          rawSms: r.rawSms,
          transactionDate: r.date,
        });
        ok += 1;
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Save failed");
        break;
      }
    }
    if (ok > 0) {
      toast.success(`${ok} transaction${ok === 1 ? "" : "s"} saved!`);
      setRows([]);
      setSmsText("");
      invalidateAll();
    }
  };

  return (
    <Card className="border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-1 text-lg font-semibold text-gray-900">UPI / bank SMS import</h2>
      <p className="mb-4 text-sm text-gray-600">
        Paste your UPI/bank SMS messages here (one per line). We parse amounts, merchants, and dates — nothing is
        saved until you confirm.
      </p>
      <Textarea
        className="min-h-[140px] mb-3"
        placeholder={`e.g.\nRs.500.00 debited from A/c XX1234 to merchant@upi on 15-03-25\n₹350 paid to Swiggy via GPay. UPI Ref: 987654321`}
        value={smsText}
        onChange={(e) => setSmsText(e.target.value)}
      />
      <div className="mb-6 flex flex-wrap gap-2">
        <Button type="button" onClick={handleParse} disabled={parseMut.isPending || !smsText.trim()}>
          {parseMut.isPending ? "Parsing…" : "Parse & Preview"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => void handleSaveAll()}
          disabled={rows.length === 0 || saveMut.isPending}
        >
          {saveMut.isPending ? "Saving…" : "Save All to My Account"}
        </Button>
      </div>

      {rows.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Amount</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Merchant</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Confidence</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r, i) => (
                <TableRow key={`${r.rawSms}-${i}`}>
                  <TableCell className="font-medium">₹{r.amount.toLocaleString("en-IN")}</TableCell>
                  <TableCell className="capitalize">{r.type}</TableCell>
                  <TableCell>{r.merchant}</TableCell>
                  <TableCell className="min-w-[160px]">
                    <Select value={r.category} onValueChange={(v) => setRowCategory(i, v)}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {INDIAN_SMS_CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-gray-600">
                    {new Date(r.date).toLocaleDateString("en-IN")}
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">{(r.confidence * 100).toFixed(0)}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  );
}
