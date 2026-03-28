import { useCallback, useMemo } from "react";
import { useUserProfile } from "../app/context/UserProfileContext";

export function usePlan() {
  const { profile, showUpgradeModal: openUpgradeModal, closeUpgradeModal } = useUserProfile();

  const isPro = profile.plan === "pro";

  const showUpgradeModal = useCallback(
    (featureName: string, description?: string) => {
      openUpgradeModal({ featureName, description });
    },
    [openUpgradeModal],
  );

  return useMemo(
    () => ({ isPro, showUpgradeModal, closeUpgradeModal }),
    [isPro, showUpgradeModal, closeUpgradeModal],
  );
}
