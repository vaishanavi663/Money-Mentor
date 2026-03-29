<div align="center">

# 💰 Money Mentor — Finance Management

### *Your AI-powered money companion for India*

![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Node](https://img.shields.io/badge/Node-Express-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Gemini](https://img.shields.io/badge/Google_Gemini-AI-4285F4?style=for-the-badge&logo=google&logoColor=white)

<br />

**Plan · Track · Invest · Simulate** — all in one beautiful dashboard.

[Features](#-features) · [Architecture](#-architecture) · [Quick start](#-quick-start) · [Environment](#-environment-variables)

</div>

---

## ✨ Highlights

| | |
|:---:|:---|
| 🧠 | **AI chat** tuned for Indian money — English, Hindi, or Hinglish |
| 📊 | **Live dashboard** with charts, categories, and month trends |
| 🎤 | **Voice assistant** (Pro) — replies match the language you speak |
| 📱 | **UPI / bank SMS import** — paste SMS, parse, save to your ledger |
| 🎯 | **Money health score**, goals, risk profile, and personalised “next move” |
| 🔮 | **Future simulator** (Pro) — stress-test savings and goals |

---

## 🎨 Feature tour

<details>
<summary><strong>🖥️ Dashboard & insights</strong></summary>

- Time-based greeting, net income/expense cards, pie & bar charts  
- **Financial status strip** and **dynamic “Your next financial move”** from your profile + real transactions  
- Latest transactions list  

</details>

<details>
<summary><strong>💬 AI & voice</strong></summary>

- **Money Mentor** chat with your real numbers (income, expenses, goals, this month’s spend)  
- **Voice assistant** (Pro): Web Speech API + Gemini; language-aware replies and TTS  

</details>

<details>
<summary><strong>📒 Money tools</strong></summary>

- **Expenses** — categories, limits, tips tied to your profile  
- **Tax tips** — dashboard cards + full page  
- **Schemes & opportunities**  
- **Bad decision detector** & **impact feed** (Pro)  
- **Onboarding quiz** after signup (age, income, expenses, goals, risk)  

</details>

<details>
<summary><strong>🔐 Accounts & plans</strong></summary>

- Register / login with JWT sessions  
- **Free** vs **Pro** (simulator, voice, extended chat, PDF export, SMS sync messaging, etc.)  

</details>

---

## 🏗️ Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                     React + Vite (frontend)                  │
│   Tailwind · shadcn/ui · Recharts · TanStack Query · Motion  │
└──────────────────────────┬──────────────────────────────────┘
                           │ REST + Bearer JWT
┌──────────────────────────▼──────────────────────────────────┐
│                  Express 5 (backend/server)                  │
│        Auth · Profile · Transactions · AI (Gemini)             │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                      PostgreSQL                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick start

### Prerequisites

- **Node.js** 18+ and **npm** 10+  
- **PostgreSQL** 14+ (local or hosted, e.g. Neon / Supabase / Railway)  
- **Google AI Studio** API key for Gemini ([get a key](https://aistudio.google.com/apikey))  

### 1️⃣ Clone & install

```bash
git clone <your-repo-url>
cd "Finance Management Website"
npm install
```

This installs **root** + **frontend** + **backend** workspaces.

### 2️⃣ Database

Create a database (example name: `finance_management`), then either:

- set `DATABASE_URL`, **or**  
- set `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_SSL`  

The server runs migrations on startup when possible; you can also run:

```bash
npm run migrate -w backend
```

### 3️⃣ Backend environment

Create **`backend/.env`** (never commit real secrets):

```env
PORT=4000

# Option A — single URL
# DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/finance_management

# Option B — separate fields (local example)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=finance_management
DB_USER=postgres
DB_PASSWORD=your_password
DB_SSL=false

GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash
```

### 4️⃣ Run the app

**Terminal A — API**

```bash
npm run server
```

**Terminal B — frontend**

```bash
npm run dev
```

Open the URL Vite prints (usually **http://localhost:5173**).

**Frontend API base** — copy `frontend/.env.example` to `frontend/.env` if needed:

| `VITE_API_URL` | When to use |
|:---------------|:------------|
| `http://localhost:4000/api` | Browser calls Express directly (CORS must allow your dev origin). |
| `/api` | Vite dev server proxies `/api` → `http://localhost:4000` (see `vite.config.ts`). |

Default in code is `http://localhost:4000/api` if unset.

### 5️⃣ Production build (frontend)

```bash
npm run build
```

Output is under `frontend/dist` — serve with any static host; ensure the API is reachable and CORS is configured for your domain.

---

## 🔧 Environment variables

| Variable | Where | Purpose |
|:---------|:------|:--------|
| `PORT` | backend | API port (default `4000`) |
| `DATABASE_URL` *or* `DB_*` | backend | Postgres connection |
| `GEMINI_API_KEY` | backend | AI chat & voice |
| `GEMINI_MODEL` | backend | Optional model override |
| `VITE_API_URL` | frontend | API base URL (must end with `/api`) |

---

## 📁 Project layout

```text
Finance Management Website/
├── frontend/          # Vite + React app (src/app, components, hooks)
├── backend/
│   ├── server/        # Express entry & routes (index.js, helpers)
│   └── scripts/       # Migrations
├── package.json       # workspaces: dev, build, server
└── README.md
```

---

## 🛡️ Security notes

- Keep **`backend/.env`** out of git (use `.gitignore`).  
- Rotate any key that was ever committed or shared.  
- Use strong passwords and SSL (`DB_SSL=true`) for production databases.  

---

## 🤝 Contributing

Issues and PRs are welcome. Please keep changes focused, match existing code style, and avoid committing secrets.

---

## 📄 License

Private / personal project unless you add an explicit license file.

---

<div align="center">

**Built with 💚 for smarter everyday money decisions in India**

🌿 · 📈 · 🏠 · ✈️

</div>
