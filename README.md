# NicoNeco

A management platform for aggregating VPN proxy sources, defining rule-based routing, and distributing personalized Clash configs to users with tier-based access control.

## Architecture

```
frontend/          React + Vite + Tailwind CSS (admin dashboard)
backend/           Express + TypeScript + Firebase Admin SDK (API + subscription server)
design_ref/        Design system reference (colors, typography, components)
```

### How It Works

1. **Sources**: Add third-party subscription URLs or Marzban panel instances as proxy sources
2. **Tiers**: Create access tiers (Espresso/Latte/Free Bean) that control which sources each user can access
3. **Users**: Create users, assign them a tier, and give them a subscription URL
4. **Rules**: Define service categories (Streaming, Gaming, etc.) with domain/IP rules. Each becomes a selector proxy-group in Clash
5. **Subscription**: Users add `{host}/sub/{token}` to their Clash client. The server generates a personalized YAML config with only the proxies their tier allows

### Generated Clash Config Structure

```
proxy-groups:
  - Auto Best      (url-test: picks fastest proxy automatically)
  - Global         (select: master proxy selector)
  - Streaming      (select: Netflix, YouTube, Disney+, etc.)
  - Gaming         (select: Steam, Epic, Discord, etc.)
  - Social Media   (select: Twitter, Instagram, Telegram, etc.)
  - AI Services    (select: OpenAI, Claude, etc.)
  - Blocked Sites  (select: Google, GitHub, Wikipedia, etc.)
  - Developer      (select: npm, Docker, PyPI, etc.)
  - Fallback       (select: DIRECT by default, user can switch)

rules:
  LAN/private IPs        -> DIRECT
  Service category rules -> respective proxy-group
  GEOIP,CN              -> DIRECT
  MATCH                 -> Fallback
```

## Prerequisites

- Node.js 18+ and npm
- A Firebase project with:
  - Firestore database enabled
  - Google Authentication provider enabled
  - A service account key (JSON)
  - A web app with its config values

## Setup

### 1. Backend

```bash
cd backend
cp .env.example .env
# Edit .env with your settings

npm install
npm run seed    # Seeds default service categories and tiers
npm run dev     # Starts on http://localhost:3000
```

Place your Firebase service account JSON at `backend/firebase-service-account.json` (already gitignored).

### 2. Frontend

```bash
cd frontend
cp .env.example .env
# Fill in your Firebase web app config values

npm install
npm run dev     # Starts on http://localhost:5173
```

The Vite dev server proxies `/api` and `/sub` requests to the backend automatically.

### 3. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select the `nico-neco` project
3. Enable **Firestore Database** (production mode)
4. Enable **Authentication** > **Google** sign-in provider
5. Copy the web app config into `frontend/.env`

## API Endpoints

### Admin API (auth required)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/verify` | Verify Firebase token |
| GET/POST/PUT/DELETE | `/api/sources` | CRUD proxy sources |
| POST | `/api/sources/:id/test` | Test source connectivity |
| GET/POST/PUT/DELETE | `/api/tiers` | CRUD access tiers |
| GET/POST/PUT/DELETE | `/api/users` | CRUD subscription users |
| POST | `/api/users/:id/regenerate-token` | Reset subscription URL |
| GET/POST/PUT/DELETE | `/api/rules` | CRUD service categories |
| GET | `/api/rules/config/preview` | Preview generated Clash YAML |

### Public

| Method | Path | Description |
|--------|------|-------------|
| GET | `/sub/:token` | User subscription endpoint (returns Clash YAML) |
| GET | `/health` | Health check |

## Production Deployment

For production, build both projects and serve the frontend as static files or via a CDN:

```bash
cd backend && npm run build
cd frontend && npm run build
```

Set `CORS_ORIGIN` in backend `.env` to your frontend's production URL.
