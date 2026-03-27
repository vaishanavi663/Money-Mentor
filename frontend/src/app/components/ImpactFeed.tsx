import { useState } from 'react';
import { Brain, TrendingUp, TrendingDown, Minus, ChevronRight, X, Clock } from 'lucide-react';

interface ImpactInsight {
  id: string;
  type: 'positive' | 'neutral' | 'caution' | 'negative';
  action: string;
  impact: string;
  tag: string;
  timeAgo: string;
  details?: string;
  progressChange?: number; // percentage change in goal progress
}

export function ImpactFeed() {
  const [isOpen, setIsOpen] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const insights: ImpactInsight[] = [
    {
      id: '1',
      type: 'positive',
      action: '₹500 saved on groceries',
      impact: 'Moved your Goa trip 1 day closer! 🎉',
      tag: 'Smart Saving',
      timeAgo: 'Just now',
      details: 'By shopping smart and using discounts, you saved ₹500. Keep this up for better results!',
      progressChange: 2,
    },
    {
      id: '2',
      type: 'caution',
      action: '₹2,000 spent on dining out',
      impact: 'Delays your laptop goal by 3 days',
      tag: 'Spending Pattern',
      timeAgo: '2h ago',
      details: 'You\'ve spent ₹6,000 on dining this week. Consider cooking at home more often to stay on track.',
      progressChange: -1.5,
    },
    {
      id: '3',
      type: 'positive',
      action: 'Completed daily savings goal',
      impact: 'Emergency fund: 68% complete now!',
      tag: 'Goal Progress',
      timeAgo: '5h ago',
      details: 'Great job! You\'re building a strong financial safety net. Just ₹96,000 more to go.',
      progressChange: 1,
    },
    {
      id: '4',
      type: 'neutral',
      action: '₹1,500 auto-invested in mutual fund',
      impact: 'Building wealth steadily 📈',
      tag: 'Investment',
      timeAgo: '1d ago',
      details: 'Your SIP is working in the background. Stay consistent for long-term growth.',
    },
    {
      id: '5',
      type: 'caution',
      action: '₹800 spent on food delivery',
      impact: 'Small changes make big differences',
      tag: 'Spending Alert',
      timeAgo: '1d ago',
      details: 'Food delivery costs add up quickly. This month: ₹3,200 on delivery. Consider meal prep!',
      progressChange: -0.8,
    },
    {
      id: '6',
      type: 'positive',
      action: 'You\'re back on track this week!',
      impact: 'Spending 15% less than last week 🌟',
      tag: 'Weekly Win',
      timeAgo: '2d ago',
      details: 'Your discipline is paying off. You saved ₹2,500 this week compared to last week.',
      progressChange: 3,
    },
  ];

  const getTypeStyles = (type: ImpactInsight['type']) => {
    switch (type) {
      case 'positive':
        return {
          bg: 'from-green-50 to-emerald-50',
          border: 'border-green-200',
          accent: 'bg-green-500',
          text: 'text-green-700',
          icon: TrendingUp,
        };
      case 'caution':
        return {
          bg: 'from-orange-50 to-amber-50',
          border: 'border-orange-200',
          accent: 'bg-orange-500',
          text: 'text-orange-700',
          icon: Minus,
        };
      case 'negative':
        return {
          bg: 'from-red-50 to-rose-50',
          border: 'border-red-200',
          accent: 'bg-red-500',
          text: 'text-red-700',
          icon: TrendingDown,
        };
      default:
        return {
          bg: 'from-blue-50 to-indigo-50',
          border: 'border-blue-200',
          accent: 'bg-blue-500',
          text: 'text-blue-700',
          icon: Minus,
        };
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed right-4 bottom-20 md:right-0 md:top-1/2 md:-translate-y-1/2 md:bottom-auto bg-white border md:border-l-0 border-gray-200 rounded-xl md:rounded-l-xl md:rounded-r-none py-3 px-3 md:py-4 md:px-2 shadow-lg hover:shadow-xl transition-all z-40"
        aria-label="Open Impact Feed"
      >
        <div className="flex md:flex-col items-center gap-2">
          <Brain className="w-5 h-5 text-purple-600" />
          <span className="text-xs font-medium text-gray-600 md:writing-mode-vertical">Insights</span>
        </div>
      </button>
    );
  }

  return (
    <div className="fixed right-0 bottom-0 md:top-0 w-full md:w-96 h-[70vh] md:h-full bg-gradient-to-b from-white via-purple-50/30 to-blue-50/30 border-t md:border-t-0 md:border-l border-gray-200 shadow-2xl flex flex-col z-40 animate-slideIn rounded-t-3xl md:rounded-none">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-sm border-b border-gray-200 px-6 py-5 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Impact Feed</h2>
            <p className="text-xs text-gray-500">Real-time financial insights</p>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors"
          aria-label="Close Impact Feed"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {/* Feed Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {insights.map((insight, index) => {
          const styles = getTypeStyles(insight.type);
          const Icon = styles.icon;
          const isExpanded = expandedId === insight.id;

          return (
            <div
              key={insight.id}
              className={`bg-gradient-to-br ${styles.bg} border ${styles.border} rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 cursor-pointer animate-slideInItem`}
              style={{ animationDelay: `${index * 100}ms` }}
              onClick={() => setExpandedId(isExpanded ? null : insight.id)}
            >
              {/* Left accent bar */}
              <div className="flex">
                <div className={`w-1.5 ${styles.accent} transition-all duration-300`}></div>
                
                <div className="flex-1 p-4">
                  {/* Header section */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Brain className={`w-4 h-4 ${styles.text}`} />
                      <span className={`text-xs font-semibold ${styles.text}`}>AI Insight</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-500">{insight.timeAgo}</span>
                    </div>
                  </div>

                  {/* Main content */}
                  <div className="space-y-2">
                    <p className="font-semibold text-gray-900 text-sm leading-snug">
                      {insight.action}
                    </p>
                    
                    <div className="flex items-start gap-2">
                      <Icon className={`w-4 h-4 ${styles.text} flex-shrink-0 mt-0.5`} />
                      <p className={`text-sm ${styles.text} font-medium leading-snug`}>
                        {insight.impact}
                      </p>
                    </div>

                    {/* Progress indicator */}
                    {insight.progressChange && (
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex-1 h-1.5 bg-white/60 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${insight.progressChange > 0 ? 'bg-green-500' : 'bg-orange-500'} transition-all duration-500`}
                            style={{ width: `${Math.abs(insight.progressChange) * 10}%` }}
                          ></div>
                        </div>
                        <span className={`text-xs font-medium ${insight.progressChange > 0 ? 'text-green-600' : 'text-orange-600'}`}>
                          {insight.progressChange > 0 ? '+' : ''}{insight.progressChange}%
                        </span>
                      </div>
                    )}

                    {/* Tag */}
                    <div className="flex items-center justify-between mt-3">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-white/60 text-xs font-medium text-gray-700 border border-gray-200">
                        {insight.tag}
                      </span>
                      
                      <ChevronRight 
                        className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`} 
                      />
                    </div>

                    {/* Expanded details */}
                    {isExpanded && insight.details && (
                      <div className="mt-3 pt-3 border-t border-white/60 animate-expandIn">
                        <p className="text-xs text-gray-600 leading-relaxed">
                          {insight.details}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="bg-white/90 backdrop-blur-sm border-t border-gray-200 px-6 py-4">
        <p className="text-xs text-center text-gray-500">
          Your financial life is being quietly monitored 🤖✨
        </p>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @media (max-width: 768px) {
          @keyframes slideIn {
            from {
              transform: translateY(100%);
              opacity: 0;
            }
            to {
              transform: translateY(0);
              opacity: 1;
            }
          }
        }

        @keyframes slideInItem {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @keyframes expandIn {
          from {
            opacity: 0;
            max-height: 0;
          }
          to {
            opacity: 1;
            max-height: 200px;
          }
        }

        .animate-slideIn {
          animation: slideIn 0.4s ease-out;
        }

        .animate-slideInItem {
          animation: slideInItem 0.5s ease-out both;
        }

        .animate-expandIn {
          animation: expandIn 0.3s ease-out;
        }

        .writing-mode-vertical {
          writing-mode: vertical-rl;
          text-orientation: mixed;
        }

        @media (max-width: 768px) {
          .writing-mode-vertical {
            writing-mode: horizontal-tb;
          }
        }
      `}</style>
    </div>
  );
}