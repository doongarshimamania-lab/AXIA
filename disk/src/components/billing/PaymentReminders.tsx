"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@/lib/safe-convex-react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Bell,
  BellRing,
  Clock,
  AlertTriangle,
  Send,
  ChevronDown,
  ChevronUp,
  Mail,
  CheckCircle2,
  XCircle,
  SkipForward,
  FileText,
  User,
  Settings2,
  Zap,
  ShieldAlert,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface ReminderRecord {
  _id: string;
  invoiceId: string;
  dayNumber: number;
  channel: "email" | "sms" | "whatsapp";
  tone: "friendly" | "firm" | "urgent";
  subject: string;
  body: string;
  status: "scheduled" | "sent" | "skipped" | "cancelled";
  scheduledAt: number;
  sentAt?: number;
  createdAt: number;
}

interface OverdueInvoice {
  _id: string;
  invoiceNumber: string;
  clientName?: string;
  clientEmail?: string;
  status: string;
  issueDate: number;
  dueDate: number;
  total: number;
  currency?: string;
  daysPastDue: number;
  reminders: ReminderRecord[];
  lastReminderSent: ReminderRecord | null;
  nextScheduledReminder: ReminderRecord | null;
}

interface ReminderSettings {
  autoRemindersEnabled: boolean;
  day3Enabled?: boolean;
  day7Enabled?: boolean;
  day14Enabled?: boolean;
  day21Enabled?: boolean;
  defaultChannel?: "email" | "sms" | "whatsapp";
}

// ─── Mock Data ──────────────────────────────────────────────────────────────

const mockNow = Date.now();
const mockDay = 86400000;

const MOCK_OVERDUE_INVOICES: OverdueInvoice[] = [
  {
    _id: "mock_inv_1",
    invoiceNumber: "INV-003",
    clientName: "GlobalMedia",
    clientEmail: "accounts@globalmedia.com",
    status: "overdue",
    issueDate: mockNow - 45 * mockDay,
    dueDate: mockNow - 15 * mockDay,
    total: 14300,
    currency: "USD",
    daysPastDue: 15,
    reminders: [
      {
        _id: "rem_1",
        invoiceId: "mock_inv_1",
        dayNumber: 3,
        channel: "email",
        tone: "friendly",
        subject: "Just a friendly reminder — Invoice INV-003",
        body: "Hi GlobalMedia,\n\nJust a friendly reminder that invoice INV-003 for $14,300.00 is past due.",
        status: "sent",
        scheduledAt: mockNow - 12 * mockDay,
        sentAt: mockNow - 12 * mockDay,
        createdAt: mockNow - 12 * mockDay,
      },
      {
        _id: "rem_2",
        invoiceId: "mock_inv_1",
        dayNumber: 7,
        channel: "email",
        tone: "firm",
        subject: "Payment reminder — Invoice INV-003 is now past due",
        body: "Hi GlobalMedia,\n\nYour invoice INV-003 for $14,300.00 is now past due.",
        status: "sent",
        scheduledAt: mockNow - 8 * mockDay,
        sentAt: mockNow - 8 * mockDay,
        createdAt: mockNow - 8 * mockDay,
      },
      {
        _id: "rem_3",
        invoiceId: "mock_inv_1",
        dayNumber: 14,
        channel: "email",
        tone: "urgent",
        subject: "URGENT: Final notice — Invoice INV-003 is significantly overdue",
        body: "Hi GlobalMedia,\n\nThis is a final notice. Invoice INV-003 for $14,300.00 is significantly overdue.",
        status: "scheduled",
        scheduledAt: mockNow - 1 * mockDay,
        createdAt: mockNow - 1 * mockDay,
      },
    ],
    lastReminderSent: {
      _id: "rem_2",
      invoiceId: "mock_inv_1",
      dayNumber: 7,
      channel: "email",
      tone: "firm",
      subject: "Payment reminder — Invoice INV-003 is now past due",
      body: "Hi GlobalMedia,\n\nYour invoice INV-003 for $14,300.00 is now past due.",
      status: "sent",
      scheduledAt: mockNow - 8 * mockDay,
      sentAt: mockNow - 8 * mockDay,
      createdAt: mockNow - 8 * mockDay,
    },
    nextScheduledReminder: {
      _id: "rem_3",
      invoiceId: "mock_inv_1",
      dayNumber: 14,
      channel: "email",
      tone: "urgent",
      subject: "URGENT: Final notice — Invoice INV-003 is significantly overdue",
      body: "Hi GlobalMedia,\n\nThis is a final notice. Invoice INV-003 for $14,300.00 is significantly overdue.",
      status: "scheduled",
      scheduledAt: mockNow - 1 * mockDay,
      createdAt: mockNow - 1 * mockDay,
    },
  },
  {
    _id: "mock_inv_2",
    invoiceNumber: "INV-005",
    clientName: "NovaTech Labs",
    clientEmail: "billing@novatech.io",
    status: "overdue",
    issueDate: mockNow - 60 * mockDay,
    dueDate: mockNow - 30 * mockDay,
    total: 8750,
    currency: "USD",
    daysPastDue: 30,
    reminders: [
      {
        _id: "rem_4",
        invoiceId: "mock_inv_2",
        dayNumber: 3,
        channel: "email",
        tone: "friendly",
        subject: "Just a friendly reminder — Invoice INV-005",
        body: "Hi NovaTech Labs,\n\nJust a friendly reminder that invoice INV-005 for $8,750.00 is past due.",
        status: "sent",
        scheduledAt: mockNow - 27 * mockDay,
        sentAt: mockNow - 27 * mockDay,
        createdAt: mockNow - 27 * mockDay,
      },
      {
        _id: "rem_5",
        invoiceId: "mock_inv_2",
        dayNumber: 7,
        channel: "email",
        tone: "firm",
        subject: "Payment reminder — Invoice INV-005 is now past due",
        body: "Hi NovaTech Labs,\n\nYour invoice INV-005 for $8,750.00 is now past due.",
        status: "sent",
        scheduledAt: mockNow - 23 * mockDay,
        sentAt: mockNow - 23 * mockDay,
        createdAt: mockNow - 23 * mockDay,
      },
      {
        _id: "rem_6",
        invoiceId: "mock_inv_2",
        dayNumber: 14,
        channel: "email",
        tone: "urgent",
        subject: "URGENT: Final notice — Invoice INV-005 is significantly overdue",
        body: "Hi NovaTech Labs,\n\nThis is a final notice. Invoice INV-005 for $8,750.00 is significantly overdue.",
        status: "sent",
        scheduledAt: mockNow - 16 * mockDay,
        sentAt: mockNow - 16 * mockDay,
        createdAt: mockNow - 16 * mockDay,
      },
    ],
    lastReminderSent: {
      _id: "rem_6",
      invoiceId: "mock_inv_2",
      dayNumber: 14,
      channel: "email",
      tone: "urgent",
      subject: "URGENT: Final notice — Invoice INV-005 is significantly overdue",
      body: "Hi NovaTech Labs,\n\nThis is a final notice. Invoice INV-005 for $8,750.00 is significantly overdue.",
      status: "sent",
      scheduledAt: mockNow - 16 * mockDay,
      sentAt: mockNow - 16 * mockDay,
      createdAt: mockNow - 16 * mockDay,
    },
    nextScheduledReminder: null,
  },
  {
    _id: "mock_inv_3",
    invoiceNumber: "INV-007",
    clientName: "StarterCo",
    clientEmail: "pay@starterco.com",
    status: "overdue",
    issueDate: mockNow - 17 * mockDay,
    dueDate: mockNow - 3 * mockDay,
    total: 2200,
    currency: "USD",
    daysPastDue: 3,
    reminders: [],
    lastReminderSent: null,
    nextScheduledReminder: null,
  },
];

const MOCK_SETTINGS: ReminderSettings = {
  autoRemindersEnabled: true,
  day3Enabled: true,
  day7Enabled: true,
  day14Enabled: true,
  day21Enabled: false,
  defaultChannel: "email",
};

// ─── Reminder Templates ─────────────────────────────────────────────────────

const REMINDER_TEMPLATES = [
  {
    day: 3,
    tone: "friendly" as const,
    label: "Friendly Nudge",
    description: "Just a friendly reminder...",
    icon: Bell,
    color: "text-amber-600",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/25",
  },
  {
    day: 7,
    tone: "firm" as const,
    label: "Follow-Up",
    description: "Your invoice is now 7 days past due...",
    icon: BellRing,
    color: "text-orange-600",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/25",
  },
  {
    day: 14,
    tone: "urgent" as const,
    label: "Final Notice",
    description: "This is a final notice...",
    icon: AlertTriangle,
    color: "text-red-600",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/25",
  },
  {
    day: 21,
    tone: "urgent" as const,
    label: "Escalation",
    description: "Payment significantly overdue...",
    icon: ShieldAlert,
    color: "text-red-800",
    bgColor: "bg-red-800/10",
    borderColor: "border-red-800/25",
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

function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function getToneConfig(tone: "friendly" | "firm" | "urgent") {
  switch (tone) {
    case "friendly":
      return {
        label: "Friendly",
        color: "text-amber-600",
        bgColor: "bg-amber-500/10",
        badgeClass: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/25",
      };
    case "firm":
      return {
        label: "Firm",
        color: "text-orange-600",
        bgColor: "bg-orange-500/10",
        badgeClass: "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/25",
      };
    case "urgent":
      return {
        label: "Urgent",
        color: "text-red-600",
        bgColor: "bg-red-500/10",
        badgeClass: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/25",
      };
  }
}

function getStatusConfig(status: string) {
  switch (status) {
    case "sent":
      return {
        label: "Sent",
        icon: CheckCircle2,
        color: "text-emerald-600",
        badgeClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/25",
      };
    case "scheduled":
      return {
        label: "Scheduled",
        icon: Clock,
        color: "text-[#8B5CF6]",
        badgeClass: "bg-[#8B5CF6]/15 text-[#8B5CF6] border-[#8B5CF6]/25",
      };
    case "skipped":
      return {
        label: "Skipped",
        icon: SkipForward,
        color: "text-slate-500",
        badgeClass: "bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/25",
      };
    case "cancelled":
      return {
        label: "Cancelled",
        icon: XCircle,
        color: "text-slate-400",
        badgeClass: "bg-slate-400/15 text-slate-500 border-slate-400/25",
      };
    default:
      return {
        label: status,
        icon: Clock,
        color: "text-muted-foreground",
        badgeClass: "",
      };
  }
}

// ─── Component ──────────────────────────────────────────────────────────────

interface PaymentRemindersProps {
  overdueCount: number;
}

export default function PaymentReminders({ overdueCount }: PaymentRemindersProps) {
  // ── State ────────────────────────────────────────────────────────────────
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [sendingReminderId, setSendingReminderId] = useState<string | null>(null);

  // ── Convex Queries ───────────────────────────────────────────────────────
  const overdueInvoices = useQuery(api.billing.reminders.getOverdueInvoices, {}) as
    | OverdueInvoice[]
    | undefined;
  const reminderSettings = useQuery(api.billing.reminders.getReminderSettings, {}) as
    | ReminderSettings
    | null
    | undefined;

  // ── Convex Mutations ─────────────────────────────────────────────────────
  const sendReminder = useMutation(api.billing.reminders.sendReminder);
  const scheduleAutoReminders = useMutation(api.billing.reminders.scheduleAutoReminders);
  const updateReminderSettings = useMutation(api.billing.reminders.updateReminderSettings);

  // ── Fallback to Mock Data ────────────────────────────────────────────────
  const safeOverdueInvoices = useMemo(() => {
    if (overdueInvoices && overdueInvoices.length > 0) return overdueInvoices;
    if (overdueInvoices === undefined && overdueCount > 0) return MOCK_OVERDUE_INVOICES;
    if (overdueCount > 0) return MOCK_OVERDUE_INVOICES;
    return [];
  }, [overdueInvoices, overdueCount]);

  const safeSettings: ReminderSettings = useMemo(() => {
    if (reminderSettings) return reminderSettings;
    return MOCK_SETTINGS;
  }, [reminderSettings]);

  // ── Don't render if no overdue invoices ──────────────────────────────────
  if (safeOverdueInvoices.length === 0) return null;

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleSendReminder = async (invoiceId: string) => {
    setSendingReminderId(invoiceId);
    try {
      await sendReminder({ invoiceId: invoiceId as any });
      toast.success("Reminder sent!", {
        description: "The payment reminder has been sent to the client.",
      });
    } catch (err: any) {
      toast.error("Failed to send reminder", { description: err.message });
    } finally {
      setSendingReminderId(null);
    }
  };

  const handleScheduleAutoReminders = async () => {
    try {
      const result = await scheduleAutoReminders({});
      toast.success("Auto-reminders processed", {
        description: `${(result as any)?.scheduled ?? 0} reminders scheduled`,
      });
    } catch (err: any) {
      toast.error("Failed to schedule reminders", { description: err.message });
    }
  };

  const handleToggleAutoReminders = async (enabled: boolean) => {
    try {
      await updateReminderSettings({ autoRemindersEnabled: enabled });
      toast.success(enabled ? "Auto-reminders enabled" : "Auto-reminders disabled");
    } catch (err: any) {
      toast.error("Failed to update settings", { description: err.message });
    }
  };

  // ── Computed ─────────────────────────────────────────────────────────────
  const totalOverdueAmount = safeOverdueInvoices.reduce((sum, inv) => sum + inv.total, 0);
  const totalRemindersSent = safeOverdueInvoices.reduce(
    (sum, inv) => sum + inv.reminders.filter((r) => r.status === "sent").length,
    0
  );
  const totalScheduledReminders = safeOverdueInvoices.reduce(
    (sum, inv) => sum + inv.reminders.filter((r) => r.status === "scheduled").length,
    0
  );

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.35 }}
    >
      <Card className="border-red-500/20 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                <BellRing className="h-4 w-4 text-red-600" />
              </div>
              <div>
                <CardTitle className="text-[16px] font-semibold text-foreground">
                  Payment Reminders
                </CardTitle>
                <p className="text-[12px] text-muted-foreground">
                  {safeOverdueInvoices.length} overdue invoice{safeOverdueInvoices.length !== 1 ? "s" : ""} ·{" "}
                  {formatCurrency(totalOverdueAmount)} outstanding
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-[12px] text-muted-foreground">Auto-reminders</span>
                <Switch
                  checked={safeSettings.autoRemindersEnabled}
                  onCheckedChange={handleToggleAutoReminders}
                  className="data-[state=checked]:bg-[#8B5CF6]"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 h-8 text-[12px] border-[#8B5CF6]/30 text-[#8B5CF6] hover:bg-[#8B5CF6]/10"
                onClick={handleScheduleAutoReminders}
              >
                <Zap className="h-3.5 w-3.5" />
                Process Now
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {/* ── Summary Stats ──────────────────────────────────────────────── */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/10">
              <p className="text-[11px] text-muted-foreground">Overdue</p>
              <p className="text-[18px] font-bold text-red-600">{safeOverdueInvoices.length}</p>
              <p className="text-[10px] text-red-500">invoices</p>
            </div>
            <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
              <p className="text-[11px] text-muted-foreground">Reminders Sent</p>
              <p className="text-[18px] font-bold text-emerald-600">{totalRemindersSent}</p>
              <p className="text-[10px] text-emerald-500">delivered</p>
            </div>
            <div className="p-3 rounded-lg bg-[#8B5CF6]/5 border border-[#8B5CF6]/10">
              <p className="text-[11px] text-muted-foreground">Scheduled</p>
              <p className="text-[18px] font-bold text-[#8B5CF6]">{totalScheduledReminders}</p>
              <p className="text-[10px] text-[#8B5CF6]">pending</p>
            </div>
          </div>

          {/* ── Reminder Templates Preview ─────────────────────────────────── */}
          <div className="mb-4">
            <button
              onClick={() => setShowTemplates(!showTemplates)}
              className="flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <Settings2 className="h-3.5 w-3.5" />
              Reminder Schedule
              {showTemplates ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </button>
            <AnimatePresence>
              {showTemplates && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                    {REMINDER_TEMPLATES.map((tmpl) => {
                      const isEnabled =
                        tmpl.day === 3
                          ? safeSettings.day3Enabled ?? true
                          : tmpl.day === 7
                            ? safeSettings.day7Enabled ?? true
                            : tmpl.day === 14
                              ? safeSettings.day14Enabled ?? true
                              : safeSettings.day21Enabled ?? false;

                      return (
                        <div
                          key={tmpl.day}
                          className={`flex-shrink-0 p-3 rounded-lg border ${
                            isEnabled ? tmpl.borderColor : "border-border/50"
                          } ${isEnabled ? tmpl.bgColor : "bg-muted/20"} transition-all min-w-[140px]`}
                        >
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <tmpl.icon className={`h-3.5 w-3.5 ${isEnabled ? tmpl.color : "text-muted-foreground/50"}`} />
                            <span
                              className={`text-[11px] font-semibold ${
                                isEnabled ? tmpl.color : "text-muted-foreground/50"
                              }`}
                            >
                              Day {tmpl.day}
                            </span>
                          </div>
                          <p
                            className={`text-[10px] font-medium ${
                              isEnabled ? "text-foreground" : "text-muted-foreground/50"
                            }`}
                          >
                            {tmpl.label}
                          </p>
                          <p
                            className={`text-[9px] ${
                              isEnabled ? "text-muted-foreground" : "text-muted-foreground/40"
                            }`}
                          >
                            {tmpl.description}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <Separator className="mb-4" />

          {/* ── Overdue Invoices List ──────────────────────────────────────── */}
          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {safeOverdueInvoices.map((invoice, idx) => {
              const isExpanded = expandedInvoiceId === invoice._id;
              const urgencyLevel =
                invoice.daysPastDue >= 21
                  ? "critical"
                  : invoice.daysPastDue >= 14
                    ? "high"
                    : invoice.daysPastDue >= 7
                      ? "medium"
                      : "low";

              const urgencyColor =
                urgencyLevel === "critical"
                  ? "text-red-800 bg-red-800/10"
                  : urgencyLevel === "high"
                    ? "text-red-600 bg-red-500/10"
                    : urgencyLevel === "medium"
                      ? "text-orange-600 bg-orange-500/10"
                      : "text-amber-600 bg-amber-500/10";

              // Timeline progress: how far through the reminder schedule
              const maxDays = 21;
              const progressValue = Math.min(100, (invoice.daysPastDue / maxDays) * 100);

              return (
                <motion.div
                  key={invoice._id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: idx * 0.05 }}
                >
                  <div
                    className={`rounded-lg border ${
                      urgencyLevel === "critical"
                        ? "border-red-800/30 bg-red-800/5"
                        : urgencyLevel === "high"
                          ? "border-red-500/20 bg-red-500/5"
                          : "border-border bg-background"
                    } transition-all hover:shadow-sm`}
                  >
                    {/* ── Invoice Header ───────────────────────────────────── */}
                    <div
                      className="cursor-pointer p-3"
                      onClick={() => setExpandedInvoiceId(isExpanded ? null : invoice._id)}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`h-8 w-8 rounded-md flex items-center justify-center flex-shrink-0 ${urgencyColor}`}
                          >
                            {urgencyLevel === "critical" ? (
                              <ShieldAlert className="h-4 w-4" />
                            ) : urgencyLevel === "high" ? (
                              <AlertTriangle className="h-4 w-4" />
                            ) : (
                              <Clock className="h-4 w-4" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-[13px] text-foreground">
                                {invoice.invoiceNumber}
                              </span>
                              <Badge
                                variant="outline"
                                className={`text-[10px] px-1.5 py-0 h-4 ${urgencyColor}`}
                              >
                                {invoice.daysPastDue}d overdue
                              </Badge>
                              {invoice.lastReminderSent && (
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] px-1.5 py-0 h-4 ${
                                    getToneConfig(invoice.lastReminderSent.tone).badgeClass
                                  }`}
                                >
                                  {getToneConfig(invoice.lastReminderSent.tone).label}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {invoice.clientName || "Unknown"}
                              </span>
                              <span>·</span>
                              <span>Due {formatDate(invoice.dueDate)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 flex-shrink-0">
                          <div className="text-right hidden sm:block">
                            <p className="text-[15px] font-bold text-foreground">
                              {formatCurrency(invoice.total, invoice.currency)}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            className="h-7 px-2.5 gap-1.5 text-[11px] bg-[#8B5CF6] hover:bg-[#8B5CF6]/90 text-white"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSendReminder(invoice._id);
                            }}
                            disabled={sendingReminderId === invoice._id}
                          >
                            <Send className="h-3 w-3" />
                            {sendingReminderId === invoice._id ? "Sending..." : "Remind"}
                          </Button>
                          <motion.div
                            animate={{ rotate: isExpanded ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          </motion.div>
                        </div>
                      </div>

                      {/* ── Timeline Progress ──────────────────────────────── */}
                      <div className="mt-2.5 flex items-center gap-2">
                        <div className="flex-1">
                          <Progress
                            value={progressValue}
                            className="h-1.5 bg-muted"
                          />
                        </div>
                        <div className="flex gap-1">
                          {[3, 7, 14, 21].map((day) => {
                            const reminderForDay = invoice.reminders.find(
                              (r) => r.dayNumber === day
                            );
                            const isReached = invoice.daysPastDue >= day;
                            return (
                              <div
                                key={day}
                                className={`h-4 w-4 rounded-full flex items-center justify-center text-[7px] font-bold transition-colors ${
                                  reminderForDay?.status === "sent"
                                    ? "bg-emerald-500 text-white"
                                    : reminderForDay?.status === "scheduled"
                                      ? "bg-[#8B5CF6] text-white"
                                      : isReached
                                        ? "bg-red-500/20 text-red-600"
                                        : "bg-muted text-muted-foreground/50"
                                }`}
                                title={`Day ${day}: ${reminderForDay ? reminderForDay.status : isReached ? "pending" : "upcoming"}`}
                              >
                                {reminderForDay?.status === "sent" ? (
                                  <CheckCircle2 className="h-2.5 w-2.5" />
                                ) : (
                                  day
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* ── Expanded Reminder History ─────────────────────────── */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="border-t border-border px-3 py-3 bg-muted/20">
                            <h5 className="text-[11px] font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                              <Mail className="h-3 w-3" />
                              Reminder History
                            </h5>
                            {invoice.reminders.length === 0 ? (
                              <div className="text-center py-3">
                                <FileText className="h-6 w-6 mx-auto mb-1.5 text-muted-foreground/40" />
                                <p className="text-[11px] text-muted-foreground">
                                  No reminders sent yet. Click &quot;Remind&quot; to send one.
                                </p>
                              </div>
                            ) : (
                              <div className="space-y-1.5">
                                {invoice.reminders.map((reminder) => {
                                  const toneConfig = getToneConfig(reminder.tone);
                                  const statusConfig = getStatusConfig(reminder.status);
                                  const StatusIcon = statusConfig.icon;

                                  return (
                                    <div
                                      key={reminder._id}
                                      className="flex items-start gap-2.5 p-2 rounded-md bg-background border border-border/50"
                                    >
                                      <div
                                        className={`h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0 ${toneConfig.bgColor}`}
                                      >
                                        <StatusIcon
                                          className={`h-3 w-3 ${statusConfig.color}`}
                                        />
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <span className="text-[11px] font-medium text-foreground">
                                            Day {reminder.dayNumber}
                                          </span>
                                          <Badge
                                            variant="outline"
                                            className={`text-[9px] px-1 py-0 h-3.5 ${toneConfig.badgeClass}`}
                                          >
                                            {toneConfig.label}
                                          </Badge>
                                          <Badge
                                            variant="outline"
                                            className={`text-[9px] px-1 py-0 h-3.5 ${statusConfig.badgeClass}`}
                                          >
                                            {statusConfig.label}
                                          </Badge>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                                          {reminder.subject}
                                        </p>
                                        <p className="text-[9px] text-muted-foreground/70 mt-0.5">
                                          {reminder.status === "sent" && reminder.sentAt
                                            ? `Sent ${formatRelativeTime(reminder.sentAt)}`
                                            : reminder.status === "scheduled"
                                              ? `Scheduled for ${formatDate(reminder.scheduledAt)}`
                                              : reminder.status === "skipped"
                                                ? "Skipped"
                                                : "Cancelled"}
                                        </p>
                                      </div>
                                      <div className="flex items-center gap-1 flex-shrink-0">
                                        <Badge
                                          variant="outline"
                                          className="text-[9px] px-1 py-0 h-3.5 bg-muted/50"
                                        >
                                          <Mail className="h-2 w-2 mr-0.5" />
                                          {reminder.channel}
                                        </Badge>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
