
import { motion } from "framer-motion";
import { Github, Figma, Slack, CreditCard, FileEdit, GitBranch, CheckCircle2 } from "lucide-react";
import { Reveal } from "./reveal";

// From brand bible §07, Key Integrations table.
const INTEGRATIONS = [
  { icon: Github, name: "GitHub", captures: "Commits, PR merges, issue status", status: "Production", color: "#0d1218" },
  { icon: Figma, name: "Figma", captures: "File saves, comments, version history", status: "Production", color: "#F24E1E" },
  { icon: Slack, name: "Slack", captures: "Project messages, decision logs", status: "Production", color: "#E01E5A" },
  { icon: CreditCard, name: "Stripe", captures: "Payment, refund, dispute events", status: "Production", color: "#635BFF" },
  { icon: FileEdit, name: "Google Workspace", captures: "Doc edits, calendar, email threads", status: "Beta", color: "#4285F4" },
  { icon: GitBranch, name: "Linear", captures: "Issue creation, status, assignee changes", status: "Q3 Roadmap", color: "#5E6AD2" },
];

export function Integrations() {
  return (
    <section id="integrations" className="section-tinted relative scroll-mt-24 py-8 sm:py-12">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-10">
          {/* left: pitch */}
          <div className="lg:sticky lg:top-28 lg:self-start">
            <Reveal>
              <span className="eyebrow">Integrations</span>
            </Reveal>
            <Reveal delay={0.06}>
              <h2 className="mt-4 text-balance text-3xl font-bold leading-[1.08] tracking-tight text-foreground sm:text-4xl">
                Axia sees the work happening, without making you change how you work.
              </h2>
            </Reveal>
            <Reveal delay={0.12}>
              <p className="mt-3 text-pretty leading-relaxed text-muted-foreground">
                The Truth Layer captures events from the tools your team already
                uses. Nobody presses start. Nobody presses stop. The verified
                work log builds itself, and every invoice links back to proof.
              </p>
            </Reveal>
            <Reveal delay={0.18}>
              <div className="mt-6 flex items-start gap-3 rounded-xl border border-[var(--axia-teal)]/25 bg-[var(--axia-teal-soft)]/10 p-4">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--axia-teal-bright)]" />
                <p className="text-[0.84rem] leading-relaxed text-foreground/90">
                  <span className="font-medium">Zero behavior change.</span> Your
                  team keeps using GitHub, Figma, Slack. Axia quietly captures
                  everything into one dispute-proof timeline.
                </p>
              </div>
            </Reveal>
          </div>

          {/* right: integration grid */}
          <div className="grid gap-3 sm:grid-cols-2">
            {INTEGRATIONS.map((it, i) => (
              <Reveal key={it.name} delay={(i % 2) * 0.06}>
                <motion.div
                  whileHover={{ y: -2 }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  className="surface surface-hover group h-full p-5"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="grid h-10 w-10 place-items-center rounded-lg border border-border bg-secondary">
                        <it.icon className="h-5 w-5" style={{ color: it.color }} />
                      </span>
                      <div>
                        <p className="text-[0.95rem] font-semibold text-foreground">
                          {it.name}
                        </p>
                        <p className="text-[0.7rem] text-muted-foreground">
                          {it.captures}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                    <span className="text-[0.66rem] uppercase tracking-wide text-muted-foreground/70">
                      Status
                    </span>
                    <span
                      className={
                        it.status === "Production"
                          ? "inline-flex items-center gap-1.5 rounded-full border border-emerald-600/30 bg-emerald-50 px-2 py-0.5 text-[0.66rem] font-medium text-emerald-700"
                          : it.status === "Beta"
                            ? "inline-flex items-center gap-1.5 rounded-full border border-amber-600/30 bg-amber-500/10 px-2 py-0.5 text-[0.66rem] font-medium text-amber-700"
                            : "inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-2 py-0.5 text-[0.66rem] font-medium text-muted-foreground"
                      }
                    >
                      {it.status === "Production" && (
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      )}
                      {it.status}
                    </span>
                  </div>
                </motion.div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
