import { ComplianceStatusWidget } from "@/components/ComplianceStatusWidget";
import { LostIncomeCalculator } from "@/components/LostIncomeCalculator";
import { PremiumValueSection } from "@/components/PremiumValueSection";
import { PricingModal } from "@/components/PricingModal";
import { WorkDiarySimulator } from "@/components/WorkDiarySimulator";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { motion } from "framer-motion";
import { Clock, FileText, Settings, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Camera, Shield, LogOut, Sun, Moon } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { ReportLimitModal } from "@/components/ReportLimitModal";
import { ReportViewerModal } from "@/components/ReportViewerModal";
import { trackConversion } from "@/instrumentation";
import { useEvidenceCollector } from "@/components/EvidenceCollector";
import { ExtensionTokenSection } from "@/components/ExtensionTokenSection";
import { AIDisputePrediction } from "@/components/AIDisputePrediction";
import { CustomPolicyAnalyzer } from "@/components/CustomPolicyAnalyzer";
import { PremiumNetwork } from "@/components/PremiumNetwork";
import { EvidenceMonitor } from "@/components/EvidenceMonitor";
import { TimelinePopup } from "@/components/TimelinePopup";
import { WCVMVerificationBadge } from "@/components/WCVMVerificationBadge";
import { CrossPlatformVerification } from "@/components/CrossPlatformVerification";
import { RealTimeProtectionAdvisor } from "@/components/RealTimeProtectionAdvisor";
import { PersonalizedProtectionPlan } from "@/components/PersonalizedProtectionPlan";
import { Teams } from "@/components/Teams";
import { useSubscriptionTier } from "@/hooks/use-subscription-tier";

export default function Dashboard() {
  const { user, isLoading, signOut } = useAuth();
  const { tier: subscriptionTier, setTier: setSubscriptionTier } = useSubscriptionTier();
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [complianceStatus, setComplianceStatus] = useState<"active" | "at_risk" | "rejected">("active");
  const [countdown, setCountdown] = useState(0);
  const [selectedPlatform, setSelectedPlatform] = useState<"all" | "upwork" | "fiverr" | "toptal">("all");
  const [showReportLimitModal, setShowReportLimitModal] = useState(false);
  const [limitMonthlyLoss, setLimitMonthlyLoss] = useState(0);
  const [limitMonthlySavings, setLimitMonthlySavings] = useState(0);
  const [pricingHighlightSavings, setPricingHighlightSavings] = useState<number | undefined>(undefined);
  const [showReportViewer, setShowReportViewer] = useState(false);
  const [reportViewerContent, setReportViewerContent] = useState<string>("");
  const [reportViewerCaseId, setReportViewerCaseId] = useState<string>("");

  const [showTimelinePopup, setShowTimelinePopup] = useState(false);

  const profile: any = undefined;
  const updateProfile = async (_args: any) => {
    return;
  };
  const protectionMetrics: any = undefined;

  const [profileName, setProfileName] = useState<string>("");
  const [profileImage, setProfileImage] = useState<string>("");
  const [profileHourlyRate, setProfileHourlyRate] = useState<string>("");
  const [profileTier, setProfileTier] = useState<"free" | "starter" | "pro" | "expert" | "client">("free");
  const [profileBio, setProfileBio] = useState<string>("");
  const [isEditingBio, setIsEditingBio] = useState<boolean>(false);

  // Add: Theme state and persistence
  const [theme, setTheme] = useState<"light" | "dark">(
    ((typeof localStorage !== "undefined" && localStorage.getItem("timelock_theme")) as "light" | "dark") || "light"
  );

  // Removed duplicate early evidenceCollector init; initialized below after currentSession is defined

  // Add universal report generation
  const generateUniversalReport = async (_args: any) => ({
    caseId: `CASE-${Date.now()}`,
    reportContent: "This is a demo universal report.",
    limited: false,
  });

  const handleGenerateUniversalReport = async () => {
    if (!currentSession) {
      toast.error("No active session found");
      return;
    }

    try {
      const result: any = await generateUniversalReport({
        sessionId: currentSession._id,
      });

      if (result?.limited) {
        setLimitMonthlyLoss(Number(result.monthlyLoss || 0));
        setLimitMonthlySavings(Number(result.monthlySavings || 0));
        setPricingHighlightSavings(Number(result.monthlySavings || 0));
        setShowReportLimitModal(true);
        trackConversion("report_udrs_limited", {
          source: "universal_dispute_report",
          monthlyLoss: Number(result.monthlyLoss || 0),
          monthlySavings: Number(result.monthlySavings || 0),
        });
        return;
      }

      toast.success("Universal dispute report generated!", {
        description: `Case ID: ${result.caseId}`,
      });
      // Open viewer with the freshly generated report
      setReportViewerCaseId(result.caseId);
      setReportViewerContent(result.reportContent || "");
      setShowReportViewer(true);

      trackConversion("report_udrs_generated", {
        source: "universal_dispute_report",
        caseId: result.caseId,
      });
    } catch (error) {
      toast.error("Failed to generate universal report");
      console.error(error);
    }
  };

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    try {
      localStorage.setItem("timelock_theme", theme);
    } catch {}
  }, [theme]);

  useEffect(() => {
    if (profile) {
      setProfileName((profile as any)?.name ?? "");
      setProfileImage((profile as any)?.image ?? "");
      setProfileHourlyRate(((profile as any)?.hourlyRate ?? 25).toString());
      // Sync subscription tier with profile tier if different
      const profileSubscriptionTier = ((profile as any)?.subscriptionTier ?? subscriptionTier) as "free" | "starter" | "pro" | "expert" | "client";
      if (profileSubscriptionTier !== subscriptionTier) {
        setSubscriptionTier(profileSubscriptionTier);
      }
      // Also sync profileTier state for the profile modal badge
      setProfileTier(subscriptionTier);
      setProfileBio(((profile as any)?.professionalBio ?? "") as string);
    }
  }, [profile, subscriptionTier, setSubscriptionTier]);

  // Add mutations for platform connection
  const initiatePlatformConnection = async (_args: any) => ({
    alreadyConnected: false,
    connectionId: `mock_${Date.now()}`,
  });
  const completePlatformConnection = async (_args: any) => {
    return;
  };
  const disconnectPlatform = async (_args: any) => {
    return;
  };
  const userPlatformConnections: any[] = [];

  // Handle pending platform connection from Auth page
  useEffect(() => {
    const pendingPlatform = localStorage.getItem("timelock_pending_platform");
    if (pendingPlatform && profile && !isLoading && userPlatformConnections) {
      // Check if already connected
      const alreadyConnected = userPlatformConnections?.some(
        (conn: any) => conn.platform === pendingPlatform && conn.status === "connected"
      ) ?? false;
      
      if (alreadyConnected) {
        localStorage.removeItem("timelock_pending_platform");
        return;
      }
      
      // Clear the pending platform
      localStorage.removeItem("timelock_pending_platform");
      
      // Initiate and complete connection
      (async () => {
        try {
          toast.info(`Connecting to ${pendingPlatform}...`, {
            description: "Setting up your platform connection",
          });
          
          const result = await initiatePlatformConnection({
            platform: pendingPlatform as "upwork" | "fiverr" | "toptal" | "freelancer",
          });
          
          if (result.alreadyConnected) {
            toast.success(`${pendingPlatform} is already connected`);
            return;
          }
          
          // Complete the connection with mock data
          await completePlatformConnection({
            connectionId: result.connectionId,
            platformUserId: `${pendingPlatform}_user_${Date.now()}`,
            platformEmail: (profile as any)?.email || "user@example.com",
            accessToken: `mock_token_${Date.now()}`,
            refreshToken: `mock_refresh_${Date.now()}`,
            tokenExpiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
          });
          
          toast.success(`${pendingPlatform} connected successfully!`, {
            description: "Your platform data has been imported",
          });
        } catch (error) {
          console.error("Platform connection error:", error);
          toast.error(`Failed to connect ${pendingPlatform}`);
        }
      })();
    }
  }, [profile, isLoading, userPlatformConnections, initiatePlatformConnection, completePlatformConnection]);

  // Convex queries
  const currentSession: any = {
    _id: "mock_session_1" as any,
    userId: "mock_user_1" as any,
    startTime: Date.now() - 2 * 60 * 60 * 1000, // 2 hours ago
    clientName: "Acme Corp",
    projectName: "Website Redesign",
    hourlyRate: 25,
    complianceStatus: "active" as const,
  };
  const rejectedStats: any = { rejectedHours: 0, lostIncome: 0 };
  const activeAlerts: any[] = [];
  const disputeReports: any[] = [];
  const monthlyUsage: any = undefined;

  // WCVM: Context analysis for current session
  const wcvmAnalysis: any = undefined; // In production: useQuery(api.wcvm.contextScanner.analyzeSessionContext, currentSession?._id ? { sessionId: currentSession._id } : "skip");
  const wcvmVerification: any = undefined; // In production: useQuery(api.wcvm.contextScanner.getSessionVerification, currentSession?._id ? { sessionId: currentSession._id } : "skip");

  // Mock WCVM data for demo
  const mockWCVMAnalysis = currentSession ? {
    contextRelevanceScore: 87,
    workSites: 12,
    nonWorkSites: 3,
    activityDensity: 3.2,
    requirementMatches: [
      {
        requirementId: "req_1",
        description: "Continuous work activity with regular mouse/keyboard input",
        relevanceScore: 92,
        matchedEvidence: ["156 mouse events", "89 keyboard events"],
      },
      {
        requirementId: "req_2",
        description: "Work-related websites and tools",
        relevanceScore: 80,
        matchedEvidence: ["12 work-related sites"],
      },
      {
        requirementId: "req_3",
        description: "Regular screenshots showing work progress",
        relevanceScore: 85,
        matchedEvidence: ["8 screenshots"],
      },
      {
        requirementId: "req_4",
        description: "Work memos documenting progress",
        relevanceScore: 90,
        matchedEvidence: ["3 work memos"],
      },
    ],
    contextGaps: [
      {
        gap: "Low work-related site ratio",
        impact: "Work context may not be clear",
        fix: "Focus on work-related tools and platforms",
      },
    ],
    verificationSignature: "WCVM-" + Date.now().toString(36).toUpperCase(),
  } : null;

  // Add: evidence collection (moved below currentSession declaration)
  const evidenceCollector = useEvidenceCollector({
    sessionId: currentSession?._id || null,
    platform: selectedPlatform === "all" ? "upwork" : (selectedPlatform as any),
    isActive: !!currentSession && !isLoading,
  });

  // Convex mutations
  const generateReport = async (_args: any) => ({
    caseId: `CASE-${Date.now()}`,
    reportContent: "This is a demo dispute report.",
    limited: false,
  });
  const createAlert = async (_args: any) => {
    return;
  };

  // Mock time blocks for demonstration
  const mockTimeBlocks = [
    {
      id: "1",
      startTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
      endTime: new Date(Date.now() - 2 * 60 * 60 * 1000 + 5 * 60 * 1000),
      activity: "Code Review",
      website: "github.com",
      complianceStatus: "compliant" as const,
      screenshotCount: 12,
      mouseActivity: true,
      keyboardActivity: true,
      platform: "upwork" as const,
    },
    {
      id: "2",
      startTime: new Date(Date.now() - 1 * 60 * 60 * 1000),
      endTime: new Date(Date.now() - 1 * 60 * 60 * 1000 + 5 * 60 * 1000),
      activity: "Client Communication",
      website: "fiverr.com",
      complianceStatus: "at_risk" as const,
      screenshotCount: 8,
      mouseActivity: true,
      keyboardActivity: false,
      platform: "fiverr" as const,
    },
    {
      id: "3",
      startTime: new Date(Date.now() - 30 * 60 * 1000),
      endTime: new Date(Date.now() - 25 * 60 * 1000),
      activity: "Research",
      website: "toptal.com",
      complianceStatus: "rejected" as const,
      screenshotCount: 2,
      mouseActivity: false,
      keyboardActivity: false,
      platform: "toptal" as const,
    },
    {
      id: "4",
      startTime: new Date(Date.now() - 90 * 60 * 1000),
      endTime: new Date(Date.now() - 85 * 60 * 1000),
      activity: "Spec Writing",
      website: "notion.so",
      complianceStatus: "compliant" as const,
      screenshotCount: 5,
      mouseActivity: true,
      keyboardActivity: true,
      platform: "client" as const,
    },
  ];

  // Add: helper to format active session duration based on currentSession times
  function formatDuration(ms: number) {
    const totalMinutes = Math.max(0, Math.floor(ms / (1000 * 60)));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }

  useEffect(() => {
    // Simulate compliance status changes
    const interval = setInterval(() => {
      const statuses: Array<"active" | "at_risk" | "rejected"> = ["active", "at_risk", "rejected"];
      const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
      setComplianceStatus(randomStatus);
      
      if (randomStatus === "at_risk") {
        setCountdown(300); // 5 minutes
      }
    }, 10000); // Change every 10 seconds for demo

    return () => clearInterval(interval);
  }, []);

  // Get real connection status from backend
  const connectedPlatforms: Record<"upwork" | "fiverr" | "toptal", boolean> = {
    upwork: userPlatformConnections?.some((c: any) => c.platform === "upwork" && c.status === "connected") ?? false,
    fiverr: userPlatformConnections?.some((c: any) => c.platform === "fiverr" && c.status === "connected") ?? false,
    toptal: userPlatformConnections?.some((c: any) => c.platform === "toptal" && c.status === "connected") ?? false,
  };

  // Add: universal loss breakdown (mock for demo)
  const platformLosses = {
    upwork: 48,
    fiverr: 12,
    toptal: 4,
  };
  const totalWeeklyLoss = platformLosses.upwork + platformLosses.fiverr + platformLosses.toptal;

  const getStatusMessage = () => {
    switch (complianceStatus) {
      case "active":
        return selectedPlatform === "upwork"
          ? "Timer running - 100% compliant (Upwork)"
          : selectedPlatform === "fiverr"
          ? "Timer running - 100% compliant (Fiverr)"
          : selectedPlatform === "toptal"
          ? "Timer running - 100% compliant (Toptal)"
          : "Timer running - 100% compliant";
      case "at_risk":
        return selectedPlatform === "upwork"
          ? "Fiverr tab open - timer paused"
          : selectedPlatform === "fiverr"
          ? "Upwork tab open - timer inactive"
          : selectedPlatform === "toptal"
          ? "Client email - low activity score"
          : "Cross-platform work detected";
      case "rejected":
        return "2.5 hrs rejected - GENERATE REPORT";
    }
  };

  const handleGenerateReport = async () => {
    if (!currentSession) {
      toast.error("No active session found");
      return;
    }

    try {
      const result: any = await generateReport({
        sessionId: currentSession._id,
        rejectedHours: rejectedStats?.rejectedHours || 2.5,
        lostIncome: rejectedStats?.lostIncome || 37.5,
      });

      if (result?.limited) {
        // Show limit modal and prep pricing highlight
        setLimitMonthlyLoss(Number(result.monthlyLoss || 0));
        setLimitMonthlySavings(Number(result.monthlySavings || 0));
        setPricingHighlightSavings(Number(result.monthlySavings || 0));
        setShowReportLimitModal(true);
        trackConversion("report_limit_shown", {
          source: "dispute_report",
          monthlyLoss: Number(result.monthlyLoss || 0),
          monthlySavings: Number(result.monthlySavings || 0),
        });
        return;
      }

      toast.success("Dispute report generated successfully!", {
        description: `Case ID: ${result.caseId}`,
        action: {
          label: "View Report",
          onClick: () => console.log("View report:", result.reportContent),
        },
      });
      trackConversion("dispute_report_generated", {
        source: "dispute_report",
        lostIncome: rejectedStats?.lostIncome || 37.5,
      });
    } catch (error) {
      toast.error("Failed to generate dispute report");
      console.error(error);
    }
  };

  const handleUpgrade = (tier: string) => {
    toast.success(`Upgrading to ${tier}...`, {
      description: "You'll be redirected to Stripe checkout",
    });
    // Update the persistent subscription tier
    setSubscriptionTier(tier as "free" | "starter" | "pro" | "expert");
    setShowPricingModal(false);
  };

  const handleSaveProfile = async () => {
    const rate = Number(profileHourlyRate);
    if (Number.isNaN(rate) || rate < 0) {
      toast.error("Please enter a valid hourly rate");
      return;
    }
    try {
      await updateProfile({
        name: profileName || undefined,
        image: profileImage || undefined,
        hourlyRate: rate,
        subscriptionTier: subscriptionTier,
        professionalBio: profileBio || "",
      });
      toast.success("Profile updated");
    } catch (e) {
      console.error(e);
      toast.error("Failed to update profile");
    }
  };

  // Profile modal is now global via ProfileModal component in main.tsx

  // Listen for timeline popup event from sidebar
  useEffect(() => {
    const handleOpenTimeline = () => {
      setShowTimelinePopup(true);
    };
    window.addEventListener('openTimelinePopup', handleOpenTimeline);
    return () => window.removeEventListener('openTimelinePopup', handleOpenTimeline);
  }, []);

  // Remove loading blocker - allow dashboard to render with mock data
  // if (isLoading) {
  //   return (
  //     <div className="min-h-screen flex items-center justify-center">
  //       <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2563EB]"></div>
  //     </div>
  //   );
  // }

  // subscriptionTier is now managed by useSubscriptionTier hook
  const hourlyRate = Number(profileHourlyRate) || 25;

  return (
    <motion.div
      className="flex-1 min-h-screen bg-background text-foreground transition-colors"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
        {/* Compliance Status Widget with universal loss counter on the right */}
        <ComplianceStatusWidget
          status={complianceStatus}
          message={getStatusMessage()}
          countdown={countdown}
          onActionClick={complianceStatus === "rejected" ? handleGenerateReport : undefined}
          rightContent={
            <span className="font-[Space_Grotesk]">
              You're losing ${totalWeeklyLoss} this week
              <span className="ml-1">
                (Upwk ${platformLosses.upwork} · Fivr ${platformLosses.fiverr} · Toptl ${platformLosses.toptal})
              </span>
            </span>
          }
          atRiskAmount={(rejectedStats?.lostIncome || totalWeeklyLoss) as number}
          subscriptionTier={subscriptionTier}
        />

        <div className="container mx-auto px-4 py-6">
          <div className="flex gap-6">
            {/* Main Content */}
            <div className="flex-1">
              {/* Top: Platform Selector Tabs */}
              <div className="mb-4">
                <div className="flex gap-4">
                  {[
                    { key: "all", label: "All Platforms", badge: "Cross-Platform View" },
                    { key: "upwork", label: "Upwork", badge: "Work Diary" },
                    { key: "fiverr", label: "Fiverr", badge: "Time Tracking" },
                    { key: "toptal", label: "Toptal", badge: "Activity Score" },
                  ].map((tab) => {
                    const active = selectedPlatform === (tab.key as any);
                    const isPlatform = tab.key !== "all";
                    const isConnected =
                      isPlatform && connectedPlatforms[tab.key as "upwork" | "fiverr" | "toptal"];
                    return (
                      <button
                        key={tab.key}
                        onClick={() => setSelectedPlatform(tab.key as any)}
                        className={`pb-2 text-sm rounded-md px-2 transition-colors ${
                          active
                            // Increase contrast in dark mode and ensure active state is clearly visible
                            ? "font-semibold text-foreground bg-primary/10 ring-1 ring-primary/30"
                            // Slightly lighter hover background for better visibility on dark
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1">
                            {tab.label}
                            {isPlatform && (
                              <span
                                className={`inline-block h-2 w-2 rounded-full ${
                                  isConnected ? "bg-emerald-500" : "bg-red-500"
                                }`}
                                title={isConnected ? "Connected" : "Not connected"}
                              />
                            )}
                          </span>
                          <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded">
                            {tab.badge}
                          </span>
                        </div>
                        <div className={`h-[2px] mt-2 ${active ? "bg-primary" : "bg-transparent"}`} />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Header */}
              <div className="mb-6">
                <h1 className="text-[32px] font-bold text-foreground tracking-tight mb-2">
                  Timelock Dashboard
                </h1>
                <p className="text-[16px] text-muted-foreground">
                  Protect your payments with real-time cross-platform compliance monitoring
                </p>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-[14px] font-medium text-muted-foreground">Active Session</CardTitle>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      {evidenceCollector.isCollecting && (
                        <div className="flex items-center gap-1">
                          <div className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse" />
                          <span className="text-xs text-emerald-600">
                            Evidence: {evidenceCollector.eventCount}
                          </span>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-[24px] font-bold text-foreground">
                      {currentSession?.startTime
                        ? formatDuration(
                            (currentSession.endTime ?? Date.now()) - currentSession.startTime
                          )
                        : "No session"}
                    </div>
                    <p className="text-[12px] text-muted-foreground">
                      {currentSession ? `Client: ${currentSession.clientName ?? "Unknown"}` : "Start tracking time"}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-[14px] font-medium text-muted-foreground">
                      Rejected Hours
                    </CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-[24px] font-bold text-[#DC2626]">
                      {rejectedStats?.rejectedHours?.toFixed(1) || "0.0"}h
                    </div>
                    <p className="text-[12px] text-muted-foreground">
                      This month
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-[14px] font-medium text-muted-foreground">
                      Dispute Reports
                    </CardTitle>
                    <div className="text-xs">
                      {subscriptionTier === "pro" ? (
                        <span className="text-emerald-500">Unlimited reports</span>
                      ) : (
                        <span className="text-destructive">
                          {monthlyUsage?.used ?? 0}/{monthlyUsage?.limit ?? 1} reports used this month
                        </span>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-[24px] font-bold text-foreground">
                      {disputeReports?.length || 0}
                    </div>
                    <p className="text-[12px] text-muted-foreground">
                      Generated this month
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Active Compliance Alerts */}
              {activeAlerts?.length > 0 && (
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="text-sm font-semibold text-foreground">
                      Active Compliance Alerts
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {activeAlerts?.map((alert: any) => (
                        <div
                          key={alert._id}
                          className={`p-3 rounded-lg border ${
                            alert.alertType === "at_risk"
                              ? "bg-yellow-500/10 border-yellow-500/20"
                              : "bg-red-500/10 border-red-500/20"
                          }`}
                        >
                          <p className="text-sm text-foreground">{alert.message}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Work Diary Simulator - Add click to open timeline */}
              <div onClick={() => setShowTimelinePopup(true)} className="cursor-pointer">
                <WorkDiarySimulator
                  timeBlocks={mockTimeBlocks}
                  selectedPlatform={selectedPlatform}
                  onBlockHover={(block) => {
                    if (block && block.complianceStatus === "rejected") {
                      // Optional: add feedback
                    }
                  }}
                />
              </div>

              {/* My Reports */}
              <div className="mt-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-[16px] flex items-center justify-between">
                      <span>My Reports</span>
                      <span className="text-xs text-muted-foreground">
                        {disputeReports?.length ?? 0} total
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(!disputeReports || disputeReports.length === 0) ? (
                      <div className="text-sm text-muted-foreground">
                        No reports yet. Generate one from Quick Actions.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {(disputeReports as any[]).slice(0, 5).map((r) => (
                          <div key={r._id} className="flex items-center justify-between border border-border rounded-md p-3">
                            <div className="flex items-center gap-3">
                              <Badge variant="outline" className="text-xs">
                                {r.status || "generated"}
                              </Badge>
                              <div className="text-sm text-foreground">
                                {r.caseId}
                                <span className="ml-2 text-xs text-muted-foreground">
                                  {r.generatedAt ? new Date(r.generatedAt).toLocaleString() : ""}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="text-xs text-muted-foreground">
                                ${r.lostIncome?.toFixed?.(2) ?? r.lostIncome}
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setReportViewerCaseId(r.caseId);
                                  setReportViewerContent(r.reportContent || "");
                                  setShowReportViewer(true);
                                }}
                              >
                                View
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Quick Actions */}
              <div className="mt-6 flex gap-4">
                <Button className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white">
                  <Clock className="mr-2 h-4 w-4" />
                  Start Timer
                </Button>

                {/* Automated Universal Report - PRO+ Only */}
                {currentSession && (subscriptionTier === "pro" || subscriptionTier === "expert") && (
                  <Button
                    variant="outline"
                    className="border-[#5C6AC4] text-[#5C6AC4] hover:bg-[#5C6AC4] hover:text-white"
                    onClick={handleGenerateUniversalReport}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Automated Dispute Report
                  </Button>
                )}

                {subscriptionTier === "free" && (
                  <Button
                    variant="outline"
                    className="border-[#2563EB] text-[#2563EB] hover:bg-[#2563EB] hover:text-white"
                    onClick={() => {
                      setPricingHighlightSavings(
                        Math.max(Math.round(((rejectedStats?.lostIncome || totalWeeklyLoss) * 0.83) * 100) / 100, 0)
                      );
                      trackConversion("upgrade_cta", { source: "quick_actions" });
                      setShowPricingModal(true);
                    }}
                  >
                    Upgrade to Pro
                  </Button>
                )}
              </div>
            </div>

            {/* Right Sidebar */}
            <div className="w-[400px] border-l border-border bg-background overflow-y-auto scrollbar-hide p-8 space-y-4">
              <EvidenceMonitor sessionId={currentSession?._id || null} />
              
              {/* WCVM Verification Badge */}
              {mockWCVMAnalysis && (
                <WCVMVerificationBadge
                  contextRelevanceScore={mockWCVMAnalysis.contextRelevanceScore}
                  requirementMatches={mockWCVMAnalysis.requirementMatches}
                  contextGaps={mockWCVMAnalysis.contextGaps}
                  verificationSignature={mockWCVMAnalysis.verificationSignature}
                />
              )}

              {/* Premium PRO+ Features - Always show with tier gating */}
              <RealTimeProtectionAdvisor 
                subscriptionTier={subscriptionTier}
                onUpgrade={() => {
                  setPricingHighlightSavings(
                    Math.max(Math.round(((rejectedStats?.lostIncome || totalWeeklyLoss) * 0.83) * 100) / 100, 0)
                  );
                  trackConversion("upgrade_cta", { source: "real_time_advisor" });
                  setShowPricingModal(true);
                }}
              />
              <CrossPlatformVerification 
                subscriptionTier={subscriptionTier}
                onUpgrade={() => {
                  setPricingHighlightSavings(
                    Math.max(Math.round(((rejectedStats?.lostIncome || totalWeeklyLoss) * 0.83) * 100) / 100, 0)
                  );
                  trackConversion("upgrade_cta", { source: "cross_platform_verification" });
                  setShowPricingModal(true);
                }}
              />

              <AIDisputePrediction
                subscriptionTier={subscriptionTier}
                onAnalyze={async () => {
                  toast.success("Analyzing work patterns...", {
                    description: "AI analysis will complete in a few seconds",
                  });
                }}
                onApplyRecommendation={(recommendationId) => {
                  toast.success("Applying recommendation...", {
                    description: "Your work patterns will be updated automatically",
                  });
                }}
                onUpgrade={() => {
                  setPricingHighlightSavings(
                    Math.max(Math.round(((rejectedStats?.lostIncome || totalWeeklyLoss) * 0.83) * 100) / 100, 0)
                  );
                  trackConversion("upgrade_cta", { source: "ai_dispute_prediction" });
                  setShowPricingModal(true);
                }}
              />
              <CustomPolicyAnalyzer 
                subscriptionTier={subscriptionTier}
                onUpgrade={() => {
                  setPricingHighlightSavings(
                    Math.max(Math.round(((rejectedStats?.lostIncome || totalWeeklyLoss) * 0.83) * 100) / 100, 0)
                  );
                  trackConversion("upgrade_cta", { source: "custom_policy_analyzer" });
                  setShowPricingModal(true);
                }}
              />

              {(subscriptionTier === "pro" || subscriptionTier === "expert") ? (
                <PremiumValueSection
                  protectedAmount={(profile as any)?.protectedValue || 0}
                  atRiskAmount={(rejectedStats?.lostIncome || totalWeeklyLoss) as number}
                />
              ) : (
                <LostIncomeCalculator
                  platformLosses={platformLosses}
                  subscriptionTier={subscriptionTier}
                  atRiskAmount={(rejectedStats?.lostIncome || totalWeeklyLoss) as number}
                  onUpgradeClick={() => {
                    setPricingHighlightSavings(
                      Math.max(Math.round(((rejectedStats?.lostIncome || totalWeeklyLoss) * 0.83) * 100) / 100, 0)
                    );
                    trackConversion("upgrade_cta", {
                      source: "premium_value_calculator",
                      atRiskAmount: rejectedStats?.lostIncome || totalWeeklyLoss,
                    });
                    setShowPricingModal(true);
                  }}
                />
              )}
            </div>
          </div>
        </div>

        {/* Pricing Modal */}
        <PricingModal
          isOpen={showPricingModal}
          onClose={() => setShowPricingModal(false)}
          onUpgrade={handleUpgrade}
          currentTier={subscriptionTier}
          currentLoss={rejectedStats?.lostIncome || 0}
          potentialSavings={(rejectedStats?.lostIncome || 0) - 8}
          highlightSavings={pricingHighlightSavings}
          vulnerabilityScore={0}
        />

        <ReportLimitModal
          isOpen={showReportLimitModal}
          onClose={() => setShowReportLimitModal(false)}
          onUpgrade={() => {
            trackConversion("upgrade_cta", {
              source: "report_limit_modal",
              monthlySavings: limitMonthlySavings,
            });
            setShowReportLimitModal(false);
            setShowPricingModal(true);
          }}
          monthlyLoss={limitMonthlyLoss}
          monthlySavings={limitMonthlySavings}
        />

        <ReportViewerModal
          isOpen={showReportViewer}
          onClose={() => setShowReportViewer(false)}
          caseId={reportViewerCaseId}
          reportContent={reportViewerContent}
        />

        {/* Add Timeline Popup */}
        <TimelinePopup
          isOpen={showTimelinePopup}
          onClose={() => setShowTimelinePopup(false)}
        />

        {/* Profile modal is now global via ProfileModal component in main.tsx */}
      </motion.div>
  );
}