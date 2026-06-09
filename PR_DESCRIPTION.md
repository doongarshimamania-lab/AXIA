# PR: Fix Runtime Error — Add ConvexAuthProvider to App Root

## Problem
The latest code refactored `main.tsx` to use `ConvexProvider` instead of `ConvexAuthProvider`, which removed the auth context from the app. This caused a **runtime crash** because:

- `useAuth()` hook (used in Landing, Dashboard, Projects pages) calls `useAuthActions()` from `@convex-dev/auth/react`
- `useAuthActions()` requires `ConvexAuthProvider` context to work
- Without it, React throws: "useAuthActions must be used within ConvexAuthProvider"

## Fix
Added `ConvexAuthProvider` wrapping `BrowserRouter` alongside `ConvexProvider`:

```
<ConvexProvider client={convex}>
  <ConvexAuthProvider client={convex}>
    <BrowserRouter>
      ...
    </BrowserRouter>
  </ConvexAuthProvider>
</ConvexProvider>
```

Both providers are needed:
- `ConvexProvider` — provides query/mutation context for Convex
- `ConvexAuthProvider` — provides auth context (signIn, signOut, isAuthenticated)

## Testing
- [x] Build succeeds (`npx vite build`)
- [x] App loads without runtime error
- [x] Landing page renders correctly
- [x] Dashboard page renders with sidebar
- [x] Auth flow works (useAuth doesn't crash)

## Files Changed
- `timelock/src/main.tsx` — Added ConvexAuthProvider import and wrapping
