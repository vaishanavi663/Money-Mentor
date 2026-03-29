import { Sparkles, ArrowRight, CheckCircle2, Info } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useUserProfile } from "../context/UserProfileContext";
import {
  computeNextFinancialMove,
  type NextMoveAppPage,
  type TransactionSnapshot,
} from "../lib/nextFinancialMove";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

export interface NextFinancialMoveProps {
  transactionContext: TransactionSnapshot;
  onNavigateToPage?: (page: NextMoveAppPage) => void;
  onScrollToSmsImport?: () => void;
}

const confidenceLabel: Record<string, string> = {
  high: "High",
  medium: "Medium",
  exploratory: "Contextual",
};

export function NextFinancialMove({
  transactionContext,
  onNavigateToPage,
  onScrollToSmsImport,
}: NextFinancialMoveProps) {
  const { profile } = useUserProfile();
  const [isHovered, setIsHovered] = useState(false);
  const [whyOpen, setWhyOpen] = useState(false);

  const move = useMemo(
    () => computeNextFinancialMove(profile, transactionContext),
    [profile, transactionContext],
  );

  const handlePrimaryAction = () => {
    if (move.navigateTo === "sms-import") {
      if (onScrollToSmsImport) {
        onScrollToSmsImport();
        return;
      }
      toast.message("Scroll up to UPI / bank SMS import", {
        description: "Paste SMS on the dashboard to sync transactions.",
      });
      return;
    }
    if (onNavigateToPage) {
      onNavigateToPage(move.navigateTo);
      return;
    }
    toast.message("Open from the sidebar", {
      description: `Jump to ${move.navigateTo} to act on this suggestion.`,
    });
  };

  return (
    <div className="relative w-full">
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white via-blue-50 to-purple-50 opacity-60" />

      <div
        className="relative overflow-hidden rounded-3xl border border-white/50 bg-white/80 shadow-2xl backdrop-blur-xl transition-all duration-300 ease-out"
        style={{
          boxShadow: isHovered
            ? "0 25px 50px -12px rgba(0, 0, 0, 0.15), 0 0 30px rgba(16, 185, 129, 0.3)"
            : "0 20px 45px -10px rgba(0, 0, 0, 0.1), 0 0 20px rgba(16, 185, 129, 0.2)",
          transform: isHovered ? "scale(1.02)" : "scale(1)",
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div
          className="absolute bottom-0 left-0 top-0 w-1.5 bg-gradient-to-b from-green-400 via-green-500 to-green-600 transition-all duration-500"
          style={{
            boxShadow: isHovered
              ? "0 0 25px rgba(16, 185, 129, 0.8), 0 0 50px rgba(16, 185, 129, 0.4)"
              : "0 0 15px rgba(16, 185, 129, 0.6)",
          }}
        />

        <div className="relative p-6 sm:p-8 lg:p-10">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🔥</span>
              <h2 className="bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-xl font-bold text-transparent sm:text-2xl">
                Your Next Financial Move
              </h2>
            </div>

            <div className="flex w-fit items-center gap-2 rounded-full border border-purple-200 bg-gradient-to-r from-purple-100 to-blue-100 px-4 py-2">
              <Sparkles className="h-4 w-4 animate-pulse text-purple-600" />
              <span className="text-sm font-semibold text-purple-700">Personalised</span>
              <span className="ml-1 text-xs text-purple-600">
                · Confidence: {confidenceLabel[move.confidence] ?? move.confidence}
              </span>
            </div>
          </div>

          <div className="mb-4">
            <h3 className="mb-3 text-2xl font-bold text-gray-900 sm:text-3xl lg:text-4xl">{move.title}</h3>
            <p className="flex items-start gap-2 text-base text-gray-600 sm:text-lg">
              <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-orange-500" />
              <span>{move.subtitle}</span>
            </p>
          </div>

          {move.supportingTips.length > 0 && (
            <div className="mb-6 flex flex-wrap gap-3">
              {move.supportingTips.map((tag, index) => (
                <div
                  key={`${tag}-${index}`}
                  className="flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-4 py-2 transition-all duration-300 hover:scale-105 hover:bg-green-100 hover:shadow-md"
                  style={{
                    animation: `popIn 0.5s ease-out ${index * 0.1}s both`,
                  }}
                >
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-800">{tag}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-4 sm:flex-row">
            <button
              type="button"
              onClick={handlePrimaryAction}
              className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-green-600 to-green-500 px-8 py-4 text-base font-semibold text-white transition-all duration-300 hover:shadow-2xl sm:text-lg"
              style={{
                boxShadow: "0 10px 25px -5px rgba(16, 185, 129, 0.4)",
              }}
            >
              <div className="absolute inset-0 scale-0 transform rounded-xl bg-white/20 transition-transform duration-500 group-hover:scale-100" />

              <span className="relative flex items-center justify-center gap-2">
                {move.ctaLabel}
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </span>
            </button>

            <button
              type="button"
              onClick={() => setWhyOpen(true)}
              className="rounded-xl border-2 border-gray-300 bg-white px-8 py-4 text-base font-semibold text-gray-700 transition-all duration-300 hover:border-gray-400 hover:bg-gray-50 hover:shadow-lg sm:text-lg"
            >
              Why this?
            </button>
          </div>

          <div className="absolute right-4 top-4 opacity-50">
            <Sparkles className="h-6 w-6 animate-pulse text-yellow-400" />
          </div>
        </div>
      </div>

      <Dialog open={whyOpen} onOpenChange={setWhyOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Why we suggested this</DialogTitle>
            <DialogDescription className="sr-only">
              Personalised explanation based on your profile and recent activity.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-sm text-gray-700">
            <p className="leading-relaxed">{move.rationale}</p>
            {move.supportingTips.length > 0 && (
              <div>
                <p className="mb-2 font-medium text-gray-900">Also worth keeping in mind</p>
                <ul className="list-inside list-disc space-y-1 text-gray-600">
                  {move.supportingTips.map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <style>{`
        @keyframes popIn {
          0% {
            opacity: 0;
            transform: scale(0.8) translateY(10px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
