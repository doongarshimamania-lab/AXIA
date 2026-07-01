
import { motion } from "framer-motion";
import {
  Megaphone,
  TrendingUp,
  Code2,
  Search,
  Palette,
  Briefcase,
  Camera,
  PenTool,
} from "lucide-react";
import { Reveal } from "./reveal";

// Expanded from brand bible top-5 to 8 agency types, broader ICP coverage.
// Each has the top pain + the Axia hook that kills it.
const AGENCIES = [
  {
    icon: Megaphone,
    name: "Digital Marketing",
    pain: "Too many tools",
    hook: "One Workspace",
    desc: "Campaigns, clients, creatives and billing, all in one tab.",
  },
  {
    icon: TrendingUp,
    name: "Performance / Growth",
    pain: "Proving value",
    hook: "Truth Layer",
    desc: "Show clients exactly what their retainer bought, verified and timestamped.",
  },
  {
    icon: Code2,
    name: "Web Dev / Software",
    pain: "Scope creep",
    hook: "Scope Protection",
    desc: "Axia flags every \"just one more feature\" and writes a change order.",
  },
  {
    icon: Search,
    name: "SEO / SEM",
    pain: "Proving value",
    hook: "Truth Layer",
    desc: "Work logs that build themselves defend every hour of optimization work.",
  },
  {
    icon: Palette,
    name: "Creative / Branding",
    pain: "Scope creep",
    hook: "Scope Protection",
    desc: "Revision rounds tracked automatically. You bill for the extras.",
  },
  {
    icon: Briefcase,
    name: "Consulting / Strategy",
    pain: "Invoice disputes",
    hook: "Validated Billing",
    desc: "Every line item links to proof. Disputes end before they start.",
  },
  {
    icon: Camera,
    name: "Production / Video",
    pain: "Chasing payments",
    hook: "Auto Reminders",
    desc: "Day 3 / 7 / 14 sequence. The system chases, not you.",
  },
  {
    icon: PenTool,
    name: "Content / Copywriting",
    pain: "Manual proposals",
    hook: "Smart Proposals",
    desc: "Auto follow-ups on Day 3 / 7 / 14. 40% higher reply rate.",
  },
];

export function AgencyTypes() {
  return (
    <section id="agencies" className="section-tinted relative scroll-mt-24 py-8 sm:py-12">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <Reveal>
            <span className="eyebrow">Built for agencies</span>
          </Reveal>
          <Reveal delay={0.06}>
            <h2 className="mt-4 text-balance text-3xl font-bold leading-[1.08] tracking-tight text-foreground sm:text-4xl">
              One platform. Every type of agency.
            </h2>
          </Reveal>
          <Reveal delay={0.12}>
            <p className="mt-4 text-pretty leading-relaxed text-muted-foreground">
              Ranked by combined pain score and adoption readiness. These are
              the agencies that recover the most revenue with Axia.
            </p>
          </Reveal>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {AGENCIES.map((a, i) => (
            <Reveal key={a.name} delay={(i % 4) * 0.05}>
              <motion.article
                whileHover={{ y: -3 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="surface surface-hover group relative h-full overflow-hidden p-5"
              >
                <div className="flex items-start justify-between">
                  <span className="grid h-10 w-10 place-items-center rounded-lg border border-border bg-secondary">
                    <a.icon className="h-[18px] w-[18px] text-[var(--axia-teal-bright)]" />
                  </span>
                  <span className="nums text-[0.68rem] text-muted-foreground/60">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>

                <h3 className="mt-4 text-[0.98rem] font-semibold tracking-tight text-foreground">
                  {a.name}
                </h3>
                <p className="mt-2 text-[0.8rem] leading-relaxed text-muted-foreground">
                  {a.desc}
                </p>

                <div className="mt-4 flex items-center gap-2 border-t border-border pt-3">
                  <span className="text-[0.68rem] text-muted-foreground/70">
                    Top pain:
                  </span>
                  <span className="text-[0.72rem] font-medium text-amber-700/90">
                    {a.pain}
                  </span>
                  <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-[var(--axia-teal)]/30 bg-[var(--axia-teal-soft)]/12 px-2 py-0.5 text-[0.64rem] font-medium text-[var(--axia-teal-bright)]">
                    {a.hook}
                  </span>
                </div>
              </motion.article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
