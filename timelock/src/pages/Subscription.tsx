import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import jsPDF from "jspdf";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Check,
  X,
  Zap,
  Shield,
  Crown,
  Rocket,
  ChevronDown,
  ChevronUp,
  FileText,
  CreditCard,
  BarChart3,
  HardDrive,
  Users,
  Brain,
  Globe,
  Star,
  MessageSquare,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Download,
  HelpCircle,
  Sparkles,
  Lock,
} from "lucide-react";
import { useSubscriptionTier } from "@/hooks/use-subscription-tier";
import { useQuery, useConvexAuth, useQueryTimeout, useConvexConnectionState } from "@/lib/safe-convex-react";
import { api } from "@/convex/_generated/api";
import { PageLayout } from "@/components/design-system/PageLayout";

// ─── Tier Definitions ────────────────────────────────────────────────────────

type TierKey = "free" | "starter" | "pro" | "expert";

interface TierInfo {
  key: TierKey;
  name: string;
  price: number;
  description: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
  badge?: string;
  highlighted?: boolean;
}

const TIERS: TierInfo[] = [
  {
    key: "free",
    name: "Free",
    price: 0,
    description: "Basic protection for getting started",
    icon: <Shield className="h-5 w-5" />,
    color: "text-muted-foreground",
    bgColor: "bg-muted/50",
    borderColor: "border-border",
  },
  {
    key: "starter",
    name: "Starter",
    price: 9,
    description: "Enhanced compliance & evidence tools",
    icon: <Rocket className="h-5 w-5" />,
    color: "text-sky-600 dark:text-sky-400",
    bgColor: "bg-sky-50 dark:bg-sky-950/30",
    borderColor: "border-sky-200 dark:border-sky-800",
  },
  {
    key: "pro",
    name: "Pro",
    price: 29,
    description: "Full AI-powered dispute protection",
    icon: <Zap className="h-5 w-5" />,
    color: "text-primary",
    bgColor: "bg-primary/5",
    borderColor: "border-primary",
    badge: "Most Popular",
    highlighted: true,
  },
  {
    key: "expert",
    name: "Expert",
    price: 79,
    description: "Enterprise-grade team protection",
    icon: <Crown className="h-5 w-5" />,
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-50 dark:bg-amber-950/30",
    borderColor: "border-amber-200 dark:border-amber-800",
  },
];

// ─── Feature Definitions ─────────────────────────────────────────────────────

interface Feature {
  name: string;
  free: boolean | string;
  starter: boolean | string;
  pro: boolean | string;
  expert: boolean | string;
  category?: string;
}

const FEATURES: Feature[] = [
  {
    name: "Dispute Reports / Month",
    free: "1",
    starter: "5",
    pro: "Unlimited",
    expert: "Unlimited",
    category: "Core",
  },
  {
    name: "Compliance Monitoring",
    free: "Basic",
    starter: "Enhanced",
    pro: "Advanced",
    expert: "Advanced",
    category: "Core",
  },
  {
    name: "Platform Connections",
    free: "1",
    starter: "2",
    pro: "5",
    expert: "Unlimited",
    category: "Core",
  },
  {
    name: "Evidence Export",
    free: false,
    starter: true,
    pro: true,
    expert: true,
    category: "Core",
  },
  {
    name: "AI Dispute Prediction",
    free: false,
    starter: false,
    pro: true,
    expert: true,
    category: "AI & Intelligence",
  },
  {
    name: "Cross-Platform Verification",
    free: false,
    starter: false,
    pro: true,
    expert: true,
    category: "AI & Intelligence",
  },
  {
    name: "WCVM Verification Badge",
    free: false,
    starter: false,
    pro: true,
    expert: true,
    category: "AI & Intelligence",
  },
  {
    name: "Priority Support",
    free: false,
    starter: false,
    pro: true,
    expert: true,
    category: "Support",
  },
  {
    name: "Team Features",
    free: false,
    starter: false,
    pro: false,
    expert: true,
    category: "Expert",
  },
  {
    name: "Custom Policy Analyzer",
    free: false,
    starter: false,
    pro: false,
    expert: true,
    category: "Expert",
  },
  {
    name: "Premium Network Access",
    free: false,
    starter: false,
    pro: false,
    expert: true,
    category: "Expert",
  },
  {
    name: "Dedicated Account Manager",
    free: false,
    starter: false,
    pro: false,
    expert: true,
    category: "Expert",
  },
];

// ─── FAQ Data ────────────────────────────────────────────────────────────────

interface FAQItem {
  question: string;
  answer: string;
}

const FAQ_DATA: FAQItem[] = [
  {
    question: "Can I switch plans at any time?",
    answer:
      "Yes! You can upgrade or downgrade your plan at any time. When upgrading, you'll get immediate access to new features and be charged a prorated amount for the remainder of your billing cycle. When downgrading, the change takes effect at the end of your current billing period.",
  },
  {
    question: "What happens to my data if I downgrade?",
    answer:
      "Your data is always safe. If you downgrade, your existing evidence and reports remain accessible. However, features exclusive to higher tiers will become read-only, and you won't be able to create new items that exceed your new plan's limits (e.g., dispute reports beyond your monthly quota).",
  },
  {
    question: "Is there a free trial for paid plans?",
    answer:
      "Yes! Both Starter and Pro plans come with a 14-day free trial. You won't be charged until the trial ends, and you can cancel anytime before that with no obligation. The Expert plan includes a 30-day money-back guarantee.",
  },
  {
    question: "How does the AI Dispute Prediction work?",
    answer:
      "Our AI analyzes your work patterns, compliance data, platform metrics, and historical dispute outcomes to predict potential disputes before they happen. It provides actionable recommendations to strengthen your protection score and avoid common pitfalls. Available on Pro and Expert plans.",
  },
  {
    question: "What is WCVM Verification?",
    answer:
      "WCVM (Work Context Verification Model) is our proprietary technology that verifies work context relevance by analyzing browser activity, application usage, and work patterns. It generates a cryptographic verification signature that can be used as evidence in disputes. Available on Pro and Expert plans.",
  },
  {
    question: "Can I get a refund?",
    answer:
      "We offer a 30-day money-back guarantee on all paid plans. If you're not satisfied within the first 30 days, contact our support team for a full refund. After 30 days, refunds are handled on a case-by-case basis.",
  },
  {
    question: "Do you offer discounts for annual billing?",
    answer:
      "Yes! Annual billing saves you 20% compared to monthly billing. That means Starter for $7.20/mo, Pro for $23.20/mo, and Expert for $63.20/mo when billed annually. Contact our sales team for team or enterprise discounts.",
  },
];

// ─── Invoice / Billing Types ─────────────────────────────────────────────────

/** Shape returned by api.billing.crud.getInvoices */
interface ConvexInvoice {
  _id: string;
  _creationTime: number;
  userId: string;
  invoiceNumber: string;
  publicToken: string;
  status: "draft" | "sent" | "viewed" | "paid" | "partial" | "overdue" | "cancelled";
  issueDate: number;
  dueDate: number;
  paidDate?: number;
  clientName?: string;
  clientEmail?: string;
  lineItems: Array<{
    id: string;
    description: string;
    quantity: number;
    rate: number;
    amount: number;
    hasProof?: boolean;
  }>;
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

/** Shape used in the billing history table – maps from ConvexInvoice */
interface BillingRecord {
  id: string;
  date: string;            // ISO date string
  description: string;
  amount: number;
  status: ConvexInvoice["status"];
  invoice: ConvexInvoice;  // keep full invoice for receipt download
}

function invoiceToBillingRecord(inv: ConvexInvoice): BillingRecord {
  // Build description from line items or default to client name
  const firstItem = inv.lineItems?.[0];
  const desc = firstItem
    ? inv.lineItems.length > 1
      ? `${firstItem.description} + ${inv.lineItems.length - 1} more`
      : firstItem.description
    : inv.clientName
    ? `Invoice for ${inv.clientName}`
    : "Invoice";

  return {
    id: inv.invoiceNumber,
    date: new Date(inv.issueDate).toISOString(),
    description: desc,
    amount: inv.total,
    status: inv.status,
    invoice: inv,
  };
}

// ─── Usage Stats ─────────────────────────────────────────────────────────────

interface UsageStat {
  label: string;
  used: number;
  limit: number | null; // null = unlimited
  unit: string;
  icon: React.ReactNode;
}

function getUsageForTier(tier: TierKey, invoiceStats?: { total: number; paid: number; pending: number; overdue: number } | null): UsageStat[] {
  const limits: Record<TierKey, { reports: number; platforms: number; evidence: number }> = {
    free: { reports: 1, platforms: 1, evidence: 50 },
    starter: { reports: 5, platforms: 2, evidence: 500 },
    pro: { reports: -1, platforms: 5, evidence: -1 }, // -1 = unlimited
    expert: { reports: -1, platforms: -1, evidence: -1 },
  };
  const usage = limits[tier];

  // Use real invoice stats for reports usage if available
  const reportsUsed = invoiceStats ? invoiceStats.total : (tier === "free" ? 1 : tier === "starter" ? 3 : tier === "pro" ? 12 : 27);
  const platformsUsed = tier === "free" ? 1 : tier === "starter" ? 2 : tier === "pro" ? 3 : 5;
  const evidenceUsed = tier === "free" ? 38 : tier === "starter" ? 245 : tier === "pro" ? 1240 : 3890;

  return [
    {
      label: "Dispute Reports",
      used: reportsUsed,
      limit: usage.reports === -1 ? null : usage.reports,
      unit: "this month",
      icon: <FileText className="h-4 w-4" />,
    },
    {
      label: "Platforms Connected",
      used: platformsUsed,
      limit: usage.platforms === -1 ? null : usage.platforms,
      unit: "active",
      icon: <Globe className="h-4 w-4" />,
    },
    {
      label: "Evidence Stored",
      used: evidenceUsed,
      limit: usage.evidence === -1 ? null : usage.evidence,
      unit: "items",
      icon: <HardDrive className="h-4 w-4" />,
    },
  ];
}

// ─── Sub-Components ──────────────────────────────────────────────────────────

function FeatureCell({ value }: { value: boolean | string }) {
  if (typeof value === "string") {
    return (
      <span className="text-sm font-medium text-foreground">{value}</span>
    );
  }
  return value ? (
    <Check className="h-4 w-4 text-emerald-500 mx-auto" />
  ) : (
    <X className="h-4 w-4 text-muted-foreground/40 mx-auto" />
  );
}

function downloadReceipt(record: BillingRecord) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const margin = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(26, 26, 46);
  doc.text("Receipt", margin, 25);

  // Invoice ID
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(record.id, margin, 32);

  // Separator
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, 37, pageWidth - margin, 37);

  let y = 46;
  const addRow = (label: string, value: string) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.text(label, margin, y);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text(value, margin + 50, y);
    y += 10;
  };

  addRow("Description", record.description);
  addRow("Date", new Date(record.date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }));

  // Map invoice status to a display-friendly label
  const statusLabel = record.status.charAt(0).toUpperCase() + record.status.slice(1);
  addRow("Status", statusLabel);

  const currency = record.invoice?.currency || "USD";
  addRow("Amount", `${currency} $${record.amount.toFixed(2)}`);

  // Add client info if available
  if (record.invoice?.clientName) {
    addRow("Client", record.invoice.clientName);
  }

  // Footer
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(203, 213, 225);
  doc.text(`Generated by Axia \u2022 ${new Date().toLocaleString()}`, margin, pageHeight - 12);

  doc.save(`${record.id}.pdf`);
  toast.success("Receipt downloaded");
}

function InvoiceStatusBadge({ status }: { status: ConvexInvoice["status"] }) {
  const config: Record<string, { label: string; className: string }> = {
    paid: { label: "Paid", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" },
    sent: { label: "Sent", className: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400" },
    viewed: { label: "Viewed", className: "bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400" },
    pending: { label: "Pending", className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-400" },
    draft: { label: "Draft", className: "bg-muted text-muted-foreground" },
    partial: { label: "Partial", className: "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400" },
    overdue: { label: "Overdue", className: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400" },
    cancelled: { label: "Cancelled", className: "bg-muted text-muted-foreground" },
    failed: { label: "Failed", className: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400" },
    refunded: { label: "Refunded", className: "bg-muted text-muted-foreground" },
  };
  const c = config[status] ?? config.draft;
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${c.className}`}>
      {c.label}
    </span>
  );
}

function UsageBar({ used, limit }: { used: number; limit: number | null }) {
  if (limit === null) {
    return (
      <div className="w-full h-2 rounded-full bg-emerald-100 dark:bg-emerald-950/40 overflow-hidden">
        <div className="h-full rounded-full bg-emerald-500 animate-pulse" style={{ width: "30%" }} />
      </div>
    );
  }
  const pct = Math.min((used / limit) * 100, 100);
  const isHigh = pct >= 80;
  const isFull = pct >= 100;
  return (
    <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${
          isFull ? "bg-destructive" : isHigh ? "bg-amber-500" : "bg-emerald-500"
        }`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function FAQAccordion({ items }: { items: FAQItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  return (
    <div className="space-y-2">
      {items.map((item, idx) => {
        const isOpen = openIndex === idx;
        return (
          <motion.div
            key={idx}
            className="border border-border rounded-lg overflow-hidden"
            initial={false}
            animate={{ borderColor: isOpen ? "hsl(var(--primary))" : undefined }}
          >
            <button
              className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
              onClick={() => setOpenIndex(isOpen ? null : idx)}
            >
              <span className="text-sm font-medium text-foreground pr-4">{item.question}</span>
              {isOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              )}
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 text-sm text-muted-foreground leading-relaxed">
                    {item.answer}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}

// ─── Confirm Dialog ──────────────────────────────────────────────────────────

function ChangePlanDialog({
  isOpen,
  onClose,
  onConfirm,
  fromTier,
  toTier,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  fromTier: TierKey;
  toTier: TierKey;
}) {
  const isUpgrade =
    TIERS.findIndex((t) => t.key === toTier) > TIERS.findIndex((t) => t.key === fromTier);
  const target = TIERS.find((t) => t.key === toTier)!;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isUpgrade ? (
              <ArrowUpRight className="h-5 w-5 text-emerald-500" />
            ) : (
              <ArrowDownRight className="h-5 w-5 text-amber-500" />
            )}
            {isUpgrade ? "Upgrade" : "Downgrade"} to {target.name}
          </DialogTitle>
          <DialogDescription>
            {isUpgrade
              ? `You're upgrading from ${fromTier.charAt(0).toUpperCase() + fromTier.slice(1)} to ${target.name} at $${target.price}/mo. You'll get immediate access to all ${target.name} features.`
              : `You're downgrading from ${fromTier.charAt(0).toUpperCase() + fromTier.slice(1)} to ${target.name}. The change takes effect at the end of your billing period.`}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            className={
              isUpgrade
                ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                : "bg-amber-600 hover:bg-amber-700 text-white"
            }
          >
            {isUpgrade ? "Upgrade Now" : "Confirm Downgrade"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function Subscription() {
  const { tier, setTier, isLoading: isTierLoading } = useSubscriptionTier();
  const { isAuthenticated } = useConvexAuth();
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">("monthly");
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    target: TierKey;
  }>({ open: false, target: "free" });

  // ── Real data from Convex ────────────────────────────────────────────────
  const rawInvoices = useQuery(
    isAuthenticated ? api.billing.crud.getInvoices : "skip",
    {}
  );

  const invoiceStats = useQuery(
    isAuthenticated ? api.billing.crud.getInvoiceStats : "skip",
    {}
  );

  // Build billing records from Convex invoices
  const billingHistory: BillingRecord[] = (() => {
    if (!rawInvoices || !Array.isArray(rawInvoices)) return [];
    return (rawInvoices as ConvexInvoice[]).map(invoiceToBillingRecord);
  })();

  const currentTierInfo = TIERS.find((t) => t.key === tier) ?? TIERS[0];
  const usageStats = getUsageForTier(tier as TierKey, invoiceStats ?? null);

  const handlePlanChange = (targetTier: TierKey) => {
    if (targetTier === tier) return;
    setConfirmDialog({ open: true, target: targetTier });
  };

  const confirmPlanChange = () => {
    const target = confirmDialog.target;
    const isUpgrade =
      TIERS.findIndex((t) => t.key === target) > TIERS.findIndex((t) => t.key === tier);

    setTier(target);
    setConfirmDialog({ open: false, target: "free" });

    toast.success(
      isUpgrade
        ? `Welcome to ${target.charAt(0).toUpperCase() + target.slice(1)}!`
        : `Plan changed to ${target.charAt(0).toUpperCase() + target.slice(1)}`,
      {
        description: isUpgrade
          ? "You now have access to all new features."
          : "Your plan will update at the end of the billing period.",
      }
    );
  };

  const getPrice = (tierInfo: TierInfo) => {
    if (tierInfo.price === 0) return "$0";
    const price = billingPeriod === "annual" ? +(tierInfo.price * 0.8).toFixed(2) : tierInfo.price;
    return `$${price}`;
  };

  // ── Loading state ────────────────────────────────────────────────────────
  const { isDisconnected } = useConvexConnectionState();
  const tierTimedOut = useQueryTimeout(isTierLoading, 3000);
  const showTierLoading = isTierLoading && !tierTimedOut && !isDisconnected;

  if (showTierLoading) {
    return (
      <div className="w-full min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // ── Determine if Convex data is still loading ────────────────────────────
  const isInvoicesLoading = isAuthenticated && rawInvoices === undefined;
  const invoicesTimedOut = useQueryTimeout(isInvoicesLoading, 3000);
  const showInvoicesLoading = isInvoicesLoading && !invoicesTimedOut && !isDisconnected;

  return (
    <motion.div
      className="w-full min-h-screen bg-background text-foreground"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <PageLayout maxWidth="max-w-6xl">
        {/* ── Header ─────────────────────────────────────────── */}
        <div className="mb-8">
          <h1 className="text-[32px] font-bold text-foreground tracking-tight mb-2">
            Subscription
          </h1>
          <p className="text-[16px] text-muted-foreground">
            Manage your Axia plan, view usage, and access billing history
          </p>
        </div>

        {/* ── Current Plan Card ──────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <Card className="mb-8 border-2" style={{ borderColor: currentTierInfo.highlighted ? "hsl(var(--primary))" : undefined }}>
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={`h-14 w-14 rounded-xl flex items-center justify-center ${currentTierInfo.bgColor} ${currentTierInfo.color}`}>
                    {currentTierInfo.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="text-xl font-bold text-foreground">
                        {currentTierInfo.name} Plan
                      </h2>
                      {currentTierInfo.badge && (
                        <Badge className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0">
                          {currentTierInfo.badge}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {currentTierInfo.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-2xl font-bold text-foreground font-[Space_Grotesk]">
                      {getPrice(currentTierInfo)}
                      {currentTierInfo.price > 0 && (
                        <span className="text-sm font-normal text-muted-foreground">/mo</span>
                      )}
                    </div>
                    {billingPeriod === "annual" && currentTierInfo.price > 0 && (
                      <div className="text-xs text-emerald-600 dark:text-emerald-400">
                        Billed annually (save 20%)
                      </div>
                    )}
                  </div>
                  {tier !== "expert" && (
                    <Button
                      className="bg-primary hover:bg-primary/90 text-primary-foreground"
                      onClick={() => {
                        const nextTier =
                          tier === "free"
                            ? "starter"
                            : tier === "starter"
                            ? "pro"
                            : "expert";
                        handlePlanChange(nextTier);
                      }}
                    >
                      <ArrowUpRight className="mr-1 h-4 w-4" />
                      Upgrade
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ── Invoice Stats (from Convex) ─────────────────────── */}
        {isAuthenticated && invoiceStats && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.07 }}
            className="mb-8"
          >
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-foreground font-[Space_Grotesk]">
                    {invoiceStats.totalRevenue > 0 ? `$${invoiceStats.totalRevenue.toLocaleString()}` : "$0"}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Revenue</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-[Space_Grotesk]">
                    {invoiceStats.paid ?? 0}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Paid</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 font-[Space_Grotesk]">
                    {invoiceStats.pending ?? 0}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Pending</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400 font-[Space_Grotesk]">
                    {invoiceStats.overdue ?? 0}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Overdue</p>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        )}

        {/* ── Usage Stats ────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <h2 className="text-lg font-semibold text-foreground mb-4">Current Usage</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {usageStats.map((stat) => (
              <Card key={stat.label}>
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="text-muted-foreground">{stat.icon}</div>
                    <span className="text-sm font-medium text-muted-foreground">{stat.label}</span>
                  </div>
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-2xl font-bold text-foreground">{stat.used}</span>
                    {stat.limit !== null ? (
                      <span className="text-sm text-muted-foreground">/ {stat.limit}</span>
                    ) : (
                      <span className="text-sm text-emerald-600 dark:text-emerald-400">Unlimited</span>
                    )}
                  </div>
                  <UsageBar used={stat.used} limit={stat.limit} />
                  <p className="text-xs text-muted-foreground mt-1.5">{stat.unit}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>

        {/* ── Pricing Cards ──────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Choose Your Plan</h2>
            <div className="flex items-center gap-1 border border-border rounded-lg p-0.5">
              <button
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  billingPeriod === "monthly"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setBillingPeriod("monthly")}
              >
                Monthly
              </button>
              <button
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  billingPeriod === "annual"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setBillingPeriod("annual")}
              >
                Annual
                <span className="ml-1 text-[10px] text-emerald-500">-20%</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {TIERS.map((t, idx) => {
              const isCurrent = t.key === tier;
              return (
                <motion.div
                  key={t.key}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + idx * 0.05 }}
                >
                  <Card
                    className={`relative flex flex-col h-full transition-shadow ${
                      t.highlighted
                        ? "border-2 border-primary shadow-lg shadow-primary/10"
                        : "border border-border"
                    } ${isCurrent ? "ring-2 ring-primary/30" : ""}`}
                  >
                    {t.badge && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <Badge className="bg-primary text-primary-foreground text-[10px] px-2 py-0.5 shadow-sm">
                          {t.badge}
                        </Badge>
                      </div>
                    )}

                    <CardHeader className="pb-3 pt-5">
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${t.bgColor} ${t.color}`}>
                          {t.icon}
                        </div>
                        <CardTitle className="text-base font-bold">{t.name}</CardTitle>
                      </div>
                      <CardDescription className="text-xs">{t.description}</CardDescription>
                    </CardHeader>

                    <CardContent className="flex-1 pb-2">
                      <div className="mb-4">
                        <span className="text-3xl font-bold text-foreground font-[Space_Grotesk]">
                          {getPrice(t)}
                        </span>
                        {t.price > 0 && (
                          <span className="text-sm text-muted-foreground">/mo</span>
                        )}
                        {billingPeriod === "annual" && t.price > 0 && (
                          <div className="text-[11px] text-muted-foreground line-through">
                            ${t.price}/mo
                          </div>
                        )}
                      </div>

                      <Separator className="mb-3" />

                      <ul className="space-y-2">
                        {FEATURES.filter(
                          (f) =>
                            (t.key === "free") ||
                            (t.key === "starter" && (f.starter === true || typeof f.starter === "string")) ||
                            (t.key === "pro" && (f.pro === true || typeof f.pro === "string")) ||
                            (t.key === "expert" && (f.expert === true || typeof f.expert === "string"))
                        ).map((f) => {
                          const val =
                            t.key === "free"
                              ? f.free
                              : t.key === "starter"
                              ? f.starter
                              : t.key === "pro"
                              ? f.pro
                              : f.expert;
                          return (
                            <li key={f.name} className="flex items-start gap-2">
                              {typeof val === "boolean" && val ? (
                                <Check className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                              ) : typeof val === "string" ? (
                                <Check className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                              ) : (
                                <X className="h-3.5 w-3.5 text-muted-foreground/40 flex-shrink-0 mt-0.5" />
                              )}
                              <span className="text-xs text-foreground leading-tight">
                                {f.name}
                                {typeof val === "string" && (
                                  <span className="ml-1 font-medium text-foreground">
                                    — {val}
                                  </span>
                                )}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </CardContent>

                    <CardFooter className="pt-2 pb-4">
                      {isCurrent ? (
                        <Button
                          variant="outline"
                          className="w-full"
                          disabled
                        >
                          Current Plan
                        </Button>
                      ) : (
                        <Button
                          className={`w-full ${
                            t.highlighted
                              ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                              : ""
                          }`}
                          variant={t.highlighted ? "default" : "outline"}
                          onClick={() => handlePlanChange(t.key)}
                        >
                          {TIERS.findIndex((ti) => ti.key === t.key) >
                          TIERS.findIndex((ti) => ti.key === tier)
                            ? "Upgrade"
                            : "Downgrade"}
                        </Button>
                      )}
                    </CardFooter>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* ── Feature Comparison Table ────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mb-8"
        >
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Feature Comparison
          </h2>
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-xs font-medium text-muted-foreground p-3 w-[40%]">
                      Feature
                    </th>
                    {TIERS.map((t) => (
                      <th
                        key={t.key}
                        className={`text-center text-xs font-medium p-3 ${
                          t.key === tier ? "text-primary" : "text-muted-foreground"
                        }`}
                      >
                        <div className="flex flex-col items-center gap-0.5">
                          <span>{t.name}</span>
                          <span className="text-[10px] font-normal">
                            {t.price === 0 ? "Free" : `$${t.price}/mo`}
                          </span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    let lastCategory = "";
                    return FEATURES.map((f, idx) => {
                      const showCategory = f.category && f.category !== lastCategory;
                      lastCategory = f.category ?? "";
                      return (
                        <tr key={idx} className="border-b border-border last:border-b-0">
                          <td className="p-3">
                            {showCategory && (
                              <div className="text-[10px] font-semibold uppercase tracking-wider text-primary mb-1">
                                {f.category}
                              </div>
                            )}
                            <span className="text-sm text-foreground">{f.name}</span>
                          </td>
                          {(["free", "starter", "pro", "expert"] as TierKey[]).map((tierKey) => (
                            <td
                              key={tierKey}
                              className={`p-3 text-center ${
                                tierKey === tier ? "bg-primary/5" : ""
                              }`}
                            >
                              <FeatureCell
                                value={
                                  f[tierKey as keyof Pick<Feature, "free" | "starter" | "pro" | "expert">]
                                }
                              />
                            </td>
                          ))}
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </motion.div>

        {/* ── Billing History ─────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Billing History</h2>
            {isAuthenticated && tier !== "free" && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <CreditCard className="h-3.5 w-3.5" />
                <span>{billingHistory.length} invoice{billingHistory.length !== 1 ? "s" : ""}</span>
              </div>
            )}
          </div>
          <Card>
            <CardContent className="p-0">
              {/* Not authenticated → demo mode */}
              {!isAuthenticated ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Lock className="h-10 w-10 mb-3 opacity-40" />
                  <p className="text-sm">Sign in to view your billing history</p>
                  <p className="text-xs mt-1">Your invoices will appear here once you're logged in</p>
                </div>
              ) : showInvoicesLoading ? (
                /* Loading skeleton for billing table */
                <div className="p-4 space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                      <div className="flex items-center gap-4">
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-5 w-16 rounded-md" />
                        <Skeleton className="h-7 w-7 rounded-md" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : tier === "free" && billingHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <CreditCard className="h-10 w-10 mb-3 opacity-40" />
                  <p className="text-sm">No billing history on the Free plan</p>
                  <p className="text-xs mt-1">Upgrade to a paid plan to see invoices here</p>
                </div>
              ) : billingHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <FileText className="h-10 w-10 mb-3 opacity-40" />
                  <p className="text-sm">No invoices yet</p>
                  <p className="text-xs mt-1">Create invoices to see them here</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[500px]">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left text-xs font-medium text-muted-foreground p-3">
                          Invoice
                        </th>
                        <th className="text-left text-xs font-medium text-muted-foreground p-3">
                          Date
                        </th>
                        <th className="text-left text-xs font-medium text-muted-foreground p-3">
                          Description
                        </th>
                        <th className="text-right text-xs font-medium text-muted-foreground p-3">
                          Amount
                        </th>
                        <th className="text-center text-xs font-medium text-muted-foreground p-3">
                          Status
                        </th>
                        <th className="text-center text-xs font-medium text-muted-foreground p-3">
                          Receipt
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {billingHistory.map((record) => (
                        <tr
                          key={record.id}
                          className="border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors"
                        >
                          <td className="p-3 text-sm font-medium text-foreground">
                            {record.id}
                          </td>
                          <td className="p-3 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(record.date).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })}
                            </div>
                          </td>
                          <td className="p-3 text-sm text-foreground max-w-[200px] truncate">
                            {record.description}
                          </td>
                          <td className="p-3 text-sm font-medium text-foreground text-right">
                            ${(record.amount ?? 0).toFixed(2)}
                          </td>
                          <td className="p-3 text-center">
                            <InvoiceStatusBadge status={record.status} />
                          </td>
                          <td className="p-3 text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => downloadReceipt(record)}
                              title="Download receipt PDF"
                            >
                              <Download className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* ── FAQ ─────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="mb-8"
        >
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Frequently Asked Questions
          </h2>
          <FAQAccordion items={FAQ_DATA} />
        </motion.div>

        {/* ── Upgrade CTA (for free/starter) ──────────────────── */}
        {(tier === "free" || tier === "starter") && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-8"
          >
            <Card className="border-2 border-dashed border-primary/30 bg-primary/5">
              <CardContent className="p-6 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-foreground mb-1">
                    Unlock Full Protection
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Upgrade to Pro for AI-powered dispute prediction, cross-platform verification, and unlimited reports.
                  </p>
                </div>
                <Button
                  className="bg-primary hover:bg-primary/90 text-primary-foreground flex-shrink-0"
                  onClick={() => handlePlanChange("pro")}
                >
                  <ArrowUpRight className="mr-1 h-4 w-4" />
                  Upgrade to Pro
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </PageLayout>

      {/* ── Change Plan Dialog ────────────────────────────────── */}
      <ChangePlanDialog
        isOpen={confirmDialog.open}
        onClose={() => setConfirmDialog({ open: false, target: "free" })}
        onConfirm={confirmPlanChange}
        fromTier={tier as TierKey}
        toTier={confirmDialog.target}
      />
    </motion.div>
  );
}
