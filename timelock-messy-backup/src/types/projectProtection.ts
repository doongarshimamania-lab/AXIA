export type ProtectionStatus = 'low' | 'medium' | 'high';

export type ProtectionPillar = {
  id: string;
  label: string;
  description: string;
  valueDollar: number;
  statusLevel: ProtectionStatus;
  score: number; // 0-100
};

export type DarkPsychologyPrompt = {
  type: 'scarcity' | 'social_proof' | 'authority' | 'loss_aversion';
  message: string;
  highlight?: string;
  action?: string;
};

// Enhanced Timeline Types
export type TimelineRiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type TimelineEvent = {
  id: string;
  timestamp: number;
  description: string;
  riskLevel: TimelineRiskLevel;
  impactValue: number; // Dollar value
  type: 'gap' | 'compliance' | 'evidence' | 'pattern';
  context?: string;
};

export type TimelinePillar = {
  id: string;
  label: string;
  value: number; // Raw value (0-100 or count)
  displayValue: string; // Formatted string (e.g., "$120", "95%")
  description: string;
  status: 'protected' | 'at_risk' | 'vulnerable';
  dollarImpact: number;
};

export type PersuasionFlags = {
  scarcity: boolean;
  socialProof: boolean;
  lossAversion: boolean;
  authority: boolean;
  scarcityMessage?: string;
  socialProofMessage?: string;
  lossAversionMessage?: string;
  authorityMessage?: string;
};

export type BusinessMapNode = {
  id: string;
  label: string;
  type: 'project' | 'platform' | 'milestone' | 'income' | 'client';
  status: 'protected' | 'at_risk' | 'vulnerable';
  value: number;
  x: number;
  y: number;
  connections: string[];
  size?: string;
};

export type EvidencePillar = {
  id: string;
  label: string;
  value: string | number; // Can be "$120" or "95%"
  status: 'protected' | 'at_risk' | 'vulnerable' | 'optimized';
  description: string;
  dollarImpact?: number;
};

export type EvidenceTimelineData = {
  tier: 'free' | 'starter' | 'pro' | 'expert';
  
  // Core Value Metric
  valueMetric: {
    label: string;
    amount: number;
    period: 'week' | 'month';
    description: string;
  };

  // 4 Pillars per tier
  pillars: EvidencePillar[];

  // Visualization Data
  timelineEvents?: TimelineEvent[];
  businessMapNodes?: BusinessMapNode[];
  timelineSegments?: TimelineSegment[];
  
  // Psychology Elements
  psychology: {
    scarcity?: { message: string; active: boolean };
    socialProof?: { message: string; active: boolean };
    lossAversion?: { message: string; value: number; active: boolean };
    authority?: { message: string; active: boolean };
  };

  // Upgrade Path
  upgrade?: {
    targetTier: string;
    valueGap: number;
    benefits: string[];
    cta: string;
  };

  // Core Positioning
  corePositioning: string;
};

export type TimelineRiskData = {
  tier: 'free' | 'starter' | 'pro' | 'expert';
  
  // Value Metrics
  totalProtectedWeekly: number;
  totalProtectedMonthly: number;
  
  // Pillars (Structured by tier)
  pillars: {
    free: TimelinePillar[];
    starter?: TimelinePillar[];
    pro?: TimelinePillar[];
    expert?: TimelinePillar[];
  };
  
  // Interactive Data
  events: TimelineEvent[];
  businessMapNodes?: BusinessMapNode[];
  
  // Persuasion
  persuasion: PersuasionFlags;
  
  // Upgrade Path
  upgradePrompt?: {
    targetTier: string;
    valueGap: number;
    message: string;
  };

  // Core Positioning
  corePositioningMessage: string;
};

// Tier-specific interaction data types
export type EvidenceTimelineEntry = {
  id: string;
  time: string;
  status: 'verified' | 'missing' | 'partial';
  valueAtRisk: number;
};

export type RequirementMapping = {
  id: string;
  requirement: string;
  status: 'matched' | 'unmatched';
  evidenceCount: number;
  impactValue: number;
};

export type TimelineSegment = {
  id: string;
  label: string;
  start: number; // 0-100 percentage
  end: number; // 0-100 percentage
  riskLevel: 'low' | 'medium' | 'high';
  value: number;
};

export type CorePositioningStatus = {
  prevention: { status: boolean; label: string };
  protection: { status: boolean; label: string };
  noDenials: { status: boolean; label: string };
  hourlyProtection: { status: boolean; label: string };
};

export type ProjectProtectionScoreData = {
  score: number;
  tier: string;
  pillars: ProtectionPillar[];
  valueProtection: number;
  upgradeMessage: string | null;
  upgradeValueGap: number | null;
  darkPsychology?: DarkPsychologyPrompt;
  corePositioning?: CorePositioningStatus;
  
  // Tier specific interaction data
  evidenceTimeline?: EvidenceTimelineEntry[];
  requirementMappings?: RequirementMapping[];
  timelineSegments?: TimelineSegment[];
  businessMapNodes?: BusinessMapNode[];
  
  // Legacy support for transition (optional)
  metrics?: { name: string; value: string }[];
  platformAnalysis?: any;
  businessInsights?: any;
};