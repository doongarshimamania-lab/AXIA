import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Crown, Globe, CheckCircle2, Layers, FileText, Lock, Info, ChevronDown, ChevronUp, ChevronRight } from "lucide-react";
import { ProjectProtectionScoreData } from "@/types/projectProtection";
import { motion, AnimatePresence } from "framer-motion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useState } from "react";
import { ScopeDefenseModal } from "./ScopeDefenseModal";
import { RequirementsModal } from "./RequirementsModal";
import { EvidenceTimelineModal } from "./EvidenceTimelineModal";
import { FormalizeScopeChangeDialog } from "./FormalizeScopeChangeDialog";
import { ReportViewerModal } from "@/components/ReportViewerModal";
import { Id } from "@/convex/_generated/dataModel";
import { useMutation } from "@/lib/safe-convex-react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";

interface Props {
  data: ProjectProtectionScoreData;
  onUpgrade?: () => void;
  projectId?: Id<"projects">;
  projectName?: string;
}

const metricDescriptions: Record<string, string> = {
  // Free tier
  evidence_log: "Tracks evidence-to-session ratio for documentation coverage.",
  timestamp: "Verifies accurate time tracking for all sessions.",
  integrity: "Cryptographic verification of evidence files.",
  basic_value: "Total dollar value of logged work hours.",
  // Starter tier
  req_match: "Measures work-to-requirement alignment.",
  memo_quality: "Quality and completeness of work descriptions.",
  activity_density: "Work intensity per week for consistent protection.",
  context: "Overall contextual relevance score.",
  // Pro tier
  scope_adherence: "Monitors project boundaries to prevent scope creep.",
  change_detection: "Detects requirement changes and scope expansions.",
  dispute_readiness: "Preparedness for disputes with evidence volume.",
  vuln_shield: "Platform-specific vulnerability protection.",
  // Expert tier
  platform_diversity: "Multi-platform income diversification for business resilience. Score reflects number of active platforms (1 platform = low, 2-3 = medium, 4+ = high).",
  income_continuity: "Monthly income stability and revenue predictability. Calculated from project value over time (higher monthly average = better score).",
  client_trust_depth: "Evidence documentation depth and consistency across client relationships.",
  global_compliance: "Legal, tax, and regulatory compliance across jurisdictions. Based on platform policies and documentation standards."
};

export function ProtectionScoreCardExpert({ data, onUpgrade, projectId, projectName }: Props) {
  const [scopeModalOpen, setScopeModalOpen] = useState(false);
  const [requirementsModalOpen, setRequirementsModalOpen] = useState(false);
  const [evidenceModalOpen, setEvidenceModalOpen] = useState(false);
  const [formalizeDialogOpen, setFormalizeDialogOpen] = useState(false);
  const [reportViewerOpen, setReportViewerOpen] = useState(false);
  const [reportData, setReportData] = useState<{ content: string; caseId: string } | null>(null);
  
  // Safely access evidence API — it may not exist in local Convex deployment
  const evidenceMutations = (api as any).evidence;
  const generateUniversalReport = useMutation(evidenceMutations?.generateUniversalReport ?? null);
  const generateProjectAuditReport = useMutation(evidenceMutations?.generateProjectAuditReport ?? null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <Card className="relative overflow-hidden bg-slate-950 border-2 border-amber-500/50 shadow-2xl text-white">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-900/20 via-slate-950 to-slate-950" />
        
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-0">
          {/* Left: Authority & Score */}
          <div className="p-8 border-b lg:border-b-0 lg:border-r border-amber-500/20 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2 rounded-lg bg-amber-500/20 border border-amber-500/50">
                  <Crown className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <h3 className="font-bold text-xl text-white">Expert Protection</h3>
                  <p className="text-xs text-amber-200">Business-wide coverage</p>
                </div>
              </div>

              <div className="text-center py-8">
                <div className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-amber-300 to-amber-600 drop-shadow-sm">
                  {data.score}
                </div>
                <div className="text-sm font-bold text-amber-500 tracking-widest mt-2">EXPERT SCORE</div>
                <div className="text-xs text-amber-300 mt-2">98% Value Protection</div>
              </div>
            </div>

            {/* Inherited Features Visualization - Now Clickable */}
            <div className="mt-8 space-y-3">
              <h4 className="text-xs font-bold text-amber-500/70 uppercase tracking-wider mb-2">Protection Foundation</h4>
              
              {/* Pro: Scope Creep Status - Clickable */}
              <button
                onClick={() => setScopeModalOpen(true)}
                className="w-full p-3 text-left hover:bg-slate-800/50 transition-colors rounded-lg bg-slate-900/50 border border-amber-500/10"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-xs text-amber-100">
                    <Layers className="w-3 h-3 text-amber-500" />
                    <span>Scope Defense (Pro)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-green-400 font-bold bg-green-400/10 px-1.5 py-0.5 rounded">ACTIVE</span>
                    <ChevronRight className="w-3 h-3" />
                  </div>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden flex">
                  {data.timelineSegments?.map(seg => (
                    <div key={seg.id} style={{ width: `${seg.end - seg.start}%` }} className={`h-full ${
                      seg.riskLevel === 'high' ? 'bg-red-500/50' : 'bg-amber-500/50'
                    }`} />
                  ))}
                </div>
              </button>

              {/* Starter: Requirements - Clickable */}
              <button
                onClick={() => setRequirementsModalOpen(true)}
                className="w-full p-3 text-left hover:bg-slate-800/50 transition-colors rounded-lg bg-slate-900/50 border border-amber-500/10"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-xs text-amber-100">
                    <FileText className="w-3 h-3 text-amber-500" />
                    <span>Requirements (Starter)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-amber-200/70">{data.requirementMappings?.filter(r => r.status === 'matched').length} Matched</span>
                    <ChevronRight className="w-3 h-3" />
                  </div>
                </div>
                <div className="space-y-1">
                  {data.requirementMappings?.slice(0, 2).map(req => (
                    <div key={req.id} className="flex justify-between text-[10px] text-slate-400">
                      <span className="truncate max-w-[120px]">{req.requirement}</span>
                      <span className={req.status === 'matched' ? 'text-green-400' : 'text-slate-600'}>{req.status}</span>
                    </div>
                  ))}
                </div>
              </button>

              {/* Free: Evidence - Clickable */}
              <button
                onClick={() => setEvidenceModalOpen(true)}
                className="w-full p-3 text-left hover:bg-slate-800/50 transition-colors rounded-lg bg-slate-900/50 border border-amber-500/10"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-xs text-amber-100">
                    <Lock className="w-3 h-3 text-amber-500" />
                    <span>Evidence (Free)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-amber-200/70">{data.evidenceTimeline?.filter(e => e.status === 'verified').length} Verified</span>
                    <ChevronRight className="w-3 h-3" />
                  </div>
                </div>
                <div className="flex gap-1">
                  {data.evidenceTimeline?.slice(0, 8).map((entry) => (
                    <div key={entry.id} className={`h-1 flex-1 rounded-full ${
                      entry.status === 'verified' ? 'bg-amber-500' : 'bg-slate-800'
                    }`} />
                  ))}
                </div>
              </button>
            </div>

            {data.darkPsychology && (
              <div className="mt-3 p-4 rounded-xl bg-amber-950/30 border border-amber-500/30">
                <p className="text-sm text-amber-200 italic">"{data.darkPsychology.message}"</p>
              </div>
            )}
          </div>

          {/* Middle: Business Map */}
          <div className="p-8 border-b lg:border-b-0 lg:border-r border-amber-500/20 relative overflow-hidden">
            <div className="flex items-center gap-2 mb-6">
              <Globe className="w-4 h-4 text-amber-500" />
              <h4 className="text-sm font-bold text-amber-500 uppercase tracking-wider">Business Map</h4>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="w-3 h-3 text-amber-400" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs bg-slate-900 text-white">
                    <p className="text-xs">Visual network of income sources, client relationships, platform connections, and risk concentration</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            
            {/* Dynamic Node Map */}
            <div className="relative w-full h-64 bg-slate-900/50 rounded-xl border border-slate-800 p-4 overflow-hidden">
              {/* Use real business map nodes from backend */}
              {(() => {
                const nodes = data.businessMapNodes || [];
                const clientNodes = nodes.filter(n => n.type === 'client');
                const platformNodes = nodes.filter(n => n.type === 'platform');
                const vulnerableClients = clientNodes.filter(n => n.status === 'vulnerable').length;

                return (
                  <>
                    {/* Connection Lines */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none">
                      {nodes.filter(n => n.type !== 'income').map(node => (
                        <line 
                          key={`line-${node.id}`}
                          x1="50%" y1="50%"
                          x2={`${node.x}%`} y2={`${node.y}%`}
                          stroke={node.status === 'vulnerable' ? '#ef4444' : '#475569'}
                          strokeWidth={node.size === 'large' ? '2' : node.size === 'medium' ? '1.5' : '1'}
                          strokeDasharray={node.status === 'vulnerable' ? '2 2' : '4 4'}
                          opacity="0.5"
                        />
                      ))}
                    </svg>

                    {/* Nodes */}
                    {nodes.map((node) => {
                      const sizeMap: Record<string, string> = { large: 'w-16 h-16 -ml-8 -mt-8', medium: 'w-12 h-12 -ml-6 -mt-6', small: 'w-10 h-10 -ml-5 -mt-5' };
                      const iconSize: Record<string, string> = { large: 'w-6 h-6', medium: 'w-4 h-4', small: 'w-3 h-3' };
                      const textSize: Record<string, string> = { large: 'text-xs', medium: 'text-[10px]', small: 'text-[8px]' };
                      
                      const nodeSize = node.size || 'medium';

                      return (
                        <TooltipProvider key={node.id}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <motion.div
                                className={`absolute ${sizeMap[nodeSize]} rounded-full flex flex-col items-center justify-center z-10 cursor-pointer transition-all ${
                                  node.type === 'income' 
                                    ? 'bg-gradient-to-br from-amber-500 to-orange-600 border-2 border-amber-300 shadow-lg shadow-amber-500/50' 
                                    : node.status === 'vulnerable'
                                    ? 'bg-slate-800 border-2 border-red-500/50'
                                    : 'bg-slate-800 border-2 border-amber-500/30'
                                }`}
                                style={{ left: `${node.x}%`, top: `${node.y}%` }}
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: 0.1 * nodes.indexOf(node), duration: 0.3 }}
                                whileHover={{ scale: 1.15, borderColor: node.status === 'vulnerable' ? '#ef4444' : '#f59e0b' }}
                              >
                                {node.type === 'income' && <Crown className={`${iconSize[nodeSize]} text-white mb-0.5`} />}
                                {node.type === 'client' && <div className={`${iconSize[nodeSize]} rounded-full ${node.status === 'vulnerable' ? 'bg-red-500' : 'bg-green-500'}`} />}
                                {node.type === 'platform' && <Globe className={`${iconSize[nodeSize]} text-amber-400`} />}
                                <div className={`${textSize[nodeSize]} font-bold text-white text-center leading-tight px-1`}>
                                  {node.label}
                                </div>
                              </motion.div>
                            </TooltipTrigger>
                            <TooltipContent className="bg-slate-900 text-white border border-amber-500/30">
                              <p className="text-xs font-bold mb-1">{node.label}</p>
                              <p className="text-xs text-slate-300">Type: <span className="text-amber-400">{node.type}</span></p>
                              <p className="text-xs text-slate-300">Status: <span className={node.status === 'vulnerable' ? 'text-red-400' : 'text-green-400'}>{node.status}</span></p>
                              <p className="text-xs text-slate-300">Value: <span className="text-amber-400 font-mono">${node.value.toLocaleString()}</span></p>
                              {node.type === 'client' && (
                                <p className="text-xs text-slate-400 mt-1">
                                  {node.status === 'vulnerable' ? '⚠️ Low evidence coverage' : '✓ Well documented'}
                                </p>
                              )}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      );
                    })}
                  </>
                );
              })()}
            </div>

            {/* Dynamic Business Insights Summary */}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="p-2 rounded-lg bg-slate-900/50 border border-slate-800">
                <div className="text-[10px] text-slate-400 mb-0.5">Income Diversity</div>
                <div className="text-sm font-bold text-amber-400">
                  {(data.businessMapNodes || []).filter(n => n.type === 'platform').length} Platform{(data.businessMapNodes || []).filter(n => n.type === 'platform').length !== 1 ? 's' : ''}
                </div>
              </div>
              <div className="p-2 rounded-lg bg-slate-900/50 border border-slate-800">
                <div className="text-[10px] text-slate-400 mb-0.5">Client Risk</div>
                <div className={`text-sm font-bold ${(() => {
                  const vulnCount = (data.businessMapNodes || []).filter(n => n.type === 'client' && n.status === 'vulnerable').length;
                  return vulnCount > 0 ? 'text-red-400' : 'text-green-400';
                })()}`}>
                  {(() => {
                    const vulnCount = (data.businessMapNodes || []).filter(n => n.type === 'client' && n.status === 'vulnerable').length;
                    return vulnCount > 0 ? `${vulnCount} Vulnerable` : 'All Protected';
                  })()}
                </div>
              </div>
            </div>

            {/* Core Positioning */}
            <div className="mt-8 p-4 bg-gradient-to-r from-amber-950/30 to-transparent rounded-lg border-l-2 border-amber-500">
              <h5 className="text-xs font-bold text-amber-400 uppercase mb-1">Core Protection Status</h5>
              <ul className="space-y-1">
                {data.corePositioning && (
                  <>
                    <li className="flex items-center gap-2 text-xs text-slate-300">
                      <CheckCircle2 className={`w-3 h-3 ${data.corePositioning.prevention.status ? 'text-green-500' : 'text-slate-600'}`} />
                      <span className={data.corePositioning.prevention.status ? 'text-slate-200' : 'text-slate-500'}>
                        Prevention: {data.corePositioning.prevention.label}
                      </span>
                    </li>
                    <li className="flex items-center gap-2 text-xs text-slate-300">
                      <CheckCircle2 className={`w-3 h-3 ${data.corePositioning.protection.status ? 'text-green-500' : 'text-slate-600'}`} />
                      <span className={data.corePositioning.protection.status ? 'text-slate-200' : 'text-slate-500'}>
                        Protection: {data.corePositioning.protection.label}
                      </span>
                    </li>
                    <li className="flex items-center gap-2 text-xs text-slate-300">
                      <CheckCircle2 className={`w-3 h-3 ${data.corePositioning.noDenials.status ? 'text-green-500' : 'text-slate-600'}`} />
                      <span className={data.corePositioning.noDenials.status ? 'text-slate-200' : 'text-slate-500'}>
                        No Denials: {data.corePositioning.noDenials.label}
                      </span>
                    </li>
                    <li className="flex items-center gap-2 text-xs text-slate-300">
                      <CheckCircle2 className={`w-3 h-3 ${data.corePositioning.hourlyProtection.status ? 'text-green-500' : 'text-slate-600'}`} />
                      <span className={data.corePositioning.hourlyProtection.status ? 'text-slate-200' : 'text-slate-500'}>
                        Hourly: {data.corePositioning.hourlyProtection.label}
                      </span>
                    </li>
                  </>
                )}
              </ul>
            </div>
          </div>

          {/* Right: All Pillars */}
          <div className="p-8 flex flex-col justify-between bg-amber-950/5">
            {/* Expert Tier Metrics - Always Visible at Top */}
            <div className="mb-4">
              <h4 className="text-sm font-bold text-amber-400 uppercase tracking-wider mb-3">Expert Tier Metrics</h4>
              <div className="space-y-2">
              {data.pillars.filter(p => ['platform_diversity', 'income_continuity', 'client_trust_depth', 'global_compliance'].includes(p.id)).map((pillar) => (
                <TooltipProvider key={pillar.id}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/50 border border-slate-800 hover:border-amber-500/50 transition-colors cursor-help">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className={`w-4 h-4 ${
                            pillar.statusLevel === 'high' ? 'text-green-500' :
                            pillar.statusLevel === 'medium' ? 'text-yellow-500' :
                            'text-red-500'
                          }`} />
                          <div>
                            <span className="text-xs font-bold text-white block">{pillar.label}</span>
                            <span className="text-[10px] text-slate-400">Score: {pillar.score}</span>
                          </div>
                        </div>
                        <span className="text-xs font-mono text-amber-400">${pillar.valueDollar.toLocaleString()}</span>
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

            {/* Inherited Metrics - Scrollable */}
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {/* Pro Tier Metrics */}
              <h4 className="text-xs font-bold text-purple-400/70 uppercase tracking-wider mb-2 sticky top-0 bg-amber-950/5 py-2 z-10">Inherited: Pro Tier</h4>
              {data.pillars.filter(p => ['scope_adherence', 'change_detection', 'dispute_readiness', 'vuln_shield'].includes(p.id)).map((pillar) => (
                <TooltipProvider key={pillar.id}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/50 border border-slate-800 hover:border-amber-500/50 transition-colors cursor-help">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className={`w-4 h-4 ${
                            pillar.statusLevel === 'high' ? 'text-green-500' :
                            pillar.statusLevel === 'medium' ? 'text-yellow-500' :
                            'text-red-500'
                          }`} />
                          <div>
                            <span className="text-xs font-bold text-white block">{pillar.label}</span>
                            <span className="text-[10px] text-slate-400">Score: {pillar.score}</span>
                          </div>
                        </div>
                        <span className="text-xs font-mono text-amber-400">${pillar.valueDollar.toLocaleString()}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs bg-slate-900 text-white">
                      <p className="text-xs font-bold mb-1">{pillar.label}</p>
                      <p className="text-xs">{metricDescriptions[pillar.id] || pillar.description}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}

              {/* Starter Tier Metrics */}
              <h4 className="text-xs font-bold text-blue-400/70 uppercase tracking-wider mb-2 mt-4 sticky top-0 bg-amber-950/5 py-2 z-10">Inherited: Starter Tier</h4>
              {data.pillars.filter(p => ['req_match', 'memo_quality', 'activity_density', 'context'].includes(p.id)).map((pillar) => (
                <TooltipProvider key={pillar.id}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/50 border border-slate-800 hover:border-amber-500/50 transition-colors cursor-help">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className={`w-4 h-4 ${
                            pillar.statusLevel === 'high' ? 'text-green-500' :
                            pillar.statusLevel === 'medium' ? 'text-yellow-500' :
                            'text-red-500'
                          }`} />
                          <div>
                            <span className="text-xs font-bold text-white block">{pillar.label}</span>
                            <span className="text-[10px] text-slate-400">Score: {pillar.score}</span>
                          </div>
                        </div>
                        <span className="text-xs font-mono text-amber-400">${pillar.valueDollar.toLocaleString()}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs bg-slate-900 text-white">
                      <p className="text-xs font-bold mb-1">{pillar.label}</p>
                      <p className="text-xs">{metricDescriptions[pillar.id] || pillar.description}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}

              {/* Free Tier Metrics */}
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 mt-4 sticky top-0 bg-amber-950/5 py-2 z-10">Inherited: Free Tier</h4>
              {data.pillars.filter(p => ['evidence_log', 'timestamp', 'integrity', 'basic_value'].includes(p.id)).map((pillar) => (
                <TooltipProvider key={pillar.id}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/50 border border-slate-800 hover:border-amber-500/50 transition-colors cursor-help">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className={`w-4 h-4 ${
                            pillar.statusLevel === 'high' ? 'text-green-500' :
                            pillar.statusLevel === 'medium' ? 'text-yellow-500' :
                            'text-red-500'
                          }`} />
                          <div>
                            <span className="text-xs font-bold text-white block">{pillar.label}</span>
                            <span className="text-[10px] text-slate-400">Score: {pillar.score}</span>
                          </div>
                        </div>
                        <span className="text-xs font-mono text-amber-400">${pillar.valueDollar.toLocaleString()}</span>
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

            <div className="mt-4">
              <Button 
                className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-bold shadow-lg shadow-amber-900/20 border-0"
                onClick={async () => {
                  if (!projectId) return;
                  
                  try {
                    const result = await generateProjectAuditReport({ projectId });
                    if (result.limited) {
                      toast(`Report limit reached. Monthly loss: ${result.monthlyLoss}, Potential savings: ${result.monthlySavings}`);
                    } else {
                      toast.success(`Audit report generated! Case ID: ${result.caseId}`);
                      setReportData({ content: result.reportContent || "", caseId: result.caseId || "" });
                      setReportViewerOpen(true);
                    }
                  } catch (error) {
                    toast.error('Failed to generate audit report');
                    console.error('Report generation error:', error);
                  }
                }}
              >
                Generate Audit Report
              </Button>
            </div>
          </div>
        </div>
      </Card>

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
      <ReportViewerModal
        isOpen={reportViewerOpen}
        onClose={() => setReportViewerOpen(false)}
        caseId={reportData?.caseId}
        reportContent={reportData?.content}
      />
    </motion.div>
  );
}