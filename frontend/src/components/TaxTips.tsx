import { PiggyBank, Heart, Home, Utensils, X, Sparkles, Lock } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Skeleton } from "@/app/components/ui/skeleton";
import { useDismissTaxTip, useTaxTips } from "@/hooks/useTaxTips";
import type { TaxTipDto } from "@/app/types/finance";
import { usePlan } from "@/hooks/usePlan";

function iconFor(name: string | null) {
  switch (name) {
    case "piggy-bank":
      return PiggyBank;
    case "heart-pulse":
      return Heart;
    case "home":
      return Home;
    case "utensils":
      return Utensils;
    default:
      return Sparkles;
  }
}

function badgeForCategory(cat: string | null): string {
  if (!cat) return "Tip";
  if (cat === "Spending Alert") return "Spending Alert";
  return cat;
}

function borderClass(tip: TaxTipDto): string {
  if (tip.category === "Spending Alert") return "border-l-amber-500";
  if (tip.potentialSavings != null && tip.potentialSavings > 0) return "border-l-emerald-500";
  return "border-l-blue-500";
}

interface TaxTipsProps {
  variant?: "dashboard" | "page";
}

export function TaxTips({ variant = "dashboard" }: TaxTipsProps) {
  const { data, isLoading, isError } = useTaxTips();
  const dismiss = useDismissTaxTip();
  const { isPro, showUpgradeModal } = usePlan();
  const tips = data?.tips ?? [];
  const visibleTips = isPro ? tips : tips.slice(0, 3);
  const extraTipCount = Math.max(0, tips.length - 3);

  if (isLoading) {
    return (
      <div className={variant === "page" ? "mx-auto max-w-3xl space-y-4 p-6" : "space-y-3"}>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-28 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-800">
        Could not load tax tips. Try again after your connection stabilizes.
      </div>
    );
  }

  if (tips.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-600">
        Great! No tax tips right now. Keep adding transactions for personalized advice.
      </div>
    );
  }

  const handlePdfClick = () => {
    if (!isPro) {
      showUpgradeModal(
        "Tax tips PDF export",
        "Download a printable PDF summary of your personalized tax tips — Pro only.",
      );
      return;
    }
    window.print();
  };

  return (
    <div className={variant === "page" ? "mx-auto max-w-3xl space-y-4 p-6" : "space-y-3"}>
      {variant === "page" && (
        <div className="mb-2 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tax tips</h1>
            <p className="text-sm text-gray-600">Suggestions based on your actual transaction history (India FY).</p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="shrink-0 border-emerald-200 text-emerald-800 hover:bg-emerald-50"
            onClick={handlePdfClick}
          >
            Download PDF report
          </Button>
        </div>
      )}
      <div className="space-y-3 print:space-y-4">
        {visibleTips.map((tip) => {
          const Icon = iconFor(tip.icon);
          return (
            <div
              key={tip.id}
              className={`relative flex gap-4 rounded-xl border border-gray-200 bg-white p-4 pl-5 shadow-sm ${borderClass(tip)} border-l-4`}
            >
              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-50 text-gray-700">
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                    {badgeForCategory(tip.category)}
                  </span>
                  {tip.potentialSavings != null && tip.potentialSavings > 0 && (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                      Potential savings: ₹{tip.potentialSavings.toLocaleString("en-IN")}
                    </span>
                  )}
                </div>
                <p className="text-sm leading-relaxed text-gray-800">{tip.tip}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0 text-gray-400 hover:text-gray-700"
                aria-label="Dismiss tip"
                disabled={dismiss.isPending}
                onClick={() => dismiss.mutate(tip.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          );
        })}
        {!isPro && extraTipCount > 0 && (
          <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-gradient-to-br from-gray-50 to-slate-100 p-6 text-center">
            <div className="pointer-events-none select-none blur-sm">
              <p className="text-sm text-gray-600">
                Additional personalized tips based on your spending patterns and Section 80C eligibility appear here for
                Pro members.
              </p>
            </div>
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/75 px-4 backdrop-blur-[2px]">
              <Lock className="h-8 w-8 text-amber-600" aria-hidden />
              <p className="text-sm font-semibold text-gray-900">
                {extraTipCount} more tip{extraTipCount === 1 ? "" : "s"} available in Pro.
              </p>
              <Button
                type="button"
                size="sm"
                className="bg-gradient-to-r from-green-600 to-blue-600 text-white"
                onClick={() =>
                  showUpgradeModal(
                    "Full tax tips",
                    "See every AI-generated tip matched to your real transactions — upgrade to unlock the rest.",
                  )
                }
              >
                Upgrade to Pro
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
