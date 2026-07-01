
import { motion } from "framer-motion";
import {
  MessageSquare,
  FileText,
  LayoutGrid,
  FileEdit,
  FileSignature,
  ArrowRight,
  Check,
  TrendingDown,
} from "lucide-react";
import { Link } from "react-router";
import { Reveal } from "./reveal";
import { Counter } from "./counter";
import { cn } from "@/lib/utils";

const TOOLS = [
  { icon: MessageSquare, name: "Slack", cost: 12, cat: "Comms" },
  { icon: FileText, name: "Notion", cost: 18, cat: "Docs / Wiki" },
  { icon: LayoutGrid, name: "Trello", cost: 10, cat: "Project mgmt" },
  { icon: FileEdit, name: "Google Docs", cost: 12, cat: "Collab docs" },
  { icon: FileSignature, name: "Bonsai", cost: 29, cat: "Proposals / CRM" },
];

const FRAG_TOTAL = TOOLS.reduce((s, t) => s + t.cost, 0);
const SYNC_COST = 6 * 125 * 4.33;
const AXIA_PRICE = 99;

export function CostComparison() {
  const fragMonthly = FRAG_TOTAL + Math.round(SYNC_COST);

  return (
    <section id="cost" className="relative scroll-mt-24 py-6 sm:py-8">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <Reveal>
            <span className="eyebrow">The money you keep</span>
          </Reveal>
          <Reveal delay={0.06}>
            <h2 className="mt-3 text-balance text-[1.6rem] font-bold leading-[1.1] tracking-tight text-foreground sm:text-[2.2rem]">
              Cancel five tools.{" "}
              <span className="text-muted-foreground">Keep the money.</span>
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-2 text-pretty text-[0.86rem] leading-relaxed text-muted-foreground">
              You are not just paying for five subscriptions. You are paying for
              the hours you lose syncing them, the invoices you write off, and
              the scope creep that slips through the cracks. Axia replaces all of
              it for $99 a seat.
            </p>
          </Reveal>
        </div>

        <Reveal delay={0.1}>
          <div className="mt-5 grid items-stretch gap-4 lg:grid-cols-[1fr_auto_1fr]">
            {/* Fragmented stack */}
            <div className="surface p-5">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-red-400/70" />
                  <span className="text-[0.7rem] font-medium uppercase tracking-wide text-muted-foreground">
                    What you run today
                  </span>
                </div>
                <span className="text-[0.7rem] text-muted-foreground">5 tools, 5 tabs</span>
              </div>

              {/* stacked tool rows */}
              <div className="mt-2 space-y-1.5">
                {TOOLS.map((t, i) => (
                  <motion.div
                    key={t.name}
                    initial={{ opacity: 0, x: -6 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.04, duration: 0.3 }}
                    className="flex items-center gap-2.5 rounded-md border border-border bg-secondary/40 px-2.5 py-1.5"
                  >
                    <t.icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[0.78rem] font-medium leading-tight text-foreground">
                        {t.name}
                      </p>
                      <p className="text-[0.62rem] leading-tight text-muted-foreground">
                        {t.cat}
                      </p>
                    </div>
                    <span className="nums text-[0.76rem] text-muted-foreground">
                      ${t.cost}/mo
                    </span>
                  </motion.div>
                ))}
              </div>

              <div className="mt-2.5 space-y-1 border-t border-border pt-2.5">
                <Row label="Subscriptions" value={`$${FRAG_TOTAL}/mo`} />
                <Row label="Sync time, 6 hrs/wk" value={`$${Math.round(SYNC_COST)}/mo`} danger />
                <Row label="Unbilled scope creep" value="$3,800/mo" danger />
              </div>

              <div className="mt-2.5 flex items-end justify-between rounded-lg border border-red-600/30 bg-red-50/60 px-3 py-2">
                <p className="text-[0.66rem] uppercase tracking-wide text-red-600/80">
                  Real monthly cost
                </p>
                <p className="nums text-xl font-bold text-red-600">
                  ${fragMonthly.toLocaleString()}+
                </p>
              </div>
            </div>

            {/* VS divider */}
            <div className="flex items-center justify-center">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="grid h-11 w-11 place-items-center rounded-full border border-border bg-secondary"
              >
                <span className="text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground">
                  vs
                </span>
              </motion.div>
            </div>

            {/* Axia */}
            <div className="relative overflow-hidden rounded-[var(--radius-2xl)] border border-[var(--axia-teal)]/45 bg-gradient-to-b from-[var(--axia-teal-soft)] to-white p-5">
              <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-[radial-gradient(closest-side,rgba(43,122,107,0.18),transparent)]" />
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="text-[0.7rem] font-medium uppercase tracking-wide text-[var(--axia-teal-bright)]">
                    Axia, one tab
                  </span>
                </div>
                <span className="text-[0.7rem] text-muted-foreground">1 tool, 1 tab</span>
              </div>

              {/* stacked feature rows */}
              <div className="mt-2 space-y-1.5">
                {[
                  "Projects + tasks (replaces Trello)",
                  "Verified workstreams (replaces timesheets)",
                  "Validated billing (replaces invoicing)",
                  "Smart proposals (replaces Bonsai)",
                  "Scope creep protection",
                ].map((f, i) => (
                  <motion.div
                    key={f}
                    initial={{ opacity: 0, x: 6 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.04, duration: 0.3 }}
                    className="flex items-center gap-2.5 rounded-md border border-border bg-secondary/40 px-2.5 py-1.5"
                  >
                    <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                    <p className="text-[0.78rem] font-medium leading-tight text-foreground">
                      {f}
                    </p>
                  </motion.div>
                ))}
              </div>

              <div className="mt-2.5 space-y-1 border-t border-border pt-2.5">
                <Row label="All-in-one" value={`$${AXIA_PRICE}/mo`} good />
                <Row label="Sync time" value="$0" good />
                <Row label="Scope creep recovered" value="+$3,800/mo" good />
              </div>

              <div className="mt-2.5 flex items-end justify-between rounded-lg border border-emerald-600/30 bg-emerald-50/80 px-3 py-2">
                <p className="text-[0.66rem] uppercase tracking-wide text-emerald-700/80">
                  Real monthly cost
                </p>
                <p className="nums text-xl font-bold text-emerald-700">
                  ${AXIA_PRICE}
                  <span className="text-[0.7rem] font-medium text-emerald-700/70">/seat</span>
                </p>
              </div>
            </div>
          </div>
        </Reveal>

        {/* savings + CTA in one compact row */}
        <Reveal delay={0.14}>
          <div className="mx-auto mt-4 flex max-w-2xl flex-col items-center justify-between gap-3 rounded-xl border border-[var(--axia-teal)]/30 bg-[var(--axia-teal-soft)]/10 px-5 py-3 sm:flex-row">
            <div className="flex items-center gap-3">
              <div className="nums text-2xl font-bold text-[var(--axia-teal-bright)]">
                <Counter value={fragMonthly - AXIA_PRICE + 3800} prefix="$" suffix="/mo" />
              </div>
              <p className="text-[0.82rem] text-foreground/90">
                <span className="font-medium">recovered</span> when you switch
              </p>
            </div>
            {/* ponytail: 'Consolidate everything' was href="#cta" (just
                scrolled to FinalCTA). Now starts the signup flow. */}
            <Link
              to="/auth?mode=signup"
              className="group inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-[0.88rem] font-medium text-primary-foreground transition-all hover:bg-[var(--axia-teal-bright)]"
            >
              Consolidate everything
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Row({
  label,
  value,
  danger,
  good,
}: {
  label: string;
  value: string;
  danger?: boolean;
  good?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-[0.74rem]">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={cn(
          "nums font-medium",
          danger ? "text-red-600" : good ? "text-emerald-700" : "text-foreground"
        )}
      >
        {value}
      </span>
    </div>
  );
}
