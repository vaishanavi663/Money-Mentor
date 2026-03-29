import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Bot, User, Mic, TrendingUp, PiggyBank, AlertTriangle, Volume2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useReplyLanguage } from '../context/ReplyLanguageContext';
import { useUserProfile } from '../context/UserProfileContext';
import { resolveReplyLanguagePreference } from '../lib/voiceLanguage';
import { usePlan } from '../../hooks/usePlan';
import { useChatVoice } from '../../hooks/useChatVoice';
import { api, type AiChatTurn } from '../lib/api';

const FREE_AI_MSGS_PER_DAY = 10;

function userMessageCountKey(email: string) {
  const day = new Date().toISOString().slice(0, 10);
  return `mm_ai_chat_user_msgs_${email || 'anon'}_${day}`;
}

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  suggestions?: string[];
  timestamp: Date;
}

export function AIChat() {
  const { profile } = useUserProfile();
  const { preference: replyLanguagePreference } = useReplyLanguage();
  const { isPro, showUpgradeModal } = usePlan();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'ai',
      content: `Namaste ${profile.name || ''}! 👋 I can see your ${profile.savingsRate.toFixed(1)}% savings rate and ${profile.riskProfile} risk style. What would you like to optimize first?`,
      suggestions: ['Show my savings plan', 'Investment tips', 'Save tax'],
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [userMsgsToday, setUserMsgsToday] = useState(0);
  const [conversationHistory, setConversationHistory] = useState<AiChatTurn[]>([]);
  const [sendError, setSendError] = useState<string | null>(null);
  const historyRef = useRef<AiChatTurn[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    historyRef.current = conversationHistory;
  }, [conversationHistory]);

  const readStoredUserCount = useCallback(() => {
    try {
      const raw = localStorage.getItem(userMessageCountKey(profile.email));
      const n = parseInt(raw || '0', 10);
      return Number.isFinite(n) ? n : 0;
    } catch {
      return 0;
    }
  }, [profile.email]);

  useEffect(() => {
    setUserMsgsToday(readStoredUserCount());
  }, [readStoredUserCount]);

  const canSendVoiceOrText = useCallback(() => {
    if (isPro) return true;
    return readStoredUserCount() < FREE_AI_MSGS_PER_DAY;
  }, [isPro, readStoredUserCount]);

  const appendUserMessage = useCallback(
    (text: string) => {
      let nextUserCount = 0;
      if (!isPro) {
        const used = readStoredUserCount();
        if (used >= FREE_AI_MSGS_PER_DAY) return;
        nextUserCount = used + 1;
      }
      const userMessage: Message = {
        id: Date.now().toString(),
        type: 'user',
        content: text,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);
      if (!isPro && nextUserCount > 0) {
        try {
          localStorage.setItem(userMessageCountKey(profile.email), String(nextUserCount));
        } catch {
          /* ignore */
        }
        setUserMsgsToday(nextUserCount);
      }
    },
    [isPro, profile.email, readStoredUserCount],
  );

  const appendAiMessage = useCallback((text: string) => {
    const aiMessage: Message = {
      id: (Date.now() + 1).toString(),
      type: 'ai',
      content: text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, aiMessage]);
  }, []);

  const voiceChat = useChatVoice({
    historyRef,
    setConversationHistory,
    canSendMessage: canSendVoiceOrText,
    onBlocked: () =>
      showUpgradeModal(
        'Unlimited AI chat',
        'Pro removes the daily message cap so you can keep asking MoneyMentor anything, anytime.',
      ),
    onUserMessage: appendUserMessage,
    onAiMessage: appendAiMessage,
    onError: (msg) => setSendError(msg),
    onRequestStart: () => setIsTyping(true),
    onRequestEnd: () => setIsTyping(false),
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text) return;

    let nextUserCount = 0;
    if (!isPro) {
      const used = readStoredUserCount();
      if (used >= FREE_AI_MSGS_PER_DAY) {
        return;
      }
      nextUserCount = used + 1;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setSendError(null);
    if (!isPro && nextUserCount > 0) {
      try {
        localStorage.setItem(userMessageCountKey(profile.email), String(nextUserCount));
      } catch {
        /* ignore */
      }
      setUserMsgsToday(nextUserCount);
    }
    setIsTyping(true);

    const userTurn: AiChatTurn = { role: 'user', parts: [{ text }] };
    const withUser = [...historyRef.current, userTurn];
    historyRef.current = withUser;
    setConversationHistory(withUser);

    try {
      const chatBody: {
        message: string;
        conversationHistory: AiChatTurn[];
        voiceReplyLanguage?: string;
      } = {
        message: text,
        conversationHistory: withUser,
      };
      if (replyLanguagePreference !== 'auto') {
        chatBody.voiceReplyLanguage = resolveReplyLanguagePreference(replyLanguagePreference, text);
      }
      const { reply } = await api.aiChat(chatBody);
      const modelTurn: AiChatTurn = { role: 'model', parts: [{ text: reply }] };
      const withModel = [...withUser, modelTurn];
      historyRef.current = withModel;
      setConversationHistory(withModel);

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: reply,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch {
      historyRef.current = withUser.slice(0, -1);
      setConversationHistory(historyRef.current);
      setSendError('AI unavailable. Please try again.');
    } finally {
      setIsTyping(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    void handleSend(suggestion);
  };

  const atFreeLimit = !isPro && userMsgsToday >= FREE_AI_MSGS_PER_DAY;

  return (
    <div className="relative z-10 flex flex-col h-full bg-white/45 backdrop-blur-[2px]">
      {/* Chat Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-blue-600 rounded-full flex items-center justify-center">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="font-semibold">MoneyMentor AI</h2>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-xs text-gray-500">Online • Personalized</span>
            </div>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {atFreeLimit && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            You&apos;ve used {FREE_AI_MSGS_PER_DAY}/{FREE_AI_MSGS_PER_DAY} free messages today. Upgrade to Pro for
            unlimited.{' '}
            <button
              type="button"
              className="font-semibold underline"
              onClick={() =>
                showUpgradeModal(
                  'Unlimited AI chat',
                  'Pro removes the daily message cap so you can keep asking MoneyMentor anything, anytime.',
                )
              }
            >
              Upgrade to Pro
            </button>
          </div>
        )}
        {!isPro && !atFreeLimit && (
          <p className="text-xs text-gray-500">
            Free plan: {userMsgsToday}/{FREE_AI_MSGS_PER_DAY} messages today
          </p>
        )}
        {sendError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
            {sendError}{' '}
            <button type="button" className="font-semibold underline" onClick={() => setSendError(null)}>
              Dismiss
            </button>
          </div>
        )}
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                message.type === 'ai'
                  ? 'bg-gradient-to-br from-green-600 to-blue-600'
                  : 'bg-gray-600'
              }`}
            >
              {message.type === 'ai' ? (
                <Bot className="w-4 h-4 text-white" />
              ) : (
                <User className="w-4 h-4 text-white" />
              )}
            </div>

            <div className={`flex-1 ${message.type === 'user' ? 'flex justify-end' : ''}`}>
              <div
                className={`inline-block max-w-xl rounded-2xl px-4 py-3 ${
                  message.type === 'ai'
                    ? 'bg-white border border-gray-200'
                    : 'bg-gradient-to-r from-green-600 to-blue-600 text-white'
                }`}
              >
                <p className="text-sm leading-relaxed">{message.content}</p>
                <p
                  className={`text-xs mt-1 ${
                    message.type === 'ai' ? 'text-gray-500' : 'text-white/70'
                  }`}
                >
                  {message.timestamp.toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>

              {message.suggestions && message.type === 'ai' && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {message.suggestions.map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="px-3 py-1.5 bg-white border border-gray-200 rounded-full text-xs hover:bg-gray-50 transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-600 to-blue-600 flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      <div className="px-6 py-3 bg-white border-t border-gray-200">
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors whitespace-nowrap">
            <PiggyBank className="w-4 h-4" />
            <span className="text-sm">Invest ₹5000</span>
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors whitespace-nowrap">
            <TrendingUp className="w-4 h-4" />
            <span className="text-sm">Save Tax</span>
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 transition-colors whitespace-nowrap">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm">Emergency Fund</span>
          </button>
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 bg-white px-6 py-4">
        {!isPro && (
          <p className="mb-3 text-xs text-gray-600">
            <button
              type="button"
              className="font-semibold text-green-700 underline"
              onClick={() =>
                showUpgradeModal(
                  'Voice in AI Chat',
                  'Speak hands-free: mic uses the same smart replies as before (English / Hindi, read-aloud). Included with Pro.',
                )
              }
            >
              Upgrade to Pro
            </button>{' '}
            for voice input in chat.
          </p>
        )}
        {isPro && voiceChat.permissionState === 'denied' && (
          <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-900">
            Microphone blocked — allow this site in browser settings (Chrome: Site settings → Microphone).
          </div>
        )}
        {isPro && voiceChat.voiceError && (
          <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
            <span>{voiceChat.voiceError}</span>
            <button
              type="button"
              className="font-semibold underline"
              onClick={() => {
                voiceChat.setVoiceError('');
                void voiceChat.handleMicClick();
              }}
            >
              Try again
            </button>
          </div>
        )}

        {isPro && voiceChat.isListening && (
          <div className="mb-3 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50/80 px-4 py-3">
            <div className="flex h-10 items-end gap-1">
              {[...Array(5)].map((_, i) => (
                <motion.div
                  key={i}
                  className="w-1.5 rounded-full bg-gradient-to-t from-green-600 to-blue-600"
                  animate={{ height: ['10px', '32px', '10px'] }}
                  transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.1 }}
                />
              ))}
            </div>
            <span className="text-sm text-gray-700">Listening… speak now</span>
          </div>
        )}

        {isPro && voiceChat.isSpeaking && (
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-blue-200 bg-blue-50/80 px-4 py-3">
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <Volume2 className="h-4 w-4 animate-pulse text-blue-600" />
              Speaking reply…
            </div>
            <button
              type="button"
              onClick={voiceChat.stopSpeaking}
              className="rounded-full bg-gray-200 px-3 py-1 text-xs font-medium text-gray-800 hover:bg-gray-300"
            >
              Stop
            </button>
          </div>
        )}

        {isPro && (
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="text-xs text-gray-500">Speech recognition:</span>
            <button
              type="button"
              onClick={() => voiceChat.setInputSpeechLang('en-IN')}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                voiceChat.inputSpeechLang === 'en-IN'
                  ? 'bg-green-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              English
            </button>
            <button
              type="button"
              onClick={() => voiceChat.setInputSpeechLang('hi-IN')}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                voiceChat.inputSpeechLang === 'hi-IN'
                  ? 'bg-green-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              हिंदी
            </button>
            <span className="text-xs text-gray-400">Replies match the language you speak</span>
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            type="button"
            title={isPro ? 'Speak your question (voice)' : 'Voice — Pro feature'}
            onClick={() => {
              if (!isPro) {
                showUpgradeModal(
                  'Voice in AI Chat',
                  'Speak hands-free with language-aware replies and read-aloud. Included with Pro.',
                );
                return;
              }
              void voiceChat.handleMicClick();
            }}
            disabled={atFreeLimit || (isPro && (voiceChat.isListening || isTyping))}
            className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              isPro && voiceChat.isListening
                ? 'bg-red-100 text-red-600 ring-2 ring-red-300'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Mic className="h-5 w-5" />
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void handleSend()}
            placeholder="Type your message… (Hindi / English)"
            disabled={atFreeLimit}
            className="flex-1 rounded-full bg-gray-100 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:cursor-not-allowed disabled:opacity-60"
          />
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={atFreeLimit}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-green-600 to-blue-600 transition-all hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send className="h-5 w-5 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
