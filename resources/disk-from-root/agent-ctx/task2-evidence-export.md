# Task 2: EvidenceExport.tsx — Wire to Convex Data

## Summary
Wired EvidenceExport.tsx from 100% mock data to real Convex data sources.

## Convex Functions Used
- `api.evidence.library.getEvidenceLibraryData` — evidence items, healthScore, contentQualityScore
- `api.clients.crud.getClients` — client list
- `api.scope.crud.getScopeDefinitions` — scope/project definitions

## Changes Made
1. Replaced MOCK_EVIDENCE_TYPES with real evidence type counts from getEvidenceLibraryData
2. Replaced MOCK_PROJECTS with real scope definitions from Convex
3. Replaced MOCK_CLIENTS with real client data from Convex
4. Derived compliance score from real healthScore data
5. Added loading skeletons and empty states
6. Added demo mode banner when not authenticated
7. Kept existing UI layout
