# ⚡ PULSE | Advanced Gym Workout & Progressive Overload Tracker

[![Next.js](https://img.shields.io/badge/Next.js-16.3-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2-20232A?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma-6.19-2D3748?style=for-the-badge&logo=prisma)](https://www.prisma.io/)
[![Dexie.js](https://img.shields.io/badge/Dexie.js-4.4_Offline_First-10B981?style=for-the-badge)](https://dexie.org/)
[![Auth.js](https://img.shields.io/badge/Auth.js-NextAuth_v5-black?style=for-the-badge&logo=next.js)](https://authjs.dev/)
[![Neon Postgres](https://img.shields.io/badge/PostgreSQL-Neon_Serverless-00E599?style=for-the-badge&logo=postgresql)](https://neon.tech/)

> **A modern, offline-first Progressive Web App (PWA) designed for serious lifters.** Track workouts on the gym floor with zero lag, visualize anatomical execution with 870+ exercise diagrams, calculate 1RM PRs in real-time, and seamlessly sync across devices.

🌐 **Live Demo:** [https://gym-progress-tracker-snowy.vercel.app](https://gym-progress-tracker-snowy.vercel.app)

---

## 🌟 Key Highlights & Philosophy

- **Zero-Latency Gym Floor Engine:** Optimistic updates powered by local IndexedDB (`Dexie.js`). Every weight increment, set completion, and rep logged happens instantaneously with zero network delays.
- **100% Offline-First PWA:** Operates flawlessly in basement gym dead zones or airplane mode. Background outbox queue automatically syncs mutations to Neon PostgreSQL when reconnected.
- **870+ Anatomical Exercise Library:** Sourced with high-resolution Start and Finish diagrams, target muscle highlights, biomechanical execution cues, and Brzycki 1RM progression sparklines.
- **Precision PR & 1RM Engine:** Automated Brzycki formula calculations detect all-time personal records on completed sets, triggering celebratory haptic and audio feedback.
- **Unified Daily Body Weight Tracking:** Quick-log daily morning weigh-ins, compute 7-day rolling averages, and monitor lean-mass trends.

---

## 📱 Features

### 1. ⚡ Active Gym Floor Execution (`/workout/active`)
- **Ghost Sets:** View your exact weights and reps from the previous session directly under each set input for easy progressive overload pacing.
- **Drift-Free Rest Timer:** Background-resilient stopwatch with audio chimes and quick-add controls (`+30s`, `Skip`).
- **Comprehensive Set Types:** Dedicated badges and workflows for `NORMAL`, `WARMUP`, `DROPSET`, and `FAILURE` sets.
- **Anatomical Form Preview:** Tap any exercise thumbnail during a live session to open an instant full-screen drawer showing Start/Finish positions and active muscle highlights.

### 2. 📚 870+ Exercise Catalog (`/exercises`)
- **Instant Search & Multi-Filter Engine:** Filter by targeted muscle group (`Chest`, `Back`, `Shoulders`, `Quadriceps`, `Hamstrings`, `Biceps`, `Triceps`, `Core`, `Glutes`, `Calves`) and equipment type (`Barbell`, `Dumbbell`, `Cable`, `Machine`, `Bodyweight`).
- **Exercise Detail Drawer:** Inspect movement biomechanics, lifetime volume, maximum recorded weight, and 1RM curve progression.
- **Custom Exercise Builder:** Create customized movements with custom muscle attribution and equipment categories.

### 3. 📈 Training Analytics & Interactive Calendar (`/history` & `/analytics`)
- **Session Inspector:** Drill down into any past completed session with total tonnage, set breakdown, duration, and PR badges.
- **Training Frequency Heatmap:** GitHub-style calendar matrix tracking monthly workout consistency.
- **Data Portability:** Full JSON export and backup restoration utility to keep your data truly sovereign.

### 4. ⚖️ Daily Body Weight Tracker
- Log weight with one tap on the dashboard.
- Unit toggling between Metric (`kg`) and Imperial (`lbs`).
- Clean 7-day rolling average to eliminate water-weight fluctuations.

### 5. 📶 Offline PWA & Cloud Synchronization
- Dedicated `exercise-images-v1` and `pulse-gym-v4` cache buckets via custom Service Worker (`public/sw.js`).
- Resilient background retry queue ensures no logged sets are ever dropped.
- Google OAuth login via Auth.js (NextAuth v5 beta) with `@auth/prisma-adapter`.

---

## 🏗️ Architecture & Data Flow

```text
┌─────────────────────────────────────────────────────────────┐
│                    Client (PWA / Browser)                   │
│                                                             │
│   React 19 UI  ──►  Zustand Store  ──►  Dexie.js (IndexedDB)│
│        ▲                                       │            │
│        │                                       ▼            │
│   Service Worker  ◄── Cache-First ───  Outbox Sync Queue    │
└────────────────────────────────────────────────┬────────────┘
                                                 │
                                           HTTPS Sync
                                                 │
                                                 ▼
┌─────────────────────────────────────────────────────────────┐
│                 Next.js 16 App Router Backend               │
│                                                             │
│   /api/workouts/sync   ──►   Prisma ORM   ──►   Neon Postgres
│   /api/exercises                                 (PostgreSQL)
│   /api/auth/[...nextauth]                                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

| Domain | Technology | Description |
|---|---|---|
| **Framework** | Next.js 16 (App Router) | React 19 Server & Client Components with Turbopack |
| **Language** | TypeScript | Strict end-to-end type safety |
| **Styling** | Tailwind CSS v4 | High-contrast dark gym theme (`zinc-950`, `emerald-400`) |
| **Client Database** | Dexie.js v4 | High-speed IndexedDB wrapper for offline storage |
| **Cloud Database** | PostgreSQL via Neon | Serverless cloud PostgreSQL instance |
| **ORM** | Prisma v6 | Schema modeling, migrations, and database querying |
| **Authentication** | Auth.js (NextAuth v5) | Secure Google OAuth with Prisma Adapter |
| **State Management**| Zustand v5 | Lightweight active workout session engine |
| **PWA & Offline** | Custom Service Worker | Cache-First for diagrams, Stale-While-Revalidate for shell |
| **Icons & Media** | Lucide React | Modern visual iconography |

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** >= 20.x
- **npm** or **pnpm**
- A free **Neon PostgreSQL** database (or any PostgreSQL instance)

### 1. Clone & Install
```bash
git clone https://github.com/siyam-io/gym-progress-tracker.git
cd gym-progress-tracker
npm install
```

### 2. Configure Environment Variables
Create a `.env` (or `.env.local`) file in the project root:

```env
# Neon PostgreSQL Database Connection
DATABASE_URL="postgresql://user:password@ep-sample-pooler.us-east-1.aws.neon.tech/gym_tracker?sslmode=require"

# Auth.js / NextAuth v5
AUTH_SECRET="your-generated-random-auth-secret" # Run: openssl rand -base64 32
AUTH_URL="http://localhost:3000"

# Google OAuth Credentials (Google Cloud Console)
AUTH_GOOGLE_ID="your-google-client-id.apps.googleusercontent.com"
AUTH_GOOGLE_SECRET="your-google-client-secret"
```

### 3. Database Initialization & Seeding
```bash
# Push schema to PostgreSQL database and generate Prisma Client
npx prisma db push
npx prisma generate

# Seed 870+ exercises with anatomical diagrams from free-exercise-db
npm run seed:exercises
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📜 Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Starts Next.js development server with Turbopack |
| `npm run build` | Generates Prisma client and creates production build |
| `npm run start` | Starts Next.js production server |
| `npm run lint` | Runs ESLint check across all routes and components |
| `npm run seed:exercises`| Fetches and seeds 870+ exercises into PostgreSQL and local JSON |
| `npm run db:clean` | Wipes user sessions and workouts for a clean database start |

---

## 🌐 Deploying to Vercel

1. Push your code to GitHub.
2. Import the repository in [Vercel](https://vercel.com/new).
3. In **Project Settings -> Environment Variables**, add:
   - `DATABASE_URL`
   - `AUTH_SECRET`
   - `AUTH_GOOGLE_ID`
   - `AUTH_GOOGLE_SECRET`
   - `AUTH_URL` (set to your Vercel deployment URL, e.g., `https://your-domain.vercel.app`)
4. In [Google Cloud Console](https://console.cloud.google.com/), add your production redirect URI:
   `https://<your-vercel-domain>/api/auth/callback/google`
5. Click **Deploy**. Build and deployment will run automatically with Prisma client generation.

---

## 🛡️ License & Acknowledgements

- **License:** Distributed under the MIT License.
- **Exercise Dataset:** Exercise diagrams and biomechanical cues adapted from [yuhonas/free-exercise-db](https://github.com/yuhonas/free-exercise-db).
- **Icons:** Designed with [Lucide React](https://lucide.dev/).

---

Made with passion for athletes and lifters striving for progressive overload. 💪
