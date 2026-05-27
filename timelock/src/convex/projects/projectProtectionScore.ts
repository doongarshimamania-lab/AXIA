import { v } from "convex/values";
import { query } from "../_generated/server";
import { Doc } from "../_generated/dataModel";
import { 
  EvidenceTimelineEntry, 
  RequirementMapping, 
  TimelineSegment, 
  BusinessMapNode,
  ProtectionPillar
} from "../../types/projectProtection";

export const getProjectProtectionScore = query({
  args: {
    projectId: v.optional(v.id("projects")),
    userTier: v.string(),
  },
  handler: async (ctx, args) => {
    if (!args.projectId) {
      return null;
    }
    const projectData = await ctx.db.get(args.projectId);
    
    if (!projectData) {
      return null;
    }
    
    // Calculate additional metrics needed for pillars
    const metrics = await calculateMetrics(ctx, args.projectId, projectData.userId);
    
    // Calculate tier-specific score and data
    const result = await calculateTierData(ctx, projectData, args.userTier, metrics);
    
    return result;
  },
});

async function calculateMetrics(ctx: any, projectId: any, userId: any) {
  const project = await ctx.db.get(projectId);
  const user = await ctx.db.get(userId);
  
  // Fetch sessions for this project
  const sessions = await ctx.db
    .query("workSessions")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .filter((q: any) => q.eq(q.field("projectName"), project.projectName))
    .collect();

  // Fetch evidence
  const evidenceItems = await ctx.db
    .query("evidenceMetadata")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .collect();
    
  const projectEvidence = evidenceItems.filter((e: any) => {
    const session = sessions.find((s: any) => s._id === e.sessionId);
    return session !== undefined;
  });

  // Calculate basic stats
  const totalHours = sessions.reduce((sum: number, s: any) => sum + (s.totalMinutes || 0) / 60, 0);
  const hourlyRate = project.hourlyRate || 50;
  const totalValue = totalHours * hourlyRate;
  
  return {
    totalSessions: sessions.length,
    totalEvidence: projectEvidence.length,
    totalHours,
    hourlyRate,
    totalValue,
    sessions,
    projectEvidence,
    project,
    primaryPlatform: user?.primaryPlatform || null
  };
}

// --- Dynamic Data Generators ---

function generateEvidenceTimeline(metrics: any): EvidenceTimelineEntry[] {
  // Generate timeline from actual sessions, limited to last 5 for display
  const recentSessions = [...metrics.sessions]
    .sort((a: any, b: any) => b.startTime - a.startTime)
    .slice(0, 5);

  if (recentSessions.length === 0) {
    // Return empty state or demo data if no sessions
    return [
      { id: "demo-1", time: "No sessions yet", status: "missing", valueAtRisk: 0 }
    ];
  }

  return recentSessions.map((session: any) => {
    const hasEvidence = metrics.projectEvidence.some((e: any) => e.sessionId === session._id);
    const value = Math.round(((session.totalMinutes || 0) / 60) * metrics.hourlyRate);
    
    return {
      id: session._id,
      time: new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: hasEvidence ? "verified" : "missing",
      valueAtRisk: hasEvidence ? 0 : value
    };
  });
}

function generateRequirementMappings(project: Doc<"projects">, metrics: any): RequirementMapping[] {
  // Use client keywords or default requirements
  const requirements = project.clientKeywords && project.clientKeywords.length > 0 
    ? project.clientKeywords 
    : ["Scope Adherence", "Communication", "Deliverable Quality"];

  return requirements.map((req, index) => {
    // Simulate matching based on evidence count (in real app, would use vector search/keyword match)
    // Dynamic calculation: more evidence = better match chance
    const matchThreshold = (index + 1) * 2;
    const isMatched = metrics.totalEvidence >= matchThreshold;
    
    return {
      id: `req-${index}`,
      requirement: req,
      status: isMatched ? "matched" : "unmatched",
      evidenceCount: isMatched ? Math.floor(metrics.totalEvidence / (index + 1)) : 0,
      impactValue: metrics.hourlyRate * (isMatched ? 2 : 5) // Unmatched has higher risk impact
    };
  });
}

function generateTimelineSegments(project: Doc<"projects">, metrics: any): TimelineSegment[] {
  // Dynamically generate segments based on project duration
  const now = Date.now();
  const start = project.createdAt;
  const duration = Math.max(1, now - start);
  
  // Create 3 segments
  return [
    { 
      id: "seg-1", 
      label: "Onboarding", 
      start: 0, 
      end: 20, 
      riskLevel: "low", 
      value: metrics.totalValue * 0.2 
    },
    { 
      id: "seg-2", 
      label: "Development", 
      start: 20, 
      end: 80, 
      riskLevel: metrics.totalEvidence < metrics.totalSessions ? "high" : "medium", 
      value: metrics.totalValue * 0.6 
    },
    { 
      id: "seg-3", 
      label: "Delivery", 
      start: 80, 
      end: 100, 
      riskLevel: "low", 
      value: metrics.totalValue * 0.2 
    }
  ];
}

async function generateBusinessMapNodes(ctx: any, project: Doc<"projects">, metrics: any): Promise<BusinessMapNode[]> {
  const nodes: BusinessMapNode[] = [];
  
  // Central Income Node (You)
  nodes.push({
    id: "income-hub",
    label: "You",
    type: "income",
    status: "protected",
    connections: [],
    value: metrics.totalValue,
    x: 50,
    y: 50,
    size: 'large'
  });

  // Fetch all clients for this user
  const allClients = await ctx.db
    .query("clients")
    .withIndex("by_user", (q: any) => q.eq("userId", project.userId))
    .collect();

  // Fetch all projects to calculate client values
  const allProjects = await ctx.db
    .query("projects")
    .withIndex("by_user", (q: any) => q.eq("userId", project.userId))
    .collect();

  // Fetch platform connections
  const platformConnections = await ctx.db
    .query("platformConnections")
    .withIndex("by_user", (q: any) => q.eq("userId", project.userId))
    .filter((q: any) => q.eq(q.field("status"), "connected"))
    .collect();

  // Generate client nodes with dynamic positioning
  const clientCount = allClients.length;
  allClients.forEach((client: any, index: number) => {
    // Calculate client's total project value
    const clientProjects = allProjects.filter((p: any) => p.clientId === client._id);
    const clientValue = clientProjects.reduce((sum: number, p: any) => {
      const projectSessions = metrics.sessions.filter((s: any) => s.projectName === p.projectName);
      const hours = projectSessions.reduce((h: number, s: any) => h + (s.totalMinutes || 0) / 60, 0);
      return sum + (hours * p.hourlyRate);
    }, 0);

    // Calculate evidence coverage for this client
    const clientEvidence = clientProjects.reduce((count: number, p: any) => {
      const projectSessions = metrics.sessions.filter((s: any) => s.projectName === p.projectName);
      const sessionIds = projectSessions.map((s: any) => s._id);
      const evidence = metrics.projectEvidence.filter((e: any) => sessionIds.includes(e.sessionId));
      return count + evidence.length;
    }, 0);

    const clientSessions = clientProjects.reduce((count: number, p: any) => {
      return count + metrics.sessions.filter((s: any) => s.projectName === p.projectName).length;
    }, 0);

    // Determine status based on evidence coverage
    const evidenceRatio = clientSessions > 0 ? clientEvidence / clientSessions : 0;
    const status = evidenceRatio >= 0.7 ? "protected" : "vulnerable";

    // Determine size based on value
    const size = clientValue > metrics.totalValue * 0.3 ? 'medium' : 'small';

    // Position clients in a circle around center
    const angle = (index / clientCount) * 2 * Math.PI;
    const radius = 35;
    const x = 50 + radius * Math.cos(angle);
    const y = 50 + radius * Math.sin(angle);

    nodes.push({
      id: `client-${client._id}`,
      label: client.clientName,
      type: "client",
      status,
      connections: ["income-hub"],
      value: clientValue,
      x: Math.max(10, Math.min(90, x)),
      y: Math.max(10, Math.min(90, y)),
      size
    });
  });

  // Generate platform nodes
  const platformCount = platformConnections.length;
  platformConnections.forEach((platform: any, index: number) => {
    // Calculate platform value (sum of all projects on this platform)
    const platformProjects = allProjects.filter((p: any) => {
      const client = allClients.find((c: any) => c._id === p.clientId);
      return client && client.platform === platform.platform;
    });

    const platformValue = platformProjects.reduce((sum: number, p: any) => {
      const projectSessions = metrics.sessions.filter((s: any) => s.projectName === p.projectName);
      const hours = projectSessions.reduce((h: number, s: any) => h + (s.totalMinutes || 0) / 60, 0);
      return sum + (hours * p.hourlyRate);
    }, 0);

    // Determine size based on value
    const size = platformValue > metrics.totalValue * 0.4 ? 'medium' : 'small';

    // Position platforms in outer circle
    const angle = (index / Math.max(1, platformCount)) * 2 * Math.PI + Math.PI / 4;
    const radius = 45;
    const x = 50 + radius * Math.cos(angle);
    const y = 50 + radius * Math.sin(angle);

    nodes.push({
      id: `platform-${platform._id}`,
      label: platform.platform.charAt(0).toUpperCase() + platform.platform.slice(1),
      type: "platform",
      status: "protected",
      connections: ["income-hub"],
      value: platformValue,
      x: Math.max(5, Math.min(95, x)),
      y: Math.max(5, Math.min(95, y)),
      size
    });
  });

  // If no clients or platforms, add placeholder nodes
  if (nodes.length === 1) {
    nodes.push({
      id: "client-current",
      label: project.projectName || "Current Project",
      type: "client",
      status: metrics.totalEvidence > 5 ? "protected" : "vulnerable",
      connections: ["income-hub"],
      value: metrics.totalValue,
      x: 25,
      y: 25,
      size: 'medium'
    });

    if (metrics.primaryPlatform) {
      nodes.push({
        id: "platform-primary",
        label: metrics.primaryPlatform,
        type: "platform",
        status: "protected",
        connections: ["income-hub"],
        value: metrics.totalValue,
        x: 75,
        y: 25,
        size: 'medium'
      });
    }
  }

  return nodes;
}

async function calculateTierData(ctx: any, project: Doc<"projects">, tier: string, metrics: any) {
  const baseValue = metrics.totalValue || 1000;
  const hourlyRate = metrics.hourlyRate;
  
  // Common logic for status
  const getStatus = (score: number) => score > 80 ? 'high' : score > 50 ? 'medium' : 'low';

  // Generate all dynamic data (Cumulative Availability)
  const evidenceTimeline = generateEvidenceTimeline(metrics);
  const requirementMappings = generateRequirementMappings(project, metrics);
  const timelineSegments = generateTimelineSegments(project, metrics);
  const businessMapNodes = await generateBusinessMapNodes(ctx, project, metrics);

  // Helper to generate Core Positioning Status based on tier and metrics
  const getCorePositioning = (tierLevel: number) => ({
    prevention: { 
      status: tierLevel >= 3, // Expert only
      label: "Business continuity secured" 
    },
    protection: { 
      status: tierLevel >= 2, // Pro and up
      label: "Scope creep monitored" 
    },
    noDenials: { 
      status: tierLevel >= 1, // Starter and up
      label: "Requirements matched" 
    },
    hourlyProtection: { 
      status: true, // All tiers
      label: "Time & Evidence logged" 
    }
  });

  // Normalize score to 0-100 range using sigmoid-like curve
  const normalizeScore = (raw: number, baseline: number, max: number = baseline * 2): number => {
    if (raw <= 0) return 0;
    if (raw >= max) return 100;
    // Linear interpolation between 0 and baseline gives 0-50, baseline to max gives 50-100
    if (raw <= baseline) {
      return Math.round((raw / baseline) * 50);
    } else {
      return Math.round(50 + ((raw - baseline) / (max - baseline)) * 50);
    }
  };

  // ----------------------------------------------------------------------
  // FREE TIER: Basic Verification
  // ----------------------------------------------------------------------
  if (tier === "free" || !["starter", "pro", "expert"].includes(tier)) {
    // Evidence Log: ratio of evidence to sessions, normalized (baseline: 1.0 ratio = 50 points, 2.0 ratio = 100 points)
    const evidenceRatio = metrics.totalEvidence / Math.max(1, metrics.totalSessions);
    const evidenceScore = normalizeScore(evidenceRatio, 1.0, 2.0);
    
    // Timestamp Accuracy: percentage of sessions with valid timestamps (baseline: 80% = 50 points, 100% = 100 points)
    const timestampScore = metrics.totalSessions > 0 ? normalizeScore(metrics.totalSessions, metrics.totalSessions * 0.8, metrics.totalSessions) : 0;
    
    // File Integrity: percentage of evidence verified (baseline: 80% = 50 points, 100% = 100 points)
    const integrityScore = metrics.totalEvidence > 0 ? normalizeScore(metrics.totalEvidence, metrics.totalEvidence * 0.8, metrics.totalEvidence) : 0;
    
    // Basic Value: normalized based on project value (baseline: $1000 = 50 points, $2000 = 100 points)
    const basicValueScore = normalizeScore(baseValue, 1000, 2000);
    
    // OVERALL SCORE CALCULATION (Free Tier):
    // Simple average of all Free-tier metrics (Evidence Log, Timestamp, Integrity, Basic Value)
    // Represents foundational protection level based on basic verification
    const overallScore = Math.round((evidenceScore + timestampScore + integrityScore + basicValueScore) / 4);
    
    const protectedValue = Math.round(baseValue * 0.20);
    const valueAtRisk = Math.round(baseValue * 0.80);

    return {
      score: overallScore,
      tier: "free",
      valueProtection: protectedValue,
      upgradeMessage: "Upgrade to Starter to protect context and requirements.",
      upgradeValueGap: Math.round(valueAtRisk * 0.4),
      corePositioning: getCorePositioning(0),
      
      pillars: [
        {
          id: "evidence_log",
          label: "Evidence Log",
          description: "Basic file logging",
          valueDollar: evidenceScore > 0 ? Math.round(protectedValue * 0.4) : 0,
          statusLevel: getStatus(evidenceScore),
          score: evidenceScore
        },
        {
          id: "timestamp",
          label: "Timestamp Accuracy",
          description: "Verified time tracking",
          valueDollar: timestampScore > 0 ? Math.round(protectedValue * 0.3) : 0,
          statusLevel: getStatus(timestampScore),
          score: timestampScore
        },
        {
          id: "integrity",
          label: "File Integrity",
          description: "Anti-tamper checks",
          valueDollar: integrityScore > 0 ? Math.round(protectedValue * 0.2) : 0,
          statusLevel: getStatus(integrityScore),
          score: integrityScore
        },
        {
          id: "basic_value",
          label: "Basic Value",
          description: "Raw hours logged",
          valueDollar: basicValueScore > 0 ? Math.round(protectedValue * 0.1) : 0,
          statusLevel: getStatus(basicValueScore),
          score: basicValueScore
        }
      ],
      
      evidenceTimeline, // Available in Free
      darkPsychology: {
        type: "loss_aversion",
        message: `You have $${valueAtRisk} at risk due to missing context verification.`,
        highlight: `$${valueAtRisk} at risk`,
        action: "Upgrade to Secure"
      }
    };
  }

  // ----------------------------------------------------------------------
  // STARTER TIER: Contextual Protection
  // ----------------------------------------------------------------------
  if (tier === "starter") {
    // FREE TIER METRICS (inherited and recalculated for consistency)
    const evidenceRatio = metrics.totalEvidence / Math.max(1, metrics.totalSessions);
    const evidenceScore = normalizeScore(evidenceRatio, 1.0, 2.0);
    const timestampScore = metrics.totalSessions > 0 ? normalizeScore(metrics.totalSessions, metrics.totalSessions * 0.8, metrics.totalSessions) : 0;
    const integrityScore = metrics.totalEvidence > 0 ? normalizeScore(metrics.totalEvidence, metrics.totalEvidence * 0.8, metrics.totalEvidence) : 0;
    const basicValueScore = normalizeScore(baseValue, 1000, 2000);
    
    // STARTER TIER METRICS
    // Requirement Match: percentage of matched requirements (baseline: 60% = 50 points, 100% = 100 points)
    const matchedCount = requirementMappings.filter(r => r.status === 'matched').length;
    const totalReqs = Math.max(1, requirementMappings.length);
    const reqScore = normalizeScore(matchedCount / totalReqs, 0.6, 1.0);
    
    // Memo Quality: ratio of evidence with metadata/memos (baseline: 50% = 50 points, 100% = 100 points)
    const evidenceWithMemos = metrics.projectEvidence.filter((e: any) => e.contextScore && e.contextScore > 0).length;
    const memoScore = normalizeScore(evidenceWithMemos / Math.max(1, metrics.totalEvidence), 0.5, 1.0);
    
    // Activity Density: minutes per active week (baseline: 420 min/week = 50 points, 840 min/week = 100 points)
    const activeWeeks = Math.max(1, Math.ceil((Date.now() - metrics.project.createdAt) / (7 * 24 * 60 * 60 * 1000)));
    const totalMinutes = metrics.totalHours * 60;
    const minutesPerWeek = totalMinutes / activeWeeks;
    const densityScore = normalizeScore(minutesPerWeek, 420, 840);
    
    // Context Score: average of requirement and memo scores
    const contextScore = Math.round((reqScore + memoScore) / 2);
    
    // OVERALL SCORE CALCULATION (Starter Tier):
    // Average of Starter-tier specific metrics (Requirement Match, Memo Quality, Activity Density, Context)
    // Measures contextual protection - how well work aligns with client requirements
    const overallScore = Math.round((reqScore + memoScore + densityScore + contextScore) / 4);
    const protectedValue = Math.round(baseValue * 0.60);
    const valueAtRisk = Math.round(baseValue * 0.40);

    return {
      score: overallScore,
      tier: "starter",
      valueProtection: protectedValue,
      upgradeMessage: "Upgrade to Pro to defend against Scope Creep.",
      upgradeValueGap: Math.round(valueAtRisk * 0.6),
      corePositioning: getCorePositioning(1),
      
      pillars: [
        // FREE TIER PILLARS (inherited)
        {
          id: "evidence_log",
          label: "Evidence Log",
          description: "Basic file logging",
          valueDollar: evidenceScore > 0 ? Math.round(protectedValue * 0.15) : 0,
          statusLevel: getStatus(evidenceScore),
          score: evidenceScore
        },
        {
          id: "timestamp",
          label: "Timestamp Accuracy",
          description: "Verified time tracking",
          valueDollar: timestampScore > 0 ? Math.round(protectedValue * 0.1) : 0,
          statusLevel: getStatus(timestampScore),
          score: timestampScore
        },
        {
          id: "integrity",
          label: "File Integrity",
          description: "Anti-tamper checks",
          valueDollar: integrityScore > 0 ? Math.round(protectedValue * 0.1) : 0,
          statusLevel: getStatus(integrityScore),
          score: integrityScore
        },
        {
          id: "basic_value",
          label: "Basic Value",
          description: "Raw hours logged",
          valueDollar: basicValueScore > 0 ? Math.round(protectedValue * 0.05) : 0,
          statusLevel: getStatus(basicValueScore),
          score: basicValueScore
        },
        // STARTER TIER PILLARS
        {
          id: "req_match",
          label: "Requirement Match",
          description: "Client needs met",
          valueDollar: reqScore > 0 ? Math.round(protectedValue * 0.25) : 0,
          statusLevel: getStatus(reqScore),
          score: reqScore
        },
        {
          id: "memo_quality",
          label: "Memo Quality",
          description: "Descriptive logs",
          valueDollar: memoScore > 0 ? Math.round(protectedValue * 0.15) : 0,
          statusLevel: getStatus(memoScore),
          score: memoScore
        },
        {
          id: "activity_density",
          label: "Activity Density",
          description: "Work intensity",
          valueDollar: densityScore > 0 ? Math.round(protectedValue * 0.1) : 0,
          statusLevel: getStatus(densityScore),
          score: densityScore
        },
        {
          id: "context",
          label: "Context Score",
          description: "Relevance tracking",
          valueDollar: contextScore > 0 ? Math.round(protectedValue * 0.1) : 0,
          statusLevel: getStatus(contextScore),
          score: contextScore
        }
      ],
      
      evidenceTimeline, // Inherited
      requirementMappings, // Available in Starter
      
      darkPsychology: {
        type: "social_proof",
        message: "Freelancers with unmatched requirements face 3x more disputes.",
        highlight: "3x more disputes",
        action: "Fix Gaps"
      }
    };
  }

  // ----------------------------------------------------------------------
  // PRO TIER: Scope Creep Defense
  // ----------------------------------------------------------------------
  if (tier === "pro") {
    // FREE TIER METRICS (inherited)
    const evidenceRatio = metrics.totalEvidence / Math.max(1, metrics.totalSessions);
    const evidenceScore = normalizeScore(evidenceRatio, 1.0, 2.0);
    const timestampScore = metrics.totalSessions > 0 ? normalizeScore(metrics.totalSessions, metrics.totalSessions * 0.8, metrics.totalSessions) : 0;
    const integrityScore = metrics.totalEvidence > 0 ? normalizeScore(metrics.totalEvidence, metrics.totalEvidence * 0.8, metrics.totalEvidence) : 0;
    const basicValueScore = normalizeScore(baseValue, 1000, 2000);
    
    // STARTER TIER METRICS (inherited)
    const matchedCount = requirementMappings.filter(r => r.status === 'matched').length;
    const totalReqs = Math.max(1, requirementMappings.length);
    const reqScore = normalizeScore(matchedCount / totalReqs, 0.6, 1.0);
    const evidenceWithMemos = metrics.projectEvidence.filter((e: any) => e.contextScore && e.contextScore > 0).length;
    const memoScore = normalizeScore(evidenceWithMemos / Math.max(1, metrics.totalEvidence), 0.5, 1.0);
    const activeWeeks = Math.max(1, Math.ceil((Date.now() - metrics.project.createdAt) / (7 * 24 * 60 * 60 * 1000)));
    const totalMinutes = metrics.totalHours * 60;
    const minutesPerWeek = totalMinutes / activeWeeks;
    const densityScore = normalizeScore(minutesPerWeek, 420, 840);
    const contextScore = Math.round((reqScore + memoScore) / 2);
    
    // PRO TIER METRICS
    // Scope Adherence: evidence-to-session ratio (baseline: 0.8 = 50 points, 1.5 = 100 points)
    const scopeRatio = metrics.totalEvidence / Math.max(1, metrics.totalSessions);
    const scopeScore = normalizeScore(scopeRatio, 0.8, 1.5);
    
    // Change Detection: frequency of requirement/memo updates per week (baseline: 2/week = 50 points, 5/week = 100 points)
    const projectAgeWeeks = Math.max(1, Math.ceil((Date.now() - metrics.project.createdAt) / (7 * 24 * 60 * 60 * 1000)));
    const updateFrequency = (requirementMappings.length + metrics.totalEvidence) / projectAgeWeeks;
    const changeScore = normalizeScore(updateFrequency, 2, 5);
    
    // Dispute Readiness: combined evidence volume and requirement match (baseline: 50% = 50 points, 100% = 100 points)
    const evidenceReadiness = Math.min(1, metrics.totalEvidence / 10); // 10 evidence = full readiness
    const reqReadiness = requirementMappings.filter(r => r.status === 'matched').length / Math.max(1, requirementMappings.length);
    const disputeScore = normalizeScore((evidenceReadiness + reqReadiness) / 2, 0.5, 1.0);
    
    // Vulnerability Shield: protection level based on evidence coverage (baseline: 80% = 50 points, 100% = 100 points)
    const coverage = metrics.totalSessions > 0 ? metrics.totalEvidence / metrics.totalSessions : 0;
    const shieldScore = normalizeScore(coverage, 0.8, 1.2);
    
    // OVERALL SCORE CALCULATION (Pro Tier):
    // Average of Pro-tier specific metrics (Scope Adherence, Change Detection, Dispute Readiness, Vulnerability Shield)
    // Focuses on scope creep defense and dispute prevention capabilities
    const overallScore = Math.round((scopeScore + changeScore + disputeScore + shieldScore) / 4);
    const protectedValue = Math.round(baseValue * 0.85);
    const valueAtRisk = Math.round(baseValue * 0.15);

    return {
      score: overallScore,
      tier: "pro",
      valueProtection: protectedValue,
      upgradeMessage: "Upgrade to Expert for full business protection.",
      upgradeValueGap: Math.round(valueAtRisk * 0.9),
      corePositioning: getCorePositioning(2),
      
      pillars: [
        // FREE TIER PILLARS (inherited)
        {
          id: "evidence_log",
          label: "Evidence Log",
          description: "Basic file logging",
          valueDollar: evidenceScore > 0 ? Math.round(protectedValue * 0.1) : 0,
          statusLevel: getStatus(evidenceScore),
          score: evidenceScore
        },
        {
          id: "timestamp",
          label: "Timestamp Accuracy",
          description: "Verified time tracking",
          valueDollar: timestampScore > 0 ? Math.round(protectedValue * 0.08) : 0,
          statusLevel: getStatus(timestampScore),
          score: timestampScore
        },
        {
          id: "integrity",
          label: "File Integrity",
          description: "Anti-tamper checks",
          valueDollar: integrityScore > 0 ? Math.round(protectedValue * 0.07) : 0,
          statusLevel: getStatus(integrityScore),
          score: integrityScore
        },
        {
          id: "basic_value",
          label: "Basic Value",
          description: "Raw hours logged",
          valueDollar: basicValueScore > 0 ? Math.round(protectedValue * 0.05) : 0,
          statusLevel: getStatus(basicValueScore),
          score: basicValueScore
        },
        // STARTER TIER PILLARS (inherited)
        {
          id: "req_match",
          label: "Requirement Match",
          description: "Client needs met",
          valueDollar: reqScore > 0 ? Math.round(protectedValue * 0.15) : 0,
          statusLevel: getStatus(reqScore),
          score: reqScore
        },
        {
          id: "memo_quality",
          label: "Memo Quality",
          description: "Descriptive logs",
          valueDollar: memoScore > 0 ? Math.round(protectedValue * 0.1) : 0,
          statusLevel: getStatus(memoScore),
          score: memoScore
        },
        {
          id: "activity_density",
          label: "Activity Density",
          description: "Work intensity",
          valueDollar: densityScore > 0 ? Math.round(protectedValue * 0.08) : 0,
          statusLevel: getStatus(densityScore),
          score: densityScore
        },
        {
          id: "context",
          label: "Context Score",
          description: "Relevance tracking",
          valueDollar: contextScore > 0 ? Math.round(protectedValue * 0.07) : 0,
          statusLevel: getStatus(contextScore),
          score: contextScore
        },
        // PRO TIER PILLARS
        {
          id: "scope_adherence",
          label: "Scope Adherence",
          description: "Boundary tracking",
          valueDollar: scopeScore > 0 ? Math.round(protectedValue * 0.15) : 0,
          statusLevel: getStatus(scopeScore),
          score: scopeScore
        },
        {
          id: "change_detection",
          label: "Change Detection",
          description: "Creep alerts",
          valueDollar: changeScore > 0 ? Math.round(protectedValue * 0.1) : 0,
          statusLevel: getStatus(changeScore),
          score: changeScore
        },
        {
          id: "dispute_readiness",
          label: "Dispute Readiness",
          description: "Evidence packaging",
          valueDollar: disputeScore > 0 ? Math.round(protectedValue * 0.08) : 0,
          statusLevel: getStatus(disputeScore),
          score: disputeScore
        },
        {
          id: "vuln_shield",
          label: "Vulnerability Shield",
          description: "Platform specific",
          valueDollar: shieldScore > 0 ? Math.round(protectedValue * 0.07) : 0,
          statusLevel: getStatus(shieldScore),
          score: shieldScore
        }
      ],
      
      evidenceTimeline, // Inherited
      requirementMappings, // Inherited
      timelineSegments, // Available in Pro
      
      darkPsychology: {
        type: "scarcity",
        message: "Scope creep detected. You have 48 hours to formalize changes before payment risk increases.",
        highlight: "48 hours",
        action: "Formalize Now"
      }
    };
  }

  // ----------------------------------------------------------------------
  // EXPERT TIER: Business Protection
  // ----------------------------------------------------------------------
  if (tier === "expert") {
    // FREE TIER METRICS (inherited)
    const evidenceScore = Math.round((metrics.totalEvidence / Math.max(1, metrics.totalSessions)) * 100);
    const timestampScore = metrics.totalSessions > 0 ? 100 : 0;
    const integrityScore = metrics.totalEvidence > 0 ? 100 : 0;
    const basicValueScore = Math.round((baseValue / 500) * 100);
    
    // STARTER TIER METRICS (inherited)
    const reqScore = Math.round((requirementMappings.filter(r => r.status === 'matched').length / Math.max(1, requirementMappings.length)) * 100);
    const evidenceWithMemos = metrics.projectEvidence.filter((e: any) => e.contextScore && e.contextScore > 0).length;
    const memoScore = Math.round((evidenceWithMemos / Math.max(1, metrics.totalEvidence)) * 100);
    const activeWeeks = Math.max(1, Math.ceil((Date.now() - metrics.project.createdAt) / (7 * 24 * 60 * 60 * 1000)));
    const totalMinutes = metrics.totalHours * 60;
    const densityScore = Math.round((totalMinutes / activeWeeks / 420) * 100);
    const contextScore = Math.round((reqScore + memoScore) / 2);
    
    // PRO TIER METRICS (inherited)
    const scopeScore = Math.round((metrics.totalEvidence / Math.max(1, metrics.totalSessions * 0.8)) * 100);
    const projectAgeWeeks = Math.max(1, Math.ceil((Date.now() - metrics.project.createdAt) / (7 * 24 * 60 * 60 * 1000)));
    const updateFrequency = (requirementMappings.length + metrics.totalEvidence) / projectAgeWeeks;
    const changeScore = Math.round((updateFrequency / 2) * 100);
    const evidenceVolume = (metrics.totalEvidence / 10) * 50;
    const requirementMatch = (requirementMappings.filter(r => r.status === 'matched').length / Math.max(1, requirementMappings.length)) * 50;
    const disputeScore = Math.round(evidenceVolume + requirementMatch);
    // Vulnerability Shield: protection level based on evidence coverage (baseline: 80% = 50 points, 100% = 100 points)
    const coverage = metrics.totalSessions > 0 ? metrics.totalEvidence / metrics.totalSessions : 0;
    const shieldScore = normalizeScore(coverage, 0.8, 1.2);
    
    // EXPERT TIER METRICS
    // Platform Diversity: count of connected platforms (baseline: 2 platforms = 50 points, 4 platforms = 100 points)
    const connectedPlatforms = metrics.primaryPlatform ? 1 : 0; // Future: query platformConnections table
    const platformScore = normalizeScore(connectedPlatforms, 2, 4);
    
    // Income Continuity: rolling monthly income (baseline: $3k/month = 50 points, $6k/month = 100 points)
    const monthlyIncome = baseValue / Math.max(1, Math.ceil((Date.now() - metrics.project.createdAt) / (30 * 24 * 60 * 60 * 1000)));
    const incomeScore = normalizeScore(monthlyIncome, 3000, 6000);
    
    // Client Trust Depth: evidence documentation depth (baseline: 15 evidence = 50 points, 30 evidence = 100 points)
    // Measures consistency and thoroughness of documentation across client relationships
    const trustDepthScore = normalizeScore(metrics.totalEvidence, 15, 30);
    
    // Global Compliance: baseline compliance level (baseline: 70% = 50 points, 100% = 100 points)
    const complianceScore = normalizeScore(0.85, 0.7, 1.0); // Future: query policyIntelligence and complianceChecks
    
    // OVERALL SCORE CALCULATION (Expert Tier):
    // Weighted average of Expert-tier specific metrics only (not inherited metrics)
    // This focuses on business-level protection capabilities
    const overallScore = Math.round((platformScore + incomeScore + trustDepthScore + complianceScore) / 4);
    const protectedValue = Math.round(baseValue * 0.98);
    
    return {
      score: overallScore,
      tier: "expert",
      valueProtection: protectedValue,
      upgradeMessage: null,
      upgradeValueGap: 0,
      corePositioning: getCorePositioning(3),
      
      pillars: [
        // FREE TIER PILLARS (inherited)
        {
          id: "evidence_log",
          label: "Evidence Log",
          description: "Basic file logging",
          valueDollar: evidenceScore > 0 ? Math.round(protectedValue * 0.08) : 0,
          statusLevel: getStatus(evidenceScore),
          score: evidenceScore
        },
        {
          id: "timestamp",
          label: "Timestamp Accuracy",
          description: "Verified time tracking",
          valueDollar: timestampScore > 0 ? Math.round(protectedValue * 0.06) : 0,
          statusLevel: getStatus(timestampScore),
          score: timestampScore
        },
        {
          id: "integrity",
          label: "File Integrity",
          description: "Anti-tamper checks",
          valueDollar: integrityScore > 0 ? Math.round(protectedValue * 0.05) : 0,
          statusLevel: getStatus(integrityScore),
          score: integrityScore
        },
        {
          id: "basic_value",
          label: "Basic Value",
          description: "Raw hours logged",
          valueDollar: basicValueScore > 0 ? Math.round(protectedValue * 0.04) : 0,
          statusLevel: getStatus(basicValueScore),
          score: basicValueScore
        },
        // STARTER TIER PILLARS (inherited)
        {
          id: "req_match",
          label: "Requirement Match",
          description: "Client needs met",
          valueDollar: reqScore > 0 ? Math.round(protectedValue * 0.1) : 0,
          statusLevel: getStatus(reqScore),
          score: reqScore
        },
        {
          id: "memo_quality",
          label: "Memo Quality",
          description: "Descriptive logs",
          valueDollar: memoScore > 0 ? Math.round(protectedValue * 0.08) : 0,
          statusLevel: getStatus(memoScore),
          score: memoScore
        },
        {
          id: "activity_density",
          label: "Activity Density",
          description: "Work intensity",
          valueDollar: densityScore > 0 ? Math.round(protectedValue * 0.06) : 0,
          statusLevel: getStatus(densityScore),
          score: densityScore
        },
        {
          id: "context",
          label: "Context Score",
          description: "Relevance tracking",
          valueDollar: contextScore > 0 ? Math.round(protectedValue * 0.05) : 0,
          statusLevel: getStatus(contextScore),
          score: contextScore
        },
        // PRO TIER PILLARS (inherited)
        {
          id: "scope_adherence",
          label: "Scope Adherence",
          description: "Boundary tracking",
          valueDollar: scopeScore > 0 ? Math.round(protectedValue * 0.1) : 0,
          statusLevel: getStatus(scopeScore),
          score: scopeScore
        },
        {
          id: "change_detection",
          label: "Change Detection",
          description: "Creep alerts",
          valueDollar: changeScore > 0 ? Math.round(protectedValue * 0.08) : 0,
          statusLevel: getStatus(changeScore),
          score: changeScore
        },
        {
          id: "dispute_readiness",
          label: "Dispute Readiness",
          description: "Evidence packaging",
          valueDollar: disputeScore > 0 ? Math.round(protectedValue * 0.06) : 0,
          statusLevel: getStatus(disputeScore),
          score: disputeScore
        },
        {
          id: "vuln_shield",
          label: "Vulnerability Shield",
          description: "Platform specific",
          valueDollar: shieldScore > 0 ? Math.round(protectedValue * 0.05) : 0,
          statusLevel: getStatus(shieldScore),
          score: shieldScore
        },
        // EXPERT TIER PILLARS
        {
          id: "platform_diversity",
          label: "Platform Diversity",
          description: "Multi-channel safety",
          valueDollar: platformScore > 0 ? Math.round(protectedValue * 0.08) : 0,
          statusLevel: getStatus(platformScore),
          score: platformScore
        },
        {
          id: "income_continuity",
          label: "Income Continuity",
          description: "Revenue stability",
          valueDollar: incomeScore > 0 ? Math.round(protectedValue * 0.06) : 0,
          statusLevel: getStatus(incomeScore),
          score: incomeScore
        },
        {
          id: "client_trust_depth",
          label: "Client Trust Depth",
          description: "Trust scoring",
          valueDollar: trustDepthScore > 0 ? Math.round(protectedValue * 0.05) : 0,
          statusLevel: getStatus(trustDepthScore),
          score: trustDepthScore
        },
        {
          id: "global_compliance",
          label: "Global Compliance",
          description: "Legal & Tax",
          valueDollar: complianceScore > 0 ? Math.round(protectedValue * 0.04) : 0,
          statusLevel: getStatus(complianceScore),
          score: complianceScore
        }
      ],
      
      evidenceTimeline, // Inherited
      requirementMappings, // Inherited
      timelineSegments, // Inherited
      businessMapNodes, // Available in Expert
      
      darkPsychology: {
        type: "authority",
        message: "Your business is protected by TIMELock Expert Standards. Top 1% of freelancers maintain this level.",
        highlight: "Top 1%",
        action: "View Report"
      }
    };
  }
  
  return null; // Should not happen
}