/**
 * AXIA V2 Design Tokens — Single Source of Truth
 *
 * All color, spacing, and UI values used in JavaScript/TypeScript code
 * should reference these tokens. Never hardcode hex values in components.
 *
 * CSS custom properties (globals.css) are the canonical source for
 * Tailwind classes. This file provides JS-accessible equivalents for
 * data-driven scenarios (pipeline stages, tag colors, chart colors, etc.)
 *
 * PDF Source: axia_brand_identity_system_v2.pdf
 * 85/10/5 rule: 85% neutral, 10% teal brand primary, 5% accent
 *
 * FORBIDDEN per V2 Section 9:
 *   Purple/Indigo (#6366F1, #8B5CF6, #A855F7, #7C3AED, #4F46E5, #5C6AC4)
 *   Gold/Brass (#B5953C, #D4A853, #FFD700, #C87533)
 *   Pure black bg (#000000), Pure white text on dark (#FFFFFF)
 */

// ── Pipeline Stage Colors (V2-compliant: teal/platinum/steel/emerald) ──
// No indigo/purple — FORBIDDEN per V2 Section 9
// lead→qualified: teal family (brand progression)
// proposal→negotiation: steel blue → platinum (formal → secondary)
// won: emerald (the "protected" Pavlovian signal per PDF Section 4.4)
// lost: danger red (at-risk state)
export const STAGE_COLORS = {
  lead:        '#0D9488',  // Teal-600 — brand primary, initial contact
  qualified:   '#0F766E',  // Teal-700 — deeper engagement
  proposal:    '#475993',  // Steel Blue — chart-primary, formal stage
  negotiation: '#94A3B8',  // Platinum-400 — secondary accent
  won:         '#10B981',  // Emerald — "protected" signal (PDF: Pavlovian safety)
  lost:        '#EF4444',  // Red-500 — danger, at-risk
} as const;

// ── Tag Preset Colors (V2-compliant palette) ──────────────────────
// Uses ONLY teal scale, platinum scale, steel blue, frost, and semantic colors
// NO indigo, violet, purple, pink, rose, orange per V2 forbidden rules
export const TAG_COLORS = [
  '#0D9488', // Teal-600 (brand primary)
  '#14B8A6', // Teal-500 (brand secondary)
  '#0F766E', // Teal-700 (deeper teal)
  '#2DD4BF', // Teal-400 (lighter teal)
  '#475993', // Steel Blue (chart-primary)
  '#94A3B8', // Platinum-400 (secondary accent)
  '#64748B', // Platinum-500 (muted)
  '#7DD3FC', // Frost (chart-frost)
  '#10B981', // Emerald (protected state)
  '#F59E0B', // Amber (warning semantic)
  '#3B82F6', // Blue (info semantic)
  '#115E59', // Teal-800 (deep accent)
] as const;

// ── Semantic Colors (exact PDF V2 Section 4.4 values) ─────────────
// success = TEAL (generic success) — PDF says use teal, NOT emerald for generic
// protected = EMERALD — reserved exclusively for "protected" safety states
// warning = AMBER — attention, premium features, coverage gaps
// danger = RED — unprotected, at risk, errors, disputes
// info = BLUE — informational, neutral, links
// premium = PLATINUM — engineered precision, institutional quality
export const SEMANTIC_COLORS = {
  success:   '#14B8A6',  // Teal-500 — generic success (PDF: "use teal for generic success")
  protected: '#10B981',  // Emerald — PROTECTED state ONLY (PDF: Pavlovian safety signal)
  warning:   '#F59E0B',  // Amber — attention, premium, value
  danger:    '#EF4444',  // Red — unprotected, at risk, error
  info:      '#3B82F6',  // Blue — informational, neutral, links
  premium:   '#94A3B8',  // Platinum-400 — replaces #B5953C brass gold
  neutral:   '#64748B',  // Platinum-500
} as const;

// ── Template Block Colors (V2-compliant: teal/platinum/steel/emerald) ──
// Used in: InvoiceTemplateImportDialog, TemplateImportDialog
// NO indigo, violet, purple — FORBIDDEN per V2 Section 9
export const BLOCK_COLORS = {
  header:    '#0D9488',  // Teal-600 — brand primary
  body:      '#475993',  // Steel Blue — chart-primary
  footer:    '#94A3B8',  // Platinum-400 — secondary accent
  terms:     '#F59E0B',  // Amber — warning semantic
  table:     '#14B8A6',  // Teal-500 — brand secondary
  signature: '#10B981',  // Emerald — protected signal
} as const;

// ── Risk/Severity Colors (V2-compliant palette) ───────────────────
// Uses semantic colors from V2: danger → warning → platinum → teal → emerald
export const RISK_COLORS = {
  critical: '#EF4444',  // Red-500 — danger (unprotected, critical)
  high:     '#F59E0B',  // Amber-500 — warning (attention needed)
  medium:   '#94A3B8',  // Platinum-400 — secondary accent (elevated attention)
  low:      '#14B8A6',  // Teal-500 — generic success (manageable)
  minimal:  '#10B981',  // Emerald — protected (safe state)
} as const;

// ── Platform Brand Colors (external — not tokenizable) ─────────────
// These are third-party brand colors and intentionally hardcoded
export const PLATFORM_COLORS = {
  google: { blue: '#4285F4', green: '#34A853', yellow: '#FBBC05', red: '#EA4335' },
  microsoft: { red: '#F25022', blue: '#00A4EF', green: '#7FBA00', yellow: '#FFB900' },
  upwork: '#14A800',
  fiverr: '#1DBF73',
  toptal: '#204ECF',
  freelancer: '#29B2FE',
  shopify: '#5C6AC4',
  twitter: '#1DA1F2',
  facebook: '#4267B2',
  linkedin: '#0077B5',
  whatsapp: '#25D366',
} as const;

// ── Gradient Presets (JS equivalents of CSS --gradient-* tokens) ───
// PDF Section 5.3: Matte gradient recipes — 5 approved gradients only
export const GRADIENTS = {
  institutional:  'linear-gradient(180deg, #0F172A 0%, #1E293B 100%)',
  tealVeil:       'linear-gradient(135deg, #0F172A 0%, #0C1A2A 100%)',
  cardElevate:    'linear-gradient(180deg, #1E293B 0%, #253347 100%)',
  heroAccent:     'linear-gradient(135deg, rgba(13,148,136,0.15) 0%, transparent 100%)',
  steelHorizon:   'linear-gradient(135deg, #1E293B 0%, #2A3A52 50%, #1E293B 100%)',
  // Legacy aliases for backward compatibility
  pagePro:        'linear-gradient(180deg, #0F172A 0%, #1E293B 100%)',
  pageExpert:     'linear-gradient(180deg, #0F172A 0%, #1E293B 100%)',
  dotPattern:     'radial-gradient(var(--platinum-500) 1px, transparent 1px)',
  gridPattern:    'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(to right, var(--border) 1px, transparent 1px)',
} as const;

// ── Teal Scale (PDF Section 4.1: Brand Primary) ───────────────────
// The color of protection. Bridges blue/trust + green/safety.
export const TEAL_SCALE = {
  50:  '#F0FDFA',
  100: '#CCFBF1',
  200: '#99F6E4',
  300: '#5EEAD4',
  400: '#2DD4BF',
  500: '#14B8A6',  // Light mode brand primary
  600: '#0D9488',  // Dark mode brand primary
  700: '#0F766E',  // Interactive hover
  800: '#115E59',  // Active/pressed
  900: '#134E4A',  // Deep accent
} as const;

// ── Platinum Scale (PDF Section 4.1: Brand Secondary) ─────────────
// Replaces brass gold. Signals engineered precision, institutional quality.
export const PLATINUM_SCALE = {
  100: '#F1F5F9',
  200: '#E2E8F0',
  300: '#CBD5E1',
  400: '#94A3B8',  // Secondary accent — replaces #B5953C
  500: '#64748B',
  600: '#475569',
  700: '#334155',
  800: '#1E293B',
  900: '#0F172A',
} as const;

// ── Helper: Get CSS variable value at runtime ──────────────────────
export function getCSSVar(name: string): string {
  if (typeof document === 'undefined') return '';
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

// ── Helper: Get stage color with dark mode support ─────────────────
export function getStageColor(stage: string): string {
  return getCSSVar(`--stage-${stage}`) || (STAGE_COLORS as Record<string, string>)[stage] || '#64748B';
}
