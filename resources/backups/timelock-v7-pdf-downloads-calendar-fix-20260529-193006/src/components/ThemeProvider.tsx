import { createContext, useContext, useCallback, useState, useEffect, useRef } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Apply dark class synchronously BEFORE React renders to prevent flash
// This runs immediately on module load — no light-mode flash
if (typeof document !== "undefined") {
  const stored = localStorage.getItem("axia_theme") as Theme | null;
  const initial = stored || "dark";
  if (initial === "dark") {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}

// Imperative helper — applies theme to DOM + localStorage without React state
function applyThemeToDOM(newTheme: Theme) {
  const root = document.documentElement;
  if (newTheme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
  localStorage.setItem("axia_theme", newTheme);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof localStorage !== "undefined") {
      const stored = localStorage.getItem("axia_theme") as Theme | null;
      return stored || "dark";
    }
    return "dark";
  });

  // Track last-applied theme to avoid redundant DOM writes
  const lastApplied = useRef<Theme>(theme);

  const setTheme = useCallback((newTheme: Theme) => {
    // Apply to DOM immediately (before React re-render) for zero-lag feel
    applyThemeToDOM(newTheme);
    lastApplied.current = newTheme;
    setThemeState(newTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next = prev === "light" ? "dark" : "light";
      // Apply to DOM immediately inside updater for instant visual feedback
      applyThemeToDOM(next);
      lastApplied.current = next;
      return next;
    });
  }, []);

  // Keep DOM in sync on mount (covers hydration / initial render)
  useEffect(() => {
    if (lastApplied.current !== theme) {
      applyThemeToDOM(theme);
      lastApplied.current = theme;
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
