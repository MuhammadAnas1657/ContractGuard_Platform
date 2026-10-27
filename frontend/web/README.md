# ContractGuard Web Application

The full web application for **ContractGuard**, providing authentication, dashboard, policy studio, security architecture review, and repository policy management.

## Modules & Features

- **Authentication:** Login, signup, password reset, and OTP verification flows.
- **Dashboard:** Overview of active policies, security status, and agent execution metrics.
- **Policy Studio:** Generate and configure deterministic security contracts for AI agents.
- **Policy Review & Export:** Invariant verification, audit logs, and PDF/YAML contract exports.
- **Repository Management:** Static AST tool inspection and policy binding.
- **Security Configuration:** Multi-provider governance (Claude, Gemini, OpenAI, etc.).
- **Mock Mode:** Seamless local testing via mock adapters without requiring a running backend.

## Tech Stack

- **Framework:** Next.js (App Router) + React 19 + TypeScript
- **Styling:** Tailwind CSS + Motion
- **Icons:** Lucide React
- **Document Generation:** jsPDF

## Getting Started

### Prerequisites

- Node.js 18+ or 20+
- npm (or yarn / pnpm)

### 1. Installation

```bash
npm install
```

### 2. Environment Configuration

Copy the example environment file:

```bash
cp .env.example .env.local
```

Available variables:
- `NEXT_PUBLIC_USE_MOCKS`: Set to `"true"` to use local client mocks, or `"false"` to connect to the backend REST API.
- `NEXT_PUBLIC_API_BASE_URL`: Base URL for the backend API (e.g., `http://localhost:8000/api`).

### 3. Run Development Server

```bash
npm run dev
```

The web application runs on [http://localhost:3001](http://localhost:3001).

### 4. Build for Production

```bash
npm run build
npm run start
```
