import { TrendingUp, TrendingDown, AlertCircle, CheckCircle, Shield, Wallet, Heart, FileText } from 'lucide-react';
import { useUserProfile } from '../context/UserProfileContext';

interface HealthMetric {
  name: string;
  score: number;
  status: 'good' | 'warning' | 'poor';
  icon: typeof Shield;
  suggestion: string;
}

export function MoneyHealthScore() {
  const { profile } = useUserProfile();
  const overallScore = profile.moneyHealthScore;

  const metrics: HealthMetric[] = [
    {
      name: 'Emergency Fund',
      score: profile.goals.includes('Emergency Fund') || profile.currentInvestments.includes('FD / Savings Account') ? 80 : 45,
      status: profile.goals.includes('Emergency Fund') || profile.currentInvestments.includes('FD / Savings Account') ? 'good' : 'poor',
      icon: Shield,
      suggestion: profile.goals.includes('Emergency Fund')
        ? 'Great pick. Continue building emergency corpus to at least 6 months expenses.'
        : 'Add Emergency Fund as a top goal for stronger financial resilience.',
    },
    {
      name: 'Investments',
      score: Math.min(95, profile.currentInvestments.length * 15),
      status: profile.currentInvestments.length >= 3 ? 'good' : profile.currentInvestments.length >= 1 ? 'warning' : 'poor',
      icon: TrendingUp,
      suggestion: `You currently invest in ${profile.currentInvestments.length} instrument(s). Keep diversifying gradually.`,
    },
    {
      name: 'Debt Management',
      score: profile.primaryConcern.includes('debt') ? 45 : 70,
      status: profile.primaryConcern.includes('debt') ? 'poor' : 'good',
      icon: AlertCircle,
      suggestion: profile.primaryConcern.includes('debt')
        ? 'Prioritize clearing high-interest debt before increasing risk exposure.'
        : 'No major debt warning detected from your onboarding profile.',
    },
    {
      name: 'Insurance Coverage',
      score: profile.currentInvestments.includes('Life Insurance') ? 85 : 50,
      status: profile.currentInvestments.includes('Life Insurance') ? 'good' : 'warning',
      icon: Heart,
      suggestion: profile.currentInvestments.includes('Life Insurance')
        ? 'Insurance coverage looks healthy from your profile.'
        : 'Consider adding life/health cover to reduce financial risk.',
    },
    {
      name: 'Tax Efficiency',
      score: profile.estimatedTaxSavings > 20000 ? 80 : 60,
      status: 'warning',
      icon: FileText,
      suggestion: `You can optimize around ₹${profile.estimatedTaxSavings.toLocaleString('en-IN')} annually with better tax planning.`,
    },
  ];

  const getStatusColor = (status: 'good' | 'warning' | 'poor') => {
    switch (status) {
      case 'good':
        return 'text-green-600 bg-green-50';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50';
      case 'poor':
        return 'text-red-600 bg-red-50';
    }
  };

  const getProgressColor = (score: number) => {
    if (score >= 70) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="h-full overflow-y-auto bg-white/45 backdrop-blur-[2px] p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold mb-2">Money Health Score</h1>
          <p className="text-gray-600">Track kar aapki financial health kaisi hai</p>
        </div>

        {/* Overall Score Card */}
        <div className="bg-gradient-to-br from-green-600 to-blue-600 rounded-3xl p-8 text-white">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="flex-1 text-center lg:text-left">
              <h2 className="text-2xl font-semibold mb-2">Your Overall Score</h2>
              <p className="text-white/80 mb-4">
                Aapki financial health average hai. Thoda improvement ki zarurat hai! 💪
              </p>
              <div className="inline-flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm">+5 points from last month</span>
              </div>
            </div>

            <div className="relative">
              <svg className="w-48 h-48 transform -rotate-90">
                <circle
                  cx="96"
                  cy="96"
                  r="80"
                  stroke="currentColor"
                  strokeWidth="12"
                  fill="none"
                  className="text-white/20"
                />
                <circle
                  cx="96"
                  cy="96"
                  r="80"
                  stroke="currentColor"
                  strokeWidth="12"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 80}`}
                  strokeDashoffset={`${2 * Math.PI * 80 * (1 - overallScore / 100)}`}
                  className="text-white"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-5xl font-bold">{overallScore}</div>
                <div className="text-sm text-white/80">out of 100</div>
              </div>
            </div>
          </div>
        </div>

        {/* Metrics Breakdown */}
        <div className="bg-white rounded-2xl p-6">
          <h2 className="text-xl font-semibold mb-6">Score Breakdown</h2>
          <div className="space-y-4">
            {metrics.map((metric, index) => {
              const Icon = metric.icon;
              return (
                <div key={index} className="border border-gray-200 rounded-xl p-4">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${getStatusColor(metric.status)}`}>
                      <Icon className="w-6 h-6" />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold">{metric.name}</h3>
                        <span className={`text-2xl font-bold ${getProgressColor(metric.score)}`}>
                          {metric.score}
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                        <div
                          className={`h-2 rounded-full ${
                            metric.score >= 70
                              ? 'bg-green-600'
                              : metric.score >= 50
                              ? 'bg-yellow-600'
                              : 'bg-red-600'
                          }`}
                          style={{ width: `${metric.score}%` }}
                        ></div>
                      </div>

                      <p className="text-sm text-gray-600">{metric.suggestion}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Improvement Tips */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold mb-2">Quick Improvement Tips</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                  <span>Emergency fund mein ₹10,000 monthly add karne se 6 months mein ready ho jayega</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                  <span>Credit card bill ko 2 weeks pehle pay karke 12% interest save karein</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                  <span>Term insurance lene se aapka score 85+ tak ja sakta hai</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
