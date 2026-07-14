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
  const workContext = healthScore?.workContextScore ?? 0;
  const timeConsistency = healthScore?.evidenceConsistency ?? 0;
  const platformCompliance = healthScore?.platformCompliance ?? 0;

  // ponytail: descriptive hints that scale with the actual score rather than
  // the previous hardcoded "17 items flagged for review" / "Excellent temporal
  // coverage" strings which showed even when every score was 0.
  const workContextHint =
    workContext === 0
      ? "No work context data yet — start a work session."
      : workContext >= 90
        ? "Meets all requirements"
        : workContext >= 60
          ? "Some items flagged for review"
          : "Multiple items flagged — improve evidence context";
  const timeConsistencyHint =
    timeConsistency === 0
      ? "No temporal data yet — start tracking work sessions."
      : timeConsistency >= 85
        ? "Excellent temporal coverage"
        : "Consider more frequent evidence collection";
  const platformComplianceHint =
    platformCompliance === 0
      ? "No platform data yet — connect a platform to measure compliance."
      : platformCompliance >= 94
        ? "Meets all platform requirements"
        : "Review platform-specific requirements";

  return (
    <Card className="p-6 bg-[#1E293B] border-[#334155]">
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
            <p className="text-xs text-slate-400 mt-1">{workContextHint}</p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-white">Time Consistency</span>
              <span className="text-sm font-bold text-emerald-400">{timeConsistency}/100</span>
            </div>
            <Progress value={timeConsistency} className="h-2 bg-slate-700" />
            <p className="text-xs text-slate-400 mt-1">{timeConsistencyHint}</p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-white">Platform Compliance</span>
              <span className="text-sm font-bold text-emerald-400">{platformCompliance}/100</span>
            </div>
            <Progress value={platformCompliance} className="h-2 bg-slate-700" />
            <p className="text-xs text-slate-400 mt-1">{platformComplianceHint}</p>
          </div>
        </div>
      </div>
    </Card>
  );
}