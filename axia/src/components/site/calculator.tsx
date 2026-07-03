
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Calculator, TrendingUp, Clock, Layers, ArrowRight, AlertTriangle, ClipboardList } from "lucide-react";
import { Link } from "react-router";
import { Reveal } from "./reveal";

// ponytail: Slider track was invisible on the landing page because the inline
// `style` referenced `var(--secondary)`, which is undefined inside the
// `.landing-page` scope (that scope only defines `--color-secondary`, mapped
// from `--lp-secondary`). The result: only the thumb dot was visible — the
// bar itself was transparent. Switched both gradient stops to
// `var(--color-secondary)` so the unfilled portion of the track renders.
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
          background: `linear-gradient(to right, var(--axia-teal) 0%, var(--axia-teal) ${pct}%, var(--color-secondary) ${pct}%, var(--color-secondary) 100%)`,
        }}
      />
    </div>
  );
}

export function RevenueCalculator() {
  // ponytail: replaced the `Monthly revenue` input (the user asked to drop it)
  // with two new drivers the user asked for: `Scope creep` and `Time in admin
  // tasks`. Net result = 4 working sliders:
  //   1. Team size (seats)        — kept
  //   2. Average billable rate    — kept
  //   3. Scope creep / month      — NEW (user-entered $)
  //   4. Time in admin tasks / wk — NEW (user-entered hrs)
  const [seats, setSeats] = useState(12);
  const [rate, setRate] = useState(125);
  const [scopeCreep, setScopeCreep] = useState(4200);       // $ of unbilled scope creep / mo
  const [adminHrs, setAdminHrs] = useState(8);              // hrs/wk each seat spends on admin

  const result = useMemo(() => {
    // scope creep recovered = the full unbilled $ the agency admits to (slider).
    // Axia converts ~85% of that into change orders (industry benchmark).
    const scopeRecovery = Math.round(scopeCreep * 0.85);

    // late payment recovery: derived from team size + billable rate (a proxy
    // for monthly revenue, since the user removed the explicit revenue slider).
    // Approx monthly revenue = seats * rate * 140 billable hrs/mo.
    const impliedRevenue = seats * rate * 140;
    const lateRecovery = Math.round(impliedRevenue * 0.06);

    // tools consolidated: $200 to $400/mo baseline + 6 to 8 hrs/wk * rate * 4.33
    const toolsSaved = 300 + Math.round(7 * rate * 4.33);

    // admin hours recovered / week = adminHrs * seats * 0.6 (Axia automates ~60%)
    // converted to $ using the billable rate, then * 4.33 weeks/mo.
    const adminRecovered = Math.round(adminHrs * seats * 0.6 * rate * 4.33);

    // total hours saved / week across team (verification, chasing, syncing,
    // context switching, plus the admin automation above).
    const hoursSaved = Math.round(seats * 1.4 + 9 + adminHrs * seats * 0.6);

    const monthly = scopeRecovery + lateRecovery + toolsSaved + adminRecovered;
    const annual = monthly * 12;

    return {
      scopeRecovery,
      lateRecovery,
      toolsSaved,
      adminRecovered,
      hoursSaved,
      monthly,
      annual,
    };
  }, [seats, rate, scopeCreep, adminHrs]);

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
                {/* ponytail: replaced `Monthly revenue` slider with `Scope creep / month`
                    per user request. This is the $ of unbilled scope creep the agency
                    admits to losing each month — Axia recovers ~85% of it. */}
                <Slider
                  label="Scope creep / month"
                  value={scopeCreep}
                  min={0}
                  max={20000}
                  step={100}
                  onChange={setScopeCreep}
                  format={(v) => `$${v.toLocaleString("en-US")}`}
                />
                {/* ponytail: NEW 4th slider — Time spent in admin tasks / week per seat.
                    Drives the admin-task recovery row in the result panel. */}
                <Slider
                  label="Time in admin tasks / wk (per seat)"
                  value={adminHrs}
                  min={0}
                  max={20}
                  step={1}
                  onChange={setAdminHrs}
                  suffix=" hrs"
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
                  icon={AlertTriangle}
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
                {/* ponytail: NEW result row — admin-task recovery $, driven by the
                    new 4th slider (`Time in admin tasks / wk`). */}
                <Row
                  icon={ClipboardList}
                  label="Admin time recovered"
                  value={`$${result.adminRecovered.toLocaleString("en-US")}`}
                />
                <Row
                  icon={Clock}
                  label="Hours saved / week"
                  value={`${result.hoursSaved} hrs`}
                  tone="emerald"
                />
              </div>

              {/* ponytail: 'Claim this recovery' was href="#cta" (just
                  scrolled to FinalCTA). Now starts the signup flow. */}
              <Link
                to="/auth?mode=signup"
                className="group mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-[0.95rem] font-medium text-primary-foreground transition-all hover:bg-[var(--axia-teal-bright)] hover:shadow-[0_0_36px_-8px_rgba(43,122,107,0.8)]"
              >
                Claim this recovery
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
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
