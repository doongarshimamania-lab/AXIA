# Convex Functions — Detailed Reference

## Table of Contents

1. [Function Types](#function-types)
2. [Queries](#queries)
3. [Mutations](#mutations)
4. [Actions](#actions)
5. [Internal Functions](#internal-functions)
6. [Pagination](#pagination)
7. [Full-Text Search](#full-text-search)
8. [File Storage Functions](#file-storage-functions)
9. [Cron Jobs & Scheduled Functions](#cron-jobs--scheduled-functions)
10. [HTTP Endpoints](#http-endpoints)
11. [Calling Other Functions](#calling-other-functions)

---

## Function Types

| Type | Import | DB Access | Deterministic | Runtime | Real-time |
|------|--------|-----------|---------------|---------|-----------|
| **Query** | `query` from `./_generated/server` | Read-only | Yes | Convex V8 | Yes (reactive) |
| **Mutation** | `mutation` from `./_generated/server` | Read + Write | Yes | Convex V8 | Triggers reactive updates |
| **Action** | `action` from `./_generated/server` | None (use runQuery/runMutation) | No | Convex V8 or Node.js | No |

---

## Queries

Queries are reactive read functions. When the underlying data changes, Convex automatically re-runs the query and pushes the new result to all subscribed clients. This is why queries must be deterministic — non-deterministic behavior would break the reactive system.

### Basic Query

```typescript
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
```

### Query with Arguments

```typescript
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

### Query with Auth

```typescript
export const getMyProfile = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    return await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();
  },
});
```

### Query with Related Data

```typescript
export const getTasksWithAssignees = query({
  args: {},
  handler: async (ctx) => {
    const tasks = await ctx.db.query("tasks").collect();
    const tasksWithAssignees = await Promise.all(
      tasks.map(async (task) => {
        const assignee = task.assigneeId
          ? await ctx.db.get(task.assigneeId)
          : null;
        return { ...task, assignee };
      })
    );
    return tasksWithAssignees;
  },
});
```

---

## Mutations

Mutations are transactional write functions. Either all writes succeed or none do. When a mutation completes, Convex automatically re-runs all queries whose results might have changed, pushing updates to subscribed clients.

### Create

```typescript
export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    assigneeId: v.optional(v.id("users")),
  },
  returns: v.id("tasks"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("tasks", {
      ...args,
      completed: false,
    });
  },
});
```

### Update (Partial Patch)

```typescript
export const update = mutation({
  args: {
    id: v.id("tasks"),
    title: v.optional(v.string()),
    completed: v.optional(v.boolean()),
    assigneeId: v.optional(v.id("users")),
  },
  returns: v.null(),
  handler: async (ctx, { id, ...updates }) => {
    // Only updates fields that are provided (not undefined)
    await ctx.db.patch(id, updates);
  },
});
```

### Replace (Full Overwrite)

```typescript
export const replace = mutation({
  args: {
    id: v.id("tasks"),
    title: v.string(),
    completed: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, { id, title, completed }) => {
    await ctx.db.replace(id, { title, completed });
  },
});
```

### Delete

```typescript
export const remove = mutation({
  args: { id: v.id("tasks") },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});
```

### Mutation with Validation Logic

```typescript
export const assignTask = mutation({
  args: { taskId: v.id("tasks"), userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, { taskId, userId }) => {
    const task = await ctx.db.get(taskId);
    if (!task) throw new Error("Task not found");
    if (task.completed) throw new Error("Cannot assign completed task");

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");
    if (user.role !== "admin" && user.role !== "user") {
      throw new Error("Invalid user role for assignment");
    }

    await ctx.db.patch(taskId, { assigneeId: userId });
  },
});
```

---

## Actions

Actions are for side effects and external API calls. They cannot directly access the database — use `ctx.runQuery()` and `ctx.runMutation()` instead.

### Call External API

```typescript
import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

export const fetchAndSaveWeather = action({
  args: { city: v.string() },
  returns: v.null(),
  handler: async (ctx, { city }) => {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=YOUR_KEY`
    );
    const data = await response.json();
    await ctx.runMutation(api.weather.saveReport, { city, data });
  },
});
```

### Node.js Action (for Node built-ins)

Add `"use node";` at the very top of the file to enable Node.js APIs:

```typescript
"use node";
import { action } from "./_generated/server";
import { v } from "convex/values";

export const generateHash = action({
  args: { input: v.string() },
  returns: v.string(),
  handler: async (ctx, { input }) => {
    const crypto = await import("crypto");
    return crypto.createHash("sha256").update(input).digest("hex");
  },
});
```

### AI Integration Pattern

```typescript
// convex/ai.ts
import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

export const chat = action({
  args: { message: v.string(), conversationId: v.id("conversations") },
  returns: v.string(),
  handler: async (ctx, { message, conversationId }) => {
    // Save user message
    await ctx.runMutation(api.messages.send, {
      conversationId,
      role: "user",
      content: message,
    });

    // Call AI API
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [{ role: "user", content: message }],
      }),
    });
    const data = await response.json();
    const reply = data.choices[0].message.content;

    // Save AI reply
    await ctx.runMutation(api.messages.send, {
      conversationId,
      role: "assistant",
      content: reply,
    });

    return reply;
  },
});
```

---

## Internal Functions

Internal functions are not exposed to clients. Use them for cron jobs, scheduled tasks, and helper functions that should only be called server-side.

```typescript
// convex/cron.ts
import { internalMutation, internalQuery, internalAction } from "./_generated/server";
import { v } from "convex/values";

export const cleanup = internalMutation({
  args: { olderThanDays: v.number() },
  returns: v.null(),
  handler: async (ctx, { olderThanDays }) => {
    const cutoff = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;
    const oldMessages = await ctx.db
      .query("messages")
      .filter((q) => q.lt(q.field("_creationTime"), cutoff))
      .collect();
    for (const msg of oldMessages) {
      await ctx.db.delete(msg._id);
    }
  },
});
```

Call internal functions using `internal.*` references:

```typescript
import { internal } from "./_generated/api";
await ctx.runMutation(internal.cron.cleanup, { olderThanDays: 30 });
```

---

## Pagination

### Server-Side: Paginated Query

```typescript
import { query } from "./_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";

export const listPaginated = query({
  args: {
    paginationOpts: paginationOptsValidator,
    filter: v.optional(v.string()),
  },
  handler: async (ctx, { paginationOpts, filter }) => {
    let q = ctx.db.query("messages").order("desc");
    if (filter) {
      q = q.withSearchIndex("search_body", (sq) =>
        sq.search("body", filter)
      );
    }
    return await q.paginate(paginationOpts);
  },
});
```

### Client-Side: usePaginatedQuery

```typescript
import { usePaginatedQuery } from "convex/react";
import { api } from "../convex/_generated/api";

function MessageList({ filter }: { filter?: string }) {
  const { results, loadMore, status } = usePaginatedQuery(
    api.messages.listPaginated,
    { filter },
    { initialNumItems: 10 }
  );

  return (
    <div>
      {results.map((msg) => (
        <div key={msg._id}>{msg.body}</div>
      ))}
      {status === "CanLoadMore" && (
        <button onClick={() => loadMore(10)}>Load More</button>
      )}
      {status === "LoadingMore" && <span>Loading...</span>}
    </div>
  );
}
```

---

## Full-Text Search

### Schema: Define Search Index

```typescript
// convex/schema.ts
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
```

### Query with Search

```typescript
export const search = query({
  args: { query: v.string(), authorId: v.optional(v.id("users")) },
  handler: async (ctx, { query, authorId }) => {
    return await ctx.db
      .query("posts")
      .withSearchIndex("search_body", (q) => {
        const q2 = q.search("body", query);
        if (authorId) return q2.eq("authorId", authorId);
        return q2;
      })
      .take(10);
  },
});
```

Search results include a `_score` field for relevance ranking.

---

## File Storage Functions

### Generate Upload URL + Save File

```typescript
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
  args: {
    storageId: v.id("_storage"),
    name: v.string(),
    type: v.optional(v.string()),
  },
  returns: v.id("files"),
  handler: async (ctx, { storageId, name, type }) => {
    return await ctx.db.insert("files", { storageId, name, type });
  },
});

export const getFileUrl = query({
  args: { storageId: v.id("_storage") },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, { storageId }) => {
    return await ctx.storage.getUrl(storageId);
  },
});

export const getFiles = query({
  args: {},
  handler: async (ctx) => {
    const files = await ctx.db.query("files").collect();
    return Promise.all(
      files.map(async (file) => ({
        ...file,
        url: await ctx.storage.getUrl(file.storageId),
      }))
    );
  },
});
```

### Client Upload Flow

```typescript
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

function FileUpload() {
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const saveFile = useMutation(api.files.saveFile);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Step 1: Get upload URL
    const postUrl = await generateUploadUrl({});

    // Step 2: POST file to upload URL
    const result = await fetch(postUrl, {
      method: "POST",
      headers: { "Content-Type": file.type },
      body: file,
    });
    const { storageId } = await result.json();

    // Step 3: Save storage ID in database
    await saveFile({ storageId, name: file.name, type: file.type });
  };

  return <input type="file" onChange={handleUpload} />;
}
```

---

## Cron Jobs & Scheduled Functions

### Define Crons

```typescript
// convex/crons.ts
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Run every 30 minutes
crons.interval("cleanup", { minutes: 30 }, internal.cron.cleanup);

// Run daily at 9 AM UTC
crons.cron("daily summary", "0 9 * * *", internal.cron.dailySummary);

// Run every Monday at midnight
crons.cron("weekly report", "0 0 * * 1", internal.cron.weeklyReport);

export default crons;
```

**Important**: Use ONLY `crons.interval()` or `crons.cron()`. Do NOT use deprecated `crons.hourly()`, `crons.daily()`, or `crons.weekly()`.

### One-Time Scheduled Functions

Schedule a function to run in the future from within a mutation or action:

```typescript
export const scheduleReminder = mutation({
  args: { taskId: v.id("tasks"), delayMs: v.number() },
  returns: v.null(),
  handler: async (ctx, { taskId, delayMs }) => {
    ctx.scheduler.runAfter(delayMs, internal.tasks.sendReminder, { taskId });
  },
});

export const scheduleAt = mutation({
  args: { taskId: v.id("tasks"), scheduledTime: v.number() },
  returns: v.null(),
  handler: async (ctx, { taskId, scheduledTime }) => {
    ctx.scheduler.runAt(scheduledTime, internal.tasks.sendReminder, { taskId });
  },
});
```

---

## HTTP Endpoints

Convex can serve HTTP endpoints for webhooks, API integrations, and server-to-server communication.

```typescript
// convex/http.ts
import { httpRouter, httpAction } from "convex/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

const http = httpRouter();

// Webhook endpoint
http.route({
  path: "/api/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const payload = await request.json();
    await ctx.runMutation(internal.webhooks.handle, { payload });
    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  }),
});

// Health check
http.route({
  path: "/health",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    return new Response(JSON.stringify({ status: "ok" }), {
      headers: { "Content-Type": "application/json" },
    });
  }),
});

export default http;
```

---

## Calling Other Functions

From within any server function, you can call other functions using typed references:

```typescript
import { api, internal } from "./_generated/api";

// From any function:
const result = await ctx.runQuery(api.users.getProfile, { id });
await ctx.runMutation(api.messages.send, { body: "Hi", author: "Bot" });
await ctx.runAction(api.weather.fetch, { city: "SF" });

// Internal functions:
await ctx.runMutation(internal.cron.cleanup, { olderThanDays: 30 });
await ctx.runAction(internal.ai.embed, { text: "hello" });
```

**Important**: The return type of `ctx.runQuery` / `ctx.runMutation` is inferred from the function's `returns` validator, giving you end-to-end type safety.
