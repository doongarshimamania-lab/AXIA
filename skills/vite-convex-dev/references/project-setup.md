# Project Setup & Deployment — Detailed Reference

## Table of Contents

1. [Creating a New Project](#creating-a-new-project)
2. [Manual Setup](#manual-setup)
3. [Project Configuration](#project-configuration)
4. [Development Workflow](#development-workflow)
5. [Deploying to Production](#deploying-to-production)
6. [Vercel Deployment](#vercel-deployment)
7. [Netlify Deployment](#netlify-deployment)
8. [Self-Hosting Convex](#self-hosting-convex)
9. [Environment Variables](#environment-variables)
10. [Troubleshooting](#troubleshooting)

---

## Creating a New Project

### Interactive CLI (Recommended)

```bash
npm create convex@latest my-app
cd my-app
```

The interactive CLI lets you choose:
- **Framework**: React (Vite), Next.js, React Native
- **Auth**: Convex Auth, Clerk, or None
- **UI**: shadcn/ui, Tailwind, plain CSS

### Available Templates

| Template | Command |
|----------|---------|
| React + Vite + Tailwind + shadcn | `npm create convex@latest -- -t react-vite-shadcn` |
| React + Vite + Tailwind | `npm create convex@latest -- -t react-vite-tailwind` |
| React + Vite (plain) | `npm create convex@latest -- -t react-vite` |

---

## Manual Setup

Step-by-step for creating a Vite + Convex project from scratch:

### 1. Create Vite Project

```bash
npm create vite@latest my-app -- --template react-ts
cd my-app
```

### 2. Install Dependencies

```bash
# Core Convex SDK
npm install convex

# Tailwind CSS 4
npm install -D tailwindcss @tailwindcss/vite

# Optional: UI components
npx shadcn@latest init

# Optional: Auth
npm install @convex-dev/auth @auth/core@0.37.0

# Optional: Parallel dev scripts
npm install -D npm-run-all
```

### 3. Configure Vite

```typescript
// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

### 4. Initialize Convex

```bash
npx convex dev
```

This command:
- Creates the `convex/` directory with `schema.ts` and `_generated/`
- Creates `.env.local` with `VITE_CONVEX_URL`
- Starts watching and deploying your functions on change

### 5. Configure Tailwind

```css
/* src/index.css */
@import "tailwindcss";
```

### 6. Setup ConvexProvider

```typescript
// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import App from "./App";
import "./index.css";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ConvexProvider client={convex}>
      <App />
    </ConvexProvider>
  </React.StrictMode>
);
```

---

## Project Configuration

### package.json Scripts

```json
{
  "scripts": {
    "dev": "npm-run-all --parallel dev:frontend dev:backend",
    "dev:frontend": "vite",
    "dev:backend": "convex dev",
    "predev": "convex dev --until-success && convex dashboard",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit"
  }
}
```

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src", "convex"]
}
```

### .gitignore

```
node_modules/
dist/
.env.local
.env.*.local
convex/_generated/
```

---

## Development Workflow

### Daily Development

```bash
# Start both frontend and backend
npm run dev

# Or start separately:
npm run dev:frontend  # Vite on http://localhost:5173
npm run dev:backend   # Convex watches and deploys functions
```

### Key Commands

| Command | Purpose |
|---------|---------|
| `npx convex dev` | Start Convex dev mode — watches and deploys functions on save |
| `npx convex dashboard` | Open the Convex dashboard in browser |
| `npx convex deploy` | Deploy functions to production |
| `npx convex run api.messages.list` | Run a function from the CLI |
| `npx convex run api.messages.send --args '{\"body\":\"Hi\",\"author\":\"Bot\"}'` | Run mutation from CLI |

### How `npx convex dev` Works

1. Reads all files in `convex/` directory
2. Type-checks functions against schema
3. Deploys functions to your dev deployment
4. Regenerates `convex/_generated/` with type-safe references
5. Watches for file changes and redeploys automatically
6. Streams console.log output to your terminal

---

## Deploying to Production

### Standard Deployment

```bash
# Deploy Convex backend functions + schema
npx convex deploy

# Deploy backend AND build frontend
npx convex deploy --cmd "npm run build"
```

### Switching Between Deployments

```bash
# Deploy to production
npx convex deploy --prod

# Deploy to dev (default)
npx convex dev

# Run function against production
npx convex run api.messages.list --prod
```

---

## Vercel Deployment

### Setup

1. Push code to Git repository
2. Connect repo in Vercel dashboard
3. Override Build Command: `npx convex deploy --cmd 'npm run build'`
4. Set environment variable: `CONVEX_DEPLOY_KEY` (from Convex dashboard > Settings > API Keys)
5. Set `VITE_CONVEX_URL` to your production deployment URL

### Vercel Configuration (vercel.json)

```json
{
  "buildCommand": "npx convex deploy --cmd 'npm run build'",
  "framework": "vite",
  "env": {
    "VITE_CONVEX_URL": "https://your-prod-deployment.convex.cloud"
  }
}
```

### Preview Deployments

Convex automatically creates preview deployments for Vercel preview deploys. Each Git branch gets its own Convex deployment with its own data.

---

## Netlify Deployment

Similar to Vercel:

1. Override build command to `npx convex deploy --cmd 'npm run build'`
2. Set `CONVEX_DEPLOY_KEY` env var
3. Set `VITE_CONVEX_URL` env var
4. Publish directory: `dist/`

---

## Self-Hosting Convex

For teams that need full control over their infrastructure:

```bash
# Using Docker (recommended)
docker run -p 3210:3210 get-convex/convex-backend

# Using prebuilt binary
./convex-backend
```

After starting the backend:
1. Set `VITE_CONVEX_URL=http://localhost:3210`
2. Run `npx convex dev` to deploy functions
3. Open `http://localhost:3210/dashboard` for the dashboard

---

## Environment Variables

### Required

| Variable | Where | Purpose |
|----------|-------|---------|
| `VITE_CONVEX_URL` | `.env.local` (client) | Convex deployment URL |

### Auth (Optional)

| Variable | Where | Purpose |
|----------|-------|---------|
| `AUTH_GITHUB_ID` | Convex dashboard (server) | GitHub OAuth client ID |
| `AUTH_GITHUB_SECRET` | Convex dashboard (server) | GitHub OAuth secret |
| `AUTH_GOOGLE_ID` | Convex dashboard (server) | Google OAuth client ID |
| `AUTH_GOOGLE_SECRET` | Convex dashboard (server) | Google OAuth secret |

**Important**: Auth secrets should be set in the Convex dashboard (Settings > Environment Variables), NOT in `.env.local`. Only `VITE_*` variables belong in `.env.local` because they're exposed to the client.

### Deployment (CI/CD)

| Variable | Where | Purpose |
|----------|-------|---------|
| `CONVEX_DEPLOY_KEY` | CI/CD env vars | Production deploy key |

---

## Troubleshooting

### "Cannot find module '../convex/_generated/api'"

Run `npx convex dev` to generate the type-safe API references.

### Type errors after schema changes

Restart `npx convex dev` — it regenerates `_generated/` files with updated types.

### "VITE_CONVEX_URL is not defined"

Add `VITE_CONVEX_URL=https://your-deployment.convex.cloud` to `.env.local`.

### Convex dev keeps crashing

Check that your functions have valid `args` and `returns` validators. Remove any `undefined` values (use `null` instead).

### OAuth not working

1. Ensure auth secrets are in the Convex dashboard (not `.env.local`)
2. Check that the callback URL matches your Convex deployment URL
3. Verify the OAuth app is configured with the correct redirect URI

### Slow queries

Add indexes for fields you query frequently. Use `.withIndex()` instead of `.filter()`. Check the Convex dashboard for query performance metrics.
