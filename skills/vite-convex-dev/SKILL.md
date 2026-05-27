---
name: vite-convex-dev
description: "Full-stack web development with Vite (React + TypeScript) and Convex (reactive backend with real-time database, server functions, auth, file storage, cron jobs). Use when: building Vite apps with Convex backend, real-time apps, reactive database applications, Vite + Convex project, Convex functions, Convex schema, Convex auth, useQuery/useMutation hooks, ConvexProvider setup, convex dev server, or any full-stack project specifically requesting Vite and Convex as the tech stack. Also use when the user mentions 'convex' as their backend, asks for real-time database without manual WebSockets, or wants a reactive backend platform. Specifically for Vite-based SPA frontend — do NOT use for Next.js + Convex projects (use fullstack-dev skill instead)."
argument-hint: "Describe the Vite + Convex app or feature you want to build"
---

# Vite + Convex Full-Stack Development Skill

Build production-grade real-time web applications with **Vite** (frontend) and **Convex** (reactive backend). Convex provides the database, server functions, real-time sync, auth, and file storage — all in one cohesive TypeScript platform. No ORMs, no REST boilerplate, no manual WebSocket setup.

## When to Use This Skill

Use this skill whenever the user wants to build a full-stack application with Vite and Convex as their tech stack. This includes:
- New Vite + Convex projects (scaffolding from scratch)
- Adding features to existing Vite + Convex apps (new tables, functions, components)
- Convex-specific questions (schema design, function types, auth setup, file storage, cron jobs)
- Real-time data applications (chat, dashboards, collaborative tools)
- Any project where the user explicitly says "Convex" or "Vite + Convex"

**Do NOT use this skill for Next.js projects** — use the `fullstack-dev` skill instead.

---

## Architecture Overview

```
┌──────────────────────────────────────────────┐
│              VITE FRONTEND                    │
│  React + TypeScript + Tailwind CSS            │
│  ┌──────────┐ ┌──────────┐ ┌──────────────┐ │
│  │ useQuery │ │useMutation│ │  useAction   │ │
│  │(real-time│ │ (writes) │ │ (side fx)    │ │
│  │  reads)  │ │          │ │              │ │
│  └────┬─────┘ └────┬─────┘ └──────┬───────┘ │
│       │             │              │          │
│  ┌────▼─────────────▼──────────────▼───────┐ │
│  │     ConvexReactClient (WebSocket)        │ │
│  └────────────────┬────────────────────────┘ │
├───────────────────┼──────────────────────────┤
│              CONVEX BACKEND                   │
│  ┌───────────────▼─────────────────────────┐ │
│  │  Server Functions (TypeScript)           │ │
│  │  ┌────────┐ ┌─────────┐ ┌────────────┐ │ │
│  │  │Queries │ │Mutations│ │  Actions    │ │ │
│  │  │(read)  │ │(write)  │ │(ext. APIs)  │ │ │
│  │  └───┬────┘ └────┬────┘ └─────┬──────┘ │ │
│  │      │           │            │         │ │
│  │  ┌───▼───────────▼────────────▼───────┐ │ │
│  │  │   Reactive Document Database        │ │ │
│  │  │   (auto-syncs to subscribers)       │ │ │
│  │  └────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────┐ │
│  │  Auth │ File Storage │ Crons │ HTTP API  │ │
│  └─────────────────────────────────────────┘ │
└──────────────────────────────────────────────┘
```

**Key insight**: Convex = Database + Functions + Sync. When data changes, all subscribed clients update automatically. No polling, no invalidation, no manual WebSocket management.

---

## Project Structure

When creating a new Vite + Convex project, use this structure:

```
my-app/
├── convex/                    # Backend — Convex server functions
│   ├── _generated/            # AUTO-GENERATED — NEVER EDIT
│   │   ├── api.d.ts           # Type-safe API references
│   │   ├── api.js
│   │   └── dataModel.d.ts     # Database type definitions
│   ├── schema.ts              # Database schema + indexes
│   ├── auth.ts                # Auth configuration (if using Convex Auth)
│   ├── crons.ts               # Scheduled/cron jobs
│   ├── http.ts                # HTTP API endpoints (webhooks, etc.)
│   └── [domain].ts            # Domain function files (messages.ts, users.ts, etc.)
├── src/                       # Frontend — React + Vite
│   ├── main.tsx               # Entry point with ConvexProvider
│   ├── App.tsx                # Root component
│   ├── components/            # UI components
│   │   ├── ui/                # Base UI primitives
│   │   └── [features]/        # Feature-specific components
│   ├── hooks/                 # Custom React hooks
│   ├── lib/                   # Utilities
│   └── index.css              # Tailwind base styles
├── package.json
├── vite.config.ts
├── tsconfig.json
├── .env.local                 # VITE_CONVEX_URL=...
└── .gitignore
```

---

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend Framework** | Vite + React 18+ | Fast dev server, HMR, bundling |
| **Language** | TypeScript 5 | End-to-end type safety |
| **Styling** | Tailwind CSS 4 | Utility-first CSS |
| **UI Components** | shadcn/ui | High-quality React components |
| **Backend** | Convex | Database, functions, real-time sync |
| **Database** | Convex (built-in) | Reactive document database |
| **Auth** | @convex-dev/auth | Built-in auth (OAuth, passwords, magic links) |
| **State Management** | Convex useQuery/useMutation | Real-time server state (no client cache needed) |
| **Icons** | Lucide React | Icon library |

### Core npm Packages

| Package | Version | Purpose |
|---------|---------|---------|
| `convex` | 1.39.x | Core SDK: client, server, CLI, React hooks |
| `@convex-dev/auth` | 0.0.92 | Built-in auth library |
| `@convex-dev/react-query` | 0.1.x | TanStack Query integration (optional) |

---

## Non-Negotiable Rules

These rules exist because violating them causes runtime errors, type unsafety, or broken real-time sync. Understanding the "why" helps you avoid mistakes:

### 1. Always define `args` and `returns` validators

Every Convex function must explicitly declare its argument and return types using validators. This gives you end-to-end type safety from database to frontend. Without `args`, the function accepts any input. Without `returns`, the frontend gets `any` types.

```typescript
// CORRECT
export const list = query({
  args: {},
  returns: v.array(v.object({ _id: v.id("messages"), body: v.string() })),
  handler: async (ctx, args) => { ... },
});

// WRONG — loses type safety
export const list = query({
  handler: async (ctx) => { ... },
});
```

### 2. Never edit `_generated/*`

The `convex/_generated/` directory is auto-generated by `npx convex dev`. It contains type-safe API references (`api.messages.list`), database types, and server references. Editing these files breaks the type system and will be overwritten on next dev run.

### 3. Never use `ctx.db` inside actions

Actions run in a non-deterministic context (they can call external APIs, use `fetch`, etc.) and therefore cannot directly access the database. This is a fundamental Convex design constraint — it ensures data consistency. To read/write data from actions, call queries and mutations via `ctx.runQuery()` and `ctx.runMutation()`.

```typescript
// WRONG — will throw runtime error
export const fetchAndSave = action({
  handler: async (ctx, { url }) => {
    const data = await fetch(url).then(r => r.json());
    await ctx.db.insert("results", { data }); // ERROR!
  },
});

// CORRECT — use runMutation
export const fetchAndSave = action({
  args: { url: v.string() },
  returns: v.null(),
  handler: async (ctx, { url }) => {
    const data = await fetch(url).then(r => r.json());
    await ctx.runMutation(api.results.save, { data });
  },
});
```

### 4. Use `null` instead of `undefined`

Convex values cannot be `undefined` — the database and function system don't support it. Use `null` for absent values and `v.optional()` for optional arguments/fields (which may be omitted, not set to `undefined`).

### 5. Always use indexes for scalable queries

Using `.filter()` scans every document in a table. With indexes and `.withIndex()`, Convex does an efficient indexed lookup. This is the difference between O(n) and O(log n) as your data grows.

```typescript
// BAD — full table scan
const results = await ctx.db.query("tasks")
  .filter((q) => q.eq(q.field("completed"), false))
  .collect();

// GOOD — indexed lookup
const results = await ctx.db
  .query("tasks")
  .withIndex("by_completed", (q) => q.eq("completed", false))
  .collect();
```

### 6. Queries must be deterministic

Query functions run reactively — they're re-executed whenever underlying data changes. Non-deterministic behavior (like `Math.random()`, `Date.now()`, or `fetch()`) would produce different results each time, breaking the reactive system. Use mutations for timestamps and actions for external API calls.

---

## Step 1: Project Scaffolding

When the user wants a new Vite + Convex project, create it with these commands:

```bash
# Option A: Interactive CLI (recommended)
npm create convex@latest my-app
# Select: React (Vite), Convex Auth or None, Tailwind + shadcn/ui

# Option B: Manual setup
npm create vite@latest my-app -- --template react-ts
cd my-app
npm install convex
npx convex dev   # Creates convex/ dir, .env.local with VITE_CONVEX_URL
```

### Required package.json scripts

```json
{
  "scripts": {
    "dev": "npm-run-all --parallel dev:frontend dev:backend",
    "dev:frontend": "vite",
    "dev:backend": "convex dev",
    "build": "tsc -b && vite build",
    "preview": "vite preview"
  }
}
```

### Required .env.local

```
VITE_CONVEX_URL=https://your-deployment.convex.cloud
```

For detailed scaffolding and deployment instructions, read `references/project-setup.md`.

---

## Step 2: Frontend Setup (main.tsx)

Every Vite + Convex app needs a `ConvexProvider` wrapping the app. This provides the WebSocket-based client that powers real-time subscriptions.

### Without Auth

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

### With Convex Auth

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

For full auth configuration (OAuth, passwords, magic links), read `references/auth-setup.md`.

---

## Step 3: Database Schema

Define your schema in `convex/schema.ts`. The schema is optional but strongly recommended — it gives you type safety and enables indexes for performant queries.

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  messages: defineTable({
    author: v.string(),
    body: v.string(),
  }),

  users: defineTable({
    name: v.string(),
    email: v.string(),
    role: v.union(v.literal("admin"), v.literal("user")),
  })
    .index("by_email", ["email"]),

  tasks: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    completed: v.boolean(),
    assigneeId: v.optional(v.id("users")),
  })
    .index("by_completed", ["completed"])
    .index("by_assignee", ["assigneeId"]),

  posts: defineTable({
    title: v.string(),
    body: v.string(),
    authorId: v.id("users"),
    tags: v.array(v.string()),
  })
    .index("by_author", ["authorId"])
    .searchIndex("search_body", {
      searchField: "body",
      filterFields: ["authorId"],
    }),
});
```

### Schema Design Principles

- **Index naming**: Use `by_field1` or `by_field1_and_field2` convention
- **Index field order matters**: Query fields must match the index field order exactly
- **Use `v.optional()` for fields that can be omitted** (field is absent, not `undefined`). For fields that can explicitly be `null`, use `v.optional(v.union(v.string(), v.null()))`
- **Use `v.id("table")` for references**, not raw strings — this gives type-safe joins
- **Use search indexes** for full-text search on text-heavy fields

For complete schema reference and querying patterns, read `references/schema-and-db.md`.

---

## Step 4: Server Functions

Convex has three function types. Understanding when to use each is critical:

| Type | Use For | DB Access | Deterministic | Example |
|------|---------|-----------|---------------|---------|
| **Query** | Read data | Read-only | Yes | List messages, get user profile |
| **Mutation** | Write data | Read + Write | Yes | Send message, create task |
| **Action** | External APIs, side effects | None (use runQuery/runMutation) | No | Call OpenAI, send email, fetch weather |

### Query (Read Data)

Queries are reactive — when underlying data changes, all subscribed clients automatically receive the updated result. This is what makes Convex apps real-time by default.

```typescript
// convex/messages.ts
import { query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  returns: v.array(v.object({
    _id: v.id("messages"),
    _creationTime: v.number(),
    author: v.string(),
    body: v.string(),
  })),
  handler: async (ctx) => {
    return await ctx.db.query("messages").order("desc").take(100);
  },
});

export const getByAuthor = query({
  args: { author: v.string() },
  returns: v.array(v.object({
    _id: v.id("messages"),
    _creationTime: v.number(),
    author: v.string(),
    body: v.string(),
  })),
  handler: async (ctx, { author }) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_author", (q) => q.eq("author", author))
      .collect();
  },
});
```

### Mutation (Write Data)

Mutations are transactional — either all writes succeed or none do. They trigger reactive updates to all subscribed queries.

```typescript
// convex/messages.ts
import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const send = mutation({
  args: { body: v.string(), author: v.string() },
  returns: v.null(),
  handler: async (ctx, { body, author }) => {
    await ctx.db.insert("messages", { body, author });
  },
});

export const update = mutation({
  args: { id: v.id("messages"), body: v.optional(v.string()) },
  returns: v.null(),
  handler: async (ctx, { id, ...updates }) => {
    await ctx.db.patch(id, updates);
  },
});

export const remove = mutation({
  args: { id: v.id("messages") },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});
```

### Action (External APIs / Side Effects)

Actions can call external APIs but cannot directly access the database. Use `ctx.runQuery()` and `ctx.runMutation()` to interact with data.

```typescript
// convex/weather.ts
import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

export const fetchWeather = action({
  args: { city: v.string() },
  returns: v.any(),
  handler: async (ctx, { city }) => {
    const response = await fetch(`https://api.weather.com/v1/${city}`);
    const data = await response.json();
    // Persist via a mutation
    await ctx.runMutation(api.weather.saveReport, { city, data });
    return data;
  },
});
```

### Node.js Actions

When you need Node.js built-ins (fs, crypto, etc.), add `"use node";` at the top of the file:

```typescript
"use node";
import { action } from "./_generated/server";
import { v } from "convex/values";

export const hashData = action({
  args: { input: v.string() },
  returns: v.string(),
  handler: async (ctx, { input }) => {
    const crypto = await import("crypto");
    return crypto.createHash("sha256").update(input).digest("hex");
  },
});
```

For complete function patterns (CRUD, pagination, search, file storage, cron jobs), read `references/convex-functions.md`.

---

## Step 5: Frontend React Hooks

The `convex/react` package provides hooks that connect your components to the Convex backend.

### useQuery — Real-time Data

```typescript
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../convex/_generated/api";

function MessageList() {
  // Real-time query — auto-updates when data changes on the server
  const messages = useQuery(api.messages.list, {});

  // Loading state: undefined means the data hasn't loaded yet
  // Error state: useQuery returns an Error if the query fails
  if (messages === undefined) {
    return <div className="animate-pulse">Loading...</div>;
  }
  if (messages instanceof Error) {
    return <div className="text-red-500">Error: {messages.message}</div>;
  }

  return (
    <div>
      {messages.map((msg) => (
        <div key={msg._id} className="p-2 border-b">
          <strong>{msg.author}:</strong> {msg.body}
        </div>
      ))}
    </div>
  );
}
```

### useMutation — Write Data

```typescript
function SendMessage() {
  const sendMessage = useMutation(api.messages.send);
  const [body, setBody] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendMessage({ body, author: "Me" });
    setBody("");
  };

  return (
    <form onSubmit={handleSubmit}>
      <input value={body} onChange={(e) => setBody(e.target.value)} />
      <button type="submit">Send</button>
    </form>
  );
}
```

### useAction — External API Calls

```typescript
function WeatherWidget() {
  const fetchWeather = useAction(api.weather.fetchWeather);
  const [result, setResult] = useState(null);

  const handleClick = async () => {
    const data = await fetchWeather({ city: "San Francisco" });
    setResult(data);
  };

  return <button onClick={handleClick}>Get Weather</button>;
}
```

### usePaginatedQuery — Pagination

```typescript
import { usePaginatedQuery } from "convex/react";

function PaginatedMessages() {
  const { results, loadMore, status } = usePaginatedQuery(
    api.messages.listPaginated,
    {},
    { initialNumItems: 10 }
  );

  return (
    <div>
      {results.map((msg) => <div key={msg._id}>{msg.body}</div>)}
      {status === "CanLoadMore" && (
        <button onClick={() => loadMore(10)}>Load More</button>
      )}
    </div>
  );
}
```

---

## Step 6: Authentication

For detailed auth setup including OAuth, passwords, and magic links, read `references/auth-setup.md`.

Quick setup for Convex Auth with GitHub OAuth:

```typescript
// convex/auth.ts
import { convexAuth } from "@convex-dev/auth/server";
import GitHub from "@auth/core/providers/github";

export const { auth, signIn, signOut, store } = convexAuth({
  providers: [GitHub],
});

export const { GET, POST } = auth;
```

```typescript
// convex/schema.ts — add auth tables
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,
  // Your other tables...
});
```

```typescript
// Frontend usage
import { useAuthActions, useConvexAuth } from "@convex-dev/auth/react";

function AuthButton() {
  const { isAuthenticated } = useConvexAuth();
  const { signIn, signOut } = useAuthActions();

  return isAuthenticated
    ? <button onClick={() => signOut()}>Sign Out</button>
    : <button onClick={() => signIn("github")}>Sign In with GitHub</button>;
}
```

---

## Step 7: File Storage

Convex provides built-in file storage. The upload flow is 3 steps:

1. **Client calls mutation** to get an upload URL
2. **Client POSTs the file** to the upload URL
3. **Client saves the storage ID** in a database document

```typescript
// convex/files.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const saveFile = mutation({
  args: { storageId: v.id("_storage"), name: v.string() },
  returns: v.id("files"),
  handler: async (ctx, { storageId, name }) => {
    return await ctx.db.insert("files", { storageId, name });
  },
});

export const getFileUrl = query({
  args: { storageId: v.id("_storage") },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, { storageId }) => {
    return await ctx.storage.getUrl(storageId);
  },
});
```

---

## Step 8: Cron Jobs & Scheduled Functions

```typescript
// convex/crons.ts
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Interval-based (every 30 minutes)
crons.interval("cleanup", { minutes: 30 }, internal.cron.cleanup);

// Cron expression (daily at 9 AM)
crons.cron("daily summary", "0 9 * * *", internal.cron.dailySummary);

export default crons;
```

**Rules**: Use ONLY `crons.interval()` or `crons.cron()`. Cron targets must be `internal.*` function references.

---

## Common Patterns

### Complete CRUD Module

For a standard entity, create a single file with all operations:

```typescript
// convex/tasks.ts
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: { title: v.string(), description: v.optional(v.string()) },
  returns: v.id("tasks"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("tasks", { ...args, completed: false });
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("tasks").order("desc").collect();
  },
});

export const getById = query({
  args: { id: v.id("tasks") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

export const update = mutation({
  args: {
    id: v.id("tasks"),
    title: v.optional(v.string()),
    completed: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, { id, ...updates }) => {
    await ctx.db.patch(id, updates);
  },
});

export const remove = mutation({
  args: { id: v.id("tasks") },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});
```

### Full-Text Search

```typescript
// Query with search index
export const searchPosts = query({
  args: { query: v.string() },
  handler: async (ctx, { query }) => {
    return await ctx.db
      .query("posts")
      .withSearchIndex("search_body", (q) => q.search("body", query))
      .take(10);
  },
});
```

### Protected Functions (require auth)

The correct pattern is to look up the user by `tokenIdentifier` first, then use the user's document ID for queries. Do NOT cast `identity.subject` to `Id<"users">` — it's a string, not a Convex document ID.

```typescript
export const getMyTasks = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    // Look up user by tokenIdentifier (not subject)
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) throw new Error("User not found");
    return await ctx.db
      .query("tasks")
      .withIndex("by_assignee", (q) => q.eq("assigneeId", user._id))
      .collect();
  },
});
```

---

## Reference Files

For detailed implementation guidance beyond this overview, read these reference files:

| File | When to Read |
|------|-------------|
| `references/convex-functions.md` | When writing queries, mutations, actions, internal functions, pagination, search, or scheduled functions |
| `references/schema-and-db.md` | When designing database schemas, indexes, validators, or writing complex queries |
| `references/auth-setup.md` | When setting up authentication (Convex Auth, Clerk, OAuth, passwords, magic links) |
| `references/project-setup.md` | When scaffolding a new project, deploying, or configuring the dev environment |

---

## Development Workflow

1. **Start the dev environment**: `npm run dev` (runs Vite + Convex dev in parallel)
2. **Edit schema** in `convex/schema.ts` → Convex auto-detects changes and updates types
3. **Write functions** in `convex/[domain].ts` → Convex auto-deploys on save
4. **Build UI** in `src/components/` → Vite provides instant HMR
5. **Check types** with `npx tsc --noEmit`
6. **Open dashboard** with `npx convex dashboard` to inspect data

### Key Dev Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start Vite frontend + Convex backend |
| `npx convex dev` | Start Convex backend only (watches + deploys functions) |
| `npx convex dashboard` | Open Convex dashboard in browser |
| `npx convex deploy` | Deploy to production |
| `npx convex run api.messages.list` | Run a function from CLI |

---

## Validator Quick Reference

| Validator | Use For | Example |
|-----------|---------|---------|
| `v.string()` | Text values | `"hello"` |
| `v.number()` | Numbers (double) | `3.14` |
| `v.int64()` | 64-bit integers | `123n` |
| `v.boolean()` | True/false | `true` |
| `v.null()` | Null | `null` |
| `v.id("table")` | Document reference | `Id<"users">` |
| `v.array(v.string())` | List | `["a", "b"]` |
| `v.object({...})` | Nested object | `{ name: v.string() }` |
| `v.record(v.string(), v.string())` | Key-value map | `{ key: "val" }` |
| `v.optional(v.string())` | Optional field | omitted or `"hi"` |
| `v.union(v.literal("a"), v.literal("b"))` | Enum-like | `"a" \| "b"` |
| `v.any()` | Any value | anything |

**NOT supported**: `v.bigint()` (use `v.int64()`), `v.map()`, `v.set()`
