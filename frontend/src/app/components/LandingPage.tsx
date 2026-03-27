import { ArrowRight, Bot, TrendingUp, Target, Shield, Sparkles, CheckCircle2 } from 'lucide-react';
import { MotionBackground } from './MotionBackground';

interface LandingPageProps {
  onGetStarted: () => void;
  onLogin: () => void;
}

export function LandingPage({ onGetStarted, onLogin }: LandingPageProps) {
  return (
    <div className="relative min-h-screen">
      <MotionBackground />
      <div className="relative z-10">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-6 pt-20 pb-32">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full mb-6">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium">AI-Powered Financial Mentor</span>
          </div>
          <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
            Your AI Money Mentor for<br />Smart Financial Decisions
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Plan, Save, Invest — All in One Place. Get personalized financial advice in Hinglish, track expenses, and simulate your future wealth.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={onGetStarted}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-green-600 to-green-500 px-8 py-4 text-white transition-all hover:shadow-lg hover:scale-105"
            >
              Get Started
              <ArrowRight className="w-5 h-5" />
            </button>
            <button
              onClick={onLogin}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-8 py-4 text-gray-700 transition-colors hover:bg-gray-50"
            >
              Login
            </button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4">
              <Bot className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="font-semibold mb-2">Chat-based Mentor</h3>
            <p className="text-sm text-gray-600">
              Get instant financial advice in Hindi & English through our AI chatbot
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
              <Target className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="font-semibold mb-2">Money Health Score</h3>
            <p className="text-sm text-gray-600">
              Track your financial health with a simple 0-100 score
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="font-semibold mb-2">Future Simulator</h3>
            <p className="text-sm text-gray-600">
              See how your decisions today affect your wealth tomorrow
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-orange-600" />
            </div>
            <h3 className="font-semibold mb-2">Expense Tracking</h3>
            <p className="text-sm text-gray-600">
              Smart categorization and insights on your spending patterns
            </p>
          </div>
        </div>

        {/* Testimonials */}
        <div className="bg-white rounded-3xl p-12 mb-20">
          <h2 className="text-3xl font-bold text-center mb-12">What Our Users Say</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-4">
              <div className="flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className="text-yellow-400">★</span>
                ))}
              </div>
              <p className="text-gray-600 italic">
                "Finally, a finance app that speaks my language! The Hinglish responses make it so easy to understand."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-blue-500 rounded-full"></div>
                <div>
                  <div className="font-medium">Priya Sharma</div>
                  <div className="text-sm text-gray-500">Software Engineer, Bangalore</div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className="text-yellow-400">★</span>
                ))}
              </div>
              <p className="text-gray-600 italic">
                "The future simulator opened my eyes. I can now see exactly where my money will take me in 5 years."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full"></div>
                <div>
                  <div className="font-medium">Rahul Verma</div>
                  <div className="text-sm text-gray-500">Marketing Manager, Delhi</div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className="text-yellow-400">★</span>
                ))}
              </div>
              <p className="text-gray-600 italic">
                "Best part? It stops me from making stupid purchases. Saved ₹50,000 last month!"
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-red-500 rounded-full"></div>
                <div>
                  <div className="font-medium">Anjali Patel</div>
                  <div className="text-sm text-gray-500">Freelance Designer, Mumbai</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-12">Simple Pricing</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl p-8 border-2 border-gray-200">
              <h3 className="text-2xl font-bold mb-2">Free</h3>
              <div className="text-4xl font-bold mb-6">₹0<span className="text-lg text-gray-500">/month</span></div>
              <ul className="space-y-3 mb-8 text-left">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span>AI Chat Support</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span>Expense Tracking</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span>Money Health Score</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span>Basic Reports</span>
                </li>
              </ul>
              <button
                onClick={onGetStarted}
                className="w-full rounded-lg border-2 border-gray-300 py-3 transition-colors hover:bg-gray-50"
              >
                Get Started
              </button>
            </div>

            <div className="bg-gradient-to-br from-green-600 to-blue-600 text-white rounded-2xl p-8 border-2 border-green-600 relative overflow-hidden">
              <div className="absolute top-4 right-4 bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-sm font-medium">
                Popular
              </div>
              <h3 className="text-2xl font-bold mb-2">Pro</h3>
              <div className="text-4xl font-bold mb-6">₹299<span className="text-lg opacity-80">/month</span></div>
              <ul className="space-y-3 mb-8 text-left">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Everything in Free</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Future Simulator</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Bad Decision Detector</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Voice Assistant</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Advanced Analytics</span>
                </li>
              </ul>
              <button
                onClick={onGetStarted}
                className="w-full rounded-lg bg-white py-3 font-medium text-green-600 transition-colors hover:bg-gray-100"
              >
                Upgrade to Pro
              </button>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
