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
  Info,
  Loader2,
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
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryTimeout, useConvexConnectionState } from "@/lib/safe-convex-react";
import { api } from "@/convex/_generated/api";
import { PageLayout } from "@/components/design-system/PageLayout";

// ─── Constants ───────────────────────────────────────────────────────────────

const PRESET_COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#84cc16", "#22c55e",
  "#14b8a6", "#06b6d4", "#6366f1", "#a855f7", "#ec4899",
  "#f43f5e", "#0ea5e9",
];

// ─── Mock Data (demo mode) ───────────────────────────────────────────────────

const MOCK_TAGS = [
  {
    _id: "tag_1" as any,
    name: "Urgent",
    color: "#ef4444",
    category: "general" as string | null,
    usageCount: 23,
    createdAt: Date.now() - 150 * 24 * 60 * 60 * 1000,
  },
  {
    _id: "tag_2" as any,
    name: "Design",
    color: "#a855f7",
    category: "project" as string | null,
    usageCount: 18,
    createdAt: Date.now() - 135 * 24 * 60 * 60 * 1000,
  },
  {
    _id: "tag_3" as any,
    name: "Development",
    color: "#22c55e",
    category: "project" as string | null,
    usageCount: 42,
    createdAt: Date.now() - 145 * 24 * 60 * 60 * 1000,
  },
  {
    _id: "tag_4" as any,
    name: "Client Communication",
    color: "#06b6d4",
    category: "client" as string | null,
    usageCount: 31,
    createdAt: Date.now() - 140 * 24 * 60 * 60 * 1000,
  },
  {
    _id: "tag_5" as any,
    name: "Bug Fix",
    color: "#f97316",
    category: "general" as string | null,
    usageCount: 14,
    createdAt: Date.now() - 95 * 24 * 60 * 60 * 1000,
  },
  {
    _id: "tag_6" as any,
    name: "Documentation",
    color: "#14b8a6",
    category: "project" as string | null,
    usageCount: 9,
    createdAt: Date.now() - 115 * 24 * 60 * 60 * 1000,
  },
  {
    _id: "tag_7" as any,
    name: "Revision",
    color: "#f59e0b",
    category: "general" as string | null,
    usageCount: 19,
    createdAt: Date.now() - 110 * 24 * 60 * 60 * 1000,
  },
  {
    _id: "tag_8" as any,
    name: "Research",
    color: "#6366f1",
    category: "general" as string | null,
    usageCount: 7,
    createdAt: Date.now() - 90 * 24 * 60 * 60 * 1000,
  },
  {
    _id: "tag_9" as any,
    name: "Testing",
    color: "#ec4899",
    category: "evidence" as string | null,
    usageCount: 11,
    createdAt: Date.now() - 100 * 24 * 60 * 60 * 1000,
  },
  {
    _id: "tag_10" as any,
    name: "Payment",
    color: "#84cc16",
    category: "client" as string | null,
    usageCount: 5,
    createdAt: Date.now() - 60 * 24 * 60 * 60 * 1000,
  },
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function Tags() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  // ─── Convex queries & mutations ──────────────────────────────────────────
  const tagsData = useQuery(api.tags.crud.getTags, {});
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
  const realTags = (tagsData ?? []).map((t: any) => ({
    _id: t._id,
    name: t.name,
    color: t.color,
    category: t.category ?? null,
    usageCount: t.usageCount ?? 0,
    createdAt: t.createdAt,
  }));

  const tags = isDemoMode ? MOCK_TAGS : realTags;

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
              <Button className="bg-primary hover:bg-primary/90 shrink-0">
                <Plus className="mr-2 h-4 w-4" />
                Create Tag
              </Button>
            </DialogTrigger>
            <DialogContent>
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

        {/* ── Demo mode banner ── */}
        {isDemoMode && (
          <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <Info className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <div className="text-sm text-amber-800 dark:text-amber-200">
              <span className="font-semibold">Demo Mode</span> — You're viewing sample data.{" "}
              <a href="/auth" className="underline font-medium hover:text-amber-900 dark:hover:text-amber-100">
                Sign in
              </a>{" "}
              to manage your real tags.
            </div>
          </div>
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
                    <Card className="group hover:shadow-md transition-shadow">
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
                              onClick={() => openEdit(tag)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => openDelete(tag)}
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
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        )}
      </PageLayout>

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
        <DialogContent>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Tag</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the tag{" "}
              <span className="font-semibold text-foreground">{deletingTag?.name}</span>? This will
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
