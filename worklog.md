---
Task ID: 1
Agent: Main Agent
Task: Deploy original TIMELock Vite+Convex app on preview

Work Log:
- Found the complete original project at `/home/z/my-project/timelock/` with 60+ components, 30+ Convex functions, 15+ pages
- Previous session had incorrectly converted the project to Next.js, losing features
- Installed npm dependencies in timelock/ directory
- Created `.env.local` with VITE_CONVEX_URL=https://harmless-tapir-303.convex.cloud
- Added `basename="/timelock"` to BrowserRouter in main.tsx for subdirectory routing
- Added `base: "/timelock/"` to vite.config.ts for correct asset paths
- Built the Vite project successfully (2779 modules transformed, 1.66MB JS, 276KB CSS)
- Copied build output to `/home/z/my-project/public/timelock/`
- Copied logo assets to `/home/z/my-project/public/` for hardcoded path references
- Updated `src/app/page.tsx` to redirect `/` → `/timelock/`
- Created `src/middleware.ts` for SPA fallback routing (rewrites `/timelock/*` to index.html)
- Updated `next.config.ts` with rewrites for SPA routing
- Tested all routes successfully:
  - `/` → 307 redirect to `/timelock/` ✅
  - `/timelock/` → serves Vite app HTML ✅
  - `/timelock/assets/*` → serves JS/CSS assets ✅
  - `/timelock/dashboard` → SPA fallback via middleware rewrite ✅

Stage Summary:
- The original TIMELock Vite+Convex app is now deployed through Next.js infrastructure
- All pages, components, Convex functions, and features are preserved exactly as in the original
- The app is served at `/timelock/` with proper SPA routing
- The Convex backend URL is configured and will connect on load
- Zero changes to original app functionality or appearance
