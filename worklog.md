# Task 6: Centralize Hardcoded UI Color Values — Worklog

**Date:** 2026-03-05
**Agent:** Task 6 Agent

## Summary

Replaced all hardcoded hex color values in 3 TSX data files with token references from `@/lib/tokens`, and updated `tokens.ts` with new entries to cover previously missing colors.

## Files Modified

### 1. `src/lib/tokens.ts` (expanded)
- **Added `neutral: '#6B7280'`** to `SEMANTIC_COLORS` (Gray-500, used for "Other" source in Pipeline)
- **Expanded `TAG_COLORS`** from 10 to 15 entries, adding:
  - `#F97316` (Orange) at index 6
  - `#84CC16` (Lime) at index 8
  - `#0EA5E9` (Sky) at index 12
  - `#64748B` (Slate-500) at index 13
  - `#475569` (Slate-600) at index 14
- Existing entries shifted: Amber→7, Green→9, Teal→10, Blue→11

### 2. `src/hooks/use-app-data.tsx` (31 hex refs → 0)
- Added `import { STAGE_COLORS } from "@/lib/tokens"`
- Replaced all `stageColor: "#6366f1"` → `STAGE_COLORS.lead` (5 lead deals)
- Replaced all `stageColor: "#8b5cf6"` → `STAGE_COLORS.qualified` (4 qualified deals)
- Replaced all `stageColor: "#a855f7"` → `STAGE_COLORS.proposal` (4 proposal deals + 4 linkedDeal refs)
- Replaced all `stageColor: "#c084fc"` → `STAGE_COLORS.negotiation` (4 negotiation deals + 2 linkedDeal refs)
- Replaced all `linkedDeal.stageColor` hex values with corresponding `STAGE_COLORS.*` references (11 linkedDeal refs)

### 3. `src/pages/Pipeline.tsx` (11 hex refs → 0)
- Added `import { STAGE_COLORS, PLATFORM_COLORS, SEMANTIC_COLORS } from "@/lib/tokens"`
- `MOCK_STAGES`: replaced 4 hardcoded stage hex colors with `STAGE_COLORS.lead/qualified/proposal/negotiation`
- `SOURCE_OPTIONS`: replaced `#14a800` → `PLATFORM_COLORS.upwork`, `#00b22d` → `PLATFORM_COLORS.fiverr`, `#0a66c2` → `PLATFORM_COLORS.linkedin`, `#f59e0b` → `STAGE_COLORS.lead` (for "direct"), `#6b7280` → `SEMANTIC_COLORS.neutral`
- `StatsCard accent`: replaced `"#6366f1"` → `{STAGE_COLORS.lead}`, `"#a855f7"` → `{STAGE_COLORS.proposal}` (changed from string prop to expression)

### 4. `src/pages/Tags.tsx` (13 hex refs → 0)
- Added `import { TAG_COLORS, SEMANTIC_COLORS } from "@/lib/tokens"`
- `PRESET_COLORS`: replaced 12-element hardcoded array with `[...TAG_COLORS]`
- `MOCK_TAGS`: replaced 10 hardcoded `color` hex values with `TAG_COLORS[index]` references:
  - Urgent: `TAG_COLORS[5]`, Design: `TAG_COLORS[2]`, Development: `TAG_COLORS[9]`
  - Client Communication: `TAG_COLORS[13]`, Bug Fix: `TAG_COLORS[6]`, Documentation: `TAG_COLORS[14]`
  - Revision: `TAG_COLORS[7]`, Research: `TAG_COLORS[0]`, Testing: `TAG_COLORS[3]`, Payment: `TAG_COLORS[8]`

### 5. `src/pages/Invoices.tsx` and `src/pages/InvoiceBuilder.tsx`
- Verified: no hardcoded hex color values found. No changes needed.

## Verification
- `npx vite build` completed successfully (built in 9.36s)
- All 55+ hardcoded hex references eliminated from TSX data files
- All colors now reference centralized tokens from `@/lib/tokens`
