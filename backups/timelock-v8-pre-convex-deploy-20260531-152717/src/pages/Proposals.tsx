import { useState, useMemo, useCallback, useEffect } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FileText,
  Plus,
  Search,
  Send,
  Copy,
  Trash2,
  Eye,
  MoreVertical,
  DollarSign,
  CheckCircle2,
  Clock,
  FilePenLine,
  AlertCircle,
  TrendingUp,
  Mail,
} from "lucide-react";

type ProposalStatus = "draft" | "sent" | "viewed" | "signed" | "declined" | "expired";

interface ProposalSection {
  id: string;
  type: "heading" | "text" | "pricing" | "terms" | "milestone" | "divider";
  content: string;
  metadata?: any;
}

interface Proposal {
  _id: string;
  userId: string;
  title: string;
  status: ProposalStatus;
  clientName?: string;
  clientEmail?: string;
  totalValue: number;
  currency?: string;
  sections: ProposalSection[];
  sentAt?: number;
  viewedAt?: number;
  signedAt?: number;
  validUntil?: number;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

interface FollowUp {
  _id: string;
  dayNumber: number;
  subject: string;
  status: "scheduled" | "sent" | "skipped" | "cancelled";
  scheduledAt: number;
}

const statusConfig: Record<
  ProposalStatus,
  { label: string; className: string; icon: React.ElementType }
> = {
  draft: {
    label: "Draft",
    className: "bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/25 hover:bg-slate-500/25",
    icon: FilePenLine,
  },
  sent: {
    label: "Sent",
    className: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/25 hover:bg-blue-500/25",
    icon: Send,
  },
  viewed: {
    label: "Viewed",
    className: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25 hover:bg-amber-500/25",
    icon: Eye,
  },
  signed: {
    label: "Signed",
    className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25 hover:bg-emerald-500/25",
    icon: CheckCircle2,
  },
  declined: {
    label: "Declined",
    className: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/25 hover:bg-red-500/25",
    icon: AlertCircle,
  },
  expired: {
    label: "Expired",
    className: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/25 hover:bg-orange-500/25",
    icon: Clock,
  },
};

const filterTabs: { key: "all" | ProposalStatus; label: string }[] = [
  { key: "all", label: "All" },
  { key: "draft", label: "Draft" },
  { key: "sent", label: "Sent" },
  { key: "viewed", label: "Viewed" },
  { key: "signed", label: "Signed" },
  { key: "declined", label: "Declined" },
];

// ─── Mock Data ──────────────────────────────────────────────────────────────

const NOW = Date.now();
const DAY = 1000 * 60 * 60 * 24;

const MOCK_FOLLOW_UPS: Record<string, FollowUp[]> = {
  "prop-2": [
    { _id: "fu-1", dayNumber: 3, subject: "Following up on proposal", status: "scheduled", scheduledAt: NOW + 3 * DAY },
    { _id: "fu-2", dayNumber: 7, subject: "Checking in on proposal", status: "scheduled", scheduledAt: NOW + 7 * DAY },
  ],
  "prop-3": [
    { _id: "fu-3", dayNumber: 2, subject: "Any questions on the proposal?", status: "scheduled", scheduledAt: NOW + 2 * DAY },
  ],
};

const MOCK_PROPOSALS: Proposal[] = [
  {
    _id: "prop-1",
    userId: "user-1",
    title: "E-commerce Platform Redesign",
    status: "signed",
    clientName: "Acme Corp",
    clientEmail: "contact@acmecorp.com",
    totalValue: 28000,
    currency: "USD",
    sections: [
      { id: "s1", type: "heading", content: "Project Overview" },
      { id: "s2", type: "text", content: "Complete redesign of the e-commerce platform with modern UI/UX." },
      { id: "s3", type: "pricing", content: "Fixed price", metadata: { amount: 28000 } },
    ],
    sentAt: NOW - 20 * DAY,
    viewedAt: NOW - 18 * DAY,
    signedAt: NOW - 10 * DAY,
    validUntil: NOW - 5 * DAY,
    createdAt: NOW - 25 * DAY,
    updatedAt: NOW - 10 * DAY,
  },
  {
    _id: "prop-2",
    userId: "user-1",
    title: "Mobile Banking App",
    status: "sent",
    clientName: "FinTech Solutions",
    clientEmail: "deals@fintechsol.com",
    totalValue: 45000,
    currency: "USD",
    sections: [
      { id: "s4", type: "heading", content: "App Development" },
      { id: "s5", type: "text", content: "Full-stack mobile banking application for iOS and Android." },
      { id: "s6", type: "milestone", content: "Phase 1: MVP", metadata: { amount: 20000 } },
      { id: "s7", type: "milestone", content: "Phase 2: Full Features", metadata: { amount: 25000 } },
    ],
    sentAt: NOW - 5 * DAY,
    viewedAt: NOW - 3 * DAY,
    validUntil: NOW + 25 * DAY,
    createdAt: NOW - 12 * DAY,
    updatedAt: NOW - 3 * DAY,
  },
  {
    _id: "prop-3",
    userId: "user-1",
    title: "Brand Identity for HealthTech",
    status: "viewed",
    clientName: "MediTech Inc",
    clientEmail: "marketing@meditech.io",
    totalValue: 12000,
    currency: "USD",
    sections: [
      { id: "s8", type: "heading", content: "Brand Identity Package" },
      { id: "s9", type: "text", content: "Complete brand identity including logo, color palette, and guidelines." },
      { id: "s10", type: "pricing", content: "Fixed price", metadata: { amount: 12000 } },
    ],
    sentAt: NOW - 7 * DAY,
    viewedAt: NOW - 4 * DAY,
    validUntil: NOW + 23 * DAY,
    createdAt: NOW - 15 * DAY,
    updatedAt: NOW - 4 * DAY,
  },
  {
    _id: "prop-4",
    userId: "user-1",
    title: "Data Analytics Dashboard",
    status: "draft",
    clientName: "DataViz Co",
    clientEmail: "info@dataviz.co",
    totalValue: 20000,
    currency: "USD",
    sections: [
      { id: "s11", type: "heading", content: "Dashboard Development" },
      { id: "s12", type: "text", content: "Real-time analytics dashboard with custom visualizations." },
    ],
    validUntil: NOW + 30 * DAY,
    createdAt: NOW - 3 * DAY,
    updatedAt: NOW - 1 * DAY,
  },
  {
    _id: "prop-5",
    userId: "user-1",
    title: "Social Platform MVP",
    status: "declined",
    clientName: "SocialNext",
    clientEmail: "hello@socialnext.app",
    totalValue: 35000,
    currency: "USD",
    sections: [
      { id: "s13", type: "heading", content: "MVP Development" },
      { id: "s14", type: "text", content: "Social networking platform MVP with core features." },
      { id: "s15", type: "pricing", content: "Fixed price", metadata: { amount: 35000 } },
    ],
    sentAt: NOW - 30 * DAY,
    viewedAt: NOW - 28 * DAY,
    validUntil: NOW - 10 * DAY,
    notes: "Client decided to go with an in-house team instead.",
    createdAt: NOW - 35 * DAY,
    updatedAt: NOW - 15 * DAY,
  },
];

export default function Proposals() {
  const navigate = useNavigate();
  const [proposals, setProposals] = useState<Proposal[]>(() => {
    try {
      const stored = localStorage.getItem("axia_proposals");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return MOCK_PROPOSALS;
  });
  const [activeFilter, setActiveFilter] = useState<"all" | ProposalStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteDialogId, setDeleteDialogId] = useState<string | null>(null);

  // Filter counts (from all proposals for the tab badges)
  const filterCounts = useMemo(() => {
    const counts: Record<string, number> = { all: proposals.length };
    for (const p of proposals) {
      counts[p.status] = (counts[p.status] || 0) + 1;
    }
    return counts;
  }, [proposals]);

  // Stats
  const stats = useMemo(() => {
    const signed = proposals.filter((p) => p.status === "signed");
    const sent = proposals.filter((p) => p.status === "sent");
    const draft = proposals.filter((p) => p.status === "draft");
    const totalValue = proposals.reduce((sum, p) => sum + p.totalValue, 0);
    const signatureRate = signed.length + proposals.filter((p) => p.status === "declined").length > 0
      ? Math.round((signed.length / (signed.length + proposals.filter((p) => p.status === "declined").length)) * 100)
      : signed.length > 0 ? 100 : 0;
    return {
      total: proposals.length,
      sent: sent.length,
      signed: signed.length,
      draft: draft.length,
      signatureRate,
      totalValue,
    };
  }, [proposals]);

  // Filtered + searched proposals
  const filteredProposals = useMemo(() => {
    return proposals.filter((p) => {
      const matchesFilter = activeFilter === "all" || p.status === activeFilter;
      const matchesSearch =
        searchQuery === "" ||
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.clientName && p.clientName.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesFilter && matchesSearch;
    });
  }, [proposals, activeFilter, searchQuery]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);

  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  // Persist proposals to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem("axia_proposals", JSON.stringify(proposals));
    } catch {}
  }, [proposals]);

  const handleSend = useCallback((proposalId: string) => {
    try {
      setProposals((prev) =>
        prev.map((p) =>
          p._id === proposalId
            ? { ...p, status: "sent" as ProposalStatus, sentAt: Date.now(), updatedAt: Date.now() }
            : p
        )
      );
      toast.success("Proposal sent!", {
        description: "Follow-ups have been scheduled automatically.",
      });
    } catch (err: any) {
      toast.error("Failed to send proposal", { description: err.message });
    }
  }, []);

  const handleDuplicate = useCallback((proposalId: string) => {
    try {
      const original = proposals.find((p) => p._id === proposalId);
      if (!original) return;
      const newProposal: Proposal = {
        ...original,
        _id: `prop-${Date.now()}`,
        title: `${original.title} (Copy)`,
        status: "draft",
        sentAt: undefined,
        viewedAt: undefined,
        signedAt: undefined,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setProposals((prev) => [...prev, newProposal]);
      toast.success("Proposal duplicated!", {
        description: "A draft copy has been created.",
      });
    } catch (err: any) {
      toast.error("Failed to duplicate proposal", { description: err.message });
    }
  }, [proposals]);

  const handleDelete = useCallback((proposalId: string) => {
    try {
      setProposals((prev) => prev.filter((p) => p._id !== proposalId));
      setDeleteDialogId(null);
      toast.success("Proposal deleted");
    } catch (err: any) {
      toast.error("Failed to delete proposal", { description: err.message });
    }
  }, []);

  return (
    <motion.div
      className="flex-1 min-h-screen bg-background text-foreground transition-colors"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-[32px] font-bold text-foreground tracking-tight mb-1" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
              Proposals
            </h1>
            <p className="text-[16px] text-muted-foreground">
              Create, send, and track proposals with automated follow-ups
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white gap-2"
              onClick={() => navigate("/proposals/new")}
            >
              <Plus className="h-4 w-4" />
              Create Proposal
            </Button>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {[
            {
              title: "Total",
              value: stats.total,
              icon: FileText,
              color: "text-[#8B5CF6]",
              bgColor: "bg-[#8B5CF6]/10",
              format: (v: number) => String(v),
            },
            {
              title: "Sent",
              value: stats.sent,
              icon: Send,
              color: "text-blue-600",
              bgColor: "bg-blue-500/10",
              format: (v: number) => String(v),
            },
            {
              title: "Signed",
              value: stats.signed,
              icon: CheckCircle2,
              color: "text-emerald-600",
              bgColor: "bg-emerald-500/10",
              format: (v: number) => String(v),
            },
            {
              title: "Draft",
              value: stats.draft,
              icon: FilePenLine,
              color: "text-slate-600 dark:text-slate-400",
              bgColor: "bg-slate-500/10",
              format: (v: number) => String(v),
            },
            {
              title: "Signature Rate",
              value: stats.signatureRate,
              icon: TrendingUp,
              color: "text-amber-600",
              bgColor: "bg-amber-500/10",
              format: (v: number) => `${v}%`,
            },
            {
              title: "Total Value",
              value: stats.totalValue,
              icon: DollarSign,
              color: "text-emerald-600",
              bgColor: "bg-emerald-500/10",
              format: (v: number) => formatCurrency(v),
            },
          ].map((stat, idx) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: idx * 0.05 }}
            >
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 px-4 pt-4">
                  <CardTitle className="text-[12px] font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <div className={`h-7 w-7 rounded-md ${stat.bgColor} flex items-center justify-center`}>
                    <stat.icon className={`h-3.5 w-3.5 ${stat.color}`} />
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-3">
                  <div className="text-[20px] font-bold text-foreground">
                    {stat.format(stat.value)}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Action Bar: Search */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by title or client..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1 mb-6 border-b border-border overflow-x-auto">
          {filterTabs.map((tab) => {
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

        {/* Proposal Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredProposals.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="col-span-full"
              >
                <Card>
                  <CardContent className="py-16">
                    <div className="text-center text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-4 opacity-40" />
                      <p className="text-[16px] font-medium mb-1">No proposals found</p>
                      <p className="text-[14px] mb-4">
                        {searchQuery
                          ? "Try adjusting your search terms"
                          : "Create your first proposal or seed sample data"}
                      </p>
                      {!searchQuery && (
                        <div className="flex items-center justify-center gap-3">
                          <Button
                            className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white gap-2"
                            onClick={() => navigate("/proposals/new")}
                          >
                            <Plus className="h-4 w-4" />
                            Create Proposal
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              filteredProposals.map((proposal, idx) => (
                <ProposalCard
                  key={proposal._id}
                  proposal={proposal}
                  idx={idx}
                  formatCurrency={formatCurrency}
                  formatDate={formatDate}
                  onSend={handleSend}
                  onDuplicate={handleDuplicate}
                  onDelete={setDeleteDialogId}
                  onView={() => navigate(`/proposals/new?edit=${proposal._id}`)}
                />
              ))
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteDialogId} onOpenChange={() => setDeleteDialogId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Proposal</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this proposal? This action cannot be undone. All associated follow-ups will also be removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteDialogId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteDialogId && handleDelete(deleteDialogId)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

// ─── Proposal Card Component ──────────────────────────────────────────────────

function ProposalCard({
  proposal,
  idx,
  formatCurrency,
  formatDate,
  onSend,
  onDuplicate,
  onDelete,
  onView,
}: {
  proposal: Proposal;
  idx: number;
  formatCurrency: (a: number) => string;
  formatDate: (t: number) => string;
  onSend: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onView: () => void;
}) {
  const config = statusConfig[proposal.status];
  const StatusIcon = config.icon;

  // Get mock follow-ups for this proposal
  const followUps = MOCK_FOLLOW_UPS[proposal._id] ?? [];
  const scheduledFollowUps = useMemo(
    () => followUps.filter((f) => f.status === "scheduled"),
    [followUps]
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3, delay: idx * 0.04 }}
      layout
    >
      <Card className="group hover:shadow-lg transition-all duration-200 hover:border-[#8B5CF6]/30 overflow-hidden">
        <CardContent className="p-5">
          {/* Top Row: Status + Actions */}
          <div className="flex items-start justify-between mb-3">
            <Badge
              variant="outline"
              className={`text-[11px] px-2.5 py-0.5 h-6 font-medium ${config.className}`}
            >
              <StatusIcon className="h-3 w-3 mr-1" />
              {config.label}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                {proposal.status === "draft" && (
                  <DropdownMenuItem
                    onClick={() => onSend(proposal._id)}
                    className="gap-2 cursor-pointer"
                  >
                    <Send className="h-3.5 w-3.5" />
                    Send Proposal
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={onView} className="gap-2 cursor-pointer">
                  <Eye className="h-3.5 w-3.5" />
                  {proposal.status === "draft" ? "Edit" : "View"}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDuplicate(proposal._id)}
                  className="gap-2 cursor-pointer"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDelete(proposal._id)}
                  className="gap-2 cursor-pointer text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Title */}
          <h3
            className="text-[16px] font-bold text-foreground mb-1 line-clamp-2 cursor-pointer hover:text-[#8B5CF6] transition-colors"
            style={{ fontFamily: "Space Grotesk, sans-serif" }}
            onClick={onView}
          >
            {proposal.title}
          </h3>

          {/* Client */}
          {proposal.clientName && (
            <p className="text-[13px] text-muted-foreground mb-3 flex items-center gap-1.5">
              <Mail className="h-3 w-3" />
              {proposal.clientName}
            </p>
          )}

          {/* Value */}
          <div className="flex items-baseline gap-1.5 mb-3">
            <span className="text-[22px] font-bold text-foreground">
              {formatCurrency(proposal.totalValue)}
            </span>
            {proposal.currency && proposal.currency !== "USD" && (
              <span className="text-[12px] text-muted-foreground">{proposal.currency}</span>
            )}
          </div>

          {/* Dates Row */}
          <div className="flex items-center gap-3 text-[12px] text-muted-foreground mb-3">
            {proposal.sentAt && (
              <span className="flex items-center gap-1">
                <Send className="h-3 w-3" />
                Sent {formatDate(proposal.sentAt)}
              </span>
            )}
            {proposal.viewedAt && (
              <span className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                Viewed
              </span>
            )}
            {proposal.signedAt && (
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-3 w-3" />
                Signed {formatDate(proposal.signedAt)}
              </span>
            )}
          </div>

          {/* Follow-up Badge */}
          {scheduledFollowUps.length > 0 && (
            <div className="flex items-center gap-1.5 text-[11px] text-[#8B5CF6] bg-[#8B5CF6]/10 rounded-md px-2 py-1 w-fit">
              <Clock className="h-3 w-3" />
              <span>{scheduledFollowUps.length} follow-up{scheduledFollowUps.length !== 1 ? "s" : ""} scheduled</span>
            </div>
          )}

          {/* Quick Actions for Draft */}
          {proposal.status === "draft" && (
            <div className="mt-3 pt-3 border-t border-border flex items-center gap-2">
              <Button
                size="sm"
                className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white gap-1.5 h-8 text-[12px]"
                onClick={() => onSend(proposal._id)}
              >
                <Send className="h-3 w-3" />
                Send
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 h-8 text-[12px]"
                onClick={onView}
              >
                <FilePenLine className="h-3 w-3" />
                Edit
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
