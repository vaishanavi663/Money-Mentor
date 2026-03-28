import { useState } from "react";
import { Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { useUserProfile } from "../context/UserProfileContext";
import { api } from "../lib/api";
import { toast } from "sonner";

export function UpgradeModal() {
  const { upgradeModal, closeUpgradeModal, mergePlanFromAuthUser } = useUserProfile();
  const [pending, setPending] = useState(false);
  const open = upgradeModal != null;

  const handleUpgrade = async () => {
    setPending(true);
    try {
      const { user } = await api.upgradeToPro();
      mergePlanFromAuthUser(user);
      toast.success("You are on Pro — all features unlocked.");
      closeUpgradeModal();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upgrade failed");
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && closeUpgradeModal()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-green-600 to-blue-600">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <DialogTitle className="text-center text-xl">
            Unlock {upgradeModal?.featureName ?? "Pro"}
          </DialogTitle>
          <DialogDescription className="text-center text-base text-gray-600">
            {upgradeModal?.description ??
              "Pro includes Future Simulator, Voice Assistant, Bad Decision Detector, Impact Feed, unlimited AI chat messages, full transaction history, tax tip PDF export, and Android SMS auto-import."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 px-1">
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-center">
            <p className="text-sm text-emerald-800">Money Mentor Pro</p>
            <p className="text-3xl font-bold text-emerald-900">
              ₹99<span className="text-lg font-normal text-emerald-700">/month</span>
            </p>
          </div>
          <button
            type="button"
            disabled={pending}
            onClick={() => void handleUpgrade()}
            className="w-full rounded-xl bg-gradient-to-r from-green-600 to-blue-600 py-3 font-medium text-white transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {pending ? "Upgrading…" : "Upgrade to Pro"}
          </button>
          <button
            type="button"
            onClick={closeUpgradeModal}
            className="w-full text-sm text-gray-600 hover:text-gray-900"
          >
            Maybe later
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
