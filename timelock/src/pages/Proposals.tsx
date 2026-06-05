import { useState, useMemo, useCallback, useRef } from "react";
import { useQuery, useMutation } from "@/lib/safe-convex-react";
import { api } from "@/convex/_generated/api";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  ArrowUpRight,
  TrendingUp,
  Mail,
  Loader2,
  Upload,
  Download,
  FileUp,
  FileDown,
  BookmarkPlus,
  LayoutTemplate,
  X,
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
  dealId?: string;
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
  const [activeFilter, setActiveFilter] = useState<"all" | ProposalStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteDialogId, setDeleteDialogId] = useState<string | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importType, setImportType] = useState<"proposals" | "templates">("proposals");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [saveTemplateDialogId, setSaveTemplateDialogId] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [templateIndustry, setTemplateIndustry] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Convex queries
  const convexProposals = useQuery(api.proposals.crud.getProposals, activeFilter === "all" ? {} : { status: activeFilter }) as Proposal[] | undefined;
  const convexStats = useQuery(api.proposals.crud.getProposalStats, {}) as {
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
  const importProposalsFromJson = useMutation(api.proposals.crud.importProposalsFromJson);
  const importTemplatesFromJson = useMutation(api.proposals.crud.importTemplatesFromJson);
  const saveAsTemplate = useMutation(api.proposals.crud.saveAsTemplate);

  // Filter counts (from all proposals for the tab badges)
  const convexAllProposals = useQuery(api.proposals.crud.getProposals, {}) as Proposal[] | undefined;

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

  const handleImport = useCallback(async () => {
    if (!importFile) {
      toast.error("Please select a file to import");
      return;
    }

    setIsImporting(true);
    try {
      const text = await importFile.text();
      const fileName = importFile.name.toLowerCase();

      if (fileName.endsWith(".csv")) {
        // Parse CSV - expected columns: title, clientName, clientEmail, totalValue, status, notes
        const lines = text.split("\n").filter(l => l.trim());
        if (lines.length < 2) {
          toast.error("CSV file must have a header row and at least one data row");
          setIsImporting(false);
          return;
        }
        const headers = lines[0].split(",").map(h => h.trim().replace(/"/g, ""));
        const proposals = [];
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(",").map(v => v.trim().replace(/"/g, ""));
          const obj: any = {};
          headers.forEach((h, idx) => { obj[h] = values[idx] || undefined; });
          if (obj.title) {
            proposals.push({
              title: obj.title,
              clientName: obj.clientName,
              clientEmail: obj.clientEmail,
              totalValue: obj.totalValue ? Number(obj.totalValue) : 0,
              status: obj.status || "draft",
              notes: obj.notes,
            });
          }
        }
        if (proposals.length === 0) {
          toast.error("No valid proposals found in CSV");
          setIsImporting(false);
          return;
        }
        const result = await importProposalsFromJson({ proposals });
        toast.success(`Imported ${(result as any).imported} proposals`);
      } else {
        // JSON file
        const data = JSON.parse(text);
        if (importType === "proposals") {
          const proposals = Array.isArray(data) ? data : data.proposals || [data];
          const result = await importProposalsFromJson({ proposals });
          toast.success(`Imported ${(result as any).imported} proposals`);
        } else {
          const templates = Array.isArray(data) ? data : data.templates || [data];
          const result = await importTemplatesFromJson({ templates });
          toast.success(`Imported ${(result as any).imported} templates`);
        }
      }

      setImportDialogOpen(false);
      setImportFile(null);
    } catch (err: any) {
      console.error("Import failed:", err);
      toast.error("Import failed", { description: err.message });
    } finally {
      setIsImporting(false);
    }
  }, [importFile, importType, importProposalsFromJson, importTemplatesFromJson]);

  const handleSaveAsTemplate = useCallback(async () => {
    if (!saveTemplateDialogId || !templateName.trim()) {
      toast.error("Please enter a template name");
      return;
    }
    try {
      await saveAsTemplate({
        proposalId: saveTemplateDialogId as any,
        templateName: templateName.trim(),
        industry: templateIndustry.trim() || undefined,
      });
      toast.success("Saved as template!");
      setSaveTemplateDialogId(null);
      setTemplateName("");
      setTemplateIndustry("");
    } catch (err: any) {
      toast.error("Failed to save template", { description: err.message });
    }
  }, [saveTemplateDialogId, templateName, templateIndustry, saveAsTemplate]);

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
              variant="outline"
              size="sm"
              className="gap-2 text-muted-foreground"
              onClick={() => setImportDialogOpen(true)}
            >
              <FileUp className="h-4 w-4" />
              Import
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
                  onDelete={setDeleteDialogId}
                  onView={() => navigate(`/proposals/new?edit=${proposal._id}`)}
                  onSaveAsTemplate={setSaveTemplateDialogId}
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

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileUp className="h-5 w-5 text-[#8B5CF6]" />
              Import Data
            </DialogTitle>
            <DialogDescription>
              Import proposals or templates from a JSON or CSV file.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Import Type */}
            <div className="grid gap-2">
              <Label className="text-[13px] font-medium">Import Type</Label>
              <div className="flex gap-2">
                <Button
                  variant={importType === "proposals" ? "default" : "outline"}
                  size="sm"
                  className={importType === "proposals" ? "bg-[#8B5CF6] hover:bg-[#7C3AED] text-white" : ""}
                  onClick={() => setImportType("proposals")}
                >
                  <FileText className="h-3.5 w-3.5 mr-1.5" />
                  Proposals
                </Button>
                <Button
                  variant={importType === "templates" ? "default" : "outline"}
                  size="sm"
                  className={importType === "templates" ? "bg-[#8B5CF6] hover:bg-[#7C3AED] text-white" : ""}
                  onClick={() => setImportType("templates")}
                >
                  <LayoutTemplate className="h-3.5 w-3.5 mr-1.5" />
                  Templates
                </Button>
              </div>
            </div>

            {/* File Input */}
            <div className="grid gap-2">
              <Label className="text-[13px] font-medium">Select File</Label>
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-[#8B5CF6]/40 transition-colors">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,.csv"
                  className="hidden"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                />
                {importFile ? (
                  <div className="flex items-center justify-center gap-2">
                    <FileDown className="h-5 w-5 text-[#8B5CF6]" />
                    <span className="text-sm font-medium">{importFile.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => {
                        setImportFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <div
                    className="cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Click to select a <span className="font-medium">.json</span> or <span className="font-medium">.csv</span> file
                    </p>
                    {importType === "proposals" && (
                      <p className="text-xs text-muted-foreground mt-1">
                        CSV columns: title, clientName, clientEmail, totalValue, status, notes
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setImportDialogOpen(false); setImportFile(null); }}>
              Cancel
            </Button>
            <Button
              className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white"
              onClick={handleImport}
              disabled={!importFile || isImporting}
            >
              {isImporting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              ) : (
                <FileUp className="h-4 w-4 mr-1.5" />
              )}
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save as Template Dialog */}
      <Dialog open={!!saveTemplateDialogId} onOpenChange={() => { setSaveTemplateDialogId(null); setTemplateName(""); setTemplateIndustry(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookmarkPlus className="h-5 w-5 text-[#8B5CF6]" />
              Save as Template
            </DialogTitle>
            <DialogDescription>
              Save this proposal's sections as a reusable template.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid gap-2">
              <Label className="text-[13px] font-medium">Template Name</Label>
              <Input
                placeholder="e.g., Standard Web Development Proposal"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-[13px] font-medium">Industry (optional)</Label>
              <Input
                placeholder="e.g., Technology, Creative, Professional Services"
                value={templateIndustry}
                onChange={(e) => setTemplateIndustry(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setSaveTemplateDialogId(null); setTemplateName(""); setTemplateIndustry(""); }}>
              Cancel
            </Button>
            <Button
              className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white"
              onClick={handleSaveAsTemplate}
              disabled={!templateName.trim()}
            >
              Save Template
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
  isMock,
  formatCurrency,
  formatDate,
  onSend,
  onDuplicate,
  onDelete,
  onView,
  onSaveAsTemplate,
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
  onSaveAsTemplate: (id: string) => void;
}) {
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
                <DropdownMenuItem
                  onClick={() => onSaveAsTemplate(proposal._id)}
                  className="gap-2 cursor-pointer"
                >
                  <BookmarkPlus className="h-3.5 w-3.5" />
                  Save as Template
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

          {/* Linked Deal Indicator */}
          {proposal.dealId && (
            <div className="flex items-center gap-1.5 text-[11px] text-[#8B5CF6] bg-[#8B5CF6]/10 rounded-md px-2 py-1 w-fit mt-2">
              <FileText className="h-3 w-3" />
              <span>Linked to deal</span>
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
