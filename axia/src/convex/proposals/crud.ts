// @ts-nocheck — Convex backend file with schema types not yet in generated types
import { query, mutation, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { requireWorkspaceAccess, getWorkspaceMembership, getRecordAccess, requireRecordAccess } from "../permissions";
import { getUserVisibility, isRecordVisible } from "../workspaceFilter";

import { rateLimitAuthenticated, RATE_LIMITS } from "../security/rateLimit";
// ─── QUERIES ──────────────────────────────────────────────────────────────

export const getProposals = query({
  args: {
    workspaceId: v.optional(v.id("workspaces")),
    status: v.optional(v.string()),
  },
  handler: async (ctx, { workspaceId, status }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    if (workspaceId) {
      const visibility = await getUserVisibility(ctx, workspaceId);
      if (!visibility) return [];

      const allProposals = await ctx.db
        .query("proposals")
        .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
        .take(1000);

      let visible = allProposals.filter((p) => isRecordVisible(p, visibility));
      if (status) visible = visible.filter((p) => p.status === status);
      return visible;
    }

    // Backward compat: no workspaceId
    if (status) {
      return await ctx.db
        .query("proposals")
        .withIndex("by_user_and_status", (q) => q.eq("userId", userId).eq("status", status as any))
        .order("desc")
        .take(1000);
    }
    return await ctx.db
      .query("proposals")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(1000);
  },
});

export const getProposal = query({
  args: { proposalId: v.id("proposals") },
  handler: async (ctx, { proposalId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const proposal = await ctx.db.get(proposalId);
    if (!proposal) return null;

    // Check workspace access or direct ownership
    if (proposal.workspaceId) {
      const access = await getRecordAccess(ctx, proposal, userId);
      if (!access) return null;
    } else if (proposal.userId !== userId) {
      return null;
    }
    return proposal;
  },
});

export const getProposalByToken = query({
  args: { publicToken: v.string() },
  handler: async (ctx, { publicToken }) => {
    return await ctx.db
      .query("proposals")
      .withIndex("by_public_token", (q) => q.eq("publicToken", publicToken))
      .first();
  },
});

export const getTemplates = query({
  args: { workspaceId: v.optional(v.id("workspaces")) },
  handler: async (ctx, { workspaceId }) => {
    const userId = await getAuthUserId(ctx);

    const systemTemplates = await ctx.db
      .query("proposalTemplates")
      .withIndex("by_system", (q) => q.eq("isSystem", true))
      .take(1000);

    let userTemplates: any[] = [];
    if (userId) {
      if (workspaceId) {
        userTemplates = await ctx.db
          .query("proposalTemplates")
          .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
          .take(1000);
        // Also get user's own templates
        const personalTemplates = await ctx.db
          .query("proposalTemplates")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .take(1000);
        // Merge and deduplicate
        const ids = new Set(userTemplates.map((t: any) => t._id));
        for (const t of personalTemplates) {
          if (!ids.has(t._id)) userTemplates.push(t);
        }
      } else {
        userTemplates = await ctx.db
          .query("proposalTemplates")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .take(1000);
      }
    }

    return [...systemTemplates, ...userTemplates];
  },
});

export const getProposalStats = query({
  args: { workspaceId: v.optional(v.id("workspaces")) },
  handler: async (ctx, { workspaceId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { total: 0, sent: 0, signed: 0, draft: 0, signatureRate: 0, totalValue: 0 };

    let proposals;
    if (workspaceId) {
      const visibility = await getUserVisibility(ctx, workspaceId);
      if (!visibility) return { total: 0, sent: 0, signed: 0, draft: 0, signatureRate: 0, totalValue: 0 };

      const allProposals = await ctx.db
        .query("proposals")
        .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
        .take(1000);
      proposals = allProposals.filter((p) => isRecordVisible(p, visibility));
    } else {
      proposals = await ctx.db
        .query("proposals")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .take(1000);
    }

    const sent = proposals.filter(p => p.status === "sent" || p.status === "viewed").length;
    const signed = proposals.filter(p => p.status === "signed").length;
    const draft = proposals.filter(p => p.status === "draft").length;
    const totalValue = proposals.filter(p => p.status === "signed").reduce((sum, p) => sum + p.totalValue, 0);

    return {
      total: proposals.length,
      sent,
      signed,
      draft,
      signatureRate: sent + signed > 0 ? Math.round((signed / (sent + signed)) * 100) : 0,
      totalValue,
    };
  },
});

export const getFollowUps = query({
  args: { proposalId: v.id("proposals") },
  handler: async (ctx, { proposalId }) => {
    return await ctx.db
      .query("proposalFollowUps")
      .withIndex("by_proposal", (q) => q.eq("proposalId", proposalId))
      .take(1000);
  },
});

// ─── MUTATIONS ────────────────────────────────────────────────────────────

/**
 * Cryptographically secure token generator.
 * Replaces Math.random()-based generation which is predictable and has only
 * ~52 bits of entropy. Uses Web Crypto's getRandomValues (available in the
 * Convex runtime). 32 chars from 62-char alphabet ≈ 190 bits of entropy.
 */
function generateToken(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const buf = new Uint32Array(32);
  crypto.getRandomValues(buf);
  let result = "";
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(buf[i] % chars.length);
  }
  return result;
}

export const createProposal = mutation({
  args: {
    workspaceId: v.optional(v.id("workspaces")),
    teamId: v.optional(v.id("teams")),
    title: v.string(),
    sections: v.array(v.object({
      id: v.string(),
      type: v.union(v.literal("heading"), v.literal("text"), v.literal("pricing"), v.literal("terms"), v.literal("milestone"), v.literal("divider"), v.literal("client_info"), v.literal("sender_info"), v.literal("summary"), v.literal("scope_of_work")),
      content: v.string(),
      metadata: v.optional(v.any()),
    })),
    totalValue: v.number(),
    clientId: v.optional(v.id("clients")),
    clientName: v.optional(v.string()),
    clientEmail: v.optional(v.string()),
    templateId: v.optional(v.id("proposalTemplates")),
    validUntil: v.optional(v.number()),
    notes: v.optional(v.string()),
    currency: v.optional(v.string()),
    customFields: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    await rateLimitAuthenticated(ctx, "createProposal");
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // If workspaceId provided, verify membership
    if (args.workspaceId) {
      await requireWorkspaceAccess(ctx, args.workspaceId, "member");
    }

    const { workspaceId, teamId, customFields, ...rest } = args;

    return await ctx.db.insert("proposals", {
      userId,
      workspaceId: workspaceId ?? undefined,
      createdBy: userId,
      teamId: teamId ?? undefined,
      customFields: customFields ?? undefined,
      ...rest,
      status: "draft",
      publicToken: generateToken(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const updateProposal = mutation({
  args: {
    proposalId: v.id("proposals"),
    title: v.optional(v.string()),
    sections: v.optional(v.array(v.object({
      id: v.string(),
      type: v.union(v.literal("heading"), v.literal("text"), v.literal("pricing"), v.literal("terms"), v.literal("milestone"), v.literal("divider"), v.literal("client_info"), v.literal("sender_info"), v.literal("summary"), v.literal("scope_of_work")),
      content: v.string(),
      metadata: v.optional(v.any()),
    }))),
    totalValue: v.optional(v.number()),
    clientId: v.optional(v.id("clients")),
    clientName: v.optional(v.string()),
    clientEmail: v.optional(v.string()),
    validUntil: v.optional(v.number()),
    notes: v.optional(v.string()),
    teamId: v.optional(v.id("teams")),
  },
  handler: async (ctx, { proposalId, ...updates }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const proposal = await ctx.db.get(proposalId);
    if (!proposal) throw new Error("Proposal not found");

    // Check workspace access or direct ownership
    if (proposal.workspaceId) {
      await requireRecordAccess(ctx, proposal, "collaborate");
    } else if (proposal.userId !== userId) {
      throw new Error("Not authorized");
    }

    await ctx.db.patch(proposalId, { ...updates, updatedAt: Date.now() });
  },
});

export const sendProposal = mutation({
  args: { proposalId: v.id("proposals") },
  handler: async (ctx, { proposalId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const proposal = await ctx.db.get(proposalId);
    if (!proposal) throw new Error("Proposal not found");

    // Check workspace access or direct ownership
    if (proposal.workspaceId) {
      await requireRecordAccess(ctx, proposal, "collaborate");
    } else if (proposal.userId !== userId) {
      throw new Error("Not authorized");
    }

    await ctx.db.patch(proposalId, {
      status: "sent",
      sentAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Schedule follow-ups
    const followUpSchedule = [
      { day: 3, subject: `Following up: ${proposal.title}`, tone: "friendly" },
      { day: 7, subject: `Checking in: ${proposal.title}`, tone: "firm" },
      { day: 14, subject: `Final reminder: ${proposal.title}`, tone: "urgent" },
    ];

    for (const followUp of followUpSchedule) {
      await ctx.db.insert("proposalFollowUps", {
        userId,
        workspaceId: proposal.workspaceId ?? undefined,
        proposalId,
        dayNumber: followUp.day,
        subject: followUp.subject,
        body: `Hi ${proposal.clientName || "there"},\n\nI wanted to follow up on the proposal "${proposal.title}" I sent on ${new Date(proposal.sentAt!).toLocaleDateString()}.\n\n${followUp.tone === "urgent" ? "This proposal will expire soon. " : ""}Please let me know if you have any questions.\n\nBest regards`,
        channel: "email",
        status: "scheduled",
        scheduledAt: Date.now() + followUp.day * 24 * 60 * 60 * 1000,
        createdAt: Date.now(),
      });
    }
  },
});

export const markProposalViewed = mutation({
  args: { publicToken: v.string() },
  handler: async (ctx, { publicToken }) => {
    // This is a public action via shared link — no auth required
    const proposal = await ctx.db
      .query("proposals")
      .withIndex("by_public_token", (q) => q.eq("publicToken", publicToken))
      .first();

    if (!proposal || proposal.status !== "sent") return;

    await ctx.db.patch(proposal._id, {
      status: "viewed",
      viewedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const signProposal = mutation({
  args: { publicToken: v.string(), signatureData: v.string() },
  handler: async (ctx, { publicToken, signatureData }) => {
    // This is a public action via shared link — client signs without being a platform user
    const proposal = await ctx.db
      .query("proposals")
      .withIndex("by_public_token", (q) => q.eq("publicToken", publicToken))
      .first();

    if (!proposal) throw new Error("Proposal not found");
    if (proposal.status !== "sent" && proposal.status !== "viewed") {
      throw new Error("Proposal is not in a signable state");
    }
    if (proposal.status === "signed") {
      throw new Error("Proposal has already been signed");
    }

    await ctx.db.patch(proposal._id, {
      status: "signed",
      signedAt: Date.now(),
      signatureData,
      updatedAt: Date.now(),
    });

    // Cancel remaining follow-ups
    const followUps = await ctx.db
      .query("proposalFollowUps")
      .withIndex("by_proposal", (q) => q.eq("proposalId", proposal._id))
      .take(1000);

    for (const fu of followUps) {
      if (fu.status === "scheduled") {
        await ctx.db.patch(fu._id, { status: "cancelled" });
      }
    }
  },
});

export const duplicateProposal = mutation({
  args: { proposalId: v.id("proposals") },
  handler: async (ctx, { proposalId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const proposal = await ctx.db.get(proposalId);
    if (!proposal) throw new Error("Proposal not found");

    // Check workspace access or direct ownership
    if (proposal.workspaceId) {
      await requireRecordAccess(ctx, proposal, "collaborate");
    } else if (proposal.userId !== userId) {
      throw new Error("Not authorized");
    }

    const { _id, ...rest } = proposal;
    return await ctx.db.insert("proposals", {
      ...rest,
      status: "draft",
      publicToken: generateToken(),
      sentAt: undefined,
      viewedAt: undefined,
      signedAt: undefined,
      signatureData: undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const deleteProposal = mutation({
  args: { proposalId: v.id("proposals") },
  handler: async (ctx, { proposalId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const proposal = await ctx.db.get(proposalId);
    if (!proposal) throw new Error("Proposal not found");

    // Check workspace access (owner level) or direct ownership
    if (proposal.workspaceId) {
      await requireRecordAccess(ctx, proposal, "owner");
    } else if (proposal.userId !== userId) {
      throw new Error("Not authorized");
    }

    // Delete follow-ups
    const followUps = await ctx.db
      .query("proposalFollowUps")
      .withIndex("by_proposal", (q) => q.eq("proposalId", proposalId))
      .take(1000);
    for (const fu of followUps) await ctx.db.delete(fu._id);

    await ctx.db.delete(proposalId);
  },
});

export const seedTemplates = mutation({
  args: {},
  handler: async (ctx) => {
    await rateLimitAuthenticated(ctx, "seedTemplates");
    const existing = await ctx.db
      .query("proposalTemplates")
      .withIndex("by_system", (q) => q.eq("isSystem", true))
      .take(1000);

    if (existing.length > 0) return;

    const templates = [
      {
        name: "Web Development Proposal",
        industry: "Technology",
        description: "Professional proposal template for web development projects",
        sections: [
          { id: "1", type: "heading" as const, content: "Project Overview" },
          { id: "2", type: "text" as const, content: "We will build a modern, responsive web application tailored to your business needs. Our approach combines clean architecture with pixel-perfect design." },
          { id: "3", type: "pricing" as const, content: "Development Package", metadata: { items: [{ name: "Frontend Development", price: 5000 }, { name: "Backend Development", price: 7000 }, { name: "Testing & QA", price: 2000 }] } },
          { id: "4", type: "milestone" as const, content: "Project Milestones", metadata: { milestones: [{ name: "Design Approval", weeks: 2 }, { name: "MVP Delivery", weeks: 6 }, { name: "Final Delivery", weeks: 10 }] } },
          { id: "5", type: "terms" as const, content: "Payment Terms: 30% upfront, 40% at MVP, 30% on delivery. Project scope changes will be billed at $150/hr." },
        ],
      },
      {
        name: "Design & Branding Proposal",
        industry: "Creative",
        description: "Template for design, branding, and creative services",
        sections: [
          { id: "1", type: "heading" as const, content: "Creative Brief" },
          { id: "2", type: "text" as const, content: "We'll craft a cohesive brand identity that resonates with your target audience and sets you apart from competitors." },
          { id: "3", type: "pricing" as const, content: "Design Package", metadata: { items: [{ name: "Logo Design", price: 3000 }, { name: "Brand Guidelines", price: 2000 }, { name: "Marketing Collateral", price: 2500 }] } },
          { id: "4", type: "terms" as const, content: "Includes 3 revision rounds. Additional revisions billed at $100/round." },
        ],
      },
      {
        name: "Consulting Proposal",
        industry: "Professional Services",
        description: "Template for consulting and advisory services",
        sections: [
          { id: "1", type: "heading" as const, content: "Engagement Overview" },
          { id: "2", type: "text" as const, content: "Our consulting engagement will provide strategic guidance and actionable recommendations to optimize your operations." },
          { id: "3", type: "pricing" as const, content: "Consulting Package", metadata: { items: [{ name: "Discovery Phase (2 weeks)", price: 4000 }, { name: "Analysis & Recommendations", price: 6000 }, { name: "Implementation Support", price: 5000 }] } },
          { id: "4", type: "terms" as const, content: "Billed monthly. 30-day cancellation notice required." },
        ],
      },
    ];

    for (const t of templates) {
      await ctx.db.insert("proposalTemplates", {
        name: t.name,
        industry: t.industry,
        description: t.description,
        sections: t.sections,
        isSystem: true,
        usageCount: 0,
        createdAt: Date.now(),
      });
    }
  },
});

export const createProposalFromDeal = mutation({
  args: {
    dealId: v.id("deals"),
    workspaceId: v.optional(v.id("workspaces")),
    teamId: v.optional(v.id("teams")),
  },
  handler: async (ctx, { dealId, workspaceId, teamId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const deal = await ctx.db.get(dealId);
    if (!deal) throw new Error("Deal not found");

    // Check workspace access or direct ownership
    if (deal.workspaceId) {
      await requireRecordAccess(ctx, deal, "collaborate");
    } else if (deal.userId !== userId) {
      throw new Error("Not authorized");
    }

    // If workspaceId provided, verify membership
    const effectiveWorkspaceId = workspaceId ?? deal.workspaceId;
    if (effectiveWorkspaceId) {
      await requireWorkspaceAccess(ctx, effectiveWorkspaceId, "member");
    }

    // Generate auto-populated sections from deal data
    const sections = [
      { id: "deal_heading", type: "heading" as const, content: deal.title },
      { id: "deal_desc", type: "text" as const, content: deal.description || `Proposal for ${deal.title}` },
      { id: "deal_pricing", type: "pricing" as const, content: "Project Pricing", metadata: { items: [{ name: deal.title, price: deal.value }] } },
      { id: "deal_terms", type: "terms" as const, content: "Payment Terms: 30% upfront, 40% at midpoint, 30% on delivery. Project scope changes will be billed at an agreed hourly rate." },
    ];

    const proposalId = await ctx.db.insert("proposals", {
      userId,
      workspaceId: effectiveWorkspaceId ?? undefined,
      createdBy: userId,
      teamId: teamId ?? deal.teamId ?? undefined,
      dealId,
      clientId: deal.clientId,
      title: `Proposal: ${deal.title}`,
      status: "draft",
      publicToken: generateToken(),
      sections,
      totalValue: deal.value,
      currency: deal.currency || "USD",
      clientName: deal.contactName,
      clientEmail: deal.contactEmail,
      notes: deal.notes,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Link deal to proposal
    await ctx.db.patch(dealId, { proposalId, updatedAt: Date.now() });

    return proposalId;
  },
});

// ─── FOLLOW-UP MANAGEMENT MUTATIONS ──────────────────────────────────────

function getFollowUpSubject(dayNumber, title) {
  if (dayNumber <= 3) return `Following up: ${title}`;
  if (dayNumber <= 10) return `Checking in: ${title}`;
  return `Final reminder: ${title}`;
}

function getFollowUpBody(dayNumber, title, clientName, sentAt) {
  const name = clientName || "there";
  const sentDate = new Date(sentAt).toLocaleDateString();
  if (dayNumber <= 3) {
    return `Hi ${name},\n\nI wanted to follow up on the proposal "${title}" I sent on ${sentDate}.\n\nI'd love to hear your thoughts and answer any questions you might have.\n\nBest regards`;
  }
  if (dayNumber <= 10) {
    return `Hi ${name},\n\nI'm checking in on the proposal "${title}" I sent on ${sentDate}.\n\nPlease let me know if you need any additional information or would like to discuss any adjustments.\n\nBest regards`;
  }
  return `Hi ${name},\n\nThis is a final reminder regarding the proposal "${title}" I sent on ${sentDate}.\n\nThis proposal will expire soon. Please let me know if you have any questions or if you'd like to proceed.\n\nBest regards`;
}

export const startFollowUps = mutation({
  args: {
    proposalId: v.id("proposals"),
    intervals: v.optional(v.array(v.number())),
  },
  handler: async (ctx, { proposalId, intervals }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const proposal = await ctx.db.get(proposalId);
    if (!proposal) throw new Error("Proposal not found");

    // Check workspace access or direct ownership
    if (proposal.workspaceId) {
      const access = await getRecordAccess(ctx, proposal, userId);
      if (!access) throw new Error("Not authorized");
    } else if (proposal.userId !== userId) {
      throw new Error("Not authorized");
    }

    // Only allow for proposals with status "sent" or "viewed"
    if (proposal.status !== "sent" && proposal.status !== "viewed") {
      throw new Error("Follow-ups can only be started for sent or viewed proposals");
    }

    // Cancel any existing scheduled follow-ups for this proposal
    const existingFollowUps = await ctx.db
      .query("proposalFollowUps")
      .withIndex("by_proposal", (q) => q.eq("proposalId", proposalId))
      .take(1000);

    for (const fu of existingFollowUps) {
      if (fu.status === "scheduled") {
        await ctx.db.patch(fu._id, { status: "cancelled" });
      }
    }

    // Create new follow-ups based on provided intervals or defaults
    const dayIntervals = intervals || [3, 7, 14];
    const sentAt = proposal.sentAt || Date.now();

    for (const dayNumber of dayIntervals) {
      await ctx.db.insert("proposalFollowUps", {
        userId: proposal.userId,
        workspaceId: proposal.workspaceId ?? undefined,
        proposalId,
        dayNumber,
        subject: getFollowUpSubject(dayNumber, proposal.title),
        body: getFollowUpBody(dayNumber, proposal.title, proposal.clientName, sentAt),
        channel: "email",
        status: "scheduled",
        scheduledAt: sentAt + dayNumber * 24 * 60 * 60 * 1000,
        createdAt: Date.now(),
      });
    }

    return { success: true, scheduledCount: dayIntervals.length };
  },
});

export const stopFollowUps = mutation({
  args: {
    proposalId: v.id("proposals"),
  },
  handler: async (ctx, { proposalId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const proposal = await ctx.db.get(proposalId);
    if (!proposal) throw new Error("Proposal not found");

    // Check workspace access or direct ownership
    if (proposal.workspaceId) {
      const access = await getRecordAccess(ctx, proposal, userId);
      if (!access) throw new Error("Not authorized");
    } else if (proposal.userId !== userId) {
      throw new Error("Not authorized");
    }

    // Find all scheduled follow-ups for this proposal and cancel them
    const followUps = await ctx.db
      .query("proposalFollowUps")
      .withIndex("by_proposal", (q) => q.eq("proposalId", proposalId))
      .take(1000);

    let cancelledCount = 0;
    for (const fu of followUps) {
      if (fu.status === "scheduled") {
        await ctx.db.patch(fu._id, { status: "cancelled" });
        cancelledCount++;
      }
    }

    return { success: true, cancelledCount };
  },
});

export const skipFollowUp = mutation({
  args: {
    followUpId: v.id("proposalFollowUps"),
  },
  handler: async (ctx, { followUpId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const followUp = await ctx.db.get(followUpId);
    if (!followUp) throw new Error("Follow-up not found");

    // Verify user owns the follow-up
    if (followUp.userId !== userId) {
      throw new Error("Not authorized");
    }

    // Only allow if status is "scheduled"
    if (followUp.status !== "scheduled") {
      throw new Error("Only scheduled follow-ups can be skipped");
    }

    await ctx.db.patch(followUpId, { status: "skipped" });

    return { success: true };
  },
});

export const getFollowUpSettings = query({
  args: {},
  handler: async (ctx) => {
    await rateLimitAuthenticated(ctx, "skipFollowUp");
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return {
        autoFollowUpsEnabled: true,
        day1Enabled: false,
        day3Enabled: true,
        day7Enabled: true,
        day14Enabled: true,
        day21Enabled: false,
        customIntervals: [],
        defaultChannel: "email",
      };
    }

    const settings = await ctx.db
      .query("proposalFollowUpSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!settings) {
      return {
        autoFollowUpsEnabled: true,
        day1Enabled: false,
        day3Enabled: true,
        day7Enabled: true,
        day14Enabled: true,
        day21Enabled: false,
        customIntervals: [],
        defaultChannel: "email",
      };
    }

    return {
      autoFollowUpsEnabled: settings.autoFollowUpsEnabled,
      day1Enabled: settings.day1Enabled ?? false,
      day3Enabled: settings.day3Enabled ?? true,
      day7Enabled: settings.day7Enabled ?? true,
      day14Enabled: settings.day14Enabled ?? true,
      day21Enabled: settings.day21Enabled ?? false,
      customIntervals: settings.customIntervals ?? [],
      defaultChannel: settings.defaultChannel ?? "email",
    };
  },
});

export const updateFollowUpSettings = mutation({
  args: {
    autoFollowUpsEnabled: v.optional(v.boolean()),
    day1Enabled: v.optional(v.boolean()),
    day3Enabled: v.optional(v.boolean()),
    day7Enabled: v.optional(v.boolean()),
    day14Enabled: v.optional(v.boolean()),
    day21Enabled: v.optional(v.boolean()),
    customIntervals: v.optional(v.array(v.number())),
    defaultChannel: v.optional(v.union(v.literal("email"), v.literal("sms"), v.literal("whatsapp"))),
    workspaceId: v.optional(v.id("workspaces")),
  },
  handler: async (ctx, args) => {
    await rateLimitAuthenticated(ctx, "updateFollowUpSettings");
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("proposalFollowUpSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    const { workspaceId, ...updates } = args;

    if (existing) {
      // Update existing settings
      const patchData = { ...updates, updatedAt: Date.now() };
      await ctx.db.patch(existing._id, patchData);
      return existing._id;
    }

    // Create new settings
    return await ctx.db.insert("proposalFollowUpSettings", {
      userId,
      workspaceId: workspaceId ?? undefined,
      autoFollowUpsEnabled: updates.autoFollowUpsEnabled ?? true,
      day1Enabled: updates.day1Enabled ?? false,
      day3Enabled: updates.day3Enabled ?? true,
      day7Enabled: updates.day7Enabled ?? true,
      day14Enabled: updates.day14Enabled ?? true,
      day21Enabled: updates.day21Enabled ?? false,
      customIntervals: updates.customIntervals ?? [],
      defaultChannel: updates.defaultChannel ?? "email",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const processDueFollowUps = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Find all follow-ups with status "scheduled" where scheduledAt < now.
    // OLD BUG: this used to mark them as "sent" — but we never actually sent
    // anything (no email infra). That was a fake-send: DB said "sent" but the
    // client never received a follow-up.
    //
    // FIX: flip status to "due" (a new state) and create an in-app notification
    // prompting the user to actually deliver the follow-up via their preferred
    // channel (email, WhatsApp, SMS, etc.) and self-report it via the
    // manual-send workflow.
    const dueFollowUps = await ctx.db
      .query("proposalFollowUps")
      .withIndex("by_status_and_date", (q) => q.eq("status", "scheduled").lt("scheduledAt", now))
      .take(1000);

    let processedCount = 0;
    for (const fu of dueFollowUps) {
      // Skip if already marked due (idempotent)
      if (fu.status === "due") continue;

      // Mark as due (not "sent" — we haven't sent anything)
      await ctx.db.patch(fu._id, {
        status: "due",
        // dueAt is the time the follow-up became due; we can store this in sentAt
        // for backward-compat OR add a new field. We'll set sentAt to undefined
        // to make it clear nothing was sent.
      });

      // Look up the proposal for context
      const proposal = await ctx.db.get(fu.proposalId);
      if (!proposal) continue;

      // Create an in-app notification prompting the user to follow up manually
      await ctx.db.insert("notifications", {
        userId: fu.userId,
        workspaceId: fu.workspaceId,
        type: "follow_up_due",
        title: `Follow-up due: ${proposal.title}`,
        body: `Day ${fu.dayNumber} follow-up is due. The client hasn't been contacted automatically — open the proposal, download the PDF, and send the follow-up via your preferred channel, then mark it as sent.`,
        link: `/proposals`,
        entityType: "follow_up",
        entityId: fu._id,
        severity: "warning",
        read: false,
        dismissed: false,
        createdAt: now,
      });

      processedCount++;
    }

    return { processedCount };
  },
});

export const saveUploadedTemplate = mutation({
  args: {
    name: v.string(),
    sections: v.array(v.object({
      id: v.string(),
      type: v.union(v.literal("heading"), v.literal("text"), v.literal("pricing"), v.literal("terms"), v.literal("milestone"), v.literal("divider"), v.literal("client_info"), v.literal("sender_info"), v.literal("summary"), v.literal("scope_of_work")),
      content: v.string(),
      metadata: v.optional(v.any()),
    })),
    industry: v.optional(v.string()),
    description: v.optional(v.string()),
    workspaceId: v.optional(v.id("workspaces")),
  },
  handler: async (ctx, { name, sections, industry, description, workspaceId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // If workspaceId provided, verify membership
    if (workspaceId) {
      await requireWorkspaceAccess(ctx, workspaceId, "member");
    }

    return await ctx.db.insert("proposalTemplates", {
      userId,
      workspaceId: workspaceId ?? undefined,
      createdBy: userId,
      name,
      sections,
      industry,
      description,
      usageCount: 0,
      createdAt: Date.now(),
    });
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// ponytail: atomic convert-to-project
//
// Replaces the 4-mutation client-side flow at Proposals.tsx:317-387.
// In one Convex transaction:
//   1. Find-or-create the client (matched by email first, then name)
//   2. Create the project, linked to the client + workspace
//   3. If the proposal has a dealId, move that deal to the "Won" stage
//   4. Back-link the proposal with clientId + projectId (and annotate notes)
//
// Atomicity guarantee: if any step throws, Convex rolls back all inserts.
// Returns { clientId, projectId } so the caller can navigate.
// ═══════════════════════════════════════════════════════════════════════════
export const convertToProject = mutation({
  args: {
    proposalId: v.id("proposals"),
  },
  handler: async (ctx, { proposalId }) => {
    await rateLimitAuthenticated(ctx, "createProposal");
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const proposal = await ctx.db.get(proposalId);
    if (!proposal) throw new Error("Proposal not found");

    // Workspace access check
    if (proposal.workspaceId) {
      const access = await getRecordAccess(ctx, proposal, userId);
      if (!access || access === "read") throw new Error("Not authorized");
    } else if (proposal.userId !== userId) {
      throw new Error("Not authorized");
    }

    // Idempotency: if proposal already has projectId, return early
    if (proposal.projectId) {
      return { clientId: proposal.clientId!, projectId: proposal.projectId, alreadyConverted: true };
    }

    const workspaceId = proposal.workspaceId;
    const clientName = proposal.clientName?.trim() || "Unknown Client";
    const clientEmail = proposal.clientEmail?.trim();
    const hourlyRate = proposal.totalValue > 0 ? proposal.totalValue / 40 : 50;

    // ── Step 1: Find-or-create the client ────────────────────────────────
    let clientId = proposal.clientId;
    if (!clientId) {
      // Match by email first (more reliable than name)
      let existing = null;
      if (clientEmail) {
        if (workspaceId) {
          const byWs = await ctx.db
            .query("clients")
            .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
            .filter((q) => q.eq(q.field("contactEmail"), clientEmail))
            .first();
          existing = byWs;
        }
        if (!existing) {
          const byUser = await ctx.db
            .query("clients")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .filter((q) => q.eq(q.field("contactEmail"), clientEmail))
            .first();
          existing = byUser;
        }
      }
      // Fallback: match by case-insensitive name
      if (!existing) {
        const nameLower = clientName.toLowerCase();
        if (workspaceId) {
          const all = await ctx.db
            .query("clients")
            .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
            .take(500);
          existing = all.find((c) => (c.clientName || "").toLowerCase() === nameLower);
        }
      }

      if (existing) {
        clientId = existing._id;
      } else {
        clientId = await ctx.db.insert("clients", {
          userId,
          workspaceId,
          clientName,
          contactEmail: clientEmail,
          contactName: clientName,
          platform: "direct",
          hourlyRate,
          contractType: "hourly",
          riskLevel: "medium",
          createdAt: Date.now(),
          lastActivityAt: Date.now(),
          notes: `Created from proposal: ${proposal.title}`,
        });
      }
    }

    // ── Step 2: Create the project (linked to client + workspace) ────────
    const projectId = await ctx.db.insert("projects", {
      userId,
      workspaceId,
      clientId,
      projectName: proposal.title,
      hourlyRate,
      projectType: "ongoing",
      protectionLevel: "enhanced",
      status: "active",
      createdAt: Date.now(),
      lastActivityAt: Date.now(),
    });

    // ── Step 3: Move the linked deal to "Won" (if any) ──────────────────
    if (proposal.dealId) {
      const deal = await ctx.db.get(proposal.dealId);
      if (deal) {
        // Find the "Won" stage in the deal's workspace
        const stages = deal.workspaceId
          ? await ctx.db
              .query("pipelineStages")
              .withIndex("by_workspace", (q) => q.eq("workspaceId", deal.workspaceId!))
              .take(50)
          : await ctx.db
              .query("pipelineStages")
              .withIndex("by_user", (q) => q.eq("userId", userId))
              .take(50);
        const wonStage = stages.find(
          (s) => s.name.toLowerCase() === "won"
        );
        if (wonStage) {
          await ctx.db.patch(deal._id, {
            stageId: wonStage._id,
            updatedAt: Date.now(),
          });
        }
      }
    }

    // ── Step 4: Back-link the proposal with clientId + projectId ────────
    const existingNotes = proposal.notes || "";
    await ctx.db.patch(proposalId, {
      clientId,
      projectId,
      notes: `${existingNotes ? existingNotes + "\n" : ""}[Converted to project — ${new Date().toLocaleDateString()}]`,
      updatedAt: Date.now(),
    });

    return { clientId, projectId, alreadyConverted: false };
  },
});
