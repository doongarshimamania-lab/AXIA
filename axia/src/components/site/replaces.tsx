
import { motion } from "framer-motion";
import {
  CheckSquare,
  MessageSquare,
  FileText,
  FileEdit,
  FileSignature,
  ArrowRight,
  X,
  Check,
} from "lucide-react";
import { Reveal } from "./reveal";
import { AxiaMark } from "./brand";

const REPLACED = [
  { icon: MessageSquare, name: "Slack", cat: "Team comms" },
  { icon: FileText, name: "Notion", cat: "Docs / wiki" },
  { icon: CheckSquare, name: "Trello", cat: "Project mgmt" },
  { icon: FileEdit, name: "Google Docs", cat: "Collab docs" },
  { icon: FileSignature, name: "Bonsai", cat: "Proposals / CRM" },
];

export function Replaces() {
  return (
    <section id="replaces" className="relative scroll-mt-24 py-10 sm:py-14">
      
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <Reveal>
            <span className="eyebrow">One tab replaces five</span>
          </Reveal>
          <Reveal delay={0.06}>
            <h2 className="mt-4 text-balance text-[1.75rem] font-bold leading-[1.1] tracking-tight text-foreground sm:text-[2.5rem]">
              Cancel them all. Keep everything they did.
            </h2>
          </Reveal>
          <Reveal delay={0.12}>
            <p className="mt-3 text-pretty leading-relaxed text-muted-foreground">
              You keep the projects, the tasks, the docs, the proposals, the
              payments. You lose the five subscriptions, the six hours of sync
              time, and the feeling of drowning in tabs. Axia does everything
              they did, in one place, with proof built in.
            </p>
          </Reveal>
        </div>

        <Reveal delay={0.1}>
          <div className="mt-8 grid items-stretch gap-6 lg:grid-cols-[1fr_auto_1fr]">
            {/* before */}
            <div className="surface relative overflow-hidden p-7">
              <div className="flex items-center justify-between">
                <span className="text-[0.78rem] font-medium uppercase tracking-wide text-muted-foreground">
                  Before
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-red-600/30 bg-red-500/10 px-2.5 py-1 text-[0.7rem] font-medium text-red-600">
                  <X className="h-3 w-3" /> sync tax
                </span>
              </div>
              <p className="mt-1 text-[0.95rem] font-semibold text-foreground">
                The duct-taped stack
              </p>

              <div className="mt-6 grid grid-cols-2 gap-2.5">
                {REPLACED.map((t, i) => (
                  <motion.div
                    key={t.name}
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.06, duration: 0.4 }}
                    className="flex items-center gap-2.5 rounded-lg border border-border bg-secondary/40 px-3 py-2"
                  >
                    <t.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="truncate text-[0.82rem] font-medium text-foreground">
                        {t.name}
                      </p>
                      <p className="truncate text-[0.68rem] text-muted-foreground">
                        {t.cat}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="mt-6 space-y-2 border-t border-border pt-5 text-[0.82rem]">
                <Cost label="Software subscriptions" value="$200 to $400 / mo" />
                <Cost label="Manual sync time" value="6 to 8 hrs / week" />
                <Cost
                  label="Lost productivity @ $125/hr"
                  value="$3,750 to $5,000 / mo"
                  danger
                />
              </div>
            </div>

            {/* arrow */}
            <div className="flex items-center justify-center">
              <div className="relative">
                <motion.div
                  animate={{ x: [0, 6, 0] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                  className="grid h-14 w-14 place-items-center rounded-full border border-[var(--axia-teal)]/40 bg-[var(--axia-teal-soft)]/20"
                >
                  <ArrowRight className="h-6 w-6 text-[var(--axia-teal-bright)]" />
                </motion.div>
              </div>
            </div>

            {/* after */}
            <div className="relative overflow-hidden rounded-[var(--radius-2xl)] border border-[var(--axia-teal)]/45 bg-gradient-to-br from-[var(--axia-teal-soft)] to-white p-7">
              <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[radial-gradient(closest-side,rgba(43,122,107,0.28),transparent)]" />
              <div className="flex items-center justify-between">
                <span className="text-[0.78rem] font-medium uppercase tracking-wide text-emerald-700">
                  After
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-600/40 bg-emerald-50 px-2.5 py-1 text-[0.7rem] font-medium text-emerald-700">
                  <Check className="h-3 w-3" /> verified
                </span>
              </div>
              <div className="mt-1 flex items-center gap-2.5">
                <AxiaMark className="h-6 w-6" />
                <p className="text-[0.95rem] font-semibold text-foreground">
                  Axia, one tab
                </p>
              </div>

              <div className="mt-6 space-y-2">
                {[
                  "Projects + tasks",
                  "Verified workstreams",
                  "Validated billing",
                  "Clients + pipeline",
                  "Smart proposals",
                  "Auto payment reminders",
                ].map((m, i) => (
                  <motion.div
                    key={m}
                    initial={{ opacity: 0, x: -8 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.06, duration: 0.4 }}
                    className="flex items-center gap-2.5 rounded-lg border border-border bg-secondary/40 px-3 py-2"
                  >
                    <Check className="h-4 w-4 shrink-0 text-emerald-600" />
                    <span className="text-[0.85rem] font-medium text-foreground">
                      {m}
                    </span>
                  </motion.div>
                ))}
              </div>

              <div className="mt-6 space-y-2 border-t border-border pt-5 text-[0.82rem]">
                <Cost label="Software subscriptions" value="1 plan" good />
                <Cost label="Manual sync time" value="0 hrs / week" good />
                <Cost
                  label="Truth Layer verification"
                  value="included"
                  good
                />
              </div>
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.12}>
          <p className="mx-auto mt-10 max-w-2xl text-center text-pretty text-[0.95rem] text-muted-foreground">
            When an agency says “we use Asana and Harvest and QuickBooks,” they
            are describing the problem, not a competitive moat. A five-to-seven-tool
            stack is the qualification signal, not the disqualification signal.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

function Cost({
  label,
  value,
  danger,
  good,
}: {
  label: string;
  value: string;
  danger?: boolean;
  good?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={`nums font-semibold ${
          danger ? "text-red-600" : good ? "text-emerald-700" : "text-foreground"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
