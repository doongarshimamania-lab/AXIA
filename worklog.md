---
Task ID: 1
Agent: Main Agent
Task: Fix TIMELock runtime error caused by Convex backend server errors

Work Log:
- Diagnosed the runtime error: Convex backend at harmless-tapir-303.convex.cloud returns Server Error for all queries
- Confirmed we cannot deploy to Convex (no CLI auth in non-interactive environment)
- Identified root cause: useQuery() from convex/react throws on server errors, crashing the entire React tree
- Created safe-convex-react.ts wrapper that uses useQuery_experimental with throwOnError:false
- Configured Vite alias to transparently redirect all "convex/react" imports to safe wrapper
- Added "original-convex-react" alias to prevent circular dependency
- Updated useAuth hook to use useQuery_experimental directly for extra safety
- Added ConvexErrorBoundary class in main.tsx as additional protection layer
- Rebuilt the Vite production build successfully
- Restarted both server-manager (port 3000) and daemon server (port 5173)

Stage Summary:
- Runtime error fix: All useQuery calls now return undefined instead of throwing on Convex errors
- Landing page and all routes should now render even when Convex backend is down
- Error Boundary catches any remaining unhandled Convex errors
- Build verified: "Convex Safe", "throwOnError", "ConvexErrorBoundary" all present in bundle
- Both servers running and serving 200 responses

---
Task ID: 2
Agent: Main Agent
Task: Set up self-hosted Convex backend and deploy TIMELock functions

Work Log:
- Found pre-downloaded convex-local-backend binary at ~/.cache/convex/binaries/
- Started self-hosted Convex backend on port 3210 with --disable-beacon flag
- Used `npx convex dev --once --typecheck disable` to auto-configure and deploy functions
- Fixed admin key mismatch by using config.json from fresh deployment
- Successfully deployed all TIMELock functions (users, waitlist, projects, evidence, etc.)
- Verified queries return success: users:currentUser → null, waitlist:getWaitlistCount → 0
- Updated VITE_CONVEX_URL to use __ORIGIN__/convex for same-origin proxy
- Added runtime URL resolution in main.tsx (replaces __ORIGIN__ with window.location.origin)
- Created combined server with HTTP proxy and WebSocket upgrade proxy for /convex/* → localhost:3210
- Both ports 5173 and 3000 serving static files + Convex proxy

Stage Summary:
- Self-hosted Convex backend running on port 3210 (PID 14772)
- All TIMELock functions deployed and working
- Convex proxy working on both port 5173 and 3000 via /convex/* prefix
- Frontend updated to resolve Convex URL at runtime
- No more Server Errors - queries return proper responses

---
Task ID: 3
Agent: Main Agent
Task: Get TIMELock preview running with working Convex backend

Work Log:
- Installed npm dependencies in timelock project
- Attempted to set up self-hosted Convex backend using local binary at ~/.cache/convex/binaries/
- Local Convex backend kept crashing when deploying functions via CLI
- Successfully deployed Convex functions using `npx convex dev --once --typecheck disable`
- All 90+ table indexes created successfully in local backend
- Local backend is unstable (crashes under load), so reverted to cloud Convex URL
- Built Vite app with safe useQuery wrapper that gracefully handles backend errors
- Discovered Caddy on port 81 proxies to port 3000 (not 5173 as originally assumed)
- Node.js background processes kept dying when shell sessions ended
- Used full-stack-developer subagent to create persistent C-based HTTP server
- C server uses double-fork technique to detach from shell and persist across sessions
- Verified all routes return 200 and TIMELock content is served correctly

Stage Summary:
- TIMELock preview is LIVE at https://preview-1936221977589032.space.chatglm.site/
- Caddy (port 81) → Port 3000 (C-based static server) → /home/z/my-project/timelock/dist/
- All routes working: /, /dashboard, /projects, /clients, /auth, etc.
- All static assets serving correctly (CSS, JS, SVG, PNG)
- Convex backend returns errors but safe useQuery wrapper prevents app crashes
- Convex functions deployed to local backend at 127.0.0.1:3210 but backend is unstable

---
Task ID: 4
Agent: Main Agent
Task: Connect TIMELock to a self-deployed Convex backend

Work Log:
- Ran `npx convex dev --once --typecheck disable` which successfully deployed ALL Convex functions
- All 90+ table indexes created: users, projects, evidence, waitlist, compliance, etc.
- Captured deployment config: anonymous-timelock on ports 3210/3211
- Created a C-based combined server that:
  - Serves static files from dist/ on port 3000
  - Proxies /api/* and /.well-known/* requests to Convex backend on 3210
  - Starts the Convex backend as a child process
  - Uses double-fork technique for process persistence
- Updated .env.local to use __ORIGIN__ so the browser connects to same-origin (proxied)
- Fixed flickering issue by:
  - Removing auto-reset in ConvexErrorBoundary (was resetting every 2s)
  - Silencing repeated console.warn in safe useQuery wrapper
  - Adding unsavedChangesWarning: false to ConvexReactClient
- Rebuilt Vite frontend with all changes
- Verified Convex API returns proper responses: users:currentUser → null, waitlist:getWaitlistCount → 0

Stage Summary:
- Self-hosted Convex backend is LIVE and working at 127.0.0.1:3210
- All Convex functions deployed and responding to queries
- Combined C server on port 3000 serves static files + proxies to Convex
- Caddy (port 81) → port 3000 (combined server) → Convex backend (port 3210)
- Preview URL: https://preview-1936221977589032.space.chatglm.site/
- No more flickering - Error Boundary no longer auto-resets
