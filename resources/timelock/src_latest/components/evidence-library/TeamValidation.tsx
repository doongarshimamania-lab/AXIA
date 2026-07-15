import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Users, CheckCircle2 } from "lucide-react";

interface TeamValidationProps {
  hasAccess: boolean;
}

export function TeamValidation({ hasAccess }: TeamValidationProps) {
  return (
    <Card className="p-6 bg-slate-100 dark:bg-platinum-800 border-border">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-foreground dark:text-white" />
            <h3 className="font-bold text-lg text-foreground dark:text-white">Team Validation</h3>
          </div>
        </div>
        
        <p className="text-sm text-slate-500 dark:text-slate-400">Collaborative evidence verification</p>

        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Validation Progress</span>
            <span className="font-semibold text-emerald-400">2/3 members</span>
          </div>
          <Progress value={66} className="h-2 bg-slate-300 dark:bg-slate-700" />
        </div>

        <div className="bg-slate-100/95 dark:bg-slate-800/50 border border-emerald-500/30 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-xs font-semibold text-foreground dark:text-white mb-1">
                Validation Boost
              </div>
              <div className="text-xs text-slate-400">
                Team validation increases success rate by 9% (87% → 92%)
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between p-2 bg-slate-100/95 dark:bg-slate-800/50 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-xs text-white font-semibold">JD</div>
              <div>
                <div className="text-sm text-foreground dark:text-white font-medium">John Doe</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Validated 2 hours ago</div>
              </div>
            </div>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>

          <div className="flex items-center justify-between p-2 bg-slate-100/95 dark:bg-slate-800/50 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-xs text-white font-semibold">SM</div>
              <div>
                <div className="text-sm text-foreground dark:text-white font-medium">Sarah Miller</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Validated 5 hours ago</div>
              </div>
            </div>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>

          <div className="flex items-center justify-between p-2 bg-slate-100/95 dark:bg-slate-800/50 rounded-lg opacity-50">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-xs text-white font-semibold">MJ</div>
              <div>
                <div className="text-sm text-foreground dark:text-white font-medium">Mike Johnson</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Pending validation</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}