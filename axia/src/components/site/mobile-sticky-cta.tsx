
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, X } from "lucide-react";
import { Link } from "react-router";

/**
 * MobileStickyCTA, a mobile-only bottom CTA bar that appears after the
 * user scrolls past the hero. Drives conversion on mobile where the primary
 * CTA scrolls out of view. Hidden when the final CTA / footer is visible.
 */
export function MobileStickyCTA() {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      if (dismissed) return;
      const y = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      // Show after scrolling past 1 viewport, hide near the very bottom (footer/final CTA)
      const pastHero = y > window.innerHeight * 0.9;
      const nearBottom = y > max - window.innerHeight * 1.2;
      setVisible(pastHero && !nearBottom);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [dismissed]);

  return (
    <AnimatePresence>
      {visible && !dismissed && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-x-0 bottom-0 z-40 lg:hidden"
          style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        >
          <div className="glass relative mx-3 mb-3 flex items-center gap-3 rounded-2xl border border-border px-4 py-3 shadow-[0_-8px_40px_-12px_rgba(0,0,0,0.7)]">
            <button
              onClick={() => setDismissed(true)}
              aria-label="Dismiss"
              className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full border border-border bg-secondary text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-[0.78rem] font-semibold text-foreground">
                Stop juggling 5 tabs.
              </p>
              <p className="truncate text-[0.7rem] text-muted-foreground">
                30-day free beta · Then from $29/seat
              </p>
            </div>
            {/* ponytail: 'Start free' was href="#cta" (just scrolled up to
                FinalCTA, useless on mobile). Now starts the signup flow. */}
            <Link
              to="/auth?mode=signup"
              className="shine-on-hover group inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-[0.84rem] font-medium text-primary-foreground transition-all hover:bg-[var(--axia-teal-bright)]"
            >
              Start free
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
