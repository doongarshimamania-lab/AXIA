// @ts-nocheck — Convex backend file with schema types not yet in generated types
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";

// ─────────────────────────────────────────────
// Shared validators
// ─────────────────────────────────────────────

const deliverableValidator = v.object({
  id: v.string(),
  name: v.string(),
  description: v.string(),
  revisionLimit: v.number(),
  revisionsUsed: v.number(),
  status: v.union(
    v.literal("pending"),
    v.literal("in_progress"),
    v.literal("completed"),
    v.literal("revisions_exceeded"),
  ),
});

const scopeStatusValidator = v.union(
  v.literal("draft"),
  v.literal("active"),
  v.literal("completed"),
  v.literal("archived"),
);

const changeOrderStatusValidator = v.union(
  v.literal("pending"),
  v.literal("approved"),
  v.literal("rejected"),
  v.literal("expired"),
);

// ═════════════════════════════════════════════
// SCOPE DEFINITIONS
// ═════════════════════════════════════════════

// ─────────────────────────────────────────────
// 1. CREATE
// ─────────────────────────────────────────────
export const create = mutation({
  args: {
    projectId: v.optional(v.id("projects")),
    proposalId: v.optional(v.id("proposals")),
    clientId: v.optional(v.id("clients")),
    deliverables: v.array(deliverableValidator),
    exclusions: v.optional(v.array(v.string())),
    assumptions: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    // Validate deliverables are not empty
    if (args.deliverables.length === 0) {
      throw new ConvexError("Scope must have at least one deliverable");
    }

    // Validate each deliverable
    for (const d of args.deliverables) {
      if (d.name.trim().length === 0) {
        throw new ConvexError("Deliverable name cannot be empty");
      }
      if (d.revisionLimit < 0) {
        throw new ConvexError("Revision limit cannot be negative");
      }
      if (d.revisionsUsed < 0) {
        throw new ConvexError("Revisions used cannot be negative");
      }
      if (d.revisionsUsed > d.revisionLimit) {
        throw new ConvexError("Revisions used cannot exceed revision limit");
      }
    }

    // Validate project ownership if provided
    if (args.projectId) {
      const project = await ctx.db.get(args.projectId);
      if (!project) throw new ConvexError("Project not found");
      if (project.userId !== userId) throw new ConvexError("Project does not belong to this user");
    }

    // Validate proposal ownership if provided
    if (args.proposalId) {
      const proposal = await ctx.db.get(args.proposalId);
      if (!proposal) throw new ConvexError("Proposal not found");
      if (proposal.userId !== userId) throw new ConvexError("Proposal does not belong to this user");
    }

    // Validate client ownership if provided
    if (args.clientId) {
      const client = await ctx.db.get(args.clientId);
      if (!client) throw new ConvexError("Client not found");
      if (client.userId !== userId) throw new ConvexError("Client does not belong to this user");
    }

    // Generate approval token
    const clientApprovalToken = crypto.randomUUID();

    const now = Date.now();

    const scopeId = await ctx.db.insert("scopeDefinitions", {
      userId,
      projectId: args.projectId,
      proposalId: args.proposalId,
      clientId: args.clientId,
      deliverables: args.deliverables,
      exclusions: args.exclusions,
      assumptions: args.assumptions,
      clientApprovedAt: undefined,
      clientApprovalToken,
      status: "draft",
      createdAt: now,
      updatedAt: now,
    });

    return scopeId;
  },
});

// ─────────────────────────────────────────────
// 2. UPDATE (only draft scopes)
// ─────────────────────────────────────────────
export const update = mutation({
  args: {
    scopeDefinitionId: v.id("scopeDefinitions"),
    projectId: v.optional(v.id("projects")),
    proposalId: v.optional(v.id("proposals")),
    clientId: v.optional(v.id("clients")),
    deliverables: v.optional(v.array(deliverableValidator)),
    exclusions: v.optional(v.array(v.string())),
    assumptions: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    const scope = await ctx.db.get(args.scopeDefinitionId);
    if (!scope) throw new ConvexError("Scope definition not found");
    if (scope.userId !== userId) throw new ConvexError("Not authorized to update this scope definition");

    // Only draft scopes can be edited
    if (scope.status !== "draft") {
      throw new ConvexError("Only draft scope definitions can be edited");
    }

    // Validate deliverables if provided
    if (args.deliverables !== undefined) {
      if (args.deliverables.length === 0) {
        throw new ConvexError("Scope must have at least one deliverable");
      }
      for (const d of args.deliverables) {
        if (d.name.trim().length === 0) {
          throw new ConvexError("Deliverable name cannot be empty");
        }
        if (d.revisionLimit < 0) {
          throw new ConvexError("Revision limit cannot be negative");
        }
        if (d.revisionsUsed < 0) {
          throw new ConvexError("Revisions used cannot be negative");
        }
      }
    }

    // Validate project ownership if changing
    if (args.projectId !== undefined) {
      const project = await ctx.db.get(args.projectId);
      if (!project) throw new ConvexError("Project not found");
      if (project.userId !== userId) throw new ConvexError("Project does not belong to this user");
    }

    // Validate proposal ownership if changing
    if (args.proposalId !== undefined) {
      const proposal = await ctx.db.get(args.proposalId);
      if (!proposal) throw new ConvexError("Proposal not found");
      if (proposal.userId !== userId) throw new ConvexError("Proposal does not belong to this user");
    }

    // Validate client ownership if changing
    if (args.clientId !== undefined) {
      const client = await ctx.db.get(args.clientId);
      if (!client) throw new ConvexError("Client not found");
      if (client.userId !== userId) throw new ConvexError("Client does not belong to this user");
    }

    // Build partial update object
    const updates: Record<string, unknown> = { updatedAt: Date.now() };

    if (args.projectId !== undefined) updates.projectId = args.projectId;
    if (args.proposalId !== undefined) updates.proposalId = args.proposalId;
    if (args.clientId !== undefined) updates.clientId = args.clientId;
    if (args.deliverables !== undefined) updates.deliverables = args.deliverables;
    if (args.exclusions !== undefined) updates.exclusions = args.exclusions;
    if (args.assumptions !== undefined) updates.assumptions = args.assumptions;

    await ctx.db.patch(args.scopeDefinitionId, updates);

    return args.scopeDefinitionId;
  },
});

// ─────────────────────────────────────────────
// 3. ACTIVATE (set status to "active")
// ─────────────────────────────────────────────
export const activate = mutation({
  args: {
    scopeDefinitionId: v.id("scopeDefinitions"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    const scope = await ctx.db.get(args.scopeDefinitionId);
    if (!scope) throw new ConvexError("Scope definition not found");
    if (scope.userId !== userId) throw new ConvexError("Not authorized to activate this scope definition");

    // Only draft scopes can be activated
    if (scope.status !== "draft") {
      throw new ConvexError("Only draft scope definitions can be activated");
    }

    const now = Date.now();

    const updates: Record<string, unknown> = {
      status: "active",
      updatedAt: now,
    };

    // If client already approved, record the approval time
    if (scope.clientApprovedAt) {
      // Already has clientApprovedAt, keep it
    }

    await ctx.db.patch(args.scopeDefinitionId, updates);

    return args.scopeDefinitionId;
  },
});

// ─────────────────────────────────────────────
// 4. CLIENT APPROVE (via approvalToken, no auth)
// ─────────────────────────────────────────────
export const clientApprove = mutation({
  args: {
    approvalToken: v.string(),
  },
  handler: async (ctx, args) => {
    const scope = await ctx.db
      .query("scopeDefinitions")
      .withIndex("by_approval_token", (q) => q.eq("clientApprovalToken", args.approvalToken))
      .first();

    if (!scope) throw new ConvexError("Invalid or expired approval link");

    // Only draft or active scopes can be approved
    if (scope.status !== "draft" && scope.status !== "active") {
      throw new ConvexError("This scope definition cannot be approved in its current state");
    }

    // Check if already approved
    if (scope.clientApprovedAt) {
      throw new ConvexError("This scope definition has already been approved");
    }

    const now = Date.now();

    await ctx.db.patch(scope._id, {
      clientApprovedAt: now,
      updatedAt: now,
    });

    return { success: true, scopeDefinitionId: scope._id };
  },
});

// ─────────────────────────────────────────────
// 5. RECORD REVISION
// ─────────────────────────────────────────────
export const recordRevision = mutation({
  args: {
    scopeDefinitionId: v.id("scopeDefinitions"),
    deliverableId: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    const scope = await ctx.db.get(args.scopeDefinitionId);
    if (!scope) throw new ConvexError("Scope definition not found");
    if (scope.userId !== userId) throw new ConvexError("Not authorized to record revisions for this scope");

    // Only active scopes can have revisions recorded
    if (scope.status !== "active") {
      throw new ConvexError("Revisions can only be recorded for active scope definitions");
    }

    // Find the deliverable
    const deliverableIndex = scope.deliverables.findIndex((d) => d.id === args.deliverableId);
    if (deliverableIndex === -1) {
      throw new ConvexError("Deliverable not found in this scope definition");
    }

    const deliverable = scope.deliverables[deliverableIndex];

    // Check if already exceeded
    if (deliverable.status === "revisions_exceeded") {
      throw new ConvexError("Revision limit already exceeded for this deliverable");
    }

    // Increment revisionsUsed
    const newRevisionsUsed = deliverable.revisionsUsed + 1;
    const updatedDeliverables = [...scope.deliverables];
    const now = Date.now();

    let autoCreatedChangeOrder = false;

    if (newRevisionsUsed >= deliverable.revisionLimit) {
      // Set status to revisions_exceeded
      updatedDeliverables[deliverableIndex] = {
        ...deliverable,
        revisionsUsed: newRevisionsUsed,
        status: "revisions_exceeded",
      };

      // Auto-generate a change order
      const changeOrderApprovalToken = crypto.randomUUID();

      await ctx.db.insert("scopeChangeOrders", {
        userId,
        scopeDefinitionId: args.scopeDefinitionId,
        clientId: scope.clientId,
        deliverableId: args.deliverableId,
        requestedBy: "freelancer",
        description: `Revision limit exceeded for "${deliverable.name}". ${newRevisionsUsed} of ${deliverable.revisionLimit} allowed revisions have been used. Additional revisions require a change order.`,
        costImpact: undefined,
        timelineImpactDays: undefined,
        additionalRevisions: undefined,
        status: "pending",
        clientApprovedAt: undefined,
        clientApprovalToken: changeOrderApprovalToken,
        clientRejectedAt: undefined,
        rejectionReason: undefined,
        invoiceId: undefined,
        createdAt: now,
        updatedAt: now,
      });

      autoCreatedChangeOrder = true;
    } else {
      updatedDeliverables[deliverableIndex] = {
        ...deliverable,
        revisionsUsed: newRevisionsUsed,
      };
    }

    await ctx.db.patch(args.scopeDefinitionId, {
      deliverables: updatedDeliverables,
      updatedAt: now,
    });

    return {
      scopeDefinitionId: args.scopeDefinitionId,
      deliverableId: args.deliverableId,
      revisionsUsed: newRevisionsUsed,
      revisionLimit: deliverable.revisionLimit,
      status: updatedDeliverables[deliverableIndex].status,
      autoCreatedChangeOrder,
    };
  },
});

// ─────────────────────────────────────────────
// 6. CHECK REVISION STATUS
// ─────────────────────────────────────────────
export const checkRevisionStatus = query({
  args: {
    scopeDefinitionId: v.id("scopeDefinitions"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    const scope = await ctx.db.get(args.scopeDefinitionId);
    if (!scope) throw new ConvexError("Scope definition not found");
    if (scope.userId !== userId) throw new ConvexError("Not authorized to view this scope definition");

    return scope.deliverables.map((d) => ({
      id: d.id,
      name: d.name,
      revisionLimit: d.revisionLimit,
      revisionsUsed: d.revisionsUsed,
      remainingRevisions: Math.max(0, d.revisionLimit - d.revisionsUsed),
      revisionUtilization: d.revisionLimit > 0
        ? Math.round((d.revisionsUsed / d.revisionLimit) * 100)
        : 0,
      status: d.status,
      isOverLimit: d.revisionsUsed >= d.revisionLimit,
    }));
  },
});

// ─────────────────────────────────────────────
// 7. CREATE CHANGE ORDER
// ─────────────────────────────────────────────
export const createChangeOrder = mutation({
  args: {
    scopeDefinitionId: v.id("scopeDefinitions"),
    clientId: v.optional(v.id("clients")),
    deliverableId: v.optional(v.string()),
    requestedBy: v.union(v.literal("client"), v.literal("freelancer")),
    description: v.string(),
    costImpact: v.optional(v.number()),
    timelineImpactDays: v.optional(v.number()),
    additionalRevisions: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    // Validate scope definition ownership
    const scope = await ctx.db.get(args.scopeDefinitionId);
    if (!scope) throw new ConvexError("Scope definition not found");
    if (scope.userId !== userId) throw new ConvexError("Not authorized to create change orders for this scope");

    // Only active scopes can have change orders
    if (scope.status !== "active") {
      throw new ConvexError("Change orders can only be created for active scope definitions");
    }

    // Validate description is not empty
    if (args.description.trim().length === 0) {
      throw new ConvexError("Change order description cannot be empty");
    }

    // Validate costImpact is non-negative if provided
    if (args.costImpact !== undefined && args.costImpact < 0) {
      throw new ConvexError("Cost impact cannot be negative");
    }

    // Validate timelineImpactDays is non-negative if provided
    if (args.timelineImpactDays !== undefined && args.timelineImpactDays < 0) {
      throw new ConvexError("Timeline impact cannot be negative");
    }

    // Validate additionalRevisions is non-negative if provided
    if (args.additionalRevisions !== undefined && args.additionalRevisions < 0) {
      throw new ConvexError("Additional revisions cannot be negative");
    }

    // Validate deliverableId exists in the scope if provided
    if (args.deliverableId) {
      const deliverable = scope.deliverables.find((d) => d.id === args.deliverableId);
      if (!deliverable) {
        throw new ConvexError("Deliverable not found in this scope definition");
      }
    }

    // Validate client ownership if provided
    if (args.clientId) {
      const client = await ctx.db.get(args.clientId);
      if (!client) throw new ConvexError("Client not found");
      if (client.userId !== userId) throw new ConvexError("Client does not belong to this user");
    }

    // Generate approval token
    const clientApprovalToken = crypto.randomUUID();

    const now = Date.now();

    const changeOrderId = await ctx.db.insert("scopeChangeOrders", {
      userId,
      scopeDefinitionId: args.scopeDefinitionId,
      clientId: args.clientId ?? scope.clientId,
      deliverableId: args.deliverableId,
      requestedBy: args.requestedBy,
      description: args.description.trim(),
      costImpact: args.costImpact,
      timelineImpactDays: args.timelineImpactDays,
      additionalRevisions: args.additionalRevisions,
      status: "pending",
      clientApprovedAt: undefined,
      clientApprovalToken,
      clientRejectedAt: undefined,
      rejectionReason: undefined,
      invoiceId: undefined,
      createdAt: now,
      updatedAt: now,
    });

    return changeOrderId;
  },
});

// ─────────────────────────────────────────────
// 8. CLIENT APPROVE CHANGE ORDER (no auth)
// ─────────────────────────────────────────────
export const clientApproveChangeOrder = mutation({
  args: {
    approvalToken: v.string(),
  },
  handler: async (ctx, args) => {
    const changeOrder = await ctx.db
      .query("scopeChangeOrders")
      .withIndex("by_approval_token", (q) => q.eq("clientApprovalToken", args.approvalToken))
      .first();

    if (!changeOrder) throw new ConvexError("Invalid or expired change order approval link");

    // Only pending change orders can be approved
    if (changeOrder.status !== "pending") {
      throw new ConvexError("This change order cannot be approved in its current state");
    }

    const now = Date.now();

    await ctx.db.patch(changeOrder._id, {
      status: "approved",
      clientApprovedAt: now,
      updatedAt: now,
    });

    // If additionalRevisions is specified, update the scope deliverable's revision limit
    if (changeOrder.additionalRevisions && changeOrder.additionalRevisions > 0 && changeOrder.deliverableId) {
      const scope = await ctx.db.get(changeOrder.scopeDefinitionId);
      if (scope) {
        const updatedDeliverables = scope.deliverables.map((d) => {
          if (d.id === changeOrder.deliverableId) {
            return {
              ...d,
              revisionLimit: d.revisionLimit + changeOrder.additionalRevisions!,
              // If status was revisions_exceeded, reset to in_progress since we now have more revisions
              status: d.status === "revisions_exceeded" ? "in_progress" as const : d.status,
            };
          }
          return d;
        });

        await ctx.db.patch(changeOrder.scopeDefinitionId, {
          deliverables: updatedDeliverables,
          updatedAt: now,
        });
      }
    }

    return { success: true, changeOrderId: changeOrder._id };
  },
});

// ─────────────────────────────────────────────
// 9. CLIENT REJECT CHANGE ORDER (no auth)
// ─────────────────────────────────────────────
export const clientRejectChangeOrder = mutation({
  args: {
    approvalToken: v.string(),
    rejectionReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const changeOrder = await ctx.db
      .query("scopeChangeOrders")
      .withIndex("by_approval_token", (q) => q.eq("clientApprovalToken", args.approvalToken))
      .first();

    if (!changeOrder) throw new ConvexError("Invalid or expired change order approval link");

    // Only pending change orders can be rejected
    if (changeOrder.status !== "pending") {
      throw new ConvexError("This change order cannot be rejected in its current state");
    }

    const now = Date.now();

    await ctx.db.patch(changeOrder._id, {
      status: "rejected",
      clientRejectedAt: now,
      rejectionReason: args.rejectionReason,
      updatedAt: now,
    });

    return { success: true, changeOrderId: changeOrder._id };
  },
});

// ─────────────────────────────────────────────
// 10. GET SCOPE DEFINITION
// ─────────────────────────────────────────────
export const get = query({
  args: {
    scopeDefinitionId: v.id("scopeDefinitions"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    const scope = await ctx.db.get(args.scopeDefinitionId);
    if (!scope) throw new ConvexError("Scope definition not found");
    if (scope.userId !== userId) throw new ConvexError("Not authorized to view this scope definition");

    return scope;
  },
});

// ─────────────────────────────────────────────
// 11. LIST SCOPE DEFINITIONS
// ─────────────────────────────────────────────
export const list = query({
  args: {
    status: v.optional(scopeStatusValidator),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    const allScopes = await ctx.db
      .query("scopeDefinitions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    if (args.status) {
      return allScopes.filter((s) => s.status === args.status);
    }

    return allScopes.sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

// ─────────────────────────────────────────────
// 12. GET CHANGE ORDERS (for a scope definition)
// ─────────────────────────────────────────────
export const getChangeOrders = query({
  args: {
    scopeDefinitionId: v.id("scopeDefinitions"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    // Validate scope ownership
    const scope = await ctx.db.get(args.scopeDefinitionId);
    if (!scope) throw new ConvexError("Scope definition not found");
    if (scope.userId !== userId) throw new ConvexError("Not authorized to view this scope definition");

    const changeOrders = await ctx.db
      .query("scopeChangeOrders")
      .withIndex("by_scope", (q) => q.eq("scopeDefinitionId", args.scopeDefinitionId))
      .collect();

    return changeOrders.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// ─────────────────────────────────────────────
// 13. GET CHANGE ORDER (single)
// ─────────────────────────────────────────────
export const getChangeOrder = query({
  args: {
    changeOrderId: v.id("scopeChangeOrders"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    const changeOrder = await ctx.db.get(args.changeOrderId);
    if (!changeOrder) throw new ConvexError("Change order not found");
    if (changeOrder.userId !== userId) throw new ConvexError("Not authorized to view this change order");

    return changeOrder;
  },
});

// ─────────────────────────────────────────────
// 14. LINK CHANGE ORDER TO INVOICE
// ─────────────────────────────────────────────
export const linkChangeOrderToInvoice = mutation({
  args: {
    changeOrderId: v.id("scopeChangeOrders"),
    invoiceId: v.id("invoices"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    const changeOrder = await ctx.db.get(args.changeOrderId);
    if (!changeOrder) throw new ConvexError("Change order not found");
    if (changeOrder.userId !== userId) throw new ConvexError("Not authorized to update this change order");

    // Change order must be approved before linking to invoice
    if (changeOrder.status !== "approved") {
      throw new ConvexError("Only approved change orders can be linked to invoices");
    }

    // Validate invoice ownership
    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice) throw new ConvexError("Invoice not found");
    if (invoice.userId !== userId) throw new ConvexError("Invoice does not belong to this user");

    const now = Date.now();

    await ctx.db.patch(args.changeOrderId, {
      invoiceId: args.invoiceId,
      updatedAt: now,
    });

    return args.changeOrderId;
  },
});
