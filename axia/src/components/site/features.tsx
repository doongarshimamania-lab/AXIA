
import {
  ShieldAlert,
  Activity,
  Receipt,
  ShieldCheck,
  AlarmClock,
  LayoutGrid,
  FileText,
  Focus,
  ArrowUpRight,
} from "lucide-react";
import { Reveal } from "./reveal";
import { cn } from "@/lib/utils";

type Feature = {
  n: string;
  icon: typeof ShieldAlert;
  title: string;
  pain: string;
  desc: string;
  impact: string;
  impactTone: "emerald" | "teal" | "amber";
  span?: boolean;
};

const FEATURES: Feature[] = [
  {
    n: "01",
    icon: ShieldAlert,
    title: "Scope Creep Protection",
    pain: "“Just one more thing” eats your margin",
    desc: "When a client says \"just one more thing,\" you stop hearing dread. Axia catches it, prices it, and turns it into a paid change order before you even finish reading the message. The money you used to give away stays in your account.",
    impact: "$1K to $5K/mo recovered",
    impactTone: "emerald",
    span: true,
  },
  {
    n: "04",
    icon: ShieldCheck,
    title: "Truth Layer",
    pain: "“What am I actually paying for?”",
    desc: "Three months from now, a client questions an old invoice. You do not scramble. You do not sweat. You open Axia, click the invoice, and show them every hour, every task, every file, timestamped and undeniable. They apologize.",
    impact: "3 to 5 hrs/wk saved",
    impactTone: "teal",
  },
  {
    n: "02",
    icon: Activity,
    title: "Verified Workstreams",
    pain: "“What did you work on?” asked every Monday",
    desc: "Monday morning, the client asks what you did last week. You send one link. The conversation ends. No rebuilding timesheets from memory, no guessing, no awkward silences. The work log already exists, and it proves itself.",
    impact: "3 to 5 hrs/wk saved",
    impactTone: "emerald",
  },
  {
    n: "03",
    icon: Receipt,
    title: "Validated Billing",
    pain: "Invoice disputes, line item by line item",
    desc: "Your invoice arrives. Your client opens it, clicks a line item, sees the proof, and pays it. No \"can you break this down?\" email. No back-and-forth. No write-offs. Just money in your account, faster.",
    impact: "82% fewer disputes",
    impactTone: "emerald",
  },
  {
    n: "05",
    icon: AlarmClock,
    title: "Automated Payment Reminders",
    pain: "Chasing late invoices yourself",
    desc: "You stop being the person who chases money. Axia sends the reminders, politely, on schedule, every time. You never feel awkward, clients never feel pressured, and payments arrive 71% sooner. The relationship stays clean.",
    impact: "71% fewer late pays",
    impactTone: "teal",
  },
  {
    n: "06",
    icon: LayoutGrid,
    title: "One Workspace",
    pain: "Five SaaS subscriptions, none of them talking",
    desc: "You open one tab in the morning. Everything is there. You close your laptop at 5. The work got done, the proof exists, the invoice is sent. You look like the most organized agency your client has ever worked with, and you did not work harder to earn that reputation.",
    impact: "$200 to $400/mo saved",
    impactTone: "teal",
  },
  {
    n: "07",
    icon: FileText,
    title: "Smart Proposals",
    pain: "Proposals that go cold and die",
    desc: "You send a proposal. Three follow-ups happen on their own, at the right moment, without you remembering or reminding anyone. Your prospect replies. You did not lift a finger, and your pipeline stops leaking money.",
    impact: "40% higher reply rate",
    impactTone: "emerald",
  },
  {
    n: "08",
    icon: Focus,
    title: "Single Context",
    pain: "Jumping 5 tabs kills deep work",
    desc: "Your team stops context-switching between five tabs. They stay in flow, ship faster, and stop losing 23 minutes every time they jump tools. The work feels lighter. Sundays get quiet. Laptops close at 5.",
    impact: "23 min saved per switch",
    impactTone: "teal",
  },
];

const toneMap: Record<Feature["impactTone"], string> = {
  emerald: "border-emerald-600/30 bg-emerald-50 text-emerald-700",
  teal: "border-[var(--axia-teal)]/30 bg-[var(--axia-teal-soft)]/15 text-[var(--axia-teal-bright)]",
  amber: "border-amber-600/30 bg-amber-500/10 text-amber-700",
};

export function Features() {
  return (
    <section id="features" className="section-tinted relative scroll-mt-24 py-10 sm:py-14">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
          <div className="max-w-2xl">
            <Reveal>
              <span className="eyebrow">The after picture</span>
            </Reveal>
            <Reveal delay={0.06}>
              <h2 className="mt-4 text-balance text-[1.75rem] font-bold leading-[1.1] tracking-tight text-foreground sm:text-[2.5rem]">
                Here is what your week looks like after Axia.
              </h2>
            </Reveal>
            <Reveal delay={0.12}>
              <p className="mt-3 text-pretty leading-relaxed text-muted-foreground">
                No more defending invoices. No more chasing payments. No more
                scope creep you swallow in silence. Each of these is a moment
                of relief you will feel the first week.
              </p>
            </Reveal>
          </div>
          <Reveal delay={0.12}>
            <a
              href="#calculator"
              className="group inline-flex items-center gap-1.5 text-[0.9rem] font-medium text-[var(--axia-teal-bright)] hover:text-foreground"
            >
              See your recovery
              <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </a>
          </Reveal>
        </div>

        <div className="mt-8 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Reveal
              key={f.n}
              delay={(i % 3) * 0.06}
              className={cn(f.span && "lg:col-span-2 lg:row-span-1")}
            >
              <article
                className={cn(
                  "surface surface-hover group relative h-full overflow-hidden p-6",
                  f.span && "lg:p-8"
                )}
              >
                <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-[radial-gradient(closest-side,rgba(43,122,107,0.12),transparent)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                <div className="flex items-start justify-between">
                  <span className="grid h-12 w-12 place-items-center rounded-xl border border-border bg-secondary">
                    <f.icon className="h-5 w-5 text-[var(--axia-teal-bright)]" />
                  </span>
                  <span className="nums text-[0.72rem] text-muted-foreground/70">
                    {f.n}
                  </span>
                </div>

                <h3 className="mt-5 text-[1.2rem] font-semibold tracking-tight text-foreground">
                  {f.title}
                </h3>
                <p className="mt-1.5 text-[0.82rem] italic text-muted-foreground">
                  {f.pain}
                </p>
                <p className="mt-3.5 text-pretty text-[0.9rem] leading-relaxed text-muted-foreground">
                  {f.desc}
                </p>

                <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.72rem] font-medium",
                      toneMap[f.impactTone]
                    )}
                  >
                    {f.impactTone === "emerald" && (
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    )}
                    {f.impact}
                  </span>
                  {f.span && (
                    <span className="text-[0.7rem] font-medium uppercase tracking-wide text-[var(--axia-teal-bright)]">
                      the differentiator
                    </span>
                  )}
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
