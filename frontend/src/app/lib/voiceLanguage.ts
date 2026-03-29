/** Infer how the user spoke so the model and TTS match (English / Hindi / Roman Hinglish). */
export function inferVoiceReplyLanguage(text: string): "en" | "hi" | "hinglish" {
  const trimmed = text.trim();
  if (!trimmed) return "en";
  const devanagari = (trimmed.match(/[\u0900-\u097F]/g) ?? []).length;
  const latin = (trimmed.match(/[a-zA-Z]/g) ?? []).length;
  if (devanagari >= 2) return "hi";
  const lower = trimmed.toLowerCase();
  const hinglishPattern =
    /\b(mera|meri|mere|merko|mujhe|aap|aapka|aapke|kya|kaise|kaisa|kyun|kyo|kitna|kitni|nahi|nahin|haan|hao|bachat|kharche|kamai|paisa|paise|rupaye|nivesh|mein|main|hum|tera|teri|chahiye|batao|samjhao|karu|karna|yeh|ye|wahi|matlab)\b/;
  if (latin > 0 && hinglishPattern.test(lower) && devanagari === 0) return "hinglish";
  return "en";
}

export function ttsLangForVoice(inferred: "en" | "hi" | "hinglish", reply: string): string {
  if (inferred === "hi") return "hi-IN";
  if (inferred === "hinglish") {
    const dev = (reply.match(/[\u0900-\u097F]/g) ?? []).length;
    const lat = (reply.match(/[a-zA-Z]/g) ?? []).length;
    return dev > lat ? "hi-IN" : "en-IN";
  }
  return "en-IN";
}

export function refineReplyLangForSpeechLocale(
  userMessage: string,
  inputSpeechLang: "en-IN" | "hi-IN",
  initial: "en" | "hi" | "hinglish",
): "en" | "hi" | "hinglish" {
  let replyLang = initial;
  if (inputSpeechLang === "hi-IN" && replyLang === "en" && /[\u0900-\u097F]/.test(userMessage)) {
    replyLang = "hi";
  }
  if (inputSpeechLang === "hi-IN" && replyLang === "en") {
    const lower = userMessage.toLowerCase();
    if (
      /\b(mera|meri|mere|mujhe|kya|kaise|hai|nahi|paisa|bachat)\b/i.test(lower) &&
      userMessage.length < 120
    ) {
      replyLang = "hinglish";
    }
  }
  return replyLang;
}
