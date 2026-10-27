# ContractGuard Frontend

This directory contains the two frontend applications for the ContractGuard platform:

1. **`landing/`** — The public marketing and informational website (runs on port **3000**).
2. **`web/`** — The ContractGuard web application featuring authentication, dashboard, policy studio, policy review, and repository management (runs on port **3001**).

---

## Architecture Overview

```
frontend/
├── landing/               # Next.js Landing Website (Port 3000)
│   ├── app/               # Landing pages (Home, Features, How It Works, Security, FAQ)
│   ├── components/        # Glassmorphic landing UI components
│   └── .env.example       # NEXT_PUBLIC_WEB_APP_URL placeholder
├── web/                   # Next.js Web Application (Port 3001)
│   ├── app/               # App routes (Login, Signup, Dashboard, Policies, Repositories)
│   ├── components/        # App shell, PolicyStudio, ReviewStudio, etc.
│   ├── lib/               # Types, API client, mock adapters
│   └── .env.example       # NEXT_PUBLIC_USE_MOCKS & NEXT_PUBLIC_API_BASE_URL
├── .gitignore             # Shared frontend git ignore rules
└── README.md              # Frontend monorepo documentation (this file)
```

---

## Quickstart

### 1. Landing Website

```bash
cd frontend/landing
npm install
npm run dev
```

- Accessible at: **http://localhost:3000**
- Pointing to Web App: configured via `NEXT_PUBLIC_WEB_APP_URL` (default: `http://localhost:3001`).

### 2. ContractGuard Web App

```bash
cd frontend/web
npm install
npm run dev
```

- Accessible at: **http://localhost:3001**
- Mock Mode: enabled by default (`NEXT_PUBLIC_USE_MOCKS=true`) for standalone frontend development.
- Backend Integration: set `NEXT_PUBLIC_USE_MOCKS=false` and configure `NEXT_PUBLIC_API_BASE_URL` (e.g. `http://localhost:8000/api`).

---

## Scripts Reference

| Application | Dev Command (`npm run dev`) | Build Command (`npm run build`) | Port |
| :--- | :--- | :--- | :--- |
| **Landing Website** | `next dev -p 3000` | `next build` | `3000` |
| **Web Application** | `next dev -p 3001` | `next build` | `3001` |

---

## Environment Variables

### Landing (`frontend/landing/.env.local`)
| Variable | Default | Purpose |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_WEB_APP_URL` | `http://localhost:3001` | Target URL for "Login" and "Get Started" buttons |

### Web App (`frontend/web/.env.local`)
| Variable | Default | Purpose |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_USE_MOCKS` | `true` | Toggle in-memory mock adapter vs live backend API |
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:8000/api` | Target backend REST API endpoint |
