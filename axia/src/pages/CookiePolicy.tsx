// src/pages/CookiePolicy.tsx — /cookies route.
//
// Shows: (1) the user's current consent state, (2) the full inventory of
// cookies/localStorage keys the app sets, grouped by category, (3) a button
// to re-open the consent banner (revoke current consent).
//
// ponytail: reads from the single source of truth in lib/cookie-consent.ts
// (COOKIE_INVENTORY + COOKIE_CATEGORIES). No duplicated lists.

import { useState, useEffect } from "react";
import { Link } from "react-router";
import {
  COOKIE_CATEGORIES,
  COOKIE_INVENTORY,
  getConsent,
  revokeConsent,
  type CookieCategory,
  type ConsentState,
} from "@/lib/cookie-consent";

export default function CookiePolicy() {
  const [consent, setConsentState] = useState<ConsentState | null>(null);

  useEffect(() => {
    setConsentState(getConsent());
    const handler = (e: Event) => setConsentState((e as CustomEvent).detail);
    window.addEventListener("axia_consent_change", handler);
    return () => window.removeEventListener("axia_consent_change", handler);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-12 sm:py-16">
        <Link
          to="/"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back to app
        </Link>

        <header className="mt-6 border-b border-border pb-6">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground font-[Space_Grotesk]">
            Cookie Policy
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Last updated: {new Date().toLocaleDateString("en-IN", { dateStyle: "long" })}
          </p>
        </header>

        {/* ── Current consent state ───────────────────────────────────────── */}
        <section className="mt-8 rounded-2xl border border-border p-5 sm:p-6 bg-muted/30">
          <h2 className="text-lg font-semibold text-foreground font-[Space_Grotesk]">
            Your current consent
          </h2>
          {consent ? (
            <>
              <p className="mt-1 text-sm text-muted-foreground">
                You last set your preferences on{" "}
                <span className="font-medium text-foreground">
                  {new Date(consent.acceptedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                </span>
                .
              </p>
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
                {COOKIE_CATEGORIES.map((cat) => (
                  <div
                    key={cat.id}
                    className="rounded-lg border border-border p-3 bg-background"
                  >
                    <div className="text-xs text-muted-foreground">{cat.label}</div>
                    <div className="mt-1 text-sm font-medium text-foreground">
                      {consent.categories[cat.id as CookieCategory] ? "On" : "Off"}
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => revokeConsent()}
                className="mt-4 px-4 py-2 text-sm font-medium rounded-lg border border-border text-foreground hover:bg-muted transition-colors"
              >
                Change my preferences
              </button>
            </>
          ) : (
            <>
              <p className="mt-1 text-sm text-muted-foreground">
                You haven't set your cookie preferences yet. The banner should appear at the
                bottom of your screen. If it doesn't, click below.
              </p>
              <button
                onClick={() => revokeConsent()}
                className="mt-4 px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Show cookie banner
              </button>
            </>
          )}
        </section>

        {/* ── What we set, grouped by category ────────────────────────────── */}
        {COOKIE_CATEGORIES.map((cat) => {
          const items = COOKIE_INVENTORY.filter((c) => c.category === cat.id);
          return (
            <section key={cat.id} className="mt-10">
              <h2 className="text-xl font-semibold text-foreground font-[Space_Grotesk] flex items-center gap-2">
                {cat.label}
                {cat.required && (
                  <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded bg-muted text-muted-foreground">
                    Required
                  </span>
                )}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">{cat.description}</p>
              <div className="mt-4 overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium">Name</th>
                      <th className="px-4 py-3 font-medium">Type</th>
                      <th className="px-4 py-3 font-medium">Provider</th>
                      <th className="px-4 py-3 font-medium">Purpose</th>
                      <th className="px-4 py-3 font-medium">TTL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {items.map((c) => (
                      <tr key={c.name} className="hover:bg-muted/30">
                        <td className="px-4 py-3 font-mono text-xs text-foreground align-top">
                          {c.name}
                          {c.thirdParty && (
                            <span className="block text-[10px] mt-1 text-amber-600">
                              Third-party
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground align-top">{c.type}</td>
                        <td className="px-4 py-3 text-muted-foreground align-top">{c.provider}</td>
                        <td className="px-4 py-3 text-muted-foreground align-top">{c.purpose}</td>
                        <td className="px-4 py-3 text-muted-foreground align-top">{c.ttl}</td>
                      </tr>
                    ))}
                    {items.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-6 text-center text-sm text-muted-foreground">
                          No cookies in this category.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })}

        {/* ── How to clear ───────────────────────────────────────────────── */}
        <section className="mt-10">
          <h2 className="text-xl font-semibold text-foreground font-[Space_Grotesk]">
            How to clear cookies
          </h2>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            You can clear all AXIA-related cookies and local storage by signing out of the app
            (Account → Sign out). This wipes every <code className="font-mono text-xs">axia_*</code>{" "}
            key and the auth session cookie. For browser-level controls, your browser's settings
            menu (Chrome: Settings → Privacy and security → Clear browsing data) lets you clear
            individual cookies or all site data.
          </p>
        </section>

        {/* ── Contact ────────────────────────────────────────────────────── */}
        <section className="mt-10">
          <h2 className="text-xl font-semibold text-foreground font-[Space_Grotesk]">
            Questions?
          </h2>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            For any questions about this Cookie Policy or your consent choices, contact us at{" "}
            <a href="mailto:legal@axia-bay.vercel.app" className="underline text-foreground hover:text-primary">
              legal@axia-bay.vercel.app
            </a>
            . Our Data Protection Officer handles GDPR / UK GDPR / CCPA / India DPDP Act 2023 requests; for GDPR matters, the EU representative is reachable at the same address.
          </p>
        </section>
      </div>
    </div>
  );
}
