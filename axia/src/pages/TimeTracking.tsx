import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Clock, Play, Pause, Square, Plus, Timer, TrendingUp,
  Calendar, ChevronDown, ChevronUp, Trash2, Edit3, Loader2,
} from "lucide-react";
import { useSubscriptionTier } from "@/hooks/use-subscription-tier";
import { useAuth } from "@/hooks/use-auth";
import { useWorkspaceContext } from "@/hooks/use-workspace";
import { useQuery, useMutation } from "@/lib/safe-convex-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { PageLayout } from "@/components/design-system/PageLayout";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function formatDuration(minutes: number | undefined) {
  if (!minutes) return "0h 0m";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function TimeTracking() {
  const { tier } = useSubscriptionTier();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { activeWorkspaceId, isConvexConnected } = useWorkspaceContext();
  const workspaceId = isConvexConnected ? (activeWorkspaceId as Id<"workspaces">) : undefined;

  // ─── Convex queries ──────────────────────────────────────────────────────
  const currentSession = useQuery(api.tracking.crud.getCurrentSession,
    workspaceId ? { workspaceId } : {}
  );
  const sessionsData = useQuery(api.tracking.crud.getSessions,
    workspaceId ? { workspaceId } : {}
  );
  const projects = useQuery(api.projects.projectProtection.getMyProjects, {});
  const clients = useQuery(api.clients.crud.getClients,
    workspaceId ? { workspaceId } : {}
  );

  // ─── Convex mutations ────────────────────────────────────────────────────
  const startSessionMutation = useMutation(api.tracking.crud.startSession);
  const stopSessionMutation = useMutation(api.tracking.crud.stopSession);
  const pauseSessionMutation = useMutation(api.tracking.crud.pauseSession);
  const resumeSessionMutation = useMutation(api.tracking.crud.resumeSession);
  const createManualEntryMutation = useMutation(api.tracking.crud.createManualEntry);
  const deleteSessionMutation = useMutation(api.tracking.crud.deleteSession);

  // ─── Local state ─────────────────────────────────────────────────────────
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState<"upwork" | "fiverr" | "toptal" | "manual">("manual");
  const [entryMemo, setEntryMemo] = useState("");
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [isCreatingManual, setIsCreatingManual] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Manual entry form state
  const [manualDate, setManualDate] = useState(new Date().toISOString().split("T")[0]);
  const [manualStart, setManualStart] = useState("09:00");
  const [manualEnd, setManualEnd] = useState("17:00");
  const [manualProject, setManualProject] = useState("");
  const [manualClient, setManualClient] = useState("");
  const [manualMemo, setManualMemo] = useState("");

  // ─── Demo mode ───────────────────────────────────────────────────────────
  const isDemoMode = !authLoading && !isAuthenticated;

  // ─── Loading timeout ────────────────────────────────────────────────────
  const [queryTimeout, setQueryTimeout] = useState(false);

  useEffect(() => {
    if (sessionsData === undefined && !authLoading) {
      const timer = setTimeout(() => setQueryTimeout(true), 3000);
      return () => clearTimeout(timer);
    } else {
      setQueryTimeout(false);
    }
  }, [sessionsData, authLoading]);

  const isLoading = !authLoading && sessionsData === undefined && !queryTimeout && !isDemoMode;

  // ─── Derived data from projects & clients ──────────────────────────────
  // Build a lookup map for projects by _id so we can resolve the selected project
  const projectMap = useMemo(() => {
    const map = new Map<string, any>();
    if (projects) {
      for (const p of projects) {
        map.set(p._id, p);
      }
    }
    return map;
  }, [projects]);

  // Build a lookup map for clients by _id
  const clientMap = useMemo(() => {
    const map = new Map<string, any>();
    if (clients) {
      for (const c of clients) {
        map.set(c._id, c);
      }
    }
    return map;
  }, [clients]);

  // Resolve the selected project's client info
  const selectedProjectData = selectedProject ? projectMap.get(selectedProject) : null;
  const selectedClientData = selectedProjectData?.clientId
    ? clientMap.get(selectedProjectData.clientId)
    : null;

  // ─── Map Convex data ────────────────────────────────────────────────────
  // Compute totalMinutes from startTime/endTime when totalMinutes is missing
  const realSessions = (sessionsData ?? [])
    .filter((s: any) => s.endTime !== undefined)
    .map((s: any) => ({
      ...s,
      totalMinutes:
        s.totalMinutes ??
        (s.endTime && s.startTime
          ? Math.floor((s.endTime - s.startTime) / (1000 * 60))
          : 0),
    }));
  const timeEntries = realSessions;

  const activeSession = isDemoMode ? null : currentSession;
  const isTimerRunning = !!activeSession && activeSession.endTime === undefined;

  // ─── Timer effect ────────────────────────────────────────────────────────
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isTimerRunning && !isPaused && activeSession) {
      const startTime = activeSession.startTime;
      interval = setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
      // Set initial value
      setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, isPaused, activeSession]);

  // Reset elapsed when session stops
  useEffect(() => {
    if (!isTimerRunning) {
      setElapsedSeconds(0);
      setIsPaused(false);
    }
  }, [isTimerRunning]);

  // ─── Weekly stats ────────────────────────────────────────────────────────
  const totalMinutesThisWeek = timeEntries.reduce((acc: number, e: any) => acc + (e.totalMinutes ?? 0), 0);
  const totalHoursThisWeek = totalMinutesThisWeek / 60;
  const compliantMinutes = timeEntries
    .filter((e: any) => e.complianceStatus === "active")
    .reduce((acc: number, e: any) => acc + (e.totalMinutes ?? 0), 0);
  const flaggedMinutes = timeEntries
    .filter((e: any) => e.complianceStatus === "rejected")
    .reduce((acc: number, e: any) => acc + (e.totalMinutes ?? 0), 0);
  const flaggedHours = flaggedMinutes / 60;
  const complianceRate = totalMinutesThisWeek > 0 ? Math.round((compliantMinutes / totalMinutesThisWeek) * 100) : 100;

  // ─── Handlers ────────────────────────────────────────────────────────────
  const handleStartTimer = async () => {
    if (!selectedProject) {
      toast.error("Please select a project first");
      return;
    }

    if (isDemoMode) {
      toast.success("Timer started! (Demo mode)", { description: `Tracking time for ${selectedProjectData?.projectName ?? selectedProject}` });
      return;
    }

    setIsStarting(true);
    try {
      // Resolve the project name from the selected project ID
      const projectName = selectedProjectData?.projectName ?? selectedProject;
      const clientName = selectedClientData?.clientName ?? "Unknown Client";
      const hourlyRate = selectedProjectData?.hourlyRate ?? selectedClientData?.hourlyRate ?? 75;

      await startSessionMutation({
        projectName,
        clientName,
        hourlyRate,
        platform: selectedPlatform,
        notes: entryMemo || undefined,
        workspaceId,
      });
      toast.success("Timer started!", { description: `Tracking time for ${selectedProjectData?.projectName ?? selectedProject}` });
      setEntryMemo("");
    } catch (err: any) {
      toast.error(err?.message || "Failed to start timer");
    } finally {
      setIsStarting(false);
    }
  };

  const handlePauseTimer = async () => {
    if (!activeSession) return;

    if (isDemoMode) {
      setIsPaused(!isPaused);
      toast.info(isPaused ? "Timer resumed" : "Timer paused");
      return;
    }

    try {
      if (isPaused) {
        await resumeSessionMutation({ sessionId: activeSession._id });
        setIsPaused(false);
        toast.info("Timer resumed");
      } else {
        await pauseSessionMutation({ sessionId: activeSession._id });
        setIsPaused(true);
        toast.info("Timer paused");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to update timer");
    }
  };

  const handleStopTimer = async () => {
    if (!activeSession) return;

    if (isDemoMode) {
      toast.success("Time entry saved! (Demo mode)");
      return;
    }

    setIsStopping(true);
    try {
      const result = await stopSessionMutation({ sessionId: activeSession._id });
      toast.success("Time entry saved!", {
        description: `${formatDuration(result.totalMinutes)} recorded for ${activeSession.projectName}`,
      });
    } catch (err: any) {
      toast.error(err?.message || "Failed to stop timer");
    } finally {
      setIsStopping(false);
    }
  };

  const handleManualEntry = async () => {
    const startParts = manualStart.split(":");
    const endParts = manualEnd.split(":");
    const startDate = new Date(manualDate);
    startDate.setHours(parseInt(startParts[0]), parseInt(startParts[1]));
    const endDate = new Date(manualDate);
    endDate.setHours(parseInt(endParts[0]), parseInt(endParts[1]));
    const duration = endDate.getTime() - startDate.getTime();

    if (duration <= 0) {
      toast.error("End time must be after start time");
      return;
    }

    if (isDemoMode) {
      toast.success("Manual entry added! (Demo mode)", {
        description: `${formatDuration(Math.floor(duration / 60000))} for ${manualProject || "Unassigned"}`,
      });
      setShowManualEntry(false);
      resetManualForm();
      return;
    }

    setIsCreatingManual(true);
    try {
      await createManualEntryMutation({
        projectName: manualProject || "Unassigned",
        clientName: manualClient || "Manual Entry",
        platform: "manual",
        notes: manualMemo || undefined,
        startTime: startDate.getTime(),
        endTime: endDate.getTime(),
        workspaceId,
      });
      toast.success("Manual entry added!", {
        description: `${formatDuration(Math.floor(duration / 60000))} for ${manualProject || "Unassigned"}`,
      });
      setShowManualEntry(false);
      resetManualForm();
    } catch (err: any) {
      toast.error(err?.message || "Failed to create manual entry");
    } finally {
      setIsCreatingManual(false);
    }
  };

  const handleDeleteEntry = async (id: any) => {
    if (isDemoMode) {
      toast.success("Time entry deleted (Demo mode)");
      return;
    }

    setIsDeleting(id as string);
    try {
      await deleteSessionMutation({ sessionId: id });
      toast.success("Time entry deleted");
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete entry");
    } finally {
      setIsDeleting(null);
    }
  };

  const resetManualForm = () => {
    setManualProject("");
    setManualClient("");
    setManualMemo("");
    setManualStart("09:00");
    setManualEnd("17:00");
  };

  // ─── Style maps ──────────────────────────────────────────────────────────
  const platformColor: Record<string, string> = {
    upwork: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    fiverr: "bg-green-500/10 text-green-600 border-green-500/20",
    toptal: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    manual: "bg-gray-500/10 text-gray-600 border-gray-500/20",
  };

  const complianceColor: Record<string, string> = {
    active: "bg-emerald-500/10 text-emerald-600",
    at_risk: "bg-yellow-500/10 text-yellow-600",
    rejected: "bg-red-500/10 text-red-600",
  };

  const complianceLabel: Record<string, string> = {
    active: "Compliant",
    at_risk: "At Risk",
    rejected: "Flagged",
  };

  const complianceDotColor: Record<string, string> = {
    active: "bg-emerald-500",
    at_risk: "bg-yellow-500",
    rejected: "bg-red-500",
  };

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <motion.div
      className="w-full min-h-screen bg-background text-foreground"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <PageLayout spaced>
        {/* Header */}
        <div>
          <h1 className="text-[32px] font-bold text-foreground tracking-tight mb-2">
            Time Tracking
          </h1>
          <p className="text-[16px] text-muted-foreground">
            Track your work hours across all platforms with compliance monitoring
          </p>
        </div>

        {/* Demo mode empty state */}
        {isDemoMode && (
          <Card className="p-8 bg-card rounded-xl border border-border">
            <div className="text-center space-y-4">
              <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Clock className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Sign in to track your time</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Connect your account to track work hours across all platforms with compliance monitoring.
                </p>
              </div>
              <Button asChild>
                <a href="/auth">Sign In</a>
              </Button>
            </div>
          </Card>
        )}

        {/* Loading state */}
        {isLoading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-4" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-8 w-16 mb-1" />
                    <Skeleton className="h-3 w-20" />
                  </CardContent>
                </Card>
              ))}
            </div>
            <Skeleton className="h-[200px] w-full rounded-xl" />
            <Skeleton className="h-[400px] w-full rounded-xl" />
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-[14px] font-medium text-muted-foreground">Total This Week</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-[24px] font-bold text-foreground">{totalHoursThisWeek.toFixed(1)}h</div>
                  <p className="text-[12px] text-muted-foreground">Across {timeEntries.length} entries</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-[14px] font-medium text-muted-foreground">Compliance Rate</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className={`text-[24px] font-bold ${complianceRate >= 90 ? "text-emerald-600" : complianceRate >= 70 ? "text-yellow-600" : "text-red-600"}`}>
                    {complianceRate}%
                  </div>
                  <p className="text-[12px] text-muted-foreground">Compliant hours</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-[14px] font-medium text-muted-foreground">Flagged Hours</CardTitle>
                  <Badge variant="destructive" className="text-[10px] px-1.5">Risk</Badge>
                </CardHeader>
                <CardContent>
                  <div className="text-[24px] font-bold text-red-600">{flaggedHours.toFixed(1)}h</div>
                  <p className="text-[12px] text-muted-foreground">Needs review</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-[14px] font-medium text-muted-foreground">Avg Daily</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-[24px] font-bold text-foreground">
                    {(totalHoursThisWeek / Math.max(1, new Set(timeEntries.map((e: any) => new Date(e.startTime).toDateString())).size)).toFixed(1)}h
                  </div>
                  <p className="text-[12px] text-muted-foreground">Hours per working day</p>
                </CardContent>
              </Card>
            </div>

            {/* Timer Section */}
            <Card className="border-2 border-primary/20">
              <CardContent className="pt-6">
                {isTimerRunning ? (
                  <div className="flex flex-col items-center gap-4">
                    <div className="flex items-center gap-3">
                      <div className={`h-3 w-3 rounded-full ${isPaused ? "bg-yellow-500" : "bg-emerald-500 animate-pulse"}`} />
                      <span className="text-sm font-medium text-muted-foreground">
                        {isPaused ? "Paused" : "Recording"} - {activeSession?.projectName}
                      </span>
                      <Badge variant="outline" className={platformColor[activeSession?.platform || "manual"]}>
                        {activeSession?.platform || "manual"}
                      </Badge>
                    </div>
                    <div className="text-[56px] font-mono font-bold text-foreground tracking-wider">
                      {formatTime(elapsedSeconds)}
                    </div>
                    <div className="flex items-center gap-3">
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={handlePauseTimer}
                        className="w-32"
                        disabled={isStopping}
                      >
                        {isPaused ? <Play className="mr-2 h-4 w-4" /> : <Pause className="mr-2 h-4 w-4" />}
                        {isPaused ? "Resume" : "Pause"}
                      </Button>
                      <Button
                        variant="destructive"
                        size="lg"
                        onClick={handleStopTimer}
                        className="w-32"
                        disabled={isStopping}
                      >
                        {isStopping ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Square className="mr-2 h-4 w-4" />}
                        Stop
                      </Button>
                    </div>
                    {activeSession?.notes && (
                      <p className="text-sm text-muted-foreground text-center">{activeSession.notes}</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Timer className="h-5 w-5 text-primary" />
                        <span className="text-lg font-semibold">Start New Session</span>
                      </div>
                      <Button variant="outline" onClick={() => setShowManualEntry(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Manual Entry
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Project</Label>
                        <Select value={selectedProject} onValueChange={setSelectedProject}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select project" />
                          </SelectTrigger>
                          <SelectContent>
                            {projects && projects.length > 0 ? (
                              projects.map((project: any) => (
                                <SelectItem key={project._id} value={project._id}>
                                  {project.projectName}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="_none" disabled>No projects found</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Platform</Label>
                        <Select value={selectedPlatform} onValueChange={(v) => setSelectedPlatform(v as any)}>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="upwork">Upwork</SelectItem>
                            <SelectItem value="fiverr">Fiverr</SelectItem>
                            <SelectItem value="toptal">Toptal</SelectItem>
                            <SelectItem value="manual">Manual</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Memo (optional)</Label>
                        <Input
                          placeholder="What are you working on?"
                          value={entryMemo}
                          onChange={(e) => setEntryMemo(e.target.value)}
                        />
                      </div>
                    </div>
                    <Button
                      className="bg-primary hover:bg-primary/90 w-full md:w-auto"
                      size="lg"
                      onClick={handleStartTimer}
                      disabled={isStarting}
                    >
                      {isStarting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                      Start Timer
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Time Entries List */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-[18px]">Recent Time Entries</CardTitle>
                  <span className="text-sm text-muted-foreground">{timeEntries.length} entries</span>
                </div>
              </CardHeader>
              <CardContent>
                {timeEntries.length === 0 ? (
                  <div className="py-12 text-center">
                    <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">
                      No time entries yet. Start a timer or add a manual entry to begin tracking.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <AnimatePresence>
                      {timeEntries.map((entry: any) => (
                        <motion.div
                          key={entry._id}
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, height: 0 }}
                          className="border border-border rounded-lg overflow-hidden"
                        >
                          <div
                            className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => setExpandedEntry(expandedEntry === entry._id ? null : entry._id)}
                          >
                            <div className="flex items-center gap-4">
                              <div className={`h-2 w-2 rounded-full ${complianceDotColor[entry.complianceStatus] || "bg-emerald-500"}`} />
                              <div>
                                <div className="font-medium text-foreground">{entry.projectName}</div>
                                <div className="text-sm text-muted-foreground">{entry.clientName} &middot; {formatDate(entry.startTime)}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              {entry.platform && (
                                <Badge variant="outline" className={platformColor[entry.platform] || platformColor.manual}>
                                  {entry.platform}
                                </Badge>
                              )}
                              <span className="font-mono text-sm font-medium text-foreground">
                                {formatDuration(entry.totalMinutes)}
                              </span>
                              <Badge variant="outline" className={complianceColor[entry.complianceStatus] || complianceColor.active}>
                                {complianceLabel[entry.complianceStatus] || "Compliant"}
                              </Badge>
                              {expandedEntry === entry._id ? (
                                <ChevronUp className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                          </div>
                          <AnimatePresence>
                            {expandedEntry === entry._id && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="px-4 pb-4 pt-0 border-t border-border bg-muted/20">
                                  <div className="pt-3 space-y-2">
                                    <div className="flex items-start gap-2">
                                      <span className="text-sm font-medium text-muted-foreground w-16">Memo:</span>
                                      <span className="text-sm text-foreground">{entry.notes || "No memo"}</span>
                                    </div>
                                    <div className="flex items-start gap-2">
                                      <span className="text-sm font-medium text-muted-foreground w-16">Time:</span>
                                      <span className="text-sm text-foreground">
                                        {new Date(entry.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} -{" "}
                                        {entry.endTime ? new Date(entry.endTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Now"}
                                      </span>
                                    </div>
                                    <div className="flex items-start gap-2">
                                      <span className="text-sm font-medium text-muted-foreground w-16">Rate:</span>
                                      <span className="text-sm text-foreground">${entry.hourlyRate || 75}/hr</span>
                                    </div>
                                    {entry.isManualEntry && (
                                      <div className="flex items-start gap-2">
                                        <span className="text-sm font-medium text-muted-foreground w-16">Type:</span>
                                        <Badge variant="secondary" className="text-[11px]">Manual Entry</Badge>
                                      </div>
                                    )}
                                    <div className="flex gap-2 pt-2">
                                      <Button variant="outline" size="sm" onClick={() => toast.info("Edit feature coming soon")}>
                                        <Edit3 className="h-3 w-3 mr-1" /> Edit
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-destructive hover:text-destructive"
                                        onClick={() => handleDeleteEntry(entry._id)}
                                        disabled={isDeleting === entry._id}
                                      >
                                        {isDeleting === entry._id ? (
                                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                        ) : (
                                          <Trash2 className="h-3 w-3 mr-1" />
                                        )}
                                        Delete
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* Manual Entry Dialog */}
        <Dialog open={showManualEntry} onOpenChange={setShowManualEntry}>
          <DialogContent className="sm:max-w-[500px] overflow-hidden">
            <DialogHeader>
              <DialogTitle>Add Manual Time Entry</DialogTitle>
              <DialogDescription>Add a manual time entry for work you've completed outside of the timer.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" value={manualDate} onChange={(e) => setManualDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Project</Label>
                  <Input placeholder="Project name" value={manualProject} onChange={(e) => setManualProject(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Client</Label>
                <Input placeholder="Client name (optional)" value={manualClient} onChange={(e) => setManualClient(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Time</Label>
                  <Input type="time" value={manualStart} onChange={(e) => setManualStart(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>End Time</Label>
                  <Input type="time" value={manualEnd} onChange={(e) => setManualEnd(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Memo</Label>
                <Input placeholder="What did you work on?" value={manualMemo} onChange={(e) => setManualMemo(e.target.value)} />
              </div>
              {tier === "free" && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 text-sm text-yellow-600 break-words">
                  Free plan: Manual entries are not compliance-verified. Upgrade to Pro for verified time tracking.
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowManualEntry(false)} disabled={isCreatingManual}>Cancel</Button>
              <Button
                className="bg-primary hover:bg-primary/90"
                onClick={handleManualEntry}
                disabled={isCreatingManual}
              >
                {isCreatingManual ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
                Add Entry
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageLayout>
    </motion.div>
  );
}
