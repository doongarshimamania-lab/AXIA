import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Tag,
  Plus,
  Search,
  Pencil,
  Trash2,
  Hash,
  X,
  Palette,
  Loader2,
  Info,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useAuth } from "@/hooks/use-auth";
import { useWorkspaceContext } from "@/hooks/use-workspace"; // ponytail: workspace scoping for tags queries/mutations
import { useQuery, useMutation, useQueryTimeout, useConvexConnectionState } from "@/lib/safe-convex-react";
import { api } from "@/convex/_generated/api";
import { PageLayout } from "@/components/design-system/PageLayout";
// ponytail: import the reusable read-only tag badges for the per-entity rows in the Used-in panel.
import { TagBadges } from "@/components/tags";

// ─── Constants ───────────────────────────────────────────────────────────────

const PRESET_COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#84cc16", "#22c55e",
  "#14b8a6", "#06b6d4", "#6366f1", "#a855f7", "#ec4899",
  "#f43f5e", "#0ea5e9",
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function Tags() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  // ponytail: extract active workspace id so tags are scoped per-workspace (prevents cross-workspace data leak)
  const { activeWorkspaceId, isConvexConnected } = useWorkspaceContext();
  const workspaceId = isConvexConnected ? activeWorkspaceId : undefined;

  // ─── Convex queries & mutations ──────────────────────────────────────────
  // ponytail: replace getTags with getTagsWithUsage so the "Most Used" stat card and
  // the per-card "N entries tagged" line show real numbers (the per-row usageCount
  // column on the tags table is permanently 0 — the new query computes it by scanning
  // every taggable table at request time).
  const tagsData = useQuery(api.tags.crud.getTagsWithUsage, { workspaceId: workspaceId as any });
  const createTagMutation = useMutation(api.tags.crud.createTag);
  const updateTagMutation = useMutation(api.tags.crud.updateTag);
  const deleteTagMutation = useMutation(api.tags.crud.deleteTag);

  // ─── Local state ────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<any>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingTag, setDeletingTag] = useState<any>(null);
  // ponytail: Used-in side sheet state — opens when the user clicks a tag card.
  // We call getEntitiesByTag lazily when the sheet opens (not for every tag on mount).
  const [usedInTag, setUsedInTag] = useState<any | null>(null);
  const [usedInEntities, setUsedInEntities] = useState<any[] | null>(null);
  const [usedInLoading, setUsedInLoading] = useState(false);
  // ponytail: empty-state "Learn how" dialog.
  const [learnHowOpen, setLearnHowOpen] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formColor, setFormColor] = useState(PRESET_COLORS[0]);
  const [formCategory, setFormCategory] = useState<string>("general");

  // Mutation loading state
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // ─── Loading timeout pattern ────────────────────────────────────────────
  const { isDisconnected } = useConvexConnectionState();
  const timedOut = useQueryTimeout(!authLoading && tagsData === undefined, 3000);

  const isLoading = !authLoading && tagsData === undefined && !timedOut && !isDisconnected;

  // ─── Demo mode ──────────────────────────────────────────────────────────
  const isDemoMode = !authLoading && !isAuthenticated;

  // ─── Data resolution ────────────────────────────────────────────────────
  // ponytail: preserve the new perEntity breakdown (a Record<entityType, count>)
  // so we can render "3 clients · 1 project" under each tag card.
  const realTags = (tagsData ?? []).map((t: any) => ({
    _id: t._id,
    name: t.name,
    color: t.color,
    category: t.category ?? null,
    usageCount: t.usageCount ?? 0,
    perEntity: (t.perEntity ?? {}) as Record<string, number>,
    createdAt: t.createdAt,
  }));

  const tags = realTags;

  // ── Computed Stats ──
  const totalTags = tags.length;
  const mostUsedTag =
    tags.length > 0
      ? tags.reduce((prev: any, curr: any) => (curr.usageCount > prev.usageCount ? curr : prev))
      : null;

  // ── Filtering ──
  const filteredTags = tags.filter((tag: any) => {
    const matchesSearch =
      tag.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tag.category ?? "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = activeFilter ? tag._id === activeFilter : true;
    return matchesSearch && matchesFilter;
  });

  // ── Helpers ──
  const resetForm = () => {
    setFormName("");
    setFormColor(PRESET_COLORS[0]);
    setFormCategory("general");
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // ponytail: open the Used-in side sheet for a tag. The lazy useQuery below
  // (getEntitiesByTagQuery) auto-fetches whenever `usedInTag` is non-null, and the
  // useEffect below pushes the resolved data into `usedInEntities` state. So all
  // this handler does is set the active tag and reset the loading flag.
  const openUsedIn = (tag: any) => {
    setUsedInTag(tag);
    setUsedInEntities(null);
    setUsedInLoading(true);
  };

  const closeUsedIn = () => {
    setUsedInTag(null);
    setUsedInEntities(null);
    setUsedInLoading(false);
  };

  // ponytail: lazy query hook — declared at the top level (rules-of-hooks) but
  // skipped unless `usedInTag` is set.
  const getEntitiesByTagQuery = useQuery(
    api.tags.crud.getEntitiesByTag,
    usedInTag ? { tagId: usedInTag._id as any } : "skip"
  ) as any[] | undefined;

  // ponytail: when the query resolves, push the result into our state so the
  // sheet shows it. We only write when we have a tag open and the data is fresh.
  useEffect(() => {
    if (usedInTag && getEntitiesByTagQuery !== undefined) {
      setUsedInEntities(getEntitiesByTagQuery);
      setUsedInLoading(false);
    }
  }, [usedInTag, getEntitiesByTagQuery]);

  // ── Create ──
  const handleCreate = async () => {
    if (!formName.trim()) {
      toast.error("Tag name is required");
      return;
    }

    if (isDemoMode) {
      toast.success(`Tag "${formName.trim()}" created successfully! (Demo mode)`);
      resetForm();
      setCreateOpen(false);
      return;
    }

    setIsCreating(true);
    try {
      await createTagMutation({
        workspaceId: workspaceId as any, // ponytail: stamp the new tag with the active workspace
        name: formName.trim(),
        color: formColor,
        category: formCategory,
      });
      resetForm();
      setCreateOpen(false);
      toast.success(`Tag "${formName.trim()}" created successfully`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to create tag");
    } finally {
      setIsCreating(false);
    }
  };

  // ── Edit ──
  const openEdit = (tag: any) => {
    setEditingTag(tag);
    setFormName(tag.name);
    setFormColor(tag.color);
    setFormCategory(tag.category ?? "general");
    setEditOpen(true);
  };

  const handleEdit = async () => {
    if (!editingTag) return;
    if (!formName.trim()) {
      toast.error("Tag name is required");
      return;
    }

    if (isDemoMode) {
      toast.success(`Tag "${formName.trim()}" updated! (Demo mode)`);
      resetForm();
      setEditOpen(false);
      setEditingTag(null);
      return;
    }

    setIsUpdating(true);
    try {
      await updateTagMutation({
        tagId: editingTag._id,
        name: formName.trim(),
        color: formColor,
        category: formCategory,
      });
      resetForm();
      setEditOpen(false);
      setEditingTag(null);
      toast.success(`Tag "${formName.trim()}" updated`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to update tag");
    } finally {
      setIsUpdating(false);
    }
  };

  // ── Delete ──
  const openDelete = (tag: any) => {
    setDeletingTag(tag);
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingTag) return;

    if (isDemoMode) {
      toast.success(`Tag "${deletingTag.name}" deleted! (Demo mode)`);
      if (activeFilter === deletingTag._id) setActiveFilter(null);
      setDeleteOpen(false);
      setDeletingTag(null);
      return;
    }

    setIsDeleting(true);
    try {
      await deleteTagMutation({ tagId: deletingTag._id });
      if (activeFilter === deletingTag._id) setActiveFilter(null);
      setDeleteOpen(false);
      setDeletingTag(null);
      toast.success(`Tag "${deletingTag.name}" deleted`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete tag");
    } finally {
      setIsDeleting(false);
    }
  };

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
              Tags
            </h1>
            <p className="text-[16px] text-muted-foreground">
              Organize your work with custom tags for quick filtering and categorization
            </p>
          </div>

          <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-primary hover:bg-primary/90 shrink-0">
                <Plus className="mr-2 h-4 w-4" />
                Create Tag
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Tag</DialogTitle>
                <DialogDescription>
                  Add a tag to categorize and filter your time entries, projects, and evidence.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="tag-name">Name</Label>
                  <Input
                    id="tag-name"
                    placeholder="e.g. Urgent, Design, Revision"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Color</Label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {PRESET_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className="w-8 h-8 rounded-full border-2 transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                        style={{
                          backgroundColor: color,
                          borderColor: formColor === color ? "var(--foreground)" : "transparent",
                          boxShadow: formColor === color ? `0 0 0 2px ${color}40` : "none",
                        }}
                        onClick={() => setFormColor(color)}
                      />
                    ))}
                    <div className="flex items-center gap-1 ml-1">
                      <Palette className="h-4 w-4 text-muted-foreground" />
                      <input
                        type="color"
                        value={formColor}
                        onChange={(e) => setFormColor(e.target.value)}
                        className="w-8 h-8 rounded cursor-pointer border border-border"
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <div className="flex flex-wrap gap-2">
                    {["general", "client", "project", "evidence"].map((cat) => (
                      <button key={cat} type="button" onClick={() => setFormCategory(cat)}>
                        <Badge
                          variant={formCategory === cat ? "default" : "outline"}
                          className="cursor-pointer transition-colors capitalize"
                        >
                          {cat}
                        </Badge>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setCreateOpen(false); resetForm(); }} disabled={isCreating}>
                  Cancel
                </Button>
                <Button className="bg-primary hover:bg-primary/90" onClick={handleCreate} disabled={isCreating}>
                  {isCreating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Tag"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* ── Empty-state CTA banner ──
            ponytail: explains where tags can be attached so users don't get stuck
            after creating a tag (the original complaint this feature fixes). */}
        {!isDemoMode && (
          <Card className="p-4 bg-primary/5 border-primary/20 rounded-xl">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <Info className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground">
                  Tags can be attached to <strong>clients</strong>, <strong>projects</strong>,{" "}
                  <strong>proposals</strong>, <strong>invoices</strong>, <strong>time entries</strong>,{" "}
                  <strong>deals</strong>, and <strong>goals</strong>. Create one here, then start tagging
                  from any of those pages.
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-primary hover:text-primary shrink-0"
                onClick={() => setLearnHowOpen(true)}
              >
                Learn how
              </Button>
            </div>
          </Card>
        )}

        {/* ── Demo mode empty state ── */}
        {isDemoMode && (
          <Card className="p-8 bg-card rounded-xl border border-border">
            <div className="text-center space-y-4">
              <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Tag className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Sign in to see your tags</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Connect your account to organize your work with custom tags.
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-[160px] rounded-xl" />
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* ── Stats Cards ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                      <Hash className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Tags</p>
                      <p className="text-2xl font-bold">{totalTags}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-orange-500/10">
                      <Tag className="h-5 w-5 text-orange-500" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Most Used</p>
                      <p className="text-2xl font-bold">
                        {mostUsedTag ? mostUsedTag.name : "—"}
                      </p>
                      {mostUsedTag && (
                        <p className="text-xs text-muted-foreground">
                          {mostUsedTag.usageCount} {mostUsedTag.usageCount === 1 ? "entry" : "entries"}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-500/10">
                      <Hash className="h-5 w-5 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Categories</p>
                      <p className="text-2xl font-bold">
                        {new Set(tags.map((t: any) => t.category ?? "uncategorized")).size}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* ── Quick Filters + Search ── */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search tags..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                {activeFilter && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveFilter(null)}
                    className="shrink-0"
                  >
                    <X className="mr-1 h-3 w-3" />
                    Clear filter
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-muted-foreground shrink-0">Quick filter:</span>
                {tags.slice(0, 5).map((tag: any) => (
                  <button
                    key={tag._id}
                    type="button"
                    onClick={() => setActiveFilter(activeFilter === tag._id ? null : tag._id)}
                    className="focus:outline-none"
                  >
                    <Badge
                      variant={activeFilter === tag._id ? "default" : "outline"}
                      className="cursor-pointer transition-colors"
                      style={
                        activeFilter === tag._id
                          ? { backgroundColor: tag.color, borderColor: tag.color }
                          : { borderColor: tag.color, color: tag.color }
                      }
                    >
                      <span
                        className="inline-block w-2 h-2 rounded-full mr-1"
                        style={{ backgroundColor: tag.color }}
                      />
                      {tag.name}
                    </Badge>
                  </button>
                ))}
              </div>
            </div>

            <Separator />

            {/* ── Tags Grid ── */}
            {filteredTags.length === 0 ? (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center text-muted-foreground">
                    <Tag className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">No tags found</p>
                    <p className="text-sm">
                      {searchQuery
                        ? "Try adjusting your search query"
                        : "Create your first tag to start organizing your work"}
                    </p>
                    {!searchQuery && (
                      <Button
                        className="mt-4 bg-primary hover:bg-primary/90"
                        onClick={() => setCreateOpen(true)}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Create Your First Tag
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTags.map((tag: any, index: number) => (
                  <motion.div
                    key={tag._id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.04, duration: 0.3 }}
                  >
                    <Card
                      className="group hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => openUsedIn(tag)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <span
                              className="w-5 h-5 rounded-full shrink-0 ring-2 ring-offset-2 ring-offset-background"
                              style={{ backgroundColor: tag.color, outlineColor: tag.color }}
                            />
                            <CardTitle className="text-base">{tag.name}</CardTitle>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => { e.stopPropagation(); openEdit(tag); }}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={(e) => { e.stopPropagation(); openDelete(tag); }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0 space-y-3">
                        {tag.category && (
                          <Badge variant="secondary" className="text-xs capitalize">
                            {tag.category}
                          </Badge>
                        )}
                        <Separator />
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>
                            <span className="font-semibold text-foreground">{tag.usageCount}</span>{" "}
                            {tag.usageCount === 1 ? "entry" : "entries"} tagged
                          </span>
                          <span>
                            {tag.usageCount === 0
                              ? "Never used"
                              : `Created ${formatDate(tag.createdAt)}`}
                          </span>
                        </div>
                        {/* ponytail: per-entity usage breakdown — show top 2 entity types
                            as small text (e.g. "3 clients · 1 project"). Falls back to
                            "Click to see usage" when the breakdown is empty. */}
                        <div className="text-[11px] text-muted-foreground">
                          {(() => {
                            const entries = Object.entries(tag.perEntity ?? {})
                              .filter(([, n]) => (n as number) > 0)
                              .sort((a, b) => (b[1] as number) - (a[1] as number));
                            if (entries.length === 0) {
                              return (
                                <span className="inline-flex items-center gap-1 hover:text-foreground">
                                  Click to see usage <ChevronRight className="h-3 w-3" />
                                </span>
                              );
                            }
                            const top = entries.slice(0, 2)
                              .map(([k, n]) => `${n} ${k}`)
                              .join(" · ");
                            const more = entries.length > 2 ? ` · +${entries.length - 2}` : "";
                            return (
                              <span className="inline-flex items-center gap-1 hover:text-foreground">
                                {top}{more} <ChevronRight className="h-3 w-3" />
                              </span>
                            );
                          })()}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        )}
      </PageLayout>

      {/* ── Used-in side sheet ──
          ponytail: opens when the user clicks a tag card. Shows the entities
          that currently carry the tag, grouped by entity type, with deep links
          to the corresponding pages. Calls getEntitiesByTag lazily (see the
          useQuery + useEffect pair above). */}
      <Sheet open={usedInTag !== null} onOpenChange={(open) => { if (!open) closeUsedIn(); }}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              {usedInTag && (
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: usedInTag.color }}
                />
              )}
              Used in: {usedInTag?.name ?? ""}
            </SheetTitle>
            <SheetDescription>
              Entities currently carrying this tag. Click a row to open the
              corresponding page.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-4 space-y-4">
            {usedInLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : !usedInEntities || usedInEntities.length === 0 ? (
              <div className="text-center py-12 text-sm text-muted-foreground">
                <Tag className="h-10 w-10 mx-auto mb-3 opacity-40" />
                Not attached to any entity yet.
              </div>
            ) : (
              (() => {
                // Group entities by type so we can render a header per group.
                const groups: Record<string, any[]> = {};
                for (const e of usedInEntities) {
                  (groups[e.entityType] ??= []).push(e);
                }
                const ENTITY_PATHS: Record<string, string> = {
                  clients: "/clients",
                  projects: "/projects",
                  proposals: "/proposals",
                  invoices: "/invoices",
                  workSessions: "/time-tracking",
                  deals: "/pipeline",
                  goals: "/goals",
                };
                const ENTITY_LABELS: Record<string, string> = {
                  clients: "Clients",
                  projects: "Projects",
                  proposals: "Proposals",
                  invoices: "Invoices",
                  workSessions: "Time Entries",
                  deals: "Deals",
                  goals: "Goals",
                };
                return Object.entries(groups).map(([type, rows]) => (
                  <div key={type} className="space-y-1.5">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {ENTITY_LABELS[type] ?? type} ({rows.length})
                    </div>
                    {rows.map((r) => (
                      <a
                        key={`${type}-${r.entityId}`}
                        href={ENTITY_PATHS[type] ?? "#"}
                        className="flex items-center justify-between gap-2 px-3 py-2 rounded-md border border-border hover:bg-muted/60 transition-colors group"
                      >
                        <span className="text-sm text-foreground truncate">{r.label}</span>
                        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground shrink-0" />
                      </a>
                    ))}
                  </div>
                ));
              })()
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* ── "Learn how" dialog ──
          ponytail: small explainer that opens from the empty-state CTA banner. */}
      <Dialog open={learnHowOpen} onOpenChange={setLearnHowOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>How to use tags</DialogTitle>
            <DialogDescription>
              Tags work across seven entity types. Here's the workflow.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm text-foreground py-2">
            <p>
              <strong>1. Create a tag here.</strong> Give it a name, color, and
              category. Tags are scoped to your workspace.
            </p>
            <p>
              <strong>2. Attach it from any entity page.</strong> Open any
              client, project, proposal, invoice, time entry, deal, or goal and
              look for the <em>Tags</em> field or the{" "}
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-border text-xs">
                <Tag className="h-3 w-3" /> Tags
              </span>{" "}
              button on the card.
            </p>
            <p>
              <strong>3. Filter by tag.</strong> Most list pages have a tag
              chip-bar at the top — click a chip to narrow the list to entries
              carrying that tag.
            </p>
            <p>
              <strong>4. Click a tag card here</strong> to see everything it's
              attached to, with deep links to each entity.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setLearnHowOpen(false)}>Got it</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Tag Dialog ── */}
      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) {
            resetForm();
            setEditingTag(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Tag</DialogTitle>
            <DialogDescription>Update the details of this tag.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-tag-name">Name</Label>
              <Input
                id="edit-tag-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex items-center gap-2 flex-wrap">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className="w-8 h-8 rounded-full border-2 transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                    style={{
                      backgroundColor: color,
                      borderColor: formColor === color ? "var(--foreground)" : "transparent",
                    }}
                    onClick={() => setFormColor(color)}
                  />
                ))}
                <div className="flex items-center gap-1 ml-1">
                  <Palette className="h-4 w-4 text-muted-foreground" />
                  <input
                    type="color"
                    value={formColor}
                    onChange={(e) => setFormColor(e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer border border-border"
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <div className="flex flex-wrap gap-2">
                {["general", "client", "project", "evidence"].map((cat) => (
                  <button key={cat} type="button" onClick={() => setFormCategory(cat)}>
                    <Badge
                      variant={formCategory === cat ? "default" : "outline"}
                      className="cursor-pointer transition-colors capitalize"
                    >
                      {cat}
                    </Badge>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditOpen(false);
                resetForm();
                setEditingTag(null);
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

      {/* ── Delete Tag Dialog ── */}
      <Dialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open);
          if (!open) setDeletingTag(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Tag</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the tag{" "}
              <span className="font-semibold text-foreground break-words">{deletingTag?.name}</span>? This will
              remove the tag from all associated entries. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteOpen(false);
                setDeletingTag(null);
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
                "Delete Tag"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
