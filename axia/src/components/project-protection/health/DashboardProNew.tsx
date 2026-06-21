import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Shield, Terminal, Zap } from "lucide-react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { VulnerabilityScanner } from "./VulnerabilityScanner";
import { WorkRhythmVisualizer } from "./WorkRhythmVisualizer";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowUpRight } from "lucide-react";

interface DashboardProNewProps {
  data: any;
  onUpgrade?: () => void;
}

export function DashboardProNew({ data, onUpgrade }: DashboardProNewProps) {
  const valueMetric = data.valueMetric || { amount: 0, label: "Protected", cadence: "month" };
  const vulnerabilities = data.vulnerabilities || [];
  const pillars = data.pillars || [];
  const starterData = data.starterData || {}; // Lower tier data

  const metricDefinitions: Record<string, { description: string; impact: string }> = {
    "Safety Health": {
      description: "Your immunity score against common dispute triggers and contract loopholes.",
      impact: "Higher scores mean fewer vulnerabilities in your timeline that clients can exploit."
    },
    "Audit Health": {
      description: "Readiness for a manual review by a platform (Upwork/Fiverr) or client.",
      impact: "100% means your work logs can withstand detailed scrutiny without payment reversal."
    },
    "Protection Health": {
      description: "The strength of your configured protection settings and active monitoring.",
      impact: "'Maximum' protection ensures no billable hour goes unaccounted for or unprotected."
    },
    "Pattern Health": {
      description: "How well your work matches successful, dispute-free professional patterns.",
      impact: "Deviations can flag potential payment risks before they become disputes."
    }
  };

  return (
    <Card className="overflow-hidden bg-[#0f172a] border border-indigo-900/50 shadow-2xl shadow-indigo-900/20">
      {/* Cyber Header */}
      <div className="relative p-6 border-b border-indigo-900/50 bg-[#0f172a]">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-indigo-500 blur-lg opacity-20 animate-pulse" />
              <Shield className="w-8 h-8 text-indigo-400 relative z-10" />
            </div>
            <div>
              <h3 className="font-mono font-bold text-xl text-white tracking-tight">SECURITY_HEALTH</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-xs font-mono text-indigo-300">SYSTEM_ACTIVE</p>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="font-mono text-3xl font-bold text-white tracking-tight">${valueMetric.amount}</div>
            <div className="text-[10px] font-mono text-indigo-400 uppercase">Value_Secured</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-indigo-900/50">
        {/* Left: Threat Radar & Rhythm */}
        <div className="p-6 col-span-2 bg-[#0B1221] space-y-6">
          {/* Vulnerability Scanner */}
          <VulnerabilityScanner vulnerabilities={vulnerabilities} />

          {/* Lower Tier: Work Rhythm (Integrated via Modal) */}
          {starterData.workPatterns && (
            <div className="mt-6 pt-6 border-t border-indigo-900/30 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-mono font-bold text-indigo-400 flex items-center gap-2">
                  <Zap className="w-3 h-3" />
                  STARTER_MODULE_INTEGRATION
                </h4>
                <p className="text-xs text-indigo-300/60 mt-1">Access productivity rhythm analysis</p>
              </div>
              
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="bg-indigo-950/30 border-indigo-500/30 text-indigo-300 hover:bg-indigo-900/50 hover:text-white font-mono text-xs">
                    OPEN_MODULE <ArrowUpRight className="w-3 h-3 ml-2" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-slate-900 border-indigo-500/30 text-white sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="font-mono text-indigo-400 flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      WORK_RHYTHM_ANALYSIS
                    </DialogTitle>
                    <DialogDescription className="text-slate-400">Review your work rhythm and productivity trends.</DialogDescription>
                  </DialogHeader>
                  <div className="bg-slate-950/50 rounded-lg border border-indigo-900/30 p-4 h-[200px]">
                    <WorkRhythmVisualizer 
                      rhythm={starterData.pillars?.find((p: any) => p.name === "Rhythm Health")?.value || 0}
                      velocity={starterData.workPatterns.velocity}
                      trend={starterData.workPatterns.trend}
                      peakHour={starterData.workPatterns.peakHour}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                     {starterData.pillars?.map((p: any, i: number) => (
                        <div key={i} className="bg-indigo-950/30 p-2 rounded border border-indigo-500/10 text-center">
                          <div className="text-[10px] text-indigo-400 uppercase">{p.name.replace(" Health", "")}</div>
                          <div className="text-lg font-bold text-white">{p.value}{p.unit}</div>
                        </div>
                      ))}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>

        {/* Right: System Status */}
        <div className="p-6 bg-[#0f172a]">
          <h4 className="text-xs font-mono font-bold text-indigo-400 mb-4 flex items-center gap-2">
            <Terminal className="w-3 h-3" />
            SYSTEM_METRICS
          </h4>
          <div className="space-y-4">
            {pillars.map((pillar: any, idx: number) => {
              const def = metricDefinitions[pillar.name] || { description: "System metric.", impact: "Security status." };
              
              return (
                <HoverCard key={idx}>
                  <HoverCardTrigger asChild>
                    <div className="space-y-1 cursor-help group">
                      <div className="flex justify-between text-xs font-mono text-indigo-200 group-hover:text-white transition-colors">
                        <span className="border-b border-dotted border-indigo-500/50">{pillar.name.toUpperCase().replace(" ", "_")}</span>
                        <span>{pillar.value}%</span>
                      </div>
                      <div className="h-1.5 bg-indigo-950 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${pillar.value}%` }}
                          transition={{ duration: 1, delay: idx * 0.1 }}
                          className={`h-full rounded-full ${
                            pillar.value > 80 ? 'bg-emerald-500' : pillar.value > 50 ? 'bg-yellow-500' : 'bg-red-500'
                          }`} 
                        />
                      </div>
                    </div>
                  </HoverCardTrigger>
                  <HoverCardContent className="w-80 bg-[#0B1221] border-indigo-500/30 text-indigo-100 shadow-2xl" align="end">
                    <div className="space-y-2">
                      <h4 className="text-sm font-mono font-bold text-indigo-400 flex items-center gap-2">
                        {pillar.name.toUpperCase()}
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${pillar.value > 80 ? 'border-emerald-500/50 text-emerald-400' : 'border-red-500/50 text-red-400'}`}>
                          {pillar.value > 80 ? 'SECURE' : 'VULNERABLE'}
                        </span>
                      </h4>
                      <p className="text-xs text-indigo-200/80 leading-relaxed font-sans">
                        {def.description}
                      </p>
                      <div className="pt-2 border-t border-indigo-900/50 mt-2">
                        <p className="text-[10px] font-mono font-bold text-indigo-500 uppercase tracking-wide mb-1">TACTICAL_VALUE</p>
                        <p className="text-xs text-indigo-300 italic font-sans">
                          "{def.impact}"
                        </p>
                      </div>
                    </div>
                  </HoverCardContent>
                </HoverCard>
              );
            })}
          </div>
          
          <div className="mt-8 pt-6 border-t border-indigo-900/50">
            <Button onClick={onUpgrade} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs">
              UPGRADE_TO_EXPERT_TIER
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}