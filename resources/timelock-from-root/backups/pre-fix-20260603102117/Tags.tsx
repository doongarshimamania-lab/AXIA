import { useState } from "react";
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
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
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

interface TagItem {
  id: string;
  name: string;
  color: string;
  description: string;
  count: number;
  lastUsed: string;
  createdAt: string;
}

// ─── Mock Data ───────────────────────────────────────────────────────────────

const PRESET_COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#84cc16", "#22c55e",
  "#14b8a6", "#06b6d4", "#6366f1", "#a855f7", "#ec4899",
  "#f43f5e", "#0ea5e9",
];

const INITIAL_TAGS: TagItem[] = [
  {
    id: "1",
    name: "Urgent",
    color: "#ef4444",
    description: "Time-sensitive work that needs immediate attention",
    count: 23,
    lastUsed: "2025-06-10",
    createdAt: "2025-01-15",
  },
  {
    id: "2",
    name: "Design",
    color: "#a855f7",
    description: "UI/UX design work and deliverables",
    count: 18,
    lastUsed: "2025-06-09",
    createdAt: "2025-02-01",
  },
  {
    id: "3",
    name: "Development",
    color: "#22c55e",
    description: "Frontend and backend development tasks",
    count: 42,
    lastUsed: "2025-06-12",
    createdAt: "2025-01-20",
  },
  {
    id: "4",
    name: "Client Communication",
    color: "#06b6d4",
    description: "Meetings, emails, and messages with clients",
    count: 31,
    lastUsed: "2025-06-11",
    createdAt: "2025-01-22",
  },
  {
    id: "5",
    name: "Bug Fix",
    color: "#f97316",
    description: "Issue resolution and debugging sessions",
    count: 14,
    lastUsed: "2025-06-08",
    createdAt: "2025-03-01",
  },
  {
    id: "6",
    name: "Documentation",
    color: "#14b8a6",
    description: "Project docs, READMEs, and technical writing",
    count: 9,
    lastUsed: "2025-06-05",
    createdAt: "2025-02-10",
  },
  {
    id: "7",
    name: "Revision",
    color: "#f59e0b",
    description: "Client-requested changes and rework",
    count: 19,
    lastUsed: "2025-06-07",
    createdAt: "2025-02-18",
  },
  {
    id: "8",
    name: "Research",
    color: "#6366f1",
    description: "Market research, tech exploration, and discovery",
    count: 7,
    lastUsed: "2025-06-02",
    createdAt: "2025-03-05",
  },
  {
    id: "9",
    name: "Testing",
    color: "#ec4899",
    description: "QA testing, unit tests, and integration tests",
    count: 11,
    lastUsed: "2025-06-06",
    createdAt: "2025-02-25",
  },
  {
    id: "10",
    name: "Payment",
    color: "#84cc16",
    description: "Invoice tracking, payment follow-ups, and billing",
    count: 5,
    lastUsed: "2025-05-28",
    createdAt: "2025-04-01",
  },
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function Tags() {
  const [tags, setTags] = useState<TagItem[]>(INITIAL_TAGS);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<TagItem | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingTag, setDeletingTag] = useState<TagItem | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formColor, setFormColor] = useState(PRESET_COLORS[0]);
  const [formDescription, setFormDescription] = useState("");

  // ── Computed Stats ──
  const totalTags = tags.length;
  const mostUsedTag =
    tags.length > 0
      ? tags.reduce((prev, curr) => (curr.count > prev.count ? curr : prev))
      : null;
  const untaggedEntries = 12; // Mock: entries without any tag

  // ── Filtering ──
  const filteredTags = tags.filter((tag) => {
    const matchesSearch =
      tag.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tag.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = activeFilter ? tag.id === activeFilter : true;
    return matchesSearch && matchesFilter;
  });

  // ── Helpers ──
  const resetForm = () => {
    setFormName("");
    setFormColor(PRESET_COLORS[0]);
    setFormDescription("");
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // ── Create ──
  const handleCreate = () => {
    if (!formName.trim()) {
      toast.error("Tag name is required");
      return;
    }
    if (tags.some((t) => t.name.toLowerCase() === formName.trim().toLowerCase())) {
      toast.error("A tag with this name already exists");
      return;
    }
    const newTag: TagItem = {
      id: Date.now().toString(),
      name: formName.trim(),
      color: formColor,
      description: formDescription.trim(),
      count: 0,
      lastUsed: "Never",
      createdAt: new Date().toISOString().split("T")[0],
    };
    setTags((prev) => [newTag, ...prev]);
    resetForm();
    setCreateOpen(false);
    toast.success(`Tag "${newTag.name}" created successfully`);
  };

  // ── Edit ──
  const openEdit = (tag: TagItem) => {
    setEditingTag(tag);
    setFormName(tag.name);
    setFormColor(tag.color);
    setFormDescription(tag.description);
    setEditOpen(true);
  };

  const handleEdit = () => {
    if (!editingTag) return;
    if (!formName.trim()) {
      toast.error("Tag name is required");
      return;
    }
    const duplicate = tags.find(
      (t) => t.id !== editingTag.id && t.name.toLowerCase() === formName.trim().toLowerCase()
    );
    if (duplicate) {
      toast.error("A tag with this name already exists");
      return;
    }
    setTags((prev) =>
      prev.map((t) =>
        t.id === editingTag.id
          ? { ...t, name: formName.trim(), color: formColor, description: formDescription.trim() }
          : t
      )
    );
    resetForm();
    setEditOpen(false);
    setEditingTag(null);
    toast.success(`Tag "${formName.trim()}" updated`);
  };

  // ── Delete ──
  const openDelete = (tag: TagItem) => {
    setDeletingTag(tag);
    setDeleteOpen(true);
  };

  const handleDelete = () => {
    if (!deletingTag) return;
    setTags((prev) => prev.filter((t) => t.id !== deletingTag.id));
    if (activeFilter === deletingTag.id) setActiveFilter(null);
    setDeleteOpen(false);
    setDeletingTag(null);
    toast.success(`Tag "${deletingTag.name}" deleted`);
  };

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
                  <Label htmlFor="tag-description">Description</Label>
                  <Textarea
                    id="tag-description"
                    placeholder="What is this tag used for?"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setCreateOpen(false); resetForm(); }}>
                  Cancel
                </Button>
                <Button className="bg-primary hover:bg-primary/90" onClick={handleCreate}>
                  Create Tag
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
                      {mostUsedTag.count} entries
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-red-500/10">
                  <X className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Untagged Entries</p>
                  <p className="text-2xl font-bold">{untaggedEntries}</p>
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
            {tags.slice(0, 5).map((tag) => (
              <button
                key={tag.id}
                type="button"
                onClick={() => setActiveFilter(activeFilter === tag.id ? null : tag.id)}
                className="focus:outline-none"
              >
                <Badge
                  variant={activeFilter === tag.id ? "default" : "outline"}
                  className="cursor-pointer transition-colors"
                  style={
                    activeFilter === tag.id
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
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTags.map((tag, index) => (
              <motion.div
                key={tag.id}
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
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {tag.description}
                    </p>
                    <Separator />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        <span className="font-semibold text-foreground">{tag.count}</span>{" "}
                        {tag.count === 1 ? "entry" : "entries"} tagged
                      </span>
                      <span>
                        {tag.lastUsed === "Never"
                          ? "Never used"
                          : `Last used ${formatDate(tag.lastUsed)}`}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

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
              <Label htmlFor="edit-tag-description">Description</Label>
              <Textarea
                id="edit-tag-description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={3}
              />
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
            >
              Cancel
            </Button>
            <Button className="bg-primary hover:bg-primary/90" onClick={handleEdit}>
              Save Changes
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
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete Tag
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
