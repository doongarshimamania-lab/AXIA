import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TimelineRiskData } from "@/types/projectProtection";
import { motion } from "framer-motion";
import { Zap, Target, AlertCircle, Layers } from "lucide-react";

interface ProjectRiskTimelineStarterProps {
  data: TimelineRiskData;
  onUpgrade?: () => void;
}

export function ProjectRiskTimelineStarter({ data, onUpgrade }: ProjectRiskTimelineStarterProps) {
  const { pillars, totalProtectedWeekly, events, persuasion, upgradePrompt } = data;
  const activePillars = pillars.starter || pillars.free; // Fallback should not happen in correct tier

  return (
    <Card className="relative overflow-hidden bg-gradient-to-b from-page-bg-from to-white rounded-2xl border border-slate-200 shadow-md">
      {/* Header */}
      <div className="flex justify-between items-start p-6 border-b border-slate-100">
        <div>
          <h3 className="font-bold text-xl text-foreground">
            Contextual Timeline
          </h3>
          <p className="text-sm text-slate-500 mt-1">Relevance & optimization tracking</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-foreground">${totalProtectedWeekly}</div>
          <div className="text-xs text-slate-500 uppercase tracking-wide">Protected / week</div>
        </div>
      </div>

      {/* 4 Pillars Grid (3x1 + 1) */}
      <div className="grid grid-cols-3 gap-4 p-6">
        {activePillars.slice(0, 3).map((pillar, idx) => (
          <motion.div 
            key={pillar.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between"
          >
            <div className="mb-2">
              <span className="text-xs font-bold text-primary uppercase tracking-wider">{pillar.label}</span>
            </div>
            <div>
              <div className="text-xl font-bold text-foreground">{pillar.displayValue}</div>
              <p className="text-[10px] text-slate-400 mt-1">{pillar.description}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Contextual Score Banner */}
      <div className="px-6 pb-4">
        <div className="bg-background rounded-xl p-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg">
              <Layers className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="text-sm font-medium text-slate-300">{activePillars[3]?.label}</div>
              <div className="text-lg font-bold">{activePillars[3]?.displayValue}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-400">Impact</div>
            <div className="text-sm font-medium text-primary">+{activePillars[3]?.dollarImpact ? `$${activePillars[3].dollarImpact}` : '$0'}</div>
          </div>
        </div>
      </div>

      {/* Interactive Timeline Slider */}
      <div className="px-6 pb-6">
        <div className="relative h-32 bg-slate-50 rounded-xl border border-slate-200 p-4">
          <div className="absolute top-4 left-4 text-xs font-bold text-slate-500 uppercase">Timeline Risk Prediction</div>
          <div className="mt-8 relative h-12 flex items-center">
            <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-primary to-primary/70 w-3/4" />
            </div>
            {/* Interactive Markers */}
            {events.slice(0, 4).map((event, i) => (
              <div 
                key={event.id}
                className="absolute w-8 h-8 -ml-4 flex items-center justify-center bg-white rounded-full border shadow-md cursor-pointer hover:scale-110 transition-transform group"
                style={{ left: `${20 + i * 20}%` }}
              >
                <AlertCircle className={`w-4 h-4 ${event.riskLevel === 'high' ? 'text-danger' : 'text-warning'}`} />
                
                {/* Hover Tooltip */}
                <div className="absolute bottom-full mb-2 hidden group-hover:block w-48 bg-background text-white text-xs p-2 rounded-lg shadow-xl z-10">
                  <div className="font-bold mb-1">{event.description}</div>
                  <div className="text-slate-300">Risk: ${event.impactValue.toFixed(0)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Upgrade Prompt */}
      {upgradePrompt && (
        <div className="p-6 border-t border-slate-100 bg-white">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-medium text-foreground">Prevent timeline vulnerabilities</div>
            <div className="text-sm font-bold text-primary">{upgradePrompt.message}</div>
          </div>
          <Button 
            onClick={onUpgrade}
            className="w-full bg-background hover:bg-platinum-800 text-white shadow-lg"
          >
            Upgrade to Pro
          </Button>
        </div>
      )}
    </Card>
  );
}