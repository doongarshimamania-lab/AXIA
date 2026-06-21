import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, AlertCircle, XCircle, ArrowUpRight } from "lucide-react";

interface Milestone {
  period: string;
  hours: number;
  value: number;
  protectionRate: number;
  status: string;
}

interface MilestoneProtectionStarterProps {
  milestones: Milestone[];
  totalProtectedValue: number;
  totalAtRiskValue: number;
  avgProtectionRate?: number;
  onUpgrade?: () => void;
}

export function MilestoneProtectionStarter({
  milestones,
  totalProtectedValue,
  totalAtRiskValue,
  onUpgrade,
}: MilestoneProtectionStarterProps) {
  const displayMilestones = milestones.slice(0, 2);

  return (
    <Card className="relative overflow-hidden bg-white dark:bg-slate-950 rounded-2xl border border-slate-300 dark:border-slate-700 shadow-md">
      {/* Header with gradient accent */}
      <div className="relative p-6 border-b border-slate-200 dark:border-slate-800">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-400 via-cyan-500 to-blue-500"></div>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-xl text-slate-900 dark:text-slate-100">
              Milestone Protection
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Basic milestone tracking for 1 client
            </p>
          </div>
          <Badge className="bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-100 border-0">
            Starter
          </Badge>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="p-6 bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-950">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white dark:bg-slate-900 rounded-lg p-4 border border-slate-200 dark:border-slate-800">
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              ${totalProtectedValue.toFixed(0)}
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Protected Value</div>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-lg p-4 border border-slate-200 dark:border-slate-800">
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              ${totalAtRiskValue.toFixed(0)}
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">At Risk</div>
          </div>
        </div>
      </div>

      {/* Milestone List */}
      <div className="p-6 space-y-3">
        {displayMilestones.map((milestone, idx) => (
          <div
            key={idx}
            className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 border border-slate-200 dark:border-slate-800 hover:border-teal-300 dark:hover:border-teal-700 transition-colors cursor-pointer"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {milestone.status === "protected" ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                ) : milestone.status === "at_risk" ? (
                  <AlertCircle className="w-5 h-5 text-amber-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500" />
                )}
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {milestone.period}
                </span>
              </div>
              <Badge
                variant="outline"
                className={
                  milestone.status === "protected"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300"
                    : milestone.status === "at_risk"
                    ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300"
                    : "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300"
                }
              >
                {milestone.protectionRate}%
              </Badge>
            </div>
            <Progress value={milestone.protectionRate} className="h-2 mb-2" />
            <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
              <span>{milestone.hours}h tracked</span>
              <span className="font-semibold">${milestone.value.toFixed(2)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Upgrade Prompt */}
      <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30">
        <div className="flex items-start gap-3 mb-3">
          <ArrowUpRight className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
          <div>
            <h5 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
              Track 4 Clients with Pro
            </h5>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Get 4-week milestone tracking, automated snapshots, and client approval tracking
            </p>
          </div>
        </div>
        <Button
          onClick={onUpgrade}
          className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold"
        >
          Upgrade to Pro → $7/mo
        </Button>
      </div>
    </Card>
  );
}
