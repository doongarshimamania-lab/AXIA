import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Zap, Activity, ArrowRight, CalendarClock, Info } from "lucide-react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { WorkRhythmVisualizer } from "./WorkRhythmVisualizer";

interface DashboardStarterNewProps {
  data: any;
  onUpgrade?: () => void;
}

export function DashboardStarterNew({ data, onUpgrade }: DashboardStarterNewProps) {
  const valueMetric = data.valueMetric || { amount: 0, label: "Protected", cadence: "week" };
  const pillars = data.pillars || [];
  const workPatterns = data.workPatterns || { trend: "steady", velocity: 0, peakHour: "9" };

  const metricDefinitions: Record<string, { description: string; impact: string }> = {
    "Context Health": {
      description: "Measures the richness of work metadata (apps used, activity types).",
      impact: "Prevents 'vague work' disputes by proving exactly what you were working on."
    },
    "Rhythm Health": {
      description: "Tracks the consistency of your work schedule and session lengths.",
      impact: "Builds client trust and disproves 'ghosting' or 'abandonment' claims."
    },
    "Evidence Health": {
      description: "The density and quality of automated proof (screenshots, logs).",
      impact: "High evidence scores are your primary defense to win payment disputes instantly."
    }
  };

  return (
    <Card className="overflow-hidden bg-white border border-teal-100 shadow-lg shadow-teal-900/5">
      {/* Productivity Header */}
      <div className="bg-gradient-to-r from-teal-50 to-white p-6 border-b border-teal-100">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-teal-500 text-white rounded-xl shadow-sm">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-xl text-slate-900 tracking-tight">Productivity Health</h3>
              <p className="text-sm text-teal-600 font-medium">Active Rhythm Monitoring</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-black text-slate-900 tracking-tight">${valueMetric.amount}</div>
            <div className="text-xs font-bold text-teal-600 uppercase tracking-wider">Protected / Week</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-teal-50">
        {/* Left: Key Metrics */}
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Vital Signs</h4>
            <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">Interactive</span>
          </div>
          <div className="space-y-4">
            {pillars.map((pillar: any, idx: number) => {
              const def = metricDefinitions[pillar.name] || { description: "Key performance indicator.", impact: "Tracks project health." };
              const isHealthy = pillar.value >= 70;
              
              return (
                <HoverCard key={idx}>
                  <HoverCardTrigger asChild>
                    <div className="flex items-center justify-between group cursor-help p-2 -mx-2 rounded-lg hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${idx === 0 ? 'bg-blue-500' : idx === 1 ? 'bg-purple-500' : 'bg-emerald-500'}`} />
                        <span className="text-sm font-medium text-slate-600 group-hover:text-slate-900 transition-colors border-b border-dotted border-slate-300 group-hover:border-slate-900">
                          {pillar.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${isHealthy ? 'text-slate-900' : 'text-amber-600'}`}>
                          {pillar.value}{pillar.unit}
                        </span>
                        <Info className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  </HoverCardTrigger>
                  <HoverCardContent className="w-80 bg-white border-slate-200 shadow-xl" align="start">
                    <div className="space-y-2">
                      <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        {pillar.name}
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isHealthy ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {isHealthy ? 'Healthy' : 'Needs Attention'}
                        </span>
                      </h4>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {def.description}
                      </p>
                      <div className="pt-2 border-t border-slate-100 mt-2">
                        <p className="text-[10px] font-bold text-teal-600 uppercase tracking-wide mb-1">Why it matters</p>
                        <p className="text-xs text-slate-500 italic">
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

        {/* Middle: Rhythm Visualizer */}
        <div className="p-6 col-span-2 bg-slate-50/50">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Work Rhythm Flow
            </h4>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 bg-white px-2 py-1 rounded-full border border-slate-200">
              <CalendarClock className="w-3 h-3" />
              Peak: {workPatterns.peakHour}:00
            </div>
          </div>
          
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm h-[160px] flex items-center justify-center">
            <WorkRhythmVisualizer 
              rhythm={pillars[1]?.value || 0}
              velocity={workPatterns.velocity}
              trend={workPatterns.trend}
              peakHour={workPatterns.peakHour}
            />
          </div>
        </div>
      </div>

      {/* Upgrade Banner */}
      <div className="bg-slate-900 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-pulse" />
          <p className="text-sm text-slate-300 font-medium">
            Want to see <span className="text-white font-bold">security vulnerabilities</span> in your timeline?
          </p>
        </div>
        <Button onClick={onUpgrade} size="sm" variant="ghost" className="text-teal-400 hover:text-teal-300 hover:bg-slate-800">
          Upgrade to Pro <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </Card>
  );
}