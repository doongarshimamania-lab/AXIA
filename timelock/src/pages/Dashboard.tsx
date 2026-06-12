import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  Ruler,
  LayoutList,
  Plus,
  Sparkles,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Send,
  DollarSign,
  Loader2,
  Eye,
  FileSignature,
  CreditCard,
  Bell,
  BellRing,
  X,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Shield,
  Target,
  Zap,
  BarChart3,
  CircleDot,
  Timer,
  Kanban,
  Building2,
} from "lucide-react";
import { useQuery, useMutation, useConvexConnectionState } from "@/lib/safe-convex-react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { useNavigate } from "react-router";
import { useMemo, useState, useEffect, useCallback } from "react";
import { PricingModal } from "@/components/PricingModal";

// ─── Loading skeleton for a stat card ────────────────────────────────────
function StatCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4 rounded" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-20 mb-1" />
        <Skeleton className="h-3 w-32" />
      </CardContent>
    </Card>
  );
}

// ─── Loading skeleton for the activity feed ──────────────────────────────
function ActivitySkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-border">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="flex-1 space-y-1">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}

// ─── Empty state CTA ─────────────────────────────────────────────────────
function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="text-sm font-medium text-foreground mb-1">{title}</h3>
      <p className="text-xs text-muted-foreground mb-4 max-w-[240px]">{description}</p>
      <Button size="sm" onClick={onAction}>
        <Plus className="mr-1 h-3 w-3" />
        {actionLabel}
      </Button>
    </div>
  );
}

// ─── Get Started state when no data at all ───────────────────────────────
function GetStartedState({ onSeed, onAddClient }: { onSeed: () => void; onAddClient: () => void }) {
  return (
    <Card className="border-dashed border-2">
      <CardContent className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <Sparkles className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Welcome to Axia!
        </h3>
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

// ─── Activity item type ──────────────────────────────────────────────────
interface ActivityItem {
  id: string;
  type: "deal" | "proposal" | "invoice";
  title: string;
  subtitle: string;
  status: string;
  timestamp: number;
  href: string;
}

// ─── Notification type for the popup ─────────────────────────────────────
interface InsightNotification {
  id: string;
  icon: React.ElementType;
  iconColor: string;
  title: string;
  description: string;
  timestamp: number;
  href: string;
  read: boolean;
}

// ─── Status badge colors ─────────────────────────────────────────────────
function statusColor(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (["won", "signed", "paid", "completed"].includes(status)) return "default";
  if (["lost", "declined", "overdue", "expired", "rejected"].includes(status)) return "destructive";
  return "secondary";
}

function statusIcon(type: string, status: string) {
  if (type === "deal") {
    if (status === "won") return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    if (status === "lost") return <AlertCircle className="h-4 w-4 text-red-500" />;
    return <TrendingUp className="h-4 w-4 text-blue-500" />;
  }
  if (type === "proposal") {
    if (status === "signed") return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    if (status === "sent" || status === "viewed") return <Send className="h-4 w-4 text-blue-500" />;
    return <FileText className="h-4 w-4 text-muted-foreground" />;
  }
  // invoice
  if (status === "paid") return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
  if (status === "overdue") return <AlertCircle className="h-4 w-4 text-red-500" />;
  return <DollarSign className="h-4 w-4 text-amber-500" />;
}

// ─── Format currency ─────────────────────────────────────────────────────
function fmtCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

function fmtRelative(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}

function fmtCompactCurrency(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return fmtCurrency(n);
}

// ─── Metric trend indicator ──────────────────────────────────────────────
function TrendIndicator({ value, label }: { value: number; label: string }) {
  if (value > 0) return (
    <span className="flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 text-xs">
      <ArrowUpRight className="h-3 w-3" /> +{value}% {label}
    </span>
  );
  if (value < 0) return (
    <span className="flex items-center gap-0.5 text-red-600 dark:text-red-400 text-xs">
      <ArrowDownRight className="h-3 w-3" /> {value}% {label}
    </span>
  );
  return (
    <span className="flex items-center gap-0.5 text-muted-foreground text-xs">
      <Minus className="h-3 w-3" /> No change
    </span>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// MAIN DASHBOARD COMPONENT
// ═════════════════════════════════════════════════════════════════════════
export default function Dashboard() {
  const { isLoading: authLoading } = useAuth();
  const { tier: subscriptionTier, setTier: setSubscriptionTier } = useSubscriptionTier();
  const { activeWorkspaceId, isConvexConnected } = useWorkspaceContext();
  const navigate = useNavigate();
  const { isDisconnected } = useConvexConnectionState();

  const [showPricingModal, setShowPricingModal] = useState(false);
  const [pricingHighlightSavings] = useState<number | undefined>(undefined);
  const [showNotifications, setShowNotifications] = useState(false);

  // ─── Convex queries ─────────────────────────────────────────────────────
  const wsId = isConvexConnected ? (activeWorkspaceId as any) : undefined;
  const queryArgs = wsId ? { workspaceId: wsId } : "skip";

  const clientsEnriched = useQuery(api.clients.crud.getClientsEnriched, queryArgs);
  const pipelineStats = useQuery(api.pipeline.crud.getPipelineStats, queryArgs);
  const proposalStats = useQuery(api.proposals.crud.getProposalStats, queryArgs);
  const invoiceStats = useQuery(api.billing.crud.getInvoiceStats, queryArgs);
  const scopeDefinitions = useQuery(api.scope.crud.getScopeDefinitions, queryArgs);

  const deals = useQuery(api.pipeline.crud.getDeals, queryArgs);
  const proposals = useQuery(api.proposals.crud.getProposals, queryArgs);
  const invoices = useQuery(api.billing.crud.getInvoices, queryArgs);

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

  const hasAnyData = totalClients > 0 || totalDeals > 0 || proposalTotal > 0 || invoiceTotal > 0;

  // ─── Derived health metrics ─────────────────────────────────────────────
  const collectionRate = invoiceTotal > 0 ? Math.round((invoicePaid / invoiceTotal) * 100) : 0;
  const pipelineHealth = totalDeals > 0 ? Math.min(100, Math.round((weightedValue / (pipelineValue || 1)) * 100)) : 0;

  // ─── Build insight notifications from real data ─────────────────────────
  const notifications: InsightNotification[] = useMemo(() => {
    const notifs: InsightNotification[] = [];

    // Overdue invoices → urgent alert
    if (invoiceOverdue > 0) {
      notifs.push({
        id: "overdue-alert",
        icon: AlertCircle,
        iconColor: "text-red-500 bg-red-500/10",
        title: `${invoiceOverdue} Overdue Invoice${invoiceOverdue > 1 ? "s" : ""}`,
        description: `${fmtCurrency(invoiceOutstanding)} outstanding — needs attention`,
        timestamp: Date.now() - 60000,
        href: "/invoices",
        read: false,
      });
    }

    // Proposals viewed but not signed
    if (proposalViewed > 0) {
      notifs.push({
        id: "proposals-viewed",
        icon: Eye,
        iconColor: "text-blue-500 bg-blue-500/10",
        title: `${proposalViewed} Proposal${proposalViewed > 1 ? "s" : ""} Viewed`,
        description: "Client opened but hasn't signed yet — follow up",
        timestamp: Date.now() - 300000,
        href: "/proposals",
        read: false,
      });
    }

    // Signed proposals → celebrate
    if (proposalSigned > 0) {
      notifs.push({
        id: "proposals-signed",
        icon: FileSignature,
        iconColor: "text-emerald-500 bg-emerald-500/10",
        title: `${proposalSigned} Proposal${proposalSigned > 1 ? "s" : ""} Signed`,
        description: `${fmtCurrency(proposalTotalValue)} in signed contracts`,
        timestamp: Date.now() - 600000,
        href: "/proposals",
        read: false,
      });
    }

    // Invoices sent but not paid
    if (invoiceTotal - invoicePaid - invoiceOverdue > 0) {
      const pending = invoiceTotal - invoicePaid - invoiceOverdue;
      notifs.push({
        id: "invoices-pending",
        icon: CreditCard,
        iconColor: "text-amber-500 bg-amber-500/10",
        title: `${pending} Invoice${pending > 1 ? "s" : ""} Pending`,
        description: "Sent but awaiting payment",
        timestamp: Date.now() - 900000,
        href: "/invoices",
        read: true,
      });
    }

    // Pipeline activity
    if (totalDeals > 0) {
      notifs.push({
        id: "pipeline-active",
        icon: Kanban,
        iconColor: "text-violet-500 bg-violet-500/10",
        title: `${totalDeals} Active Deal${totalDeals > 1 ? "s" : ""}`,
        description: `${fmtCurrency(pipelineValue)} total pipeline value`,
        timestamp: Date.now() - 1200000,
        href: "/pipeline",
        read: true,
      });
    }

    // Proposals sent awaiting response
    if (proposalSent > 0) {
      notifs.push({
        id: "proposals-sent",
        icon: Send,
        iconColor: "text-sky-500 bg-sky-500/10",
        title: `${proposalSent} Proposal${proposalSent > 1 ? "s" : ""} Sent`,
        description: "Awaiting client response",
        timestamp: Date.now() - 1800000,
        href: "/proposals",
        read: true,
      });
    }

    // Collection rate insight
    if (invoiceTotal > 0 && collectionRate < 80) {
      notifs.push({
        id: "collection-low",
        icon: BarChart3,
        iconColor: "text-orange-500 bg-orange-500/10",
        title: "Collection Rate Below 80%",
        description: `${collectionRate}% — consider following up on outstanding invoices`,
        timestamp: Date.now() - 3600000,
        href: "/invoices",
        read: true,
      });
    }

    // Revenue received
    if (invoiceRevenue > 0) {
      notifs.push({
        id: "revenue-received",
        icon: DollarSign,
        iconColor: "text-emerald-500 bg-emerald-500/10",
        title: `${fmtCompactCurrency(invoiceRevenue)} Collected`,
        description: "Revenue received this period",
        timestamp: Date.now() - 7200000,
        href: "/invoices",
        read: true,
      });
    }

    return notifs;
  }, [invoiceOverdue, invoiceOutstanding, proposalViewed, proposalSigned, proposalTotalValue, invoiceTotal, invoicePaid, totalDeals, pipelineValue, proposalSent, collectionRate, invoiceRevenue]);

  const unreadCount = notifications.filter(n => !n.read).length;

  // ─── Build activity feed ────────────────────────────────────────────────
  const activityItems: ActivityItem[] = useMemo(() => {
    const items: ActivityItem[] = [];

    if (deals && Array.isArray(deals)) {
      for (const d of deals.slice(0, 10)) {
        const stageName = (d as any).stageName || "Pipeline";
        items.push({
          id: `deal-${(d as any)._id}`,
          type: "deal",
          title: d.title ?? "Untitled Deal",
          subtitle: `${fmtCurrency(d.value ?? 0)} · ${stageName}`,
          status: stageName.toLowerCase(),
          timestamp: d.updatedAt ?? d.createdAt ?? Date.now(),
          href: "/pipeline",
        });
      }
    }

    if (proposals && Array.isArray(proposals)) {
      for (const p of proposals.slice(0, 10)) {
        items.push({
          id: `proposal-${(p as any)._id}`,
          type: "proposal",
          title: p.title ?? "Untitled Proposal",
          subtitle: `${fmtCurrency(p.totalValue ?? 0)} · ${p.clientName ?? "No client"}`,
          status: p.status ?? "draft",
          timestamp: p.updatedAt ?? p.createdAt ?? Date.now(),
          href: "/proposals",
        });
      }
    }

    if (invoices && Array.isArray(invoices)) {
      for (const inv of invoices.slice(0, 10)) {
        items.push({
          id: `invoice-${(inv as any)._id}`,
          type: "invoice",
          title: `${(inv as any).invoiceNumber ?? "Invoice"} — ${inv.clientName ?? "No client"}`,
          subtitle: fmtCurrency(inv.total ?? 0),
          status: inv.status ?? "draft",
          timestamp: (inv as any).updatedAt ?? (inv as any).createdAt ?? Date.now(),
          href: "/invoices",
        });
      }
    }

    items.sort((a, b) => b.timestamp - a.timestamp);
    return items.slice(0, 15);
  }, [deals, proposals, invoices]);

  // ─── Handlers ───────────────────────────────────────────────────────────
  const handleSeed = async () => {
    try {
      toast.info("Seeding demo data...", { description: "This may take a few seconds" });
      await seedAll({});
      toast.success("Demo data seeded!", {
        description: "Your dashboard is now populated with sample data",
      });
    } catch (err: any) {
      console.error("Seed error:", err);
      toast.error("Failed to seed demo data", {
        description: err?.message ?? "Please try again",
      });
    }
  };

  const handleUpgrade = (tier: string) => {
    toast.success(`Upgrading to ${tier}...`, {
      description: "You'll be redirected to Stripe checkout",
    });
    setSubscriptionTier(tier as "free" | "starter" | "pro" | "expert");
    setShowPricingModal(false);
  };

  // ─── Auto-dismiss notification panel ───────────────────────────────────
  useEffect(() => {
    if (!showNotifications) return;
    const timer = setTimeout(() => setShowNotifications(false), 15000);
    return () => clearTimeout(timer);
  }, [showNotifications]);

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
      <div className="container mx-auto px-4 py-6 max-w-[1400px]">
        {/* ─── Header with Notification Bell ──────────────────────────── */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight mb-1">
              Dashboard
            </h1>
            <p className="text-sm text-muted-foreground">
              Your business at a glance — clients, deals, proposals, and invoices
            </p>
          </div>
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-lg hover:bg-muted transition-colors"
            >
              {unreadCount > 0 ? (
                <BellRing className="h-5 w-5 text-foreground" />
              ) : (
                <Bell className="h-5 w-5 text-muted-foreground" />
              )}
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notification Popup */}
            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-12 w-[360px] max-h-[480px] overflow-y-auto bg-popover border border-border rounded-xl shadow-lg z-50"
                >
                  <div className="sticky top-0 bg-popover border-b border-border px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold">Insights</h3>
                      {unreadCount > 0 && (
                        <Badge variant="destructive" className="text-[10px] h-4 px-1.5">
                          {unreadCount} new
                        </Badge>
                      )}
                    </div>
                    <button
                      onClick={() => setShowNotifications(false)}
                      className="p-1 rounded-md hover:bg-muted transition-colors"
                    >
                      <X className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  </div>
                  <div className="divide-y divide-border">
                    {notifications.length === 0 ? (
                      <div className="py-8 text-center text-sm text-muted-foreground">
                        No insights right now
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <button
                          key={notif.id}
                          onClick={() => {
                            navigate(notif.href);
                            setShowNotifications(false);
                          }}
                          className={`w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors ${!notif.read ? "bg-primary/5" : ""}`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 ${notif.iconColor}`}>
                              <notif.icon className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground">{notif.title}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">{notif.description}</p>
                              <p className="text-[10px] text-muted-foreground/60 mt-1">{fmtRelative(notif.timestamp)}</p>
                            </div>
                            {!notif.read && (
                              <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-2" />
                            )}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Demo mode banner */}
        {isDisconnected && (
          <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg mb-6">
            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <div className="text-sm text-amber-800 dark:text-amber-200">
              <span className="font-semibold">Demo Mode</span> — You're viewing sample data.{" "}
              <a href="/auth" className="underline font-medium hover:text-amber-900 dark:hover:text-amber-100">
                Sign in
              </a>{" "}
              to manage your real data.
            </div>
          </div>
        )}

        {/* ─── PRIMARY METRICS ROW — Big 3 KPIs ────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
          {isQueryLoading ? (
            <>
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </>
          ) : (
            <>
              {/* Revenue KPI */}
              <Card className="border-l-4 border-l-emerald-500 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/invoices")}>
                <CardContent className="pt-4 pb-4 px-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Revenue</span>
                    <DollarSign className="h-4 w-4 text-emerald-500" />
                  </div>
                  <div className="text-3xl font-bold text-foreground tracking-tight">
                    {fmtCompactCurrency(invoiceRevenue)}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-muted-foreground">
                      {invoiceOutstanding > 0 ? `${fmtCompactCurrency(invoiceOutstanding)} outstanding` : "All collected"}
                    </span>
                    <span className="flex items-center gap-1 text-xs">
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">{collectionRate}%</span>
                      <span className="text-muted-foreground">collected</span>
                    </span>
                  </div>
                  <Progress value={collectionRate} className="h-1.5 mt-2" />
                </CardContent>
              </Card>

              {/* Pipeline KPI */}
              <Card className="border-l-4 border-l-blue-500 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/pipeline")}>
                <CardContent className="pt-4 pb-4 px-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Pipeline</span>
                    <Kanban className="h-4 w-4 text-blue-500" />
                  </div>
                  <div className="text-3xl font-bold text-foreground tracking-tight">
                    {fmtCompactCurrency(pipelineValue)}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-muted-foreground">
                      {totalDeals} deal{totalDeals !== 1 ? "s" : ""} · {fmtCompactCurrency(weightedValue)} weighted
                    </span>
                    <span className="flex items-center gap-1 text-xs">
                      <span className="text-blue-600 dark:text-blue-400 font-medium">{pipelineHealth}%</span>
                      <span className="text-muted-foreground">health</span>
                    </span>
                  </div>
                  <Progress value={pipelineHealth} className="h-1.5 mt-2" />
                </CardContent>
              </Card>

              {/* Proposals KPI */}
              <Card className="border-l-4 border-l-violet-500 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/proposals")}>
                <CardContent className="pt-4 pb-4 px-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Proposals</span>
                    <FileSignature className="h-4 w-4 text-violet-500" />
                  </div>
                  <div className="text-3xl font-bold text-foreground tracking-tight">
                    {proposalTotal}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-muted-foreground">
                      {proposalSigned} signed · {fmtCompactCurrency(proposalTotalValue)} value
                    </span>
                    <span className="flex items-center gap-1 text-xs">
                      <span className="text-violet-600 dark:text-violet-400 font-medium">{proposalSignatureRate}%</span>
                      <span className="text-muted-foreground">close rate</span>
                    </span>
                  </div>
                  <Progress value={proposalSignatureRate} className="h-1.5 mt-2" />
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* ─── SECONDARY METRICS ROW — 6 compact tiles ─────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {isQueryLoading ? (
            Array.from({ length: 6 }).map((_, i) => <StatCardSkeleton key={i} />)
          ) : (
            <>
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/clients")}>
                <CardContent className="pt-3 pb-3 px-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Clients</span>
                  </div>
                  <div className="text-xl font-bold text-foreground">{totalClients}</div>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/pipeline")}>
                <CardContent className="pt-3 pb-3 px-4">
                  <div className="flex items-center gap-2 mb-1">
                    <LayoutList className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Active Deals</span>
                  </div>
                  <div className="text-xl font-bold text-foreground">{totalDeals}</div>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/proposals")}>
                <CardContent className="pt-3 pb-3 px-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Send className="h-3.5 w-3.5 text-sky-500" />
                    <span className="text-xs text-muted-foreground">Sent</span>
                  </div>
                  <div className="text-xl font-bold text-foreground">{proposalSent + proposalViewed}</div>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/invoices")}>
                <CardContent className="pt-3 pb-3 px-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Receipt className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Invoices</span>
                  </div>
                  <div className="text-xl font-bold text-foreground">{invoiceTotal}</div>
                </CardContent>
              </Card>

              <Card className={`cursor-pointer hover:shadow-md transition-shadow ${invoiceOverdue > 0 ? "border-red-200 dark:border-red-800" : ""}`} onClick={() => navigate("/invoices")}>
                <CardContent className="pt-3 pb-3 px-4">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertCircle className={`h-3.5 w-3.5 ${invoiceOverdue > 0 ? "text-red-500" : "text-muted-foreground"}`} />
                    <span className="text-xs text-muted-foreground">Overdue</span>
                  </div>
                  <div className={`text-xl font-bold ${invoiceOverdue > 0 ? "text-red-600 dark:text-red-400" : "text-foreground"}`}>{invoiceOverdue}</div>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/scope")}>
                <CardContent className="pt-3 pb-3 px-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Scopes</span>
                  </div>
                  <div className="text-xl font-bold text-foreground">{scopeCount}</div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* ─── Get Started / Seed Data (shown when no data exists) ───────── */}
        {!isQueryLoading && !hasAnyData && (
          <div className="mb-6">
            <GetStartedState onSeed={handleSeed} onAddClient={() => navigate("/clients")} />
          </div>
        )}

        {/* ─── MAIN CONTENT: Activity + Side Panels ───────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Activity Feed — takes 2 cols */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
                {activityItems.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-muted-foreground"
                    onClick={() => navigate("/pipeline")}
                  >
                    View all <ArrowRight className="ml-1 h-3 w-3" />
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {isQueryLoading ? (
                  <ActivitySkeleton />
                ) : activityItems.length === 0 ? (
                  <EmptyState
                    icon={Clock}
                    title="No activity yet"
                    description="Activity will appear here as you create deals, proposals, and invoices."
                    actionLabel="Add Deal"
                    onAction={() => navigate("/pipeline")}
                  />
                ) : (
                  <div className="space-y-2 max-h-[420px] overflow-y-auto">
                    {activityItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors cursor-pointer"
                        onClick={() => navigate(item.href)}
                      >
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                          {statusIcon(item.type, item.status)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge variant={statusColor(item.status)} className="text-[10px] capitalize">
                            {item.status}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                            {fmtRelative(item.timestamp)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column — Stacked Cards */}
          <div className="space-y-4">
            {/* Quick Actions */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button className="w-full justify-start h-9" variant="outline" size="sm" onClick={() => navigate("/pipeline")}>
                  <Plus className="mr-2 h-3.5 w-3.5" />
                  Create Deal
                </Button>
                <Button className="w-full justify-start h-9" variant="outline" size="sm" onClick={() => navigate("/proposals/new")}>
                  <Plus className="mr-2 h-3.5 w-3.5" />
                  Create Proposal
                </Button>
                <Button className="w-full justify-start h-9" variant="outline" size="sm" onClick={() => navigate("/invoices/new")}>
                  <Plus className="mr-2 h-3.5 w-3.5" />
                  Create Invoice
                </Button>
                <Button className="w-full justify-start h-9" variant="outline" size="sm" onClick={() => navigate("/clients")}>
                  <Plus className="mr-2 h-3.5 w-3.5" />
                  Add Client
                </Button>
              </CardContent>
            </Card>

            {/* Health Overview — Combined pipeline + invoice health */}
            {!isQueryLoading && hasAnyData && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Business Health</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Collection Health */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground">Collection Rate</span>
                      <span className={`text-xs font-medium ${collectionRate >= 80 ? "text-emerald-600" : collectionRate >= 50 ? "text-amber-600" : "text-red-600"}`}>
                        {collectionRate}%
                      </span>
                    </div>
                    <Progress value={collectionRate} className="h-1.5" />
                  </div>
                  {/* Pipeline Health */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground">Pipeline Weight</span>
                      <span className="text-xs font-medium text-blue-600">{pipelineHealth}%</span>
                    </div>
                    <Progress value={pipelineHealth} className="h-1.5" />
                  </div>
                  {/* Proposal Close Rate */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground">Close Rate</span>
                      <span className="text-xs font-medium text-violet-600">{proposalSignatureRate}%</span>
                    </div>
                    <Progress value={proposalSignatureRate} className="h-1.5" />
                  </div>
                  {/* Alert line */}
                  {invoiceOverdue > 0 && (
                    <div className="flex items-center gap-2 p-2 bg-red-500/10 rounded-md mt-1">
                      <AlertCircle className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
                      <span className="text-xs text-red-600 dark:text-red-400 font-medium">
                        {invoiceOverdue} overdue invoice{invoiceOverdue !== 1 ? "s" : ""}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Pipeline Breakdown */}
            {!isQueryLoading && pipelineStats?.byStage && (pipelineStats.byStage as any[]).length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Pipeline Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {(pipelineStats.byStage as any[]).map((stage: any) => (
                      <div key={stage.stageId} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: stage.color ?? "#888" }}
                          />
                          <span className="text-xs text-foreground">{stage.stageName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground">
                            {stage.dealCount}
                          </span>
                          <span className="text-xs font-medium text-foreground">
                            {fmtCompactCurrency(stage.totalValue)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Revenue Summary */}
            {!isQueryLoading && invoiceTotal > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Revenue Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-sm font-bold text-emerald-600">{fmtCompactCurrency(invoiceRevenue)}</p>
                      <p className="text-[10px] text-muted-foreground">Collected</p>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">{fmtCompactCurrency(invoiceOutstanding)}</p>
                      <p className="text-[10px] text-muted-foreground">Outstanding</p>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">{invoicePaid}</p>
                      <p className="text-[10px] text-muted-foreground">Paid</p>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">{invoiceDraft}</p>
                      <p className="text-[10px] text-muted-foreground">Draft</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Scope Definitions */}
            {!isQueryLoading && scopeCount > 0 && (
              <Card
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate("/scope")}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Scope Definitions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-foreground">{scopeCount}</p>
                    <Badge variant="outline" className="text-[10px]">Active</Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Protect against scope creep
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Seed Data button (dev only) */}
            {import.meta.env.DEV && !isQueryLoading && hasAnyData && totalClients < 3 && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs text-muted-foreground"
                onClick={handleSeed}
              >
                <Sparkles className="mr-1 h-3 w-3" />
                Load more demo data
              </Button>
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
        currentLoss={0}
        potentialSavings={0}
        highlightSavings={pricingHighlightSavings}
        vulnerabilityScore={0}
      />
    </motion.div>
  );
}
