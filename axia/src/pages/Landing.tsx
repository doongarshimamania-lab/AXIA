import { useAuth } from "@/hooks/use-auth";
import { useNavigate } from "react-router";
import { Switch } from "@/components/ui/switch";
import { Sun, Moon, ArrowRight, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useTheme } from "@/components/ThemeProvider";
import { HallmarkScope, useHallmarkTheme } from "@/hooks/use-hallmark-theme";

// Import new modular components
import { HeroSection } from "@/components/landing/HeroSection";
import { ProblemCards } from "@/components/landing/ProblemCards";
import { SocialProofSection } from "@/components/landing/SocialProofSection";
import { FinalCTA } from "@/components/landing/FinalCTA";
import { Footer } from "@/components/landing/Footer";

export default function Landing() {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { theme: hallmarkTheme } = useHallmarkTheme();

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const scrollToWaitlist = () => {
    const el = document.querySelector('[data-waitlist-section]');
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <header>
        {/* Dark Mode Toggle + Hallmark Theme Picker */}
        <div data-theme-toggle className="fixed top-24 right-6 z-50 flex items-center gap-2 rounded-full border border-border bg-card/80 backdrop-blur-md px-3 py-2 shadow-sm transition-all duration-300">
          <Sun className={`h-4 w-4 ${theme === "light" ? "text-primary" : "text-muted-foreground"}`} />
          <Switch
            checked={theme === "dark"}
            onCheckedChange={toggleTheme}
            aria-label="Toggle dark mode"
          />
          <Moon className={`h-4 w-4 ${theme === "dark" ? "text-primary" : "text-muted-foreground"}`} />
          <div className="w-px h-5 bg-border mx-1" />
          <button
            type="button"
            onClick={() => navigate("/hallmark-themes")}
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            title={`Hallmark theme: ${hallmarkTheme} (click to change)`}
            aria-label={`Hallmark theme: ${hallmarkTheme}. Click to pick a different theme.`}
          >
            <Palette className="h-3.5 w-3.5" />
            <span className="hidden sm:inline capitalize">{hallmarkTheme}</span>
          </button>
        </div>

        {/* Navigation */}
        <nav className="border-b border-border/50 bg-background/80 backdrop-blur-md sticky top-0 z-40 transition-all duration-300">
          <div className="container mx-auto px-6 py-4 flex items-center justify-between">
            <motion.div
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => navigate("/")}
              whileHover={{ scale: 1.05 }}
            >
              <img src="/logo.svg" alt="Axia" width={32} height={32} />
              <span className="text-2xl font-bold tracking-tight" style={{ fontFamily: "Space Grotesk" }}>Axia</span>
            </motion.div>
            
            <div className="flex items-center gap-6">
              <button 
                onClick={() => scrollToSection("problems")}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors hidden md:block"
              >
                Problems We Solve
              </button>
              <button 
                onClick={() => scrollToSection("social-proof")}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors hidden md:block"
              >
                Reviews
              </button>
              <Button 
                onClick={scrollToWaitlist}
                className="bg-[#00246B] hover:bg-[#00246B]/90 text-white rounded-full px-6"
                disabled={isLoading}
              >
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </nav>
      </header>

      <main>
        <HeroSection />

        <div id="problems">
          <ProblemCards />
        </div>

        <div id="social-proof">
          <SocialProofSection />
        </div>

        <FinalCTA />

        {/* Hallmark Showcase Section — live preview of selected theme tokens */}
        <HallmarkScope className="w-full border-t border-border/50">
          <section className="mx-auto max-w-5xl px-6 py-16" style={{ background: "var(--color-paper)", color: "var(--color-ink)" }}>
            <div className="grid md:grid-cols-[1fr_auto] gap-8 items-center">
              <div>
                <div
                  style={{
                    fontFamily: "var(--font-label, var(--font-mono, monospace))",
                    fontSize: "0.7rem",
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: "var(--color-muted)",
                    marginBottom: "0.75rem",
                  }}
                >
                  Hallmark Design System · Active Theme
                </div>
                <h2
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: "var(--display-weight, 600)",
                    fontSize: "clamp(1.75rem, 3vw, 2.5rem)",
                    lineHeight: "var(--lh-tight, 1.05)",
                    letterSpacing: "var(--tracking-display, -0.02em)",
                    color: "var(--color-ink)",
                    marginBottom: "0.75rem",
                  }}
                >
                  <span style={{ color: "var(--color-accent)" }}>
                    {hallmarkTheme.charAt(0).toUpperCase() + hallmarkTheme.slice(1)}
                  </span>{" "}
                  — made, not generated.
                </h2>
                <p
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: "0.95rem",
                    lineHeight: "var(--lh-relaxed, 1.6)",
                    color: "var(--color-muted)",
                    maxWidth: "52ch",
                  }}
                >
                  This section is rendered using the Hallmark design tokens you selected.
                  Twenty-one hand-tuned themes — each with its own OKLCH palette, font stacks,
                  and motion system. Swap themes from the picker above and watch this section
                  transform. AXIA's anti-AI-slop design layer, powered by Together AI.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => navigate("/hallmark-themes")}
                  style={{
                    fontFamily: "var(--font-label, var(--font-body))",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    padding: "0.75rem 1.25rem",
                    borderRadius: "2px",
                    background: "var(--color-accent)",
                    color: "var(--color-accent-ink, white)",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  Browse 21 themes →
                </button>
                <div className="flex gap-1.5" aria-hidden>
                  {["var(--color-paper)", "var(--color-paper-2)", "var(--color-paper-3)", "var(--color-rule)", "var(--color-muted)", "var(--color-neutral)", "var(--color-ink-2)", "var(--color-ink)", "var(--color-accent)"].map((c, i) => (
                    <div key={i} style={{ background: c, width: "18px", height: "18px", borderRadius: "2px", border: "1px solid var(--color-rule)" }} />
                  ))}
                </div>
              </div>
            </div>
          </section>
        </HallmarkScope>
      </main>

      <Footer />
    </div>
  );
}