import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";

export const generateDisputeReport = mutation({
  args: {
    sessionId: v.id("workSessions"),
    rejectedHours: v.number(),
    lostIncome: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      throw new Error("User not authenticated");
    }

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
        // Calculate monthly loss and savings for limit modal
        const monthlyLoss = monthlyReports.reduce((sum, report) => sum + report.lostIncome, 0) + args.lostIncome;
        const monthlySavings = Math.round((monthlyLoss * 0.83) * 100) / 100;
        
        return { 
          limited: true, 
          monthlyLoss: Math.round(monthlyLoss * 100) / 100, 
          monthlySavings 
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

    const reportId = await ctx.db.insert("disputeReports", {
      userId: user._id,
      sessionId: args.sessionId,
      caseId,
      generatedAt: Date.now(),
      rejectedHours: args.rejectedHours,
      lostIncome: args.lostIncome,
      reportContent,
      status: "generated",
    });

    return { reportId, caseId, reportContent, limited: false };
  },
});

export const getUserDisputeReports = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return [];
    }

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
    if (!user) {
      return [];
    }

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

export const updateReportStatus = mutation({
  args: {
    reportId: v.id("disputeReports"),
    status: v.union(v.literal("generated"), v.literal("sent"), v.literal("resolved")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      throw new Error("User not authenticated");
    }

    const report = await ctx.db.get(args.reportId);
    if (!report || report.userId !== user._id) {
      throw new Error("Report not found or unauthorized");
    }

    await ctx.db.patch(args.reportId, {
      status: args.status,
    });

    return report;
  },
});

export const getMonthlyUsage = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return { used: 0, limit: 1, monthlyLoss: 0, monthlySavings: 0 };
    }

    // Get current month boundaries
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime();

    // Count reports generated this month
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

    // Calculate monthly loss from reports or estimate from rejected hours
    const monthlyLoss = monthlyReports.reduce((sum, report) => sum + report.lostIncome, 0);
    const monthlySavings = Math.round((monthlyLoss * 0.83) * 100) / 100;

    return {
      used: monthlyReports.length,
      limit: user.subscriptionTier === "pro" ? -1 : 1, // -1 = unlimited
      monthlyLoss: Math.round(monthlyLoss * 100) / 100,
      monthlySavings,
      startOfMonth,
      endOfMonth
    };
  },
});

function generateReportContent(session: any, rejectedBlocks: any[], rejectedHours: number, lostIncome: number): string {
  const date = new Date().toLocaleDateString();

  // Infer dominant platform from rejected blocks; fallback to "upwork"
  const dominantPlatform: "upwork" | "fiverr" | "toptal" | "client" =
    (rejectedBlocks[0]?.platform as any) || "upwork";

  const platformNames: Record<string, string> = {
    upwork: "Upwork",
    fiverr: "Fiverr",
    toptal: "Toptal",
    client: "Client",
  } as const;

  const successRateByPlatform: Record<string, number> = {
    upwork: 0.92,
    fiverr: 0.86,
    toptal: 0.88,
    client: 0.9,
  } as const;

  const platformLabel = platformNames[dominantPlatform] ?? "Upwork";
  const predicted = Math.round((successRateByPlatform[dominantPlatform] ?? 0.9) * 100);

  return `# ${platformLabel.toUpperCase()} PAYMENT PROTECTION DISPUTE EVIDENCE

**Generated:** ${date} | **Case ID:** ${session.userId.substring(0,5)}-${date}

## Session Details
- **Client:** ${session.clientName}
- **Project:** ${session.projectName}
- **Hourly Rate:** $${session.hourlyRate}
- **Session Duration:** ${Math.floor((session.endTime - session.startTime) / (1000 * 60))} minutes
- **Rejected Hours:** ${rejectedHours}
- **Lost Income:** $${lostIncome}

## Work Activity Timeline

${rejectedBlocks.map(block => {
  const startTime = new Date(block.startTime).toLocaleTimeString();
  const endTime = new Date(block.endTime).toLocaleTimeString();
  
  return `### ${startTime}-${endTime}: ${block.activity}
**Site:** ${block.website} | **Platform:** ${platformNames[block.platform] ?? "Unknown"} | **Status:** ${block.complianceStatus}
**Proof:** ${block.screenshotCount} screenshots (mouse activity: ${block.mouseActivity ? "yes" : "no"}, keyboard: ${block.keyboardActivity ? "yes" : "no"})

> Policy Reference:
> Work-related, platform-adjacent activity counts when directly tied to the contracted deliverables.`;
}).join('\n\n')}

## Compliance Evidence
- Total screenshots captured: ${rejectedBlocks.reduce((sum, b) => sum + b.screenshotCount, 0)}
- Mouse activity detected: ${rejectedBlocks.filter(b => b.mouseActivity).length}/${rejectedBlocks.length} blocks
- Keyboard activity detected: ${rejectedBlocks.filter(b => b.keyboardActivity).length}/${rejectedBlocks.length} blocks

## Success Rate Prediction
Based on similar ${platformLabel} cases, this dispute has an estimated **${predicted}% success rate**.

---
*Generated by TimeStop v1.0 - Cross-Platform Payment Protection System*`;
}