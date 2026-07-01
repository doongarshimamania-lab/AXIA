
import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { Reveal } from "./reveal";

type Stat = {
  prefix?: string;
  value: number;
  suffix?: string;
  decimals?: number;
  label: string;
  sub: string;
};

const STATS: Stat[] = [
  {
    prefix: "$",
    value: 15000,
    label: "lost per month",
    sub: "The average agency loses this to scope creep, disputes and work that just never gets billed.",
  },
  {
    value: 57,
    suffix: "%",
    label: "lose to scope creep",
    sub: "More than half of agencies lose $1,000 to $5,000 every month to unbilled \"quick favors.\"",
  },
  {
    value: 71,
    suffix: "%",
    label: "invoices paid late",
    sub: "At least 1 in 4 invoices sits unpaid. The root cause is missing information, not bad faith.",
  },
  {
    value: 23,
    suffix: " min",
    label: "lost per context switch",
    sub: "Every jump between Slack, Notion, Trello, Docs and Bonsai costs you 23 minutes of deep work. It adds up fast.",
  },
];

export function ProofProblem() {
  return (
    <section className="relative py-8 sm:py-12">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
          {/* narrative */}
          <div className="lg:sticky lg:top-28 lg:self-start">
            <Reveal>
              <span className="eyebrow">The feeling you know</span>
            </Reveal>
            <Reveal delay={0.06}>
              <h2 className="mt-4 text-balance text-3xl font-bold leading-[1.05] tracking-tight text-foreground sm:text-4xl">
                You did the work. The client still{" "}
                <span className="text-[var(--axia-teal-bright)]">pushed back.</span>
              </h2>
            </Reveal>
            <Reveal delay={0.12}>
              <p className="mt-4 text-pretty leading-relaxed text-muted-foreground">
                You know the moment. An invoice lands. The client replies with
                questions. You open three apps, rebuild the timeline from memory,
                and eventually write off half the amount just to keep the peace.
                The work happened. The proof did not survive the handoff between
                tools.
              </p>
            </Reveal>
            <Reveal delay={0.18}>
              <p className="mt-3 text-pretty leading-relaxed text-muted-foreground">
                Imagine instead: the client questions a line item. You click it.
                They see every hour, every task, every file, timestamped and
                undeniable. The conversation ends. You did not defend anything.
                The proof spoke for itself.
              </p>
            </Reveal>
            <Reveal delay={0.24}>
              <blockquote className="mt-8 border-l-2 border-[var(--axia-teal)] pl-5">
                <p className="text-pretty text-[1.05rem] italic leading-relaxed text-foreground/90">
                  &ldquo;I know we did the work. I just can&apos;t prove it fast
                  enough when the client asks.&rdquo;
                </p>
                <footer className="mt-3 text-[0.8rem] text-muted-foreground">
                  We heard this from agency owners so often it became the whole
                  product.
                </footer>
              </blockquote>
            </Reveal>
          </div>

          {/* stats grid */}
          <div className="grid gap-3 sm:grid-cols-2">
            {STATS.map((s, i) => (
              <Reveal key={s.label} delay={i * 0.08}>
                <div className="surface surface-hover h-full p-6">
                  <div className="nums text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
                    <Counter {...s} />
                  </div>
                  <p className="mt-3 text-[0.95rem] font-medium text-foreground">
                    {s.label}
                  </p>
                  <p className="mt-1.5 text-[0.82rem] leading-relaxed text-muted-foreground">
                    {s.sub}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Counter({
  value,
  prefix,
  suffix,
  decimals = 0,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let raf = 0;
    const start = performance.now();
    const dur = 1500;
    const tick = (now: number) => {
      const p = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(value * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value]);

  const formatted =
    decimals > 0
      ? display.toFixed(decimals)
      : Math.round(display).toLocaleString("en-US");

  return (
    <span ref={ref}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
