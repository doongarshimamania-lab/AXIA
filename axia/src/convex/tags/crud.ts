// @ts-nocheck — uses runtime string table names for taggable entities (see TAGGABLE_TABLES)
import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { getRecordAccess } from "../permissions";

// ─── ENTITY REGISTRY ──────────────────────────────────────────────────────
// Maps a public entity-type string to the Convex table name.
// This is the single source of truth for which tables tags can attach to.
// Add a new entry here when you add `tagIds` to a new table.
const TAGGABLE_TABLES = {
  clients: "clients",
  projects: "projects",
  proposals: "proposals",
  invoices: "invoices",
  workSessions: "workSessions",
  deals: "deals",
  goals: "goals",
} as const;

export type TaggableEntityType = keyof typeof TAGGABLE_TABLES;

const ENTITY_LABELS: Record<TaggableEntityType, string> = {
  clients: "Clients",
  projects: "Projects",
  proposals: "Proposals",
  invoices: "Invoices",
  workSessions: "Time Entries",
  deals: "Deals",
  goals: "Goals",
};


// ─── QUERIES ──────────────────────────────────────────────────────────────

export const getTags = query({
  args: { workspaceId: v.optional(v.id("workspaces")) },
  handler: async (ctx, { workspaceId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    if (workspaceId) {
      return await ctx.db
        .query("tags")
        .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
        .take(1000);
    }
    return await ctx.db
      .query("tags")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .take(1000);
  },
});

export const getTag = query({
  args: { tagId: v.id("tags") },
  handler: async (ctx, { tagId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const tag = await ctx.db.get(tagId);
    if (!tag || tag.userId !== userId) return null;
    return tag;
  },
});

// ─── MUTATIONS ────────────────────────────────────────────────────────────

export const createTag = mutation({
  args: {
    workspaceId: v.optional(v.id("workspaces")),
    name: v.string(),
    color: v.string(),
    category: v.optional(v.string()),
  },
  handler: async (ctx, { workspaceId, name, color, category }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check for duplicate name
    const existing = await ctx.db
      .query("tags")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .take(1000);

    if (existing.some((t) => t.name.toLowerCase() === name.toLowerCase())) {
      throw new Error("A tag with this name already exists");
    }

    return await ctx.db.insert("tags", {
      userId,
      workspaceId,
      createdBy: userId,
      name,
      color,
      category,
      usageCount: 0,
      createdAt: Date.now(),
    });
  },
});

export const updateTag = mutation({
  args: {
    tagId: v.id("tags"),
    name: v.optional(v.string()),
    color: v.optional(v.string()),
    category: v.optional(v.string()),
    usageCount: v.optional(v.number()),
  },
  handler: async (ctx, { tagId, ...updates }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const tag = await ctx.db.get(tagId);
    if (!tag || tag.userId !== userId) throw new Error("Not authorized");

    // Check for duplicate name if name is being updated
    if (updates.name && updates.name.toLowerCase() !== tag.name.toLowerCase()) {
      const existing = await ctx.db
        .query("tags")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .take(1000);

      if (existing.some((t) => t._id !== tagId && t.name.toLowerCase() === updates.name!.toLowerCase())) {
        throw new Error("A tag with this name already exists");
      }
    }

    await ctx.db.patch(tagId, updates);
  },
});

export const deleteTag = mutation({
  args: { tagId: v.id("tags") },
  handler: async (ctx, { tagId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const tag = await ctx.db.get(tagId);
    if (!tag || tag.userId !== userId) throw new Error("Not authorized");

    // ponytail: cascade-unset this tag from every entity that references it.
    // We scan each taggable table for rows whose tagIds array contains tagId
    // and patch the array to remove it. This makes the delete dialog's
    // "This will remove the tag from all associated entries" copy truthful.
    for (const tableName of Object.values(TAGGABLE_TABLES)) {
      // ponytail: Convex's query typing requires a literal table name; we use a runtime string.
      const rows = await ctx.db
        .query(tableName)
        .filter((q: any) => q.includes(q.field("tagIds"), tagId))
        .take(1000);
      for (const row of rows) {
        const remaining = (row.tagIds ?? []).filter((id: any) => id !== tagId);
        await ctx.db.patch(row._id, { tagIds: remaining });
      }
    }

    await ctx.db.delete(tagId);
  },
});

// ─── TAG ATTACHMENT (ponytail: the missing link) ──────────────────────────

/**
 * Set the full list of tags for a single entity. Replaces any existing tags.
 * The caller must have at least "comment" access to the entity's workspace
 * record (or own it directly if it's user-scoped).
 *
 * Usage from the client:
 *   setEntityTags({ entityType: "clients", entityId: client._id, tagIds: [...] })
 */
export const setEntityTags = mutation({
  args: {
    entityType: v.union(
      v.literal("clients"),
      v.literal("projects"),
      v.literal("proposals"),
      v.literal("invoices"),
      v.literal("workSessions"),
      v.literal("deals"),
      v.literal("goals"),
    ),
    // ponytail: v.id("clients") would reject IDs from other tables — Convex
    // validates the table prefix at the boundary. Use v.string() and rely on
    // the runtime ctx.db.get() to 404 if the ID is bogus.
    entityId: v.string(),
    tagIds: v.array(v.id("tags")),
  },
  handler: async (ctx, { entityType, entityId, tagIds }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const tableName = TAGGABLE_TABLES[entityType];
    // ponytail: runtime string table name; Convex's generated types require a literal.
    const record = await ctx.db.get(entityId);
    if (!record) throw new Error(`${ENTITY_LABELS[entityType]} record not found`);

    // Authorization: workspace-scoped records go through getRecordAccess;
    // user-scoped records fall back to direct ownership.
    if (record.workspaceId) {
      const access = await getRecordAccess(ctx, record, userId);
      if (!access || access === "read") {
        throw new Error("Not authorized — need comment or higher access to tag this record");
      }
    } else if (record.userId !== userId) {
      throw new Error("Not authorized");
    }

    // De-duplicate the incoming tagIds list.
    const uniqueTagIds = Array.from(new Set(tagIds));

    // Optional: verify the caller owns every tag being attached (prevents
    // attaching another user's tag IDs by guessing them). We do this only
    // when there are tags to attach, to keep the empty-list case fast.
    if (uniqueTagIds.length > 0) {
      for (const tid of uniqueTagIds) {
        const t = await ctx.db.get(tid);
        if (!t || t.userId !== userId) {
          throw new Error("One or more tags not found or not owned by you");
        }
      }
    }

    // ponytail: runtime string table name on patch.
    await ctx.db.patch(entityId, { tagIds: uniqueTagIds });
    return { ok: true, tagIds: uniqueTagIds };
  },
});

/**
 * Returns the tags for the current user/workspace, each enriched with a
 * real `usageCount` (computed by scanning every taggable table) and a
 * per-entity-type breakdown.
 *
 * This replaces the permanently-zero `usageCount` field on the tag row.
 */
export const getTagsWithUsage = query({
  args: { workspaceId: v.optional(v.id("workspaces")) },
  handler: async (ctx, { workspaceId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const tags = workspaceId
      ? await ctx.db
          .query("tags")
          .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
          .take(1000)
      : await ctx.db
          .query("tags")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .take(1000);

    if (tags.length === 0) return [];

    // Build a count map: tagId -> { total, perEntity: { clients: n, ... } }
    const counts = new Map<string, { total: number; perEntity: Record<string, number> }>();
    for (const t of tags) {
      counts.set(t._id, { total: 0, perEntity: {} });
    }

    // ponytail: each table scan is now wrapped in try/catch so a failure on one
    // table (e.g. a schema mismatch on the filter expression, or a timeout on a
    // huge table) does NOT kill the whole query and return undefined (which made
    // the Tags page render zero tags). The failing table simply contributes 0 to
    // every tag's usage count. Also removed the fragile
    // `q.neq(q.field("tagIds"), undefined)` Convex filter expression — its
    // semantics around undefined fields are subtle and it was the most likely
    // throw point. We now take(500) per table and skip tagless rows in JS.
    for (const [entityType, tableName] of Object.entries(TAGGABLE_TABLES)) {
      try {
        const rows = await ctx.db
          .query(tableName)
          .take(500);
        for (const row of rows) {
          const ids: string[] = (row as any).tagIds ?? [];
          for (const id of ids) {
            const c = counts.get(id);
            if (!c) continue; // tag belongs to another user/workspace — skip
            c.total += 1;
            c.perEntity[entityType] = (c.perEntity[entityType] ?? 0) + 1;
          }
        }
      } catch (err: any) {
        // Log and continue — one broken table must not blank out the whole Tags page.
        console.warn(`[getTagsWithUsage] scan failed for ${tableName}:`, err?.message ?? err);
      }
    }

    return tags.map((t) => {
      const c = counts.get(t._id)!;
      return {
        ...t,
        usageCount: c.total,
        perEntity: c.perEntity,
      };
    });
  },
});

/**
 * Given a tagId, return the entities (across all taggable tables) that
 * currently carry that tag. Used by the Tags page's "Used in" panel.
 *
 * Returns up to 50 entities per type, with their _id, a human-readable
 * label, and the table name. The caller can deep-link from there.
 */
export const getEntitiesByTag = query({
  args: { tagId: v.id("tags") },
  handler: async (ctx, { tagId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    // Verify the caller owns the tag (tags are user-scoped).
    const tag = await ctx.db.get(tagId);
    if (!tag || tag.userId !== userId) return [];

    const labelFns: Record<TaggableEntityType, (r: any) => string> = {
      clients: (r) => r.clientName ?? r.name ?? "Untitled client",
      projects: (r) => r.projectName ?? "Untitled project",
      proposals: (r) => r.title ?? "Untitled proposal",
      invoices: (r) => r.invoiceNumber ?? "Untitled invoice",
      workSessions: (r) =>
        `${r.projectName ?? "Untitled"} — ${r.clientName ?? "No client"}`,
      deals: (r) => r.title ?? "Untitled deal",
      goals: (r) => r.title ?? "Untitled goal",
    };

    const results: Array<{
      entityType: TaggableEntityType;
      entityId: string;
      label: string;
      updatedAt?: number;
    }> = [];

    for (const [entityType, tableName] of Object.entries(TAGGABLE_TABLES)) {
      // ponytail: runtime string table name.
      const rows = await ctx.db
        .query(tableName)
        .filter((q: any) => q.includes(q.field("tagIds"), tagId))
        .take(50);
      for (const r of rows) {
        results.push({
          entityType: entityType as TaggableEntityType,
          entityId: r._id,
          label: labelFns[entityType as TaggableEntityType](r),
          updatedAt: r.updatedAt ?? r.lastActivityAt ?? r.createdAt,
        });
      }
    }

    // Most-recently-updated first.
    results.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
    return results;
  },
});
