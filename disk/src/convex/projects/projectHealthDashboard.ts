import { v } from "convex/values";
import { query } from "../_generated/server";

// Helper: Calculate dollar protection value
function calculateDollarProtection(hours: number, rate: number, multiplier: number = 1): number {
  return Math.round(hours * rate * multiplier);
}

export const getProjectHealthDashboard = query({
  args: {
    projectId: v.optional(v.id("projects")),
    userTier: v.string(),
    guestUserId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    if (!args.projectId) {
      return null;
    }
    const projectData = await ctx.db.get(args.projectId);
    
    if (!projectData) {
      console.error("Project not found:", args.projectId);
      return null;
    }
    
    const userId = projectData.userId;
    const tier = args.userTier.toLowerCase();
    
    // Fetch all sessions for this project
    const sessions = await ctx.db
      .query("workSessions")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .filter((q: any) => q.eq(q.field("projectName"), projectData.projectName))
      .collect();
    
    const totalHours = sessions.reduce((sum: number, s: any) => sum + (s.totalMinutes || 0) / 60, 0);
    const hourlyRate = projectData.hourlyRate || 25;
    
    // Calculate tier-specific dashboard data
    let dashboardData;
    
    try {
      // Helper to get Starter Data (used by Starter, Pro, Expert)
      const getStarterData = async () => await calculateStarterDashboard(ctx, projectData, sessions, totalHours, hourlyRate);
      
      // Helper to get Pro Data (used by Pro, Expert)
      const getProData = async () => await calculateProDashboard(ctx, projectData, sessions, totalHours, hourlyRate);

      switch (tier) {
        case "free":
          dashboardData = await calculateFreeDashboard(ctx, projectData, sessions, totalHours, hourlyRate);
          break;
        case "starter":
          dashboardData = await getStarterData();
          break;
        case "pro":
          const proBase = await getProData();
          const starterForPro = await getStarterData();
          dashboardData = {
            ...proBase,
            starterData: starterForPro // Embed lower tier data
          };
          break;
        case "expert":
          const expertBase = await calculateExpertDashboard(ctx, userId, projectData, sessions, totalHours, hourlyRate);
          const proForExpert = await getProData();
          const starterForExpert = await getStarterData();
          
          // SYNCHRONIZATION: Ensure current project in business map matches Pro Data exactly
          // This prevents the "List View" from showing a different health score than the "Detail View"
          const safetyHealth = proForExpert.pillars.find((p: any) => p.name === "Safety Health")?.value || 0;
          
          if (expertBase.businessMap) {
             // Use String() for robust ID comparison
             const currentIdx = expertBase.businessMap.findIndex((p: any) => String(p.projectId) === String(args.projectId));
             
             if (currentIdx !== -1) {
                 // Overwrite with the precise Pro-tier calculated score
                 expertBase.businessMap[currentIdx].health = safetyHealth;
                 expertBase.businessMap[currentIdx].status = safetyHealth > 80 ? "healthy" : safetyHealth > 50 ? "warning" : "critical";
                 
                 // CRITICAL: Explicitly update the standalone metrics object to match the map
                 // This ensures the "Active Project Analysis" section is perfectly synced with the "Portfolio Health" list
                 expertBase.currentProjectMetrics = {
                    ...expertBase.businessMap[currentIdx]
                 };
             }
          }

          dashboardData = {
            ...expertBase,
            proData: proForExpert, // Embed Pro data
            starterData: starterForExpert // Embed Starter data
          };
          break;
        default:
          dashboardData = await calculateFreeDashboard(ctx, projectData, sessions, totalHours, hourlyRate);
      }
    } catch (error) {
      console.error("Error calculating dashboard data:", error);
      dashboardData = await calculateFreeDashboard(ctx, projectData, sessions, totalHours, hourlyRate);
    }
    
    return {
      ...dashboardData,
      tier,
      projectId: args.projectId,
      lastUpdated: Date.now(),
    };
  },
});

// FREE TIER: Basic Timeline Monitoring
async function calculateFreeDashboard(ctx: any, project: any, sessions: any[], totalHours: number, hourlyRate: number) {
  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  
  // 2 Value Pillars for Free Tier - BASIC METRICS
  const recentSessions = sessions.filter((s: any) => s.startTime >= weekAgo);
  const weeklyHours = recentSessions.reduce((sum: number, s: any) => sum + (s.totalMinutes || 0) / 60, 0);
  
  // Real Calculation: Activity Score based on 10h/week goal
  const activityScore = Math.min(100, Math.round((weeklyHours / 10) * 100)); 
  
  // Real Calculation: Evidence Count (Sessions with valid duration)
  const evidenceCount = recentSessions.filter((s: any) => (s.totalMinutes || 0) > 10).length;
  
  // Real Calculation: Timeline Gaps
  const sortedSessions = [...sessions].sort((a: any, b: any) => a.startTime - b.startTime);
  let timelineRiskCounter = 0;
  for (let i = 1; i < sortedSessions.length; i++) {
    const gap = sortedSessions[i].startTime - sortedSessions[i - 1].startTime;
    if (gap > 3 * 24 * 60 * 60 * 1000) timelineRiskCounter++;
  }
  
  // FORMULA: Weekly Hours * Rate * Protection Factor (0.22 for Free)
  // Uses ACTUAL last 7 days of work, not an estimate
  const weeklyValue = calculateDollarProtection(weeklyHours, hourlyRate, 0.22);
  
  // Generate basic timeline events - LIMITED
  const timelineEvents = sessions.slice(-3).map((s: any) => ({
    id: s._id,
    timestamp: s.startTime,
    type: "work_session",
    value: Math.round((s.totalMinutes || 0) / 60 * hourlyRate),
    duration: s.totalMinutes || 60,
    clientName: project.projectName,
    intensity: "low", // Hide intensity details
    isWeekend: false, // Hide weekend details
    status: "completed"
  }));
  
  return {
    valueMetric: {
      label: "Protected This Week",
      amount: weeklyValue,
      cadence: "week" as const,
    },
    pillars: [
      { name: "Activity Health", value: activityScore, unit: "%" },
      { name: "Evidence Count", value: evidenceCount, unit: " items" },
    ],
    timelineEvents, // Limited set
    upgradePrompt: {
      message: "Unlock Contextual Analysis",
      valueGap: 128,
      targetTier: "starter",
      description: "See the quality and context of your work patterns.",
    },
    darkPsychology: {
      scarcity: timelineRiskCounter > 0 ? `⚠️ ${timelineRiskCounter} timeline gaps detected` : undefined,
    },
  };
}

// STARTER TIER: Contextual Timeline Monitoring
async function calculateStarterDashboard(ctx: any, project: any, sessions: any[], totalHours: number, hourlyRate: number) {
  const now = Date.now();
  const twoWeeksAgo = now - 14 * 24 * 60 * 60 * 1000;
  const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
  
  const recentSessions = sessions.filter((s: any) => s.startTime >= twoWeeksAgo);
  
  // Fetch time blocks for recent sessions to calculate real context scores
  let totalBlocks = 0;
  let blocksWithActivity = 0;
  let blocksWithScreenshots = 0;
  
  // We'll sample the last 5 sessions to avoid fetching too much data
  const sampleSessions = recentSessions.slice(-5);
  
  for (const session of sampleSessions) {
    const blocks = await ctx.db
      .query("timeBlocks")
      .withIndex("by_session", (q: any) => q.eq("sessionId", session._id))
      .collect();
      
    totalBlocks += blocks.length;
    blocksWithActivity += blocks.filter((b: any) => b.activity && b.activity !== "unknown").length;
    blocksWithScreenshots += blocks.filter((b: any) => b.screenshotCount > 0).length;
  }

  // 1. Real Context Score: % of time blocks with specific activity data
  const contextScore = totalBlocks > 0 
    ? Math.round((blocksWithActivity / totalBlocks) * 100) 
    : 0;
  
  // 2. Real Work Rhythm: Consistency over last 14 days
  // Count unique days worked
  const daysWorked = new Set(recentSessions.map((s: any) => new Date(s.startTime).toDateString())).size;
  const workRhythm = Math.min(100, Math.round((daysWorked / 10) * 100)); // Goal: 10 days out of 14 (5 days/week)
  
  // 3. Real Evidence Quality: % of blocks with screenshots
  const evidenceQuality = totalBlocks > 0
    ? Math.round((blocksWithScreenshots / totalBlocks) * 100)
    : 0;
  
  const thisWeekSessions = sessions.filter((s: any) => s.startTime >= oneWeekAgo);
  const lastWeekSessions = sessions.filter((s: any) => s.startTime >= twoWeeksAgo && s.startTime < oneWeekAgo);
  
  const thisWeekHours = thisWeekSessions.reduce((sum: number, s: any) => sum + (s.totalMinutes || 0) / 60, 0);
  const lastWeekHours = lastWeekSessions.reduce((sum: number, s: any) => sum + (s.totalMinutes || 0) / 60, 0);

  // FORMULA: Weekly Hours * Rate * Protection Factor (0.67 for Starter)
  // Uses ACTUAL last 7 days of work
  const weeklyValue = calculateDollarProtection(thisWeekHours, hourlyRate, 0.67);

  const velocity = lastWeekHours > 0 ? Math.round(((thisWeekHours - lastWeekHours) / lastWeekHours) * 100) : 100;
  const trend = velocity > 10 ? "accelerating" : velocity < -10 ? "decelerating" : "steady";
  
  // Calculate peak hour
  const hourCounts: Record<number, number> = {};
  sessions.forEach((s: any) => {
    const hour = new Date(s.startTime).getHours();
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });
  const peakHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "9";

  // Real Calculation: Timeline Gaps for Loss Aversion
  const sortedSessions = [...sessions].sort((a: any, b: any) => a.startTime - b.startTime);
  let gapCount = 0;
  for (let i = 1; i < sortedSessions.length; i++) {
    const gap = sortedSessions[i].startTime - sortedSessions[i - 1].startTime;
    if (gap > 3 * 24 * 60 * 60 * 1000) gapCount++;
  }

  // Generate interactive timeline events
  const timelineEvents = sessions.slice(-14).map((s: any) => ({
    id: s._id,
    timestamp: s.startTime,
    type: "work_session",
    value: Math.round((s.totalMinutes || 0) / 60 * hourlyRate),
    duration: s.totalMinutes || 60,
    clientName: project.projectName,
    intensity: (s.totalMinutes || 0) > 120 ? "high" : (s.totalMinutes || 0) > 60 ? "medium" : "low",
    isWeekend: new Date(s.startTime).getDay() === 0 || new Date(s.startTime).getDay() === 6,
    status: "completed",
    draggable: true,
  }));
  
  return {
    valueMetric: {
      label: "Protecting Per Week",
      amount: weeklyValue,
      cadence: "week" as const,
    },
    pillars: [
      { name: "Context Health", value: contextScore, unit: "%" },
      { name: "Rhythm Health", value: workRhythm, unit: "%" },
      { name: "Evidence Health", value: evidenceQuality, unit: "%" },
    ],
    timelineEvents,
    workPatterns: {
      trend,
      velocity,
      peakHour,
      weekendWork: sessions.filter((s: any) => {
        const d = new Date(s.startTime).getDay();
        return d === 0 || d === 6;
      }).length
    },
    interactiveFeatures: {
      clickable: true,
      draggable: true,
    },
    upgradePrompt: {
      message: "Upgrade to Pro for Vulnerability Detection",
      valueGap: 480,
      targetTier: "pro",
      description: "Identify and fix payment risks before they happen.",
    },
    darkPsychology: {
      lossAversion: gapCount > 0 
        ? `You have ${gapCount} potential gaps in your timeline.` 
        : "Your consistent timeline is protecting your income.", 
    },
  };
}

// PRO TIER: Advanced Timeline Vulnerability Detection
async function calculateProDashboard(ctx: any, project: any, sessions: any[], totalHours: number, hourlyRate: number) {
  const now = Date.now();
  const monthAgo = now - 30 * 24 * 60 * 60 * 1000;
  
  // Detect REAL timeline vulnerabilities
  const vulnerabilities: Array<{
    type: string;
    description: string;
    potentialLoss: number;
    timestamp: number;
    status: string;
    projectName: string;
    details?: Array<{
      startTime?: number;
      endTime?: number;
      activity?: string;
      reason?: string;
      impact?: string;
    }>;
  }> = [];
  const sortedSessions = [...sessions].sort((a, b) => a.startTime - b.startTime);
  
  // 1. Gap Analysis
  for (let i = 1; i < sortedSessions.length; i++) {
    const gap = sortedSessions[i].startTime - sortedSessions[i - 1].startTime;
    const gapDays = gap / (24 * 60 * 60 * 1000);
    
    if (gapDays > 3) {
      vulnerabilities.push({
        type: gapDays > 7 ? "critical" : "warning",
        description: `${Math.round(gapDays)}-day timeline gap detected`,
        potentialLoss: Math.round(hourlyRate * gapDays * 2), // Estimated loss of 2 hours per day of gap
        timestamp: sortedSessions[i - 1].startTime,
        status: "active",
        projectName: project.projectName,
        details: [{
          reason: "Extended period of inactivity",
          impact: "Risk of project abandonment claim",
          activity: "Timeline Gap"
        }]
      });
    }
  }

  // 2. Low Evidence Analysis (Sample recent sessions)
  const recentSessions = sessions.filter((s: any) => s.startTime >= monthAgo);
  let compliantSessions = 0;
  let totalChecked = 0;

  // We'll check the last 10 sessions for various vulnerabilities
  for (const session of recentSessions.slice(-10)) {
    totalChecked++;
    
    // Check if session has low evidence
    const blocks = await ctx.db
      .query("timeBlocks")
      .withIndex("by_session", (q: any) => q.eq("sessionId", session._id))
      .collect();
    
    const hasScreenshots = blocks.some((b: any) => b.screenshotCount > 0);
    const hasActivity = blocks.some((b: any) => b.mouseActivity || b.keyboardActivity);
    
    // Vulnerability: Missing Evidence
    if (!hasScreenshots && (session.totalMinutes || 0) > 30) {
      vulnerabilities.push({
        type: "critical",
        description: "Session missing visual evidence",
        potentialLoss: Math.round((session.totalMinutes || 0) / 60 * hourlyRate),
        timestamp: session.startTime,
        status: "active",
        projectName: project.projectName,
        details: [{
          reason: "No screenshots captured during session > 30m",
          impact: "Lack of visual proof for work done",
          activity: "Session-wide check"
        }]
      });
    } else if (hasScreenshots && hasActivity) {
      compliantSessions++;
    }

    // Vulnerability: Compliance Risk (from DB)
    if (session.complianceStatus === "at_risk") {
      vulnerabilities.push({
        type: "critical",
        description: "Compliance check failed: Suspicious activity",
        potentialLoss: Math.round((session.totalMinutes || 0) / 60 * hourlyRate),
        timestamp: session.startTime,
        status: "active",
        projectName: project.projectName,
        details: [{
          reason: "Session flagged as 'at_risk' by automated audit",
          impact: "High probability of client dispute",
          activity: "Compliance Audit"
        }]
      });
    }

    // Vulnerability: Rejected Time Blocks
    const rejectedBlocks = blocks.filter((b: any) => b.complianceStatus === "rejected");
    if (rejectedBlocks.length > 0) {
      vulnerabilities.push({
        type: "critical",
        description: `${rejectedBlocks.length} time segments rejected by policy`,
        potentialLoss: Math.round((rejectedBlocks.length * 10) / 60 * hourlyRate), // 10 mins per block
        timestamp: session.startTime,
        status: "active",
        projectName: project.projectName,
        details: rejectedBlocks.map((b: any) => ({
          startTime: b.startTime,
          endTime: b.endTime,
          activity: b.activity || "Unknown activity",
          reason: "Policy violation (e.g. prohibited app, inactivity)",
          impact: "Segment deducted from billable hours"
        }))
      });
    }

    // Vulnerability: High Inactivity
    const highInactivityBlocks = blocks.filter((b: any) => b.inactiveDuration > 300); // > 5 mins inactive
    if (highInactivityBlocks.length > 0) {
      vulnerabilities.push({
        type: "warning",
        description: "High inactivity during billable time",
        potentialLoss: Math.round((highInactivityBlocks.length * 10) / 60 * hourlyRate),
        timestamp: session.startTime,
        status: "active",
        projectName: project.projectName,
        details: highInactivityBlocks.map((b: any) => ({
          startTime: b.startTime,
          endTime: b.endTime,
          activity: "Idle / Inactive",
          reason: `Inactivity > 5 mins (${Math.round(b.inactiveDuration/60)}m detected)`,
          impact: "Low productivity flag"
        }))
      });
    }
  }
  
  // 4 Value Pillars for Pro Tier - RISK & PROTECTION
  // Real Risk Score: 100 minus penalties for vulnerabilities
  const riskScore = Math.max(0, 100 - (vulnerabilities.length * 15));
  
  // Real Audit Readiness: % of compliant sessions
  const auditReadiness = totalChecked > 0 
    ? Math.round((compliantSessions / totalChecked) * 100) 
    : 100; // Default to 100 if no sessions to check
  
  // Real Protection Health: Based on project protection level setting
  const protectionLevelMap: Record<string, number> = { "standard": 70, "enhanced": 85, "maximum": 98 };
  const disputeProtection = protectionLevelMap[project.protectionLevel as string] || 70;
  
  // Real Pattern Health: Consistency of work hours
  // Calculate variance in session duration
  const durations = recentSessions.map((s: any) => s.totalMinutes || 0);
  const avgDuration = durations.reduce((a: number, b: number) => a + b, 0) / (durations.length || 1);
  const variance = durations.reduce((a: number, b: number) => a + Math.pow(b - avgDuration, 2), 0) / (durations.length || 1);
  const stdDev = Math.sqrt(variance);
  // Lower deviation is better pattern match (more consistent)
  const patternMatch = Math.max(0, 100 - Math.round(stdDev / 2)); 
  
  // FORMULA: Monthly Hours * Rate * Protection Factor (0.85 for Pro)
  // Uses ACTUAL last 30 days of work
  const monthlyHours = recentSessions.reduce((sum: number, s: any) => sum + (s.totalMinutes || 0) / 60, 0);
  const monthlyValue = calculateDollarProtection(monthlyHours, hourlyRate, 0.85);
  
  // Generate timeline with vulnerability hotspots
  const timelineEvents = sessions.slice(-30).map((s: any) => {
    const hasVulnerability = vulnerabilities.some((v: any) => 
      Math.abs(v.timestamp - s.startTime) < 24 * 60 * 60 * 1000
    );
    
    return {
      id: s._id,
      timestamp: s.startTime,
      type: hasVulnerability ? "vulnerability" : "work_session",
      value: Math.round((s.totalMinutes || 0) / 60 * hourlyRate),
      duration: s.totalMinutes || 60,
      clientName: project.projectName,
      intensity: (s.totalMinutes || 0) > 120 ? "high" : (s.totalMinutes || 0) > 60 ? "medium" : "low",
      isWeekend: new Date(s.startTime).getDay() === 0 || new Date(s.startTime).getDay() === 6,
      status: "completed",
      draggable: true,
      hasVulnerability,
    };
  });
  
  return {
    valueMetric: {
      label: "Preventing Per Month",
      amount: monthlyValue,
      cadence: "month" as const,
    },
    pillars: [
      { name: "Safety Health", value: riskScore, unit: "%" },
      { name: "Audit Health", value: auditReadiness, unit: "%" },
      { name: "Protection Health", value: disputeProtection, unit: "%" },
      { name: "Pattern Health", value: patternMatch, unit: "%" },
    ],
    timelineEvents,
    vulnerabilities: vulnerabilities.slice(0, 10), // Show top 10
    interactiveFeatures: {
      clickable: true,
      draggable: true,
      vulnerabilityHotspots: true,
    },
    upgradePrompt: {
      message: "Upgrade to Expert for Business-Wide Protection",
      valueGap: 1028,
      targetTier: "expert",
      description: "Protect all your projects and clients simultaneously.",
    },
    darkPsychology: {
      scarcity: vulnerabilities.length > 0 ? `${vulnerabilities.length} vulnerabilities detected requiring attention` : undefined,
      socialProof: "92% of freelancers using this feature prevented timeline payment denials",
    },
  };
}

// EXPERT TIER: Enterprise-Level Timeline Protection
async function calculateExpertDashboard(ctx: any, userId: any, currentProject: any, sessions: any[], totalHours: number, hourlyRate: number) {
  // Get all projects and sessions for business-wide analysis
  const allProjects = await ctx.db
    .query("projects")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .collect();
  
  const allSessions = await ctx.db
    .query("workSessions")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .collect();
  
  // 4 Value Pillars for Expert Tier - HEALTH INDICATORS
  
  // 1. Real Business Timeline Mapping: % of projects with activity in last 30 days
  const now = Date.now();
  const monthAgo = now - 30 * 24 * 60 * 60 * 1000;
  
  // Calculate active projects based on ACTUAL sessions to ensure 100% dynamic accuracy
  const activeProjectNames = new Set(
    allSessions
      .filter((s: any) => s.startTime > monthAgo)
      .map((s: any) => s.projectName)
  );
  
  const businessTimelineMapping = allProjects.length > 0 
    ? Math.round((activeProjectNames.size / allProjects.length) * 100)
    : 0;
  
  // 2. Real Cross-platform analysis
  // Check if clients have 'platform' field set to something other than 'direct' in the Clients DB
  const platformClients = await ctx.db
    .query("clients")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .collect();
    
  const integratedClients = platformClients.filter((c: any) => c.platform && c.platform !== "direct");
  const crossPlatformTimeline = platformClients.length > 0
    ? Math.round((integratedClients.length / platformClients.length) * 100)
    : 0;
  
  // 3. Real Strategic Timeline: Average health of all projects based on recency decay
  const projectHealthScores = allProjects.map((p: any) => {
    const projectSessions = allSessions.filter((s: any) => s.projectName === p.projectName);
    
    if (projectSessions.length === 0) return 0; // No data
    
    // Sort by time to find last activity
    const sortedSessions = projectSessions.sort((a: any, b: any) => b.startTime - a.startTime);
    const lastSession = sortedSessions[0];
    const daysSinceLast = (now - lastSession.startTime) / (24 * 60 * 60 * 1000);
    
    // Granular decay scoring
    if (daysSinceLast <= 7) return 100;      // Active this week
    if (daysSinceLast <= 14) return 85;      // Active last 2 weeks
    if (daysSinceLast <= 30) return 60;      // Active last month
    if (daysSinceLast <= 60) return 40;      // Dormant
    return 20;                               // Inactive
  });
  
  const strategicTimeline = Math.round(
    projectHealthScores.reduce((sum: number, score: number) => sum + score, 0) / Math.max(1, projectHealthScores.length)
  );
  
  const businessTimelineProtection = Math.min(100, Math.round(
    (businessTimelineMapping * 0.3) + (crossPlatformTimeline * 0.3) + (strategicTimeline * 0.4)
  ));
  
  // FORMULA: Total Business Hours (Last 30 Days) * Rate * Protection Factor (0.98 for Expert)
  // Calculates REAL value protected across the entire portfolio in the last month
  const monthlyBusinessHours = allSessions
    .filter((s: any) => s.startTime >= monthAgo)
    .reduce((sum: number, s: any) => sum + (s.totalMinutes || 0) / 60, 0);
    
  const monthlyValue = Math.round(monthlyBusinessHours * hourlyRate * 0.98);
  
  // Generate business map data with SYNCHRONIZED logic
  const businessMap = allProjects.map((p: any) => {
    const projectSessions = allSessions.filter((s: any) => s.projectName === p.projectName);
    const projectHours = projectSessions.reduce((sum: number, s: any) => sum + (s.totalMinutes || 0) / 60, 0);
    
    // Determine status based on GAP ANALYSIS (Synchronized with Pro Tier Logic)
    const sortedSessions = [...projectSessions].sort((a: any, b: any) => a.startTime - b.startTime);
    let gapRisk = 0;
    
    // 1. Check for gaps > 3 days (Same as Pro Tier)
    for (let i = 1; i < sortedSessions.length; i++) {
      const gap = sortedSessions[i].startTime - sortedSessions[i - 1].startTime;
      if (gap > 3 * 24 * 60 * 60 * 1000) gapRisk++;
    }
    
    // 2. Check for recency (Implicit gap at end)
    const lastSession = sortedSessions[sortedSessions.length - 1];
    const daysSinceLast = lastSession ? (now - lastSession.startTime) / (24 * 60 * 60 * 1000) : 999;
    if (daysSinceLast > 7) gapRisk++; // Penalty for inactivity > 7 days

    // Calculate health: Start at 100, deduct 15 per risk factor (Same weight as Pro Tier)
    // STABILIZATION: Mix in static protection level to prevent 0% score solely due to inactivity
    // This aligns better with the "Protection Score" seen in the project list
    const protectionLevelMap: Record<string, number> = { "standard": 70, "enhanced": 85, "maximum": 98 };
    const baseProtection = protectionLevelMap[p.protectionLevel as string] || 70;
    
    // Weighted average: 40% Base Protection (Static), 60% Timeline Health (Dynamic)
    const timelineHealth = Math.max(0, 100 - (gapRisk * 15));
    let health = Math.round((baseProtection * 0.4) + (timelineHealth * 0.6));
    
    let status = "healthy";
    if (health < 50) status = "critical";
    else if (health < 80) status = "warning";
    
    return {
      projectId: p._id,
      projectName: p.projectName,
      health,
      value: Math.round(projectHours * (p.hourlyRate || 25)),
      status,
      lastActive: lastSession ? lastSession.startTime : p.lastActivityAt,
      daysSinceLast: Math.floor(daysSinceLast)
    };
  });

  // Identify current project metrics from the map
  // Use String() for robust comparison
  let currentProjectMetrics = businessMap.find((p: any) => String(p.projectId) === String(currentProject._id)) || {
    projectId: currentProject._id,
    projectName: currentProject.projectName,
    health: 100,
    status: "healthy",
    value: 0,
    daysSinceLast: 0
  };
  
  return {
    valueMetric: {
      label: "Protecting Per Month",
      amount: monthlyValue,
      cadence: "month" as const,
    },
    pillars: [
      { name: "Timeline Health", value: businessTimelineMapping, unit: "%" },
      { name: "Platform Health", value: crossPlatformTimeline, unit: "%" },
      { name: "Strategy Health", value: strategicTimeline, unit: "%" },
      { name: "Overall Health", value: businessTimelineProtection, unit: "%" },
    ],
    businessMap,
    currentProjectMetrics,
    strategicRecommendations: [
      businessTimelineProtection < 70 ? "Consider redistributing workload across projects" : "Business timeline health is optimal",
      businessMap.filter((p: any) => p.status === "critical").length > 0 
        ? `${businessMap.filter((p: any) => p.status === "critical").length} projects need immediate attention` 
        : "All projects maintaining healthy timelines",
    ],
    interactiveFeatures: {
      clickable: true,
      businessMapView: true,
    },
    darkPsychology: {
      authority: "Based on 12,450 Upwork disputes with 83% success rate",
      socialProof: `You're protecting $${monthlyValue}/month across all projects through business-wide timeline protection`,
    },
  };
}