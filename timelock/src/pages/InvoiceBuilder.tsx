import { useState, useMemo, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "@/lib/safe-convex-react";
import { api } from "@/convex/_generated/api";
import { useNavigate, useSearchParams } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  Link2,
  Unlink,
  Send,
  Save,
  Eye,
  Edit3,
  ArrowLeft,
  Clock,
  CheckCircle2,
  FileText,
  Globe,
  Calendar,
  ShieldCheck,
  Paperclip,
  X,
  Timer,
  Milestone,
  File,
  ExternalLink,
  Receipt,
  DollarSign,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

type ProofType =
  | "time_entry"
  | "task_completion"
  | "milestone_delivery"
  | "deliverable_file"
  | "deliverable_url"
  | "expense_record";

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
  hasProof: boolean;
  workLinkId?: string;
}

interface WorkProof {
  _id: string;
  invoiceId: string;
  lineItemId: string;
  proofType: ProofType;
  title: string;
  description?: string;
  hours?: number;
  date: number;
  value?: number;
  url?: string;
  fileName?: string;
  verified?: boolean;
  createdAt: number;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const PROOF_TYPES: { value: ProofType; label: string; icon: React.ReactNode }[] = [
  { value: "time_entry", label: "Time Entry", icon: <Timer className="h-4 w-4" /> },
  { value: "task_completion", label: "Task Completion", icon: <CheckCircle2 className="h-4 w-4" /> },
  { value: "milestone_delivery", label: "Milestone Delivery", icon: <Milestone className="h-4 w-4" /> },
  { value: "deliverable_file", label: "Deliverable File", icon: <File className="h-4 w-4" /> },
  { value: "deliverable_url", label: "Deliverable URL", icon: <ExternalLink className="h-4 w-4" /> },
  { value: "expense_record", label: "Expense Record", icon: <Receipt className="h-4 w-4" /> },
];

const CURRENCIES = [
  { value: "USD", label: "USD ($)" },
  { value: "EUR", label: "EUR (€)" },
  { value: "GBP", label: "GBP (£)" },
  { value: "CAD", label: "CAD (C$)" },
  { value: "AUD", label: "AUD (A$)" },
];

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft: {
    label: "Draft",
    className: "bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/25",
  },
  sent: {
    label: "Sent",
    className: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/25",
  },
  viewed: {
    label: "Viewed",
    className: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/25",
  },
  paid: {
    label: "Paid",
    className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/25",
  },
  overdue: {
    label: "Overdue",
    className: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/25",
  },
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function generateId(): string {
  return `li_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

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

function dateToTimestamp(dateStr: string): number {
  return new Date(dateStr + "T00:00:00").getTime();
}

function timestampToDate(ts: number): string {
  const d = new Date(ts);
  return d.toISOString().split("T")[0];
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function InvoiceBuilder() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit") as any;

  // ── Convex Queries ─────────────────────────────────────────────────────
  const existingInvoice = useQuery(
    editId ? api.billing.crud.getInvoice : "skip",
    editId ? { invoiceId: editId } : {}
  );

  const workLinks = useQuery(
    editId ? api.billing.crud.getWorkLinks : "skip",
    editId ? { invoiceId: editId } : {}
  );

  // ── Convex Mutations ───────────────────────────────────────────────────
  const createInvoice = useMutation(api.billing.crud.createInvoice);
  const updateInvoice = useMutation(api.billing.crud.updateInvoice);
  const sendInvoiceMutation = useMutation(api.billing.crud.sendInvoice);
  const addWorkLinkMutation = useMutation(api.billing.crud.addWorkLink);
  const removeWorkLinkMutation = useMutation(api.billing.crud.removeWorkLink);

  // ── State ──────────────────────────────────────────────────────────────
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [invoiceId, setInvoiceId] = useState<string | null>(editId || null);

  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [issueDate, setIssueDate] = useState(timestampToDate(Date.now()));
  const [dueDate, setDueDate] = useState(
    timestampToDate(Date.now() + 30 * 86400000)
  );
  const [currency, setCurrency] = useState("USD");
  const [taxRate, setTaxRate] = useState(0);
  const [notes, setNotes] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("(auto-generated)");
  const [status, setStatus] = useState("draft");

  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: generateId(), description: "", quantity: 1, rate: 0, amount: 0, hasProof: false },
  ]);

  // Work proof dialog
  const [proofDialogOpen, setProofDialogOpen] = useState(false);
  const [proofLineItemId, setProofLineItemId] = useState<string | null>(null);
  const [proofForm, setProofForm] = useState({
    proofType: "time_entry" as ProofType,
    title: "",
    description: "",
    hours: 0,
    date: timestampToDate(Date.now()),
    value: 0,
    url: "",
    fileName: "",
  });

  // Work proof panel
  const [showProofPanel, setShowProofPanel] = useState(false);

  // ── Load existing invoice for editing ──────────────────────────────────
  useEffect(() => {
    if (existingInvoice && editId) {
      const inv = existingInvoice as any;
      setClientName(inv.clientName || "");
      setClientEmail(inv.clientEmail || "");
      setIssueDate(timestampToDate(inv.issueDate));
      setDueDate(timestampToDate(inv.dueDate));
      setCurrency(inv.currency || "USD");
      setTaxRate(inv.taxRate || 0);
      setNotes(inv.notes || "");
      setInvoiceNumber(inv.invoiceNumber || "");
      setStatus(inv.status || "draft");
      setInvoiceId(inv._id);

      if (inv.lineItems && inv.lineItems.length > 0) {
        setLineItems(
          inv.lineItems.map((li: any) => ({
            id: li.id || generateId(),
            description: li.description || "",
            quantity: li.quantity || 0,
            rate: li.rate || 0,
            amount: li.amount || 0,
            hasProof: li.hasProof || false,
            workLinkId: li.workLinkId,
          }))
        );
      }
    }
  }, [existingInvoice, editId]);

  // ── Computed values ────────────────────────────────────────────────────
  const subtotal = useMemo(
    () => lineItems.reduce((sum, li) => sum + li.amount, 0),
    [lineItems]
  );

  const taxAmount = useMemo(() => subtotal * (taxRate / 100), [subtotal, taxRate]);
  const total = useMemo(() => subtotal + taxAmount, [subtotal, taxAmount]);

  const allWorkProofs: WorkProof[] = useMemo(() => {
    if (!workLinks) return [];
    return (workLinks as any[]).map((wl) => ({
      _id: wl._id,
      invoiceId: wl.invoiceId,
      lineItemId: wl.lineItemId,
      proofType: wl.proofType,
      title: wl.title,
      description: wl.description,
      hours: wl.hours,
      date: wl.date,
      value: wl.value,
      url: wl.url,
      fileName: wl.fileName,
      verified: wl.verified,
      createdAt: wl.createdAt,
    }));
  }, [workLinks]);

  const hasAnyProofs = useMemo(
    () => lineItems.some((li) => li.hasProof) || allWorkProofs.length > 0,
    [lineItems, allWorkProofs]
  );

  const proofsForLineItem = useCallback(
    (lineItemId: string) => allWorkProofs.filter((p) => p.lineItemId === lineItemId),
    [allWorkProofs]
  );

  // ── Line Item Handlers ─────────────────────────────────────────────────
  const updateLineItem = (id: string, field: string, value: string | number) => {
    setLineItems((prev) =>
      prev.map((li) => {
        if (li.id !== id) return li;
        const updated = { ...li, [field]: value };
        if (field === "quantity" || field === "rate") {
          updated.amount = updated.quantity * updated.rate;
        }
        return updated;
      })
    );
  };

  const addLineItem = () => {
    setLineItems((prev) => [
      ...prev,
      { id: generateId(), description: "", quantity: 1, rate: 0, amount: 0, hasProof: false },
    ]);
  };

  const removeLineItem = (id: string) => {
    if (lineItems.length <= 1) return;
    setLineItems((prev) => prev.filter((li) => li.id !== id));
  };

  // ── Proof Dialog Handlers ──────────────────────────────────────────────
  const openProofDialog = (lineItemId: string) => {
    setProofLineItemId(lineItemId);
    setProofForm({
      proofType: "time_entry",
      title: "",
      description: "",
      hours: 0,
      date: timestampToDate(Date.now()),
      value: 0,
      url: "",
      fileName: "",
    });
    setProofDialogOpen(true);
  };

  const handleAddProof = async () => {
    if (!proofLineItemId || !invoiceId) {
      toast.error("Please save the invoice first before adding work proofs");
      return;
    }

    if (!proofForm.title.trim()) {
      toast.error("Proof title is required");
      return;
    }

    try {
      await addWorkLinkMutation({
        invoiceId: invoiceId as any,
        lineItemId: proofLineItemId,
        proofType: proofForm.proofType,
        title: proofForm.title.trim(),
        description: proofForm.description.trim() || undefined,
        hours: proofForm.proofType === "time_entry" ? proofForm.hours || undefined : undefined,
        date: dateToTimestamp(proofForm.date),
        value: proofForm.value || undefined,
        url: proofForm.proofType === "deliverable_url" ? proofForm.url.trim() || undefined : undefined,
        fileName: proofForm.proofType === "deliverable_file" ? proofForm.fileName.trim() || undefined : undefined,
      });

      setLineItems((prev) =>
        prev.map((li) =>
          li.id === proofLineItemId ? { ...li, hasProof: true } : li
        )
      );

      setProofDialogOpen(false);
      toast.success("Work proof linked successfully!", {
        description: `"${proofForm.title}" attached to line item`,
      });
    } catch (err: any) {
      toast.error("Failed to add work proof", {
        description: err.message || "Please try again",
      });
    }
  };

  const handleRemoveProof = async (workLinkId: string) => {
    try {
      await removeWorkLinkMutation({ workLinkId: workLinkId as any });

      toast.success("Work proof removed", {
        description: "The proof link has been removed from this invoice",
      });
    } catch (err: any) {
      toast.error("Failed to remove work proof", {
        description: err.message || "Please try again",
      });
    }
  };

  // ── Save Invoice ───────────────────────────────────────────────────────
  const handleSaveDraft = async () => {
    if (!clientName.trim()) {
      toast.error("Client name is required");
      return;
    }
    const validItems = lineItems.filter((li) => li.description.trim() && li.quantity > 0 && li.rate > 0);
    if (validItems.length === 0) {
      toast.error("At least one valid line item is required");
      return;
    }

    setSaving(true);
    try {
      const lineItemsData = validItems.map((li) => ({
        id: li.id,
        description: li.description,
        quantity: li.quantity,
        rate: li.rate,
        amount: li.amount,
        hasProof: li.hasProof,
        workLinkId: li.workLinkId,
      }));

      if (invoiceId) {
        await updateInvoice({
          invoiceId: invoiceId as any,
          clientName: clientName.trim(),
          clientEmail: clientEmail.trim() || undefined,
          lineItems: lineItemsData,
          subtotal,
          taxRate,
          taxAmount,
          total,
          dueDate: dateToTimestamp(dueDate),
          notes: notes.trim() || undefined,
        });
        toast.success("Invoice updated!", {
          description: `${invoiceNumber} saved as draft`,
        });
      } else {
        const newId = await createInvoice({
          clientName: clientName.trim(),
          clientEmail: clientEmail.trim() || undefined,
          lineItems: lineItemsData,
          subtotal,
          taxRate,
          taxAmount,
          total,
          dueDate: dateToTimestamp(dueDate),
          issueDate: dateToTimestamp(issueDate),
          notes: notes.trim() || undefined,
          currency,
        });
        setInvoiceId(newId as string);
        toast.success("Invoice created!", {
          description: "Your draft has been saved",
        });
      }
    } catch (err: any) {
      toast.error("Failed to save invoice", {
        description: err.message || "Please try again",
      });
    } finally {
      setSaving(false);
    }
  };

  // ── Send Invoice ───────────────────────────────────────────────────────
  const handleSendInvoice = async () => {
    if (!invoiceId) {
      toast.error("Please save the invoice first");
      return;
    }
    setSending(true);
    try {
      await sendInvoiceMutation({ invoiceId: invoiceId as any });
      setStatus("sent");
      toast.success("Invoice sent!", {
        description: `Invoice ${invoiceNumber} has been sent to ${clientName}`,
      });
    } catch (err: any) {
      toast.error("Failed to send invoice", {
        description: err.message || "Please try again",
      });
    } finally {
      setSending(false);
    }
  };

  // ── Loading ────────────────────────────────────────────────────────────
  if (editId && existingInvoice === undefined) {
    return (
      <div className="w-full min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#8B5CF6] mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading invoice...</p>
        </div>
      </div>
    );
  }

  // ─── RENDER ────────────────────────────────────────────────────────────
  return (
    <motion.div
      className="w-full min-h-screen bg-background text-foreground p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <div className="max-w-6xl mx-auto">
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="h-9 px-2"
              onClick={() => navigate("/invoices")}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-foreground tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  {editId ? "Edit Invoice" : "New Invoice"}
                </h1>
                {invoiceNumber !== "(auto-generated)" && (
                  <span className="text-sm text-muted-foreground font-medium">
                    {invoiceNumber}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                {status && STATUS_CONFIG[status] && (
                  <Badge variant="secondary" className={`text-[11px] h-5 ${STATUS_CONFIG[status].className}`}>
                    {STATUS_CONFIG[status].label}
                  </Badge>
                )}
                {hasAnyProofs && (
                  <Badge className="bg-[#22c55e]/15 text-[#22c55e] border-[#22c55e]/25 text-[11px] h-5">
                    <ShieldCheck className="h-3 w-3 mr-1" />
                    Validated Billing
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setMode(mode === "edit" ? "preview" : "edit")}
            >
              {mode === "edit" ? (
                <>
                  <Eye className="h-4 w-4" />
                  Preview
                </>
              ) : (
                <>
                  <Edit3 className="h-4 w-4" />
                  Edit
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setShowProofPanel(!showProofPanel)}
            >
              <Paperclip className="h-4 w-4" />
              Proofs
              {allWorkProofs.length > 0 && (
                <span className="ml-1 bg-[#22c55e] text-white text-[10px] rounded-full h-4 w-4 flex items-center justify-center">
                  {allWorkProofs.length}
                </span>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 border-[#8B5CF6]/30 text-[#8B5CF6] hover:bg-[#8B5CF6]/10"
              onClick={handleSaveDraft}
              disabled={saving}
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save Draft"}
            </Button>
            {invoiceId && (
              <Button
                size="sm"
                className="gap-1.5 bg-[#8B5CF6] hover:bg-[#8B5CF6]/90 text-white"
                onClick={handleSendInvoice}
                disabled={sending || status !== "draft"}
              >
                <Send className="h-4 w-4" />
                {sending ? "Sending..." : "Send Invoice"}
              </Button>
            )}
          </div>
        </div>

        {/* ── Main Content ───────────────────────────────────────────────── */}
        <div className="flex gap-6">
          {/* ── Builder / Preview ──────────────────────────────────────────── */}
          <div className={`flex-1 ${showProofPanel ? "" : ""}`}>
            <AnimatePresence mode="wait">
              {mode === "edit" ? (
                <motion.div
                  key="edit"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  {/* ── Client Section ──────────────────────────────────────── */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <FileText className="h-4 w-4 text-[#8B5CF6]" />
                        Client Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="clientName" className="text-sm">
                            Client Name <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            id="clientName"
                            placeholder="Enter client name"
                            value={clientName}
                            onChange={(e) => setClientName(e.target.value)}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="clientEmail" className="text-sm">
                            Client Email
                          </Label>
                          <Input
                            id="clientEmail"
                            type="email"
                            placeholder="client@example.com"
                            value={clientEmail}
                            onChange={(e) => setClientEmail(e.target.value)}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* ── Invoice Details ─────────────────────────────────────── */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-[#8B5CF6]" />
                        Invoice Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-sm">Invoice Number</Label>
                          <Input value={invoiceNumber} disabled className="bg-muted/50" />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="issueDate" className="text-sm">
                            Issue Date
                          </Label>
                          <Input
                            id="issueDate"
                            type="date"
                            value={issueDate}
                            onChange={(e) => setIssueDate(e.target.value)}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="dueDate" className="text-sm">
                            Due Date <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            id="dueDate"
                            type="date"
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="w-48 space-y-1.5">
                        <Label className="text-sm">Currency</Label>
                        <Select value={currency} onValueChange={setCurrency}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CURRENCIES.map((c) => (
                              <SelectItem key={c.value} value={c.value}>
                                {c.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>

                  {/* ── Line Items ──────────────────────────────────────────── */}
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-[#8B5CF6]" />
                          Line Items
                        </CardTitle>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 text-[#8B5CF6] border-[#8B5CF6]/30 hover:bg-[#8B5CF6]/10"
                          onClick={addLineItem}
                        >
                          <Plus className="h-4 w-4" />
                          Add Item
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="rounded-lg border border-border overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/50">
                              <TableHead className="w-[40%]">Description</TableHead>
                              <TableHead className="w-[12%] text-right">Qty</TableHead>
                              <TableHead className="w-[18%] text-right">Rate</TableHead>
                              <TableHead className="w-[18%] text-right">Amount</TableHead>
                              <TableHead className="w-[12%] text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {lineItems.map((li) => {
                              const itemProofs = proofsForLineItem(li.id);
                              return (
                                <TableRow key={li.id}>
                                  <TableCell>
                                    <Input
                                      placeholder="Description"
                                      value={li.description}
                                      onChange={(e) =>
                                        updateLineItem(li.id, "description", e.target.value)
                                      }
                                      className="border-0 shadow-none focus-visible:ring-0 px-1 h-8 text-sm"
                                    />
                                    {li.hasProof && (
                                      <Badge className="mt-1 bg-[#22c55e]/15 text-[#22c55e] border-[#22c55e]/25 text-[10px] h-4 px-1.5">
                                        <Paperclip className="h-2.5 w-2.5 mr-0.5" />
                                        Proof Attached
                                      </Badge>
                                    )}
                                    {itemProofs.length > 1 && (
                                      <span className="text-[10px] text-muted-foreground ml-2">
                                        +{itemProofs.length - 1} more
                                      </span>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <Input
                                      type="number"
                                      min="0"
                                      step="1"
                                      value={li.quantity}
                                      onChange={(e) =>
                                        updateLineItem(li.id, "quantity", parseFloat(e.target.value) || 0)
                                      }
                                      className="border-0 shadow-none focus-visible:ring-0 px-1 h-8 text-sm text-right w-20 ml-auto"
                                    />
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <Input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={li.rate}
                                      onChange={(e) =>
                                        updateLineItem(li.id, "rate", parseFloat(e.target.value) || 0)
                                      }
                                      className="border-0 shadow-none focus-visible:ring-0 px-1 h-8 text-sm text-right w-24 ml-auto"
                                    />
                                  </TableCell>
                                  <TableCell className="text-right font-medium text-sm">
                                    {formatCurrency(li.amount, currency)}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-1">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0"
                                        title="Link Work Proof"
                                        onClick={() => openProofDialog(li.id)}
                                      >
                                        <Link2 className="h-3.5 w-3.5 text-[#8B5CF6]" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500"
                                        onClick={() => removeLineItem(li.id)}
                                        disabled={lineItems.length <= 1}
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>

                      {/* ── Totals ─────────────────────────────────────────── */}
                      <div className="mt-4 flex justify-end">
                        <div className="w-72 space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Subtotal</span>
                            <span className="font-medium">{formatCurrency(subtotal, currency)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-2 text-sm">
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">Tax</span>
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                step="0.1"
                                value={taxRate}
                                onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                                className="h-7 w-16 text-xs text-center px-1"
                              />
                              <span className="text-muted-foreground text-xs">%</span>
                            </div>
                            <span className="font-medium">{formatCurrency(taxAmount, currency)}</span>
                          </div>
                          <Separator />
                          <div className="flex justify-between text-base font-bold">
                            <span>Total</span>
                            <span className="text-[#8B5CF6]">{formatCurrency(total, currency)}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* ── Notes ──────────────────────────────────────────────── */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base font-semibold">Notes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        placeholder="Additional notes or payment terms..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={3}
                      />
                    </CardContent>
                  </Card>
                </motion.div>
              ) : (
                /* ── PREVIEW MODE ────────────────────────────────────────── */
                <motion.div
                  key="preview"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className="max-w-3xl mx-auto">
                    <CardContent className="p-8 sm:p-10">
                      {/* Invoice Header */}
                      <div className="flex justify-between items-start mb-8">
                        <div>
                          <h2
                            className="text-3xl font-bold text-foreground"
                            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                          >
                            INVOICE
                          </h2>
                          <p className="text-muted-foreground mt-1">{invoiceNumber}</p>
                        </div>
                        <div className="text-right">
                          {hasAnyProofs && (
                            <Badge className="bg-[#22c55e]/15 text-[#22c55e] border-[#22c55e]/25 mb-2">
                              <ShieldCheck className="h-3.5 w-3.5 mr-1" />
                              Validated Billing
                            </Badge>
                          )}
                          <p className="text-sm text-muted-foreground">
                            Issued: {formatDate(dateToTimestamp(issueDate))}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Due: {formatDate(dateToTimestamp(dueDate))}
                          </p>
                        </div>
                      </div>

                      <Separator className="mb-6" />

                      {/* Bill To */}
                      <div className="mb-8">
                        <p className="text-xs uppercase text-muted-foreground font-medium mb-1">Bill To</p>
                        <p className="font-semibold text-foreground">{clientName || "—"}</p>
                        {clientEmail && (
                          <p className="text-sm text-muted-foreground">{clientEmail}</p>
                        )}
                      </div>

                      {/* Line Items Table */}
                      <div className="rounded-lg border border-border overflow-hidden mb-6">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/50">
                              <TableHead>Description</TableHead>
                              <TableHead className="text-right">Qty</TableHead>
                              <TableHead className="text-right">Rate</TableHead>
                              <TableHead className="text-right">Amount</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {lineItems
                              .filter((li) => li.description.trim())
                              .map((li) => (
                                <TableRow key={li.id}>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      {li.description}
                                      {li.hasProof && (
                                        <Badge className="bg-[#22c55e]/15 text-[#22c55e] border-[#22c55e]/25 text-[10px] h-4 px-1.5">
                                          <Paperclip className="h-2.5 w-2.5 mr-0.5" />
                                          Proof
                                        </Badge>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right">{li.quantity}</TableCell>
                                  <TableCell className="text-right">
                                    {formatCurrency(li.rate, currency)}
                                  </TableCell>
                                  <TableCell className="text-right font-medium">
                                    {formatCurrency(li.amount, currency)}
                                  </TableCell>
                                </TableRow>
                              ))}
                          </TableBody>
                          <TableFooter>
                            <TableRow>
                              <TableCell colSpan={3} className="text-right text-muted-foreground">
                                Subtotal
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {formatCurrency(subtotal, currency)}
                              </TableCell>
                            </TableRow>
                            {taxRate > 0 && (
                              <TableRow>
                                <TableCell colSpan={3} className="text-right text-muted-foreground">
                                  Tax ({taxRate}%)
                                </TableCell>
                                <TableCell className="text-right font-medium">
                                  {formatCurrency(taxAmount, currency)}
                                </TableCell>
                              </TableRow>
                            )}
                            <TableRow>
                              <TableCell
                                colSpan={3}
                                className="text-right font-bold text-base"
                              >
                                Total
                              </TableCell>
                              <TableCell className="text-right font-bold text-base text-[#8B5CF6]">
                                {formatCurrency(total, currency)}
                              </TableCell>
                            </TableRow>
                          </TableFooter>
                        </Table>
                      </div>

                      {/* Notes */}
                      {notes.trim() && (
                        <div className="p-4 rounded-lg bg-muted/30 border border-border">
                          <p className="text-xs uppercase text-muted-foreground font-medium mb-1">
                            Notes
                          </p>
                          <p className="text-sm text-foreground whitespace-pre-wrap">{notes}</p>
                        </div>
                      )}

                      {/* Work Proof Summary */}
                      {allWorkProofs.length > 0 && (
                        <div className="mt-6 p-4 rounded-lg bg-[#22c55e]/5 border border-[#22c55e]/20">
                          <div className="flex items-center gap-2 mb-3">
                            <ShieldCheck className="h-4 w-4 text-[#22c55e]" />
                            <span className="font-semibold text-sm text-[#22c55e]">
                              Work Proof Summary
                            </span>
                          </div>
                          <div className="space-y-2">
                            {allWorkProofs.map((proof) => {
                              const proofType = PROOF_TYPES.find(
                                (pt) => pt.value === proof.proofType
                              );
                              return (
                                <div
                                  key={proof._id}
                                  className="flex items-center justify-between text-sm"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground">
                                      {proofType?.icon}
                                    </span>
                                    <span className="text-foreground">{proof.title}</span>
                                    <span className="text-xs text-muted-foreground">
                                      {proofType?.label}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                    {proof.hours != null && (
                                      <span>{proof.hours}h</span>
                                    )}
                                    {proof.value != null && (
                                      <span>{formatCurrency(proof.value, currency)}</span>
                                    )}
                                    <span>{formatDate(proof.date)}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── Work Proof Panel (Sidebar) ──────────────────────────────── */}
          <AnimatePresence>
            {showProofPanel && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 320 }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.25 }}
                className="flex-shrink-0 overflow-hidden"
              >
                <Card className="h-full">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <Paperclip className="h-4 w-4 text-[#8B5CF6]" />
                        Work Proofs
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => setShowProofPanel(false)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    {hasAnyProofs && (
                      <div className="mt-2 p-2 rounded-md bg-[#22c55e]/10 border border-[#22c55e]/20">
                        <div className="flex items-center gap-1.5 text-xs text-[#22c55e] font-medium">
                          <ShieldCheck className="h-3.5 w-3.5" />
                          Validated Billing Active
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {allWorkProofs.length} proof{allWorkProofs.length !== 1 ? "s" : ""} linked
                        </p>
                      </div>
                    )}
                  </CardHeader>
                  <CardContent>
                    {allWorkProofs.length === 0 ? (
                      <div className="text-center py-8">
                        <Paperclip className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                        <p className="text-sm text-muted-foreground mb-1">No work proofs yet</p>
                        <p className="text-xs text-muted-foreground">
                          Save the invoice, then click the link icon on any line item to add proofs
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto pr-1">
                        {allWorkProofs.map((proof) => {
                          const proofType = PROOF_TYPES.find(
                            (pt) => pt.value === proof.proofType
                          );
                          const lineItem = lineItems.find((li) => li.id === proof.lineItemId);
                          return (
                            <motion.div
                              key={proof._id}
                              initial={{ opacity: 0, y: 5 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="p-3 rounded-lg border border-border bg-card hover:border-[#8B5CF6]/30 transition-colors"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-start gap-2 min-w-0">
                                  <div className="h-7 w-7 rounded-md bg-[#8B5CF6]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                    {proofType?.icon || <Paperclip className="h-3.5 w-3.5 text-[#8B5CF6]" />}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium text-foreground truncate">
                                      {proof.title}
                                    </p>
                                    <p className="text-[11px] text-muted-foreground">
                                      {proofType?.label}
                                    </p>
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 text-muted-foreground hover:text-red-500 flex-shrink-0"
                                  onClick={() => handleRemoveProof(proof._id)}
                                >
                                  <Unlink className="h-3 w-3" />
                                </Button>
                              </div>

                              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                                {proof.hours != null && (
                                  <span className="flex items-center gap-0.5">
                                    <Timer className="h-3 w-3" />
                                    {proof.hours}h
                                  </span>
                                )}
                                {proof.value != null && (
                                  <span className="flex items-center gap-0.5">
                                    <DollarSign className="h-3 w-3" />
                                    {formatCurrency(proof.value, currency)}
                                  </span>
                                )}
                                <span className="flex items-center gap-0.5">
                                  <Calendar className="h-3 w-3" />
                                  {formatDate(proof.date)}
                                </span>
                              </div>

                              {proof.description && (
                                <p className="mt-1.5 text-[11px] text-muted-foreground line-clamp-2">
                                  {proof.description}
                                </p>
                              )}

                              {lineItem && (
                                <div className="mt-2 pt-1.5 border-t border-border">
                                  <p className="text-[10px] text-muted-foreground">
                                    Linked to:{" "}
                                    <span className="text-foreground font-medium truncate">
                                      {lineItem.description || "Untitled item"}
                                    </span>
                                  </p>
                                </div>
                              )}
                            </motion.div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Link Work Proof Dialog ─────────────────────────────────────── */}
      <Dialog open={proofDialogOpen} onOpenChange={setProofDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-[#8B5CF6]" />
              Link Work Proof
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Proof Type */}
            <div className="space-y-1.5">
              <Label className="text-sm">Proof Type</Label>
              <Select
                value={proofForm.proofType}
                onValueChange={(v) =>
                  setProofForm((p) => ({ ...p, proofType: v as ProofType }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROOF_TYPES.map((pt) => (
                    <SelectItem key={pt.value} value={pt.value}>
                      <div className="flex items-center gap-2">
                        {pt.icon}
                        {pt.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Title */}
            <div className="space-y-1.5">
              <Label className="text-sm">
                Title <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="e.g., Frontend Sprint 3 work log"
                value={proofForm.title}
                onChange={(e) =>
                  setProofForm((p) => ({ ...p, title: e.target.value }))
                }
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label className="text-sm">Description</Label>
              <Textarea
                placeholder="Describe the work completed..."
                value={proofForm.description}
                onChange={(e) =>
                  setProofForm((p) => ({ ...p, description: e.target.value }))
                }
                rows={2}
              />
            </div>

            {/* Hours (for time entries) */}
            {proofForm.proofType === "time_entry" && (
              <div className="space-y-1.5">
                <Label className="text-sm">Hours</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.25"
                  value={proofForm.hours || ""}
                  onChange={(e) =>
                    setProofForm((p) => ({
                      ...p,
                      hours: parseFloat(e.target.value) || 0,
                    }))
                  }
                  placeholder="0"
                />
              </div>
            )}

            {/* Value */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm">Value</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={proofForm.value || ""}
                  onChange={(e) =>
                    setProofForm((p) => ({
                      ...p,
                      value: parseFloat(e.target.value) || 0,
                    }))
                  }
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Date</Label>
                <Input
                  type="date"
                  value={proofForm.date}
                  onChange={(e) =>
                    setProofForm((p) => ({ ...p, date: e.target.value }))
                  }
                />
              </div>
            </div>

            {/* URL (for deliverable_url) */}
            {proofForm.proofType === "deliverable_url" && (
              <div className="space-y-1.5">
                <Label className="text-sm">URL</Label>
                <Input
                  placeholder="https://..."
                  value={proofForm.url}
                  onChange={(e) =>
                    setProofForm((p) => ({ ...p, url: e.target.value }))
                  }
                />
              </div>
            )}

            {/* File Name (for deliverable_file) */}
            {proofForm.proofType === "deliverable_file" && (
              <div className="space-y-1.5">
                <Label className="text-sm">File Name</Label>
                <Input
                  placeholder="design-v2.fig"
                  value={proofForm.fileName}
                  onChange={(e) =>
                    setProofForm((p) => ({ ...p, fileName: e.target.value }))
                  }
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setProofDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-[#8B5CF6] hover:bg-[#8B5CF6]/90 text-white gap-1.5"
              onClick={handleAddProof}
              disabled={!proofForm.title.trim() || !invoiceId}
            >
              <Link2 className="h-4 w-4" />
              Link Proof
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
