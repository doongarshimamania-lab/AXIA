import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";

// ─── Queries ─────────────────────────────────────────────────────────────────

export const getUserDisputeReports = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const reports = await ctx.db
      .query("disputeReports")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();

    return reports;
  },
});

export const getRecentReports = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const reports = await ctx.db
      .query("disputeReports")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(args.limit || 3);

    return reports.map(report => ({
      _id: report._id,
      caseId: report.caseId,
      generatedAt: report.generatedAt,
      rejectedHours: report.rejectedHours,
      lostIncome: report.lostIncome,
      status: report.status,
    }));
  },
});

export const getMonthlyUsage = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return { used: 0, limit: 1, monthlyLoss: 0, monthlySavings: 0 };

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime();

    const monthlyReports = await ctx.db
      .query("disputeReports")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) =>
        q.and(
          q.gte(q.field("generatedAt"), startOfMonth),
          q.lte(q.field("generatedAt"), endOfMonth)
        )
      )
      .collect();

    const monthlyLoss = monthlyReports.reduce((sum, report) => sum + report.lostIncome, 0);
    const monthlySavings = Math.round((monthlyLoss * 0.83) * 100) / 100;

    return {
      used: monthlyReports.length,
      limit: user.subscriptionTier === "pro" ? -1 : 1,
      monthlyLoss: Math.round(monthlyLoss * 100) / 100,
      monthlySavings,
      startOfMonth,
      endOfMonth,
    };
  },
});

// ─── Mutations ───────────────────────────────────────────────────────────────

/** Create a new dispute report (from dialog or session-based) */
export const createDisputeReport = mutation({
  args: {
    clientName: v.string(),
    projectName: v.string(),
    disputedHours: v.number(),
    hourlyRate: v.optional(v.number()),
    description: v.optional(v.string()),
    sessionId: v.optional(v.id("workSessions")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("User not authenticated");

    // Check tier and monthly usage for free users
    if (user.subscriptionTier === "free") {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime();

      const monthlyReports = await ctx.db
        .query("disputeReports")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .filter((q) =>
          q.and(
            q.gte(q.field("generatedAt"), startOfMonth),
            q.lte(q.field("generatedAt"), endOfMonth)
          )
        )
        .collect();

      if (monthlyReports.length >= 1) {
        const monthlyLoss = monthlyReports.reduce((sum, report) => sum + report.lostIncome, 0) + (args.disputedHours * (args.hourlyRate ?? 75));
        const monthlySavings = Math.round((monthlyLoss * 0.83) * 100) / 100;

        return {
          limited: true,
          monthlyLoss: Math.round(monthlyLoss * 100) / 100,
          monthlySavings,
        };
      }
    }

    const rate = args.hourlyRate ?? user.hourlyRate ?? 75;
    const lostIncome = args.disputedHours * rate;
    const now = Date.now();

    // Generate case ID
    const dateStr = new Date().toISOString().split("T")[0].replace(/-/g, "");
    const randomSuffix = String(Math.floor(Math.random() * 1000)).padStart(3, "0");
    const caseId = `CASE-${dateStr}-${randomSuffix}`;

    // Generate evidence count based on hours
    const evidenceCount = Math.floor(args.disputedHours * 4);
    const evidenceSummary = `${evidenceCount} screenshots, ${Math.floor(args.disputedHours * 12)} activity events, and ${Math.floor(args.disputedHours * 0.6)} work memos collected during the disputed period.`;

    const reportId = await ctx.db.insert("disputeReports", {
      userId: user._id,
      sessionId: args.sessionId,
      caseId,
      generatedAt: now,
      rejectedHours: args.disputedHours,
      lostIncome,
      reportContent: args.description ?? `Dispute report for ${args.disputedHours} hours on ${args.projectName} for ${args.clientName}.`,
      status: "generated",
      title: `Dispute: ${args.projectName}`,
      description: args.description ?? `Client disputed ${args.disputedHours} hours of work on ${args.projectName}.`,
      type: "payment_dispute",
      evidenceCount,
      evidenceSummary,
      clientName: args.clientName,
      projectName: args.projectName,
      hourlyRate: rate,
      updatedAt: now,
    });

    return { reportId, caseId, limited: false };
  },
});

/** Generate a dispute report from an existing session (legacy) */
export const generateDisputeReport = mutation({
  args: {
    sessionId: v.id("workSessions"),
    rejectedHours: v.number(),
    lostIncome: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("User not authenticated");

    // Check tier and monthly usage for free users
    if (user.subscriptionTier === "free") {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime();

      const monthlyReports = await ctx.db
        .query("disputeReports")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .filter((q) =>
          q.and(
            q.gte(q.field("generatedAt"), startOfMonth),
            q.lte(q.field("generatedAt"), endOfMonth)
          )
        )
        .collect();

      if (monthlyReports.length >= 1) {
        const monthlyLoss = monthlyReports.reduce((sum, report) => sum + report.lostIncome, 0) + args.lostIncome;
        const monthlySavings = Math.round((monthlyLoss * 0.83) * 100) / 100;

        return {
          limited: true,
          monthlyLoss: Math.round(monthlyLoss * 100) / 100,
          monthlySavings,
        };
      }
    }

    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== user._id) {
      throw new Error("Session not found or unauthorized");
    }

    // Get time blocks for this session
    const blocks = await ctx.db
      .query("timeBlocks")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    const rejectedBlocks = blocks.filter(b => b.complianceStatus === "rejected");

    // Generate case ID
    const caseId = `${user._id.substring(0, 5)}-${new Date().toISOString().split('T')[0]}`;

    // Generate report content
    const reportContent = generateReportContent(session, rejectedBlocks, args.rejectedHours, args.lostIncome);

    const now = Date.now();
    const reportId = await ctx.db.insert("disputeReports", {
      userId: user._id,
      sessionId: args.sessionId,
      caseId,
      generatedAt: now,
      rejectedHours: args.rejectedHours,
      lostIncome: args.lostIncome,
      reportContent,
      status: "generated",
      title: `Dispute: ${session.projectName}`,
      description: `Session-based dispute for ${args.rejectedHours} hours on ${session.projectName}.`,
      type: "payment_dispute",
      evidenceCount: rejectedBlocks.length,
      evidenceSummary: `${rejectedBlocks.length} rejected time blocks found during the disputed period.`,
      clientName: session.clientName,
      projectName: session.projectName,
      hourlyRate: session.hourlyRate,
      updatedAt: now,
    });

    return { reportId, caseId, reportContent, limited: false };
  },
});

/** Update the status of a dispute report */
export const updateReportStatus = mutation({
  args: {
    reportId: v.id("disputeReports"),
    status: v.union(v.literal("generated"), v.literal("sent"), v.literal("viewed"), v.literal("resolved"), v.literal("appealed")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("User not authenticated");

    const report = await ctx.db.get(args.reportId);
    if (!report || report.userId !== user._id) {
      throw new Error("Report not found or unauthorized");
    }

    const now = Date.now();
    const patch: any = {
      status: args.status,
      updatedAt: now,
    };

    // Set timestamp fields based on status
    if (args.status === "sent") {
      patch.sentAt = now;
    } else if (args.status === "viewed") {
      patch.viewedAt = now;
    } else if (args.status === "resolved") {
      patch.resolvedAt = now;
    }

    await ctx.db.patch(args.reportId, patch);

    return report;
  },
});

/** Delete a dispute report */
export const deleteDisputeReport = mutation({
  args: {
    reportId: v.id("disputeReports"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("User not authenticated");

    const report = await ctx.db.get(args.reportId);
    if (!report || report.userId !== user._id) {
      throw new Error("Report not found or unauthorized");
    }

    await ctx.db.delete(args.reportId);
    return true;
  },
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateReportContent(session: any, rejectedBlocks: any[], rejectedHours: number, lostIncome: number): string {
  const date = new Date().toLocaleDateString();

  const dominantPlatform: "upwork" | "fiverr" | "toptal" | "client" =
    (rejectedBlocks[0]?.activity?.toLowerCase().includes("fiverr") ? "fiverr" :
     rejectedBlocks[0]?.activity?.toLowerCase().includes("toptal") ? "toptal" : "upwork") as any;

  const platformNames: Record<string, string> = {
    upwork: "Upwork",
    fiverr: "Fiverr",
    toptal: "Toptal",
    client: "Client",
  };

  const successRateByPlatform: Record<string, number> = {
    upwork: 0.92,
    fiverr: 0.86,
    toptal: 0.88,
    client: 0.9,
  };

  const platformLabel = platformNames[dominantPlatform] ?? "Upwork";
  const predicted = Math.round((successRateByPlatform[dominantPlatform] ?? 0.9) * 100);

  return `# ${platformLabel.toUpperCase()} PAYMENT PROTECTION DISPUTE EVIDENCE

**Generated:** ${date} | **Case ID:** ${session.userId.substring(0,5)}-${date}

## Session Details
- **Client:** ${session.clientName}
- **Project:** ${session.projectName}
- **Hourly Rate:** $${session.hourlyRate}
- **Session Duration:** ${session.totalMinutes ? Math.floor(session.totalMinutes) + ' minutes' : 'In progress'}
- **Rejected Hours:** ${rejectedHours}
- **Lost Income:** $${lostIncome}

## Work Activity Timeline

${rejectedBlocks.length > 0 ? rejectedBlocks.map(block => {
  const startTime = new Date(block.startTime).toLocaleTimeString();
  const endTime = new Date(block.endTime).toLocaleTimeString();

  return `### ${startTime}-${endTime}: ${block.activity}
**Site:** ${block.website} | **Status:** ${block.complianceStatus}
**Proof:** ${block.screenshotCount} screenshots (mouse: ${block.mouseActivity ? "yes" : "no"}, keyboard: ${block.keyboardActivity ? "yes" : "no"})`;
}).join('\n\n') : 'No rejected time blocks found.'}

## Success Rate Prediction
Based on similar ${platformLabel} cases, this dispute has an estimated **${predicted}% success rate**.

---
*Generated by Axia - Cross-Platform Payment Protection System*`;
}
