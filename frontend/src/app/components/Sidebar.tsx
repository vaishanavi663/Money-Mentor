import {
  LayoutDashboard,
  MessageCircle,
  Receipt,
  Sparkles,
  Activity,
  Bot,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  User,
  Settings,
  LogOut,
  Star,
  Percent,
  Landmark,
  Lock,
  Globe,
  Check,
} from 'lucide-react';
import { useState } from 'react';
import type { AuthUser } from '../lib/api';
import type { ReplyLanguagePreference } from '../lib/voiceLanguage';
import { useReplyLanguage } from '../context/ReplyLanguageContext';
import { useUserProfile } from '../context/UserProfileContext';
import { usePlan } from '../../hooks/usePlan';

const REPLY_LANG_OPTIONS: { value: ReplyLanguagePreference; label: string; sub?: string }[] = [
  { value: 'auto', label: 'Auto', sub: 'Match your message' },
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'Hindi', sub: 'हिंदी' },
  { value: 'hinglish', label: 'Hinglish' },
];

type Page = 'dashboard' | 'chat' | 'expenses' | 'simulator' | 'health' | 'tax-tips' | 'schemes';

interface SidebarProps {
  activePage: Page;
  onPageChange: (page: Page) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  currentUser: AuthUser | null;
  onLogout: () => void;
}

export function Sidebar({
  activePage,
  onPageChange,
  isCollapsed,
  onToggleCollapse,
  currentUser,
  onLogout,
}: SidebarProps) {
  const { profile } = useUserProfile();
  const { isPro, showUpgradeModal } = usePlan();
  const { preference: replyLanguage, setPreference: setReplyLanguage } = useReplyLanguage();
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [languageExpanded, setLanguageExpanded] = useState(false);

  const closeProfileMenu = () => {
    setShowProfileDropdown(false);
    setLanguageExpanded(false);
  };

  // All menu items in a flat structure
  const menuItems = [
    { id: 'dashboard' as Page, icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'chat' as Page, icon: MessageCircle, label: 'AI Chat' },
    { id: 'expenses' as Page, icon: Receipt, label: 'Expenses' },
    { id: 'tax-tips' as Page, icon: Percent, label: 'Tax tips' },
    { id: 'schemes' as Page, icon: Landmark, label: 'Schemes & opportunities' },
    { id: 'simulator' as Page, icon: Sparkles, label: 'Simulator' },
    { id: 'health' as Page, icon: Activity, label: 'Health Score' },
  ];

  return (
    <div 
      className={`relative z-10 bg-white/95 backdrop-blur-sm border-r border-gray-200 h-screen flex flex-col transition-all duration-300 ease-in-out ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Header */}
      <div className="p-6 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <Bot className="w-6 h-6 text-white" />
          </div>
          {!isCollapsed && (
            <div className="overflow-hidden">
              <h1 className="font-bold text-lg whitespace-nowrap">MoneyMentor AI</h1>
              <p className="text-xs text-gray-500 whitespace-nowrap">Your Finance Buddy</p>
            </div>
          )}
        </div>
        
        {/* Arrow Toggle Button */}
        <button
          onClick={onToggleCollapse}
          className="flex-shrink-0 w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <ChevronRight className="w-5 h-5 text-gray-600" />
          ) : (
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          )}
        </button>
      </div>

      {/* Navigation - Flat Structure */}
      <nav className="flex-1 px-3 py-6 overflow-y-auto">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            const simulatorLocked = item.id === 'simulator' && !isPro;
            return (
              <li key={item.id}>
                <button
                  onClick={() => {
                    if (simulatorLocked) {
                      showUpgradeModal(
                        'Future Simulator',
                        'Run scenario planning and leak detection — unlock with Pro (₹99/mo).',
                      );
                      return;
                    }
                    onPageChange(item.id);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all relative group ${
                    isActive
                      ? 'bg-gradient-to-r from-green-600 to-blue-600 text-white shadow-md shadow-green-200'
                      : 'text-gray-600 hover:bg-gray-50'
                  } ${isCollapsed ? 'justify-center' : ''}`}
                  title={isCollapsed ? item.label : ''}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {!isCollapsed && (
                    <span className="flex flex-1 items-center gap-1.5 font-medium">
                      {item.label}
                      {simulatorLocked && <Lock className="h-3.5 w-3.5 text-amber-600" aria-hidden />}
                    </span>
                  )}
                  {isCollapsed && simulatorLocked && (
                    <Lock className="absolute right-1 top-1/2 h-3 w-3 -translate-y-1/2 text-amber-600" aria-hidden />
                  )}
                  
                  {/* Tooltip for collapsed state */}
                  {isCollapsed && (
                    <div className="absolute left-full ml-3 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-lg">
                      {item.label}
                    </div>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Profile Section at Bottom */}
      <div className="mt-auto border-t border-gray-200 p-3 relative">
        {!isCollapsed && (
          <div className="mb-2 rounded-xl border border-emerald-100 bg-emerald-50 p-3">
            <p className="text-xs text-emerald-700">Money Health</p>
            <p className="text-lg font-bold text-emerald-800">{profile.moneyHealthScore}/100</p>
            <p className="text-xs text-gray-600">FIRE age estimate: {profile.fireAge}</p>
          </div>
        )}
        <button
          onClick={() => {
            setShowProfileDropdown(!showProfileDropdown);
            if (showProfileDropdown) setLanguageExpanded(false);
          }}
          className={`w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors ${
            isCollapsed ? 'justify-center' : ''
          } group relative`}
        >
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
            <User className="w-5 h-5 text-white" />
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0 text-left">
              <p className="font-medium text-sm truncate">{profile.name || currentUser?.name || 'User'}</p>
              <p className="text-xs text-gray-500 truncate">{profile.email || currentUser?.email || 'user@example.com'}</p>
            </div>
          )}
          
          {/* Tooltip for collapsed state */}
          {isCollapsed && (
            <div className="absolute left-full ml-3 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-lg">
              {profile.name || currentUser?.name || 'User'}
            </div>
          )}
        </button>

        {/* Profile Dropdown Menu */}
        {showProfileDropdown && !isCollapsed && (
          <>
            {/* Backdrop to close dropdown on outside click */}
            <div className="fixed inset-0 z-40" onClick={closeProfileMenu} />
            
            {/* Dropdown */}
            <div className="absolute bottom-full left-3 right-3 mb-2 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-50 animate-fade-in">
              <button
                type="button"
                className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors"
                onClick={closeProfileMenu}
              >
                <User className="w-4 h-4 text-gray-500" />
                <span>View Profile</span>
              </button>

              <button
                type="button"
                className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors"
                onClick={closeProfileMenu}
              >
                <Settings className="w-4 h-4 text-gray-500" />
                <span>Settings</span>
              </button>

              <div className="border-t border-gray-100">
                <button
                  type="button"
                  className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center justify-between gap-2 transition-colors"
                  onClick={() => setLanguageExpanded((v) => !v)}
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <Globe className="w-4 h-4 text-gray-500 shrink-0" />
                    <span className="truncate">Language</span>
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${languageExpanded ? 'rotate-180' : ''}`}
                  />
                </button>
                {languageExpanded && (
                  <div className="px-2 pb-2 space-y-0.5">
                    {REPLY_LANG_OPTIONS.map((opt) => {
                      const selected = replyLanguage === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          className={`w-full rounded-lg px-3 py-2 text-left text-sm flex items-start gap-2 transition-colors ${
                            selected ? 'bg-emerald-50 text-emerald-900' : 'text-gray-700 hover:bg-gray-50'
                          }`}
                          onClick={() => setReplyLanguage(opt.value)}
                        >
                          <Check
                            className={`w-4 h-4 mt-0.5 shrink-0 ${selected ? 'text-emerald-600 opacity-100' : 'opacity-0'}`}
                          />
                          <span className="min-w-0">
                            <span className="font-medium block">{opt.label}</span>
                            {opt.sub ? (
                              <span className="text-xs text-gray-500 block">{opt.sub}</span>
                            ) : null}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="my-1 border-t border-gray-100"></div>
              
              <button
                type="button"
                className="w-full px-4 py-2.5 text-left text-sm hover:bg-gradient-to-r hover:from-green-50 hover:to-blue-50 flex items-center gap-3 transition-colors group"
                onClick={() => {
                  closeProfileMenu();
                  if (!isPro) {
                    showUpgradeModal(
                      'Money Mentor Pro',
                      'Unlock simulator, voice, impact feed, unlimited chat, full history, PDF export, and Android SMS sync.',
                    );
                  }
                }}
              >
                <Star className="w-4 h-4 text-green-600 fill-green-600" />
                <span className="font-medium text-green-700 group-hover:text-green-800">Upgrade to Pro</span>
              </button>
              
              <div className="my-1 border-t border-gray-100"></div>
              
              <button
                type="button"
                className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors"
                onClick={() => {
                  closeProfileMenu();
                  onLogout();
                }}
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}