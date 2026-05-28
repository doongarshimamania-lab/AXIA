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
