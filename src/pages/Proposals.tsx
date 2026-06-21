import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryTimeout, useConvexConnectionState } from "@/lib/safe-convex-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useWorkspaceContext } from "@/hooks/use-workspace";
import { useWorkspacePermissions, usePermissions } from "@/hooks/use-permissions";
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
  Sparkles,
  TrendingUp,
  Mail,
  Loader2,
  Briefcase,
  ShieldCheck,
  Share2,
} from "lucide-react";
import { ShareDialog } from "@/components/ShareDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { PageLayout } from "@/components/design-system/PageLayout";
import { ManualSendDialog } from "@/components/manual-send/ManualSendDialog";
import { DownloadPDFButton } from "@/components/pdf/DownloadPDFButton";


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

// ─── Component ───────────────────────────────────────────────────────────────

export default function Proposals() {
  const navigate = useNavigate();

  // ── Workspace Context ──
  const { activeWorkspaceId, isConvexConnected } = useWorkspaceContext();
  const workspaceId = isConvexConnected ? (activeWorkspaceId as Id<"workspaces">) : undefined;

  // ── Permissions ──
  const { canDeleteRecords, canShareRecords } = useWorkspacePermissions();

  const [activeFilter, setActiveFilter] = useState<"all" | ProposalStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteDialogId, setDeleteDialogId] = useState<string | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [shareProposalId, setShareProposalId] = useState<string | null>(null);
  const [sharingRecord, setSharingRecord] = useState<{id: string, type: string, sharing: any[]} | null>(null);

  // ── Phase 1: Manual send dialog state ──
  // When the user clicks "Mark as sent" or "Log another send", we open the
  // ManualSendDialog with the target proposal's context.
  const [manualSendProposal, setManualSendProposal] = useState<{
    id: string;
    title: string;
    defaultRecipient?: string;
  } | null>(null);

  // ── Convex mutations for sharing ──
  const shareRecordMutation = useMutation(api.permissions.shareRecord.shareRecord);
  const unshareRecordMutation = useMutation(api.permissions.shareRecord.unshareRecord);

  // Convex queries
  const convexProposals = useQuery(api.proposals.crud.getProposals, workspaceId ? (activeFilter === "all" ? { workspaceId } : { workspaceId, status: activeFilter }) : "skip") as Proposal[] | undefined;
  const convexStats = useQuery(api.proposals.crud.getProposalStats, workspaceId ? { workspaceId } : "skip") as {
    total: number;
    sent: number;
    signed: number;
    draft: number;
    signatureRate: number;
    totalValue: number;
  } | undefined;

  // Convex mutations
  const sendProposal = useMutation(api.proposals.crud.sendProposal);
  const duplicateProposal = useMutation(api.proposals.crud.duplicateProposal);
  const deleteProposal = useMutation(api.proposals.crud.deleteProposal);
  const seedMockProposals = useMutation(api.seedNew.seedMockProposals);

  // Mutations for Convert-to-Project flow
  const createClientMutation = useMutation(api.clients.crud.createClient);
  const addProjectMutation = useMutation(api.projects.projectProtectionSimple.addProject);
  const moveDealMutation = useMutation(api.pipeline.crud.moveDeal);
  const updateProposalMutation = useMutation(api.proposals.crud.updateProposal);

  // Fetch pipeline stages (to find "Won" stage for deal conversion)
  const pipelineStages = useQuery(api.pipeline.crud.getStages, workspaceId ? { workspaceId } : "skip") as { _id: string; name: string }[] | undefined;

  // Fetch existing clients (to check if client already exists)
  const existingClients = useQuery(api.clients.crud.getClients, workspaceId ? { workspaceId } : "skip") as { _id: string; clientName: string; contactEmail?: string }[] | undefined;

  // Filter counts (from all proposals for the tab badges)
  const convexAllProposals = useQuery(api.proposals.crud.getProposals, workspaceId ? { workspaceId } : "skip") as Proposal[] | undefined;

  const { isDisconnected } = useConvexConnectionState();
  const isLoading = convexProposals === undefined || convexStats === undefined;
  const timedOut = useQueryTimeout(isLoading, 3000);
  const showLoading = isLoading && !timedOut && !isDisconnected;

  // Use Convex data only
  const proposals = useMemo(() => {
    return convexProposals ?? [];
  }, [convexProposals]);

  const stats = useMemo(() => {
    return convexStats ?? { total: 0, sent: 0, signed: 0, draft: 0, signatureRate: 0, totalValue: 0 };
  }, [convexStats]);

  const allProposals = useMemo(() => {
    return convexAllProposals ?? [];
  }, [convexAllProposals]);

  const filterCounts = useMemo(() => {
    const counts: Record<string, number> = { all: allProposals.length };
    for (const p of allProposals) {
      counts[p.status] = (counts[p.status] || 0) + 1;
    }
    return counts;
  }, [allProposals]);

  // Filtered + searched proposals
  const filteredProposals = useMemo(() => {
    if (!proposals) return [];
    return proposals.filter((p) => {
      if (searchQuery === "") return true;
      const q = searchQuery.toLowerCase();
      return (
        p.title.toLowerCase().includes(q) ||
        (p.clientName && p.clientName.toLowerCase().includes(q))
      );
    });
  }, [proposals, searchQuery]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);

  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const handleSeed = async () => {
    setIsSeeding(true);
    try {
      const result = await seedMockProposals({});
      if (result && typeof result === "object" && "seeded" in result) {
        if ((result as any).seeded) {
          toast.success("Mock proposals seeded!", {
            description: `${(result as any).count} proposals created.`,
          });
        } else {
          toast.info("Proposals already exist", {
            description: `${(result as any).count} proposals found.`,
          });
        }
      }
    } catch (err: any) {
      toast.error("Failed to seed proposals", { description: err.message });
    } finally {
      setIsSeeding(false);
    }
  };

  const handleSend = async (proposalId: string) => {
    try {
      await sendProposal({ proposalId: proposalId as any });
      toast.success("Proposal sent!", {
        description: "Follow-ups have been scheduled automatically.",
      });
    } catch (err: any) {
      toast.error("Failed to send proposal", { description: err.message });
    }
  };

  // Phase 1: open the ManualSendDialog when the user clicks "Mark as sent"
  // or "Log another send". The dialog collects channel + recipient + notes
  // and calls the logProposalManualSend mutation which atomically flips the
  // status, inserts an audit log row, schedules follow-ups, and dismisses
  // any triggering notification.
  const handleOpenManualSend = (proposal: Proposal) => {
    setManualSendProposal({
      id: proposal._id,
      title: proposal.title,
      defaultRecipient: proposal.clientEmail || proposal.clientName || "",
    });
  };

  const handleDuplicate = async (proposalId: string) => {
    try {
      const newId = await duplicateProposal({ proposalId: proposalId as any });
      toast.success("Proposal duplicated!", {
        description: "A draft copy has been created.",
      });
    } catch (err: any) {
      toast.error("Failed to duplicate proposal", { description: err.message });
    }
  };

  const handleDelete = async (proposalId: string) => {
    try {
      await deleteProposal({ proposalId: proposalId as any });
      setDeleteDialogId(null);
      toast.success("Proposal deleted");
    } catch (err: any) {
      toast.error("Failed to delete proposal", { description: err.message });
    }
  };

  const handleConvertToProject = async (proposal: Proposal) => {
    try {
      // Step 1: Find or create the client
      const clientName = proposal.clientName || "Unknown Client";
      const clientEmail = proposal.clientEmail;
      let clientId: string | undefined;

      // Check if a client with this name already exists
      const existingClient = existingClients?.find(
        (c) => c.clientName.toLowerCase() === clientName.toLowerCase()
      );

      if (existingClient) {
        clientId = existingClient._id;
      } else {
        // Create a new client
        const newClientId = await createClientMutation({
          clientName,
          platform: "direct" as const,
          hourlyRate: proposal.totalValue > 0 ? proposal.totalValue / 40 : 50,
          contractType: "hourly" as const,
          contactEmail: clientEmail,
          contactName: clientName,
          workspaceId,
          notes: `Created from proposal: ${proposal.title}`,
        });
        clientId = newClientId as unknown as string;
      }

      if (!clientId) {
        throw new Error("Failed to resolve client ID");
      }

      // Step 2: Create the project
      await addProjectMutation({
        projectName: proposal.title,
        clientId: clientId as any,
        hourlyRate: proposal.totalValue > 0 ? proposal.totalValue / 40 : 50,
        projectType: "ongoing" as const,
        protectionLevel: "enhanced" as const,
        workspaceId,
      });

      // Step 3: If proposal has a dealId, move the deal to "Won" stage
      const dealId = (proposal as any).dealId;
      if (dealId && pipelineStages) {
        const wonStage = pipelineStages.find(
          (s) => s.name.toLowerCase() === "won"
        );
        if (wonStage) {
          await moveDealMutation({
            dealId: dealId as any,
            stageId: wonStage._id as any,
          });
        }
      }

      // Step 4: Update proposal notes to indicate conversion
      const existingNotes = proposal.notes || "";
      await updateProposalMutation({
        proposalId: proposal._id as any,
        notes: `${existingNotes ? existingNotes + "\n" : ""}[Converted to project — ${new Date().toLocaleDateString()}]`,
      });

      toast.success("Project created!", {
        description: `"${proposal.title}" has been converted to a project.`,
      });
    } catch (err: any) {
      toast.error("Failed to convert to project", { description: err.message });
    }
  };

  return (
    <motion.div
      className="flex-1 min-h-screen bg-background text-foreground transition-colors"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <PageLayout wide>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-[32px] font-bold text-foreground tracking-tight mb-1" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
              Proposals
            </h1>
            <p className="text-[16px] text-muted-foreground">
              Create, send, and track proposals with automated follow-ups
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-muted-foreground"
              onClick={handleSeed}
              disabled={isSeeding}
            >
              {isSeeding ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Seed Data
            </Button>
            <Button
              className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white gap-2"
              onClick={() => navigate("/proposals/new")}
            >
              <Plus className="h-4 w-4" />
              Create Proposal
            </Button>
          </div>
        </div>

        {/* Loading State */}
        {showLoading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 px-4 pt-4">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-4" />
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <Skeleton className="h-6 w-12 mb-1" />
                  </CardContent>
                </Card>
              ))}
            </div>
            <Skeleton className="h-10 rounded-lg" />
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-[100px] rounded-xl" />
              ))}
            </div>
          </div>
        ) : (
          <>
        {/* Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {[
            {
              title: "Total",
              value: stats?.total ?? 0,
              icon: FileText,
              color: "text-[#8B5CF6]",
              bgColor: "bg-[#8B5CF6]/10",
              format: (v: number) => String(v),
            },
            {
              title: "Sent",
              value: stats?.sent ?? 0,
              icon: Send,
              color: "text-blue-600",
              bgColor: "bg-blue-500/10",
              format: (v: number) => String(v),
            },
            {
              title: "Signed",
              value: stats?.signed ?? 0,
              icon: CheckCircle2,
              color: "text-emerald-600",
              bgColor: "bg-emerald-500/10",
              format: (v: number) => String(v),
            },
            {
              title: "Draft",
              value: stats?.draft ?? 0,
              icon: FilePenLine,
              color: "text-slate-600 dark:text-slate-400",
              bgColor: "bg-slate-500/10",
              format: (v: number) => String(v),
            },
            {
              title: "Signature Rate",
              value: stats?.signatureRate ?? 0,
              icon: TrendingUp,
              color: "text-amber-600",
              bgColor: "bg-amber-500/10",
              format: (v: number) => `${v}%`,
            },
            {
              title: "Total Value",
              value: stats?.totalValue ?? 0,
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
              className="pl-9"
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
                            variant="outline"
                            className="gap-2"
                            onClick={handleSeed}
                            disabled={isSeeding}
                          >
                            <Sparkles className="h-4 w-4" />
                            Seed Sample Data
                          </Button>
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
                  isMock={false}
                  formatCurrency={formatCurrency}
                  formatDate={formatDate}
                  onSend={handleSend}
                  onMarkAsSent={() => handleOpenManualSend(proposal)}
                  onDuplicate={handleDuplicate}
                  onDelete={canDeleteRecords ? setDeleteDialogId : () => {}}
                  onView={() => navigate(`/proposals/new?edit=${proposal._id}`)}
                  onShare={canShareRecords ? (id: string) => {
                    const p = proposals.find((p: any) => p._id === id);
                    if (canShareRecords) {
                      setSharingRecord({
                        id,
                        type: "proposal",
                        sharing: (p as any)?.sharing || [],
                      });
                      setShareProposalId(id);
                      setShowShareDialog(true);
                    }
                  } : () => {}}
                  canDelete={canDeleteRecords}
                  canShare={canShareRecords}
                  onConvertToProject={handleConvertToProject}
                />
              ))
            )}
          </AnimatePresence>
        </div>
        </>
        )}
      </PageLayout>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteDialogId} onOpenChange={() => setDeleteDialogId(null)}>
        <DialogContent className="sm:max-w-md">
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

      {/* Share Dialog */}
      <ShareDialog
        open={showShareDialog}
        onOpenChange={setShowShareDialog}
        recordId={sharingRecord?.id || shareProposalId || ""}
        recordType={sharingRecord?.type || "proposal"}
        currentSharing={sharingRecord?.sharing || []}
        onShare={async (args) => {
          try {
            if (shareRecordMutation) {
              await shareRecordMutation({
                recordId: sharingRecord?.id || shareProposalId,
                recordType: sharingRecord?.type || "proposal",
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
                recordId: sharingRecord?.id || shareProposalId,
                recordType: sharingRecord?.type || "proposal",
                ...args,
              });
            }
            toast.success("Access removed");
          } catch (err: any) {
            toast.error(err?.message || "Failed to remove access");
          }
        }}
      />

      {/* Phase 1: Manual Send Dialog — opens when user clicks "Mark as sent" or "Log another send" */}
      <ManualSendDialog
        open={!!manualSendProposal}
        onOpenChange={(open) => {
          if (!open) setManualSendProposal(null);
        }}
        entityType="proposal"
        entityId={manualSendProposal?.id ?? ""}
        entityTitle={manualSendProposal?.title ?? ""}
        defaultRecipient={manualSendProposal?.defaultRecipient}
        onSuccess={() => {
          toast.success("Send logged", {
            description: "Status updated, follow-ups scheduled, audit trail recorded.",
          });
        }}
      />
    </motion.div>
  );
}

// ─── Proposal Card Component ──────────────────────────────────────────────────

function ProposalCard({
  proposal,
  idx,
  isMock,
  formatCurrency,
  formatDate,
  onSend,
  onMarkAsSent,
  onDuplicate,
  onDelete,
  onView,
  onShare,
  onConvertToProject,
  canDelete,
  canShare,
}: {
  proposal: Proposal;
  idx: number;
  isMock: boolean;
  formatCurrency: (a: number) => string;
  formatDate: (t: number) => string;
  onSend: (id: string) => void;
  onMarkAsSent?: () => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onView: () => void;
  onShare?: (id: string) => void;
  onConvertToProject?: (proposal: Proposal) => void;
  canDelete?: boolean;
  canShare?: boolean;
}) {
  const navigate = useNavigate();
  const config = statusConfig[proposal.status];
  const StatusIcon = config.icon;

  // Fetch follow-ups for this proposal — skip when using mock data
  // because mock IDs (e.g. "prop_1") are not valid Convex Id<"proposals"> values
  // and would cause useQuery to throw a server validation error.
  const followUps = useQuery(
    api.proposals.crud.getFollowUps,
    isMock ? "skip" : { proposalId: proposal._id as any }
  ) as FollowUp[] | undefined;

  const scheduledFollowUps = useMemo(
    () => (followUps ? followUps.filter((f) => f.status === "scheduled") : []),
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
      <Card className="group hover:shadow-lg transition-all duration-200 hover:border-[#8B5CF6]/30 overflow-hidden h-full flex flex-col">
        <CardContent className="p-5 flex flex-col flex-1">
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
                {canShare && (
                  <DropdownMenuItem
                    onClick={() => onShare?.(proposal._id)}
                    className="gap-2 cursor-pointer"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                    Share
                  </DropdownMenuItem>
                )}
                {canDelete && (
                  <DropdownMenuItem
                    onClick={() => onDelete(proposal._id)}
                    className="gap-2 cursor-pointer text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </DropdownMenuItem>
                )}
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

          {/* Quick Actions for Draft — Phase 1 manual-send workflow */}
          {proposal.status === "draft" && (
            <div className="mt-3 pt-3 border-t border-border flex items-center gap-2 flex-wrap">
              <Button
                size="sm"
                className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white gap-1.5 h-8 text-[12px]"
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkAsSent?.();
                }}
              >
                <Send className="h-3 w-3" />
                Mark as sent
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 h-8 text-[12px]"
                onClick={(e) => {
                  e.stopPropagation();
                  onSend(proposal._id);
                }}
                title="Generate a shareable public link"
              >
                <Share2 className="h-3 w-3" />
                Share link
              </Button>
              <DownloadPDFButton
                document={proposal as any}
                type="proposal"
                variant="outline"
                size="sm"
                className="h-8 text-[12px] gap-1.5"
                label="Download PDF"
              />
            </div>
          )}

          {/* Quick Actions for Sent / Viewed — Log another send + Download PDF */}
          {(proposal.status === "sent" || proposal.status === "viewed") && (
            <div className="mt-3 pt-3 border-t border-border flex items-center gap-2 flex-wrap">
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 h-8 text-[12px]"
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkAsSent?.();
                }}
              >
                <Send className="h-3 w-3" />
                Log another send
              </Button>
              <DownloadPDFButton
                document={proposal as any}
                type="proposal"
                variant="outline"
                size="sm"
                className="h-8 text-[12px] gap-1.5"
                label="Download PDF"
              />
            </div>
          )}

          {/* Quick Actions for Signed — Convert to Project + Define Scope + Download PDF */}
          {proposal.status === "signed" && (
            <div className="mt-3 pt-3 border-t border-border flex items-center gap-2 flex-wrap">
              <Button
                size="sm"
                className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white gap-1.5 h-8 text-[12px]"
                onClick={(e) => {
                  e.stopPropagation();
                  onConvertToProject?.(proposal);
                }}
              >
                <Briefcase className="h-3 w-3" />
                Convert to Project
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 h-8 text-[12px]"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/scope?proposalId=${proposal._id}`);
                }}
              >
                <ShieldCheck className="h-3 w-3" />
                Define Scope
              </Button>
              <DownloadPDFButton
                document={proposal as any}
                type="proposal"
                variant="outline"
                size="sm"
                className="h-8 text-[12px] gap-1.5"
                label="Download PDF"
              />
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
