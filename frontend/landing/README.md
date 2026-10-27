# ContractGuard Landing Website

The official landing page and marketing website for **ContractGuard**, the deterministic security platform for AI agents.

## Features

- Modern dark/light glassmorphism design system
- Architecture overview, interactive workflow graphics, and threat defense teasers
- Direct navigation links to the ContractGuard Web Application

## Tech Stack

- **Framework:** Next.js (App Router) + React 19 + TypeScript
- **Styling:** Tailwind CSS + Motion
- **Icons:** Lucide React

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

Configure `NEXT_PUBLIC_WEB_APP_URL` to point to the ContractGuard Web Application (defaults to `http://localhost:3001` in local development).

### 3. Run Development Server

```bash
npm run dev
```

The landing website will start on [http://localhost:3000](http://localhost:3000).

### 4. Build for Production

```bash
npm run build
npm run start
```
