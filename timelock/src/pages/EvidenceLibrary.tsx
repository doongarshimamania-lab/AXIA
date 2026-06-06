import { useState, useMemo, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useSubscriptionTier } from "@/hooks/use-subscription-tier";
import { WorkContentAnalysis } from "@/components/evidence-library/WorkContentAnalysis";
import { EvidenceTimeline } from "@/components/evidence-library/EvidenceTimeline";
import { EvidenceQualityScorecard } from "@/components/evidence-library/EvidenceQualityScorecard";
import { TeamValidation } from "@/components/evidence-library/TeamValidation";
import { EvidenceItemsList } from "@/components/evidence-library/EvidenceItemsList";

type ViewType = "date" | "project" | "client" | "type";

export default function EvidenceLibrary() {
  const { tier: subscriptionTier } = useSubscriptionTier();
  const [viewMode, setViewMode] = useState<ViewType>("date");
  
  const dateRange = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - 30);
    const end = new Date(now);
    end.setDate(end.getDate() + 30);
    return {
      start: start.getTime(),
      end: end.getTime()
    };
  }, []);

  const startOfDay = useMemo(() => new Date().setHours(0, 0, 0, 0), []);

  const evidenceData = useQuery(api.evidence.library.getEvidenceLibraryData, {
    view: viewMode,
    startDate: dateRange.start,
    endDate: dateRange.end,
  });

  const timelineData = useQuery(api.evidence.library.getEvidenceTimeline, {
    date: startOfDay,
  });
  
  const getTierLevel = (tier: string) => {
    const levels: Record<string, number> = { free: 0, starter: 1, pro: 2, expert: 3, client: 0 };
    return levels[tier] || 0;
  };
  const hasTierAccess = (requiredTier: string) => getTierLevel(subscriptionTier) >= getTierLevel(requiredTier);

  const isLoading = evidenceData === undefined || timelineData === undefined;
  
  const safeEvidenceData = evidenceData ?? {
    totalCount: 0,
    disputeSuccessRate: 0,
    contentQualityScore: 0,
    gapPrediction: {
      status: "no_gaps" as const,
      message: "No Gaps Predicted",
      description: "Start collecting evidence to build your protection.",
      nextGapTime: null,
      missingTypes: [],
    },
    evidenceItems: [],
    healthScore: null,
    disputeData: null,
    contentData: null,
  };
  
  const safeTimelineData = timelineData ?? {
    protectedHours: 0,
    timeline: [],
  };

  const [showTimeout, setShowTimeout] = useState(false);
  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => setShowTimeout(true), 5000);
      return () => clearTimeout(timer);
    }
    setShowTimeout(false);
  }, [isLoading]);

  return (
    <div className="w-full min-h-screen bg-background">
      <div className="p-8 space-y-6">
        {isLoading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading evidence data...</p>
            {showTimeout && (
              <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  Taking longer than expected. Check your connection or try refreshing the page.
                </p>
              </div>
            )}
          </div>
        )}
        
        {!isLoading && (
          <>
            <div>
              <h1 className="text-[32px] font-bold text-foreground tracking-tight mb-2">
                Evidence Library
              </h1>
              <p className="text-[16px] text-muted-foreground">
                Monitor capture health, anticipate gaps early, and export airtight proof on demand.
              </p>
            </div>

            <WorkContentAnalysis
              qualityScore={safeEvidenceData.contentQualityScore}
              hasAccess={hasTierAccess("pro")}
              contentData={safeEvidenceData.contentData}
            />

            <EvidenceTimeline timeline={safeTimelineData.timeline} />

            <EvidenceQualityScorecard
              hasAccess={hasTierAccess("pro")}
              healthScore={safeEvidenceData.healthScore}
            />

            <TeamValidation hasAccess={hasTierAccess("expert")} />

            <EvidenceItemsList
              evidenceItems={safeEvidenceData.evidenceItems}
              viewMode={viewMode}
              setViewMode={setViewMode}
            />
          </>
        )}
      </div>
    </div>
  );
}
