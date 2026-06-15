import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryTimeout, useConvexConnectionState } from "@/lib/safe-convex-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useNavigate } from "react-router";
import { useWorkspaceContext } from "@/hooks/use-workspace";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendingUp,
  DollarSign,
  Target,
  BarChart3,
  Plus,
  GripVertical,
  Calendar,
  User,
  Mail,
  FileText,
  Trash2,
  Pencil,
  Zap,
  Upload,
  Download,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Share2,
} from "lucide-react";
import { PageLayout } from "@/components/design-system/PageLayout";
import { ShareRecordsPanel } from "@/components/ShareRecordsPanel";

// ─── Types ─────────────────────────────────────────────────────────────────

interface Stage {
  _id: Id<"pipelineStages">;
  userId: Id<"users">;
  name: string;
  color: string;
  order: number;
  isDefault?: boolean;
}

interface Deal {
  _id: Id<"deals">;
  userId: Id<"users">;
  stageId: Id<"pipelineStages">;
  clientId?: Id<"clients">;
  title: string;
  description?: string;
  value: number;
  probability: number;
  currency?: string;
  source?: string;
  contactEmail?: string;
  contactName?: string;
  expectedCloseDate?: number;
  notes?: string;
  order: number;
  createdAt: number;
  updatedAt: number;
}

interface PipelineStats {
  totalDeals: number;
  totalValue: number;
  weightedValue: number;
  byStage: {
    stageId: Id<"pipelineStages">;
    stageName: string;
    color: string;
    dealCount: number;
    totalValue: number;
  }[];
}

// ─── Constants ─────────────────────────────────────────────────────────────

const SOURCE_OPTIONS = [
  { value: "upwork", label: "Upwork", color: "#14a800" },
  { value: "fiverr", label: "Fiverr", color: "#00b22d" },
  { value: "linkedin", label: "LinkedIn", color: "#0a66c2" },
  { value: "referral", label: "Referral", color: "#8B5CF6" },
  { value: "direct", label: "Direct", color: "#f59e0b" },
  { value: "other", label: "Other", color: "#6b7280" },
];

const DEFAULT_PROBABILITIES: Record<string, number> = {
  Lead: 10,
  Qualified: 25,
  Proposal: 50,
  Negotiation: 70,
  Won: 100,
  Lost: 0,
};

// ─── CSV Import Constants ─────────────────────────────────────────────────

const CORE_FIELDS = [
  { value: "title", label: "Title" },
  { value: "value", label: "Value ($)" },
  { value: "probability", label: "Probability (%)" },
  { value: "source", label: "Source" },
  { value: "contactName", label: "Contact Name" },
  { value: "contactEmail", label: "Contact Email" },
  { value: "expectedCloseDate", label: "Expected Close Date" },
  { value: "notes", label: "Notes" },
  { value: "_skip", label: "Skip this column" },
];

const AUTO_DETECT_MAP: Record<string, string> = {
  title: "title",
  name: "title",
  "deal name": "title",
  "deal title": "title",
  opportunity: "title",
  value: "value",
  amount: "value",
  "deal value": "value",
  "deal amount": "value",
  revenue: "value",
  price: "value",
  probability: "probability",
  "win probability": "probability",
  "close probability": "probability",
  likelihood: "probability",
  source: "source",
  "lead source": "source",
  origin: "source",
  "contact name": "contactName",
  "client name": "contactName",
  "contact person": "contactName",
  "contact email": "contactEmail",
  email: "contactEmail",
  "client email": "contactEmail",
  "expected close date": "expectedCloseDate",
  "close date": "expectedCloseDate",
  "expected close": "expectedCloseDate",
  "due date": "expectedCloseDate",
  notes: "notes",
  description: "notes",
  comments: "notes",
};

function autoDetectMapping(headerName: string): string {
  const normalized = headerName.toLowerCase().trim();
  return AUTO_DETECT_MAP[normalized] ?? "_skip";
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(timestamp: number | undefined): string {
  if (!timestamp) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(timestamp));
}

function daysUntilClose(timestamp: number | undefined): number | null {
  if (!timestamp) return null;
  const diff = timestamp - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function getSourceInfo(source: string | undefined) {
  return SOURCE_OPTIONS.find((s) => s.value === source) ?? SOURCE_OPTIONS[5];
}

// ─── Main Component ────────────────────────────────────────────────────────

export default function Pipeline() {
  // ── Workspace Context ──
  const { activeWorkspaceId, isConvexConnected } = useWorkspaceContext();
  const workspaceId = isConvexConnected ? (activeWorkspaceId as Id<"workspaces">) : undefined;

  // ── Convex Queries & Mutations ──
  const stages = useQuery(api.pipeline.crud.getStages, workspaceId ? { workspaceId } : "skip") as
    | Stage[]
    | undefined;
  const deals = useQuery(api.pipeline.crud.getDeals, workspaceId ? { workspaceId } : "skip") as
    | Deal[]
    | undefined;
  const stats = useQuery(api.pipeline.crud.getPipelineStats, workspaceId ? { workspaceId } : "skip") as
    | PipelineStats
    | undefined;

  const navigate = useNavigate();
  const createDefaultStages = useMutation(api.pipeline.crud.createDefaultStages);
  const createDealMutation = useMutation(api.pipeline.crud.createDeal);
  const moveDealMutation = useMutation(api.pipeline.crud.moveDeal);
  const updateDealMutation = useMutation(api.pipeline.crud.updateDeal);
  const deleteDealMutation = useMutation(api.pipeline.crud.deleteDeal);
  const seedMockPipeline = useMutation(api.seedNew.seedMockPipeline);
  const createProposalFromDeal = useMutation(api.proposals.crud.createProposalFromDeal);
  const bulkImportMutation = useMutation(api.pipeline.bulkImport.bulkImportDeals);

  // ── Local State ──
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  // Track which stage the create dialog was opened from (kept for future use)
  const [detailDeal, setDetailDeal] = useState<Deal | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [dragOverStageId, setDragOverStageId] = useState<Id<"pipelineStages"> | null>(null);
  const [isCreatingProposal, setIsCreatingProposal] = useState<string | null>(null); // dealId being processed
  const [activeTab, setActiveTab] = useState<"pipeline" | "share-records">("pipeline");

  // ── Create Deal Form State ──
  const [formTitle, setFormTitle] = useState("");
  const [formValue, setFormValue] = useState("");
  const [formProbability, setFormProbability] = useState("");
  const [formSource, setFormSource] = useState("");
  const [formContactName, setFormContactName] = useState("");
  const [formContactEmail, setFormContactEmail] = useState("");
  const [formCloseDate, setFormCloseDate] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formStageId, setFormStageId] = useState<Id<"pipelineStages"> | null>(null);

  // ── Edit Deal Form State ──
  const [editTitle, setEditTitle] = useState("");
  const [editValue, setEditValue] = useState("");
  const [editProbability, setEditProbability] = useState("");
  const [editSource, setEditSource] = useState("");
  const [editContactName, setEditContactName] = useState("");
  const [editContactEmail, setEditContactEmail] = useState("");
  const [editCloseDate, setEditCloseDate] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editStageId, setEditStageId] = useState<Id<"pipelineStages"> | null>(null);

  // ── Import State ──
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importData, setImportData] = useState<any[]>([]);
  const [importHeaders, setImportHeaders] = useState<string[]>([]);
  const [columnMappings, setColumnMappings] = useState<Record<string, string>>({});
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null);
  const [selectedStageId, setSelectedStageId] = useState<Id<"pipelineStages"> | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Derived State ──
  const safeStages = useMemo(() => stages ?? [], [stages]);
  const safeDeals = useMemo(() => deals ?? [], [deals]);
  const safeStats = useMemo(
    () => {
      if (stats && stats.totalDeals > 0) return stats;
      // Compute from local data
      const totalValue = safeDeals.reduce((s, d) => s + d.value, 0);
      const weightedValue = safeDeals.reduce((s, d) => s + d.value * (d.probability / 100), 0);
      return {
        totalDeals: safeDeals.length,
        totalValue,
        weightedValue,
        byStage: safeStages.map((stage) => {
          const stageDeals = safeDeals.filter((d) => d.stageId === stage._id);
          return {
            stageId: stage._id,
            stageName: stage.name,
            color: stage.color,
            dealCount: stageDeals.length,
            totalValue: stageDeals.reduce((s, d) => s + d.value, 0),
          };
        }),
      };
    },
    [stats, safeDeals, safeStages]
  );
  const { isDisconnected } = useConvexConnectionState();
  const isLoading = stages === undefined || deals === undefined;
  const timedOut = useQueryTimeout(isLoading, 3000);
  const showLoading = isLoading && !timedOut && !isDisconnected;

  const dealsByStage = useMemo(() => {
    const map = new Map<Id<"pipelineStages">, Deal[]>();
    for (const stage of safeStages) {
      map.set(stage._id, []);
    }
    for (const deal of safeDeals) {
      const list = map.get(deal.stageId);
      if (list) {
        list.push(deal);
      }
    }
    // Sort deals by order within each stage
    for (const [, list] of map) {
      list.sort((a, b) => a.order - b.order);
    }
    return map;
  }, [safeStages, safeDeals]);

  // Win rate: deals in "Won" stage / (deals in "Won" + "Lost" stages)
  const winRate = useMemo(() => {
    const wonStage = safeStages.find((s) => s.name === "Won");
    const lostStage = safeStages.find((s) => s.name === "Lost");
    if (!wonStage || !lostStage) return 0;
    const wonDeals = (dealsByStage.get(wonStage._id) ?? []).length;
    const lostDeals = (dealsByStage.get(lostStage._id) ?? []).length;
    const total = wonDeals + lostDeals;
    return total === 0 ? 0 : Math.round((wonDeals / total) * 100);
  }, [safeStages, dealsByStage]);

  // ── Auto-create default stages on first load ──
  // Use a ref so the effect doesn't re-fire when createDefaultStages identity changes
  const createDefaultStagesRef = useRef(createDefaultStages);
  createDefaultStagesRef.current = createDefaultStages;

  // Track whether we've already attempted to create defaults to avoid race conditions
  const hasAttemptedDefaults = useRef(false);

  useEffect(() => {
    // Skip if demo mode (workspaceId is a fake "ws_" string, not a real Convex ID)
    if (workspaceId && typeof workspaceId === "string" && workspaceId.startsWith("ws_")) return;
    // Only run when stages have been loaded (not undefined) and are empty
    if (stages === undefined) return;
    if (stages.length > 0) return;
    // Only attempt once per mount
    if (hasAttemptedDefaults.current) return;
    hasAttemptedDefaults.current = true;

    createDefaultStagesRef.current(workspaceId ? { workspaceId } : {}).catch(() => {
      // Silently fail - user might not be authenticated
    });
  }, [stages, workspaceId]);

  // ── Handlers ──
  const handleOpenCreateDialog = useCallback(
    (stageId: Id<"pipelineStages">) => {
      const stage = safeStages.find((s) => s._id === stageId);
      setFormStageId(stageId);
      setFormTitle("");
      setFormValue("");
      setFormProbability(
        stage ? String(DEFAULT_PROBABILITIES[stage.name] ?? 20) : "20"
      );
      setFormSource("");
      setFormContactName("");
      setFormContactEmail("");
      setFormCloseDate("");
      setFormNotes("");
      setCreateDialogOpen(true);
    },
    [safeStages]
  );

  const handleCreateDeal = useCallback(async () => {
    if (!formStageId || !formTitle.trim() || !formValue) {
      toast.error("Please fill in at least the title and value");
      return;
    }
    setIsCreating(true);
    try {
      await createDealMutation({
        stageId: formStageId,
        title: formTitle.trim(),
        value: Number(formValue),
        probability: formProbability ? Number(formProbability) : undefined,
        source: formSource || undefined,
        contactName: formContactName.trim() || undefined,
        contactEmail: formContactEmail.trim() || undefined,
        expectedCloseDate: formCloseDate
          ? new Date(formCloseDate).getTime()
          : undefined,
        notes: formNotes.trim() || undefined,
        ...(workspaceId ? { workspaceId } : {}),
      });
      toast.success("Deal created successfully");
      setCreateDialogOpen(false);
    } catch (err) {
      console.error("Failed to create deal:", err);
      toast.error("Failed to create deal");
    } finally {
      setIsCreating(false);
    }
  }, [
    formStageId,
    formTitle,
    formValue,
    formProbability,
    formSource,
    formContactName,
    formContactEmail,
    formCloseDate,
    formNotes,
    createDealMutation,
    workspaceId,
  ]);

  const handleSeedData = useCallback(async () => {
    setIsSeeding(true);
    try {
      const result = await seedMockPipeline(workspaceId ? { workspaceId } : {});
      const seedResult = result as { seeded?: boolean; dealCount?: number };
      if (seedResult?.seeded) {
        toast.success(`Seeded ${seedResult.dealCount} demo deals`);
      } else {
        toast.info("Demo data already exists");
      }
    } catch (err) {
      console.error("Failed to seed data:", err);
      toast.error("Failed to seed demo data");
    } finally {
      setIsSeeding(false);
    }
  }, [seedMockPipeline, workspaceId]);

  // ── Drag & Drop ──
  const [draggedDeal, setDraggedDeal] = useState<Deal | null>(null);

  const handleDragStart = useCallback((e: React.DragEvent, deal: Deal) => {
    setDraggedDeal(deal);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", deal._id);
    // Add a drag image
    const el = e.currentTarget as HTMLElement;
    if (el) {
      e.dataTransfer.setDragImage(el, el.offsetWidth / 2, 20);
    }
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent, stageId: Id<"pipelineStages">) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      if (draggedDeal && draggedDeal.stageId !== stageId) {
        setDragOverStageId(stageId);
      }
    },
    [draggedDeal]
  );

  const handleDragLeave = useCallback(
    (e: React.DragEvent, stageId: Id<"pipelineStages">) => {
      // Only clear if we're leaving the column itself (not a child)
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX;
      const y = e.clientY;
      if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
        setDragOverStageId((prev) => (prev === stageId ? null : prev));
      }
    },
    []
  );

  const handleDrop = useCallback(
    async (e: React.DragEvent, targetStageId: Id<"pipelineStages">) => {
      e.preventDefault();
      setDragOverStageId(null);
      if (!draggedDeal || draggedDeal.stageId === targetStageId) {
        setDraggedDeal(null);
        return;
      }
      const targetStageName = safeStages.find((s) => s._id === targetStageId)?.name ?? "new stage";

      try {
        await moveDealMutation({
          dealId: draggedDeal._id,
          stageId: targetStageId,
        });
        toast.success(`Moved "${draggedDeal.title}" to ${targetStageName}`);
      } catch (err) {
        console.error("Failed to move deal:", err);
        toast.error("Failed to move deal");
      }
      setDraggedDeal(null);
    },
    [draggedDeal, moveDealMutation, safeStages]
  );

  const handleDragEnd = useCallback(() => {
    setDraggedDeal(null);
    setDragOverStageId(null);
  }, []);

  // ── Detail / Edit Handlers ──
  const openDealDetail = useCallback((deal: Deal) => {
    setDetailDeal(deal);
    setEditMode(false);
    setEditTitle(deal.title);
    setEditValue(String(deal.value));
    setEditProbability(String(deal.probability));
    setEditSource(deal.source ?? "");
    setEditContactName(deal.contactName ?? "");
    setEditContactEmail(deal.contactEmail ?? "");
    setEditCloseDate(
      deal.expectedCloseDate
        ? new Date(deal.expectedCloseDate).toISOString().split("T")[0]
        : ""
    );
    setEditNotes(deal.notes ?? "");
    setEditStageId(deal.stageId);
  }, []);

  const handleUpdateDeal = useCallback(async () => {
    if (!detailDeal) return;
    try {
      const updates: any = {
        dealId: detailDeal._id,
        title: editTitle.trim(),
        value: Number(editValue),
        probability: Number(editProbability),
        source: editSource || undefined,
        contactName: editContactName.trim() || undefined,
        contactEmail: editContactEmail.trim() || undefined,
        expectedCloseDate: editCloseDate
          ? new Date(editCloseDate).getTime()
          : undefined,
        notes: editNotes.trim() || undefined,
      };
      if (editStageId && editStageId !== detailDeal.stageId) {
        updates.stageId = editStageId;
      }
      await updateDealMutation(updates);
      toast.success("Deal updated successfully");
      setEditMode(false);
      setDetailDeal(null);
    } catch (err) {
      console.error("Failed to update deal:", err);
      toast.error("Failed to update deal");
    }
  }, [
    detailDeal,
    editTitle,
    editValue,
    editProbability,
    editSource,
    editContactName,
    editContactEmail,
    editCloseDate,
    editNotes,
    editStageId,
    updateDealMutation,
  ]);

  const handleMoveDealToStage = useCallback(
    async (dealId: Id<"deals">, targetStageId: Id<"pipelineStages">) => {
      const stageName =
        safeStages.find((s) => s._id === targetStageId)?.name ?? "stage";
      try {
        await moveDealMutation({ dealId, stageId: targetStageId });
        toast.success(`Deal moved to ${stageName}`);
        setDetailDeal(null);
      } catch (err) {
        console.error("Failed to move deal:", err);
        toast.error("Failed to move deal");
      }
    },
    [moveDealMutation, safeStages]
  );

  const handleDeleteDeal = useCallback(async () => {
    if (!detailDeal) return;
    try {
      await deleteDealMutation({ dealId: detailDeal._id });
      toast.success("Deal deleted");
      setDeleteConfirmOpen(false);
      setDetailDeal(null);
    } catch (err) {
      console.error("Failed to delete deal:", err);
      toast.error("Failed to delete deal");
    }
  }, [detailDeal, deleteDealMutation]);

  const handleCreateProposalFromDeal = useCallback(async (deal: Deal) => {
    setIsCreatingProposal(deal._id);
    try {
      const proposalId = await createProposalFromDeal({ dealId: deal._id as any });
      if (proposalId) {
        toast.success("Draft proposal created from deal!", {
          description: "Redirecting to proposal builder...",
        });
        navigate(`/proposals/new?edit=${proposalId}`);
      } else {
        // Mutation returned undefined — likely not deployed or auth issue
        toast.error("Could not create proposal", {
          description: "Please make sure you're signed in and try again.",
        });
      }
    } catch (err: any) {
      console.error("Failed to create proposal from deal:", err);
      toast.error("Failed to create proposal from deal", {
        description: err?.message || "An unexpected error occurred",
      });
    } finally {
      setIsCreatingProposal(null);
    }
  }, [createProposalFromDeal, navigate]);

  // ── Import Handlers ──
  const handleFileUpload = useCallback((file: File) => {
    const extension = file.name.split(".").pop()?.toLowerCase();
    
    if (extension === "csv") {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const headers = results.meta.fields ?? [];
          const data = results.data as any[];
          setImportHeaders(headers);
          setImportData(data);
          setImportResult(null);
          // Auto-detect column mappings
          const mappings: Record<string, string> = {};
          for (const header of headers) {
            mappings[header] = autoDetectMapping(header);
          }
          setColumnMappings(mappings);
          // Default to first stage
          if (safeStages.length > 0 && !selectedStageId) {
            setSelectedStageId(safeStages[0]._id);
          }
        },
        error: () => {
          toast.error("Failed to parse CSV file");
        },
      });
    } else if (extension === "xlsx" || extension === "xls") {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const arrayBuffer = e.target?.result;
          if (!arrayBuffer) return;
          const workbook = XLSX.read(arrayBuffer, { type: "array" });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet, { defval: "" });
          if (jsonData.length === 0) {
            toast.error("No data found in the Excel file");
            return;
          }
          const headers = Object.keys(jsonData[0] as Record<string, unknown>);
          setImportHeaders(headers);
          setImportData(jsonData as any[]);
          setImportResult(null);
          // Auto-detect column mappings
          const mappings: Record<string, string> = {};
          for (const header of headers) {
            mappings[header] = autoDetectMapping(header);
          }
          setColumnMappings(mappings);
          if (safeStages.length > 0 && !selectedStageId) {
            setSelectedStageId(safeStages[0]._id);
          }
        } catch {
          toast.error("Failed to parse Excel file");
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      toast.error("Unsupported file format. Please upload CSV or Excel files.");
    }
  }, [safeStages, selectedStageId]);

  const handleDropFile = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  }, [handleFileUpload]);

  const handleDragOverFile = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeaveFile = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleImport = useCallback(async () => {
    if (!workspaceId || !selectedStageId) {
      toast.error("Please select a workspace and pipeline stage");
      return;
    }

    // Validate required fields
    const hasTitleMapping = Object.values(columnMappings).some(m => m === "title");
    if (!hasTitleMapping) {
      toast.error("Please map at least one column to the Title field");
      return;
    }

    setIsImporting(true);
    try {
      const deals = importData.map(row => {
        const deal: any = {};
        const customFields: Record<string, any> = {};
        
        for (const [csvCol, field] of Object.entries(columnMappings)) {
          if (field === "_skip") continue;
          if (field === "custom") {
            customFields[csvCol] = row[csvCol];
          } else {
            deal[field] = row[csvCol];
          }
        }
        
        if (Object.keys(customFields).length > 0) {
          deal.customFields = customFields;
        }
        
        // Ensure title is present
        if (!deal.title) deal.title = "Untitled Deal";
        // Convert value to number
        if (deal.value) deal.value = Number(String(deal.value).replace(/[^0-9.-]/g, "")) || 0;
        if (deal.probability) deal.probability = Number(deal.probability) || 20;
        // Convert date strings to timestamps
        if (deal.expectedCloseDate && typeof deal.expectedCloseDate === "string") {
          const parsed = new Date(deal.expectedCloseDate);
          if (!isNaN(parsed.getTime())) {
            deal.expectedCloseDate = parsed.getTime();
          } else {
            delete deal.expectedCloseDate;
          }
        }
        
        return deal;
      }).filter(d => d.title);

      const result = await bulkImportMutation({
        workspaceId,
        stageId: selectedStageId,
        deals,
        skipDuplicates: true,
      });
      setImportResult(result as { imported: number; skipped: number; errors: string[] });
      toast.success(`Imported ${(result as any).imported} deals!`);
    } catch (err: any) {
      console.error("Import failed:", err);
      toast.error("Import failed", { description: err?.message || "An unexpected error occurred" });
    } finally {
      setIsImporting(false);
    }
  }, [workspaceId, selectedStageId, columnMappings, importData, bulkImportMutation]);

  const handleOpenImportDialog = useCallback(() => {
    setImportData([]);
    setImportHeaders([]);
    setColumnMappings({});
    setImportResult(null);
    setIsImporting(false);
    if (safeStages.length > 0) {
      setSelectedStageId(safeStages[0]._id);
    }
    setImportDialogOpen(true);
  }, [safeStages]);

  // ─── RENDER ────────────────────────────────────────────────────────────

  return (
    <div className="w-full min-h-screen bg-background text-foreground">
      <PageLayout spaced>
        {/* ── Page Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-[32px] font-bold tracking-tight mb-1">
              Deal Pipeline
            </h1>
            <p className="text-muted-foreground text-sm">
              Track and manage your deals from lead to close
            </p>
          </div>
          <div className="flex items-center gap-3">
            {import.meta.env.DEV && safeDeals.length === 0 && !isLoading && (
              <Button
                onClick={handleSeedData}
                disabled={isSeeding}
                variant="outline"
                className="gap-2"
              >
                {isSeeding ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      repeat: Infinity,
                      duration: 1,
                      ease: "linear",
                    }}
                  >
                    <Zap className="h-4 w-4" />
                  </motion.div>
                ) : (
                  <Zap className="h-4 w-4" />
                )}
                Load Demo Data
              </Button>
            )}
            <Button
              onClick={handleOpenImportDialog}
              variant="outline"
              className="gap-2"
              disabled={safeStages.length === 0}
            >
              <Upload className="h-4 w-4" />
              Import
            </Button>
            <Button
              onClick={() => {
                if (safeStages.length > 0) {
                  handleOpenCreateDialog(safeStages[0]._id);
                }
              }}
              disabled={safeStages.length === 0}
              className="gap-2 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white"
            >
              <Plus className="h-4 w-4" />
              Add Deal
            </Button>
          </div>
        </div>

        {/* ── Stats Bar ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            icon={<BarChart3 className="h-5 w-5" />}
            label="Total Deals"
            value={isLoading ? "—" : String(safeStats.totalDeals)}
            accent="#8B5CF6"
          />
          <StatsCard
            icon={<DollarSign className="h-5 w-5" />}
            label="Pipeline Value"
            value={isLoading ? "—" : formatCurrency(safeStats.totalValue)}
            accent="#6366f1"
          />
          <StatsCard
            icon={<TrendingUp className="h-5 w-5" />}
            label="Weighted Value"
            value={isLoading ? "—" : formatCurrency(safeStats.weightedValue)}
            subtitle="Value × Probability"
            accent="#a855f7"
          />
          <StatsCard
            icon={<Target className="h-5 w-5" />}
            label="Win Rate"
            value={isLoading ? "—" : `${winRate}%`}
            subtitle="Won vs Lost deals"
            accent="#22c55e"
          />
        </div>

        {/* ── Kanban Board ── */}
        {showLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-12 w-full rounded-lg" />
                <Skeleton className="h-28 w-full rounded-lg" />
                <Skeleton className="h-28 w-full rounded-lg" />
              </div>
            ))}
          </div>
        ) : safeStages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <BarChart3 className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Pipeline Stages</h3>
            <p className="text-muted-foreground text-sm max-w-md mb-6">
              Create default stages to start tracking your deals through the
              pipeline.
            </p>
            <Button
              onClick={() => createDefaultStages(workspaceId ? { workspaceId } : {})}
              className="gap-2 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white"
            >
              <Plus className="h-4 w-4" />
              Create Default Stages
            </Button>
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-thin">
            {safeStages.map((stage) => {
              const stageDeals = dealsByStage.get(stage._id) ?? [];
              const stageValue = stageDeals.reduce(
                (sum, d) => sum + d.value,
                0
              );
              const isDragOver = dragOverStageId === stage._id;

              return (
                <div
                  key={stage._id}
                  className={`
                    flex-shrink-0 w-[280px] sm:w-[300px] snap-start
                    flex flex-col rounded-xl border
                    transition-colors duration-200
                    ${
                      isDragOver
                        ? "border-[#8B5CF6] bg-[#8B5CF6]/5 shadow-[0_0_20px_rgba(139,92,246,0.15)]"
                        : "border-border bg-muted/30"
                    }
                  `}
                  onDragOver={(e) => handleDragOver(e, stage._id)}
                  onDragLeave={(e) => handleDragLeave(e, stage._id)}
                  onDrop={(e) => handleDrop(e, stage._id)}
                >
                  {/* ── Stage Header ── */}
                  <div
                    className="px-4 py-3 rounded-t-xl border-b"
                    style={{
                      borderColor: `${stage.color}30`,
                      backgroundColor: `${stage.color}08`,
                    }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: stage.color }}
                        />
                        <h3 className="font-semibold text-sm">{stage.name}</h3>
                      </div>
                      <Badge
                        variant="secondary"
                        className="text-xs h-5 px-1.5"
                      >
                        {stageDeals.length}
                      </Badge>
                    </div>
                    <p
                      className="text-xs font-medium"
                      style={{ color: stage.color }}
                    >
                      {formatCurrency(stageValue)}
                    </p>
                  </div>

                  {/* ── Deal Cards ── */}
                  <div className="flex-1 p-2 space-y-2 min-h-[120px] max-h-[calc(100vh-360px)] overflow-y-auto scrollbar-thin">
                      {stageDeals.map((deal) => (
                        <DealCard
                          key={deal._id}
                          deal={deal}
                          stage={stage}
                          isDragging={
                            draggedDeal?._id === deal._id
                          }
                          isCreatingProposal={isCreatingProposal === deal._id}
                          onDragStart={handleDragStart}
                          onDragEnd={handleDragEnd}
                          onClick={() => openDealDetail(deal)}
                          onCreateProposal={() => handleCreateProposalFromDeal(deal)}
                        />
                      ))}

                    {stageDeals.length === 0 && !isDragOver && (
                      <div className="flex items-center justify-center h-20 text-xs text-muted-foreground/60">
                        Drop deals here
                      </div>
                    )}
                  </div>

                  {/* ── Add Deal Button ── */}
                  <div className="p-2 pt-0">
                    <button
                      onClick={() => handleOpenCreateDialog(stage._id)}
                      className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Deal
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Tab Navigation: Pipeline | Share Records ── */}
        <div className="flex items-center gap-1 border-b border-border pb-0 mt-6">
          <button
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === "pipeline"
                ? "border-[#8B5CF6] text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setActiveTab("pipeline")}
          >
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Pipeline
            </div>
          </button>
          <button
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === "share-records"
                ? "border-[#8B5CF6] text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setActiveTab("share-records")}
          >
            <div className="flex items-center gap-2">
              <Share2 className="h-4 w-4" />
              Share Records
            </div>
          </button>
        </div>

        {/* ── Tab Content ── */}
        {activeTab === "share-records" && (
          <div className="mt-6">
            <ShareRecordsPanel />
          </div>
        )}
      </PageLayout>

      {/* ── Create Deal Dialog ── */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-[#8B5CF6]" />
              Create New Deal
            </DialogTitle>
            <DialogDescription>
              Add a new deal to your pipeline
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            {/* Stage */}
            <div className="grid gap-2">
              <Label>Stage</Label>
              <Select
                value={formStageId ?? undefined}
                onValueChange={(val) =>
                  setFormStageId(val as Id<"pipelineStages">)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select stage" />
                </SelectTrigger>
                <SelectContent>
                  {safeStages.map((stage) => (
                    <SelectItem key={stage._id} value={stage._id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: stage.color }}
                        />
                        {stage.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Title */}
            <div className="grid gap-2">
              <Label htmlFor="deal-title">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="deal-title"
                placeholder="E.g., Website Redesign"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
              />
            </div>

            {/* Value & Probability */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="deal-value">
                  Value ($) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="deal-value"
                  type="number"
                  placeholder="10000"
                  value={formValue}
                  onChange={(e) => setFormValue(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="deal-probability">Probability (%)</Label>
                <Input
                  id="deal-probability"
                  type="number"
                  min={0}
                  max={100}
                  placeholder="50"
                  value={formProbability}
                  onChange={(e) => setFormProbability(e.target.value)}
                />
              </div>
            </div>

            {/* Source */}
            <div className="grid gap-2">
              <Label>Source</Label>
              <Select value={formSource} onValueChange={setFormSource}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  {SOURCE_OPTIONS.map((src) => (
                    <SelectItem key={src.value} value={src.value}>
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: src.color }}
                        />
                        {src.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Contact Name & Email */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="deal-contact-name">Contact Name</Label>
                <Input
                  id="deal-contact-name"
                  placeholder="John Doe"
                  value={formContactName}
                  onChange={(e) => setFormContactName(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="deal-contact-email">Contact Email</Label>
                <Input
                  id="deal-contact-email"
                  type="email"
                  placeholder="john@example.com"
                  value={formContactEmail}
                  onChange={(e) => setFormContactEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Expected Close Date */}
            <div className="grid gap-2">
              <Label htmlFor="deal-close-date">Expected Close Date</Label>
              <Input
                id="deal-close-date"
                type="date"
                value={formCloseDate}
                onChange={(e) => setFormCloseDate(e.target.value)}
              />
            </div>

            {/* Notes */}
            <div className="grid gap-2">
              <Label htmlFor="deal-notes">Notes</Label>
              <Textarea
                id="deal-notes"
                placeholder="Any additional notes..."
                rows={3}
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateDeal}
              disabled={isCreating || !formTitle.trim() || !formValue}
              className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white"
            >
              {isCreating ? "Creating..." : "Create Deal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Deal Detail Dialog ── */}
      <Dialog
        open={detailDeal !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDetailDeal(null);
            setEditMode(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
          {detailDeal && (
            <>
              {!editMode ? (
                <>
                  {/* ── View Mode ── */}
                  <DialogHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <DialogTitle className="text-xl">
                          {detailDeal.title}
                        </DialogTitle>
                        <DialogDescription>
                          {safeStages.find(
                            (s) => s._id === detailDeal.stageId
                          )?.name ?? "Unknown Stage"}{" "}
                          ·{" "}
                          {formatCurrency(detailDeal.value)} ·{" "}
                          {detailDeal.probability}% probability
                        </DialogDescription>
                      </div>
                    </div>
                  </DialogHeader>

                  <div className="space-y-4 py-2">
                    {/* Value & Probability */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-lg border border-border p-3 space-y-1">
                        <p className="text-xs text-muted-foreground">
                          Deal Value
                        </p>
                        <p className="text-lg font-bold">
                          {formatCurrency(detailDeal.value)}
                        </p>
                      </div>
                      <div className="rounded-lg border border-border p-3 space-y-1">
                        <p className="text-xs text-muted-foreground">
                          Weighted Value
                        </p>
                        <p className="text-lg font-bold text-[#8B5CF6]">
                          {formatCurrency(
                            detailDeal.value *
                              (detailDeal.probability / 100)
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Details Grid */}
                    <div className="space-y-3">
                      {detailDeal.source && (
                        <DetailRow
                          icon={<FileText className="h-4 w-4" />}
                          label="Source"
                          value={
                            <Badge
                              variant="secondary"
                              className="gap-1.5 text-xs"
                            >
                              <div
                                className="h-1.5 w-1.5 rounded-full"
                                style={{
                                  backgroundColor: getSourceInfo(
                                    detailDeal.source
                                  ).color,
                                }}
                              />
                              {getSourceInfo(detailDeal.source).label}
                            </Badge>
                          }
                        />
                      )}
                      {detailDeal.contactName && (
                        <DetailRow
                          icon={<User className="h-4 w-4" />}
                          label="Contact"
                          value={detailDeal.contactName}
                        />
                      )}
                      {detailDeal.contactEmail && (
                        <DetailRow
                          icon={<Mail className="h-4 w-4" />}
                          label="Email"
                          value={detailDeal.contactEmail}
                        />
                      )}
                      {detailDeal.expectedCloseDate && (
                        <DetailRow
                          icon={<Calendar className="h-4 w-4" />}
                          label="Expected Close"
                          value={
                            <span className="flex items-center gap-2">
                              {formatDate(detailDeal.expectedCloseDate)}
                              {(() => {
                                const days = daysUntilClose(
                                  detailDeal.expectedCloseDate
                                );
                                if (days === null) return null;
                                if (days < 0)
                                  return (
                                    <Badge
                                      variant="destructive"
                                      className="text-[10px] h-4 px-1"
                                    >
                                      {Math.abs(days)}d overdue
                                    </Badge>
                                  );
                                if (days <= 7)
                                  return (
                                    <Badge
                                      variant="secondary"
                                      className="text-[10px] h-4 px-1 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                    >
                                      {days}d left
                                    </Badge>
                                  );
                                return (
                                  <span className="text-xs text-muted-foreground">
                                    ({days}d left)
                                  </span>
                                );
                              })()}
                            </span>
                          }
                        />
                      )}
                      {detailDeal.description && (
                        <DetailRow
                          icon={<FileText className="h-4 w-4" />}
                          label="Description"
                          value={detailDeal.description}
                        />
                      )}
                      {detailDeal.notes && (
                        <div className="rounded-lg border border-border p-3 space-y-1">
                          <p className="text-xs text-muted-foreground font-medium">
                            Notes
                          </p>
                          <p className="text-sm whitespace-pre-wrap">
                            {detailDeal.notes}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Move to Stage */}
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground font-medium">
                        Move to Stage
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {safeStages
                          .filter((s) => s._id !== detailDeal.stageId)
                          .map((stage) => (
                            <TooltipProvider key={stage._id}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={() =>
                                      handleMoveDealToStage(
                                        detailDeal._id,
                                        stage._id
                                      )
                                    }
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border border-border hover:border-[#8B5CF6]/40 hover:bg-[#8B5CF6]/5 transition-colors"
                                  >
                                    <div
                                      className="h-2 w-2 rounded-full"
                                      style={{
                                        backgroundColor: stage.color,
                                      }}
                                    />
                                    {stage.name}
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  Move to {stage.name}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ))}
                      </div>
                    </div>
                  </div>

                  <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setDeleteConfirmOpen(true)}
                      className="gap-1.5"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </Button>
                    <div className="flex-1" />
                    <Button
                      size="sm"
                      onClick={() => {
                        if (detailDeal) handleCreateProposalFromDeal(detailDeal);
                      }}
                      disabled={isCreatingProposal === detailDeal?._id}
                      className="gap-1.5 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white"
                    >
                      {isCreatingProposal === detailDeal?._id ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                        >
                          <Zap className="h-3.5 w-3.5" />
                        </motion.div>
                      ) : (
                        <FileText className="h-3.5 w-3.5" />
                      )}
                      Make Proposal
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditMode(true)}
                      className="gap-1.5"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                  </DialogFooter>
                </>
              ) : (
                <>
                  {/* ── Edit Mode ── */}
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Pencil className="h-5 w-5 text-[#8B5CF6]" />
                      Edit Deal
                    </DialogTitle>
                    <DialogDescription>
                      Update deal details
                    </DialogDescription>
                  </DialogHeader>

                  <div className="grid gap-4 py-2">
                    {/* Stage */}
                    <div className="grid gap-2">
                      <Label>Stage</Label>
                      <Select
                        value={editStageId ?? undefined}
                        onValueChange={(val) =>
                          setEditStageId(val as Id<"pipelineStages">)
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select stage" />
                        </SelectTrigger>
                        <SelectContent>
                          {safeStages.map((stage) => (
                            <SelectItem key={stage._id} value={stage._id}>
                              <div className="flex items-center gap-2">
                                <div
                                  className="h-2 w-2 rounded-full"
                                  style={{
                                    backgroundColor: stage.color,
                                  }}
                                />
                                {stage.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Title */}
                    <div className="grid gap-2">
                      <Label htmlFor="edit-title">Title</Label>
                      <Input
                        id="edit-title"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                      />
                    </div>

                    {/* Value & Probability */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="edit-value">Value ($)</Label>
                        <Input
                          id="edit-value"
                          type="number"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="edit-probability">
                          Probability (%)
                        </Label>
                        <Input
                          id="edit-probability"
                          type="number"
                          min={0}
                          max={100}
                          value={editProbability}
                          onChange={(e) => setEditProbability(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Source */}
                    <div className="grid gap-2">
                      <Label>Source</Label>
                      <Select value={editSource} onValueChange={setEditSource}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select source" />
                        </SelectTrigger>
                        <SelectContent>
                          {SOURCE_OPTIONS.map((src) => (
                            <SelectItem key={src.value} value={src.value}>
                              <div className="flex items-center gap-2">
                                <div
                                  className="h-2 w-2 rounded-full"
                                  style={{
                                    backgroundColor: src.color,
                                  }}
                                />
                                {src.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Contact Name & Email */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="edit-contact-name">Contact Name</Label>
                        <Input
                          id="edit-contact-name"
                          value={editContactName}
                          onChange={(e) => setEditContactName(e.target.value)}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="edit-contact-email">Contact Email</Label>
                        <Input
                          id="edit-contact-email"
                          type="email"
                          value={editContactEmail}
                          onChange={(e) => setEditContactEmail(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Expected Close Date */}
                    <div className="grid gap-2">
                      <Label htmlFor="edit-close-date">Expected Close</Label>
                      <Input
                        id="edit-close-date"
                        type="date"
                        value={editCloseDate}
                        onChange={(e) => setEditCloseDate(e.target.value)}
                      />
                    </div>

                    {/* Notes */}
                    <div className="grid gap-2">
                      <Label htmlFor="edit-notes">Notes</Label>
                      <Textarea
                        id="edit-notes"
                        rows={3}
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                      />
                    </div>
                  </div>

                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setEditMode(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleUpdateDeal}
                      className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white"
                    >
                      Save Changes
                    </Button>
                  </DialogFooter>
                </>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ── */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Deal</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{detailDeal?.title}&quot;?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDeal}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── CSV Import Dialog ── */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import Deals</DialogTitle>
            <DialogDescription>
              Upload a CSV or Excel file to bulk import deals into your pipeline.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Import Result */}
            {importResult && (
              <div className="rounded-lg border p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Import Complete
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Imported:</span>{" "}
                    <span className="font-semibold text-emerald-600">{importResult.imported}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Skipped:</span>{" "}
                    <span className="font-semibold text-amber-600">{importResult.skipped}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Errors:</span>{" "}
                    <span className="font-semibold text-red-600">{importResult.errors.length}</span>
                  </div>
                </div>
                {importResult.errors.length > 0 && (
                  <div className="mt-2 text-xs text-red-600 space-y-1 max-h-32 overflow-y-auto">
                    {importResult.errors.map((err, i) => (
                      <div key={i} className="flex items-start gap-1">
                        <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
                        {err}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Stage Selector */}
            <div className="space-y-2">
              <Label>Import into Stage *</Label>
              <Select
                value={selectedStageId ?? ""}
                onValueChange={(val) => setSelectedStageId(val as Id<"pipelineStages">)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a pipeline stage" />
                </SelectTrigger>
                <SelectContent>
                  {safeStages.map((stage) => (
                    <SelectItem key={stage._id} value={stage._id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: stage.color }}
                        />
                        {stage.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* File Upload / Drag & Drop Zone */}
            {importData.length === 0 ? (
              <div
                className={`
                  border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                  transition-colors duration-200
                  ${isDragOver
                    ? "border-[#8B5CF6] bg-[#8B5CF6]/5"
                    : "border-muted-foreground/25 hover:border-[#8B5CF6]/50 hover:bg-muted/30"
                  }
                `}
                onDragOver={handleDragOverFile}
                onDragLeave={handleDragLeaveFile}
                onDrop={handleDropFile}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm font-medium mb-1">
                  Drop your file here, or click to browse
                </p>
                <p className="text-xs text-muted-foreground">
                  Supports .csv, .xlsx, .xls files
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                    e.target.value = "";
                  }}
                />
              </div>
            ) : (
              <>
                {/* Column Mapping */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Column Mapping</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => {
                        setImportData([]);
                        setImportHeaders([]);
                        setColumnMappings({});
                        setImportResult(null);
                      }}
                    >
                      Change File
                    </Button>
                  </div>
                  <div className="text-xs text-muted-foreground mb-2">
                    {importData.length} rows detected • Showing first 5 rows preview
                  </div>
                  <div className="space-y-2">
                    {importHeaders.map((header) => (
                      <div key={header} className="flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{header}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {String(importData[0]?.[header] ?? "").slice(0, 40)}
                          </div>
                        </div>
                        <Select
                          value={columnMappings[header] ?? "_skip"}
                          onValueChange={(val) =>
                            setColumnMappings((prev) => ({ ...prev, [header]: val }))
                          }
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CORE_FIELDS.map((field) => (
                              <SelectItem key={field.value} value={field.value}>
                                {field.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Preview Table */}
                {importData.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Preview (first 5 rows)</Label>
                    <div className="border rounded-lg overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-muted/50 border-b">
                            {importHeaders
                              .filter((h) => columnMappings[h] && columnMappings[h] !== "_skip")
                              .map((header) => (
                                <th key={header} className="text-left px-3 py-2 font-medium">
                                  {CORE_FIELDS.find((f) => f.value === columnMappings[header])?.label ?? header}
                                </th>
                              ))}
                          </tr>
                        </thead>
                        <tbody>
                          {importData.slice(0, 5).map((row, i) => (
                            <tr key={i} className="border-b last:border-0">
                              {importHeaders
                                .filter((h) => columnMappings[h] && columnMappings[h] !== "_skip")
                                .map((header) => (
                                  <td key={header} className="px-3 py-1.5 max-w-[200px] truncate">
                                    {String(row[header] ?? "")}
                                  </td>
                                ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setImportDialogOpen(false)}
              disabled={isImporting}
            >
              {importResult ? "Close" : "Cancel"}
            </Button>
            {importData.length > 0 && !importResult && (
              <Button
                onClick={handleImport}
                disabled={isImporting || !selectedStageId || !workspaceId}
                className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white gap-2"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Import {importData.length} Deals
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Sub-Components ─────────────────────────────────────────────────────────

/** Stats card in the top bar */
function StatsCard({
  icon,
  label,
  value,
  subtitle,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtitle?: string;
  accent: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="py-4 gap-3 hover:shadow-md transition-shadow min-h-[88px]">
        <CardHeader className="pb-0 pt-0 px-4">
          <div className="flex items-center gap-2">
            <div
              className="h-8 w-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${accent}15`, color: accent }}
            >
              {icon}
            </div>
            <CardTitle className="text-xs text-muted-foreground font-medium">
              {label}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-0 px-4">
          <p className="text-2xl font-bold tracking-tight">{value}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5 min-h-[16px]">
            {subtitle ?? "\u00A0"}
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/** Individual deal card within a Kanban column */
function DealCard({
  deal,
  stage,
  isDragging,
  isCreatingProposal,
  onDragStart,
  onDragEnd,
  onClick,
  onCreateProposal,
}: {
  deal: Deal;
  stage: Stage;
  isDragging: boolean;
  isCreatingProposal: boolean;
  onDragStart: (e: React.DragEvent, deal: Deal) => void;
  onDragEnd: () => void;
  onClick: () => void;
  onCreateProposal: () => void;
}) {
  const sourceInfo = getSourceInfo(deal.source);
  const daysLeft = daysUntilClose(deal.expectedCloseDate);
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, deal)}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={`
        group relative p-3 rounded-lg border cursor-pointer
        transition-all duration-150 select-none
        ${
          isDragging
            ? "border-[#8B5CF6]/40 bg-[#8B5CF6]/5 shadow-lg z-50 opacity-50 scale-[1.02]"
            : "border-border bg-card hover:border-[#8B5CF6]/25 hover:shadow-sm"
        }
      `}
    >
      {/* Drag handle + Create Proposal buttons */}
      <div className="absolute top-2 right-2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          className="h-6 w-6 flex items-center justify-center rounded-md hover:bg-[#8B5CF6]/10 text-muted-foreground hover:text-[#8B5CF6] transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onCreateProposal();
          }}
          disabled={isCreatingProposal}
          title="Create Proposal from this deal"
        >
          {isCreatingProposal ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            >
              <Zap className="h-3 w-3" />
            </motion.div>
          ) : (
            <FileText className="h-3 w-3" />
          )}
        </button>
        <GripVertical className="h-3.5 w-3.5 opacity-50" />
      </div>

      {/* Title & Value */}
      <div className="mb-2">
        <h4 className="text-sm font-semibold leading-tight pr-6 line-clamp-2">
          {deal.title}
        </h4>
        <div className="flex items-baseline gap-1.5 mt-1">
          <span className="text-sm font-bold">
            {formatCurrency(deal.value)}
          </span>
          <span className="text-[10px] text-muted-foreground">
            ({deal.probability}%)
          </span>
        </div>
      </div>

      {/* Weighted Value Bar */}
      <div className="mb-2">
        <div className="h-1 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${deal.probability}%`,
              backgroundColor: stage.color,
            }}
          />
        </div>
      </div>

      {/* Source Badge */}
      {deal.source && (
        <div className="mb-2">
          <Badge
            variant="secondary"
            className="text-[10px] h-5 px-1.5 gap-1"
          >
            <div
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: sourceInfo.color }}
            />
            {sourceInfo.label}
          </Badge>
        </div>
      )}

      {/* Footer: Contact + Date */}
      <div className="flex items-center justify-between gap-2 mt-1">
        {deal.contactName ? (
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground min-w-0">
            <User className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{deal.contactName}</span>
          </div>
        ) : (
          <div />
        )}
        {deal.expectedCloseDate && (
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground flex-shrink-0">
            <Calendar className="h-3 w-3" />
            {daysLeft !== null && daysLeft < 0 ? (
              <span className="text-destructive font-medium">
                {Math.abs(daysLeft)}d overdue
              </span>
            ) : daysLeft !== null && daysLeft <= 7 ? (
              <span className="text-amber-500 font-medium">{daysLeft}d</span>
            ) : (
              <span>{formatDate(deal.expectedCloseDate)}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** Row in the deal detail dialog */
function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-muted-foreground">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
        <div className="text-sm">{value}</div>
      </div>
    </div>
  );
}
