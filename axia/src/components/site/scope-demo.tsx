
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldAlert,
  ShieldCheck,
  MessageSquare,
  Sparkles,
  ArrowRight,
  Check,
  X,
  FileText,
  Clock,
} from "lucide-react";
import { Reveal } from "./reveal";
import { cn } from "@/lib/utils";

type Msg = {
  id: number;
  text: string;
  inScope: boolean;
  impact: string;
};

const SCENARIOS: Msg[] = [
  {
    id: 1,
    text: "Can you swap the hero image for the one I just sent?",
    inScope: true,
    impact: "Minor revision, within scope",
  },
  {
    id: 2,
    text: "Just one more thing, can you add a full blog section with 6 articles?",
    inScope: false,
    impact: "Out of scope, ~8 hrs, est. $1,000",
  },
  {
    id: 3,
    text: "Quick favor: can we get a dark mode toggle across all pages?",
    inScope: false,
    impact: "Out of scope, ~5 hrs, est. $625",
  },
  {
    id: 4,
    text: "The contact form validation isn't working, can you fix it?",
    inScope: true,
    impact: "Bug fix, within scope",
  },
];

export function ScopeDemo() {
  const [activeId, setActiveId] = useState(2);
  const [resolved, setResolved] = useState<Record<number, "approved" | "declined">>({});

  const active = SCENARIOS.find((s) => s.id === activeId)!;
  const activeResolved = resolved[activeId];

  return (
    <section className="relative overflow-hidden py-10 sm:py-14">
      
      <div className="pointer-events-none absolute right-0 top-0 -z-10 h-96 w-96 rounded-full bg-[radial-gradient(closest-side,rgba(245,158,11,0.12),transparent)] blur-2xl" />

      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <Reveal>
            <span className="eyebrow">See it work</span>
          </Reveal>
          <Reveal delay={0.06}>
            <h2 className="mt-4 text-balance text-[1.75rem] font-bold leading-[1.1] tracking-tight text-foreground sm:text-[2.5rem]">
              The scope creep flag, in real time.
            </h2>
          </Reveal>
          <Reveal delay={0.12}>
            <p className="mt-3 text-pretty leading-relaxed text-muted-foreground">
              Pick a client message. Watch Axia compare it against the agreed
              scope and generate a one-click change order with a suggested
              price. The flag becomes the change order becomes the invoice.
            </p>
          </Reveal>
        </div>

        <Reveal delay={0.1}>
          <div className="mt-8 grid gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:gap-8">
            {/* scenario picker */}
            <div
              className="space-y-2"
              role="radiogroup"
              aria-label="Client message scenarios"
            >
              <p className="mb-3 px-1 text-[0.76rem] font-medium uppercase tracking-wide text-muted-foreground">
                Incoming client messages
              </p>
              {SCENARIOS.map((s) => {
                const isActive = s.id === activeId;
                return (
                  <button
                    key={s.id}
                    onClick={() => setActiveId(s.id)}
                    onKeyDown={(e) => {
                      if (e.key === "ArrowDown" || e.key === "ArrowRight") {
                        e.preventDefault();
                        const idx = SCENARIOS.findIndex((x) => x.id === activeId);
                        const next = SCENARIOS[(idx + 1) % SCENARIOS.length];
                        setActiveId(next.id);
                      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
                        e.preventDefault();
                        const idx = SCENARIOS.findIndex((x) => x.id === activeId);
                        const prev = SCENARIOS[(idx - 1 + SCENARIOS.length) % SCENARIOS.length];
                        setActiveId(prev.id);
                      }
                    }}
                    role="radio"
                    aria-checked={isActive}
                    tabIndex={isActive ? 0 : -1}
                    className={cn(
                      "group flex w-full items-start gap-3 rounded-xl border p-3.5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--axia-teal)]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                      isActive
                        ? "border-[var(--axia-teal)]/50 bg-[var(--axia-teal-soft)]/12"
                        : "border-border bg-secondary/30 hover:border-[var(--axia-teal)]/30"
                    )}
                  >
                    <MessageSquare
                      className={cn(
                        "mt-0.5 h-4 w-4 shrink-0",
                        isActive
                          ? "text-[var(--axia-teal-bright)]"
                          : "text-muted-foreground"
                      )}
                    />
                    <span className="text-[0.86rem] leading-snug text-foreground/90">
                      {s.text}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* detection panel */}
            <div className="surface relative overflow-hidden p-5 sm:p-6">
              <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-[radial-gradient(closest-side,rgba(43,122,107,0.16),transparent)]" />

              {/* chat bubble */}
              <div className="flex items-start gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-secondary text-[0.72rem] font-medium text-muted-foreground">
                  CL
                </span>
                <div className="flex-1 rounded-2xl rounded-tl-sm border border-border bg-secondary/50 px-4 py-3">
                  <p className="text-[0.9rem] leading-relaxed text-foreground">
                    {active.text}
                  </p>
                  <p className="mt-1.5 text-[0.68rem] text-muted-foreground">
                    Client, just now
                  </p>
                </div>
              </div>

              {/* Axia analysis */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeId}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  className="mt-5"
                >
                  <div className="flex items-center gap-2 px-1">
                    <Sparkles className="h-3.5 w-3.5 text-[var(--axia-teal-bright)]" />
                    <span className="text-[0.72rem] font-medium uppercase tracking-wide text-muted-foreground">
                      Axia, scope analysis
                    </span>
                  </div>

                  <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 }}
                    className={cn(
                      "mt-3 flex items-start gap-3 rounded-xl border p-4",
                      active.inScope
                        ? "border-emerald-600/30 bg-emerald-50/70"
                        : "border-amber-600/35 bg-amber-50/80"
                    )}
                  >
                    {active.inScope ? (
                      <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                    ) : (
                      <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-[0.92rem] font-semibold text-foreground">
                        {active.inScope
                          ? "Within agreed scope"
                          : "Scope creep detected"}
                      </p>
                      <p className="mt-0.5 text-[0.8rem] text-muted-foreground">
                        {active.impact}
                      </p>

                      {!active.inScope && (
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary/60 px-2.5 py-1.5 text-[0.74rem] text-foreground">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            ~{active.id === 2 ? "8" : "5"} hrs
                          </span>
                          <span className="nums inline-flex items-center gap-1.5 rounded-lg border border-[var(--axia-teal)]/30 bg-[var(--axia-teal-soft)]/15 px-2.5 py-1.5 text-[0.74rem] font-medium text-[var(--axia-teal-bright)]">
                            ${active.id === 2 ? "1,000" : "625"}
                          </span>
                        </div>
                      )}
                    </div>
                  </motion.div>

                  {/* action buttons */}
                  {!active.inScope && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.25 }}
                      className="mt-4"
                    >
                      <AnimatePresence mode="wait">
                        {!activeResolved ? (
                          <motion.div
                            key="actions"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex flex-col gap-2 sm:flex-row"
                          >
                            <button
                              onClick={() =>
                                setResolved((r) => ({ ...r, [activeId]: "approved" }))
                              }
                              className="group inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-[0.86rem] font-medium text-primary-foreground transition-all hover:bg-[var(--axia-teal-bright)]"
                            >
                              <FileText className="h-4 w-4" />
                              Generate change order
                              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                            </button>
                            <button
                              onClick={() =>
                                setResolved((r) => ({ ...r, [activeId]: "declined" }))
                              }
                              className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-secondary/40 px-4 py-3 text-[0.86rem] font-medium text-muted-foreground transition-colors hover:text-foreground"
                            >
                              <X className="h-4 w-4" />
                              Decline
                            </button>
                          </motion.div>
                        ) : (
                          <motion.div
                            key="resolved"
                            initial={{ opacity: 0, scale: 0.96 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className={cn(
                              "flex items-center gap-3 rounded-lg border p-4",
                              activeResolved === "approved"
                                ? "border-emerald-600/30 bg-emerald-50/70"
                                : "border-border bg-secondary/40"
                            )}
                          >
                            {activeResolved === "approved" ? (
                              <>
                                <Check className="h-5 w-5 shrink-0 text-emerald-600" />
                                <div className="flex-1">
                                  <p className="text-[0.86rem] font-medium text-foreground">
                                    Change order #CO-{activeId}042 created
                                  </p>
                                  <p className="text-[0.74rem] text-muted-foreground">
                                    Added to invoice, client notified, $
                                    {active.id === 2 ? "1,000" : "625"} captured
                                  </p>
                                </div>
                              </>
                            ) : (
                              <>
                                <X className="h-5 w-5 shrink-0 text-muted-foreground" />
                                <div className="flex-1">
                                  <p className="text-[0.86rem] font-medium text-foreground">
                                    Logged &amp; declined
                                  </p>
                                  <p className="text-[0.74rem] text-muted-foreground">
                                    Recorded in the Evidence Library for
                                    reference.
                                  </p>
                                </div>
                              </>
                            )}
                            <button
                              onClick={() =>
                                setResolved((r) => {
                                  const next = { ...r };
                                  delete next[activeId];
                                  return next;
                                })
                              }
                              className="text-[0.74rem] font-medium text-[var(--axia-teal-bright)] hover:text-foreground"
                            >
                              Reset
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  )}

                  {active.inScope && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.25 }}
                      className="mt-4 flex items-center gap-3 rounded-lg border border-emerald-600/25 bg-emerald-500/[0.05] p-4"
                    >
                      <Check className="h-5 w-5 shrink-0 text-emerald-600" />
                      <p className="text-[0.84rem] text-foreground/90">
                        Logged to the verified workstream. No change order
                        needed.
                      </p>
                    </motion.div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.12}>
          <p className="mx-auto mt-10 max-w-2xl text-center text-[0.9rem] text-muted-foreground">
            57% of agencies lose $1,000 to $5,000/mo to unbilled scope creep.
            Only 1% successfully charge for out-of-scope work.{" "}
            <span className="font-medium text-foreground">
              Axia closes that gap in three clicks.
            </span>
          </p>
        </Reveal>
      </div>
    </section>
  );
}
