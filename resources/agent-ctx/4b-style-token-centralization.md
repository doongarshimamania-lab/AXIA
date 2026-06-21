# Task 4b — Style Token Centralization Agent

## Task
Centralize hardcoded UI values (hex colors, inline styles) in the AXIA project to use design tokens and Tailwind utility classes.

## Changes Made

### TruthLayerWidget.tsx
- Replaced 9 instances of `#4F46E5` with `indigo` design token variants (`text-indigo`, `border-indigo/20`, `from-indigo/5`, `to-indigo/3`, `bg-indigo/10`)
- Replaced `hover:text-[#4338CA]` with `hover:text-indigo`

### ProjectRiskTimelinePro.tsx
- Replaced 11+ hardcoded hex values with semantic tokens:
  - Navy `#0f2545` → `primary/40`
  - Red hex values → `danger`, `danger/50`, `danger/60`
  - Amber hex values → `warning`, `warning/70`, `warning/80`
  - Blue hex values → `primary/70`, `primary/80`, `info`

### Auth.tsx
- Replaced 2 instances of `bg-[#5C6AC4]` → `bg-indigo`
- Replaced 2 instances of `hover:bg-[#4A56B0]` → `hover:bg-indigo/90`

### main.tsx
- Converted error boundary from inline styles to Tailwind utility classes with dark mode support

## Build Status
✅ `npx vite build` succeeds — no errors
