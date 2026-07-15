import { useState, useCallback, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@/lib/safe-convex-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
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
} from "lucide-react";

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
  // ── Convex Queries & Mutations ──
  const stages = useQuery(api.pipeline.crud.getStages, {}) as
    | Stage[]
    | undefined;
  const deals = useQuery(api.pipeline.crud.getDeals, {}) as
    | Deal[]
    | undefined;
  const stats = useQuery(api.pipeline.crud.getPipelineStats, {}) as
    | PipelineStats
    | undefined;

  const createDefaultStages = useMutation(api.pipeline.crud.createDefaultStages);
  const createDealMutation = useMutation(api.pipeline.crud.createDeal);
  const moveDealMutation = useMutation(api.pipeline.crud.moveDeal);
  const updateDealMutation = useMutation(api.pipeline.crud.updateDeal);
  const deleteDealMutation = useMutation(api.pipeline.crud.deleteDeal);
  const seedMockPipeline = useMutation(api.seedNew.seedMockPipeline);

  // ── Local State ──
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  // Track which stage the create dialog was opened from (kept for future use)
  const [detailDeal, setDetailDeal] = useState<Deal | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [dragOverStageId, setDragOverStageId] = useState<Id<"pipelineStages"> | null>(null);

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

  // ── Derived State ──
  const safeStages = useMemo(() => stages ?? [], [stages]);
  const safeDeals = useMemo(() => deals ?? [], [deals]);
  const safeStats = useMemo(
    () =>
      stats ?? {
        totalDeals: 0,
        totalValue: 0,
        weightedValue: 0,
        byStage: [],
      },
    [stats]
  );
  const isLoading = stages === undefined || deals === undefined;

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
  useEffect(() => {
    if (stages !== undefined && stages.length === 0) {
      createDefaultStages({}).catch(() => {
        // Silently fail - user might not be authenticated
      });
    }
  }, [stages, createDefaultStages]);

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
  ]);

  const handleSeedData = useCallback(async () => {
    setIsSeeding(true);
    try {
      const result = await seedMockPipeline({});
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
  }, [seedMockPipeline]);

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
      try {
        await moveDealMutation({
          dealId: draggedDeal._id,
          stageId: targetStageId,
        });
        toast.success(
          `Moved "${draggedDeal.title}" to ${safeStages.find((s) => s._id === targetStageId)?.name ?? "new stage"}`
        );
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
      try {
        await moveDealMutation({ dealId, stageId: targetStageId });
        const stageName =
          safeStages.find((s) => s._id === targetStageId)?.name ?? "stage";
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

  // ─── RENDER ────────────────────────────────────────────────────────────

  return (
    <div className="w-full min-h-screen bg-background text-foreground">
      <div className="p-6 space-y-6">
        {/* ── Page Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-[32px] font-bold tracking-tight mb-1">
              Deal Pipeline
            </h1>
            <p className="text-muted-foreground text-sm">
              Track and manage your deals from lead to close
            </p>
          </div>
          <div className="flex items-center gap-3">
            {safeDeals.length === 0 && !isLoading && (
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
            accent="#22c55e"
          />
        </div>

        {/* ── Kanban Board ── */}
        {isLoading ? (
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
              onClick={() => createDefaultStages({})}
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
                    <AnimatePresence mode="popLayout">
                      {stageDeals.map((deal) => (
                        <DealCard
                          key={deal._id}
                          deal={deal}
                          stage={stage}
                          isDragging={
                            draggedDeal?._id === deal._id
                          }
                          onDragStart={handleDragStart}
                          onDragEnd={handleDragEnd}
                          onClick={() => openDealDetail(deal)}
                        />
                      ))}
                    </AnimatePresence>

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
      </div>

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
      <Card className="py-4 gap-3 hover:shadow-md transition-shadow">
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
          {subtitle && (
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {subtitle}
            </p>
          )}
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
  onDragStart,
  onDragEnd,
  onClick,
}: {
  deal: Deal;
  stage: Stage;
  isDragging: boolean;
  onDragStart: (e: React.DragEvent, deal: Deal) => void;
  onDragEnd: () => void;
  onClick: () => void;
}) {
  const sourceInfo = getSourceInfo(deal.source);
  const daysLeft = daysUntilClose(deal.expectedCloseDate);
  return (
    <motion.div
      layout
      layoutId={deal._id}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{
        opacity: isDragging ? 0.5 : 1,
        scale: isDragging ? 1.02 : 1,
      }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2 }}
      draggable
      onDragStart={(e) => onDragStart(e as unknown as React.DragEvent, deal)}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={`
        group relative p-3 rounded-lg border cursor-pointer
        transition-all duration-150 select-none
        ${
          isDragging
            ? "border-[#8B5CF6]/40 bg-[#8B5CF6]/5 shadow-lg z-50"
            : "border-border bg-card hover:border-[#8B5CF6]/25 hover:shadow-sm"
        }
      `}
    >
      {/* Drag handle indicator */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-50 transition-opacity">
        <GripVertical className="h-3.5 w-3.5" />
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
    </motion.div>
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
