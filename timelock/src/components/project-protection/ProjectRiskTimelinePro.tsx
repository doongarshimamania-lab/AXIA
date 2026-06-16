import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TimelineRiskData } from "@/types/projectProtection";
import { motion } from "framer-motion";
import { ShieldAlert, TrendingUp, Activity, Lock, AlertTriangle, Layers } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProjectRiskTimelineStarter } from "./ProjectRiskTimelineStarter";
import { ProjectRiskTimelineFree } from "./ProjectRiskTimelineFree";

interface ProjectRiskTimelineProProps {
  data: TimelineRiskData;
  onUpgrade?: () => void;
}

export function ProjectRiskTimelinePro({ data, onUpgrade }: ProjectRiskTimelineProProps) {
  const { pillars, totalProtectedMonthly, events, persuasion, upgradePrompt } = data;
  const activePillars = pillars.pro || pillars.free;
  const [hoveredEvent, setHoveredEvent] = useState<string | null>(null);

  return (
    <Card className="relative overflow-hidden bg-[#0A192F] text-white rounded-2xl border border-slate-700 shadow-xl">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0A192F] via-[#0f2545] to-[#0A192F] z-0" />
      
      {/* Header */}
      <div className="relative z-10 flex justify-between items-start p-6 border-b border-slate-700/50">
        <div className="flex flex-col gap-2">
          <div>
            <h3 className="font-bold text-xl text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Vulnerability Detection
            </h3>
            <p className="text-sm text-slate-400 mt-1">Advanced pattern analysis</p>
          </div>
          
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="w-fit h-8 gap-2 bg-white/5 border-white/10 hover:bg-white/10 text-slate-300 hover:text-white transition-colors">
                <Layers className="w-3.5 h-3.5" />
                View Full Analysis
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-5xl bg-[#0A192F] border-slate-700 text-white p-0 overflow-hidden">
              <DialogHeader className="p-6 border-b border-slate-700/50 bg-[#0f2545]">
                <DialogTitle className="text-xl font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  Comprehensive Risk Analysis
                </DialogTitle>
                <DialogDescription className="text-slate-400">Detailed vulnerability and risk assessment across your projects.</DialogDescription>
              </DialogHeader>
              <div className="p-6 bg-[#0A192F] max-h-[80vh] overflow-y-auto">
                <Tabs defaultValue="starter" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 bg-slate-800 mb-6">
                    <TabsTrigger value="starter" className="data-[state=active]:bg-[#00C9B7] data-[state=active]:text-[#0A192F]">
                      Contextual Analysis (Starter)
                    </TabsTrigger>
                    <TabsTrigger value="free" className="data-[state=active]:bg-[#00C9B7] data-[state=active]:text-[#0A192F]">
                      Basic Timeline (Free)
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="starter" className="mt-0">
                    <div className="text-slate-900">
                      <ProjectRiskTimelineStarter data={data} onUpgrade={onUpgrade} />
                    </div>
                  </TabsContent>
                  <TabsContent value="free" className="mt-0">
                    <div className="text-slate-900">
                      <ProjectRiskTimelineFree data={data} onUpgrade={onUpgrade} />
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        
        <div className="text-right">
          <div className="text-2xl font-bold text-[#00C9B7]">${totalProtectedMonthly}</div>
          <div className="text-xs text-slate-400 uppercase tracking-wide">Protected / month</div>
        </div>
      </div>

      {/* 4 Pillars Cards */}
      <div className="relative z-10 grid grid-cols-4 gap-3 p-6">
        {activePillars.map((pillar, idx) => (
          <motion.div 
            key={pillar.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white/5 backdrop-blur-sm p-3 rounded-xl border border-white/10 hover:bg-white/10 transition-colors"
          >
            <div className="flex justify-between items-start mb-2">
              <Activity className="w-4 h-4 text-[#00C9B7]" />
            </div>
            <div className="text-lg font-bold text-white mb-1">{pillar.displayValue}</div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">{pillar.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Enhanced 3D Timeline Visualization */}
      <div className="relative z-10 px-6 pb-6">
        {/* Scarcity Banner */}
        {persuasion.scarcity && (
          <div className="mb-4 bg-[#FFD700] text-[#0A192F] text-xs font-bold py-2 px-4 text-center rounded-lg">
            {persuasion.scarcityMessage}
          </div>
        )}

        <div className="relative h-64 bg-[#0F172A] rounded-xl border border-slate-700 p-6 overflow-hidden">
          {/* Grid Background for Depth */}
          <div className="absolute inset-0 opacity-20">
            <svg className="w-full h-full">
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#00C9B7" strokeWidth="0.5" opacity="0.3"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          </div>

          {/* Timeline Labels */}
          <div className="absolute top-4 left-6 right-6 flex justify-between text-xs text-slate-300 font-mono z-10 font-bold tracking-wider">
            <span>30 DAYS AGO</span>
            <span>15 DAYS AGO</span>
            <span>TODAY</span>
          </div>

          {/* 3D Perspective Plane */}
          <div className="absolute inset-x-6 bottom-12 h-32 transform-gpu" style={{ 
            transform: 'perspective(1000px) rotateX(20deg)', 
            transformStyle: 'preserve-3d'
          }}>
            {/* Base Plane with Gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#00C9B7]/20 via-[#00C9B7]/5 to-transparent rounded-lg border-b border-[#00C9B7]/30 shadow-[0_10px_40px_rgba(0,201,183,0.2)]">
              {/* Animated Scan Line */}
              <motion.div
                className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-[#00C9B7] to-transparent"
                animate={{ 
                  top: ['0%', '100%'],
                  opacity: [0.8, 0.3, 0.8]
                }}
                transition={{ 
                  duration: 3, 
                  repeat: Infinity,
                  ease: "linear"
                }}
              />
            </div>

            {/* Risk Event Bars with 3D Effect */}
            {events && events.length > 0 ? (
              events.slice(0, 8).map((event, i) => {
                const position = 10 + (i * 11); // Spread across timeline
                // Adjusted height calculation to prevent overflow (max 80%)
                const height = 20 + Math.min(60, event.impactValue * 10); 
                const isHovered = hoveredEvent === event.id;
                
                return (
                  <motion.div
                    key={event.id}
                    className="absolute bottom-0 group cursor-pointer"
                    style={{ 
                      left: `${position}%`,
                      height: `${height}%`,
                      width: isHovered ? '2rem' : '1.5rem', // Animate width
                      transformStyle: 'preserve-3d',
                      zIndex: isHovered ? 50 : 10,
                      transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}
                    initial={{ opacity: 0, scaleY: 0 }}
                    animate={{ opacity: 1, scaleY: 1 }}
                    transition={{ delay: i * 0.1 }}
                    onMouseEnter={() => setHoveredEvent(event.id)}
                    onMouseLeave={() => setHoveredEvent(null)}
                  >
                    {/* 3D Bar Container - Full Clickable Area */}
                    <div className="relative w-full h-full pointer-events-auto">
                      {/* Front Face */}
                      <div 
                        className={`absolute inset-0 rounded-sm transition-all duration-300 ${
                          event.riskLevel === 'high' || event.riskLevel === 'critical'
                            ? 'bg-gradient-to-t from-[#DC143C] via-[#FF4D4D] to-[#FF8080]' 
                            : event.riskLevel === 'medium'
                            ? 'bg-gradient-to-t from-[#F59E0B] via-[#FBBF24] to-[#FCD34D]'
                            : 'bg-gradient-to-t from-[#3B82F6] via-[#60A5FA] to-[#93C5FD]'
                        } ${isHovered ? 'shadow-[0_0_25px_rgba(220,20,60,1)] brightness-110' : 'shadow-[0_0_15px_rgba(220,20,60,0.5)]'}`}
                      />
                      
                      {/* Side Face (Right) - Perfectly Aligned */}
                      <div 
                        className={`absolute top-0 left-full w-3 h-full rounded-tr-sm origin-top-left transform -skew-y-[20deg] transition-all duration-300 ${
                          event.riskLevel === 'high' || event.riskLevel === 'critical'
                            ? 'bg-gradient-to-b from-[#991B1B] to-[#B91C1C]' 
                            : event.riskLevel === 'medium'
                            ? 'bg-gradient-to-b from-[#B45309] to-[#D97706]'
                            : 'bg-gradient-to-b from-[#1E3A8A] to-[#1E40AF]'
                        } opacity-80`}
                      />

                      {/* Top Face - Perfectly Aligned */}
                      <div 
                        className={`absolute bottom-full left-0 w-full h-3 origin-bottom-left transform skew-x-[70deg] transition-all duration-300 ${
                          event.riskLevel === 'high' || event.riskLevel === 'critical'
                            ? 'bg-[#FF8080]' 
                            : event.riskLevel === 'medium'
                            ? 'bg-[#FCD34D]'
                            : 'bg-[#93C5FD]'
                        } opacity-90`}
                      />

                      {/* Pulsing Glow for High Risk */}
                      {(event.riskLevel === 'high' || event.riskLevel === 'critical') && (
                        <motion.div
                          className="absolute inset-0 w-full rounded-t bg-[#DC143C]"
                          animate={{ opacity: [0.3, 0.7, 0.3] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        />
                      )}
                    </div>

                    {/* Enhanced Tooltip */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: isHovered ? 1 : 0, y: isHovered ? 0 : 10 }}
                      className="absolute bottom-full left-1/2 -translate-x-1/2 mb-8 w-56 bg-[#1F2937] border border-slate-600 rounded-lg shadow-2xl p-3 pointer-events-none z-50"
                      style={{ transform: 'translateZ(100px)' }} // Lift tooltip above 3D elements
                    >
                      <div className="flex items-start gap-2 mb-2">
                        <AlertTriangle className={`w-4 h-4 flex-shrink-0 ${
                          event.riskLevel === 'high' || event.riskLevel === 'critical' ? 'text-[#DC143C]' : 'text-[#F59E0B]'
                        }`} />
                        <div className="flex-1">
                          <div className="text-xs font-bold text-white mb-1">{event.description}</div>
                          <div className="text-[10px] text-slate-400">
                            {new Date(event.timestamp).toLocaleDateString()} at {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-slate-700">
                        <span className="text-[10px] text-slate-400 uppercase">Risk Value</span>
                        <span className="text-sm font-bold text-[#DC143C]">${event.impactValue.toFixed(0)}</span>
                      </div>
                      {persuasion.lossAversion && (
                        <div className="text-[9px] text-slate-500 mt-1 italic">
                          Potential loss without protection
                        </div>
                      )}
                    </motion.div>
                  </motion.div>
                );
              })
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <ShieldAlert className="w-8 h-8 text-[#00C9B7] mx-auto mb-2 opacity-50" />
                  <p className="text-xs text-slate-500">No vulnerabilities detected</p>
                </div>
              </div>
            )}
          </div>
          
          {/* Status Indicator */}
          <div className="absolute bottom-4 left-6 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#00C9B7] animate-pulse" />
            <span className="text-xs text-slate-500 font-mono">VULNERABILITY_SCAN_ACTIVE</span>
          </div>

          {/* Risk Legend */}
          <div className="absolute bottom-4 right-6 flex items-center gap-3 text-[10px]">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-[#DC143C]" />
              <span className="text-slate-500">High Risk</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-[#F59E0B]" />
              <span className="text-slate-500">Medium</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-[#3B82F6]" />
              <span className="text-slate-500">Low</span>
            </div>
          </div>
        </div>
      </div>

      {/* Upgrade Prompt */}
      {upgradePrompt && (
        <div className="relative z-10 p-6 border-t border-slate-700/50 bg-white/5">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-medium text-white">Protect your entire business</div>
            <div className="text-sm font-bold text-[#FFD700]">{upgradePrompt.message}</div>
          </div>
          <Button 
            onClick={onUpgrade}
            className="w-full bg-gradient-to-r from-[#00C9B7] to-[#0087A6] hover:opacity-90 text-white shadow-lg border-none"
          >
            Upgrade to Expert
          </Button>
        </div>
      )}
    </Card>
  );
}