
import { motion, useInView } from "framer-motion";
import { useRef } from "react";

/**
 * SectionDivider, a premium, animated hairline that gives visual rhythm
 * between sections. Variants: line, dot, beam.
 */
export function SectionDivider({
  variant = "line",
  className,
}: {
  variant?: "line" | "dot" | "beam";
  className?: string;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });

  if (variant === "dot") {
    return (
      <div ref={ref} className={`flex items-center justify-center py-2 ${className ?? ""}`}>
        <motion.span
          initial={{ scale: 0, opacity: 0 }}
          animate={inView ? { scale: 1, opacity: 1 } : {}}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-center gap-1.5"
        >
          <span className="h-1 w-1 rounded-full bg-[var(--axia-teal)]/50" />
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--axia-teal-bright)]" />
          <span className="h-1 w-1 rounded-full bg-[var(--axia-teal)]/50" />
        </motion.span>
      </div>
    );
  }

  if (variant === "beam") {
    return (
      <div ref={ref} className={`relative h-px w-full ${className ?? ""}`}>
        <motion.div
          initial={{ scaleX: 0, opacity: 0 }}
          animate={inView ? { scaleX: 1, opacity: 1 } : {}}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0 origin-center bg-gradient-to-r from-transparent via-[var(--axia-teal)]/50 to-transparent"
        />
      </div>
    );
  }

  // line
  return (
    <div ref={ref} className={`hairline ${className ?? ""}`}>
      <motion.div
        initial={{ scaleX: 0 }}
        animate={inView ? { scaleX: 1 } : {}}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        className="h-full origin-center bg-gradient-to-r from-transparent via-border to-transparent"
      />
    </div>
  );
}
