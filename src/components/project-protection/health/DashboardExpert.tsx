import { Card } from "@/components/ui/card";
import { CircularMetric } from "./CircularMetric";
import { motion } from "framer-motion";
import { TrendingUp, Zap } from "lucide-react";

interface DashboardExpertProps {
  data: any;
}

export function DashboardExpert({ data }: DashboardExpertProps) {
  const pillars = data.pillars || [];
  const valueMetric = data.valueMetric || { amount: 0, label: "Protected", cadence: "month" };
  const strategicRecommendations = data.strategicRecommendations || [];
  const darkPsychology = data.darkPsychology || {};

  return (
    <Card className="relative overflow-hidden bg-white rounded-2xl border border-slate-500 shadow-xl">
      {/* Authority Banner */}
      {darkPsychology.authority && (
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-6 py-3">
          <p className="text-sm text-white font-medium text-center">{darkPsychology.authority}</p>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-start p-6 border-b border-slate-200">
        <div>
          <h3 className="font-bold text-xl text-slate-900">
            Project Health Dashboard
          </h3>
          <p className="text-sm text-slate-600 mt-1">Enterprise-level timeline protection</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="text-2xl font-bold text-primary">${valueMetric.amount}</div>
          <div className="text-xs text-slate-500 uppercase tracking-wide">{valueMetric.label}</div>
        </div>
      </div>

      {/* Circular Metrics Grid */}
      <div className="p-6" style={{ background: "linear-gradient(to bottom, #EDF2F7 0%, #F8FAFC 100%)" }}>
        <div className="grid grid-cols-4 gap-4">
          {pillars.map((pillar: any, idx: number) => (
            <CircularMetric
              key={idx}
              value={pillar.value}
              label={pillar.name}
              unit={pillar.unit}
              size="sm"
              color={["var(--platinum-800)", "var(--platinum-700)", "#475569", "var(--premium)"][idx]}
              tooltip={`${pillar.name}: ${pillar.value}${pillar.unit}`}
            />
          ))}
        </div>
      </div>

      {/* Strategic Recommendations */}
      {strategicRecommendations.length > 0 && (
        <div className="px-6 pb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <Zap className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h5 className="font-medium text-blue-900 mb-2">Strategic Recommendations</h5>
                <ul className="space-y-2">
                  {strategicRecommendations.map((rec: string, idx: number) => (
                    <motion.li
                      key={idx}
                      className="text-sm text-blue-800"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                    >
                      • {rec}
                    </motion.li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Social Proof */}
      {darkPsychology.socialProof && (
        <div className="px-6 pb-6">
          <div className="bg-gradient-to-r from-muted/50 to-blue-50 rounded-lg p-4 border border-border">
            <p className="text-sm text-center text-slate-900 font-medium">{darkPsychology.socialProof}</p>
          </div>
        </div>
      )}

      {/* Value Statement */}
      <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/50">
        <p className="text-center text-slate-900">
          You're protecting <span className="font-bold text-primary">${valueMetric.amount}</span>/{valueMetric.cadence} across all projects through business-wide timeline protection
        </p>
      </div>

      {/* Top Tier Badge */}
      <div className="p-6 border-t border-slate-200 bg-gradient-to-r from-muted/50 to-blue-50">
        <div className="text-center">
          <TrendingUp className="w-8 h-8 text-primary mx-auto mb-2" />
          <p className="font-medium text-slate-900">Top-tier protection active</p>
          <p className="text-sm text-slate-600 mt-1">You have access to all enterprise features</p>
        </div>
      </div>
    </Card>
  );
}
