
import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Link } from "react-router";
import { Reveal } from "./reveal";

export function FinalCTA() {
  return (
    <section id="cta" className="relative scroll-mt-24 py-10 sm:py-14">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="relative overflow-hidden rounded-[1.75rem] border border-[var(--axia-teal)]/40 bg-gradient-to-br from-[var(--axia-teal-soft)] to-white px-6 py-14 text-center sm:px-12 sm:py-20">
            {/* glows */}
            <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[radial-gradient(closest-side,rgba(43,122,107,0.32),transparent)]" />
            <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-[radial-gradient(closest-side,rgba(16,185,129,0.22),transparent)]" />
            

            <div className="relative">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="mx-auto inline-flex items-center gap-2 rounded-full border border-[var(--axia-teal)]/40 bg-[var(--axia-teal-soft)]/25 px-3 py-1.5"
              >
                <ShieldCheck className="h-3.5 w-3.5 text-[var(--axia-teal-bright)]" />
                <span className="eyebrow !text-[0.64rem]">
                  Protect the revenue you already earned
                </span>
              </motion.div>

              <h2 className="mx-auto mt-6 max-w-2xl text-balance text-[1.75rem] font-bold leading-[1.1] tracking-tight text-foreground sm:text-[2.5rem]">
                Next Monday, your client asks what you did.
                <br className="hidden sm:block" />{" "}
                <span className="text-[var(--axia-teal)]">You send one link.</span>
              </h2>

              <p className="mx-auto mt-6 max-w-xl text-pretty leading-relaxed text-muted-foreground">
                Start in five minutes. No credit card. Your first project, your
                first verified work log, and your first invoice that defends
                itself. Today.
              </p>

              <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                {/* ponytail: 'Start free' was href="#top" (just scrolled to the
                    top of the page — useless). Now starts the signup flow. */}
                <Link
                  to="/auth?mode=signup"
                  className="group inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-7 py-3.5 text-[0.98rem] font-medium text-primary-foreground transition-all hover:bg-[var(--axia-teal-bright)] hover:shadow-[0_0_40px_-8px_rgba(43,122,107,0.9)]"
                >
                  Start free
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <a
                  href="#pricing"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-secondary/50 px-7 py-3.5 text-[0.98rem] font-medium text-foreground transition-all hover:border-[var(--axia-teal)]/50 hover:bg-secondary"
                >
                  See pricing
                </a>
              </div>

              <p className="mt-6 text-[0.78rem] text-muted-foreground">
                14-day trial · No credit card · Cancel anytime
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
