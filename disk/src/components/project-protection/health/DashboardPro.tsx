import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CircularMetric } from "./CircularMetric";
import { UpgradePrompt } from "./UpgradePrompt";
import { motion } from "framer-motion";
import { Shield, AlertTriangle } from "lucide-react";

interface DashboardProProps {
  data: any;
  onUpgrade?: () => void;
}

export function DashboardPro({ data, onUpgrade }: DashboardProProps) {
  const pillars = data.pillars || [];
  const valueMetric = data.valueMetric || { amount: 0, label: "Protected", cadence: "month" };
  const vulnerabilityHotspots = data.vulnerabilityHotspots || [];
  const upgradePrompt = data.upgradePrompt;
  const darkPsychology = data.darkPsychology || {};

  return (
    <Card className="relative overflow-hidden bg-white rounded-2xl border border-slate-400 shadow-lg">
      {/* Social Proof Banner */}
      {darkPsychology.socialProof && (
        <div className="bg-blue-50 border-b border-blue-200 px-6 py-3">
          <p className="text-sm text-blue-900 font-medium text-center">{darkPsychology.socialProof}</p>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-start p-6 border-b border-slate-200">
        <div>
          <h3 className="font-bold text-xl text-slate-900" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
            Project Health Dashboard
          </h3>
          <p className="text-sm text-slate-600 mt-1">Advanced vulnerability detection</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="text-2xl font-bold text-primary">${valueMetric.amount}</div>
          <div className="text-xs text-slate-500 uppercase tracking-wide">{valueMetric.label}</div>
        </div>
      </div>

      {/* Circular Metrics Grid */}
      <div className="p-6" style={{ background: "linear-gradient(to bottom, #F0F9FF 0%, #F8FAFC 100%)" }}>
        <div className="grid grid-cols-4 gap-4">
          {pillars.map((pillar: any, idx: number) => (
            <CircularMetric
              key={idx}
              value={pillar.value}
              label={pillar.name}
              unit={pillar.unit}
              size="sm"
              color={["#1e293b", "#334155", "#475569", "#64748b"][idx]}
              tooltip={`${pillar.name}: ${pillar.value}${pillar.unit}`}
            />
          ))}
        </div>
      </div>

      {/* Vulnerability Hotspots */}
      {vulnerabilityHotspots.length > 0 && (
        <div className="px-6 pb-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <Shield className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h5 className="font-medium text-red-900 mb-2">Vulnerability Hotspots</h5>
                <div className="space-y-2">
                  {vulnerabilityHotspots.slice(0, 3).map((hotspot: any, idx: number) => (
                    <motion.div
                      key={idx}
                      className="text-sm text-red-800 flex justify-between items-center"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                    >
                      <span>• {hotspot.description}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-red-600 font-medium">-${hotspot.potentialLoss}</span>
                        <Badge variant="destructive" className="text-xs">{hotspot.severity}</Badge>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Value Statement */}
      <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/50">
        <p className="text-center text-slate-900">
          You're preventing <span className="font-bold text-primary">${valueMetric.amount}</span>/{valueMetric.cadence} in timeline-related payment denials
        </p>
      </div>

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
