/**
 * Lightweight Markdown renderer for chat messages.
 *
 * Supports:
 *   **bold**         → <strong>
 *   _italic_ / *italic*  → <em>
 *   `code`           → <code> (monospace, bg)
 *   - item / * item  → <ul><li>
 *   [text](url)      → <a target="_blank">
 *   @username        → highlighted mention chip
 *   #channel-name    → highlighted channel chip
 *
 * No external dependencies — pure React.
 * Safe: no dangerouslySetInnerHTML, only React elements.
 */

import React from "react";

interface RenderOptions {
  /** Optional list of member names in the current channel for @mention styling. */
  knownMembers?: string[];
  /** Called when an @mention is rendered (e.g. to highlight). */
  onMention?: (name: string) => void;
}

/**
 * Escape regex special characters in a string.
 */
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Split a string by markdown patterns, returning React nodes.
 * Processes one pattern type at a time to avoid nested-parsing complexity.
 */
function splitByPattern(
  text: string,
  pattern: RegExp,
  render: (match: string, groups: string[]) => React.ReactNode,
  keyPrefix: string
): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const re = new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : pattern.flags + "g");
  let i = 0;

  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    nodes.push(
      <React.Fragment key={`${keyPrefix}-${i++}`}>
        {render(match[0], match.slice(1))}
      </React.Fragment>
    );
    lastIndex = match.index + match[0].length;
    if (match.index === re.lastIndex) re.lastIndex++;
  }
  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }
  return nodes;
}

/**
 * Recursively render markdown for a single text segment.
 * We process patterns in priority order: code → bold → italic → link → mention → channel.
 */
function renderInline(text: string, opts: RenderOptions, depth: number = 0): React.ReactNode[] {
  if (depth > 6 || !text) return [text];

  const nodes: React.ReactNode[] = [];

  // 1. Inline code: `code` (process first so other patterns inside are ignored)
  const codeSegments = splitByPattern(
    text,
    /`([^`\n]+)`/,
    (full, [code]) => (
      <code
        className="px-1.5 py-0.5 mx-0.5 rounded bg-muted text-foreground font-mono text-[0.85em] border border-border/50 break-words"
      >
        {code}
      </code>
    ),
    `code-${depth}`
  );

  for (const seg of codeSegments) {
    if (typeof seg !== "string") {
      nodes.push(seg);
      continue;
    }
    // 2. Bold: **text**
    const boldSegs = splitByPattern(
      seg,
      /\*\*([^*\n]+)\*\*/,
      (full, [inner]) => <strong className="font-bold text-foreground">{renderInline(inner, opts, depth + 1)}</strong>,
      `bold-${depth}`
    );

    for (const bseg of boldSegs) {
      if (typeof bseg !== "string") {
        nodes.push(bseg);
        continue;
      }
      // 3. Italic: _text_ or *text* (but not ** which is bold)
      const italicSegs = splitByPattern(
        bseg,
        /(?<!\*)_([^_\n]+)_(?!\*)/,
        (full, [inner]) => <em className="italic">{renderInline(inner, opts, depth + 1)}</em>,
        `italic1-${depth}`
      );

      for (const iseg of italicSegs) {
        if (typeof iseg !== "string") {
          nodes.push(iseg);
          continue;
        }
        // Italic with single asterisks (avoid ** which is bold)
        const italic2Segs = splitByPattern(
          iseg,
          /(?<!\*)\*([^*\n]+)\*(?!\*)/,
          (full, [inner]) => <em className="italic">{renderInline(inner, opts, depth + 1)}</em>,
          `italic2-${depth}`
        );

        for (const iseg2 of italic2Segs) {
          if (typeof iseg2 !== "string") {
            nodes.push(iseg2);
            continue;
          }
          // 4. Links: [text](url)
          const linkSegs = splitByPattern(
            iseg2,
            /\[([^\]]+)\]\(([^)\s]+)\)/,
            (full, [label, url]) => (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-2 hover:text-primary/80 break-words"
              >
                {label}
              </a>
            ),
            `link-${depth}`
          );

          for (const lseg of linkSegs) {
            if (typeof lseg !== "string") {
              nodes.push(lseg);
              continue;
            }
            // 5. @mentions: @username (letters, digits, underscore, hyphen, space until non-word)
            const mentionSegs = splitByPattern(
              lseg,
              /@([A-Za-z][A-Za-z0-9_\- ]{0,40}?)(?=[\s.,!?;:)]|$)/,
              (full, [name]) => {
                const trimmed = name.trim();
                return (
                  <span
                    className="inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded bg-primary/15 text-primary font-medium cursor-pointer hover:bg-primary/25 transition-colors break-words"
                    onClick={(e) => {
                      e.stopPropagation();
                      opts.onMention?.(trimmed);
                    }}
                  >
                    @{trimmed}
                  </span>
                );
              },
              `mention-${depth}`
            );

            for (const mseg of mentionSegs) {
              if (typeof mseg !== "string") {
                nodes.push(mseg);
                continue;
              }
              // 6. #channel references
              const chanSegs = splitByPattern(
                mseg,
                /#([a-z][a-z0-9\-_]{0,40})/,
                (full, [name]) => (
                  <span className="inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded bg-accent text-accent-foreground font-medium break-words">
                    #{name}
                  </span>
                ),
                `channel-${depth}`
              );
              nodes.push(...chanSegs);
            }
          }
        }
      }
    }
  }

  return nodes;
}

/**
 * Render a full message string as React nodes.
 * Handles line breaks and bullet lists at the block level,
 * then runs inline rendering on each line.
 */
export function renderMarkdown(content: string, opts: RenderOptions = {}): React.ReactNode {
  if (!content) return null;

  const lines = content.split("\n");
  const blocks: React.ReactNode[] = [];
  let listItems: string[] = [];
  let key = 0;

  const flushList = () => {
    if (listItems.length === 0) return;
    const items = [...listItems];
    blocks.push(
      <ul key={`ul-${key++}`} className="my-1 ml-5 list-disc space-y-0.5">
        {items.map((item, i) => (
          <li key={i} className="text-sm">
            {renderInline(item, opts)}
          </li>
        ))}
      </ul>
    );
    listItems = [];
  };

  for (const line of lines) {
    // Bullet list items: "- " or "* " at start of line
    const bulletMatch = line.match(/^\s*[-*]\s+(.+)$/);
    if (bulletMatch) {
      listItems.push(bulletMatch[1]);
      continue;
    }
    flushList();

    if (line.trim() === "") {
      blocks.push(<div key={`br-${key++}`} className="h-2" />);
    } else {
      blocks.push(
        <span key={`line-${key++}`} className="break-words">
          {renderInline(line, opts)}
          {" "}
        </span>
      );
    }
  }
  flushList();

  return <>{blocks}</>;
}

/**
 * Extract @mentions from a message string.
 * Returns a list of unique usernames mentioned (without the @).
 */
export function extractMentions(content: string): string[] {
  const re = /@([A-Za-z][A-Za-z0-9_\- ]{0,40}?)(?=[\s.,!?;:)]|$)/g;
  const names = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    names.add(m[1].trim());
  }
  return Array.from(names);
}
