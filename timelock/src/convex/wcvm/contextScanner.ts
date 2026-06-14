import { v } from "convex/values";
import { query, mutation, internalQuery } from "../_generated/server";
import { Doc, Id } from "../_generated/dataModel";
import { getCurrentUser } from "../users";

// WCVM Context Relevance Scanner
// Analyzes work context against client requirements in real-time
// P1 FIX: Now fetches real client policies from the database instead of hardcoded mock data

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

// ── Shared Helper: Get Client Requirements ────────────────────────────────────
// P1 FIX: Fetches real client policies from the clientPolicies table
// Falls back to default requirements if no client-specific policies exist

async function getClientRequirements(
  ctx: any,
  userId: Id<"users">,
  clientName?: string,
): Promise<Array<{ id: string; description: string; type: "activity" | "context" | "screenshots" | "memos" }>> {
  // If we have a client name, try to fetch their specific policies
  if (clientName) {
    try {
      const policy = await ctx.db
        .query("clientPolicies")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .filter((q: any) => q.eq(q.field("clientName"), clientName))
        .first();

      if (policy && policy.requirements && policy.requirements.length > 0) {
        // Map client policy requirements to WCVM requirement format
        return policy.requirements.map((req: any, i: number) => ({
          id: `policy_${i + 1}`,
          description: req.description || req.requirement || `Client requirement: ${req.type || 'general'}`,
          type: mapEvidenceTypeToRequirementType(req.evidenceType || req.type),
        }));
      }
    } catch (err) {
      console.warn("[WCVM] Failed to fetch client policies, using defaults:", err);
    }
  }

  // Default requirements when no client-specific policies exist
  return [
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
}

// Map client policy evidence types to WCVM requirement types
function mapEvidenceTypeToRequirementType(
  evidenceType: string
): "activity" | "context" | "screenshots" | "memos" {
  const mapping: Record<string, "activity" | "context" | "screenshots" | "memos"> = {
    "screenshot": "screenshots",
    "screenshots": "screenshots",
    "memo": "memos",
    "memos": "memos",
    "url": "context",
    "context": "context",
    "activity": "activity",
    "keyboard": "activity",
    "mouse": "activity",
    "work_log": "memos",
    "time_tracking": "activity",
  };
  return mapping[evidenceType?.toLowerCase()] || "activity";
}

// ── Shared Analysis Logic ─────────────────────────────────────────────────────
// Extracted to avoid the 200-line code duplication between query and mutation

function analyzeEvents(
  events: Doc<"evidenceEvents">[],
  evidenceSession: Doc<"evidenceSessions">,
  clientRequirements: Array<{ id: string; description: string; type: "activity" | "context" | "screenshots" | "memos" }>,
): ContextAnalysis {
  const urlEvents = events.filter((e) => e.kind === "url");
  const mouseEvents = events.filter((e) => e.kind === "mouse");
  const keyboardEvents = events.filter((e) => e.kind === "keyboard");
  const screenshotEvents = events.filter((e) => e.kind === "screenshot_ref");
  const memoEvents = events.filter((e) => e.kind === "memo");

  const workDomains = [
    "github.com", "gitlab.com", "figma.com", "notion.so",
    "trello.com", "asana.com", "slack.com", "zoom.us",
    "upwork.com", "fiverr.com", "toptal.com", "freelancer.com",
  ];

  const workSites = urlEvents.filter((e) =>
    workDomains.some((domain) => (e.url || "").includes(domain))
  ).length;
  const nonWorkSites = urlEvents.length - workSites;

  const sessionDuration =
    (evidenceSession.endTime || Date.now()) - evidenceSession.startTime;
  const activityDensity =
    (mouseEvents.length + keyboardEvents.length) / (sessionDuration / 60000);

  // Calculate requirement matches against actual client requirements
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

    // P1 FIX: Fetch real client requirements from clientPolicies table
    const clientRequirements = await getClientRequirements(
      ctx,
      user._id,
      session.clientName,
    );

    return analyzeEvents(events, evidenceSession, clientRequirements);
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

    const events = await ctx.db
      .query("evidenceEvents")
      .withIndex("by_session_and_time", (q) =>
        q.eq("evidenceSessionId", evidenceSession._id)
      )
      .collect();

    // P1 FIX: Fetch real client requirements from clientPolicies table
    const clientRequirements = await getClientRequirements(
      ctx,
      user._id,
      session.clientName,
    );

    // Use shared analysis logic (no more 200-line duplication)
    const analysis = analyzeEvents(events, evidenceSession, clientRequirements);

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
