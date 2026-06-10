import { Card } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

interface WorkContentAnalysisProps {
  qualityScore: number;
  hasAccess: boolean;
  contentData: {
    score: number;
    workRelatedCount: number;
    totalCount: number;
    flaggedCount: number;
    contextIssues: string;
    detailedBreakdown: {
      workRelated: number;
      flagged: number;
    };
  } | null;
}

export function WorkContentAnalysis({ qualityScore, hasAccess, contentData }: WorkContentAnalysisProps) {
  const score = contentData?.score || 88;
  const workRelated = contentData?.workRelatedCount || 228;
  const total = contentData?.totalCount || 245;
  const flagged = contentData?.flaggedCount || 17;
  const contextIssues = contentData?.contextIssues || "17 items flagged for potential non-work activity. Review and add context notes.";

  return (
    <Card className="p-6 bg-platinum-800 border-border">
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-bold text-lg text-white">Work Context Analysis</h3>
            <p className="text-sm text-slate-400 mt-1">Evidence relevance to work activities</p>
          </div>
          <div className="text-4xl font-bold text-amber-400">{score}/100</div>
        </div>

        <div className="bg-slate-800/50 border border-amber-500/30 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-xs font-semibold text-white mb-1">
                Context Issues Detected
              </div>
              <div className="text-xs text-slate-400">
                {contextIssues}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3">
            <div className="text-xs text-slate-400 mb-1">Work-Related</div>
            <div className="text-2xl font-bold text-emerald-400">
              {workRelated}/{total}
            </div>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3">
            <div className="text-xs text-slate-400 mb-1">Flagged Items</div>
            <div className="text-2xl font-bold text-amber-400">
              {flagged}/{total}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}