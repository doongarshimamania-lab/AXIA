import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Target, ChevronRight, AlertTriangle, Lock, FileText, Info } from "lucide-react";
import { ProjectProtectionScoreData } from "@/types/projectProtection";
import { motion } from "framer-motion";
import { useState } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { RequirementsModal } from "./RequirementsModal";
import { EvidenceTimelineModal } from "./EvidenceTimelineModal";

interface Props {
  data: ProjectProtectionScoreData;
  onUpgrade?: () => void;
}

const metricDescriptions: Record<string, string> = {
  // Free tier (inherited)
  evidence_log: "Tracks the ratio of evidence files to work sessions. Higher scores mean better documentation coverage.",
  timestamp: "Verifies that all work sessions have accurate time tracking. Essential for payment protection.",
  integrity: "Ensures evidence files haven't been tampered with using cryptographic verification.",
  basic_value: "Calculates the total dollar value of logged work hours based on your hourly rate.",
  // Starter tier
  req_match: "Measures how well your work evidence matches client requirements. Higher match = lower dispute risk.",
  memo_quality: "Evaluates the quality and completeness of your work memos and descriptions.",
  activity_density: "Tracks your work intensity per week. Consistent activity strengthens payment protection.",
  context: "Overall contextual relevance score combining requirement matching and memo quality."
};

export function ProtectionScoreCardStarter({ data, onUpgrade }: Props) {
  const [activePillar, setActivePillar] = useState<string | null>(null);
  const [requirementsModalOpen, setRequirementsModalOpen] = useState(false);
  const [evidenceModalOpen, setEvidenceModalOpen] = useState(false);

  return (
    <>
      <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="relative overflow-hidden bg-white dark:bg-slate-950 border-2 border-primary/20 shadow-lg">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/60 to-primary" />
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
          {/* Left: Score & Identity */}
          <div className="lg:col-span-5 p-6 bg-muted/30 dark:bg-primary/5 border-b lg:border-b-0 lg:border-r border-border dark:border-border">
            <div className="flex justify-between items-start mb-6">
              <div className="p-2 bg-primary/10 dark:bg-primary/20 rounded-lg">
                <Target className="w-6 h-6 text-primary dark:text-primary/80" />
              </div>
              <Badge className="bg-primary text-primary-foreground hover:bg-primary/90 border-0">STARTER</Badge>
            </div>

            <div className="mb-8">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Contextual Protection</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Intelligent tracking validates your work against client requirements.
              </p>
            </div>

            <div className="text-center mb-8">
              <div className="text-6xl font-black text-primary dark:text-primary/80 tracking-tight">
                {data.score}
              </div>
              <div className="text-xs font-bold text-primary dark:text-primary/70 uppercase tracking-widest">
                Protection Score
              </div>
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-border dark:border-border shadow-sm mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-medium text-slate-500">Protected Value</span>
                <span className="text-lg font-bold text-slate-900 dark:text-white">${data.valueProtection.toLocaleString()}</span>
              </div>
              <div className="text-xs text-primary dark:text-primary/80 mb-2">60% of total project value secured</div>
              {data.upgradeValueGap && (
                <div className="text-xs text-red-500 font-medium flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  ${data.upgradeValueGap.toLocaleString()} at risk without upgrade
                </div>
              )}
            </div>

            {/* Requirement Mappings (Starter Feature) - Now Clickable */}
            <button
              onClick={() => setRequirementsModalOpen(true)}
              className="mb-6 w-full text-left hover:bg-muted/50 dark:hover:bg-primary/5 transition-colors rounded-lg p-3 border border-transparent hover:border-primary/20 dark:hover:border-primary/30"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary/70" />
                  <span className="text-xs font-bold text-slate-500 uppercase">Client Requirements</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="w-3 h-3 text-slate-400" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs bg-slate-900 text-white">
                        <p className="text-xs">Shows how your evidence matches specific client requirements</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <ChevronRight className="w-4 h-4 text-primary/70" />
              </div>
              <div className="space-y-2">
                {data.requirementMappings?.slice(0, 3).map((req) => (
                  <div key={req.id} className="flex items-center justify-between text-xs p-2 rounded bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                    <span className="text-slate-600 dark:text-slate-400 truncate max-w-[140px]">{req.requirement}</span>
                    <Badge variant="outline" className={req.status === 'matched' ? 'text-primary border-primary/20 bg-primary/5 dark:bg-primary/10' : 'text-slate-400'}>
                      {req.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </button>

            {/* Inherited: Evidence Timeline - Now Clickable */}
            <button
              onClick={() => setEvidenceModalOpen(true)}
              className="pt-4 border-t border-border dark:border-border w-full text-left hover:bg-muted/50 dark:hover:bg-primary/5 transition-colors rounded-lg p-3"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                  Evidence Timeline (Free)
                  <Lock className="w-3 h-3 text-slate-400" />
                </span>
                <ChevronRight className="w-4 h-4 text-primary/70" />
              </div>
              <div className="flex gap-2">
                {data.evidenceTimeline?.map((entry) => (
                  <TooltipProvider key={entry.id}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex-1 flex flex-col gap-1 cursor-help">
                          <div className={`h-1.5 rounded-full w-full ${
                            entry.status === 'verified' ? 'bg-teal-500' : 
                            entry.status === 'partial' ? 'bg-yellow-500' : 'bg-slate-200 dark:bg-slate-700'
                          }`} />
                          <span className="text-[10px] text-slate-400 text-center">{entry.time}</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="bg-slate-900 text-white">
                        <p className="text-xs">Status: {entry.status}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}
              </div>
            </button>
          </div>

          {/* Right: Pillars Grid & Interaction */}
          <div className="lg:col-span-7 p-6">
            {/* Starter Tier Metrics First */}
            <div className="mb-3">
              <h4 className="text-sm font-bold text-primary dark:text-primary/80 uppercase tracking-wider">Starter Tier Metrics</h4>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {data.pillars.filter(p => ['req_match', 'memo_quality', 'activity_density', 'context'].includes(p.id)).map((pillar) => (
                <TooltipProvider key={pillar.id}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setActivePillar(activePillar === pillar.id ? null : pillar.id)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          activePillar === pillar.id 
                            ? 'bg-primary/5 dark:bg-primary/10 border-primary/40 ring-1 ring-primary/40' 
                            : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-primary/20 dark:hover:border-primary/30'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className={`w-2 h-2 rounded-full ${
                            pillar.statusLevel === 'high' ? 'bg-teal-500' : 
                            pillar.statusLevel === 'medium' ? 'bg-yellow-500' : 'bg-red-500'
                          }`} />
                          <span className="text-xs font-bold text-slate-400">${pillar.valueDollar.toLocaleString()}</span>
                        </div>
                        <div className="font-bold text-sm text-slate-900 dark:text-white mb-1">{pillar.label}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">{pillar.description}</div>
                        <div className="mt-2 text-xs font-bold text-primary dark:text-primary/80">Score: {pillar.score}</div>
                      </motion.button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs bg-slate-900 text-white">
                      <p className="text-xs">{metricDescriptions[pillar.id] || pillar.description}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
            </div>

            {/* Free Tier Metrics (Inherited) */}
            <div className="mb-3">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Free Tier (Inherited)</h4>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {data.pillars.filter(p => ['evidence_log', 'timestamp', 'integrity', 'basic_value'].includes(p.id)).map((pillar) => (
                <TooltipProvider key={pillar.id}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setActivePillar(activePillar === pillar.id ? null : pillar.id)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          activePillar === pillar.id 
                            ? 'bg-primary/5 dark:bg-primary/10 border-primary/40 ring-1 ring-primary/40' 
                            : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-primary/20 dark:hover:border-primary/30'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className={`w-2 h-2 rounded-full ${
                            pillar.statusLevel === 'high' ? 'bg-teal-500' : 
                            pillar.statusLevel === 'medium' ? 'bg-yellow-500' : 'bg-red-500'
                          }`} />
                          <span className="text-xs font-bold text-slate-400">${pillar.valueDollar.toLocaleString()}</span>
                        </div>
                        <div className="font-bold text-sm text-slate-900 dark:text-white mb-1">{pillar.label}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">{pillar.description}</div>
                        <div className="mt-2 text-xs font-bold text-primary dark:text-primary/80">Score: {pillar.score}</div>
                      </motion.button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs bg-slate-900 text-white">
                      <p className="text-xs">{metricDescriptions[pillar.id] || pillar.description}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
            </div>

            {/* Detail Drawer */}
            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3 border border-slate-100 dark:border-slate-800 min-h-[80px]">
              {activePillar ? (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-2">
                    {data.pillars.find(p => p.id === activePillar)?.label} Details
                  </h4>
                  <p className="text-xs text-slate-500 mb-3">
                    {metricDescriptions[activePillar] || data.pillars.find(p => p.id === activePillar)?.description}
                  </p>
                  <div className="flex items-center gap-2 text-xs font-medium text-primary dark:text-primary/80">
                    <Info className="w-3 h-3" />
                    <span>Current Score: {data.pillars.find(p => p.id === activePillar)?.score}</span>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-400">
                  <Target className="w-8 h-8 mb-2 opacity-20" />
                  <p className="text-xs">Select a pillar to view detailed insights</p>
                </div>
              )}
            </div>

            {data.upgradeMessage && (
              <Button 
                onClick={onUpgrade}
                className="w-full mt-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200 font-bold group"
              >
                <span>{data.upgradeMessage}</span>
                <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            )}
          </div>
        </div>
      </Card>
    </motion.div>

      {/* Modals */}
      <RequirementsModal 
        open={requirementsModalOpen} 
        onOpenChange={setRequirementsModalOpen}
        requirements={data.requirementMappings || []}
      />
      <EvidenceTimelineModal 
        open={evidenceModalOpen} 
        onOpenChange={setEvidenceModalOpen}
        timeline={data.evidenceTimeline || []}
      />
    </>
  );
}