// ──────────────────────────────────────────────────────────────────────────────
// portal/changeOrders.ts — Client-facing change order list + approve/decline.
//
// Change orders live in scopeChangeOrders (tables/scope.ts). The freelancer
// creates them when scope-creep is detected; the client approves/declines here.
//
// SECURITY:
//   - change_orders:approve scope required for approve/decline mutations
//   - Per-CO ownership check: the CO's scopeDef must belong to the JWT's fid
//   - Idempotent: re-approving an already-approved CO returns success (no error)
//   - Audit logged with hashed token + CO id
// ──────────────────────────────────────────────────────────────────────────────

import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { verifyPortalScope, PortalScope } from "../lib/portalAuth";
import { logPortalAction } from "../lib/portalAuditLog";
import { rateLimitByToken, RATE_LIMITS_PORTAL } from "./rateLimit";

const READ_SCOPES: PortalScope[] = ["deliverables:read"];
const APPROVE_SCOPES: PortalScope[] = ["change_orders:approve"];

/**
 * List all change orders for the client (across all their projects).
 */
export const listMyChangeOrders = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const claims = await verifyPortalScope(ctx, args.token, READ_SCOPES);

    // Get all scopeDefinitions for this freelancer, then their COs
    const scopeDefs = await ctx.db
      .query("scopeDefinitions")
      .withIndex("by_user", (q) => q.eq("userId", claims.fid as any))
      .collect();

    const scopeIds = scopeDefs.map((s) => s._id);
    const scopeById = new Map(scopeDefs.map((s) => [s._id, s]));

    const changeOrders: any[] = [];
    for (const scopeId of scopeIds) {
      const cos = await ctx.db
        .query("scopeChangeOrders")
        .withIndex("by_scope", (q) => q.eq("scopeId", scopeId))
        .collect();
      for (const co of cos) {
        const scope = scopeById.get(co.scopeId);
        changeOrders.push({
          id: co._id,
          title: co.title,
          description: co.description,
          changeType: co.changeType,
          impact: co.impact,
          reason: co.reason,
          status: co.status,
          createdAt: co.createdAt,
          clientApprovedAt: co.clientApprovedAt ?? null,
          scopeTitle: scope?.title ?? null,
        });
      }
    }

    // Sort: pending first, then most recent
    changeOrders.sort((a, b) => {
      if (a.status === "pending" && b.status !== "pending") return -1;
      if (b.status === "pending" && a.status !== "pending") return 1;
      return b.createdAt - a.createdAt;
    });

    return changeOrders;
  },
});

/**
 * Approve a change order. Idempotent — if already approved, returns success.
 */
export const approveChangeOrder = mutation({
  args: {
    token: v.string(),
    changeOrderId: v.id("scopeChangeOrders"),
  },
  handler: async (ctx, args) => {
    const claims = await verifyPortalScope(ctx, args.token, APPROVE_SCOPES);
    await rateLimitByToken(ctx, "portal_approveCO", claims.cid, RATE_LIMITS_PORTAL.APPROVE_CO);

    const co = await ctx.db.get(args.changeOrderId);
    if (!co) throw new Error("Change order not found");

    // Verify the CO's scopeDef belongs to this freelancer
    const scopeDef = await ctx.db.get(co.scopeId);
    if (!scopeDef) throw new Error("Scope not found");
    if (scopeDef.userId !== (claims.fid as any)) {
      // ponytail: don't reveal that the CO exists for another client
      throw new Error("Change order not found");
    }

    // Idempotent
    if (co.status === "approved") {
      return { alreadyApproved: true, changeOrderId: co._id };
    }
    if (co.status === "rejected") {
      throw new Error("Change order was already rejected");
    }

    await ctx.db.patch(co._id, {
      status: "approved",
      clientApprovedAt: Date.now(),
    });

    // If the CO increases the revision limit, apply it now
    if (co.newLimit !== undefined && co.originalLimit !== undefined) {
      await ctx.db.patch(scopeDef._id, {
        revisionLimit: co.newLimit,
      });
    }

    await logPortalAction(ctx, {
      token: args.token,
      clientId: claims.cid as any,
      workspaceId: claims.wid as any,
      action: "approve_change_order",
      targetChangeOrderId: co._id,
      result: { title: co.title, changeType: co.changeType },
    });

    return { approved: true, changeOrderId: co._id };
  },
});

/**
 * Decline a change order. Idempotent.
 */
export const declineChangeOrder = mutation({
  args: {
    token: v.string(),
    changeOrderId: v.id("scopeChangeOrders"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const claims = await verifyPortalScope(ctx, args.token, APPROVE_SCOPES);
    await rateLimitByToken(ctx, "portal_declineCO", claims.cid, RATE_LIMITS_PORTAL.APPROVE_CO);

    const co = await ctx.db.get(args.changeOrderId);
    if (!co) throw new Error("Change order not found");

    const scopeDef = await ctx.db.get(co.scopeId);
    if (!scopeDef) throw new Error("Scope not found");
    if (scopeDef.userId !== (claims.fid as any)) {
      throw new Error("Change order not found");
    }

    if (co.status === "rejected") {
      return { alreadyRejected: true, changeOrderId: co._id };
    }
    if (co.status === "approved") {
      throw new Error("Change order was already approved");
    }

    await ctx.db.patch(co._id, {
      status: "rejected",
      clientApprovedAt: Date.now(), // marks decision time
    });

    await logPortalAction(ctx, {
      token: args.token,
      clientId: claims.cid as any,
      workspaceId: claims.wid as any,
      action: "decline_change_order",
      targetChangeOrderId: co._id,
      result: { title: co.title, reason: args.reason?.slice(0, 500) },
    });

    return { declined: true, changeOrderId: co._id };
  },
});
