import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, AlertTriangle } from "lucide-react";

interface EvidenceHealthScoreProps {
  protectedHours: number;
  healthScore: {
    score: number;
    overallQuality: number;
    possibleImprovement: number;
    improvementOpportunity: string;
  } | null;
}

export function EvidenceHealthScore({ protectedHours, healthScore }: EvidenceHealthScoreProps) {
  const score = healthScore?.score || 87;
  const quality = healthScore?.overallQuality || 87;
  const improvement = healthScore?.possibleImprovement || 13;

  return (
    <Card className="p-6 bg-slate-100 dark:bg-platinum-800 border-border">
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-bold text-lg text-foreground dark:text-white">Evidence Health Score</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Real-time analysis of your evidence quality</p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold text-emerald-400">{score}/100</div>
            <div className="text-xs text-emerald-400 flex items-center gap-1 justify-end mt-1">
              <TrendingUp className="w-3 h-3" />
              +{improvement}% possible
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500 dark:text-slate-400">Overall Quality</span>
            <span className="font-semibold text-emerald-400">{quality}%</span>
          </div>
          <Progress value={quality} className="h-2 bg-slate-300 dark:bg-slate-700" />
        </div>

        <div className="bg-slate-100/95 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-xs font-semibold text-foreground dark:text-white mb-1">
                Improvement Opportunity
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {healthScore?.improvementOpportunity || "Add more memo entries during work sessions to improve context clarity by 8%"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}