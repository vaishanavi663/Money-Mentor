import { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, X, Volume2, AlertTriangle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { usePlan } from '../../hooks/usePlan';
import { api, type AiChatTurn } from '../lib/api';

declare global {
  interface Window {
    SpeechRecognition: new () => any;
    webkitSpeechRecognition: new () => any;
  }
}

/** TTS language from reply script: English text → en-IN, Devanagari-heavy → hi-IN. */
function synthesisLangForReply(text: string): string {
  const devanagari = (text.match(/[\u0900-\u097F]/g) ?? []).length;
  const latin = (text.match(/[a-zA-Z]/g) ?? []).length;
  if (devanagari > latin) return 'hi-IN';
  return 'en-IN';
}

export function VoiceAssistant() {
  const { isPro } = usePlan();
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [permissionState, setPermissionState] = useState<'unknown' | 'granted' | 'denied'>('unknown');
  const [aiResponse, setAiResponse] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<AiChatTurn[]>([]);
  const [errorMessage, setErrorMessage] = useState('');

  const historyRef = useRef<AiChatTurn[]>([]);
  const recognitionRef = useRef<any>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    historyRef.current = conversationHistory;
  }, [conversationHistory]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        if (cancelled) return;
        if (result.state === 'granted') setPermissionState('granted');
        else if (result.state === 'denied') setPermissionState('denied');
        else setPermissionState('unknown');
        result.addEventListener('change', () => {
          if (result.state === 'granted') setPermissionState('granted');
          else if (result.state === 'denied') setPermissionState('denied');
          else setPermissionState('unknown');
        });
      } catch {
        if (!cancelled) setPermissionState('unknown');
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

  const speakResponse = useCallback((text: string) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = synthesisLangForReply(text);
    utterance.rate = 0.9;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }, []);

  const sendToAI = useCallback(
    async (userMessage: string) => {
      setIsThinking(true);
      setAiResponse('');
      setErrorMessage('');

      const userTurn: AiChatTurn = { role: 'user', parts: [{ text: userMessage }] };
      const withUser = [...historyRef.current, userTurn];
      historyRef.current = withUser;
      setConversationHistory(withUser);

      try {
        const { reply } = await api.aiChat({
          message: userMessage,
          conversationHistory: withUser,
        });
        const modelTurn: AiChatTurn = { role: 'model', parts: [{ text: reply }] };
        const withModel = [...withUser, modelTurn];
        historyRef.current = withModel;
        setConversationHistory(withModel);
        setAiResponse(reply);
        setIsThinking(false);
        speakResponse(reply);
      } catch {
        historyRef.current = withUser.slice(0, -1);
        setConversationHistory(historyRef.current);
        setIsThinking(false);
        setErrorMessage('AI unavailable. Please try again.');
      }
    },
    [speakResponse],
  );

  const startListening = useCallback(() => {
    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      setErrorMessage('Voice not supported in this browser. Please use Chrome.');
      return;
    }

    setErrorMessage('');
    stopRecognition();

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'hi-IN';

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (event: any) => {
      const text = String(event.results[0][0].transcript || '').trim();
      setTranscript(text);
      setIsListening(false);
      if (text) void sendToAI(text);
    };

    recognition.onerror = (event: any) => {
      setIsListening(false);
      if (event.error === 'not-allowed') {
        setPermissionState('denied');
      } else if (event.error === 'aborted') {
        /* intentional stop */
      } else {
        setErrorMessage('Could not hear you. Try again.');
      }
    };

    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      setErrorMessage('Could not hear you. Try again.');
      setIsListening(false);
    }
  }, [sendToAI, stopRecognition]);

  const handleMicClick = async () => {
    if (isOpen) {
      setIsOpen(false);
      return;
    }

    if (permissionState === 'denied') {
      setIsOpen(true);
      return;
    }

    if (permissionState === 'unknown') {
      setIsOpen(true);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;
        stream.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
        setPermissionState('granted');
        startListening();
      } catch {
        setPermissionState('denied');
        setErrorMessage('Microphone access denied');
      }
      return;
    }

    setIsOpen(true);
    startListening();
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  useEffect(() => {
    if (isOpen) return;
    window.speechSynthesis.cancel();
    stopRecognition();
    setIsListening(false);
    setIsThinking(false);
    setIsSpeaking(false);
    setErrorMessage('');
    setTranscript('');
  }, [isOpen, stopRecognition]);

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
      stopRecognition();
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [stopRecognition]);

  if (!isPro) {
    return null;
  }

  const renderCenter = () => {
    if (permissionState === 'denied') {
      return (
        <div className="text-center px-2">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4 mx-auto">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <p className="text-lg font-medium text-gray-900 mb-2">Microphone access blocked</p>
          <p className="text-sm text-gray-600 mb-3">
            Please allow microphone in your browser settings and refresh
          </p>
          <p className="text-xs text-gray-500">
            Chrome: Settings → Privacy and security → Site settings → Microphone → allow this site.
          </p>
        </div>
      );
    }

    if (isListening) {
      return (
        <>
          <div className="flex items-end gap-1 h-16">
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                className="w-2 bg-gradient-to-t from-green-600 to-blue-600 rounded-full"
                animate={{
                  height: ['20px', '60px', '20px'],
                }}
                transition={{
                  duration: 0.8,
                  repeat: Infinity,
                  delay: i * 0.1,
                }}
              />
            ))}
          </div>
          <p className="text-sm text-gray-600 mt-4">Bol rahe ho... (Speaking...)</p>
        </>
      );
    }

    if (isThinking) {
      return (
        <>
          <Loader2 className="w-12 h-12 text-green-600 animate-spin mx-auto mb-4" />
          <p className="text-sm text-gray-600">Soch raha hoon... (Thinking...)</p>
        </>
      );
    }

    if (isSpeaking) {
      return (
        <>
          <motion.div
            className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4 mx-auto"
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 0.9, repeat: Infinity }}
          >
            <Volume2 className="w-8 h-8 text-blue-600" />
          </motion.div>
          {aiResponse ? (
            <p className="text-sm text-gray-800 text-center leading-relaxed mb-3">{aiResponse}</p>
          ) : null}
          <p className="text-sm text-gray-600 mb-3">Bol raha hoon... (Speaking...)</p>
          <button
            type="button"
            onClick={stopSpeaking}
            className="px-4 py-2 rounded-full bg-gray-200 text-gray-800 text-sm hover:bg-gray-300 transition-colors"
          >
            Stop
          </button>
        </>
      );
    }

    if (errorMessage) {
      return (
        <div className="text-center px-2">
          <p className="text-sm text-red-600 mb-4">{errorMessage}</p>
          <button
            type="button"
            onClick={() => {
              setErrorMessage('');
              startListening();
            }}
            className="px-4 py-2 rounded-full bg-gradient-to-r from-green-600 to-blue-600 text-white text-sm hover:opacity-90 transition-opacity"
          >
            Try again
          </button>
        </div>
      );
    }

    if (transcript && !isThinking && !isSpeaking) {
      return (
        <div className="text-center px-2 w-full">
          <p className="text-sm text-gray-700 mb-2">
            Aapne kaha: <span className="font-medium">{transcript}</span>
          </p>
          {aiResponse ? (
            <p className="text-sm text-gray-600 leading-relaxed mb-4">{aiResponse}</p>
          ) : null}
          <button
            type="button"
            onClick={() => startListening()}
            className="px-4 py-2 rounded-full bg-gradient-to-r from-green-600 to-blue-600 text-white text-sm hover:opacity-90 transition-opacity"
          >
            Ask again
          </button>
        </div>
      );
    }

    return (
      <div className="text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 mx-auto">
          <Mic className="w-8 h-8 text-gray-600" />
        </div>
        <p className="text-gray-600">Click mic to start</p>
        <p className="text-xs text-gray-500 mt-2">Hindi ya English mein boliye</p>
      </div>
    );
  };

  const statusBar = (() => {
    if (isListening) {
      return (
        <>
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-sm text-gray-600">Sun raha hoon... (Listening)</span>
        </>
      );
    }
    if (isThinking) {
      return (
        <>
          <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-sm text-gray-600">Soch raha hoon... (Thinking)</span>
        </>
      );
    }
    if (isSpeaking) {
      return (
        <>
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          <span className="text-sm text-gray-600">Bol raha hoon... (Speaking)</span>
        </>
      );
    }
    if (errorMessage) {
      return (
        <>
          <div className="w-2 h-2 rounded-full bg-red-500" />
          <span className="text-sm text-gray-600">Error — try again</span>
        </>
      );
    }
    return (
      <>
        <div className="w-2 h-2 rounded-full bg-gray-400" />
        <span className="text-sm text-gray-600">Bolne ke liye mic dabao</span>
      </>
    );
  })();

  return (
    <>
      <motion.button
        onClick={handleMicClick}
        className="fixed bottom-8 right-8 w-16 h-16 bg-gradient-to-br from-green-600 to-blue-600 rounded-full shadow-lg flex items-center justify-center hover:shadow-2xl transition-shadow z-50"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        <Mic className="w-7 h-7 text-white" />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="fixed bottom-28 right-8 w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 overflow-hidden"
          >
            <div className="bg-gradient-to-r from-green-600 to-blue-600 p-4 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <Volume2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Voice Assistant</h3>
                    <p className="text-xs opacity-80">Speak in Hindi or English</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-8 flex flex-col items-center justify-center min-h-[200px]">{renderCenter()}</div>

            <div className="border-t border-gray-200 p-4 bg-gray-50">
              <div className="flex items-center justify-center gap-2">{statusBar}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
