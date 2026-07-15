import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { ExpandableSection } from "./CollapsibleSidebar"; // Assuming shared

interface ProtectionMetricsProps {
  protectionMetrics: any;
  expandedSections: Record<string, boolean>;
  onToggleSection: (section: string) => void;
  activeSessionDuration: number;
}

export function ProtectionMetrics({ 
  protectionMetrics, 
  expandedSections, 
  onToggleSection, 
  activeSessionDuration 
}: ProtectionMetricsProps) {
  const protectionScore = protectionMetrics?.protectionScore || 100;

  return (
    <ExpandableSection
      title="Protection Dashboard"
      isExpanded={expandedSections.protectionDashboard}
      onToggle={() => onToggleSection("protectionDashboard")}
    >
      <div className="px-4 py-4 space-y-4">
        <div className="flex flex-col items-center py-4">
          <div className="relative w-32 h-32">
            <svg className="w-32 h-32 transform -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="var(--platinum-800)"
                strokeWidth="8"
                fill="none"
              />
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="var(--color-success, #10B981)"
                strokeWidth="8"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 56}`}
                strokeDashoffset={`${2 * Math.PI * 56 * (1 - protectionScore / 100)}`}
                strokeLinecap="round"
                className="transition-all duration-500"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-foreground dark:text-white">{protectionScore}</span>
              <span className="text-xs text-emerald-400 mt-1">Protection</span>
            </div>
          </div>
          <div className="mt-3 px-3 py-1 bg-emerald-500/20 rounded-full">
            <span className="text-xs text-emerald-400 font-medium flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Active Protection
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="bg-slate-100 dark:bg-platinum-800 rounded-lg p-3">
            <div className="text-[10px] text-muted-foreground mb-1">Active Session</div>
            <div className="text-base font-bold text-foreground dark:text-white">
              {protectionMetrics?.activeSession ? `${activeSessionDuration}m` : '0m'}
            </div>
          </div>
          <div className="bg-slate-100 dark:bg-platinum-800 rounded-lg p-3">
            <div className="text-[10px] text-muted-foreground mb-1">Protected Today</div>
            <div className="text-base font-bold text-foreground dark:text-white">
              {protectionMetrics?.protectedHours ? `${Math.floor(protectionMetrics.protectedHours)}h` : '0h'}
            </div>
          </div>
          <div className="bg-slate-100 dark:bg-platinum-800 rounded-lg p-3">
            <div className="text-[10px] text-muted-foreground mb-1">Evidence Events</div>
            <div className="text-base font-bold text-foreground dark:text-white">
              {protectionMetrics?.evidenceEvents || 0}
            </div>
          </div>
          <div className="bg-slate-100 dark:bg-platinum-800 rounded-lg p-3">
            <div className="text-[10px] text-muted-foreground mb-1">Platforms</div>
            <div className="text-base font-bold text-foreground dark:text-white">
              {protectionMetrics?.connectedPlatforms || 0}
            </div>
          </div>
        </div>
      </div>
    </ExpandableSection>
  );
}
