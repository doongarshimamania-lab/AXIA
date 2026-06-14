/**
 * Rich mock data for the Projects page sub-components.
 * Each data object matches the shape expected by its corresponding component,
 * keyed by project ID so the selected mock project drives the demo experience.
 */

// ---------------------------------------------------------------------------
// Protection Score Data
// ---------------------------------------------------------------------------

export const mockProtectionScoreData: Record<string, any> = {
  "mock-proj-001": {
    score: 94,
    tier: "free",
    valueProtection: 3543,
    upgradeMessage: "Upgrade to Starter to protect context and requirements.",
    upgradeValueGap: 4257,
    corePositioning: {
      prevention: { status: false, label: "Business continuity secured" },
      protection: { status: false, label: "Scope creep monitored" },
      noDenials: { status: false, label: "Requirements matched" },
      hourlyProtection: { status: true, label: "Time & Evidence logged" },
    },
    pillars: [
      { id: "evidence_log", label: "Evidence Log", description: "Basic file logging", valueDollar: 1417, statusLevel: "high", score: 92 },
      { id: "timestamp", label: "Timestamp Accuracy", description: "Verified time tracking", valueDollar: 1063, statusLevel: "high", score: 95 },
      { id: "integrity", label: "File Integrity", description: "Anti-tamper checks", valueDollar: 709, statusLevel: "high", score: 94 },
      { id: "basic_value", label: "Basic Value", description: "Raw hours logged", valueDollar: 354, statusLevel: "high", score: 96 },
    ],
    evidenceTimeline: [
      { id: "et-1", time: "2:30 PM", status: "verified", valueAtRisk: 0 },
      { id: "et-2", time: "11:15 AM", status: "verified", valueAtRisk: 0 },
      { id: "et-3", time: "9:00 AM", status: "partial", valueAtRisk: 95 },
      { id: "et-4", time: "Yesterday", status: "verified", valueAtRisk: 0 },
      { id: "et-5", time: "2 days ago", status: "verified", valueAtRisk: 0 },
    ],
    darkPsychology: {
      type: "loss_aversion",
      message: "You have $4,257 at risk due to missing context verification.",
      highlight: "$4,257 at risk",
      action: "Upgrade to Secure",
    },
  },
  "mock-proj-002": {
    score: 78,
    tier: "free",
    valueProtection: 5000,
    upgradeMessage: "Upgrade to Starter to protect context and requirements.",
    upgradeValueGap: 3333,
    corePositioning: {
      prevention: { status: false, label: "Business continuity secured" },
      protection: { status: false, label: "Scope creep monitored" },
      noDenials: { status: false, label: "Requirements matched" },
      hourlyProtection: { status: true, label: "Time & Evidence logged" },
    },
    pillars: [
      { id: "evidence_log", label: "Evidence Log", description: "Basic file logging", valueDollar: 2000, statusLevel: "medium", score: 75 },
      { id: "timestamp", label: "Timestamp Accuracy", description: "Verified time tracking", valueDollar: 1500, statusLevel: "medium", score: 70 },
      { id: "integrity", label: "File Integrity", description: "Anti-tamper checks", valueDollar: 1000, statusLevel: "high", score: 85 },
      { id: "basic_value", label: "Basic Value", description: "Raw hours logged", valueDollar: 500, statusLevel: "high", score: 82 },
    ],
    evidenceTimeline: [
      { id: "et-1", time: "4:00 PM", status: "verified", valueAtRisk: 0 },
      { id: "et-2", time: "1:30 PM", status: "missing", valueAtRisk: 420 },
      { id: "et-3", time: "10:00 AM", status: "verified", valueAtRisk: 0 },
      { id: "et-4", time: "Yesterday", status: "partial", valueAtRisk: 210 },
      { id: "et-5", time: "2 days ago", status: "verified", valueAtRisk: 0 },
    ],
    darkPsychology: {
      type: "loss_aversion",
      message: "You have $3,333 at risk due to missing context verification.",
      highlight: "$3,333 at risk",
      action: "Upgrade to Secure",
    },
  },
  "mock-proj-003": {
    score: 52,
    tier: "free",
    valueProtection: 1700,
    upgradeMessage: "Upgrade to Starter to protect context and requirements.",
    upgradeValueGap: 2550,
    corePositioning: {
      prevention: { status: false, label: "Business continuity secured" },
      protection: { status: false, label: "Scope creep monitored" },
      noDenials: { status: false, label: "Requirements matched" },
      hourlyProtection: { status: true, label: "Time & Evidence logged" },
    },
    pillars: [
      { id: "evidence_log", label: "Evidence Log", description: "Basic file logging", valueDollar: 510, statusLevel: "low", score: 45 },
      { id: "timestamp", label: "Timestamp Accuracy", description: "Verified time tracking", valueDollar: 510, statusLevel: "medium", score: 55 },
      { id: "integrity", label: "File Integrity", description: "Anti-tamper checks", valueDollar: 340, statusLevel: "low", score: 40 },
      { id: "basic_value", label: "Basic Value", description: "Raw hours logged", valueDollar: 340, statusLevel: "medium", score: 68 },
    ],
    evidenceTimeline: [
      { id: "et-1", time: "3:00 PM", status: "missing", valueAtRisk: 850 },
      { id: "et-2", time: "11:00 AM", status: "partial", valueAtRisk: 420 },
      { id: "et-3", time: "Yesterday", status: "missing", valueAtRisk: 1050 },
      { id: "et-4", time: "2 days ago", status: "verified", valueAtRisk: 0 },
      { id: "et-5", time: "3 days ago", status: "partial", valueAtRisk: 350 },
    ],
    darkPsychology: {
      type: "loss_aversion",
      message: "You have $2,550 at risk — over half your project value is unprotected.",
      highlight: "$2,550 at risk",
      action: "Upgrade to Secure",
    },
  },
  "mock-proj-004": {
    score: 97,
    tier: "free",
    valueProtection: 5040,
    upgradeMessage: "Upgrade to Starter to protect context and requirements.",
    upgradeValueGap: 504,
    corePositioning: {
      prevention: { status: false, label: "Business continuity secured" },
      protection: { status: false, label: "Scope creep monitored" },
      noDenials: { status: false, label: "Requirements matched" },
      hourlyProtection: { status: true, label: "Time & Evidence logged" },
    },
    pillars: [
      { id: "evidence_log", label: "Evidence Log", description: "Basic file logging", valueDollar: 2016, statusLevel: "high", score: 98 },
      { id: "timestamp", label: "Timestamp Accuracy", description: "Verified time tracking", valueDollar: 1512, statusLevel: "high", score: 97 },
      { id: "integrity", label: "File Integrity", description: "Anti-tamper checks", valueDollar: 1008, statusLevel: "high", score: 96 },
      { id: "basic_value", label: "Basic Value", description: "Raw hours logged", valueDollar: 504, statusLevel: "high", score: 97 },
    ],
    evidenceTimeline: [
      { id: "et-1", time: "5:00 PM", status: "verified", valueAtRisk: 0 },
      { id: "et-2", time: "2:00 PM", status: "verified", valueAtRisk: 0 },
      { id: "et-3", time: "10:30 AM", status: "verified", valueAtRisk: 0 },
      { id: "et-4", time: "Yesterday", status: "verified", valueAtRisk: 0 },
      { id: "et-5", time: "2 days ago", status: "verified", valueAtRisk: 0 },
    ],
    darkPsychology: {
      type: "loss_aversion",
      message: "You have $504 at risk due to missing context verification.",
      highlight: "$504 at risk",
      action: "Upgrade to Secure",
    },
  },
  "mock-proj-005": {
    score: 71,
    tier: "free",
    valueProtection: 2414,
    upgradeMessage: "Upgrade to Starter to protect context and requirements.",
    upgradeValueGap: 2816,
    corePositioning: {
      prevention: { status: false, label: "Business continuity secured" },
      protection: { status: false, label: "Scope creep monitored" },
      noDenials: { status: false, label: "Requirements matched" },
      hourlyProtection: { status: true, label: "Time & Evidence logged" },
    },
    pillars: [
      { id: "evidence_log", label: "Evidence Log", description: "Basic file logging", valueDollar: 725, statusLevel: "medium", score: 68 },
      { id: "timestamp", label: "Timestamp Accuracy", description: "Verified time tracking", valueDollar: 725, statusLevel: "medium", score: 72 },
      { id: "integrity", label: "File Integrity", description: "Anti-tamper checks", valueDollar: 483, statusLevel: "medium", score: 65 },
      { id: "basic_value", label: "Basic Value", description: "Raw hours logged", valueDollar: 483, statusLevel: "high", score: 79 },
    ],
    evidenceTimeline: [
      { id: "et-1", time: "1:00 PM", status: "verified", valueAtRisk: 0 },
      { id: "et-2", time: "9:30 AM", status: "partial", valueAtRisk: 255 },
      { id: "et-3", time: "Yesterday", status: "verified", valueAtRisk: 0 },
      { id: "et-4", time: "2 days ago", status: "missing", valueAtRisk: 595 },
      { id: "et-5", time: "3 days ago", status: "verified", valueAtRisk: 0 },
    ],
    darkPsychology: {
      type: "loss_aversion",
      message: "You have $2,816 at risk due to missing context verification.",
      highlight: "$2,816 at risk",
      action: "Upgrade to Secure",
    },
  },
};

// ---------------------------------------------------------------------------
// Health Dashboard Data
// ---------------------------------------------------------------------------

export const mockHealthDashboardData: Record<string, any> = {
  "mock-proj-001": {
    pillars: [
      { name: "Evidence Rate", value: 92, unit: "%" },
      { name: "Compliance", value: 88, unit: "%" },
    ],
    valueMetric: { amount: 3543, label: "Protected", cadence: "week" },
    timelineBlocks: [
      { id: "tb-1", date: "Mon", hours: 6.5, status: "compliant", evidenceCount: 12 },
      { id: "tb-2", date: "Tue", hours: 8, status: "compliant", evidenceCount: 15 },
      { id: "tb-3", date: "Wed", hours: 7.5, status: "compliant", evidenceCount: 14 },
      { id: "tb-4", date: "Thu", hours: 5, status: "at_risk", evidenceCount: 6 },
      { id: "tb-5", date: "Fri", hours: 4, status: "compliant", evidenceCount: 9 },
      { id: "tb-6", date: "Sat", hours: 2, status: "compliant", evidenceCount: 3 },
      { id: "tb-7", date: "Sun", hours: 0, status: "none", evidenceCount: 0 },
    ],
    upgradePrompt: {
      message: "Unlock interactive timeline with hover details and risk analysis",
      valueGap: 3200,
      targetTier: "starter",
      description: "See exact risk periods and get AI-powered health recommendations",
    },
    darkPsychology: { scarcity: "Your compliance dropped 12% this week — act now to protect $4,200 in billable hours" },
  },
  "mock-proj-002": {
    pillars: [
      { name: "Evidence Rate", value: 68, unit: "%" },
      { name: "Compliance", value: 74, unit: "%" },
    ],
    valueMetric: { amount: 5000, label: "Protected", cadence: "week" },
    timelineBlocks: [
      { id: "tb-1", date: "Mon", hours: 7, status: "compliant", evidenceCount: 10 },
      { id: "tb-2", date: "Tue", hours: 8, status: "at_risk", evidenceCount: 5 },
      { id: "tb-3", date: "Wed", hours: 6, status: "compliant", evidenceCount: 9 },
      { id: "tb-4", date: "Thu", hours: 9, status: "compliant", evidenceCount: 13 },
      { id: "tb-5", date: "Fri", hours: 3, status: "rejected", evidenceCount: 2 },
      { id: "tb-6", date: "Sat", hours: 1, status: "compliant", evidenceCount: 2 },
      { id: "tb-7", date: "Sun", hours: 0, status: "none", evidenceCount: 0 },
    ],
    upgradePrompt: {
      message: "Unlock interactive timeline with hover details and risk analysis",
      valueGap: 4500,
      targetTier: "starter",
      description: "See exact risk periods and get AI-powered health recommendations",
    },
    darkPsychology: { scarcity: "3.5 hours were rejected last week — that's $420 in lost income" },
  },
  "mock-proj-003": {
    pillars: [
      { name: "Evidence Rate", value: 42, unit: "%" },
      { name: "Compliance", value: 38, unit: "%" },
    ],
    valueMetric: { amount: 1700, label: "At Risk", cadence: "week" },
    timelineBlocks: [
      { id: "tb-1", date: "Mon", hours: 5, status: "at_risk", evidenceCount: 4 },
      { id: "tb-2", date: "Tue", hours: 4, status: "rejected", evidenceCount: 1 },
      { id: "tb-3", date: "Wed", hours: 6, status: "compliant", evidenceCount: 8 },
      { id: "tb-4", date: "Thu", hours: 3, status: "rejected", evidenceCount: 2 },
      { id: "tb-5", date: "Fri", hours: 2, status: "at_risk", evidenceCount: 3 },
      { id: "tb-6", date: "Sat", hours: 0, status: "none", evidenceCount: 0 },
      { id: "tb-7", date: "Sun", hours: 0, status: "none", evidenceCount: 0 },
    ],
    upgradePrompt: {
      message: "Critical: Over half your project value is at risk",
      valueGap: 6800,
      targetTier: "starter",
      description: "Get real-time risk alerts and compliance recommendations",
    },
    darkPsychology: { scarcity: "12 hours rejected — $4,200 at risk. Clients with low compliance face 4x more disputes" },
  },
  "mock-proj-004": {
    pillars: [
      { name: "Evidence Rate", value: 98, unit: "%" },
      { name: "Compliance", value: 96, unit: "%" },
    ],
    valueMetric: { amount: 5040, label: "Protected", cadence: "week" },
    timelineBlocks: [
      { id: "tb-1", date: "Mon", hours: 8, status: "compliant", evidenceCount: 16 },
      { id: "tb-2", date: "Tue", hours: 7, status: "compliant", evidenceCount: 14 },
      { id: "tb-3", date: "Wed", hours: 8, status: "compliant", evidenceCount: 15 },
      { id: "tb-4", date: "Thu", hours: 6, status: "compliant", evidenceCount: 12 },
      { id: "tb-5", date: "Fri", hours: 5, status: "compliant", evidenceCount: 10 },
      { id: "tb-6", date: "Sat", hours: 1, status: "compliant", evidenceCount: 2 },
      { id: "tb-7", date: "Sun", hours: 0, status: "none", evidenceCount: 0 },
    ],
    upgradePrompt: {
      message: "Your protection is excellent — unlock predictive insights to maintain it",
      valueGap: 500,
      targetTier: "starter",
      description: "AI-powered health predictions and early warning system",
    },
    darkPsychology: { scarcity: "Project completed with 97% protection — top 3% of freelancers" },
  },
  "mock-proj-005": {
    pillars: [
      { name: "Evidence Rate", value: 62, unit: "%" },
      { name: "Compliance", value: 55, unit: "%" },
    ],
    valueMetric: { amount: 2414, label: "Protected", cadence: "week" },
    timelineBlocks: [
      { id: "tb-1", date: "Mon", hours: 5, status: "compliant", evidenceCount: 8 },
      { id: "tb-2", date: "Tue", hours: 6, status: "at_risk", evidenceCount: 5 },
      { id: "tb-3", date: "Wed", hours: 7, status: "compliant", evidenceCount: 11 },
      { id: "tb-4", date: "Thu", hours: 4, status: "rejected", evidenceCount: 2 },
      { id: "tb-5", date: "Fri", hours: 3, status: "at_risk", evidenceCount: 4 },
      { id: "tb-6", date: "Sat", hours: 0, status: "none", evidenceCount: 0 },
      { id: "tb-7", date: "Sun", hours: 0, status: "none", evidenceCount: 0 },
    ],
    upgradePrompt: {
      message: "5 hours rejected — protect your income with real-time alerts",
      valueGap: 5500,
      targetTier: "starter",
      description: "Get instant notifications when compliance drops below thresholds",
    },
    darkPsychology: { scarcity: "5 hours rejected this week — that's $425 lost. Compliance is declining." },
  },
};

// ---------------------------------------------------------------------------
// Risk Timeline Data
// ---------------------------------------------------------------------------

export const mockRiskTimelineData: Record<string, any> = {
  "mock-proj-001": {
    tier: "free",
    totalProtectedWeekly: 3543,
    totalProtectedMonthly: 14172,
    pillars: {
      free: [
        { id: "p-1", label: "Timeline Coverage", value: 88, displayValue: "88%", description: "Hours with evidence", status: "protected", dollarImpact: 3120 },
        { id: "p-2", label: "Risk Events", value: 3, displayValue: "3", description: "Unprotected periods", status: "at_risk", dollarImpact: 597 },
      ],
    },
    events: [
      { id: "ev-1", timestamp: Date.now() - 2 * 60 * 60 * 1000, description: "Screenshot gap detected (45 min)", riskLevel: "medium", impactValue: 95, type: "gap", context: "Active work session with no screenshots" },
      { id: "ev-2", timestamp: Date.now() - 6 * 60 * 60 * 1000, description: "Memo missing for morning session", riskLevel: "low", impactValue: 45, type: "evidence", context: "Session started without context memo" },
      { id: "ev-3", timestamp: Date.now() - 24 * 60 * 60 * 1000, description: "Compliance alert: Timer paused", riskLevel: "low", impactValue: 30, type: "compliance", context: "Timer was paused for 12 minutes during active work" },
    ],
    persuasion: {
      scarcity: true,
      socialProof: false,
      lossAversion: true,
      authority: false,
      scarcityMessage: "Your last 3 risk events left $170 unprotected",
      lossAversionMessage: "Without context memos, you could lose 40% of disputed hours",
    },
    corePositioningMessage: "Your work timeline is 88% protected — context gaps put the rest at risk",
  },
  "mock-proj-002": {
    tier: "free",
    totalProtectedWeekly: 5000,
    totalProtectedMonthly: 20000,
    pillars: {
      free: [
        { id: "p-1", label: "Timeline Coverage", value: 72, displayValue: "72%", description: "Hours with evidence", status: "at_risk", dollarImpact: 3600 },
        { id: "p-2", label: "Risk Events", value: 7, displayValue: "7", description: "Unprotected periods", status: "vulnerable", dollarImpact: 1400 },
      ],
    },
    events: [
      { id: "ev-1", timestamp: Date.now() - 4 * 60 * 60 * 1000, description: "3.5 hours rejected by client", riskLevel: "high", impactValue: 420, type: "compliance", context: "Client flagged hours as not matching contract scope" },
      { id: "ev-2", timestamp: Date.now() - 8 * 60 * 60 * 1000, description: "Evidence gap: 2-hour window", riskLevel: "medium", impactValue: 210, type: "gap", context: "No activity recorded between 2-4 PM" },
      { id: "ev-3", timestamp: Date.now() - 48 * 60 * 60 * 1000, description: "Payment protection risk", riskLevel: "high", impactValue: 630, type: "pattern", context: "Client has history of partial payments" },
    ],
    persuasion: {
      scarcity: true,
      socialProof: true,
      lossAversion: true,
      authority: false,
      scarcityMessage: "3.5 hours rejected — $420 at risk right now",
      socialProofMessage: "Freelancers with similar gaps lose 35% more disputes",
      lossAversionMessage: "Without better evidence, you could lose the full $420",
    },
    corePositioningMessage: "72% coverage means $1,400 is vulnerable this week",
  },
  "mock-proj-003": {
    tier: "free",
    totalProtectedWeekly: 1700,
    totalProtectedMonthly: 6800,
    pillars: {
      free: [
        { id: "p-1", label: "Timeline Coverage", value: 38, displayValue: "38%", description: "Hours with evidence", status: "vulnerable", dollarImpact: 1700 },
        { id: "p-2", label: "Risk Events", value: 12, displayValue: "12", description: "Unprotected periods", status: "vulnerable", dollarImpact: 2500 },
      ],
    },
    events: [
      { id: "ev-1", timestamp: Date.now() - 1 * 60 * 60 * 1000, description: "Critical: 12 hours rejected", riskLevel: "critical", impactValue: 1020, type: "compliance", context: "Multiple sessions flagged by client" },
      { id: "ev-2", timestamp: Date.now() - 12 * 60 * 60 * 1000, description: "Extended evidence gap (4+ hours)", riskLevel: "high", impactValue: 595, type: "gap", context: "No screenshots or memos during peak work hours" },
      { id: "ev-3", timestamp: Date.now() - 36 * 60 * 60 * 1000, description: "Pattern #7 vulnerability detected", riskLevel: "high", impactValue: 850, type: "pattern", context: "Low-activity periods during billable hours" },
    ],
    persuasion: {
      scarcity: true,
      socialProof: true,
      lossAversion: true,
      authority: false,
      scarcityMessage: "CRITICAL: 12 hours rejected — $1,020 at immediate risk",
      socialProofMessage: "Projects at this risk level face 5x more disputes",
      lossAversionMessage: "Without action, you could lose $4,200 (49% of project value)",
    },
    corePositioningMessage: "Only 38% of your work is protected — immediate action required",
  },
  "mock-proj-004": {
    tier: "free",
    totalProtectedWeekly: 5040,
    totalProtectedMonthly: 20160,
    pillars: {
      free: [
        { id: "p-1", label: "Timeline Coverage", value: 98, displayValue: "98%", description: "Hours with evidence", status: "protected", dollarImpact: 5040 },
        { id: "p-2", label: "Risk Events", value: 1, displayValue: "1", description: "Unprotected periods", status: "protected", dollarImpact: 100 },
      ],
    },
    events: [
      { id: "ev-1", timestamp: Date.now() - 5 * 24 * 60 * 60 * 1000, description: "Minor memo gap", riskLevel: "low", impactValue: 100, type: "evidence", context: "One memo missing from completed session" },
    ],
    persuasion: {
      scarcity: false,
      socialProof: false,
      lossAversion: false,
      authority: true,
      authorityMessage: "Top 3% protection score — your evidence practices set the standard",
    },
    corePositioningMessage: "98% protected — your evidence practices are best-in-class",
  },
  "mock-proj-005": {
    tier: "free",
    totalProtectedWeekly: 2414,
    totalProtectedMonthly: 9656,
    pillars: {
      free: [
        { id: "p-1", label: "Timeline Coverage", value: 55, displayValue: "55%", description: "Hours with evidence", status: "at_risk", dollarImpact: 2414 },
        { id: "p-2", label: "Risk Events", value: 8, displayValue: "8", description: "Unprotected periods", status: "vulnerable", dollarImpact: 2816 },
      ],
    },
    events: [
      { id: "ev-1", timestamp: Date.now() - 3 * 60 * 60 * 1000, description: "5 hours rejected this week", riskLevel: "high", impactValue: 425, type: "compliance", context: "Client questioned work scope alignment" },
      { id: "ev-2", timestamp: Date.now() - 18 * 60 * 60 * 1000, description: "Evidence gap detected (3 hours)", riskLevel: "medium", impactValue: 255, type: "gap", context: "Active work session with insufficient screenshots" },
      { id: "ev-3", timestamp: Date.now() - 48 * 60 * 60 * 1000, description: "Compliance rate dropping", riskLevel: "medium", impactValue: 340, type: "pattern", context: "Evidence collection frequency decreased 30% this week" },
    ],
    persuasion: {
      scarcity: true,
      socialProof: true,
      lossAversion: true,
      authority: false,
      scarcityMessage: "5 hours rejected — $425 lost this week",
      socialProofMessage: "Freelancers with similar patterns lose disputes 60% of the time",
      lossAversionMessage: "Without better coverage, you risk losing $2,816 in disputed hours",
    },
    corePositioningMessage: "55% coverage means nearly half your work is unprotected",
  },
};

// ---------------------------------------------------------------------------
// Milestone Protection Data
// ---------------------------------------------------------------------------

export const mockMilestoneData: Record<string, any> = {
  "mock-proj-001": {
    milestones: [
      { period: "Week 1", hours: 42, value: 3990, protectionRate: 96, status: "protected" },
      { period: "Week 2", hours: 48, value: 4560, protectionRate: 94, status: "protected" },
      { period: "Week 3", hours: 51, value: 4845, protectionRate: 92, status: "protected" },
      { period: "Week 4", hours: 45.5, value: 4322, protectionRate: 93, status: "protected" },
    ],
    totalProtectedValue: 15983,
    totalAtRiskValue: 734,
    avgProtectionRate: 94,
  },
  "mock-proj-002": {
    milestones: [
      { period: "Week 1", hours: 55, value: 5500, protectionRate: 82, status: "protected" },
      { period: "Week 2", hours: 60, value: 6000, protectionRate: 74, status: "at_risk" },
      { period: "Week 3", hours: 62, value: 6200, protectionRate: 78, status: "protected" },
      { period: "Week 4", hours: 63, value: 6300, protectionRate: 71, status: "at_risk" },
    ],
    totalProtectedValue: 17700,
    totalAtRiskValue: 7300,
    avgProtectionRate: 76,
  },
  "mock-proj-003": {
    milestones: [
      { period: "Week 1", hours: 28, value: 2380, protectionRate: 45, status: "vulnerable" },
      { period: "Week 2", hours: 22, value: 1870, protectionRate: 38, status: "vulnerable" },
      { period: "Week 3", hours: 25, value: 2125, protectionRate: 52, status: "at_risk" },
      { period: "Week 4", hours: 20, value: 1700, protectionRate: 41, status: "vulnerable" },
    ],
    totalProtectedValue: 1105,
    totalAtRiskValue: 6970,
    avgProtectionRate: 44,
  },
  "mock-proj-004": {
    milestones: [
      { period: "Week 1", hours: 50, value: 6000, protectionRate: 98, status: "protected" },
      { period: "Week 2", hours: 55, value: 6600, protectionRate: 97, status: "protected" },
      { period: "Week 3", hours: 52, value: 6240, protectionRate: 96, status: "protected" },
      { period: "Week 4", hours: 53, value: 6360, protectionRate: 98, status: "protected" },
    ],
    totalProtectedValue: 24480,
    totalAtRiskValue: 720,
    avgProtectionRate: 97,
  },
  "mock-proj-005": {
    milestones: [
      { period: "Week 1", hours: 38, value: 3230, protectionRate: 72, status: "at_risk" },
      { period: "Week 2", hours: 35, value: 2975, protectionRate: 65, status: "at_risk" },
      { period: "Week 3", hours: 36, value: 3060, protectionRate: 70, status: "at_risk" },
      { period: "Week 4", hours: 33, value: 2805, protectionRate: 68, status: "at_risk" },
    ],
    totalProtectedValue: 8070,
    totalAtRiskValue: 4000,
    avgProtectionRate: 69,
  },
};

// ---------------------------------------------------------------------------
// Adaptive Evidence System Data
// ---------------------------------------------------------------------------

export const mockAdaptiveEvidenceData: Record<string, any> = {
  "mock-proj-001": {
    tier: "free",
    valueMetric: { label: "Evidence Value", amount: 3543, period: "week", description: "Value protected through evidence collection" },
    psychology: {
      scarcity: { message: "Gaps in your evidence timeline leave $170 unprotected", active: true },
      lossAversion: { message: "Without memos, 40% of disputed hours could be lost", value: 170, active: true },
    },
    pillars: [
      { id: "ep-1", label: "Screenshots", value: "47", status: "protected", description: "Captured this week", dollarImpact: 1417 },
      { id: "ep-2", label: "Memos", value: "12", status: "optimized", description: "Context memos logged", dollarImpact: 709 },
      { id: "ep-3", label: "Activity Log", value: "92%", status: "protected", description: "Active tracking coverage", dollarImpact: 1063 },
      { id: "ep-4", label: "URL Trail", value: "28", status: "at_risk", description: "Work-related URLs tracked", dollarImpact: 354 },
    ],
    timelineEvents: [
      { id: "te-1", timestamp: Date.now() - 1 * 60 * 60 * 1000, description: "Screenshot captured", riskLevel: "low", impactValue: 0, type: "evidence", context: "Auto-capture during active session" },
      { id: "te-2", timestamp: Date.now() - 3 * 60 * 60 * 1000, description: "Memo added", riskLevel: "low", impactValue: 0, type: "evidence", context: "Session context note" },
      { id: "te-3", timestamp: Date.now() - 5 * 60 * 60 * 1000, description: "45-min gap detected", riskLevel: "medium", impactValue: 95, type: "gap", context: "No evidence captured during work" },
    ],
    corePositioning: "Your evidence protects $3,543 this week — fill gaps to reach full coverage",
    upgrade: { targetTier: "starter", valueGap: 3200, benefits: ["Requirement matching", "Context verification", "AI recommendations"], cta: "Upgrade to Starter" },
  },
  "mock-proj-002": {
    tier: "free",
    valueMetric: { label: "Evidence Value", amount: 5000, period: "week", description: "Value protected through evidence collection" },
    psychology: {
      scarcity: { message: "3.5 rejected hours this week — $420 at immediate risk", active: true },
      socialProof: { message: "Top freelancers maintain 90%+ evidence coverage", active: true },
    },
    pillars: [
      { id: "ep-1", label: "Screenshots", value: "32", status: "at_risk", description: "Below recommended frequency", dollarImpact: 2000 },
      { id: "ep-2", label: "Memos", value: "8", status: "at_risk", description: "Missing session context", dollarImpact: 1500 },
      { id: "ep-3", label: "Activity Log", value: "74%", status: "at_risk", description: "Coverage needs improvement", dollarImpact: 1000 },
      { id: "ep-4", label: "URL Trail", value: "15", status: "vulnerable", description: "Minimal URL tracking", dollarImpact: 500 },
    ],
    timelineEvents: [
      { id: "te-1", timestamp: Date.now() - 2 * 60 * 60 * 1000, description: "3.5h rejected by client", riskLevel: "high", impactValue: 420, type: "compliance" },
      { id: "te-2", timestamp: Date.now() - 8 * 60 * 60 * 1000, description: "Screenshot gap (2 hours)", riskLevel: "medium", impactValue: 210, type: "gap" },
      { id: "te-3", timestamp: Date.now() - 24 * 60 * 60 * 1000, description: "Memo added for morning session", riskLevel: "low", impactValue: 0, type: "evidence" },
    ],
    corePositioning: "Your evidence covers $5,000 — but gaps put $1,400 at risk this week",
    upgrade: { targetTier: "starter", valueGap: 4500, benefits: ["Requirement matching", "Payment protection alerts", "Dispute prevention"], cta: "Upgrade to Starter" },
  },
  "mock-proj-003": {
    tier: "free",
    valueMetric: { label: "At Risk Value", amount: 4200, period: "week", description: "Value currently unprotected" },
    psychology: {
      scarcity: { message: "CRITICAL: 12 hours rejected — over half your project is unprotected", active: true },
      lossAversion: { message: "Without evidence, you could lose the full $4,200", value: 4200, active: true },
    },
    pillars: [
      { id: "ep-1", label: "Screenshots", value: "14", status: "vulnerable", description: "Far below recommended", dollarImpact: 510 },
      { id: "ep-2", label: "Memos", value: "3", status: "vulnerable", description: "Almost no context logged", dollarImpact: 510 },
      { id: "ep-3", label: "Activity Log", value: "38%", status: "vulnerable", description: "Critical coverage gap", dollarImpact: 340 },
      { id: "ep-4", label: "URL Trail", value: "5", status: "vulnerable", description: "Negligible tracking", dollarImpact: 340 },
    ],
    timelineEvents: [
      { id: "te-1", timestamp: Date.now() - 1 * 60 * 60 * 1000, description: "12h rejected — critical", riskLevel: "critical", impactValue: 1020, type: "compliance" },
      { id: "te-2", timestamp: Date.now() - 12 * 60 * 60 * 1000, description: "4-hour evidence gap", riskLevel: "high", impactValue: 595, type: "gap" },
      { id: "te-3", timestamp: Date.now() - 36 * 60 * 60 * 1000, description: "No memos for 3 sessions", riskLevel: "high", impactValue: 425, type: "evidence" },
    ],
    corePositioning: "Only 38% of your work has evidence — $4,200 is at immediate risk",
    upgrade: { targetTier: "starter", valueGap: 6800, benefits: ["Real-time compliance alerts", "Evidence gap detection", "Dispute preparation"], cta: "Upgrade to Starter" },
  },
  "mock-proj-004": {
    tier: "free",
    valueMetric: { label: "Evidence Value", amount: 5040, period: "week", description: "Value fully protected through evidence" },
    psychology: {
      authority: { message: "Top 3% of freelancers maintain this evidence quality", active: true },
    },
    pillars: [
      { id: "ep-1", label: "Screenshots", value: "58", status: "optimized", description: "Excellent frequency", dollarImpact: 2016 },
      { id: "ep-2", label: "Memos", value: "22", status: "protected", description: "Comprehensive context", dollarImpact: 1512 },
      { id: "ep-3", label: "Activity Log", value: "98%", status: "protected", description: "Near-perfect coverage", dollarImpact: 1008 },
      { id: "ep-4", label: "URL Trail", value: "45", status: "protected", description: "Full URL tracking", dollarImpact: 504 },
    ],
    timelineEvents: [
      { id: "te-1", timestamp: Date.now() - 3 * 60 * 60 * 1000, description: "Screenshot captured", riskLevel: "low", impactValue: 0, type: "evidence" },
      { id: "te-2", timestamp: Date.now() - 6 * 60 * 60 * 1000, description: "Memo added", riskLevel: "low", impactValue: 0, type: "evidence" },
    ],
    corePositioning: "Your evidence protects $5,040 — best-in-class coverage achieved",
    upgrade: { targetTier: "starter", valueGap: 500, benefits: ["Predictive risk analysis", "Auto-formalized scope changes", "Client requirement matching"], cta: "Upgrade to Starter" },
  },
  "mock-proj-005": {
    tier: "free",
    valueMetric: { label: "Evidence Value", amount: 2414, period: "week", description: "Value protected through evidence" },
    psychology: {
      scarcity: { message: "5 hours rejected — compliance is declining", active: true },
      lossAversion: { message: "Without action, $2,816 could be disputed", value: 2816, active: true },
    },
    pillars: [
      { id: "ep-1", label: "Screenshots", value: "24", status: "at_risk", description: "Below target frequency", dollarImpact: 725 },
      { id: "ep-2", label: "Memos", value: "6", status: "at_risk", description: "Missing context notes", dollarImpact: 725 },
      { id: "ep-3", label: "Activity Log", value: "55%", status: "at_risk", description: "Coverage declining", dollarImpact: 483 },
      { id: "ep-4", label: "URL Trail", value: "10", status: "vulnerable", description: "Minimal tracking", dollarImpact: 483 },
    ],
    timelineEvents: [
      { id: "te-1", timestamp: Date.now() - 2 * 60 * 60 * 1000, description: "5h rejected this week", riskLevel: "high", impactValue: 425, type: "compliance" },
      { id: "te-2", timestamp: Date.now() - 10 * 60 * 60 * 1000, description: "3-hour evidence gap", riskLevel: "medium", impactValue: 255, type: "gap" },
      { id: "te-3", timestamp: Date.now() - 24 * 60 * 60 * 1000, description: "Screenshot captured", riskLevel: "low", impactValue: 0, type: "evidence" },
    ],
    corePositioning: "55% coverage means nearly half your work is unprotected — act now",
    upgrade: { targetTier: "starter", valueGap: 5500, benefits: ["Instant compliance alerts", "Evidence gap detection", "Dispute preparation"], cta: "Upgrade to Starter" },
  },
};

// ---------------------------------------------------------------------------
// Risk Heatmap Data
// ---------------------------------------------------------------------------

export const mockRiskHeatmapData: Record<string, any> = {
  "mock-proj-001": {
    heatmap: {
      Monday: { 9: 1, 10: 0, 11: 0, 12: 2, 13: 0, 14: 1, 15: 0, 16: 0, 17: 3 },
      Tuesday: { 9: 0, 10: 1, 11: 0, 13: 0, 14: 2, 15: 0, 16: 1 },
      Wednesday: { 9: 0, 10: 0, 11: 1, 12: 0, 14: 0, 15: 0, 16: 0, 17: 1 },
      Thursday: { 9: 2, 10: 3, 11: 1, 13: 0, 14: 0, 15: 5, 16: 2, 17: 0 },
      Friday: { 9: 0, 10: 0, 11: 0, 13: 1, 14: 0, 15: 0 },
      Saturday: { 10: 1 },
      Sunday: {},
    },
    topRiskPeriods: [
      { day: "Thursday", hour: 15, riskLevel: "high", riskScore: 5 },
      { day: "Monday", hour: 17, riskLevel: "medium", riskScore: 3 },
      { day: "Thursday", hour: 10, riskLevel: "medium", riskScore: 3 },
      { day: "Monday", hour: 12, riskLevel: "medium", riskScore: 2 },
      { day: "Tuesday", hour: 14, riskLevel: "medium", riskScore: 2 },
    ],
    totalRiskEvents: 8,
  },
  "mock-proj-002": {
    heatmap: {
      Monday: { 9: 0, 10: 2, 11: 3, 12: 0, 14: 1, 15: 0, 16: 4 },
      Tuesday: { 9: 1, 10: 0, 11: 0, 12: 5, 13: 2, 14: 0, 15: 1 },
      Wednesday: { 9: 0, 10: 0, 11: 1, 12: 0, 14: 3, 15: 2, 16: 0 },
      Thursday: { 9: 0, 10: 1, 11: 0, 13: 0, 14: 0, 15: 0, 16: 1, 17: 0 },
      Friday: { 9: 3, 10: 2, 11: 0, 13: 4, 14: 1 },
      Saturday: { 9: 1 },
      Sunday: {},
    },
    topRiskPeriods: [
      { day: "Tuesday", hour: 12, riskLevel: "high", riskScore: 5 },
      { day: "Friday", hour: 13, riskLevel: "high", riskScore: 4 },
      { day: "Monday", hour: 16, riskLevel: "high", riskScore: 4 },
      { day: "Wednesday", hour: 14, riskLevel: "medium", riskScore: 3 },
      { day: "Monday", hour: 11, riskLevel: "medium", riskScore: 3 },
    ],
    totalRiskEvents: 14,
  },
  "mock-proj-003": {
    heatmap: {
      Monday: { 9: 3, 10: 4, 11: 2, 12: 1, 14: 5, 15: 3, 16: 2 },
      Tuesday: { 9: 2, 10: 5, 11: 3, 12: 4, 14: 1, 15: 6, 16: 3 },
      Wednesday: { 9: 1, 10: 2, 11: 0, 12: 3, 14: 4, 15: 2, 16: 1 },
      Thursday: { 9: 4, 10: 3, 11: 5, 12: 2, 14: 6, 15: 4, 16: 3 },
      Friday: { 9: 2, 10: 1, 11: 3, 12: 0, 14: 2, 15: 1 },
      Saturday: { 10: 2, 11: 1 },
      Sunday: {},
    },
    topRiskPeriods: [
      { day: "Thursday", hour: 14, riskLevel: "high", riskScore: 6 },
      { day: "Tuesday", hour: 15, riskLevel: "high", riskScore: 6 },
      { day: "Monday", hour: 14, riskLevel: "high", riskScore: 5 },
      { day: "Thursday", hour: 11, riskLevel: "high", riskScore: 5 },
      { day: "Tuesday", hour: 10, riskLevel: "high", riskScore: 5 },
    ],
    totalRiskEvents: 28,
  },
  "mock-proj-004": {
    heatmap: {
      Monday: { 9: 0, 10: 0, 11: 0, 12: 0, 14: 0, 15: 0, 16: 0, 17: 1 },
      Tuesday: { 9: 0, 10: 0, 11: 1, 12: 0, 14: 0, 15: 0, 16: 0 },
      Wednesday: { 9: 0, 10: 0, 11: 0, 12: 0, 14: 0, 15: 1 },
      Thursday: { 9: 0, 10: 0, 11: 0, 12: 0, 14: 0, 15: 0, 16: 0 },
      Friday: { 9: 0, 10: 1, 11: 0, 13: 0, 14: 0 },
      Saturday: {},
      Sunday: {},
    },
    topRiskPeriods: [
      { day: "Monday", hour: 17, riskLevel: "low", riskScore: 1 },
      { day: "Tuesday", hour: 11, riskLevel: "low", riskScore: 1 },
      { day: "Wednesday", hour: 15, riskLevel: "low", riskScore: 1 },
      { day: "Friday", hour: 10, riskLevel: "low", riskScore: 1 },
    ],
    totalRiskEvents: 1,
  },
  "mock-proj-005": {
    heatmap: {
      Monday: { 9: 1, 10: 0, 11: 2, 12: 0, 14: 3, 15: 1, 16: 0 },
      Tuesday: { 9: 0, 10: 2, 11: 0, 12: 1, 14: 0, 15: 3, 16: 2 },
      Wednesday: { 9: 1, 10: 0, 11: 1, 12: 0, 14: 2, 15: 0, 16: 1 },
      Thursday: { 9: 0, 10: 1, 11: 3, 12: 2, 14: 0, 15: 1, 16: 0 },
      Friday: { 9: 2, 10: 0, 11: 0, 13: 1, 14: 3, 15: 2 },
      Saturday: { 10: 1, 11: 0 },
      Sunday: {},
    },
    topRiskPeriods: [
      { day: "Monday", hour: 14, riskLevel: "medium", riskScore: 3 },
      { day: "Tuesday", hour: 15, riskLevel: "medium", riskScore: 3 },
      { day: "Thursday", hour: 11, riskLevel: "medium", riskScore: 3 },
      { day: "Friday", hour: 14, riskLevel: "medium", riskScore: 3 },
      { day: "Thursday", hour: 12, riskLevel: "medium", riskScore: 2 },
    ],
    totalRiskEvents: 16,
  },
};
