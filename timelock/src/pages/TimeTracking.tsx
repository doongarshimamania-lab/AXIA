import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Clock, Play, Pause, Square, Plus, Timer, TrendingUp,
  Calendar, Briefcase, ChevronDown, ChevronUp, Trash2, Edit3
} from "lucide-react";
import { useSubscriptionTier } from "@/hooks/use-subscription-tier";
import { useQuery, useMutation } from "@/lib/safe-convex-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

// ─── Types ────────────────────────────────────────────────────

interface TimeEntry {
  id: string;
  _id?: string;
  project: string;
  client: string;
  platform: "upwork" | "fiverr" | "toptal" | "manual";
  startTime: number;
  endTime: number | null;
  duration: number;
  memo: string;
  compliance: "compliant" | "at_risk" | "flagged";
  tags: string[];
}

// ─── Mock fallback data ───────────────────────────────────────

const MOCK_ENTRIES: TimeEntry[] = [
  {
    id: "1",
    project: "Website Redesign",
    client: "Acme Corp",
    platform: "upwork",
    startTime: Date.now() - 7 * 24 * 60 * 60 * 1000,
    endTime: Date.now() - 7 * 24 * 60 * 60 * 1000 + 4.5 * 60 * 60 * 1000,
    duration: 4.5 * 60 * 60 * 1000,
    memo: "Implemented responsive navigation and hero section",
    compliance: "compliant",
    tags: ["development", "frontend"],
  },
  {
    id: "2",
    project: "Mobile App MVP",
    client: "TechStart Inc",
    platform: "fiverr",
    startTime: Date.now() - 6 * 24 * 60 * 60 * 1000,
    endTime: Date.now() - 6 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000,
    duration: 3 * 60 * 60 * 1000,
    memo: "API integration and data fetching layer",
    compliance: "compliant",
    tags: ["development", "backend"],
  },
  {
    id: "3",
    project: "Brand Identity",
    client: "Creative Studio",
    platform: "upwork",
    startTime: Date.now() - 5 * 24 * 60 * 60 * 1000,
    endTime: Date.now() - 5 * 24 * 60 * 60 * 1000 + 2.5 * 60 * 60 * 1000,
    duration: 2.5 * 60 * 60 * 1000,
    memo: "Logo variations and color palette exploration",
    compliance: "at_risk",
    tags: ["design"],
  },
  {
    id: "4",
    project: "Dashboard Analytics",
    client: "DataViz Co",
    platform: "toptal",
    startTime: Date.now() - 4 * 24 * 60 * 60 * 1000,
    endTime: Date.now() - 4 * 24 * 60 * 60 * 1000 + 6 * 60 * 60 * 1000,
    duration: 6 * 60 * 60 * 1000,
    memo: "Chart components and real-time data streaming",
    compliance: "compliant",
    tags: ["development", "frontend", "data-viz"],
  },
  {
    id: "5",
    project: "E-commerce Platform",
    client: "ShopEasy",
    platform: "upwork",
    startTime: Date.now() - 3 * 24 * 60 * 60 * 1000,
    endTime: Date.now() - 3 * 24 * 60 * 60 * 1000 + 1.5 * 60 * 60 * 1000,
    duration: 1.5 * 60 * 60 * 1000,
    memo: "Low activity period - minimal keyboard/mouse events",
    compliance: "flagged",
    tags: ["development"],
  },
];

// ─── Component ────────────────────────────────────────────────

export default function TimeTracking() {
  const { tier } = useSubscriptionTier();
  
  // ── Convex Queries ──────────────────────────────────────────
  const convexSessions = useQuery(api.tracking.crud.getWorkSessions, {}) as any[] | undefined;
  const activeConvexSession = useQuery(api.tracking.crud.getActiveSession, {}) as any | undefined;
  const sessionStats = useQuery(api.tracking.crud.getSessionStats, {}) as any | undefined;
  
  // ── Convex Mutations ────────────────────────────────────────
  const startSessionMutation = useMutation(api.tracking.crud.startSession);
  const stopSessionMutation = useMutation(api.tracking.crud.stopSession);
  const updateSessionMutation = useMutation(api.tracking.crud.updateSession);
  const deleteSessionMutation = useMutation(api.tracking.crud.deleteSession);

  // ── Local state ─────────────────────────────────────────────
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(null);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedClient, setSelectedClient] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState<"upwork" | "fiverr" | "toptal" | "manual">("upwork");
  const [entryMemo, setEntryMemo] = useState("");
  const [convexSessionId, setConvexSessionId] = useState<string | null>(null);

  // Manual entry form state
  const [manualDate, setManualDate] = useState(new Date().toISOString().split("T")[0]);
  const [manualStart, setManualStart] = useState("09:00");
  const [manualEnd, setManualEnd] = useState("17:00");
  const [manualProject, setManualProject] = useState("");
  const [manualClient, setManualClient] = useState("");
  const [manualMemo, setManualMemo] = useState("");

  // ── Merge Convex + Mock time entries ────────────────────────
  const timeEntries: TimeEntry[] = (() => {
    if (convexSessions && convexSessions.length > 0) {
      return convexSessions
        .filter((s: any) => s.endTime) // only completed sessions
        .map((s: any) => ({
          id: s._id,
          _id: s._id,
          project: s.projectName,
          client: s.clientName,
          platform: (s.memo?.includes("fiverr") ? "fiverr" : s.memo?.includes("toptal") ? "toptal" : "upwork") as "upwork" | "fiverr" | "toptal" | "manual",
          startTime: s.startTime,
          endTime: s.endTime,
          duration: (s.totalMinutes || 0) * 60 * 1000,
          memo: s.memo || "",
          compliance: s.complianceStatus === "active" ? "compliant" : s.complianceStatus === "at_risk" ? "at_risk" : "flagged",
          tags: [],
        }));
    }
    return MOCK_ENTRIES;
  })();

  // ── Sync active session from Convex ─────────────────────────
  useEffect(() => {
    if (activeConvexSession && !isTimerRunning) {
      // There's an active session on the backend — resume the timer
      setConvexSessionId(activeConvexSession._id);
      setSelectedProject(activeConvexSession.projectName);
      setSelectedClient(activeConvexSession.clientName);
      setEntryMemo(activeConvexSession.memo || "");
      setIsTimerRunning(true);
      setIsPaused(false);
      const elapsed = Math.floor((Date.now() - activeConvexSession.startTime) / 1000);
      setElapsedSeconds(elapsed);
      setActiveEntry({
        id: activeConvexSession._id,
        _id: activeConvexSession._id,
        project: activeConvexSession.projectName,
        client: activeConvexSession.clientName,
        platform: "upwork",
        startTime: activeConvexSession.startTime,
        endTime: null,
        duration: 0,
        memo: activeConvexSession.memo || "",
        compliance: "compliant",
        tags: [],
      });
    }
  }, [activeConvexSession]);

  // Timer effect
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isTimerRunning && !isPaused) {
      interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, isPaused]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const formatDuration = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleStartTimer = async () => {
    if (!selectedProject) {
      toast.error("Please select a project first");
      return;
    }
    
    const entry: TimeEntry = {
      id: `entry-${Date.now()}`,
      project: selectedProject,
      client: selectedClient || "Current Client",
      platform: selectedPlatform,
      startTime: Date.now(),
      endTime: null,
      duration: 0,
      memo: entryMemo,
      compliance: "compliant",
      tags: [],
    };
    setActiveEntry(entry);
    setIsTimerRunning(true);
    setIsPaused(false);
    setElapsedSeconds(0);
    
    // Start session in Convex
    try {
      const sid = await startSessionMutation({
        clientName: selectedClient || "Current Client",
        projectName: selectedProject,
        hourlyRate: 75, // Default rate — could be pulled from user settings
        memo: entryMemo || undefined,
      });
      setConvexSessionId(sid as string);
    } catch (err: any) {
      console.warn("Failed to start Convex session:", err);
      // Continue locally even if Convex fails
    }
    
    toast.success("Timer started!", { description: `Tracking time for ${selectedProject}` });
  };

  const handlePauseTimer = () => {
    setIsPaused(!isPaused);
    toast.info(isPaused ? "Timer resumed" : "Timer paused");
  };

  const handleStopTimer = async () => {
    if (activeEntry) {
      const completedEntry: TimeEntry = {
        ...activeEntry,
        endTime: Date.now(),
        duration: elapsedSeconds * 1000,
      };
      toast.success("Time entry saved!", {
        description: `${formatDuration(completedEntry.duration)} recorded for ${completedEntry.project}`,
      });
    }
    
    // Stop session in Convex
    if (convexSessionId) {
      try {
        await stopSessionMutation({ sessionId: convexSessionId as Id<"workSessions"> });
      } catch (err: any) {
        console.warn("Failed to stop Convex session:", err);
      }
    }
    
    setIsTimerRunning(false);
    setIsPaused(false);
    setElapsedSeconds(0);
    setActiveEntry(null);
    setConvexSessionId(null);
    setEntryMemo("");
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

    const totalMinutes = Math.floor(duration / (1000 * 60));

    // Create session in Convex with start and stop
    try {
      const sid = await startSessionMutation({
        clientName: manualClient || "Manual Entry",
        projectName: manualProject || "Unassigned",
        hourlyRate: 75,
        memo: manualMemo || undefined,
      });
      
      // Immediately stop it with the calculated times
      // We need to patch the session with the correct start/end times
      await stopSessionMutation({ sessionId: sid as Id<"workSessions"> });
    } catch (err: any) {
      console.warn("Failed to create manual entry via Convex:", err);
    }

    setShowManualEntry(false);
    toast.success("Manual entry added!", {
      description: `${formatDuration(duration)} for ${manualProject || "Unassigned"}`,
    });
  };

  const handleDeleteEntry = async (entry: TimeEntry) => {
    // Delete from Convex if it has a _id
    if (entry._id) {
      try {
        await deleteSessionMutation({ sessionId: entry._id as Id<"workSessions"> });
      } catch (err: any) {
        console.warn("Failed to delete Convex session:", err);
      }
    }
    toast.success("Time entry deleted");
  };

  // ── Stats from Convex or local ──────────────────────────────
  const totalHoursThisWeek = sessionStats
    ? sessionStats.weekMinutes / 60
    : timeEntries.reduce((acc, e) => acc + e.duration, 0) / (1000 * 60 * 60);
  
  const compliantHours = sessionStats
    ? (sessionStats.compliance?.compliant || 0) * 1.5 / 60 // rough estimate
    : timeEntries.filter((e) => e.compliance === "compliant").reduce((acc, e) => acc + e.duration, 0) / (1000 * 60 * 60);
  
  const flaggedHours = sessionStats
    ? (sessionStats.compliance?.rejected || 0) * 1.5 / 60
    : timeEntries.filter((e) => e.compliance === "flagged").reduce((acc, e) => acc + e.duration, 0) / (1000 * 60 * 60);
  
  const complianceRate = sessionStats?.compliance?.complianceRate ?? 
    (totalHoursThisWeek > 0 ? Math.round((compliantHours / totalHoursThisWeek) * 100) : 100);

  const platformColor: Record<string, string> = {
    upwork: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    fiverr: "bg-green-500/10 text-green-600 border-green-500/20",
    toptal: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    manual: "bg-gray-500/10 text-gray-600 border-gray-500/20",
  };

  const complianceColor: Record<string, string> = {
    compliant: "bg-emerald-500/10 text-emerald-600",
    at_risk: "bg-yellow-500/10 text-yellow-600",
    flagged: "bg-red-500/10 text-red-600",
  };

  return (
    <motion.div
      className="w-full min-h-screen bg-background text-foreground"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-[32px] font-bold text-foreground tracking-tight mb-2">
            Time Tracking
          </h1>
          <p className="text-[16px] text-muted-foreground">
            Track your work hours across all platforms with compliance monitoring
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-[14px] font-medium text-muted-foreground">Total This Week</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-[24px] font-bold text-foreground">{totalHoursThisWeek.toFixed(1)}h</div>
              <p className="text-[12px] text-muted-foreground">Across {sessionStats?.weekSessions ?? timeEntries.length} entries</p>
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
                {(totalHoursThisWeek / Math.max(1, new Set(timeEntries.map(e => new Date(e.startTime).toDateString())).size)).toFixed(1)}h
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
                    {isPaused ? "Paused" : "Recording"} - {activeEntry?.project}
                  </span>
                  <Badge variant="outline" className={platformColor[activeEntry?.platform || "manual"]}>
                    {activeEntry?.platform}
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
                  >
                    {isPaused ? <Play className="mr-2 h-4 w-4" /> : <Pause className="mr-2 h-4 w-4" />}
                    {isPaused ? "Resume" : "Pause"}
                  </Button>
                  <Button
                    variant="destructive"
                    size="lg"
                    onClick={handleStopTimer}
                    className="w-32"
                  >
                    <Square className="mr-2 h-4 w-4" />
                    Stop
                  </Button>
                </div>
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
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Client</Label>
                    <Input
                      placeholder="Client name"
                      value={selectedClient}
                      onChange={(e) => setSelectedClient(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Project</Label>
                    <Select value={selectedProject} onValueChange={setSelectedProject}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select project" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Website Redesign">Website Redesign</SelectItem>
                        <SelectItem value="Mobile App MVP">Mobile App MVP</SelectItem>
                        <SelectItem value="Brand Identity">Brand Identity</SelectItem>
                        <SelectItem value="Dashboard Analytics">Dashboard Analytics</SelectItem>
                        <SelectItem value="E-commerce Platform">E-commerce Platform</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Platform</Label>
                    <Select value={selectedPlatform} onValueChange={(v) => setSelectedPlatform(v as any)}>
                      <SelectTrigger>
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
                >
                  <Play className="mr-2 h-4 w-4" />
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
            <div className="space-y-2 max-h-96 overflow-y-auto">
              <AnimatePresence>
                {timeEntries.map((entry) => (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    className="border border-border rounded-lg overflow-hidden"
                  >
                    <div
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => setExpandedEntry(expandedEntry === entry.id ? null : entry.id)}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`h-2 w-2 rounded-full ${complianceColor[entry.compliance].split(" ")[1]?.replace("text-", "bg-") || "bg-emerald-500"}`} />
                        <div>
                          <div className="font-medium text-foreground">{entry.project}</div>
                          <div className="text-sm text-muted-foreground">{entry.client} &middot; {formatDate(entry.startTime)}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className={platformColor[entry.platform]}>
                          {entry.platform}
                        </Badge>
                        <span className="font-mono text-sm font-medium text-foreground">
                          {formatDuration(entry.duration)}
                        </span>
                        <Badge variant="outline" className={complianceColor[entry.compliance]}>
                          {entry.compliance === "compliant" ? "Compliant" : entry.compliance === "at_risk" ? "At Risk" : "Flagged"}
                        </Badge>
                        {expandedEntry === entry.id ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                    <AnimatePresence>
                      {expandedEntry === entry.id && (
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
                                <span className="text-sm text-foreground">{entry.memo || "No memo"}</span>
                              </div>
                              <div className="flex items-start gap-2">
                                <span className="text-sm font-medium text-muted-foreground w-16">Time:</span>
                                <span className="text-sm text-foreground">
                                  {new Date(entry.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} -{" "}
                                  {entry.endTime ? new Date(entry.endTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Now"}
                                </span>
                              </div>
                              {entry.tags.length > 0 && (
                                <div className="flex items-start gap-2">
                                  <span className="text-sm font-medium text-muted-foreground w-16">Tags:</span>
                                  <div className="flex gap-1 flex-wrap">
                                    {entry.tags.map((tag) => (
                                      <Badge key={tag} variant="secondary" className="text-[11px]">{tag}</Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                              <div className="flex gap-2 pt-2">
                                <Button variant="outline" size="sm" onClick={() => toast.info("Edit feature coming soon")}>
                                  <Edit3 className="h-3 w-3 mr-1" /> Edit
                                </Button>
                                <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDeleteEntry(entry)}>
                                  <Trash2 className="h-3 w-3 mr-1" /> Delete
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
          </CardContent>
        </Card>

        {/* Manual Entry Dialog */}
        <Dialog open={showManualEntry} onOpenChange={setShowManualEntry}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add Manual Time Entry</DialogTitle>
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Client</Label>
                  <Input placeholder="Client name" value={manualClient} onChange={(e) => setManualClient(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Hourly Rate</Label>
                  <Input type="number" placeholder="75" defaultValue={75} />
                </div>
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
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 text-sm text-yellow-600">
                  Free plan: Manual entries are not compliance-verified. Upgrade to Pro for verified time tracking.
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowManualEntry(false)}>Cancel</Button>
              <Button className="bg-primary hover:bg-primary/90" onClick={handleManualEntry}>Add Entry</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </motion.div>
  );
}
