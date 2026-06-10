import { Card } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";

interface EvidenceGapPredictionProps {
  hasAccess: boolean;
  gapData: {
    status: string;
    message?: string;
    description?: string;
    nextGapTime: number | null;
    missingTypes: string[];
  };
}

export function EvidenceGapPrediction({ hasAccess, gapData }: EvidenceGapPredictionProps) {
  return (
    <Card className="p-6 bg-platinum-800 border-border">
      <div className="space-y-3">
        <div>
          <h3 className="font-bold text-lg text-white">Evidence Gap Prediction</h3>
          <p className="text-sm text-slate-400 mt-1">AI-powered gap detection</p>
        </div>

        <div className="bg-slate-800/50 border border-emerald-500/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-base font-semibold text-white mb-1">
                {gapData.message || "No Gaps Predicted"}
              </div>
              <div className="text-sm text-slate-400">
                {gapData.description || "Your evidence collection pattern is consistent. Keep up the good work!"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}