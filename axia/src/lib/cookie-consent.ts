// src/lib/cookie-consent.ts — GDPR-style granular cookie consent.
//
// Categories (per GDPR Art. 6 + DPDP Act 2023 §18):
//   - strictly_necessary: always on, no toggle. Auth session, security tokens.
//   - functional: toggleable, default ON. UI prefs (theme, sidebar, layout).
//   - analytics: toggleable, default OFF. PostHog, Sentry. Requires opt-in.
//   - marketing: toggleable, default OFF. Reserved for future ad pixels.
//
// State is stored in localStorage key `axia_cookie_consent` as:
//   { version: 1, acceptedAt: <epoch-ms>, categories: {…}, ip: undefined }
//
// The "version" field lets us re-prompt if the policy changes. Bump
// CONSENT_VERSION below when the policy materially changes.
//
// ponytail: no dependency, no framework. Just typed get/set/isConsented.

export type CookieCategory =
  | "strictly_necessary"
  | "functional"
  | "analytics"
  | "marketing";

export interface ConsentState {
  version: number;
  acceptedAt: number;
  // IP captured at acceptance time (per user's "full audit trail" preference).
  // Server-side mutation `recordConsent` writes this to the consentAudits table
  // along with the user-agent + the policy version they accepted.
  ip?: string;
  categories: Record<CookieCategory, boolean>;
}

// Bump when the cookie policy materially changes (new cookie added, new
// processor, new purpose). Users who accepted an older version will be
// re-prompted on next visit.
export const CONSENT_VERSION = 1;

const STORAGE_KEY = "axia_cookie_consent";

export const COOKIE_CATEGORIES: {
  id: CookieCategory;
  label: string;
  description: string;
  defaultOn: boolean;
  required?: boolean;
}[] = [
  {
    id: "strictly_necessary",
    label: "Strictly Necessary",
    description:
      "Required for the app to function. Auth sessions, security tokens, anti-fraud. Cannot be disabled.",
    defaultOn: true,
    required: true,
  },
  {
    id: "functional",
    label: "Functional",
    description:
      "Remember your preferences: theme, sidebar layout, workspace selection, notification read-state.",
    defaultOn: true,
  },
  {
    id: "analytics",
    label: "Analytics",
    description:
      "Anonymous usage analytics via PostHog + error tracking via Sentry. Helps us fix bugs and improve features.",
    defaultOn: false,
  },
  {
    id: "marketing",
    label: "Marketing",
    description:
      "Ad pixels and conversion tracking. We don't use any today; this slot is reserved for future use.",
    defaultOn: false,
  },
];

export function getConsent(): ConsentState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ConsentState;
    // Re-prompt if version is older than current.
    if (parsed.version !== CONSENT_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function setConsent(categories: Record<CookieCategory, boolean>): ConsentState {
  const state: ConsentState = {
    version: CONSENT_VERSION,
    acceptedAt: Date.now(),
    categories: {
      // strictly_necessary is always true regardless of input.
      strictly_necessary: true,
      functional: categories.functional ?? true,
      analytics: categories.analytics ?? false,
      marketing: categories.marketing ?? false,
    },
  };
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
  // Notify any listeners (monitoring.ts, banner component) that consent changed.
  window.dispatchEvent(new CustomEvent("axia_consent_change", { detail: state }));
  return state;
}

export function isConsented(category: CookieCategory): boolean {
  const state = getConsent();
  if (!state) return category === "strictly_necessary";
  return state.categories[category] ?? false;
}

export function hasConsented(): boolean {
  return getConsent() !== null;
}

export function revokeConsent(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent("axia_consent_change", { detail: null }));
}

// ─── Cookie inventory (used by the /cookies policy page) ────────────────────
// ponytail: single source of truth — the inventory page reads from this array,
// so we never have a drift between "what we claim we set" and "what we set".
export interface CookieRecord {
  name: string;
  category: CookieCategory;
  provider: string;
  purpose: string;
  type: "cookie" | "localStorage" | "sessionStorage";
  ttl: string;
  thirdParty?: boolean;
}

export const COOKIE_INVENTORY: CookieRecord[] = [
  // ── Strictly necessary ──────────────────────────────────────────────────
  {
    name: "better-auth.session_token",
    category: "strictly_necessary",
    provider: "Axia (first-party, via Better Auth)",
    purpose: "Authenticates your session. Without this, you can't stay signed in.",
    type: "cookie",
    ttl: "24 hours (sliding — refreshes every hour while active)",
  },
  {
    name: "better-auth.session_token.cookies",
    category: "strictly_necessary",
    provider: "Axia (first-party, via Better Auth)",
    purpose: "Cross-subdomain session cookie (used when accessing the Service from www or app subdomains).",
    type: "cookie",
    ttl: "24 hours (sliding)",
  },
  {
    name: "axia_portal_token",
    category: "strictly_necessary",
    provider: "Axia (first-party)",
    purpose: "Client portal session token (when a client pays an invoice via the portal).",
    type: "sessionStorage",
    ttl: "Cleared when the browser tab closes",
  },
  // ── Functional ──────────────────────────────────────────────────────────
  {
    name: "axia_theme",
    category: "functional",
    provider: "Axia (first-party)",
    purpose: "Remembers your light/dark theme preference.",
    type: "localStorage",
    ttl: "Until you sign out or clear browser data",
  },
  {
    name: "axia_sidebar_state",
    category: "functional",
    provider: "Axia (first-party)",
    purpose: "Remembers whether your sidebar is expanded or collapsed.",
    type: "localStorage",
    ttl: "Until you sign out or clear browser data",
  },
  {
    name: "axia_sidebar_sections",
    category: "functional",
    provider: "Axia (first-party)",
    purpose: "Remembers which sidebar sections (WORK / CRM / BILLING / ADMIN) you have open.",
    type: "localStorage",
    ttl: "Until you sign out or clear browser data",
  },
  {
    name: "axia_sidebar_scroll",
    category: "functional",
    provider: "Axia (first-party)",
    purpose: "Restores sidebar scroll position when you return to the app.",
    type: "localStorage",
    ttl: "Until you sign out or clear browser data",
  },
  {
    name: "sidebar_state",
    category: "functional",
    provider: "Axia (first-party)",
    purpose: "Shadcn UI sidebar state cookie (mirror of axia_sidebar_state for SSR).",
    type: "cookie",
    ttl: "1 year",
  },
  {
    name: "axia_active_workspace",
    category: "functional",
    provider: "Axia (first-party)",
    purpose: "Remembers which workspace you last selected.",
    type: "localStorage",
    ttl: "Until you sign out or clear browser data",
  },
  {
    name: "axia_account_mode",
    category: "functional",
    provider: "Axia (first-party)",
    purpose: "Remembers whether you're in freelancer or client mode.",
    type: "localStorage",
    ttl: "Until you sign out or clear browser data",
  },
  {
    name: "axia_client_email",
    category: "functional",
    provider: "Axia (first-party)",
    purpose: "Pre-fills the client signup form with your email on return.",
    type: "localStorage",
    ttl: "Until you sign out or clear browser data",
  },
  {
    name: "axia_notifications_last_seen",
    category: "functional",
    provider: "Axia (first-party)",
    purpose: "Tracks which notifications you've already seen (so we can show the unread badge).",
    type: "localStorage",
    ttl: "Until you sign out or clear browser data",
  },
  {
    name: "onboardingData",
    category: "functional",
    provider: "Axia (first-party)",
    purpose: "Caches your onboarding form progress so you don't lose it on refresh.",
    type: "localStorage",
    ttl: "Until onboarding completes or you sign out",
  },
  {
    name: "extension_token",
    category: "functional",
    provider: "Axia (first-party)",
    purpose: "Chrome extension pairing token (if you install the AXIA extension).",
    type: "localStorage",
    ttl: "Until you sign out or clear browser data",
  },
  // ── Analytics (only set if you opt in) ──────────────────────────────────
  {
    name: "ph_*",
    category: "analytics",
    provider: "PostHog (posthog.com)",
    purpose: "Anonymous usage analytics: page views, feature usage, funnels. We use this to fix bugs and improve features.",
    type: "cookie",
    ttl: "1 year",
    thirdParty: true,
  },
  {
    name: "Sentry session breadcrumbs",
    category: "analytics",
    provider: "Sentry (sentry.io)",
    purpose: "Crash reporting — captures the last 50 events before an error so we can reproduce it. No PII.",
    type: "localStorage",
    ttl: "Session-only (in-memory, never persisted)",
    thirdParty: true,
  },
  // ── Marketing (none currently) ──────────────────────────────────────────
];
