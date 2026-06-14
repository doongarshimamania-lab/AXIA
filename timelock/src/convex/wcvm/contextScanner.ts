import { v } from "convex/values";
import { query, mutation, internalQuery } from "../_generated/server";
import { Doc, Id } from "../_generated/dataModel";
import { getCurrentUser } from "../users";

// WCVM Context Relevance Scanner
// Analyzes work context against client requirements in real-time

interface ContextAnalysis {
  contextRelevanceScore: number;
  workSites: number;
  nonWorkSites: number;
  activityDensity: number;
  requirementMatches: Array<{
    id: string;
    description: string;
    relevanceScore: number;
    matchedEvidence: string[];
  }>;
  contextGaps: Array<{
    gap: string;
    impact: string;
    fix: string;
  }>;
}

// Calculate context relevance score for a session
export const analyzeSessionContext = query({
  args: {
    sessionId: v.id("workSessions"),
  },
  handler: async (ctx, args): Promise<ContextAnalysis | null> => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== user._id) return null;

    const evidenceSession = await ctx.db
      .query("evidenceSessions")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (!evidenceSession) {
      return {
        contextRelevanceScore: 0,
        workSites: 0,
        nonWorkSites: 0,
        activityDensity: 0,
        requirementMatches: [],
        contextGaps: [
          {
            gap: "No evidence collection started",
            impact: "Cannot verify work context",
            fix: "Start evidence collection to track work context",
          },
        ],
      };
    }

    const events = await ctx.db
      .query("evidenceEvents")
      .withIndex("by_session_and_time", (q) =>
        q.eq("evidenceSessionId", evidenceSession._id)
      )
      .collect();

    // Analyze events for context
    const urlEvents = events.filter((e) => e.kind === "url");
    const mouseEvents = events.filter((e) => e.kind === "mouse");
    const keyboardEvents = events.filter((e) => e.kind === "keyboard");
    const screenshotEvents = events.filter((e) => e.kind === "screenshot_ref");
    const memoEvents = events.filter((e) => e.kind === "memo");

    // Calculate work site relevance
    const workDomains = [
      "github.com",
      "gitlab.com",
      "figma.com",
      "notion.so",
      "trello.com",
      "asana.com",
      "slack.com",
      "zoom.us",
      "upwork.com",
      "fiverr.com",
      "toptal.com",
      "freelancer.com",
    ];

    const workSites = urlEvents.filter((e) =>
      workDomains.some((domain) => (e.url || "").includes(domain))
    ).length;
    const nonWorkSites = urlEvents.length - workSites;

    // Calculate activity density (events per minute)
    const sessionDuration =
      (evidenceSession.endTime || Date.now()) - evidenceSession.startTime;
    const activityDensity =
      (mouseEvents.length + keyboardEvents.length) / (sessionDuration / 60000);

    // Mock client requirements (in production, fetch from clientPolicies table)
    const clientRequirements = [
      {
        id: "req_1",
        description: "Continuous work activity with regular mouse/keyboard input",
        type: "activity" as const,
      },
      {
        id: "req_2",
        description: "Work-related websites and tools",
        type: "context" as const,
      },
      {
        id: "req_3",
        description: "Regular screenshots showing work progress",
        type: "screenshots" as const,
      },
      {
        id: "req_4",
        description: "Work memos documenting progress",
        type: "memos" as const,
      },
    ];

    // Calculate requirement matches
    const requirementMatches = clientRequirements.map((req) => {
      let relevanceScore = 0;
      const matchedEvidence: string[] = [];

      switch (req.type) {
        case "activity":
          relevanceScore = Math.min(100, activityDensity * 30);
          if (mouseEvents.length > 0)
            matchedEvidence.push(`${mouseEvents.length} mouse events`);
          if (keyboardEvents.length > 0)
            matchedEvidence.push(`${keyboardEvents.length} keyboard events`);
          break;
        case "context":
          relevanceScore =
            urlEvents.length > 0 ? (workSites / urlEvents.length) * 100 : 0;
          if (workSites > 0)
            matchedEvidence.push(`${workSites} work-related sites`);
          break;
        case "screenshots":
          relevanceScore = Math.min(
            100,
            (screenshotEvents.length / (sessionDuration / 600000)) * 100
          );
          if (screenshotEvents.length > 0)
            matchedEvidence.push(`${screenshotEvents.length} screenshots`);
          break;
        case "memos":
          relevanceScore = Math.min(
            100,
            (memoEvents.length / (sessionDuration / 600000)) * 100
          );
          if (memoEvents.length > 0)
            matchedEvidence.push(`${memoEvents.length} work memos`);
          break;
      }

      return {
        id: req.id,
        description: req.description,
        relevanceScore: Math.round(relevanceScore),
        matchedEvidence,
      };
    });

    // Calculate overall context relevance score
    const avgRequirementScore =
      requirementMatches.reduce((sum, r) => sum + r.relevanceScore, 0) /
      requirementMatches.length;
    const workRelevance = urlEvents.length > 0 ? workSites / urlEvents.length : 0;
    const contextRelevanceScore = Math.round(
      avgRequirementScore * 0.6 + workRelevance * 100 * 0.3 + Math.min(activityDensity * 10, 100) * 0.1
    );

    // Identify context gaps
    const contextGaps: Array<{ gap: string; impact: string; fix: string }> = [];

    if (activityDensity < 2) {
      contextGaps.push({
        gap: "Low activity density",
        impact: "May appear as inactive work time",
        fix: "Ensure continuous mouse/keyboard activity during work",
      });
    }

    if (workRelevance < 0.7 && urlEvents.length > 0) {
      contextGaps.push({
        gap: "Low work-related site ratio",
        impact: "Work context may not be clear",
        fix: "Focus on work-related tools and platforms",
      });
    }

    if (screenshotEvents.length < sessionDuration / 600000) {
      contextGaps.push({
        gap: "Insufficient screenshot evidence",
        impact: "Visual proof of work is limited",
        fix: "Capture screenshots every 10 minutes showing work progress",
      });
    }

    if (memoEvents.length === 0) {
      contextGaps.push({
        gap: "No work memos",
        impact: "Missing context documentation",
        fix: "Add work memos describing what you're working on",
      });
    }

    return {
      contextRelevanceScore,
      workSites,
      nonWorkSites,
      activityDensity: Math.round(activityDensity * 10) / 10,
      requirementMatches,
      contextGaps,
    };
  },
});

// Generate WCVM verification for a session
export const generateWCVMVerification = mutation({
  args: {
    sessionId: v.id("workSessions"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== user._id) {
      throw new Error("Session not found or unauthorized");
    }

    const evidenceSession = await ctx.db
      .query("evidenceSessions")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (!evidenceSession) {
      throw new Error("No evidence session found");
    }

    // Get context analysis by running the query logic directly
    const events = await ctx.db
      .query("evidenceEvents")
      .withIndex("by_session_and_time", (q) =>
        q.eq("evidenceSessionId", evidenceSession._id)
      )
      .collect();

    // Analyze events for context
    const urlEvents = events.filter((e) => e.kind === "url");
    const mouseEvents = events.filter((e) => e.kind === "mouse");
    const keyboardEvents = events.filter((e) => e.kind === "keyboard");
    const screenshotEvents = events.filter((e) => e.kind === "screenshot_ref");
    const memoEvents = events.filter((e) => e.kind === "memo");

    // Calculate work site relevance
    const workDomains = [
      "github.com",
      "gitlab.com",
      "figma.com",
      "notion.so",
      "trello.com",
      "asana.com",
      "slack.com",
      "zoom.us",
      "upwork.com",
      "fiverr.com",
      "toptal.com",
      "freelancer.com",
    ];

    const workSites = urlEvents.filter((e) =>
      workDomains.some((domain) => (e.url || "").includes(domain))
    ).length;
    const nonWorkSites = urlEvents.length - workSites;

    // Calculate activity density (events per minute)
    const sessionDuration =
      (evidenceSession.endTime || Date.now()) - evidenceSession.startTime;
    const activityDensity =
      (mouseEvents.length + keyboardEvents.length) / (sessionDuration / 60000);

    // Mock client requirements (in production, fetch from clientPolicies table)
    const clientRequirements = [
      {
        id: "req_1",
        description: "Continuous work activity with regular mouse/keyboard input",
        type: "activity" as const,
      },
      {
        id: "req_2",
        description: "Work-related websites and tools",
        type: "context" as const,
      },
      {
        id: "req_3",
        description: "Regular screenshots showing work progress",
        type: "screenshots" as const,
      },
      {
        id: "req_4",
        description: "Work memos documenting progress",
        type: "memos" as const,
      },
    ];

    // Calculate requirement matches
    const requirementMatches = clientRequirements.map((req) => {
      let relevanceScore = 0;
      const matchedEvidence: string[] = [];

      switch (req.type) {
        case "activity":
          relevanceScore = Math.min(100, activityDensity * 30);
          if (mouseEvents.length > 0)
            matchedEvidence.push(`${mouseEvents.length} mouse events`);
          if (keyboardEvents.length > 0)
            matchedEvidence.push(`${keyboardEvents.length} keyboard events`);
          break;
        case "context":
          relevanceScore =
            urlEvents.length > 0 ? (workSites / urlEvents.length) * 100 : 0;
          if (workSites > 0)
            matchedEvidence.push(`${workSites} work-related sites`);
          break;
        case "screenshots":
          relevanceScore = Math.min(
            100,
            (screenshotEvents.length / (sessionDuration / 600000)) * 100
          );
          if (screenshotEvents.length > 0)
            matchedEvidence.push(`${screenshotEvents.length} screenshots`);
          break;
        case "memos":
          relevanceScore = Math.min(
            100,
            (memoEvents.length / (sessionDuration / 600000)) * 100
          );
          if (memoEvents.length > 0)
            matchedEvidence.push(`${memoEvents.length} work memos`);
          break;
      }

      return {
        id: req.id,
        description: req.description,
        relevanceScore: Math.round(relevanceScore),
        matchedEvidence,
      };
    });

    // Calculate overall context relevance score
    const avgRequirementScore =
      requirementMatches.reduce((sum, r) => sum + r.relevanceScore, 0) /
      requirementMatches.length;
    const workRelevance = urlEvents.length > 0 ? workSites / urlEvents.length : 0;
    const contextRelevanceScore = Math.round(
      avgRequirementScore * 0.6 + workRelevance * 100 * 0.3 + Math.min(activityDensity * 10, 100) * 0.1
    );

    // Identify context gaps
    const contextGaps: Array<{ gap: string; impact: string; fix: string }> = [];

    if (activityDensity < 2) {
      contextGaps.push({
        gap: "Low activity density",
        impact: "May appear as inactive work time",
        fix: "Ensure continuous mouse/keyboard activity during work",
      });
    }

    if (workRelevance < 0.7 && urlEvents.length > 0) {
      contextGaps.push({
        gap: "Low work-related site ratio",
        impact: "Work context may not be clear",
        fix: "Focus on work-related tools and platforms",
      });
    }

    if (screenshotEvents.length < sessionDuration / 600000) {
      contextGaps.push({
        gap: "Insufficient screenshot evidence",
        impact: "Visual proof of work is limited",
        fix: "Capture screenshots every 10 minutes showing work progress",
      });
    }

    if (memoEvents.length === 0) {
      contextGaps.push({
        gap: "No work memos",
        impact: "Missing context documentation",
        fix: "Add work memos describing what you're working on",
      });
    }

    const analysis = {
      contextRelevanceScore,
      workSites,
      nonWorkSites,
      activityDensity: Math.round(activityDensity * 10) / 10,
      requirementMatches,
      contextGaps,
    };

    // Generate verification signature (simplified for demo)
    const verificationData = {
      userId: user._id,
      sessionId: args.sessionId,
      contextScore: analysis.contextRelevanceScore,
      timestamp: Date.now(),
    };
    const verificationSignature = `WCVM-${Buffer.from(
      JSON.stringify(verificationData)
    )
      .toString("base64")
      .slice(0, 32)}`;

    // Store verification
    const verificationId = await ctx.db.insert("wcvmVerifications", {
      userId: user._id,
      sessionId: args.sessionId,
      evidenceSessionId: evidenceSession._id,
      contextRelevanceScore: analysis.contextRelevanceScore,
      verificationMatrix: {
        requirements: analysis.requirementMatches,
        gaps: analysis.contextGaps,
      },
      verificationSignature,
      verifiedAt: Date.now(),
      clientRequirements: analysis.requirementMatches,
    });

    return {
      verificationId,
      contextRelevanceScore: analysis.contextRelevanceScore,
      verificationSignature,
    };
  },
});

// Get latest WCVM verification for a session
export const getSessionVerification = query({
  args: {
    sessionId: v.id("workSessions"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    const verification = await ctx.db
      .query("wcvmVerifications")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .order("desc")
      .first();

    return verification;
  },
});
