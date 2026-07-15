import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle, XCircle, TrendingUp, TrendingDown, Minus, Shield, LineChart, Calendar, FileText, Bell, Sparkles, Camera, TestTube } from "lucide-react";
import { useState } from "react";
import { useMutation } from "@/lib/safe-convex-react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import type { Id } from "@/convex/_generated/dataModel";

interface Milestone {
  period: string;
  weekNumber: number;
  hours: number;
  value: number;
  protectionRate: number;
  evidenceCount: number;
  status: string;
}

interface Predictions {
  nextWeekProtection: number;
  riskForecast: string;
  riskLevel: string;
  recommendedActions: string[];
  trends: {
    protectionTrend: number;
    hoursTrend: number;
    evidencePerHour: number;
  };
  analytics: {
    avgProtection: number;
    avgHours: number;
    avgEvidence: number;
    consistency: number;
  };
}

type Snapshot = {
  _id: string;
  weekNumber: number;
  weekStart: number;
  weekEnd: number;
  totalHours: number;
  totalEvidence: number;
  protectionRate: number;
  sessionCount?: number;
  createdAt: number;
};

interface MilestoneProtectionExpertProps {
  milestones: Milestone[];
  totalProtectedValue: number;
  totalAtRiskValue: number;
  avgProtectionRate: number;
  predictions: Predictions | null;
  alerts?: any[];
  latestReport?: any;
  projectId?: Id<"projects">;
  snapshots?: Snapshot[];
}

export function MilestoneProtectionExpert({
  milestones,
  totalProtectedValue,
  totalAtRiskValue,
  avgProtectionRate,
  predictions,
  alerts,
  latestReport,
  projectId,
  snapshots = [],
}: MilestoneProtectionExpertProps) {
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const displayMilestones = milestones.slice(0, 8);
  const unreadAlerts = alerts?.filter((a) => !a.isRead).length || 0;
  const snapshotHistory = snapshots.slice(0, 4);

  // Test mutations
  const testCreateSnapshot = useMutation(api.projects.milestoneProtectionTest.testCreateSnapshot);
  const testCreateAlert = useMutation(api.projects.milestoneProtectionTest.testCreateAlert);
  const testGenerateReport = useMutation(api.projects.milestoneProtectionTest.testGenerateReport);

  const handleTestSnapshot = async () => {
    if (!projectId) {
      toast.error("No project selected");
      return;
    }
    try {
      toast.info("Creating test snapshot...");
      const result = await testCreateSnapshot({ projectId });
      toast.success(result.message);
    } catch (error) {
      toast.error("Failed to create snapshot: " + (error as Error).message);
    }
  };

  const handleTestAlert = async () => {
    if (!projectId) {
      toast.error("No project selected");
      return;
    }
    try {
      toast.info("Creating test alert...");
      const result = await testCreateAlert({ 
        projectId, 
        alertType: "protection_drop" 
      });
      toast.success(result.message);
    } catch (error) {
      toast.error("Failed to create alert: " + (error as Error).message);
    }
  };

  const handleTestReport = async () => {
    if (!projectId) {
      toast.error("No project selected");
      return;
    }
    try {
      toast.info("Generating test report...");
      const result = await testGenerateReport({ projectId });
      toast.success(result.message);
    } catch (error) {
      toast.error("Failed to generate report: " + (error as Error).message);
    }
  };

  return (
    <Card className="relative overflow-hidden bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-950 rounded-2xl border-2 border-slate-300 dark:border-slate-700 shadow-2xl">
      {/* Premium Header with Animated Gradient */}
      <div className="relative p-6 border-b border-slate-300 dark:border-slate-700 bg-gradient-to-r from-axia-teal-600 via-platinum-600 to-amber-600 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>
        <div className="relative flex items-center justify-between">
          <div>
            <h3 className="font-bold text-2xl text-white flex items-center gap-2">
              <Shield className="w-6 h-6" />
              Milestone Protection Intelligence
            </h3>
            <p className="text-sm text-axia-teal-600 mt-1">
              Advanced 8-week tracking with automated reports
            </p>
          </div>
          <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-slate-900 border-0 font-bold px-4 py-1">
            EXPERT
          </Badge>
        </div>
      </div>

      {/* PRO FEATURE: Testing Controls with Enhanced Explanations */}
      {projectId && (
        <div className="p-4 bg-gradient-to-br from-platinum-50/50 to-blue-50/50 dark:from-platinum-900/50 dark:to-blue-900/50 border-b border-platinum-300/50 dark:border-platinum-700/50">
          <div className="flex items-center gap-2 mb-3">
            <TestTube className="w-5 h-5 text-platinum-400" />
            <h5 className="font-semibold text-platinum-400">
              Test Milestone Features
            </h5>
            <Badge className="bg-blue-500/20 text-blue-600 dark:text-blue-300 border-blue-500 ml-auto text-xs">
              Pro Feature
            </Badge>
          </div>
          
          <div className="space-y-3 mb-3">
            {/* Snapshot Explanation */}
            <div className="bg-slate-100/95 dark:bg-slate-800/50 rounded-lg p-3 border border-platinum-300/50 dark:border-platinum-700/30">
              <div className="flex items-start gap-2">
                <Camera className="w-4 h-4 text-platinum-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="font-medium text-sm text-platinum-400 mb-1">
                    📸 Weekly Snapshot
                  </div>
                  <p className="text-xs text-platinum-400 mb-2">
                    Captures a point-in-time record of your work week: total hours worked, evidence collected, and protection rate. 
                    This creates a permanent record that proves your work history if disputes arise later.
                  </p>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={handleTestSnapshot}
                    className="bg-slate-100 dark:bg-slate-800 text-xs"
                  >
                    Create Snapshot
                  </Button>
                </div>
              </div>
            </div>

            {/* Alert Explanation */}
            <div className="bg-slate-100/95 dark:bg-slate-800/50 rounded-lg p-3 border border-platinum-300/50 dark:border-platinum-700/30">
              <div className="flex items-start gap-2">
                <Bell className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="font-medium text-sm text-platinum-400 mb-1">
                    🔔 Protection Alert
                  </div>
                  <p className="text-xs text-platinum-400 mb-2">
                    Notifies you when your protection rate drops below safe levels or evidence gaps are detected. 
                    Helps you fix issues before they become disputes.
                  </p>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={handleTestAlert}
                    className="bg-slate-100 dark:bg-slate-800 text-xs"
                  >
                    Create Alert
                  </Button>
                </div>
              </div>
            </div>

            {/* Report Explanation */}
            <div className="bg-slate-100/95 dark:bg-slate-800/50 rounded-lg p-3 border border-platinum-300/50 dark:border-platinum-700/30">
              <div className="flex items-start gap-2">
                <FileText className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="font-medium text-sm text-platinum-400 mb-1">
                    📊 Weekly Report
                  </div>
                  <p className="text-xs text-platinum-400 mb-2">
                    Analyzes your week's work patterns, compares to previous weeks, and provides actionable insights. 
                    Shows trends in hours, protection rate, and evidence quality to help you improve.
                  </p>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={handleTestReport}
                    className="bg-slate-100 dark:bg-slate-800 text-xs"
                  >
                    Generate Report
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EXPERT: AI Predictive Intelligence (Algorithmic) */}
      {predictions && (
        <div className="p-6 bg-gradient-to-br from-platinum-50/50 to-axia-teal-50/50 dark:from-platinum-900/50 dark:to-axia-teal-900/50 border-y border-platinum-300/50 dark:border-platinum-700/50">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-platinum-400" />
            <h4 className="font-bold text-foreground dark:text-white text-lg">Predictive Intelligence</h4>
            <Badge className="bg-yellow-500/20 text-yellow-600 dark:text-yellow-300 border-yellow-500 ml-auto">
              <Sparkles className="w-3 h-3 mr-1" />
              Expert Only
            </Badge>
          </div>

          {/* What This Means */}
          <div className="bg-platinum-50/30 dark:bg-platinum-950/30 rounded-lg p-3 mb-4 border border-platinum-300/50 dark:border-platinum-800/30">
            <div className="text-xs font-semibold text-platinum-400 mb-1 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Smart Predictions Based on Your Data:
            </div>
            <p className="text-xs text-platinum-400 leading-relaxed">
              Our algorithms analyze your work patterns, protection trends, and evidence collection habits 
              to predict risks and recommend actions. No guesswork—just data-driven insights.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            {/* Next Week Prediction */}
            <div className="bg-gradient-to-br from-axia-teal-50/40 to-platinum-50/40 dark:from-axia-teal-900/40 dark:to-platinum-900/40 rounded-lg p-4 border border-axia-teal-300/50 dark:border-axia-teal-800/30">
              <div className="text-xs text-axia-teal-600 mb-1">Next Week Forecast</div>
              <div className="text-3xl font-bold text-foreground dark:text-white mb-2">
                {predictions.nextWeekProtection}%
              </div>
              <div className="flex items-center gap-1 text-xs">
                {predictions.trends.protectionTrend > 0 ? (
                  <TrendingUp className="w-3 h-3 text-emerald-400" />
                ) : predictions.trends.protectionTrend < 0 ? (
                  <TrendingDown className="w-3 h-3 text-red-400" />
                ) : (
                  <Minus className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                )}
                <span className={predictions.trends.protectionTrend > 0 ? "text-emerald-400" : predictions.trends.protectionTrend < 0 ? "text-red-400" : "text-slate-500 dark:text-slate-400"}>
                  {predictions.trends.protectionTrend > 0 ? "+" : ""}{predictions.trends.protectionTrend}% trend
                </span>
              </div>
            </div>

            {/* Risk Level */}
            <div className={`rounded-lg p-4 border ${
              predictions.riskLevel === "high" 
                ? "bg-gradient-to-br from-red-50/40 to-amber-50/40 dark:from-red-900/40 dark:to-amber-900/40 border-red-300/50 dark:border-red-800/30"
                : predictions.riskLevel === "medium"
                ? "bg-gradient-to-br from-amber-50/40 to-orange-50/40 dark:from-amber-900/40 dark:to-orange-900/40 border-amber-300/50 dark:border-amber-800/30"
                : "bg-gradient-to-br from-emerald-50/40 to-primary/5 dark:from-emerald-900/40 dark:to-primary/20 border-emerald-300/50 dark:border-emerald-800/30"
            }`}>
              <div className="text-xs text-slate-600 dark:text-slate-300 mb-1">Risk Level</div>
              <div className="text-2xl font-bold text-foreground dark:text-white mb-2 capitalize">
                {predictions.riskLevel}
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-300 capitalize">
                Risk {predictions.riskForecast}
              </div>
            </div>
          </div>

          {/* Smart Recommendations */}
          <div className="space-y-2">
            <div className="text-sm font-semibold text-foreground dark:text-white mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-yellow-400" />
              Smart Recommendations:
            </div>
            {predictions.recommendedActions.map((action, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2 p-3 rounded-lg bg-slate-100/95 dark:bg-slate-800/50 border border-platinum-300/50 dark:border-platinum-700/30 text-sm text-platinum-400"
              >
                <CheckCircle2 className="w-4 h-4 text-platinum-400 flex-shrink-0 mt-0.5" />
                <span>{action}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* EXPERT: Advanced Analytics Dashboard */}
      {predictions && (
        <div className="p-6 bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900 border-y border-slate-300 dark:border-slate-700">
          <div className="flex items-center gap-2 mb-4">
            <LineChart className="w-5 h-5 text-blue-400" />
            <h4 className="font-bold text-foreground dark:text-white text-lg">Advanced Analytics Dashboard</h4>
            <Badge className="bg-yellow-500/20 text-yellow-600 dark:text-yellow-300 border-yellow-500 ml-auto">
              <Sparkles className="w-3 h-3 mr-1" />
              Expert Only
            </Badge>
          </div>

          {/* Analytics Explanation */}
          <div className="bg-blue-50/30 dark:bg-blue-950/30 rounded-lg p-3 mb-4 border border-blue-300/50 dark:border-blue-800/30">
            <div className="text-xs font-semibold text-blue-700 dark:text-blue-200 mb-2 flex items-center gap-1">
              <LineChart className="w-3 h-3" />
              Deep Analytics Across 4 Weeks:
            </div>
            <p className="text-xs text-blue-600 dark:text-blue-300 leading-relaxed">
              Track your performance metrics over time to identify patterns, optimize workflows, 
              and maintain consistent protection. These analytics help you work smarter, not harder.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gradient-to-br from-blue-50/40 to-axia-teal-50/40 dark:from-blue-900/40 dark:to-axia-teal-900/40 rounded-lg p-3 border border-blue-300/50 dark:border-blue-800/30">
              <div className="text-xs text-blue-600 dark:text-blue-300 mb-1">Avg Protection</div>
              <div className="text-2xl font-bold text-foreground dark:text-white">{predictions.analytics.avgProtection}%</div>
              <div className="text-xs text-blue-400 mt-1">Last 4 weeks</div>
            </div>
            <div className="bg-gradient-to-br from-emerald-50/40 to-primary/5 dark:from-emerald-900/40 dark:to-primary/20 rounded-lg p-3 border border-emerald-300/50 dark:border-emerald-800/30">
              <div className="text-xs text-emerald-600 dark:text-emerald-300 mb-1">Consistency Score</div>
              <div className="text-2xl font-bold text-foreground dark:text-white">{predictions.analytics.consistency}%</div>
              <div className="text-xs text-emerald-400 mt-1">Protection stability</div>
            </div>
            <div className="bg-gradient-to-br from-platinum-50/40 to-amber-50/40 dark:from-platinum-900/40 dark:to-amber-900/40 rounded-lg p-3 border border-platinum-300/50 dark:border-platinum-800/30">
              <div className="text-xs text-platinum-400 mb-1">Avg Hours/Week</div>
              <div className="text-2xl font-bold text-foreground dark:text-white">{predictions.analytics.avgHours}h</div>
              <div className="text-xs text-platinum-400 mt-1">
                {predictions.trends.hoursTrend > 0 ? "+" : ""}{predictions.trends.hoursTrend}% trend
              </div>
            </div>
            <div className="bg-gradient-to-br from-amber-50/40 to-orange-50/40 dark:from-amber-900/40 dark:to-orange-900/40 rounded-lg p-3 border border-amber-300/50 dark:border-amber-800/30">
              <div className="text-xs text-amber-600 dark:text-amber-300 mb-1">Evidence Rate</div>
              <div className="text-2xl font-bold text-foreground dark:text-white">{predictions.trends.evidencePerHour}</div>
              <div className="text-xs text-amber-400 mt-1">Items per hour</div>
            </div>
          </div>
        </div>
      )}

      {/* EXPERT: Advanced Analytics Dashboard (from latest report) */}
      {latestReport && (
        <div className="p-6 bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900 border-y border-slate-300 dark:border-slate-700">
          <div className="flex items-center gap-2 mb-4">
            <LineChart className="w-5 h-5 text-blue-400" />
            <h4 className="font-bold text-foreground dark:text-white text-lg">Advanced Analytics Dashboard</h4>
            <Badge className="bg-blue-500/20 text-blue-600 dark:text-blue-300 border-blue-500 ml-auto">
              <Calendar className="w-3 h-3 mr-1" />
              Weekly Insights
            </Badge>
            <Badge className="bg-yellow-500/20 text-yellow-600 dark:text-yellow-300 border-yellow-500">
              <Sparkles className="w-3 h-3 mr-1" />
              Expert Only
            </Badge>
          </div>
          <p className="text-xs text-blue-600 dark:text-blue-300 mb-4">
            Reports generated with "Generate Report" update this dashboard instantly so you can review them here.
          </p>

          {/* What These Numbers Mean - Enhanced for Expert */}
          <div className="bg-blue-50/30 dark:bg-blue-950/30 rounded-lg p-3 mb-4 border border-blue-300/50 dark:border-blue-800/30">
            <div className="text-xs font-semibold text-blue-700 dark:text-blue-200 mb-2 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Understanding Your Analytics:
            </div>
            <p className="text-xs text-blue-600 dark:text-blue-300 leading-relaxed mb-2">
              Expert tier provides <strong>deep analytics</strong> that compare your current week against historical trends, 
              helping you understand patterns and optimize your protection strategy.
            </p>
            <ul className="text-xs text-blue-600 dark:text-blue-300 space-y-1">
              <li>• <strong>Hours:</strong> Total billable time tracked this week</li>
              <li>• <strong>Protection Rate:</strong> % of work with sufficient evidence (aim for 90%+)</li>
              <li>• <strong>Evidence Items:</strong> Screenshots, activity logs, and work proof collected</li>
              <li>• <strong>Trends:</strong> Week-over-week changes to spot improvements or issues early</li>
            </ul>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-gradient-to-br from-blue-50/40 to-axia-teal-50/40 dark:from-blue-900/40 dark:to-axia-teal-900/40 rounded-lg p-3 border border-blue-300/50 dark:border-blue-800/30">
              <div className="text-xs text-blue-600 dark:text-blue-300 mb-1">Total Hours</div>
              <div className="text-2xl font-bold text-foreground dark:text-white mb-1">
                {latestReport.metrics.totalHours.toFixed(1)}h
              </div>
              <div className="flex items-center gap-1 text-xs">
                {latestReport.trends.hoursTrend > 0 ? (
                  <TrendingUp className="w-3 h-3 text-emerald-400" />
                ) : (
                  <TrendingDown className="w-3 h-3 text-red-400" />
                )}
                <span className={latestReport.trends.hoursTrend > 0 ? "text-emerald-400" : "text-red-400"}>
                  {latestReport.trends.hoursTrend > 0 ? "+" : ""}{latestReport.trends.hoursTrend.toFixed(0)}%
                </span>
                <span className="text-slate-500 dark:text-slate-400">vs last week</span>
              </div>
            </div>

            <div className="bg-gradient-to-br from-platinum-50/40 to-amber-50/40 dark:from-platinum-900/40 dark:to-amber-900/40 rounded-lg p-3 border border-platinum-300/50 dark:border-platinum-800/30">
              <div className="text-xs text-platinum-400 mb-1">Protection Rate</div>
              <div className="text-2xl font-bold text-foreground dark:text-white mb-1">
                {latestReport.metrics.protectionRate}%
              </div>
              <div className="flex items-center gap-1 text-xs">
                {latestReport.trends.protectionTrend > 0 ? (
                  <TrendingUp className="w-3 h-3 text-emerald-400" />
                ) : (
                  <TrendingDown className="w-3 h-3 text-red-400" />
                )}
                <span className={latestReport.trends.protectionTrend > 0 ? "text-emerald-400" : "text-red-400"}>
                  {latestReport.trends.protectionTrend > 0 ? "+" : ""}{latestReport.trends.protectionTrend}%
                </span>
                <span className="text-slate-500 dark:text-slate-400">change</span>
              </div>
            </div>

            <div className="bg-gradient-to-br from-emerald-50/40 to-primary/5 dark:from-emerald-900/40 dark:to-primary/20 rounded-lg p-3 border border-emerald-300/50 dark:border-emerald-800/30">
              <div className="text-xs text-emerald-600 dark:text-emerald-300 mb-1">Evidence Items</div>
              <div className="text-2xl font-bold text-foreground dark:text-white mb-1">
                {latestReport.metrics.totalEvidence}
              </div>
              <div className="flex items-center gap-1 text-xs">
                {latestReport.trends.evidenceTrend > 0 ? (
                  <TrendingUp className="w-3 h-3 text-emerald-400" />
                ) : (
                  <TrendingDown className="w-3 h-3 text-red-400" />
                )}
                <span className={latestReport.trends.evidenceTrend > 0 ? "text-emerald-400" : "text-red-400"}>
                  {latestReport.trends.evidenceTrend > 0 ? "+" : ""}{latestReport.trends.evidenceTrend.toFixed(0)}%
                </span>
                <span className="text-slate-500 dark:text-slate-400">vs last week</span>
              </div>
            </div>
          </div>

          {latestReport.insights.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-semibold text-foreground dark:text-white mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-yellow-400" />
                Generated Insights:
              </div>
              {latestReport.insights.map((insight: any, idx: number) => (
                <div
                  key={idx}
                  className={`text-sm p-3 rounded-lg flex items-start gap-2 ${
                    insight.type === "success"
                      ? "bg-emerald-50/30 dark:bg-emerald-900/30 border border-emerald-300/50 dark:border-emerald-700/30 text-emerald-700 dark:text-emerald-200"
                      : insight.type === "warning"
                      ? "bg-amber-50/30 dark:bg-amber-900/30 border border-amber-300/50 dark:border-amber-700/30 text-amber-700 dark:text-amber-200"
                      : "bg-red-50/30 dark:bg-red-900/30 border border-red-300/50 dark:border-red-700/30 text-red-700 dark:text-red-200"
                  }`}
                >
                  {insight.type === "success" ? (
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  ) : insight.type === "warning" ? (
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  )}
                  <span>{insight.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* EXPERT: Smart Alerts System */}
      {alerts && alerts.length > 0 && (
        <div className="p-6 bg-gradient-to-br from-amber-50/30 to-orange-50/30 dark:from-amber-900/30 dark:to-orange-900/30 border-y border-amber-300/50 dark:border-amber-800/30">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-5 h-5 text-amber-400 animate-pulse" />
            <h4 className="font-bold text-foreground dark:text-white text-lg">Smart Alert System</h4>
            {unreadAlerts > 0 && (
              <Badge className="bg-red-500 text-white border-0 animate-pulse">
                {unreadAlerts} New
              </Badge>
            )}
            <Badge className="bg-yellow-500/20 text-yellow-600 dark:text-yellow-300 border-yellow-500 ml-auto">
              <Sparkles className="w-3 h-3 mr-1" />
              Expert Only
            </Badge>
          </div>

          <div className="bg-amber-50/30 dark:bg-amber-950/30 rounded-lg p-3 mb-3 border border-amber-300/50 dark:border-amber-800/30">
            <div className="text-xs font-semibold text-amber-700 dark:text-amber-200 mb-1 flex items-center gap-1">
              <Bell className="w-3 h-3" />
              Real-Time Protection Monitoring:
            </div>
            <p className="text-xs text-amber-600 dark:text-amber-300 leading-relaxed">
              Expert tier provides <strong>instant alerts</strong> when protection drops, evidence gaps are detected, or client approval is needed. 
              Never miss a critical moment that could lead to a dispute.
            </p>
          </div>

          <div className="space-y-2">
            {alerts.slice(0, 5).map((alert) => (
              <div
                key={alert._id}
                className={`flex items-start gap-3 p-3 rounded-lg border ${
                  alert.severity === "critical"
                    ? "bg-red-50/30 dark:bg-red-900/30 border-red-300/50 dark:border-red-700/30"
                    : alert.severity === "warning"
                    ? "bg-amber-50/30 dark:bg-amber-900/30 border-amber-300/50 dark:border-amber-700/30"
                    : "bg-blue-50/30 dark:bg-blue-900/30 border-blue-300/50 dark:border-blue-700/30"
                } ${!alert.isRead ? "ring-2 ring-yellow-500/50" : ""}`}
              >
                <div
                  className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                    alert.severity === "critical"
                      ? "bg-red-500 animate-pulse"
                      : alert.severity === "warning"
                      ? "bg-amber-500"
                      : "bg-blue-500"
                  }`}
                />
                <div className="flex-1">
                  <div className="text-sm text-foreground dark:text-white font-medium mb-1">
                    {alert.alertType.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-300">{alert.message}</div>
                  {alert.protectionRate !== undefined && (
                    <div className="mt-2">
                      <Progress value={alert.protectionRate} className="h-1" />
                    </div>
                  )}
                </div>
                {!alert.isRead && (
                  <Badge className="bg-yellow-500 text-slate-900 border-0 text-xs">
                    New
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 8-Week Interactive Timeline */}
      <div className="p-6 space-y-3">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-bold text-foreground dark:text-white text-lg">8-Week Protection Timeline</h4>
          <Badge variant="outline" className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-600 border-slate-400">
            {displayMilestones.length} Weeks Tracked
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {displayMilestones.map((milestone, idx) => (
            <div
              key={idx}
              onClick={() => setSelectedWeek(selectedWeek === idx ? null : idx)}
              className={`bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-xl p-4 border-2 transition-all cursor-pointer ${
                selectedWeek === idx
                  ? "border-axia-teal-500 shadow-xl shadow-axia-teal-500/20 scale-[1.02]"
                  : "border-slate-300 dark:border-slate-700 hover:border-axia-teal-600"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  {milestone.status === "protected" ? (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-primary/60 flex items-center justify-center shadow-lg">
                      <CheckCircle2 className="w-6 h-6 text-white" />
                    </div>
                  ) : milestone.status === "at_risk" ? (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
                      <AlertCircle className="w-6 h-6 text-white" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-400 to-amber-500 flex items-center justify-center shadow-lg">
                      <XCircle className="w-6 h-6 text-white" />
                    </div>
                  )}
                  <div>
                    <div className="font-bold text-foreground dark:text-white">{milestone.period}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {milestone.hours}h tracked
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-foreground dark:text-white">
                    {milestone.protectionRate}%
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    ${milestone.value.toFixed(0)}
                  </div>
                </div>
              </div>

              <Progress value={milestone.protectionRate} className="h-2 mb-2" />

              {selectedWeek === idx && (
                <div className="mt-3 pt-3 border-t border-slate-300 dark:border-slate-700 space-y-2 animate-in fade-in slide-in-from-top-2">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-100/95 dark:bg-slate-800/50 rounded p-2">
                      <div className="text-slate-500 dark:text-slate-400">Evidence</div>
                      <div className="text-foreground dark:text-white font-semibold">{milestone.evidenceCount} items</div>
                    </div>
                    <div className="bg-slate-100/95 dark:bg-slate-800/50 rounded p-2">
                      <div className="text-slate-500 dark:text-slate-400">Status</div>
                      <div className="text-foreground dark:text-white font-semibold capitalize">{milestone.status}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Snapshot History */}
      {projectId && (
        <div className="p-6 border-t border-slate-300 dark:border-slate-700 bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-950">
          <div className="bg-slate-50/97 dark:bg-slate-900/80 border border-slate-300 dark:border-slate-700 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h5 className="font-bold text-foreground dark:text-white">Snapshot History</h5>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Each "Create Snapshot" action stores a weekly backup for dispute-proof evidence.
                </p>
              </div>
              <Badge variant="outline" className="text-xs border-slate-400 dark:border-slate-600 text-slate-600 dark:text-slate-300">
                {snapshotHistory.length} saved
              </Badge>
            </div>
            {snapshotHistory.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No snapshots yet. Click "Create Snapshot" above to capture your first weekly record.
              </p>
            ) : (
              <div className="space-y-3">
                {snapshotHistory.map((snapshot) => (
                  <div
                    key={snapshot._id}
                    className="flex items-center justify-between rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100/95 dark:bg-slate-800/60 p-3 text-sm"
                  >
                    <div>
                      <div className="font-semibold text-foreground dark:text-white">Week {snapshot.weekNumber}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {new Date(snapshot.createdAt).toLocaleDateString()} • {snapshot.totalHours.toFixed(1)}h
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-axia-teal-600">
                        {snapshot.protectionRate}%
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {snapshot.totalEvidence} evidence
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Expert Features Showcase */}
      <div className="p-6 border-t border-slate-300 dark:border-slate-700 bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900">
        <div className="bg-gradient-to-r from-axia-teal-500/10 to-platinum-500/10 border border-axia-teal-500/30 rounded-xl p-5">
          <h5 className="font-bold text-foreground dark:text-white mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-axia-teal-600" />
            Expert Tier Exclusive Features
          </h5>
          
          <div className="grid grid-cols-2 gap-3 text-sm mb-4">
            <div className="flex items-start gap-2 text-slate-600 dark:text-slate-300">
              <LineChart className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-foreground dark:text-white">Advanced Analytics</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Deep trend analysis</div>
              </div>
            </div>
            <div className="flex items-start gap-2 text-slate-600 dark:text-slate-300">
              <Bell className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-foreground dark:text-white">Real-Time Alerts</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Instant notifications</div>
              </div>
            </div>
            <div className="flex items-start gap-2 text-slate-600 dark:text-slate-300">
              <Calendar className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-foreground dark:text-white">8-Week Tracking</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Extended history</div>
              </div>
            </div>
            <div className="flex items-start gap-2 text-slate-600 dark:text-slate-300">
              <FileText className="w-4 h-4 text-platinum-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-foreground dark:text-white">Auto Reports</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Weekly summaries</div>
              </div>
            </div>
            <div className="flex items-start gap-2 text-slate-600 dark:text-slate-300">
              <Camera className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-foreground dark:text-white">Auto Snapshots</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Weekly backups</div>
              </div>
            </div>
            <div className="flex items-start gap-2 text-slate-600 dark:text-slate-300">
              <Sparkles className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-foreground dark:text-white">Smart Insights</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Actionable recommendations</div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-yellow-50/20 to-orange-50/20 dark:from-yellow-900/20 dark:to-orange-900/20 border border-yellow-300/50 dark:border-yellow-700/30 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-yellow-700 dark:text-yellow-200">
                <strong>Why Expert?</strong> Pro tier gives you the tools. Expert tier gives you <strong>intelligence</strong> — 
                automated reports that show trends, alerts that catch issues in real-time, and analytics that show you exactly how to improve.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Success Message */}
      <div className="p-6 bg-gradient-to-r from-emerald-50/30 to-primary/5 dark:from-emerald-900/30 dark:to-primary/20 border-t border-slate-300 dark:border-slate-700">
        <div className="text-center">
          <div className="text-emerald-400 font-bold text-lg mb-1">
            🎯 Maximum Protection Active
          </div>
          <p className="text-slate-600 dark:text-slate-300 text-sm">
            You're using the most advanced milestone protection available
          </p>
        </div>
      </div>
    </Card>
  );
}
