import { useState, useEffect, useMemo } from 'react';
import { LandingPage } from './components/LandingPage';
import { AuthPage } from './components/AuthPage';
import { Sidebar } from './components/Sidebar';
import { MainDashboard } from './components/MainDashboard';
import { SchemesOpportunitiesPage } from './components/SchemesOpportunitiesPage';
import { AIChat } from './components/AIChat';
import { ExpensesDashboard } from './components/ExpensesDashboard';
import { FutureSimulator } from './components/FutureSimulator';
import { MoneyHealthScore } from './components/MoneyHealthScore';
import { BadDecisionDetector } from './components/BadDecisionDetector';
import { OnboardingQuiz } from './components/OnboardingQuiz';
import { ImpactFeed } from './components/ImpactFeed';
import { MotionBackground } from './components/MotionBackground';
import { Toaster } from './components/ui/sonner';
import { TaxTips } from '@/components/TaxTips';
import { api, clearStoredToken, getStoredToken, setStoredToken, type AuthResponse, type AuthUser } from './lib/api';
import { useUserProfile } from './context/UserProfileContext';
import { usePlan } from '../hooks/usePlan';
import type { UserPlan } from './lib/api';

type Page = 'dashboard' | 'chat' | 'expenses' | 'simulator' | 'health' | 'tax-tips' | 'schemes';
type AuthScreen = 'landing' | 'login' | 'register' | 'app';

interface BadDecision {
  id: string;
  type: 'expense' | 'investment' | 'goal';
  title: string;
  message: string;
  impact: string;
  amount: number;
}

function FutureSimulatorUpgradePrompt({ onUpgrade }: { onUpgrade: () => void }) {
  return (
    <div className="relative z-10 flex h-full items-center justify-center overflow-y-auto bg-white/45 p-6 backdrop-blur-[2px]">
      <div className="max-w-lg rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-lg">
        <h2 className="text-2xl font-bold text-gray-900">Future Simulator</h2>
        <p className="mt-3 text-gray-600">
          Project goals, money leaks, and long-term wealth scenarios. This Pro feature helps you see how choices today
          shape tomorrow.
        </p>
        <button
          type="button"
          onClick={onUpgrade}
          className="mt-6 w-full rounded-xl bg-gradient-to-r from-green-600 to-blue-600 py-3 font-medium text-white transition-opacity hover:opacity-95"
        >
          Upgrade to Pro — ₹99/mo
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const { profile, setIdentity, clearProfile, hydrateFromServer } = useUserProfile();
  const { isPro, showUpgradeModal } = usePlan();
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [authScreen, setAuthScreen] = useState<AuthScreen>('landing');
  const [registerIntentPlan, setRegisterIntentPlan] = useState<UserPlan>('free');
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [activePage, setActivePage] = useState<Page>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [dismissedDecisionIds, setDismissedDecisionIds] = useState<string[]>([]);

  useEffect(() => {
    const verifySession = async () => {
      const token = getStoredToken();
      if (!token) {
        setAuthScreen('landing');
        setCurrentUser(null);
        setIsCheckingSession(false);
        return;
      }

      try {
        const response = await api.getMe();
        setCurrentUser(response.user);
        setIdentity({
          name: response.user.name,
          email: response.user.email,
          plan: response.user.plan ?? "free",
          planExpiresAt: response.user.planExpiresAt ?? null,
        });
        localStorage.setItem('moneymentor-user', JSON.stringify(response.user));
        try {
          const { profile: serverProfile } = await api.getUserProfile();
          hydrateFromServer(serverProfile);
        } catch {
          /* keep cached local profile */
        }
        setAuthScreen('app');
      } catch {
        clearStoredToken();
        localStorage.removeItem('moneymentor-user');
        setCurrentUser(null);
        setAuthScreen('landing');
      } finally {
        setIsCheckingSession(false);
      }
    };

    void verifySession();
    // Session restore runs once on mount. Do not depend on profile context
    // callbacks — they would retrigger this after setIdentity and flood the API.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGetStartedFree = () => {
    setRegisterIntentPlan('free');
    setAuthScreen('register');
  };

  const handleGetStartedPro = () => {
    setRegisterIntentPlan('pro');
    setAuthScreen('register');
  };

  const handleLogin = () => {
    setAuthScreen('login');
  };

  const handleBackToLanding = () => {
    setRegisterIntentPlan('free');
    setAuthScreen('landing');
  };

  const handleAuthSuccess = async (payload: AuthResponse, source: 'login' | 'register') => {
    setStoredToken(payload.token);
    setCurrentUser(payload.user);
    setIdentity({
      name: payload.user.name,
      email: payload.user.email,
      plan: payload.user.plan ?? "free",
      planExpiresAt: payload.user.planExpiresAt ?? null,
    });
    localStorage.setItem('moneymentor-user', JSON.stringify(payload.user));
    setDismissedDecisionIds([]);
    let completedOnboarding = profile.hasCompletedOnboarding;
    try {
      const { profile: serverProfile } = await api.getUserProfile();
      hydrateFromServer(serverProfile);
      completedOnboarding = serverProfile.hasCompletedOnboarding;
    } catch {
      /* offline or first request — use current state */
    }
    setAuthScreen('app');
    setShowOnboarding(source === 'register' && !completedOnboarding);
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch {
      // Session may already be invalid, still clear local auth state.
    } finally {
      clearStoredToken();
      localStorage.removeItem('moneymentor-user');
      clearProfile();
      setCurrentUser(null);
      setShowOnboarding(false);
      setAuthScreen('landing');
    }
  };

  const badDecisions = useMemo<BadDecision[]>(() => {
    const decisions: BadDecision[] = [];
    if (!profile.hasCompletedOnboarding) {
      return [];
    }
    if (profile.savingsRate < 10) {
      decisions.push({
        id: 'low-savings',
        type: 'expense',
        title: 'Savings rate is too low',
        message: `You are saving only ${profile.savingsRate.toFixed(1)}% right now.`,
        impact: 'Try to keep savings above 20% to stay on track for long-term goals.',
        amount: Math.max(0, 20000 - profile.monthlySavings),
      });
    }
    if (profile.monthlyIncome > 0 && profile.monthlyExpenses > profile.monthlyIncome * 0.8) {
      decisions.push({
        id: 'high-expense-ratio',
        type: 'goal',
        title: 'Expenses are eating your income',
        message: `Expenses are ${(profile.monthlyExpenses / profile.monthlyIncome * 100).toFixed(0)}% of income.`,
        impact: 'A 10% expense cut can significantly improve your FIRE timeline.',
        amount: Math.round(profile.monthlyExpenses * 0.1),
      });
    }
    if (!profile.currentInvestments.includes('Mutual Funds / SIPs')) {
      decisions.push({
        id: 'missing-sip',
        type: 'investment',
        title: 'No SIP detected',
        message: 'Your profile suggests no active SIP yet.',
        impact: 'Starting even a small SIP now compounds strongly over time.',
        amount: profile.recommendedSIP,
      });
    }
    return decisions.filter((item) => !dismissedDecisionIds.includes(item.id));
  }, [dismissedDecisionIds, profile]);

  const handleDismissDecision = (id: string) => {
    setDismissedDecisionIds((prev) => [...prev, id]);
  };

  const handleSaveInstead = (id: string) => {
    setDismissedDecisionIds((prev) => [...prev, id]);
  };

  if (isCheckingSession) {
    return (
      <div className="relative min-h-screen">
        <MotionBackground />
        <div className="relative z-10 flex min-h-screen items-center justify-center">
          <div className="rounded-lg bg-white/90 px-5 py-3 text-sm text-gray-700 shadow">Checking session...</div>
        </div>
      </div>
    );
  }

  if (authScreen === 'landing') {
    return (
      <LandingPage
        onGetStartedFree={handleGetStartedFree}
        onGetStartedPro={handleGetStartedPro}
        onLogin={handleLogin}
      />
    );
  }

  if (authScreen === 'login' || authScreen === 'register') {
    return (
      <AuthPage
        mode={authScreen}
        signupPlan={registerIntentPlan}
        onBackToLanding={handleBackToLanding}
        onAuthSuccess={handleAuthSuccess}
      />
    );
  }

  if (showOnboarding && !profile.hasCompletedOnboarding) {
    return <OnboardingQuiz onCompleted={() => setShowOnboarding(false)} />;
  }

  return (
    <div className="relative flex h-screen overflow-hidden">
      <MotionBackground />
      {/* Sidebar */}
      <div className="relative z-10 flex min-h-0 shrink-0">
        <Sidebar
          activePage={activePage}
          onPageChange={setActivePage}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          currentUser={currentUser}
          onLogout={handleLogout}
        />
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 flex min-h-0 flex-1 overflow-hidden">
        {activePage === 'dashboard' && (
          <MainDashboard onNavigateToPage={(page) => setActivePage(page)} />
        )}
        {activePage === 'chat' && <AIChat />}
        {activePage === 'expenses' && <ExpensesDashboard />}
        {activePage === 'simulator' &&
          (isPro ? (
            <FutureSimulator onNavigateToChat={() => setActivePage('chat')} />
          ) : (
            <FutureSimulatorUpgradePrompt
              onUpgrade={() =>
                showUpgradeModal(
                  'Future Simulator',
                  'Run wealth projections, goal timelines, and leak analysis — included in Pro alongside Voice Assistant and unlimited AI chat.',
                )
              }
            />
          ))}
        {activePage === 'health' && <MoneyHealthScore />}
        {activePage === 'tax-tips' && (
          <div className="relative z-10 h-full overflow-y-auto bg-white/45 backdrop-blur-[2px]">
            <TaxTips variant="page" />
          </div>
        )}
        {activePage === 'schemes' && <SchemesOpportunitiesPage />}
      </div>

      {/* Floating Components */}
      <BadDecisionDetector
        decisions={badDecisions}
        onDismiss={handleDismissDecision}
        onSaveInstead={handleSaveInstead}
      />
      <ImpactFeed />
      <Toaster richColors position="top-center" />
    </div>
  );
}