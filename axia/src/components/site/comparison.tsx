
import { Check, X, Minus, ShieldCheck } from "lucide-react";
import { Reveal } from "./reveal";
import { cn } from "@/lib/utils";

// Capability matrix, derived from brand bible Section 06 (feature coverage across 19 competitors).
// Only Axia covers all 7. Worklane & Agency Handy stop at "all-in-one workspace", no verification.
const ROWS: { cap: string; axia: bool3; worklane: bool3; handy: bool3 }[] = [
  { cap: "All-in-one workspace", axia: "y", worklane: "y", handy: "y" },
  { cap: "Verified work logs (auto-captured)", axia: "y", worklane: "n", handy: "n" },
  { cap: "Scope creep detection (AI)", axia: "y", worklane: "n", handy: "n" },
  { cap: "Validated billing (invoice = proof)", axia: "y", worklane: "n", handy: "n" },
  { cap: "Event-sourced evidence library", axia: "y", worklane: "n", handy: "n" },
  { cap: "Automated payment reminders (Day 3/7/14)", axia: "y", worklane: "p", handy: "p" },
  { cap: "Smart proposal follow-ups", axia: "y", worklane: "p", handy: "n" },
];

type bool3 = "y" | "n" | "p";

function Cell({ v, highlight }: { v: bool3; highlight?: boolean }) {
  if (v === "y")
    return (
      <span
        className={cn(
          "inline-flex h-7 w-7 items-center justify-center rounded-full",
          highlight
            ? "bg-emerald-500/15 text-emerald-600"
            : "bg-emerald-50 text-emerald-600/80"
        )}
      >
        <Check className="h-4 w-4" />
      </span>
    );
  if (v === "p")
    return (
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-amber-500/10 text-amber-600/80">
        <Minus className="h-4 w-4" />
      </span>
    );
  return (
    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-muted-foreground/60">
      <X className="h-4 w-4" />
    </span>
  );
}

export function Comparison() {
  return (
    <section id="compare" className="section-recessed relative scroll-mt-24 py-10 sm:py-14">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <Reveal>
            <span className="eyebrow">The competitive moat</span>
          </Reveal>
          <Reveal delay={0.06}>
            <h2 className="mt-4 text-balance text-[1.75rem] font-bold leading-[1.1] tracking-tight text-foreground sm:text-[2.5rem]">
              All-in-one, with proof.
            </h2>
          </Reveal>
          <Reveal delay={0.12}>
            <p className="mt-3 text-pretty leading-relaxed text-muted-foreground">
              The closest all-in-one tools stop at “workspace.” Neither has
              solved the verification problem, both still rely on you to enter
              accurate time and scope manually. Axia&apos;s wedge is the Truth
              Layer.
            </p>
          </Reveal>
        </div>

        <Reveal delay={0.1}>
          <div className="mt-14">
          {/* Desktop / tablet table */}
          <div className="hidden overflow-hidden rounded-[var(--radius-2xl)] border border-border sm:block">
            {/* header */}
            <div className="grid grid-cols-[1.6fr_1fr_1fr_1fr] gap-2 border-b border-border bg-secondary/40 px-5 py-5 sm:px-7">
              <div className="flex items-end">
                <span className="text-[0.74rem] font-medium uppercase tracking-wide text-muted-foreground">
                  Capability
                </span>
              </div>
              <div className="flex flex-col items-center text-center">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--axia-teal)]/40 bg-[var(--axia-teal-soft)]/20 px-2.5 py-0.5 text-[0.62rem] font-medium uppercase tracking-wide text-[var(--axia-teal-bright)]">
                  <ShieldCheck className="h-3 w-3" /> core
                </span>
                <span className="mt-1.5 text-[0.95rem] font-semibold text-foreground">
                  Axia
                </span>
              </div>
              <div className="flex flex-col items-center text-center">
                <span className="text-[0.62rem] uppercase tracking-wide text-muted-foreground/70">
                  direct
                </span>
                <span className="mt-1.5 text-[0.95rem] font-medium text-muted-foreground">
                  Worklane
                </span>
              </div>
              <div className="flex flex-col items-center text-center">
                <span className="text-[0.62rem] uppercase tracking-wide text-muted-foreground/70">
                  direct
                </span>
                <span className="mt-1.5 text-[0.95rem] font-medium text-muted-foreground">
                  Agency Handy
                </span>
              </div>
            </div>

            {/* rows */}
            <div className="divide-y divide-border">
              {ROWS.map((r, i) => (
                <div
                  key={r.cap}
                  className={cn(
                    "grid grid-cols-[1.6fr_1fr_1fr_1fr] items-center gap-2 px-5 py-4 transition-colors sm:px-7",
                    i % 2 === 0 ? "bg-background" : "bg-secondary/20",
                    "hover:bg-[var(--axia-teal-soft)]/[0.07]"
                  )}
                >
                  <div className="pr-2">
                    <p className="text-[0.9rem] font-medium text-foreground">
                      {r.cap}
                    </p>
                  </div>
                  <div className="flex justify-center">
                    <Cell v={r.axia} highlight />
                  </div>
                  <div className="flex justify-center">
                    <Cell v={r.worklane} />
                  </div>
                  <div className="flex justify-center">
                    <Cell v={r.handy} />
                  </div>
                </div>
              ))}
            </div>

            {/* footer summary */}
            <div className="grid grid-cols-[1.6fr_1fr_1fr_1fr] items-center gap-2 border-t border-border bg-secondary/30 px-5 py-4 sm:px-7">
              <div className="pr-2">
                <p className="text-[0.8rem] font-medium text-muted-foreground">
                  Capabilities covered
                </p>
              </div>
              <div className="flex justify-center">
                <span className="nums inline-flex items-center gap-1 rounded-full border border-emerald-600/30 bg-emerald-50 px-2.5 py-1 text-[0.78rem] font-semibold text-emerald-700">
                  7 / 7
                </span>
              </div>
              <div className="flex justify-center">
                <span className="nums text-[0.82rem] text-muted-foreground">
                  2 / 7
                </span>
              </div>
              <div className="flex justify-center">
                <span className="nums text-[0.82rem] text-muted-foreground">
                  2 / 7
                </span>
              </div>
            </div>
          </div>

          {/* Mobile stacked cards */}
          <div className="space-y-3 sm:hidden">
            {/* Axia card */}
            <div className="rounded-2xl border border-[var(--axia-teal)]/40 bg-[var(--axia-teal-soft)]/12 p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-[0.95rem] font-semibold text-foreground">
                  <ShieldCheck className="h-4 w-4 text-[var(--axia-teal-bright)]" />
                  Axia
                </span>
                <span className="nums rounded-full border border-emerald-600/30 bg-emerald-50 px-2.5 py-0.5 text-[0.74rem] font-semibold text-emerald-700">
                  7 / 7
                </span>
              </div>
              <ul className="space-y-2">
                {ROWS.map((r) => (
                  <li key={r.cap} className="flex items-center gap-2.5">
                    <Cell v={r.axia} highlight />
                    <span className="text-[0.84rem] text-foreground/90">
                      {r.cap}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Competitors card */}
            <div className="rounded-2xl border border-border bg-secondary/30 p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[0.95rem] font-medium text-muted-foreground">
                  Worklane &amp; Agency Handy
                </span>
                <span className="nums text-[0.78rem] text-muted-foreground">
                  2 / 7
                </span>
              </div>
              <ul className="space-y-2">
                {ROWS.map((r) => (
                  <li key={r.cap} className="flex items-center justify-between gap-2.5">
                    <span className="text-[0.84rem] text-muted-foreground">
                      {r.cap}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Cell v={r.worklane} />
                      <Cell v={r.handy} />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          </div>
        </Reveal>
        <Reveal delay={0.12}>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[0.78rem] text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <Cell v="y" /> Included
            </span>
            <span className="inline-flex items-center gap-2">
              <Cell v="p" /> Partial
            </span>
            <span className="inline-flex items-center gap-2">
              <Cell v="n" /> Missing
            </span>
          </div>
        </Reveal>

        <Reveal delay={0.14}>
          <p className="mx-auto mt-8 max-w-2xl text-center text-[0.9rem] leading-relaxed text-muted-foreground">
            Agencies that already adopted an all-in-one tool are actually easier
            to convert, they understand the value of consolidation. They just
            need to see that{" "}
            <span className="font-medium text-foreground">
              consolidation without verification still leaves them exposed.
            </span>
          </p>
        </Reveal>
      </div>
    </section>
  );
}
