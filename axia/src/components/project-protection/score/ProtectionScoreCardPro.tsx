import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, Clock, ArrowRight, FileText, Lock, Info, Layers, ChevronRight } from "lucide-react";
import { ProjectProtectionScoreData } from "@/types/projectProtection";
import { motion } from "framer-motion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useState } from "react";
import { RequirementsModal } from "./RequirementsModal";
import { EvidenceTimelineModal } from "./EvidenceTimelineModal";
import { ScopeDefenseModal } from "./ScopeDefenseModal";
import { FormalizeScopeChangeDialog } from "./FormalizeScopeChangeDialog";
import { Id } from "@/convex/_generated/dataModel";

interface Props {
  data: ProjectProtectionScoreData;
  onUpgrade?: () => void;
  projectId?: Id<"projects">;
  projectName?: string;
}

const metricDescriptions: Record<string, string> = {
  // Free tier (inherited)
  evidence_log: "Tracks the ratio of evidence files to work sessions.",
  timestamp: "Verifies accurate time tracking for all sessions.",
  integrity: "Cryptographic verification of evidence files.",
  basic_value: "Total dollar value of logged work hours.",
  // Starter tier (inherited)
  req_match: "How well your work matches client requirements.",
  memo_quality: "Quality and completeness of work descriptions.",
  activity_density: "Work intensity per week for consistent protection.",
  context: "Overall contextual relevance score.",
  // Pro tier
  scope_adherence: "Monitors project boundaries to prevent scope creep. Tracks evidence-to-session ratio.",
  change_detection: "Detects requirement changes and scope expansions. Alerts you to formalize changes.",
  dispute_readiness: "Measures your preparedness for disputes with evidence volume and requirement matching.",
  vuln_shield: "Platform-specific vulnerability protection. Automated monitoring for compliance risks."
};

export function ProtectionScoreCardPro({ data, onUpgrade, projectId, projectName }: Props) {
  const [requirementsModalOpen, setRequirementsModalOpen] = useState(false);
  const [evidenceModalOpen, setEvidenceModalOpen] = useState(false);
  const [scopeModalOpen, setScopeModalOpen] = useState(false);
  const [formalizeDialogOpen, setFormalizeDialogOpen] = useState(false);

  const hasHighRisk = data.timelineSegments?.some(seg => seg.riskLevel === 'high');

  return (
    <>
      <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="relative overflow-hidden bg-slate-950 border-2 border-indigo-500/50 shadow-2xl text-white">
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-indigo-950/30 to-slate-950" />
        
        {/* Scarcity Banner */}
        {data.darkPsychology?.type === 'scarcity' && (
          <div className="relative z-10 bg-red-500/10 border-b border-red-500/20 px-6 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-red-400">
              <Clock className="w-3 h-3" />
              {data.darkPsychology.message}
            </div>
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-6 text-[10px] text-red-300 hover:text-red-200 hover:bg-red-500/20"
              onClick={() => projectId && projectName && setFormalizeDialogOpen(true)}
            >
              {data.darkPsychology.action}
            </Button>
          </div>
        )}

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-0">
          {/* Left: Score & Visual */}
          <div className="lg:col-span-4 p-8 border-r border-indigo-500/20 flex flex-col justify-between bg-slate-900/50">
            <div>
              <div className="flex items-center gap-2 mb-6">
                <Shield className="w-5 h-5 text-indigo-400" />
                <span className="font-bold text-indigo-100">PRO PROTECTION</span>
              </div>
              
              <div className="relative w-full aspect-square flex items-center justify-center mb-6 max-w-[200px] mx-auto">
                <div className="absolute inset-0 bg-slate-600/20 blur-3xl rounded-full" />
                <div className="relative flex flex-col items-center justify-center">
                  <span className="text-5xl font-black text-white">{data.score}</span>
                  <span className="text-xs font-bold text-indigo-300">SCORE</span>
                </div>
              </div>

              <div className="space-y-2 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-indigo-200">Protected Value</span>
                  <span className="font-bold text-white">${data.valueProtection.toLocaleString()}</span>
                </div>
                <div className="text-xs text-indigo-300 mb-2">85% of total project value secured</div>
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-slate-600" style={{ width: '85%' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Right: Timeline & Pillars */}
          <div className="lg:col-span-8 p-8">
            {/* Scope Creep Timeline */}
            <div className="mb-8">
              <div className="flex justify-between items-end mb-4">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-white">Scope Creep Analysis</h3>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="w-4 h-4 text-indigo-400" />
                      </TooltipTrigger>
                      <TooltipContent className="bg-slate-900 border-slate-800 text-slate-300 max-w-xs">
                        <p className="text-xs font-bold mb-1">What is Scope Creep?</p>
                        <p className="text-xs">Uncontrolled expansion of project requirements without adjustments to time or budget. This timeline shows risk levels across your project phases.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline" className="border-indigo-500/50 text-indigo-300">Live Monitoring</Badge>
                  {hasHighRisk && projectId && projectName && (
                    <Button
                      size="sm"
                      onClick={() => setFormalizeDialogOpen(true)}
                      className="h-6 text-xs bg-red-600 hover:bg-red-700"
                    >
                      Formalize Changes
                    </Button>
                  )}
                </div>
              </div>
              
              <button
                onClick={() => setScopeModalOpen(true)}
                className="w-full text-left hover:opacity-80 transition-opacity"
              >
                <div className="relative h-12 bg-slate-900 rounded-lg border border-slate-800 flex overflow-hidden">
                  {data.timelineSegments?.map((segment) => (
                    <TooltipProvider key={segment.id}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div 
                            className={`relative h-full border-r border-slate-950 transition-all hover:opacity-90 cursor-pointer group
                              ${segment.riskLevel === 'high' ? 'bg-red-500/20 hover:bg-red-500/30' : 
                                segment.riskLevel === 'medium' ? 'bg-yellow-500/20 hover:bg-yellow-500/30' : 
                                'bg-slate-600/20 hover:bg-slate-600/30'}`}
                            style={{ width: `${segment.end - segment.start}%` }}
                          >
                            <div className="absolute bottom-1 left-2 text-[10px] font-bold text-white/70 group-hover:text-white">
                              {segment.label}
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="bg-slate-900 text-white">
                          <p className="text-xs font-bold">{segment.label}</p>
                          <p className="text-xs">Risk: {segment.riskLevel}</p>
                          <p className="text-xs">Value: ${segment.value.toLocaleString()}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ))}
                </div>
              </button>
              <div className="flex justify-between mt-2 text-xs text-slate-500 font-mono">
                <span>Project Start</span>
                <span>Current Phase</span>
                <span>Completion</span>
              </div>
            </div>

            {/* Pro Tier Metrics First */}
            <div className="mb-4">
              <h4 className="text-sm font-bold text-indigo-300 uppercase tracking-wider mb-2">Pro Tier Metrics</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {data.pillars.filter(p => ['scope_adherence', 'change_detection', 'dispute_readiness', 'vuln_shield'].includes(p.id)).map((pillar) => (
                  <TooltipProvider key={pillar.id}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="p-2 rounded-lg bg-slate-900/50 border border-slate-800 hover:border-indigo-500/50 transition-colors cursor-help">
                          <div className="flex justify-between items-start mb-1">
                            <div className="text-[10px] font-bold text-indigo-300 uppercase truncate">{pillar.label}</div>
                            <div className={`text-[10px] font-bold px-1 py-0.5 rounded ${
                              pillar.statusLevel === 'high' ? 'bg-green-500/20 text-green-400' : 
                              pillar.statusLevel === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                              'bg-red-500/20 text-red-400'
                            }`}>
                              {pillar.score}
                            </div>
                          </div>
                          <div className="text-sm font-bold text-white">${pillar.valueDollar.toLocaleString()}</div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs bg-slate-900 text-white">
                        <p className="text-xs font-bold mb-1">{pillar.label}</p>
                        <p className="text-xs">{metricDescriptions[pillar.id] || pillar.description}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}
              </div>
            </div>

            {/* Lower Tier Metrics (Inherited) */}
            <div className="mb-4">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Inherited Metrics</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {data.pillars.filter(p => !['scope_adherence', 'change_detection', 'dispute_readiness', 'vuln_shield'].includes(p.id)).map((pillar) => (
                  <TooltipProvider key={pillar.id}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="p-2 rounded-lg bg-slate-900/50 border border-slate-800 hover:border-indigo-500/50 transition-colors cursor-help">
                          <div className="flex justify-between items-start mb-1">
                            <div className="text-[10px] font-bold text-slate-400 uppercase truncate">{pillar.label}</div>
                            <div className={`text-[10px] font-bold px-1 py-0.5 rounded ${
                              pillar.statusLevel === 'high' ? 'bg-green-500/20 text-green-400' : 
                              pillar.statusLevel === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                              'bg-red-500/20 text-red-400'
                            }`}>
                              {pillar.score}
                            </div>
                          </div>
                          <div className="text-sm font-bold text-white">${pillar.valueDollar.toLocaleString()}</div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs bg-slate-900 text-white">
                        <p className="text-xs font-bold mb-1">{pillar.label}</p>
                        <p className="text-xs">{metricDescriptions[pillar.id] || pillar.description}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}
              </div>
            </div>

            {/* Inherited Features - Now Clickable */}
            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-indigo-500/20">
              <button
                onClick={() => setRequirementsModalOpen(true)}
                className="text-left hover:bg-slate-800/50 transition-colors rounded-lg p-2"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-indigo-300 uppercase">
                    <FileText className="w-3 h-3" /> Requirements (Starter)
                  </div>
                  <ChevronRight className="w-3 h-3 text-indigo-400" />
                </div>
                <div className="space-y-1">
                  {data.requirementMappings?.slice(0, 2).map((req) => (
                    <div key={req.id} className="flex justify-between text-xs text-slate-400">
                      <span className="truncate max-w-[100px]">{req.requirement}</span>
                      <span className={req.status === 'matched' ? 'text-green-400' : 'text-slate-600'}>{req.status}</span>
                    </div>
                  ))}
                </div>
              </button>
              <button
                onClick={() => setEvidenceModalOpen(true)}
                className="text-left hover:bg-slate-800/50 transition-colors rounded-lg p-2"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-indigo-300 uppercase">
                    <Lock className="w-3 h-3" /> Evidence (Free)
                  </div>
                  <ChevronRight className="w-3 h-3 text-indigo-400" />
                </div>
                <div className="flex gap-1">
                  {data.evidenceTimeline?.slice(0, 5).map((entry) => (
                    <div key={entry.id} className={`h-1 flex-1 rounded-full ${
                      entry.status === 'verified' ? 'bg-slate-600' : 'bg-slate-800'
                    }`} />
                  ))}
                </div>
                <div className="text-[10px] text-slate-500 mt-1 text-right">
                  {data.evidenceTimeline?.filter(e => e.status === 'verified').length} verified
                </div>
              </button>
            </div>

            {data.upgradeMessage && (
              <Button 
                onClick={onUpgrade}
                className="w-full mt-4 bg-gradient-to-r from-indigo-600 to-slate-700 hover:from-indigo-500 hover:to-purple-500 text-white font-bold border-0"
              >
                {data.upgradeMessage} <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </Card>
    </motion.div>

      {/* Modals */}
      <ScopeDefenseModal 
        open={scopeModalOpen} 
        onOpenChange={setScopeModalOpen}
        segments={data.timelineSegments || []}
        projectId={projectId}
        projectName={projectName}
      />
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
      {projectId && projectName && (
        <FormalizeScopeChangeDialog
          open={formalizeDialogOpen}
          onOpenChange={setFormalizeDialogOpen}
          projectId={projectId}
          projectName={projectName}
        />
      )}
    </>
  );
}