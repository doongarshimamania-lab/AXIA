
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ArrowRight, ShieldCheck } from "lucide-react";
import { Reveal } from "./reveal";
import { cn } from "@/lib/utils";

// Numeric prices for toggle math. Annual = 2 months free (10/12 of monthly).
const TIERS = [
  {
    name: "Solo",
    tagline: "For freelancers & consultants",
    monthly: 29,
    seats: "1 seat",
    features: [
      "1 active client portal",
      "Verified Workstreams",
      "Validated Billing",
      "Smart Proposals (5/mo)",
      "Automated payment reminders",
      "Evidence Library, 90 days",
    ],
    cta: "Start free",
    featured: false,
  },
  {
    name: "Agency",
    tagline: "For B2B agencies, 3 to 50 seats",
    monthly: 99,
    seats: "Min 3 seats",
    features: [
      "Everything in Solo",
      "Scope Creep Protection (AI)",
      "Full Truth Layer + event sourcing",
      "Unlimited Smart Proposals",
      "Integrations: GitHub, Figma, Slack, Stripe",
      "Evidence Library, unlimited",
      "Priority support",
    ],
    cta: "Start free",
    featured: true,
  },
  {
    name: "Scale",
    tagline: "For 50+ seats & multi-brand",
    monthly: 299,
    seats: "Min 10 seats",
    features: [
      "Everything in Agency",
      "Multi-brand workspaces",
      "SSO + SCIM provisioning",
      "Advanced profitability reports",
      "Dedicated success manager",
      "Custom integrations & SLA",
    ],
    cta: "Talk to us",
    featured: false,
  },
] as const;

type Billing = "monthly" | "annual";

export function Pricing() {
  const [billing, setBilling] = useState<Billing>("monthly");

  const priceFor = (monthly: number) =>
    billing === "annual" ? Math.round((monthly * 10) / 12) : monthly;

  return (
    <section id="pricing" className="relative scroll-mt-24 py-10 sm:py-14">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <Reveal>
            <span className="eyebrow">Pricing</span>
          </Reveal>
          <Reveal delay={0.06}>
            <h2 className="mt-4 text-balance text-[1.75rem] font-bold leading-[1.1] tracking-tight text-foreground sm:text-[2.5rem]">
              Worth more than the tools it replaces.
            </h2>
          </Reveal>
          <Reveal delay={0.12}>
            <p className="mt-3 text-pretty leading-relaxed text-muted-foreground">
              Axia costs less than the 5 to 7 SaaS subscriptions it consolidates -
              and recovers revenue no other tool can. Cancel the others. Keep
              the money.
            </p>
          </Reveal>

          {/* billing toggle */}
          <Reveal delay={0.16}>
            <div
              className="mt-8 inline-flex items-center gap-1 rounded-full border border-border bg-secondary/50 p-1"
              role="radiogroup"
              aria-label="Billing period"
            >
              {(["monthly", "annual"] as const).map((b) => (
                <button
                  key={b}
                  onClick={() => setBilling(b)}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                      e.preventDefault();
                      setBilling((prev) => (prev === "monthly" ? "annual" : "monthly"));
                    }
                  }}
                  role="radio"
                  aria-checked={billing === b}
                  tabIndex={billing === b ? 0 : -1}
                  className={cn(
                    "relative rounded-full px-4 py-2 text-[0.84rem] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--axia-teal)]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    billing === b
                      ? "text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {billing === b && (
                    <motion.span
                      layoutId="billing-pill"
                      className="absolute inset-0 rounded-full bg-primary shadow-[0_4px_16px_-4px_rgba(43,122,107,0.7),inset_0_1px_0_rgba(255,255,255,0.12)]"
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    />
                  )}
                  <span className="relative z-10 capitalize">{b}</span>
                  {b === "annual" && (
                    <span
                      className={cn(
                        "relative z-10 ml-1.5 rounded-full px-1.5 py-0.5 text-[0.6rem] font-semibold",
                        billing === "annual"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-emerald-50 text-emerald-700"
                      )}
                    >
                      2 mo free
                    </span>
                  )}
                </button>
              ))}
            </div>
          </Reveal>
        </div>

        <div className="mt-8 grid items-stretch gap-4 lg:grid-cols-3">
          {TIERS.map((t, i) => (
            <Reveal key={t.name} delay={i * 0.08}>
              <div
                className={cn(
                  "relative flex h-full flex-col overflow-hidden rounded-[var(--radius-2xl)] p-5",
                  t.featured
                    ? "surface-elevated border-[var(--axia-teal)]/55 bg-gradient-to-b from-[var(--axia-teal-soft)] to-white"
                    : "surface"
                )}
              >
                {t.featured && (
                  <>
                    <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-[radial-gradient(closest-side,rgba(43,122,107,0.3),transparent)]" />
                    <span className="absolute right-5 top-5 inline-flex items-center gap-1.5 rounded-full border border-[var(--axia-teal)]/40 bg-[var(--axia-teal-soft)]/25 px-2.5 py-1 text-[0.66rem] font-medium uppercase tracking-wide text-[var(--axia-teal-bright)]">
                      <ShieldCheck className="h-3 w-3" /> most chosen
                    </span>
                  </>
                )}
                <div>
                  <h3 className="text-[1.3rem] font-semibold text-foreground">
                    {t.name}
                  </h3>
                  <p className="mt-1 text-[0.82rem] text-muted-foreground">
                    {t.tagline}
                  </p>
                </div>

                {/* animated price */}
                <div className="mt-6 flex items-baseline gap-1.5">
                  <AnimatePresence mode="popLayout">
                    <motion.span
                      key={billing + t.name}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                      className="nums text-5xl font-semibold tracking-tight text-foreground"
                    >
                      ${priceFor(t.monthly)}
                    </motion.span>
                  </AnimatePresence>
                  <span className="text-[0.82rem] text-muted-foreground">
                    /seat / mo
                  </span>
                </div>
                <div className="mt-1 h-5">
                  {billing === "annual" ? (
                    <p className="text-[0.72rem] text-emerald-700/90">
                      Billed annually · ${t.monthly * 10}/yr per seat
                    </p>
                  ) : (
                    <p className="text-[0.74rem] font-medium uppercase tracking-wide text-muted-foreground/80">
                      {t.seats}
                    </p>
                  )}
                </div>

                <a
                  href="#cta"
                  className={cn(
                    "group mt-6 inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-[0.92rem] font-medium transition-all",
                    t.featured
                      ? "bg-primary text-primary-foreground hover:bg-[var(--axia-teal-bright)] hover:shadow-[0_0_36px_-8px_rgba(43,122,107,0.8)]"
                      : "border border-border bg-secondary/50 text-foreground hover:border-[var(--axia-teal)]/50 hover:bg-secondary"
                  )}
                >
                  {t.cta}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </a>

                <ul className="mt-4 space-y-2 border-t border-border pt-6">
                  {t.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2.5 text-[0.86rem] text-muted-foreground"
                    >
                      <Check
                        className={cn(
                          "mt-0.5 h-4 w-4 shrink-0",
                          t.featured ? "text-emerald-600" : "text-[var(--axia-teal-bright)]"
                        )}
                      />
                      <span className="text-foreground/90">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.12}>
          <p className="mx-auto mt-10 max-w-xl text-center text-[0.82rem] text-muted-foreground">
            All plans include a 14-day trial. No credit card. Cancel anytime.
            Switch from your stack in under a day.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
