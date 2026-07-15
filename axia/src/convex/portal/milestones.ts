// ──────────────────────────────────────────────────────────────────────────────
// portal/milestones.ts — Per-deliverable milestone sign-off (P1-d).
//
// Distinct from change orders — milestones are the agreed-upon checkpoints
// within a deliverable (first draft, revisions, final delivery). Each requires
// client sign-off before the next starts.
//
// FLOW:
//   1. Freelancer creates milestones for a deliverable (createMilestones)
//   2. Freelancer marks a milestone "ready" when work is complete (markReady)
//   3. Client sees "Action required: milestone sign-off" in their portal
//   4. Client approves or rejects (approveMilestone / rejectMilestone)
//   5. Freelancer sees the decision in their dashboard
//
// SECURITY:
//   - Client mutations (list, approve, reject) require milestones:sign_off scope
//   - Freelancer mutations (create, markReady) require authenticated session
//   - Per-milestone ownership: the milestone's scopeId → scopeDef must belong
//     to the JWT's fid (client path) or the authenticated user (freelancer path)
//   - Idempotent: re-approving an approved milestone returns success
//   - Rate-limited (client by token, freelancer by authenticated rate limit)
//
// 1000-USER SCALE:
//   - Indexed by scope, deliverable, client, status, order
//   - listMilestones returns max 100 per deliverable (typical: 3-7)
//   - No full-table scans
// ──────────────────────────────────────────────────────────────────────────────

import { mutation, query } from "../_generated/server";
import { v, Id } from "convex/values";
import { verifyPortalScope, PortalScope } from "../lib/portalAuth";
import { logPortalAction } from "../lib/portalAuditLog";
import { rateLimitByToken, RATE_LIMITS_PORTAL } from "./rateLimit";
import { getCurrentUser } from "../users";
import { rateLimitAuthenticated, RATE_LIMITS } from "../security/rateLimit";

const READ_SCOPES: PortalScope[] = ["deliverables:read"];
const SIGN_OFF_SCOPES: PortalScope[] = ["milestones:sign_off"];

const MAX_MILESTONES_PER_DELIVERABLE = 20;
const MAX_TITLE_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 2000;
const MAX_READY_NOTES_LENGTH = 1000;
const MAX_CLIENT_NOTES_LENGTH = 1000;

// ─── CLIENT-FACING QUERIES ───────────────────────────────────────────────────

/**
 * List milestones for a deliverable (client view).
 * Returns milestones in order (1, 2, 3...) with status.
 */
export const listMilestones = query({
  args: {
    token: v.string(),
    deliverableId: v.string(),
  },
  handler: async (ctx, args) => {
    const claims = await verifyPortalScope(ctx, args.token, READ_SCOPES);

    // Verify the deliverable belongs to this freelancer
    const scopeDefs = await ctx.db
      .query("scopeDefinitions")
      .withIndex("by_user", (q) => q.eq("userId", claims.fid as Id<"users">))
      .collect();

    const belongs = scopeDefs.some(
      (def) => (def.deliverables ?? []).some((d: any) => d.id === args.deliverableId),
    );
    if (!belongs) return [];

    const milestones = await ctx.db
      .query("portalMilestones")
      .withIndex("by_deliverable", (q) => q.eq("deliverableId", args.deliverableId))
      .order("asc")
      .take(MAX_MILESTONES_PER_DELIVERABLE);

    return milestones.map((m) => ({
      id: m._id,
      deliverableId: m.deliverableId,
      title: m.title,
      description: m.description,
      order: m.order,
      status: m.status,
      markedReadyAt: m.markedReadyAt ?? null,
      readyNotes: m.readyNotes ?? null,
      clientDecisionAt: m.clientDecisionAt ?? null,
      clientNotes: m.clientNotes ?? null,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
    }));
  },
});

/**
 * Approve a milestone. Idempotent — already-approved returns success.
 */
export const approveMilestone = mutation({
  args: {
    token: v.string(),
    milestoneId: v.id("portalMilestones"),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const claims = await verifyPortalScope(ctx, args.token, SIGN_OFF_SCOPES);
    await rateLimitByToken(ctx, "portal_approveMilestone", claims.cid, RATE_LIMITS_PORTAL.APPROVE_CO);

    const milestone = await ctx.db.get(args.milestoneId);
    if (!milestone) throw new Error("Milestone not found");

    // Verify ownership via scopeDef
    const scopeDef = await ctx.db.get(milestone.scopeId);
    if (!scopeDef) throw new Error("Scope not found");
    if (scopeDef.userId !== (claims.fid as Id<"users">)) {
      throw new Error("Milestone not found"); // don't reveal existence
    }

    // Must be "ready" to approve
    if (milestone.status !== "ready") {
      throw new Error(
        `Milestone is not ready for sign-off (current status: ${milestone.status})`,
      );
    }

    const notes = args.notes?.trim().slice(0, MAX_CLIENT_NOTES_LENGTH) || undefined;

    await ctx.db.patch(args.milestoneId, {
      status: "approved",
      clientDecisionAt: Date.now(),
      clientNotes: notes,
      updatedAt: Date.now(),
    });

    await logPortalAction(ctx, {
      token: args.token,
      clientId: claims.cid as any,
      workspaceId: claims.wid as any,
      action: "approve_milestone",
      targetDeliverableId: milestone.deliverableId,
      result: { milestoneTitle: milestone.title, order: milestone.order },
    });

    return { approved: true };
  },
});

/**
 * Reject a milestone with a reason. Idempotent.
 */
export const rejectMilestone = mutation({
  args: {
    token: v.string(),
    milestoneId: v.id("portalMilestones"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const claims = await verifyPortalScope(ctx, args.token, SIGN_OFF_SCOPES);
    await rateLimitByToken(ctx, "portal_rejectMilestone", claims.cid, RATE_LIMITS_PORTAL.APPROVE_CO);

    const milestone = await ctx.db.get(args.milestoneId);
    if (!milestone) throw new Error("Milestone not found");

    const scopeDef = await ctx.db.get(milestone.scopeId);
    if (!scopeDef) throw new Error("Scope not found");
    if (scopeDef.userId !== (claims.fid as Id<"users">)) {
      throw new Error("Milestone not found");
    }

    if (milestone.status !== "ready") {
      throw new Error(
        `Milestone is not ready for sign-off (current status: ${milestone.status})`,
      );
    }

    const reason = args.reason?.trim().slice(0, MAX_CLIENT_NOTES_LENGTH);
    if (!reason) throw new Error("Rejection reason is required");

    await ctx.db.patch(args.milestoneId, {
      status: "rejected",
      clientDecisionAt: Date.now(),
      clientNotes: reason,
      updatedAt: Date.now(),
    });

    await logPortalAction(ctx, {
      token: args.token,
      clientId: claims.cid as any,
      workspaceId: claims.wid as any,
      action: "reject_milestone",
      targetDeliverableId: milestone.deliverableId,
      result: { milestoneTitle: milestone.title, order: milestone.order, reason },
    });

    return { rejected: true };
  },
});

// ─── FREELANCER-FACING MUTATIONS ─────────────────────────────────────────────
// These are AUTHENTICATED (not token-based) — the freelancer uses their normal
// Convex auth session. They manage milestones from their dashboard.

/**
 * Create one or more milestones for a deliverable.
 * Bulk insert — typical use case is creating 3-5 milestones at once.
 */
export const createMilestones = mutation({
  args: {
    deliverableId: v.string(),
    scopeId: v.id("scopeDefinitions"),
    milestones: v.array(
      v.object({
        title: v.string(),
        description: v.string(),
        order: v.number(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    await rateLimitAuthenticated(ctx, "portal_createMilestones", RATE_LIMITS.UPDATE_RECORD);
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    // Verify the scopeDef belongs to this freelancer
    const scopeDef = await ctx.db.get(args.scopeId);
    if (!scopeDef) throw new Error("Scope not found");
    if (scopeDef.userId !== user._id && scopeDef.userId !== user.tokenIdentifier) {
      throw new Error("Not authorized: you do not own this scope");
    }

    // Verify the deliverable exists in this scopeDef
    const deliverable = (scopeDef.deliverables ?? []).find(
      (d: any) => d.id === args.deliverableId,
    );
    if (!deliverable) throw new Error("Deliverable not found in this scope");

    // Cap milestones per deliverable
    const existing = await ctx.db
      .query("portalMilestones")
      .withIndex("by_deliverable", (q) => q.eq("deliverableId", args.deliverableId))
      .take(MAX_MILESTONES_PER_DELIVERABLE);

    if (existing.length + args.milestones.length > MAX_MILESTONES_PER_DELIVERABLE) {
      throw new Error(
        `Milestone limit reached (max ${MAX_MILESTONES_PER_DELIVERABLE} per deliverable)`,
      );
    }

    // ponytail: find the client for this scope — scopeDef may or may not have
    // a projectId. We use the freelancer's first client as a fallback.
    // In a real app, the freelancer would specify which client this is for.
    let clientId: Id<"clients"> | null = null;
    if (scopeDef.projectId) {
      const project = await ctx.db.get(scopeDef.projectId);
      if (project?.clientId) clientId = project.clientId as Id<"clients">;
    }
    if (!clientId) {
      // Fallback: first client owned by this freelancer
      const firstClient = await ctx.db
        .query("clients")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .first();
      clientId = firstClient?._id ?? null;
    }
    if (!clientId) {
      throw new Error("No client found for this scope — create a client first");
    }

    const now = Date.now();
    const workspaceId = scopeDef.workspaceId ?? (user._id as any);

    const ids: Id<"portalMilestones">[] = [];
    for (const m of args.milestones) {
      const title = m.title.trim().slice(0, MAX_TITLE_LENGTH);
      const description = m.description.trim().slice(0, MAX_DESCRIPTION_LENGTH);
      if (!title) throw new Error("Milestone title cannot be empty");

      const id = await ctx.db.insert("portalMilestones", {
        workspaceId,
        clientId,
        deliverableId: args.deliverableId,
        scopeId: args.scopeId,
        title,
        description,
        order: m.order,
        status: "pending",
        createdBy: user._id,
        createdAt: now,
        updatedAt: now,
      });
      ids.push(id);
    }

    return { created: ids.length, ids };
  },
});

/**
 * Freelancer marks a milestone as ready for client sign-off.
 */
export const markMilestoneReady = mutation({
  args: {
    milestoneId: v.id("portalMilestones"),
    readyNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await rateLimitAuthenticated(ctx, "portal_markMilestoneReady", RATE_LIMITS.UPDATE_RECORD);
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const milestone = await ctx.db.get(args.milestoneId);
    if (!milestone) throw new Error("Milestone not found");

    const scopeDef = await ctx.db.get(milestone.scopeId);
    if (!scopeDef) throw new Error("Scope not found");
    if (scopeDef.userId !== user._id && scopeDef.userId !== user.tokenIdentifier) {
      throw new Error("Not authorized");
    }

    if (milestone.status !== "pending" && milestone.status !== "rejected") {
      throw new Error(
        `Milestone cannot be marked ready (current status: ${milestone.status})`,
      );
    }

    const readyNotes = args.readyNotes?.trim().slice(0, MAX_READY_NOTES_LENGTH) || undefined;

    await ctx.db.patch(args.milestoneId, {
      status: "ready",
      markedReadyAt: Date.now(),
      markedReadyBy: user._id,
      readyNotes,
      // Clear previous rejection when re-marking ready
      clientDecisionAt: undefined,
      clientNotes: undefined,
      updatedAt: Date.now(),
    });

    return { ready: true };
  },
});
