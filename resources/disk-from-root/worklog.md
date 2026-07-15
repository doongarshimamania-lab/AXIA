---
Task ID: 4
Agent: full-stack-developer
Task: Phase 4 - Bulk import + custom fields

Work Log:
- Read existing files: `clients/bulkImport.ts`, `pipeline/bulkImport.ts`, `schema.ts`, `permissions.ts`, `tables/clients.ts`, `tables/pipeline.ts`, `tables/projects.ts`, `sharedValidators.ts`, `clients/crud.ts`, `pipeline/crud.ts`
- Discovered both bulkImport files already had basic implementations with strict `v.object()` args
- Enhanced `clients/bulkImport.ts` with: flexible `records: v.array(v.any())` for CSV import, `fieldMapping` parameter, `CLIENT_CORE_FIELDS` definition (adapted to match existing schema fields: clientName, platform, hourlyRate, contractType, riskLevel, contactEmail, contactName, notes), `getClientImportFields` query, custom field separation logic, intra-batch duplicate detection, and preserved backwards-compatible `bulkImportClients` mutation
- Enhanced `pipeline/bulkImport.ts` with: flexible `records: v.array(v.any())`, `fieldMapping` parameter, `DEAL_CORE_FIELDS` definition (title, value, probability, source, contactName, contactEmail, expectedCloseDate, notes), `getDealImportFields` query, custom field separation, date parsing, and preserved backwards-compatible `bulkImportDeals` mutation
- Created `tables/customFields.ts` with `customFieldDefinitions` table: workspaceId, tableName, fieldName, label, type (text/number/boolean/date/select), options, required, order, createdAt — with indexes `by_workspace_and_table` and `by_workspace`
- Updated `schema.ts` to import and spread `customFieldTables`
- Created `customFields/crud.ts` with: `getFields` (query by workspace+tableName), `getAllFields` (query by workspace), `getField` (query by ID), `createField` (with uniqueness validation and auto-ordering), `updateField` (partial updates, type/options validation), `deleteField` (requires manager role), `reorderFields` (bulk reorder)
- Created `customFields/validate.ts` with: `validateCustomFields()` (validates custom field values against definitions — checks required, number, boolean, date, select types), `coerceCustomFields()` (converts raw CSV values to proper JS types), and `FieldDefinition` interface

Stage Summary:
- 6 files created/modified:
  1. `src/convex/clients/bulkImport.ts` — Enhanced with CSV field mapping, core field definitions, `importClients` + `getClientImportFields` + legacy `bulkImportClients`
  2. `src/convex/pipeline/bulkImport.ts` — Enhanced with CSV field mapping, core field definitions, `importDeals` + `getDealImportFields` + legacy `bulkImportDeals`
  3. `src/convex/tables/customFields.ts` — New `customFieldDefinitions` table schema
  4. `src/convex/schema.ts` — Updated to include `customFieldTables`
  5. `src/convex/customFields/crud.ts` — Full CRUD for custom field definitions (6 functions)
  6. `src/convex/customFields/validate.ts` — Validation + coercion utilities for custom fields
