# Axia - Complete Backup

**Backup Date:** $(date +"%Y-%m-%d %H:%M:%S")

## Quick Start (One Command)

```bash
cd timelock
./start.sh
```

This will:
1. Install npm dependencies (if needed)
2. Build the production bundle (if needed)
3. Start the server on http://localhost:3000

## Manual Steps

```bash
cd timelock
npm install              # Install dependencies
npx vite build           # Build production bundle
node serve-dist.cjs      # Start server on port 3000
# OR use the compiled C server (more stable):
./preview_server         # Start server on port 3000
```

## Project Structure

- `src/` - React + TypeScript source code
- `src/pages/` - All page components (Dashboard, Pipeline, Proposals, etc.)
- `src/components/` - Shared UI components
- `src/hooks/` - Custom React hooks (useAppData, useConvexPipeline, etc.)
- `src/convex/` - Convex backend functions and schema
- `dist/` - Pre-built production bundle (ready to serve)
- `public/` - Static assets (logo, images)

## Environment Variables

Create `.env.local` with:
```
VITE_CONVEX_URL=https://your-convex-deployment.convex.cloud
```

## Key Features

- Pipeline (CRM) with drag-and-drop deal management
- Proposals with status tracking and builder
- Dashboard with analytics
- Client management with protection scores
- Project health monitoring
- Invoice creation and tracking
- Evidence library and export
- Time tracking with compliance

## Tech Stack

- React 19 + TypeScript
- Vite 6
- Convex (backend)
- Tailwind CSS 4
- shadcn/ui components
- Framer Motion
- Recharts
