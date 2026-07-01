
import { motion } from "framer-motion";
import {
  TrendingDown,
  TrendingUp,
  Clock,
  DollarSign,
  ArrowRight,
  Quote,
} from "lucide-react";
import { Reveal } from "./reveal";
import { Counter } from "./counter";

/**
 * CaseStudy, a human-centric before/after narrative with concrete metrics.
 * Tells the story of one agency's switch to Axia, with month-by-month
 * recovery. Addresses VLM's "human-centric storytelling" gap.
 */

type Metric = {
  icon: typeof TrendingDown;
  before: string;
  after: string;
  label: string;
  good: boolean;
};

const METRICS: Metric[] = [
  {
    icon: DollarSign,
    before: "$4,200",
    after: "$0",
    label: "Unbilled scope creep / mo",
    good: true,
  },
  {
    icon: Clock,
    before: "6 hrs",
    after: "0 hrs",
    label: "Sync time / week",
    good: true,
  },
  {
    icon: TrendingDown,
    before: "23%",
    after: "4%",
    label: "Invoice dispute rate",
    good: true,
  },
  {
    icon: TrendingUp,
    before: "$28K",
    after: "$42K",
    label: "Monthly revenue captured",
    good: true,
  },
];

export function CaseStudy() {
  return (
    <section id="case-study" className="section-tinted relative scroll-mt-24 py-10 sm:py-14">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <Reveal>
            <span className="eyebrow">Case study</span>
          </Reveal>
          <Reveal delay={0.06}>
            <h2 className="mt-4 text-balance text-3xl font-bold leading-[1.08] tracking-tight text-foreground sm:text-4xl">
              Northbeam Studio: from duct-taped to dispute-proof.
            </h2>
          </Reveal>
          <Reveal delay={0.12}>
            <p className="mt-4 text-pretty leading-relaxed text-muted-foreground">
              A 12-person web dev shop in Mumbai. Three months on Axia. Here&apos;s
              what changed.
            </p>
          </Reveal>
        </div>

        {/* before/after metrics grid */}
        <Reveal delay={0.1}>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {METRICS.map((m, i) => (
              <motion.div
                key={m.label}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="surface p-5"
              >
                <div className="flex items-center gap-2">
                  <span className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--axia-teal)]/30 bg-[var(--axia-teal-soft)]/12">
                    <m.icon className="h-4 w-4 text-[var(--axia-teal-bright)]" />
                  </span>
                  <p className="text-[0.72rem] uppercase tracking-wide text-muted-foreground/80">
                    {m.label}
                  </p>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <span className="nums text-lg text-muted-foreground line-through decoration-red-500/50 decoration-1">
                    {m.before}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/60" />
                  <span className="nums text-2xl font-semibold text-emerald-700">
                    {m.after}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </Reveal>

        {/* narrative + quote */}
        <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:gap-8">
          <Reveal delay={0.1}>
            <div className="surface-elevated h-full p-7">
              <div className="flex items-center gap-3 border-b border-border pb-4">
                <span className="grid h-11 w-11 place-items-center rounded-full border border-[var(--axia-teal)]/40 bg-[var(--axia-teal-soft)]/20 text-[0.95rem] font-semibold text-[var(--axia-teal-bright)]">
                  PN
                </span>
                <div>
                  <p className="text-[0.92rem] font-semibold text-foreground">
                    Priya Nair
                  </p>
                  <p className="text-[0.76rem] text-muted-foreground">
                    Founder · Northbeam Studio · 12 seats
                  </p>
                </div>
              </div>

              <Quote className="mt-5 h-6 w-6 text-[var(--axia-teal)]/40" />
              <blockquote className="mt-3 text-pretty text-[1.02rem] italic leading-relaxed text-foreground/90">
                We stopped writing off disputed invoices. When a client
                questions a line item now, we send the verified work log and the
                conversation ends. That alone paid for Axia ten times over.
              </blockquote>

              <div className="mt-6 grid grid-cols-3 gap-3 border-t border-border pt-5">
                <Stat label="Recovered / mo" value={4200} prefix="$" />
                <Stat label="Hrs saved / wk" value={6} />
                <Stat label="Dispute rate" value={4} suffix="%" />
              </div>
            </div>
          </Reveal>

          {/* timeline */}
          <Reveal delay={0.14}>
            <div className="surface h-full p-6">
              <p className="eyebrow !text-[0.66rem]">Recovery timeline</p>
              <h3 className="mt-2 text-[1.05rem] font-semibold text-foreground">
                Month by month
              </h3>
              <ol className="mt-5 space-y-4">
                {[
                  { m: "Month 1", t: "Migrated off Asana + Harvest + QuickBooks", v: "+$1,200" },
                  { m: "Month 2", t: "Scope creep flags live, first change orders", v: "+$3,800" },
                  { m: "Month 3", t: "Dispute rate dropped 83%. Full recovery.", v: "+$5,400" },
                ].map((s, i) => (
                  <motion.li
                    key={s.m}
                    initial={{ opacity: 0, x: 8 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1, duration: 0.5 }}
                    className="relative flex gap-3"
                  >
                    <span className="mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full border border-[var(--axia-teal)]/40 bg-[var(--axia-teal-soft)]/15 text-[0.7rem] font-semibold text-[var(--axia-teal-bright)]">
                      {i + 1}
                    </span>
                    <div className="flex-1">
                      <p className="text-[0.74rem] uppercase tracking-wide text-muted-foreground/80">
                        {s.m}
                      </p>
                      <p className="text-[0.86rem] leading-snug text-foreground/90">
                        {s.t}
                      </p>
                      <p className="nums mt-0.5 text-[0.82rem] font-semibold text-emerald-700">
                        {s.v}
                      </p>
                    </div>
                  </motion.li>
                ))}
              </ol>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  prefix,
  suffix,
}: {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
}) {
  return (
    <div className="text-center">
      <p className="nums text-xl font-semibold text-foreground">
        <Counter value={value} prefix={prefix} suffix={suffix} />
      </p>
      <p className="mt-0.5 text-[0.64rem] uppercase tracking-wide text-muted-foreground/70">
        {label}
      </p>
    </div>
  );
}
