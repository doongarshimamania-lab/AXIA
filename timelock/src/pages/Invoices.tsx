import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@/lib/safe-convex-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useNavigate } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import PaymentReminders from "@/components/billing/PaymentReminders";
import {
  DollarSign,
  Clock,
  AlertTriangle,
  Plus,
  FileText,
  Search,
  ChevronDown,
  Send,
  Calendar,
  User,
  ShieldCheck,
  Paperclip,
  Trash2,
  Database,
  Eye,
  Share2,
  Receipt,
  ArrowUpRight,
  Hash,
} from "lucide-react";
import { TruthLayerBadge } from "@/components/truth-layer/TruthLayerBadge";
import { calculateFinancialVerificationScore } from "@/components/truth-layer/truthLayerHelpers";
import { useWorkspaceContext } from "@/hooks/use-workspace";
import { useWorkspacePermissions, usePermissions, type RecordWithSharing } from "@/hooks/use-permissions";
import { ShareDialog } from "@/components/ShareDialog";
import { BulkImportDialog } from "@/components/BulkImportDialog";


// ─── Types ──────────────────────────────────────────────────────────────────

type InvoiceStatus = "draft" | "sent" | "viewed" | "paid" | "overdue";

interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
  hasProof?: boolean;
  workLinkId?: string;
}

interface Invoice {
  _id: string;
  invoiceNumber: string;
  clientName?: string;
  clientEmail?: string;
  status: InvoiceStatus;
  issueDate: number;
  dueDate: number;
  paidDate?: number;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  taxRate?: number;
  taxAmount?: number;
  total: number;
  currency?: string;
  notes?: string;
  proofCount?: number;
  hasValidatedBilling?: boolean;
  sentAt?: number;
  viewedAt?: number;
  createdAt: number;
  updatedAt: number;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  InvoiceStatus,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive"; className: string }
> = {
  draft: {
    label: "Draft",
    variant: "secondary",
    className: "bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/25 hover:bg-slate-500/25",
  },
  sent: {
    label: "Sent",
    variant: "outline",
    className: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/25 hover:bg-amber-500/25",
  },
  viewed: {
    label: "Viewed",
    variant: "outline",
    className: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/25 hover:bg-blue-500/25",
  },
  paid: {
    label: "Paid",
    variant: "secondary",
    className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/25 hover:bg-emerald-500/25",
  },
  overdue: {
    label: "Overdue",
    variant: "destructive",
    className: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/25 hover:bg-red-500/25",
  },
};

const FILTER_TABS: { key: "all" | InvoiceStatus; label: string }[] = [
  { key: "all", label: "All" },
  { key: "draft", label: "Draft" },
  { key: "sent", label: "Sent" },
  { key: "viewed", label: "Viewed" },
  { key: "paid", label: "Paid" },
  { key: "overdue", label: "Overdue" },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatCurrency(amount: number, currency: string = "USD"): string {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function daysOverdue(dueDate: number): number {
  const now = Date.now();
  return Math.max(0, Math.floor((now - dueDate) / (1000 * 60 * 60 * 24)));
}

// ─── InvoiceActions sub-component (fixes rules-of-hooks violation) ──────────

function InvoiceActions({
  invoice,
  canShareRecords,
  canDeleteRecords,
  onShare,
  onDelete,
}: {
  invoice: Invoice;
  canShareRecords: boolean;
  canDeleteRecords: boolean;
  onShare: () => void;
  onDelete: () => void;
}) {
  const perms = usePermissions(invoice as unknown as RecordWithSharing);

  return (
    <>
      {(canShareRecords || perms.canShare) && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2"
          onClick={(e) => {
            e.stopPropagation();
            onShare();
          }}
        >
          <Share2 className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      )}
      {(canDeleteRecords || perms.canDelete) && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-red-600 hover:text-red-700"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      )}
    </>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function Invoices() {
  const navigate = useNavigate();

  // ── Workspace Context ──
  const { activeWorkspaceId, isConvexConnected } = useWorkspaceContext();
  const workspaceId = isConvexConnected ? (activeWorkspaceId as Id<"workspaces">) : undefined;

  // ── Permissions ──
  const { canDeleteRecords, canShareRecords } = useWorkspacePermissions();

  // ── Local State ────────────────────────────────────────────────────────
  const [activeFilter, setActiveFilter] = useState<"all" | InvoiceStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [shareInvoiceId, setShareInvoiceId] = useState<string | null>(null);
  const [sharingRecord, setSharingRecord] = useState<{id: string, type: string, sharing: any[]} | null>(null);
  const [showBulkImport, setShowBulkImport] = useState(false);

  // ── Convex mutations for sharing ──
  const shareRecordMutation = useMutation((api as any).permissions?.shareRecord ?? null);
  const unshareRecordMutation = useMutation((api as any).permissions?.unshareRecord ?? null);

  // ── Convex Queries ─────────────────────────────────────────────────────
  const invoices = useQuery(api.billing.crud.getInvoices, workspaceId ? { workspaceId } : {}) as Invoice[] | undefined;
  const stats = useQuery(api.billing.crud.getInvoiceStats, workspaceId ? { workspaceId } : {}) as {
    total: number;
    paid: number;
    pending: number;
    overdue: number;
    draft: number;
    totalRevenue: number;
    totalOutstanding: number;
    withProof: number;
  } | undefined;

  // ── Convex Mutations ───────────────────────────────────────────────────
  const sendInvoice = useMutation(api.billing.crud.sendInvoice);
  const markInvoicePaid = useMutation(api.billing.crud.markInvoicePaid);
  const deleteInvoice = useMutation(api.billing.crud.deleteInvoice);
  const seedMockInvoices = useMutation(api.billing.crud.seedMockInvoices);

  // ── Computed ───────────────────────────────────────────────────────────
  const safeInvoices = invoices ?? [];

  const filteredInvoices = useMemo(() => {
    return safeInvoices.filter((inv) => {
      const matchesFilter = activeFilter === "all" || inv.status === activeFilter;
      const matchesSearch =
        searchQuery === "" ||
        (inv.clientName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [safeInvoices, activeFilter, searchQuery]);

  const filterCounts = useMemo(() => {
    const counts: Record<string, number> = { all: safeInvoices.length };
    for (const status of ["draft", "sent", "viewed", "paid", "overdue"] as InvoiceStatus[]) {
      counts[status] = safeInvoices.filter((i) => i.status === status).length;
    }
    // "pending" counts sent + viewed
    counts["pending"] = (counts["sent"] || 0) + (counts["viewed"] || 0);
    return counts;
  }, [safeInvoices]);

  const safeStats = stats ?? {
    total: 0,
    paid: 0,
    pending: 0,
    overdue: 0,
    draft: 0,
    totalRevenue: 0,
    totalOutstanding: 0,
    withProof: 0,
  };

  // ── Handlers ───────────────────────────────────────────────────────────
  const handleSendInvoice = async (invoiceId: string) => {
    try {
      await sendInvoice({ invoiceId: invoiceId as any });
      toast.success("Invoice sent!", {
        description: "The invoice has been sent to the client.",
      });
    } catch (err: any) {
      toast.error("Failed to send invoice", { description: err.message });
    }
  };

  const handleMarkPaid = async (invoiceId: string) => {
    try {
      await markInvoicePaid({ invoiceId: invoiceId as any });
      toast.success("Invoice marked as paid!");
    } catch (err: any) {
      toast.error("Failed to mark invoice as paid", { description: err.message });
    }
  };

  const handleDelete = async (invoiceId: string) => {
    try {
      await deleteInvoice({ invoiceId: invoiceId as any });
      setDeleteConfirmId(null);
      toast.success("Invoice deleted");
    } catch (err: any) {
      toast.error("Failed to delete invoice", { description: err.message });
    }
  };

  const handleSeedData = async () => {
    setSeeding(true);
    try {
      const result = await seedMockInvoices({});
      if ((result as any)?.seeded) {
        toast.success("Mock data seeded!", {
          description: `${(result as any).count} invoices created`,
        });
      } else {
        toast.info("Invoices already exist", {
          description: `${(result as any)?.count || 0} invoices found`,
        });
      }
    } catch (err: any) {
      toast.error("Failed to seed data", { description: err.message });
    } finally {
      setSeeding(false);
    }
  };

  // ── Loading: Show skeleton briefly, then fall through to empty state ──
  // If invoices is undefined for too long (Convex pending/error), we still render
  // the page with safe fallbacks so the user can interact (seed data, etc.)
  const [showSkeleton, setShowSkeleton] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setShowSkeleton(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  if (invoices === undefined && showSkeleton) {
    return (
      <motion.div
        className="w-full min-h-screen bg-background text-foreground flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#8B5CF6] mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading invoices...</p>
        </div>
      </motion.div>
    );
  }

  // ─── RENDER ────────────────────────────────────────────────────────────
  return (
    <motion.div
      className="flex-1 min-h-screen bg-background text-foreground transition-colors"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="container mx-auto px-4 py-6">
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="mb-6">
          <h1
            className="text-[32px] font-bold text-foreground tracking-tight mb-2"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Invoices
          </h1>
          <p className="text-[16px] text-muted-foreground">
            Create, manage, and track your invoices with validated billing
          </p>
        </div>

        {/* ── Stats Cards ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.05 }}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-[13px] font-medium text-muted-foreground">Total</CardTitle>
                <div className="h-7 w-7 rounded-md bg-[#8B5CF6]/10 flex items-center justify-center">
                  <Receipt className="h-3.5 w-3.5 text-[#8B5CF6]" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-[22px] font-bold text-foreground">{safeStats.total}</div>
                <p className="text-[11px] text-muted-foreground">Invoices</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-[13px] font-medium text-muted-foreground">Revenue</CardTitle>
                <div className="h-7 w-7 rounded-md bg-emerald-500/10 flex items-center justify-center">
                  <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-[22px] font-bold text-foreground">
                  {formatCurrency(safeStats.totalRevenue)}
                </div>
                <p className="text-[11px] text-muted-foreground flex items-center gap-0.5">
                  <ArrowUpRight className="h-3 w-3 text-emerald-500" />
                  <span className="text-emerald-600">{safeStats.paid} paid</span>
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15 }}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-[13px] font-medium text-muted-foreground">Outstanding</CardTitle>
                <div className="h-7 w-7 rounded-md bg-amber-500/10 flex items-center justify-center">
                  <Clock className="h-3.5 w-3.5 text-amber-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-[22px] font-bold text-foreground">
                  {formatCurrency(safeStats.totalOutstanding)}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  <span className="text-amber-600">{safeStats.pending} pending</span>
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-[13px] font-medium text-muted-foreground">Overdue</CardTitle>
                <div className="h-7 w-7 rounded-md bg-red-500/10 flex items-center justify-center">
                  <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-[22px] font-bold text-[#DC2626]">{safeStats.overdue}</div>
                <p className="text-[11px] text-red-600">Overdue invoices</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.25 }}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-[13px] font-medium text-muted-foreground">With Proof</CardTitle>
                <div className="h-7 w-7 rounded-md bg-[#22c55e]/10 flex items-center justify-center">
                  <ShieldCheck className="h-3.5 w-3.5 text-[#22c55e]" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-[22px] font-bold text-[#22c55e]">{safeStats.withProof}</div>
                <p className="text-[11px] text-muted-foreground">Validated billing</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.3 }}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-[13px] font-medium text-muted-foreground">Draft</CardTitle>
                <div className="h-7 w-7 rounded-md bg-slate-500/10 flex items-center justify-center">
                  <FileText className="h-3.5 w-3.5 text-slate-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-[22px] font-bold text-foreground">{safeStats.draft}</div>
                <p className="text-[11px] text-muted-foreground">Awaiting send</p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* ── Payment Reminders (only when overdue) ──────────────────────── */}
        {safeStats.overdue > 0 && (
          <PaymentReminders overdueCount={safeStats.overdue} />
        )}

        {/* ── Action Bar ─────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search invoices..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            {import.meta.env.DEV && safeInvoices.length === 0 && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={handleSeedData}
                disabled={seeding}
              >
                <Database className="h-4 w-4" />
                {seeding ? "Seeding..." : "Seed Demo Data"}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setShowBulkImport(true)}
            >
              <Database className="h-4 w-4" />
              Bulk Import
            </Button>
            <Button
              className="bg-[#8B5CF6] hover:bg-[#8B5CF6]/90 text-primary-foreground gap-2"
              onClick={() => navigate("/invoices/new")}
            >
              <Plus className="h-4 w-4" />
              Create Invoice
            </Button>
          </div>
        </div>

        {/* ── Filter Tabs ────────────────────────────────────────────────── */}
        <div className="flex gap-1 mb-6 border-b border-border overflow-x-auto">
          {FILTER_TABS.map((tab) => {
            const isActive = activeFilter === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveFilter(tab.key)}
                className={`pb-2 text-sm rounded-t-md px-3 transition-colors relative whitespace-nowrap ${
                  isActive
                    ? "font-semibold text-foreground bg-[#8B5CF6]/10 ring-1 ring-[#8B5CF6]/30"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full ${
                    isActive
                      ? "bg-[#8B5CF6]/20 text-[#8B5CF6]"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {filterCounts[tab.key] ?? 0}
                </span>
                <div
                  className={`absolute bottom-0 left-0 right-0 h-[2px] ${
                    isActive ? "bg-[#8B5CF6]" : "bg-transparent"
                  }`}
                />
              </button>
            );
          })}
        </div>

        {/* ── Invoice List ───────────────────────────────────────────────── */}
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {filteredInvoices.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Card>
                  <CardContent className="py-12">
                    <div className="text-center text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-4 opacity-40" />
                      <p className="text-[16px] font-medium mb-1">No invoices found</p>
                      <p className="text-[14px]">
                        {searchQuery
                          ? "Try adjusting your search terms"
                          : safeInvoices.length === 0
                          ? "Create your first invoice or seed demo data to get started"
                          : "No invoices match this filter"}
                      </p>
                      {import.meta.env.DEV && safeInvoices.length === 0 && (
                        <Button
                          className="mt-4 bg-[#8B5CF6] hover:bg-[#8B5CF6]/90 text-white gap-2"
                          onClick={handleSeedData}
                          disabled={seeding}
                        >
                          <Database className="h-4 w-4" />
                          {seeding ? "Seeding..." : "Seed Demo Data"}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              filteredInvoices.map((invoice, idx) => {
                const isExpanded = expandedInvoiceId === invoice._id;
                const config = STATUS_CONFIG[invoice.status] || STATUS_CONFIG.draft;
                const overdueDays =
                  invoice.status === "overdue" ? daysOverdue(invoice.dueDate) : 0;
                const hasProofs = (invoice.proofCount ?? 0) > 0 || invoice.hasValidatedBilling;

                return (
                  <motion.div
                    key={invoice._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.25, delay: idx * 0.03 }}
                    layout
                  >
                    <Card className={`overflow-hidden hover:shadow-md transition-shadow ${hasProofs ? "border-[#22c55e]/20" : ""}`}>
                      {/* ── Invoice Row ──────────────────────────────────────── */}
                      <div
                        className="cursor-pointer"
                        onClick={() => setExpandedInvoiceId(isExpanded ? null : invoice._id)}
                      >
                        <CardContent className="p-4 sm:p-5">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            {/* Left section */}
                            <div className="flex items-start gap-3 min-w-0 flex-1">
                              <div
                                className={`h-9 w-9 rounded-md flex items-center justify-center flex-shrink-0 ${
                                  invoice.status === "paid"
                                    ? "bg-emerald-500/10"
                                    : invoice.status === "sent" || invoice.status === "viewed"
                                    ? "bg-amber-500/10"
                                    : invoice.status === "overdue"
                                    ? "bg-red-500/10"
                                    : "bg-slate-500/10"
                                }`}
                              >
                                <Receipt
                                  className={`h-4 w-4 ${
                                    invoice.status === "paid"
                                      ? "text-emerald-600"
                                      : invoice.status === "sent" || invoice.status === "viewed"
                                      ? "text-amber-600"
                                      : invoice.status === "overdue"
                                      ? "text-red-600"
                                      : "text-slate-500"
                                  }`}
                                />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-semibold text-[14px] text-foreground">
                                    {invoice.invoiceNumber}
                                  </span>
                                  <Badge
                                    variant={config.variant}
                                    className={`text-[11px] px-2 py-0 h-5 ${config.className}`}
                                  >
                                    {config.label}
                                  </Badge>
                                  {hasProofs && (
                                    <Badge className="bg-[#22c55e]/15 text-[#22c55e] border-[#22c55e]/25 text-[11px] px-2 py-0 h-5">
                                      <ShieldCheck className="h-3 w-3 mr-0.5" />
                                      Validated
                                    </Badge>
                                  )}
                                  <TruthLayerBadge
                                    score={calculateFinancialVerificationScore([invoice]).score}
                                    size="sm"
                                    showScore={true}
                                    details={[
                                      { label: `Proofs: ${invoice.proofCount ?? 0} attached`, verified: (invoice.proofCount ?? 0) > 0 },
                                      { label: "Validated billing", verified: !!invoice.hasValidatedBilling },
                                      { label: `Line items: ${invoice.lineItems?.length ?? 0}`, verified: (invoice.lineItems?.filter((li: any) => li.hasProof).length ?? 0) > 0 },
                                    ]}
                                  />
                                  {invoice.status === "overdue" && overdueDays > 0 && (
                                    <span className="text-[11px] text-red-600 font-medium">
                                      {overdueDays}d overdue
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 mt-1 text-[13px] text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <User className="h-3 w-3" />
                                    {invoice.clientName || "No client"}
                                  </span>
                                  {(invoice.proofCount ?? 0) > 0 && (
                                    <span className="flex items-center gap-1 text-[#22c55e]">
                                      <Paperclip className="h-3 w-3" />
                                      {invoice.proofCount} proof{(invoice.proofCount ?? 0) !== 1 ? "s" : ""}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Right section */}
                            <div className="flex items-center gap-4 sm:gap-6">
                              <div className="text-right hidden sm:block">
                                <p className="text-[11px] text-muted-foreground">Issued</p>
                                <p className="text-[13px] text-foreground">
                                  {formatDate(invoice.issueDate)}
                                </p>
                              </div>
                              <div className="text-right hidden sm:block">
                                <p className="text-[11px] text-muted-foreground">Due</p>
                                <p className={`text-[13px] ${invoice.status === "overdue" ? "text-red-500 font-medium" : "text-foreground"}`}>
                                  {formatDate(invoice.dueDate)}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-[18px] font-bold text-foreground">
                                  {formatCurrency(invoice.total, invoice.currency)}
                                </p>
                              </div>
                              <div className="flex items-center gap-1">
                                {invoice.status === "draft" && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 px-2"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleSendInvoice(invoice._id);
                                    }}
                                  >
                                    <Send className="h-3.5 w-3.5 text-[#8B5CF6]" />
                                  </Button>
                                )}
                                {(invoice.status === "sent" || invoice.status === "viewed" || invoice.status === "overdue") && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 px-2"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleMarkPaid(invoice._id);
                                    }}
                                  >
                                    <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 px-2"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/invoices/new?edit=${invoice._id}`);
                                  }}
                                >
                                  <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                                </Button>
                                <InvoiceActions
                                  invoice={invoice}
                                  canShareRecords={canShareRecords}
                                  canDeleteRecords={canDeleteRecords}
                                  onShare={() => {
                                    setSharingRecord({
                                      id: invoice._id,
                                      type: "invoice",
                                      sharing: (invoice as any).sharing || [],
                                    });
                                    setShareInvoiceId(invoice._id);
                                    setShowShareDialog(true);
                                  }}
                                  onDelete={() => {
                                    setDeleteConfirmId(invoice._id);
                                  }}
                                />
                                <motion.div
                                  animate={{ rotate: isExpanded ? 180 : 0 }}
                                  transition={{ duration: 0.2 }}
                                >
                                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                </motion.div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </div>

                      {/* ── Expanded Detail ──────────────────────────────────── */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            className="overflow-hidden"
                          >
                            <div className="border-t border-border">
                              <div className="p-5 bg-muted/30">
                                {/* Line Items */}
                                <div className="mb-4">
                                  <h4 className="text-[13px] font-semibold text-foreground mb-3">
                                    Line Items
                                  </h4>
                                  <div className="rounded-lg border border-border overflow-hidden bg-background">
                                    <table className="w-full text-[13px]">
                                      <thead>
                                        <tr className="border-b border-border bg-muted/50">
                                          <th className="text-left py-2.5 px-3 font-medium text-muted-foreground">
                                            Description
                                          </th>
                                          <th className="text-right py-2.5 px-3 font-medium text-muted-foreground">
                                            Qty
                                          </th>
                                          <th className="text-right py-2.5 px-3 font-medium text-muted-foreground">
                                            Rate
                                          </th>
                                          <th className="text-right py-2.5 px-3 font-medium text-muted-foreground">
                                            Amount
                                          </th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {invoice.lineItems.map((item, i) => (
                                          <tr
                                            key={item.id || i}
                                            className={
                                              i < invoice.lineItems.length - 1
                                                ? "border-b border-border"
                                                : ""
                                            }
                                          >
                                            <td className="py-2.5 px-3 text-foreground">
                                              <div className="flex items-center gap-2">
                                                {item.description}
                                                {item.hasProof && (
                                                  <Badge className="bg-[#22c55e]/15 text-[#22c55e] border-[#22c55e]/25 text-[10px] h-4 px-1.5">
                                                    <Paperclip className="h-2.5 w-2.5 mr-0.5" />
                                                    Proof
                                                  </Badge>
                                                )}
                                              </div>
                                            </td>
                                            <td className="py-2.5 px-3 text-right text-muted-foreground">
                                              {item.quantity}
                                            </td>
                                            <td className="py-2.5 px-3 text-right text-muted-foreground">
                                              {formatCurrency(item.rate, invoice.currency)}
                                            </td>
                                            <td className="py-2.5 px-3 text-right font-medium text-foreground">
                                              {formatCurrency(item.amount, invoice.currency)}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                      <tfoot>
                                        {invoice.taxRate != null && invoice.taxRate > 0 && (
                                          <tr className="border-t border-border bg-muted/20">
                                            <td colSpan={3} className="py-2 px-3 text-right text-muted-foreground text-[12px]">
                                              Subtotal
                                            </td>
                                            <td className="py-2 px-3 text-right text-foreground text-[12px]">
                                              {formatCurrency(invoice.subtotal, invoice.currency)}
                                            </td>
                                          </tr>
                                        )}
                                        {invoice.taxRate != null && invoice.taxRate > 0 && (
                                          <tr className="border-b border-border bg-muted/20">
                                            <td colSpan={3} className="py-2 px-3 text-right text-muted-foreground text-[12px]">
                                              Tax ({invoice.taxRate}%)
                                            </td>
                                            <td className="py-2 px-3 text-right text-foreground text-[12px]">
                                              {formatCurrency(invoice.taxAmount ?? 0, invoice.currency)}
                                            </td>
                                          </tr>
                                        )}
                                        <tr className="border-t border-border bg-muted/30">
                                          <td
                                            colSpan={3}
                                            className="py-2.5 px-3 text-right font-semibold text-foreground"
                                          >
                                            Total
                                          </td>
                                          <td className="py-2.5 px-3 text-right font-bold text-foreground">
                                            {formatCurrency(invoice.total, invoice.currency)}
                                          </td>
                                        </tr>
                                      </tfoot>
                                    </table>
                                  </div>
                                </div>

                                {/* Details Grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                                  <div className="flex items-center gap-2">
                                    <Hash className="h-4 w-4 text-muted-foreground" />
                                    <div>
                                      <p className="text-[11px] text-muted-foreground">Invoice #</p>
                                      <p className="text-[13px] font-medium text-foreground">
                                        {invoice.invoiceNumber}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                    <div>
                                      <p className="text-[11px] text-muted-foreground">
                                        {invoice.status === "paid" ? "Paid on" : "Due date"}
                                      </p>
                                      <p className={`text-[13px] font-medium ${invoice.status === "overdue" ? "text-red-500" : "text-foreground"}`}>
                                        {invoice.status === "paid" && invoice.paidDate
                                          ? formatDate(invoice.paidDate)
                                          : formatDate(invoice.dueDate)}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <User className="h-4 w-4 text-muted-foreground" />
                                    <div>
                                      <p className="text-[11px] text-muted-foreground">Client</p>
                                      <p className="text-[13px] font-medium text-foreground">
                                        {invoice.clientName || "—"}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                                    <div>
                                      <p className="text-[11px] text-muted-foreground">Validation</p>
                                      <p className="text-[13px] font-medium">
                                        {hasProofs ? (
                                          <span className="text-[#22c55e]">
                                            {invoice.proofCount} proof{(invoice.proofCount ?? 0) !== 1 ? "s" : ""} attached
                                          </span>
                                        ) : (
                                          <span className="text-muted-foreground">No proofs</span>
                                        )}
                                      </p>
                                    </div>
                                  </div>
                                </div>

                                {/* Notes */}
                                {invoice.notes && (
                                  <div className="mb-4 p-3 rounded-lg bg-background border border-border">
                                    <p className="text-[11px] font-medium text-muted-foreground mb-1">
                                      Notes
                                    </p>
                                    <p className="text-[13px] text-foreground">
                                      {invoice.notes}
                                    </p>
                                  </div>
                                )}

                                {/* Actions */}
                                <div className="flex items-center gap-2">
                                  {invoice.status === "draft" && (
                                    <Button
                                      size="sm"
                                      className="bg-[#8B5CF6] hover:bg-[#8B5CF6]/90 text-white gap-1.5"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSendInvoice(invoice._id);
                                      }}
                                    >
                                      <Send className="h-3.5 w-3.5" />
                                      Send Invoice
                                    </Button>
                                  )}
                                  {(invoice.status === "sent" || invoice.status === "viewed" || invoice.status === "overdue") && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="gap-1.5 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleMarkPaid(invoice._id);
                                      }}
                                    >
                                      <DollarSign className="h-3.5 w-3.5" />
                                      Mark as Paid
                                    </Button>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="gap-1.5"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(`/invoices/new?edit=${invoice._id}`);
                                    }}
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                    Edit Invoice
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="gap-1.5 text-muted-foreground hover:text-red-500"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDeleteConfirmId(invoice._id);
                                    }}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    Delete
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </Card>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Delete Confirmation Dialog ──────────────────────────────────── */}
      <Dialog open={deleteConfirmId !== null} onOpenChange={(open) => { if (!open) setDeleteConfirmId(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Invoice</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this invoice? This action cannot be undone and will also remove all linked work proofs.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      <ShareDialog
        open={showShareDialog}
        onOpenChange={setShowShareDialog}
        recordId={sharingRecord?.id || shareInvoiceId || ""}
        recordType={sharingRecord?.type || "invoice"}
        currentSharing={sharingRecord?.sharing || []}
        onShare={async (args) => {
          try {
            if (shareRecordMutation) {
              await shareRecordMutation({
                recordId: sharingRecord?.id || shareInvoiceId,
                recordType: sharingRecord?.type || "invoice",
                ...args,
              });
            }
            toast.success("Record shared successfully");
          } catch (err: any) {
            toast.error(err?.message || "Failed to share record");
          }
        }}
        onUnshare={async (args) => {
          try {
            if (unshareRecordMutation) {
              await unshareRecordMutation({
                recordId: sharingRecord?.id || shareInvoiceId,
                recordType: sharingRecord?.type || "invoice",
                ...args,
              });
            }
            toast.success("Access removed");
          } catch (err: any) {
            toast.error(err?.message || "Failed to remove access");
          }
        }}
      />

      {/* Bulk Import Dialog */}
      <BulkImportDialog
        open={showBulkImport}
        onOpenChange={setShowBulkImport}
        tableName="invoices"
        onImportComplete={() => {
          toast.success("Import complete");
        }}
      />
    </motion.div>
  );
}
