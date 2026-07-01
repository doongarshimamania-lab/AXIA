
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ArrowRight } from "lucide-react";
import { Link } from "react-router";
import { AxiaLogo } from "./brand";
import { useScrollSpy } from "./use-scroll-spy";
import { cn } from "@/lib/utils";

const LINKS = [
  { label: "Savings", href: "#cost" },
  { label: "Scope Creep", href: "#features" },
  { label: "Live Demo", href: "#truth-demo" },
  { label: "Agencies", href: "#agencies" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

const SPY_IDS = ["cost", "features", "truth-demo", "agencies", "pricing", "faq"];

export function SiteNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const activeId = useScrollSpy(SPY_IDS);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 16);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(y / max, 1) : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      {/* scroll progress rail */}
      <div className="absolute inset-x-0 bottom-0 h-px bg-transparent">
        <div
          className="h-full bg-gradient-to-r from-[var(--axia-teal)] via-[var(--axia-teal-bright)] to-emerald-400 transition-[width] duration-150 ease-out"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
      <div
        className={cn(
          "mx-auto flex h-16 max-w-[1400px] items-center justify-between px-4 transition-all duration-500 sm:px-6 lg:px-8",
          scrolled && "h-14"
        )}
      >
        <div
          className={cn(
            "absolute inset-0 -z-10 transition-all duration-500",
            scrolled
              ? "glass border-b border-border shadow-[0_8px_40px_-12px_rgba(0,0,0,0.6)]"
              : "border-b border-transparent bg-transparent"
          )}
        />
        <a
          href="#top"
          className="group flex items-center"
          aria-label="Axia home"
        >
          <AxiaLogo />
        </a>

        <nav className="hidden items-center gap-0.5 lg:flex">
          {LINKS.map((l) => {
            const id = l.href.slice(1);
            const isActive = activeId === id;
            return (
              <a
                key={l.href}
                href={l.href}
                className={cn(
                  "relative rounded-md px-3.5 py-2 text-[0.92rem] transition-colors hover:bg-secondary/60 hover:text-foreground",
                  isActive ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {l.label}
                {isActive && (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute inset-x-2.5 -bottom-0.5 h-0.5 rounded-full bg-[var(--axia-teal-bright)]"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </a>
            );
          })}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          {/* ponytail: 'Sign in' was href="#login" (broken — no #login section
              exists). Now routes to /auth via React Router <Link> for SPA nav. */}
          <Link
            to="/auth"
            className="text-[0.92rem] text-muted-foreground transition-colors hover:text-foreground"
          >
            Sign in
          </Link>
          {/* ponytail: 'Start free' was href="#cta" (just scrolled to FinalCTA).
              Now starts the signup flow via /auth?mode=signup — Auth.tsx reads
              the mode param and defaults to the signUp step. */}
          <Link
            to="/auth?mode=signup"
            className="group inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-[0.92rem] font-medium text-primary-foreground transition-all hover:bg-[var(--axia-teal-bright)] hover:shadow-[0_0_28px_-6px_rgba(43,122,107,0.7)]"
          >
            Start free
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        <button
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border text-foreground lg:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="glass mx-4 mt-1 rounded-2xl border border-border p-3 lg:hidden"
          >
            <nav className="flex flex-col">
              {LINKS.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-3 text-[0.95rem] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  {l.label}
                </a>
              ))}
              <div className="my-2 h-px bg-border" />
              {/* ponytail: mobile-menu 'Start free' was href="#cta". Now starts
                  signup flow. onClick still closes the mobile menu after nav. */}
              <Link
                to="/auth?mode=signup"
                onClick={() => setOpen(false)}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-3 text-[0.95rem] font-medium text-primary-foreground"
              >
                Start free
                <ArrowRight className="h-4 w-4" />
              </Link>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
