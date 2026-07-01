
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Pause,
  RotateCcw,
  GitCommit,
  FileEdit,
  MessageSquare,
  CheckSquare,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { Reveal } from "./reveal";
import { cn } from "@/lib/utils";

type Evt = {
  id: number;
  t: string;
  icon: typeof GitCommit;
  who: string;
  action: string;
  kind: "work" | "flag" | "verified";
  detail?: string;
};

const SCRIPT: Evt[] = [
  { id: 1, t: "09:14", icon: CheckSquare, who: "Sarah", action: "moved task, In Progress", kind: "work", detail: "Homepage hero redesign" },
  { id: 2, t: "09:31", icon: FileEdit, who: "Sarah", action: "saved design-v3.fig", kind: "work", detail: "Figma, 3 frames" },
  { id: 3, t: "09:48", icon: GitCommit, who: "Marcus", action: "commit, fix nav edge case", kind: "work", detail: "repo: acme-site" },
  { id: 4, t: "10:02", icon: MessageSquare, who: "Client", action: "“just one more section”", kind: "flag", detail: "out of scope, est. 4 hrs" },
  { id: 5, t: "10:02", icon: AlertTriangle, who: "Axia", action: "scope creep flagged", kind: "flag", detail: "change order #CO-1042, $500" },
  { id: 6, t: "10:14", icon: CheckCircle2, who: "Sarah", action: "approved change order", kind: "verified", detail: "$500 added to invoice" },
  { id: 7, t: "11:20", icon: FileEdit, who: "Marcus", action: "saved components.tsx", kind: "work", detail: "VS Code, 142 LOC" },
  { id: 8, t: "11:45", icon: CheckSquare, who: "Sarah", action: "task, Review", kind: "work", detail: "Homepage hero redesign" },
  { id: 9, t: "12:00", icon: ShieldCheck, who: "Axia", action: "workstream verified", kind: "verified", detail: "4.2 hrs captured, 0 manual" },
];

export function TruthLayerDemo() {
  const [playing, setPlaying] = useState(true);
  const [shown, setShown] = useState<number>(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!playing) return;
    if (shown >= SCRIPT.length) {
      // pause at end, then reset after a beat
      timer.current = setTimeout(() => {
        setShown(0);
      }, 2600);
      return () => {
        if (timer.current) clearTimeout(timer.current);
      };
    }
    timer.current = setTimeout(() => {
      setShown((s) => s + 1);
    }, 1100);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [playing, shown]);

  const visible = SCRIPT.slice(0, shown);
  const progress = (shown / SCRIPT.length) * 100;

  return (
    <section id="truth-demo" className="relative scroll-mt-24 py-10 sm:py-14">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <Reveal>
            <span className="eyebrow">Watch it verify</span>
          </Reveal>
          <Reveal delay={0.06}>
            <h2 className="mt-4 text-balance text-[1.75rem] font-bold leading-[1.1] tracking-tight text-foreground sm:text-[2.5rem]">
              The agency work, replayed.
            </h2>
          </Reveal>
          <Reveal delay={0.12}>
            <p className="mt-3 text-pretty leading-relaxed text-muted-foreground">
              Watch a real morning of agency work get captured, flagged, and
              verified, on its own. No one pressed start. No one pressed stop.
              The proof built itself.
            </p>
          </Reveal>
        </div>

        <Reveal delay={0.1}>
          <div className="mx-auto mt-14 max-w-3xl">
            <div className="surface relative overflow-hidden">
              {/* header / controls */}
              <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
                <div className="flex items-center gap-2.5">
                  <span className="relative flex h-2 w-2">
                    <span className={cn("absolute inline-flex h-full w-full rounded-full bg-emerald-400", playing && "live-dot")} />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                  </span>
                  <span className="text-[0.82rem] font-medium text-foreground">
                    acme-corp, live workstream
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setPlaying((p) => !p)}
                    onKeyDown={(e) => {
                      if (e.key === " " || e.key === "Enter") {
                        e.preventDefault();
                        setPlaying((p) => !p);
                      }
                    }}
                    className="grid h-8 w-8 place-items-center rounded-md border border-border bg-secondary/50 text-muted-foreground transition-colors hover:border-[var(--axia-teal)]/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--axia-teal)]/60"
                    aria-label={playing ? "Pause" : "Play"}
                    aria-pressed={!playing}
                  >
                    {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    onClick={() => {
                      setShown(0);
                      setPlaying(true);
                    }}
                    className="grid h-8 w-8 place-items-center rounded-md border border-border bg-secondary/50 text-muted-foreground transition-colors hover:border-[var(--axia-teal)]/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--axia-teal)]/60"
                    aria-label="Restart replay"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* progress bar */}
              <div className="h-0.5 w-full bg-secondary">
                <motion.div
                  className="h-full bg-gradient-to-r from-[var(--axia-teal)] to-emerald-400"
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                />
              </div>

              {/* event stream */}
              <div className="scroll-area max-h-[440px] min-h-[320px] overflow-y-auto p-4">
                <AnimatePresence initial={false}>
                  {visible.map((e) => (
                    <motion.div
                      key={e.id}
                      initial={{ opacity: 0, y: 12, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: "auto" }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <EventRow evt={e} />
                    </motion.div>
                  ))}
                </AnimatePresence>

                {shown === 0 && (
                  <div className="flex h-[280px] flex-col items-center justify-center text-center">
                    <Play className="h-8 w-8 text-muted-foreground/40" />
                    <p className="mt-3 text-[0.86rem] text-muted-foreground">
                      Press play to watch the workstream build itself.
                    </p>
                  </div>
                )}

                {shown >= SCRIPT.length && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="mt-3 flex items-center gap-3 rounded-lg border border-emerald-600/30 bg-emerald-50/70 px-4 py-3.5"
                  >
                    <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-600" />
                    <div className="flex-1">
                      <p className="text-[0.86rem] font-medium text-foreground">
                        Workstream complete, dispute-proof
                      </p>
                      <p className="text-[0.74rem] text-muted-foreground">
                        4.2 hrs verified, 1 change order, $500 recovered, 0
                        manual entries
                      </p>
                    </div>
                    <span className="nums text-[0.82rem] font-semibold text-emerald-700">
                      $5,625
                    </span>
                  </motion.div>
                )}
              </div>

              {/* footer stats */}
              <div className="grid grid-cols-3 divide-x divide-border border-t border-border">
                <Stat label="Events captured" value={String(Math.min(shown, SCRIPT.length))} />
                <Stat label="Manual entries" value="0" tone="good" />
                <Stat
                  label="Recovered"
                  value={shown >= 6 ? "$500" : "$0"}
                  tone="good"
                />
              </div>
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.14}>
          <p className="mx-auto mt-8 max-w-xl text-center text-[0.88rem] text-muted-foreground">
            Every action is a permanent, event-sourced record. The evidence
            stays reconstructable months later, even if the task is archived
            or the team member leaves.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

function EventRow({ evt }: { evt: Evt }) {
  const tone =
    evt.kind === "verified"
      ? "border-emerald-600/30 bg-emerald-50/60 text-emerald-700"
      : evt.kind === "flag"
        ? "border-amber-600/30 bg-amber-50/60 text-amber-700"
        : "border-border bg-secondary/40 text-muted-foreground";

  return (
    <div className="mb-2 flex items-start gap-3 rounded-lg border border-border bg-secondary/20 px-3.5 py-3">
      <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-md border", tone)}>
        <evt.icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[0.84rem] leading-snug text-foreground">
          <span className="font-medium">{evt.who}</span>{" "}
          <span className="text-muted-foreground">{evt.action}</span>
        </p>
        {evt.detail && (
          <p
            className={cn(
              "mt-0.5 text-[0.72rem]",
              evt.kind === "flag"
                ? "text-amber-700/80"
                : evt.kind === "verified"
                  ? "text-emerald-700/80"
                  : "text-muted-foreground/70"
            )}
          >
            {evt.detail}
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="nums text-[0.7rem] text-muted-foreground/60">
          {evt.t}
        </span>
        {evt.kind === "verified" && (
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
        )}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "good";
}) {
  return (
    <div className="px-4 py-3.5 text-center">
      <p
        className={cn(
          "nums text-lg font-semibold",
          tone === "good" ? "text-emerald-700" : "text-foreground"
        )}
      >
        {value}
      </p>
      <p className="mt-0.5 text-[0.68rem] uppercase tracking-wide text-muted-foreground/70">
        {label}
      </p>
    </div>
  );
}
