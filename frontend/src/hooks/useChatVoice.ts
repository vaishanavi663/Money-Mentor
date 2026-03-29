import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type MutableRefObject,
  type Dispatch,
  type SetStateAction,
} from "react";
import { api, type AiChatTurn } from "@/app/lib/api";
import {
  inferVoiceReplyLanguage,
  refineReplyLangForSpeechLocale,
  ttsLangForVoice,
} from "@/app/lib/voiceLanguage";

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

export type VoicePermissionState = "unknown" | "granted" | "denied";

export interface UseChatVoiceParams {
  historyRef: MutableRefObject<AiChatTurn[]>;
  setConversationHistory: Dispatch<SetStateAction<AiChatTurn[]>>;
  canSendMessage: () => boolean;
  onBlocked: () => void;
  onUserMessage: (text: string) => void;
  onAiMessage: (text: string) => void;
  onError: (msg: string) => void;
  onRequestStart: () => void;
  onRequestEnd: () => void;
}

export function useChatVoice({
  historyRef,
  setConversationHistory,
  canSendMessage,
  onBlocked,
  onUserMessage,
  onAiMessage,
  onError,
  onRequestStart,
  onRequestEnd,
}: UseChatVoiceParams) {
  const [isListening, setIsListening] = useState(false);
  const [permissionState, setPermissionState] = useState<VoicePermissionState>("unknown");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const [lastTranscript, setLastTranscript] = useState("");
  const [inputSpeechLang, setInputSpeechLang] = useState<"en-IN" | "hi-IN">("en-IN");

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const result = await navigator.permissions.query({ name: "microphone" as PermissionName });
        if (cancelled) return;
        if (result.state === "granted") setPermissionState("granted");
        else if (result.state === "denied") setPermissionState("denied");
        else setPermissionState("unknown");
        result.addEventListener("change", () => {
          if (result.state === "granted") setPermissionState("granted");
          else if (result.state === "denied") setPermissionState("denied");
          else setPermissionState("unknown");
        });
      } catch {
        if (!cancelled) setPermissionState("unknown");
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  const stopRecognition = useCallback(() => {
    const r = recognitionRef.current;
    if (!r) return;
    try {
      r.abort();
    } catch {
      try {
        r.stop();
      } catch {
        /* ignore */
      }
    }
    recognitionRef.current = null;
  }, []);

  const speakResponse = useCallback((text: string, replyLang: "en" | "hi" | "hinglish") => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = ttsLangForVoice(replyLang, text);
    utterance.rate = 0.9;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }, []);

  const sendVoiceToAI = useCallback(
    async (userMessage: string) => {
      if (!canSendMessage()) {
        onBlocked();
        return;
      }

      setVoiceError("");
      setLastTranscript(userMessage);
      onUserMessage(userMessage);
      onRequestStart();

      const userTurn: AiChatTurn = { role: "user", parts: [{ text: userMessage }] };
      const withUser = [...historyRef.current, userTurn];
      historyRef.current = withUser;
      setConversationHistory(withUser);

      try {
        let replyLang = inferVoiceReplyLanguage(userMessage);
        replyLang = refineReplyLangForSpeechLocale(userMessage, inputSpeechLang, replyLang);

        const { reply } = await api.aiChat({
          message: userMessage,
          conversationHistory: withUser,
          voiceMode: true,
          voiceReplyLanguage: replyLang,
        });
        const modelTurn: AiChatTurn = { role: "model", parts: [{ text: reply }] };
        const withModel = [...withUser, modelTurn];
        historyRef.current = withModel;
        setConversationHistory(withModel);
        onAiMessage(reply);
        speakResponse(reply, replyLang);
      } catch {
        historyRef.current = withUser.slice(0, -1);
        setConversationHistory(historyRef.current);
        onError("AI unavailable. Please try again.");
      } finally {
        onRequestEnd();
      }
    },
    [
      canSendMessage,
      historyRef,
      inputSpeechLang,
      onAiMessage,
      onBlocked,
      onError,
      onRequestEnd,
      onRequestStart,
      onUserMessage,
      setConversationHistory,
      speakResponse,
    ],
  );

  const startListening = useCallback(() => {
    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      setVoiceError("Voice not supported in this browser. Please use Chrome.");
      return;
    }

    setVoiceError("");
    stopRecognition();

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = inputSpeechLang;

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const text = String(event.results[0][0].transcript || "").trim();
      setIsListening(false);
      if (text) void sendVoiceToAI(text);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      setIsListening(false);
      if (event.error === "not-allowed") {
        setPermissionState("denied");
      } else if (event.error === "aborted") {
        /* intentional */
      } else {
        setVoiceError("Could not hear you. Try again.");
      }
    };

    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      setVoiceError("Could not hear you. Try again.");
      setIsListening(false);
    }
  }, [inputSpeechLang, sendVoiceToAI, stopRecognition]);

  const handleMicClick = useCallback(async () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);

    if (permissionState === "denied") {
      return;
    }

    if (permissionState === "unknown") {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;
        stream.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
        setPermissionState("granted");
        startListening();
      } catch {
        setPermissionState("denied");
        setVoiceError("Microphone access denied");
      }
      return;
    }

    startListening();
  }, [permissionState, startListening]);

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
      stopRecognition();
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [stopRecognition]);

  return {
    isListening,
    isSpeaking,
    permissionState,
    voiceError,
    setVoiceError,
    lastTranscript,
    inputSpeechLang,
    setInputSpeechLang,
    handleMicClick,
    startListening,
    stopSpeaking,
    stopRecognition,
  };
}
