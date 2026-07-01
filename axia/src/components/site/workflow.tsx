
import { motion } from "framer-motion";
import {
  FolderPlus,
  Activity,
  ShieldAlert,
  FileText,
  Receipt,
  Mail,
  CreditCard,
  TrendingUp,
  Check,
} from "lucide-react";
import { Reveal } from "./reveal";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    icon: FolderPlus,
    title: "Create project with scope and milestones",
    effort: "5 min setup",
    auto: false,
  },
  {
    icon: Activity,
    title: "Team works; Axia captures activity for you",
    effort: "Zero",
    auto: true,
  },
  {
    icon: ShieldAlert,
    title: "Client sends “quick favor”; Axia flags scope creep",
    effort: "1 click, approve change order",
    auto: false,
  },
  {
    icon: FileText,
    title: "Axia writes the change order with a suggested price",
    effort: "Zero",
    auto: true,
  },
  {
    icon: Receipt,
    title: "Project completes; invoice generated from verified logs",
    effort: "Zero",
    auto: true,
  },
  {
    icon: Receipt,
    title: "Client receives invoice; each line links to proof",
    effort: "Zero",
    auto: true,
  },
  {
    icon: Mail,
    title: "Unpaid by Day 3? Axia sends the reminder for you",
    effort: "Zero",
    auto: true,
  },
  {
    icon: CreditCard,
    title: "Client pays through a one-click payment link",
    effort: "Zero",
    auto: true,
  },
  {
    icon: TrendingUp,
    title: "Axia records payment and updates your profitability report",
    effort: "Zero",
    auto: true,
  },
];

export function Workflow() {
  return (
    <section className="relative py-10 sm:py-14">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-10">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <Reveal>
              <span className="eyebrow">From work to payment</span>
            </Reveal>
            <Reveal delay={0.06}>
              <h2 className="mt-4 text-balance text-3xl font-bold leading-[1.05] tracking-tight text-foreground sm:text-4xl">
                Seven of nine steps require{" "}
                <span className="text-[var(--axia-teal-bright)]">zero</span>{" "}
                manual effort.
              </h2>
            </Reveal>
            <Reveal delay={0.12}>
              <p className="mt-4 text-pretty leading-relaxed text-muted-foreground">
                Proof is captured the moment work happens. The flag becomes the
                change order becomes the invoice becomes the payment, in three
                clicks, mostly zero. Your week stops being a series of small
                admin tasks.
              </p>
            </Reveal>
            <Reveal delay={0.18}>
              <div className="mt-7 flex gap-4">
                <div className="flex-1 rounded-xl border border-emerald-600/25 bg-emerald-50/60 p-4">
                  <p className="nums text-3xl font-semibold text-emerald-700">
                    7
                  </p>
                  <p className="mt-1 text-[0.78rem] text-muted-foreground">
                    steps fully automated
                  </p>
                </div>
                <div className="flex-1 rounded-xl border border-border bg-secondary/40 p-4">
                  <p className="nums text-3xl font-semibold text-foreground">
                    2
                  </p>
                  <p className="mt-1 text-[0.78rem] text-muted-foreground">
                    steps, one click each
                  </p>
                </div>
              </div>
            </Reveal>
          </div>

          {/* timeline */}
          <Reveal delay={0.1}>
            <ol className="relative">
              {/* vertical rail */}
              <span className="absolute left-[1.35rem] top-3 bottom-3 w-px bg-gradient-to-b from-[var(--axia-teal)]/40 via-border to-[var(--axia-teal)]/30" />
              {STEPS.map((s, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: 12 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ delay: i * 0.05, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="relative flex items-start gap-4 pb-5 last:pb-0"
                >
                  <span
                    className={cn(
                      "relative z-10 grid h-11 w-11 shrink-0 place-items-center rounded-full border",
                      s.auto
                        ? "border-emerald-600/40 bg-emerald-50"
                        : "border-[var(--axia-teal)]/40 bg-[var(--axia-teal-soft)]/20"
                    )}
                  >
                    {s.auto ? (
                      <Check className="h-5 w-5 text-emerald-600" />
                    ) : (
                      <s.icon className="h-5 w-5 text-[var(--axia-teal-bright)]" />
                    )}
                  </span>
                  <div className="flex-1 rounded-xl border border-border bg-secondary/30 px-4 py-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-[0.9rem] font-medium leading-snug text-foreground">
                        {s.title}
                      </p>
                      <span className="nums shrink-0 text-[0.72rem] text-muted-foreground/70">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                    </div>
                    <p
                      className={cn(
                        "mt-1.5 text-[0.76rem] font-medium",
                        s.auto ? "text-emerald-700" : "text-[var(--axia-teal-bright)]"
                      )}
                    >
                      Manual effort: {s.effort}
                    </p>
                  </div>
                </motion.li>
              ))}
            </ol>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
