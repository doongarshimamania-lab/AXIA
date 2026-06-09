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
  Bell,
  BellRing,
  Play,
  Square,
  SkipForward,
  CheckCircle2,
  XCircle,
  Mail,
  Minus,
  Settings2,
  Info,
  RefreshCw,
  ChevronRight,
} from "lucide-react";
import { TruthLayerBadge } from "@/components/truth-layer/TruthLayerBadge";
import { calculateFinancialVerificationScore } from "@/components/truth-layer/truthLayerHelpers";
import { useAuth } from "@/hooks/use-auth";
import { useWorkspaceContext } from "@/hooks/use-workspace";
import { useWorkspacePermissions, usePermissions } from "@/hooks/use-permissions";
import { ShareDialog } from "@/components/ShareDialog";
import { BulkImportDialog } from "@/components/BulkImportDialog";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


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
  clientId?: string;
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

// ─── Mock data for demo mode (unauthenticated) ──────────────────────────────

const MOCK_INVOICES: Invoice[] = [
  {
    _id: "inv_1",
    invoiceNumber: "INV-2025-001",
    clientName: "TechCorp Solutions",
    clientEmail: "billing@techcorp.io",
    status: "paid",
    issueDate: Date.now() - 60 * 24 * 60 * 60 * 1000,
    dueDate: Date.now() - 30 * 24 * 60 * 60 * 1000,
    paidDate: Date.now() - 28 * 24 * 60 * 60 * 1000,
    lineItems: [
      { id: "li1", description: "Frontend Development - Sprint 4", quantity: 40, rate: 95, amount: 3800, hasProof: true },
      { id: "li2", description: "API Integration & Testing", quantity: 20, rate: 95, amount: 1900, hasProof: true },
    ],
    subtotal: 5700,
    taxRate: 0,
    taxAmount: 0,
    total: 5700,
    currency: "USD",
    notes: "Payment received on time. Thank you!",
    proofCount: 3,
    hasValidatedBilling: true,
    sentAt: Date.now() - 58 * 24 * 60 * 60 * 1000,
    viewedAt: Date.now() - 55 * 24 * 60 * 60 * 1000,
    createdAt: Date.now() - 62 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now() - 28 * 24 * 60 * 60 * 1000,
  },
  {
    _id: "inv_2",
    invoiceNumber: "INV-2025-002",
    clientName: "StartupHub Inc",
    clientEmail: "accounts@startuphub.com",
    status: "paid",
    issueDate: Date.now() - 90 * 24 * 60 * 60 * 1000,
    dueDate: Date.now() - 60 * 24 * 60 * 60 * 1000,
    paidDate: Date.now() - 55 * 24 * 60 * 60 * 1000,
    lineItems: [
      { id: "li3", description: "Mobile App Development - Phase 1", quantity: 80, rate: 120, amount: 9600, hasProof: true },
    ],
    subtotal: 9600,
    taxRate: 0,
    taxAmount: 0,
    total: 9600,
    currency: "USD",
    proofCount: 5,
    hasValidatedBilling: true,
    sentAt: Date.now() - 88 * 24 * 60 * 60 * 1000,
    viewedAt: Date.now() - 85 * 24 * 60 * 60 * 1000,
    createdAt: Date.now() - 92 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now() - 55 * 24 * 60 * 60 * 1000,
  },
  {
    _id: "inv_3",
    invoiceNumber: "INV-2025-003",
    clientName: "Global Enterprises",
    clientEmail: "finance@globalent.com",
    status: "overdue",
    issueDate: Date.now() - 45 * 24 * 60 * 60 * 1000,
    dueDate: Date.now() - 15 * 24 * 60 * 60 * 1000,
    lineItems: [
      { id: "li4", description: "Dashboard Analytics Module", quantity: 60, rate: 110, amount: 6600, hasProof: true },
      { id: "li5", description: "Data Visualization Components", quantity: 25, rate: 110, amount: 2750, hasProof: false },
    ],
    subtotal: 9350,
    taxRate: 0,
    taxAmount: 0,
    total: 9350,
    currency: "USD",
    notes: "Payment is 15 days overdue. Follow up required.",
    proofCount: 2,
    hasValidatedBilling: false,
    sentAt: Date.now() - 43 * 24 * 60 * 60 * 1000,
    viewedAt: Date.now() - 40 * 24 * 60 * 60 * 1000,
    createdAt: Date.now() - 47 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now() - 15 * 24 * 60 * 60 * 1000,
  },
  {
    _id: "inv_4",
    invoiceNumber: "INV-2025-004",
    clientName: "Digital Marketing Co",
    clientEmail: "pay@digimarket.co",
    status: "overdue",
    issueDate: Date.now() - 60 * 24 * 60 * 60 * 1000,
    dueDate: Date.now() - 30 * 24 * 60 * 60 * 1000,
    lineItems: [
      { id: "li6", description: "Landing Page Redesign", quantity: 35, rate: 85, amount: 2975, hasProof: false },
    ],
    subtotal: 2975,
    taxRate: 0,
    taxAmount: 0,
    total: 2975,
    currency: "USD",
    notes: "Second reminder sent.",
    proofCount: 0,
    hasValidatedBilling: false,
    sentAt: Date.now() - 58 * 24 * 60 * 60 * 1000,
    viewedAt: Date.now() - 50 * 24 * 60 * 60 * 1000,
    createdAt: Date.now() - 62 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
  },
  {
    _id: "inv_5",
    invoiceNumber: "INV-2025-005",
    clientName: "Creative Studios",
    clientEmail: "hello@creativestudios.design",
    status: "sent",
    issueDate: Date.now() - 10 * 24 * 60 * 60 * 1000,
    dueDate: Date.now() + 20 * 24 * 60 * 60 * 1000,
    lineItems: [
      { id: "li7", description: "Brand Identity System", quantity: 45, rate: 95, amount: 4275, hasProof: true },
      { id: "li8", description: "Style Guide Documentation", quantity: 15, rate: 95, amount: 1425, hasProof: true },
    ],
    subtotal: 5700,
    taxRate: 0,
    taxAmount: 0,
    total: 5700,
    currency: "USD",
    proofCount: 4,
    hasValidatedBilling: true,
    sentAt: Date.now() - 8 * 24 * 60 * 60 * 1000,
    createdAt: Date.now() - 12 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now() - 8 * 24 * 60 * 60 * 1000,
  },
  {
    _id: "inv_6",
    invoiceNumber: "INV-2025-006",
    clientName: "HealthTech Partners",
    clientEmail: "finance@healthtech.io",
    status: "viewed",
    issueDate: Date.now() - 7 * 24 * 60 * 60 * 1000,
    dueDate: Date.now() + 23 * 24 * 60 * 60 * 1000,
    lineItems: [
      { id: "li9", description: "HIPAA Compliance Module", quantity: 50, rate: 130, amount: 6500, hasProof: true },
    ],
    subtotal: 6500,
    taxRate: 0,
    taxAmount: 0,
    total: 6500,
    currency: "USD",
    proofCount: 2,
    hasValidatedBilling: true,
    sentAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
    viewedAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
    createdAt: Date.now() - 9 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
  },
  {
    _id: "inv_7",
    invoiceNumber: "INV-2025-007",
    clientName: "FinServe Analytics",
    clientEmail: "ap@finserve.com",
    status: "draft",
    issueDate: Date.now(),
    dueDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
    lineItems: [
      { id: "li10", description: "Real-time Reporting Engine", quantity: 30, rate: 140, amount: 4200, hasProof: false },
      { id: "li11", description: "Chart Library Integration", quantity: 12, rate: 140, amount: 1680, hasProof: false },
    ],
    subtotal: 5880,
    taxRate: 0,
    taxAmount: 0,
    total: 5880,
    currency: "USD",
    notes: "Pending client approval before sending.",
    proofCount: 0,
    hasValidatedBilling: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    _id: "inv_8",
    invoiceNumber: "INV-2025-008",
    clientName: "EduLearn Platform",
    clientEmail: "billing@edulearn.org",
    status: "draft",
    issueDate: Date.now() - 2 * 24 * 60 * 60 * 1000,
    dueDate: Date.now() + 28 * 24 * 60 * 60 * 1000,
    lineItems: [
      { id: "li12", description: "Course Management System - Sprint 1", quantity: 55, rate: 90, amount: 4950, hasProof: false },
    ],
    subtotal: 4950,
    taxRate: 0,
    taxAmount: 0,
    total: 4950,
    currency: "USD",
    proofCount: 0,
    hasValidatedBilling: false,
    createdAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
  },
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

// ─── Reminder Manager Content Component ────────────────────────────────

function getToneLabelForDay(day: number): string {
  if (day <= 3) return "Friendly";
  if (day <= 7) return "Firm";
  return "Urgent";
}

function ReminderManagerContent({
  invoiceId,
  intervals,
  showIntervalConfig,
  onIntervalsChange,
  onShowIntervalConfig,
  onStartReminders,
  onStopReminders,
  onSkipReminder,
  onClose,
}: {
  invoiceId: string | null;
  intervals: number[];
  showIntervalConfig: boolean;
  onIntervalsChange: (vals: number[]) => void;
  onShowIntervalConfig: (val: boolean) => void;
  onStartReminders: any;
  onStopReminders: any;
  onSkipReminder: any;
  onClose: () => void;
}) {
  const [starting, setStarting] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [skippingId, setSkippingId] = useState<string | null>(null);

  const reminders = useQuery(
    api.invoices.getReminderHistory,
    invoiceId ? { invoiceId: invoiceId as any } : "skip"
  ) as any[] | undefined;

  const scheduledReminders = useMemo(
    () => (reminders ? reminders.filter((r: any) => r.status === "scheduled") : []),
    [reminders]
  );
  const sentReminders = useMemo(
    () => (reminders ? reminders.filter((r: any) => r.status === "sent") : []),
    [reminders]
  );
  const skippedReminders = useMemo(
    () => (reminders ? reminders.filter((r: any) => r.status === "skipped") : []),
    [reminders]
  );
  const cancelledReminders = useMemo(
    () => (reminders ? reminders.filter((r: any) => r.status === "cancelled") : []),
    [reminders]
  );

  const hasScheduled = scheduledReminders.length > 0;

  const handleStart = async () => {
    setStarting(true);
    try {
      const result = await onStartReminders({
        invoiceId: invoiceId as any,
        intervals,
      });
      toast.success("Reminders started!", {
        description: `${(result as any)?.scheduledCount ?? intervals.length} reminders scheduled`,
      });
      onShowIntervalConfig(false);
    } catch (err: any) {
      toast.error("Failed to start reminders", { description: err.message });
    } finally {
      setStarting(false);
    }
  };

  const handleStop = async () => {
    setStopping(true);
    try {
      const result = await onStopReminders({ invoiceId: invoiceId as any });
      toast.success("Reminders stopped", {
        description: `${(result as any)?.cancelledCount ?? 0} reminders cancelled`,
      });
    } catch (err: any) {
      toast.error("Failed to stop reminders", { description: err.message });
    } finally {
      setStopping(false);
    }
  };

  const handleSkip = async (reminderId: string) => {
    setSkippingId(reminderId);
    try {
      await onSkipReminder({ reminderId: reminderId as any });
      toast.success("Reminder skipped");
    } catch (err: any) {
      toast.error("Failed to skip reminder", { description: err.message });
    } finally {
      setSkippingId(null);
    }
  };

  const handleAddInterval = () => {
    const last = intervals[intervals.length - 1] ?? 0;
    onIntervalsChange([...intervals, last + 7]);
  };

  const handleRemoveInterval = (idx: number) => {
    if (intervals.length <= 1) return;
    onIntervalsChange(intervals.filter((_, i) => i !== idx));
  };

  const handleChangeInterval = (idx: number, val: string) => {
    const num = parseInt(val, 10);
    if (isNaN(num) || num < 1) return;
    const next = [...intervals];
    next[idx] = num;
    next.sort((a, b) => a - b);
    onIntervalsChange(next);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "scheduled":
        return <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 bg-[#8B5CF6]/15 text-[#8B5CF6] border-[#8B5CF6]/25"><Clock className="h-2.5 w-2.5 mr-0.5" />Scheduled</Badge>;
      case "sent":
        return <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 bg-emerald-500/15 text-emerald-600 border-emerald-500/25"><CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />Sent</Badge>;
      case "skipped":
        return <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 bg-slate-500/15 text-slate-600 border-slate-500/25"><SkipForward className="h-2.5 w-2.5 mr-0.5" />Skipped</Badge>;
      case "cancelled":
        return <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 bg-slate-400/15 text-slate-500 border-slate-400/25"><XCircle className="h-2.5 w-2.5 mr-0.5" />Cancelled</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* ── Status Badge ─────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <Badge className={`text-[11px] px-2.5 py-0.5 h-6 ${hasScheduled ? "bg-[#8B5CF6]/15 text-[#8B5CF6] border-[#8B5CF6]/25" : "bg-slate-500/15 text-slate-600 border-slate-500/25"}`}>
          {hasScheduled ? <><BellRing className="h-3 w-3 mr-1" />Active</> : <><Bell className="h-3 w-3 mr-1" />Inactive</>}
        </Badge>
        <span className="text-[11px] text-muted-foreground">
          {hasScheduled ? `${scheduledReminders.length} reminder${scheduledReminders.length !== 1 ? "s" : ""} scheduled` : "No scheduled reminders"}
        </span>
      </div>

      {/* ── Control Buttons ──────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        {!hasScheduled && (
          <Button
            size="sm"
            className="h-8 px-3 gap-1.5 text-[12px] bg-[#8B5CF6] hover:bg-[#8B5CF6]/90 text-white"
            onClick={() => onShowIntervalConfig(!showIntervalConfig)}
            disabled={starting}
          >
            {starting ? <><Minus className="h-3 w-3 animate-spin" />Starting...</> : <><Play className="h-3 w-3" />Start Reminders</>}
          </Button>
        )}
        {hasScheduled && (
          <Button
            size="sm"
            variant="outline"
            className="h-8 px-3 gap-1.5 text-[12px] border-red-500/30 text-red-600 hover:bg-red-500/10"
            onClick={handleStop}
            disabled={stopping}
          >
            {stopping ? <><Minus className="h-3 w-3 animate-spin" />Stopping...</> : <><Square className="h-3 w-3" />Stop Reminders</>}
          </Button>
        )}
      </div>

      {/* ── Interval Config ──────────────────────────────────────── */}
      <AnimatePresence>
        {showIntervalConfig && !hasScheduled && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-3 rounded-lg bg-[#8B5CF6]/5 border border-[#8B5CF6]/20">
              <p className="text-[11px] font-semibold text-[#8B5CF6] mb-2">Configure Reminder Intervals (days after sending)</p>
              <div className="flex flex-wrap gap-2 mb-3">
                {intervals.map((day, idx) => (
                  <div key={idx} className="flex items-center gap-1">
                    <div className="relative">
                      <Input
                        type="number"
                        min={1}
                        value={day}
                        onChange={(e) => handleChangeInterval(idx, e.target.value)}
                        className="h-7 w-16 text-[11px] text-center pr-6"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-muted-foreground">d</span>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[8px] px-1 py-0 h-4 ${
                        day <= 3 ? "bg-amber-500/15 text-amber-600 border-amber-500/25"
                          : day <= 7 ? "bg-orange-500/15 text-orange-600 border-orange-500/25"
                            : "bg-red-500/15 text-red-600 border-red-500/25"
                      }`}
                    >
                      {getToneLabelForDay(day)}
                    </Badge>
                    {intervals.length > 1 && (
                      <button
                        onClick={() => handleRemoveInterval(idx)}
                        className="h-5 w-5 rounded-full flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={handleAddInterval}
                  className="h-7 px-2 rounded-md border border-dashed border-[#8B5CF6]/30 flex items-center gap-1 text-[10px] text-[#8B5CF6] hover:bg-[#8B5CF6]/10 transition-colors"
                >
                  <Plus className="h-3 w-3" />
                  Add
                </button>
              </div>
              <Button
                size="sm"
                className="h-7 px-3 text-[10px] bg-[#8B5CF6] hover:bg-[#8B5CF6]/90 text-white gap-1.5"
                onClick={handleStart}
                disabled={starting}
              >
                {starting ? <><Minus className="h-2.5 w-2.5 animate-spin" />Scheduling...</> : <><Play className="h-2.5 w-2.5" />Start with these intervals</>}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Summary Stats ────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-2">
        <div className="p-2 rounded-md bg-[#8B5CF6]/5 border border-[#8B5CF6]/10 text-center">
          <p className="text-[14px] font-bold text-[#8B5CF6]">{scheduledReminders.length}</p>
          <p className="text-[9px] text-muted-foreground">Scheduled</p>
        </div>
        <div className="p-2 rounded-md bg-emerald-500/5 border border-emerald-500/10 text-center">
          <p className="text-[14px] font-bold text-emerald-600">{sentReminders.length}</p>
          <p className="text-[9px] text-muted-foreground">Sent</p>
        </div>
        <div className="p-2 rounded-md bg-slate-500/5 border border-slate-500/10 text-center">
          <p className="text-[14px] font-bold text-slate-600">{skippedReminders.length}</p>
          <p className="text-[9px] text-muted-foreground">Skipped</p>
        </div>
        <div className="p-2 rounded-md bg-muted/30 border border-border/50 text-center">
          <p className="text-[14px] font-bold text-muted-foreground">{cancelledReminders.length}</p>
          <p className="text-[9px] text-muted-foreground">Cancelled</p>
        </div>
      </div>

      {/* ── Reminder Timeline ────────────────────────────────────── */}
      <div>
        <h5 className="text-[11px] font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
          <Mail className="h-3 w-3" />
          Reminder Timeline
        </h5>
        {!reminders || reminders.length === 0 ? (
          <div className="text-center py-4">
            <Bell className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
            <p className="text-[11px] text-muted-foreground">No reminders yet. Click &quot;Start Reminders&quot; to begin.</p>
          </div>
        ) : (
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {reminders
              .sort((a: any, b: any) => (a.dayNumber ?? 0) - (b.dayNumber ?? 0))
              .map((reminder: any) => (
                <div
                  key={reminder._id}
                  className="flex items-start gap-2.5 p-2 rounded-md bg-background border border-border/50"
                >
                  <div className="h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0 bg-muted/50 text-[9px] font-bold text-muted-foreground">
                    D{reminder.dayNumber}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] font-medium text-foreground">Day {reminder.dayNumber}</span>
                      {getStatusBadge(reminder.status)}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{reminder.subject}</p>
                    <p className="text-[9px] text-muted-foreground/70 mt-0.5">
                      {reminder.status === "sent" && reminder.sentAt
                        ? `Sent ${new Date(reminder.sentAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                        : reminder.status === "scheduled"
                          ? `Scheduled for ${new Date(reminder.scheduledAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                          : reminder.status === "skipped" ? "Skipped" : "Cancelled"}
                    </p>
                  </div>
                  {reminder.status === "scheduled" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-1.5 text-[9px] text-muted-foreground hover:text-orange-600 hover:bg-orange-500/10"
                      onClick={() => handleSkip(reminder._id)}
                      disabled={skippingId === reminder._id}
                    >
                      <SkipForward className="h-3 w-3 mr-0.5" />
                      {skippingId === reminder._id ? "..." : "Skip"}
                    </Button>
                  )}
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function Invoices() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

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
  const [showReminderManager, setShowReminderManager] = useState(false);
  const [reminderManagerInvoiceId, setReminderManagerInvoiceId] = useState<string | null>(null);
  const [reminderIntervals, setReminderIntervals] = useState<number[]>([3, 7, 14]);
  const [showIntervalConfig, setShowIntervalConfig] = useState(false);
  const [showRecurringSection, setShowRecurringSection] = useState(false);
  const [showSetupRecurring, setShowSetupRecurring] = useState(false);
  const [recurringClientId, setRecurringClientId] = useState<string>("");
  const [recurringTemplateInvoiceId, setRecurringTemplateInvoiceId] = useState<string>("");
  const [recurringFrequency, setRecurringFrequency] = useState<"weekly"|"monthly"|"quarterly">("monthly");
  const [settingUpRecurring, setSettingUpRecurring] = useState(false);
  const [deleteRecurringId, setDeleteRecurringId] = useState<string | null>(null);

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
  const startReminders = useMutation(api.invoices.startReminders);
  const stopReminders = useMutation(api.invoices.stopReminders);
  const skipReminderMutation = useMutation(api.billing.reminders.skipReminder);

  // ── Computed ───────────────────────────────────────────────────────────
  // ─── Determine demo mode ───────────────────────────────────────────────
  const isDemoMode = !authLoading && !isAuthenticated;

  // ── Recurring Invoices ──
  const recurringInvoices = useQuery(api.invoices.getRecurringInvoices, isDemoMode ? "skip" : {}) as any[] | undefined;
  const setupRecurringMutation = useMutation(api.invoices.setupRecurringInvoice);
  const toggleRecurringMutation = useMutation(api.invoices.toggleRecurringInvoice);
  const removeRecurringMutation = useMutation(api.invoices.removeRecurringInvoice);

  const safeInvoices = isDemoMode ? MOCK_INVOICES : (invoices ?? []);

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

  const mockStats = useMemo(() => {
    const paid = MOCK_INVOICES.filter(i => i.status === "paid");
    const sent = MOCK_INVOICES.filter(i => i.status === "sent");
    const viewed = MOCK_INVOICES.filter(i => i.status === "viewed");
    const overdue = MOCK_INVOICES.filter(i => i.status === "overdue");
    const draft = MOCK_INVOICES.filter(i => i.status === "draft");
    return {
      total: MOCK_INVOICES.length,
      paid: paid.length,
      pending: sent.length + viewed.length,
      overdue: overdue.length,
      draft: draft.length,
      totalRevenue: paid.reduce((s, i) => s + i.total, 0),
      totalOutstanding: [...sent, ...viewed, ...overdue].reduce((s, i) => s + i.total, 0),
      withProof: MOCK_INVOICES.filter(i => (i.proofCount ?? 0) > 0 || i.hasValidatedBilling).length,
    };
  }, []);

  const safeStats = isDemoMode ? mockStats : (stats ?? {
    total: 0,
    paid: 0,
    pending: 0,
    overdue: 0,
    draft: 0,
    totalRevenue: 0,
    totalOutstanding: 0,
    withProof: 0,
  });

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
    if (isDemoMode) {
      setShowSkeleton(false);
      return;
    }
    const timer = setTimeout(() => setShowSkeleton(false), 3000);
    return () => clearTimeout(timer);
  }, [isDemoMode]);

  if (!isDemoMode && invoices === undefined && showSkeleton) {
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

        {/* Demo mode banner */}
        {isDemoMode && (
          <div className="flex items-center gap-3 p-3 mb-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <Info className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <div className="text-sm text-amber-800 dark:text-amber-200">
              <span className="font-semibold">Demo Mode</span> — You're viewing sample data.{" "}
              <a href="/auth" className="underline font-medium hover:text-amber-900 dark:hover:text-amber-100">
                Sign in
              </a>{" "}
              to manage your real invoices.
            </div>
          </div>
        )}

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
              className="pl-9 h-9"
            />
          </div>
          <div className="flex items-center gap-2">
            {safeInvoices.length === 0 && (
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

        {/* ── Recurring Invoices Section ───────────────────────────────────── */}
        {!isDemoMode && (
          <Card className="mb-6">
            <div
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors rounded-t-lg"
              onClick={() => setShowRecurringSection(!showRecurringSection)}
            >
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-md bg-[#8B5CF6]/10 flex items-center justify-center">
                  <RefreshCw className="h-4 w-4 text-[#8B5CF6]" />
                </div>
                <div>
                  <h3 className="text-[14px] font-semibold text-foreground">Recurring Invoices</h3>
                  <p className="text-[11px] text-muted-foreground">
                    {recurringInvoices ? `${recurringInvoices.filter((r: any) => r.active).length} active` : "Loading..."}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {recurringInvoices && recurringInvoices.length > 0 && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 bg-[#8B5CF6]/10 text-[#8B5CF6] border-[#8B5CF6]/25">
                    {recurringInvoices.length}
                  </Badge>
                )}
                <motion.div animate={{ rotate: showRecurringSection ? 90 : 0 }} transition={{ duration: 0.2 }}>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </motion.div>
              </div>
            </div>

            <AnimatePresence>
              {showRecurringSection && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <div className="border-t border-border p-4">
                    {/* Setup Button */}
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-[12px] text-muted-foreground">
                        Automate invoice creation on a weekly, monthly, or quarterly schedule.
                      </p>
                      <Button
                        size="sm"
                        className="h-8 px-3 gap-1.5 text-[12px] bg-[#8B5CF6] hover:bg-[#8B5CF6]/90 text-white"
                        onClick={() => setShowSetupRecurring(true)}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        New Recurring
                      </Button>
                    </div>

                    {/* Recurring List */}
                    {!recurringInvoices || recurringInvoices.length === 0 ? (
                      <div className="text-center py-6">
                        <RefreshCw className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                        <p className="text-[12px] text-muted-foreground">
                          No recurring invoices yet. Create one to automate your billing.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {recurringInvoices.map((rec: any) => (
                          <div
                            key={rec._id}
                            className="flex items-center justify-between p-3 rounded-lg border border-border bg-background hover:bg-muted/20 transition-colors"
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className={`h-8 w-8 rounded-md flex items-center justify-center flex-shrink-0 ${rec.active ? "bg-[#8B5CF6]/10" : "bg-slate-500/10"}`}>
                                <RefreshCw className={`h-4 w-4 ${rec.active ? "text-[#8B5CF6]" : "text-slate-400"}`} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-[13px] font-medium text-foreground truncate">
                                    {rec.clientName}
                                  </span>
                                  <Badge
                                    variant="outline"
                                    className={`text-[9px] px-1.5 py-0 h-4 ${
                                      rec.frequency === "weekly"
                                        ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/25"
                                        : rec.frequency === "monthly"
                                        ? "bg-amber-500/15 text-amber-600 border-amber-500/25"
                                        : "bg-orange-500/15 text-orange-600 border-orange-500/25"
                                    }`}
                                  >
                                    {rec.frequency}
                                  </Badge>
                                  <Badge
                                    variant="outline"
                                    className={`text-[9px] px-1.5 py-0 h-4 ${
                                      rec.active
                                        ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/25"
                                        : "bg-slate-500/15 text-slate-500 border-slate-500/25"
                                    }`}
                                  >
                                    {rec.active ? "Active" : "Paused"}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-3 mt-0.5 text-[11px] text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    Next: {formatDate(rec.nextDueDate)}
                                  </span>
                                  <span>Template: {rec.templateInvoiceNumber}</span>
                                  {rec.templateTotal > 0 && (
                                    <span className="font-medium text-foreground">
                                      {formatCurrency(rec.templateTotal, rec.templateCurrency)}
                                    </span>
                                  )}
                                  {rec.lastGeneratedAt && (
                                    <span>Last: {formatDate(rec.lastGeneratedAt)}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 ml-3">
                              <Switch
                                checked={rec.active}
                                onCheckedChange={async (checked) => {
                                  try {
                                    await toggleRecurringMutation({
                                      recurringInvoiceId: rec._id,
                                      active: checked,
                                    });
                                    toast.success(checked ? "Recurring invoice activated" : "Recurring invoice paused");
                                  } catch (err: any) {
                                    toast.error("Failed to toggle recurring invoice", { description: err.message });
                                  }
                                }}
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-500/10"
                                onClick={() => setDeleteRecurringId(rec._id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        )}

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
                      {safeInvoices.length === 0 && (
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
                                  {(invoice.status === "sent" || invoice.status === "viewed" || invoice.status === "overdue") && (
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] px-1.5 py-0 h-5 bg-[#8B5CF6]/10 text-[#8B5CF6] border-[#8B5CF6]/25 cursor-pointer hover:bg-[#8B5CF6]/20"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setReminderManagerInvoiceId(invoice._id);
                                        setShowReminderManager(true);
                                        setShowIntervalConfig(false);
                                        setReminderIntervals([3, 7, 14]);
                                      }}
                                    >
                                      <Bell className="h-2.5 w-2.5 mr-0.5" />
                                      Reminders
                                    </Badge>
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
                                      setReminderManagerInvoiceId(invoice._id);
                                      setShowReminderManager(true);
                                      setShowIntervalConfig(false);
                                      setReminderIntervals([3, 7, 14]);
                                    }}
                                  >
                                    <Bell className="h-3.5 w-3.5 text-[#8B5CF6]" />
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
                                {(() => {
                                  const perms = usePermissions(invoice as any);
                                  return (canShareRecords || perms.canShare) ? (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 px-2"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSharingRecord({
                                          id: invoice._id,
                                          type: "invoice",
                                          sharing: (invoice as any).sharing || [],
                                        });
                                        setShareInvoiceId(invoice._id);
                                        setShowShareDialog(true);
                                      }}
                                    >
                                      <Share2 className="h-3.5 w-3.5 text-muted-foreground" />
                                    </Button>
                                  ) : null;
                                })()}
                                {(() => {
                                  const perms = usePermissions(invoice as any);
                                  return (canDeleteRecords || perms.canDelete) ? (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 px-2 text-red-600 hover:text-red-700"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDeleteConfirmId(invoice._id);
                                      }}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  ) : null;
                                })()}
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

      {/* ── Reminder Manager Dialog ──────────────────────────────────── */}
      <Dialog open={showReminderManager} onOpenChange={setShowReminderManager}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BellRing className="h-5 w-5 text-[#8B5CF6]" />
              Manage Reminders
              {reminderManagerInvoiceId && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 bg-[#8B5CF6]/10 text-[#8B5CF6] border-[#8B5CF6]/25">
                  {safeInvoices.find((inv) => inv._id === reminderManagerInvoiceId)?.invoiceNumber || ""}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          <ReminderManagerContent
            invoiceId={reminderManagerInvoiceId}
            intervals={reminderIntervals}
            showIntervalConfig={showIntervalConfig}
            onIntervalsChange={setReminderIntervals}
            onShowIntervalConfig={setShowIntervalConfig}
            onStartReminders={startReminders}
            onStopReminders={stopReminders}
            onSkipReminder={skipReminderMutation}
            onClose={() => setShowReminderManager(false)}
          />
        </DialogContent>
      </Dialog>

      {/* ── Setup Recurring Invoice Dialog ──────────────────────────── */}
      <Dialog open={showSetupRecurring} onOpenChange={setShowSetupRecurring}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-[#8B5CF6]" />
              Setup Recurring Invoice
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Client Select */}
            <div>
              <label className="text-[12px] font-medium text-foreground mb-1.5 block">Client</label>
              <Select value={recurringClientId} onValueChange={setRecurringClientId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a client..." />
                </SelectTrigger>
                <SelectContent>
                  {safeInvoices
                    .filter((inv, idx, arr) => arr.findIndex((i) => i.clientName === inv.clientName) === idx)
                    .map((inv) => (
                      <SelectItem key={inv._id + "-" + inv.clientName} value={inv.clientId || inv._id}>
                        {inv.clientName || "Unknown"}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Template Invoice Select */}
            <div>
              <label className="text-[12px] font-medium text-foreground mb-1.5 block">Template Invoice</label>
              <Select value={recurringTemplateInvoiceId} onValueChange={setRecurringTemplateInvoiceId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a template invoice..." />
                </SelectTrigger>
                <SelectContent>
                  {safeInvoices
                    .filter((inv) => recurringClientId ? (inv.clientId || inv._id) === recurringClientId : true)
                    .map((inv) => (
                      <SelectItem key={inv._id} value={inv._id}>
                        {inv.invoiceNumber} — {inv.clientName || "No client"} ({formatCurrency(inv.total, inv.currency)})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Frequency Select */}
            <div>
              <label className="text-[12px] font-medium text-foreground mb-1.5 block">Frequency</label>
              <Select value={recurringFrequency} onValueChange={(val: any) => setRecurringFrequency(val)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {recurringFrequency && (
              <div className="p-3 rounded-lg bg-[#8B5CF6]/5 border border-[#8B5CF6]/20">
                <p className="text-[11px] text-muted-foreground">
                  A new draft invoice will be created{" "}
                  <span className="font-medium text-[#8B5CF6]">
                    {recurringFrequency === "weekly" ? "every week" : recurringFrequency === "monthly" ? "every month" : "every quarter"}
                  </span>{" "}
                  based on the template invoice. The first invoice will be generated on{" "}
                  <span className="font-medium text-foreground">
                    {formatDate(Date.now() + (recurringFrequency === "weekly" ? 7 : recurringFrequency === "monthly" ? 30 : 90) * 86400000)}
                  </span>.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSetupRecurring(false)}>
              Cancel
            </Button>
            <Button
              className="bg-[#8B5CF6] hover:bg-[#8B5CF6]/90 text-white gap-1.5"
              disabled={!recurringClientId || !recurringTemplateInvoiceId || settingUpRecurring}
              onClick={async () => {
                setSettingUpRecurring(true);
                try {
                  await setupRecurringMutation({
                    clientId: recurringClientId as any,
                    templateInvoiceId: recurringTemplateInvoiceId as any,
                    frequency: recurringFrequency,
                  });
                  toast.success("Recurring invoice created!", {
                    description: `A new invoice will be generated ${recurringFrequency}`,
                  });
                  setShowSetupRecurring(false);
                  setRecurringClientId("");
                  setRecurringTemplateInvoiceId("");
                  setRecurringFrequency("monthly");
                } catch (err: any) {
                  toast.error("Failed to create recurring invoice", { description: err.message });
                } finally {
                  setSettingUpRecurring(false);
                }
              }}
            >
              {settingUpRecurring ? (
                <><Minus className="h-3.5 w-3.5 animate-spin" />Creating...</>
              ) : (
                <><RefreshCw className="h-3.5 w-3.5" />Create Recurring</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Recurring Invoice Dialog ──────────────────────────── */}
      <Dialog open={deleteRecurringId !== null} onOpenChange={(open) => { if (!open) setDeleteRecurringId(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Recurring Invoice</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this recurring invoice? No more invoices will be automatically generated for this schedule. Existing invoices will not be affected.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteRecurringId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!deleteRecurringId) return;
                try {
                  await removeRecurringMutation({ recurringInvoiceId: deleteRecurringId as any });
                  setDeleteRecurringId(null);
                  toast.success("Recurring invoice deleted");
                } catch (err: any) {
                  toast.error("Failed to delete recurring invoice", { description: err.message });
                }
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
