
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ArrowRight, ShieldCheck, Sparkles, Building2 } from "lucide-react";
import { Link } from "react-router";
import { Reveal } from "./reveal";
import { cn } from "@/lib/utils";

// ponytail: BETA_TRIAL flag controls the 30-day free beta offer. When true,
// every self-serve tier shows a $0 trial price with the original price struck
// through. Flip to false after the beta window ends. Enterprise is always
// "Contact sales" — beta does not apply.
const BETA_TRIAL = true;
const BETA_TRIAL_DAYS = 30;

// ponytail (2026-07-26): Tier definitions REWRITTEN to be grounded in REAL
// app features (audited against src/main.tsx routes + src/convex/tables/*).
// Previously listed marketing fluff ("Verified Workstreams", "Full Truth
// Layer + event sourcing", "SSO + SCIM", "GitHub/Figma/Slack/Stripe
// integrations") that does NOT exist in the codebase.
//
// Pricing model:
//   - Solo    → per-SEAT  ($29/seat/mo, 1 seat)
//   - Agency  → per-AGENCY ($99/agency/mo, 10 seats included)
//   - Scale   → per-AGENCY ($299/agency/mo, 25 seats included)
//   - Enterprise → Contact sales (features only, no price)
//
// Real app features (verified):
//   Clients + token Portal, Projects, Time Tracking, Tags, Goals, Invoices +
//   Builder, Payment Patterns, Reports, Pipeline, Proposals + Builder,
//   Messages, Scope, Evidence Library + Export, Team Management,
//   Multi-workspace, Custom fields, Compliance alerts.
const TIERS = [
  {
    name: "Solo",
    tagline: "For solo freelancers & consultants",
    monthly: 29,
    pricingUnit: "seat",
    seatsLabel: "1 seat included",
    featured: false,
    href: undefined,
    features: [
      "1 agency seat",
      "Up to 3 active clients",
      "Up to 5 active projects",
      "Time tracking + tags",
      "Invoices + invoice builder",
      "Up to 5 proposals / month",
      "Sales pipeline",
      "Evidence library — 90-day history",
      "Token-based client portal",
      "Email support (48h SLA)",
    ],
  },
  {
    name: "Agency",
    tagline: "For boutique agencies, up to 10 seats",
    monthly: 99,
    pricingUnit: "agency",
    seatsLabel: "10 seats included",
    featured: true,
    href: undefined,
    features: [
      "Everything in Solo",
      "10 agency seats included",
      "Unlimited clients + projects",
      "Unlimited proposals",
      "Scope management + creep tracking",
      "Payment pattern analysis",
      "Evidence library — unlimited history",
      "Team management + roles",
      "Internal messages",
      "Reports + dashboards",
      "Priority email support (24h SLA)",
    ],
  },
  {
    name: "Scale",
    tagline: "For growing agencies, up to 25 seats",
    monthly: 299,
    pricingUnit: "agency",
    seatsLabel: "25 seats included",
    featured: false,
    href: undefined,
    features: [
      "Everything in Agency",
      "25 agency seats included",
      "Multi-workspace (multiple brands)",
      "Advanced profitability reports",
      "Custom fields",
      "Compliance alerts",
      "Goals + team performance",
      "Dedicated success manager",
      "99.9% uptime SLA",
    ],
  },
  {
    name: "Enterprise",
    tagline: "For 25+ seats, multi-brand & custom needs",
    monthly: null,
    pricingUnit: null,
    seatsLabel: "Custom seat allotment",
    featured: false,
    href: "#demo",
    features: [
      "Everything in Scale",
      "Custom seat allotment",
      "Dedicated onboarding & training",
      "Custom contracts & invoicing",
      "Dedicated customer success manager",
      "Custom SLA (99.99% uptime)",
      "Priority security & compliance review",
      "Custom data retention policies",
    ],
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

          {BETA_TRIAL && (
            <Reveal delay={0.14}>
              <div className="mx-auto mt-6 inline-flex max-w-2xl items-center gap-3 rounded-2xl border border-[var(--axia-teal)]/40 bg-gradient-to-r from-[var(--axia-teal-soft)]/60 to-white px-5 py-3 text-left shadow-[0_8px_28px_-12px_rgba(43,122,107,0.35)]">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--axia-teal)] text-white">
                  <Sparkles className="h-4 w-4" />
                </span>
                <div className="flex-1">
                  <p className="text-[0.92rem] font-semibold text-foreground">
                    {BETA_TRIAL_DAYS}-day free beta trial — every plan, $0 today.
                  </p>
                  <p className="text-[0.78rem] text-muted-foreground">
                    No credit card. Full feature access. After the beta, your
                    plan auto-converts to its listed price — cancel anytime
                    before then and pay nothing.
                  </p>
                </div>
              </div>
            </Reveal>
          )}

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

        <div className="mt-8 grid items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TIERS.map((t, i) => {
            const isEnterprise = t.monthly === null;
            return (
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

                  <div className="mt-6 flex items-baseline gap-1.5">
                    {BETA_TRIAL && !isEnterprise && (
                      <AnimatePresence mode="popLayout">
                        <motion.span
                          key={"strike-" + billing + t.name}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                          className="nums text-2xl font-medium tracking-tight text-muted-foreground/70 line-through"
                          aria-label={`original price ${priceFor(t.monthly as number)} dollars per ${t.pricingUnit} per month`}
                        >
                          ${priceFor(t.monthly as number)}
                        </motion.span>
                      </AnimatePresence>
                    )}
                    <AnimatePresence mode="popLayout">
                      <motion.span
                        key={billing + t.name}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                        className="nums text-5xl font-semibold tracking-tight text-foreground"
                      >
                        {isEnterprise
                          ? "Custom"
                          : BETA_TRIAL
                            ? "$0"
                            : `$${priceFor(t.monthly as number)}`}
                      </motion.span>
                    </AnimatePresence>
                    {!isEnterprise && (
                      <span className="text-[0.82rem] text-muted-foreground">
                        {BETA_TRIAL
                          ? `/ ${t.pricingUnit} · ${BETA_TRIAL_DAYS} days`
                          : `/ ${t.pricingUnit} / mo`}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 h-5">
                    {isEnterprise ? (
                      <p className="text-[0.74rem] font-medium uppercase tracking-wide text-muted-foreground/80">
                        {t.seatsLabel}
                      </p>
                    ) : BETA_TRIAL ? (
                      <p className="text-[0.74rem] font-medium text-[var(--axia-teal-bright)]">
                        Then ${priceFor(t.monthly as number)}/{t.pricingUnit}/mo{billing === "annual" ? " · billed annually" : ""}
                      </p>
                    ) : billing === "annual" ? (
                      <p className="text-[0.72rem] text-emerald-700/90">
                        Billed annually · ${(t.monthly as number) * 10}/yr per {t.pricingUnit}
                      </p>
                    ) : (
                      <p className="text-[0.74rem] font-medium uppercase tracking-wide text-muted-foreground/80">
                        {t.seatsLabel}
                      </p>
                    )}
                  </div>

                  {t.href ? (
                    <a
                      href={t.href}
                      className={cn(
                        "group mt-6 inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-[0.92rem] font-medium transition-all",
                        t.featured
                          ? "bg-primary text-primary-foreground hover:bg-[var(--axia-teal-bright)] hover:shadow-[0_0_36px_-8px_rgba(43,122,107,0.8)]"
                          : "border border-border bg-secondary/50 text-foreground hover:border-[var(--axia-teal)]/50 hover:bg-secondary"
                      )}
                    >
                      <Building2 className="h-4 w-4" />
                      Contact sales
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </a>
                  ) : (
                    <Link
                      to="/auth?mode=signup"
                      className={cn(
                        "group mt-6 inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-[0.92rem] font-medium transition-all",
                        t.featured
                          ? "bg-primary text-primary-foreground hover:bg-[var(--axia-teal-bright)] hover:shadow-[0_0_36px_-8px_rgba(43,122,107,0.8)]"
                          : "border border-border bg-secondary/50 text-foreground hover:border-[var(--axia-teal)]/50 hover:bg-secondary"
                      )}
                    >
                      {BETA_TRIAL ? `Start ${BETA_TRIAL_DAYS}-day free beta` : "Start free"}
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  )}

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
            );
          })}
        </div>

        <Reveal delay={0.12}>
          <p className="mx-auto mt-10 max-w-xl text-center text-[0.82rem] text-muted-foreground">
            {BETA_TRIAL ? (
              <>
                Beta trial: <span className="font-medium text-foreground">{BETA_TRIAL_DAYS} days free</span> on every plan. No credit card. Cancel anytime. Switch from your stack in under a day.
              </>
            ) : (
              <>
                All plans include a 14-day trial. No credit card. Cancel anytime. Switch from your stack in under a day.
              </>
            )}
          </p>
        </Reveal>
      </div>
    </section>
  );
}
