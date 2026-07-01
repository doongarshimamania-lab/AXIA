
import { motion } from "framer-motion";
import {
  FileText,
  CheckCircle2,
  Clock,
  User,
  Link2,
  ShieldCheck,
} from "lucide-react";
import { Reveal } from "./reveal";

/**
 * InvoiceProof, a visual mockup of a dispute-proof Axia invoice.
 * Shows line items linking to verified work logs. Breaks text monotony
 * with a concrete, premium product visual.
 */
export function InvoiceProof() {
  return (
    <section className="section-tinted relative py-10 sm:py-14">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.1fr] lg:gap-10">
          {/* left: copy */}
          <div>
            <Reveal>
              <span className="eyebrow">The proof, visible</span>
            </Reveal>
            <Reveal delay={0.06}>
              <h2 className="mt-4 text-balance text-3xl font-bold leading-[1.08] tracking-tight text-foreground sm:text-4xl">
                An invoice that defends itself.
              </h2>
            </Reveal>
            <Reveal delay={0.12}>
              <p className="mt-3 text-pretty leading-relaxed text-muted-foreground">
                Your client opens the invoice. They click a line. They see the
                work, the hours, the files, the timestamps. There is nothing to
                argue with. They pay. You did not lift a finger to defend it.
              </p>
            </Reveal>
            <Reveal delay={0.18}>
              <ul className="mt-4 space-y-2">
                {[
                  "Each line item links to clickable proof",
                  "Timestamped, by person, by task",
                  "Disputes drop 82% on average",
                ].map((t) => (
                  <li
                    key={t}
                    className="flex items-start gap-3 text-[0.92rem] text-foreground/90"
                  >
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>

          {/* right: invoice mockup */}
          <Reveal delay={0.1}>
            <div className="relative">
              <div className="pointer-events-none absolute -inset-4 -z-10 rounded-[2rem] bg-[radial-gradient(closest-side,rgba(43,122,107,0.16),transparent)]" />
              <InvoiceCard />
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function InvoiceCard() {
  const lines = [
    { task: "Homepage hero redesign", who: "Sarah", hrs: 12, verified: true },
    { task: "Nav component fix", who: "Marcus", hrs: 6, verified: true },
    { task: "Design system tokens", who: "Sarah", hrs: 8, verified: true },
    { task: "API integration", who: "Marcus", hrs: 6, verified: true },
  ];
  const total = lines.reduce((s, l) => s + l.hrs, 0);

  return (
    <div className="surface-elevated overflow-hidden p-6 sm:p-7">
      {/* header */}
      <div className="flex items-start justify-between border-b border-border pb-5">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-lg border border-[var(--axia-teal)]/40 bg-[var(--axia-teal-soft)]/20">
            <FileText className="h-5 w-5 text-[var(--axia-teal-bright)]" />
          </span>
          <div>
            <p className="text-[0.95rem] font-semibold text-foreground">
              Invoice #1042
            </p>
            <p className="text-[0.72rem] text-muted-foreground">
              Acme Corp, Oct 12 to 19
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[0.66rem] uppercase tracking-wide text-muted-foreground/70">
            Status
          </p>
          <span className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-emerald-600/30 bg-emerald-50 px-2.5 py-0.5 text-[0.68rem] font-medium text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Dispute-proof
          </span>
        </div>
      </div>

      {/* line items */}
      <div className="mt-3 space-y-2">
        {lines.map((l, i) => (
          <motion.div
            key={l.task}
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08, duration: 0.4 }}
            className="group flex items-center gap-3 rounded-lg border border-border bg-secondary/30 px-3.5 py-3 transition-colors hover:border-[var(--axia-teal)]/40 hover:bg-[var(--axia-teal-soft)]/[0.07]"
          >
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-[0.86rem] font-medium text-foreground">
                {l.task}
                <Link2 className="h-3 w-3 text-[var(--axia-teal-bright)] opacity-60 transition-opacity group-hover:opacity-100" />
              </p>
              <p className="mt-0.5 flex items-center gap-2 text-[0.7rem] text-muted-foreground">
                <User className="h-3 w-3" />
                {l.who}
                <Clock className="ml-1 h-3 w-3" />
                Oct {12 + i} to {13 + i}
              </p>
            </div>
            <div className="text-right">
              <p className="nums text-[0.88rem] font-semibold text-foreground">
                {l.hrs}h
              </p>
              <p className="nums text-[0.68rem] text-muted-foreground">
                ${l.hrs * 125}
              </p>
            </div>
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          </motion.div>
        ))}
      </div>

      {/* total */}
      <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
        <div>
          <p className="text-[0.72rem] text-muted-foreground">
            Total verified hours
          </p>
          <p className="nums text-2xl font-semibold text-foreground">
            {total}h
          </p>
        </div>
        <div className="text-right">
          <p className="text-[0.72rem] text-muted-foreground">Amount due</p>
          <p className="nums text-2xl font-semibold text-emerald-700">
            ${total * 125}
          </p>
        </div>
      </div>

      {/* proof footer */}
      <div className="mt-4 flex items-center gap-2.5 rounded-lg border border-[var(--axia-teal)]/25 bg-[var(--axia-teal-soft)]/10 px-3.5 py-3">
        <ShieldCheck className="h-4 w-4 shrink-0 text-[var(--axia-teal-bright)]" />
        <p className="text-[0.76rem] leading-relaxed text-foreground/90">
          Each line links to a verified workstream, captured for you from
          GitHub, Figma and Slack. No manual entry.
        </p>
      </div>
    </div>
  );
}
