import { Button } from "@/components/ui/button";
import { Lock, ArrowRight } from "lucide-react";

interface UpgradePromptProps {
  upgrade: any;
  onUpgrade?: () => void;
}

export function UpgradePrompt({ upgrade, onUpgrade }: UpgradePromptProps) {
  if (!upgrade) return null;

  return (
    <div className="mt-6 p-5 rounded-xl bg-gradient-to-r from-slate-50 to-white dark:from-slate-900 dark:to-slate-950 border border-slate-200 dark:border-slate-800 relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
        <Lock className="w-24 h-24" />
      </div>
      
      <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h4 className="font-bold text-foreground dark:text-white flex items-center gap-2">
            <Lock className="w-4 h-4 text-slate-400" />
            Unlock {upgrade.targetTier} Protection
          </h4>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            You're missing out on <span className="font-bold text-foreground dark:text-white">${upgrade.valueGap}</span> in potential protection value.
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            {upgrade.benefits.map((benefit: string, i: number) => (
              <span key={i} className="text-xs px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {benefit}
              </span>
            ))}
          </div>
        </div>
        
        <Button 
          onClick={onUpgrade}
          className="bg-background hover:bg-platinum-800 text-white min-w-[160px]"
        >
          {upgrade.cta} <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
