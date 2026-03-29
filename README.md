<div align="center">

```
███╗   ███╗ ██████╗ ███╗   ██╗███████╗██╗   ██╗
████╗ ████║██╔═══██╗████╗  ██║██╔════╝╚██╗ ██╔╝
██╔████╔██║██║   ██║██╔██╗ ██║█████╗   ╚████╔╝ 
██║╚██╔╝██║██║   ██║██║╚██╗██║██╔══╝    ╚██╔╝  
██║ ╚═╝ ██║╚██████╔╝██║ ╚████║███████╗   ██║   
╚═╝     ╚═╝ ╚═════╝ ╚═╝  ╚═══╝╚══════╝   ╚═╝   
                                                 
███╗   ███╗███████╗███╗   ██╗████████╗ ██████╗ ██████╗ 
████╗ ████║██╔════╝████╗  ██║╚══██╔══╝██╔═══██╗██╔══██╗
██╔████╔██║█████╗  ██╔██╗ ██║   ██║   ██║   ██║██████╔╝
██║╚██╔╝██║██╔══╝  ██║╚██╗██║   ██║   ██║   ██║██╔══██╗
██║ ╚═╝ ██║███████╗██║ ╚████║   ██║   ╚██████╔╝██║  ██║
╚═╝     ╚═╝╚══════╝╚═╝  ╚═══╝   ╚═╝    ╚═════╝ ╚═╝  ╚═╝
```

### 🇮🇳 India's AI-Powered Personal Finance Companion

<br/>

[![Made with React](https://img.shields.io/badge/React_18-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://postgresql.org)
[![Gemini AI](https://img.shields.io/badge/Gemini_2.5_Flash-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://deepmind.google/technologies/gemini/)
[![Android](https://img.shields.io/badge/Android-3DDC84?style=for-the-badge&logo=android&logoColor=white)](https://android.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org)

<br/>

> **"Mere paison ka kya hoga?"** — Stop asking. Start knowing.

<br/>

</div>

---

## 🚀 The Problem We're Solving

India has **500M+ smartphone users**, but most personal finance apps are built for the West — they don't understand UPI, bank SMS alerts, Indian tax rules (80C, 80D, HRA), or government schemes like PM Jan Dhan, Atal Pension Yojana, and Sukanya Samriddhi.

**Result?** Millions of Indians are financially flying blind.

**Money Mentor** changes that.

---

## ✨ What Is Money Mentor?

Money Mentor is a **full-stack, AI-powered personal finance web app** (with an Android shell) designed ground-up for Indian users. It combines:

- 🤖 **A conversational AI advisor** powered by Google Gemini 2.5 Flash
- 📱 **Automatic SMS transaction tracking** from your bank alerts
- 🧾 **Indian tax optimization tips** tailored to your spending
- 🏛️ **Government scheme discovery** you actually qualify for
- 📈 **Mutual fund insights** with live NAV data
- 💡 **Smart financial health scoring** and fire-age simulation

All in one app. All built for Bharat.

---

## 🎬 Demo

```
📱 Scan a QR → Auto-tracked as a UPI transaction
💬 Ask "How can I save more tax this year?" → AI replies with your exact numbers
📩 Bank SMS arrives → Parsed & categorized in seconds
```

> **Live Demo:** https://money-mentor-frontend.vercel.app

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                        CLIENT                           │
│  ┌──────────────────┐     ┌──────────────────────────┐  │
│  │  React 18 + Vite │     │  Capacitor Android Shell │  │
│  │  TypeScript SPA  │     │  (Native SMS Plugin)     │  │
│  └────────┬─────────┘     └─────────────┬────────────┘  │
└───────────│─────────────────────────────│───────────────┘
            │ HTTPS /api                  │ HTTPS /api
┌───────────▼─────────────────────────────▼───────────────┐
│                     BACKEND (Express 5)                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐   │
│  │Auth + JWT│  │Transact- │  │ Tax Tips │  │AI Chat │   │
│  │Sessions  │  │ions CRUD │  │ Engine   │  │Handler │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └───┬────┘   │
│       └─────────────┴─────────────┴────────────┘        │
│                          │                              │
│               ┌──────────▼──────────┐                   │
│               │    PostgreSQL DB    │                   │
│               └─────────────────────┘                   │
│                                                         │
│        ┌──────────────┐    ┌──────────────┐             │
│        │ Google Gemini│    │   mfapi.in   │             │
│        │  2.5 Flash   │    │  (MF + NAV)  │             │
│        └──────────────┘    └──────────────┘             │
└─────────────────────────────────────────────────────────┘
```

---

## 💎 Feature Deep-Dive

### 🧠 AI Money Advisor
Every conversation with the AI isn't generic — it's **loaded with your actual financial context**: your current month's income, expenses, savings rate, risk profile, investment goals, and top spending categories. You're not talking to a chatbot. You're talking to a personal CFO who knows your numbers.

```
User: "Should I invest in mutual funds this month?"
AI:   "Based on your ₹45,000 income and ₹32,000 expenses this month,
       you have a 28.8% savings rate. With your moderate risk profile
       and SIP in HDFC Flexi Cap, I'd suggest..."
```

- Voice mode with English / Hindi / Hinglish support
- Free tier: 10 messages/day | Pro: Unlimited
- Conversation history maintained per session

---

### 📩 SMS Auto-Import (Android)
The killer feature. No manual entry needed.

When a bank SMS arrives — `"Rs.450 debited from A/C XX1234 at SWIGGY UPI Ref: 4123..."` — Money Mentor's native **SmsPlugin** (Capacitor) intercepts it, parses it with regex heuristics for amount, merchant, type, UPI ref, and date, then **automatically categorizes and saves it** as a transaction. Bulk inbox import also supported.

---

### 📊 Indian Tax Intelligence
Built around the **Indian Financial Year (April–March)**:

- **Section 80C**: Tracks your investment spending toward the ₹1.5L limit
- **Section 80D**: Health insurance premiums detected via keyword matching
- **HRA**: Rent keywords flagged for home rent allowance claims
- Dismissed tips are remembered — no repeats

---

### 🏛️ Government Scheme Discovery
Surfaces real schemes you likely qualify for — PM Jan Dhan, Atal Pension Yojana, Sukanya Samriddhi, PMSBY — based on your income and profile. No more missing out.

---

### 🔒 Security Architecture
- **Passwords**: `scrypt`-hashed with per-user salt (no bcrypt shortcuts)
- **Sessions**: JWT + server-side `user_sessions` table with `jti`, token hash, and revoke-on-logout
- **No reuse**: Logged-out tokens are invalidated at the DB level — no stateless trust

---

### 📈 Future Simulator & Financial Health Score
- **Money Health Score**: Computed from savings rate, SIP presence, expense ratios
- **FIRE Age Calculator**: When can you retire? Based on your actual income and investments
- **Recommended SIP**: Personalized monthly investment suggestion
- **Estimated Tax Savings**: Based on your transaction patterns

---

## 🛠️ Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | React 18 + TypeScript + Vite 6 | Fast, type-safe, modern DX |
| Styling | Tailwind CSS 4 | Utility-first, zero dead CSS |
| UI | Radix UI + shadcn + MUI | Accessible, composable, beautiful |
| Data Fetching | TanStack Query v5 | Smart caching + background sync |
| Charts | Recharts | Lightweight, composable |
| Backend | Express 5 + Node.js (ESM) | Fast, minimal, standard |
| Database | PostgreSQL + `pg` pool | Reliable, powerful, relational |
| Auth | JWT + `user_sessions` table | Stateful security |
| AI | Google Gemini 2.5 Flash | State-of-the-art, cost-effective |
| Android | Capacitor 8 | Web → Native bridge, zero rewrite |
| MF Data | mfapi.in | Free, reliable Indian MF NAV API |

---

## 📦 Project Structure

```
money-mentor/
├── frontend/                  # React 18 SPA (Vite)
│   ├── src/
│   │   ├── components/        # Feature components
│   │   │   ├── AIChat.tsx     # Gemini chat interface
│   │   │   ├── Dashboard.tsx  # Main dashboard
│   │   │   ├── TaxTips.tsx    # Tax optimization UI
│   │   │   └── ui/            # shadcn-style primitives
│   │   ├── hooks/             # useTransactions, usePlan, useSmsAutoImport…
│   │   ├── context/           # UserProfileContext, ReplyLanguageContext
│   │   └── App.tsx            # App shell + routing
├── backend/
│   ├── index.js               # Express app entry + ensureSchema()
│   ├── routes/
│   │   ├── auth.js            # Register / Login / Logout / Me
│   │   ├── transactions.js    # CRUD + SMS parser
│   │   ├── ai.js              # Gemini chat endpoint
│   │   ├── taxTips.js         # Tax tip generation/dismissal
│   │   └── mf.js              # Mutual fund proxy
│   ├── profileHelpers.js      # Derived financial metrics
│   └── migrations/            # SQL migration files
├── capacitor.config.json      # Android app config
├── android/                   # Native Android project
└── package.json               # npm workspaces root
```

---

## ⚡ Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL 14+
- Google Gemini API Key ([Get one free](https://aistudio.google.com/))

### 1. Clone & Install
```bash
git clone https://github.com/your-username/money-mentor.git
cd money-mentor
npm install
```

### 2. Configure Environment
```bash
# backend/.env
DATABASE_URL=postgresql://user:pass@localhost:5432/moneymentor
JWT_SECRET=your-super-secret-key-change-in-production
GEMINI_API_KEY=your-gemini-api-key
PORT=4000

# frontend (optional)
VITE_API_URL=http://localhost:4000/api
```

### 3. Run Migrations
```bash
npm run migrate -w backend
```

### 4. Start Dev Servers
```bash
# Terminal 1 — Backend
npm run server

# Terminal 2 — Frontend
npm run dev
```

Visit **`http://localhost:5173`** 🎉

### 5. Build for Production
```bash
npm run build
```

### 6. Android (Optional)
```bash
npx cap sync android
npx cap open android
# Build & run from Android Studio
```

---

## 🗄️ Database Schema

```sql
users             → id, full_name, email, password_hash, plan, plan_expires_at
user_sessions     → id, user_id, jwt_id, token_hash, expires_at, revoked_at
transactions      → id, user_id, amount, type, merchant, category, 
                    upi_ref, source, raw_sms, transaction_date
user_profiles     → id, user_id, age, income, expenses, goals (JSONB),
                    current_investments (JSONB), risk_profile
tax_tips          → id, user_id, month, category, tip_text, dismissed_at
schema_migrations → filename, applied_at
```

---

## 🔌 API Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/health` | ❌ | DB health check |
| `POST` | `/api/auth/register` | ❌ | Create account |
| `POST` | `/api/auth/login` | ❌ | Login + JWT |
| `GET` | `/api/auth/me` | ✅ | Current user |
| `POST` | `/api/auth/logout` | ✅ | Revoke session |
| `GET/PUT` | `/api/profile` | ✅ | Financial profile |
| `GET` | `/api/stats` | ✅ | Monthly + 6-month trend |
| `GET/POST/DELETE` | `/api/transactions/*` | ✅ | Transaction CRUD |
| `POST` | `/api/transactions/parse-sms` | ✅ | Parse bank SMS text |
| `GET/POST` | `/api/tax-tips/*` | ✅ | Tax tips + dismiss |
| `POST` | `/api/ai/chat` | ✅ | AI conversation |
| `GET` | `/api/mf/search` | ✅ | Mutual fund search |
| `GET` | `/api/mf/top` | ✅ | Top funds + live NAV |

---

## 🗺️ Roadmap

- [ ] 🏦 Bank account OAuth integration (AA framework)
- [ ] 💳 Credit card statement PDF import
- [ ] 🔔 Spending alerts & budget breach notifications
- [ ] 📅 EMI & subscription tracker
- [ ] 🧮 Advanced tax filing assistant (ITR-1 prep)
- [ ] 👨‍👩‍👧 Family finance mode (multi-user household)
- [ ] 🌐 Hindi / regional language full UI

---

## ⚠️ Privacy & Compliance Notes

- **SMS Access**: Android READ_SMS permission is required for auto-import. Data is processed on-device before being sent to the backend over HTTPS.
- **AI Processing**: Financial summary data (aggregated totals, not raw transactions) is sent to Google Gemini. Review [Google's data policy](https://policies.google.com/).
- **Mutual Fund Data**: Sourced from [mfapi.in](https://mfapi.in/) — an independent third-party service.

---

## 🤝 Contributing

PRs are welcome! Please open an issue first to discuss major changes.

1. Fork the repo
2. Create your branch: `git checkout -b feature/your-feature`
3. Commit: `git commit -m "feat: add your feature"`
4. Push: `git push origin feature/your-feature`
5. Open a Pull Request

---

## 📄 License

MIT — free to use, modify, and distribute.

---

<div align="center">

**Built with ❤️ for Bharat 🇮🇳**

*Because every Indian deserves a smart money mentor in their pocket.*

<br/>

⭐ **Star this repo if Money Mentor helped you!** ⭐

</div>
