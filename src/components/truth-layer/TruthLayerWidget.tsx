import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Shield,
  Clock,
  DollarSign,
  FileText,
  MessageSquare,
  ArrowRight,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useNavigate } from "react-router";
import { TruthLayerBadge } from "./TruthLayerBadge";
import {
  buildTruthLayerScores,
  getVerificationStatus,
  getScoreColor,
  getScoreBgColor,
  type TruthLayerScores,
  type VerificationCategory,
  type Recommendation,
} from "./truthLayerHelpers";

// ─── Icon Helper ────────────────────────────────────────────────────────────

function getCategoryIcon(iconName: string, className: string) {
  switch (iconName) {
    case "Shield":
      return <Shield className={className} />;
    case "Clock":
      return <Clock className={className} />;
    case "DollarSign":
      return <DollarSign className={className} />;
    case "FileText":
      return <FileText className={className} />;
    case "MessageSquare":
      return <MessageSquare className={className} />;
    default:
      return <Shield className={className} />;
  }
}

// ─── Circular Progress Indicator ────────────────────────────────────────────

function CircularScore({ score, size = 120 }: { score: number; size?: number }) {
  const strokeWidth = size > 100 ? 8 : 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const status = getVerificationStatus(score);

  const strokeColor =
    status === "verified"
      ? "#10b981" // emerald-500
      : status === "partial"
      ? "#f59e0b" // amber-500
      : "#94a3b8"; // slate-400

  const glowColor =
    status === "verified"
      ? "rgba(16, 185, 129, 0.15)"
      : status === "partial"
      ? "rgba(245, 158, 11, 0.15)"
      : "rgba(148, 163, 184, 0.1)";

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* Glow effect */}
      <div
        className="absolute inset-0 rounded-full blur-xl"
        style={{ backgroundColor: glowColor }}
      />
      <svg className="transform -rotate-90" width={size} height={size}>
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/30"
        />
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </svg>
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className={`text-2xl font-bold ${getScoreColor(score)}`}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          {score}%
        </motion.span>
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
          Verified
        </span>
      </div>
    </div>
  );
}

// ─── Category Row ───────────────────────────────────────────────────────────

function CategoryRow({
  category,
  index,
}: {
  category: VerificationCategory;
  index: number;
}) {
  const status = getVerificationStatus(category.score);
  const needsAttention = category.score < 75;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.08 }}
      className="space-y-2"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className={`h-7 w-7 rounded-md flex items-center justify-center ${
              status === "verified"
                ? "bg-emerald-500/10"
                : status === "partial"
                ? "bg-amber-500/10"
                : "bg-slate-400/10"
            }`}
          >
            {getCategoryIcon(
              category.icon,
              `h-3.5 w-3.5 ${
                status === "verified"
                  ? "text-emerald-500"
                  : status === "partial"
                  ? "text-amber-500"
                  : "text-slate-400"
              }`
            )}
          </div>
          <div>
            <div className="text-sm font-medium text-foreground">{category.label}</div>
            <div className="text-[11px] text-muted-foreground">
              {category.verified}/{category.total} verified
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {needsAttention && (
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
          )}
          <span className={`text-sm font-bold ${getScoreColor(category.score)}`}>
            {category.score}%
          </span>
        </div>
      </div>
      <Progress
        value={category.score}
        className={`h-1.5 ${
          status === "verified"
            ? "[&>div]:bg-emerald-500"
            : status === "partial"
            ? "[&>div]:bg-amber-500"
            : "[&>div]:bg-slate-400"
        }`}
      />
    </motion.div>
  );
}

// ─── Recommendation Card ────────────────────────────────────────────────────

function RecommendationCard({
  rec,
  index,
  onNavigate,
}: {
  rec: Recommendation;
  index: number;
  onNavigate: (route: string) => void;
}) {
  const priorityColor =
    rec.priority === "high"
      ? "text-red-500 bg-red-500/10"
      : rec.priority === "medium"
      ? "text-amber-500 bg-amber-500/10"
      : "text-slate-500 bg-slate-500/10";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.5 + index * 0.08 }}
      className="flex items-start gap-2.5 p-2.5 rounded-lg bg-background/60 border border-border/50"
    >
      <div className={`flex-shrink-0 mt-0.5 h-5 w-5 rounded flex items-center justify-center text-[9px] font-bold ${priorityColor}`}>
        !
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-foreground leading-relaxed">{rec.message}</p>
        <Button
          variant="link"
          size="sm"
          className="h-auto p-0 mt-1 text-[#4F46E5] hover:text-[#4338CA] text-xs gap-1"
          onClick={() => onNavigate(rec.actionRoute)}
        >
          {rec.actionLabel}
          <ArrowRight className="h-3 w-3" />
        </Button>
      </div>
    </motion.div>
  );
}

// ─── Props ──────────────────────────────────────────────────────────────────

export interface TruthLayerWidgetProps {
  /** Raw data for score calculation (uses mock data if not provided) */
  data?: {
    timeEntries?: any[];
    invoices?: any[];
    scopes?: any[];
    messages?: any[];
  };
  /** Optional compact mode for sidebar usage */
  compact?: boolean;
  /** Optional className */
  className?: string;
}

// ─── Mock Data for Demo ─────────────────────────────────────────────────────

const MOCK_TIME_ENTRIES = [
  { screenshotCount: 12, mouseActivity: true, keyboardActivity: true, hasMemo: true, complianceStatus: "compliant", description: "Code review" },
  { screenshotCount: 8, mouseActivity: true, keyboardActivity: false, hasMemo: false, complianceStatus: "at_risk", description: "" },
  { screenshotCount: 2, mouseActivity: false, keyboardActivity: false, hasMemo: false, complianceStatus: "rejected", description: "" },
  { screenshotCount: 5, mouseActivity: true, keyboardActivity: true, hasMemo: true, complianceStatus: "compliant", description: "Spec writing" },
];

const MOCK_INVOICES = [
  { proofCount: 3, hasValidatedBilling: true, status: "paid", lineItems: [{ hasProof: true }] },
  { proofCount: 1, hasValidatedBilling: false, status: "sent", lineItems: [{ hasProof: false }] },
  { proofCount: 0, hasValidatedBilling: false, status: "draft", lineItems: [{ hasProof: false }] },
  { proofCount: 2, hasValidatedBilling: true, status: "paid", lineItems: [{ hasProof: true }, { hasProof: true }] },
  { proofCount: 0, hasValidatedBilling: false, status: "overdue", lineItems: [{ hasProof: false }] },
];

const MOCK_SCOPES = [
  { clientApprovedAt: Date.now() - 30 * 24 * 60 * 60 * 1000, status: "active", deliverables: [{ name: "Homepage" }, { name: "Product Pages" }] },
  { clientApprovedAt: undefined, status: "active", deliverables: [{ name: "Auth System" }, { name: "Task CRUD" }] },
  { clientApprovedAt: Date.now() - 10 * 24 * 60 * 60 * 1000, status: "completed", deliverables: [{ name: "Logo" }, { name: "Brand Guide" }] },
];

// ─── Main Component ─────────────────────────────────────────────────────────

export function TruthLayerWidget({
  data,
  compact = false,
  className = "",
}: TruthLayerWidgetProps) {
  const navigate = useNavigate();

  const scores: TruthLayerScores = useMemo(() => {
    return buildTruthLayerScores({
      timeEntries: data?.timeEntries ?? MOCK_TIME_ENTRIES,
      invoices: data?.invoices ?? MOCK_INVOICES,
      scopes: data?.scopes ?? MOCK_SCOPES,
      messages: data?.messages ?? [],
    });
  }, [data]);

  const status = getVerificationStatus(scores.overall);
  const statusLabel =
    status === "verified"
      ? "Fully Verified"
      : status === "partial"
      ? "Partially Verified"
      : "Unverified";

  const statusColor =
    status === "verified"
      ? "text-emerald-500"
      : status === "partial"
      ? "text-amber-500"
      : "text-slate-400";

  const handleNavigate = (route: string) => {
    navigate(route);
  };

  if (compact) {
    return (
      <Card className={`overflow-hidden ${className}`}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-[#4F46E5]" />
              <span className="text-sm">Truth Layer</span>
            </div>
            <TruthLayerBadge score={scores.overall} size="sm" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {scores.categories.slice(1).map((cat, idx) => (
            <div key={cat.label} className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{cat.label}</span>
              <span className={`text-xs font-bold ${getScoreColor(cat.score)}`}>
                {cat.score}%
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card
        className={`overflow-hidden border border-[#4F46E5]/20 bg-gradient-to-br from-[#4F46E5]/5 via-background to-[#4F46E5]/3 backdrop-blur-sm ${className}`}
      >
        {/* Header */}
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-[#4F46E5]/10 flex items-center justify-center">
                <Shield className="h-4.5 w-4.5 text-[#4F46E5]" />
              </div>
              <div>
                <div className="text-base font-bold text-foreground">Truth Layer</div>
                <div className="text-[11px] text-muted-foreground">
                  Verification Engine
                </div>
              </div>
            </div>
            <TruthLayerBadge
              score={scores.overall}
              label={statusLabel}
              size="md"
              showScore={true}
            />
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Overall Score + Categories */}
          <div className="flex gap-6">
            {/* Circular Progress */}
            <div className="flex-shrink-0">
              <CircularScore score={scores.overall} size={120} />
            </div>

            {/* Category Breakdown */}
            <div className="flex-1 space-y-3 min-w-0">
              {scores.categories.map((cat, idx) => (
                <CategoryRow key={cat.label} category={cat} index={idx} />
              ))}
            </div>
          </div>

          <Separator className="bg-border/50" />

          {/* Recommendations */}
          {scores.recommendations.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-4 w-4 text-[#4F46E5]" />
                <h4 className="text-sm font-semibold text-foreground">
                  Strengthen Your Truth Layer
                </h4>
              </div>
              <div className="space-y-2">
                {scores.recommendations.slice(0, 3).map((rec, idx) => (
                  <RecommendationCard
                    key={rec.id}
                    rec={rec}
                    index={idx}
                    onNavigate={handleNavigate}
                  />
                ))}
              </div>
            </div>
          )}

          {/* All Good State */}
          {scores.recommendations.length === 0 && (
            <div className="text-center py-3">
              <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-2">
                <Shield className="h-5 w-5 text-emerald-500" />
              </div>
              <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                Your Truth Layer is fully verified!
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                All categories have strong verification scores
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
