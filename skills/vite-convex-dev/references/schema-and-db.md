# Convex Schema & Database — Detailed Reference

## Table of Contents

1. [Schema Definition](#schema-definition)
2. [Validator Types](#validator-types)
3. [Indexes](#indexes)
4. [Search Indexes](#search-indexes)
5. [Vector Indexes](#vector-indexes)
6. [Querying](#querying)
7. [Database Operations](#database-operations)
8. [Design Patterns](#design-patterns)

---

## Schema Definition

The schema lives in `convex/schema.ts` and defines the shape of your data. While optional (Convex works without one), a schema gives you type safety, validation, and enables indexes.

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  tableName: defineTable({
    field: v.string(),
    // ...
  })
    .index("by_field", ["field"])
    .searchIndex("search_field", { searchField: "field" }),
});
```

### With Auth Tables

```typescript
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,  // Adds: users, sessions, accounts, verificationTokens
  // Your custom tables...
});
```

---

## Validator Types

| Validator | TypeScript Type | Use For | Example Value |
|-----------|----------------|---------|---------------|
| `v.string()` | `string` | Text | `"hello"` |
| `v.number()` | `number` | Decimals/doubles | `3.14` |
| `v.int64()` | `bigint` | 64-bit integers | `123n` |
| `v.boolean()` | `boolean` | True/false | `true` |
| `v.null()` | `null` | Null | `null` |
| `v.id("table")` | `Id<"table">` | Document reference | `"j57m..."` |
| `v.array(v.string())` | `string[]` | List of values | `["a", "b"]` |
| `v.object({...})` | `{...}` | Nested object | `{ name: "x" }` |
| `v.record(v.string(), v.string())` | `Record<string, string>` | Key-value map | `{ k: "v" }` |
| `v.optional(v.string())` | `string \| undefined` | Optional field | omitted or `"hi"` |
| `v.union(v.literal("a"), v.literal("b"))` | `"a" \| "b"` | Enum-like | `"a"` |
| `v.literal("admin")` | `"admin"` | String literal | `"admin"` |
| `v.any()` | `any` | Any value | anything |
| `v.bytes()` | `ArrayBuffer` | Binary data | `new ArrayBuffer(8)` |
| `v.float64()` | `number` | Explicit float | `3.14` |

### NOT Supported

| Don't Use | Use Instead |
|-----------|-------------|
| `v.bigint()` | `v.int64()` |
| `v.map()` | `v.record(v.string(), v.any())` |
| `v.set()` | `v.array(v.string())` |

### Common Patterns

```typescript
// Optional field
description: v.optional(v.string()),

// Enum
role: v.union(v.literal("admin"), v.literal("user"), v.literal("moderator")),

// Foreign key reference
authorId: v.id("users"),

// Array of references
memberIds: v.array(v.id("users")),

// Nested object
address: v.object({
  street: v.string(),
  city: v.string(),
  zip: v.string(),
}),

// Record (flexible key-value)
metadata: v.record(v.string(), v.string()),

// Nullable field (use union with null)
avatar: v.optional(v.union(v.string(), v.null())),
```

---

## Indexes

Indexes make queries efficient. Without an index, queries scan every document. With an index, Convex does a direct lookup.

### Define Indexes

```typescript
users: defineTable({
  name: v.string(),
  email: v.string(),
  role: v.union(v.literal("admin"), v.literal("user")),
  organizationId: v.id("organizations"),
})
  .index("by_email", ["email"])
  .index("by_role", ["role"])
  .index("by_org", ["organizationId"])
  .index("by_org_and_role", ["organizationId", "role"]),
```

### Index Naming Convention

- `by_field` — single field index
- `by_field1_and_field2` — compound index
- Always start with `by_`

### Index Field Order Matters

Fields in a compound index must be queried in the same order as defined. You can only use `eq` on leading fields and `eq` or `gt`/`lt` on the last field.

```typescript
// Index: .index("by_org_and_role", ["organizationId", "role"])

// CORRECT — queries fields in index order
ctx.db.query("users")
  .withIndex("by_org_and_role", (q) =>
    q.eq("organizationId", orgId).eq("role", "admin")
  )

// CORRECT — can query just the first field
ctx.db.query("users")
  .withIndex("by_org_and_role", (q) =>
    q.eq("organizationId", orgId)
  )

// WRONG — cannot skip the first field
ctx.db.query("users")
  .withIndex("by_org_and_role", (q) =>
    q.eq("role", "admin")  // Can't skip organizationId!
  )
```

### Using Indexes in Queries

```typescript
// Single field
const user = await ctx.db
  .query("users")
  .withIndex("by_email", (q) => q.eq("email", "test@example.com"))
  .unique();

// Compound index
const admins = await ctx.db
  .query("users")
  .withIndex("by_org_and_role", (q) =>
    q.eq("organizationId", orgId).eq("role", "admin")
  )
  .collect();

// Range query on last field
const recent = await ctx.db
  .query("messages")
  .withIndex("by_channel_and_time", (q) =>
    q.eq("channelId", channelId).gt("_creationTime", since)
  )
  .collect();
```

---

## Search Indexes

Search indexes enable full-text search. Define them in the schema with a `searchField` and optional `filterFields`.

```typescript
posts: defineTable({
  title: v.string(),
  body: v.string(),
  authorId: v.id("users"),
  category: v.string(),
})
  .searchIndex("search_body", {
    searchField: "body",
    filterFields: ["authorId", "category"],
  }),
```

### Using Search

```typescript
export const searchPosts = query({
  args: { query: v.string(), authorId: v.optional(v.id("users")) },
  handler: async (ctx, { query, authorId }) => {
    return await ctx.db
      .query("posts")
      .withSearchIndex("search_body", (q) => {
        let q2 = q.search("body", query);
        if (authorId) q2 = q2.eq("authorId", authorId);
        return q2;
      })
      .take(10);
  },
});
```

Search results include a `_score` field for relevance ranking (higher = more relevant).

---

## Vector Indexes

For AI/ML applications with embeddings. Used with `@convex-dev/agent`.

```typescript
docs: defineTable({
  text: v.string(),
  embedding: v.array(v.float64()),
  source: v.string(),
}).vectorIndex("by_embedding", {
  vectorField: "embedding",
  filterFields: ["source"],
  dimensions: 1536,
}),
```

### Vector Search

```typescript
const results = await ctx.db
  .query("docs")
  .withVectorIndex("by_embedding", (q) =>
    q.vector("embedding", [0.1, 0.2, ...]).filter((q) => q.eq("source", "wiki"))
  )
  .take(10);
```

---

## Querying

### Basic Patterns

```typescript
// All documents
const all = await ctx.db.query("tasks").collect();

// Ordered (desc = newest first)
const recent = await ctx.db.query("messages").order("desc").take(50);

// With index (efficient)
const mine = await ctx.db
  .query("tasks")
  .withIndex("by_assignee", (q) => q.eq("assigneeId", myId))
  .collect();

// Get single document by ID
const doc = await ctx.db.get(id);

// Unique result (throws if >1 match)
const user = await ctx.db
  .query("users")
  .withIndex("by_email", (q) => q.eq("email", "test@example.com"))
  .unique();

// First result
const first = await ctx.db.query("tasks").first();
```

### Filter (avoid on large tables — use indexes instead)

```typescript
// OK for small tables
const results = await ctx.db
  .query("tasks")
  .filter((q) => q.eq(q.field("completed"), false))
  .collect();

// Filter with OR
const results = await ctx.db
  .query("tasks")
  .filter((q) => q.or(q.eq(q.field("priority"), "high"), q.eq(q.field("priority"), "critical")))
  .collect();
```

### Streaming Large Results

```typescript
// Process one row at a time (doesn't load all into memory)
for await (const row of ctx.db.query("tasks")) {
  await processRow(row);
}
```

---

## Database Operations

### Insert

```typescript
const id = await ctx.db.insert("tasks", {
  title: "New task",
  completed: false,
});
// id is Id<"tasks">
```

### Get

```typescript
const doc = await ctx.db.get(id);
// doc is Doc<"tasks"> | null
```

### Patch (Partial Update)

```typescript
await ctx.db.patch(id, { completed: true });
// Only updates the specified fields
```

### Replace (Full Overwrite)

```typescript
await ctx.db.replace(id, {
  title: "Updated task",
  completed: true,
  // Must provide ALL required fields — omits optional fields not specified
});
```

### Delete

```typescript
await ctx.db.delete(id);
```

---

## Design Patterns

### Soft Delete

```typescript
// Schema
tasks: defineTable({
  title: v.string(),
  deletedAt: v.optional(v.number()),
}).index("by_deleted", ["deletedAt"]),

// Query only non-deleted
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("tasks")
      .withIndex("by_deleted", (q) => q.eq("deletedAt", undefined))
      .collect();
  },
});

// Soft delete mutation
export const softDelete = mutation({
  args: { id: v.id("tasks") },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    await ctx.db.patch(id, { deletedAt: Date.now() });
  },
});
```

### Counter Pattern

```typescript
// Schema
counters: defineTable({
  name: v.string(),
  count: v.number(),
}).index("by_name", ["name"]),

// Increment
export const increment = mutation({
  args: { name: v.string() },
  returns: v.number(),
  handler: async (ctx, { name }) => {
    const counter = await ctx.db
      .query("counters")
      .withIndex("by_name", (q) => q.eq("name", name))
      .unique();
    if (!counter) {
      await ctx.db.insert("counters", { name, count: 1 });
      return 1;
    }
    const newCount = counter.count + 1;
    await ctx.db.patch(counter._id, { count: newCount });
    return newCount;
  },
});
```

### Many-to-Many Relationship

```typescript
// Schema
memberships: defineTable({
  userId: v.id("users"),
  organizationId: v.id("organizations"),
  role: v.string(),
})
  .index("by_user", ["userId"])
  .index("by_org", ["organizationId"])
  .index("by_user_and_org", ["userId", "organizationId"]),

// Query: Get all organizations for a user
export const getMyOrgs = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) return [];
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    return await Promise.all(
      memberships.map(async (m) => ({
        ...m,
        organization: await ctx.db.get(m.organizationId),
      }))
    );
  },
});
```
