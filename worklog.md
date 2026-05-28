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
