import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@/lib/safe-convex-react";
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
  Bell,
  BellRing,
  CalendarClock,
  PlusCircle,
  X,
  SkipForward,
  Play,
  Square,
  Settings2,
} from "lucide-react";
import { ShareDialog } from "@/components/ShareDialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";


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

// ─── Mock Data (fallback when Convex returns empty) ─────────────────────────

const mockNow = Date.now();
const mockDay = 86400000;

const MOCK_PROPOSALS: Proposal[] = [
  // Signed
  { _id: "prop_1", userId: "", title: "TechCorp Phase 2 — CMS & Marketing Automation", status: "signed", clientName: "David Chen", clientEmail: "david.chen@techcorp.io", totalValue: 15000, sections: [{ id: "1", type: "heading", content: "TechCorp Phase 2" }, { id: "2", type: "text", content: "CMS integration, marketing automation workflows, and analytics dashboard." }, { id: "3", type: "pricing", content: "Phase 2 Package", metadata: { items: [{ name: "CMS Integration", price: 5000 }, { name: "Marketing Automation", price: 4000 }, { name: "Analytics Dashboard", price: 3500 }, { name: "QA & Deployment", price: 2500 }] } }, { id: "4", type: "terms", content: "30% upfront, 40% at CMS milestone, 30% on delivery." }], sentAt: mockNow - 20 * mockDay, viewedAt: mockNow - 18 * mockDay, signedAt: mockNow - 10 * mockDay, createdAt: mockNow - 25 * mockDay, updatedAt: mockNow },
  { _id: "prop_6", userId: "", title: "E-Commerce Platform Redesign", status: "signed", clientName: "Acme Corp", clientEmail: "sarah@acmecorp.com", totalValue: 28000, sections: [{ id: "1", type: "heading", content: "E-Commerce Redesign" }, { id: "2", type: "text", content: "Complete redesign with modern UX, mobile-first approach, and optimized checkout." }], sentAt: mockNow - 25 * mockDay, viewedAt: mockNow - 22 * mockDay, signedAt: mockNow - 12 * mockDay, createdAt: mockNow - 30 * mockDay, updatedAt: mockNow },
  { _id: "prop_10", userId: "", title: "DigiMark Brand Identity Package", status: "signed", clientName: "Lisa Park", clientEmail: "lisa@digitalmarketingco.com", totalValue: 3200, sections: [{ id: "1", type: "heading", content: "Brand Identity" }, { id: "2", type: "text", content: "Complete brand identity refresh including logo, color palette, and guidelines." }], sentAt: mockNow - 15 * mockDay, viewedAt: mockNow - 14 * mockDay, signedAt: mockNow - 8 * mockDay, createdAt: mockNow - 18 * mockDay, updatedAt: mockNow },
  // Sent
  { _id: "prop_2", userId: "", title: "Mobile Banking App — Full Development", status: "sent", clientName: "Michael Torres", clientEmail: "cto@finserve.io", totalValue: 25000, sections: [{ id: "1", type: "heading", content: "FinServe Mobile Banking" }, { id: "2", type: "text", content: "Secure mobile banking app with biometric auth and real-time transactions." }, { id: "3", type: "pricing", content: "Enterprise Package", metadata: { items: [{ name: "React Native App", price: 12000 }, { name: "Backend API & Security", price: 8000 }, { name: "Admin Dashboard", price: 3000 }, { name: "Penetration Testing", price: 2000 }] } }], sentAt: mockNow - 5 * mockDay, viewedAt: mockNow - 3 * mockDay, createdAt: mockNow - 10 * mockDay, updatedAt: mockNow },
  { _id: "prop_9", userId: "", title: "Insurance Claims Processing Platform", status: "sent", clientName: "Vikram Mehta", clientEmail: "vikram@insureflow.com", totalValue: 28000, sections: [{ id: "1", type: "heading", content: "InsureFlow Claims Platform" }, { id: "2", type: "text", content: "Claims processing with document OCR, automated workflows, and compliance engine." }], sentAt: mockNow - 3 * mockDay, viewedAt: mockNow - 1 * mockDay, createdAt: mockNow - 8 * mockDay, updatedAt: mockNow },
  { _id: "prop_16", userId: "", title: "Nonprofit Donation Platform Proposal", status: "sent", clientName: "Dr. Sarah Okonkwo", clientEmail: "sarah@givehope.org", totalValue: 8000, sections: [{ id: "1", type: "heading", content: "Donation Platform" }, { id: "2", type: "text", content: "Donation and volunteer management platform with recurring donations and impact reporting." }], sentAt: mockNow - 2 * mockDay, createdAt: mockNow - 5 * mockDay, updatedAt: mockNow },
  // Viewed
  { _id: "prop_4", userId: "", title: "Creative Studios Motion Design Package", status: "viewed", clientName: "Tom Bradley", clientEmail: "tom@creativestudios.art", totalValue: 7500, sections: [{ id: "1", type: "heading", content: "Motion Design Package" }, { id: "2", type: "text", content: "Motion graphics reel and social media content for brand launch campaign." }], sentAt: mockNow - 8 * mockDay, viewedAt: mockNow - 6 * mockDay, createdAt: mockNow - 12 * mockDay, updatedAt: mockNow },
  { _id: "prop_11", userId: "", title: "Brand Identity for HealthTech Startup", status: "viewed", clientName: "MediTech Inc", clientEmail: "marketing@meditech.org", totalValue: 12000, sections: [{ id: "1", type: "heading", content: "HealthTech Branding" }, { id: "2", type: "text", content: "Complete brand identity for healthcare technology startup with accessible design." }], sentAt: mockNow - 7 * mockDay, viewedAt: mockNow - 5 * mockDay, createdAt: mockNow - 10 * mockDay, updatedAt: mockNow },
  { _id: "prop_18", userId: "", title: "Manufacturing Quality Control System Proposal", status: "viewed", clientName: "Ingrid Svensson", clientEmail: "ingrid@precisemfg.se", totalValue: 38000, sections: [{ id: "1", type: "heading", content: "Quality Control System" }, { id: "2", type: "text", content: "IoT-connected quality control system with real-time defect detection." }], sentAt: mockNow - 6 * mockDay, viewedAt: mockNow - 3 * mockDay, createdAt: mockNow - 10 * mockDay, updatedAt: mockNow },
  // Draft
  { _id: "prop_3", userId: "", title: "Healthcare Patient Portal", status: "draft", clientName: "Dr. Robert Singh", clientEmail: "robert@medportal.health", totalValue: 18000, sections: [{ id: "1", type: "heading", content: "Patient Portal" }, { id: "2", type: "text", content: "HIPAA-compliant patient portal with appointment scheduling and secure messaging." }], createdAt: mockNow - 2 * mockDay, updatedAt: mockNow },
  { _id: "prop_12", userId: "", title: "Supply Chain Management System", status: "draft", clientName: "Robert Chang", clientEmail: "rchang@logisync.com", totalValue: 32000, sections: [{ id: "1", type: "heading", content: "Supply Chain Platform" }, { id: "2", type: "text", content: "End-to-end supply chain management with inventory tracking and predictive analytics." }], createdAt: mockNow - 5 * mockDay, updatedAt: mockNow },
  { _id: "prop_13", userId: "", title: "Restaurant POS & Ordering System", status: "draft", clientName: "Maria Santos", clientEmail: "maria@freshbites.co", totalValue: 14000, sections: [{ id: "1", type: "heading", content: "Restaurant POS" }, { id: "2", type: "text", content: "Point-of-sale and online ordering system for a 12-location restaurant chain." }], createdAt: mockNow - 3 * mockDay, updatedAt: mockNow },
  // Declined
  { _id: "prop_5", userId: "", title: "Social Platform MVP", status: "declined", clientName: "SocialNext", clientEmail: "founders@socialnext.com", totalValue: 35000, sections: [{ id: "1", type: "heading", content: "SocialNext MVP" }, { id: "2", type: "text", content: "Complete social networking MVP with user profiles, feed algorithm, and messaging." }], sentAt: mockNow - 30 * mockDay, viewedAt: mockNow - 28 * mockDay, createdAt: mockNow - 35 * mockDay, updatedAt: mockNow },
  // Expired
  { _id: "prop_14exp", userId: "", title: "EdTech Course Platform Proposal", status: "expired", clientName: "Prof. Anika Desai", clientEmail: "anika@learnvista.edu", totalValue: 9500, sections: [{ id: "1", type: "heading", content: "EdTech Platform" }, { id: "2", type: "text", content: "Online course platform with video hosting, quizzes, and certificate generation." }], sentAt: mockNow - 45 * mockDay, viewedAt: mockNow - 43 * mockDay, validUntil: mockNow - 15 * mockDay, createdAt: mockNow - 50 * mockDay, updatedAt: mockNow },
];

const MOCK_STATS = {
  total: MOCK_PROPOSALS.length,
  sent: MOCK_PROPOSALS.filter(p => p.status === "sent").length,
  signed: MOCK_PROPOSALS.filter(p => p.status === "signed").length,
  draft: MOCK_PROPOSALS.filter(p => p.status === "draft").length,
  signatureRate: MOCK_PROPOSALS.length > 0 ? Math.round((MOCK_PROPOSALS.filter(p => p.status === "signed").length / (MOCK_PROPOSALS.filter(p => p.status === "signed").length + MOCK_PROPOSALS.filter(p => p.status === "declined").length + MOCK_PROPOSALS.filter(p => p.status === "expired").length || 1)) * 100) : 0,
  totalValue: MOCK_PROPOSALS.reduce((s, p) => s + p.totalValue, 0),
};

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
  const [followUpDialogProposalId, setFollowUpDialogProposalId] = useState<string | null>(null);

  // ── Convex mutations for sharing ──
  const shareRecordMutation = useMutation((api as any).permissions?.shareRecord ?? null);
  const unshareRecordMutation = useMutation((api as any).permissions?.unshareRecord ?? null);

  // Convex queries
  const convexProposals = useQuery(api.proposals.crud.getProposals, workspaceId ? (activeFilter === "all" ? { workspaceId } : { workspaceId, status: activeFilter }) : (activeFilter === "all" ? {} : { status: activeFilter })) as Proposal[] | undefined;
  const convexStats = useQuery(api.proposals.crud.getProposalStats, workspaceId ? { workspaceId } : {}) as {
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

  // Follow-up mutations
  const startFollowUps = useMutation(api.proposals.crud.startFollowUps);
  const stopFollowUps = useMutation(api.proposals.crud.stopFollowUps);
  const skipFollowUp = useMutation(api.proposals.crud.skipFollowUp);

  // Filter counts (from all proposals for the tab badges)
  const convexAllProposals = useQuery(api.proposals.crud.getProposals, workspaceId ? { workspaceId } : {}) as Proposal[] | undefined;

  // Track whether we're using mock data (mock IDs are not valid Convex IDs)
  const isUsingMockData = !convexProposals || convexProposals.length === 0;

  // Use Convex data when available, fall back to mock data
  const proposals = useMemo(() => {
    if (convexProposals && convexProposals.length > 0) return convexProposals;
    // Filter mock data by activeFilter
    if (activeFilter === "all") return MOCK_PROPOSALS;
    return MOCK_PROPOSALS.filter(p => p.status === activeFilter);
  }, [convexProposals, activeFilter]);

  const stats = useMemo(() => {
    if (convexStats && convexStats.total > 0) return convexStats;
    return MOCK_STATS;
  }, [convexStats]);

  const allProposals = useMemo(() => {
    if (convexAllProposals && convexAllProposals.length > 0) return convexAllProposals;
    return MOCK_PROPOSALS;
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

  const handleStartFollowUps = async (proposalId: string, intervals?: number[]) => {
    try {
      const result = await startFollowUps({ proposalId: proposalId as any, intervals });
      toast.success("Follow-ups started!", {
        description: `${intervals?.length || 3} follow-up(s) scheduled.`,
      });
    } catch (err: any) {
      toast.error("Failed to start follow-ups", { description: err.message });
      throw err;
    }
  };

  const handleStopFollowUps = async (proposalId: string) => {
    try {
      await stopFollowUps({ proposalId: proposalId as any });
      toast.success("Follow-ups stopped", {
        description: "All scheduled follow-ups have been cancelled.",
      });
    } catch (err: any) {
      toast.error("Failed to stop follow-ups", { description: err.message });
      throw err;
    }
  };

  const handleSkipFollowUp = async (followUpId: string) => {
    try {
      await skipFollowUp({ followUpId: followUpId as any });
      toast.success("Follow-up skipped");
    } catch (err: any) {
      toast.error("Failed to skip follow-up", { description: err.message });
      throw err;
    }
  };

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
                  isMock={isUsingMockData}
                  formatCurrency={formatCurrency}
                  formatDate={formatDate}
                  onSend={handleSend}
                  onDuplicate={handleDuplicate}
                  onDelete={canDeleteRecords ? setDeleteDialogId : () => {}}
                  onView={() => navigate(`/proposals/new?edit=${proposal._id}`)}
                  onShare={canShareRecords ? (id: string) => {
                    const proposal = proposals.find((p: any) => p._id === id);
                    const perms = usePermissions(proposal as any);
                    if (canShareRecords || perms.canShare) {
                      setSharingRecord({
                        id,
                        type: "proposal",
                        sharing: (proposal as any)?.sharing || [],
                      });
                      setShareProposalId(id);
                      setShowShareDialog(true);
                    }
                  } : () => {}}
                  onManageFollowUps={setFollowUpDialogProposalId}
                  canDelete={canDeleteRecords}
                  canShare={canShareRecords || (() => {
                    // Check per-proposal permission lazily
                    return true; // Fallback to workspace-level permission
                  })()}
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

      {/* Follow-up Manager Dialog */}
      {followUpDialogProposalId && (
        <FollowUpManager
          proposalId={followUpDialogProposalId}
          isMock={isUsingMockData}
          open={!!followUpDialogProposalId}
          onOpenChange={(open) => {
            if (!open) setFollowUpDialogProposalId(null);
          }}
          onStartFollowUps={handleStartFollowUps}
          onStopFollowUps={handleStopFollowUps}
          onSkipFollowUp={handleSkipFollowUp}
          formatDate={formatDate}
        />
      )}

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
  onDuplicate,
  onDelete,
  onView,
  onShare,
  onManageFollowUps,
  canDelete,
  canShare,
}: {
  proposal: Proposal;
  idx: number;
  isMock: boolean;
  formatCurrency: (a: number) => string;
  formatDate: (t: number) => string;
  onSend: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onView: () => void;
  onShare?: (id: string) => void;
  onManageFollowUps?: (id: string) => void;
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

          {/* Follow-up Badge & Manage Button */}
          {(proposal.status === "sent" || proposal.status === "viewed") && (
            <div className="flex items-center gap-2 mt-0">
              {scheduledFollowUps.length > 0 ? (
                <div className="flex items-center gap-1.5 text-[11px] text-[#8B5CF6] bg-[#8B5CF6]/10 rounded-md px-2 py-1">
                  <BellRing className="h-3 w-3" />
                  <span>{scheduledFollowUps.length} follow-up{scheduledFollowUps.length !== 1 ? "s" : ""} scheduled</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground bg-muted/50 rounded-md px-2 py-1">
                  <Bell className="h-3 w-3" />
                  <span>No follow-ups</span>
                </div>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-[11px] text-[#8B5CF6] hover:text-[#7C3AED] hover:bg-[#8B5CF6]/10 gap-1"
                onClick={(e) => {
                  e.stopPropagation();
                  onManageFollowUps?.(proposal._id);
                }}
              >
                <Settings2 className="h-3 w-3" />
                Manage
              </Button>
            </div>
          )}

          {/* Follow-up badge for non-sent/viewed statuses */}
          {(proposal.status !== "sent" && proposal.status !== "viewed") && scheduledFollowUps.length > 0 && (
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

          {/* Quick Actions for Signed — Convert to Project */}
          {proposal.status === "signed" && (
            <div className="mt-3 pt-3 border-t border-border flex items-center gap-2">
              <Button
                size="sm"
                className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white gap-1.5 h-8 text-[12px]"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/projects?createFromProposal=${proposal._id}`);
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
                  navigate(`/scope?proposal=${proposal._id}`);
                }}
              >
                <ShieldCheck className="h-3 w-3" />
                Define Scope
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Follow-Up Manager Dialog ──────────────────────────────────────────────────

function getIntervalLabel(days: number): string {
  if (days <= 3) return "Friendly nudge";
  if (days <= 7) return "Check-in";
  if (days <= 14) return "Follow-up";
  return "Final reminder";
}

function getIntervalLabelColor(days: number): string {
  if (days <= 3) return "text-emerald-600 bg-emerald-500/10";
  if (days <= 7) return "text-blue-600 bg-blue-500/10";
  if (days <= 14) return "text-amber-600 bg-amber-500/10";
  return "text-red-600 bg-red-500/10";
}

function FollowUpManager({
  proposalId,
  isMock,
  open,
  onOpenChange,
  onStartFollowUps,
  onStopFollowUps,
  onSkipFollowUp,
  formatDate,
}: {
  proposalId: string;
  isMock: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStartFollowUps: (proposalId: string, intervals?: number[]) => Promise<void>;
  onStopFollowUps: (proposalId: string) => Promise<void>;
  onSkipFollowUp: (followUpId: string) => Promise<void>;
  formatDate: (t: number) => string;
}) {
  // Fetch proposal details
  const proposal = useQuery(
    api.proposals.crud.getProposal,
    isMock ? "skip" : { proposalId: proposalId as any }
  ) as Proposal | undefined;

  // Fetch follow-ups for this proposal
  const followUps = useQuery(
    api.proposals.crud.getFollowUps,
    isMock ? "skip" : { proposalId: proposalId as any }
  ) as FollowUp[] | undefined;

  // Mock follow-ups for demo
  const mockFollowUps: FollowUp[] = useMemo(() => [
    { _id: "fu_1", dayNumber: 3, subject: "Following up", status: "sent", scheduledAt: mockNow - 2 * mockDay },
    { _id: "fu_2", dayNumber: 7, subject: "Checking in", status: "scheduled", scheduledAt: mockNow + 2 * mockDay },
    { _id: "fu_3", dayNumber: 14, subject: "Final reminder", status: "scheduled", scheduledAt: mockNow + 9 * mockDay },
  ], []);

  const effectiveFollowUps = isMock ? mockFollowUps : (followUps || []);

  const scheduledCount = useMemo(() => effectiveFollowUps.filter(f => f.status === "scheduled").length, [effectiveFollowUps]);
  const sentCount = useMemo(() => effectiveFollowUps.filter(f => f.status === "sent").length, [effectiveFollowUps]);
  const skippedCount = useMemo(() => effectiveFollowUps.filter(f => f.status === "skipped").length, [effectiveFollowUps]);
  const cancelledCount = useMemo(() => effectiveFollowUps.filter(f => f.status === "cancelled").length, [effectiveFollowUps]);

  const hasScheduled = scheduledCount > 0;
  const followUpActive = hasScheduled;

  // Interval configuration state
  const [intervals, setIntervals] = useState<number[]>([3, 7, 14]);
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [skippingId, setSkippingId] = useState<string | null>(null);

  const addInterval = () => {
    const maxDay = intervals.length > 0 ? Math.max(...intervals) : 0;
    const nextDay = Math.min(maxDay + 7, 60);
    setIntervals(prev => [...prev, nextDay].sort((a, b) => a - b));
  };

  const removeInterval = (index: number) => {
    setIntervals(prev => prev.filter((_, i) => i !== index));
  };

  const updateInterval = (index: number, value: number) => {
    setIntervals(prev => {
      const next = [...prev];
      next[index] = Math.max(1, Math.min(90, value));
      return next;
    });
  };

  const handleStart = async () => {
    setIsStarting(true);
    try {
      await onStartFollowUps(proposalId, intervals);
    } finally {
      setIsStarting(false);
    }
  };

  const handleStop = async () => {
    setIsStopping(true);
    try {
      await onStopFollowUps(proposalId);
    } finally {
      setIsStopping(false);
    }
  };

  const handleSkip = async (followUpId: string) => {
    setSkippingId(followUpId);
    try {
      await onSkipFollowUp(followUpId);
    } finally {
      setSkippingId(null);
    }
  };

  const proposalTitle = proposal?.title || "Proposal";

  const statusBadgeConfig: Record<string, { className: string; label: string }> = {
    scheduled: { className: "bg-[#8B5CF6]/15 text-[#8B5CF6] border-[#8B5CF6]/25", label: "Scheduled" },
    sent: { className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25", label: "Sent" },
    skipped: { className: "bg-slate-500/15 text-slate-500 border-slate-500/25", label: "Skipped" },
    cancelled: { className: "bg-muted text-muted-foreground border-muted", label: "Cancelled" },
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[580px] max-h-[90vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-[#8B5CF6]/10 flex items-center justify-center">
                <BellRing className="h-5 w-5 text-[#8B5CF6]" />
              </div>
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-base truncate">{proposalTitle}</DialogTitle>
                <DialogDescription className="text-xs mt-0.5">
                  Manage automated follow-ups for this proposal
                </DialogDescription>
              </div>
              <Badge
                variant="outline"
                className={`text-[11px] px-2.5 py-0.5 h-6 font-medium ${
                  followUpActive
                    ? "bg-[#8B5CF6]/15 text-[#8B5CF6] border-[#8B5CF6]/25"
                    : "bg-muted text-muted-foreground border-muted"
                }`}
              >
                {followUpActive ? "Active" : "Inactive"}
              </Badge>
            </div>
          </DialogHeader>
        </div>

        <Separator />

        <ScrollArea className="flex-1 max-h-[60vh]">
          <div className="px-6 py-4 space-y-5">
            {/* Control Buttons */}
            <div className="flex items-center gap-2">
              <Button
                className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white gap-1.5 h-9 text-[13px]"
                disabled={hasScheduled || isStarting || isMock}
                onClick={handleStart}
              >
                {isStarting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Play className="h-3.5 w-3.5" />
                )}
                Start Follow-ups
              </Button>
              <Button
                variant="outline"
                className="gap-1.5 h-9 text-[13px] border-red-300 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/30"
                disabled={!hasScheduled || isStopping || isMock}
                onClick={handleStop}
              >
                {isStopping ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Square className="h-3.5 w-3.5" />
                )}
                Stop Follow-ups
              </Button>
            </div>

            {/* Interval Configuration */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-[13px] font-semibold text-foreground">Follow-up Schedule</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-[11px] text-[#8B5CF6] hover:text-[#7C3AED] gap-1"
                  onClick={addInterval}
                  disabled={hasScheduled || intervals.length >= 8}
                >
                  <PlusCircle className="h-3 w-3" />
                  Add Follow-up
                </Button>
              </div>
              <div className="space-y-2">
                {intervals.map((day, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: idx * 0.05 }}
                    className="flex items-center gap-2"
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <span className="text-[12px] text-muted-foreground w-10 shrink-0">Day</span>
                      <Input
                        type="number"
                        min={1}
                        max={90}
                        value={day}
                        onChange={(e) => updateInterval(idx, parseInt(e.target.value) || 1)}
                        disabled={hasScheduled}
                        className="h-8 w-20 text-[13px] text-center"
                      />
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${getIntervalLabelColor(day)}`}>
                        {getIntervalLabel(day)}
                      </span>
                    </div>
                    {!hasScheduled && intervals.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500"
                        onClick={() => removeInterval(idx)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </motion.div>
                ))}
              </div>
              {hasScheduled && (
                <p className="text-[11px] text-muted-foreground italic">
                  Stop current follow-ups to modify the schedule.
                </p>
              )}
            </div>

            <Separator />

            {/* Follow-up Timeline */}
            <div className="space-y-3">
              <h4 className="text-[13px] font-semibold text-foreground">Follow-up Timeline</h4>
              {effectiveFollowUps.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <CalendarClock className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-[13px] font-medium">No follow-ups yet</p>
                  <p className="text-[11px]">Start follow-ups to create a schedule</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {effectiveFollowUps
                    .sort((a, b) => a.dayNumber - b.dayNumber)
                    .map((fu, idx) => {
                      const statusConfig = statusBadgeConfig[fu.status] || statusBadgeConfig.scheduled;
                      return (
                        <motion.div
                          key={fu._id}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2, delay: idx * 0.05 }}
                          className="flex items-center gap-3 p-2.5 rounded-lg border border-border/60 bg-muted/20 hover:bg-muted/30 transition-colors"
                        >
                          {/* Day indicator */}
                          <div className="flex items-center justify-center h-8 w-8 rounded-md bg-[#8B5CF6]/10 text-[11px] font-bold text-[#8B5CF6] shrink-0">
                            D{fu.dayNumber}
                          </div>

                          {/* Subject & date */}
                          <div className="flex-1 min-w-0">
                            <p className="text-[12px] font-medium text-foreground truncate">{fu.subject}</p>
                            <p className="text-[10px] text-muted-foreground">
                              Scheduled: {formatDate(fu.scheduledAt)}
                            </p>
                          </div>

                          {/* Status badge */}
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-2 py-0 h-5 font-medium shrink-0 ${statusConfig.className}`}
                          >
                            {statusConfig.label}
                          </Badge>

                          {/* Skip button */}
                          {fu.status === "scheduled" && !isMock && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-[10px] text-muted-foreground hover:text-amber-600 gap-1 shrink-0"
                              disabled={skippingId === fu._id}
                              onClick={() => handleSkip(fu._id)}
                            >
                              {skippingId === fu._id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <SkipForward className="h-3 w-3" />
                              )}
                              Skip
                            </Button>
                          )}
                        </motion.div>
                      );
                    })}
                </div>
              )}
            </div>

            <Separator />

            {/* Summary Stats */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: "Scheduled", value: scheduledCount, color: "text-[#8B5CF6]", bg: "bg-[#8B5CF6]/10" },
                { label: "Sent", value: sentCount, color: "text-emerald-600", bg: "bg-emerald-500/10" },
                { label: "Skipped", value: skippedCount, color: "text-slate-500", bg: "bg-slate-500/10" },
                { label: "Cancelled", value: cancelledCount, color: "text-muted-foreground", bg: "bg-muted" },
              ].map((stat) => (
                <div key={stat.label} className="text-center p-2 rounded-lg border border-border/50 bg-muted/10">
                  <div className={`text-[18px] font-bold ${stat.color}`}>{stat.value}</div>
                  <div className="text-[10px] text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>

        {/* Footer */}
        <Separator />
        <div className="px-6 py-3 flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="text-[13px]">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
