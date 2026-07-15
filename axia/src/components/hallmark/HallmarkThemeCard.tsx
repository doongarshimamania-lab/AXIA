/**
 * HallmarkThemeCard — a self-contained live preview of one Hallmark theme.
 *
 * Renders a small poster showing the theme's paper color, accent, typography,
 * and a faux hero block. Clicking the card selects the theme.
 *
 * The card itself uses HallmarkScope with a `theme` override so each card
 * displays its own theme regardless of the global selection.
 */

import { HallmarkScope, type HallmarkThemeMeta } from "@/hooks/use-hallmark-theme";
import { Check } from "lucide-react";

export function HallmarkThemeCard({
  meta,
  isSelected,
  onSelect,
}: {
  meta: HallmarkThemeMeta;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="group relative text-left rounded-lg overflow-hidden border-2 transition-all duration-200 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary"
      style={{
        borderColor: isSelected ? "var(--color-primary, #0D9488)" : "transparent",
      }}
      aria-pressed={isSelected}
      aria-label={`Select ${meta.label} theme`}
    >
      {/* Selected checkmark badge */}
      {isSelected && (
        <div
          className="absolute top-2 right-2 z-10 rounded-full p-1 shadow-md"
          style={{ background: "var(--color-primary, #0D9488)", color: "white" }}
        >
          <Check className="h-3 w-3" strokeWidth={3} />
        </div>
      )}

      {/* Genre chip */}
      <div
        className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider"
        style={{
          background: "rgba(0,0,0,0.35)",
          color: "white",
          backdropFilter: "blur(4px)",
        }}
      >
        {meta.genre}
      </div>

      <HallmarkScope theme={meta.name} className="!p-0">
        {/* Preview surface using theme tokens */}
        <div
          style={{
            background: "var(--color-paper)",
            color: "var(--color-ink)",
            padding: "1.25rem",
            minHeight: "180px",
          }}
        >
          {/* Faux display heading using theme's display font */}
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: "var(--display-weight, 600)",
              fontSize: "1.5rem",
              lineHeight: "var(--lh-tight, 1.1)",
              letterSpacing: "var(--tracking-display, -0.02em)",
              marginBottom: "0.5rem",
              color: "var(--color-ink)",
            }}
          >
            {meta.label}
          </div>

          {/* Faux body text */}
          <div
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "0.75rem",
              lineHeight: "1.4",
              color: "var(--color-muted)",
              marginBottom: "0.75rem",
            }}
          >
            {meta.blurb}
          </div>

          {/* Color swatch row */}
          <div className="flex gap-1 mb-3">
            {[
              "var(--color-paper)",
              "var(--color-paper-2)",
              "var(--color-paper-3)",
              "var(--color-rule)",
              "var(--color-muted)",
              "var(--color-neutral)",
              "var(--color-ink)",
              "var(--color-accent)",
            ].map((c, i) => (
              <div
                key={i}
                style={{
                  background: c,
                  width: "16px",
                  height: "16px",
                  borderRadius: "2px",
                  border: "1px solid var(--color-rule)",
                }}
                title={c}
              />
            ))}
          </div>

          {/* Faux CTA button */}
          <div
            style={{
              display: "inline-block",
              fontFamily: "var(--font-label, var(--font-body))",
              fontSize: "0.65rem",
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              padding: "0.35rem 0.75rem",
              borderRadius: "2px",
              background: "var(--color-accent)",
              color: "var(--color-accent-ink, white)",
            }}
          >
            Get Started →
          </div>

          {/* Faux divider + label */}
          <div
            style={{
              marginTop: "1rem",
              paddingTop: "0.5rem",
              borderTop: "1px solid var(--color-rule)",
              fontFamily: "var(--font-label, var(--font-mono, monospace))",
              fontSize: "0.6rem",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--color-muted)",
            }}
          >
            {meta.name} · hallmark
          </div>
        </div>
      </HallmarkScope>
    </button>
  );
}
