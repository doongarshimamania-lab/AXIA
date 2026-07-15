import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { useSubscriptionTier } from "@/hooks/use-subscription-tier";
import { motion } from "framer-motion";
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
} from "lucide-react";
import { useQuery, useMutation } from "@/lib/safe-convex-react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { useNavigate } from "react-router";
import { useMemo } from "react";
import { PricingModal } from "@/components/PricingModal";
import { useState } from "react";

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
          <Button onClick={onSeed}>
            <Sparkles className="mr-2 h-4 w-4" />
            Seed Demo Data
          </Button>
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

// ═════════════════════════════════════════════════════════════════════════
// MAIN DASHBOARD COMPONENT
// ═════════════════════════════════════════════════════════════════════════
export default function Dashboard() {
  const { isLoading: authLoading } = useAuth();
  const { tier: subscriptionTier, setTier: setSubscriptionTier } = useSubscriptionTier();
  const navigate = useNavigate();

  const [showPricingModal, setShowPricingModal] = useState(false);
  const [pricingHighlightSavings] = useState<number | undefined>(undefined);

  // ─── Convex queries ─────────────────────────────────────────────────────
  const clientsEnriched = useQuery(api.clients.crud.getClientsEnriched, {});
  const pipelineStats = useQuery(api.pipeline.crud.getPipelineStats, {});
  const proposalStats = useQuery(api.proposals.crud.getProposalStats, {});
  const invoiceStats = useQuery(api.billing.crud.getInvoiceStats, {});
  const scopeDefinitions = useQuery(api.scope.crud.getScopeDefinitions, {});

  // Also fetch recent items for the activity feed
  const deals = useQuery(api.pipeline.crud.getDeals, {});
  const proposals = useQuery(api.proposals.crud.getProposals, {});
  const invoices = useQuery(api.billing.crud.getInvoices, {});

  // Seed mutation — uses autoSeed which seeds all business data (pipeline, clients, proposals, invoices)
  const seedAll = useMutation(api.autoSeed.autoSeed);

  // ─── Derived data ───────────────────────────────────────────────────────
  const isLoading =
    clientsEnriched === undefined ||
    pipelineStats === undefined ||
    proposalStats === undefined ||
    invoiceStats === undefined ||
    scopeDefinitions === undefined;

  const totalClients = clientsEnriched?.length ?? 0;
  const totalDeals = pipelineStats?.totalDeals ?? 0;
  const pipelineValue = pipelineStats?.totalValue ?? 0;
  const weightedValue = pipelineStats?.weightedValue ?? 0;
  const proposalTotal = proposalStats?.total ?? 0;
  const proposalSigned = proposalStats?.signed ?? 0;
  const proposalSignatureRate = proposalStats?.signatureRate ?? 0;
  const proposalTotalValue = proposalStats?.totalValue ?? 0;
  const invoiceTotal = invoiceStats?.total ?? 0;
  const invoicePaid = invoiceStats?.paid ?? 0;
  const invoiceOverdue = invoiceStats?.overdue ?? 0;
  const invoiceRevenue = invoiceStats?.totalRevenue ?? 0;
  const invoiceOutstanding = invoiceStats?.totalOutstanding ?? 0;
  const scopeCount = (scopeDefinitions as any[])?.length ?? 0;

  const hasAnyData = totalClients > 0 || totalDeals > 0 || proposalTotal > 0 || invoiceTotal > 0;

  // ─── Build activity feed ────────────────────────────────────────────────
  const activityItems: ActivityItem[] = useMemo(() => {
    const items: ActivityItem[] = [];

    if (deals && Array.isArray(deals)) {
      for (const d of deals.slice(0, 10)) {
        // Determine a readable "stage name" for status
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

    // Sort by most recent first, cap at 15
    items.sort((a, b) => b.timestamp - a.timestamp);
    return items.slice(0, 15);
  }, [deals, proposals, invoices]);

  // ─── Handlers ───────────────────────────────────────────────────────────
  const handleSeed = async () => {
    try {
      toast.info("Seeding demo data...", { description: "This may take a few seconds" });
      const result = await seedAll({});
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
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-[32px] font-bold text-foreground tracking-tight mb-2">
            Dashboard
          </h1>
          <p className="text-[16px] text-muted-foreground">
            Your business at a glance — clients, deals, proposals, and invoices
          </p>
        </div>

        {/* ─── Stats Cards ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {isLoading ? (
            <>
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </>
          ) : (
            <>
              {/* Total Clients */}
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/clients")}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-[14px] font-medium text-muted-foreground">Clients</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-[24px] font-bold text-foreground">{totalClients}</div>
                  <p className="text-[12px] text-muted-foreground">
                    {totalClients === 0 ? "Add your first client" : `${totalClients} client${totalClients !== 1 ? "s" : ""} in your roster`}
                  </p>
                </CardContent>
              </Card>

              {/* Active Deals */}
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/pipeline")}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-[14px] font-medium text-muted-foreground">Active Deals</CardTitle>
                  <LayoutList className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-[24px] font-bold text-foreground">{totalDeals}</div>
                  <p className="text-[12px] text-muted-foreground">
                    {totalDeals === 0 ? "No deals yet" : `Total value: ${fmtCurrency(pipelineValue)}`}
                  </p>
                </CardContent>
              </Card>

              {/* Pipeline Value */}
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/pipeline")}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-[14px] font-medium text-muted-foreground">Pipeline Value</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-[24px] font-bold text-foreground">{fmtCurrency(weightedValue)}</div>
                  <p className="text-[12px] text-muted-foreground">
                    Weighted · {fmtCurrency(pipelineValue)} total
                  </p>
                </CardContent>
              </Card>

              {/* Proposals */}
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/proposals")}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-[14px] font-medium text-muted-foreground">Proposals</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-[24px] font-bold text-foreground">{proposalTotal}</div>
                  <p className="text-[12px] text-muted-foreground">
                    {proposalTotal === 0
                      ? "Create your first proposal"
                      : `${proposalSigned} signed · ${proposalSignatureRate}% close rate`}
                  </p>
                </CardContent>
              </Card>

              {/* Invoices */}
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/invoices")}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-[14px] font-medium text-muted-foreground">Invoices</CardTitle>
                  <Receipt className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-[24px] font-bold text-foreground">{invoiceTotal}</div>
                  <p className="text-[12px] text-muted-foreground">
                    {invoiceTotal === 0
                      ? "Create your first invoice"
                      : `${invoicePaid} paid · ${invoiceOverdue > 0 ? `${invoiceOverdue} overdue` : "none overdue"}`}
                  </p>
                </CardContent>
              </Card>

              {/* Revenue & Scope */}
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/scope")}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-[14px] font-medium text-muted-foreground">
                    {invoiceOutstanding > 0 ? "Outstanding" : "Revenue"}
                  </CardTitle>
                  <Ruler className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-[24px] font-bold text-foreground">
                    {fmtCurrency(invoiceOutstanding > 0 ? invoiceOutstanding : invoiceRevenue)}
                  </div>
                  <p className="text-[12px] text-muted-foreground">
                    {invoiceOutstanding > 0
                      ? `${fmtCurrency(invoiceRevenue)} collected`
                      : `${scopeCount} scope definition${scopeCount !== 1 ? "s" : ""}`}
                  </p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* ─── Get Started / Seed Data (shown when no data exists) ───────── */}
        {!isLoading && !hasAnyData && (
          <div className="mb-6">
            <GetStartedState onSeed={handleSeed} onAddClient={() => navigate("/clients")} />
          </div>
        )}

        {/* ─── Recent Activity + Quick Actions ──────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Activity Feed — takes 2 cols */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-[16px] font-semibold">Recent Activity</CardTitle>
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
                {isLoading ? (
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
                  <div className="space-y-2 max-h-96 overflow-y-auto">
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

          {/* Quick Actions — takes 1 col */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-[16px] font-semibold">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  className="w-full justify-start"
                  variant="outline"
                  onClick={() => navigate("/pipeline")}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create Deal
                </Button>
                <Button
                  className="w-full justify-start"
                  variant="outline"
                  onClick={() => navigate("/proposals/new")}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create Proposal
                </Button>
                <Button
                  className="w-full justify-start"
                  variant="outline"
                  onClick={() => navigate("/invoices/new")}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create Invoice
                </Button>
                <Button
                  className="w-full justify-start"
                  variant="outline"
                  onClick={() => navigate("/clients")}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Client
                </Button>
                <Button
                  className="w-full justify-start"
                  variant="outline"
                  onClick={() => navigate("/scope")}
                >
                  <Ruler className="mr-2 h-4 w-4" />
                  Define Scope
                </Button>
              </CardContent>
            </Card>

            {/* Pipeline Breakdown */}
            {!isLoading && pipelineStats?.byStage && pipelineStats.byStage.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-[14px] font-semibold">Pipeline Breakdown</CardTitle>
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
                          <span className="text-sm text-foreground">{stage.stageName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {stage.dealCount} deal{stage.dealCount !== 1 ? "s" : ""}
                          </span>
                          <span className="text-xs font-medium text-foreground">
                            {fmtCurrency(stage.totalValue)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Proposal Stats Summary */}
            {!isLoading && proposalTotal > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-[14px] font-semibold">Proposal Stats</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-lg font-bold text-foreground">{proposalSigned}</p>
                      <p className="text-xs text-muted-foreground">Signed</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-foreground">{proposalSignatureRate}%</p>
                      <p className="text-xs text-muted-foreground">Close Rate</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-lg font-bold text-emerald-600">{fmtCurrency(proposalTotalValue)}</p>
                      <p className="text-xs text-muted-foreground">Signed Value</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Invoice Stats Summary */}
            {!isLoading && invoiceTotal > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-[14px] font-semibold">Invoice Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-lg font-bold text-emerald-600">{fmtCurrency(invoiceRevenue)}</p>
                      <p className="text-xs text-muted-foreground">Collected</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-foreground">{fmtCurrency(invoiceOutstanding)}</p>
                      <p className="text-xs text-muted-foreground">Outstanding</p>
                    </div>
                    {invoiceOverdue > 0 && (
                      <div className="col-span-2 bg-red-500/10 rounded-md p-2">
                        <p className="text-sm font-medium text-red-600">
                          {invoiceOverdue} invoice{invoiceOverdue !== 1 ? "s" : ""} overdue
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Scope Definitions */}
            {!isLoading && scopeCount > 0 && (
              <Card
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate("/scope")}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-[14px] font-semibold">Scope Definitions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <p className="text-lg font-bold text-foreground">{scopeCount}</p>
                    <Badge variant="outline" className="text-xs">Active</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Protect against scope creep
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Seed Data button (only if some data exists but not much) */}
            {!isLoading && hasAnyData && totalClients < 3 && (
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
