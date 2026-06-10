/**
 * AXIA V2 Design Tokens — Single Source of Truth
 *
 * All color, spacing, and UI values used in JavaScript/TypeScript code
 * should reference these tokens. Never hardcode hex values in components.
 *
 * CSS custom properties (globals.css) are the canonical source for
 * Tailwind classes. This file provides JS-accessible equivalents for
 * data-driven scenarios (pipeline stages, tag colors, chart colors, etc.)
 */

// ── Pipeline Stage Colors ──────────────────────────────────────────
// Used in: Pipeline.tsx, use-app-data.tsx, autoSeed.ts, workspaces/crud.ts
// CSS tokens: --stage-lead, --stage-qualified, etc.
export const STAGE_COLORS = {
  lead: '#6366F1',        // Indigo-500
  qualified: '#8B5CF6',   // Violet-500
  proposal: '#A855F7',    // Purple-500
  negotiation: '#C084FC', // Purple-400
  won: '#22C55E',         // Green-500
  lost: '#EF4444',        // Red-500
} as const;

// ── Tag Preset Colors ──────────────────────────────────────────────
// Used in: Tags.tsx, autoSeed.ts
export const TAG_COLORS = [
  '#6366F1', // Indigo
  '#8B5CF6', // Violet
  '#A855F7', // Purple
  '#EC4899', // Pink
  '#F43F5E', // Rose
  '#EF4444', // Red
  '#F97316', // Orange
  '#F59E0B', // Amber
  '#84CC16', // Lime
  '#22C55E', // Green
  '#14B8A6', // Teal
  '#3B82F6', // Blue
  '#0EA5E9', // Sky
  '#64748B', // Slate-500
  '#475569', // Slate-600
] as const;

// ── Semantic Colors (JS equivalents of CSS tokens) ─────────────────
// These mirror globals.css :root values for use in inline styles / JS logic
export const SEMANTIC_COLORS = {
  success: '#16A34A',
  warning: '#D97706',
  danger: '#DC2626',
  info: '#2563EB',
  indigo: '#4F46E5',
  premium: '#94A3B8',  // platinum-400
  neutral: '#6B7280',  // Gray-500
} as const;

// ── Template Block Colors (Invoice/Proposal builders) ──────────────
// Used in: InvoiceTemplateImportDialog, TemplateImportDialog
export const BLOCK_COLORS = {
  header: '#6366F1',     // Indigo
  body: '#3B82F6',       // Blue
  footer: '#8B5CF6',     // Violet
  terms: '#F59E0B',      // Amber
  table: '#14B8A6',      // Teal
  signature: '#A855F7',  // Purple
} as const;

// ── Risk/Severity Colors ───────────────────────────────────────────
// Used in: ProjectRiskTimeline components
export const RISK_COLORS = {
  critical: '#DC2626',   // Red-600
  high: '#EF4444',       // Red-500
  medium: '#F59E0B',     // Amber-500
  low: '#22C55E',        // Green-500
  minimal: '#14B8A6',    // Teal-500
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
export const GRADIENTS = {
  pagePro: 'linear-gradient(to bottom, var(--page-bg-from), var(--page-bg-to))',
  pageExpert: 'linear-gradient(to bottom, var(--page-bg-from), var(--page-bg-to))',
  dotPattern: 'radial-gradient(var(--platinum-500) 1px, transparent 1px)',
  gridPattern: 'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(to right, var(--border) 1px, transparent 1px)',
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
