import { useState, useEffect } from 'react';
import { LandingPage } from './components/LandingPage';
import { AuthPage } from './components/AuthPage';
import { Sidebar } from './components/Sidebar';
import { MainDashboard } from './components/MainDashboard';
import { AIChat } from './components/AIChat';
import { ExpensesDashboard } from './components/ExpensesDashboard';
import { FutureSimulator } from './components/FutureSimulator';
import { MoneyHealthScore } from './components/MoneyHealthScore';
import { VoiceAssistant } from './components/VoiceAssistant';
import { BadDecisionDetector } from './components/BadDecisionDetector';
import { MotionBackground } from './components/MotionBackground';
import { api, clearStoredToken, getStoredToken, setStoredToken, type AuthResponse, type AuthUser } from './lib/api';

type Page = 'dashboard' | 'chat' | 'expenses' | 'simulator' | 'health';
type AuthScreen = 'landing' | 'login' | 'register' | 'app';

interface BadDecision {
  id: string;
  type: 'expense' | 'investment' | 'goal';
  title: string;
  message: string;
  impact: string;
  amount: number;
}

export default function App() {
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [authScreen, setAuthScreen] = useState<AuthScreen>('landing');
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [activePage, setActivePage] = useState<Page>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [badDecisions, setBadDecisions] = useState<BadDecision[]>([
    {
      id: '1',
      type: 'expense',
      title: 'Shopping Alert! 🛍️',
      message: 'Spending ₹20,000 on new phone right now?',
      impact: 'This will delay your Dream Vacation goal by 2 months! 😔',
      amount: 20000,
    },
  ]);

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
        localStorage.setItem('moneymentor-user', JSON.stringify(response.user));
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

    verifySession();
  }, []);

  const handleGetStarted = () => {
    setAuthScreen('register');
  };

  const handleLogin = () => {
    setAuthScreen('login');
  };

  const handleBackToLanding = () => {
    setAuthScreen('landing');
  };

  const handleAuthSuccess = (payload: AuthResponse) => {
    setStoredToken(payload.token);
    setCurrentUser(payload.user);
    localStorage.setItem('moneymentor-user', JSON.stringify(payload.user));
    setAuthScreen('app');
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch {
      // Session may already be invalid, still clear local auth state.
    } finally {
      clearStoredToken();
      localStorage.removeItem('moneymentor-user');
      setCurrentUser(null);
      setAuthScreen('landing');
    }
  };

  const handleDismissDecision = (id: string) => {
    setBadDecisions(badDecisions.filter(d => d.id !== id));
  };

  const handleSaveInstead = (id: string) => {
    // In a real app, this would add to savings
    setBadDecisions(badDecisions.filter(d => d.id !== id));
    // Show a success message or trigger a savings action
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
    return <LandingPage onGetStarted={handleGetStarted} onLogin={handleLogin} />;
  }

  if (authScreen === 'login' || authScreen === 'register') {
    return (
      <AuthPage
        mode={authScreen}
        onBackToLanding={handleBackToLanding}
        onAuthSuccess={handleAuthSuccess}
      />
    );
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
        {activePage === 'dashboard' && <MainDashboard />}
        {activePage === 'chat' && <AIChat />}
        {activePage === 'expenses' && <ExpensesDashboard />}
        {activePage === 'simulator' && <FutureSimulator onNavigateToChat={() => setActivePage('chat')} />}
        {activePage === 'health' && <MoneyHealthScore />}
      </div>

      {/* Floating Components */}
      <VoiceAssistant />
      <BadDecisionDetector
        decisions={badDecisions}
        onDismiss={handleDismissDecision}
        onSaveInstead={handleSaveInstead}
      />
    </div>
  );
}