import { useAuth } from "@/hooks/use-auth";
import { useNavigate } from "react-router";
import { Switch } from "@/components/ui/switch";
import { Sun, Moon, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useTheme } from "@/components/ThemeProvider";

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
        {/* Dark Mode Toggle */}
        <div data-theme-toggle className="fixed top-24 right-6 z-50 flex items-center gap-2 rounded-full border border-border bg-card/80 backdrop-blur-md px-3 py-2 shadow-sm transition-all duration-300">
          <Sun className={`h-4 w-4 ${theme === "light" ? "text-primary" : "text-muted-foreground"}`} />
          <Switch
            checked={theme === "dark"}
            onCheckedChange={toggleTheme}
            aria-label="Toggle dark mode"
          />
          <Moon className={`h-4 w-4 ${theme === "dark" ? "text-primary" : "text-muted-foreground"}`} />
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
                className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-6"
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
      </main>

      <Footer />
    </div>
  );
}