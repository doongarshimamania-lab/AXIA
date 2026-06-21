import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Brain, AlertTriangle, CheckCircle, RefreshCw, Lock } from "lucide-react";
import { toast } from "sonner";

interface RiskFactor {
  type: string;
  description: string;
  timestamp: number;
  severity: "low" | "medium" | "high";
  recommendation: string;
}

interface AIDisputePredictionProps {
  subscriptionTier?: "free" | "starter" | "pro" | "expert" | "client";
  riskScore?: number;
  riskLevel?: "low" | "medium" | "high";
  riskFactors?: RiskFactor[];
  lastAnalyzed?: number;
  onAnalyze?: () => void;
  onApplyRecommendation?: (recommendationId: string) => void;
  onUpgrade?: () => void;
}

export function AIDisputePrediction({
  subscriptionTier = "free",
  riskScore = 45,
  riskLevel = "medium",
  riskFactors = [],
  lastAnalyzed = Date.now() - 2 * 60 * 60 * 1000,
  onAnalyze,
  onApplyRecommendation,
  onUpgrade,
}: AIDisputePredictionProps) {
  // PRO+ feature
  const hasAccess = subscriptionTier === "pro" || subscriptionTier === "expert";

  const handleAnalyze = async () => {
    try {
      const evidencePayload = {
        riskLevel,
        riskScore,
        factors: (riskFactors ?? []).slice(0, 3),
      };
      const res = await fetch("/api/ai/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          evidence: JSON.stringify(evidencePayload),
          clientContext: "",
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Prediction failed");
      }
      const data = await res.json();
      const preview =
        data?.prediction?.slice?.(0, 200) ??
        "Prediction complete. Check logs for full output.";
      toast("AI Prediction", { description: preview });
    } catch (e: any) {
      toast("Prediction failed", { description: e?.message ?? "Unexpected error" });
    }
  };

  const getRiskColor = () => {
    switch (riskLevel) {
      case "high":
        return "text-destructive";
      case "medium":
        return "text-orange-500";
      case "low":
        return "text-emerald-500";
      default:
        return "text-muted-foreground";
    }
  };

  const getRiskBarColor = () => {
    switch (riskLevel) {
      case "high":
        return "bg-destructive";
      case "medium":
        return "bg-orange-500";
      case "low":
        return "bg-emerald-500";
      default:
        return "bg-muted";
    }
  };

  const formatTimeAgo = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return "Just now";
    if (hours === 1) return "1 hour ago";
    return `${hours} hours ago`;
  };

  // Mock risk factors for demo
  const mockRiskFactors: RiskFactor[] = [
    {
      type: "activity_gap",
      description: "Your recent Upwork session shows 2 gaps >30s during critical client communication period (10:15-10:45 AM)",
      timestamp: Date.now() - 3 * 60 * 60 * 1000,
      severity: "medium",
      recommendation: "Add 2 manual screenshots during client comms periods",
    },
  ];

  const displayFactors = riskFactors.length > 0 ? riskFactors : mockRiskFactors;

  // Locked state for FREE/STARTER
  if (!hasAccess) {
    return (
      <Card className="p-6 bg-card rounded-xl border border-border relative overflow-hidden">
        <div className="absolute inset-0 bg-muted/50 backdrop-blur-sm z-10 flex items-center justify-center">
          <div className="text-center p-6 bg-card rounded-lg border border-border shadow-lg max-w-sm">
            <Lock className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
            <h4 className="font-bold text-lg mb-2">AI Dispute Prediction</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Upgrade to Pro to get AI-powered dispute predictions and proactive recommendations
            </p>
            <Button onClick={onUpgrade} className="w-full">
              Upgrade to Pro
            </Button>
          </div>
        </div>

        <div className="filter blur-sm pointer-events-none">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Brain className="w-6 h-6 text-primary mr-2" />
              <h3 className="font-[Space_Grotesk] font-bold text-xl text-foreground">AI Dispute Prediction</h3>
            </div>
            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
              Axia AI
            </span>
          </div>
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg h-24" />
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-card rounded-xl border border-border">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <Brain className="w-6 h-6 text-primary mr-2" />
          <h3 className="font-[Space_Grotesk] font-bold text-xl text-foreground">AI Dispute Prediction</h3>
        </div>
        <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
          Axia AI
        </span>
      </div>

      <div className="mb-5">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-muted-foreground">Risk Level</span>
          <span className={`font-medium ${getRiskColor()}`}>
            {riskLevel.charAt(0).toUpperCase() + riskLevel.slice(1)} Risk
          </span>
        </div>
        <div className="w-full bg-muted rounded-full h-2.5">
          <div
            className={`${getRiskBarColor()} h-2.5 rounded-full transition-all duration-300`}
            style={{ width: `${riskScore}%` }}
          ></div>
        </div>
      </div>

      <div className="space-y-4 mb-5">
        {displayFactors.map((factor, index) => (
          <div key={index} className="p-4 bg-muted rounded-lg border border-border/50">
            <div className="flex items-start">
              <AlertTriangle className="w-5 h-5 text-orange-500 mt-1 mr-2 flex-shrink-0" />
              <div>
                <h4 className="font-medium mb-1 text-foreground">Potential Issue Detected</h4>
                <p className="text-sm text-muted-foreground">{factor.description}</p>
              </div>
            </div>
            <div className="mt-3 pl-7">
              <p className="text-sm text-foreground">
                <span className="font-medium">AI Recommendation:</span> {factor.recommendation}
              </p>
              <Button
                variant="link"
                className="mt-2 text-xs text-primary hover:underline p-0 h-auto"
                onClick={() => onApplyRecommendation?.(factor.type)}
              >
                Implement Recommendation
              </Button>
            </div>
          </div>
        ))}

        <div className="p-4 bg-muted rounded-lg border border-border/50">
          <div className="flex items-start">
            <CheckCircle className="w-5 h-5 text-emerald-500 mt-1 mr-2 flex-shrink-0" />
            <div>
              <h4 className="font-medium mb-1 text-foreground">Successful Prevention</h4>
              <p className="text-sm text-muted-foreground">
                Last week's potential dispute was prevented by your timely screenshots
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <div className="text-sm">
          <span className="text-muted-foreground">Last analyzed:</span>{" "}
          <span className="text-foreground">{formatTimeAgo(lastAnalyzed)}</span>
        </div>
        <Button
          variant="link"
          className="text-xs text-primary hover:underline flex items-center p-0 h-auto"
          onClick={onAnalyze ?? handleAnalyze}
        >
          <RefreshCw className="w-3 h-3 mr-1" />
          Analyze Now
        </Button>
      </div>

      <div className="mt-4 p-3 bg-accent/50 rounded-md">
        <p className="text-sm text-foreground">
          <span className="font-medium">Why this matters:</span> Premium users with AI predictions see 27%
          fewer disputes than those without
        </p>
      </div>
    </Card>
  );
}