import { EvidencePillar } from "@/types/projectProtection";
import { Shield, CheckCircle, AlertTriangle, Zap, Lock, Activity } from "lucide-react";
import { motion } from "framer-motion";

interface PillarGridProps {
  pillars: EvidencePillar[];
  tier: string;
}

export function PillarGrid({ pillars, tier }: PillarGridProps) {
  const getIcon = (status: string) => {
    switch (status) {
      case 'protected': return <Shield className="w-5 h-5 text-emerald-500" />;
      case 'optimized': return <Zap className="w-5 h-5 text-[#FFD700]" />;
      case 'at_risk': return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case 'vulnerable': return <Activity className="w-5 h-5 text-red-500" />;
      default: return <CheckCircle className="w-5 h-5 text-slate-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'protected': return "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50";
      case 'optimized': return "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/50";
      case 'at_risk': return "bg-orange-50 text-orange-700 border-orange-100 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-900/50";
      case 'vulnerable': return "bg-red-50 text-red-700 border-red-100 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900/50";
      default: return "bg-slate-50 text-slate-700 border-slate-100 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800";
    }
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 }
  };

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
    >
      {pillars.map((pillar) => (
        <motion.div 
          key={pillar.id}
          variants={item}
          whileHover={{ y: -5, transition: { duration: 0.2 } }}
          className="p-4 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:shadow-md transition-all cursor-default group"
        >
          <div className="flex justify-between items-start mb-3">
            <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900 group-hover:bg-slate-100 dark:group-hover:bg-slate-800 transition-colors">
              {getIcon(pillar.status)}
            </div>
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full border ${getStatusColor(pillar.status)}`}>
              {pillar.status.replace('_', ' ')}
            </span>
          </div>
          
          <div className="mb-1">
            <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400">
              {pillar.label}
            </h4>
            <div className="text-xl font-bold text-[#0A192F] dark:text-white mt-1">
              {pillar.value}
            </div>
          </div>
          
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 line-clamp-2 leading-relaxed">
            {pillar.description}
          </p>
        </motion.div>
      ))}
    </motion.div>
  );
}