/**
 * Smart Voice Command Parser
 * Fully local, free natural language processing for voice commands
 */

// Configurable keyword groups for different intents
const KEYWORD_GROUPS = {
  navigation: {
    dashboard: ['dashboard', 'home', 'main', 'overview'],
    chat: ['chat', 'ai', 'assistant', 'talk', 'conversation'],
    expenses: ['expenses', 'spending', 'costs', 'bills', 'transactions'],
    profile: ['profile', 'account', 'settings', 'user'],
    simulator: ['simulator', 'future', 'projection', 'forecast'],
    health: ['health', 'score', 'analysis', 'report'],
    schemes: ['schemes', 'opportunities', 'benefits', 'govt'],
    'tax-tips': ['tax', 'tips', 'advice', 'deductions'],
  },
  typing: ['type', 'write', 'enter', 'say', 'send', 'message'],
  scroll: ['scroll down', 'scroll up', 'scroll to top', 'scroll to bottom', 'page down', 'page up'],
  click: ['click', 'submit', 'press button', 'tap', 'enter'],
  transaction: {
    categories: ['food', 'travel', 'shopping', 'rent', 'utilities', 'entertainment', 'healthcare', 'education', 'transport', 'groceries', 'fuel', 'clothes', 'electronics', 'books', 'subscription'],
  },
};

const DEFAULT_SELECTORS: Record<string, string> = {
  submit: '#submit-btn',
  login: '#login-btn',
  save: '#save-btn',
  confirm: '#confirm-btn',
};

// Filler words to remove
const FILLER_WORDS = ['please', 'can you', 'hey', 'just', 'bro', 'dude', 'man', 'okay', 'ok', 'alright', 'sure', 'yeah', 'uh', 'um', 'like', 'so', 'well', 'actually', 'basically'];

/**
 * Clean and normalize command text
 */
export function cleanCommand(command: string): string {
  let cleaned = command.toLowerCase().trim();

  FILLER_WORDS.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    cleaned = cleaned.replace(regex, '');
  });

  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  return cleaned;
}

/**
 * Split command into multiple actions
 */
export function splitActions(command: string): string[] {
  const connectors = [' and ', ' then ', ', '];
  let actions = [command];

  connectors.forEach(connector => {
    actions = actions.flatMap(action => action.split(connector));
  });

  return actions.map(action => action.trim()).filter(action => action.length > 0);
}

/**
 * Detect navigation intent and extract page
 */
function detectNavigation(action: string): { type: 'navigate'; page: string } | null {
  for (const [page, keywords] of Object.entries(KEYWORD_GROUPS.navigation)) {
    for (const keyword of keywords) {
      if (action.includes(keyword)) {
        return { type: 'navigate', page };
      }
    }
  }
  return null;
}

/**
 * Detect typing intent and extract text
 */
function detectTyping(action: string): { type: 'type'; text: string } | null {
  for (const keyword of KEYWORD_GROUPS.typing) {
    const keywordIndex = action.indexOf(keyword);
    if (keywordIndex !== -1) {
      const text = action.substring(keywordIndex + keyword.length).trim();
      if (text) {
        return { type: 'type', text };
      }
    }
  }
  return null;
}

/**
 * Detect scroll intent and extract direction
 */
function detectScroll(action: string): { type: 'scroll'; direction: 'up' | 'down' | 'top' | 'bottom' } | null {
  const normalized = action.replace(/\s+/g, ' ').trim().toLowerCase();
  if (!normalized.includes('scroll') && !normalized.includes('page') && !normalized.includes('up') && !normalized.includes('down')) return null;

  if (/\b(scroll|page)\b.*\b(down)\b|\b(down)\b.*\b(scroll|page)\b/.test(normalized)) {
    return { type: 'scroll', direction: 'down' };
  }
  if (/\b(scroll|page)\b.*\b(up)\b|\b(up)\b.*\b(scroll|page)\b/.test(normalized)) {
    return { type: 'scroll', direction: 'up' };
  }
  if (/\b(to top|top)\b/.test(normalized)) {
    return { type: 'scroll', direction: 'top' };
  }
  if (/\b(to bottom|bottom)\b/.test(normalized)) {
    return { type: 'scroll', direction: 'bottom' };
  }

  // if we have `down`/`up` in command even without explicit scroll keyword
  if (normalized.includes('down')) return { type: 'scroll', direction: 'down' };
  if (normalized.includes('up')) return { type: 'scroll', direction: 'up' };

  return null;
}

/**
 * Detect click/submit intent and infer selector
 */
function detectClick(action: string): { type: 'click'; action: string; selector?: string } | null {
  let matchesClick = false;

  for (const keyword of KEYWORD_GROUPS.click) {
    if (action.includes(keyword)) {
      matchesClick = true;
      break;
    }
  }

  if (!matchesClick) return null;

  const knownActions = ['logout', 'upgrade', 'login', 'submit'];
  const actionVerb = knownActions.find(k => action.includes(k));

  if (actionVerb) {
    return { type: 'click', action: actionVerb };
  }

  const selectorKey = Object.keys(DEFAULT_SELECTORS).find(key => action.includes(key));
  const selector = selectorKey ? DEFAULT_SELECTORS[selectorKey] : DEFAULT_SELECTORS.submit;

  return { type: 'click', action: 'click', selector };
}

/**
 * Detect navigation commands (next, back, continue)
 */
function detectQuizNavigation(action: string): { type: 'quizNav'; direction: 'next' | 'back' } | null {
  const normalized = action.toLowerCase();
  
  if (normalized.includes('next') || normalized.includes('continue') || normalized.includes('proceed')) {
    return { type: 'quizNav', direction: 'next' };
  }
  
  if (normalized.includes('back') || normalized.includes('previous') || normalized.includes('go back')) {
    return { type: 'quizNav', direction: 'back' };
  }
  
  return null;
}

/**
 * Detect confirm/submit intent
 */
function detectConfirm(action: string): { type: 'confirm' } | null {
  const normalized = action.toLowerCase();
  
  if (normalized.includes('confirm') && !normalized.includes('password') && !normalized.includes('confirm password')) {
    return { type: 'confirm' };
  }
  
  if (normalized.includes('submit') || normalized.includes('send')) {
    return { type: 'confirm' };
  }
  
  return null;
}

/** * Detect onboarding/signup intent (get started, register, signup)
 */
function detectGetStarted(action: string): { type: 'getstarted'; variant: 'free' | 'pro' } | null {
  const normalized = action.toLowerCase();
  
  if (normalized.includes('get started') || normalized.includes('started') || normalized.includes('sign up') || normalized.includes('signup') || normalized.includes('register')) {
    // Check if user specified pro/premium
    if (normalized.includes('pro') || normalized.includes('premium')) {
      return { type: 'getstarted', variant: 'pro' };
    }
    return { type: 'getstarted', variant: 'free' };
  }
  
  return null;
}

/**
 * Detect login intent
 */
function detectLogin(action: string): { type: 'login' } | null {
  const normalized = action.toLowerCase();
  
  if (normalized.includes('login') || normalized.includes('log in') || normalized.includes('sign in') || normalized.includes('signin')) {
    return { type: 'login' };
  }
  
  return null;
}

/**
 * Detect deep/sub-navigation (schemes sections and similar)
 */
function detectSubNavigate(action: string): { type: 'subNavigate'; section: string; subSection?: string } | null {
  const normalized = action.toLowerCase();

  if (normalized.includes('government') || normalized.includes('savings') || normalized.includes('scheme')) {
    const section = normalized.includes('government') ? 'government' : 'schemes';
    const subSection = normalized.includes('savings') ? 'savings' : undefined;

    return { type: 'subNavigate', section, subSection };
  }

  return null;
}

/**
 * Detect form fill intent
 */
function detectFill(action: string): Array<{ type: 'fill'; field: string; value: string }> | null {
  const normalized = action.toLowerCase();
  if (!normalized.includes('fill') && !normalized.includes('email') && !normalized.includes('password') && !normalized.includes('name') && !normalized.includes('confirm')) return null;

  const results: Array<{ type: 'fill'; field: string; value: string }> = [];

  // Detect name field (e.g., "fill name John Doe" or "name John Doe")
  const nameMatch = action.match(/(?:fill\s+)?name\s+([^,;]+?)(?:\s+and\s+|,|;|$)/i) || action.match(/^name\s+(.+)$/i);
  if (nameMatch) {
    results.push({ type: 'fill', field: 'name', value: nameMatch[1].trim() });
  }

  // Detect email field
  const emailMatch = action.match(/(?:fill\s+)?email\s*[:=]?\s*([^\s,;]+)/i) || action.match(/([^\s@]+@[^\s@]+\.[^\s@]+)/);
  if (emailMatch) {
    results.push({ type: 'fill', field: 'email', value: emailMatch[1].trim() });
  }

  // Detect password field
  const passwordMatch = action.match(/(?:fill\s+)?password\s*[:=]?\s*([^\s,;]+)/i);
  if (passwordMatch && !action.toLowerCase().includes('confirm')) {
    results.push({ type: 'fill', field: 'password', value: passwordMatch[1].trim() });
  }

  // Detect confirm password field
  const confirmMatch = action.match(/(?:fill\s+)?(?:confirm\s+)?password\s*[:=]?\s*([^\s,;]+)/i) || action.match(/confirm\s*[:=]?\s*([^\s,;]+)/i);
  if (confirmMatch && (action.toLowerCase().includes('confirm') || action.toLowerCase().includes('confirm password'))) {
    results.push({ type: 'fill', field: 'confirmPassword', value: confirmMatch[1].trim() });
  }

  if (results.length > 0) return results;

  return null;
}

/**
 * Detect transaction intent and extract amount/category/mode
 */
function detectAddTransaction(action: string): { type: 'add_transaction'; amount: number; category: string; mode: 'credit' | 'debit' } | null {
  const transactionKeywords = ['add', 'spend', 'expense', 'transaction', 'buy', 'purchase'];
  if (!transactionKeywords.some(keyword => action.includes(keyword))) return null;

  const numberMatch = action.match(/(\d+(?:\.\d+)?)/);
  if (!numberMatch) return null;

  const amount = parseFloat(numberMatch[1]);

  let mode: 'credit' | 'debit' = 'debit';
  if (/(income|credit|salary)/.test(action)) mode = 'credit';
  if (/(expense|debit)/.test(action)) mode = 'debit';

  let category = 'misc';
  for (const cat of KEYWORD_GROUPS.transaction.categories) {
    if (action.includes(cat)) {
      category = cat;
      break;
    }
  }

  if (category === 'misc') {
    const words = action.split(' ');
    const numberIndex = words.findIndex(word => word.includes(numberMatch[1]));
    if (numberIndex !== -1 && numberIndex + 1 < words.length) {
      const candidate = words[numberIndex + 1];
      if (!['rupees', 'rs', 'dollars', 'bucks', 'for', 'on', 'at', 'to'].includes(candidate.toLowerCase())) {
        category = candidate;
      }
    }
  }

  return { type: 'add_transaction', amount, category, mode };
}

/**
 * Interpret a single action/command
 */
function interpretSingleAction(action: string): any {
  const fill = detectFill(action);
  if (fill && fill.length > 0) return fill;

  // Check for quiz navigation
  const quizNav = detectQuizNavigation(action);
  if (quizNav) return quizNav;

  // Check for login and get started
  const login = detectLogin(action);
  if (login) return login;

  const getstarted = detectGetStarted(action);
  if (getstarted) return getstarted;

  const confirm = detectConfirm(action);
  if (confirm) return confirm;

  const detectors = [detectScroll, detectClick, detectTyping, detectAddTransaction, detectSubNavigate, detectNavigation];

  for (const detect of detectors) {
    const result = detect(action);
    if (result) return result;
  }

  // Fallback: treat any unmatched text as a 'type' action
  if (action.trim().length > 0) {
    return { type: 'type', text: action };
  }

  return { type: 'unknown', raw: action };
}

/**
 * Main command interpreter function
 */
export function interpretCommand(command: string): { actions: any[] } {
  console.log('VOICE COMMAND:', command);
  const cleanedCommand = cleanCommand(command);
  const actionStrings = splitActions(cleanedCommand);

  const actions = actionStrings.flatMap(action => {
    const result = interpretSingleAction(action);
    return Array.isArray(result) ? result : [result];
  }).filter(Boolean);

  console.log('ACTIONS:', actions);
  return { actions };
}

/**
 * Return all visible scrollable elements for manual voice scrolling.
 */
function getScrollableElements(): HTMLElement[] {
  const candidates = Array.from(document.querySelectorAll<HTMLElement>('*'));

  return candidates.filter((el) => {
    if (!(el instanceof HTMLElement)) return false;
    const rect = el.getBoundingClientRect();
    if (rect.height === 0 || rect.width === 0) return false;

    const style = window.getComputedStyle(el);
    if (!/(auto|scroll|overlay)/.test(style.overflowY || '')) return false;

    return el.scrollHeight > el.clientHeight;
  });
}

/**
 * Find the best scroll container for the app.
 */
function findScrollContainer(): HTMLElement | null {
  const selectors = ['.overflow-y-auto', '.overflow-auto', '.overflow-scroll', '.scrollable', 'main', '.app-container', 'body', 'html'];

  // Prefer an explicitly configured scroll container with the most scrollable content.
  let best: HTMLElement | null = null;
  let maxScrollDelta = 0;

  const consider = (el: HTMLElement | null) => {
    if (!el) return;
    if (el.scrollHeight <= el.clientHeight) return;

    const delta = el.scrollHeight - el.clientHeight;
    if (delta > maxScrollDelta) {
      maxScrollDelta = delta;
      best = el;
    }
  };

  for (const selector of selectors) {
    consider(document.querySelector<HTMLElement>(selector));
  }

  // Fallback: capture any scrollable element in the DOM with overflow styles.
  if (!best) {
    const scrollables = getScrollableElements();
    scrollables.forEach((el) => consider(el));
  }

  if (best) return best;

  const docEl = (document.scrollingElement as HTMLElement | null) || document.documentElement || document.body;
  return docEl instanceof HTMLElement ? docEl : null;
}

/**
 * Execute actions
 */
export function executeActions(actions: any[], onNavigate?: (page: string) => void, onAddTransaction?: (amount: number, category: string, mode: 'credit' | 'debit') => void, onType?: (text: string) => void, onScroll?: (direction: string) => void, onSubNavigate?: (detail: { section: string; subSection?: string }) => void, onLogout?: () => void, onUpgrade?: () => void) {
  if (!actions || actions.length === 0) {
    console.log('Voice command not understood or no actions found.');
    return;
  }

  console.log('EXECUTE ACTIONS:', actions);

  actions.forEach(action => {
    switch (action.type) {
      case 'navigate':
        onNavigate?.(action.page);
        console.log(`Navigating to: ${action.page}`);
        break;
      case 'type':
        onType?.(action.text);
        window.dispatchEvent(new CustomEvent('voiceType', { detail: action.text }));
        console.log(`Typing: ${action.text}`);
        break;
      case 'scroll':
        if (onScroll) {
          onScroll(action.direction);
        } else {
          const container = findScrollContainer();
          const delta = action.direction === 'down' ? 500 : -500;

          if (container) {
            if (action.direction === 'top') {
              container.scrollTo({ top: 0, behavior: 'smooth' });
            } else if (action.direction === 'bottom') {
              container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
            } else {
              container.scrollBy({ top: delta, behavior: 'smooth' });
            }
          }

          // Always also attempt to scroll window to ensure screen move.
          if (action.direction === 'top') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          } else if (action.direction === 'bottom') {
            window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
          } else {
            window.scrollBy({ top: delta, behavior: 'smooth' });
          }
        }
        console.log(`Scrolling ${action.direction}`);
        break;
      case 'click':
        if (action.action === 'logout') {
          onLogout?.();
        } else if (action.action === 'upgrade') {
          onUpgrade?.();
        } else if (action.action === 'submit') {
          document.querySelector('#submit-btn')?.click();
        } else if (action.action === 'login') {
          document.querySelector('#login-btn')?.click();
        } else if (action.selector) {
          document.querySelector(action.selector)?.click();
        }
        console.log(`Click action: ${action.action || action.selector}`);
        break;
      case 'subNavigate':
        onSubNavigate?.({ section: action.section, subSection: action.subSection });
        window.dispatchEvent(new CustomEvent('subNavigate', { detail: { section: action.section, subSection: action.subSection } }));
        console.log(`Sub-navigate to ${action.section}${action.subSection ? '/' + action.subSection : ''}`);
        break;
      case 'fill':
        // Use onType callback for better form handling
        if (onType) {
          onType(`${action.field} ${action.value}`);
        } else {
          // Fallback to DOM manipulation
          const selector = action.field === 'email' ? '#email' : action.field === 'password' ? '#password' : action.field === 'name' ? '#fullName' : action.field === 'confirmPassword' ? '#confirmPassword' : `#${action.field}`;
          const inputEl = document.querySelector<HTMLInputElement>(selector);
          if (inputEl) {
            inputEl.value = action.value;
            inputEl.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }
        console.log(`Fill ${action.field}: ${action.value}`);
        break;
      case 'add_transaction':
        onAddTransaction?.(action.amount, action.category, action.mode);
        console.log(`Adding transaction: ₹${action.amount} ${action.mode} for ${action.category}`);
        break;
      case 'login':
        onNavigate?.('login');
        console.log('Login command executed');
        break;
      case 'getstarted':
        if (action.variant === 'pro') {
          onNavigate?.('get started pro');
        } else {
          onNavigate?.('get started');
        }
        console.log(`Get started command executed (${action.variant})`);
        break;
      case 'confirm':
        // Click the submit button
        const submitBtn = document.querySelector('button[type="submit"]');
        if (submitBtn) {
          (submitBtn as HTMLButtonElement).click();
          console.log('Form submitted via voice command');
        } else {
          console.log('Submit button not found');
        }
        break;
      case 'quizNav':
        if (action.direction === 'next') {
          onNavigate?.('next');
        } else if (action.direction === 'back') {
          onNavigate?.('back');
        }
        console.log(`Quiz navigation: ${action.direction}`);
        break;
      default:
        console.log('Not understood action:', action);
    }
  });
}
