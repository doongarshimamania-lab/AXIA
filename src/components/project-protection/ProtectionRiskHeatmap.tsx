import { useQuery } from "@/lib/safe-convex-react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Lock, AlertTriangle, TrendingUp, Target } from "lucide-react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";

interface ProtectionRiskHeatmapProps {
  projectId?: Id<"projects">;
  tier: string;
  onUpgrade?: () => void;
}

export function ProtectionRiskHeatmap({ projectId, tier, onUpgrade }: ProtectionRiskHeatmapProps) {
  const heatmapData = useQuery(
    api.projects.projectProtection.getProjectRiskHeatmap,
    projectId ? { projectId } : "skip"
  );

  const normalizedTier = tier.toLowerCase();

  // Loading state
  if (heatmapData === undefined && projectId) {
    return (
      <Card className="border border-border">
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!projectId) {
    return (
      <Card className="border border-border">
        <CardContent className="p-6">
          <div className="text-center py-8 text-muted-foreground">
            <Target className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Select a project to view the risk heatmap</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Free Tier - Feature Locked
  if (normalizedTier === "free") {
    return (
      <Card className="border border-border relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-muted/50 to-muted/20 backdrop-blur-sm z-10 flex items-center justify-center">
          <div className="text-center p-8">
            <Lock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Protection Risk Heatmap</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Visualize vulnerability patterns across time and identify high-risk periods
            </p>
            <Button onClick={onUpgrade} size="sm">
              Upgrade to Starter
            </Button>
          </div>
        </div>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 blur-sm">
            <Target className="h-5 w-5" />
            Risk Heatmap
          </CardTitle>
        </CardHeader>
        <CardContent className="blur-sm">
          <div className="h-64 bg-muted/20 rounded-lg"></div>
        </CardContent>
      </Card>
    );
  }

  if (!heatmapData) {
    return (
      <Card className="border border-border">
        <CardContent className="p-6">
          <div className="text-center py-8 text-muted-foreground">
            No heatmap data available
          </div>
        </CardContent>
      </Card>
    );
  }

  const { heatmap, topRiskPeriods, totalRiskEvents } = heatmapData;
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  // Starter Tier - Basic Heatmap
  if (normalizedTier === "starter") {
    return (
      <Card className="border border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Risk Heatmap
            </CardTitle>
            <Badge variant="outline">{totalRiskEvents} risk events</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Simple Grid View */}
          <div className="grid grid-cols-7 gap-2">
            {days.map((day) => (
              <div key={day} className="text-center">
                <div className="text-xs font-medium text-muted-foreground mb-2">
                  {day.slice(0, 3)}
                </div>
                <div className="space-y-1">
                  {[9, 12, 15, 18].map((hour) => {
                    const risk = heatmap[day]?.[hour] || 0;
                    const intensity = risk >= 5 ? "high" : risk >= 2 ? "medium" : "low";
                    return (
                      <div
                        key={hour}
                        className={`h-8 rounded ${
                          intensity === "high"
                            ? "bg-red-500/80"
                            : intensity === "medium"
                            ? "bg-yellow-500/60"
                            : "bg-green-500/40"
                        }`}
                        title={`${hour}:00 - Risk: ${risk}`}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Top Risk Periods */}
          <div className="pt-4 border-t">
            <h4 className="text-sm font-medium mb-3">Top Risk Periods</h4>
            <div className="space-y-2">
              {topRiskPeriods.slice(0, 3).map((period: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {period.day} at {period.hour}:00
                  </span>
                  <Badge variant={period.riskLevel === "high" ? "destructive" : "secondary"}>
                    {period.riskLevel}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Upgrade Prompt */}
          <div className="pt-4 border-t bg-muted/30 -mx-6 -mb-6 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Unlock Interactive Heatmap</p>
                <p className="text-xs text-muted-foreground">
                  Hover insights and detailed risk analysis
                </p>
              </div>
              <Button onClick={onUpgrade} size="sm" variant="outline">
                Upgrade to Pro
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Pro & Expert Tier - Interactive Heatmap with Hover Details
  return (
    <Card className="border border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Protection Risk Heatmap
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{totalRiskEvents} risk events</Badge>
            {normalizedTier === "expert" && (
              <Badge className="bg-gradient-to-r from-platinum-500 to-amber-500">
                AI-Enhanced
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Interactive Grid with Hover Cards */}
        <div className="grid grid-cols-7 gap-2">
          {days.map((day) => (
            <div key={day} className="text-center">
              <div className="text-xs font-medium text-muted-foreground mb-2">
                {day.slice(0, 3)}
              </div>
              <div className="space-y-1">
                {Array.from({ length: 24 }, (_, i) => i).map((hour) => {
                  const risk = heatmap[day]?.[hour] || 0;
                  const intensity = risk >= 5 ? "high" : risk >= 2 ? "medium" : risk > 0 ? "low" : "none";
                  
                  if (intensity === "none") return null;

                  return (
                    <HoverCard key={hour}>
                      <HoverCardTrigger asChild>
                        <div
                          className={`h-6 rounded cursor-pointer transition-all hover:scale-110 ${
                            intensity === "high"
                              ? "bg-red-500/80 hover:bg-red-500"
                              : intensity === "medium"
                              ? "bg-yellow-500/60 hover:bg-yellow-500"
                              : "bg-green-500/40 hover:bg-green-500"
                          }`}
                        />
                      </HoverCardTrigger>
                      <HoverCardContent className="w-64">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{day}</span>
                            <Badge variant={intensity === "high" ? "destructive" : "secondary"}>
                              {intensity} risk
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            <div>Time: {hour}:00 - {hour + 1}:00</div>
                            <div>Risk Events: {risk}</div>
                          </div>
                          {normalizedTier === "expert" && (
                            <div className="pt-2 border-t text-xs">
                              <div className="flex items-center gap-1 text-platinum-400">
                                <TrendingUp className="h-3 w-3" />
                                <span>AI Recommendation: Schedule critical work outside this window</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </HoverCardContent>
                    </HoverCard>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Detailed Risk Analysis */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div>
            <h4 className="text-sm font-medium mb-3">Highest Risk Periods</h4>
            <div className="space-y-2">
              {topRiskPeriods.slice(0, 5).map((period: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between text-sm p-2 rounded bg-muted/50">
                  <span className="text-muted-foreground">
                    {period.day} {period.hour}:00
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs">{period.riskScore} events</span>
                    <Badge variant={period.riskLevel === "high" ? "destructive" : "secondary"} className="text-xs">
                      {period.riskLevel}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium mb-3">Risk Distribution</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">High Risk</span>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-24 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-500"
                      style={{
                        width: `${(topRiskPeriods.filter((p: any) => p.riskLevel === "high").length / topRiskPeriods.length) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs font-medium">
                    {topRiskPeriods.filter((p: any) => p.riskLevel === "high").length}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Medium Risk</span>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-24 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-yellow-500"
                      style={{
                        width: `${(topRiskPeriods.filter((p: any) => p.riskLevel === "medium").length / topRiskPeriods.length) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs font-medium">
                    {topRiskPeriods.filter((p: any) => p.riskLevel === "medium").length}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Low Risk</span>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-24 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500"
                      style={{
                        width: `${(topRiskPeriods.filter((p: any) => p.riskLevel === "low").length / topRiskPeriods.length) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs font-medium">
                    {topRiskPeriods.filter((p: any) => p.riskLevel === "low").length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Expert-Only AI Insights */}
        {normalizedTier === "expert" && (
          <div className="pt-4 border-t bg-gradient-to-r from-platinum-500/10 to-amber-500/10 -mx-6 -mb-6 px-6 py-4 rounded-b-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-platinum-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium">AI Strategic Insight</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Your highest risk periods are {topRiskPeriods[0]?.day}s at {topRiskPeriods[0]?.hour}:00. 
                  Consider scheduling critical deliverables outside these windows to minimize dispute risk.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}