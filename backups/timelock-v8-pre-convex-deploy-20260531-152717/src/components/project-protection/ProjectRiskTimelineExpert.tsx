import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TimelineRiskData } from "@/types/projectProtection";
import { motion } from "framer-motion";
import { Globe, ShieldCheck, Zap, TrendingUp } from "lucide-react";

interface ProjectRiskTimelineExpertProps {
  data: TimelineRiskData;
  onUpgrade?: () => void;
}

export function ProjectRiskTimelineExpert({ data }: ProjectRiskTimelineExpertProps) {
  const { pillars, totalProtectedMonthly, businessMapNodes, persuasion } = data;
  const activePillars = pillars.expert || pillars.free;

  return (
    <Card className="relative overflow-hidden bg-[#0A192F] text-white rounded-2xl border border-[#FFD700]/30 shadow-2xl">
      {/* Strategic Accent */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#FFD700]/10 blur-3xl rounded-full pointer-events-none" />
      
      {/* Header */}
      <div className="relative z-10 flex justify-between items-start p-6 border-b border-slate-700/50">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-xl text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Business Timeline Map
            </h3>
            <Badge className="bg-[#FFD700] text-[#0A192F] hover:bg-[#FFD700]">Enterprise</Badge>
          </div>
          <p className="text-sm text-slate-400">Strategic portfolio protection</p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-[#FFD700]">${totalProtectedMonthly}</div>
          <div className="text-xs text-slate-400 uppercase tracking-wide">Business Value Protected</div>
          {persuasion.authority && (
            <div className="text-[10px] text-slate-500 mt-1">{persuasion.authorityMessage}</div>
          )}
        </div>
      </div>

      {/* 4 Pillars Grid */}
      <div className="relative z-10 grid grid-cols-4 gap-4 p-6 bg-white/5">
        {activePillars.map((pillar, idx) => (
          <motion.div 
            key={pillar.id}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="border-l-2 border-[#00C9B7] pl-4 py-1"
          >
            <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">{pillar.label}</div>
            <div className="text-lg font-bold text-white">{pillar.displayValue}</div>
            <div className="text-[10px] text-[#00C9B7]">{pillar.description}</div>
          </motion.div>
        ))}
      </div>

      {/* Business Map Visualization */}
      <div className="relative z-10 p-6">
        <div className="relative h-64 bg-[#0F172A] rounded-xl border border-slate-700 p-4 overflow-hidden">
          <div className="absolute top-4 left-4 z-20">
            <div className="text-xs font-bold text-[#FFD700] uppercase mb-1">Strategic Recommendations</div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-xs text-slate-300 bg-white/5 px-2 py-1 rounded">
                <Zap className="w-3 h-3 text-[#FFD700]" />
                <span>Optimize cross-platform sync</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-300 bg-white/5 px-2 py-1 rounded">
                <TrendingUp className="w-3 h-3 text-[#00C9B7]" />
                <span>Standardize evidence cadence</span>
              </div>
            </div>
          </div>

          {/* Map Nodes */}
          <div className="absolute inset-0">
            {/* Connecting Lines (SVG) */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              {businessMapNodes?.map((node) => 
                node.connections.map(targetId => {
                  const target = businessMapNodes.find(n => n.id === targetId);
                  if (!target) return null;
                  return (
                    <line 
                      key={`${node.id}-${targetId}`}
                      x1={`${node.x}%`} y1={`${node.y}%`}
                      x2={`${target.x}%`} y2={`${target.y}%`}
                      stroke="#00C9B7" strokeWidth="1" strokeOpacity="0.3"
                    />
                  );
                })
              )}
            </svg>

            {/* Nodes */}
            {businessMapNodes?.map((node) => (
              <motion.div
                key={node.id}
                className={`absolute w-3 h-3 rounded-full cursor-pointer shadow-[0_0_10px_rgba(0,201,183,0.5)] ${
                  node.type === 'platform' ? 'bg-[#FFD700]' : 'bg-[#00C9B7]'
                }`}
                style={{ left: `${node.x}%`, top: `${node.y}%` }}
                whileHover={{ scale: 1.5 }}
              >
                <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] text-slate-400 bg-[#0A192F] px-2 py-0.5 rounded border border-slate-700">
                  {node.label}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Trust Statement */}
      <div className="relative z-10 p-4 text-center border-t border-slate-700/50 bg-[#0A192F]">
        <div className="flex items-center justify-center gap-2 text-sm text-slate-400">
          <ShieldCheck className="w-4 h-4 text-[#00C9B7]" />
          <span>Your entire business timeline is strategically protected</span>
        </div>
      </div>
    </Card>
  );
}