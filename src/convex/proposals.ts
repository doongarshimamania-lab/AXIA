// @ts-nocheck — Convex backend file with schema types not yet in generated types
import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import { requireWorkspaceAccess, getWorkspaceMembership, getRecordAccess, requireRecordAccess } from "./permissions";
import { getUserVisibility, isRecordVisible } from "./workspaceFilter";

// ─────────────────────────────────────────────
// Shared validators
// ─────────────────────────────────────────────

const contentSectionValidator = v.object({
  id: v.string(),
  type: v.union(
    v.literal("heading"),
    v.literal("text"),
    v.literal("image"),
    v.literal("pricing_table"),
    v.literal("delimiter"),
    v.literal("terms"),
  ),
  data: v.any(),
});

const proposalStatusValidator = v.union(
  v.literal("draft"),
  v.literal("sent"),
  v.literal("viewed"),
  v.literal("signed"),
  v.literal("expired"),
  v.literal("declined"),
);

// ═════════════════════════════════════════════
// PROPOSALS
// ═════════════════════════════════════════════

// ─────────────────────────────────────────────
// 1. CREATE
// ─────────────────────────────────────────────
export const create = mutation({
  args: {
    workspaceId: v.optional(v.id("workspaces")),
    teamId: v.optional(v.id("teams")),
    clientId: v.id("clients"),
    dealId: v.optional(v.id("deals")),
    title: v.string(),
    content: v.array(contentSectionValidator),
    templateId: v.optional(v.id("proposalTemplates")),
    totalValue: v.optional(v.number()),
    currency: v.optional(v.string()),
    validUntil: v.optional(v.number()),
    customFields: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    // If workspaceId provided, verify membership
    if (args.workspaceId) {
      await requireWorkspaceAccess(ctx, args.workspaceId, "member");
    }

    // Verify client access
    const client = await ctx.db.get(args.clientId);
    if (!client) throw new ConvexError("Client not found");
    if (client.workspaceId) {
      const access = await getRecordAccess(ctx, client, userId);
      if (!access) throw new ConvexError("Not authorized: client belongs to another workspace");
    } else if (client.userId !== userId) {
      throw new ConvexError("Not authorized: client belongs to another user");
    }

    // Verify deal access if provided
    if (args.dealId) {
      const deal = await ctx.db.get(args.dealId);
      if (!deal) throw new ConvexError("Deal not found");
      if (deal.workspaceId) {
        const access = await getRecordAccess(ctx, deal, userId);
        if (!access) throw new ConvexError("Not authorized: deal belongs to another workspace");
      } else if (deal.userId !== userId) {
        throw new ConvexError("Not authorized: deal belongs to another user");
      }
    }

    // Verify template exists if provided
    if (args.templateId) {
      const template = await ctx.db.get(args.templateId);
      if (!template) throw new ConvexError("Template not found");
    }

    // Validate title is not empty
    if (args.title.trim().length === 0) {
      throw new ConvexError("Title cannot be empty");
    }

    // Validate totalValue is non-negative if provided
    if (args.totalValue !== undefined && args.totalValue < 0) {
      throw new ConvexError("Total value cannot be negative");
    }

    // Generate unique publicToken using crypto
    const publicToken = crypto.randomUUID();

    const now = Date.now();
    const { workspaceId, teamId, customFields, ...rest } = args;

    const proposalId = await ctx.db.insert("proposals", {
      userId,
      workspaceId: workspaceId ?? undefined,
      createdBy: userId,
      teamId: teamId ?? undefined,
      customFields: customFields ?? undefined,
      clientId: rest.clientId,
      dealId: rest.dealId,
      title: rest.title.trim(),
      content: rest.content,
      templateId: rest.templateId,
      status: "draft",
      totalValue: rest.totalValue,
      currency: rest.currency ?? "USD",
      validUntil: rest.validUntil,
      sentAt: undefined,
      viewedAt: undefined,
      viewedCount: 0,
      signedAt: undefined,
      signedIp: undefined,
      signedName: undefined,
      declinedAt: undefined,
      declinedReason: undefined,
      publicToken,
      version: 1,
      createdAt: now,
      updatedAt: now,
    });

    // Increment template usage count if a template was used
    if (args.templateId) {
      const template = await ctx.db.get(args.templateId);
      if (template) {
        await ctx.db.patch(args.templateId, {
          usageCount: (template.usageCount ?? 0) + 1,
        });
      }
    }

    return proposalId;
  },
});

// ─────────────────────────────────────────────
// 2. UPDATE (partial — only draft proposals)
// ─────────────────────────────────────────────
export const update = mutation({
  args: {
    proposalId: v.id("proposals"),
    clientId: v.optional(v.id("clients")),
    dealId: v.optional(v.id("deals")),
    title: v.optional(v.string()),
    content: v.optional(v.array(contentSectionValidator)),
    templateId: v.optional(v.id("proposalTemplates")),
    totalValue: v.optional(v.number()),
    currency: v.optional(v.string()),
    validUntil: v.optional(v.number()),
    teamId: v.optional(v.id("teams")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    const proposal = await ctx.db.get(args.proposalId);
    if (!proposal) throw new ConvexError("Proposal not found");

    // Check workspace access or direct ownership
    if (proposal.workspaceId) {
      await requireRecordAccess(ctx, proposal, "collaborate");
    } else if (proposal.userId !== userId) {
      throw new ConvexError("Not authorized to update this proposal");
    }

    // Only draft proposals can be edited
    if (proposal.status !== "draft") {
      throw new ConvexError("Only draft proposals can be edited");
    }

    // Validate title if provided
    if (args.title !== undefined && args.title.trim().length === 0) {
      throw new ConvexError("Title cannot be empty");
    }

    // Validate totalValue if provided
    if (args.totalValue !== undefined && args.totalValue < 0) {
      throw new ConvexError("Total value cannot be negative");
    }

    // Verify client access if changing client
    if (args.clientId !== undefined) {
      const client = await ctx.db.get(args.clientId);
      if (!client) throw new ConvexError("Client not found");
      if (client.workspaceId) {
        const access = await getRecordAccess(ctx, client, userId);
        if (!access) throw new ConvexError("Not authorized: client belongs to another workspace");
      } else if (client.userId !== userId) {
        throw new ConvexError("Not authorized: client belongs to another user");
      }
    }

    // Verify deal access if changing deal
    if (args.dealId !== undefined) {
      const deal = await ctx.db.get(args.dealId);
      if (!deal) throw new ConvexError("Deal not found");
      if (deal.workspaceId) {
        const access = await getRecordAccess(ctx, deal, userId);
        if (!access) throw new ConvexError("Not authorized: deal belongs to another workspace");
      } else if (deal.userId !== userId) {
        throw new ConvexError("Not authorized: deal belongs to another user");
      }
    }

    // Build partial update object
    const updates: Record<string, unknown> = { updatedAt: Date.now() };

    if (args.clientId !== undefined) updates.clientId = args.clientId;
    if (args.dealId !== undefined) updates.dealId = args.dealId;
    if (args.title !== undefined) updates.title = args.title.trim();
    if (args.content !== undefined) updates.content = args.content;
    if (args.templateId !== undefined) updates.templateId = args.templateId;
    if (args.totalValue !== undefined) updates.totalValue = args.totalValue;
    if (args.currency !== undefined) updates.currency = args.currency;
    if (args.validUntil !== undefined) updates.validUntil = args.validUntil;
    if (args.teamId !== undefined) updates.teamId = args.teamId;

    await ctx.db.patch(args.proposalId, updates);

    return args.proposalId;
  },
});

// ─────────────────────────────────────────────
// 3. SEND (draft → sent)
// ─────────────────────────────────────────────
export const send = mutation({
  args: {
    proposalId: v.id("proposals"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    const proposal = await ctx.db.get(args.proposalId);
    if (!proposal) throw new ConvexError("Proposal not found");

    // Check workspace access or direct ownership
    if (proposal.workspaceId) {
      await requireRecordAccess(ctx, proposal, "collaborate");
    } else if (proposal.userId !== userId) {
      throw new ConvexError("Not authorized to send this proposal");
    }

    // Only draft proposals can be sent
    if (proposal.status !== "draft") {
      throw new ConvexError("Only draft proposals can be sent");
    }

    const now = Date.now();

    await ctx.db.patch(args.proposalId, {
      status: "sent",
      sentAt: now,
      updatedAt: now,
    });

    // Schedule follow-ups for Day 3, 7, and 14
    await scheduleFollowUpsInternal(ctx, args.proposalId, userId, proposal.title, proposal.totalValue, now);

    return args.proposalId;
  },
});

// ─────────────────────────────────────────────
// 4. MARK VIEWED (publicToken-based, no auth)
// ─────────────────────────────────────────────
export const markViewed = mutation({
  args: {
    publicToken: v.string(),
  },
  handler: async (ctx, args) => {
    const proposal = await ctx.db
      .query("proposals")
      .withIndex("by_public_token", (q) => q.eq("publicToken", args.publicToken))
      .first();

    if (!proposal) throw new ConvexError("Invalid or expired proposal link");

    // Only sent or viewed proposals can be marked as viewed
    if (proposal.status !== "sent" && proposal.status !== "viewed") {
      throw new ConvexError("Proposal cannot be viewed in its current state");
    }

    const now = Date.now();
    const currentCount = proposal.viewedCount ?? 0;

    await ctx.db.patch(proposal._id, {
      status: "viewed",
      viewedAt: proposal.viewedAt ?? now, // Keep first view time
      viewedCount: currentCount + 1,
      updatedAt: now,
    });

    return { success: true };
  },
});

// ─────────────────────────────────────────────
// 5. SIGN (publicToken-based, no auth)
// ─────────────────────────────────────────────
export const sign = mutation({
  args: {
    publicToken: v.string(),
    signedIp: v.optional(v.string()),
    signedName: v.string(),
  },
  handler: async (ctx, args) => {
    const proposal = await ctx.db
      .query("proposals")
      .withIndex("by_public_token", (q) => q.eq("publicToken", args.publicToken))
      .first();

    if (!proposal) throw new ConvexError("Invalid or expired proposal link");

    // Only sent or viewed proposals can be signed
    if (proposal.status !== "sent" && proposal.status !== "viewed") {
      throw new ConvexError("Proposal cannot be signed in its current state");
    }

    // Check if proposal has expired
    if (proposal.validUntil && proposal.validUntil < Date.now()) {
      throw new ConvexError("This proposal has expired and can no longer be signed");
    }

    if (args.signedName.trim().length === 0) {
      throw new ConvexError("Signed name is required");
    }

    const now = Date.now();

    await ctx.db.patch(proposal._id, {
      status: "signed",
      signedAt: now,
      signedIp: args.signedIp,
      signedName: args.signedName.trim(),
      updatedAt: now,
    });

    // Cancel all pending follow-ups for this proposal
    await cancelFollowUpsInternal(ctx, proposal._id);

    // Auto-create scope definition from proposal content
    await convertToScopeInternal(ctx, proposal.userId, proposal._id, proposal.clientId, proposal.content, proposal.title);

    return { success: true };
  },
});

// ─────────────────────────────────────────────
// 6. DECLINE (publicToken-based, no auth)
// ─────────────────────────────────────────────
export const decline = mutation({
  args: {
    publicToken: v.string(),
    declinedReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const proposal = await ctx.db
      .query("proposals")
      .withIndex("by_public_token", (q) => q.eq("publicToken", args.publicToken))
      .first();

    if (!proposal) throw new ConvexError("Invalid or expired proposal link");

    // Only sent or viewed proposals can be declined
    if (proposal.status !== "sent" && proposal.status !== "viewed") {
      throw new ConvexError("Proposal cannot be declined in its current state");
    }

    const now = Date.now();

    await ctx.db.patch(proposal._id, {
      status: "declined",
      declinedAt: now,
      declinedReason: args.declinedReason,
      updatedAt: now,
    });

    // Cancel all pending follow-ups for this proposal
    await cancelFollowUpsInternal(ctx, proposal._id);

    return { success: true };
  },
});

// ─────────────────────────────────────────────
// 7. EXPIRE (batch — mark expired proposals)
// ─────────────────────────────────────────────
export const expire = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Query all sent proposals and filter for expired ones
    const sentProposals = await ctx.db
      .query("proposals")
      .filter((q) => q.eq(q.field("status"), "sent"))
      .collect();

    let expiredCount = 0;

    for (const proposal of sentProposals) {
      if (proposal.validUntil && proposal.validUntil < now) {
        await ctx.db.patch(proposal._id, {
          status: "expired",
          updatedAt: now,
        });

        // Cancel pending follow-ups for expired proposals
        await cancelFollowUpsInternal(ctx, proposal._id);

        expiredCount++;
      }
    }

    return { expiredCount };
  },
});

// ─────────────────────────────────────────────
// 8. GET (single proposal by ID with access check)
// ─────────────────────────────────────────────
export const get = query({
  args: {
    proposalId: v.id("proposals"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    const proposal = await ctx.db.get(args.proposalId);
    if (!proposal) throw new ConvexError("Proposal not found");

    // Check workspace membership or direct ownership
    if (proposal.workspaceId) {
      const access = await getRecordAccess(ctx, proposal, userId);
      if (!access) throw new ConvexError("Not authorized to view this proposal");
    } else if (proposal.userId !== userId) {
      throw new ConvexError("Not authorized to view this proposal");
    }

    return proposal;
  },
});

// ─────────────────────────────────────────────
// 9. LIST (workspace-aware, with optional status filter)
// ─────────────────────────────────────────────
export const list = query({
  args: {
    workspaceId: v.optional(v.id("workspaces")),
    status: v.optional(proposalStatusValidator),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    // If workspaceId provided, filter by workspace with team-aware visibility
    if (args.workspaceId) {
      const visibility = await getUserVisibility(ctx, args.workspaceId);
      if (!visibility) throw new ConvexError("Not a member of this workspace");

      const allProposals = await ctx.db
        .query("proposals")
        .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId!))
        .collect();

      let visible = allProposals.filter((p) => isRecordVisible(p, visibility));

      if (args.status) {
        visible = visible.filter((p) => p.status === args.status);
      }

      return visible.sort((a, b) => b.updatedAt - a.updatedAt);
    }

    // Backward compat: no workspaceId
    if (args.status) {
      const proposals = await ctx.db
        .query("proposals")
        .withIndex("by_user_and_status", (q) =>
          q.eq("userId", userId).eq("status", args.status!)
        )
        .order("desc")
        .collect();
      return proposals;
    }

    // No status filter — return all proposals for this user
    const proposals = await ctx.db
      .query("proposals")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    // Sort by updatedAt descending (index order is by creation)
    return proposals.sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

// ─────────────────────────────────────────────
// 10. GET BY PUBLIC TOKEN (client view, limited fields)
// ─────────────────────────────────────────────
export const getByPublicToken = query({
  args: {
    publicToken: v.string(),
  },
  handler: async (ctx, args) => {
    const proposal = await ctx.db
      .query("proposals")
      .withIndex("by_public_token", (q) => q.eq("publicToken", args.publicToken))
      .first();

    if (!proposal) return null;

    // Only allow viewing sent/viewed/signed/declined proposals via public link
    if (proposal.status === "draft") return null;

    // Return limited fields for client view — exclude internal tracking and user data
    return {
      _id: proposal._id,
      title: proposal.title,
      content: proposal.content,
      totalValue: proposal.totalValue,
      currency: proposal.currency,
      validUntil: proposal.validUntil,
      status: proposal.status,
      signedAt: proposal.signedAt,
      signedName: proposal.signedName,
      declinedAt: proposal.declinedAt,
      declinedReason: proposal.declinedReason,
      createdAt: proposal.createdAt,
    };
  },
});

// ─────────────────────────────────────────────
// 11. CONVERT TO SCOPE (auto-create scopeDefinition)
// ─────────────────────────────────────────────
export const convertToScope = mutation({
  args: {
    proposalId: v.id("proposals"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    const proposal = await ctx.db.get(args.proposalId);
    if (!proposal) throw new ConvexError("Proposal not found");

    // Check workspace access or direct ownership
    if (proposal.workspaceId) {
      await requireRecordAccess(ctx, proposal, "collaborate");
    } else if (proposal.userId !== userId) {
      throw new ConvexError("Not authorized");
    }

    if (proposal.status !== "signed") {
      throw new ConvexError("Only signed proposals can be converted to scope definitions");
    }

    const scopeId = await convertToScopeInternal(
      ctx, userId, proposal._id, proposal.clientId, proposal.content, proposal.title
    );

    return scopeId;
  },
});

// ─────────────────────────────────────────────
// 12. GET STATS (workspace-aware)
// ─────────────────────────────────────────────
export const getStats = query({
  args: {
    workspaceId: v.optional(v.id("workspaces")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    let allProposals;

    if (args.workspaceId) {
      const visibility = await getUserVisibility(ctx, args.workspaceId);
      if (!visibility) return {
        counts: { draft: 0, sent: 0, viewed: 0, signed: 0, expired: 0, declined: 0, total: 0 },
        totalSignedValue: 0,
        closeRate: 0,
        viewToSignRate: 0,
        avgDaysToSign: 0,
      };

      const workspaceProposals = await ctx.db
        .query("proposals")
        .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
        .collect();
      allProposals = workspaceProposals.filter((p) => isRecordVisible(p, visibility));
    } else {
      allProposals = await ctx.db
        .query("proposals")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
    }

    const draft = allProposals.filter((p) => p.status === "draft").length;
    const sent = allProposals.filter((p) => p.status === "sent").length;
    const viewed = allProposals.filter((p) => p.status === "viewed").length;
    const signed = allProposals.filter((p) => p.status === "signed").length;
    const expired = allProposals.filter((p) => p.status === "expired").length;
    const declined = allProposals.filter((p) => p.status === "declined").length;

    // Total value of signed proposals
    const totalSignedValue = allProposals
      .filter((p) => p.status === "signed")
      .reduce((sum, p) => sum + (p.totalValue ?? 0), 0);

    // Average close rate: signed / (signed + declined + expired) for proposals that have reached a terminal state
    const terminalStates = signed + declined + expired;
    const closeRate = terminalStates > 0 ? signed / terminalStates : 0;

    // Average view-to-sign conversion
    const viewedOrBeyond = allProposals.filter(
      (p) => p.status === "viewed" || p.status === "signed" || p.status === "declined"
    );
    const viewToSignRate = viewedOrBeyond.length > 0
      ? signed / viewedOrBeyond.length
      : 0;

    // Average days to sign (from sent to signed)
    const signedProposals = allProposals.filter((p) => p.status === "signed" && p.sentAt && p.signedAt);
    const avgDaysToSign = signedProposals.length > 0
      ? signedProposals.reduce((sum, p) => {
          const days = (p.signedAt! - p.sentAt!) / (1000 * 60 * 60 * 24);
          return sum + days;
        }, 0) / signedProposals.length
      : 0;

    return {
      counts: { draft, sent, viewed, signed, expired, declined, total: allProposals.length },
      totalSignedValue,
      closeRate: Math.round(closeRate * 100) / 100,
      viewToSignRate: Math.round(viewToSignRate * 100) / 100,
      avgDaysToSign: Math.round(avgDaysToSign * 10) / 10,
    };
  },
});

// ─────────────────────────────────────────────
// 13. DUPLICATE (create a copy as new draft)
// ─────────────────────────────────────────────
export const duplicate = mutation({
  args: {
    proposalId: v.id("proposals"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    const original = await ctx.db.get(args.proposalId);
    if (!original) throw new ConvexError("Proposal not found");

    // Check workspace access or direct ownership
    if (original.workspaceId) {
      await requireRecordAccess(ctx, original, "collaborate");
    } else if (original.userId !== userId) {
      throw new ConvexError("Not authorized to duplicate this proposal");
    }

    const now = Date.now();
    const publicToken = crypto.randomUUID();

    const newProposalId = await ctx.db.insert("proposals", {
      userId,
      workspaceId: original.workspaceId ?? undefined,
      createdBy: userId,
      teamId: original.teamId ?? undefined,
      clientId: original.clientId,
      dealId: original.dealId,
      title: `${original.title} (Copy)`,
      content: original.content,
      templateId: original.templateId,
      status: "draft",
      totalValue: original.totalValue,
      currency: original.currency,
      validUntil: undefined, // Reset validUntil — user should set a new one
      sentAt: undefined,
      viewedAt: undefined,
      viewedCount: 0,
      signedAt: undefined,
      signedIp: undefined,
      signedName: undefined,
      declinedAt: undefined,
      declinedReason: undefined,
      publicToken,
      version: 1, // New version starts at 1
      createdAt: now,
      updatedAt: now,
    });

    return newProposalId;
  },
});

// ─────────────────────────────────────────────
// 14. REMOVE (hard delete, draft only)
// ─────────────────────────────────────────────
export const remove = mutation({
  args: {
    proposalId: v.id("proposals"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    const proposal = await ctx.db.get(args.proposalId);
    if (!proposal) throw new ConvexError("Proposal not found");

    // Check workspace access (owner level) or direct ownership
    if (proposal.workspaceId) {
      await requireRecordAccess(ctx, proposal, "owner");
    } else if (proposal.userId !== userId) {
      throw new ConvexError("Not authorized to delete this proposal");
    }

    // Cannot delete sent/signed proposals
    if (proposal.status !== "draft") {
      throw new ConvexError("Cannot delete a proposal that has been sent or signed. Only draft proposals can be deleted.");
    }

    // Delete all follow-ups associated with this proposal
    const followUps = await ctx.db
      .query("proposalFollowUps")
      .withIndex("by_proposal", (q) => q.eq("proposalId", args.proposalId))
      .collect();

    for (const followUp of followUps) {
      await ctx.db.delete(followUp._id);
    }

    await ctx.db.delete(args.proposalId);

    return { success: true, deletedId: args.proposalId };
  },
});


// ═════════════════════════════════════════════
// PROPOSAL TEMPLATES
// ═════════════════════════════════════════════

// ─────────────────────────────────────────────
// 15. CREATE TEMPLATE
// ─────────────────────────────────────────────
export const createTemplate = mutation({
  args: {
    name: v.string(),
    industry: v.optional(v.string()),
    category: v.optional(v.string()),
    content: v.array(contentSectionValidator),
    isDefault: v.optional(v.boolean()),
    workspaceId: v.optional(v.id("workspaces")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    if (args.name.trim().length === 0) {
      throw new ConvexError("Template name cannot be empty");
    }

    // If workspaceId provided, verify membership
    if (args.workspaceId) {
      await requireWorkspaceAccess(ctx, args.workspaceId, "member");
    }

    const templateId = await ctx.db.insert("proposalTemplates", {
      userId, // User-created template (system templates have userId = null)
      workspaceId: args.workspaceId ?? undefined,
      createdBy: userId,
      name: args.name.trim(),
      industry: args.industry,
      category: args.category,
      content: args.content,
      isDefault: args.isDefault ?? false,
      usageCount: 0,
      createdAt: Date.now(),
    });

    return templateId;
  },
});

// ─────────────────────────────────────────────
// 16. LIST TEMPLATES (user's own + system, workspace-aware)
// ─────────────────────────────────────────────
export const listTemplates = query({
  args: {
    industry: v.optional(v.string()),
    workspaceId: v.optional(v.id("workspaces")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    // Get user's own templates
    const userTemplates = await ctx.db
      .query("proposalTemplates")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Get workspace templates if provided
    let workspaceTemplates: any[] = [];
    if (args.workspaceId) {
      workspaceTemplates = await ctx.db
        .query("proposalTemplates")
        .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
        .collect();
    }

    // Get system templates (userId is null)
    let systemTemplates: any[] = [];

    if (args.industry) {
      systemTemplates = await ctx.db
        .query("proposalTemplates")
        .withIndex("by_industry", (q) => q.eq("industry", args.industry!))
        .collect();
      // Filter to only system templates (null userId)
      systemTemplates = systemTemplates.filter((t) => t.userId === undefined);
    } else {
      const industries = ["web_design", "consulting", "marketing", "development"];
      for (const ind of industries) {
        const templates = await ctx.db
          .query("proposalTemplates")
          .withIndex("by_industry", (q) => q.eq("industry", ind))
          .collect();
        systemTemplates.push(...templates.filter((t) => t.userId === undefined));
      }
    }

    // Combine and deduplicate
    const allTemplateIds = new Set<string>();
    const combined: any[] = [];

    for (const t of [...userTemplates, ...workspaceTemplates, ...systemTemplates]) {
      if (!allTemplateIds.has(t._id)) {
        allTemplateIds.add(t._id);
        combined.push(t);
      }
    }

    // Sort: system templates first, then by usage count descending
    combined.sort((a, b) => {
      const aIsSystem = a.userId === undefined ? 0 : 1;
      const bIsSystem = b.userId === undefined ? 0 : 1;
      if (aIsSystem !== bIsSystem) return aIsSystem - bIsSystem;
      return (b.usageCount ?? 0) - (a.usageCount ?? 0);
    });

    return combined;
  },
});

// ─────────────────────────────────────────────
// 17. GET TEMPLATE
// ─────────────────────────────────────────────
export const getTemplate = query({
  args: {
    templateId: v.id("proposalTemplates"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    const template = await ctx.db.get(args.templateId);
    if (!template) throw new ConvexError("Template not found");

    // Users can view their own templates or system templates or workspace templates
    if (template.userId !== undefined && template.userId !== userId) {
      // Check workspace access if template belongs to a workspace
      if (template.workspaceId) {
        const membership = await getWorkspaceMembership(ctx, template.workspaceId, userId);
        if (!membership) throw new ConvexError("Not authorized to view this template");
      } else {
        throw new ConvexError("Not authorized to view this template");
      }
    }

    return template;
  },
});

// ─────────────────────────────────────────────
// 18. INCREMENT USAGE
// ─────────────────────────────────────────────
export const incrementUsage = mutation({
  args: {
    templateId: v.id("proposalTemplates"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    const template = await ctx.db.get(args.templateId);
    if (!template) throw new ConvexError("Template not found");

    // Users can use their own templates or system templates
    if (template.userId !== undefined && template.userId !== userId) {
      if (template.workspaceId) {
        const membership = await getWorkspaceMembership(ctx, template.workspaceId, userId);
        if (!membership) throw new ConvexError("Not authorized to use this template");
      } else {
        throw new ConvexError("Not authorized to use this template");
      }
    }

    await ctx.db.patch(args.templateId, {
      usageCount: (template.usageCount ?? 0) + 1,
    });

    return { success: true, usageCount: (template.usageCount ?? 0) + 1 };
  },
});

// ─────────────────────────────────────────────
// 19. SEED DEFAULT TEMPLATES (onboarding)
// ─────────────────────────────────────────────
export const seedDefaultTemplates = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    // Check if system templates already exist (userId = null)
    const existingSystemTemplates = await ctx.db
      .query("proposalTemplates")
      .withIndex("by_industry", (q) => q.eq("industry", "web_design"))
      .collect();

    const alreadySeeded = existingSystemTemplates.some((t) => t.userId === undefined);
    if (alreadySeeded) {
      return { seeded: false, message: "Default templates already exist" };
    }

    const now = Date.now();
    let count = 0;

    // ── Web Design Template ──
    await ctx.db.insert("proposalTemplates", {
      userId: undefined,
      name: "Web Design Proposal",
      industry: "web_design",
      category: "web_design",
      content: [
        { id: "wd-heading-1", type: "heading", data: { text: "Website Design & Development Proposal", level: 1 } },
        { id: "wd-text-1", type: "text", data: { text: "Thank you for considering our team for your website design and development project. Below you'll find a comprehensive proposal outlining our approach, deliverables, and pricing." } },
        { id: "wd-heading-2", type: "heading", data: { text: "Project Overview", level: 2 } },
        { id: "wd-text-2", type: "text", data: { text: "We will design and develop a modern, responsive website that reflects your brand identity and engages your target audience." } },
        { id: "wd-heading-3", type: "heading", data: { text: "Deliverables", level: 2 } },
        { id: "wd-text-3", type: "text", data: { text: "• Custom UI/UX design with up to 3 revision rounds\n• Responsive front-end development (mobile, tablet, desktop)\n• CMS integration (WordPress, Webflow, or headless CMS)\n• SEO optimization and performance tuning\n• Launch support and 30-day post-launch bug fixes" } },
        { id: "wd-pricing-1", type: "pricing_table", data: { rows: [{ item: "UI/UX Design", quantity: 1, rate: 3000, amount: 3000 }, { item: "Front-end Development", quantity: 1, rate: 5000, amount: 5000 }, { item: "CMS Integration", quantity: 1, rate: 2000, amount: 2000 }, { item: "SEO & Performance", quantity: 1, rate: 1000, amount: 1000 }], total: 11000 } },
        { id: "wd-delimiter-1", type: "delimiter", data: {} },
        { id: "wd-terms-1", type: "terms", data: { text: "50% deposit required before work begins. Remaining 50% due upon launch. Proposal valid for 30 days. Additional revisions beyond the included rounds will be billed at $150/hour." } },
      ],
      isDefault: true,
      usageCount: 0,
      createdAt: now,
    });
    count++;

    // ── Consulting Template ──
    await ctx.db.insert("proposalTemplates", {
      userId: undefined,
      name: "Consulting Engagement Proposal",
      industry: "consulting",
      category: "consulting",
      content: [
        { id: "c-heading-1", type: "heading", data: { text: "Consulting Engagement Proposal", level: 1 } },
        { id: "c-text-1", type: "text", data: { text: "We appreciate the opportunity to support your organization. This proposal outlines our consulting approach, methodology, and investment required." } },
        { id: "c-heading-2", type: "heading", data: { text: "Engagement Scope", level: 2 } },
        { id: "c-text-2", type: "text", data: { text: "Our consulting engagement will include discovery, analysis, recommendations, and implementation support tailored to your business objectives." } },
        { id: "c-heading-3", type: "heading", data: { text: "Methodology", level: 2 } },
        { id: "c-text-3", type: "text", data: { text: "• Phase 1: Discovery & Stakeholder Interviews (Week 1-2)\n• Phase 2: Current State Analysis & Gap Assessment (Week 3-4)\n• Phase 3: Strategy Development & Recommendations (Week 5-6)\n• Phase 4: Implementation Roadmap & Support (Week 7-8)" } },
        { id: "c-pricing-1", type: "pricing_table", data: { rows: [{ item: "Discovery & Analysis", quantity: 40, rate: 200, amount: 8000 }, { item: "Strategy Development", quantity: 30, rate: 200, amount: 6000 }, { item: "Implementation Support", quantity: 20, rate: 200, amount: 4000 }], total: 18000 } },
        { id: "c-delimiter-1", type: "delimiter", data: {} },
        { id: "c-terms-1", type: "terms", data: { text: "Engagement begins upon signed agreement and initial payment. Billed bi-weekly based on hours worked. Proposal valid for 30 days. Travel expenses billed separately at cost." } },
      ],
      isDefault: true,
      usageCount: 0,
      createdAt: now,
    });
    count++;

    // ── Marketing Template ──
    await ctx.db.insert("proposalTemplates", {
      userId: undefined,
      name: "Digital Marketing Proposal",
      industry: "marketing",
      category: "marketing",
      content: [
        { id: "m-heading-1", type: "heading", data: { text: "Digital Marketing Strategy Proposal", level: 1 } },
        { id: "m-text-1", type: "text", data: { text: "We're excited to help you grow your digital presence. This proposal outlines a comprehensive marketing strategy designed to increase your visibility, engagement, and conversions." } },
        { id: "m-heading-2", type: "heading", data: { text: "Campaign Strategy", level: 2 } },
        { id: "m-text-2", type: "text", data: { text: "Our approach combines data-driven insights with creative execution to deliver measurable results across all digital channels." } },
        { id: "m-heading-3", type: "heading", data: { text: "Included Services", level: 2 } },
        { id: "m-text-3", type: "text", data: { text: "• Brand audit and competitive analysis\n• Social media strategy and content calendar\n• Paid advertising setup and management (Google Ads, Meta Ads)\n• Email marketing campaign design\n• Monthly analytics reporting and optimization" } },
        { id: "m-pricing-1", type: "pricing_table", data: { rows: [{ item: "Brand Audit & Strategy", quantity: 1, rate: 2500, amount: 2500 }, { item: "Social Media Management (Monthly)", quantity: 3, rate: 1500, amount: 4500 }, { item: "Paid Ads Management (Monthly)", quantity: 3, rate: 1000, amount: 3000 }, { item: "Email Marketing Setup", quantity: 1, rate: 1500, amount: 1500 }], total: 11500 } },
        { id: "m-delimiter-1", type: "delimiter", data: {} },
        { id: "m-terms-1", type: "terms", data: { text: "3-month minimum engagement. Ad spend is separate and paid directly to platforms. Monthly retainer billed at the start of each month. Proposal valid for 30 days." } },
      ],
      isDefault: true,
      usageCount: 0,
      createdAt: now,
    });
    count++;

    // ── Development Template ──
    await ctx.db.insert("proposalTemplates", {
      userId: undefined,
      name: "Software Development Proposal",
      industry: "development",
      category: "development",
      content: [
        { id: "d-heading-1", type: "heading", data: { text: "Custom Software Development Proposal", level: 1 } },
        { id: "d-text-1", type: "text", data: { text: "Thank you for the opportunity to propose on your software development project. We specialize in building scalable, maintainable solutions that drive business value." } },
        { id: "d-heading-2", type: "heading", data: { text: "Technical Approach", level: 2 } },
        { id: "d-text-2", type: "text", data: { text: "We follow an agile development methodology with 2-week sprints, continuous integration, and regular stakeholder demos to ensure alignment throughout the project." } },
        { id: "d-heading-3", type: "heading", data: { text: "Project Phases", level: 2 } },
        { id: "d-text-3", type: "text", data: { text: "• Requirements gathering & technical specification\n• Architecture design & technology stack selection\n• Core feature development (Sprint 1-4)\n• Integration, testing & QA (Sprint 5-6)\n• Deployment, documentation & handover" } },
        { id: "d-pricing-1", type: "pricing_table", data: { rows: [{ item: "Requirements & Architecture", quantity: 1, rate: 5000, amount: 5000 }, { item: "Core Development (6 sprints)", quantity: 6, rate: 4000, amount: 24000 }, { item: "QA & Testing", quantity: 1, rate: 3000, amount: 3000 }, { item: "Deployment & Documentation", quantity: 1, rate: 2000, amount: 2000 }], total: 34000 } },
        { id: "d-delimiter-1", type: "delimiter", data: {} },
        { id: "d-terms-1", type: "terms", data: { text: "Sprint-based billing: each sprint is billed upon completion. 30% deposit required before development begins. Scope changes require a formal change order. 90-day warranty on delivered code. Proposal valid for 30 days." } },
      ],
      isDefault: true,
      usageCount: 0,
      createdAt: now,
    });
    count++;

    return { seeded: true, count };
  },
});


// ═════════════════════════════════════════════
// PROPOSAL FOLLOW-UPS
// ═════════════════════════════════════════════

// ─────────────────────────────────────────────
// 20. SCHEDULE FOLLOW-UPS (Day 3/7/14)
// ─────────────────────────────────────────────
export const scheduleFollowUps = mutation({
  args: {
    proposalId: v.id("proposals"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    const proposal = await ctx.db.get(args.proposalId);
    if (!proposal) throw new ConvexError("Proposal not found");

    // Check workspace access or direct ownership
    if (proposal.workspaceId) {
      await requireRecordAccess(ctx, proposal, "collaborate");
    } else if (proposal.userId !== userId) {
      throw new ConvexError("Not authorized");
    }

    if (proposal.status !== "sent") {
      throw new ConvexError("Follow-ups can only be scheduled for sent proposals");
    }

    if (!proposal.sentAt) {
      throw new ConvexError("Proposal has not been sent yet");
    }

    await scheduleFollowUpsInternal(
      ctx, args.proposalId, userId, proposal.title, proposal.totalValue, proposal.sentAt
    );

    return { success: true };
  },
});


// ─────────────────────────────────────────────
// 20. PROCESS DUE FOLLOW-UPS (cron job handler)
// ─────────────────────────────────────────────

export const processDueFollowUps = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Find all scheduled follow-ups that are due
    const allFollowUps = await ctx.db
      .query("proposalFollowUps")
      .filter((q) => q.eq(q.field("status"), "scheduled"))
      .collect();

    const dueFollowUps = allFollowUps.filter(
      (fu) => fu.scheduledFor <= now
    );

    let processedCount = 0;
    for (const fu of dueFollowUps) {
      // Mark as sent (in a real system, this would also send an email)
      await ctx.db.patch(fu._id, {
        status: "sent",
        sentAt: now,
      });
      processedCount++;
    }

    return { processedCount, totalDue: dueFollowUps.length };
  },
});

// ═════════════════════════════════════════════
// INTERNAL HELPERS
// ═════════════════════════════════════════════

async function scheduleFollowUpsInternal(
  ctx: any,
  proposalId: string,
  userId: string,
  title: string,
  totalValue: number | undefined,
  sentAt: number
): Promise<void> {
  const now = Date.now();

  const configs = [
    { day: 3, subject: `Friendly Reminder: ${title}`, tone: "friendly" as const },
    { day: 7, subject: `Checking In: ${title}`, tone: "professional" as const },
    { day: 14, subject: `Final Follow-Up: ${title}`, tone: "firm" as const },
  ];

  for (const config of configs) {
    const scheduledFor = sentAt + config.day * 24 * 60 * 60 * 1000;
    if (scheduledFor > now) {
      await ctx.db.insert("proposalFollowUps", {
        proposalId,
        userId,
        dayNumber: config.day,
        subject: config.subject,
        body: `Hi there,\n\nThis is a ${config.tone} reminder about the proposal "${title}" sent on ${new Date(sentAt).toLocaleDateString()}.\n\nPlease let us know if you have any questions.\n\nBest regards`,
        channel: "email",
        tone: config.tone,
        status: "scheduled",
        scheduledFor,
        createdAt: now,
      });
    }
  }
}

async function cancelFollowUpsInternal(
  ctx: any,
  proposalId: string
): Promise<void> {
  const followUps = await ctx.db
    .query("proposalFollowUps")
    .withIndex("by_proposal", (q: any) => q.eq("proposalId", proposalId))
    .collect();

  for (const fu of followUps) {
    if (fu.status === "scheduled") {
      await ctx.db.patch(fu._id, { status: "cancelled" });
    }
  }
}

async function convertToScopeInternal(
  ctx: any,
  userId: string,
  proposalId: string,
  clientId: string | undefined,
  content: any[],
  title: string
): Promise<string> {
  // Extract deliverables from pricing sections
  const deliverables: any[] = [];
  let totalValue = 0;

  for (const section of content) {
    if (section.type === "pricing_table" && section.data?.rows) {
      for (const row of section.data.rows) {
        deliverables.push({
          id: `del-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: row.item,
          description: `${row.quantity} × $${row.rate}`,
          estimatedHours: undefined,
          status: "pending",
        });
        totalValue += row.amount;
      }
    }
  }

  const scopeId = await ctx.db.insert("scopeDefinitions", {
    userId,
    proposalId,
    clientId,
    title: `Scope: ${title}`,
    description: `Auto-generated scope from proposal: ${title}`,
    deliverables: deliverables.length > 0 ? deliverables : [
      { id: `del-${Date.now()}`, name: title, description: "Main deliverable", estimatedHours: undefined, status: "pending" }
    ],
    totalEstimatedHours: undefined,
    revisionLimit: 3,
    revisionCount: 0,
    status: "active",
    approvalToken: crypto.randomUUID(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  return scopeId;
}
