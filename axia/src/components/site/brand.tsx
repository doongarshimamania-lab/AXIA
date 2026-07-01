import { cn } from "@/lib/utils";

/**
 * AxiaMark, the brand symbol.
 * A rounded "tab" containing a verified checkmark shield, signals
 * "one tab" + "protected/verified work". Matte teal accent.
 */
export function AxiaMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      className={cn("h-8 w-8", className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="axia-mark-fill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3a9885" />
          <stop offset="100%" stopColor="#1d5a4f" />
        </linearGradient>
      </defs>
      {/* outer tab */}
      <rect
        x="3"
        y="3"
        width="34"
        height="34"
        rx="9"
        fill="url(#axia-mark-fill)"
        stroke="#2b7a6b"
        strokeWidth="1"
      />
      {/* inner cut for matte depth */}
      <rect
        x="7.5"
        y="7.5"
        width="25"
        height="25"
        rx="6"
        fill="#0d1218"
        opacity="0.28"
      />
      {/* verified check, the proof */}
      <path
        d="M14.5 20.4l3.6 3.6 7.8-8.2"
        stroke="#10b981"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Wordmark + symbol lockup */
export function AxiaLogo({
  className,
  showWord = true,
}: {
  className?: string;
  showWord?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <AxiaMark />
      {showWord && (
        <span className="text-[1.35rem] font-semibold tracking-tight text-foreground">
          Axia
        </span>
      )}
    </span>
  );
}
