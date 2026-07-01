
import { motion } from "framer-motion";
import {
  Quote,
  ShieldCheck,
  TrendingUp,
  Clock,
  TrendingDown,
  DollarSign,
  ArrowRight,
} from "lucide-react";
import { Reveal } from "./reveal";
import { Counter } from "./counter";

/**
 * Combined Testimonials + Case Study section.
 * Merges the 3 founder quotes, the Northbeam before/after metrics,
 * and the recovery timeline into one cohesive social-proof section.
 */

const QUOTES = [
  {
    quote:
      "We stopped writing off disputed invoices. When a client questions a line item now, we send the verified work log and the conversation ends. That alone paid for Axia ten times over.",
    name: "Priya Nair",
    role: "Founder, Northbeam Studio",
    type: "Web Dev Shop",
    metric: "$4,200/mo recovered",
  },
  {
    quote:
      "The scope creep flag is the feature I didn't know I needed. The \u201cjust one more thing\u201d requests now come with a price tag attached. My margins are mine again.",
    name: "Marcus Cole",
    role: "Director, Cole & Co. Marketing",
    type: "Digital Marketing",
    metric: "82% less unbilled work",
  },
  {
    quote:
      "I used to spend Sunday nights reconciling Asana, Harvest and QuickBooks. Now I close the laptop at five. One tab. Everything verified. Everything billed.",
    name: "Sarah Lin",
    role: "Owner, Lin Design Co.",
    type: "Creative / Branding",
    metric: "8 hrs/wk back",
  },
];

const BAND_METRICS = [
  { icon: ShieldCheck, value: "82%", label: "less scope creep", sub: "in first quarter" },
  { icon: Clock, value: "71%", label: "fewer late pays", sub: "auto reminders" },
  { icon: TrendingUp, value: "40%", label: "higher reply rate", sub: "smart proposals" },
];

const BEFORE_AFTER = [
  { icon: DollarSign, before: "$4,200", after: "$0", label: "Unbilled scope creep / mo" },
  { icon: Clock, before: "6 hrs", after: "0 hrs", label: "Sync time / week" },
  { icon: TrendingDown, before: "23%", after: "4%", label: "Invoice dispute rate" },
  { icon: TrendingUp, before: "$28K", after: "$42K", label: "Monthly revenue captured" },
];

const TIMELINE = [
  { m: "Month 1", t: "Migrated off Asana, Harvest, QuickBooks", v: "+$1,200" },
  { m: "Month 2", t: "Scope creep flags live, first change orders", v: "+$3,800" },
  { m: "Month 3", t: "Dispute rate dropped 83%. Full recovery.", v: "+$5,400" },
];

export function Testimonials() {
  return (
    <section className="section-recessed relative py-10 sm:py-14">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        {/* metrics band */}
        <Reveal>
          <div className="grid gap-4 rounded-2xl border border-border bg-secondary/30 p-5 sm:grid-cols-3 sm:p-6">
            {BAND_METRICS.map((m) => (
              <div
                key={m.label}
                className="flex items-center gap-3 sm:flex-col sm:items-start sm:gap-1.5"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[var(--axia-teal)]/30 bg-[var(--axia-teal-soft)]/15">
                  <m.icon className="h-5 w-5 text-[var(--axia-teal-bright)]" />
                </span>
                <div>
                  <p className="nums text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                    {m.value}
                  </p>
                  <p className="text-[0.8rem] text-foreground">{m.label}</p>
                  <p className="text-[0.68rem] text-muted-foreground">{m.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </Reveal>

        <div className="mt-10 max-w-2xl">
          <Reveal>
            <span className="eyebrow">In their words</span>
          </Reveal>
          <Reveal delay={0.06}>
            <h2 className="mt-3 text-balance text-[1.75rem] font-bold leading-[1.05] tracking-tight text-foreground sm:text-[2.5rem]">
              Built by people who know your world.
            </h2>
          </Reveal>
        </div>

        {/* quotes grid */}
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {QUOTES.map((t, i) => (
            <Reveal key={t.name} delay={i * 0.08}>
              <figure className="surface surface-hover flex h-full flex-col p-5">
                <Quote className="h-5 w-5 text-[var(--axia-teal)]/50" />
                <blockquote className="mt-3 flex-1 text-pretty text-[0.9rem] leading-relaxed text-foreground/90">
                  {t.quote}
                </blockquote>
                <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                  <figcaption>
                    <p className="text-[0.84rem] font-semibold text-foreground">
                      {t.name}
                    </p>
                    <p className="text-[0.72rem] text-muted-foreground">
                      {t.role}
                    </p>
                  </figcaption>
                  <span className="rounded-full border border-emerald-600/30 bg-emerald-50 px-2.5 py-1 text-[0.64rem] font-medium text-emerald-700">
                    {t.type}
                  </span>
                </div>
                <p className="nums mt-2.5 text-[0.74rem] font-medium text-[var(--axia-teal-bright)]">
                  {t.metric}
                </p>
              </figure>
            </Reveal>
          ))}
        </div>

        {/* case study: Northbeam before/after + timeline */}
        <Reveal delay={0.1}>
          <div className="mt-8 rounded-2xl border border-border bg-secondary/20 p-5 sm:p-6">
            <div className="flex flex-col gap-1">
              <span className="eyebrow !text-[0.64rem]">Case study</span>
              <h3 className="mt-1 text-balance text-xl font-bold leading-tight tracking-tight text-foreground sm:text-2xl">
                Northbeam Studio: from duct-taped to dispute-proof.
              </h3>
              <p className="text-[0.82rem] text-muted-foreground">
                A 12-person web dev shop in Mumbai. Three months on Axia.
              </p>
            </div>

            {/* before/after metrics */}
            <div className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
              {BEFORE_AFTER.map((m, i) => (
                <motion.div
                  key={m.label}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.06, duration: 0.4 }}
                  className="surface p-3.5"
                >
                  <div className="flex items-center gap-2">
                    <span className="grid h-7 w-7 place-items-center rounded-lg border border-[var(--axia-teal)]/30 bg-[var(--axia-teal-soft)]/12">
                      <m.icon className="h-3.5 w-3.5 text-[var(--axia-teal-bright)]" />
                    </span>
                    <p className="text-[0.66rem] uppercase tracking-wide text-muted-foreground/80">
                      {m.label}
                    </p>
                  </div>
                  <div className="mt-2.5 flex items-center gap-1.5">
                    <span className="nums text-[0.82rem] text-muted-foreground line-through decoration-red-500/50 decoration-1">
                      {m.before}
                    </span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground/60" />
                    <span className="nums text-lg font-semibold text-emerald-700">
                      {m.after}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* quote + timeline */}
            <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_0.8fr] lg:gap-5">
              <div className="surface-elevated p-5">
                <div className="flex items-center gap-2.5 border-b border-border pb-3">
                  <span className="grid h-9 w-9 place-items-center rounded-full border border-[var(--axia-teal)]/40 bg-[var(--axia-teal-soft)]/20 text-[0.82rem] font-semibold text-[var(--axia-teal-bright)]">
                    PN
                  </span>
                  <div>
                    <p className="text-[0.86rem] font-semibold text-foreground">
                      Priya Nair
                    </p>
                    <p className="text-[0.7rem] text-muted-foreground">
                      Founder, Northbeam Studio, 12 seats
                    </p>
                  </div>
                </div>
                <Quote className="mt-3 h-5 w-5 text-[var(--axia-teal)]/40" />
                <blockquote className="mt-2 text-pretty text-[0.94rem] italic leading-relaxed text-foreground/90">
                  We stopped writing off disputed invoices. When a client
                  questions a line item now, we send the verified work log and
                  the conversation ends. That alone paid for Axia ten times over.
                </blockquote>
                <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-3">
                  <Stat label="Recovered / mo" value={4200} prefix="$" />
                  <Stat label="Hrs saved / wk" value={6} />
                  <Stat label="Dispute rate" value={4} suffix="%" />
                </div>
              </div>

              <div className="surface p-4">
                <p className="eyebrow !text-[0.62rem]">Recovery timeline</p>
                <ol className="mt-3 space-y-3">
                  {TIMELINE.map((s, i) => (
                    <motion.li
                      key={s.m}
                      initial={{ opacity: 0, x: 6 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.08, duration: 0.4 }}
                      className="relative flex gap-2.5"
                    >
                      <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border border-[var(--axia-teal)]/40 bg-[var(--axia-teal-soft)]/15 text-[0.64rem] font-semibold text-[var(--axia-teal-bright)]">
                        {i + 1}
                      </span>
                      <div className="flex-1">
                        <p className="text-[0.68rem] uppercase tracking-wide text-muted-foreground/80">
                          {s.m}
                        </p>
                        <p className="text-[0.8rem] leading-snug text-foreground/90">
                          {s.t}
                        </p>
                        <p className="nums mt-0.5 text-[0.76rem] font-semibold text-emerald-700">
                          {s.v}
                        </p>
                      </div>
                    </motion.li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </Reveal>
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
      <p className="nums text-lg font-semibold text-foreground">
        <Counter value={value} prefix={prefix} suffix={suffix} />
      </p>
      <p className="mt-0.5 text-[0.6rem] uppercase tracking-wide text-muted-foreground/70">
        {label}
      </p>
    </div>
  );
}
