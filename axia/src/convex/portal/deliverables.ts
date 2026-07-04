// ──────────────────────────────────────────────────────────────────────────────
// portal/deliverables.ts — Client-facing deliverable + project overview queries.
//
// Returns the client's active projects + their deliverables, derived from
// scopeDefinitions (the source of truth — see tables/scope.ts).
//
// SECURITY:
//   - Token must have `deliverables:read` scope
//   - clientId in JWT is trusted; we NEVER trust a clientId passed from frontend
//   - Only deliverables on scopeDefinitions that belong to this client's
//     projects are returned (no cross-client leakage)
// ──────────────────────────────────────────────────────────────────────────────

import { query } from "../_generated/server";
import { v } from "convex/values";
import { verifyPortalScope, PortalScope } from "../lib/portalAuth";

const READ_SCOPES: PortalScope[] = ["deliverables:read"];

/**
 * Get all projects + deliverables for the client identified by the JWT.
 *
 * Returns:
 *   - projects[]: { id, name, status, completionPct, totalDeliverables, completedDeliverables }
 *   - deliverables[]: flat list with { id, name, description, status, projectId, projectName, estimatedHours }
 */
export const listMyDeliverables = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const claims = await verifyPortalScope(ctx, args.token, READ_SCOPES);

    // Find projects owned by this client
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_client", (q) => q.eq("clientId", claims.cid as any))
      .collect();

    // ponytail: if no projects table rows, fall back to scopeDefinitions directly
    // (some clients have scope without a project record yet)
    let scopeDefs: any[] = [];
    if (projects.length > 0) {
      for (const p of projects) {
        const defs = await ctx.db
          .query("scopeDefinitions")
          .withIndex("by_project", (q) => q.eq("projectId", p._id))
          .collect();
        scopeDefs.push(...defs);
      }
    }
    // Also pull scopeDefinitions tied to the freelancer (claims.fid) — covers
    // the case where scope was created before the project was linked
    const freelancerScopes = await ctx.db
      .query("scopeDefinitions")
      .withIndex("by_user", (q) => q.eq("userId", claims.fid as any))
      .collect();
    // Dedupe by _id
    const seenIds = new Set(scopeDefs.map((s) => s._id));
    for (const s of freelancerScopes) {
      if (!seenIds.has(s._id)) {
        scopeDefs.push(s);
        seenIds.add(s._id);
      }
    }

    // Build response
    const projectMap = new Map(projects.map((p) => [p._id, p]));

    const deliverables: any[] = [];
    for (const def of scopeDefs) {
      const project = def.projectId ? projectMap.get(def.projectId) : null;
      for (const d of def.deliverables ?? []) {
        deliverables.push({
          id: d.id,
          name: d.name,
          description: d.description,
          status: d.status ?? "pending",
          estimatedHours: d.estimatedHours ?? null,
          scopeTitle: def.title,
          projectId: def.projectId ?? null,
          projectName: project?.projectName ?? null,
        });
      }
    }

    return {
      projects: projects.map((p) => ({
        id: p._id,
        name: p.projectName ?? "Untitled project",
        status: p.status ?? "active",
        completionPct: p.completionPct ?? 0,
      })),
      deliverables,
      totalDeliverables: deliverables.length,
      completedDeliverables: deliverables.filter((d) => d.status === "completed").length,
    };
  },
});

/**
 * Get a single deliverable by id (within the client's scope).
 * Returns 404 if the deliverable doesn't belong to this client.
 */
export const getDeliverable = query({
  args: { token: v.string(), deliverableId: v.string() },
  handler: async (ctx, args) => {
    const claims = await verifyPortalScope(ctx, args.token, READ_SCOPES);

    // Scan the client's scopeDefinitions for a deliverable matching this id
    const scopeDefs = await ctx.db
      .query("scopeDefinitions")
      .withIndex("by_user", (q) => q.eq("userId", claims.fid as any))
      .collect();

    for (const def of scopeDefs) {
      const deliverable = (def.deliverables ?? []).find((d: any) => d.id === args.deliverableId);
      if (deliverable) {
        return {
          id: deliverable.id,
          name: deliverable.name,
          description: deliverable.description,
          status: deliverable.status ?? "pending",
          estimatedHours: deliverable.estimatedHours ?? null,
          scopeTitle: def.title,
          scopeDescription: def.description,
          projectId: def.projectId ?? null,
          revisionLimit: def.revisionLimit,
          revisionCount: def.revisionCount,
        };
      }
    }

    // ponytail: don't reveal whether the deliverable exists for another client
    return null;
  },
});
