
import { motion } from "framer-motion";
import {
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  GitCommit,
  FileEdit,
  MessageSquare,
  Clock,
  Sparkles,
} from "lucide-react";
import { Reveal } from "./reveal";

export function Hero() {
  return (
    <section id="top" className="relative overflow-hidden pt-24 pb-16 sm:pt-28 sm:pb-20">
      {/* clean background, single restrained glow, no busy grids */}
      <div className="absolute inset-0 -z-10 bg-teal-glow" />

      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        {/* ponytail: grid-cols-1 on mobile sets grid-template-columns: minmax(0, 1fr)
            which lets the column shrink below its content's intrinsic width.
            Without this, the implicit single-column grid uses auto sizing
            (max-content), letting the tool-tabs row push the grid cell to 429px
            and clip past the 320-375px viewport. lg:grid-cols-[...] takes over
            at the lg breakpoint. */}
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
          {/* copy */}
          {/* ponytail: min-w-0 fixes mobile horizontal overflow caused by the
              tool-tabs row (Slack/Notion/Trello/Docs/Bonsai + Axia pill).
              Without min-w-0, the grid cell uses default min-width: auto and
              grows to fit the unwrapped tabs row (429px), overflowing the
              320-375px viewport and getting clipped by the section's
              overflow-hidden. min-w-0 lets flex-wrap inside actually wrap. */}
          <div className="min-w-0">
            <Reveal>
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-3 py-1.5 shadow-sm">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 live-dot" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </span>
                <span className="eyebrow !text-[0.66rem] !text-emerald-700">
                  One tab. Not five.
                </span>
              </div>
            </Reveal>

            <Reveal delay={0.06}>
              <h1 className="mt-5 text-balance text-[2.1rem] font-black leading-[1.05] tracking-display text-foreground sm:text-6xl lg:text-[4.4rem]">
                Your agency.
                <br />{" "}
                <span className="text-[var(--axia-teal)]">One tab.</span>
              </h1>
            </Reveal>

            <Reveal delay={0.12}>
              <p className="mt-5 max-w-xl text-pretty text-[0.98rem] leading-relaxed text-muted-foreground sm:text-[1.08rem]">
                No more defending invoices by hand. No more chasing payments.
                No more Sunday nights reconciling five tools. Axia proves your
                work the moment it happens, so{" "}
                <span className="text-foreground font-semibold">
                  clients pay without arguing
                </span>{" "}
                and you close your laptop at 5.
              </p>
            </Reveal>

            <Reveal delay={0.16}>
              {/* tool tabs to Axia visual metaphor */}
              {/* ponytail: max-w-full + flex-wrap ensures the tabs wrap to a
                  second line on narrow screens instead of overflowing. */}
              <div className="mt-6 flex max-w-full flex-wrap items-center gap-1.5">
                {[
                  { name: "Slack", color: "#E01E5A" },
                  { name: "Notion", color: "#0d1218" },
                  { name: "Trello", color: "#0079BF" },
                  { name: "Docs", color: "#4285F4" },
                  { name: "Bonsai", color: "#00b8a9" },
                ].map((t) => (
                  <span
                    key={t.name}
                    className="group/tab relative inline-flex items-center gap-1.5 rounded-t-md border border-b-0 border-border bg-white px-2.5 pt-1 pb-1.5 text-[0.72rem] text-muted-foreground shadow-sm"
                    style={{ marginBottom: "2px" }}
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full opacity-70"
                      style={{ backgroundColor: t.color }}
                    />
                    <span className="line-through decoration-red-500/60 decoration-1">
                      {t.name}
                    </span>
                  </span>
                ))}
                <motion.span
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.8, duration: 0.4 }}
                  className="mx-1 text-muted-foreground/50"
                >
                  to
                </motion.span>
                <span className="inline-flex items-center gap-1.5 rounded-md border border-[var(--axia-teal)]/40 bg-[var(--axia-teal-soft)] px-2.5 py-1.5 text-[0.74rem] font-semibold text-[var(--axia-teal-bright)] verified-glow">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Axia
                </span>
              </div>
            </Reveal>

            <Reveal delay={0.18}>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                <a
                  href="#cost"
                  className="shine-on-hover group inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-[0.98rem] font-semibold text-primary-foreground transition-all hover:bg-[var(--axia-teal-bright)] hover:shadow-[0_8px_30px_-8px_rgba(43,122,107,0.5)]"
                >
                  See how much you save
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </a>
                <a
                  href="#truth-layer"
                  className="group inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-secondary/40 px-6 py-3.5 text-[0.98rem] font-medium text-foreground transition-all hover:border-[var(--axia-teal)] hover:bg-secondary"
                >
                  <Sparkles className="h-4 w-4 text-[var(--axia-teal-bright)]" />
                  How it works
                </a>
              </div>
            </Reveal>

            <Reveal delay={0.24}>
              <div className="mt-6 flex flex-wrap items-center gap-x-7 gap-y-3 text-[0.82rem] text-muted-foreground">
                <span className="inline-flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  No credit card
                </span>
                <span className="inline-flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  30-day free beta
                </span>
                <span className="inline-flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Setup in 5 minutes
                </span>
              </div>
            </Reveal>
          </div>

          {/* Truth Layer live visual */}
          <Reveal delay={0.2} className="will-reveal">
            <HeroTruthVisual />
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function HeroTruthVisual() {
  const events = [
    {
      icon: GitCommit,
      who: "Marcus",
      what: "commit · fix nav edge case",
      t: "14:32",
    },
    {
      icon: FileEdit,
      who: "Sarah",
      what: "saved · design-v3.fig",
      t: "14:47",
    },
    {
      icon: MessageSquare,
      who: "Client",
      what: "“just one more section”",
      t: "15:12",
      alert: true,
    },
    {
      icon: Clock,
      who: "Axia",
      what: "scope flag · change order",
      t: "15:12",
      verified: true,
    },
  ];

  return (
    <div className="relative">
      {/* glow */}
      <div className="pointer-events-none absolute -inset-6 -z-10 rounded-[2rem] bg-[radial-gradient(closest-side,rgba(43,122,107,0.22),transparent)] blur-xl" />

      <div className="glass relative overflow-hidden rounded-2xl p-1.5 shadow-[0_20px_60px_-20px_rgba(13,18,24,0.15)]">
        {/* window chrome */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ef4444]/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#f59e0b]/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#10b981]/70" />
          </div>
          <div className="flex items-center gap-2 rounded-md border border-border bg-secondary/60 px-2.5 py-1 text-[0.68rem] text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 live-dot" />
            acme-corp · live
          </div>
          <ShieldCheck className="h-4 w-4 text-[var(--axia-teal-bright)]" />
        </div>

        <div className="rounded-xl border border-border bg-secondary p-4">
          {/* truth layer banner */}
          <div className="mb-4 flex items-center justify-between rounded-lg border border-[var(--axia-teal)]/30 bg-[var(--axia-teal-soft)]/15 px-3 py-2.5">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="h-4 w-4 text-[var(--axia-teal-bright)]" />
              <span className="text-[0.8rem] font-medium text-foreground">
                Truth Layer, verifying
              </span>
            </div>
            <span className="nums text-[0.72rem] text-muted-foreground">
              4 events · 0 manual
            </span>
          </div>

          {/* event stream */}
          <ul className="relative space-y-2">
            {/* beam sweep */}
            <span className="beam pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-transparent via-[var(--axia-teal-bright)]/12 to-transparent" />
            {events.map((e, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.5, duration: 0.5 }}
                className="flex items-center gap-3 rounded-lg border border-border bg-secondary/40 px-3 py-2.5"
              >
                <span
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-md ${
                    e.verified
                      ? "bg-emerald-500/15 text-emerald-700"
                      : e.alert
                        ? "bg-amber-500/15 text-amber-700"
                        : "bg-secondary text-muted-foreground"
                  }`}
                >
                  <e.icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[0.82rem] text-foreground">
                    <span className="font-medium">{e.who}</span>{" "}
                    <span className="text-muted-foreground">{e.what}</span>
                  </p>
                </div>
                <span className="nums text-[0.7rem] text-muted-foreground">
                  {e.t}
                </span>
                {e.verified && (
                  <span className="verified-glow inline-flex items-center gap-1 rounded-full border border-emerald-600/40 bg-emerald-50 px-2 py-0.5 text-[0.62rem] font-medium text-emerald-700">
                    <CheckCircle2 className="h-3 w-3" /> verified
                  </span>
                )}
              </motion.li>
            ))}
          </ul>

          {/* invoice proof link */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2.6, duration: 0.6 }}
            className="mt-4 flex items-center justify-between rounded-lg border border-emerald-600/30 bg-emerald-50/60 px-3 py-3"
          >
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <div>
                <p className="text-[0.8rem] font-medium text-foreground">
                  Invoice #1042, UX work: 32 hrs
                </p>
                <p className="text-[0.7rem] text-muted-foreground">
                  links to verified work log · dispute-proof
                </p>
              </div>
            </div>
            <span className="nums text-[0.8rem] font-medium text-emerald-700">
              $4,000
            </span>
          </motion.div>
        </div>
      </div>

      {/* floating recovered badge */}
      {/* ponytail: on mobile the absolute -right-3 + -bottom-5 cut off the
          badge past the parent's right edge. Switch to static positioning on
          mobile (block, full width, below the card) and absolute on sm+. */}
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 3, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="glass mt-4 flex items-center justify-center gap-3 rounded-xl px-4 py-3 shadow-xl sm:absolute sm:-bottom-5 sm:-right-6 sm:mt-0 sm:justify-start"
      >
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-500/15">
          <ShieldCheck className="h-5 w-5 text-emerald-600" />
        </div>
        <div>
          <p className="nums text-lg font-semibold text-foreground">+$3,800</p>
          <p className="text-[0.68rem] text-muted-foreground">recovered / mo</p>
        </div>
      </motion.div>
    </div>
  );
}
