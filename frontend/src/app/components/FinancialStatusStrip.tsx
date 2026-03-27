import { AlertCircle, TrendingDown, CheckCircle } from 'lucide-react';

interface FinancialStatusStripProps {
  status: 'good' | 'warning' | 'risk';
  mainText: string;
  subText: string;
  actionText: string;
}

export function FinancialStatusStrip({
  status = 'warning',
  mainText = 'You are slightly off track this month',
  subText = 'Your expenses increased by ₹3,000',
  actionText = 'Reduce food spending or increase savings',
}: FinancialStatusStripProps) {
  
  const getStatusConfig = () => {
    switch (status) {
      case 'good':
        return {
          icon: '🟢',
          iconComponent: CheckCircle,
          bgColor: 'from-green-50 to-emerald-50',
          borderColor: 'border-green-200',
          textColor: 'text-green-900',
          subTextColor: 'text-green-700',
          actionBg: 'bg-green-100',
          actionText: 'text-green-800',
          iconColor: 'text-green-600',
        };
      case 'risk':
        return {
          icon: '🔴',
          iconComponent: AlertCircle,
          bgColor: 'from-red-50 to-rose-50',
          borderColor: 'border-red-200',
          textColor: 'text-red-900',
          subTextColor: 'text-red-700',
          actionBg: 'bg-red-100',
          actionText: 'text-red-800',
          iconColor: 'text-red-600',
        };
      default: // warning
        return {
          icon: '🟡',
          iconComponent: TrendingDown,
          bgColor: 'from-yellow-50 to-amber-50',
          borderColor: 'border-yellow-200',
          textColor: 'text-yellow-900',
          subTextColor: 'text-yellow-700',
          actionBg: 'bg-yellow-100',
          actionText: 'text-yellow-800',
          iconColor: 'text-yellow-600',
        };
    }
  };

  const config = getStatusConfig();
  const IconComponent = config.iconComponent;

  return (
    <div className="animate-fadeIn">
      <div className={`bg-gradient-to-r ${config.bgColor} border ${config.borderColor} rounded-2xl p-5 lg:p-6 shadow-sm`}>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Left Side - Status Info */}
          <div className="flex items-start gap-4 flex-1">
            {/* Status Icon */}
            <div className="flex-shrink-0">
              <div className="relative">
                <span className="text-3xl lg:text-4xl animate-pulse">{config.icon}</span>
                <div className={`absolute -bottom-1 -right-1 ${config.iconColor}`}>
                  <IconComponent className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Text Content */}
            <div className="flex-1 min-w-0">
              <h2 className={`text-xl lg:text-2xl font-bold ${config.textColor} mb-2`}>
                {mainText}
              </h2>
              <p className={`text-sm lg:text-base ${config.subTextColor} font-medium`}>
                {subText}
              </p>
            </div>
          </div>

          {/* Right Side - Action */}
          <div className="lg:ml-6">
            <div className={`${config.actionBg} ${config.actionText} px-5 py-3 rounded-xl border ${config.borderColor} font-medium text-sm lg:text-base text-center lg:text-left whitespace-nowrap`}>
              💡 {actionText}
            </div>
          </div>
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.6s ease-out;
        }
      `}</style>
    </div>
  );
}
