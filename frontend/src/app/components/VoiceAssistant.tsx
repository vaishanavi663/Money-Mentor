import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, AlertCircle } from 'lucide-react';
import { interpretCommand, executeActions } from '../lib/voiceCommands';

// Declare global types for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface VoiceAssistantProps {
  onNavigate?: (page: string) => void;
  onAddTransaction?: (amount: number, category: string, mode: 'credit' | 'debit') => void;
  onType?: (text: string) => void;
  onScroll?: (direction: string) => void;
  onSubNavigate?: (detail: { section: string; subSection?: string }) => void;
  onLogout?: () => void;
  onUpgrade?: () => void;
}

export function VoiceAssistant({ onNavigate, onAddTransaction, onType, onScroll, onSubNavigate, onLogout, onUpgrade }: VoiceAssistantProps) {
  // State for voice recognition
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');
  const [isSupported, setIsSupported] = useState(true);
  const [debugAction, setDebugAction] = useState('');

  // Refs
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const transcriptRef = useRef<string>('');

  // Initialize speech recognition
  useEffect(() => {
    // Check if browser supports speech recognition
    if (typeof window === 'undefined') return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      setError('Speech recognition is not supported in this browser');
      return;
    }

    // Create recognition instance
    const recognition = new SpeechRecognition();
    recognition.continuous = false; // listen for single command only
    recognition.interimResults = true; // Show live transcript
    recognition.lang = 'en-US'; // Set language

    // Event handlers
    recognition.onstart = () => {
      setIsListening(true);
      setError('');
      setTranscript('Listening for commands...');
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interimTranscript = '';

      // Process all results
      for (let i = event.results.length - 1; i >= 0; i--) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript = result[0].transcript.trim();
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      const currentTranscript = finalTranscript || interimTranscript;
      setTranscript(currentTranscript);
      transcriptRef.current = currentTranscript;

      // process command directly
      if (finalTranscript) {
        const command = finalTranscript;
        const result = interpretCommand(command);
        setDebugAction(JSON.stringify(result.actions));
        executeActions(result.actions, onNavigate, onAddTransaction, onType, onScroll, onSubNavigate, onLogout, onUpgrade);

        if (result.actions.length > 0) {
          setError('');
          setTranscript(`Executed ${result.actions.length} action(s)`);
        } else {
          setError(`Command not recognized: "${command}"`);
        }
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      setIsListening(false);
      setError(`Speech recognition error: ${event.error}`);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    // Cleanup
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  // Toggle listening
  const toggleListening = () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      setError('');
      recognitionRef.current.start();
    }
  };

  // Don't render if not supported
  if (!isSupported) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <div className="bg-red-100 border border-red-300 rounded-lg p-3 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <span className="text-sm text-red-700">Voice commands not supported</span>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Voice Button */}
      <button
        onClick={toggleListening}
        className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg ${
          isListening
            ? 'bg-red-500 hover:bg-red-600 animate-pulse'
            : 'bg-blue-500 hover:bg-blue-600'
        }`}
        title={isListening ? 'Stop listening' : 'Start voice commands'}
      >
        {isListening ? (
          <MicOff className="w-6 h-6 text-white" />
        ) : (
          <Mic className="w-6 h-6 text-white" />
        )}
      </button>

      {/* Status and Transcript Display */}
      {(isListening || transcript || error) && (
        <div className="mt-2 bg-white border border-gray-200 rounded-lg p-3 shadow-lg min-w-64 max-w-sm">
          {/* Status */}
          <div className="flex items-center gap-2 mb-2">
            {isListening && (
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            )}
            <span className="text-sm font-medium text-gray-700">
              {isListening ? 'Listening...' : 'Voice Assistant'}
            </span>
          </div>

          {/* Transcript */}
          {transcript && (
            <div className="text-sm text-gray-600 mb-2">
              <strong>You said:</strong> "{transcript}"
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="text-sm text-red-600">
              <strong>Error:</strong> {error}
            </div>
          )}

          {/* Help text */}
          {!isListening && !transcript && !error && (
            <div className="text-xs text-gray-500">
              Try: "login", "get started", "go to dashboard", "add transaction 500 food"
            </div>
          )}

          {/* Debug action output */}
          {debugAction && (
            <div className="text-xs text-gray-500 mt-2 break-words">
              <strong>Last action(s):</strong> {debugAction}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
