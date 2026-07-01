
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Calculator, TrendingUp, Clock, Layers, ArrowRight } from "lucide-react";
import { Reveal } from "./reveal";

function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  format,
  suffix,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
  suffix?: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label className="text-[0.85rem] font-medium text-foreground">
          {label}
        </label>
        <span className="nums text-[0.95rem] font-semibold text-[var(--axia-teal-bright)]">
          {format ? format(value) : value.toLocaleString("en-US")}
          {suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-3 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-secondary outline-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--axia-teal-bright)] [&::-webkit-slider-thumb]:shadow-[0_0_0_4px_rgba(43,122,107,0.18)] [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-[var(--axia-teal-bright)]"
        style={{
          background: `linear-gradient(to right, var(--axia-teal) 0%, var(--axia-teal) ${pct}%, var(--secondary) ${pct}%, var(--secondary) 100%)`,
        }}
      />
    </div>
  );
}

export function RevenueCalculator() {
  const [seats, setSeats] = useState(12);
  const [rate, setRate] = useState(125);
  const [revenue, setRevenue] = useState(75000);

  const result = useMemo(() => {
    // scope creep recovery: ~$3,800/mo baseline at typical agency, scales w/ seats & revenue
    const scopeRecovery = Math.round(
      3800 * (seats / 10) * (0.6 + (revenue / 100000) * 0.5)
    );
    // late payment recovery: 71% fewer late pays on invoices that used to sit unpaid
    const lateRecovery = Math.round(revenue * 0.06);
    // tools consolidated: $200 to $400/mo + 6 to 8 hrs/wk * rate * 4.33
    const toolsSaved = 300 + Math.round(7 * rate * 4.33);
    // hours saved/wk across team (verification, chasing, syncing, context switching)
    const hoursSaved = Math.round(seats * 1.4 + 9);

    const monthly = scopeRecovery + lateRecovery + toolsSaved;
    const annual = monthly * 12;

    return { scopeRecovery, lateRecovery, toolsSaved, hoursSaved, monthly, annual };
  }, [seats, rate, revenue]);

  return (
    <section id="calculator" className="relative scroll-mt-24 py-10 sm:py-14">
      <div className="absolute inset-0 -z-10 bg-teal-glow opacity-70" />
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <Reveal>
            <span className="eyebrow">The math</span>
          </Reveal>
          <Reveal delay={0.06}>
            <h2 className="mt-4 text-balance text-[1.75rem] font-bold leading-[1.1] tracking-tight text-foreground sm:text-[2.5rem]">
              How much revenue are you losing right now?
            </h2>
          </Reveal>
          <Reveal delay={0.12}>
            <p className="mt-3 text-pretty leading-relaxed text-muted-foreground">
              Protection, not productivity. Drag the sliders to see what Axia
              recovers (not earns) for an agency shaped like yours.
            </p>
          </Reveal>
        </div>

        <Reveal delay={0.1}>
          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1fr]">
            {/* inputs */}
            <div className="surface p-5 sm:p-6">
              <div className="flex items-center gap-2.5">
                <Calculator className="h-4 w-4 text-[var(--axia-teal-bright)]" />
                <span className="text-[0.8rem] font-medium uppercase tracking-wide text-muted-foreground">
                  Your agency
                </span>
              </div>
              <div className="mt-7 space-y-7">
                <Slider
                  label="Team size (seats)"
                  value={seats}
                  min={1}
                  max={50}
                  onChange={setSeats}
                  suffix=" seats"
                />
                <Slider
                  label="Average billable rate"
                  value={rate}
                  min={50}
                  max={300}
                  step={5}
                  onChange={setRate}
                  format={(v) => `$${v}`}
                  suffix="/hr"
                />
                <Slider
                  label="Monthly revenue"
                  value={revenue}
                  min={10000}
                  max={500000}
                  step={5000}
                  onChange={setRevenue}
                  format={(v) => `$${v.toLocaleString("en-US")}`}
                />
              </div>
            </div>

            {/* result */}
            <div className="relative overflow-hidden rounded-[var(--radius-2xl)] border border-[var(--axia-teal)]/40 bg-gradient-to-br from-[var(--axia-teal-soft)] to-white p-5 sm:p-6">
              <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-[radial-gradient(closest-side,rgba(43,122,107,0.3),transparent)]" />
              <div className="flex items-center gap-2.5">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
                <span className="text-[0.8rem] font-medium uppercase tracking-wide text-emerald-700">
                  Recovered with Axia
                </span>
              </div>

              <motion.div
                key={result.monthly}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="mt-6"
              >
                <p className="text-[0.8rem] text-muted-foreground">per month</p>
                <p className="nums mt-1 text-5xl font-semibold tracking-tight text-foreground sm:text-6xl">
                  ${result.monthly.toLocaleString("en-US")}
                </p>
                <p className="nums mt-2 text-[1.05rem] text-[var(--axia-teal-bright)]">
                  ≈ ${result.annual.toLocaleString("en-US")} / year
                </p>
              </motion.div>

              <div className="mt-4 space-y-2">
                <Row
                  icon={Layers}
                  label="Scope creep recovered"
                  value={`$${result.scopeRecovery.toLocaleString("en-US")}`}
                />
                <Row
                  icon={Clock}
                  label="Late payments eliminated"
                  value={`$${result.lateRecovery.toLocaleString("en-US")}`}
                />
                <Row
                  icon={Layers}
                  label="Tools consolidated"
                  value={`$${result.toolsSaved.toLocaleString("en-US")}`}
                />
                <Row
                  icon={Clock}
                  label="Hours saved / week"
                  value={`${result.hoursSaved} hrs`}
                  tone="emerald"
                />
              </div>

              <a
                href="#cta"
                className="group mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-[0.95rem] font-medium text-primary-foreground transition-all hover:bg-[var(--axia-teal-bright)] hover:shadow-[0_0_36px_-8px_rgba(43,122,107,0.8)]"
              >
                Claim this recovery
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </a>
              <p className="mt-3 text-center text-[0.72rem] text-muted-foreground">
                Estimates based on Axia's documented agency benchmarks. Your
                numbers may vary.
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Row({
  icon: Icon,
  label,
  value,
  tone = "teal",
}: {
  icon: typeof Layers;
  label: string;
  value: string;
  tone?: "teal" | "emerald";
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/40 px-3.5 py-2.5">
      <span className="flex items-center gap-2.5 text-[0.85rem] text-muted-foreground">
        <Icon
          className={`h-4 w-4 ${tone === "emerald" ? "text-emerald-600" : "text-[var(--axia-teal-bright)]"}`}
        />
        {label}
      </span>
      <span className="nums text-[0.9rem] font-semibold text-foreground">
        {value}
      </span>
    </div>
  );
}
