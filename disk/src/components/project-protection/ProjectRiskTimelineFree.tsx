import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TimelineRiskData } from "@/types/projectProtection";
import { motion } from "framer-motion";
import { Clock, Shield, AlertTriangle, CheckCircle } from "lucide-react";

interface ProjectRiskTimelineFreeProps {
  data: TimelineRiskData;
  onUpgrade?: () => void;
}

export function ProjectRiskTimelineFree({ data, onUpgrade }: ProjectRiskTimelineFreeProps) {
  const { pillars, totalProtectedWeekly, events, persuasion, upgradePrompt } = data;
  const activePillars = pillars.free;

  return (
    <Card className="relative overflow-hidden bg-gradient-to-b from-slate-50 to-white rounded-2xl border border-slate-200 shadow-sm">
      {/* Free Tier Badge */}
      <div className="absolute top-4 right-4 z-10">
        <Badge variant="outline" className="bg-white/80 backdrop-blur-sm">
          Free Preview
        </Badge>
      </div>
      {/* Header */}
      <div className="flex justify-between items-start p-6 border-b border-slate-100">
        <div>
          <h3 className="font-bold text-xl text-[#0A192F]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Project Risk Timeline
          </h3>
          <p className="text-sm text-slate-500 mt-1">Basic timeline monitoring</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-[#0A192F]">${totalProtectedWeekly}</div>
          <div className="text-xs text-slate-500 uppercase tracking-wide">Protected this week</div>
        </div>
      </div>

      {/* 4 Pillars Grid */}
      <div className="grid grid-cols-2 gap-4 p-6 bg-slate-50/50">
        {activePillars.map((pillar, idx) => (
          <motion.div 
            key={pillar.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm"
          >
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-medium text-slate-500">{pillar.label}</span>
              {pillar.status === 'protected' ? (
                <CheckCircle className="w-4 h-4 text-[#22C55E]" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-[#F59E0B]" />
              )}
            </div>
            <div className="text-xl font-bold text-[#0A192F] mb-1">{pillar.displayValue}</div>
            <p className="text-xs text-slate-400">{pillar.description}</p>
          </motion.div>
        ))}
      </div>

      {/* Basic Timeline Visualization */}
      <div className="px-6 pb-6">
        <div className="relative h-32 bg-white rounded-xl border border-slate-200 p-4">
          <div className="absolute top-3 left-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Risk Events</div>
          
          <div className="mt-4 h-full flex items-end justify-around pb-2">
            {events.length > 0 ? (
              events.slice(0, 6).map((event, i) => (
                <motion.div 
                  key={event.id}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: Math.max(24, event.impactValue * 15), opacity: 1 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex flex-col items-center gap-1 group cursor-pointer"
                >
                  <div 
                    className={`w-4 rounded-t-sm transition-all duration-300 group-hover:w-5 ${
                      event.riskLevel === 'high' ? 'bg-red-500 shadow-red-200' : 'bg-amber-500 shadow-amber-200'
                    } shadow-sm`}
                    style={{ height: '100%' }}
                  />
                  <span className="text-[10px] text-slate-400 font-mono">
                    {new Date(event.timestamp).getDate()}
                  </span>
                  
                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-2 hidden group-hover:block bg-slate-800 text-white text-xs p-2 rounded shadow-lg z-10 whitespace-nowrap">
                    {event.description}
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="w-full text-center self-center text-xs text-slate-400">
                No risk events detected in this period
              </div>
            )}
          </div>
          
          {/* Base line */}
          <div className="absolute bottom-6 left-4 right-4 h-px bg-slate-100" />
        </div>
      </div>

      {/* Social Proof & Upgrade */}
      <div className="p-6 bg-slate-50 border-t border-slate-100">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-blue-600 mt-0.5" />
            <div className="text-xs text-blue-800">
              <span className="font-semibold">Free Tier Limitation:</span> You're viewing a preview of one project only. Upgrade to track unlimited projects.
            </div>
          </div>
        </div>
        
        {persuasion.socialProof && (
          <div className="flex items-center gap-2 mb-4 text-sm text-[#0087A6]">
            <Shield className="w-4 h-4" />
            <span className="font-medium">{persuasion.socialProofMessage}</span>
          </div>
        )}
        
        {upgradePrompt && (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-[#0A192F]">Upgrade to Starter</span>
              <Badge variant="outline" className="bg-white text-[#00C9B7] border-[#00C9B7]">
                Recommended
              </Badge>
            </div>
            <p className="text-sm text-slate-600">{upgradePrompt.message}</p>
            <Button 
              onClick={onUpgrade}
              className="w-full bg-gradient-to-r from-[#00C9B7] to-[#0087A6] hover:opacity-90 text-white shadow-md"
            >
              Upgrade to Starter
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}