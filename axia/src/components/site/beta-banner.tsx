// ponytail: BetaBanner — sticky top-of-page banner for the landing page.
// Combines a scrolling marquee ("continuous news") + a live countdown timer
// that counts down from the visitor's first-visit date + 30 days.
//
// The start date is persisted to localStorage so the countdown is stable
// across reloads. The banner sets a `--beta-banner-h` CSS var on <html>
// via ResizeObserver so SiteNav (position: fixed; top: 0) can offset itself
// below the banner.

import { useEffect, useRef, useState } from "react";
import { Sparkles, Clock } from "lucide-react";

const BETA_DAYS = 30;
const STORAGE_KEY = "axia_beta_start_ts";

function getOrCreateBetaStart(): number {
  if (typeof window === "undefined") return Date.now();
  const existing = localStorage.getItem(STORAGE_KEY);
  if (existing) {
    const n = Number(existing);
    if (Number.isFinite(n) && n > 0) return n;
  }
  const now = Date.now();
  localStorage.setItem(STORAGE_KEY, String(now));
  return now;
}

function computeTimeLeft(targetMs: number) {
  const diff = targetMs - Date.now();
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
  }
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((diff % (1000 * 60)) / 1000),
    expired: false,
  };
}

function pad2(n: number) {
  return n < 10 ? `0${n}` : String(n);
}

export function BetaBanner() {
  const [timeLeft, setTimeLeft] = useState(() => {
    const start = getOrCreateBetaStart();
    return computeTimeLeft(start + BETA_DAYS * 24 * 60 * 60 * 1000);
  });
  const bannerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = bannerRef.current;
    if (!el) return;
    const setH = () => {
      document.documentElement.style.setProperty("--beta-banner-h", `${el.offsetHeight}px`);
    };
    setH();
    const ro = new ResizeObserver(setH);
    ro.observe(el);
    window.addEventListener("resize", setH);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", setH);
      document.documentElement.style.removeProperty("--beta-banner-h");
    };
  }, []);

  useEffect(() => {
    const start = getOrCreateBetaStart();
    const target = start + BETA_DAYS * 24 * 60 * 60 * 1000;
    const id = setInterval(() => {
      setTimeLeft(computeTimeLeft(target));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const marqueeItems = [
    "30-day beta test live now",
    "Every plan $0 during beta",
    "No credit card required",
    "Cancel anytime, pay nothing",
    "Beta ends soon — join today",
  ];

  return (
    <div
      ref={bannerRef}
      className="sticky top-0 z-[60] w-full border-b border-[var(--axia-teal)]/30 bg-gradient-to-r from-[var(--axia-teal)] via-[var(--axia-teal-bright)] to-[var(--axia-teal)] text-white shadow-[0_2px_12px_-2px_rgba(43,122,107,0.5)]"
      role="region"
      aria-label="Beta announcement"
    >
      <div className="mx-auto flex h-11 max-w-[1400px] items-center gap-3 px-3 sm:px-6 lg:px-8">
        <span className="hidden h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm sm:flex">
          <Sparkles className="h-3.5 w-3.5" />
        </span>

        <div className="relative flex-1 overflow-hidden">
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-[var(--axia-teal)] to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-[var(--axia-teal)] to-transparent" />
          <div
            className="flex whitespace-nowrap will-change-transform"
            style={{ animation: "axia-marquee 38s linear infinite" }}
            aria-hidden="true"
          >
            {[0, 1, 2, 3].map((copy) => (
              <div key={copy} className="flex shrink-0 items-center">
                {marqueeItems.map((item, idx) => (
                  <span
                    key={`${copy}-${idx}`}
                    className="mx-6 inline-flex items-center gap-2 text-[0.78rem] font-medium tracking-wide sm:text-[0.82rem]"
                  >
                    <span className="inline-block h-1 w-1 rounded-full bg-white/70" />
                    {item}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div
          className="flex shrink-0 items-center gap-2 rounded-full bg-white/15 px-3 py-1 backdrop-blur-sm"
          aria-live="polite"
          aria-label={`Beta ends in ${timeLeft.days} days ${timeLeft.hours} hours ${timeLeft.minutes} minutes`}
        >
          <Clock className="h-3.5 w-3.5" />
          <span className="text-[0.66rem] font-semibold uppercase tracking-wider opacity-90 sm:text-[0.72rem]">
            Beta ends
          </span>
          <span className="nums text-[0.78rem] font-bold tabular-nums sm:text-[0.84rem]">
            {timeLeft.expired ? (
              "Closed"
            ) : (
              <>
                {pad2(timeLeft.days)}d{" "}
                <span className="hidden sm:inline">{pad2(timeLeft.hours)}:</span>
                <span className="inline sm:hidden">{pad2(timeLeft.hours)}h</span>
                {pad2(timeLeft.minutes)}
                <span className="hidden sm:inline">:{pad2(timeLeft.seconds)}</span>
                <span className="inline sm:hidden">m</span>
              </>
            )}
          </span>
        </div>
      </div>

      <style>{`
        @keyframes axia-marquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
