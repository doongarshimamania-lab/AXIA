# Convex Auth Setup — Detailed Reference

## Table of Contents

1. [Auth Options Overview](#auth-options-overview)
2. [Convex Auth (Built-in)](#convex-auth-built-in)
3. [Clerk Integration](#clerk-integration)
4. [Protected Routes & Functions](#protected-routes--functions)
5. [User Management Patterns](#user-management-patterns)

---

## Auth Options Overview

| Option | Best For | Package |
|--------|----------|---------|
| **Convex Auth** | Most apps — built-in, runs on Convex, supports OAuth + passwords + magic links | `@convex-dev/auth` |
| **Clerk** | Pre-built UI components, advanced user management | `@clerk/clerk-react` |
| **Auth0** | Enterprise SSO, corporate identity providers | `convex/react-auth0` |

Convex Auth is recommended for Vite + Convex projects because it runs entirely on your Convex deployment with no external service dependencies.

---

## Convex Auth (Built-in)

### Installation

```bash
npm install @convex-dev/auth @auth/core@0.37.0
npx @convex-dev/auth
```

### Schema Setup

```typescript
// convex/schema.ts
import { defineSchema } from "convex/server";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,  // Adds: users, sessions, accounts, verificationTokens
  // Your custom tables...
});
```

### Auth Configuration

```typescript
// convex/auth.ts
import { convexAuth } from "@convex-dev/auth/server";
import GitHub from "@auth/core/providers/github";
import Google from "@auth/core/providers/google";
import { Password } from "@convex-dev/auth/providers/Password";

export const { auth, signIn, signOut, store } = convexAuth({
  providers: [GitHub, Google, Password],
});

// Export HTTP handlers for the auth endpoint
export const { GET, POST } = auth;
```

### Environment Variables

**Client-side** (`.env.local` — these are exposed to the browser):
```bash
# Only VITE_* variables belong in .env.local
VITE_CONVEX_URL=https://your-deployment.convex.cloud
```

**Server-side** (Convex dashboard or `npx convex env set` — these are secret):
```bash
# OAuth secrets MUST be set in the Convex dashboard (Settings > Environment Variables)
# or via CLI: npx convex env set AUTH_GITHUB_ID your_github_client_id
AUTH_GITHUB_ID=your_github_client_id
AUTH_GITHUB_SECRET=your_github_client_secret

# Google OAuth
AUTH_GOOGLE_ID=your_google_client_id
AUTH_GOOGLE_SECRET=your_google_client_secret
```

**Important**: Never put OAuth secrets in `.env.local` — they would be exposed to the browser since Vite bundles all `VITE_*` variables into client-side code. Server-side secrets (like `AUTH_*`) are only accessible from Convex backend functions, not from the client.

### Frontend Provider Setup

```typescript
// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { ConvexReactClient } from "convex/react";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import App from "./App";
import "./index.css";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ConvexAuthProvider client={convex}>
      <App />
    </ConvexAuthProvider>
  </React.StrictMode>
);
```

### Auth Hooks

```typescript
import { useAuthActions, useConvexAuth } from "@convex-dev/auth/react";

function AuthButton() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { signIn, signOut } = useAuthActions();

  if (isLoading) return <span>Loading...</span>;

  return isAuthenticated ? (
    <button onClick={() => signOut()}>Sign Out</button>
  ) : (
    <div>
      <button onClick={() => signIn("github")}>Sign In with GitHub</button>
      <button onClick={() => signIn("google")}>Sign In with Google</button>
      <button onClick={() => signIn("password")}>Sign In with Password</button>
    </div>
  );
}
```

### Password Auth (Sign Up + Sign In)

```typescript
import { useAuthActions } from "@convex-dev/auth/react";

function PasswordForm() {
  const { signIn } = useAuthActions();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    signIn("password", {
      email,
      password,
      flow: isSignUp ? "signUp" : "signIn",
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <button type="submit">{isSignUp ? "Sign Up" : "Sign In"}</button>
      <button type="button" onClick={() => setIsSignUp(!isSignUp)}>
        {isSignUp ? "Already have an account?" : "Need an account?"}
      </button>
    </form>
  );
}
```

### Magic Link Auth

```typescript
// convex/auth.ts
import { convexAuth } from "@convex-dev/auth/server";
import { Resend } from "@auth/core/providers/resend";

export const { auth, signIn, signOut, store } = convexAuth({
  providers: [Resend],
});

// Frontend
const { signIn } = useAuthActions();
signIn("resend", { email: "user@example.com" });
```

### Anonymous Auth

```typescript
// convex/auth.ts
import { convexAuth } from "@convex-dev/auth/server";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";

export const { auth, signIn, signOut, store } = convexAuth({
  providers: [Anonymous],
});

// Frontend — sign in anonymously
const { signIn } = useAuthActions();
signIn("anonymous");
```

---

## Clerk Integration

### Installation

```bash
npm install @clerk/clerk-react
```

### Environment Variables

```bash
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
CONVEX_CLERK_ISSUER=https://your-clerk-instance.clerk.accounts.dev
```

### Frontend Setup

```typescript
// src/main.tsx
import { ClerkProvider, useAuth } from "@clerk/clerk-react";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);
const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string;

ReactDOM.createRoot(document.getElementById("root")!).render(
  <ClerkProvider publishableKey={clerkPubKey}>
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      <App />
    </ConvexProviderWithClerk>
  </ClerkProvider>
);
```

---

## Protected Routes & Functions

### Checking Auth in Server Functions

```typescript
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getMyTasks = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    // identity has: subject, name, email, tokenIdentifier, etc.
    return await ctx.db
      .query("tasks")
      .withIndex("by_assignee", (q) => q.eq("assigneeId", identity.subject as Id<"users">))
      .collect();
  },
});
```

### Frontend Auth Guard

```typescript
import { useConvexAuth } from "@convex-dev/auth/react";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth();

  if (isLoading) return <div>Loading...</div>;
  if (!isAuthenticated) return <Navigate to="/login" />;

  return <>{children}</>;
}
```

---

## User Management Patterns

### Auto-Create User on First Login

```typescript
// convex/users.ts
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getOrCreateUser = mutation({
  args: {},
  returns: v.id("users"),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Check if user exists
    const existing = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (existing) return existing._id;

    // Create new user
    return await ctx.db.insert("users", {
      name: identity.name ?? "Anonymous",
      email: identity.email ?? "",
      tokenIdentifier: identity.tokenIdentifier,
      role: "user",
    });
  },
});
```

### User Profile Schema

```typescript
users: defineTable({
  name: v.string(),
  email: v.string(),
  tokenIdentifier: v.string(),
  role: v.union(v.literal("admin"), v.literal("user")),
  avatar: v.optional(v.id("_storage")),
  bio: v.optional(v.string()),
})
  .index("by_token", ["tokenIdentifier"])
  .index("by_email", ["email"]),
```
