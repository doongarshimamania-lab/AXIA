/**
 * useHallmarkTheme — React context for selecting a Hallmark design theme.
 *
 * Hallmark ships 21 anti-AI-slop themes (Specimen, Midnight, Brutal, etc.)
 * baked into src/styles/hallmark-tokens.css. Each theme is a set of OKLCH
 * color tokens + font-family stacks switched via `data-hallmark-theme="<name>"`
 * on any wrapper element.
 *
 * Usage:
 *   <HallmarkThemeProvider>
 *     <App />
 *   </HallmarkThemeProvider>
 *
 *   const { theme, setTheme, availableThemes } = useHallmarkTheme();
 *
 * Persistence: localStorage key "axia_hallmark_theme". Default: "specimen".
 *
 * The theme is NOT applied globally to <html> by this provider — that would
 * clobber AXIA's Tailwind brand identity on authenticated pages. Instead,
 * consumers render a <HallmarkScope> wrapper (which sets the data attribute
 * on its own div) so the theme applies only where intended (Landing page,
 * ProposalBuilder preview, ClientWorkspace portal, etc.).
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type HallmarkThemeName =
  | "specimen"
  | "midnight"
  | "brutal"
  | "garden"
  | "atelier"
  | "newsprint"
  | "terminal"
  | "manifesto"
  | "almanac"
  | "sport"
  | "studio"
  | "riso"
  | "bloom"
  | "coral"
  | "cobalt"
  | "aurora"
  | "editorial"
  | "carnival"
  | "lumen"
  | "hum"
  | "day";

export interface HallmarkThemeMeta {
  name: HallmarkThemeName;
  label: string;
  genre: "editorial" | "modern-minimal" | "atmospheric" | "playful";
  blurb: string;
}

export const HALLMARK_THEMES: HallmarkThemeMeta[] = [
  { name: "specimen", label: "Specimen", genre: "editorial", blurb: "Warm oat editorial workshop · serif default" },
  { name: "midnight", label: "Midnight", genre: "atmospheric", blurb: "Deep blue dark · atmospheric AI tool" },
  { name: "brutal", label: "Brutal", genre: "editorial", blurb: "High-contrast newsprint brutalist" },
  { name: "garden", label: "Garden", genre: "editorial", blurb: "Mossy botanical editorial" },
  { name: "atelier", label: "Atelier", genre: "editorial", blurb: "Studio atelier · warm neutral" },
  { name: "newsprint", label: "Newsprint", genre: "editorial", blurb: "Ink-on-paper newspaper" },
  { name: "terminal", label: "Terminal", genre: "atmospheric", blurb: "Phosphor green-on-black" },
  { name: "manifesto", label: "Manifesto", genre: "editorial", blurb: "Bold declarative poster" },
  { name: "almanac", label: "Almanac", genre: "editorial", blurb: "Field almanac · earthy" },
  { name: "sport", label: "Sport", genre: "editorial", blurb: "Athletic slab serif" },
  { name: "studio", label: "Studio", genre: "modern-minimal", blurb: "Clean studio sans" },
  { name: "riso", label: "Riso", genre: "editorial", blurb: "Risograph two-tone print" },
  { name: "bloom", label: "Bloom", genre: "atmospheric", blurb: "Soft floral dark" },
  { name: "coral", label: "Coral", genre: "modern-minimal", blurb: "Coral on cream SaaS" },
  { name: "cobalt", label: "Cobalt", genre: "modern-minimal", blurb: "Cobalt blue dev tool" },
  { name: "aurora", label: "Aurora", genre: "atmospheric", blurb: "Polar gradient atmospheric" },
  { name: "editorial", label: "Editorial", genre: "editorial", blurb: "Long-form magazine" },
  { name: "carnival", label: "Carnival", genre: "editorial", blurb: "Festival poster playful" },
  { name: "lumen", label: "Lumen", genre: "atmospheric", blurb: "Glowing amber dark" },
  { name: "hum", label: "Hum", genre: "playful", blurb: "Soft pastel playful" },
  { name: "day", label: "Day", genre: "playful", blurb: "Daylight soft sans" },
];

const STORAGE_KEY = "axia_hallmark_theme";
const DEFAULT_THEME: HallmarkThemeName = "specimen";

interface HallmarkThemeContextValue {
  theme: HallmarkThemeName;
  setTheme: (t: HallmarkThemeName) => void;
  availableThemes: HallmarkThemeMeta[];
}

const HallmarkThemeContext = createContext<HallmarkThemeContextValue | null>(null);

function readStoredTheme(): HallmarkThemeName {
  if (typeof window === "undefined") return DEFAULT_THEME;
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    if (v && HALLMARK_THEMES.some((t) => t.name === v)) {
      return v as HallmarkThemeName;
    }
  } catch {
    /* localStorage may be blocked */
  }
  return DEFAULT_THEME;
}

export function HallmarkThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<HallmarkThemeName>(readStoredTheme);

  const setTheme = (t: HallmarkThemeName) => {
    setThemeState(t);
    try {
      window.localStorage.setItem(STORAGE_KEY, t);
    } catch {
      /* ignore */
    }
  };

  // Keep multiple tabs in sync.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        const next = e.newValue as HallmarkThemeName;
        if (HALLMARK_THEMES.some((t) => t.name === next)) {
          setThemeState(next);
        }
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return (
    <HallmarkThemeContext.Provider
      value={{ theme, setTheme, availableThemes: HALLMARK_THEMES }}
    >
      {children}
    </HallmarkThemeContext.Provider>
  );
}

export function useHallmarkTheme(): HallmarkThemeContextValue {
  const ctx = useContext(HallmarkThemeContext);
  if (!ctx) {
    // Safe fallback so consumers don't crash if provider missing
    return {
      theme: DEFAULT_THEME,
      setTheme: () => {},
      availableThemes: HALLMARK_THEMES,
    };
  }
  return ctx;
}

/**
 * HallmarkScope — wrapper div that applies the currently-selected Hallmark
 * theme to its subtree. Render this around any page section that should
 * use Hallmark design tokens instead of AXIA's Tailwind brand theme.
 */
export function HallmarkScope({
  children,
  className = "",
  theme: themeOverride,
}: {
  children: ReactNode;
  className?: string;
  theme?: HallmarkThemeName;
}) {
  const { theme } = useHallmarkTheme();
  const effectiveTheme = themeOverride ?? theme;
  return (
    <div
      className={`hallmark-scope ${className}`.trim()}
      data-hallmark-theme={effectiveTheme}
    >
      {children}
    </div>
  );
}
