import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lock, TrendingUp } from "lucide-react";

interface MilestoneProtectionFreeProps {
  milestones?: any[];
  totalProtectedValue?: number;
  totalAtRiskValue?: number;
  avgProtectionRate?: number;
  onUpgrade?: () => void;
}

export function MilestoneProtectionFree({ onUpgrade }: MilestoneProtectionFreeProps) {
  return (
    <Card className="relative overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 rounded-2xl border-2 border-slate-200 dark:border-slate-800">
      {/* Header */}
      <div className="p-6 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-xl text-slate-900 dark:text-slate-100">
              Milestone Protection
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Preview: See what milestone tracking can do
            </p>
          </div>
          <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
            Preview
          </Badge>
        </div>
      </div>

      {/* Preview Content */}
      <div className="p-6 space-y-4">
        <div className="relative bg-white dark:bg-slate-900 rounded-xl p-6 border-2 border-dashed border-slate-300 dark:border-slate-700">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-100/50 to-transparent dark:from-slate-800/50 backdrop-blur-sm rounded-xl flex items-center justify-center">
            <Lock className="w-12 h-12 text-slate-400" />
          </div>
          
          <div className="opacity-30 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Week 1 Milestone</span>
              <Badge className="bg-emerald-100 text-emerald-700">Protected</Badge>
            </div>
            <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 w-3/4"></div>
            </div>
            <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
              <span>12.5 hours</span>
              <span>$312.50 protected</span>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <h5 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                Unlock Milestone Protection
              </h5>
              <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
                Track and protect critical project milestones with automated evidence snapshots, 
                client approval tracking, and dispute prevention alerts.
              </p>
              <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1 mb-3">
                <li>✓ Weekly milestone tracking</li>
                <li>✓ Automatic protection scoring</li>
                <li>✓ Value-at-risk calculations</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Upgrade CTA */}
      <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
        <Button
          onClick={onUpgrade}
          className="w-full bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white font-semibold shadow-lg"
        >
          Upgrade to Starter → $4/mo
        </Button>
        <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-2">
          Start protecting your milestones today
        </p>
      </div>
    </Card>
  );
}
