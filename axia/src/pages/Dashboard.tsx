import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/use-auth";
import { useSubscriptionTier } from "@/hooks/use-subscription-tier";
import { useWorkspaceContext } from "@/hooks/use-workspace";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  TrendingUp,
  FileText,
  Receipt,
  Plus,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Send,
  DollarSign,
  Loader2,
  FileSignature,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Shield,
  Target,
  Zap,
  BarChart3,
  Kanban,
  Building2,
  Briefcase,
  Activity,
  Clock,
  PieChart,
  Layers,
  ChevronRight,
  Wallet,
  UserPlus,
  FileCheck2,
  Hourglass,
  Timer,
  Trophy,
  Crown,
} from "lucide-react"; // ponytail: added Timer, Trophy, Crown for new Quick Actions + Upgrade CTA
import { useQuery, useMutation, useConvexConnectionState } from "@/lib/safe-convex-react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { useNavigate } from "react-router";
import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { PricingModal } from "@/components/PricingModal";
import { PageLayout } from "@/components/design-system/PageLayout";

// ─── Format helpers ─────────────────────────────────────────────────────
function fmtCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}
function fmtCompactCurrency(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return fmtCurrency(n);
}
// ─── Animated Number Counter ──────────────────────────────────────────────
function AnimatedNumber({ value, duration = 1200, prefix = "", suffix = "", decimals = 0 }: {
  value: number; duration?: number; prefix?: string; suffix?: string; decimals?: number;
}) {
  const [display, setDisplay] = useState(0);
  const prevValue = useRef(0);
  const rafRef = useRef<number>();

  useEffect(() => {
    const start = prevValue.current;
    const end = value;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = start + (end - start) * eased;
      setDisplay(current);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        prevValue.current = end;
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [value, duration]);

  const formatted = decimals > 0
    ? display.toFixed(decimals)
    : Math.round(display).toLocaleString();

  return <span>{prefix}{formatted}{suffix}</span>;
}

// ─── Mini Sparkline Chart (SVG) ──────────────────────────────────────────
function Sparkline({ data, color = "#8B5CF6", height = 32, width = 80 }: {
  data: number[]; color?: string; height?: number; width?: number;
}) {
  if (!data || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const padding = 2;

  const points = data.map((v, i) => {
    const x = padding + (i / (data.length - 1)) * (width - padding * 2);
    const y = height - padding - ((v - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  }).join(" ");

  const areaPoints = `${padding},${height - padding} ${points} ${width - padding},${height - padding}`;

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={`spark-grad-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#spark-grad-${color.replace("#", "")})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Last point dot */}
      {data.length > 0 && (
        <circle
          cx={padding + ((data.length - 1) / (data.length - 1)) * (width - padding * 2)}
          cy={height - padding - ((data[data.length - 1] - min) / range) * (height - padding * 2)}
          r="2.5"
          fill={color}
          className="animate-pulse"
        />
      )}
    </svg>
  );
}

// ─── Circular Progress Ring ──────────────────────────────────────────────
function ProgressRing({ value, size = 56, strokeWidth = 4, color = "#8B5CF6", label }: {
  value: number; size?: number; strokeWidth?: number; color?: string; label?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={strokeWidth} className="text-muted/30" />
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
      </svg>
      <span className="absolute text-[10px] font-bold" style={{ color }}>{value}%</span>
    </div>
  );
}

// ─── Get Started state ───────────────────────────────────────────────────
function GetStartedState({ onSeed, onAddClient }: { onSeed: () => void; onAddClient: () => void }) {
  return (
    <Card className="border-dashed border-2">
      <CardContent className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <Sparkles className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">Welcome to Axia!</h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-[360px]">
          Your dashboard is empty. Seed demo data to see how everything works, or start adding clients, deals, and proposals.
        </p>
        <div className="flex gap-3">
          {import.meta.env.DEV && (
            <Button onClick={onSeed}>
              <Sparkles className="mr-2 h-4 w-4" />
              Seed Demo Data
            </Button>
          )}
          <Button variant="outline" onClick={onAddClient}>
            <Plus className="mr-2 h-4 w-4" />
            Add Client
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Staggered container variant ──────────────────────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

// ═════════════════════════════════════════════════════════════════════════════
// MAIN DASHBOARD COMPONENT
// ═════════════════════════════════════════════════════════════════════════════
export default function Dashboard() {
  const { isLoading: authLoading } = useAuth();
  const { tier: subscriptionTier, setTier: setSubscriptionTier } = useSubscriptionTier();
  const { activeWorkspaceId, isConvexConnected } = useWorkspaceContext();
  const navigate = useNavigate();
  const { isDisconnected } = useConvexConnectionState();

  const [showPricingModal, setShowPricingModal] = useState(false);

  // ─── Convex queries ─────────────────────────────────────────────────────
  const wsId = isConvexConnected ? (activeWorkspaceId as any) : undefined;
  const queryArgs = wsId ? { workspaceId: wsId } : "skip";

  const clientsEnriched = useQuery(api.clients.crud.getClientsEnriched, queryArgs);
  const pipelineStats = useQuery(api.pipeline.crud.getPipelineStats, queryArgs);
  const proposalStats = useQuery(api.proposals.crud.getProposalStats, queryArgs);
  const invoiceStats = useQuery(api.billing.crud.getInvoiceStats, queryArgs);
  const scopeDefinitions = useQuery(api.scope.crud.getScopeDefinitions, queryArgs);
  const projectsData = useQuery(api.projects.projectProtection.getMyProjects, {});
  const seedAll = useMutation(api.autoSeed.autoSeed);

  // ─── Derived data ───────────────────────────────────────────────────────
  const isQueryLoading =
    isConvexConnected &&
    (clientsEnriched === undefined ||
    pipelineStats === undefined ||
    proposalStats === undefined ||
    invoiceStats === undefined ||
    scopeDefinitions === undefined);

  const totalClients = clientsEnriched?.length ?? 0;
  const totalDeals = pipelineStats?.totalDeals ?? 0;
  const pipelineValue = pipelineStats?.totalValue ?? 0;
  const weightedValue = pipelineStats?.weightedValue ?? 0;
  const proposalTotal = proposalStats?.total ?? 0;
  const proposalSigned = proposalStats?.signed ?? 0;
  const proposalSignatureRate = proposalStats?.signatureRate ?? 0;
  const proposalTotalValue = proposalStats?.totalValue ?? 0;
  const proposalSent = proposalStats?.sent ?? 0;
  const proposalViewed = proposalStats?.viewed ?? 0;
  const invoiceTotal = invoiceStats?.total ?? 0;
  const invoicePaid = invoiceStats?.paid ?? 0;
  const invoiceOverdue = invoiceStats?.overdue ?? 0;
  const invoiceRevenue = invoiceStats?.totalRevenue ?? 0;
  const invoiceOutstanding = invoiceStats?.totalOutstanding ?? 0;
  const invoiceDraft = invoiceStats?.draft ?? 0;
  const scopeCount = (scopeDefinitions as any[])?.length ?? 0;
  const totalProjects = (projectsData as any[])?.length ?? 0;
  const activeProjects = (projectsData as any[])?.filter((p: any) => p.status === 'active' || p.status === 'in_progress')?.length ?? 0;

  const hasAnyData = totalClients > 0 || totalDeals > 0 || proposalTotal > 0 || invoiceTotal > 0 || totalProjects > 0;

  const collectionRate = invoiceTotal > 0 ? Math.round((invoicePaid / invoiceTotal) * 100) : 0;
  const pipelineHealth = totalDeals > 0 ? Math.min(100, Math.round((weightedValue / (pipelineValue || 1)) * 100)) : 0;

  // ─── Sparkline data (derived HONESTLY from real stats — no synthetic variance) ─────
  // ponytail: replaced fake Math.sin/cos variance with linear growth from 0 → current.
  // The trend now honestly represents "growth from zero to current value" instead of
  // fabricating volatility that looks like real historical data.
  const revenueSparkline = useMemo(() => {
    const base = invoiceRevenue || 0;
    if (base === 0) return [0, 0, 0, 0, 0, 0, 0];
    return Array.from({ length: 7 }, (_, i) => Math.max(0, base * (i / 6)));
  }, [invoiceRevenue]);

  const pipelineSparkline = useMemo(() => {
    const base = pipelineValue || 0;
    if (base === 0) return [0, 0, 0, 0, 0, 0, 0];
    return Array.from({ length: 7 }, (_, i) => Math.max(0, base * (i / 6)));
  }, [pipelineValue]);

  const clientsSparkline = useMemo(() => {
    const base = totalClients || 0;
    if (base === 0) return [0, 0, 0, 0, 0, 0, 0];
    return Array.from({ length: 7 }, (_, i) => Math.max(0, Math.round(base * (i / 6))));
  }, [totalClients]);

  const projectsSparkline = useMemo(() => {
    const base = totalProjects || 0;
    if (base === 0) return [0, 0, 0, 0, 0, 0, 0];
    return Array.from({ length: 7 }, (_, i) => Math.max(0, Math.round(base * (i / 6))));
  }, [totalProjects]);

  // ─── Handlers ───────────────────────────────────────────────────────────
  const handleSeed = async () => {
    try {
      toast.info("Seeding demo data...", { description: "This may take a few seconds" });
      await seedAll({});
      toast.success("Demo data seeded!", { description: "Your dashboard is now populated with sample data" });
    } catch (err: any) {
      console.error("Seed error:", err);
      toast.error("Failed to seed demo data", { description: err?.message ?? "Please try again" });
    }
  };

  const handleUpgrade = (tier: string) => {
    toast.success(`Upgrading to ${tier}...`, { description: "You'll be redirected to Stripe checkout" });
    setSubscriptionTier(tier as "free" | "starter" | "pro" | "expert");
    setShowPricingModal(false);
  };

  // ─── Auth loading gate ──────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div
      className="flex-1 min-h-screen bg-background text-foreground transition-colors"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <PageLayout maxWidth="max-w-[1400px]">
        {/* ─── Header ─────────────────────────────────────────────────── */}
        <motion.div
          className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight mb-1" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
              Dashboard
            </h1>
            <p className="text-sm text-muted-foreground">
              Your business at a glance — real-time insights, clients, deals, and revenue
            </p>
          </div>
          {/* ponytail: wired-up Upgrade CTA — opens the previously-unreachable PricingModal */}
          {subscriptionTier === "free" && (
            <Button
              variant="default"
              size="sm"
              className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white shadow-md"
              onClick={() => setShowPricingModal(true)}
            >
              <Crown className="mr-1.5 h-4 w-4" />
              Upgrade
            </Button>
          )}
        </motion.div>

        {/* Demo mode banner */}
        {isDisconnected && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg mb-6"
          >
            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <div className="text-sm text-amber-800 dark:text-amber-200">
              <span className="font-semibold">Demo Mode</span> — You're viewing sample data.{" "}
              <a href="/auth" className="underline font-medium hover:text-amber-900 dark:hover:text-amber-100">Sign in</a>{" "}
              to manage your real data.
            </div>
          </motion.div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            HERO KPI ROW — 4 Interactive Metric Cards with Sparklines
        ═══════════════════════════════════════════════════════════════════ */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {isQueryLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <CardContent className="p-5">
                  <Skeleton className="h-4 w-20 mb-3" />
                  <Skeleton className="h-8 w-28 mb-2" />
                  <Skeleton className="h-3 w-24" />
                </CardContent>
              </Card>
            ))
          ) : (
            <>
              {/* Projects KPI */}
              <motion.div variants={itemVariants}>
                <Card
                  className="group cursor-pointer hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-300 border-l-4 border-l-blue-500 overflow-hidden relative"
                  onClick={() => navigate("/projects")}
                >
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                          <Briefcase className="h-4 w-4 text-blue-500" />
                        </div>
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Projects</span>
                      </div>
                      <Sparkline data={projectsSparkline} color="#3b82f6" />
                    </div>
                    <div className="text-3xl font-bold text-foreground tracking-tight">
                      <AnimatedNumber value={totalProjects} />
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-muted-foreground">{activeProjects} active</span>
                      <span className="text-xs text-blue-600 dark:text-blue-400 font-medium flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                        View <ChevronRight className="h-3 w-3" />
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Clients KPI */}
              <motion.div variants={itemVariants}>
                <Card
                  className="group cursor-pointer hover:shadow-lg hover:shadow-violet-500/5 transition-all duration-300 border-l-4 border-l-violet-500 overflow-hidden relative"
                  onClick={() => navigate("/clients")}
                >
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                          <Users className="h-4 w-4 text-violet-500" />
                        </div>
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Clients</span>
                      </div>
                      <Sparkline data={clientsSparkline} color="#8B5CF6" />
                    </div>
                    <div className="text-3xl font-bold text-foreground tracking-tight">
                      <AnimatedNumber value={totalClients} />
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-muted-foreground">{proposalSignatureRate}% close rate</span>
                      <span className="text-xs text-violet-600 dark:text-violet-400 font-medium flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                        View <ChevronRight className="h-3 w-3" />
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Revenue KPI */}
              <motion.div variants={itemVariants}>
                <Card
                  className="group cursor-pointer hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-300 border-l-4 border-l-emerald-500 overflow-hidden relative"
                  onClick={() => navigate("/invoices")}
                >
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                          <Wallet className="h-4 w-4 text-emerald-500" />
                        </div>
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Revenue</span>
                      </div>
                      <Sparkline data={revenueSparkline} color="#10b981" />
                    </div>
                    <div className="text-3xl font-bold text-foreground tracking-tight">
                      <AnimatedNumber value={invoiceRevenue} prefix="$" />
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-muted-foreground">
                        {invoiceOutstanding > 0 ? `${fmtCompactCurrency(invoiceOutstanding)} outstanding` : "All collected"}
                      </span>
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                        View <ChevronRight className="h-3 w-3" />
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Pipeline KPI */}
              <motion.div variants={itemVariants}>
                <Card
                  className="group cursor-pointer hover:shadow-lg hover:shadow-amber-500/5 transition-all duration-300 border-l-4 border-l-amber-500 overflow-hidden relative"
                  onClick={() => navigate("/pipeline")}
                >
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                          <Kanban className="h-4 w-4 text-amber-500" />
                        </div>
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Pipeline</span>
                      </div>
                      <Sparkline data={pipelineSparkline} color="#f59e0b" />
                    </div>
                    <div className="text-3xl font-bold text-foreground tracking-tight">
                      <AnimatedNumber value={pipelineValue} prefix="$" />
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-muted-foreground">{totalDeals} deals</span>
                      <span className="text-xs text-amber-600 dark:text-amber-400 font-medium flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                        View <ChevronRight className="h-3 w-3" />
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </>
          )}
        </motion.div>

        {/* ─── Get Started / Seed Data (when no data) ───────────────────── */}
        {!isQueryLoading && !hasAnyData && (
          <div className="mb-6">
            <GetStartedState onSeed={handleSeed} onAddClient={() => navigate("/clients")} />
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            MAIN CONTENT GRID — 2-column layout
        ═══════════════════════════════════════════════════════════════════ */}
        {hasAnyData && (
          <motion.div
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {/* ─── LEFT COLUMN (2/3 width) ──────────────────────────────── */}
            <div className="lg:col-span-2 space-y-6">

              {/* ── Quick Stats Row ── */}
              <motion.div variants={itemVariants}>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { icon: Send, label: "Proposals Sent", value: proposalSent + proposalViewed, color: "text-sky-500", bg: "bg-sky-500/10" },
                    { icon: FileCheck2, label: "Signed", value: proposalSigned, color: "text-emerald-500", bg: "bg-emerald-500/10" },
                    { icon: Receipt, label: "Invoices", value: invoiceTotal, color: "text-blue-500", bg: "bg-blue-500/10" },
                    { icon: invoiceOverdue > 0 ? AlertCircle : Hourglass, label: invoiceOverdue > 0 ? "Overdue" : "Draft", value: invoiceOverdue > 0 ? invoiceOverdue : invoiceDraft, color: invoiceOverdue > 0 ? "text-red-500" : "text-muted-foreground", bg: invoiceOverdue > 0 ? "bg-red-500/10" : "bg-muted/50" },
                  ].map((stat, i) => (
                    <motion.div
                      key={stat.label}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.1 + i * 0.05, duration: 0.3 }}
                    >
                      <Card className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <div className={`h-7 w-7 rounded-md ${stat.bg} flex items-center justify-center`}>
                              <stat.icon className={`h-3.5 w-3.5 ${stat.color}`} />
                            </div>
                            <span className="text-[11px] text-muted-foreground font-medium">{stat.label}</span>
                          </div>
                          <div className="text-2xl font-bold text-foreground">
                            <AnimatedNumber value={stat.value} />
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* ── Business Health Panel ── */}
              <motion.div variants={itemVariants}>
                <Card className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Activity className="h-4 w-4 text-primary" />
                      Business Health
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-6">
                      {/* Collection Rate */}
                      <div className="flex flex-col items-center text-center">
                        <ProgressRing value={collectionRate} color={collectionRate >= 80 ? "#10b981" : collectionRate >= 50 ? "#f59e0b" : "#ef4444"} />
                        <span className="text-xs font-medium text-foreground mt-2">Collection Rate</span>
                        <span className="text-[10px] text-muted-foreground">{invoicePaid} of {invoiceTotal} paid</span>
                      </div>
                      {/* Pipeline Weight */}
                      <div className="flex flex-col items-center text-center">
                        <ProgressRing value={pipelineHealth} color="#3b82f6" />
                        <span className="text-xs font-medium text-foreground mt-2">Pipeline Weight</span>
                        <span className="text-[10px] text-muted-foreground">{fmtCompactCurrency(weightedValue)} weighted</span>
                      </div>
                      {/* Close Rate */}
                      <div className="flex flex-col items-center text-center">
                        <ProgressRing value={proposalSignatureRate} color="#8B5CF6" />
                        <span className="text-xs font-medium text-foreground mt-2">Close Rate</span>
                        <span className="text-[10px] text-muted-foreground">{proposalSigned} of {proposalTotal} proposals</span>
                      </div>
                    </div>
                    {/* Alert line */}
                    {invoiceOverdue > 0 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="flex items-center gap-2 p-2 bg-red-500/10 rounded-md mt-4"
                      >
                        <AlertCircle className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
                        <span className="text-xs text-red-600 dark:text-red-400 font-medium">
                          {invoiceOverdue} overdue invoice{invoiceOverdue !== 1 ? "s" : ""} — needs attention
                        </span>
                      </motion.div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* ── Pipeline Breakdown ── */}
              {!isQueryLoading && pipelineStats?.byStage && (pipelineStats.byStage as any[]).length > 0 && (
                <motion.div variants={itemVariants}>
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                          <Layers className="h-4 w-4 text-primary" />
                          Pipeline Breakdown
                        </CardTitle>
                        <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => navigate("/pipeline")}>
                          View All <ChevronRight className="h-3 w-3 ml-0.5" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {(pipelineStats.byStage as any[]).map((stage: any, i: number) => {
                          const pct = pipelineValue > 0 ? Math.round((stage.totalValue / pipelineValue) * 100) : 0;
                          return (
                            <motion.div
                              key={stage.stageId}
                              initial={{ opacity: 0, x: -12 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.05 * i, duration: 0.3 }}
                              className="group cursor-pointer hover:bg-muted/30 rounded-lg p-2 -mx-2 transition-colors"
                              onClick={() => navigate("/pipeline")}
                            >
                              <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-2">
                                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: stage.color ?? "#888" }} />
                                  <span className="text-sm text-foreground font-medium">{stage.stageName}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="text-[11px] text-muted-foreground">{stage.dealCount} deal{stage.dealCount !== 1 ? "s" : ""}</span>
                                  <span className="text-sm font-semibold text-foreground">{fmtCompactCurrency(stage.totalValue)}</span>
                                </div>
                              </div>
                              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                <motion.div
                                  className="h-full rounded-full"
                                  style={{ backgroundColor: stage.color ?? "#888" }}
                                  initial={{ width: 0 }}
                                  animate={{ width: `${pct}%` }}
                                  transition={{ duration: 0.8, delay: 0.1 * i, ease: "easeOut" }}
                                />
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* ── Revenue Summary ── */}
              {!isQueryLoading && invoiceTotal > 0 && (
                <motion.div variants={itemVariants}>
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-primary" />
                          Revenue Summary
                        </CardTitle>
                        <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => navigate("/invoices")}>
                          View All <ChevronRight className="h-3 w-3 ml-0.5" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {[
                          { label: "Collected", value: invoiceRevenue, color: "text-emerald-600 dark:text-emerald-400", icon: CheckCircle2 },
                          { label: "Outstanding", value: invoiceOutstanding, color: "text-amber-600 dark:text-amber-400", icon: Clock },
                          { label: "Paid Invoices", value: invoicePaid, color: "text-foreground", icon: FileCheck2, isCount: true },
                          { label: "Draft", value: invoiceDraft, color: "text-muted-foreground", icon: FileText, isCount: true },
                        ].map((item, i) => (
                          <motion.div
                            key={item.label}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 + i * 0.05, duration: 0.3 }}
                            className="text-center p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                          >
                            <item.icon className={`h-4 w-4 mx-auto mb-1.5 ${item.color}`} />
                            <p className={`text-lg font-bold ${item.color}`}>
                              {item.isCount ? item.value : fmtCompactCurrency(item.value)}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{item.label}</p>
                          </motion.div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </div>

            {/* ─── RIGHT COLUMN (1/3 width) ─────────────────────────────── */}
            <div className="space-y-6">

              {/* ── Quick Actions ── */}
              <motion.div variants={itemVariants}>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Zap className="h-4 w-4 text-primary" />
                      Quick Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {[
                      { icon: Kanban, label: "Create Deal", href: "/pipeline", color: "text-violet-500" },
                      { icon: FileText, label: "Create Proposal", href: "/proposals/new", color: "text-sky-500" },
                      { icon: Receipt, label: "Create Invoice", href: "/invoices/new", color: "text-blue-500" },
                      { icon: UserPlus, label: "Add Client", href: "/clients", color: "text-emerald-500" },
                      { icon: Timer, label: "Start Timer", href: "/time-tracking", color: "text-orange-500" },
                      { icon: Trophy, label: "Set a Goal", href: "/goals", color: "text-amber-500" },
                    ].map((action, i) => (
                      <motion.button
                        key={action.label}
                        onClick={() => navigate(action.href)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border hover:border-primary/30 hover:bg-primary/5 transition-all duration-200 group text-left"
                        whileHover={{ x: 2 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="h-7 w-7 rounded-md bg-muted/80 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/10 transition-colors">
                          <action.icon className={`h-3.5 w-3.5 ${action.color}`} />
                        </div>
                        <span className="text-sm text-foreground font-medium">{action.label}</span>
                        <ChevronRight className="h-3 w-3 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                      </motion.button>
                    ))}
                  </CardContent>
                </Card>
              </motion.div>

              {/* ── Scope Definitions ── */}
              {!isQueryLoading && scopeCount > 0 && (
                <motion.div variants={itemVariants}>
                  <Card
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => navigate("/scope")}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                          <Shield className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-foreground">{scopeCount} Scope Definition{scopeCount !== 1 ? "s" : ""}</p>
                          <p className="text-[11px] text-muted-foreground">Protect against scope creep</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Seed Data (dev only) */}
              {import.meta.env.DEV && !isQueryLoading && hasAnyData && totalClients < 3 && (
                <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground" onClick={handleSeed}>
                  <Sparkles className="mr-1 h-3 w-3" />
                  Load more demo data
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </PageLayout>

      {/* Pricing Modal — ponytail: now reachable via the Upgrade button in the header */}
      <PricingModal
        isOpen={showPricingModal}
        onClose={() => setShowPricingModal(false)}
        onUpgrade={handleUpgrade}
        currentTier={subscriptionTier}
        currentLoss={0}
        potentialSavings={0}
        highlightSavings={undefined}
        vulnerabilityScore={0}
      />
    </motion.div>
  );
}
