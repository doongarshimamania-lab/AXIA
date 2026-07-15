// @ts-nocheck — entity types are intentionally loose to support all 7 taggable tables
/**
 * Multi-select tag picker with inline "create tag" affordance.
 *
 * Usage:
 *   <TagPicker
 *     entityType="clients"
 *     entityId={client._id}
 *     initialTagIds={client.tagIds ?? []}
 *     onChange={(ids) => setLocalTagIds(ids)}
 *   />
 *
 * Behavior:
 *   - Loads the caller's tags (workspace-scoped if useWorkspaceContext reports
 *     a connection).
 *   - Multi-select combobox: click chips to toggle, or type to filter.
 *   - If the typed query doesn't match any existing tag, shows a "Create
 *     '<query>'" affordance. Creating a tag calls createTag, attaches it
 *     to the entity via setEntityTags, and updates the local state.
 *   - If `entityId` is provided, changes are immediately persisted via
 *     setEntityTags. If `entityId` is undefined (e.g. during a create-entity
 *     flow before the entity exists), the picker is "detached" — caller
 *     must call setEntityTags themselves after the entity is created. Use
 *     onChange to track the selected IDs.
 */
import { useState, useMemo, useEffect } from "react";
import { Plus, X, Tag as TagIcon, Loader2, Check, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useWorkspaceContext } from "@/hooks/use-workspace";
import { useQuery, useMutation } from "@/lib/safe-convex-react";
import { api } from "@/convex/_generated/api";

// Same 12 swatches used by Tags.tsx, so newly-created tags match the palette.
const PRESET_COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#84cc16", "#22c55e",
  "#14b8a6", "#06b6d4", "#6366f1", "#a855f7", "#ec4899",
  "#f43f5e", "#0ea5e9",
];

// Cycle through colors so newly-created tags are visually distinct.
function pickColorForNewTag(existingCount: number): string {
  return PRESET_COLORS[existingCount % PRESET_COLORS.length];
}

interface TagPickerProps {
  entityType:
    | "clients"
    | "projects"
    | "proposals"
    | "invoices"
    | "workSessions"
    | "deals"
    | "goals";
  /** If provided, picker persists changes immediately via setEntityTags. */
  entityId?: string;
  /** Initial selection (controlled-ish: we sync from this when it changes). */
  initialTagIds?: string[];
  /** Notified on every change with the new ID list. */
  onChange?: (tagIds: string[]) => void;
  /** Optional category hint to pre-select when creating new tags. */
  categoryHint?: "general" | "client" | "project" | "evidence";
  /** Disable interaction (e.g. during parent save). */
  disabled?: boolean;
  /** Smaller variant for tight table rows. */
  size?: "sm" | "xs";
  /** Placeholder for the input. */
  placeholder?: string;
  className?: string;
}

export function TagPicker({
  entityType,
  entityId,
  initialTagIds = [],
  onChange,
  categoryHint = "general",
  disabled = false,
  size = "sm",
  placeholder = "Add tags...",
  className,
}: TagPickerProps) {
  const { activeWorkspaceId, isConvexConnected } = useWorkspaceContext();
  const workspaceId = isConvexConnected ? activeWorkspaceId : undefined;

  // Load tags for this workspace/user. We use getTags (not getTagsWithUsage)
  // here for speed — the picker doesn't need usage counts.
  const tagsData = useQuery(api.tags.crud.getTags, { workspaceId: workspaceId as any });

  // Mutations
  const setEntityTagsMutation = useMutation(api.tags.crud.setEntityTags);
  const createTagMutation = useMutation(api.tags.crud.createTag);

  // Local state
  const [selectedIds, setSelectedIds] = useState<string[]>(initialTagIds);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [isWorking, setIsWorking] = useState(false);

  // Sync from prop when initialTagIds changes (e.g. parent loads the entity
  // after the picker is first rendered).
  useEffect(() => {
    setSelectedIds(initialTagIds);
  }, [initialTagIds.join(",")]);

  const tags: any[] = tagsData ?? [];

  // Filter tags by query (case-insensitive, by name).
  const filtered = useMemo(() => {
    if (!query.trim()) return tags;
    const q = query.toLowerCase();
    return tags.filter((t) => t.name.toLowerCase().includes(q));
  }, [tags, query]);

  // Selected tag objects (for display).
  const selectedTags = useMemo(
    () => tags.filter((t) => selectedIds.includes(t._id)),
    [tags, selectedIds],
  );

  // Whether the typed query is an EXACT case-insensitive match for an existing
  // tag (so we don't offer "Create 'Foo'" when "foo" already exists).
  const exactMatchExists = useMemo(() => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return tags.some((t) => t.name.toLowerCase() === q);
  }, [tags, query]);

  // ── Toggle a tag on/off ──
  const toggleTag = async (tagId: string) => {
    if (disabled) return;
    const next = selectedIds.includes(tagId)
      ? selectedIds.filter((id) => id !== tagId)
      : [...selectedIds, tagId];
    setSelectedIds(next);
    onChange?.(next);

    // If we have an entityId, persist immediately.
    if (entityId) {
      setIsWorking(true);
      try {
        await setEntityTagsMutation({
          entityType,
          entityId,
          tagIds: next,
        });
      } catch (err: any) {
        toast.error(err?.message || "Failed to update tags");
        // Revert local state on failure
        setSelectedIds(selectedIds);
        onChange?.(selectedIds);
      } finally {
        setIsWorking(false);
      }
    }
  };

  // ── Create a new tag AND attach it ──
  const createAndAttach = async () => {
    if (disabled || !query.trim() || exactMatchExists) return;
    const name = query.trim();

    setIsWorking(true);
    try {
      const newId = await createTagMutation({
        workspaceId: workspaceId as any,
        name,
        color: pickColorForNewTag(tags.length),
        category: categoryHint,
      });
      const next = [...selectedIds, newId];
      setSelectedIds(next);
      onChange?.(next);
      setQuery("");

      if (entityId) {
        await setEntityTagsMutation({
          entityType,
          entityId,
          tagIds: next,
        });
      }
      toast.success(`Tag "${name}" created`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to create tag");
    } finally {
      setIsWorking(false);
    }
  };

  // ── Render ──
  const inputHeight = size === "xs" ? "h-7 text-xs" : "h-9 text-sm";

  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ""}`}>
      {/* Selected chips row */}
      {selectedTags.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap">
          {selectedTags.map((t) => (
            <Badge
              key={t._id}
              variant="outline"
              className={`${size === "xs" ? "text-[10px] px-1.5 py-0 h-4" : "text-xs"} font-medium gap-1`}
              style={{
                borderColor: (t.color ?? "#888") + "66",
                color: t.color ?? undefined,
                backgroundColor: (t.color ?? "#888") + "12",
              }}
            >
              <span
                className="inline-block w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: t.color ?? "#888" }}
              />
              {t.name}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => toggleTag(t._id)}
                  className="ml-0.5 hover:bg-black/10 rounded-full p-0.5"
                  aria-label={`Remove ${t.name}`}
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}

      {/* Combobox */}
      <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setQuery(""); }}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled || isWorking}
            className={`${inputHeight} w-full justify-start text-muted-foreground font-normal`}
          >
            {isWorking ? (
              <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
            ) : (
              <TagIcon className="h-3.5 w-3.5 mr-2" />
            )}
            {selectedTags.length === 0 ? placeholder : "Add another tag..."}
            <ChevronDown className="h-3.5 w-3.5 ml-auto" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-[320px]" align="start">
          <div className="p-2 border-b">
            <Input
              autoFocus
              placeholder="Search or type to create..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-8 text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (query.trim() && !exactMatchExists) {
                    createAndAttach();
                  }
                }
              }}
            />
          </div>
          <div className="max-h-[240px] overflow-y-auto py-1">
            {filtered.length === 0 && (exactMatchExists || !query.trim()) ? (
              <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                {tags.length === 0
                  ? "No tags yet. Type above to create one."
                  : "No matching tags."}
              </div>
            ) : (
              filtered.map((t) => {
                const isSelected = selectedIds.includes(t._id);
                return (
                  <button
                    key={t._id}
                    type="button"
                    onClick={() => toggleTag(t._id)}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent transition-colors"
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: t.color ?? "#888" }}
                    />
                    <span className="flex-1 text-left truncate">{t.name}</span>
                    {isSelected && <Check className="h-3.5 w-3.5 text-primary" />}
                  </button>
                );
              })
            )}

            {/* Inline create affordance */}
            {query.trim() && !exactMatchExists && (
              <button
                type="button"
                onClick={createAndAttach}
                disabled={isWorking}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent border-t transition-colors text-primary"
              >
                {isWorking ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Plus className="h-3.5 w-3.5" />
                )}
                <span>
                  Create <span className="font-semibold">"{query.trim()}"</span>
                </span>
              </button>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default TagPicker;
