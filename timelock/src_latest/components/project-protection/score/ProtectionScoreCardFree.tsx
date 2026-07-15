import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, AlertCircle, Lock, Info } from "lucide-react";
import { ProjectProtectionScoreData } from "@/types/projectProtection";
import { motion } from "framer-motion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Props {
  data: ProjectProtectionScoreData;
  onUpgrade?: () => void;
}

const metricDescriptions: Record<string, string> = {
  evidence_log: "Tracks the ratio of evidence files to work sessions. Higher scores mean better documentation coverage.",
  timestamp: "Verifies that all work sessions have accurate time tracking. Essential for payment protection.",
  integrity: "Ensures evidence files haven't been tampered with using cryptographic verification.",
  basic_value: "Calculates the total dollar value of logged work hours based on your hourly rate."
};

export function ProtectionScoreCardFree({ data, onUpgrade }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="relative overflow-hidden bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 border border-slate-200 dark:border-slate-800 shadow-lg">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
          
          {/* Left: Score & Status */}
          <div className="lg:col-span-4 p-6 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between bg-white/50 dark:bg-slate-900/50">
            <div>
              <Badge variant="outline" className="mb-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700">
                FREE TIER
              </Badge>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">Basic Verification</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                Simple file logging and timestamping for foundational protection.
              </p>
              
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-5xl font-black text-slate-900 dark:text-white">{data.score}</span>
                <span className="text-sm font-medium text-slate-500">/100</span>
              </div>
              
              <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden mb-4">
                <motion.div 
                  className="h-full bg-blue-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(data.score, 100)}%` }}
                  transition={{ duration: 1 }}
                />
              </div>

              <div className="space-y-2 mb-6">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">Protected Value</span>
                  <span className="font-bold text-slate-900 dark:text-white">${data.valueProtection.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Shield className="w-3 h-3" />
                  <span>20% of total project value secured</span>
                </div>
              </div>
            </div>

            {data.darkPsychology && (
              <div className="mt-6 p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-red-800 dark:text-red-300 leading-tight">
                      {data.darkPsychology.message}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right: Pillars Grid */}
          <div className="lg:col-span-8 p-6">
            <div className="mb-3">
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Free Tier Metrics</h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              {data.pillars.map((pillar) => (
                <TooltipProvider key={pillar.id}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="p-4 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-800 transition-colors group cursor-help">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
                              ${pillar.statusLevel === 'high' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 
                                pillar.statusLevel === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' : 
                                'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                              {pillar.score}
                            </div>
                            <Info className="w-3 h-3 text-slate-400" />
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-bold text-slate-700 dark:text-slate-300">${pillar.valueDollar.toLocaleString()}</div>
                            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Value</div>
                          </div>
                        </div>
                        <div className="text-sm font-bold text-slate-900 dark:text-white mb-1">{pillar.label}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{pillar.description}</div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs bg-white dark:bg-slate-800 text-foreground dark:text-white border-border dark:border-slate-700">
                      <p className="text-xs">{metricDescriptions[pillar.id] || pillar.description}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
            </div>

            {/* Evidence Timeline */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500 uppercase">Evidence Timeline</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="w-3 h-3 text-slate-400" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs bg-white dark:bg-slate-900 text-foreground dark:text-white border border-border">
                        <p className="text-xs">Visual representation of your recent work sessions and their evidence status</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Lock className="w-3 h-3 text-slate-400" />
              </div>
              <div className="flex gap-2">
                {data.evidenceTimeline?.map((entry) => (
                  <TooltipProvider key={entry.id}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex-1 flex flex-col gap-1 cursor-help">
                          <div className={`h-1.5 rounded-full w-full ${
                            entry.status === 'verified' ? 'bg-green-500' : 
                            entry.status === 'partial' ? 'bg-yellow-500' : 'bg-red-500'
                          }`} />
                          <span className="text-[10px] text-slate-400 text-center truncate">{entry.time}</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="bg-white dark:bg-slate-900 text-foreground dark:text-white border border-border">
                        <p className="text-xs">Status: {entry.status}</p>
                        {entry.valueAtRisk > 0 && <p className="text-xs text-red-400">At risk: ${entry.valueAtRisk}</p>}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}
              </div>
            </div>

            {data.upgradeMessage && (
              <div className="mt-4">
                <Button onClick={onUpgrade} className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200">
                  {data.upgradeMessage}
                </Button>
              </div>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}