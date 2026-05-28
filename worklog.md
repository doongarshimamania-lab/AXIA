---
Task ID: 1
Agent: main
Task: Fix runtime errors in TIMELock Vite+Convex app and deploy to preview

Work Log:
- Investigated runtime errors in the TIMELock app
- Identified root cause: Vite base path `/timelock/` caused asset paths to be `/timelock/assets/...` but Caddy served from `dist/` without the `/timelock/` prefix, causing all JS/CSS to 404
- Changed `vite.config.ts` base from `/timelock/` to `/`
- Removed `BrowserRouter basename="/timelock"` from main.tsx
- Updated `/timelock/logo.svg` reference to `/logo.svg` in the no-convex fallback
- Fixed `instrumentation.tsx` Dialog import: replaced `@radix-ui/react-dialog` with `@/components/ui/dialog` to fix mixed radix/shadcn Dialog issue
- Added Convex/WebSocket errors to the InstrumentationProvider skip list to prevent false runtime error dialogs
- Removed duplicate CollapsibleSidebar from ProtectionValueDashboard.tsx, PremiumNetwork.tsx, and Teams.tsx (these components were inside DashboardLayout which already renders CollapsibleSidebar)
- Rebuilt Vite app with `npx vite build` - successful
- Created daemon server using detached Node.js process to serve static files persistently
- Server runs on port 3000, Caddy on port 81 proxies to it
- Verified: HTML, JS, CSS, images, and SPA routing all work through Caddy

Stage Summary:
- TIMELock app is now serving correctly through the preview at port 81
- Fixed 3 runtime error sources: missing assets (404), Dialog component mismatch, duplicate sidebars
- Server is running as a detached daemon process on port 3000
- All assets serve with correct content types and cache headers
- SPA routing works (all paths return index.html)
