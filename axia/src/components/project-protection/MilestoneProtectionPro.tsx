import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, AlertCircle, XCircle, Camera, FileCheck, Sparkles, Bell, FileText, TrendingUp as TrendUp, TestTube } from "lucide-react";
import { useState } from "react";
import { useMutation } from "@/lib/safe-convex-react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import type { Id } from "@/convex/_generated/dataModel";

interface Milestone {
  period: string;
  hours: number;
  value: number;
  protectionRate: number;
  evidenceCount: number;
  status: string;
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

interface MilestoneProtectionProProps {
  milestones: Milestone[];
  totalProtectedValue: number;
  totalAtRiskValue: number;
  avgProtectionRate: number;
  alerts?: Array<{
    _id: string;
    alertType: string;
    severity: string;
    message: string;
    isRead: boolean;
    createdAt: number;
  }>;
  latestReport?: {
    metrics: {
      totalHours: number;
      totalEvidence: number;
      protectionRate: number;
    };
    trends: {
      hoursTrend: number;
      protectionTrend: number;
      evidenceTrend: number;
    };
    insights: Array<{
      type: string;
      message: string;
    }>;
  } | null;
  snapshots?: Snapshot[];
  onUpgrade?: () => void;
  projectId?: Id<"projects">;
}

export function MilestoneProtectionPro({
  milestones,
  totalProtectedValue,
  totalAtRiskValue,
  avgProtectionRate,
  alerts = [],
  latestReport,
  snapshots = [],
  onUpgrade,
  projectId,
}: MilestoneProtectionProProps & { projectId?: Id<"projects"> }) {
  const [selectedMilestone, setSelectedMilestone] = useState<number | null>(null);
  const [showSnapshotInfo, setShowSnapshotInfo] = useState(false);
  const [showReportInfo, setShowReportInfo] = useState(false);
  const displayMilestones = milestones.slice(0, 4);
  const unreadAlerts = alerts.filter((a) => !a.isRead).length;
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
    <Card className="relative overflow-hidden bg-gradient-to-br from-white to-slate-50 dark:from-slate-950 dark:to-slate-900 rounded-2xl border-2 border-slate-300 dark:border-slate-700 shadow-xl">
      {/* Animated gradient header */}
      <div className="relative p-6 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-xl text-white">
              Milestone Protection
            </h3>
            <p className="text-sm text-blue-100 mt-1">
              Medium protection for 4 clients with automation
            </p>
          </div>
          <div className="flex items-center gap-2">
            {unreadAlerts > 0 && (
              <Badge className="bg-red-500 text-white border-0 animate-pulse">
                {unreadAlerts} Alert{unreadAlerts > 1 ? 's' : ''}
              </Badge>
            )}
            <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm">
              Pro
            </Badge>
          </div>
        </div>
      </div>

      {/* NEW: Testing Controls with Enhanced Explanations */}
      {projectId && (
        <div className="p-4 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30 border-b border-purple-200 dark:border-purple-800">
          <div className="flex items-center gap-2 mb-3">
            <TestTube className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <h5 className="font-semibold text-purple-900 dark:text-purple-100">
              Test Milestone Features
            </h5>
          </div>
          
          <div className="space-y-3 mb-3">
            {/* Snapshot Explanation */}
            <div className="bg-white dark:bg-slate-900 rounded-lg p-3 border border-purple-200 dark:border-purple-800">
              <div className="flex items-start gap-2">
                <Camera className="w-4 h-4 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="font-medium text-sm text-purple-900 dark:text-purple-100 mb-1">
                    📸 Weekly Snapshot
                  </div>
                  <p className="text-xs text-slate-700 dark:text-purple-300 mb-2">
                    Captures a point-in-time record of your work week: total hours worked, evidence collected, and protection rate. 
                    This creates a permanent record that proves your work history if disputes arise later.
                  </p>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={handleTestSnapshot}
                    className="bg-white dark:bg-slate-900 text-xs"
                  >
                    Create Snapshot
                  </Button>
                </div>
              </div>
            </div>

            {/* Alert Explanation */}
            <div className="bg-white dark:bg-slate-900 rounded-lg p-3 border border-purple-200 dark:border-purple-800">
              <div className="flex items-start gap-2">
                <Bell className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="font-medium text-sm text-purple-900 dark:text-purple-100 mb-1">
                    🔔 Protection Alert
                  </div>
                  <p className="text-xs text-slate-700 dark:text-purple-300 mb-2">
                    Notifies you when your protection rate drops below safe levels or evidence gaps are detected. 
                    Helps you fix issues before they become disputes.
                  </p>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={handleTestAlert}
                    className="bg-white dark:bg-slate-900 text-xs"
                  >
                    Create Alert
                  </Button>
                </div>
              </div>
            </div>

            {/* Report Explanation */}
            <div className="bg-white dark:bg-slate-900 rounded-lg p-3 border border-purple-200 dark:border-purple-800">
              <div className="flex items-start gap-2">
                <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="font-medium text-sm text-purple-900 dark:text-purple-100 mb-1">
                    📊 Weekly Report
                  </div>
                  <p className="text-xs text-slate-700 dark:text-purple-300 mb-2">
                    Analyzes your week's work patterns, compares to previous weeks, and provides actionable insights. 
                    Shows trends in hours, protection rate, and evidence quality to help you improve.
                  </p>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={handleTestReport}
                    className="bg-white dark:bg-slate-900 text-xs"
                  >
                    Generate Report
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Stats Grid with Tooltips */}
      <div className="p-6 bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-950">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border-2 border-emerald-200 dark:border-emerald-800 shadow-sm">
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              ${totalProtectedValue.toFixed(0)}
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-medium">
              Protected Income
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-500 mt-1">
              Work with 90%+ evidence coverage
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border-2 border-amber-200 dark:border-amber-800 shadow-sm">
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              ${totalAtRiskValue.toFixed(0)}
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-medium">
              At Risk Income
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-500 mt-1">
              Work with &lt;90% evidence coverage
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border-2 border-blue-200 dark:border-blue-800 shadow-sm">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {avgProtectionRate}%
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-medium">
              Avg Protection
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-500 mt-1">
              % of work with proof
            </div>
          </div>
        </div>
      </div>

      {/* Active Alerts Section */}
      {alerts.length > 0 && (
        <div className="px-6 pb-4">
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Bell className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <h5 className="font-semibold text-amber-900 dark:text-amber-100">
                Active Alerts
              </h5>
            </div>
            <div className="space-y-2">
              {alerts.slice(0, 3).map((alert) => (
                <div
                  key={alert._id}
                  className="flex items-start gap-2 text-sm text-amber-800 dark:text-amber-200"
                >
                  <div
                    className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                      alert.severity === "critical"
                        ? "bg-red-500"
                        : alert.severity === "warning"
                        ? "bg-amber-500"
                        : "bg-blue-500"
                    }`}
                  />
                  <span>{alert.message}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Latest Report Summary with Metric Explanations */}
      {latestReport && (
        <div className="px-6 pb-4">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h5 className="font-semibold text-blue-900 dark:text-blue-100">
                Latest Weekly Report
              </h5>
            </div>
            <p className="text-xs text-blue-700 dark:text-blue-300 mb-3">
              Reports generated with the button above appear here automatically within a few seconds.
            </p>
            
            {/* Metrics Grid with Explanations */}
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div className="text-center bg-white dark:bg-slate-900 rounded-lg p-3">
                <div className="text-lg font-bold text-blue-900 dark:text-blue-100">
                  {latestReport.metrics.totalHours.toFixed(1)}h
                </div>
                <div className="text-[10px] text-blue-700 dark:text-blue-300 font-medium">
                  Hours Worked
                </div>
                <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  {latestReport.trends.hoursTrend > 0 ? "+" : ""}
                  {latestReport.trends.hoursTrend.toFixed(0)}% vs last week
                </div>
              </div>
              <div className="text-center bg-white dark:bg-slate-900 rounded-lg p-3">
                <div className="text-lg font-bold text-blue-900 dark:text-blue-100">
                  {latestReport.metrics.protectionRate}%
                </div>
                <div className="text-[10px] text-blue-700 dark:text-blue-300 font-medium">
                  Protection Rate
                </div>
                <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  {latestReport.trends.protectionTrend > 0 ? "+" : ""}
                  {latestReport.trends.protectionTrend}% change
                </div>
              </div>
              <div className="text-center bg-white dark:bg-slate-900 rounded-lg p-3">
                <div className="text-lg font-bold text-blue-900 dark:text-blue-100">
                  {latestReport.metrics.totalEvidence}
                </div>
                <div className="text-[10px] text-blue-700 dark:text-blue-300 font-medium">
                  Evidence Items
                </div>
                <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  {latestReport.trends.evidenceTrend > 0 ? "+" : ""}
                  {latestReport.trends.evidenceTrend.toFixed(0)}% vs last week
                </div>
              </div>
            </div>

            {/* What These Numbers Mean */}
            <div className="bg-blue-100 dark:bg-blue-900/30 rounded-lg p-3 mb-3">
              <div className="text-xs font-semibold text-blue-900 dark:text-blue-100 mb-2">
                📖 What These Numbers Mean:
              </div>
              <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
                <li>• <strong>Hours:</strong> Total billable time tracked this week</li>
                <li>• <strong>Protection Rate:</strong> % of work with sufficient evidence (aim for 90%+)</li>
                <li>• <strong>Evidence Items:</strong> Screenshots, activity logs, and work proof collected</li>
                <li>• <strong>Trends:</strong> How your metrics changed compared to last week</li>
              </ul>
            </div>

            {/* Insights */}
            {latestReport.insights.length > 0 && (
              <div className="space-y-2">
                {latestReport.insights.map((insight, idx) => (
                  <div 
                    key={idx}
                    className={`text-sm p-2 rounded-lg ${
                      insight.type === "success" 
                        ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200"
                        : insight.type === "warning"
                        ? "bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200"
                        : "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200"
                    }`}
                  >
                    {insight.type === "success" ? "✅" : insight.type === "warning" ? "⚠️" : "🚨"} {insight.message}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Interactive Milestone Timeline */}
      <div className="p-6 space-y-3">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-semibold text-slate-900 dark:text-slate-100">
            4-Week Protection Timeline
          </h4>
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300">
            {displayMilestones.length} Milestones
          </Badge>
        </div>

        {displayMilestones.map((milestone, idx) => (
          <div
            key={idx}
            onClick={() => setSelectedMilestone(selectedMilestone === idx ? null : idx)}
            className={`bg-white dark:bg-slate-900 rounded-xl p-4 border-2 transition-all cursor-pointer ${
              selectedMilestone === idx
                ? "border-blue-400 dark:border-blue-600 shadow-lg scale-[1.02]"
                : "border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                {milestone.status === "protected" ? (
                  <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                ) : milestone.status === "at_risk" ? (
                  <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
                    <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                  </div>
                )}
                <div>
                  <div className="font-semibold text-slate-900 dark:text-slate-100">
                    {milestone.period}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {milestone.hours}h • ${milestone.value.toFixed(2)}
                  </div>
                </div>
              </div>
              <Badge
                className={
                  milestone.status === "protected"
                    ? "bg-emerald-500 text-white"
                    : milestone.status === "at_risk"
                    ? "bg-amber-500 text-white"
                    : "bg-red-500 text-white"
                }
              >
                {milestone.protectionRate}%
              </Badge>
            </div>

            <Progress value={milestone.protectionRate} className="h-3 mb-3" />

            {selectedMilestone === idx && (
              <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <Camera className="w-4 h-4 text-blue-500" />
                  <span>{milestone.evidenceCount} evidence items collected</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <FileCheck className="w-4 h-4 text-green-500" />
                  <span>{(milestone as any).hasSnapshot ? "Snapshot saved" : "No snapshot yet"}</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Snapshot History */}
      {projectId && (
        <div className="px-6 pb-4">
          <div className="bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h5 className="font-semibold text-slate-900 dark:text-slate-100">
                  Snapshot History
                </h5>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Every time you click "Create Snapshot," the record is saved below.
                </p>
              </div>
              <Badge variant="outline" className="text-xs">
                {snapshotHistory.length} saved
              </Badge>
            </div>
            {snapshotHistory.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No snapshots yet. Use the "Create Snapshot" button above to capture your first weekly record.
              </p>
            ) : (
              <div className="space-y-2">
                {snapshotHistory.map((snapshot) => (
                  <div
                    key={snapshot._id}
                    className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 text-sm"
                  >
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        Week {snapshot.weekNumber}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {new Date(snapshot.createdAt).toLocaleDateString()} • {snapshot.totalHours.toFixed(1)}h
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-base font-bold text-blue-600 dark:text-blue-400">
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

      {/* Pro Features List */}
      <div className="px-6 pb-6">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
          <h5 className="font-semibold text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Pro Protection Features
          </h5>
          <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
              4-week milestone tracking
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
              Weekly automated reports
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
              Protection drop alerts
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
              Evidence gap notifications
            </li>
          </ul>
        </div>
      </div>

      {/* Upgrade to Expert */}
      <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30">
        <div className="mb-3">
          <h5 className="font-semibold text-purple-900 dark:text-purple-100 mb-1">
            Unlock Advanced Milestone Intelligence
          </h5>
          <p className="text-sm text-purple-800 dark:text-purple-200">
            Get 8-week tracking, predictive analytics, and automated milestone reports
          </p>
        </div>
        <Button
          onClick={onUpgrade}
          className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-semibold shadow-lg"
        >
          Upgrade to Expert → $12/mo
        </Button>
      </div>
    </Card>
  );
}