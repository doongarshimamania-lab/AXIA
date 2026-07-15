/**
 * HallmarkThemes — settings page where users preview and pick a Hallmark
 * design theme for AXIA's marketing pages and client-facing surfaces.
 *
 * The selected theme is persisted via useHallmarkTheme (localStorage) and
 * flows into any <HallmarkScope> wrapper rendered elsewhere in the app
 * (Landing page, Proposal preview, Client portal).
 *
 * Source skill: https://github.com/Nutlope/hallmark (MIT, Together AI)
 * 21 themes, 4 genres (editorial / modern-minimal / atmospheric / playful)
 */

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { HallmarkScope, useHallmarkTheme, HALLMARK_THEMES, type HallmarkThemeMeta } from "@/hooks/use-hallmark-theme";
import { HallmarkThemeCard } from "@/components/hallmark/HallmarkThemeCard";
import { PageLayout } from "@/components/design-system/PageLayout";
import { toast } from "sonner";
import {
  Palette,
  Check,
  Sparkles,
  Info,
  Layout,
  Eye,
} from "lucide-react";

type GenreFilter = "all" | HallmarkThemeMeta["genre"];

const GENRES: { value: GenreFilter; label: string; description: string }[] = [
  { value: "all", label: "All themes", description: "Show every theme" },
  { value: "editorial", label: "Editorial", description: "Long-form, magazine, newspaper" },
  { value: "modern-minimal", label: "Modern-minimal", description: "Stripe / Linear school — SaaS, dev tools" },
  { value: "atmospheric", label: "Atmospheric", description: "Dark AI tools, generative, late-night" },
  { value: "playful", label: "Playful", description: "Soft consumer, casual, friendly" },
];

export default function HallmarkThemes() {
  const { theme, setTheme, availableThemes } = useHallmarkTheme();
  const [genreFilter, setGenreFilter] = useState<GenreFilter>("all");

  const filteredThemes = useMemo(() => {
    if (genreFilter === "all") return availableThemes;
    return availableThemes.filter((t) => t.genre === genreFilter);
  }, [availableThemes, genreFilter]);

  const activeThemeMeta = availableThemes.find((t) => t.name === theme);

  const handleSelect = (name: HallmarkThemeMeta["name"]) => {
    setTheme(name);
    toast.success(`Hallmark theme set to "${name}"`, {
      description: "Landing page + client-facing surfaces will use this theme.",
    });
  };

  return (
    <PageLayout
      title="Hallmark Themes"
      description="Anti-AI-slop design system by Together AI. 21 hand-tuned themes — pick one for AXIA's marketing site and client-facing surfaces."
      icon={<Palette className="h-5 w-5" />}
    >
      {/* Active theme banner */}
      <Card className="mb-6 border-primary/30 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <HallmarkScope theme={theme} className="!p-0">
              <div
                className="rounded-md p-3 min-w-[120px] text-center"
                style={{
                  background: "var(--color-paper)",
                  color: "var(--color-ink)",
                  fontFamily: "var(--font-display)",
                  fontWeight: "var(--display-weight, 600)",
                  fontSize: "1.25rem",
                  letterSpacing: "var(--tracking-display, -0.02em)",
                  border: "1px solid var(--color-rule)",
                }}
              >
                {activeThemeMeta?.label ?? theme}
                <div
                  style={{
                    fontFamily: "var(--font-mono, monospace)",
                    fontSize: "0.625rem",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "var(--color-muted)",
                    marginTop: "0.25rem",
                  }}
                >
                  Active
                </div>
              </div>
            </HallmarkScope>

            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-semibold">{activeThemeMeta?.label ?? theme}</h3>
                <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">
                  {activeThemeMeta?.genre}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{activeThemeMeta?.blurb}</p>
              <p className="text-xs text-muted-foreground mt-2">
                Selected theme flows into the public Landing page and any
                <code className="mx-1 px-1 py-0.5 rounded bg-muted text-[10px]">&lt;HallmarkScope&gt;</code>
                wrapper rendered in client-facing surfaces.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Genre filter */}
      <div className="mb-6 flex flex-wrap gap-2">
        {GENRES.map((g) => (
          <button
            key={g.value}
            type="button"
            onClick={() => setGenreFilter(g.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
              genreFilter === g.value
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background border-border hover:bg-muted text-muted-foreground"
            }`}
            title={g.description}
          >
            {g.label}
            <span className="ml-1.5 opacity-60">
              {g.value === "all"
                ? availableThemes.length
                : availableThemes.filter((t) => t.genre === g.value).length}
            </span>
          </button>
        ))}
      </div>

      {/* Theme grid */}
      <motion.div
        layout
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
      >
        {filteredThemes.map((meta) => (
          <HallmarkThemeCard
            key={meta.name}
            meta={meta}
            isSelected={meta.name === theme}
            onSelect={() => handleSelect(meta.name)}
          />
        ))}
      </motion.div>

      {/* Info panel */}
      <Card className="mt-8 bg-muted/30 border-dashed">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Info className="h-4 w-4" />
            How Hallmark works in AXIA
          </CardTitle>
          <CardDescription>
            Hallmark is an anti-AI-slop design skill — it makes pages look made, not generated.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-3">
          <div className="flex items-start gap-2">
            <Layout className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
            <div>
              <strong className="text-foreground">Where it applies:</strong>{" "}
              Hallmark themes apply only to surfaces wrapped in{" "}
              <code className="px-1 py-0.5 rounded bg-muted text-[11px]">&lt;HallmarkScope&gt;</code>.
              Currently this is the public Landing page. AXIA's in-app dashboard
              keeps its teal/Slate brand identity.
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Sparkles className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
            <div>
              <strong className="text-foreground">What's in a theme:</strong>{" "}
              21 themes ship with distinct OKLCH palettes (paper / ink / accent)
              and font stacks (display + body + label + mono). Each theme is a
              full token set — colors, fonts, spacing, motion — switched via{" "}
              <code className="px-1 py-0.5 rounded bg-muted text-[11px]">data-hallmark-theme</code>.
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Eye className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
            <div>
              <strong className="text-foreground">Preview live:</strong>{" "}
              After picking a theme, visit{" "}
              <a href="/" target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2">
                the landing page
              </a>{" "}
              to see it in action. Each card above is also a live preview using
              the theme's real tokens.
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
            <div>
              <strong className="text-foreground">Credit:</strong>{" "}
              Hallmark is an open-source design skill by{" "}
              <a
                href="https://github.com/Nutlope/hallmark"
                target="_blank"
                rel="noreferrer"
                className="text-primary underline underline-offset-2"
              >
                Together AI
              </a>{" "}
              (MIT license). 21 themes · 4 genres · 21 macrostructures · 57 slop-test gates.
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action buttons */}
      <div className="mt-6 flex items-center gap-3">
        <Button asChild>
          <a href="/" target="_blank" rel="noreferrer">
            <Eye className="h-4 w-4 mr-2" />
            Preview on Landing page
          </a>
        </Button>
        <Button variant="outline" onClick={() => toast.success("Theme saved", {
          description: `"${theme}" is now your active Hallmark theme.`,
        })}>
          <Check className="h-4 w-4 mr-2" />
          Save preference
        </Button>
      </div>
    </PageLayout>
  );
}
