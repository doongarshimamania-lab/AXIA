import { Card } from "@/components/ui/card";
import { CircularMetric } from "./CircularMetric";
import { UpgradePrompt } from "./UpgradePrompt";
import { InteractiveTimeline } from "./InteractiveTimeline";
import { motion } from "framer-motion";
import { AlertTriangle, Lock } from "lucide-react";

interface DashboardFreeProps {
  data: any;
  onUpgrade?: () => void;
}

export function DashboardFree({ data, onUpgrade }: DashboardFreeProps) {
  const pillars = data.pillars || [];
  const valueMetric = data.valueMetric || { amount: 0, label: "Protected", cadence: "week" };
  const timelineBlocks = data.timelineBlocks || [];
  const upgradePrompt = data.upgradePrompt;
  const darkPsychology = data.darkPsychology || {};

  return (
    <Card className="relative overflow-hidden bg-white rounded-2xl border border-slate-200 shadow-sm">
      {/* Scarcity Banner */}
      {darkPsychology.scarcity && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200 px-6 py-3 flex items-center gap-2"
        >
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <p className="text-sm text-amber-900 font-medium">{darkPsychology.scarcity}</p>
        </motion.div>
      )}

      {/* Header with glassmorphism effect */}
      <div className="relative p-6 border-b border-slate-200 bg-gradient-to-br from-slate-50 to-white">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-bold text-xl text-slate-900">
              Timeline Health Monitor
            </h3>
            <p className="text-sm text-slate-600 mt-1">Basic 7-day timeline view</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="text-3xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
              ${valueMetric.amount}
            </div>
            <div className="text-xs text-slate-500 uppercase tracking-wide">{valueMetric.label}</div>
          </div>
        </div>
      </div>

      {/* Circular Metrics with enhanced styling */}
      <div className="p-6 bg-gradient-to-b from-white via-slate-50 to-white">
        <div className="flex justify-around items-center">
          {pillars.slice(0, 2).map((pillar: any, idx: number) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.2 }}
            >
              <CircularMetric
                value={pillar.value}
                label={pillar.name}
                unit={pillar.unit}
                size="lg"
                color={idx === 0 ? "var(--platinum-800)" : "var(--platinum-700)"}
              />
            </motion.div>
          ))}
        </div>
      </div>

      {/* Interactive Timeline (limited features) */}
      <div className="px-6 pb-6">
        <div className="relative">
          <InteractiveTimeline
            blocks={timelineBlocks}
            draggable={false}
            clickable={false}
            zoomEnabled={false}
          />
          {/* Locked features overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-white/90 to-transparent flex items-end justify-center pb-4 pointer-events-none">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Lock className="w-4 h-4" />
              <span>Unlock interactive timeline with Starter</span>
            </div>
          </div>
        </div>
      </div>

      {/* Value Statement with animation */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="px-6 py-4 border-t border-slate-200 bg-gradient-to-r from-slate-50 to-white"
      >
        <p className="text-center text-slate-900">
          You've tracked <span className="font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">${valueMetric.amount}</span> this {valueMetric.cadence} with basic timeline monitoring
        </p>
      </motion.div>

      {/* Upgrade Prompt */}
      {upgradePrompt && (
        <UpgradePrompt
          message={upgradePrompt.message}
          valueGap={upgradePrompt.valueGap}
          targetTier={upgradePrompt.targetTier}
          description={upgradePrompt.description}
          onUpgrade={onUpgrade}
        />
      )}
    </Card>
  );
}
