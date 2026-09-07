# HabitForge — Project Summary (for AI Context / Handoff)

> **Purpose:** A single source of truth describing the current architecture, stack, file map, data model, API surface, deployment, and known issues of this project. Read this before working on the codebase.

---

## 1. What This Product Is

**HabitForge** is a habit-tracking SaaS web app. Users sign up, create daily/weekly/monthly habits, mark them complete, track streaks, earn XP/levels/badges, view analytics & reports, write weekly reflections, compete on a leaderboard, redeem XP for rewards, and get AI-powered recommendations + a habit coach chatbot. There is also a Fitness/step-tracking module (Google Fit) and browser-notification reminders.

It is positioned as a **real commercial product**, not a demo.

---

## 2. Architecture & Stack

This is a **fully independent MERN SaaS** (MongoDB + Express + React + Node). It was originally generated on Lovable (Supabase-based) and has been **deliberately migrated away from Supabase/Lovable Cloud** to a standalone MERN backend.

### Frontend
- React 18 + TypeScript + Vite 5
- Tailwind CSS v3 + shadcn/ui (Radix primitives)
- React Router v6 (client-side routing)
- TanStack React Query (query client present)
- Recharts (charts), date-fns (dates), sonner (toasts)
- lucide-react icons, next-themes (dark mode)
- **API layer:** all backend calls go through `src/lib/api.ts`, which reads `import.meta.env.VITE_API_URL` (centralized — never hardcode URLs). JWT stored in `localStorage` under key `habitforge_token`.

### Backend (`/backend`)
- Node.js + Express
- MongoDB via Mongoose 8 (Atlas connection string in `backend/.env`)
- JWT auth (`jsonwebtoken`) + `bcryptjs` password hashing
- `multer` for avatar file uploads → stored locally in `backend/uploads/`, served at `/uploads`
- `nodemailer` for password-reset email (optional; env-gated)
- AI integration: Gemini (preferred) or OpenAI, with **rule-based fallback** when no key is set

### Important platform note
The project still lives inside a Lovable workspace, which **auto-regenerates** a few Supabase-related files and `.env` entries on each sync (`src/integrations/supabase/client.ts`, `supabase/config.toml`, and the `VITE_SUPABASE_*` vars in `.env`). These are **unused orphan artifacts** — the app does not import or call Supabase at runtime. They reappear after every sync; deleting them is cosmetic, not functional. Do not treat their presence as evidence the app uses Supabase.

---

## 3. Repository Layout

```
/
├── .env                      # VITE_API_URL (+ auto-regen VITE_SUPABASE_* — ignore)
├── index.html                # <title>/meta — keep app-specific
├── package.json               # frontend deps (React/Vite/shadcn)
├── vite.config.ts            # has lovable-tagger componentTagger plugin
│
├── src/
│   ├── App.tsx               # Routes (BrowserRouter): /, /auth, /reset-password,
│   │                         #   /settings, /analytics, /reports, /rewards,
│   │                         #   /weekly-review, /fitness, /leaderboard, *
│   ├── main.tsx
│   ├── index.css             # Tailwind base + theme tokens (DO NOT hardcode colors)
│   │
│   ├── lib/
│   │   ├── api.ts            # ★ centralized API client (apiRequest + *Api objects)
│   │   ├── types.ts          # Habit/HabitLog/Profile/Rewards types, CATEGORY_CONFIG,
│   │   │                     #   XP_PER_COMPLETION=10, XP_PER_LEVEL=100, calculateLevel
│   │   └── utils.ts          # cn() etc.
│   │
│   ├── hooks/
│   │   ├── useAuth.ts        # JWT session (signUp/signIn/signOut/updateProfile)
│   │   ├── useHabits.ts      # fetch/create/update/delete/merge habits, toggle log, stats
│   │   ├── useRewards.ts     # XP/achievements
│   │   ├── useRedeemableRewards.ts
│   │   ├── useAnalytics.ts
│   │   ├── useHabitAutomation.ts
│   │   ├── useNotifications.ts # browser notification reminders
│   │   ├── useGoogleFit.ts     # Fitness/step tracking
│   │   ├── useTheme.ts
│   │   ├── use-mobile.tsx, use-toast.tsx
│   │
│   ├── components/           # AppLayout, AppSidebar, NavLink, ThemeToggle,
│   │                         # HabitCard, CreateHabitDialog, EditHabitDialog,
│   │                         # MergeHabitsDialog, HabitCalendar, HabitTemplates,
│   │                         # HabitChatbot, AIRecommendations, AIInsightChart,
│   │                         # AIMotivationalImage, HabitAutomationPanel,
│   │                         # AvatarUpload, BehindScheduleAlert,
│   │                         # StepGoalCard, StepStreakBadges, WeeklyStepStats,
│   │                         # MonthlyStepCalendar, ui/ (shadcn primitives)
│   │
│   └── pages/                # Index (dashboard), Auth, ResetPassword, Settings,
│                             # Analytics, Reports, Rewards, WeeklyReview,
│                             # Fitness, Leaderboard, NotFound
│
└── backend/
    ├── server.js             # Express app, CORS, middleware, route mounting, /health, DB connect
    ├── .env                  # PORT, MONGO_URI, JWT_SECRET, JWT_EXPIRES_IN, FRONTEND_URL, (optional AI keys)
    ├── middleware/
    │   ├── auth.js           # JWT verify → req.user, req.userId
    │   └── upload.js         # multer avatar upload config
    ├── models/               # User, Habit, HabitLog, Achievement, UserAchievement,
    │                         #   RedeemableReward, UserRedeemedReward, WeeklyReflection
    ├── routes/               # auth, habits, habitLogs, stats, rewards, reflections,
    │                         #   leaderboard, ai
    ├── utils/email.js        # nodemailer password-reset email
    ├── scripts/seed-achievements.js
    └── uploads/avatars/      # local avatar storage (served at /uploads)
```

---

## 4. Data Model (Mongoose)

| Model | Key fields |
|---|---|
| **User** | email (unique, lowercase), password (bcrypt-hashed), displayName, avatarUrl, xpPoints, level, resetPasswordToken, resetPasswordExpiry, timestamps. `toJSON()` strips password + reset fields. `comparePassword()`, `generateResetToken()` helpers. |
| **Habit** | userId (indexed), title, description, category, frequency, targetCount, color, reminderTime, reminderEnabled, timestamps. Index `{userId, createdAt}`. |
| **HabitLog** | habitId, userId, date (YYYY-MM-DD string), completed, notes, createdAt. **Unique** `{habitId, date}` → idempotent toggle. Index `{userId, date}`. |
| **Achievement** | name, description, icon, requirement_type (streak/completions/habits_created/days_active), requirement_value, xp_reward |
| **UserAchievement** | userId, achievementId, unlockedAt |
| **RedeemableReward** | name, description, xpCost, … |
| **UserRedeemedReward** | userId, rewardId, redeemedAt |
| **WeeklyReflection** | userId, weekStart, whatWorked, whatDidntWork, nextWeekFocus |

### Frontend↔Backend field mapping (snake_case ↔ camelCase)
The frontend types use snake_case (`user_id`, `habit_id`, `created_at`) — these are **mapped in `useHabits.ts`** from the camelCase Mongoose objects (`userId`, `habitId`, `createdAt`). When adding new fields, update both the Mongoose model and the mapping in `useHabits`.

---

## 5. API Surface (Express, all under `VITE_API_URL`)

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| POST | `/api/auth/register` | — | Create account → `{user, token}` |
| POST | `/api/auth/login` | — | Login → `{user, token}` |
| GET | `/api/auth/me` | JWT | Current user |
| PUT | `/api/auth/profile` | JWT | Update displayName/avatarUrl |
| PUT | `/api/auth/password` | JWT | Change password |
| POST | `/api/auth/forgot-password` | — | Email reset token |
| POST | `/api/auth/reset-password` | — | Reset with token |
| POST | `/api/auth/upload-avatar` | JWT | multer file upload |
| GET | `/api/habits/:userId` | — | List user's habits |
| POST | `/api/habits` | — | Create habit |
| PUT | `/api/habits/:id` | — | Update habit |
| DELETE | `/api/habits/:id` | — | Delete habit (+ its logs) |
| POST | `/api/habit-logs` | — | Toggle completion (idempotent) |
| GET | `/api/habit-logs/:userId` | — | User's logs |
| GET | `/api/habit-logs/habit/:habitId` | — | Habit's logs |
| GET | `/api/stats/:userId` | — | User statistics |
| GET | `/api/leaderboard` / `/api/stats/leaderboard/all` | — | Leaderboard |
| GET | `/api/rewards/user` | JWT | User's XP/level |
| PUT | `/api/rewards/xp` | JWT | Add XP |
| GET | `/api/rewards/achievements` | — | All achievements |
| GET | `/api/rewards/user-achievements` | JWT | User's achievements |
| POST | `/api/rewards/unlock-achievement` | JWT | Unlock |
| GET | `/api/rewards/redeemable` | — | Redeemable rewards |
| GET | `/api/rewards/user-redeemed` | JWT | User's redeemed |
| POST | `/api/rewards/redeem` | JWT | Redeem reward |
| GET/POST | `/api/reflections[/:weekStart]` | JWT | Weekly reflection CRUD |
| POST | `/api/ai/recommendations` | JWT | AI recommendations (Gemini/OpenAI/fallback) |
| POST | `/api/ai/chat` | JWT | Habit coach chat |
| POST | `/api/ai/automation` | JWT | Automation suggestions |
| POST | `/api/ai/generate-image` | JWT | Motivational image (OpenAI-gated) |
| GET | `/health` | — | Health check |

> ⚠️ **Security gap to be aware of:** habits/habit-logs/stats/leaderboard/rewards-list routes do **not** currently apply the `auth` middleware — they trust the `userId` in the path/body. The habit CRUD relies on the user passing their own `userId`. This is a known area to harden before multi-tenant production use.

### Auth flow
1. `login`/`register` returns a JWT → stored in `localStorage` as `habitforge_token`.
2. `apiRequest()` attaches `Authorization: Bearer <token>` to every call.
3. `useAuth()` calls `/api/auth/me` on mount to hydrate the session; clears token on failure.
4. AI routes and protected profile/reward routes use the `auth` middleware.

---

## 6. Frontend Data Flow

- **`useHabits`** is the core hook: fetches habits + logs from MERN, computes per-habit stats client-side (currentStreak, longestStreak, completionRate, missedDays, totalDays, completedToday), exposes create/update/delete/merge/toggle + `getUserCategory()` (consistent/improving/inconsistent).
- Streak/completion logic is **client-computed** from logs, not stored in DB — so the DB only stores raw `HabitLog` rows.
- `toggleHabitCompletion` awards XP (`rewardsApi.addXP(10)`) only when creating a today-log.
- `useRewards`, `useAnalytics`, `useHabitAutomation`, `useNotifications`, `useGoogleFit` are the other domain hooks.

---

## 7. Configuration & Environment

### Frontend `.env`
```
VITE_API_URL=https://habit-builder-9rfv.onrender.com
# (VITE_SUPABASE_* entries are auto-regen by Lovable — ignored at runtime)
```
- **`VITE_API_URL` must be set in the deployment host (Vercel dashboard env var), not just the repo `.env`** — Vercel only reads its own env vars at build time. This was the root cause of repeated "request failed / hitting localhost:5000" bugs.

### Backend `backend/.env`
```
PORT=5000
MONGO_URI=mongodb+srv://...@cluster0.../habitforge?retryWrites=true&w=majority
JWT_SECRET=...
JWT_EXPIRES_IN=7d
FRONTEND_URL=https://www.habitbuilder.co.in
# Optional: GEMINI_API_KEY, OPENAI_API_KEY
```

### CORS (`backend/server.js`)
Allowed origins: localhost dev ports, `habitbuilder.co.in` (+ www + subdomain regex), `habit-forge-smart.vercel.app`, and `habit-forge-smart-*.vercel.app` preview regex. CORS denies any other origin with a console warning. **Add new deployment domains here or requests will be blocked.**

---

## 8. Deployment

- **Frontend:** React/Vite static build, deployed on Vercel (repo: `github.com/panda0269/habit-forge-smart`). Domain: `habitbuilder.co.in` + `habit-forge-smart.vercel.app`. Requires `VITE_API_URL` Vercel env var.
- **Backend:** Node/Express, deployed on Render (service URL: `https://habit-builder-9rfv.onrender.com`). Needs `MONGO_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `FRONTEND_URL`, optional AI keys. Render auto-redeploys on git push.
- **DB:** MongoDB Atlas (cluster `cluster0.khf7iyg`).
- **Avatars:** local disk in `backend/uploads/avatars/` → served at `VITE_API_URL/uploads`. (For scale, migrate to S3/Cloudinary.)
- Lovable preview also exists (`id-preview--...lovable.app`) but it points at the same Render backend via `VITE_API_URL`.

---

## 9. Known Issues & Gotchas

1. **Recurring Supabase artifacts:** Lovable auto-regenerates `src/integrations/supabase/client.ts`, `supabase/config.toml`, and `VITE_SUPABASE_*` env lines on sync. They are unused; ignore them. If a build fails on `@supabase/supabase-js` not found, either delete the regen `client.ts` or keep the package installed.
2. **Hardcoded `localhost:5000`** has appeared in components before (e.g. `CreateHabitDialog.tsx` was fixed). Always route through `src/lib/api.ts` / `*Api` objects. Search the codebase before assuming it's gone.
3. **Vercel env var:** `VITE_API_URL` MUST be set in Vercel dashboard + redeployed, or production calls hit `localhost:5000` and fail with CORS/network errors.
4. **CORS allowlist:** adding a new frontend domain requires editing `allowedOrigins` in `backend/server.js` and redeploying Render.
5. **Missing auth on habit routes** — trust-the-`userId` pattern; harden before production.
6. **AI features** degrade to rule-based fallback when no `GEMINI_API_KEY`/`OPENAI_API_KEY` is set — that's expected, not a bug.
7. **Avatar URLs:** relative `/uploads/...` paths must be prefixed with `API_URL` via `getAvatarUrl()` in `api.ts`.

---

## 10. Conventions to Follow

- **Centralized API:** every fetch goes through `src/lib/api.ts` (`apiRequest` or the `*Api` helpers). No raw `fetch('http://...')` in components.
- **Field mapping:** backend = camelCase; frontend types = snake_case; bridge in `useHabits.ts`.
- **Theming:** use design tokens / shadcn variants in `src/index.css`; never hardcode `text-white`/`bg-[#hex]` in components.
- **Backend route files:** keep Express router style, `require()`/CommonJS, `module.exports`.
- **New Mongoose tables:** not applicable here (no Supabase RLS/GRANT) — just define the model and a route file, then mount it in `server.js`.
- **PRs/commits:** backend changes must be pushed to GitHub for Render to redeploy.

---

## 11. Quick "Where do I edit X?" cheat sheet

| Want to change… | Edit… |
|---|---|
| API base URL | `.env` (`VITE_API_URL`) + Vercel env var |
| Add a new API endpoint | `backend/routes/<area>.js` + mount in `backend/server.js` + add helper in `src/lib/api.ts` |
| Habit stats/streak logic | `src/hooks/useHabits.ts` (`calculateStats`) |
| Habit fields | `backend/models/Habit.js` + `src/lib/types.ts` (`Habit`) + mapping in `useHabits.ts` |
| Auth/user fields | `backend/models/User.js` + `useAuth.ts` (`User` interface) |
| Add a page | `src/pages/X.tsx` + route in `src/App.tsx` + nav link in `AppSidebar.tsx` |
| CORS / allowed domains | `backend/server.js` (`allowedOrigins`) |
| Theme colors/tokens | `src/index.css` |
| AI prompts/fallbacks | `backend/routes/ai.js` |
| Achievements seed | `backend/scripts/seed-achievements.js` (`npm run seed`) |
