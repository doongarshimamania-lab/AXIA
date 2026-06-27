import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Target,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  Clock,
  Flame,
  TrendingUp,
  Calendar,
  Flag,
  BarChart3,
  Loader2,
  Tag as TagIcon,
  X,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { useWorkspaceContext } from "@/hooks/use-workspace"; // ponytail: workspace scoping for goals queries/mutations
import { useQuery, useMutation, useQueryTimeout, useConvexConnectionState } from "@/lib/safe-convex-react";
import { api } from "@/convex/_generated/api";
import { PageLayout } from "@/components/design-system/PageLayout";
// ponytail: import reusable tag components for picker, badges, and filter bar.
import { TagPicker, TagBadges } from "@/components/tags";

// ─── Helpers ─────────────────────────────────────────────────────────────────

type GoalStatus = "not_started" | "in_progress" | "completed" | "abandoned";

const STATUS_CONFIG: Record<
  GoalStatus,
  { label: string; color: string; bgColor: string; icon: React.ReactNode }
> = {
  not_started: {
    label: "Not Started",
    color: "text-gray-700 dark:text-gray-400",
    bgColor: "bg-gray-100 dark:bg-gray-900/30",
    icon: <Clock className="h-3 w-3" />,
  },
  in_progress: {
    label: "In Progress",
    color: "text-emerald-700 dark:text-emerald-400",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
    icon: <TrendingUp className="h-3 w-3" />,
  },
  completed: {
    label: "Completed",
    color: "text-primary",
    bgColor: "bg-primary/10",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  abandoned: {
    label: "Abandoned",
    color: "text-red-700 dark:text-red-400",
    bgColor: "bg-red-100 dark:bg-red-900/30",
    icon: <Flag className="h-3 w-3" />,
  },
};

const GOAL_TYPES = [
  { value: "revenue", label: "Revenue" },
  { value: "hours", label: "Hours" },
  { value: "clients", label: "Clients" },
  { value: "protection", label: "Protection" },
  { value: "custom", label: "Custom" },
];

const UNIT_OPTIONS = [
  { value: "USD", label: "USD ($)" },
  { value: "hours", label: "Hours" },
  { value: "clients", label: "Clients" },
  { value: "score", label: "Score" },
  { value: "%", label: "Percentage (%)" },
];

const formatDate = (timestamp: number) => {
  const date = new Date(timestamp);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const daysUntil = (timestamp: number) => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(timestamp);
  target.setHours(0, 0, 0, 0);
  const diff = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function Goals() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  // ponytail: extract active workspace id so goals are scoped per-workspace (prevents cross-workspace data leak)
  const { activeWorkspaceId, isConvexConnected } = useWorkspaceContext();
  const workspaceId = isConvexConnected ? activeWorkspaceId : undefined;

  // ─── Convex queries & mutations ──────────────────────────────────────────
  // ponytail: pass workspaceId to scope the by_workspace index (falls back to by_user when undefined)
  const goalsData = useQuery(api.goals.crud.getGoals, { workspaceId: workspaceId as any });
  const createGoalMutation = useMutation(api.goals.crud.createGoal);
  const updateGoalMutation = useMutation(api.goals.crud.updateGoal);
  const deleteGoalMutation = useMutation(api.goals.crud.deleteGoal);
  const markGoalCompleteMutation = useMutation(api.goals.crud.markGoalComplete);
  const updateMilestoneMutation = useMutation(api.goals.crud.updateMilestone);
  // ponytail: generic setEntityTags mutation — used to attach tags to a freshly-created
  // goal (createGoal doesn't accept tagIds directly, so we patch after).
  const setEntityTagsMutation = useMutation(api.tags.crud.setEntityTags);
  // ponytail: load the workspace's tags so we can render TagBadges on each goal card
  // and a tag-filter chip bar above the list.
  const tagsData = useQuery(api.tags.crud.getTags, { workspaceId: workspaceId as any });
  const allTags: any[] = tagsData ?? [];

  // ─── Local state ────────────────────────────────────────────────────────
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<any>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingGoal, setDeletingGoal] = useState<any>(null);

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formType, setFormType] = useState("custom");
  const [formTarget, setFormTarget] = useState("");
  const [formCurrent, setFormCurrent] = useState("0");
  const [formUnit, setFormUnit] = useState("%");
  const [formDeadline, setFormDeadline] = useState("");
  const [formStatus, setFormStatus] = useState("not_started");
  // ponytail: detached TagPicker state for the Create + Edit dialogs — held locally
  // until the goal is created/updated, then persisted via setEntityTags.
  const [formTagIds, setFormTagIds] = useState<string[]>([]);
  // ponytail: tag-filter state for the goals list — null = no filter, string = tagId.
  const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null);

  // Mutation loading state
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCompleting, setIsCompleting] = useState<string | null>(null);

  // ─── Loading timeout pattern ────────────────────────────────────────────
  const { isDisconnected } = useConvexConnectionState();
  const timedOut = useQueryTimeout(!authLoading && goalsData === undefined, 3000);

  const isLoading = !authLoading && goalsData === undefined && !timedOut && !isDisconnected;

  // ─── Demo mode ──────────────────────────────────────────────────────────
  const isDemoMode = !authLoading && !isAuthenticated;

  // ─── Data resolution ────────────────────────────────────────────────────
  const goals = goalsData ?? [];

  // ── Computed Stats ──
  const activeGoals = goals.filter((g: any) => g.status === "in_progress").length;
  const completedGoals = goals.filter((g: any) => g.status === "completed").length;
  const completionRate =
    goals.length > 0 ? Math.round((completedGoals / goals.length) * 100) : 0;
  const longestStreak = goals.reduce((max: number, g: any) => Math.max(max, g.streak ?? 0), 0);

  // ── Filtering ──
  const filteredGoals =
    statusFilter === "all"
      ? (activeTagFilter
          ? goals.filter((g: any) => Array.isArray(g.tagIds) && g.tagIds.includes(activeTagFilter))
          : goals)
      : (activeTagFilter
          ? goals.filter((g: any) => g.status === statusFilter && Array.isArray(g.tagIds) && g.tagIds.includes(activeTagFilter))
          : goals.filter((g: any) => g.status === statusFilter));

  // ── Helpers ──
  const resetForm = () => {
    setFormTitle("");
    setFormDescription("");
    setFormType("custom");
    setFormTarget("");
    setFormCurrent("0");
    setFormUnit("%");
    setFormDeadline("");
    setFormStatus("not_started");
    // ponytail: also reset the form's tag selection so the next goal starts clean.
    setFormTagIds([]);
  };

  const getProgress = (goal: any) => {
    if (goal.target === 0) return goal.status === "completed" ? 100 : 0;
    return Math.min(Math.round((goal.current / goal.target) * 100), 100);
  };

  // ── Create ──
  const handleCreate = async () => {
    if (!formTitle.trim()) {
      toast.error("Goal title is required");
      return;
    }
    if (!formTarget) {
      toast.error("Target value is required");
      return;
    }

    const target = Number(formTarget);
    const current = Number(formCurrent) || 0;
    const deadline = formDeadline ? new Date(formDeadline).getTime() : undefined;

    if (isDemoMode) {
      toast.success(`Goal "${formTitle.trim()}" created! (Demo mode)`);
      resetForm();
      setCreateOpen(false);
      return;
    }

    setIsCreating(true);
    try {
      const newGoalId = await createGoalMutation({
        workspaceId: workspaceId as any, // ponytail: stamp the new goal with the active workspace
        title: formTitle.trim(),
        description: formDescription.trim() || undefined,
        type: formType,
        target,
        current,
        unit: formUnit,
        deadline,
        status: formStatus,
      });
      // ponytail: attach the form's selected tags to the new goal via the
      // generic setEntityTags mutation (createGoal doesn't accept tagIds).
      if (newGoalId && formTagIds.length > 0) {
        try {
          await setEntityTagsMutation({
            entityType: "goals",
            entityId: newGoalId,
            tagIds: formTagIds as any,
          });
        } catch (tagErr: any) {
          console.warn("[Goals] failed to attach tags to new goal:", tagErr?.message);
        }
      }
      resetForm();
      setCreateOpen(false);
      toast.success(`Goal "${formTitle.trim()}" created`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to create goal");
    } finally {
      setIsCreating(false);
    }
  };

  // ── Edit ──
  const openEdit = (goal: any) => {
    setEditingGoal(goal);
    setFormTitle(goal.title);
    setFormDescription(goal.description ?? "");
    setFormType(goal.type);
    setFormTarget(String(goal.target));
    setFormCurrent(String(goal.current));
    setFormUnit(goal.unit);
    setFormDeadline(goal.deadline ? new Date(goal.deadline).toISOString().split("T")[0] : "");
    setFormStatus(goal.status);
    // ponytail: seed the tag picker with the goal's existing tags (if any).
    setFormTagIds(Array.isArray(goal.tagIds) ? goal.tagIds : []);
    setEditOpen(true);
  };

  const handleEdit = async () => {
    if (!editingGoal) return;
    if (!formTitle.trim()) {
      toast.error("Goal title is required");
      return;
    }

    const target = Number(formTarget);
    const deadline = formDeadline ? new Date(formDeadline).getTime() : undefined;

    if (isDemoMode) {
      toast.success(`Goal "${formTitle.trim()}" updated! (Demo mode)`);
      resetForm();
      setEditOpen(false);
      setEditingGoal(null);
      return;
    }

    setIsUpdating(true);
    try {
      await updateGoalMutation({
        goalId: editingGoal._id,
        title: formTitle.trim(),
        description: formDescription.trim() || undefined,
        type: formType,
        target,
        current: Number(formCurrent) || 0,
        unit: formUnit,
        deadline,
        status: formStatus,
      });
      // ponytail: sync the goal's tags after a successful edit (replace the full list).
      // We compare against the goal's existing tagIds to skip a no-op patch.
      const existingTagIds = Array.isArray(editingGoal.tagIds) ? editingGoal.tagIds : [];
      const sameLength = existingTagIds.length === formTagIds.length;
      const same = sameLength && existingTagIds.every((id: string) => formTagIds.includes(id));
      if (!same) {
        try {
          await setEntityTagsMutation({
            entityType: "goals",
            entityId: editingGoal._id,
            tagIds: formTagIds as any,
          });
        } catch (tagErr: any) {
          console.warn("[Goals] failed to attach tags to edited goal:", tagErr?.message);
        }
      }
      resetForm();
      setEditOpen(false);
      setEditingGoal(null);
      toast.success(`Goal "${formTitle.trim()}" updated`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to update goal");
    } finally {
      setIsUpdating(false);
    }
  };

  // ── Delete ──
  const openDelete = (goal: any) => {
    setDeletingGoal(goal);
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingGoal) return;

    if (isDemoMode) {
      toast.success(`Goal "${deletingGoal.title}" deleted! (Demo mode)`);
      setDeleteOpen(false);
      setDeletingGoal(null);
      return;
    }

    setIsDeleting(true);
    try {
      await deleteGoalMutation({ goalId: deletingGoal._id });
      setDeleteOpen(false);
      setDeletingGoal(null);
      toast.success(`Goal "${deletingGoal.title}" deleted`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete goal");
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Mark Complete ──
  const handleMarkComplete = async (goalId: any) => {
    const goal = goals.find((g: any) => g._id === goalId);
    if (!goal) return;

    if (isDemoMode) {
      toast.success(`Goal "${goal.title}" marked as complete! (Demo mode)`);
      return;
    }

    setIsCompleting(goalId);
    try {
      await markGoalCompleteMutation({ goalId });
      toast.success(`Goal "${goal.title}" marked as complete!`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to mark goal complete");
    } finally {
      setIsCompleting(null);
    }
  };

  // ── Toggle milestone ──
  const handleToggleMilestone = async (goalId: any, milestoneId: string, currentCompleted: boolean) => {
    if (isDemoMode) {
      toast.success(currentCompleted ? "Milestone unmarked! (Demo mode)" : "Milestone completed! (Demo mode)");
      return;
    }

    try {
      await updateMilestoneMutation({
        goalId,
        milestoneId,
        completed: !currentCompleted,
      });
    } catch (err: any) {
      toast.error(err?.message || "Failed to update milestone");
    }
  };

  // ── Map status filter labels ──
  const FILTER_OPTIONS = [
    { value: "all", label: "All" },
    { value: "in_progress", label: "In Progress" },
    { value: "not_started", label: "Not Started" },
    { value: "completed", label: "Completed" },
    { value: "abandoned", label: "Abandoned" },
  ];

  // ── Render ──
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full min-h-screen bg-background text-foreground"
    >
      <PageLayout spaced>
        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-[32px] font-bold text-foreground tracking-tight mb-2">
              Goals
            </h1>
            <p className="text-[16px] text-muted-foreground">
              Set and track professional goals to protect your income and grow your agency
            </p>
          </div>

          <Dialog
            open={createOpen}
            onOpenChange={(open) => {
              setCreateOpen(open);
              if (!open) resetForm();
            }}
          >
            <DialogTrigger asChild>
              <Button size="sm" className="bg-primary hover:bg-primary/90 shrink-0">
                <Plus className="mr-2 h-4 w-4" />
                Create Goal
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Create New Goal</DialogTitle>
                <DialogDescription>
                  Define a measurable goal with a deadline to keep your professional growth on track.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto pr-1">
                <div className="space-y-2">
                  <Label htmlFor="goal-title">Title</Label>
                  <Input
                    id="goal-title"
                    placeholder="e.g. Reach $10K monthly revenue"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="goal-description">Description</Label>
                  <Textarea
                    id="goal-description"
                    placeholder="What do you want to achieve and why?"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={formType} onValueChange={setFormType}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {GOAL_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Unit</Label>
                    <Select value={formUnit} onValueChange={setFormUnit}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {UNIT_OPTIONS.map((u) => (
                          <SelectItem key={u.value} value={u.value}>
                            {u.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="goal-target">Target</Label>
                    <Input
                      id="goal-target"
                      type="number"
                      placeholder="e.g. 10000"
                      value={formTarget}
                      onChange={(e) => setFormTarget(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="goal-current">Current</Label>
                    <Input
                      id="goal-current"
                      type="number"
                      placeholder="0"
                      value={formCurrent}
                      onChange={(e) => setFormCurrent(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="goal-date">Target Date</Label>
                  <Input
                    id="goal-date"
                    type="date"
                    value={formDeadline}
                    onChange={(e) => setFormDeadline(e.target.value)}
                  />
                </div>
                {/* ponytail: detached TagPicker — IDs are held in `formTagIds` and
                    attached after the goal is created via setEntityTags. */}
                <div className="space-y-2">
                  <Label>Tags (optional)</Label>
                  <TagPicker
                    entityType="goals"
                    initialTagIds={formTagIds}
                    onChange={setFormTagIds}
                    categoryHint="general"
                    placeholder="Add tags for this goal..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setCreateOpen(false);
                    resetForm();
                  }}
                  disabled={isCreating}
                >
                  Cancel
                </Button>
                <Button className="bg-primary hover:bg-primary/90" onClick={handleCreate} disabled={isCreating}>
                  {isCreating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Goal"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* ── Demo mode empty state ── */}
        {isDemoMode && (
          <Card className="p-8 bg-card rounded-xl border border-border">
            <div className="text-center space-y-4">
              <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Target className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Sign in to see your goals</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Connect your account to set and track professional goals.
                </p>
              </div>
              <Button asChild>
                <a href="/auth">Sign In</a>
              </Button>
            </div>
          </Card>
        )}

        {/* ── Loading state ── */}
        {isLoading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Skeleton className="h-[76px] rounded-xl" />
              <Skeleton className="h-[76px] rounded-xl" />
              <Skeleton className="h-[76px] rounded-xl" />
            </div>
            <Skeleton className="h-10 rounded-lg" />
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[200px] rounded-xl" />
            ))}
          </div>
        ) : (
          <>
            {/* ── Stats Cards ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-500/10">
                      <Target className="h-5 w-5 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Active Goals</p>
                      <p className="text-2xl font-bold">{activeGoals}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                      <BarChart3 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Completion Rate</p>
                      <p className="text-2xl font-bold">{completionRate}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-orange-500/10">
                      <Flame className="h-5 w-5 text-orange-500" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Best Streak</p>
                      <p className="text-2xl font-bold">
                        {longestStreak} {longestStreak === 1 ? "day" : "days"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* ── Status Filter ── */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-muted-foreground shrink-0">Filter:</span>
              {FILTER_OPTIONS.map((filter) => (
                <Button
                  key={filter.value}
                  variant={statusFilter === filter.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter(filter.value)}
                >
                  {filter.label}
                </Button>
              ))}
              {/* ponytail: tag-filter chip bar — toggle pattern, only renders when there
                  are tags to filter by. Stacks on top of the status filter. */}
              {allTags.length > 0 && (
                <span className="ml-2 inline-flex items-center gap-1.5 flex-wrap">
                  {allTags.map((t: any) => {
                    const isActive = activeTagFilter === t._id;
                    return (
                      <button
                        key={t._id}
                        type="button"
                        onClick={() => setActiveTagFilter(isActive ? null : t._id)}
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium border transition-colors ${
                          isActive
                            ? "bg-foreground text-background border-foreground"
                            : "bg-transparent text-muted-foreground border-border hover:bg-muted"
                        }`}
                        style={isActive ? undefined : { borderColor: (t.color ?? "#888") + "66", color: t.color ?? undefined }}
                      >
                        <span
                          className="inline-block w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: t.color ?? "#888" }}
                        />
                        {t.name}
                        {isActive && <X className="h-3 w-3 ml-0.5" />}
                      </button>
                    );
                  })}
                  {activeTagFilter && (
                    <button
                      type="button"
                      onClick={() => setActiveTagFilter(null)}
                      className="text-xs text-muted-foreground underline hover:text-foreground"
                    >
                      Clear
                    </button>
                  )}
                </span>
              )}
            </div>

            <Separator />

            {/* ── Goals List ── */}
            {filteredGoals.length === 0 ? (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center text-muted-foreground">
                    <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">No goals found</p>
                    <p className="text-sm">
                      {statusFilter !== "all"
                        ? "Try a different filter or create a new goal"
                        : "Create your first goal to start tracking your progress"}
                    </p>
                    {statusFilter === "all" && (
                      <Button
                        className="mt-4 bg-primary hover:bg-primary/90"
                        onClick={() => setCreateOpen(true)}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Create Your First Goal
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredGoals.map((goal: any, index: number) => {
                  const statusKey = (goal.status as GoalStatus) || "not_started";
                  const statusCfg = STATUS_CONFIG[statusKey] ?? STATUS_CONFIG.not_started;
                  const progress = getProgress(goal);
                  const days = goal.deadline ? daysUntil(goal.deadline) : null;
                  const completedMilestones = (goal.milestones ?? []).filter((m: any) => m.completed).length;
                  const totalMilestones = (goal.milestones ?? []).length;

                  return (
                    <motion.div
                      key={goal._id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.06, duration: 0.3 }}
                    >
                      <Card className="group hover:shadow-md transition-shadow">
                        <CardContent className="p-6">
                          <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                            {/* Left: Main content */}
                            <div className="flex-1 min-w-0 space-y-3">
                              {/* Title row */}
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                  <div
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium shrink-0 ${statusCfg.bgColor} ${statusCfg.color}`}
                                  >
                                    {statusCfg.icon}
                                    {statusCfg.label}
                                  </div>
                                  <h3 className="text-lg font-semibold truncate">
                                    {goal.title}
                                  </h3>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                  {goal.status !== "completed" && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-emerald-600 hover:text-emerald-700"
                                      onClick={() => handleMarkComplete(goal._id)}
                                      disabled={isCompleting === goal._id}
                                      title="Mark complete"
                                    >
                                      {isCompleting === goal._id ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <CheckCircle2 className="h-4 w-4" />
                                      )}
                                    </Button>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => openEdit(goal)}
                                    title="Edit goal"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                    onClick={() => openDelete(goal)}
                                    title="Delete goal"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>

                              {/* Description */}
                              {goal.description && (
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                  {goal.description}
                                </p>
                              )}

                              {/* ponytail: read-only tag badges on each goal card. */}
                              <TagBadges
                                tagIds={goal.tagIds}
                                tags={allTags}
                                max={3}
                                size="xs"
                              />

                              {/* Progress bar */}
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-muted-foreground">
                                    {goal.current ?? 0} / {goal.target ?? 0} {goal.unit}
                                  </span>
                                  <span className="font-semibold">{progress}%</span>
                                </div>
                                <Progress value={progress} className="h-2" />
                              </div>

                              {/* Milestones */}
                              {totalMilestones > 0 && (
                                <div className="space-y-1.5">
                                  <p className="text-xs text-muted-foreground font-medium">
                                    Milestones ({completedMilestones}/{totalMilestones})
                                  </p>
                                  <div className="flex flex-wrap gap-2">
                                    {(goal.milestones ?? []).map((ms: any) => (
                                      <button
                                        key={ms.id}
                                        type="button"
                                        onClick={() => handleToggleMilestone(goal._id, ms.id, ms.completed)}
                                        className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-colors cursor-pointer ${
                                          ms.completed
                                            ? "bg-primary/10 text-primary hover:bg-primary/20"
                                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                                        }`}
                                      >
                                        {ms.completed ? (
                                          <CheckCircle2 className="h-3 w-3" />
                                        ) : (
                                          <Clock className="h-3 w-3" />
                                        )}
                                        {ms.title}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Bottom meta row */}
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
                                {goal.deadline && (
                                  <span className="inline-flex items-center gap-1">
                                    <Calendar className="h-3.5 w-3.5" />
                                    {goal.status === "completed"
                                      ? `Completed`
                                      : days !== null && days < 0
                                        ? `${Math.abs(days)} days overdue`
                                        : days === 0
                                          ? "Due today"
                                          : `${days} days left`}
                                  </span>
                                )}
                                {(goal.streak ?? 0) > 0 && (
                                  <span className="inline-flex items-center gap-1 text-orange-500">
                                    <Flame className="h-3.5 w-3.5" />
                                    {goal.streak} day streak
                                  </span>
                                )}
                                <span className="inline-flex items-center gap-1 capitalize">
                                  {goal.type} goal
                                </span>
                              </div>
                            </div>

                            {/* Right: Type + deadline */}
                            <div className="flex flex-row lg:flex-col items-start gap-2 shrink-0 lg:border-l lg:pl-4 lg:border-border">
                              <Badge variant="secondary" className="text-xs capitalize">
                                {goal.type}
                              </Badge>
                              {goal.deadline && (
                                <div className="text-xs text-muted-foreground whitespace-nowrap">
                                  <span className="font-medium">Due:</span>{" "}
                                  {formatDate(goal.deadline)}
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </PageLayout>

      {/* ── Edit Goal Dialog ── */}
      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) {
            resetForm();
            setEditingGoal(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Goal</DialogTitle>
            <DialogDescription>Update your goal details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto pr-1">
            <div className="space-y-2">
              <Label htmlFor="edit-goal-title">Title</Label>
              <Input
                id="edit-goal-title"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-goal-description">Description</Label>
              <Textarea
                id="edit-goal-description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={formType} onValueChange={setFormType}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GOAL_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Unit</Label>
                <Select value={formUnit} onValueChange={setFormUnit}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNIT_OPTIONS.map((u) => (
                      <SelectItem key={u.value} value={u.value}>
                        {u.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-goal-target">Target</Label>
                <Input
                  id="edit-goal-target"
                  type="number"
                  value={formTarget}
                  onChange={(e) => setFormTarget(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-goal-current">Current</Label>
                <Input
                  id="edit-goal-current"
                  type="number"
                  value={formCurrent}
                  onChange={(e) => setFormCurrent(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-goal-date">Target Date</Label>
                <Input
                  id="edit-goal-date"
                  type="date"
                  value={formDeadline}
                  onChange={(e) => setFormDeadline(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formStatus} onValueChange={setFormStatus}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_started">Not Started</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="abandoned">Abandoned</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {/* ponytail: TagPicker in the Edit dialog — seeded with the goal's
                existing tagIds; persisted via setEntityTags after the goal updates. */}
            <div className="space-y-2">
              <Label>Tags</Label>
              <TagPicker
                entityType="goals"
                initialTagIds={formTagIds}
                onChange={setFormTagIds}
                categoryHint="general"
                placeholder="Add tags for this goal..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditOpen(false);
                resetForm();
                setEditingGoal(null);
              }}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button className="bg-primary hover:bg-primary/90" onClick={handleEdit} disabled={isUpdating}>
              {isUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Goal Dialog ── */}
      <Dialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open);
          if (!open) setDeletingGoal(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Goal</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the goal{" "}
              <span className="font-semibold text-foreground break-words">{deletingGoal?.title}</span>? This
              action cannot be undone and all progress will be lost.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteOpen(false);
                setDeletingGoal(null);
              }}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Goal"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
