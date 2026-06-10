import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface EvidenceQualityScorecardProps {
  hasAccess: boolean;
  healthScore: {
    workContextScore: number;
    evidenceConsistency: number;
    platformCompliance: number;
  } | null;
}

export function EvidenceQualityScorecard({ hasAccess, healthScore }: EvidenceQualityScorecardProps) {
  const workContext = healthScore?.workContextScore || 92;
  const timeConsistency = healthScore?.evidenceConsistency || 85;
  const platformCompliance = healthScore?.platformCompliance || 94;

  return (
    <Card className="p-6 bg-platinum-800 border-border">
      <div className="space-y-4">
        <div>
          <h3 className="font-bold text-lg text-white">Evidence Quality Scorecard</h3>
          <p className="text-sm text-slate-400 mt-1">Detailed breakdown of evidence metrics</p>
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-white">Work Context</span>
              <span className="text-sm font-bold text-emerald-400">{workContext}/100</span>
            </div>
            <Progress value={workContext} className="h-2 bg-slate-700" />
            <p className="text-xs text-slate-400 mt-1">
              {workContext >= 90 ? "Meets all requirements" : "17 items flagged for review"}
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-white">Time Consistency</span>
              <span className="text-sm font-bold text-emerald-400">{timeConsistency}/100</span>
            </div>
            <Progress value={timeConsistency} className="h-2 bg-slate-700" />
            <p className="text-xs text-slate-400 mt-1">
              {timeConsistency >= 85 ? "Excellent temporal coverage" : "Consider more frequent evidence collection"}
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-white">Platform Compliance</span>
              <span className="text-sm font-bold text-emerald-400">{platformCompliance}/100</span>
            </div>
            <Progress value={platformCompliance} className="h-2 bg-slate-700" />
            <p className="text-xs text-slate-400 mt-1">
              {platformCompliance >= 94 ? "Meets all platform requirements" : "Review platform-specific requirements"}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}