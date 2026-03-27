import { Sparkles, ArrowRight, CheckCircle2, Info } from 'lucide-react';
import { useState } from 'react';

export function NextFinancialMove() {
  const [isHovered, setIsHovered] = useState(false);

  const impactTags = [
    { label: 'Save Tax', icon: '💰' },
    { label: 'Grow Wealth', icon: '📈' },
    { label: 'Stay on Track', icon: '🎯' },
  ];

  const handleDoThisNow = () => {
    // Placeholder for action - can be connected to actual investment flow
    alert('Opening ELSS investment flow...');
  };

  const handleWhyThis = () => {
    // Placeholder for explanation modal
    alert('ELSS investments under ₹1.5L per year qualify for tax deduction under Section 80C. By investing ₹3,000/month (₹36,000/year), you can save approximately ₹9,000 in taxes (assuming 25% tax bracket).');
  };

  return (
    <div className="relative w-full">
      {/* Background gradient container */}
      <div className="absolute inset-0 bg-gradient-to-br from-white via-blue-50 to-purple-50 rounded-3xl opacity-60"></div>
      
      {/* Main card */}
      <div
        className="relative bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-2xl overflow-hidden transition-all duration-300 ease-out"
        style={{
          boxShadow: isHovered 
            ? '0 25px 50px -12px rgba(0, 0, 0, 0.15), 0 0 30px rgba(16, 185, 129, 0.3)' 
            : '0 20px 45px -10px rgba(0, 0, 0, 0.1), 0 0 20px rgba(16, 185, 129, 0.2)',
          transform: isHovered ? 'scale(1.02)' : 'scale(1)',
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Left glow border */}
        <div 
          className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-green-400 via-green-500 to-green-600 transition-all duration-500"
          style={{
            boxShadow: isHovered 
              ? '0 0 25px rgba(16, 185, 129, 0.8), 0 0 50px rgba(16, 185, 129, 0.4)' 
              : '0 0 15px rgba(16, 185, 129, 0.6)',
          }}
        ></div>

        {/* Content container */}
        <div className="relative p-6 sm:p-8 lg:p-10">
          {/* Top section - Label and AI Badge */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🔥</span>
              <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                Your Next Financial Move
              </h2>
            </div>
            
            {/* AI Badge */}
            <div className="flex items-center gap-2 bg-gradient-to-r from-purple-100 to-blue-100 px-4 py-2 rounded-full border border-purple-200 w-fit">
              <Sparkles className="w-4 h-4 text-purple-600 animate-pulse" />
              <span className="text-sm font-semibold text-purple-700">AI Suggested</span>
              <span className="text-xs text-purple-600 ml-1">• Confidence: High</span>
            </div>
          </div>

          {/* Main action text */}
          <div className="mb-4">
            <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3">
              Invest ₹3,000 in ELSS this month
            </h3>
            <p className="text-base sm:text-lg text-gray-600 flex items-center gap-2">
              <Info className="w-5 h-5 text-orange-500 flex-shrink-0" />
              <span>You are missing ₹9,000 tax savings</span>
            </p>
          </div>

          {/* Impact tags */}
          <div className="flex flex-wrap gap-3 mb-6">
            {impactTags.map((tag, index) => (
              <div
                key={index}
                className="flex items-center gap-2 bg-green-50 border border-green-200 px-4 py-2 rounded-full transition-all duration-300 hover:scale-110 hover:bg-green-100 hover:shadow-md"
                style={{
                  animation: `popIn 0.5s ease-out ${index * 0.1}s both`,
                }}
              >
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-700">{tag.label}</span>
                <span>{tag.icon}</span>
              </div>
            ))}
          </div>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={handleDoThisNow}
              className="relative group bg-gradient-to-r from-green-600 to-green-500 text-white px-8 py-4 rounded-xl font-semibold text-base sm:text-lg transition-all duration-300 hover:shadow-2xl overflow-hidden"
              style={{
                boxShadow: '0 10px 25px -5px rgba(16, 185, 129, 0.4)',
              }}
            >
              {/* Ripple effect background */}
              <div className="absolute inset-0 bg-white/20 transform scale-0 group-hover:scale-100 transition-transform duration-500 rounded-xl"></div>
              
              <span className="relative flex items-center justify-center gap-2">
                Do This Now
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </span>
            </button>

            <button
              onClick={handleWhyThis}
              className="bg-white border-2 border-gray-300 text-gray-700 px-8 py-4 rounded-xl font-semibold text-base sm:text-lg transition-all duration-300 hover:border-gray-400 hover:bg-gray-50 hover:shadow-lg"
            >
              Why This?
            </button>
          </div>

          {/* Optional: Spark animation effect */}
          <div className="absolute top-4 right-4 opacity-50">
            <Sparkles className="w-6 h-6 text-yellow-400 animate-pulse" />
          </div>
        </div>
      </div>

      {/* Keyframes for pop animation */}
      <style>{`
        @keyframes popIn {
          0% {
            opacity: 0;
            transform: scale(0.8) translateY(10px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
