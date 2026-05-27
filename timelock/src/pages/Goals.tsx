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
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
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

// ─── Types ───────────────────────────────────────────────────────────────────

type GoalStatus = "active" | "completed" | "paused" | "overdue";

interface Milestone {
  id: string;
  title: string;
  completed: boolean;
}

interface GoalItem {
  id: string;
  title: string;
  description: string;
  status: GoalStatus;
  progress: number;
  targetDate: string;
  metric: string;
  tags: string[];
  linkedProjects: string[];
  milestones: Milestone[];
  streak: number;
  createdAt: string;
}

// ─── Mock Data ───────────────────────────────────────────────────────────────

const TAG_OPTIONS = [
  "Urgent",
  "Design",
  "Development",
  "Client Communication",
  "Bug Fix",
  "Documentation",
  "Revision",
  "Research",
  "Testing",
  "Payment",
];

const PROJECT_OPTIONS = [
  "E-Commerce Redesign",
  "Mobile Banking App",
  "SaaS Dashboard",
  "Portfolio Website",
  "API Integration",
];

const INITIAL_GOALS: GoalItem[] = [
  {
    id: "1",
    title: "Reach $10K monthly revenue",
    description:
      "Scale freelance income to $10,000 per month by diversifying client base and raising rates for premium protection services.",
    status: "active",
    progress: 72,
    targetDate: "2025-09-30",
    metric: "Revenue ($)",
    tags: ["Development", "Client Communication"],
    linkedProjects: ["E-Commerce Redesign", "SaaS Dashboard"],
    milestones: [
      { id: "m1", title: "Reach $5K/mo", completed: true },
      { id: "m2", title: "Reach $7.5K/mo", completed: true },
      { id: "m3", title: "Reach $10K/mo", completed: false },
    ],
    streak: 14,
    createdAt: "2025-01-15",
  },
  {
    id: "2",
    title: "Achieve 95% on-time delivery",
    description:
      "Maintain a 95% on-time project delivery rate to strengthen client trust and improve dispute protection standing.",
    status: "active",
    progress: 88,
    targetDate: "2025-08-15",
    metric: "On-time %",
    tags: ["Urgent", "Documentation"],
    linkedProjects: ["Mobile Banking App", "API Integration"],
    milestones: [
      { id: "m4", title: "Track first 10 projects", completed: true },
      { id: "m5", title: "Hit 90% on-time", completed: true },
      { id: "m6", title: "Hit 95% on-time", completed: false },
    ],
    streak: 21,
    createdAt: "2025-02-01",
  },
  {
    id: "3",
    title: "Complete 50 evidence-backed sessions",
    description:
      "Accumulate 50 fully evidence-backed work sessions with automated screenshots and activity logs for maximum protection.",
    status: "active",
    progress: 56,
    targetDate: "2025-12-31",
    metric: "Sessions (#)",
    tags: ["Development", "Testing"],
    linkedProjects: ["E-Commerce Redesign"],
    milestones: [
      { id: "m7", title: "Complete 10 sessions", completed: true },
      { id: "m8", title: "Complete 25 sessions", completed: true },
      { id: "m9", title: "Complete 50 sessions", completed: false },
    ],
    streak: 7,
    createdAt: "2025-03-10",
  },
  {
    id: "4",
    title: "Zero unpaid invoices this quarter",
    description:
      "Ensure all invoices are paid within the agreed terms by using automated follow-ups and milestone-based payment protection.",
    status: "completed",
    progress: 100,
    targetDate: "2025-06-30",
    metric: "Unpaid Invoices (#)",
    tags: ["Payment", "Client Communication"],
    linkedProjects: ["SaaS Dashboard", "Portfolio Website"],
    milestones: [
      { id: "m10", title: "Set up payment tracking", completed: true },
      { id: "m11", title: "Automate reminders", completed: true },
      { id: "m12", title: "Zero unpaid for 30 days", completed: true },
    ],
    streak: 30,
    createdAt: "2025-04-01",
  },
  {
    id: "5",
    title: "Launch 3 new client projects",
    description:
      "Onboard and launch 3 new client projects with full protection from day one, including scope definition and milestone contracts.",
    status: "paused",
    progress: 33,
    targetDate: "2025-10-15",
    metric: "Projects Launched (#)",
    tags: ["Design", "Development"],
    linkedProjects: ["API Integration"],
    milestones: [
      { id: "m13", title: "Launch first project", completed: true },
      { id: "m14", title: "Launch second project", completed: false },
      { id: "m15", title: "Launch third project", completed: false },
    ],
    streak: 0,
    createdAt: "2025-05-01",
  },
  {
    id: "6",
    title: "Maintain 4.9+ client satisfaction",
    description:
      "Keep average client satisfaction rating at 4.9 or above through proactive communication and quality deliverables.",
    status: "overdue",
    progress: 45,
    targetDate: "2025-05-31",
    metric: "Avg. Rating",
    tags: ["Client Communication", "Revision"],
    linkedProjects: ["Mobile Banking App", "Portfolio Website", "SaaS Dashboard"],
    milestones: [
      { id: "m16", title: "Collect 10 reviews", completed: true },
      { id: "m17", title: "Hit 4.8 avg", completed: false },
      { id: "m18", title: "Hit 4.9+ avg", completed: false },
    ],
    streak: 0,
    createdAt: "2025-02-20",
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  GoalStatus,
  { label: string; color: string; bgColor: string; icon: React.ReactNode }
> = {
  active: {
    label: "Active",
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
  paused: {
    label: "Paused",
    color: "text-yellow-700 dark:text-yellow-400",
    bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
    icon: <Clock className="h-3 w-3" />,
  },
  overdue: {
    label: "Overdue",
    color: "text-red-700 dark:text-red-400",
    bgColor: "bg-red-100 dark:bg-red-900/30",
    icon: <Flag className="h-3 w-3" />,
  },
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const daysUntil = (dateStr: string) => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  const diff = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function Goals() {
  const [goals, setGoals] = useState<GoalItem[]>(INITIAL_GOALS);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<GoalItem | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingGoal, setDeletingGoal] = useState<GoalItem | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formTargetDate, setFormTargetDate] = useState("");
  const [formMetric, setFormMetric] = useState("");
  const [formTags, setFormTags] = useState<string[]>([]);

  // ── Computed Stats ──
  const activeGoals = goals.filter((g) => g.status === "active").length;
  const completedGoals = goals.filter((g) => g.status === "completed").length;
  const completionRate =
    goals.length > 0 ? Math.round((completedGoals / goals.length) * 100) : 0;
  const longestStreak = goals.reduce((max, g) => Math.max(max, g.streak), 0);

  // ── Filtering ──
  const filteredGoals =
    statusFilter === "all"
      ? goals
      : goals.filter((g) => g.status === statusFilter);

  // ── Helpers ──
  const resetForm = () => {
    setFormTitle("");
    setFormDescription("");
    setFormTargetDate("");
    setFormMetric("");
    setFormTags([]);
  };

  const toggleTag = (tag: string) => {
    setFormTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  // ── Create ──
  const handleCreate = () => {
    if (!formTitle.trim()) {
      toast.error("Goal title is required");
      return;
    }
    if (!formTargetDate) {
      toast.error("Target date is required");
      return;
    }
    const newGoal: GoalItem = {
      id: Date.now().toString(),
      title: formTitle.trim(),
      description: formDescription.trim(),
      status: "active",
      progress: 0,
      targetDate: formTargetDate,
      metric: formMetric.trim() || "Progress %",
      tags: formTags,
      linkedProjects: [],
      milestones: [],
      streak: 0,
      createdAt: new Date().toISOString().split("T")[0],
    };
    setGoals((prev) => [newGoal, ...prev]);
    resetForm();
    setCreateOpen(false);
    toast.success(`Goal "${newGoal.title}" created`);
  };

  // ── Edit ──
  const openEdit = (goal: GoalItem) => {
    setEditingGoal(goal);
    setFormTitle(goal.title);
    setFormDescription(goal.description);
    setFormTargetDate(goal.targetDate);
    setFormMetric(goal.metric);
    setFormTags([...goal.tags]);
    setEditOpen(true);
  };

  const handleEdit = () => {
    if (!editingGoal) return;
    if (!formTitle.trim()) {
      toast.error("Goal title is required");
      return;
    }
    setGoals((prev) =>
      prev.map((g) =>
        g.id === editingGoal.id
          ? {
              ...g,
              title: formTitle.trim(),
              description: formDescription.trim(),
              targetDate: formTargetDate || g.targetDate,
              metric: formMetric.trim() || g.metric,
              tags: formTags,
            }
          : g
      )
    );
    resetForm();
    setEditOpen(false);
    setEditingGoal(null);
    toast.success(`Goal "${formTitle.trim()}" updated`);
  };

  // ── Delete ──
  const openDelete = (goal: GoalItem) => {
    setDeletingGoal(goal);
    setDeleteOpen(true);
  };

  const handleDelete = () => {
    if (!deletingGoal) return;
    setGoals((prev) => prev.filter((g) => g.id !== deletingGoal.id));
    setDeleteOpen(false);
    setDeletingGoal(null);
    toast.success(`Goal "${deletingGoal.title}" deleted`);
  };

  // ── Mark Complete ──
  const handleMarkComplete = (goalId: string) => {
    setGoals((prev) =>
      prev.map((g) =>
        g.id === goalId
          ? {
              ...g,
              status: "completed" as GoalStatus,
              progress: 100,
              milestones: g.milestones.map((m) => ({ ...m, completed: true })),
            }
          : g
      )
    );
    const goal = goals.find((g) => g.id === goalId);
    toast.success(`Goal "${goal?.title}" marked as complete!`);
  };

  // ── Tag selector shared component ──
  const TagSelector = () => (
    <div className="space-y-2">
      <Label>Tags</Label>
      <div className="flex flex-wrap gap-2">
        {TAG_OPTIONS.map((tag) => (
          <button key={tag} type="button" onClick={() => toggleTag(tag)}>
            <Badge
              variant={formTags.includes(tag) ? "default" : "outline"}
              className="cursor-pointer transition-colors"
            >
              {tag}
            </Badge>
          </button>
        ))}
      </div>
    </div>
  );

  // ── Render ──
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full min-h-screen bg-background text-foreground"
    >
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-[32px] font-bold text-foreground tracking-tight mb-2">
              Goals
            </h1>
            <p className="text-[16px] text-muted-foreground">
              Set and track professional goals to protect your income and grow your freelance career
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
              <Button className="bg-primary hover:bg-primary/90 shrink-0">
                <Plus className="mr-2 h-4 w-4" />
                Create Goal
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Create New Goal</DialogTitle>
                <DialogDescription>
                  Define a measurable goal with a deadline to keep your freelance career on track.
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
                    <Label htmlFor="goal-date">Target Date</Label>
                    <Input
                      id="goal-date"
                      type="date"
                      value={formTargetDate}
                      onChange={(e) => setFormTargetDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="goal-metric">Metric</Label>
                    <Input
                      id="goal-metric"
                      placeholder="e.g. Revenue ($), Sessions (#)"
                      value={formMetric}
                      onChange={(e) => setFormMetric(e.target.value)}
                    />
                  </div>
                </div>
                <TagSelector />
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setCreateOpen(false);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button className="bg-primary hover:bg-primary/90" onClick={handleCreate}>
                  Create Goal
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

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
          {[
            { value: "all", label: "All" },
            { value: "active", label: "Active" },
            { value: "completed", label: "Completed" },
            { value: "paused", label: "Paused" },
            { value: "overdue", label: "Overdue" },
          ].map((filter) => (
            <Button
              key={filter.value}
              variant={statusFilter === filter.value ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(filter.value)}
            >
              {filter.label}
            </Button>
          ))}
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
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredGoals.map((goal, index) => {
              const statusCfg = STATUS_CONFIG[goal.status];
              const days = daysUntil(goal.targetDate);
              const completedMilestones = goal.milestones.filter((m) => m.completed).length;
              const totalMilestones = goal.milestones.length;

              return (
                <motion.div
                  key={goal.id}
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
                                  onClick={() => handleMarkComplete(goal.id)}
                                  title="Mark complete"
                                >
                                  <CheckCircle2 className="h-4 w-4" />
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
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {goal.description}
                          </p>

                          {/* Progress bar */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">{goal.metric}</span>
                              <span className="font-semibold">{goal.progress}%</span>
                            </div>
                            <Progress value={goal.progress} className="h-2" />
                          </div>

                          {/* Milestones */}
                          {totalMilestones > 0 && (
                            <div className="space-y-1.5">
                              <p className="text-xs text-muted-foreground font-medium">
                                Milestones ({completedMilestones}/{totalMilestones})
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {goal.milestones.map((ms) => (
                                  <div
                                    key={ms.id}
                                    className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md ${
                                      ms.completed
                                        ? "bg-primary/10 text-primary"
                                        : "bg-muted text-muted-foreground"
                                    }`}
                                  >
                                    {ms.completed ? (
                                      <CheckCircle2 className="h-3 w-3" />
                                    ) : (
                                      <Clock className="h-3 w-3" />
                                    )}
                                    {ms.title}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Bottom meta row */}
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" />
                              {goal.status === "completed"
                                ? `Completed`
                                : days < 0
                                  ? `${Math.abs(days)} days overdue`
                                  : days === 0
                                    ? "Due today"
                                    : `${days} days left`}
                            </span>
                            {goal.streak > 0 && (
                              <span className="inline-flex items-center gap-1 text-orange-500">
                                <Flame className="h-3.5 w-3.5" />
                                {goal.streak} day streak
                              </span>
                            )}
                            {goal.linkedProjects.length > 0 && (
                              <span className="inline-flex items-center gap-1">
                                Linked: {goal.linkedProjects.join(", ")}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Right: Tags + deadline */}
                        <div className="flex flex-row lg:flex-col items-start gap-2 shrink-0 lg:border-l lg:pl-4 lg:border-border">
                          <div className="flex flex-wrap gap-1.5">
                            {goal.tags.map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                          <div className="text-xs text-muted-foreground whitespace-nowrap">
                            <span className="font-medium">Due:</span>{" "}
                            {formatDate(goal.targetDate)}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

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
                <Label htmlFor="edit-goal-date">Target Date</Label>
                <Input
                  id="edit-goal-date"
                  type="date"
                  value={formTargetDate}
                  onChange={(e) => setFormTargetDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-goal-metric">Metric</Label>
                <Input
                  id="edit-goal-metric"
                  value={formMetric}
                  onChange={(e) => setFormMetric(e.target.value)}
                />
              </div>
            </div>
            <TagSelector />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditOpen(false);
                resetForm();
                setEditingGoal(null);
              }}
            >
              Cancel
            </Button>
            <Button className="bg-primary hover:bg-primary/90" onClick={handleEdit}>
              Save Changes
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Goal</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the goal{" "}
              <span className="font-semibold text-foreground">{deletingGoal?.title}</span>? This
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
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete Goal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
