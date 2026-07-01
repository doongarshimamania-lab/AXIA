
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldAlert,
  Layers,
  GitCommit,
  FileEdit,
  MessageSquare,
  Banknote,
  FileText,
  Mail,
  CheckCircle2,
  TrendingUp,
  ArrowDown,
  DollarSign,
} from "lucide-react";
import { Reveal } from "./reveal";
import { cn } from "@/lib/utils";

type LayerKey = "work" | "scope" | "output";

const LAYERS: {
  key: LayerKey;
  index: string;
  title: string;
  tag: string;
  icon: typeof Layers;
  accent: string;
  desc: string;
  items: { icon: typeof Layers; label: string; sub: string }[];
}[] = [
  {
    key: "work",
    index: "01",
    title: "Work Execution",
    tag: "Where the work happens",
    icon: Layers,
    accent: "#94a3b8",
    desc: "Projects, tasks, files, and client messages all live here. Time is captured for you, never entered by hand. Nothing slips past Scope Creep Protection.",
    items: [
      { icon: GitCommit, label: "Task status changes", sub: "captured for you" },
      { icon: FileEdit, label: "File edits & commits", sub: "GitHub, Figma, Docs" },
      { icon: MessageSquare, label: "Client messages", sub: "in-workspace portal" },
    ],
  },
  {
    key: "scope",
    index: "02",
    title: "Scope Creep Protection",
    tag: "The differentiator",
    icon: ShieldAlert,
    accent: "#2b7a6b",
    desc: "Every incoming client request is read against the agreed scope. When a client asks for something outside it, Axia flags it instantly and writes a priced change order. The money you used to give away stays in your account.",
    items: [
      { icon: ShieldAlert, label: "Real-time scope detection", sub: "flags out-of-scope asks" },
      { icon: DollarSign, label: "Priced change orders", sub: "one click, suggested price" },
      { icon: TrendingUp, label: "Margin recovery", sub: "$1K to $5K/mo back" },
      { icon: CheckCircle2, label: "Auto-invoice link", sub: "change order feeds the invoice" },
    ],
  },
  {
    key: "output",
    index: "03",
    title: "Output",
    tag: "Client-facing, revenue-capturing",
    icon: Banknote,
    accent: "#10b981",
    desc: "Everything your client sees comes straight from the verified work. Dispute-proof invoices, smart proposals, automatic reminders, a real-time portal. All generated, never typed in by hand.",
    items: [
      { icon: CheckCircle2, label: "Dispute-proof invoices", sub: "every line links to proof" },
      { icon: FileText, label: "Smart Proposals", sub: "Day 3 / 7 / 14 follow-ups" },
      { icon: Mail, label: "Payment reminders", sub: "automatic, professional, consistent" },
    ],
  },
];

export function TruthLayer() {
  const [active, setActive] = useState<LayerKey>("scope");
  const activeLayer = LAYERS.find((l) => l.key === active)!;

  return (
    <section id="truth-layer" className="relative scroll-mt-24 py-10 sm:py-14">
      {/* subtle top transition */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--axia-teal)]/40 to-transparent" />


      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <Reveal>
            <span className="eyebrow">The differentiator</span>
          </Reveal>
          <Reveal delay={0.06}>
            <h2 className="mt-4 text-balance text-[1.75rem] font-bold leading-[1.1] tracking-tight text-foreground sm:text-[2.5rem]">
              When a client says{" "}
              <span className="text-muted-foreground">&ldquo;just one more thing,&rdquo;</span>
              <br className="hidden sm:block" />{" "}
              <span className="text-[var(--axia-teal-bright)]">you hear money.</span>
            </h2>
          </Reveal>
          <Reveal delay={0.12}>
            <p className="mt-4 text-pretty leading-relaxed text-muted-foreground">
              Scope Creep Protection reads every client request against the
              agreed scope, catches the out-of-scope asks the moment they
              arrive, and turns them into priced change orders. No more
              swallowing work to keep the relationship. No more margin lost to
              &ldquo;quick favors.&rdquo;
            </p>
          </Reveal>
        </div>

        {/* interactive diagram */}
        <Reveal delay={0.1}>
          <div className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-8">
            {/* layer stack */}
            <div className="space-y-3">
              {LAYERS.map((l, i) => {
                const isActive = l.key === active;
                return (
                  <div key={l.key}>
                    <button
                      onClick={() => setActive(l.key)}
                      className={cn(
                        "group relative w-full overflow-hidden rounded-2xl border p-5 text-left transition-all duration-300",
                        isActive
                          ? "border-[var(--axia-teal)]/60 bg-[var(--axia-teal-soft)]/12 shadow-[0_0_40px_-12px_rgba(43,122,107,0.5)]"
                          : "border-border bg-secondary/30 hover:border-[var(--axia-teal)]/30"
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <span
                          className="nums text-[0.7rem] font-medium"
                          style={{ color: l.accent }}
                        >
                          {l.index}
                        </span>
                        <span
                          className={cn(
                            "grid h-11 w-11 shrink-0 place-items-center rounded-xl border transition-colors",
                            isActive
                              ? "border-[var(--axia-teal)]/40 bg-[var(--axia-teal-soft)]/20"
                              : "border-border bg-secondary"
                          )}
                        >
                          <l.icon
                            className="h-5 w-5"
                            style={{ color: l.accent }}
                          />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-[1.05rem] font-semibold text-foreground">
                              {l.title}
                            </h3>
                            {l.key === "scope" && (
                              <span className="rounded-full border border-[var(--axia-teal)]/40 bg-[var(--axia-teal-soft)]/20 px-2 py-0.5 text-[0.6rem] font-medium uppercase tracking-wide text-[var(--axia-teal-bright)]">
                                core
                              </span>
                            )}
                          </div>
                          <p className="text-[0.8rem] text-muted-foreground">
                            {l.tag}
                          </p>
                        </div>
                      </div>
                      {/* flow indicator */}
                      {i < LAYERS.length - 1 && (
                        <div className="pointer-events-none absolute -bottom-3 left-12 z-10">
                          <motion.span
                            animate={{ y: [0, 4, 0], opacity: [0.4, 1, 0.4] }}
                            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                            className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background"
                          >
                            <ArrowDown className="h-3 w-3 text-[var(--axia-teal-bright)]" />
                          </motion.span>
                        </div>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* detail panel */}
            <div className="relative">
              <div className="surface relative h-full overflow-hidden p-7">
                <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[radial-gradient(closest-side,rgba(43,122,107,0.18),transparent)]" />
                <AnimatePresence mode="wait">
                  <motion.div
                    key={active}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="grid h-12 w-12 place-items-center rounded-xl border"
                        style={{
                          borderColor: `${activeLayer.accent}55`,
                          background: `${activeLayer.accent}1a`,
                        }}
                      >
                        <activeLayer.icon
                          className="h-6 w-6"
                          style={{ color: activeLayer.accent }}
                        />
                      </span>
                      <div>
                        <p className="eyebrow !text-[0.64rem]">
                          Layer {activeLayer.index}
                        </p>
                        <h3 className="text-xl font-semibold text-foreground">
                          {activeLayer.title}
                        </h3>
                      </div>
                    </div>
                    <p className="mt-3 text-pretty leading-relaxed text-muted-foreground">
                      {activeLayer.desc}
                    </p>

                    <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
                      {activeLayer.items.map((it) => (
                        <div
                          key={it.label}
                          className="flex items-start gap-3 rounded-lg border border-border bg-secondary/40 p-3"
                        >
                          <it.icon className="mt-0.5 h-4 w-4 shrink-0 text-[var(--axia-teal-bright)]" />
                          <div className="min-w-0">
                            <p className="text-[0.85rem] font-medium text-foreground">
                              {it.label}
                            </p>
                            <p className="text-[0.72rem] text-muted-foreground">
                              {it.sub}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {active === "scope" && (
                      <div className="mt-6 flex items-start gap-3 rounded-lg border border-[var(--axia-teal)]/30 bg-[var(--axia-teal-soft)]/10 p-4">
                        <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-[var(--axia-teal-bright)]" />
                        <p className="text-[0.82rem] leading-relaxed text-foreground/90">
                          <span className="font-medium">$3,800 recovered, on average.</span>{" "}
                          Agencies using Scope Creep Protection stop losing
                          money to &ldquo;quick favors.&rdquo; The flag becomes
                          the change order becomes the invoice, in three clicks.
                        </p>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </Reveal>

        {/* proof line */}
        <Reveal delay={0.1}>
          <div className="mx-auto mt-6 flex max-w-3xl items-center justify-center gap-3 text-center">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
            <p className="text-pretty text-[0.95rem] text-muted-foreground">
              The scope flag is not a notification.{" "}
              <span className="font-medium text-foreground">
                It is a priced change order, ready to send.
              </span>
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
