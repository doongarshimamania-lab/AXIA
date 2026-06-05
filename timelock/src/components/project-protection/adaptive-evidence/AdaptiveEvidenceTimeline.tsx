import { Card } from "@/components/ui/card";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { TierHeader } from "./TierHeader";
import { ValueMetricCard } from "./ValueMetricCard";
import { PillarGrid } from "./PillarGrid";
import { PsychologyBanner } from "./PsychologyBanner";
import { UpgradePrompt } from "./UpgradePrompt";
import { TimelineVisualization } from "./TimelineVisualization";

interface AdaptiveEvidenceTimelineProps {
  projectData: any;
  tier: string;
  onUpgrade?: () => void;
}

// Check if a project ID looks like a valid Convex ID (not a mock string like "proj_1")
function isValidConvexId(id: string | undefined): id is string {
  if (!id) return false;
  // Convex IDs are typically 17+ character alphanumeric strings, not "proj_1" style mock IDs
  return id.length >= 10 && !id.includes("_");
}

export function AdaptiveEvidenceTimeline({ projectData, tier, onUpgrade }: AdaptiveEvidenceTimelineProps) {
  const projectId = projectData?._id;
  const validProjectId = isValidConvexId(projectId) ? (projectId as Id<"projects">) : null;

  const data = useQuery(
    api.projects.adaptiveEvidenceSystem.getAdaptiveEvidenceSystem,
    validProjectId ? { projectId: validProjectId, userTier: tier } : "skip"
  );

  if (!data) {
    return (
      <Card className="p-6 h-[400px] flex items-center justify-center bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0A192F] dark:border-white"></div>
          <p className="text-sm text-slate-500">Loading evidence timeline...</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden transition-all duration-300">
      <TierHeader 
        tier={data.tier} 
        description={data.valueMetric?.description || "Evidence optimization"} 
      />

      <PsychologyBanner psychology={data.psychology} tier={data.tier} />

      <ValueMetricCard 
        label={data.valueMetric?.label}
        amount={data.valueMetric?.amount}
        period={data.valueMetric?.period}
        description={data.valueMetric?.description}
        tier={data.tier}
      />

      <TimelineVisualization tier={data.tier} data={data} />

      <PillarGrid pillars={data.pillars} tier={data.tier} />

      <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 text-center">
        <p className="text-[#0A192F] dark:text-white font-bold text-sm tracking-tight">
          {data.corePositioning}
        </p>
      </div>

      <UpgradePrompt upgrade={data.upgrade} onUpgrade={onUpgrade} />
    </Card>
  );
}