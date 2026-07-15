import { v } from "convex/values";
import { query, QueryCtx } from "../_generated/server";
import { Doc, Id } from "../_generated/dataModel";
import { getCurrentUser } from "../users";

// Helper function to calculate health score (not a query)
async function calculateHealthScoreHelper(
  ctx: QueryCtx,
  userId: Id<"users">
): Promise<{
  score: number;
  workContextScore: number;
  evidenceConsistency: number;
  platformCompliance: number;
  improvementOpportunity: string;
  totalEvents: number;
  screenshotCount: number;
  memoCount: number;
  overallQuality: number;
  possibleImprovement: number;
} | null> {
  const user = await ctx.db.get(userId);
  if (!user) return null;

  // CRITICAL: Limit sessions to prevent unbounded queries
  const evidenceSessions = await ctx.db
    .query("evidenceSessions")
    .withIndex("by_user_and_status", (q) => q.eq("userId", user._id))
    .order("desc")
    .take(50); // Limit to 50 most recent sessions

  if (evidenceSessions.length === 0) {
    return {
      score: 0,
      workContextScore: 0,
      evidenceConsistency: 0,
      platformCompliance: 0,
      improvementOpportunity: "Start collecting evidence to build your protection score",
      totalEvents: 0,
      screenshotCount: 0,
      memoCount: 0,
      overallQuality: 0,
      possibleImprovement: 13,
    };
  }

  // CRITICAL: Limit events per session to prevent unbounded queries
  let allEvents: Doc<"evidenceEvents">[] = [];
  for (const session of evidenceSessions) {
    const events = await ctx.db
      .query("evidenceEvents")
      .withIndex("by_session_and_time", (q) => q.eq("evidenceSessionId", session._id))
      .take(100); // Limit to 100 events per session
    allEvents = allEvents.concat(events);
  }

  const workContextScore = calculateWorkContextScore(allEvents);
  const evidenceConsistency = calculateEvidenceConsistency(allEvents, evidenceSessions);
  const platformCompliance = calculatePlatformCompliance(allEvents, evidenceSessions);

  const score = Math.round(
    workContextScore * 0.4 + evidenceConsistency * 0.3 + platformCompliance * 0.3
  );

  const overallQuality = score;
  const possibleImprovement = Math.min(100 - score, 13);

  const improvementOpportunity = generateImprovementOpportunity(
    workContextScore,
    evidenceConsistency,
    platformCompliance,
    allEvents
  );

  return {
    score,
    workContextScore,
    evidenceConsistency,
    platformCompliance,
    improvementOpportunity,
    totalEvents: allEvents.length,
    screenshotCount: allEvents.filter((e) => e.kind === "screenshot_ref").length,
    memoCount: allEvents.filter((e) => e.kind === "memo").length,
    overallQuality,
    possibleImprovement,
  };
}

// Calculate Evidence Health Score dynamically
export const calculateEvidenceHealthScore = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    return await calculateHealthScoreHelper(ctx, user._id);
  },
});

// Helper function for dispute success rate calculation
async function calculateDisputeSuccessRateHelper(
  ctx: QueryCtx,
  userId: Id<"users">
): Promise<{
  currentRate: number;
  potentialRate: number;
  improvement: number;
  requiredActions: string[];
  workContextCoverage: number;
  timeConsistency: number;
  platformCompliance: number;
  totalEvidenceItems: number;
  recommendation: string;
} | null> {
  const healthScore = await calculateHealthScoreHelper(ctx, userId);
  if (!healthScore) {
    return {
      currentRate: 0,
      potentialRate: 0,
      improvement: 0,
      requiredActions: ["Start collecting evidence"],
      workContextCoverage: 0,
      timeConsistency: 0,
      platformCompliance: 0,
      totalEvidenceItems: 0,
      recommendation: "Begin tracking work to build protection",
    };
  }

  const baseRate = 50;
  const evidenceQuality = (healthScore.score / 100) * 50;
  const platformRejectionRate = 10;

  const currentRate = Math.round(baseRate + evidenceQuality - platformRejectionRate * 0.2);

  const potentialScore = Math.min(100, healthScore.score + 13);
  const potentialQuality = (potentialScore / 100) * 50;
  const potentialRate = Math.round(baseRate + potentialQuality - platformRejectionRate * 0.2);

  const improvement = potentialRate - currentRate;

  const requiredActions = [];
  if (healthScore.memoCount < 10) {
    requiredActions.push(`Add ${10 - healthScore.memoCount} work memos`);
  }
  if (healthScore.screenshotCount < 20) {
    requiredActions.push(`Take ${20 - healthScore.screenshotCount} more screenshots`);
  }
  if (healthScore.workContextScore < 90) {
    requiredActions.push("Improve work context in screenshots");
  }

  const recommendation = requiredActions.length > 0 
    ? requiredActions[0] 
    : "Maintain current evidence quality";

  return {
    currentRate,
    potentialRate,
    improvement,
    requiredActions,
    workContextCoverage: healthScore.workContextScore,
    timeConsistency: healthScore.evidenceConsistency,
    platformCompliance: healthScore.platformCompliance,
    totalEvidenceItems: healthScore.totalEvents,
    recommendation,
  };
}

// Helper function for work context analysis
async function calculateWorkContextAnalysisHelper(
  ctx: QueryCtx,
  userId: Id<"users">
): Promise<{
  score: number;
  workRelatedCount: number;
  totalCount: number;
  flaggedCount: number;
  flaggedItems: Array<{ timestamp: number; url: string; reason: string }>;
  contextIssues: string;
  detailedBreakdown: {
    workRelated: number;
    flagged: number;
  };
} | null> {
  // CRITICAL: Limit queries for work context analysis
  const evidenceSessions = await ctx.db
    .query("evidenceSessions")
    .withIndex("by_user_and_status", (q) => q.eq("userId", userId))
    .order("desc")
    .take(50);

  let allEvents: Doc<"evidenceEvents">[] = [];
  for (const session of evidenceSessions) {
    const events = await ctx.db
      .query("evidenceEvents")
      .withIndex("by_session_and_time", (q) => q.eq("evidenceSessionId", session._id))
      .take(100);
    allEvents = allEvents.concat(events);
  }

  const urlEvents = allEvents.filter((e) => e.kind === "url");
  const screenshotEvents = allEvents.filter((e) => e.kind === "screenshot_ref");

  const workUrls = urlEvents.filter((e) => isWorkRelatedUrl(e.url || ""));
  const nonWorkUrls = urlEvents.filter((e) => !isWorkRelatedUrl(e.url || ""));

  const workRelatedCount = workUrls.length;
  const totalCount = urlEvents.length || 1;
  const score = Math.round((workRelatedCount / totalCount) * 100);

  const flaggedItems = nonWorkUrls.slice(0, 5).map((e) => ({
    timestamp: e.t,
    url: e.url || "Unknown",
    reason: "Non-work related content detected",
  }));

  return {
    score,
    workRelatedCount,
    totalCount,
    flaggedCount: nonWorkUrls.length,
    flaggedItems,
    contextIssues: nonWorkUrls.length > 0 
      ? `${nonWorkUrls.length} items lack clear work context`
      : "No context issues detected",
    detailedBreakdown: {
      workRelated: workRelatedCount,
      flagged: nonWorkUrls.length,
    },
  };
}

// Helper function for gap prediction
async function predictEvidenceGapsHelper(
  ctx: QueryCtx,
  userId: Id<"users">
): Promise<{
  gapProbability: number;
  nextGapTime: number | null;
  missingTypes: string[];
  confidence: string;
  action: string;
  historicalGaps?: number;
  recentActivity?: number;
  status: "no_gaps" | "low_risk" | "medium_risk" | "high_risk";
  message: string;
  description: string;
} | null> {
  // CRITICAL: Limit queries for gap prediction
  const evidenceSessions = await ctx.db
    .query("evidenceSessions")
    .withIndex("by_user_and_status", (q) => q.eq("userId", userId))
    .order("desc")
    .take(50);

  let allEvents: Doc<"evidenceEvents">[] = [];
  for (const session of evidenceSessions) {
    const events = await ctx.db
      .query("evidenceEvents")
      .withIndex("by_session_and_time", (q) => q.eq("evidenceSessionId", session._id))
      .take(100);
    allEvents = allEvents.concat(events);
  }

  if (allEvents.length < 10) {
    return {
      gapProbability: 0,
      nextGapTime: null,
      missingTypes: [],
      confidence: "Low",
      action: "Collect more evidence to enable gap prediction",
      status: "no_gaps",
      message: "No Gaps Predicted",
      description: "Your evidence collection pattern is consistent. Keep up the good work!",
    };
  }

  const gaps = analyzeHistoricalGaps(allEvents);
  const historicalGapScore = gaps.length > 0 ? Math.min(gaps.length * 15, 100) : 0;

  const now = Date.now();
  const recentEvents = allEvents.filter((e) => now - e.t < 30 * 60 * 1000);
  const currentInactivity = recentEvents.length < 3 ? 60 : 20;

  const gapProbability = Math.round(historicalGapScore * 0.7 + currentInactivity * 0.3);

  const nextGapTime = predictNextGapTimestamp(allEvents);

  const missingTypes: string[] = [];
  const recent = allEvents.filter(e => Date.now() - e.t < 24 * 60 * 60 * 1000);
  if (!recent.some(e => e.kind === "memo")) missingTypes.push("Work Memos");
  if (!recent.some(e => e.kind === "screenshot_ref")) missingTypes.push("Screenshots");

  let status: "no_gaps" | "low_risk" | "medium_risk" | "high_risk";
  let message: string;
  let description: string;

  if (gapProbability < 20) {
    status = "no_gaps";
    message = "No Gaps Predicted";
    description = "Your evidence collection pattern is consistent. Keep up the good work!";
  } else if (gapProbability < 40) {
    status = "low_risk";
    message = "Low Risk";
    description = "Continue current pattern";
  } else if (gapProbability < 60) {
    status = "medium_risk";
    message = "Medium Risk";
    description = "Consider setting reminders for evidence collection";
  } else {
    status = "high_risk";
    message = "High Risk";
    description = "Set reminder to collect evidence";
  }

  return {
    gapProbability,
    nextGapTime,
    missingTypes,
    confidence: gapProbability > 60 ? "High" : gapProbability > 30 ? "Medium" : "Low",
    action: gapProbability > 50 ? "Set reminder to collect evidence" : "Continue current pattern",
    historicalGaps: gaps.length,
    recentActivity: recentEvents.length,
    status,
    message,
    description,
  };
}

// Export helper functions for use in library.ts
export { calculateHealthScoreHelper, calculateDisputeSuccessRateHelper, calculateWorkContextAnalysisHelper, predictEvidenceGapsHelper };

// Helper functions
function calculateWorkContextScore(events: Doc<"evidenceEvents">[]): number {
  const urlEvents = events.filter((e) => e.kind === "url");
  if (urlEvents.length === 0) return 50;

  const workUrls = urlEvents.filter((e) => isWorkRelatedUrl(e.url || ""));
  const contextIssues = urlEvents.length - workUrls.length;

  return Math.max(0, 100 - contextIssues * 10);
}

function calculateEvidenceConsistency(
  events: Doc<"evidenceEvents">[],
  sessions: Doc<"evidenceSessions">[]
): number {
  if (events.length === 0) return 0;

  const sortedEvents = [...events].sort((a, b) => a.t - b.t);

  let inconsistencyPoints = 0;
  for (let i = 1; i < sortedEvents.length; i++) {
    const gap = sortedEvents[i].t - sortedEvents[i - 1].t;
    if (gap > 20 * 60 * 1000) {
      inconsistencyPoints++;
    }
  }

  const screenshots = events.filter((e) => e.kind === "screenshot_ref");
  const totalHours = sessions.reduce((sum, s) => {
    const duration = (s.endTime || Date.now()) - s.startTime;
    return sum + duration / (1000 * 60 * 60);
  }, 0);

  const screenshotsPerHour = totalHours > 0 ? screenshots.length / totalHours : 0;
  if (screenshotsPerHour < 3) {
    inconsistencyPoints += Math.floor((3 - screenshotsPerHour) * 2);
  }

  return Math.max(0, 100 - inconsistencyPoints * 5);
}

function calculatePlatformCompliance(
  events: Doc<"evidenceEvents">[],
  sessions: Doc<"evidenceSessions">[]
): number {
  if (sessions.length === 0) return 0;

  let compliancePoints = 0;

  for (const session of sessions) {
    const sessionEvents = events.filter((e) => e.evidenceSessionId === session._id);
    const requirements = getPlatformRequirements(session.platform);

    const screenshots = sessionEvents.filter((e) => e.kind === "screenshot_ref");
    const duration = (session.endTime || Date.now()) - session.startTime;
    const hours = duration / (1000 * 60 * 60);
    const screenshotsPerHour = hours > 0 ? screenshots.length / hours : 0;

    if (screenshotsPerHour < requirements.minScreenshotsPerHour) {
      compliancePoints++;
    }

    const memos = sessionEvents.filter((e) => e.kind === "memo");
    if (memos.length < requirements.minMemos) {
      compliancePoints++;
    }
  }

  return Math.max(0, 100 - compliancePoints * 5);
}

function generateImprovementOpportunity(
  workContext: number,
  consistency: number,
  compliance: number,
  events: Doc<"evidenceEvents">[]
): string {
  const memoCount = events.filter((e) => e.kind === "memo").length;
  const screenshotCount = events.filter((e) => e.kind === "screenshot_ref").length;

  if (workContext < 85) {
    return `Improve work context in ${Math.ceil((100 - workContext) / 10)} screenshots to reach 99/100 score (+${Math.ceil((100 - workContext) / 10)}% dispute success)`;
  }

  if (consistency < 85) {
    return `Add ${Math.ceil((100 - consistency) / 5)} more evidence items to reach 99/100 score (+${Math.ceil((100 - consistency) / 5)}% dispute success)`;
  }

  if (memoCount < 10) {
    const needed = 10 - memoCount;
    return `Add ${needed} work memos to reach 99/100 score (+12% dispute success)`;
  }

  if (screenshotCount < 20) {
    const needed = 20 - screenshotCount;
    return `Take ${needed} more screenshots to reach 99/100 score (+8% dispute success)`;
  }

  return "Excellent evidence quality! Maintain current collection pattern.";
}

function isWorkRelatedUrl(url: string): boolean {
  const workDomains = [
    "upwork.com",
    "fiverr.com",
    "toptal.com",
    "freelancer.com",
    "github.com",
    "gitlab.com",
    "figma.com",
    "notion.so",
    "trello.com",
    "asana.com",
    "slack.com",
    "zoom.us",
    "docs.google.com",
    "drive.google.com",
    "stackoverflow.com",
  ];

  return workDomains.some((domain) => url.includes(domain));
}

function analyzeHistoricalGaps(events: Doc<"evidenceEvents">[]): Array<{ start: number; end: number; duration: number }> {
  const sortedEvents = [...events].sort((a, b) => a.t - b.t);
  const gaps: Array<{ start: number; end: number; duration: number }> = [];

  for (let i = 1; i < sortedEvents.length; i++) {
    const gap = sortedEvents[i].t - sortedEvents[i - 1].t;
    if (gap > 15 * 60 * 1000) {
      gaps.push({
        start: sortedEvents[i - 1].t,
        end: sortedEvents[i].t,
        duration: gap,
      });
    }
  }

  return gaps;
}

function predictNextGapTimestamp(events: Doc<"evidenceEvents">[]): number | null {
  const gaps = analyzeHistoricalGaps(events);
  if (gaps.length === 0) return null;

  const gapHours = gaps.map((g) => new Date(g.start).getHours());
  const hourCounts: Record<number, number> = {};

  gapHours.forEach((hour) => {
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });

  const mostCommonHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0];
  if (!mostCommonHour) return null;

  const hour = parseInt(mostCommonHour[0]);
  const now = new Date();
  const nextGap = new Date(now);
  nextGap.setHours(hour, 0, 0, 0);
  
  if (nextGap.getTime() <= now.getTime()) {
    nextGap.setDate(nextGap.getDate() + 1);
  }
  
  return nextGap.getTime();
}

function getPlatformRequirements(platform: string): {
  minScreenshotsPerHour: number;
  minMemos: number;
} {
  const requirements: Record<string, { minScreenshotsPerHour: number; minMemos: number }> = {
    upwork: { minScreenshotsPerHour: 6, minMemos: 3 },
    fiverr: { minScreenshotsPerHour: 6, minMemos: 2 },
    toptal: { minScreenshotsPerHour: 12, minMemos: 5 },
    freelancer: { minScreenshotsPerHour: 4, minMemos: 2 },
    client: { minScreenshotsPerHour: 3, minMemos: 1 },
  };

  return requirements[platform] || requirements.upwork;
}