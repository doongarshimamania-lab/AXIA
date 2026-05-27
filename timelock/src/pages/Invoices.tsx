import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
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
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  DollarSign,
  Clock,
  AlertTriangle,
  TrendingUp,
  Plus,
  FileText,
  Search,
  ChevronDown,
  ChevronUp,
  Send,
  Download,
  MoreHorizontal,
  Calendar,
  User,
  Briefcase,
  Hash,
  Receipt,
  ArrowUpRight,
  Timer,
} from "lucide-react";
import { useSubscriptionTier } from "@/hooks/use-subscription-tier";

type InvoiceStatus = "paid" | "pending" | "overdue" | "draft";

interface InvoiceItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  clientName: string;
  projectName: string;
  amount: number;
  status: InvoiceStatus;
  date: string;
  dueDate: string;
  paidDate?: string;
  items: InvoiceItem[];
  notes?: string;
  platform: "upwork" | "fiverr" | "toptal" | "direct";
}

const mockInvoices: Invoice[] = [
  {
    id: "inv_1",
    invoiceNumber: "INV-2024-001",
    clientName: "TechCorp Solutions",
    projectName: "Website Redesign",
    amount: 4250.0,
    status: "paid",
    date: "2024-11-01",
    dueDate: "2024-11-15",
    paidDate: "2024-11-12",
    platform: "upwork",
    items: [
      { description: "Frontend Development", quantity: 40, rate: 75, amount: 3000 },
      { description: "UI/UX Design Review", quantity: 10, rate: 85, amount: 850 },
      { description: "Project Management", quantity: 5, rate: 80, amount: 400 },
    ],
    notes: "Milestone 1 completed — all deliverables approved by client.",
  },
  {
    id: "inv_2",
    invoiceNumber: "INV-2024-002",
    clientName: "StartupHub Inc",
    projectName: "Mobile App MVP",
    amount: 6800.0,
    status: "pending",
    date: "2024-12-01",
    dueDate: "2024-12-16",
    platform: "fiverr",
    items: [
      { description: "React Native Development", quantity: 60, rate: 85, amount: 5100 },
      { description: "API Integration", quantity: 20, rate: 85, amount: 1700 },
    ],
    notes: "Submitted for client review. Awaiting approval.",
  },
  {
    id: "inv_3",
    invoiceNumber: "INV-2024-003",
    clientName: "Global Enterprises",
    projectName: "Backend API System",
    amount: 3200.0,
    status: "overdue",
    date: "2024-10-15",
    dueDate: "2024-10-30",
    platform: "toptal",
    items: [
      { description: "Node.js API Development", quantity: 30, rate: 95, amount: 2850 },
      { description: "Database Optimization", quantity: 5, rate: 70, amount: 350 },
    ],
    notes: "Payment overdue by 45 days. Follow-up sent on Nov 15.",
  },
  {
    id: "inv_4",
    invoiceNumber: "INV-2024-004",
    clientName: "Digital Marketing Co",
    projectName: "Landing Page Design",
    amount: 1500.0,
    status: "draft",
    date: "2024-12-10",
    dueDate: "2024-12-25",
    platform: "direct",
    items: [
      { description: "Landing Page Design", quantity: 15, rate: 75, amount: 1125 },
      { description: "A/B Testing Setup", quantity: 5, rate: 75, amount: 375 },
    ],
    notes: "Draft — needs final review before sending.",
  },
  {
    id: "inv_5",
    invoiceNumber: "INV-2024-005",
    clientName: "Creative Studios",
    projectName: "Brand Identity Package",
    amount: 5500.0,
    status: "paid",
    date: "2024-10-01",
    dueDate: "2024-10-15",
    paidDate: "2024-10-14",
    platform: "upwork",
    items: [
      { description: "Logo Design & Variants", quantity: 25, rate: 90, amount: 2250 },
      { description: "Brand Guidelines Document", quantity: 20, rate: 90, amount: 1800 },
      { description: "Social Media Kit", quantity: 16, rate: 90.625, amount: 1450 },
    ],
    notes: "Full brand package delivered. Client extremely satisfied.",
  },
  {
    id: "inv_6",
    invoiceNumber: "INV-2024-006",
    clientName: "Acme Corp",
    projectName: "E-commerce Platform",
    amount: 9200.0,
    status: "pending",
    date: "2024-12-05",
    dueDate: "2024-12-20",
    platform: "upwork",
    items: [
      { description: "Full-Stack Development", quantity: 80, rate: 95, amount: 7600 },
      { description: "DevOps & Deployment", quantity: 16, rate: 100, amount: 1600 },
    ],
    notes: "Final milestone invoice. Project completion pending final QA.",
  },
];

const statusConfig: Record<
  InvoiceStatus,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive"; className: string }
> = {
  paid: {
    label: "Paid",
    variant: "secondary",
    className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/25 hover:bg-emerald-500/25",
  },
  pending: {
    label: "Pending",
    variant: "outline",
    className: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/25 hover:bg-amber-500/25",
  },
  overdue: {
    label: "Overdue",
    variant: "destructive",
    className: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/25 hover:bg-red-500/25",
  },
  draft: {
    label: "Draft",
    variant: "secondary",
    className: "bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/25 hover:bg-slate-500/25",
  },
};

const filterTabs: { key: "all" | InvoiceStatus; label: string }[] = [
  { key: "all", label: "All" },
  { key: "paid", label: "Paid" },
  { key: "pending", label: "Pending" },
  { key: "overdue", label: "Overdue" },
  { key: "draft", label: "Draft" },
];

const platformLabels: Record<string, string> = {
  upwork: "Upwork",
  fiverr: "Fiverr",
  toptal: "Toptal",
  direct: "Direct",
};

export default function Invoices() {
  const { tier: subscriptionTier } = useSubscriptionTier();
  const [invoices, setInvoices] = useState<Invoice[]>(mockInvoices);
  const [activeFilter, setActiveFilter] = useState<"all" | InvoiceStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Create invoice form state
  const [newInvoice, setNewInvoice] = useState({
    clientName: "",
    projectName: "",
    platform: "direct" as "upwork" | "fiverr" | "toptal" | "direct",
    dueDate: "",
    items: [{ description: "", quantity: 1, rate: 0, amount: 0 }],
    notes: "",
  });

  // Computed stats
  const stats = useMemo(() => {
    const totalRevenue = invoices
      .filter((i) => i.status === "paid")
      .reduce((sum, i) => sum + i.amount, 0);
    const pendingAmount = invoices
      .filter((i) => i.status === "pending")
      .reduce((sum, i) => sum + i.amount, 0);
    const overdueAmount = invoices
      .filter((i) => i.status === "overdue")
      .reduce((sum, i) => sum + i.amount, 0);

    // Avg payment time (days between date and paidDate for paid invoices)
    const paidInvoices = invoices.filter((i) => i.status === "paid" && i.paidDate);
    const avgPaymentDays =
      paidInvoices.length > 0
        ? paidInvoices.reduce((sum, inv) => {
            const created = new Date(inv.date).getTime();
            const paid = new Date(inv.paidDate!).getTime();
            return sum + (paid - created) / (1000 * 60 * 60 * 24);
          }, 0) / paidInvoices.length
        : 0;

    return { totalRevenue, pendingAmount, overdueAmount, avgPaymentDays };
  }, [invoices]);

  // Filtered invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const matchesFilter = activeFilter === "all" || inv.status === activeFilter;
      const matchesSearch =
        searchQuery === "" ||
        inv.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [invoices, activeFilter, searchQuery]);

  // Filter counts
  const filterCounts = useMemo(() => {
    const counts: Record<string, number> = { all: invoices.length };
    for (const status of ["paid", "pending", "overdue", "draft"] as InvoiceStatus[]) {
      counts[status] = invoices.filter((i) => i.status === status).length;
    }
    return counts;
  }, [invoices]);

  const handleCreateInvoice = () => {
    if (!newInvoice.clientName || !newInvoice.projectName || !newInvoice.dueDate) {
      toast.error("Please fill in all required fields");
      return;
    }
    const hasValidItem = newInvoice.items.some(
      (item) => item.description && item.quantity > 0 && item.rate > 0
    );
    if (!hasValidItem) {
      toast.error("Please add at least one valid line item");
      return;
    }

    const totalAmount = newInvoice.items.reduce((sum, item) => sum + item.amount, 0);
    const nextNum = invoices.length + 1;
    const newInv: Invoice = {
      id: `inv_${Date.now()}`,
      invoiceNumber: `INV-2024-${String(nextNum).padStart(3, "0")}`,
      clientName: newInvoice.clientName,
      projectName: newInvoice.projectName,
      amount: totalAmount,
      status: "draft",
      date: new Date().toISOString().split("T")[0],
      dueDate: newInvoice.dueDate,
      platform: newInvoice.platform,
      items: newInvoice.items.filter((i) => i.description && i.quantity > 0 && i.rate > 0),
      notes: newInvoice.notes || undefined,
    };

    setInvoices((prev) => [newInv, ...prev]);
    setShowCreateDialog(false);
    setNewInvoice({
      clientName: "",
      projectName: "",
      platform: "direct",
      dueDate: "",
      items: [{ description: "", quantity: 1, rate: 0, amount: 0 }],
      notes: "",
    });
    toast.success("Invoice created successfully!", {
      description: `${newInv.invoiceNumber} — $${totalAmount.toLocaleString()}`,
    });
  };

  const updateNewItem = (index: number, field: string, value: string | number) => {
    setNewInvoice((prev) => {
      const items = [...prev.items];
      items[index] = { ...items[index], [field]: value };
      if (field === "quantity" || field === "rate") {
        items[index].amount = items[index].quantity * items[index].rate;
      }
      return { ...prev, items };
    });
  };

  const addNewItem = () => {
    setNewInvoice((prev) => ({
      ...prev,
      items: [...prev.items, { description: "", quantity: 1, rate: 0, amount: 0 }],
    }));
  };

  const removeNewItem = (index: number) => {
    if (newInvoice.items.length <= 1) return;
    setNewInvoice((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const handleSendInvoice = (invoiceId: string) => {
    setInvoices((prev) =>
      prev.map((inv) =>
        inv.id === invoiceId && inv.status === "draft"
          ? { ...inv, status: "pending" as InvoiceStatus }
          : inv
      )
    );
    toast.success("Invoice sent!", {
      description: "The invoice has been sent to the client.",
    });
  };

  const handleMarkPaid = (invoiceId: string) => {
    setInvoices((prev) =>
      prev.map((inv) =>
        inv.id === invoiceId && (inv.status === "pending" || inv.status === "overdue")
          ? { ...inv, status: "paid" as InvoiceStatus, paidDate: new Date().toISOString().split("T")[0] }
          : inv
      )
    );
    toast.success("Invoice marked as paid!");
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const daysOverdue = (dueDate: string) => {
    const now = new Date();
    const due = new Date(dueDate + "T00:00:00");
    return Math.max(0, Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)));
  };

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
          <h1 className="text-[32px] font-bold text-foreground tracking-tight mb-2">Invoices</h1>
          <p className="text-[16px] text-muted-foreground">
            Create, manage, and track your invoices with payment protection
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-[14px] font-medium text-muted-foreground">
                  Total Revenue
                </CardTitle>
                <div className="h-8 w-8 rounded-md bg-emerald-500/10 flex items-center justify-center">
                  <DollarSign className="h-4 w-4 text-emerald-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-[24px] font-bold text-foreground">
                  {formatCurrency(stats.totalRevenue)}
                </div>
                <p className="text-[12px] text-muted-foreground flex items-center gap-1 mt-1">
                  <ArrowUpRight className="h-3 w-3 text-emerald-500" />
                  <span className="text-emerald-600">From {filterCounts.paid} paid invoices</span>
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-[14px] font-medium text-muted-foreground">
                  Pending Amount
                </CardTitle>
                <div className="h-8 w-8 rounded-md bg-amber-500/10 flex items-center justify-center">
                  <Clock className="h-4 w-4 text-amber-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-[24px] font-bold text-foreground">
                  {formatCurrency(stats.pendingAmount)}
                </div>
                <p className="text-[12px] text-muted-foreground flex items-center gap-1 mt-1">
                  <Clock className="h-3 w-3 text-amber-500" />
                  <span className="text-amber-600">{filterCounts.pending} awaiting payment</span>
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-[14px] font-medium text-muted-foreground">
                  Overdue Amount
                </CardTitle>
                <div className="h-8 w-8 rounded-md bg-red-500/10 flex items-center justify-center">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-[24px] font-bold text-[#DC2626]">
                  {formatCurrency(stats.overdueAmount)}
                </div>
                <p className="text-[12px] text-muted-foreground flex items-center gap-1 mt-1">
                  <AlertTriangle className="h-3 w-3 text-red-500" />
                  <span className="text-red-600">
                    {filterCounts.overdue} overdue invoice{filterCounts.overdue !== 1 ? "s" : ""}
                  </span>
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-[14px] font-medium text-muted-foreground">
                  Avg Payment Time
                </CardTitle>
                <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-[24px] font-bold text-foreground">
                  {stats.avgPaymentDays > 0 ? `${stats.avgPaymentDays.toFixed(0)} days` : "N/A"}
                </div>
                <p className="text-[12px] text-muted-foreground flex items-center gap-1 mt-1">
                  <Timer className="h-3 w-3 text-muted-foreground" />
                  Average time to receive payment
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Action Bar: Search + Create */}
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
          <Button
            className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
            onClick={() => setShowCreateDialog(true)}
          >
            <Plus className="h-4 w-4" />
            Create Invoice
          </Button>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1 mb-6 border-b border-border">
          {filterTabs.map((tab) => {
            const isActive = activeFilter === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveFilter(tab.key)}
                className={`pb-2 text-sm rounded-t-md px-3 transition-colors relative ${
                  isActive
                    ? "font-semibold text-foreground bg-primary/10 ring-1 ring-primary/30"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full ${
                    isActive
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {filterCounts[tab.key] ?? 0}
                </span>
                <div
                  className={`absolute bottom-0 left-0 right-0 h-[2px] ${
                    isActive ? "bg-primary" : "bg-transparent"
                  }`}
                />
              </button>
            );
          })}
        </div>

        {/* Invoice List */}
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {filteredInvoices.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <Card>
                  <CardContent className="py-12">
                    <div className="text-center text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-4 opacity-40" />
                      <p className="text-[16px] font-medium mb-1">No invoices found</p>
                      <p className="text-[14px]">
                        {searchQuery
                          ? "Try adjusting your search terms"
                          : "Create your first invoice to get started"}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              filteredInvoices.map((invoice, idx) => {
                const isExpanded = expandedInvoiceId === invoice.id;
                const config = statusConfig[invoice.status];
                const overdueDays =
                  invoice.status === "overdue" ? daysOverdue(invoice.dueDate) : 0;

                return (
                  <motion.div
                    key={invoice.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.25, delay: idx * 0.03 }}
                    layout
                  >
                    <Card className="overflow-hidden hover:shadow-md transition-shadow">
                      {/* Invoice Row */}
                      <div
                        className="cursor-pointer"
                        onClick={() =>
                          setExpandedInvoiceId(isExpanded ? null : invoice.id)
                        }
                      >
                        <CardContent className="p-4 sm:p-5">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            {/* Left section */}
                            <div className="flex items-start gap-3 min-w-0 flex-1">
                              <div
                                className={`h-9 w-9 rounded-md flex items-center justify-center flex-shrink-0 ${
                                  invoice.status === "paid"
                                    ? "bg-emerald-500/10"
                                    : invoice.status === "pending"
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
                                      : invoice.status === "pending"
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
                                  {invoice.status === "overdue" && overdueDays > 0 && (
                                    <span className="text-[11px] text-red-600 font-medium">
                                      {overdueDays}d overdue
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 mt-1 text-[13px] text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <User className="h-3 w-3" />
                                    {invoice.clientName}
                                  </span>
                                  <span className="hidden sm:flex items-center gap-1">
                                    <Briefcase className="h-3 w-3" />
                                    {invoice.projectName}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Right section */}
                            <div className="flex items-center gap-4 sm:gap-6">
                              <div className="text-right hidden sm:block">
                                <p className="text-[11px] text-muted-foreground">Issued</p>
                                <p className="text-[13px] text-foreground">
                                  {formatDate(invoice.date)}
                                </p>
                              </div>
                              <div className="text-right hidden sm:block">
                                <p className="text-[11px] text-muted-foreground">Due</p>
                                <p className="text-[13px] text-foreground">
                                  {formatDate(invoice.dueDate)}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-[18px] font-bold text-foreground">
                                  {formatCurrency(invoice.amount)}
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
                                      handleSendInvoice(invoice.id);
                                    }}
                                  >
                                    <Send className="h-3.5 w-3.5 text-primary" />
                                  </Button>
                                )}
                                {(invoice.status === "pending" ||
                                  invoice.status === "overdue") && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 px-2"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleMarkPaid(invoice.id);
                                    }}
                                  >
                                    <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
                                  </Button>
                                )}
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

                      {/* Expanded Detail */}
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
                                        {invoice.items.map((item, i) => (
                                          <tr
                                            key={i}
                                            className={
                                              i < invoice.items.length - 1
                                                ? "border-b border-border"
                                                : ""
                                            }
                                          >
                                            <td className="py-2.5 px-3 text-foreground">
                                              {item.description}
                                            </td>
                                            <td className="py-2.5 px-3 text-right text-muted-foreground">
                                              {item.quantity}
                                            </td>
                                            <td className="py-2.5 px-3 text-right text-muted-foreground">
                                              {formatCurrency(item.rate)}
                                            </td>
                                            <td className="py-2.5 px-3 text-right font-medium text-foreground">
                                              {formatCurrency(item.amount)}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                      <tfoot>
                                        <tr className="border-t border-border bg-muted/30">
                                          <td
                                            colSpan={3}
                                            className="py-2.5 px-3 text-right font-semibold text-foreground"
                                          >
                                            Total
                                          </td>
                                          <td className="py-2.5 px-3 text-right font-bold text-foreground">
                                            {formatCurrency(invoice.amount)}
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
                                      <p className="text-[11px] text-muted-foreground">
                                        Invoice #
                                      </p>
                                      <p className="text-[13px] font-medium text-foreground">
                                        {invoice.invoiceNumber}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                    <div>
                                      <p className="text-[11px] text-muted-foreground">
                                        {invoice.status === "paid"
                                          ? "Paid on"
                                          : "Due date"}
                                      </p>
                                      <p className="text-[13px] font-medium text-foreground">
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
                                        {invoice.clientName}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                                    <div>
                                      <p className="text-[11px] text-muted-foreground">
                                        Platform
                                      </p>
                                      <p className="text-[13px] font-medium text-foreground">
                                        {platformLabels[invoice.platform]}
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
                                      className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSendInvoice(invoice.id);
                                      }}
                                    >
                                      <Send className="h-3.5 w-3.5" />
                                      Send Invoice
                                    </Button>
                                  )}
                                  {(invoice.status === "pending" ||
                                    invoice.status === "overdue") && (
                                    <>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="gap-1.5 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleMarkPaid(invoice.id);
                                        }}
                                      >
                                        <DollarSign className="h-3.5 w-3.5" />
                                        Mark as Paid
                                      </Button>
                                      {invoice.status === "overdue" &&
                                        (subscriptionTier === "pro" ||
                                          subscriptionTier === "expert") && (
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="gap-1.5"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              toast.success(
                                                "Dispute report initiated for overdue invoice",
                                                {
                                                  description:
                                                    "Your compliance evidence is being compiled.",
                                                }
                                              );
                                            }}
                                          >
                                            <AlertTriangle className="h-3.5 w-3.5" />
                                            Generate Dispute Report
                                          </Button>
                                        )}
                                    </>
                                  )}
                                  {invoice.status === "paid" && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="gap-1.5"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toast.success("Downloading invoice PDF...", {
                                          description: invoice.invoiceNumber,
                                        });
                                      }}
                                    >
                                      <Download className="h-3.5 w-3.5" />
                                      Download PDF
                                    </Button>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="gap-1.5"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toast.info("More options coming soon");
                                    }}
                                  >
                                    <MoreHorizontal className="h-3.5 w-3.5" />
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

        {/* Subscription Upsell for free tier */}
        {subscriptionTier === "free" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
            className="mt-8"
          >
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-[16px] font-semibold text-foreground flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-primary" />
                      Unlock Invoice Protection
                    </h3>
                    <p className="text-[13px] text-muted-foreground mt-1">
                      Upgrade to Pro to generate dispute reports for overdue invoices and access
                      automated payment reminders.
                    </p>
                  </div>
                  <Button
                    className="bg-primary hover:bg-primary/90 text-primary-foreground flex-shrink-0"
                    onClick={() =>
                      toast.info("Navigate to Subscription page to upgrade")
                    }
                  >
                    Upgrade to Pro
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>

      {/* Create Invoice Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Create New Invoice
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Client & Project */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="clientName">
                  Client Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="clientName"
                  placeholder="e.g. TechCorp Solutions"
                  value={newInvoice.clientName}
                  onChange={(e) =>
                    setNewInvoice((prev) => ({ ...prev, clientName: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="projectName">
                  Project Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="projectName"
                  placeholder="e.g. Website Redesign"
                  value={newInvoice.projectName}
                  onChange={(e) =>
                    setNewInvoice((prev) => ({ ...prev, projectName: e.target.value }))
                  }
                />
              </div>
            </div>

            {/* Platform & Due Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Platform</Label>
                <Select
                  value={newInvoice.platform}
                  onValueChange={(val) =>
                    setNewInvoice((prev) => ({
                      ...prev,
                      platform: val as "upwork" | "fiverr" | "toptal" | "direct",
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="upwork">Upwork</SelectItem>
                    <SelectItem value="fiverr">Fiverr</SelectItem>
                    <SelectItem value="toptal">Toptal</SelectItem>
                    <SelectItem value="direct">Direct Client</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dueDate">
                  Due Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={newInvoice.dueDate}
                  onChange={(e) =>
                    setNewInvoice((prev) => ({ ...prev, dueDate: e.target.value }))
                  }
                />
              </div>
            </div>

            <Separator />

            {/* Line Items */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label className="text-[14px] font-semibold">Line Items</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-[12px] gap-1"
                  onClick={addNewItem}
                >
                  <Plus className="h-3 w-3" />
                  Add Item
                </Button>
              </div>
              <div className="space-y-3">
                {newInvoice.items.map((item, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-12 gap-2 items-end"
                  >
                    <div className="col-span-5">
                      {index === 0 && (
                        <p className="text-[11px] text-muted-foreground mb-1">Description</p>
                      )}
                      <Input
                        placeholder="Service description"
                        value={item.description}
                        onChange={(e) => updateNewItem(index, "description", e.target.value)}
                        className="h-8 text-[13px]"
                      />
                    </div>
                    <div className="col-span-2">
                      {index === 0 && (
                        <p className="text-[11px] text-muted-foreground mb-1">Qty</p>
                      )}
                      <Input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) =>
                          updateNewItem(index, "quantity", parseInt(e.target.value) || 0)
                        }
                        className="h-8 text-[13px]"
                      />
                    </div>
                    <div className="col-span-2">
                      {index === 0 && (
                        <p className="text-[11px] text-muted-foreground mb-1">Rate ($)</p>
                      )}
                      <Input
                        type="number"
                        min={0}
                        value={item.rate}
                        onChange={(e) =>
                          updateNewItem(index, "rate", parseFloat(e.target.value) || 0)
                        }
                        className="h-8 text-[13px]"
                      />
                    </div>
                    <div className="col-span-2">
                      {index === 0 && (
                        <p className="text-[11px] text-muted-foreground mb-1">Amount</p>
                      )}
                      <div className="h-8 px-3 flex items-center rounded-md border border-input bg-muted/50 text-[13px] font-medium text-foreground">
                        {formatCurrency(item.amount)}
                      </div>
                    </div>
                    <div className="col-span-1 flex items-center justify-center">
                      {newInvoice.items.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-red-500"
                          onClick={() => removeNewItem(index)}
                        >
                          &times;
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-end mt-3">
                <div className="text-right">
                  <p className="text-[12px] text-muted-foreground">Total</p>
                  <p className="text-[18px] font-bold text-foreground">
                    {formatCurrency(
                      newInvoice.items.reduce((sum, item) => sum + item.amount, 0)
                    )}
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Input
                id="notes"
                placeholder="Additional notes for this invoice..."
                value={newInvoice.notes}
                onChange={(e) =>
                  setNewInvoice((prev) => ({ ...prev, notes: e.target.value }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
            >
              Cancel
            </Button>
            <Button
              className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5"
              onClick={handleCreateInvoice}
            >
              <Plus className="h-4 w-4" />
              Create Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
