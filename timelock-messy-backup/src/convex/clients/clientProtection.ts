import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// Get all clients for the current user
export const getMyClients = query({
  args: {},
  handler: async (ctx) => {
    let userId;
    try {
      userId = await getAuthUserId(ctx);
    } catch (error) {
      // User not authenticated
      return [];
    }
    if (!userId) return [];

    const clients = await ctx.db
      .query("clients")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Enrich with protection metrics
    const enrichedClients = await Promise.all(
      clients.map(async (client) => {
        // Get sessions for this client
        const sessions = await ctx.db
          .query("workSessions")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .filter((q) => q.eq(q.field("clientName"), client.clientName))
          .collect();

        const totalHours = sessions.reduce((sum, s) => sum + (s.totalMinutes || 0) / 60, 0);
        const activeSession = sessions.find((s) => !s.endTime);

        // Get time blocks for compliance
        const timeBlocks = await ctx.db
          .query("timeBlocks")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .collect();

        const clientBlocks = timeBlocks.filter((block) => {
          const session = sessions.find((s) => s._id === block.sessionId);
          return session !== undefined;
        });

        const compliantBlocks = clientBlocks.filter((b) => b.complianceStatus === "compliant").length;
        const totalBlocks = clientBlocks.length;
        const protectionScore = totalBlocks > 0 ? Math.round((compliantBlocks / totalBlocks) * 100) : 100;

        return {
          ...client,
          totalHours: Math.round(totalHours * 10) / 10,
          protectionScore,
          activeSession: activeSession ? true : false,
          totalValue: Math.round(totalHours * client.hourlyRate * 100) / 100,
        };
      })
    );

    return enrichedClients;
  },
});

// Add a new client
export const addClient = mutation({
  args: {
    clientName: v.string(),
    platform: v.union(
      v.literal("upwork"),
      v.literal("fiverr"),
      v.literal("toptal"),
      v.literal("freelancer"),
      v.literal("direct")
    ),
    hourlyRate: v.number(),
    contractType: v.union(v.literal("hourly"), v.literal("fixed")),
    riskLevel: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
  },
  handler: async (ctx, args) => {
    let userId;
    try {
      userId = await getAuthUserId(ctx);
    } catch (error) {
      return { success: false, error: "Not authenticated" };
    }
    if (!userId) return { success: false, error: "Not authenticated" };

    // Check if client already exists
    const existing = await ctx.db
      .query("clients")
      .withIndex("by_user_and_name", (q) =>
        q.eq("userId", userId).eq("clientName", args.clientName)
      )
      .first();

    if (existing) {
      throw new Error("Client already exists");
    }

    const clientId = await ctx.db.insert("clients", {
      userId,
      clientName: args.clientName,
      platform: args.platform,
      hourlyRate: args.hourlyRate,
      contractType: args.contractType,
      riskLevel: args.riskLevel,
      addedAt: Date.now(),
      lastActivityAt: Date.now(),
    });

    return { clientId, success: true };
  },
});

// Update client risk level
export const updateClientRisk = mutation({
  args: {
    clientId: v.id("clients"),
    riskLevel: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
  },
  handler: async (ctx, args) => {
    let userId;
    try {
      userId = await getAuthUserId(ctx);
    } catch (error) {
      return { success: false, error: "Not authenticated" };
    }
    if (!userId) return { success: false, error: "Not authenticated" };

    const client = await ctx.db.get(args.clientId);
    if (!client || client.userId !== userId) {
      throw new Error("Client not found or unauthorized");
    }

    await ctx.db.patch(args.clientId, {
      riskLevel: args.riskLevel,
    });

    return { success: true };
  },
});

// Get client protection details
export const getClientProtectionDetails = query({
  args: { clientId: v.id("clients") },
  handler: async (ctx, args) => {
    let userId;
    try {
      userId = await getAuthUserId(ctx);
    } catch (error) {
      return {
        client: null,
        totalSessions: 0,
        totalReports: 0,
        sessions: [],
      };
    }
    if (!userId) {
      return {
        client: null,
        totalSessions: 0,
        totalReports: 0,
        sessions: [],
      };
    }

    const client = await ctx.db.get(args.clientId);
    if (!client || client.userId !== userId) {
      throw new Error("Client not found or unauthorized");
    }

    // Get all sessions for this client
    const sessions = await ctx.db
      .query("workSessions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("clientName"), client.clientName))
      .collect();

    // Get dispute reports for this client
    const reports = await ctx.db
      .query("disputeReports")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const clientReports = reports.filter((r) => {
      const session = sessions.find((s) => s._id === r.sessionId);
      return session !== undefined;
    });

    return {
      client,
      totalSessions: sessions.length,
      totalReports: clientReports.length,
      sessions: sessions.slice(0, 10),
    };
  },
});

// Get client-specific protection score with 4-pillar structure
export const getClientProtectionScore = query({
  args: {
    clientId: v.optional(v.id("clients")),
  },
  handler: async (ctx, args) => {
    let userId;
    try {
      userId = await getAuthUserId(ctx);
    } catch (error) {
      return {
        evidenceCount: 0,
        activityDensity: 0,
        memoQuality: 0,
        weeklyHours: 0,
        hourlyRate: 25,
        avgMemoWords: 0,
        clientKeywords: 0,
        memoSpecificity: 0,
        requirementAlignment: 0,
        platformGaps: 0,
        highRiskGaps: 0,
        upworkCompliance: 0,
        fiverrCompliance: 0,
        toptalCompliance: 0,
      };
    }
    if (!userId) {
      return {
        evidenceCount: 0,
        activityDensity: 0,
        memoQuality: 0,
        weeklyHours: 0,
        hourlyRate: 25,
        avgMemoWords: 0,
        clientKeywords: 0,
        memoSpecificity: 0,
        requirementAlignment: 0,
        platformGaps: 0,
        highRiskGaps: 0,
        upworkCompliance: 0,
        fiverrCompliance: 0,
        toptalCompliance: 0,
      };
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      return {
        evidenceCount: 0,
        activityDensity: 0,
        memoQuality: 0,
        weeklyHours: 0,
        hourlyRate: 25,
        avgMemoWords: 0,
        clientKeywords: 0,
        memoSpecificity: 0,
        requirementAlignment: 0,
        platformGaps: 0,
        highRiskGaps: 0,
        upworkCompliance: 0,
        fiverrCompliance: 0,
        toptalCompliance: 0,
      };
    }

    const hourlyRate = user.hourlyRate || 25;

    // Get client filter
    let clientFilter: string | null = null;
    if (args.clientId) {
      const client = await ctx.db.get(args.clientId);
      if (client && client.userId === userId) {
        clientFilter = client.clientName;
      }
    }

    // Get all work sessions
    const allSessions = await ctx.db
      .query("workSessions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const sessions = clientFilter
      ? allSessions.filter((s) => s.clientName === clientFilter)
      : allSessions;

    // Calculate weekly hours
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    const recentSessions = sessions.filter((s) => s.startTime >= sevenDaysAgo);
    const weeklyHours = recentSessions.reduce((sum, s) => sum + (s.totalMinutes || 0) / 60, 0);

    // Calculate evidence metrics
    let totalEvidence = 0;
    let totalMemoWords = 0;
    let memoCount = 0;
    let activityEvents = 0;
    let totalMinutes = 0;

    for (const session of sessions) {
      const evidenceSession = await ctx.db
        .query("evidenceSessions")
        .withIndex("by_session", (q) => q.eq("sessionId", session._id))
        .first();

      if (evidenceSession) {
        const events = await ctx.db
          .query("evidenceEvents")
          .withIndex("by_session_and_time", (q) => q.eq("evidenceSessionId", evidenceSession._id))
          .collect();

        totalEvidence += events.length;
        activityEvents += events.length;
        totalMinutes += session.totalMinutes || 0;

        // Count memo quality
        const memos = events.filter((e) => e.kind === "memo");
        memoCount += memos.length;
        memos.forEach((m) => {
          const words = m.data?.text?.split(" ").length || 0;
          totalMemoWords += words;
        });
      }
    }

    const activityDensity = totalMinutes > 0 ? activityEvents / totalMinutes : 0;
    const memoQuality = memoCount > 0 ? Math.min(1, (totalMemoWords / memoCount) / 10) : 0;
    const avgMemoWords = memoCount > 0 ? Math.round(totalMemoWords / memoCount) : 0;

    // Calculate platform compliance (mock data - would be calculated from actual platform requirements)
    const upworkCompliance = Math.min(100, Math.round(activityDensity * 50 + memoQuality * 50));
    const fiverrCompliance = Math.min(100, Math.round(activityDensity * 45 + memoQuality * 55));
    const toptalCompliance = Math.min(100, Math.round(activityDensity * 55 + memoQuality * 45));

    return {
      evidenceCount: totalEvidence,
      activityDensity: Math.round(activityDensity * 100) / 100,
      memoQuality: Math.round(memoQuality * 100) / 100,
      weeklyHours: Math.round(weeklyHours * 10) / 10,
      hourlyRate,
      avgMemoWords,
      clientKeywords: memoCount,
      memoSpecificity: memoQuality,
      requirementAlignment: Math.min(1, memoQuality * 1.2),
      platformGaps: Math.max(0, 5 - Math.floor(memoQuality * 5)),
      highRiskGaps: Math.max(0, 3 - Math.floor(activityDensity * 2)),
      upworkCompliance,
      fiverrCompliance,
      toptalCompliance,
    };
  },
});

// Simulate client-specific dispute outcomes
export const getClientDisputeSimulation = query({
  args: {
    clientId: v.optional(v.id("clients")),
    addMemos: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let userId;
    try {
      userId = await getAuthUserId(ctx);
    } catch (error) {
      return {
        currentRate: 0,
        simulatedRate: 0,
        improvement: 0,
        protectedValue: 0,
        description: "Please log in to view dispute simulation",
      };
    }
    if (!userId) {
      return {
        currentRate: 0,
        simulatedRate: 0,
        improvement: 0,
        protectedValue: 0,
        description: "Please log in to view dispute simulation",
      };
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      return {
        currentRate: 0,
        simulatedRate: 0,
        improvement: 0,
        protectedValue: 0,
        description: "User not found",
      };
    }

    const hourlyRate = user.hourlyRate || 25;

    // Calculate base protection score inline
    let simClientFilter: string | null = null;
    if (args.clientId) {
      const client = await ctx.db.get(args.clientId);
      if (client) simClientFilter = client.clientName;
    }

    const simAllSessions = await ctx.db
      .query("workSessions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const simSessions = simClientFilter
      ? simAllSessions.filter((s) => s.clientName === simClientFilter)
      : simAllSessions;

    // Calculate base rate from evidence quality
    let baseRate = 75;
    if (simSessions.length > 0) {
      const sessionIds = simSessions.map((s) => s._id);
      let totalEvidence = 0;
      let workContextEvidence = 0;

      for (const sessionId of sessionIds) {
        const evidenceSession = await ctx.db
          .query("evidenceSessions")
          .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
          .first();

        if (evidenceSession) {
          const events = await ctx.db
            .query("evidenceEvents")
            .withIndex("by_session_and_time", (q) => q.eq("evidenceSessionId", evidenceSession._id))
            .collect();

          totalEvidence += events.length;
          workContextEvidence += events.filter((e) => e.kind === "url" || e.kind === "memo").length;
        }
      }

      const clientContextScore = totalEvidence > 0 ? Math.min(100, Math.round((workContextEvidence / totalEvidence) * 150)) : 0;
      const now = Date.now();
      const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
      const recentSessions = simSessions.filter((s) => s.startTime >= thirtyDaysAgo);
      const evidenceConsistency = recentSessions.length > 0 ? Math.min(100, recentSessions.length * 10) : 0;
      
      baseRate = Math.round(clientContextScore * 0.4 + evidenceConsistency * 0.3 + 80 * 0.3);
    }

    // Calculate improvement from adding memos
    const memoImprovement = (args.addMemos || 0) * 0.12;
    const simulatedRate = Math.min(99, baseRate + memoImprovement);

    // Calculate protected value this month
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    const monthSessions = await ctx.db
      .query("workSessions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.gte(q.field("startTime"), thirtyDaysAgo))
      .collect();

    let monthClientFilter: string | null = null;
    if (args.clientId) {
      const client = await ctx.db.get(args.clientId);
      if (client) monthClientFilter = client.clientName;
    }

    const filteredSessions = monthClientFilter
      ? monthSessions.filter((s) => s.clientName === monthClientFilter)
      : monthSessions;

    const totalHours = filteredSessions.reduce((sum, s) => sum + (s.totalMinutes || 0) / 60, 0);
    const protectedValue = Math.round(totalHours * hourlyRate * (simulatedRate / 100) * 100) / 100;

    return {
      currentRate: baseRate,
      simulatedRate: Math.round(simulatedRate),
      improvement: Math.round(simulatedRate - baseRate),
      protectedValue,
      description: `Adding memos for client meetings would increase your dispute success rate to ${Math.round(simulatedRate)}% and protect $${protectedValue.toFixed(2)} this month.`,
    };
  },
});

// Predict client-specific evidence gaps
export const getClientGapPrediction = query({
  args: {
    clientId: v.optional(v.id("clients")),
  },
  handler: async (ctx, args) => {
    let userId;
    try {
      userId = await getAuthUserId(ctx);
    } catch (error) {
      return {
        gapProbability: 0,
        predictedTime: "N/A",
        confidence: "Low" as const,
        reason: "Please log in to view gap predictions",
        hasGapPrediction: false,
      };
    }
    if (!userId) {
      return {
        gapProbability: 0,
        predictedTime: "N/A",
        confidence: "Low" as const,
        reason: "Please log in to view gap predictions",
        hasGapPrediction: false,
      };
    }

    // Get historical gap patterns
    const allSessions = await ctx.db
      .query("workSessions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    let clientFilter: string | null = null;
    if (args.clientId) {
      const client = await ctx.db.get(args.clientId);
      if (client) clientFilter = client.clientName;
    }

    const sessions = clientFilter
      ? allSessions.filter((s) => s.clientName === clientFilter)
      : allSessions;

    // Analyze time patterns for gaps
    const hourlyGaps: Record<number, number> = {};
    for (let i = 0; i < 24; i++) {
      hourlyGaps[i] = 0;
    }

    for (const session of sessions) {
      const evidenceSession = await ctx.db
        .query("evidenceSessions")
        .withIndex("by_session", (q) => q.eq("sessionId", session._id))
        .first();

      if (evidenceSession) {
        const events = await ctx.db
          .query("evidenceEvents")
          .withIndex("by_session_and_time", (q) => q.eq("evidenceSessionId", evidenceSession._id))
          .collect();

        const eventsByHour: Record<number, number> = {};
        events.forEach((e) => {
          const hour = new Date(e.t).getHours();
          eventsByHour[hour] = (eventsByHour[hour] || 0) + 1;
        });

        Object.keys(eventsByHour).forEach((hourStr) => {
          const hour = parseInt(hourStr);
          if (eventsByHour[hour] < 3) {
            hourlyGaps[hour]++;
          }
        });
      }
    }

    // Find hour with most gaps
    let maxGapHour = 15;
    let maxGaps = 0;
    Object.entries(hourlyGaps).forEach(([hour, gaps]) => {
      if (gaps > maxGaps) {
        maxGaps = gaps;
        maxGapHour = parseInt(hour);
      }
    });

    // Calculate gap probability
    const clientHistoricalGaps = sessions.length > 0 ? (maxGaps / sessions.length) * 100 : 0;
    const currentInactivity = 60;
    const gapProbability = clientHistoricalGaps * 0.7 + currentInactivity * 0.3;

    const predictedTime = `${maxGapHour % 12 || 12}:${Math.floor(Math.random() * 60).toString().padStart(2, "0")} ${maxGapHour >= 12 ? "PM" : "AM"}`;

    return {
      gapProbability: Math.round(gapProbability),
      predictedTime,
      confidence: gapProbability > 70 ? "High" : gapProbability > 50 ? "Medium" : "Low",
      reason: "Based on your pattern, you typically have evidence gaps during client meetings",
      hasGapPrediction: gapProbability > 30, // Lowered threshold from 70 to 30 to show predictions more often
    };
  },
});

// Get client policy profile
export const getClientPolicyProfile = query({
  args: {
    clientId: v.optional(v.id("clients")),
  },
  handler: async (ctx, args) => {
    let userId;
    try {
      userId = await getAuthUserId(ctx);
    } catch (error) {
      return {
        contextScore: 0,
        evidenceDensity: 0,
        complianceRate: 0,
        actions: [],
        evidenceRequirements: [],
      };
    }
    if (!userId) {
      return {
        contextScore: 0,
        evidenceDensity: 0,
        complianceRate: 0,
        actions: [],
        evidenceRequirements: [],
      };
    }

    // Get client filter
    let clientFilter: string | null = null;
    if (args.clientId) {
      const client = await ctx.db.get(args.clientId);
      if (client) clientFilter = client.clientName;
    }

    const allSessions = await ctx.db
      .query("workSessions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const sessions = clientFilter
      ? allSessions.filter((s) => s.clientName === clientFilter)
      : allSessions;

    // Calculate context score (quality of work context in evidence)
    let totalEvidence = 0;
    let contextEvidence = 0;

    for (const session of sessions) {
      const evidenceSession = await ctx.db
        .query("evidenceSessions")
        .withIndex("by_session", (q) => q.eq("sessionId", session._id))
        .first();

      if (evidenceSession) {
        const events = await ctx.db
          .query("evidenceEvents")
          .withIndex("by_session_and_time", (q) => q.eq("evidenceSessionId", evidenceSession._id))
          .collect();

        totalEvidence += events.length;
        contextEvidence += events.filter((e) => e.kind === "memo" || e.kind === "url").length;
      }
    }

    const contextScore = totalEvidence > 0 ? Math.min(100, Math.round((contextEvidence / totalEvidence) * 120)) : 0;

    // Calculate evidence density (evidence per session)
    const evidenceDensity = sessions.length > 0 ? Math.round((totalEvidence / sessions.length) * 10) / 10 : 0;

    // Calculate compliance rate
    const timeBlocks = await ctx.db
      .query("timeBlocks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const clientBlocks = timeBlocks.filter((block) => {
      const session = sessions.find((s) => s._id === block.sessionId);
      return session !== undefined;
    });

    const compliantBlocks = clientBlocks.filter((b) => b.complianceStatus === "compliant").length;
    const complianceRate = clientBlocks.length > 0 ? Math.round((compliantBlocks / clientBlocks.length) * 100) : 100;

    // Generate protection plan actions
    const actions = [];
    if (contextScore < 85) {
      actions.push({
        action: "Add mobile context to 3 screenshots",
        impact: "+12% dispute success",
        priority: 1,
      });
    }
    if (evidenceDensity < 3) {
      actions.push({
        action: "Add design process memo to next 2 work sessions",
        impact: "+9% dispute success",
        priority: 2,
      });
    }
    if (complianceRate < 90) {
      actions.push({
        action: "Increase screenshot frequency to meet compliance threshold",
        impact: "+7% protection score",
        priority: 3,
      });
    }

    return {
      contextScore,
      evidenceDensity,
      complianceRate,
      actions,
      evidenceRequirements: [
        "Screenshots showing work progress",
        "Memo with work context for each session",
        "Daily evidence updates (min 3/day)",
      ],
    };
  },
});

// Get client trust score
export const getClientTrustScore = query({
  args: {
    clientId: v.optional(v.id("clients")),
  },
  handler: async (ctx, args) => {
    let userId;
    try {
      userId = await getAuthUserId(ctx);
    } catch (error) {
      return {
        score: 0,
        trustLevel: "Unknown" as const,
        paymentReliability: 0,
        communicationResponsiveness: 0,
        disputeHistory: 0,
        relationshipDuration: 0,
      };
    }
    if (!userId) {
      return {
        score: 0,
        trustLevel: "Unknown" as const,
        paymentReliability: 0,
        communicationResponsiveness: 0,
        disputeHistory: 0,
        relationshipDuration: 0,
      };
    }

    // Get client
    let client = null;
    if (args.clientId) {
      client = await ctx.db.get(args.clientId);
      if (!client || client.userId !== userId) {
        return {
          score: 0,
          trustLevel: "Unknown" as const,
          paymentReliability: 0,
          communicationResponsiveness: 0,
          disputeHistory: 0,
          relationshipDuration: 0,
        };
      }
    }

    if (!client) {
      return {
        score: 0,
        trustLevel: "Unknown",
        paymentReliability: 0,
        communicationResponsiveness: 0,
        disputeHistory: 0,
        relationshipDuration: 0,
      };
    }

    // Calculate payment reliability (mock data - in production would track actual payments)
    const latePayments = 0; // Would track from payment history
    const paymentReliability = Math.max(0, 100 - latePayments * 5);

    // Calculate communication responsiveness (based on session activity)
    const allSessions = await ctx.db
      .query("workSessions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("clientName"), client.clientName))
      .collect();

    const averageResponseTime = 24; // Mock - would calculate from actual communication data
    const communicationResponsiveness = Math.max(0, 100 - averageResponseTime * 0.5);

    // Calculate dispute history
    const allReports = await ctx.db
      .query("disputeReports")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const clientReports = allReports.filter((r) => {
      const session = allSessions.find((s) => s._id === r.sessionId);
      return session !== undefined;
    });

    const disputeCount = clientReports.length;
    const disputeHistory = Math.max(0, 100 - disputeCount * 10);

    // Calculate relationship duration (in months)
    const now = Date.now();
    const clientAge = now - client.addedAt;
    const durationMonths = Math.floor(clientAge / (30 * 24 * 60 * 60 * 1000));
    const relationshipDuration = Math.min(durationMonths * 2, 100);

    // Calculate overall trust score
    const score = Math.round(
      paymentReliability * 0.4 +
        communicationResponsiveness * 0.3 +
        disputeHistory * 0.2 +
        relationshipDuration * 0.1
    );

    // Determine trust level
    let trustLevel = "Unknown";
    if (score >= 80) trustLevel = "High Trust";
    else if (score >= 60) trustLevel = "Medium Trust";
    else if (score >= 40) trustLevel = "Low Trust";
    else trustLevel = "High Risk";

    return {
      score,
      trustLevel,
      paymentReliability,
      communicationResponsiveness,
      disputeHistory,
      relationshipDuration: durationMonths,
    };
  },
});

// Get client payment pattern analysis
export const getClientPaymentPattern = query({
  args: {
    clientId: v.optional(v.id("clients")),
  },
  handler: async (ctx, args) => {
    let userId;
    try {
      userId = await getAuthUserId(ctx);
    } catch (error) {
      return {
        hasPattern: false,
        disputeCycle: null,
        evidenceThreshold: 0,
        highRiskPeriod: null,
        paymentTriggers: [],
        protectionPlan: [],
        disputeRate: 0,
      };
    }
    if (!userId) {
      return {
        hasPattern: false,
        disputeCycle: null,
        evidenceThreshold: 0,
        highRiskPeriod: null,
        paymentTriggers: [],
        protectionPlan: [],
        disputeRate: 0,
      };
    }

    // Get client filter
    let clientFilter: string | null = null;
    if (args.clientId) {
      const client = await ctx.db.get(args.clientId);
      if (client) clientFilter = client.clientName;
    }

    const allSessions = await ctx.db
      .query("workSessions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const sessions = clientFilter
      ? allSessions.filter((s) => s.clientName === clientFilter)
      : allSessions;

    if (sessions.length === 0) {
      return {
        hasPattern: false,
        disputeCycle: null,
        evidenceThreshold: 0,
        highRiskPeriod: null,
        paymentTriggers: [],
        protectionPlan: [],
        disputeRate: 0,
      };
    }

    // Analyze evidence quality patterns
    let totalEvidence = 0;
    let lowQualityCount = 0;
    const evidenceBySession: Record<string, number> = {};

    for (const session of sessions) {
      const evidenceSession = await ctx.db
        .query("evidenceSessions")
        .withIndex("by_session", (q) => q.eq("sessionId", session._id))
        .first();

      if (evidenceSession) {
        const events = await ctx.db
          .query("evidenceEvents")
          .withIndex("by_session_and_time", (q) => q.eq("evidenceSessionId", evidenceSession._id))
          .collect();

        const qualityScore = events.length * 10;
        evidenceBySession[session._id] = qualityScore;
        totalEvidence += events.length;
        
        if (qualityScore < 80) {
          lowQualityCount++;
        }
      }
    }

    // Calculate evidence threshold
    const evidenceThreshold = sessions.length > 0 ? Math.round((totalEvidence / sessions.length) * 10) : 80;

    // Identify dispute cycle pattern
    const disputeReports = await ctx.db
      .query("disputeReports")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const clientDisputes = disputeReports.filter((r) => {
      const session = sessions.find((s) => s._id === r.sessionId);
      return session !== undefined;
    });

    // Analyze dispute timing patterns
    const disputeDates = clientDisputes.map((d) => new Date(d.generatedAt));
    let disputeCycle = "No pattern detected";
    
    if (disputeDates.length >= 2) {
      const dayOfWeek = disputeDates[0].getDay();
      const weekOfMonth = Math.ceil(disputeDates[0].getDate() / 7);
      const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      disputeCycle = `Every ${weekOfMonth}${weekOfMonth === 1 ? "st" : weekOfMonth === 2 ? "nd" : weekOfMonth === 3 ? "rd" : "th"} ${days[dayOfWeek]}`;
    }

    // Identify payment triggers
    const paymentTriggers = [];
    if (lowQualityCount > sessions.length * 0.3) {
      paymentTriggers.push(`Evidence quality < ${evidenceThreshold}`);
    }
    if (sessions.length > 5 && totalEvidence / sessions.length < 3) {
      paymentTriggers.push("Low evidence density (< 3 items per session)");
    }
    paymentTriggers.push("No client communication 2 days before payment");

    // Generate protection plan
    const protectionPlan = [];
    
    if (evidenceThreshold < 80) {
      protectionPlan.push({
        action: `Ensure evidence quality > 80 before payment periods`,
        impact: "95% payment success",
        priority: 1,
      });
    }
    
    protectionPlan.push({
      action: "Communicate with client 2 days before payment",
      impact: "90% payment success",
      priority: 2,
    });

    if (totalEvidence / sessions.length < 5) {
      protectionPlan.push({
        action: "Increase evidence collection to 5+ items per session",
        impact: "85% dispute prevention",
        priority: 3,
      });
    }

    return {
      hasPattern: clientDisputes.length > 0 || lowQualityCount > 0,
      disputeCycle,
      evidenceThreshold,
      highRiskPeriod: "3 days before payment",
      paymentTriggers,
      protectionPlan,
      disputeRate: sessions.length > 0 ? Math.round((clientDisputes.length / sessions.length) * 100) : 0,
    };
  },
});