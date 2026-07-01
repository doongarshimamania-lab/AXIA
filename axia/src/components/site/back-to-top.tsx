
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp } from "lucide-react";

export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 800);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 10 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="Back to top"
          className="group fixed bottom-6 right-6 z-40 grid h-11 w-11 place-items-center rounded-full border border-[var(--axia-teal)]/40 bg-white text-[var(--axia-teal-bright)] shadow-[0_4px_20px_-4px_rgba(13,18,24,0.15)] backdrop-blur-md transition-all hover:border-[var(--axia-teal)] hover:bg-[var(--axia-teal-soft)] hover:shadow-[0_0_28px_-6px_rgba(43,122,107,0.3)]"
        >
          <ArrowUp className="h-4.5 w-4.5 transition-transform group-hover:-translate-y-0.5" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
