// src/components/CookieConsentBanner.tsx — GDPR-style granular cookie banner.
//
// Shows on first visit (and whenever CONSENT_VERSION bumps). Three actions:
//   - Accept all (sets all categories true)
//   - Reject all (only strictly_necessary true)
//   - Customize (opens per-category toggle panel, save preferences)
//
// State persists via lib/cookie-consent.ts. Once set, the banner disappears.
// User can re-open it from the /cookies page (CookiePolicy.tsx) or from the
// footer link.
//
// ponytail: no animation library, no state machine. useState + CSS transitions.

import { useState, useEffect, useRef } from "react";
import { Link } from "react-router";
import {
  COOKIE_CATEGORIES,
  CONSENT_VERSION,
  getConsent,
  setConsent,
  hasConsented,
  type CookieCategory,
} from "@/lib/cookie-consent";

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [prefs, setPrefs] = useState<Record<CookieCategory, boolean>>({
    strictly_necessary: true,
    functional: true,
    analytics: false,
    marketing: false,
  });
  const bannerRef = useRef<HTMLDivElement | null>(null);

  // Show banner on mount if no consent has been recorded (or version changed).
  useEffect(() => {
    if (!hasConsented()) setVisible(true);
  }, []);

  // ponytail: set --cookie-banner-h on <html> when the banner is visible
  // so other full-screen pages (Auth, Onboarding) can reserve bottom padding
  // via `paddingBottom: var(--cookie-banner-h, 0px)` and avoid the banner
  // overlapping their CTA button. Mirrors the BetaBanner pattern for top
  // offset (var(--beta-banner-h)).
  useEffect(() => {
    if (!visible) {
      document.documentElement.style.removeProperty("--cookie-banner-h");
      return;
    }
    const el = bannerRef.current;
    if (!el) return;
    const setH = () => {
      document.documentElement.style.setProperty("--cookie-banner-h", `${el.offsetHeight}px`);
    };
    setH();
    const ro = new ResizeObserver(setH);
    ro.observe(el);
    window.addEventListener("resize", setH);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", setH);
      document.documentElement.style.removeProperty("--cookie-banner-h");
    };
  }, [visible]);

  // Listen for revoke events (from /cookies page) — re-show the banner.
  useEffect(() => {
    const handler = () => setVisible(!hasConsented());
    window.addEventListener("axia_consent_change", handler);
    return () => window.removeEventListener("axia_consent_change", handler);
  }, []);

  const acceptAll = () => {
    setConsent({
      strictly_necessary: true,
      functional: true,
      analytics: true,
      marketing: true,
    });
    setVisible(false);
  };

  const rejectAll = () => {
    setConsent({
      strictly_necessary: true,
      functional: false,
      analytics: false,
      marketing: false,
    });
    setVisible(false);
  };

  const saveCustom = () => {
    setConsent(prefs);
    setVisible(false);
  };

  if (!visible) return null;

  // ponytail: mobile-compact cookie banner. On phones the original layout
  // (heading + paragraph + 3-button row + Policy v1) consumed ~35% of the
  // viewport vertically and visually obscured the hero CTA. Now on mobile we
  // collapse to a single column with tighter padding, smaller text, and a
  // 2-button primary row (Accept / Reject) with Customize as a tertiary
  // text link below. Desktop (sm+) keeps the original generous layout.
  return (
    <div
      ref={bannerRef}
      role="dialog"
      aria-live="polite"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-[100] p-3 sm:p-6"
    >
      <div className="mx-auto max-w-4xl rounded-2xl border border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-2xl">
        <div className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            <div className="flex-1 min-w-0">
              <h2 className="text-sm sm:text-lg font-semibold text-foreground font-[Space_Grotesk]">
                We use cookies
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                We use cookies and local storage to keep you signed in, remember your
                preferences, and (with your permission) analyze how the app is used so we
                can fix bugs and improve features. You can read the full list in our{" "}
                <Link to="/cookies" className="underline text-foreground hover:text-primary">
                  Cookie Policy
                </Link>
                .
              </p>
            </div>
          </div>

          {showCustomize && (
            <div className="mt-4 border-t border-border pt-4 space-y-3">
              {COOKIE_CATEGORIES.map((cat) => (
                <div key={cat.id} className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id={`cat-${cat.id}`}
                    checked={prefs[cat.id]}
                    disabled={cat.required}
                    onChange={(e) =>
                      setPrefs((p) => ({ ...p, [cat.id]: e.target.checked }))
                    }
                    className="mt-1 h-4 w-4 accent-primary disabled:opacity-50"
                  />
                  <label htmlFor={`cat-${cat.id}`} className="flex-1 text-sm cursor-pointer">
                    <span className="font-medium text-foreground">{cat.label}</span>
                    {cat.required && (
                      <span className="ml-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                        Required
                      </span>
                    )}
                    <span className="block text-xs text-muted-foreground mt-0.5">
                      {cat.description}
                    </span>
                  </label>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 sm:mt-5 flex flex-wrap items-center gap-2">
            {!showCustomize ? (
              <>
                {/* ponytail: on mobile, Accept all takes priority (flex-1)
                    so it gets the most tap area. Reject all + Customize
                    sit beside it as smaller buttons. */}
                <button
                  onClick={acceptAll}
                  className="flex-1 sm:flex-none px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Accept all
                </button>
                <button
                  onClick={rejectAll}
                  className="px-4 py-2 text-sm font-medium rounded-lg border border-border text-foreground hover:bg-muted transition-colors"
                >
                  Reject
                </button>
                <button
                  onClick={() => setShowCustomize(true)}
                  className="px-3 py-2 text-xs sm:text-sm font-medium rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  Customize
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={saveCustom}
                  className="flex-1 sm:flex-none px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Save preferences
                </button>
                <button
                  onClick={() => setShowCustomize(false)}
                  className="px-4 py-2 text-sm font-medium rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  Back
                </button>
              </>
            )}
            <span className="ml-auto hidden text-[11px] text-muted-foreground sm:inline">
              Policy v{CONSENT_VERSION}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
