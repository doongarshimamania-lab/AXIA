import { v } from "convex/values";
import { query } from "../_generated/server";
import { getCurrentUser } from "../users";
import { getWorkspaceMembership } from "../permissions";
import {
  calculateHealthScoreHelper,
  calculateDisputeSuccessRateHelper,
  calculateWorkContextAnalysisHelper,
  predictEvidenceGapsHelper
} from "./analytics";

export const getEvidenceLibraryData = query({
  args: {
    view: v.union(v.literal("date"), v.literal("project"), v.literal("client"), v.literal("type")),
    startDate: v.number(),
    endDate: v.number(),
    workspaceId: v.optional(v.id("workspaces")),
  },
  handler: async (ctx, args) => {
    try {
      const user = await getCurrentUser(ctx).catch(() => null);

      // ponytail: previously this returned getMockEvidenceLibraryData() when the
      // user was missing or had no evidence events — which is why the page
      // showed "124 items / 98% dispute success / 95% quality score" for a
      // brand-new account. Now we return a real EMPTY state so the UI can
      // render a proper "no evidence yet" empty state and the export section
      // can show its own CTA. The mock generator is gone.
      if (!user) {
        return getEmptyEvidenceLibraryData();
      }

      // ponytail: IDOR fix — previously when workspaceId was provided we
      // queried the by_workspace index WITHOUT verifying membership. Any
      // authenticated user could pass another workspace's ID and read
      // its evidence sessions (dispute-success rate, evidence items,
      // content quality scores). Now we fall back to caller's own data
      // if they're not a member of the requested workspace.
      let effectiveWorkspaceId = args.workspaceId;
      if (effectiveWorkspaceId) {
        const membership = await getWorkspaceMembership(ctx, effectiveWorkspaceId, user._id);
        if (!membership) {
          // Not a member — fall back to user's own data
          effectiveWorkspaceId = undefined;
        }
      }

      // Use analytics helpers for consistent scoring
      const healthScore = await calculateHealthScoreHelper(ctx, user._id);
      const disputeData = await calculateDisputeSuccessRateHelper(ctx, user._id);
      const contentData = await calculateWorkContextAnalysisHelper(ctx, user._id);
      const gapPrediction = await predictEvidenceGapsHelper(ctx, user._id);

      // CRITICAL: Limit evidence items query to prevent unbounded collection
      let evidenceSessions;
      if (effectiveWorkspaceId) {
        evidenceSessions = await ctx.db
          .query("evidenceSessions")
          .withIndex("by_workspace", (q) => q.eq("workspaceId", effectiveWorkspaceId!))
          .order("desc")
          .take(50);
      } else {
        evidenceSessions = await ctx.db
          .query("evidenceSessions")
          .withIndex("by_user_and_status", (q) => q.eq("userId", user._id))
          .order("desc")
          .take(50); // Limit to 50 most recent sessions
      }

      let allEvents = [];
      for (const session of evidenceSessions) {
        const events = await ctx.db
          .query("evidenceEvents")
          .withIndex("by_session_and_time", (q) => q.eq("evidenceSessionId", session._id))
          .take(100); // Limit to 100 events per session
        allEvents.push(...events);
      }

      // ponytail: previously returned getMockEvidenceLibraryData() here. Now
      // returns a real empty state — analytics helpers may still return
      // meaningful numbers (e.g. disputeData.currentRate could be 0) but the
      // evidenceItems list is empty so the UI can show its "no data yet"
      // empty state instead of fake mock items.
      if (allEvents.length === 0) {
        return getEmptyEvidenceLibraryData();
      }

      const evidenceItems = allEvents
        .filter((e) => e.t >= args.startDate && e.t <= args.endDate)
        .map((event) => {
          const session = evidenceSessions.find((s) => s._id === event.evidenceSessionId);
          return {
            id: event._id,
            timestamp: event.t,
            type: event.kind,
            platform: session?.platform || "unknown",
            description: getEventDescription(event),
            metadata: event.data,
          };
        })
        .sort((a, b) => b.timestamp - a.timestamp);

      return {
        totalCount: evidenceItems.length,
        disputeSuccessRate: disputeData?.currentRate || 0,
        contentQualityScore: contentData?.score || 0,
        gapPrediction: gapPrediction || {
          status: "no_data",
          message: "No Data",
          description: "Start collecting evidence",
          nextGapTime: null,
          missingTypes: [],
        },
        evidenceItems,
        healthScore: healthScore || {
          score: 0,
          workContextScore: 0,
          evidenceConsistency: 0,
          platformCompliance: 0,
          improvementOpportunity: "Start collecting evidence",
          totalEvents: 0,
          screenshotCount: 0,
          memoCount: 0,
          overallQuality: 0,
          possibleImprovement: 0,
        },
        disputeData: disputeData || {
          currentRate: 0,
          potentialRate: 0,
          improvement: 0,
          workContextCoverage: 0,
          timeConsistency: 0,
          platformCompliance: 0,
          totalEvidenceItems: 0,
          recommendation: "Start collecting evidence",
        },
        contentData: contentData || {
          score: 0,
          workRelatedCount: 0,
          totalCount: 0,
          flaggedCount: 0,
          contextIssues: "No data",
          detailedBreakdown: { workRelated: 0, flagged: 0 },
        },
      };
    } catch (error) {
      console.error("Error in getEvidenceLibraryData, returning empty state:", error);
      // ponytail: catch path also returns empty state instead of mock data.
      return getEmptyEvidenceLibraryData();
    }
  },
});

export const getEvidenceTimeline = query({
  args: {
    date: v.number(),
    workspaceId: v.optional(v.id("workspaces")),
  },
  handler: async (ctx, args) => {
    try {
      const user = await getCurrentUser(ctx).catch(() => null);

      // ponytail: previously this returned getMockEvidenceTimeline() (a fake
      // 9-6 work day with random event counts) when the user had no sessions.
      // Now returns a real empty 24-hour timeline with 0 events so the UI
      // shows the actual "no evidence collected today" state.
      if (!user) {
        return getEmptyEvidenceTimeline();
      }

      // Get today's evidence sessions
      const startOfDay = new Date(args.date).setHours(0, 0, 0, 0);
      const endOfDay = new Date(args.date).setHours(23, 59, 59, 999);

      // ponytail: IDOR fix — verify workspace membership before using
      // the by_workspace index. Non-members fall back to user's own data.
      let effectiveWorkspaceId = args.workspaceId;
      if (effectiveWorkspaceId) {
        const membership = await getWorkspaceMembership(ctx, effectiveWorkspaceId, user._id);
        if (!membership) {
          effectiveWorkspaceId = undefined;
        }
      }

      // CRITICAL: Limit timeline query
      let evidenceSessions;
      if (effectiveWorkspaceId) {
        evidenceSessions = await ctx.db
          .query("evidenceSessions")
          .withIndex("by_workspace", (q) => q.eq("workspaceId", effectiveWorkspaceId!))
          .order("desc")
          .take(100);
      } else {
        evidenceSessions = await ctx.db
          .query("evidenceSessions")
          .withIndex("by_user_and_status", (q) => q.eq("userId", user._id))
          .order("desc")
          .take(100); // Limit to 100 most recent sessions for timeline
      }

      const todaySessions = evidenceSessions.filter(
        (s) => s.startTime >= startOfDay && s.startTime <= endOfDay
      );

      // ponytail: previously returned getMockEvidenceTimeline() here. Now
      // returns a real empty 24-hour timeline so the UI can render the
      // "no evidence collected today" state.
      if (evidenceSessions.length === 0) {
        return getEmptyEvidenceTimeline();
      }

      // Calculate protected hours
      let protectedHours = 0;
      for (const session of todaySessions) {
        const duration = (session.endTime || Date.now()) - session.startTime;
        protectedHours += duration / (1000 * 60 * 60);
      }

      // Build timeline with hourly blocks
      const timeline = [];
      for (let hour = 0; hour < 24; hour++) {
        const hourStart = startOfDay + hour * 60 * 60 * 1000;
        const hourEnd = hourStart + 60 * 60 * 1000;

        const hourSessions = todaySessions.filter(
          (s) => s.startTime < hourEnd && (s.endTime || Date.now()) > hourStart
        );

        let hourEvents = [];
        for (const session of hourSessions) {
          const events = await ctx.db
            .query("evidenceEvents")
            .withIndex("by_session_and_time", (q) => q.eq("evidenceSessionId", session._id))
            .filter((q) => q.gte(q.field("t"), hourStart))
            .filter((q) => q.lt(q.field("t"), hourEnd))
            .take(50); // Limit events per hour to prevent unbounded queries
          hourEvents.push(...events);
        }

        timeline.push({
          hour,
          status: hourEvents.length > 0 ? "protected" : "unprotected",
          eventCount: hourEvents.length,
          screenshotCount: hourEvents.filter((e) => e.kind === "screenshot_ref").length,
          memoCount: hourEvents.filter((e) => e.kind === "memo").length,
        });
      }

      return {
        protectedHours: Math.round(protectedHours * 10) / 10,
        timeline,
      };
    } catch (error) {
      console.error("Error in getEvidenceTimeline, returning empty state:", error);
      // ponytail: catch path returns empty state instead of mock data.
      return getEmptyEvidenceTimeline();
    }
  },
});

function getEventDescription(event: any): string {
  switch (event.kind) {
    case "screenshot_ref":
      return "Screenshot captured";
    case "memo":
      return event.data?.text || event.data?.content || "Work memo added";
    case "url":
      return `Visited: ${event.url || "Unknown URL"}`;
    case "keyboard":
      return "Keyboard activity";
    case "mouse":
      return "Mouse activity";
    case "platform_status":
      return "Platform status update";
    default:
      return "Evidence recorded";
  }
}

// --- EMPTY STATE GENERATORS ---
// ponytail: previously these were MOCK DATA GENERATORS that returned fake
// numbers (124 items, 98% dispute success rate, 95% quality score, simulated
// 9-6 work day with random event counts). That was confusing — a brand-new
// account would see a fully-populated Evidence Library that looked real.
// Now we return a real EMPTY state with 0 items, 0% scores, and an empty
// 24-hour timeline. The UI's "No Evidence Data Yet" empty state handles
// the CTA to start collecting evidence.

function getEmptyEvidenceLibraryData() {
  return {
    totalCount: 0,
    disputeSuccessRate: 0,
    contentQualityScore: 0,
    gapPrediction: {
      status: "no_data" as const,
      message: "No Data",
      description: "Start collecting evidence to see gap predictions.",
      nextGapTime: null,
      missingTypes: [],
    },
    evidenceItems: [] as any[],
    healthScore: {
      score: 0,
      workContextScore: 0,
      evidenceConsistency: 0,
      platformCompliance: 0,
      improvementOpportunity: "Start collecting evidence",
      totalEvents: 0,
      screenshotCount: 0,
      memoCount: 0,
      overallQuality: 0,
      possibleImprovement: 0,
    },
    disputeData: {
      currentRate: 0,
      potentialRate: 0,
      improvement: 0,
      workContextCoverage: 0,
      timeConsistency: 0,
      platformCompliance: 0,
      totalEvidenceItems: 0,
      recommendation: "Start collecting evidence",
    },
    contentData: {
      score: 0,
      workRelatedCount: 0,
      totalCount: 0,
      flaggedCount: 0,
      contextIssues: "No content analysis data yet — start a work session to begin collecting evidence.",
      detailedBreakdown: {
        workRelated: 0,
        flagged: 0,
      },
    },
  };
}

function getEmptyEvidenceTimeline() {
  // ponytail: returns a real 24-hour timeline where every hour is "unprotected"
  // (no events captured). The UI's EvidenceTimeline renders this as a flat
  // empty bar — accurate representation of "you haven't tracked any work today".
  const timeline = [];
  for (let hour = 0; hour < 24; hour++) {
    timeline.push({
      hour,
      status: "unprotected",
      eventCount: 0,
      screenshotCount: 0,
      memoCount: 0,
    });
  }
  return {
    protectedHours: 0,
    timeline,
  };
}