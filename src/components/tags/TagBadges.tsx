// @ts-nocheck — Tag shape varies slightly between Convex returns and inline arrays
/**
 * Read-only display of tag chips for an entity.
 *
 * Usage:
 *   <TagBadges tagIds={client.tagIds} tags={allTags} max={3} />
 *
 * Or, if you already have the resolved tag objects:
 *   <TagBadges tags={[{name, color}, ...]} />
 *
 * Renders nothing if the list is empty (so it's safe to drop into any
 * card row without conditional wrappers).
 */
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export interface TagLike {
  _id?: string;
  name: string;
  color?: string;
}

interface TagBadgesProps {
  /** Resolved tag objects. Mutually exclusive with tagIds. */
  tags?: TagLike[];
  /** Array of tag IDs — caller must also pass `tags` so we can resolve them. */
  tagIds?: string[];
  /** Max badges to render before showing "+N more". Default 3. */
  max?: number;
  /** sm = default; xs = smaller (for tight table rows). */
  size?: "sm" | "xs";
  /** Show a tiny dot before the name. Default true. */
  showDot?: boolean;
  className?: string;
}

export function TagBadges({
  tags,
  tagIds,
  max = 3,
  size = "sm",
  showDot = true,
  className,
}: TagBadgesProps) {
  // Resolve: if caller passed tagIds + tags, filter tags by IDs.
  let resolved: TagLike[] = [];
  if (tags) {
    if (tagIds) {
      const idSet = new Set(tagIds);
      resolved = tags.filter((t) => t._id && idSet.has(t._id));
    } else {
      resolved = tags;
    }
  }

  if (resolved.length === 0) return null;

  const visible = resolved.slice(0, max);
  const overflow = resolved.length - visible.length;

  const badgeClass = size === "xs" ? "text-[10px] px-1.5 py-0 h-4" : "text-xs";

  return (
    <div className={`flex items-center gap-1 flex-wrap ${className ?? ""}`}>
      {visible.map((t, i) => (
        <Badge
          key={t._id ?? i}
          variant="outline"
          className={`${badgeClass} font-medium border`}
          style={{
            borderColor: (t.color ?? "#888") + "66",
            color: t.color ?? undefined,
            backgroundColor: (t.color ?? "#888") + "12",
          }}
        >
          {showDot && (
            <span
              className="inline-block w-1.5 h-1.5 rounded-full mr-1"
              style={{ backgroundColor: t.color ?? "#888" }}
            />
          )}
          {t.name}
        </Badge>
      ))}
      {overflow > 0 && (
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="secondary" className={`${badgeClass} cursor-help`}>
                +{overflow}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <div className="space-y-1">
                {resolved.slice(max).map((t, i) => (
                  <div key={t._id ?? i} className="flex items-center gap-1.5">
                    <span
                      className="inline-block w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: t.color ?? "#888" }}
                    />
                    <span>{t.name}</span>
                  </div>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}

export default TagBadges;
