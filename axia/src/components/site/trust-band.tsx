
import { motion } from "framer-motion";
import { ShieldCheck, TrendingUp, Clock, Layers } from "lucide-react";
import { Reveal } from "./reveal";

// Compact trust band, sits right after the hero.
// Combines key metrics + social proof in a single premium strip.
const STATS = [
  { icon: TrendingUp, value: "$3,800", label: "recovered per mo", sub: "scope creep + disputes" },
  { icon: Clock, value: "71%", label: "fewer late pays", sub: "automatic reminders" },
  { icon: Layers, value: "5→1", label: "tools consolidated", sub: "one tab, no switching" },
  { icon: ShieldCheck, value: "82%", label: "fewer disputes", sub: "every bill is backed by proof" },
];

export function TrustBand() {
  return (
    <section className="relative border-y border-border bg-secondary/20">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        {/* top line: trusted by */}
        <div className="flex flex-col items-center gap-2 py-5 text-center sm:flex-row sm:justify-center sm:gap-6">
          <span className="text-[0.7rem] font-medium uppercase tracking-[0.16em] text-muted-foreground/70">
            Agencies use Axia to keep the money they already earned
          </span>
        </div>

        {/* stats strip */}
        <div className="grid grid-cols-2 divide-y divide-border border-t border-border sm:grid-cols-4 sm:divide-y-0 sm:divide-x">
          {STATS.map((s, i) => (
            <Reveal key={s.label} delay={i * 0.05}>
              <div className="group flex items-center gap-3 px-4 py-5 sm:px-6">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-border bg-secondary transition-colors group-hover:border-[var(--axia-teal)]/40">
                  <s.icon className="h-[18px] w-[18px] text-[var(--axia-teal-bright)]" />
                </span>
                <div className="min-w-0">
                  <p className="nums text-2xl font-semibold tracking-tight text-foreground">
                    {s.value}
                  </p>
                  <p className="truncate text-[0.78rem] font-medium text-foreground/90">
                    {s.label}
                  </p>
                  <p className="truncate text-[0.68rem] text-muted-foreground">
                    {s.sub}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
