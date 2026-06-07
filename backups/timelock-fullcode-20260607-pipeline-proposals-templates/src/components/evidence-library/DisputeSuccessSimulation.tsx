import { Card } from "@/components/ui/card";

interface DisputeSuccessSimulationProps {
  successRate: number;
  hasAccess: boolean;
  disputeData: {
    currentRate: number;
    potentialRate: number;
    improvement: number;
    workContextCoverage: number;
    timeConsistency: number;
    platformCompliance: number;
    totalEvidenceItems: number;
    recommendation: string;
  } | null;
}

export function DisputeSuccessSimulation({ successRate, hasAccess, disputeData }: DisputeSuccessSimulationProps) {
  const currentRate = disputeData?.currentRate || 83;
  const potentialRate = disputeData?.potentialRate || 92;
  const totalItems = disputeData?.totalEvidenceItems || 245;
  const recommendation = disputeData?.recommendation || "Add 2-3 more memos per session";
  const workContext = disputeData?.workContextCoverage || 88;
  const timeConsistency = disputeData?.timeConsistency || 91;
  const platformCompliance = disputeData?.platformCompliance || 94;

  return (
    <Card className="p-6 bg-[#1E293B] border-[#334155]">
      <div className="space-y-4">
        <div>
          <h3 className="font-bold text-lg text-white">Dispute Success Simulation</h3>
          <p className="text-sm text-slate-400 mt-1">Predicted outcome based on current evidence</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
            <div className="text-xs text-slate-400 mb-2">Current Success Rate</div>
            <div className="text-4xl font-bold text-emerald-400">{currentRate}%</div>
            <div className="text-xs text-slate-400 mt-2">
              Based on {totalItems} evidence items
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
            <div className="text-xs text-slate-400 mb-2">Potential Success Rate</div>
            <div className="text-4xl font-bold text-emerald-400">{potentialRate}%</div>
            <div className="text-xs text-emerald-400 mt-2">
              {recommendation}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Work Context Coverage</span>
            <span className="font-semibold text-emerald-400">{workContext}%</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Time Consistency</span>
            <span className="font-semibold text-emerald-400">{timeConsistency}%</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Platform Compliance</span>
            <span className="font-semibold text-emerald-400">{platformCompliance}%</span>
          </div>
        </div>
      </div>
    </Card>
  );
}