// @ts-nocheck — Convex backend file with schema types not yet in generated types
import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// ─── QUERIES ──────────────────────────────────────────────────────────────

export const getProposals = query({
  args: { status: v.optional(v.string()) },
  handler: async (ctx, { status }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    if (status) {
      return await ctx.db
        .query("proposals")
        .withIndex("by_user_and_status", (q) => q.eq("userId", userId).eq("status", status as any))
        .order("desc")
        .collect();
    }
    return await ctx.db
      .query("proposals")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

export const getProposal = query({
  args: { proposalId: v.id("proposals") },
  handler: async (ctx, { proposalId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const proposal = await ctx.db.get(proposalId);
    if (!proposal || proposal.userId !== userId) return null;
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
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    const systemTemplates = await ctx.db
      .query("proposalTemplates")
      .withIndex("by_system", (q) => q.eq("isSystem", true))
      .collect();

    const userTemplates = userId
      ? await ctx.db
          .query("proposalTemplates")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .collect()
      : [];

    return [...systemTemplates, ...userTemplates];
  },
});

export const getProposalStats = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { total: 0, sent: 0, signed: 0, draft: 0, signatureRate: 0, totalValue: 0 };

    const proposals = await ctx.db
      .query("proposals")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

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
      .collect();
  },
});

// ─── MUTATIONS ────────────────────────────────────────────────────────────

function generateToken(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export const createProposal = mutation({
  args: {
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
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    return await ctx.db.insert("proposals", {
      userId,
      ...args,
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
  },
  handler: async (ctx, { proposalId, ...updates }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const proposal = await ctx.db.get(proposalId);
    if (!proposal || proposal.userId !== userId) throw new Error("Not authorized");

    await ctx.db.patch(proposalId, { ...updates, updatedAt: Date.now() });
  },
});

export const sendProposal = mutation({
  args: { proposalId: v.id("proposals") },
  handler: async (ctx, { proposalId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const proposal = await ctx.db.get(proposalId);
    if (!proposal || proposal.userId !== userId) throw new Error("Not authorized");

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
    // but only transitions from "sent" to "viewed"
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
    // SECURITY: Only allow signing proposals in "sent" or "viewed" status
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
      .collect();

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
    if (!proposal || proposal.userId !== userId) throw new Error("Not authorized");

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
    if (!proposal || proposal.userId !== userId) throw new Error("Not authorized");

    // Delete follow-ups
    const followUps = await ctx.db
      .query("proposalFollowUps")
      .withIndex("by_proposal", (q) => q.eq("proposalId", proposalId))
      .collect();
    for (const fu of followUps) await ctx.db.delete(fu._id);

    await ctx.db.delete(proposalId);
  },
});

export const seedTemplates = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db
      .query("proposalTemplates")
      .withIndex("by_system", (q) => q.eq("isSystem", true))
      .collect();

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
  args: { dealId: v.id("deals") },
  handler: async (ctx, { dealId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const deal = await ctx.db.get(dealId);
    if (!deal || deal.userId !== userId) throw new Error("Not authorized");

    // Generate auto-populated sections from deal data
    const sections = [
      { id: "deal_heading", type: "heading" as const, content: deal.title },
      { id: "deal_desc", type: "text" as const, content: deal.description || `Proposal for ${deal.title}` },
      { id: "deal_pricing", type: "pricing" as const, content: "Project Pricing", metadata: { items: [{ name: deal.title, price: deal.value }] } },
      { id: "deal_terms", type: "terms" as const, content: "Payment Terms: 30% upfront, 40% at midpoint, 30% on delivery. Project scope changes will be billed at an agreed hourly rate." },
    ];

    const proposalId = await ctx.db.insert("proposals", {
      userId,
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
  },
  handler: async (ctx, { name, sections, industry, description }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    return await ctx.db.insert("proposalTemplates", {
      userId,
      name,
      sections,
      industry,
      description,
      usageCount: 0,
      createdAt: Date.now(),
    });
  },
});
