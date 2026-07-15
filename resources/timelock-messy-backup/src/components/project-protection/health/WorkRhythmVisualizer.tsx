import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, Activity, Clock, Zap, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface WorkRhythmVisualizerProps {
  rhythm: number;
  velocity: number;
  trend: "accelerating" | "steady" | "decelerating";
  peakHour?: string;
}

export function WorkRhythmVisualizer({ rhythm, velocity, trend, peakHour }: WorkRhythmVisualizerProps) {
  const getTrendConfig = () => {
    switch (trend) {
      case "accelerating":
        return {
          icon: <TrendingUp className="w-4 h-4" />,
          color: "text-emerald-400",
          bg: "bg-emerald-500/10",
          border: "border-emerald-500/20",
          label: "Picking Up Pace",
          desc: "Work volume increasing vs last week"
        };
      case "decelerating":
        return {
          icon: <TrendingDown className="w-4 h-4" />,
          color: "text-amber-400",
          bg: "bg-amber-500/10",
          border: "border-amber-500/20",
          label: "Slowing Down",
          desc: "Work volume decreasing vs last week"
        };
      default:
        return {
          icon: <Minus className="w-4 h-4" />,
          color: "text-blue-400",
          bg: "bg-blue-500/10",
          border: "border-blue-500/20",
          label: "Steady Pace",
          desc: "Consistent work volume"
        };
    }
  };

  const config = getTrendConfig();

  return (
    <div className="w-full h-full flex flex-col justify-between">
      {/* Header with Trend */}
      <div className="flex items-center justify-between mb-2">
        <div className={`flex items-center gap-2 px-2.5 py-1 rounded-full border ${config.bg} ${config.border}`}>
          <span className={config.color}>{config.icon}</span>
          <span className={`text-xs font-medium ${config.color}`}>{config.label}</span>
        </div>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Info className="w-4 h-4 text-slate-400 hover:text-slate-600 transition-colors" />
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs max-w-[200px]">
                Rhythm Health tracks your work consistency. Steady work patterns reduce dispute risks.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Main Metrics Grid */}
      <div className="grid grid-cols-3 gap-2 flex-1">
        {/* Consistency Score */}
        <div className="bg-slate-50 rounded-lg p-2 border border-slate-100 flex flex-col justify-center items-center text-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-blue-500/5 scale-y-0 group-hover:scale-y-100 transition-transform origin-bottom duration-500" />
          <Activity className="w-4 h-4 text-blue-500 mb-1" />
          <div className="text-xl font-bold text-slate-700">{rhythm}%</div>
          <div className="text-[10px] text-slate-500 font-medium uppercase tracking-tight">Consistency</div>
        </div>

        {/* Velocity/Momentum */}
        <div className="bg-slate-50 rounded-lg p-2 border border-slate-100 flex flex-col justify-center items-center text-center relative overflow-hidden group">
          <div className={`absolute inset-0 ${trend === 'decelerating' ? 'bg-amber-500/5' : 'bg-emerald-500/5'} scale-y-0 group-hover:scale-y-100 transition-transform origin-bottom duration-500`} />
          <Zap className={`w-4 h-4 mb-1 ${trend === 'decelerating' ? 'text-amber-500' : 'text-emerald-500'}`} />
          <div className={`text-xl font-bold ${trend === 'decelerating' ? 'text-amber-600' : 'text-emerald-600'}`}>
            {velocity > 0 ? "+" : ""}{velocity}%
          </div>
          <div className="text-[10px] text-slate-500 font-medium uppercase tracking-tight">Momentum</div>
        </div>

        {/* Peak Time */}
        <div className="bg-slate-50 rounded-lg p-2 border border-slate-100 flex flex-col justify-center items-center text-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-purple-500/5 scale-y-0 group-hover:scale-y-100 transition-transform origin-bottom duration-500" />
          <Clock className="w-4 h-4 text-purple-500 mb-1" />
          <div className="text-xl font-bold text-slate-700">{peakHour}:00</div>
          <div className="text-[10px] text-slate-500 font-medium uppercase tracking-tight">Peak Hour</div>
        </div>
      </div>

      {/* Animated Pulse Line */}
      <div className="h-1 w-full bg-slate-100 rounded-full mt-3 overflow-hidden relative">
        <motion.div
          className={`absolute inset-y-0 left-0 w-1/3 rounded-full ${
            trend === 'accelerating' ? 'bg-emerald-400' : 
            trend === 'decelerating' ? 'bg-amber-400' : 'bg-blue-400'
          }`}
          animate={{
            x: ["-100%", "300%"],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      </div>
    </div>
  );
}