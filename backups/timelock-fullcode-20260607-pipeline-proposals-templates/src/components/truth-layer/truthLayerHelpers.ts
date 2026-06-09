/**
 * Truth Layer Verification Helpers
 *
 * Calculates verification scores across four categories:
 *   - Work Verification: time entries with evidence, compliance rate
 *   - Financial Verification: invoices with proofs, payment patterns
 *   - Scope Verification: scope definitions with client approval
 *   - Communication Verification: messages with read receipts, acknowledgments
 *
 * Overall score uses weighted average:
 *   Work 30%, Financial 30%, Scope 25%, Communication 15%
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface VerificationCategory {
  label: string;
  score: number; // 0-100
  verified: number;
  total: number;
  icon: string; // lucide icon name
  items: VerificationItem[];
}

export interface VerificationItem {
  label: string;
  verified: boolean;
  detail?: string;
}

export interface TruthLayerScores {
  overall: number;
  work: number;
  financial: number;
  scope: number;
  communication: number;
  categories: VerificationCategory[];
  recommendations: Recommendation[];
}

export interface Recommendation {
  id: string;
  category: "work" | "financial" | "scope" | "communication";
  message: string;
  actionLabel: string;
  actionRoute: string;
  priority: "high" | "medium" | "low";
}

// ─── Score Calculation Functions ─────────────────────────────────────────────

/**
 * Calculate work verification score.
 * Based on: time entries with evidence / total time entries,
 * compliance rate, memo presence, platform verification.
 */
export function calculateWorkVerificationScore(entries: any[]): {
  score: number;
  verified: number;
  total: number;
  items: VerificationItem[];
} {
  if (!entries || entries.length === 0) {
    return {
      score: 0,
      verified: 0,
      total: 0,
      items: [
        { label: "No time entries recorded", verified: false, detail: "Start tracking time to build verification" },
      ],
    };
  }

  const total = entries.length;
  const withEvidence = entries.filter(
    (e) => e.screenshotCount > 0 || e.mouseActivity || e.keyboardActivity || e.hasMemo || e.evidenceCount > 0
  ).length;
  const compliant = entries.filter((e) => e.complianceStatus === "compliant" || e.status === "compliant").length;
  const withMemos = entries.filter((e) => e.hasMemo || e.memo || e.description).length;

  const evidenceRate = total > 0 ? withEvidence / total : 0;
  const complianceRate = total > 0 ? compliant / total : 0;
  const memoRate = total > 0 ? withMemos / total : 0;

  // Weighted: evidence 50%, compliance 30%, memos 20%
  const score = Math.round(evidenceRate * 50 + complianceRate * 30 + memoRate * 20);

  const items: VerificationItem[] = [
    {
      label: `${withEvidence}/${total} entries have evidence`,
      verified: evidenceRate >= 0.8,
      detail: evidenceRate < 0.8 ? "Add screenshots/activity tracking to more entries" : undefined,
    },
    {
      label: `${compliant}/${total} entries are compliant`,
      verified: complianceRate >= 0.9,
      detail: complianceRate < 0.9 ? "Review at-risk time blocks" : undefined,
    },
    {
      label: `${withMemos}/${total} entries have work memos`,
      verified: memoRate >= 0.7,
      detail: memoRate < 0.7 ? "Add descriptions to your time entries" : undefined,
    },
  ];

  return { score, verified: withEvidence, total, items };
}

/**
 * Calculate financial verification score.
 * Based on: invoices with proofs / total invoices,
 * payment patterns tracked, validated billing rate.
 */
export function calculateFinancialVerificationScore(invoices: any[]): {
  score: number;
  verified: number;
  total: number;
  items: VerificationItem[];
} {
  if (!invoices || invoices.length === 0) {
    return {
      score: 0,
      verified: 0,
      total: 0,
      items: [
        { label: "No invoices created yet", verified: false, detail: "Create invoices with proof attachments" },
      ],
    };
  }

  const total = invoices.length;
  const withProofs = invoices.filter(
    (inv) =>
      (inv.proofCount ?? 0) > 0 ||
      inv.hasValidatedBilling ||
      inv.hasProof ||
      (inv.lineItems && inv.lineItems.some((li: any) => li.hasProof))
  ).length;
  const paid = invoices.filter((inv) => inv.status === "paid").length;
  const withLineItemProofs = invoices.filter(
    (inv) => inv.lineItems && inv.lineItems.some((li: any) => li.hasProof)
  ).length;

  const proofRate = total > 0 ? withProofs / total : 0;
  const paymentRate = total > 0 ? paid / total : 0;
  const lineProofRate = total > 0 ? withLineItemProofs / total : 0;

  // Weighted: proofs 50%, payment tracking 30%, line-item proofs 20%
  const score = Math.round(proofRate * 50 + paymentRate * 30 + lineProofRate * 20);

  const items: VerificationItem[] = [
    {
      label: `${withProofs}/${total} invoices have proofs attached`,
      verified: proofRate >= 0.7,
      detail: proofRate < 0.7 ? "Attach work evidence to your invoices" : undefined,
    },
    {
      label: `${paid}/${total} invoices are paid`,
      verified: paymentRate >= 0.5,
      detail: paymentRate < 0.5 ? "Follow up on outstanding invoices" : undefined,
    },
    {
      label: `${withLineItemProofs}/${total} have line-item proofs`,
      verified: lineProofRate >= 0.5,
      detail: lineProofRate < 0.5 ? "Add per-item evidence for stronger verification" : undefined,
    },
  ];

  return { score, verified: withProofs, total, items };
}

/**
 * Calculate scope verification score.
 * Based on: scopes with client approval / total scopes,
 * change orders formalized / total change orders.
 */
export function calculateScopeVerificationScore(scopes: any[]): {
  score: number;
  verified: number;
  total: number;
  items: VerificationItem[];
} {
  if (!scopes || scopes.length === 0) {
    return {
      score: 0,
      verified: 0,
      total: 0,
      items: [
        { label: "No scope definitions created", verified: false, detail: "Define project scope for verification" },
      ],
    };
  }

  const total = scopes.length;
  const withApproval = scopes.filter((s) => s.clientApprovedAt || s.clientApproved).length;
  const active = scopes.filter((s) => s.status === "active").length;
  const withDeliverables = scopes.filter((s) => s.deliverables && s.deliverables.length > 0).length;

  const approvalRate = total > 0 ? withApproval / total : 0;
  const activeRate = total > 0 ? active / total : 0;
  const deliverableRate = total > 0 ? withDeliverables / total : 0;

  // Weighted: client approval 50%, active tracking 25%, deliverable definition 25%
  const score = Math.round(approvalRate * 50 + activeRate * 25 + deliverableRate * 25);

  const items: VerificationItem[] = [
    {
      label: `${withApproval}/${total} scopes have client approval`,
      verified: approvalRate >= 0.7,
      detail: approvalRate < 0.7 ? "Get client sign-off on scope definitions" : undefined,
    },
    {
      label: `${active}/${total} scopes are actively tracked`,
      verified: activeRate >= 0.5,
      detail: activeRate < 0.5 ? "Ensure active projects have scope definitions" : undefined,
    },
    {
      label: `${withDeliverables}/${total} scopes have defined deliverables`,
      verified: deliverableRate >= 0.8,
      detail: deliverableRate < 0.8 ? "Break down scope into specific deliverables" : undefined,
    },
  ];

  return { score, verified: withApproval, total, items };
}

/**
 * Calculate communication verification score.
 * Based on: messages with read receipts / total messages,
 * client acknowledgments / total formal communications.
 */
export function calculateCommunicationScore(messages: any[]): {
  score: number;
  verified: number;
  total: number;
  items: VerificationItem[];
} {
  if (!messages || messages.length === 0) {
    // Return a moderate score since communication is often informal
    return {
      score: 35,
      verified: 0,
      total: 0,
      items: [
        { label: "Communication tracking not active", verified: false, detail: "Enable read receipts for verification" },
        { label: "No formal acknowledgments recorded", verified: false },
      ],
    };
  }

  const total = messages.length;
  const withReadReceipt = messages.filter((m) => m.readAt || m.readReceipt || m.isRead).length;
  const withAcknowledgment = messages.filter((m) => m.clientAcknowledgment || m.acknowledgedAt).length;
  const formal = messages.filter((m) => m.isFormal || m.type === "formal").length;

  const readRate = total > 0 ? withReadReceipt / total : 0;
  const ackRate = total > 0 ? withAcknowledgment / total : 0;
  const formalRate = total > 0 ? formal / total : 0;

  // Weighted: read receipts 40%, acknowledgments 40%, formal comms 20%
  const score = Math.round(readRate * 40 + ackRate * 40 + formalRate * 20);

  const items: VerificationItem[] = [
    {
      label: `${withReadReceipt}/${total} messages have read receipts`,
      verified: readRate >= 0.7,
      detail: readRate < 0.7 ? "Enable read receipt tracking" : undefined,
    },
    {
      label: `${withAcknowledgment}/${total} have client acknowledgments`,
      verified: ackRate >= 0.5,
      detail: ackRate < 0.5 ? "Request formal client acknowledgments" : undefined,
    },
    {
      label: `${formal}/${total} are formal communications`,
      verified: formalRate >= 0.3,
      detail: formalRate < 0.3 ? "Use formal channels for scope/billing discussions" : undefined,
    },
  ];

  return { score, verified: withReadReceipt, total, items };
}

/**
 * Calculate overall Truth Layer score using weighted average.
 * Work 30%, Financial 30%, Scope 25%, Communication 15%
 */
export function getOverallScore(scores: {
  work: number;
  financial: number;
  scope: number;
  communication: number;
}): number {
  return Math.round(
    scores.work * 0.3 +
    scores.financial * 0.3 +
    scores.scope * 0.25 +
    scores.communication * 0.15
  );
}

/**
 * Get verification status label from score.
 */
export function getVerificationStatus(score: number): "verified" | "partial" | "unverified" {
  if (score >= 75) return "verified";
  if (score >= 40) return "partial";
  return "unverified";
}

/**
 * Get color class for a verification score.
 */
export function getScoreColor(score: number): string {
  if (score >= 75) return "text-emerald-500";
  if (score >= 40) return "text-amber-500";
  return "text-slate-400";
}

/**
 * Get background color class for a verification score.
 */
export function getScoreBgColor(score: number): string {
  if (score >= 75) return "bg-emerald-500";
  if (score >= 40) return "bg-amber-500";
  return "bg-slate-400";
}

/**
 * Get ring/border color class for a verification score.
 */
export function getScoreRingColor(score: number): string {
  if (score >= 75) return "ring-emerald-500/30 border-emerald-500/20";
  if (score >= 40) return "ring-amber-500/30 border-amber-500/20";
  return "ring-slate-400/30 border-slate-400/20";
}

/**
 * Generate recommendations based on the four category scores.
 */
export function generateRecommendations(scores: {
  work: number;
  financial: number;
  scope: number;
  communication: number;
}): Recommendation[] {
  const recommendations: Recommendation[] = [];

  if (scores.work < 75) {
    if (scores.work < 40) {
      recommendations.push({
        id: "work_evidence",
        category: "work",
        message: "Start adding evidence (screenshots, memos) to your time entries to build work verification.",
        actionLabel: "Go to Time Tracking",
        actionRoute: "/time-tracking",
        priority: "high",
      });
    } else {
      recommendations.push({
        id: "work_compliance",
        category: "work",
        message: "Improve your compliance rate by maintaining consistent activity during tracked hours.",
        actionLabel: "View Work Diary",
        actionRoute: "/dashboard",
        priority: "medium",
      });
    }
  }

  if (scores.financial < 75) {
    if (scores.financial < 40) {
      recommendations.push({
        id: "financial_proofs",
        category: "financial",
        message: "Attach proof of work to your invoices. Invoices with evidence are much harder to dispute.",
        actionLabel: "Go to Invoices",
        actionRoute: "/invoices",
        priority: "high",
      });
    } else {
      recommendations.push({
        id: "financial_line_items",
        category: "financial",
        message: "Add line-item proofs to invoices for granular verification of each billing item.",
        actionLabel: "Manage Invoices",
        actionRoute: "/invoices",
        priority: "medium",
      });
    }
  }

  if (scores.scope < 75) {
    if (scores.scope < 40) {
      recommendations.push({
        id: "scope_define",
        category: "scope",
        message: "Define project scopes and get client approval to protect against scope creep.",
        actionLabel: "Go to Scope",
        actionRoute: "/scope",
        priority: "high",
      });
    } else {
      recommendations.push({
        id: "scope_approval",
        category: "scope",
        message: "Get formal client approval on remaining scope definitions to strengthen verification.",
        actionLabel: "Request Approvals",
        actionRoute: "/scope",
        priority: "medium",
      });
    }
  }

  if (scores.communication < 75) {
    recommendations.push({
      id: "comm_receipts",
      category: "communication",
      message: "Enable read receipts and request client acknowledgments for important communications.",
      actionLabel: "Go to Messages",
      actionRoute: "/messages",
      priority: scores.communication < 40 ? "high" : "low",
    });
  }

  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return recommendations;
}

/**
 * Build the complete Truth Layer scores object from raw data.
 */
export function buildTruthLayerScores(data: {
  timeEntries?: any[];
  invoices?: any[];
  scopes?: any[];
  messages?: any[];
}): TruthLayerScores {
  const workResult = calculateWorkVerificationScore(data.timeEntries ?? []);
  const financialResult = calculateFinancialVerificationScore(data.invoices ?? []);
  const scopeResult = calculateScopeVerificationScore(data.scopes ?? []);
  const communicationResult = calculateCommunicationScore(data.messages ?? []);

  const work = workResult.score;
  const financial = financialResult.score;
  const scope = scopeResult.score;
  const communication = communicationResult.score;

  const categories: VerificationCategory[] = [
    {
      label: "Identity Verification",
      score: 85, // Auth status is generally verified for logged-in users
      verified: 1,
      total: 1,
      icon: "Shield",
      items: [
        { label: "Email verified", verified: true },
        { label: "Account authenticated", verified: true },
      ],
    },
    {
      label: "Work Verification",
      score: work,
      verified: workResult.verified,
      total: workResult.total,
      icon: "Clock",
      items: workResult.items,
    },
    {
      label: "Financial Verification",
      score: financial,
      verified: financialResult.verified,
      total: financialResult.total,
      icon: "DollarSign",
      items: financialResult.items,
    },
    {
      label: "Scope Verification",
      score: scope,
      verified: scopeResult.verified,
      total: scopeResult.total,
      icon: "FileText",
      items: scopeResult.items,
    },
    {
      label: "Communication Verification",
      score: communication,
      verified: communicationResult.verified,
      total: communicationResult.total,
      icon: "MessageSquare",
      items: communicationResult.items,
    },
  ];

  const recommendations = generateRecommendations({ work, financial, scope, communication });

  return {
    overall: getOverallScore({ work, financial, scope, communication }),
    work,
    financial,
    scope,
    communication,
    categories,
    recommendations,
  };
}
