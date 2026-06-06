// @ts-nocheck — Convex backend file with schema types not yet in generated types
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";

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
    clientId: v.id("clients"),
    dealId: v.optional(v.id("deals")),
    title: v.string(),
    content: v.array(contentSectionValidator),
    templateId: v.optional(v.id("proposalTemplates")),
    totalValue: v.optional(v.number()),
    currency: v.optional(v.string()),
    validUntil: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    // Verify client ownership
    const client = await ctx.db.get(args.clientId);
    if (!client) throw new ConvexError("Client not found");
    if (client.userId !== userId) throw new ConvexError("Not authorized: client belongs to another user");

    // Verify deal ownership if provided
    if (args.dealId) {
      const deal = await ctx.db.get(args.dealId);
      if (!deal) throw new ConvexError("Deal not found");
      if (deal.userId !== userId) throw new ConvexError("Not authorized: deal belongs to another user");
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

    const proposalId = await ctx.db.insert("proposals", {
      userId,
      clientId: args.clientId,
      dealId: args.dealId,
      title: args.title.trim(),
      content: args.content,
      templateId: args.templateId,
      status: "draft",
      totalValue: args.totalValue,
      currency: args.currency ?? "USD",
      validUntil: args.validUntil,
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
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    const proposal = await ctx.db.get(args.proposalId);
    if (!proposal) throw new ConvexError("Proposal not found");
    if (proposal.userId !== userId) throw new ConvexError("Not authorized to update this proposal");

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

    // Verify client ownership if changing client
    if (args.clientId !== undefined) {
      const client = await ctx.db.get(args.clientId);
      if (!client) throw new ConvexError("Client not found");
      if (client.userId !== userId) throw new ConvexError("Not authorized: client belongs to another user");
    }

    // Verify deal ownership if changing deal
    if (args.dealId !== undefined) {
      const deal = await ctx.db.get(args.dealId);
      if (!deal) throw new ConvexError("Deal not found");
      if (deal.userId !== userId) throw new ConvexError("Not authorized: deal belongs to another user");
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
    if (proposal.userId !== userId) throw new ConvexError("Not authorized to send this proposal");

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
    // Note: by_user_and_status requires userId first, so we use a full scan with filter
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
// 8. GET (single proposal by ID with ownership)
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
    if (proposal.userId !== userId) throw new ConvexError("Not authorized to view this proposal");

    return proposal;
  },
});

// ─────────────────────────────────────────────
// 9. LIST (with optional status filter)
// ─────────────────────────────────────────────
export const list = query({
  args: {
    status: v.optional(proposalStatusValidator),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

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
    if (proposal.userId !== userId) throw new ConvexError("Not authorized");

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
// 12. GET STATS (counts by status, total value, close rate)
// ─────────────────────────────────────────────
export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    const allProposals = await ctx.db
      .query("proposals")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

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
    if (original.userId !== userId) throw new ConvexError("Not authorized to duplicate this proposal");

    const now = Date.now();
    const publicToken = crypto.randomUUID();

    const newProposalId = await ctx.db.insert("proposals", {
      userId,
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
    if (proposal.userId !== userId) throw new ConvexError("Not authorized to delete this proposal");

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
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    if (args.name.trim().length === 0) {
      throw new ConvexError("Template name cannot be empty");
    }

    const templateId = await ctx.db.insert("proposalTemplates", {
      userId, // User-created template (system templates have userId = null)
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
// 16. LIST TEMPLATES (user's own + system)
// ─────────────────────────────────────────────
export const listTemplates = query({
  args: {
    industry: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    // Get user's own templates
    const userTemplates = await ctx.db
      .query("proposalTemplates")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Get system templates (userId is null)
    // Convex doesn't support querying for null directly on index,
    // so we query by industry index if provided, or scan all
    let systemTemplates: Doc<"proposalTemplates">[] = [];

    if (args.industry) {
      systemTemplates = await ctx.db
        .query("proposalTemplates")
        .withIndex("by_industry", (q) => q.eq("industry", args.industry!))
        .collect();
      // Filter to only system templates (null userId)
      systemTemplates = systemTemplates.filter((t) => t.userId === undefined);
    } else {
      // Without a specific industry, we need to scan for system templates.
      // We'll use the industry index and collect all, then filter.
      // Since we can't query by userId=null directly, we pick common industries
      // or use a full scan approach.
      // Best approach: collect from all known industry indexes
      const industries = ["web_design", "consulting", "marketing", "development"];
      for (const ind of industries) {
        const templates = await ctx.db
          .query("proposalTemplates")
          .withIndex("by_industry", (q) => q.eq("industry", ind))
          .collect();
        systemTemplates.push(...templates.filter((t) => t.userId === undefined));
      }

      // Also check for system templates without an industry
      const allByIndustry = await ctx.db
        .query("proposalTemplates")
        .withIndex("by_industry", (q) => q.eq("industry", undefined as unknown as string))
        .collect();
      systemTemplates.push(...allByIndustry.filter((t) => t.userId === undefined));
    }

    // Combine and deduplicate
    const allTemplateIds = new Set<string>();
    const combined: Doc<"proposalTemplates">[] = [];

    for (const t of [...userTemplates, ...systemTemplates]) {
      if (!allTemplateIds.has(t._id)) {
        allTemplateIds.add(t._id);
        combined.push(t);
      }
    }

    // Sort: system templates first, then by usage count descending
    combined.sort((a, b) => {
      // System templates (no userId) come first
      const aIsSystem = a.userId === undefined ? 0 : 1;
      const bIsSystem = b.userId === undefined ? 0 : 1;
      if (aIsSystem !== bIsSystem) return aIsSystem - bIsSystem;

      // Then by usage count
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

    // Users can view their own templates or system templates
    if (template.userId !== undefined && template.userId !== userId) {
      throw new ConvexError("Not authorized to view this template");
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
      throw new ConvexError("Not authorized to use this template");
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
    // We check by looking for templates with industry set to our known values
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
    if (proposal.userId !== userId) throw new ConvexError("Not authorized");

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
// 21. PROCESS DUE FOLLOW-UPS (cron/manual)
// ─────────────────────────────────────────────
export const processDueFollowUps = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Query scheduled follow-ups where scheduledFor < now
    // We'll query by the by_scheduled index. Since we can't do a range query easily,
    // we query by_user_and_status and filter.
    // Better approach: iterate by scheduled index
    // Note: by_user_and_status requires userId first, so we use a full scan with filter
    const scheduledFollowUps = await ctx.db
      .query("proposalFollowUps")
      .filter((q) => q.eq(q.field("status"), "scheduled"))
      .collect();

    // Filter to only those that are due
    const dueFollowUps = scheduledFollowUps.filter((f) => f.scheduledFor <= now);

    let processedCount = 0;

    for (const followUp of dueFollowUps) {
      // Verify the proposal is still in a state where follow-up is relevant
      const proposal = await ctx.db.get(followUp.proposalId);
      if (!proposal) {
        // Proposal deleted — cancel the follow-up
        await ctx.db.patch(followUp._id, { status: "cancelled" });
        continue;
      }

      // If proposal is already signed or declined, cancel remaining follow-ups
      if (proposal.status === "signed" || proposal.status === "declined") {
        await ctx.db.patch(followUp._id, { status: "cancelled" });
        continue;
      }

      // Mark as sent
      await ctx.db.patch(followUp._id, {
        status: "sent",
        sentAt: now,
      });

      processedCount++;
    }

    return { processedCount };
  },
});

// ─────────────────────────────────────────────
// 22. CANCEL FOLLOW-UPS (for a proposal)
// ─────────────────────────────────────────────
export const cancelFollowUps = mutation({
  args: {
    proposalId: v.id("proposals"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    const proposal = await ctx.db.get(args.proposalId);
    if (!proposal) throw new ConvexError("Proposal not found");
    if (proposal.userId !== userId) throw new ConvexError("Not authorized");

    await cancelFollowUpsInternal(ctx, args.proposalId);

    return { success: true };
  },
});

// ─────────────────────────────────────────────
// 23. SKIP FOLLOW-UP (skip a specific one)
// ─────────────────────────────────────────────
export const skipFollowUp = mutation({
  args: {
    followUpId: v.id("proposalFollowUps"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    const followUp = await ctx.db.get(args.followUpId);
    if (!followUp) throw new ConvexError("Follow-up not found");
    if (followUp.userId !== userId) throw new ConvexError("Not authorized");

    // Can only skip scheduled follow-ups
    if (followUp.status !== "scheduled") {
      throw new ConvexError("Only scheduled follow-ups can be skipped");
    }

    await ctx.db.patch(args.followUpId, {
      status: "skipped",
    });

    return { success: true };
  },
});


// ═════════════════════════════════════════════
// INTERNAL HELPERS
// ═════════════════════════════════════════════

/**
 * Internal: Schedule Day 3/7/14 follow-ups for a sent proposal.
 * Pre-writes email content based on proposal title and value.
 */
async function scheduleFollowUpsInternal(
  ctx: any,
  proposalId: Id<"proposals">,
  userId: Id<"users">,
  proposalTitle: string,
  totalValue: number | undefined,
  sentAt: number,
) {
  const now = Date.now();
  const valueStr = totalValue
    ? `$${totalValue.toLocaleString()}`
    : "the proposed value";
  const titleStr = proposalTitle || "your proposal";

  // Day 3 — Friendly check-in
  await ctx.db.insert("proposalFollowUps", {
    proposalId,
    userId,
    dayNumber: 3,
    tone: "friendly",
    status: "scheduled",
    emailSubject: `Just checking in — ${titleStr}`,
    emailBody: `Hi there,\n\nI hope you've had a chance to review ${titleStr}. I wanted to check in and see if you have any questions or if there's anything you'd like me to clarify.\n\nNo rush at all — I'm here whenever you're ready to discuss.\n\nBest regards`,
    scheduledFor: sentAt + 3 * 24 * 60 * 60 * 1000,
    sentAt: undefined,
    openedAt: undefined,
    createdAt: now,
  });

  // Day 7 — Professional follow-up
  await ctx.db.insert("proposalFollowUps", {
    proposalId,
    userId,
    dayNumber: 7,
    tone: "professional",
    status: "scheduled",
    emailSubject: `Following up on ${titleStr}`,
    emailBody: `Hi,\n\nI'm following up on ${titleStr} valued at ${valueStr} that I sent last week. I understand you may be busy, but I wanted to make sure you received it and see if you have any feedback or questions.\n\nI'm happy to schedule a brief call to walk through the details if that would be helpful.\n\nLooking forward to hearing from you.\n\nBest regards`,
    scheduledFor: sentAt + 7 * 24 * 60 * 60 * 1000,
    sentAt: undefined,
    openedAt: undefined,
    createdAt: now,
  });

  // Day 14 — Firm follow-up (final)
  await ctx.db.insert("proposalFollowUps", {
    proposalId,
    userId,
    dayNumber: 14,
    tone: "firm",
    status: "scheduled",
    emailSubject: `Action requested: ${titleStr} expiring soon`,
    emailBody: `Hi,\n\nI'm reaching out one final time regarding ${titleStr} valued at ${valueStr}. This proposal will be expiring soon, and I'd like to know whether you'd like to move forward.\n\nIf timing isn't right or if the scope needs adjustment, I'm open to discussing alternatives. However, I'll need to know your intentions so I can plan accordingly.\n\nPlease let me know your decision at your earliest convenience.\n\nBest regards`,
    scheduledFor: sentAt + 14 * 24 * 60 * 60 * 1000,
    sentAt: undefined,
    openedAt: undefined,
    createdAt: now,
  });
}

/**
 * Internal: Cancel all pending follow-ups for a proposal.
 * Used when a proposal is signed, declined, or expired.
 */
async function cancelFollowUpsInternal(
  ctx: any,
  proposalId: Id<"proposals">,
) {
  const followUps = await ctx.db
    .query("proposalFollowUps")
    .withIndex("by_proposal", (q: any) => q.eq("proposalId", proposalId))
    .collect();

  for (const followUp of followUps) {
    if (followUp.status === "scheduled") {
      await ctx.db.patch(followUp._id, { status: "cancelled" });
    }
  }
}

/**
 * Internal: Convert a signed proposal's content into a scopeDefinition.
 * Extracts deliverables from pricing_table sections and terms from terms sections.
 */
async function convertToScopeInternal(
  ctx: any,
  userId: Id<"users">,
  proposalId: Id<"proposals">,
  clientId: Id<"clients">,
  content: Array<{ id: string; type: string; data: any }>,
  proposalTitle: string,
) {
  // Check if a scope definition already exists for this proposal
  const existing = await ctx.db
    .query("scopeDefinitions")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .collect();

  const alreadyConverted = existing.some(
    (s: any) => s.proposalId === proposalId
  );
  if (alreadyConverted) return null;

  // Extract deliverables from pricing_table sections
  const deliverables: Array<{
    id: string;
    name: string;
    description: string;
    revisionLimit: number;
    revisionsUsed: number;
    status: "pending" | "in_progress" | "completed" | "revisions_exceeded";
  }> = [];

  for (const section of content) {
    if (section.type === "pricing_table" && section.data?.rows) {
      for (const row of section.data.rows) {
        deliverables.push({
          id: `del-${row.item?.toLowerCase().replace(/\s+/g, "-") || section.id}`,
          name: row.item || "Unnamed deliverable",
          description: `${row.item || "Deliverable"} — ${row.quantity ?? 1}x at $${row.rate ?? 0}/unit`,
          revisionLimit: 3, // Default revision limit
          revisionsUsed: 0,
          status: "pending",
        });
      }
    }
  }

  // If no pricing_table sections found, create a single deliverable from the proposal title
  if (deliverables.length === 0) {
    deliverables.push({
      id: "del-main",
      name: proposalTitle,
      description: "Main project deliverable as described in the proposal",
      revisionLimit: 3,
      revisionsUsed: 0,
      status: "pending",
    });
  }

  // Extract exclusions and assumptions from terms sections
  const exclusions: string[] = [];
  const assumptions: string[] = [];

  for (const section of content) {
    if (section.type === "terms" && section.data?.text) {
      assumptions.push(`As outlined in proposal terms: ${section.data.text.substring(0, 200)}`);
    }
  }

  if (exclusions.length === 0) {
    exclusions.push("Items not explicitly listed in the proposal deliverables are excluded from scope");
  }

  if (assumptions.length === 0) {
    assumptions.push("Scope is limited to deliverables outlined in the signed proposal");
  }

  const now = Date.now();

  const scopeId = await ctx.db.insert("scopeDefinitions", {
    userId,
    proposalId,
    clientId,
    projectId: undefined,
    deliverables,
    exclusions,
    assumptions,
    clientApprovedAt: undefined,
    clientApprovalToken: undefined,
    status: "draft",
    createdAt: now,
    updatedAt: now,
  });

  return scopeId;
}

// Type aliases for internal use (matching Convex generated types)
type Id<T extends string> = string & { __tableName: T };
type Doc<T extends string> = Record<string, any> & { _id: Id<T> };
