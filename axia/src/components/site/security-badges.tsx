
import { motion } from "framer-motion";
import { ShieldCheck, Lock, FileCheck, KeyRound, Server } from "lucide-react";
import { Reveal } from "./reveal";

/**
 * SecurityBadges, a compact trust strip showing compliance & security
 * commitments. Addresses the "trust logos / security signals" gap.
 */
const BADGES = [
  { icon: ShieldCheck, label: "SOC 2 Type II", sub: "In progress" },
  { icon: Lock, label: "AES-256 encryption", sub: "At rest & in transit" },
  { icon: FileCheck, label: "GDPR ready", sub: "Data export anytime" },
  { icon: KeyRound, label: "SSO / SAML", sub: "Scale plan" },
  { icon: Server, label: "Event-sourced", sub: "Immutable audit trail" },
];

export function SecurityBadges() {
  return (
    <section className="relative border-y border-border bg-secondary/20 py-12">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <Reveal>
          <p className="mb-6 text-center text-[0.7rem] font-medium uppercase tracking-[0.16em] text-muted-foreground/70">
            Engineered for trust · your proof is permanent
          </p>
        </Reveal>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {BADGES.map((b, i) => (
            <Reveal key={b.label} delay={i * 0.05}>
              <motion.div
                whileHover={{ y: -2 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="surface flex flex-col items-center gap-2 px-4 py-4 text-center"
              >
                <span className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-secondary">
                  <b.icon className="h-[18px] w-[18px] text-[var(--axia-teal-bright)]" />
                </span>
                <div>
                  <p className="text-[0.78rem] font-semibold text-foreground">
                    {b.label}
                  </p>
                  <p className="text-[0.66rem] text-muted-foreground">
                    {b.sub}
                  </p>
                </div>
              </motion.div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
