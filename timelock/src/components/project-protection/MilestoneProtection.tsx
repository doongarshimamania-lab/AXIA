import { useQuery } from "@/lib/safe-convex-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent } from "@/components/ui/card";
import { MilestoneProtectionFree } from "./MilestoneProtectionFree";
import { MilestoneProtectionStarter } from "./MilestoneProtectionStarter";
import { MilestoneProtectionPro } from "./MilestoneProtectionPro";
import { MilestoneProtectionExpert } from "./MilestoneProtectionExpert";
import { Shield, Target } from "lucide-react";

interface MilestoneProtectionProps {
  projectId?: Id<"projects">;
  tier: string;
  onUpgrade?: () => void;
}

export function MilestoneProtection({ projectId, tier, onUpgrade }: MilestoneProtectionProps) {
  const milestoneData = useQuery(
    api.projects.milestoneProtection.getMilestoneProtection,
    projectId ? { projectId, userTier: tier } : "skip"
  );

  if (!projectId) {
    return (
      <Card className="border border-border">
        <CardContent className="p-6">
          <div className="text-center py-8 text-muted-foreground">
            <Target className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Select a project to view milestone protection</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (projectId && milestoneData === undefined) {
    return (
      <Card className="p-6 bg-card rounded-xl border border-border">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Card>
    );
  }

  if (!milestoneData) {
    return (
      <Card className="p-6 bg-card rounded-xl border border-border">
        <div className="text-center py-4 text-sm text-muted-foreground">
          Loading milestone data...
        </div>
      </Card>
    );
  }

  const {
    milestones = [],
    totalProtectedValue = 0,
    totalAtRiskValue = 0,
    avgProtectionRate = 0,
    predictions = null,
    alerts = [],
    latestReport = null,
    snapshots = [],
  } = milestoneData;

  // 4-Pillar Tier Structure: Free → Starter → Pro → Expert
  // Each tier builds on the previous with validated problem-solving
  
  if (tier === "free") {
    // FREE TIER: Basic milestone tracking (22% protection)
    return (
      <MilestoneProtectionFree
        milestones={milestones}
        totalProtectedValue={totalProtectedValue}
        totalAtRiskValue={totalAtRiskValue}
        avgProtectionRate={avgProtectionRate}
        onUpgrade={onUpgrade}
      />
    );
  }

  if (tier === "starter") {
    // STARTER TIER: Enhanced tracking + alerts (67% protection)
    return (
      <MilestoneProtectionStarter
        milestones={milestones}
        totalProtectedValue={totalProtectedValue}
        totalAtRiskValue={totalAtRiskValue}
        avgProtectionRate={avgProtectionRate}
        onUpgrade={onUpgrade}
      />
    );
  }

  if (tier === "pro") {
    // PRO TIER: Advanced analytics + reports + snapshots (85% protection)
    return (
      <MilestoneProtectionPro
        milestones={milestones}
        totalProtectedValue={totalProtectedValue}
        totalAtRiskValue={totalAtRiskValue}
        avgProtectionRate={avgProtectionRate}
        alerts={alerts}
        latestReport={latestReport}
        snapshots={snapshots}
        onUpgrade={onUpgrade}
        projectId={projectId || undefined}
      />
    );
  }

  if (tier === "expert") {
    // EXPERT TIER: Predictive AI + full automation (95% protection)
    return (
      <MilestoneProtectionExpert
        milestones={milestones}
        totalProtectedValue={totalProtectedValue}
        totalAtRiskValue={totalAtRiskValue}
        avgProtectionRate={avgProtectionRate}
        predictions={predictions}
        alerts={alerts}
        latestReport={latestReport}
        snapshots={snapshots}
        projectId={projectId || undefined}
      />
    );
  }

  // Default fallback to Free tier
  return <MilestoneProtectionFree milestones={milestones} totalProtectedValue={totalProtectedValue} totalAtRiskValue={totalAtRiskValue} avgProtectionRate={avgProtectionRate} onUpgrade={onUpgrade} />;
}