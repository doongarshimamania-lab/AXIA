# Task 6: Centralize Hardcoded UI Color Values

## Agent: Task 6 Agent

## Summary
Replaced all hardcoded hex color values in 3 TSX data files with token references from `@/lib/tokens`, and expanded `tokens.ts` with new entries to cover previously missing colors.

## Files Modified

### 1. `src/lib/tokens.ts` (expanded)
- Added `neutral: '#6B7280'` to `SEMANTIC_COLORS`
- Expanded `TAG_COLORS` from 10 to 15 entries (added Orange, Lime, Sky, Slate-500, Slate-600)

### 2. `src/hooks/use-app-data.tsx` (31 hex refs → 0)
- Added `import { STAGE_COLORS } from "@/lib/tokens"`
- Replaced all 31 `stageColor` and `linkedDeal.stageColor` hex values with `STAGE_COLORS.*` references

### 3. `src/pages/Pipeline.tsx` (11 hex refs → 0)
- Added `import { STAGE_COLORS, PLATFORM_COLORS, SEMANTIC_COLORS } from "@/lib/tokens"`
- Replaced MOCK_STAGES, SOURCE_OPTIONS, and StatsCard accent hex values with token references

### 4. `src/pages/Tags.tsx` (13 hex refs → 0)
- Added `import { TAG_COLORS, SEMANTIC_COLORS } from "@/lib/tokens"`
- Replaced PRESET_COLORS with `[...TAG_COLORS]`
- Replaced 10 MOCK_TAGS color hex values with `TAG_COLORS[index]` references

### 5. `src/pages/Invoices.tsx` and `src/pages/InvoiceBuilder.tsx`
- No hardcoded hex colors found. No changes needed.

## Verification
- `npx vite build` completed successfully
- All 55+ hardcoded hex references eliminated from TSX data files
