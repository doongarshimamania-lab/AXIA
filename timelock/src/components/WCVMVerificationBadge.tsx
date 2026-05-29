import { motion } from "framer-motion";
import { Shield, CheckCircle, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface WCVMVerificationBadgeProps {
  contextRelevanceScore: number;
  requirementMatches: Array<{
    requirementId: string;
    description: string;
    relevanceScore: number;
    matchedEvidence: string[];
  }>;
  contextGaps: Array<{
    gap: string;
    impact: string;
    fix: string;
  }>;
  verificationSignature?: string;
}

export function WCVMVerificationBadge({
  contextRelevanceScore,
  requirementMatches,
  contextGaps,
  verificationSignature,
}: WCVMVerificationBadgeProps) {
  const getScoreColor = (score: number) => {
    if (score >= 85) return "text-emerald-600 dark:text-emerald-400";
    if (score >= 70) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getScoreBg = (score: number) => {
    if (score >= 85) return "from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900";
    if (score >= 70) return "from-yellow-50 to-yellow-100 dark:from-yellow-950 dark:to-yellow-900";
    return "from-red-50 to-red-100 dark:from-red-950 dark:to-red-900";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={`bg-gradient-to-br ${getScoreBg(contextRelevanceScore)} border-2`}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5" />
            Work Context Verification
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Context Score */}
          <div className="flex items-center gap-4">
            <div className={`text-5xl font-bold font-[Space_Grotesk] ${getScoreColor(contextRelevanceScore)}`}>
              {contextRelevanceScore}
              <span className="text-2xl">/100</span>
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium mb-1">Context relevance score</div>
              <Progress value={contextRelevanceScore} className="h-2" />
            </div>
          </div>

          {/* Verification Matrix */}
          <div className="bg-background rounded-lg p-3 space-y-2">
            <div className="text-sm font-medium mb-2">Context Verification Matrix</div>
            {requirementMatches.map((req) => (
              <div key={req.requirementId} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium">{req.description}</span>
                  <span className={getScoreColor(req.relevanceScore)}>
                    {req.relevanceScore}/100
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={req.relevanceScore} className="h-2 flex-1" />
                </div>
                {req.matchedEvidence.length > 0 && (
                  <div className="text-xs text-muted-foreground ml-1">
                    {req.matchedEvidence.join(", ")}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Context Gaps */}
          {contextGaps.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                Context Gaps Identified
              </div>
              {contextGaps.map((gap, idx) => (
                <div key={idx} className="bg-background rounded-lg p-2 text-xs space-y-1">
                  <div className="font-medium text-yellow-600">{gap.gap}</div>
                  <div className="text-muted-foreground">Impact: {gap.impact}</div>
                  <div className="text-emerald-600">Fix: {gap.fix}</div>
                </div>
              ))}
            </div>
          )}

          {/* Verification Badge */}
          <div className="flex items-center gap-2 p-2 bg-sky-50 dark:bg-sky-950 rounded-lg">
            <CheckCircle className="h-4 w-4 text-emerald-600" />
            <div className="text-xs text-sky-900 dark:text-sky-100">
              Verified by Axia Context Standard 1.0
            </div>
          </div>

          {verificationSignature && (
            <div className="text-xs text-muted-foreground font-mono truncate">
              Signature: {verificationSignature}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
