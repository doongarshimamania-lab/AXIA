import { motion } from "framer-motion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";

interface TimelineVisualizationProps {
  tier: string;
  data: any;
}

export function TimelineVisualization({ tier, data }: TimelineVisualizationProps) {
  // Simplified visualization based on tier
  
  if (tier === 'free' || tier === 'starter') {
    return (
      <div className="h-32 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-center relative overflow-hidden mb-6 group">
        <div className="absolute inset-0 opacity-30"
             style={{ backgroundImage: 'linear-gradient(to right, var(--border) 1px, transparent 1px), linear-gradient(to bottom, var(--border) 1px, transparent 1px)', backgroundSize: '14px 24px' }}
        />
        
        <div className="absolute inset-x-12 h-1 bg-slate-200 dark:bg-slate-800 top-1/2 -translate-y-1/2 rounded-full overflow-hidden">
           <motion.div 
             initial={{ width: "0%" }}
             animate={{ width: "60%" }}
             transition={{ duration: 1.5, ease: "easeInOut" }}
             className="h-full bg-gradient-to-r from-blue-500 to-primary/60"
           />
        </div>

        <div className="flex justify-between w-3/4 relative z-10">
          {[1, 2, 3, 4].map((step, index) => (
            <motion.div 
              key={step}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: index * 0.2 }}
              className="flex flex-col items-center gap-3 group/step cursor-pointer"
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 shadow-sm border-2 ${
                step <= 2 
                  ? "bg-background text-white border-foreground scale-110 shadow-md" 
                  : step === 3
                    ? "bg-white dark:bg-slate-800 text-primary border-primary/50 animate-pulse"
                    : "bg-white dark:bg-slate-950 text-slate-300 border-slate-200 dark:border-slate-800"
              } group-hover/step:scale-110`}>
                {step}
              </div>
              <span className={`text-[10px] font-medium uppercase tracking-wider transition-colors ${
                step <= 2 ? "text-foreground dark:text-white" : "text-slate-400"
              }`}>
                {step === 1 ? "Collect" : step === 2 ? "Verify" : step === 3 ? "Analyze" : "Secure"}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  if (tier === 'pro') {
    return (
      <TooltipProvider>
        <div className="h-56 bg-background rounded-xl border border-slate-800 relative overflow-hidden mb-6 p-6 shadow-inner">
          {/* CSS Grid Pattern Background */}
          <div className="absolute inset-0 opacity-20" 
               style={{ 
                 backgroundImage: 'linear-gradient(var(--platinum-700) 1px, transparent 1px), linear-gradient(to right, var(--platinum-700) 1px, transparent 1px)', 
                 backgroundSize: '20px 20px' 
               }} 
          />
          
          {/* Scanning Line Animation */}
          <motion.div 
            className="absolute top-0 bottom-0 w-[2px] bg-gradient-to-b from-transparent via-primary/40 to-transparent z-0 opacity-50"
            animate={{ left: ["0%", "100%"] }}
            transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
          />
          
          <div className="flex justify-between items-center mb-8 relative z-10">
            <h4 className="text-white/90 text-sm font-medium flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary/60 animate-pulse"/>
              Evidence Gap Analysis
            </h4>
            <div className="text-[10px] text-slate-400 font-mono bg-slate-900/50 px-2 py-1 rounded border border-slate-700">
              LIVE MONITORING
            </div>
          </div>
          
          <div className="relative h-24 flex items-center z-10 mt-4">
            <div className="absolute inset-x-0 h-1 bg-slate-700/50 rounded-full" />
            
            {data.timelineSegments?.map((segment: any, i: number) => (
              <Tooltip key={segment.id}>
                <TooltipTrigger asChild>
                  <motion.div
                    initial={{ scaleY: 0, opacity: 0 }}
                    animate={{ scaleY: 1, opacity: 1 }}
                    transition={{ delay: i * 0.15, type: "spring" }}
                    whileHover={{ scaleY: 1.2, zIndex: 20 }}
                    className={`absolute h-12 w-1.5 rounded-full cursor-pointer transition-all duration-300 ${
                      segment.riskLevel === 'high' ? 'bg-red-500 shadow-sm' : 
                      segment.riskLevel === 'medium' ? 'bg-amber-500 shadow-sm' : 'bg-primary shadow-sm'
                    }`}
                    style={{ left: `${segment.start}%`, height: `${40 + (Math.random() * 40)}px` }}
                  />
                </TooltipTrigger>
                <TooltipContent side="top" className="bg-slate-900 border-slate-700 text-white">
                  <div className="text-xs font-bold mb-1">{segment.label}</div>
                  <div className="text-[10px] text-slate-400">Gap Risk: <span className={
                    segment.riskLevel === 'high' ? 'text-red-400' : 
                    segment.riskLevel === 'medium' ? 'text-amber-400' : 'text-primary'
                  }>{segment.riskLevel.toUpperCase()}</span></div>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
          
          <div className="absolute bottom-4 left-6 right-6 flex justify-between text-[10px] text-slate-500 font-mono">
            <span>START</span>
            <span>EVIDENCE TIMELINE</span>
            <span>END</span>
          </div>
        </div>
      </TooltipProvider>
    );
  }

  if (tier === 'expert') {
    return (
      <div className="h-80 bg-background rounded-xl border border-slate-800 relative overflow-hidden mb-6 flex flex-col group">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-navy-accent to-background" />
        
        {/* Animated Background Particles */}
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white/20 rounded-full"
            initial={{ x: Math.random() * 100 + "%", y: Math.random() * 100 + "%", opacity: 0 }}
            animate={{ 
              y: [null, Math.random() * -100],
              opacity: [0, 0.5, 0]
            }}
            transition={{ 
              duration: Math.random() * 5 + 5, 
              repeat: Infinity,
              ease: "linear"
            }}
          />
        ))}

        <div className="absolute inset-0 opacity-10" 
             style={{ 
               backgroundImage: 'radial-gradient(var(--platinum-400) 1px, transparent 1px)', 
               backgroundSize: '24px 24px' 
             }} 
        />
        
        <div className="flex justify-between items-center p-6 pb-2 relative z-10 shrink-0">
          <h4 className="text-white/90 text-sm font-medium flex items-center gap-2">
            <Info className="w-4 h-4 text-primary/60" />
            Business Evidence Map
          </h4>
          <div className="flex gap-2">
             <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-950/30 px-2 py-1 rounded border border-emerald-900/50">
               <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Protected
             </span>
             <span className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-950/30 px-2 py-1 rounded border border-amber-900/50">
               <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span> Optimized
             </span>
          </div>
        </div>
        
        <div className="relative z-10 flex-1 w-full min-h-0">
          {/* Dynamic Connections */}
          <svg className="absolute inset-0 pointer-events-none w-full h-full overflow-visible">
            <defs>
              <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
                <stop offset="50%" stopColor="#10b981" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.2" />
              </linearGradient>
            </defs>
            {data.businessMapNodes?.map((node: any) => 
              node.connections?.map((targetId: string) => {
                const target = data.businessMapNodes.find((n: any) => n.id === targetId);
                if (!target) return null;
                return (
                  <motion.path
                    key={`${node.id}-${targetId}`}
                    d={`M${node.x}% ${node.y}% L${target.x}% ${target.y}%`}
                    stroke="url(#lineGradient)"
                    strokeWidth="1.5"
                    fill="none"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 1.5, delay: 0.5 }}
                  />
                );
              })
            )}
          </svg>

          {data.businessMapNodes?.map((node: any, i: number) => (
            <motion.div
              key={node.id}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: i * 0.2, type: "spring", stiffness: 200 }}
              whileHover={{ scale: 1.15 }}
              className={`absolute w-20 h-20 rounded-full border-2 flex flex-col items-center justify-center cursor-pointer backdrop-blur-md shadow-lg group/node ${
                node.status === 'protected' ? 'border-emerald-500/50 bg-emerald-950/40 text-emerald-400 shadow-sm' :
                node.status === 'optimized' ? 'border-amber-500/50 bg-amber-950/40 text-amber-400 shadow-sm' :
                'border-slate-500/50 bg-slate-900/40 text-slate-400'
              }`}
              style={{ left: `${node.x}%`, top: `${node.y}%`, transform: 'translate(-50%, -50%)' }}
            >
              <div className={`absolute inset-0 rounded-full opacity-0 group-hover/node:opacity-100 transition-opacity duration-500 ${
                 node.status === 'protected' ? 'bg-emerald-500/10' : 'bg-amber-500/10'
              }`} />
              
              <span className="text-[9px] font-bold uppercase tracking-wider mb-1 opacity-70">{node.type}</span>
              <span className="text-xs font-bold text-white text-center leading-tight px-1">{node.label}</span>
              
              {/* Status Indicator Dot */}
              <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-foreground ${
                node.status === 'protected' ? 'bg-emerald-500' : 'bg-amber-500'
              }`} />
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  return null;
}