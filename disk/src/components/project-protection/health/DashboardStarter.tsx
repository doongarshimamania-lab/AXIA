import { Card } from "@/components/ui/card";
import { CircularMetric } from "./CircularMetric";
import { UpgradePrompt } from "./UpgradePrompt";
import { InteractiveTimeline } from "./InteractiveTimeline";
import { WorkRhythmVisualizer } from "./WorkRhythmVisualizer";
import { motion } from "framer-motion";
import { AlertTriangle, Zap } from "lucide-react";

interface DashboardStarterProps {
  data: any;
  onUpgrade?: () => void;
}

export function DashboardStarter({ data, onUpgrade }: DashboardStarterProps) {
  const pillars = data.pillars || [];
  const valueMetric = data.valueMetric || { amount: 0, label: "Protected", cadence: "week" };
  const timelineBlocks = data.timelineBlocks || [];
  const workPatterns = data.workPatterns || {};
  const upgradePrompt = data.upgradePrompt;
  const darkPsychology = data.darkPsychology || {};

  return (
    <Card className="relative overflow-hidden bg-white rounded-2xl border border-slate-300 shadow-lg">
      {/* Loss Aversion Banner with pulse animation */}
      {darkPsychology.lossAversion && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-red-50 via-orange-50 to-red-50 border-b border-red-200 px-6 py-3 flex items-center gap-2"
        >
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <AlertTriangle className="w-4 h-4 text-red-600" />
          </motion.div>
          <p className="text-sm text-red-900 font-medium">{darkPsychology.lossAversion}</p>
        </motion.div>
      )}

      {/* Header with gradient */}
      <div className="relative p-6 border-b border-slate-200 bg-gradient-to-br from-blue-50 via-white to-muted/50">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              <h3 className="font-bold text-xl text-slate-900" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
                Work Rhythm Analyzer
              </h3>
            </div>
            <p className="text-sm text-slate-600 mt-1">14-day pattern detection & optimization</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="text-3xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
              ${valueMetric.amount}
            </div>
            <div className="text-xs text-slate-500 uppercase tracking-wide">{valueMetric.label}</div>
          </div>
        </div>
      </div>

      {/* Work Rhythm Visualizer */}
      <div className="p-6">
        <WorkRhythmVisualizer
          rhythm={pillars[0]?.value || 0}
          velocity={pillars[1]?.value || 0}
          trend={workPatterns.trend || "steady"}
          peakHour={workPatterns.peakHour}
        />
      </div>

      {/* Circular Metrics Grid with stagger animation */}
      <div className="px-6 pb-6">
        <div className="grid grid-cols-3 gap-4">
          {pillars.slice(0, 3).map((pillar: any, idx: number) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.15 }}
            >
              <CircularMetric
                value={pillar.value}
                label={pillar.name}
                unit={pillar.unit}
                size="sm"
                color={["#1e293b", "#334155", "#475569"][idx]}
                tooltip={`${pillar.name}: ${pillar.value}${pillar.unit}`}
              />
            </motion.div>
          ))}
        </div>
      </div>

      {/* Interactive Timeline (draggable & clickable) */}
      <div className="px-6 pb-6">
        <InteractiveTimeline
          blocks={timelineBlocks}
          draggable={data.interactiveFeatures?.draggableTimeline}
          clickable={data.interactiveFeatures?.clickableBlocks}
          zoomEnabled={false}
        />
      </div>

      {/* Work Patterns Insight Card */}
      {workPatterns.peakHour && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mx-6 mb-6 p-4 rounded-lg bg-gradient-to-br from-muted/50 to-blue-50 border border-border"
        >
          <div className="flex items-start justify-between">
            <div>
              <h5 className="font-medium text-slate-900 mb-1">Work Pattern Insights</h5>
              <p className="text-sm text-slate-600">
                Peak productivity at <span className="font-semibold text-primary">{workPatterns.peakHour}:00</span>
              </p>
              {workPatterns.weekendWork > 0 && (
                <p className="text-xs text-slate-500 mt-1">
                  {workPatterns.weekendWork} weekend sessions detected
                </p>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Value Statement */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="px-6 py-4 border-t border-slate-200 bg-gradient-to-r from-slate-50 to-white"
      >
        <p className="text-center text-slate-900">
          Optimizing <span className="font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">${valueMetric.amount}</span>/{valueMetric.cadence} through rhythm analysis
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
