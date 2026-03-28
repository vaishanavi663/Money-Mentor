import { AlertTriangle, X, ShoppingBag, Plane, TrendingDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { usePlan } from '../../hooks/usePlan';

interface BadDecision {
  id: string;
  type: 'expense' | 'investment' | 'goal';
  title: string;
  message: string;
  impact: string;
  amount: number;
}

interface BadDecisionDetectorProps {
  decisions: BadDecision[];
  onDismiss: (id: string) => void;
  onSaveInstead: (id: string) => void;
}

export function BadDecisionDetector({ decisions, onDismiss, onSaveInstead }: BadDecisionDetectorProps) {
  const { isPro } = usePlan();
  if (!isPro) {
    return null;
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'expense':
        return ShoppingBag;
      case 'investment':
        return TrendingDown;
      case 'goal':
        return Plane;
      default:
        return AlertTriangle;
    }
  };

  return (
    <div className="fixed top-20 right-6 z-40 space-y-3 max-w-md">
      <AnimatePresence>
        {decisions.map((decision) => {
          const Icon = getIcon(decision.type);
          return (
            <motion.div
              key={decision.id}
              initial={{ opacity: 0, x: 100, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.9 }}
              className="bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-300 rounded-xl shadow-lg overflow-hidden"
            >
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-white" />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-orange-900">{decision.title}</h3>
                      <button
                        onClick={() => onDismiss(decision.id)}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <p className="text-sm text-orange-800 mb-2">{decision.message}</p>

                    <div className="bg-orange-100 rounded-lg p-3 mb-3">
                      <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle className="w-4 h-4 text-orange-600" />
                        <span className="text-xs font-medium text-orange-900">Impact:</span>
                      </div>
                      <p className="text-xs text-orange-800">{decision.impact}</p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => onDismiss(decision.id)}
                        className="flex-1 px-4 py-2 bg-white border border-orange-300 text-orange-700 rounded-lg text-sm hover:bg-orange-50 transition-colors"
                      >
                        Proceed Anyway
                      </button>
                      <button
                        onClick={() => onSaveInstead(decision.id)}
                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors"
                      >
                        Save Instead 💰
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Animated Warning Strip */}
              <motion.div
                className="h-1 bg-gradient-to-r from-orange-400 to-red-500"
                animate={{
                  opacity: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                }}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
