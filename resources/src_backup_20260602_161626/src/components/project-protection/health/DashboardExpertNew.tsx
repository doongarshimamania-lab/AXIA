import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Award, TrendingUp, Globe, ArrowUpRight, Shield, Zap, Activity, Target, CheckCircle2, AlertTriangle } from "lucide-react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Info } from "lucide-react";
import { VulnerabilityScanner } from "./VulnerabilityScanner";
import { WorkRhythmVisualizer } from "./WorkRhythmVisualizer";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DashboardExpertNewProps {
  data: any;
}

export function DashboardExpertNew({ data }: DashboardExpertNewProps) {
  const valueMetric = data.valueMetric || { amount: 0, label: "Protected", cadence: "month" };
  const pillars = data.pillars || [];
  const businessMap = data.businessMap || [];
  const strategicRecommendations = data.strategicRecommendations || [];
  const currentProjectMetrics = data.currentProjectMetrics || {};
  const currentProjectId = data.projectId;
  
  // Lower tier data
  const proData = data.proData || {};
  const starterData = data.starterData || {};

  // Sort business map to put current project first
  const sortedBusinessMap = [...businessMap].sort((a: any, b: any) => {
    if (String(a.projectId) === String(currentProjectId)) return -1;
    if (String(b.projectId) === String(currentProjectId)) return 1;
    return 0;
  });

  const metricDefinitions: Record<string, { description: string; impact: string }> = {
    "Timeline Health": {
      description: "Business-wide schedule stability across all active projects.",
      impact: "Ensures no project is neglected, preventing 'abandonment' claims across your portfolio."
    },
    "Platform Health": {
      description: "Cross-platform compliance score (Upwork, Fiverr, Direct).",
      impact: "Verifies you are meeting the specific TOS requirements of every platform you use."
    },
    "Strategy Health": {
      description: "Portfolio diversification and risk distribution analysis.",
      impact: "Protects your income stability if one client fails or one platform changes rules."
    },
    "Overall Health": {
      description: "The aggregate protection score of your entire freelance business.",
      impact: "Your master KPI for business stability and dispute immunity."
    },
    // Pro Tier Metrics (for Deep Dive)
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
      description: "How well your work matches successful, dispute-free freelancer patterns.",
      impact: "Deviations can flag potential payment risks before they become disputes."
    }
  };

  return (
    <Card className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-yellow-500/20 shadow-2xl">
      {/* Premium Gold Accent */}
      <div className="absolute top-0 right-0 p-4">
        <Badge className="bg-gradient-to-r from-yellow-600 to-yellow-400 text-black font-bold border-0 px-3 py-1">
          EXPERT TIER
        </Badge>
      </div>

      {/* Executive Header */}
      <div className="p-8">
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-gradient-to-br from-yellow-500 to-yellow-700 rounded-2xl shadow-lg shadow-yellow-900/20">
            <Award className="w-8 h-8 text-white" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-white font-serif tracking-wide">Business Health Overview</h3>
            <p className="text-slate-400">Enterprise-grade protection & strategy</p>
          </div>
        </div>

        {/* Big Numbers */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-1 bg-white/5 rounded-2xl p-6 border border-white/10 backdrop-blur-sm flex flex-col justify-center">
            <p className="text-sm text-slate-400 mb-1">Total Value Protected</p>
            <div className="text-4xl font-bold text-white flex items-baseline gap-2">
              ${valueMetric.amount.toLocaleString()}
              <span className="text-sm font-normal text-slate-500">/ {valueMetric.cadence}</span>
            </div>
          </div>
          <div className="lg:col-span-2 grid grid-cols-2 gap-4">
            {pillars.map((pillar: any, idx: number) => {
              const def = metricDefinitions[pillar.name] || { description: "Strategic metric.", impact: "Business health." };
              
              return (
                <HoverCard key={idx}>
                  <HoverCardTrigger asChild>
                    <div className="bg-white/5 rounded-2xl p-4 border border-white/10 backdrop-blur-sm flex flex-col justify-center cursor-help hover:bg-white/10 transition-colors group">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm text-slate-400 group-hover:text-white transition-colors">{pillar.name}</p>
                        <Info className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="text-2xl font-bold text-yellow-400">{pillar.value}{pillar.unit}</div>
                    </div>
                  </HoverCardTrigger>
                  <HoverCardContent className="w-80 bg-slate-900 border-yellow-500/20 text-slate-200 shadow-2xl" align="center">
                    <div className="space-y-2">
                      <h4 className="text-sm font-bold text-yellow-500 flex items-center gap-2 font-serif">
                        {pillar.name}
                      </h4>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {def.description}
                      </p>
                      <div className="pt-2 border-t border-white/10 mt-2">
                        <p className="text-[10px] font-bold text-yellow-600 uppercase tracking-wide mb-1">Strategic Value</p>
                        <p className="text-xs text-slate-400 italic">
                          "{def.impact}"
                        </p>
                      </div>
                    </div>
                  </HoverCardContent>
                </HoverCard>
              );
            })}
          </div>
        </div>

        {/* Current Project Deep Dive Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Target className="w-4 h-4 text-yellow-500" />
              Active Project Analysis: <span className="text-white">{currentProjectMetrics.projectName || "Unknown Project"}</span>
            </h4>
            <Badge variant="outline" className={`${
              currentProjectMetrics.status === 'healthy' ? 'border-emerald-500/50 text-emerald-400 bg-emerald-500/10' : 
              currentProjectMetrics.status === 'warning' ? 'border-yellow-500/50 text-yellow-400 bg-yellow-500/10' : 
              'border-red-500/50 text-red-400 bg-red-500/10'
            }`}>
              {currentProjectMetrics.status?.toUpperCase() || "UNKNOWN"}
            </Badge>
          </div>
          
          {proData.pillars && proData.pillars.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {proData.pillars.map((pillar: any, idx: number) => {
                const def = metricDefinitions[pillar.name] || { description: "Project health metric.", impact: "Project stability." };
                return (
                  <HoverCard key={idx}>
                    <HoverCardTrigger asChild>
                      <div className="bg-slate-950/50 border border-white/5 rounded-xl p-4 hover:border-yellow-500/20 transition-colors cursor-help group">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-xs text-slate-400 font-medium group-hover:text-white transition-colors">{pillar.name}</span>
                          <div className={`w-2 h-2 rounded-full ${pillar.value > 80 ? 'bg-emerald-500' : pillar.value > 50 ? 'bg-yellow-500' : 'bg-red-500'}`} />
                        </div>
                        <div className="text-xl font-bold text-white mb-1">{pillar.value}{pillar.unit}</div>
                        <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${pillar.value > 80 ? 'bg-emerald-500' : pillar.value > 50 ? 'bg-yellow-500' : 'bg-red-500'}`} 
                            style={{ width: `${pillar.value}%` }}
                          />
                        </div>
                      </div>
                    </HoverCardTrigger>
                    <HoverCardContent className="w-80 bg-slate-900 border-indigo-500/30 text-slate-200 shadow-2xl" align="center">
                      <div className="space-y-2">
                        <h4 className="text-sm font-bold text-indigo-400 flex items-center gap-2 font-mono">
                          {pillar.name.toUpperCase()}
                        </h4>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {def.description}
                        </p>
                        <div className="pt-2 border-t border-white/10 mt-2">
                          <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wide mb-1">Tactical Impact</p>
                          <p className="text-xs text-slate-400 italic">
                            "{def.impact}"
                          </p>
                        </div>
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                );
              })}
            </div>
          ) : (
            <div className="p-6 text-center text-slate-500 bg-white/5 rounded-xl border border-white/5 border-dashed">
              <p className="text-sm">No detailed analysis available for this project yet.</p>
              <p className="text-xs mt-1 opacity-70">Track time to generate dynamic health metrics.</p>
            </div>
          )}
        </div>

        {/* Strategic Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Business Map & Strategy */}
          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Business Map */}
              <div className="bg-slate-950/50 rounded-2xl p-6 border border-white/5 flex flex-col h-[400px]">
                <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2 flex-shrink-0">
                  <Globe className="w-4 h-4 text-blue-400" />
                  Portfolio Health
                </h4>
                <ScrollArea className="flex-1 pr-4">
                  <div className="space-y-3">
                    {sortedBusinessMap.map((project: any, idx: number) => {
                      const isCurrent = String(project.projectId) === String(currentProjectId);
                      return (
                        <div 
                          key={idx} 
                          className={`p-3 rounded-xl transition-all cursor-pointer group border ${
                            isCurrent 
                              ? 'bg-yellow-500/10 border-yellow-500/30 shadow-[0_0_15px_rgba(234,179,8,0.1)]' 
                              : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${
                                project.status === 'healthy' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 
                                project.status === 'warning' ? 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]' : 
                                'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'
                              }`} />
                              <span className={`font-medium text-sm ${isCurrent ? 'text-yellow-400' : 'text-slate-200'}`}>
                                {project.projectName}
                                {isCurrent && <span className="ml-2 text-[10px] bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded border border-yellow-500/20">ACTIVE</span>}
                              </span>
                            </div>
                            <span className="text-xs font-mono text-slate-500">
                              {project.daysSinceLast === 0 ? 'Active today' : project.daysSinceLast > 900 ? 'No activity' : `${project.daysSinceLast}d ago`}
                            </span>
                          </div>
                          
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2 w-full mr-4">
                              <div className="h-1.5 flex-1 bg-slate-800 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full ${
                                    project.health > 80 ? 'bg-emerald-500' : 
                                    project.health > 50 ? 'bg-yellow-500' : 'bg-red-500'
                                  }`}
                                  style={{ width: `${project.health}%` }}
                                />
                              </div>
                              <span className="text-slate-400 w-8 text-right">{project.health}%</span>
                            </div>
                            <div className="font-mono text-slate-300">
                              ${project.value.toLocaleString()}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>

              {/* Recommendations */}
              <div className="bg-gradient-to-br from-yellow-900/20 to-transparent rounded-2xl p-6 border border-yellow-500/10 h-[400px] overflow-y-auto custom-scrollbar">
                <h4 className="text-sm font-bold text-yellow-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Strategic Insights
                </h4>
                <ul className="space-y-4">
                  {strategicRecommendations.map((rec: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-3 text-sm text-slate-300">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-yellow-500 flex-shrink-0" />
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Right Column: Integrated Modules (Popups) */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Integrated Modules</h4>
            
            {/* Pro Tier Integration: Vulnerability Scanner */}
            {proData.vulnerabilities && (
              <Dialog>
                <DialogTrigger asChild>
                  <div className="bg-slate-950/50 rounded-xl p-4 border border-indigo-500/20 hover:bg-indigo-950/20 transition-all cursor-pointer group">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-indigo-500/10 rounded-lg">
                          <Shield className="w-4 h-4 text-indigo-400" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-indigo-100">Security Ops</h4>
                          <p className="text-[10px] text-indigo-400">Pro Module</p>
                        </div>
                      </div>
                      <ArrowUpRight className="w-4 h-4 text-slate-600 group-hover:text-indigo-400 transition-colors" />
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-slate-400">
                        {proData.vulnerabilities.length} active threats detected
                      </span>
                    </div>
                  </div>
                </DialogTrigger>
                <DialogContent className="bg-slate-950 border-indigo-500/30 text-white sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle className="font-mono text-indigo-400 flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      SECURITY_OPERATIONS_CENTER
                    </DialogTitle>
                  </DialogHeader>
                  <VulnerabilityScanner vulnerabilities={proData.vulnerabilities} className="bg-transparent" />
                </DialogContent>
              </Dialog>
            )}

            {/* Starter Tier Integration: Work Rhythm */}
            {starterData.workPatterns && (
              <Dialog>
                <DialogTrigger asChild>
                  <div className="bg-slate-950/50 rounded-xl p-4 border border-teal-500/20 hover:bg-teal-950/20 transition-all cursor-pointer group">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-teal-500/10 rounded-lg">
                          <Zap className="w-4 h-4 text-teal-400" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-teal-100">Productivity</h4>
                          <p className="text-[10px] text-teal-400">Starter Module</p>
                        </div>
                      </div>
                      <ArrowUpRight className="w-4 h-4 text-slate-600 group-hover:text-teal-400 transition-colors" />
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-slate-400">
                        Trend: <span className="text-white">{starterData.workPatterns.trend}</span>
                      </span>
                    </div>
                  </div>
                </DialogTrigger>
                <DialogContent className="bg-slate-950 border-teal-500/30 text-white sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle className="font-bold text-teal-400 flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      Productivity Engine Analysis
                    </DialogTitle>
                  </DialogHeader>
                  <div className="bg-white/5 rounded-xl p-4 h-[200px] mb-4">
                    <WorkRhythmVisualizer 
                      rhythm={starterData.pillars?.find((p: any) => p.name === "Rhythm Health")?.value || 0}
                      velocity={starterData.workPatterns.velocity}
                      trend={starterData.workPatterns.trend}
                      peakHour={starterData.workPatterns.peakHour}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {starterData.pillars?.map((p: any, i: number) => (
                      <div key={i} className="bg-teal-950/30 p-3 rounded-lg border border-teal-500/10 text-center">
                        <div className="text-[10px] text-teal-400 uppercase mb-1">{p.name}</div>
                        <div className="text-xl font-bold text-white">{p.value}{p.unit}</div>
                      </div>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}