import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { ReplyLanguagePreference } from "../lib/voiceLanguage";

const STORAGE_KEY = "moneymentor-reply-language";

function readStoredPreference(): ReplyLanguagePreference {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s === "en" || s === "hi" || s === "hinglish" || s === "auto") {
      return s;
    }
  } catch {
    /* ignore */
  }
  return "auto";
}

type ReplyLanguageContextValue = {
  preference: ReplyLanguagePreference;
  setPreference: (p: ReplyLanguagePreference) => void;
};

const ReplyLanguageContext = createContext<ReplyLanguageContextValue | null>(null);

export function ReplyLanguageProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ReplyLanguagePreference>(readStoredPreference);

  const setPreference = useCallback((p: ReplyLanguagePreference) => {
    setPreferenceState(p);
    try {
      localStorage.setItem(STORAGE_KEY, p);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(
    () => ({ preference, setPreference }),
    [preference, setPreference],
  );

  return (
    <ReplyLanguageContext.Provider value={value}>{children}</ReplyLanguageContext.Provider>
  );
}

export function useReplyLanguage() {
  const ctx = useContext(ReplyLanguageContext);
  if (!ctx) {
    throw new Error("useReplyLanguage must be used within ReplyLanguageProvider");
  }
  return ctx;
}
