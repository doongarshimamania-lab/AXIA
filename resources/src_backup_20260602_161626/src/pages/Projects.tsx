import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Shield,
  AlertTriangle,
  DollarSign,
  TrendingUp,
  Activity,
  Clock,
  Target,
} from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/hooks/use-auth";
import { useNavigate } from "react-router";
import { useSubscriptionTier } from "@/hooks/use-subscription-tier";

// Feature Components
import { ProjectList } from "@/components/project-protection/ProjectList";
import { ProjectProtectionScore } from "@/components/project-protection/ProjectProtectionScore";
import { ProjectHealthDashboardNew } from "@/components/project-protection/ProjectHealthDashboardNew";
import { ProjectRiskTimeline } from "@/components/project-protection/ProjectRiskTimeline";
import { MilestoneProtection } from "@/components/project-protection/MilestoneProtection";
import { AdaptiveEvidenceSystem } from "@/components/project-protection/AdaptiveEvidenceSystem";
import { ProtectionRiskHeatmap } from "@/components/project-protection/ProtectionRiskHeatmap";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Project {
  _id: string;
  userId: string;
  clientId: string;
  projectName: string;
  clientName: string;
  platform: string;
  hourlyRate: number;
  projectType: "ongoing" | "fixed" | "milestone";
  protectionLevel: "standard" | "enhanced" | "maximum";
  status: "active" | "at_risk" | "completed" | "paused";
  createdAt: number;
  lastActivityAt: number;
  totalHours: number;
  protectionScore: number;
  activeSession: boolean;
  totalValue: number;
  atRiskAmount: number;
  rejectedHours: number;
}

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

const MOCK_PROJECTS: Project[] = [
  {
    _id: "mock-proj-001",
    userId: "mock-user-001",
    clientId: "mock-client-001",
    projectName: "E-Commerce Platform Redesign",
    clientName: "NovaTech Solutions",
    platform: "Upwork",
    hourlyRate: 95,
    projectType: "ongoing",
    protectionLevel: "maximum",
    status: "active",
    createdAt: Date.now() - 45 * 24 * 60 * 60 * 1000,
    lastActivityAt: Date.now() - 2 * 60 * 60 * 1000,
    totalHours: 186.5,
    protectionScore: 94,
    activeSession: true,
    totalValue: 17717.5,
    atRiskAmount: 0,
    rejectedHours: 0,
  },
  {
    _id: "mock-proj-002",
    userId: "mock-user-001",
    clientId: "mock-client-002",
    projectName: "Mobile Banking App MVP",
    clientName: "FinEdge Inc.",
    platform: "Toptal",
    hourlyRate: 0,
    projectType: "fixed",
    protectionLevel: "enhanced",
    status: "active",
    createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
    lastActivityAt: Date.now() - 6 * 60 * 60 * 1000,
    totalHours: 240,
    protectionScore: 78,
    activeSession: false,
    totalValue: 25000,
    atRiskAmount: 0,
    rejectedHours: 3.5,
  },
  {
    _id: "mock-proj-003",
    userId: "mock-user-001",
    clientId: "mock-client-003",
    projectName: "SaaS Dashboard Analytics",
    clientName: "DataPulse LLC",
    platform: "Fiverr",
    hourlyRate: 0,
    projectType: "milestone",
    protectionLevel: "standard",
    status: "at_risk",
    createdAt: Date.now() - 60 * 24 * 60 * 60 * 1000,
    lastActivityAt: Date.now() - 48 * 60 * 60 * 1000,
    totalHours: 95,
    protectionScore: 52,
    activeSession: false,
    totalValue: 8500,
    atRiskAmount: 4200,
    rejectedHours: 12,
  },
  {
    _id: "mock-proj-004",
    userId: "mock-user-001",
    clientId: "mock-client-004",
    projectName: "AI Content Generation API",
    clientName: "CortexAI Labs",
    platform: "Upwork",
    hourlyRate: 120,
    projectType: "ongoing",
    protectionLevel: "maximum",
    status: "completed",
    createdAt: Date.now() - 120 * 24 * 60 * 60 * 1000,
    lastActivityAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
    totalHours: 210,
    protectionScore: 97,
    activeSession: false,
    totalValue: 25200,
    atRiskAmount: 0,
    rejectedHours: 0,
  },
  {
    _id: "mock-proj-005",
    userId: "mock-user-001",
    clientId: "mock-client-005",
    projectName: "Healthcare Portal Integration",
    clientName: "MedBridge Health",
    platform: "Direct Client",
    hourlyRate: 85,
    projectType: "ongoing",
    protectionLevel: "enhanced",
    status: "active",
    createdAt: Date.now() - 20 * 24 * 60 * 60 * 1000,
    lastActivityAt: Date.now() - 12 * 60 * 60 * 1000,
    totalHours: 142,
    protectionScore: 71,
    activeSession: false,
    totalValue: 12070,
    atRiskAmount: 0,
    rejectedHours: 5,
  },
];

// ---------------------------------------------------------------------------
// Metric Card Component
// ---------------------------------------------------------------------------

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: "emerald" | "amber" | "red";
}

const ACCENT_GRADIENT: Record<string, string> = {
  emerald: "from-emerald-500 to-emerald-400",
  amber: "from-amber-500 to-amber-400",
  red: "from-red-500 to-red-400",
};

function MetricCard({ icon, label, value, accent }: MetricCardProps) {
  return (
    <Card className="rounded-xl border border-border bg-card overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-muted">
            {icon}
          </div>
          <span className="text-sm text-muted-foreground tracking-tight">
            {label}
          </span>
        </div>
        <p className="text-2xl font-bold text-foreground tracking-tight">
          {value}
        </p>
      </CardContent>
      <div
        className={`h-1 w-full bg-gradient-to-r ${ACCENT_GRADIENT[accent]}`}
      />
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function Projects() {
  useAuth();
  const navigate = useNavigate();
  const { tier } = useSubscriptionTier();

  const handleUpgrade = () => navigate("/subscription");

  // --- Convex Queries -------------------------------------------------------
  const projects = useQuery(api.projects.projectProtection.getMyProjects, {});

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null
  );

  // Loading timeout fallback — after 2 s treat undefined as "empty"
  const [queryTimeout, setQueryTimeout] = useState(false);

  useEffect(() => {
    if (projects === undefined) {
      const timer = setTimeout(() => setQueryTimeout(true), 2000);
      return () => clearTimeout(timer);
    }
    setQueryTimeout(false);
  }, [projects]);

  const isLoading = projects === undefined && !queryTimeout;

  // Merge real data with mock fallback
  const safeProjects = useMemo<Project[]>(() => {
    if (projects && projects.length > 0) {
      return projects.map((p: Record<string, unknown>) => ({
        _id: p._id,
        userId: p.userId ?? "mock-user-001",
        clientId: p.clientId ?? "",
        projectName: p.projectName ?? "Untitled Project",
        clientName: p.clientName ?? "Unknown Client",
        platform: p.platform ?? "Upwork",
        hourlyRate: p.hourlyRate ?? 0,
        projectType: p.projectType ?? "ongoing",
        protectionLevel: p.protectionLevel ?? "standard",
        status: p.status ?? "active",
        createdAt: p.createdAt ?? Date.now(),
        lastActivityAt: p.lastActivityAt ?? Date.now(),
        totalHours: p.totalHours ?? 0,
        protectionScore: p.protectionScore ?? 0,
        activeSession: p.activeSession ?? false,
        totalValue: p.totalValue ?? 0,
        atRiskAmount: p.atRiskAmount ?? 0,
        rejectedHours: p.rejectedHours ?? 0,
      }));
    }
    return MOCK_PROJECTS;
  }, [projects]);

  // Auto-select first project on mount
  useEffect(() => {
    if (!selectedProjectId && safeProjects.length > 0) {
      setSelectedProjectId(safeProjects[0]._id);
    }
  }, [safeProjects, selectedProjectId]);

  const selectedProject = useMemo(
    () => safeProjects.find((p) => p._id === selectedProjectId) ?? null,
    [safeProjects, selectedProjectId]
  );

  // --- Derived Metrics (computed every render, no useEffect) ----------------
  const metrics = useMemo(() => {
    const totalProtectedValue = safeProjects.reduce(
      (acc, p) => acc + p.totalValue,
      0
    );
    const activeCount = safeProjects.filter(
      (p) => p.status === "active"
    ).length;
    const avgScore =
      safeProjects.length > 0
        ? Math.round(
            safeProjects.reduce((acc, p) => acc + p.protectionScore, 0) /
              safeProjects.length
          )
        : 0;
    const totalAtRisk = safeProjects.reduce(
      (acc, p) => acc + p.atRiskAmount,
      0
    );
    return { totalProtectedValue, activeCount, avgScore, totalAtRisk };
  }, [safeProjects]);

  // --- Render ---------------------------------------------------------------

  return (
    <div className="w-full min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-6 space-y-8">
        {/* Page Header */}
        <div>
          <h1 className="text-[32px] font-bold text-foreground tracking-tight mb-2">
            Project Protection
          </h1>
          <p className="text-[16px] text-muted-foreground">
            Manage your project protection, track evidence, and monitor dispute
            risks.
          </p>
        </div>

        {/* Summary Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            icon={<DollarSign className="h-5 w-5 text-emerald-500" />}
            label="Total Protected Value"
            value={formatCurrency(metrics.totalProtectedValue)}
            accent="emerald"
          />
          <MetricCard
            icon={<TrendingUp className="h-5 w-5 text-amber-500" />}
            label="Active Projects"
            value={String(metrics.activeCount)}
            accent="amber"
          />
          <MetricCard
            icon={<Shield className="h-5 w-5 text-emerald-500" />}
            label="Avg Protection Score"
            value={`${metrics.avgScore}%`}
            accent="emerald"
          />
          <MetricCard
            icon={<AlertTriangle className="h-5 w-5 text-red-500" />}
            label="At-Risk Amount"
            value={formatCurrency(metrics.totalAtRisk)}
            accent="red"
          />
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          {isLoading ? (
            <div className="space-y-4">
              <div className="h-[200px] w-full rounded-xl bg-muted/40 animate-pulse" />
              <div className="h-[400px] w-full rounded-xl bg-muted/40 animate-pulse" />
            </div>
          ) : (
            <>
              {/* Project List / Selection */}
              <ProjectList
                projects={safeProjects.map((p) => ({
                  _id: p._id,
                  projectName: p.projectName,
                  hourlyRate: p.hourlyRate,
                  projectType: p.projectType,
                  protectionLevel: p.protectionLevel,
                  protectionScore: p.protectionScore,
                  totalHours: p.totalHours,
                  totalValue: p.totalValue,
                  atRiskAmount: p.atRiskAmount,
                  activeSession: p.activeSession,
                  rejectedHours: p.rejectedHours,
                }))}
                selectedProjectId={selectedProjectId}
                onSelectProject={setSelectedProjectId}
                onAddProject={() => navigate("/projects/new")}
                subscriptionTier={tier}
                onUpgrade={() => navigate("/subscription")}
              />

              {/* Feature Dashboard */}
              <div className="space-y-8">
                {/* 1. Protection Score */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    <h2 className="text-xl font-semibold tracking-tight">
                      Protection Score
                    </h2>
                  </div>
                  <ProjectProtectionScore
                    projectId={
                      selectedProjectId as Id<"projects"> | undefined
                    }
                    tier={tier}
                    onUpgrade={handleUpgrade}
                  />
                </div>

                {/* 2. Health Dashboard */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary" />
                    <h2 className="text-xl font-semibold tracking-tight">
                      Project Health Dashboard
                    </h2>
                  </div>
                  <ProjectHealthDashboardNew
                    projectData={selectedProject}
                    tier={tier}
                    onUpgrade={handleUpgrade}
                  />
                </div>

                {/* 3. Risk Timeline Analysis */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    <h2 className="text-xl font-semibold tracking-tight">
                      Risk Timeline Analysis
                    </h2>
                  </div>
                  <ProjectRiskTimeline
                    projectData={selectedProject}
                    tier={tier}
                    onUpgrade={handleUpgrade}
                  />
                </div>

                {/* 4. Milestone Protection */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    <h2 className="text-xl font-semibold tracking-tight">
                      Milestone Protection
                    </h2>
                  </div>
                  <MilestoneProtection
                    projectId={
                      selectedProjectId as Id<"projects"> | undefined
                    }
                    tier={tier}
                    onUpgrade={handleUpgrade}
                  />
                </div>

                {/* 5. Adaptive Evidence System */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary" />
                    <h2 className="text-xl font-semibold tracking-tight">
                      Adaptive Evidence System
                    </h2>
                  </div>
                  <AdaptiveEvidenceSystem
                    projectId={
                      selectedProjectId as Id<"projects"> | undefined
                    }
                    tier={tier}
                    onUpgrade={handleUpgrade}
                  />
                </div>

                {/* 6. Protection Risk Heatmap */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    <h2 className="text-xl font-semibold tracking-tight">
                      Protection Risk Heatmap
                    </h2>
                  </div>
                  <ProtectionRiskHeatmap
                    projectId={
                      selectedProjectId as Id<"projects"> | undefined
                    }
                    tier={tier}
                    onUpgrade={handleUpgrade}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
