# AXIA — Multi-Agent Worklog

This file is the shared scratchpad for parallel agents inspecting the AXIA codebase at `/home/z/my-project/axia/`. Each agent appends a section delimited by `---` with `Task ID` and `Agent` headers. Do not modify other agents' sections.

---

Task ID: 3
Agent: Explore (data flow mapping)

# AXIA — Comprehensive Data Flow Map

## 0. Methodology & Scope

Read every file in `src/convex/tables/*.ts` (skipping `.disabled`), `src/convex/schema.ts`, the auth/onboarding chain (`Auth.tsx`, `use-auth.ts`, `use-workspace.tsx`, `OnboardingUserInformation.tsx`, `OnboardingSource.tsx`, `ProtectedRoute.tsx`, `convex/users.ts`, `convex/auth.ts`, `convex/auth.config.ts`, `convex/workspaces/crud.ts`), the convert-to-project chain (`Proposals.tsx`, `Projects.tsx`, `WorkflowActions.tsx`, `projects/projectProtectionSimple.ts`, `proposals/crud.ts`, `clients/crud.ts`, `scope/crud.ts`, `billing/crud.ts`, `pipeline/crud.ts`), the TimeTracking page, plus a survey of `Goals.tsx`, `Tags.tsx`, `Messages.tsx`, `Invoices.tsx`, `InvoiceBuilder.tsx`, `ProposalBuilder.tsx`, `PaymentPatterns.tsx`, `Reports.tsx`, `EvidenceLibrary.tsx`, `TeamManagement.tsx`, `ClientSignup.tsx`, `Landing.tsx`, `AccountSettings.tsx`, `Dashboard.tsx`, `Scope.tsx`, `Clients.tsx`. All line numbers below refer to the files as they exist on the inspected commit. No files were modified.

The single most important structural finding is that the schema in `src/convex/schema.ts` only imports tables from a subset of the `tables/*.ts` files. The "extra" files (`tables/clients.ts`, `tables/business.ts`, `tables/platform.ts`, `tables/work.ts`, `tables/security.ts`) define duplicate, **dead** versions of the same tables (clients, deals, pipelineStages, workSessions, proposals, etc.) that the schema never registers. These dead files are also out of sync — they have stale field shapes — so any reader who picks up `tables/business.ts` thinking it is canonical will be misled.

---

## 1. Entity Schema Map

`schema.ts` imports these 18 table groups (in this order):

```
authTables (from @convex-dev/auth)   → accounts, verificationCodes, etc.
users                                  → users
workspaceTables (workspaces.ts)       → workspaces, workspaceMembers, workspaceInvitations
teamTables (teams.ts)                 → teams, teamMemberships
complianceTables (compliance.ts)      → auditTrail, consentManagement, complianceCertificates,
                                         dataLineage, consentAudits, platformComplianceChecks
trackingTables (tracking.ts)          → workSessions, timeBlocks, appUsage, complianceAlerts
evidenceTables (evidence.ts)          → evidenceSessions, evidenceEvents, wcvmVerifications,
                                         evidenceMetadata
projectTables (projects.ts)           → clientPolicies, clients, projects, clientCompanies,
                                         verificationRequests, clientVerificationResults,
                                         freelancerPublicProfiles, clientActivityLog,
                                         clientWorkspaceTokens
featureTables (features.ts)           → extensionTokens, networkConnections, platformConnections,
                                         platformImportedData, crossPlatformVerifications,
                                         protectionAdvisorAlerts, teamValidations, disputeReports,
                                         automatedDisputeReports, policyIntelligence, upgradeTriggers,
                                         upgradeConversions, waitlistEntries, protectionPlans,
                                         milestoneSnapshots, milestoneAlerts, milestoneReports,
                                         scopeFormalizations
pipelineTables (pipeline.ts)          → pipelineStages, deals
proposalTables (proposals.ts)         → proposals, proposalTemplates, proposalFollowUps,
                                         proposalFollowUpSettings
billingTables (billing.ts)            → invoices, invoiceWorkLinks, paymentReminders, reminderSettings,
                                         invoiceTemplates, recurringInvoices
scopeTables (scope.ts)                → scopeDefinitions, scopeChangeOrders
messagingTables (messaging.ts)        → channels, channelMembers, messages, reactions, mentions
tagTables (tags.ts)                   → tags
goalTables (goals.ts)                 → goals
customFieldTables (customFields.ts)   → customFieldDefinitions
notificationTables (notifications.ts) → notifications
manualSendTables (manualSends.ts)     → manualSendLogs
```

Total: ~50 tables. Below is the entity-by-entity breakdown. **Only the columns needed to understand the data flow are listed** — full validators are in the source.

### 1.1 users (`tables/users.ts`)

- Key fields: `name`, `email` (indexed), `image`, `role` ("admin" | "user"), `subscriptionTier` ("free" | "starter" | "pro" | "expert"), `hourlyRate`, `primaryPlatform`, `yearsExperience`, `professionalBio`, `acquisitionSource`, `acquisitionSourceDetail`, `onboardingComplete`, `onboardingCompletedAt`, `connectedPlatforms`, `protectedHours`, `protectedValue`, `totalRejectedHours`, `totalLostIncome`, `joinedAt`, `tierUpgradedAt`.
- Foreign keys: none.
- Indexes: `email`.
- Owner/workspace fields: none (a user is global; workspace membership is via `workspaceMembers`).
- Notes: `role` and `subscriptionTier` are BOTH on the user doc, but `subscriptionTier` is now admin-only (`users.ts:107 setUserTier`). `updateProfile` (`users.ts:53`) deliberately omits `subscriptionTier` to prevent billing bypass.

### 1.2 workspaces (`tables/workspaces.ts`)

- Key fields: `ownerId` → `users`, `name`, `type` ("personal" | "team"), `description`, `avatar`, `createdAt`, `updatedAt`.
- Indexes: `by_owner`, `by_owner_and_type`.
- Notes: First-class top-level organizational unit. Every business record (clients, projects, deals, etc.) optionally carries `workspaceId` for scoping.

### 1.3 workspaceMembers

- Key fields: `workspaceId` → `workspaces`, `userId` → `users`, `role` ("owner" | "manager" | "member"), `status` ("active" | "invited" | "removed"), `title`, `joinedAt`, `invitedBy` → `users`, `lastActiveAt`.
- Indexes: `by_workspace`, `by_user`, `by_workspace_and_user`, `by_workspace_and_status`, `by_workspace_and_role`.
- Notes: This is the canonical user↔workspace link. `clients.assignedMemberIds` (in `projects.ts`) is typed as `Id<"workspaceMembers">[]` — i.e. assignments reference memberships, not users directly. (Schema comment at `tables/workspaces.ts:14-19` explains why.)

### 1.4 workspaceInvitations

- Key fields: `workspaceId`, `email`, `role` (manager|member — owner is excluded), `token`, `invitedBy`, `status` (pending | accepted | cancelled | expired), `createdAt`, `expiresAt`.
- Indexes: `by_workspace`, `by_email`, `by_token`, `by_workspace_and_status`, `by_status_and_expires`.

### 1.5 teams + teamMemberships (`tables/teams.ts`)

- `teams`: `workspaceId` (required), `name`, `color`, `icon`, `description`, `isCrossTeam` (management team that sees everything), `createdAt`, `updatedAt`. Index: `by_workspace`.
- `teamMemberships`: `teamId`, `userId`, `workspaceId`, `role` (lead | member), `joinedAt`. Indexes: `by_team`, `by_user`, `by_workspace_and_user`, `by_team_and_user`.
- Notes: Teams are an organizational layer *inside* a workspace (sub-groups). Many business records have an optional `teamId` for further filtering. `isCrossTeam` is the "management team" concept.

### 1.6 clients (`tables/projects.ts:38` — NOT `tables/clients.ts`)

- Key fields: `userId` (required), `workspaceId` (optional), `createdBy`, `teamId`, `sharing[]`, `customFields`, `clientName` (canonical), `name` (CRM alias — kept in sync), `email`, `company`, `phone`, `industry`, `website`, `notes`, `address{street,city,state,zip,country}`, `status` (active | archived | lead), `source`, `platform` (upwork | fiverr | toptal | freelancer | direct), `hourlyRate`, `contractType`, `riskLevel`, `contactEmail`, `contactName`, `avgPaymentDays`, `onTimeRate`, `totalPaid`, `totalInvoiced`, `lastPaymentAt`, `assignedMemberIds` → `workspaceMembers[]`, timestamps.
- Foreign keys: `userId` → users, `workspaceId` → workspaces, `teamId` → teams, `assignedMemberIds` → workspaceMembers.
- Indexes: `by_user`, `by_user_and_name`, `by_user_and_status`, `by_workspace`, `by_team`.
- Notes: The `clientName` vs `name` duplication is documented at `tables/projects.ts:46-50` — `clientName` is canonical, `name` is a CRM alias. `clients/crud.ts:144` writes both at insert time.

### 1.7 clientCompanies (`tables/projects.ts:155`)

- Key fields: `workspaceId`, `email`, `companyName`, `contactName`, `industry`, `companySize`, `website`, `verificationCount`, `subscriptionTier`, timestamps.
- Indexes: `by_email`, `by_workspace`.
- Notes: A SEPARATE table from `clients`. This is the *client-portal* user table — companies that hire freelancers via Axia. Created via `clients/clientAuth.ts:7 registerClient` from `ClientSignup.tsx`. Has NO foreign key back to `clients` — the two tables are parallel and never linked. This is a significant data-flow split (see §4).

### 1.8 verificationRequests, clientVerificationResults, clientActivityLog, clientWorkspaceTokens, freelancerPublicProfiles

- All in `tables/projects.ts`. These orbit `clientCompanies` (the client-portal side) and `clients` (the freelancer-CRM side) separately.
- `clientWorkspaceTokens` links `clientId` → `clients` (freelancer side) and a free-text `freelancerUserId` (string, not a FK). Used to give a client portal access to a freelancer's workspace.

### 1.9 projects (`tables/projects.ts:106`)

- Key fields: `userId` (required), `workspaceId`, `createdBy`, `teamId`, `sharing[]`, `customFields`, `clientId` → `clients` (required), `projectName`, `hourlyRate`, `projectType` (ongoing | fixed | milestone), `protectionLevel` (standard | enhanced | maximum), `status` (active | archived), timestamps, plus ~15 derived/optional metrics (`evidenceCount`, `upworkCompliance`, `pattern7Vulnerability`, `weeklyIncome`, `avgProjectValue`, etc.).
- Foreign keys: `userId` → users, `workspaceId` → workspaces, `teamId` → teams, `clientId` → clients (required), `createdBy` → users.
- Indexes: `by_user`, `by_user_and_name`, `by_client`, `by_workspace`, `by_team`, `by_creator`.
- Notes: `clientId` is REQUIRED at the schema level — you cannot create a project without linking a client. There is **no `deleteProject` mutation anywhere** in `src/convex` (verified via grep). Projects can only be archived.

### 1.10 pipelineStages (`tables/pipeline.ts:6`)

- Key fields: `userId` (required), `workspaceId`, `createdBy`, `name`, `color`, `order`, `isDefault`, `createdAt`.
- Indexes: `by_user`, `by_user_and_order`, `by_workspace`, `by_creator`.
- Notes: Default 6 stages (Lead, Qualified, Proposal, Negotiation, Won, Lost) are seeded in THREE places: `workspaces/crud.ts:createWorkspace` (line 229), `workspaces/crud.ts:seedPersonalWorkspace` (line 412), and `pipeline/crud.ts:createDefaultStages` (line 187). Each uses a slightly different color palette. This triple-seeding is the root cause of the historical "multiple pipeline kanban boards" bug (see §2).

### 1.11 deals (`tables/pipeline.ts:21`)

- Key fields: `userId`, `workspaceId`, `stageId` → `pipelineStages` (required), `clientId` → `clients` (optional), `proposalId` → `proposals` (optional), `title`, `description`, `value`, `probability` (0-100), `currency`, `source`, `contactEmail`, `contactName`, `expectedCloseDate`, `notes`, `order`, `createdBy`, `teamId`, `sharing[]`, `customFields`, timestamps.
- Indexes: `by_user`, `by_stage`, `by_user_and_stage`, `by_workspace`, `by_team`, `by_creator`.
- Notes: `clientId` and `proposalId` are both OPTIONAL — a deal can float without either. The "Convert to Project" action lives on a signed *proposal*, not on a deal (see §3). Deals and proposals are linked bidirectionally via `pipeline/crud.ts:linkDealToProposal` (line 458), which patches both sides.

### 1.12 scopeDefinitions + scopeChangeOrders (`tables/scope.ts`)

- `scopeDefinitions`: `userId`, `workspaceId`, `projectId` (optional!), `proposalId` (optional!), `title`, `description`, `deliverables[]` (id, name, description, estimatedHours, status), `totalEstimatedHours`, `revisionLimit`, `revisionCount`, `status` (active | completed | disputed), `clientApprovedAt`, `approvalToken`, `createdBy`, `teamId`, `sharing[]`, timestamps.
  - Indexes: `by_user`, `by_project`, `by_proposal`, `by_approval_token`, `by_workspace`, `by_team`.
- `scopeChangeOrders`: `userId`, `workspaceId`, `scopeId` → `scopeDefinitions` (required), `title`, `description`, `changeType` (addition | modification | removal | revision), `impact{hoursAdded,costImpact,deadlineImpact}`, `reason`, `status` (pending | approved | rejected | auto_generated), `clientApprovalToken`, `clientApprovedAt`, `autoGenerated`, `originalLimit`, `newLimit`, `createdBy`, `teamId`, `sharing[]`, `createdAt`.
  - Indexes: `by_scope`, `by_user`, `by_approval_token`, `by_workspace`, `by_team`.
- Notes: Both `projectId` and `proposalId` are OPTIONAL on a scope — a scope can be created without either (and the Scope page does exactly this; see §5). The `business.ts` dead-file version of `scopeDefinitions` has a DIFFERENT shape (deliverables have `revisionLimit` per-deliverable, plus `exclusions[]` and `assumptions[]` arrays) — that dead schema is not what runs in production.

### 1.13 proposals + proposalTemplates + proposalFollowUps + proposalFollowUpSettings (`tables/proposals.ts`)

- `proposals`: `userId`, `workspaceId`, `clientId` → clients (OPTIONAL!), `dealId` → deals (optional), `title`, `status` (draft | sent | viewed | signed | declined | expired), `publicToken`, `sections[]` (id, type, content, metadata), `totalValue`, `currency`, `validUntil`, `templateId`, `clientName` (denormalized string), `clientEmail` (denormalized string), `sentAt`, `viewedAt`, `signedAt`, `signatureData`, `notes`, `createdBy`, `teamId`, `sharing[]`, `customFields`, timestamps.
  - Indexes: `by_user`, `by_status`, `by_user_and_status`, `by_public_token`, `by_workspace`, `by_team`.
- `proposalTemplates`: `userId` (optional — system templates have none), `workspaceId`, `createdBy`, `name`, `industry`, `description`, `sections[]`, `isSystem`, `usageCount`, `createdAt`.
- `proposalFollowUps`: `userId`, `workspaceId`, `createdBy`, `proposalId` → proposals (required), `dayNumber` (3, 7, 14), `subject`, `body`, `channel` (email | sms | whatsapp), `status` (scheduled | due | sent | skipped | cancelled), `scheduledAt`, `sentAt`, `createdAt`.
- `proposalFollowUpSettings`: per-user master toggle.
- Notes: `clientId` is OPTIONAL on proposals — the ProposalBuilder page never sends it (§5, §6). The denormalized `clientName`/`clientEmail` strings on the proposal are what the convert-to-project flow reads to find/create the matching `clients` row.

### 1.14 invoices + invoiceWorkLinks + paymentReminders + reminderSettings + invoiceTemplates + recurringInvoices (`tables/billing.ts`)

- `invoices`: `userId`, `workspaceId`, `clientId` → clients (OPTIONAL at schema, but `billing/crud.ts:createInvoice` REQUIRES it via `v.id("clients")`), `projectId` → projects (optional), `proposalId` → proposals (optional), `invoiceNumber`, `publicToken`, `status` (draft | sent | viewed | paid | partial | overdue | cancelled), `issueDate`, `dueDate`, `paidDate`, `paidAmount`, `clientName` (denormalized), `clientEmail` (denormalized), `lineItems[]`, `subtotal`, `taxRate`, `taxAmount`, `discountAmount`, `total`, `currency`, `notes`, `terms`, `stripePaymentIntentId`, `stripeInvoiceId`, `proofCount`, `hasValidatedBilling`, `sentAt`, `viewedAt`, `createdBy`, `teamId`, `sharing[]`, `customFields`, timestamps.
  - Indexes: `by_user`, `by_user_and_status`, `by_client`, `by_project`, `by_proposal`, `by_public_token`, `by_invoice_number`, `by_workspace`, `by_team`.
- `invoiceWorkLinks`: `userId`, `workspaceId`, `createdBy`, `invoiceId` → invoices (required), `lineItemId`, `proofType`, `title`, `description`, `hours`, `date`, `value`, `url`, `fileName`, `verified`, `workSessionId` → workSessions (optional), `createdAt`.
- `paymentReminders`: `userId`, `workspaceId`, `createdBy`, `invoiceId` → invoices (required), `dayNumber`, `sequenceDay` (alias), `channel`, `tone` (friendly | firm | urgent), `subject`, `body`, `status`, `scheduledAt`, `sentAt`, `createdAt`.
- `reminderSettings`, `invoiceTemplates`, `recurringInvoices`: see source.
- Notes: `billing/crud.ts:createInvoice` (line 162) requires `clientId: v.id("clients")` and *derives* `clientName`/`clientEmail` from the client doc (lines 208-212). But `InvoiceBuilder.tsx:452` calls `createInvoice` WITHOUT a `clientId` — it passes only the strings `clientName`/`clientEmail`. This is a mismatch that silently fails under `safe-convex-react` (errors are swallowed and a toast is shown). See §6.

### 1.15 workSessions + timeBlocks + appUsage + complianceAlerts (`tables/tracking.ts`)

- `workSessions`: `userId`, `workspaceId`, `createdBy`, `teamId`, `sharing[]`, `startTime`, `endTime`, `totalMinutes`, `complianceStatus`, `clientName` (string, not FK), `projectName` (string, not FK), `hourlyRate`, `platform`, `notes`, `isManualEntry`, `invoiced`, `status`, `clientId` → clients (optional), `projectId_fk` → projects (optional), `invoiceId` → invoices (optional), timestamps.
  - Indexes: `by_user`, `by_user_and_project`, `by_user_and_date`, `by_workspace`, `by_team`, `by_client`, `by_project_invoiced`, `by_invoice`.
- Notes: The schema HAS foreign-key columns `clientId`, `projectId_fk`, `invoiceId` for full linkage — BUT `tracking/crud.ts:startSession` (line 115) does not accept any of them as args. The mutation only takes `projectName`, `clientName` (strings), `hourlyRate`, `platform`, `notes`, `workspaceId`, `teamId`. So all sessions are created with FK columns left `undefined`, and downstream queries (e.g. `projectProtectionSimple.ts:23`) join sessions to projects by matching the `projectName` STRING, not by ID. This is a half-built relational upgrade.

### 1.16 evidenceSessions + evidenceEvents + wcvmVerifications + evidenceMetadata (`tables/evidence.ts`)

- `evidenceSessions`: `userId`, `workspaceId`, `createdBy`, `teamId`, `sharing[]`, `sessionId` → workSessions (required), `platform`, `startTime`, `endTime`, `status` (active | finalized).
- `evidenceEvents`: `workspaceId`, `evidenceSessionId` → evidenceSessions (required), `t` (timestamp ms), `kind` (mouse | keyboard | url | screenshot_ref | memo | platform_status), `data`, `url`.
- Notes: Evidence sessions are linked 1:1 to work sessions. No `projectId`/`clientId` on evidence — lineage flows through the parent work session.

### 1.17 goals (`tables/goals.ts`)

- `userId`, `workspaceId`, `createdBy`, `title`, `description`, `type` (string — "revenue"|"hours"|"clients"|"protection"|"custom"), `target`, `current`, `unit`, `deadline`, `status` (string), `milestones[]`, `streak`, `lastCheckIn`, timestamps.
- Indexes: `by_user`, `by_workspace`.
- Notes: `Goals.tsx:219` does not pass `workspaceId` even though the mutation accepts it — goals get created scoped only to `userId`.

### 1.18 tags (`tables/tags.ts`)

- `userId`, `workspaceId`, `createdBy`, `name`, `color`, `category` (string), `usageCount`, `createdAt`.
- Notes: Schema has `workspaceId` but no other table references `tags` by ID — there's no `tagIds[]` column on clients/projects/etc. The tag feature is essentially standalone today.

### 1.19 customFieldDefinitions (`tables/customFields.ts`)

- `workspaceId` (required), `tableName` (string — "clients"|"deals"|"projects"|etc.), `fieldName`, `label`, `type`, `options[]`, `required`, `order`, `createdAt`.
- Notes: Workspace-scoped field definitions. The actual values live in the `customFields: v.any()` blob on each business record (clients, deals, projects, proposals, invoices). There's no validation that the keys in `customFields` match the definitions — it's free-form JSON.

### 1.20 notifications + manualSendLogs + messaging tables

- `notifications` (`tables/notifications.ts`): `userId`, `workspaceId`, `type`, `title`, `body`, `link`, `entityType` (proposal | invoice | client | project | follow_up | reminder | other), `entityId` (string), `severity`, `read`, `dismissed`, timestamps. `entityId` is a STRING, not a typed FK, so it can point to any entity type without schema changes.
- `manualSendLogs` (`tables/manualSends.ts`): `userId`, `workspaceId`, `entityType` (proposal | invoice), `entityId` (string, not FK — kept flexible), `channel`, `recipient`, `subject`, `notes`, `sentAt`, `loggedAt`, `triggeredByNotificationId` → notifications.
- `channels`, `channelMembers`, `messages`, `reactions`, `mentions` (`tables/messaging.ts`): workspace-scoped chat. `messages.parentId` → messages for threading.

### 1.21 Dead/duplicate table files (NOT in schema)

- `tables/clients.ts` — defines `clientPolicies`, `clients`, `clientCompanies`, `verificationRequests`, `clientVerificationResults`, `clientActivityLog`. The schema imports these from `tables/projects.ts` instead. This file is referenced only by the generated type re-export in `_generated/api.d.ts:109` (a Convex codegen artifact), never at runtime.
- `tables/business.ts` — defines a SECOND `clients` table with `name` (not `clientName`) as the primary field, a SECOND `pipelineStages`, `deals`, `proposals`, `proposalTemplates`, `proposalFollowUps`, `scopeDefinitions`, `scopeChangeOrders`. All are unused. Contains a comment at line 223 acknowledging that `invoices` was moved to `billing.ts` — but the rest of the duplicates were never cleaned up.
- `tables/platform.ts` — duplicates `networkConnections`, `platformConnections`, `platformImportedData`, `crossPlatformVerifications`, `platformComplianceChecks`. Unused — the canonical versions live in `features.ts` and `compliance.ts`.
- `tables/work.ts` — duplicates `workSessions`, `timeBlocks`, `appUsage`, `disputeReports`, `complianceAlerts`. Unused — canonical versions in `tracking.ts` and `features.ts`. The dead `workSessions` here lacks the `clientId`/`projectId_fk`/`invoiceId` FK columns that the live version has.
- `tables/security.ts` — duplicates `auditTrail`, `consentManagement`, `complianceCertificates`, `dataLineage`, `consentAudits`, plus `extensionTokens` (with a `tokenHash`+`tokenSuffix` schema — better than the `token` plaintext in `features.ts`), and `rateLimits` (which IS used by `security/rateLimit.ts` — but `rateLimits` is somehow registered in the schema even though `security.ts` isn't imported; see §1.22).
- `tables/business.ts.disabled`, `tables/clients.ts.disabled`, `tables/platform.ts.disabled`, `tables/security.ts.disabled`, `tables/work.ts.disabled` — disabled variants of the above.

### 1.22 Where does `rateLimits` come from?

`tables/security.ts` defines `rateLimits` but `schema.ts` does not import `securityTables`. However, `security/rateLimit.ts` is invoked by nearly every mutation (e.g. `users.ts:65`, `clients/crud.ts:129`) via `rateLimitAuthenticated(ctx, "...")`. The `rateLimits` table must therefore be registered somewhere — likely the @convex-dev/auth `authTables` export pulls it in, OR there is a hidden import. This is worth verifying at runtime via `npx convex schema`.

### 1.23 `clientPolicies` (`tables/projects.ts:6`)

- `userId`, `workspaceId`, `createdBy`, `clientName` (string), `platform`, `requirements[]` (type, description, requirement, evidenceType), `documentUrl`, timestamps.
- Indexes: `by_user`, `by_workspace`.
- Notes: `clientPolicies` records a *client's* requirements (what evidence they need from the freelancer). Not linked to `clients` by FK — only by `clientName` string. Referenced by `policyIntelligence` table (in features.ts) via `clientPolicyId`.

### 1.24 Summary of cross-table linkage

| From → To | FK column | Required? | Notes |
|---|---|---|---|
| workspaces → users | `ownerId` | yes | |
| workspaceMembers → workspaces, users | `workspaceId`, `userId` | both yes | bidirectional user↔ws |
| clients → users, workspaces, teams | `userId`, `workspaceId?`, `teamId?`, `createdBy?` | only userId | workspaceId optional |
| projects → clients | `clientId` | yes | cannot create project without client |
| projects → users, workspaces, teams | various | userId only | |
| deals → pipelineStages | `stageId` | yes | |
| deals → clients, proposals | `clientId?`, `proposalId?` | no | both optional |
| proposals → clients, deals | `clientId?`, `dealId?` | no | BOTH OPTIONAL — major gap |
| scopeDefinitions → projects, proposals | `projectId?`, `proposalId?` | no | both optional |
| invoices → clients | `clientId` | yes (in mutation args) | BUT schema marks optional; InvoiceBuilder doesn't send it |
| invoices → projects, proposals | `projectId?`, `proposalId?` | no | |
| workSessions → clients, projects, invoices | `clientId?`, `projectId_fk?`, `invoiceId?` | no | FK columns exist but `startSession` mutation doesn't populate them |
| evidenceSessions → workSessions | `sessionId` | yes | |
| proposalFollowUps → proposals | `proposalId` | yes | |
| paymentReminders → invoices | `invoiceId` | yes | |
| invoiceWorkLinks → invoices, workSessions | `invoiceId`, `workSessionId?` | invoiceId yes | |
| customFieldDefinitions → workspaces | `workspaceId` | yes | |
| clientCompanies → workspaces | `workspaceId?` | no | NO link to `clients` table |
| notifications → users, workspaces | `userId`, `workspaceId?` | userId yes | `entityId` is a string, not a FK |

---

## 2. Auth → Onboarding → Dashboard Flow

### 2.1 Route map (from `src/main.tsx`)

- `/` — `Landing` (public).
- `/auth` — `Auth` (public). `redirectAfterAuth="/dashboard"`. Honors `?redirect=` (validated against `/^\/[a-zA-Z0-9_\-./?=&%]*$/` at `Auth.tsx:49` to prevent open-redirect). Honors `?mode=signup` to default the form to sign-up (`Auth.tsx:61`).
- `/waitlist/success` — public.
- `/client-dashboard`, `/client-login`, `/client-signup`, `/workspace/:token` — public client-portal routes.
- `/onboarding-user-information` — `ProtectedRoute`-wrapped. First onboarding step.
- `/onboarding-source` — `ProtectedRoute`-wrapped. Second onboarding step.
- `/dashboard` and all `/clients`, `/projects`, `/pipeline`, `/proposals`, `/invoices`, `/invoices/new`, `/proposals/new`, `/scope`, `/time-tracking`, `/reports`, `/goals`, `/tags`, `/messages`, `/evidence-library`, `/teams`, `/account-settings`, `/payment-patterns`, `/evidence-export`, `/protection-value`, `/network` — all wrapped in `ProtectedRoute` AND `DashboardLayout` (sidebar).
- `/platform-integrations`, `/subscription`, `/help-center` — legacy redirects, all point to `AccountSettings`.
- `/owner-dashboard`, `/owner` — separate admin route.
- `*` → `NotFound`.

### 2.2 Signup → auto-creation chain

1. User submits the sign-up form at `/auth?mode=signup`. `Auth.tsx:135 handlePasswordSignUp` calls `signIn("password", formData)` with `email`, `password`, `name`, `flow="signUp"`. Convex Auth (`convex/auth.ts`) registers the user via the Password provider and creates a row in the `users` table (the `authTables` users — same table the app reads).
2. On success, `Auth.tsx:164` calls `navigate(redirect)` where redirect defaults to `/dashboard`. **The user is sent DIRECTLY to `/dashboard` — NOT to `/onboarding-user-information`** at this point.
3. On `/dashboard`, the route is wrapped in `ProtectedRoute`. `ProtectedRoute.tsx:79-81` checks `user.onboardingComplete`. If falsy AND the current route is not an onboarding route, it redirects to `/onboarding-user-information`. So the user bounces to onboarding on the first dashboard hit.
4. The `WorkspaceProvider` (in `main.tsx:245`, wrapping the whole app inside the auth provider) runs `useWorkspace` (`hooks/use-workspace.tsx:105`). On mount, it queries `api.workspaces.crud.getMyWorkspaces`. If the result is `[]`, it fires `api.workspaces.crud.seedPersonalWorkspace` once (line 146). That mutation (`workspaces/crud.ts:368`) creates:
   - A `workspaces` row of type `"personal"`, named `${userName}'s Workspace`.
   - A `workspaceMembers` row making the user the owner.
   - **Six `pipelineStages` rows** (Lead, Qualified, Proposal, Negotiation, Won, Lost) with the color palette at `workspaces/crud.ts:412` (`#94a3b8`, `#60a5fa`, `#a78bfa`, `#fbbf24`, `#34d399`, `#f87171`).
5. So after signup, the user gets: (a) a row in `users`, (b) a personal `workspaces` row, (c) a `workspaceMembers` owner row, (d) 6 default `pipelineStages` rows. No default clients, projects, or deals are auto-created. No `workspaceInvitations` are sent.

### 2.3 Onboarding data persistence

- `OnboardingUserInformation.tsx:14` initializes local form state with `fullName`, `hourlyRate`, `primaryPlatform`, `professionalBio`, `yearsExperience`. None of it is pre-filled from `users.name` (which was already submitted at signup).
- `OnboardingUserInformation.tsx:61 handleContinue` validates the form and saves it to **`localStorage`** under the key `"onboardingData"` (NOT to Convex). Then it navigates to `/onboarding-source`.
- `OnboardingSource.tsx:131 handleContinue` reads the localStorage blob back, calls `api.users.completeOnboarding` mutation (the only Convex write in the whole onboarding flow), and on success removes the localStorage entry and navigates to `/dashboard`.
- `users.ts:179 completeOnboarding` patches the user doc with: `name`, `hourlyRate`, `primaryPlatform`, `yearsExperience`, `professionalBio`, `acquisitionSource`, `acquisitionSourceDetail`, `onboardingComplete: true`, `onboardingCompletedAt: Date.now()`.
- **Failure mode**: If the user closes the tab between step 1 and step 2, the localStorage blob is orphaned (it's never cleaned up on next login). And `onboardingComplete` remains false, so the next dashboard visit bounces them back to step 1 — where the form is BLANK again (no prefill from the partial save).

### 2.4 Onboarding gate

- `ProtectedRoute.tsx:76-81`: if `user && !user.onboardingComplete && !isOnboardingRoute`, redirect to `/onboarding-user-information`. This is the ONLY gate. It applies to all `ProtectedRoute`-wrapped routes (including `/dashboard`, `/clients`, etc.), but NOT to the onboarding routes themselves.
- The `/auth` route is outside `ProtectedRoute`, so a user can sign in, get bounced to onboarding, sign out, sign back in — and they'll be bounced to onboarding again. The localStorage blob from the previous attempt may still be there, causing `OnboardingSource` to read stale data (line 131 — there's no freshness check).

### 2.5 The "multiple pipeline kanban boards" bug

- Root cause documented in `use-auth.ts:6-19` (AUTH-FIX-4 comment). Originally, `useAuth` ALSO fired `seedPersonalWorkspace` on every new login. Combined with `useWorkspace` doing the same, the two parallel Convex mutations — under OCC isolation — could BOTH pass the "no existing workspace" check and BOTH insert a workspace + 6 stages, producing duplicate kanban boards on the Pipeline page.
- The fix: `useAuth` is now READ-ONLY (it only queries `currentUser`). Seeding is exclusively in `useWorkspace`, which uses a `seedAttempted` ref to fire at most once per mount.
- **Residual risk**: There are still THREE code paths that can create default pipeline stages for the same user:
  1. `workspaces/crud.ts:seedPersonalWorkspace` (auto-seed on first login, fires from `useWorkspace`).
  2. `workspaces/crud.ts:createWorkspace` (called when creating a team workspace — also seeds stages for that new ws).
  3. `pipeline/crud.ts:createDefaultStages` (called from `Pipeline.tsx:394` if `stages.length === 0` on page mount).
  The defensive dedup in `pipeline/crud.ts:getStages` (lines 28-44 — dedup by `_id` and then by `name|order`) suggests duplicate stages WERE seen at runtime. The dedup is at the query level, not the insert level, so duplicate rows still accumulate in the DB; they're just hidden from the UI.

### 2.6 Signout flow

- `AccountSettings.tsx:259 handleSignOut` and `Landing.tsx:45 handleSignOut` both call `signOut()` (from `@convex-dev/auth/react` via `useAuthActions`).
- **No cleanup happens**: the localStorage keys `axia_account_mode`, `axia_active_workspace`, `onboardingData`, `axia_sidebar_state`, `axia_client_email` are NOT cleared on signout.
- The `WorkspaceProvider`'s `seedAttempted` ref resets on a full page reload (since the React tree is rebuilt), but in a SPA signout+signin flow without reload, the ref may already be `true` from the previous session, suppressing the seed for the new user.
- This means: if user A signs out and user B signs in on the same browser (no reload), user B may briefly see user A's workspace ID in localStorage and the seed may not fire, leaving user B with no workspace.

---

## 3. Pipeline → "Convert to Project" Flow

### 3.1 Where the button lives

There are two surfaces that look like "convert to project":

1. **`Proposals.tsx:989-999`** — the actual button. Renders as a purple "Convert to Project" button on each SIGNED proposal card. The onClick fires `onConvertToProject?.(proposal)` which is `Proposals.tsx:317 handleConvertToProject`.
2. **`components/connectors/WorkflowActions.tsx:128-138`** — `getProposalActions(proposalId, "signed")` returns a preset action labeled **"Create Project"** (not "Convert") with `url: /projects?createFromProposal=${proposalId}`. This is just a navigation link — it does NOT create the project.

These two paths are inconsistent: the Proposals-page button creates the project immediately; the WorkflowActions preset only navigates and shows a toast.

### 3.2 What `handleConvertToProject` actually does

Source: `Proposals.tsx:317-387`. The flow is:

1. **Step 1 — Find or create the client** (lines 319-344):
   - Reads `proposal.clientName || "Unknown Client"` and `proposal.clientEmail`.
   - Searches `existingClients` (already queried at `Proposals.tsx:198` via `api.clients.crud.getClients`) for a case-insensitive name match.
   - If found, uses the existing `clientId`.
   - If not found, calls `api.clients.crud.createClient` with: `clientName`, `platform: "direct"`, `hourlyRate: proposal.totalValue > 0 ? proposal.totalValue / 40 : 50` (i.e. assumes 40 hours of work — a wild heuristic), `contractType: "hourly"`, `contactEmail`, `contactName`, `workspaceId`, `notes: "Created from proposal: ${proposal.title}"`.
2. **Step 2 — Create the project** (lines 350-358):
   - Calls `api.projects.projectProtectionSimple.addProject` with: `projectName: proposal.title`, `clientId`, `hourlyRate` (same heuristic as step 1), `projectType: "ongoing"`, `protectionLevel: "enhanced"`, `workspaceId`.
   - Does NOT create a scope definition. The toast at `Projects.tsx:58` claims "a project and scope were automatically created" — but the code does NOT create a scope. The toast is misleading.
3. **Step 3 — Move the linked deal to "Won"** (lines 360-372):
   - If `proposal.dealId` exists, finds the pipeline stage named "won" (case-insensitive) from the already-loaded `pipelineStages`, and calls `api.pipeline.crud.moveDeal` to move the deal there.
4. **Step 4 — Annotate the proposal** (lines 374-379):
   - Calls `api.proposals.crud.updateProposal` to append `"[Converted to project — <date>]"` to the proposal's `notes` field.
   - Does NOT update the proposal with the new `clientId` or `projectId`. The proposal's `clientId` field remains whatever it was (often `undefined` since ProposalBuilder never sets it). No back-reference to the new project.

### 3.3 Atomicity

**Not atomic.** The four steps are four separate Convex mutation calls from the client (`createClientMutation`, `addProjectMutation`, `moveDealMutation`, `updateProposalMutation`). If any one fails (network, auth, validation), the previous ones have already committed. The `try/catch` at `Proposals.tsx:384` only shows a toast on failure — there is no rollback.

Failure modes:
- Step 1 succeeds (client created) but step 2 fails → orphan client with no project.
- Steps 1-2 succeed but step 3 fails → deal stays in the previous stage (the user sees the project created but the kanban still shows the deal as in-progress).
- Steps 1-3 succeed but step 4 fails → project + client exist, deal moved, but proposal has no annotation. The user can click "Convert to Project" again, which would create a SECOND client (since the existing-client check matches by `clientName` and the first client was created with `clientName` from the proposal — so the dedup WOULD catch it on a second run, but only if `existingClients` has refreshed).

### 3.4 Data propagated vs. user-refilled

**Propagated from the proposal:**
- `clientName` (string) → `clients.clientName` (and `.name` alias)
- `clientEmail` (string) → `clients.contactEmail`
- `proposal.title` → `projects.projectName`
- `proposal.totalValue / 40` → `clients.hourlyRate` AND `projects.hourlyRate` (the same heuristic-derived rate)
- The proposal's workspace ID (passed through).

**NOT propagated (user must refill manually):**
- `clients.platform` — hardcoded to `"direct"` even if the proposal came from Upwork/Fiverr context. There's no `platform` field on the proposal schema to propagate from.
- `clients.contractType` — hardcoded to `"hourly"` regardless of proposal structure.
- `clients.riskLevel` — defaulted to `"medium"` by `createClient` (`clients/crud.ts:148`).
- `projects.projectType` — hardcoded to `"ongoing"`. If the proposal had milestone sections (`ProposalBuilder.tsx` supports `milestone` section type), this should arguably be `"milestone"`, but the conversion ignores that.
- `projects.protectionLevel` — hardcoded to `"enhanced"`.
- `scopeDefinitions` — completely missing. The user has to navigate to `/scope` and create a scope from scratch, optionally prefilling from the proposal via `?proposalId=` URL param (see `Scope.tsx:629-653`).
- `proposal.clientId` — never set on the proposal itself. So the proposal doesn't get back-linked to the new client.
- `proposal.dealId` linkage — only used to move the deal, never updated.
- `proposal.clientEmail` — used to create the client but the proposal's own denormalized `clientEmail` is not normalized to match the new client.

---

## 4. Client ↔ Project ↔ Scope ↔ Deal ↔ Proposal ↔ Invoice Linkage

### 4.1 Pair-by-pair matrix

| Pair | Direction | FK column | Required? | Cascade create? | Orphan risk on delete? |
|---|---|---|---|---|---|
| Client → Project | project.clientId → clients | yes (schema) | yes (mutation enforces) | No — must create client first | YES: deleting a client leaves all its projects dangling (no cascade in `deleteClient`) |
| Client → Deal | deal.clientId → clients | optional | no | No | YES: deleting a client leaves deals with stale `clientId` |
| Client → Proposal | proposal.clientId → clients | optional | no | No | YES |
| Client → Invoice | invoice.clientId → clients | optional (schema) / required (mutation) | mismatched | No | YES — and `getInvoiceStats` will fail to resolve client name |
| Client → WorkSession | session.clientId → clients | optional | no | No | YES |
| Project → Scope | scope.projectId → projects | optional | no | No | YES |
| Project → Invoice | invoice.projectId → projects | optional | no | No | YES |
| Project → WorkSession | session.projectId_fk → projects | optional | no (and not populated) | No | YES (and FK is unused — join is by `projectName` string) |
| Deal → Proposal | deal.proposalId → proposals / proposal.dealId → deals | both optional | no | `linkDealToProposal` patches both sides — manual | YES |
| Proposal → Invoice | invoice.proposalId → proposals | optional | no | No | YES |
| Proposal → Scope | scope.proposalId → proposals | optional | no | No | YES |
| WorkSession → EvidenceSession | evidenceSession.sessionId → workSessions | required | yes | Evidence sessions are created from a work session — see `evidence/library.ts` | deleting a work session orphans its evidence session |
| WorkSession → Invoice | session.invoiceId → invoices | optional | no | No | YES |
| Invoice → InvoiceWorkLink | workLink.invoiceId → invoices | required | yes | No | No — `deleteInvoice` cascades workLinks (`billing/crud.ts:427`) |
| Invoice → PaymentReminder | reminder.invoiceId → invoices | required | yes | No | No — `deleteInvoice` cascades reminders (`billing/crud.ts:433`) |
| Proposal → ProposalFollowUp | followUp.proposalId → proposals | required | yes | Auto-created on `sendProposal` (`proposals/crud.ts:299-312`) | No — `deleteProposal` cascades followUps (`proposals/crud.ts:425`) |
| Scope → ScopeChangeOrder | changeOrder.scopeId → scopeDefinitions | required | yes | No | No — `deleteScopeDefinition` cascades changeOrders (`scope/crud.ts:309-313`) |
| PipelineStage → Deal | deal.stageId → pipelineStages | required | yes | No | No — `deleteStage` moves deals to a fallback stage first (`pipeline/crud.ts:300-319`) |
| Workspace → ALL business tables | *.workspaceId → workspaces | optional (everywhere) | no | No | YES — deleting a workspace orphans all records pointing at it. `deleteWorkspace` (`workspaces/crud.ts:318`) only cascades `workspaceMembers` and `workspaceInvitations`; it does NOT delete clients/projects/deals/proposals/invoices. The mutation refuses to run if there are active projects, but archived projects and all other entity types are left dangling. |
| User → ALL business tables | *.userId → users | required (everywhere) | yes | No | YES — there is no `deleteUser` mutation, so this is theoretical, but if one is added it would need to cascade ~20 tables. |

### 4.2 Specific questions answered

**Q: When you create a Client, does anything else get auto-created?**
A: No. `clients/crud.ts:createClient` (line 107) inserts exactly one row in `clients`. No default project, no policy, no pipeline deal. The CRM-side `clientCompanies` table is separate and is only created via `clients/clientAuth.ts:registerClient` (the client-signup flow). The two never reference each other.

**Q: When you create a Project, must you pick a Client first? Or can it be client-less?**
A: You MUST pick a client. `projects/projectProtectionSimple.ts:addProject` (line 67) requires `clientId: v.id("clients")`. The schema (`tables/projects.ts:113`) also marks it required. The mutation additionally verifies the client exists and belongs to the same user/workspace (lines 78-89). So no client-less projects are possible.

**Q: When you create a Scope, must it link to a Project?**
A: No. `scope/crud.ts:createScopeDefinition` (line 102) accepts `projectId` as OPTIONAL. The Scope page (`Scope.tsx:672`) only passes `proposalId` (and only if it was in the URL). So scopes are frequently created with no project link, only a proposal link, or no link at all.

**Q: When you create a Proposal, does it auto-link to a Project + Client?**
A: No auto-link to either. `proposals/crud.ts:createProposal` (line 186) accepts `clientId`, `dealId`, `clientName`, `clientEmail` — all optional. `ProposalBuilder.tsx:401` calls it with only `clientName`/`clientEmail` (strings), NEVER `clientId` or `dealId`. Even though `ProposalBuilder.tsx:165` reads `activeDealId` from URL params, it never passes it to `createProposal`. So 100% of proposals created via the builder have `clientId: undefined` and `dealId: undefined`. The only way a proposal gets a `clientId` is via `convertToProject` (which doesn't set it either) or via direct API call.

**Q: When you create an Invoice, does it auto-link to a Project + Client?**
A: The mutation (`billing/crud.ts:createInvoice` line 162) REQUIRES `clientId` and accepts optional `projectId`/`proposalId`. It derives `clientName`/`clientEmail` from the client doc. BUT `InvoiceBuilder.tsx:452` calls `createInvoice` WITHOUT `clientId`, passing only `clientName`/`clientEmail` as strings. So the call will fail Convex validation. Under `safe-convex-react`, the error is swallowed and a toast is shown. No workspaceId is passed either. This is a **broken data flow** — invoices created via the builder cannot succeed unless the user happens to also pass a `clientId` (which the UI never collects).

### 4.3 Two parallel "client" worlds

The codebase has TWO completely separate client concepts that never link:

1. **`clients` table** (freelancer-CRM side): created by freelancers via `Clients.tsx` → `clients.crud.createClient`. Has `clientName`, `platform`, `hourlyRate`, `contractType`, `riskLevel`, etc.
2. **`clientCompanies` table** (client-portal side): created via `ClientSignup.tsx` → `clientAuth.registerClient`. Has `companyName`, `contactName`, `industry`, `companySize`, `website`, `subscriptionTier: "free"`. These are CLIENT companies who hire freelancers, NOT freelancer records of their clients.

The two tables share no FK. A freelancer's `clients` row never references a `clientCompanies` row, even if both describe the same real-world client. This means:
- A client who signs up via `/client-signup` cannot be matched to the corresponding freelancer-side `clients` record by ID — only by free-text `email`/`companyName` matching.
- The `clientWorkspaceTokens` table (`tables/projects.ts:252`) is a half-built bridge: it links a `clientId` (freelancer side) to a free-text `freelancerUserId` string. So a client can be given portal access to a freelancer's workspace, but the linkage is one-way (freelancer → token → client portal) and the client side has no symmetric reference back.

---

## 5. Page-by-Page Data Collection

One line per page. "Route" is from `main.tsx`. "Entity" = what it creates/edits. "Manual fields" = what the user must type. "Auto-fillable" = what could be derived but isn't.

- **Landing.tsx** — `/` — None (static marketing). CTA navigates to `/auth?mode=signup&redirect=/dashboard`.
- **Auth.tsx** — `/auth` — Creates `users` row via Convex Auth (sign-up flow). Manual fields: `name`, `email`, `password` (8-16 chars). Auto-fillable: nothing (it's the entry point). On signup, navigates to `/dashboard` (which then bounces to onboarding if `onboardingComplete` is false).
- **OnboardingUserInformation.tsx** — `/onboarding-user-information` — Edits `users` (via the next step). Manual fields: `fullName`, `hourlyRate`, `primaryPlatform`, `yearsExperience`, `professionalBio`. Auto-fillable: `fullName` could be pre-filled from `users.name` (set at signup) — it isn't.
- **OnboardingSource.tsx** — `/onboarding-source` — Patches `users.onboardingComplete=true` via `users.completeOnboarding`. Manual fields: `acquisitionSource`, `acquisitionSourceDetail`. Reads the rest from localStorage. Auto-fillable: nothing additional.
- **Dashboard.tsx** — `/dashboard` — Read-only. Queries workspace stats. No manual fields.
- **Clients.tsx** — `/clients` — Creates `clients`. Manual fields: `clientName`, `platform`, `hourlyRate`, `contractType`, `riskLevel`. Auto-fillable: `workspaceId` IS passed (line 134); `userId` is set server-side; `hourlyRate` could default from `users.hourlyRate` (set in onboarding) — it doesn't.
- **Projects.tsx** — `/projects` — Read-only list. The "Add Test Project" button (`Projects.tsx:121`) calls `seedProjects.seedTestProjects` (a dev seeder), NOT a real create flow. There is NO user-facing "create project" form on this page — projects can only be created via the `Proposals.tsx` convert-to-project flow or via `seedTestProjects`. This is a gap.
- **Pipeline.tsx** — `/pipeline` — Creates `deals` and `pipelineStages`. Manual fields per deal: `title`, `value`, `probability`, `clientId?`, `description?`, `source?`, `contactEmail?`, `contactName?`, `expectedCloseDate?`, `notes?`. Auto-fillable: `workspaceId` IS passed (line 798); `userId` server-side. `clientId` is optional and offered as a dropdown, but the deal could auto-suggest a client from `contactEmail` if one matches — it doesn't.
- **Proposals.tsx** — `/proposals` — Read-only list of proposals + the "Convert to Project" action. No create form on this page (creation happens in `ProposalBuilder`). Reads `workspaceId` (line 144).
- **ProposalBuilder.tsx** — `/proposals/new` — Creates `proposals`. Manual fields: `title`, `clientName` (string), `clientEmail` (string), `validUntil`, `notes`, `sections[]`, `totalValue`, `currency`. Auto-fillable: `workspaceId` is NOT passed; `clientId` is NOT passed (even though `clientName` could be matched against existing clients); `dealId` is read from URL (`?dealId=`) but NEVER passed to `createProposal`. **This is a major data-flow break.**
- **Invoices.tsx** — `/invoices` — Read-only list. Reads `workspaceId` (line 212).
- **InvoiceBuilder.tsx** — `/invoices/new` — Creates `invoices`. Manual fields: `clientName` (string), `clientEmail` (string), `issueDate`, `dueDate`, `currency`, `taxRate`, `notes`, `lineItems[]`. Auto-fillable: `workspaceId` NOT passed; `clientId` NOT passed (would fail Convex validation — see §4.2); `projectId` NOT read from `?projectId=` URL param even though `WorkflowActions.tsx:170` navigates here with that param. **This is a major data-flow break.**
- **Scope.tsx** — `/scope` — Creates `scopeDefinitions`. Manual fields: `title`, `description`, `revisionLimit`, `totalEstimatedHours`, `deliverables[]`. Auto-fillable: `workspaceId` NOT passed; `projectId` NOT passed (the page reads `?proposalId=` but not `?projectId=` even though WorkflowActions.tsx:178 navigates with `?projectId=`); `proposalId` IS passed if in URL.
- **TimeTracking.tsx** — `/time-tracking` — Creates `workSessions` via `tracking.crud.startSession`. Manual fields: project selection (dropdown), `platform`, `notes`. Auto-fillable: `workspaceId` IS passed (line 221); `clientName`/`projectName`/`hourlyRate` ARE resolved from the selected project. `clientId` and `projectId_fk` FK columns are NOT populated — only the string names.
- **PaymentPatterns.tsx** — `/payment-patterns` — Read-only. Reads `workspaceId`.
- **Reports.tsx** — `/reports` — Creates `disputeReports` via `disputeReports.createDisputeReport`. Manual fields: report title, description, type. Auto-fillable: `workspaceId` NOT passed (the `disputeReports` table has `workspaceId` but the page doesn't send it).
- **EvidenceLibrary.tsx** — `/evidence-library` — Read-only. Reads `workspaceId`.
- **EvidenceExport.tsx** — `/evidence-export` — Read-only export.
- **Goals.tsx** — `/goals` — Creates `goals`. Manual fields: `title`, `description`, `type`, `target`, `current`, `unit`, `deadline`, `status`, `milestones`. Auto-fillable: `workspaceId` NOT passed (the mutation accepts it but the page doesn't send it). `userId` server-side.
- **Tags.tsx** — `/tags` — Creates `tags`. Manual fields: `name`, `color`, `category`. Auto-fillable: `workspaceId` NOT passed.
- **Messages.tsx** — `/messages` — Creates `channels`, `messages`. Manual fields: channel name, message content. `workspaceId` IS passed (line 174).
- **TeamManagement.tsx** — `/teams` — Creates `teams`, sends `workspaceInvitations`. `workspaceId` IS passed (line 277, 337).
- **AccountSettings.tsx** — `/account-settings` — Patches `users` via `users.updateProfile`. Manual fields: `name`, `hourlyRate`, `professionalBio` (email is read-only). Auto-fillable: nothing (it correctly loads from Convex).
- **Subscription.tsx, PlatformIntegrations.tsx, HelpCenter.tsx** — legacy routes, all redirect to `/account-settings`.
- **ApiSettings.tsx** — not in `main.tsx` route list — likely an orphan page.
- **ClientSignup.tsx** — `/client-signup` — Calls `clientAuth.registerClient`. Manual fields: `email`, `companyName`, `contactName`, `industry`, `companySize`, `website`. **The mutation requires `getAuthUserId` (line 18 of `clientAuth.ts`) — but the route is PUBLIC (no `ProtectedRoute`)**. So an unauthenticated visitor hitting `/client-signup` will get "Not authenticated" error. This is a bug — the page is unreachable for its intended audience.
- **ClientLogin.tsx** — `/client-login` — public.
- **ClientWorkspace.tsx** — `/workspace/:token` — public client-portal view, gated by token.
- **ClientDashboard.tsx** — `/client-dashboard` — public.
- **OwnerDashboard.tsx** — `/owner-dashboard`, `/owner` — separate admin view.
- **WaitlistSuccess.tsx** — `/waitlist/success` — public.
- **NotFound.tsx** — `*`.

---

## 6. Redundant Form Fields — the "less for users to fill" question

For each redundancy: where the user is asked, what could be auto-derived, and the minimum fix.

### 6.1 Full name asked twice
- Asked at: `Auth.tsx:74` (signup `name` field), then again at `OnboardingUserInformation.tsx:14` (`fullName` field).
- Could derive: the signup form already set `users.name`. The onboarding form should pre-fill `fullName` from `useAuth().user.name`.
- Minimum fix: in `OnboardingUserInformation.tsx`, add `const { user } = useAuth();` and `useEffect(() => { if (user?.name && !formData.fullName) setFormData(f => ({...f, fullName: user.name})); }, [user]);`.

### 6.2 Email asked twice
- Asked at: `Auth.tsx:74` (signup `email`), then re-displayed (read-only) at `AccountSettings.tsx:191`. Not asked again in onboarding — but the onboarding `professionalBio` Label uses a Mail icon (`OnboardingUserInformation.tsx:7` and `:208`), which is a copy-paste error (the field is a bio, not an email). No data redundancy, but a UI inconsistency.
- Minimum fix: change the icon for the Professional Bio label from `Mail` to `FileText` (or similar).

### 6.3 Hourly rate asked in onboarding AND on every client
- Asked at: `OnboardingUserInformation.tsx:14` (sets `users.hourlyRate`), then again at `Clients.tsx:59` (`hourlyRate` per client), and again at `Proposals.tsx:336` (derived as `proposal.totalValue / 40` during convert-to-project).
- Could derive: `clients.hourlyRate` could default to `users.hourlyRate` when creating a new client. `projects.hourlyRate` could default to the linked client's `hourlyRate`.
- Minimum fix: in `Clients.tsx`, fetch the user via `useAuth()` and default the `hourlyRate` state to `user.hourlyRate` if present.

### 6.4 Client name + email asked in ProposalBuilder, again in convert-to-project (no auto-link)
- Asked at: `ProposalBuilder.tsx:195` (`clientName`, `clientEmail` strings).
- Could derive: the builder could offer a `<select>` of existing `clients` (filtered by workspace) and use the selection to populate `clientId` + `clientName` + `clientEmail` together. Right now the user types a name that may or may not match an existing client, and the convert flow does a case-insensitive name lookup to compensate.
- Minimum fix: add a client-picker `<Select>` in `ProposalBuilder.tsx` that, when chosen, sets `clientId`, `clientName`, and `clientEmail` together. Pass `clientId` to `createProposal`.

### 6.5 Client name + email asked in InvoiceBuilder (with NO client link)
- Asked at: `InvoiceBuilder.tsx:208-209` (`clientName`, `clientEmail` strings).
- Could derive: should be a client-picker that sets `clientId` (required by the mutation). The mutation already derives `clientName`/`clientEmail` from the client doc server-side.
- Minimum fix: replace the two string inputs with a `<Select>` of clients; pass `clientId` to `createInvoice`; remove the manual `clientName`/`clientEmail` args (the mutation ignores them anyway).

### 6.6 Project name not prefilled from deal title when converting a deal
- The Pipeline page does NOT have a "Convert to Project" button. Only signed proposals can be converted (§3). So a freelancer with a deal in the "Won" stage who wants to create a project must manually open the deal, copy the title, navigate to Projects (which has no create form — §5), and... there's no path. The only way to convert a deal to a project is to first create a proposal from the deal (`ProposalBuilder.tsx` reads `?dealId=`), send it, get it signed, then convert.
- Could derive: Pipeline.tsx could offer a "Convert to Project" action on deals in the "Won" stage that creates a project directly from the deal's `title`, `value`, `clientId`, `contactEmail`.
- Minimum fix: add a `convertDealToProject` Convex mutation that mirrors `handleConvertToProject` but reads from the deal; add a button in the Pipeline deal card UI.

### 6.7 Workspace name not asked (auto-seeded, but never editable from onboarding)
- Auto-derived at `workspaces/crud.ts:392` as `${userName}'s Workspace`. The user can edit it later via `workspaces.crud.updateWorkspace`, but only from the AccountSettings/TeamManagement pages (not exposed clearly in the UI).
- No redundancy — this one is correct.

### 6.8 Project hourly rate double-derived during convert-to-project
- `Proposals.tsx:336` sets `clients.hourlyRate = proposal.totalValue / 40`, and `Proposals.tsx:354` sets `projects.hourlyRate = proposal.totalValue / 40`. The two are derived independently from the same heuristic. If the user later edits the client's rate, the project's rate doesn't follow.
- Minimum fix: after creating the client, use `client.hourlyRate` to populate `project.hourlyRate` (single source of truth).

### 6.9 `yearsExperience` collected but never used
- Asked at `OnboardingUserInformation.tsx:14`, saved to `users.yearsExperience`. Grep for `yearsExperience` in the codebase finds it only in the onboarding flow — no feature reads it.
- Minimum fix: either remove the field or surface it in personalization (e.g. the protection advisor recommendations).

### 6.10 `professionalBio` collected but barely used
- Saved to `users.professionalBio`. Only displayed in `AccountSettings.tsx:210`. Not used in proposals, dispute reports, or the freelancer directory (which has its own `freelancerPublicProfiles.bio` field — a separate bio).
- Minimum fix: either remove from onboarding or auto-populate `freelancerPublicProfiles.bio` from it when the user first creates a public profile.

### 6.11 Pipeline deal `contactEmail`/`contactName` could be derived from the linked client
- The deal schema has `clientId?` AND free-text `contactEmail`/`contactName`. When a user picks a `clientId` in the deal form, the contact fields should auto-fill from the client — they don't.
- Minimum fix: in the Pipeline deal-create dialog, add an `onChange` for the client select that fetches the client's `contactEmail`/`contactName` and populates the form.

### 6.12 Invoice `clientName`/`clientEmail` denormalized AND derived
- `billing/crud.ts:208-212` derives `clientName`/`clientEmail` from the client doc when `clientId` is provided. The InvoiceBuilder passes the strings instead of the ID. So either the strings or the ID can be the source — but the ID is the source of truth and the strings are redundant.
- Minimum fix: remove the `clientName`/`clientEmail` inputs from InvoiceBuilder; require `clientId` (single dropdown).

### 6.13 `proposalFollowUps` body uses `proposal.clientName || "there"` — but proposal.clientName is a denormalized string
- `proposals/crud.ts:306` builds the follow-up email body with `proposal.clientName || "there"`. Since ProposalBuilder never links a `clientId` and only sets the `clientName` string, this works — but it's fragile. If the freelancer later edits the client's name in the CRM, the proposal's `clientName` string doesn't follow.
- Minimum fix: when `proposal.clientId` is set, the follow-up body should look up the current `clients.clientName` at send time rather than using the stale snapshot.

### 6.14 `workspaceId` repeatedly asked-then-not-passed
- Many pages (Goals, Tags, Reports, ProposalBuilder, InvoiceBuilder, Scope) read `useWorkspaceContext()` but then don't pass `workspaceId` to the create mutation. The mutation accepts it as optional and stores `undefined`. Result: records are scoped only by `userId`, ignoring the active workspace — so switching workspaces doesn't filter them.
- Minimum fix: in each page's create handler, pass `workspaceId` from `useWorkspaceContext()` if `isConvexConnected`.

### 6.15 Sign-up `name` could be split into first/last
- The signup form collects a single `name` field. The `users.name` is used for the workspace name (`${userName}'s Workspace`) and the sidebar greeting. No redundancy — just noting the single-field approach is fine.

---

## 7. Summary of Disconnected / Broken Data Flow — TOP 10 FIXES

Ranked by user-visible impact (most impactful first).

### Fix #1 — InvoiceBuilder cannot actually create invoices (broken)
- **Problem**: `InvoiceBuilder.tsx:452` calls `api.billing.crud.createInvoice` with `clientName` (string) but no `clientId`. The mutation (`billing/crud.ts:166`) requires `clientId: v.id("clients")`. Convex validation fails; `safe-convex-react` swallows the error; user sees a generic "Failed to save invoice" toast. Every invoice-creation attempt via the builder is broken.
- **Fix**: Replace the `clientName`/`clientEmail` text inputs in `InvoiceBuilder.tsx` with a `<Select>` of `api.clients.crud.getClients`. Pass `clientId` (and optional `projectId` from URL `?projectId=`) to `createInvoice`. Also pass `workspaceId` from `useWorkspaceContext()`.
- **Files affected**: `src/pages/InvoiceBuilder.tsx`, `src/components/connectors/WorkflowActions.tsx` (already passes `?projectId=`).

### Fix #2 — ProposalBuilder never links proposals to clients, deals, or workspaces
- **Problem**: `ProposalBuilder.tsx:401` calls `createProposal` with only `clientName`/`clientEmail` strings. The `clientId`, `dealId`, `workspaceId` args supported by `proposals/crud.ts:186` are never sent. So 100% of builder-created proposals have `clientId: undefined`, `dealId: undefined`, `workspaceId: undefined`. They are invisible to workspace-scoped queries (`proposals/crud.ts:21-31` returns `[]` when `workspaceId` is provided but the proposal has none).
- **Fix**: Add a client `<Select>` (like Fix #1). Read `?dealId=` from URL and pass it as `dealId`. Read `useWorkspaceContext().activeWorkspaceId` and pass it as `workspaceId`. Pass `clientId` from the select.
- **Files affected**: `src/pages/ProposalBuilder.tsx`, optionally `src/convex/proposals/crud.ts` (consider making `workspaceId` required at the mutation level to enforce).

### Fix #3 — "Convert to Project" creates client + project in 4 separate non-atomic mutations
- **Problem**: `Proposals.tsx:317 handleConvertToProject` runs 4 sequential client-side mutations (createClient, addProject, moveDeal, updateProposal). Any failure leaves orphans. No back-link from the proposal to the new client/project. Misleading toast claims a scope was created (it wasn't).
- **Fix**: Add a single Convex mutation `proposals.crud.convertToProject(proposalId)` that runs server-side in one transaction: find-or-create client, create project, move deal, patch proposal with `clientId` + a new `projectId` field (currently the proposal schema has no `projectId` — add one), create a default `scopeDefinition` linked to both. Return `{ projectId, clientId, scopeId }`. Replace the 4 client calls with one.
- **Files affected**: `src/convex/proposals/crud.ts` (new mutation), `src/convex/tables/proposals.ts` (add `projectId` field), `src/pages/Proposals.tsx` (replace `handleConvertToProject` body).

### Fix #4 — `workSessions` FK columns (`clientId`, `projectId_fk`, `invoiceId`) never populated
- **Problem**: `tracking/crud.ts:startSession` (line 115) accepts only `projectName`/`clientName` strings. The schema has `clientId`, `projectId_fk`, `invoiceId` FK columns (in `tables/tracking.ts:26-28`) but they are left `undefined`. Downstream joins (e.g. `projectProtectionSimple.ts:23`) match by `projectName` string, which breaks if the user renames a project.
- **Fix**: Add `clientId: v.id("clients")` and `projectId: v.id("projects")` to `startSession` args. Insert them into the row. Update `TimeTracking.tsx:215` to pass the selected project's `clientId` and `projectId` (the page already has `selectedProjectData`).
- **Files affected**: `src/convex/tracking/crud.ts`, `src/pages/TimeTracking.tsx`, optionally `src/convex/projects/projectProtectionSimple.ts` (switch the join from `projectName` to `projectId_fk`).

### Fix #5 — Signout leaves stale localStorage (workspace ID, account mode, partial onboarding)
- **Problem**: `AccountSettings.tsx:259 handleSignOut` and `Landing.tsx:45 handleSignOut` only call `signOut()`. They don't clear `axia_active_workspace`, `axia_account_mode`, `axia_sidebar_state`, `axia_client_email`, or an orphaned `onboardingData` blob. After signout, the next user (or the same user re-signing-in) sees stale workspace IDs and the `WorkspaceProvider`'s `seedAttempted` ref may be `true` from the prior session, suppressing the auto-seed.
- **Fix**: Add a `clearLocalAppState()` helper that removes all `axia_*` localStorage keys, and call it before `signOut()` in both `handleSignOut` implementations. Force `window.location.reload()` after signout to reset React state.
- **Files affected**: `src/pages/AccountSettings.tsx`, `src/pages/Landing.tsx`, optionally `src/hooks/use-workspace.tsx` (export a `resetWorkspaceState` function).

### Fix #6 — No "Create Project" form anywhere; only Convert-from-Proposal or dev seeder
- **Problem**: `Projects.tsx` is read-only. The only "Add" button (`Projects.tsx:151`) calls `seedProjects.seedTestProjects` (a dev/test seeder that creates fake projects). The only production path to create a project is the signed-proposal → Convert-to-Project flow (§3). A user who wants to track time on a project they got via word-of-mouth (no proposal) has no UI to create one.
- **Fix**: Add a "New Project" dialog in `Projects.tsx` with fields: `projectName`, `clientId` (required select), `hourlyRate` (default from client), `projectType`, `protectionLevel`. Wire it to `api.projects.projectProtectionSimple.addProject`.
- **Files affected**: `src/pages/Projects.tsx`, optionally `src/components/project-protection/ProjectList.tsx`.

### Fix #7 — Onboarding step 1 data is lost if the user abandons before step 2
- **Problem**: `OnboardingUserInformation.tsx:61` writes the form to `localStorage` only. If the user closes the tab, the data is gone on next visit (the form is blank). `ProtectedRoute` bounces them back to step 1 because `onboardingComplete` is still false. No partial save.
- **Fix**: Either (a) call `users.updateProfile` on each field blur to persist incrementally (and have step 2 call `completeOnboarding` to flip the flag), or (b) on step 1 submit, call a new `users.saveOnboardingStep1` mutation that patches the user doc (without setting `onboardingComplete`), then navigate to step 2. Either way, drop the localStorage intermediate.
- **Files affected**: `src/pages/OnboardingUserInformation.tsx`, `src/pages/OnboardingSource.tsx`, `src/convex/users.ts` (new mutation).

### Fix #8 — Triple-seeded default pipeline stages still produce duplicate kanban boards
- **Problem**: Default stages can be created by (a) `workspaces/crud.ts:seedPersonalWorkspace` (line 412), (b) `workspaces/crud.ts:createWorkspace` (line 229), (c) `pipeline/crud.ts:createDefaultStages` (line 187). Each uses a different color palette. The `useAuth` fix (AUTH-FIX-4) stopped the worst double-seed, but Pipeline.tsx:394 still fires `createDefaultStages` if `stages.length === 0` on mount — which can race with `useWorkspace`'s `seedPersonalWorkspace`. The defensive dedup in `pipeline/crud.ts:getStages` (lines 28-44) hides the duplicates from the UI but they still accumulate in the DB.
- **Fix**: Remove `createDefaultStages` entirely. Make `seedPersonalWorkspace` and `createWorkspace` the ONLY stage-seeders. If the Pipeline page sees 0 stages, it should not auto-create — it should display an empty state with a "Create your first stage" CTA. Also: consolidate the three color palettes into one (extract to `src/lib/tokens.ts` STAGE_COLORS, which the code comments reference but doesn't enforce).
- **Files affected**: `src/convex/pipeline/crud.ts` (remove `createDefaultStages` or make it a no-op), `src/pages/Pipeline.tsx` (remove the auto-create effect at line 384-397), `src/convex/workspaces/crud.ts` (consolidate palette).

### Fix #9 — `clientSignup` is unreachable (requires auth but is on a public route)
- **Problem**: `ClientSignup.tsx` calls `clientAuth.registerClient` which requires `getAuthUserId` (`clientAuth.ts:18`). But `main.tsx:269` mounts ClientSignup on a public route (no `ProtectedRoute`). An anonymous visitor hitting `/client-signup` gets "Not authenticated" error on submit. The page is unreachable for its intended audience (client companies signing themselves up).
- **Fix**: Either (a) wrap `/client-signup` in `ProtectedRoute` (and adjust the UX to expect an already-logged-in client-portal user — which doesn't exist as a separate auth flow), or (b) make `clientAuth.registerClient` not require `getAuthUserId` (create a public registration mutation with rate limiting and email verification), or (c) delete the page entirely if client-signup isn't a supported flow.
- **Files affected**: `src/main.tsx` (route), `src/convex/clients/clientAuth.ts`, `src/pages/ClientSignup.tsx`.

### Fix #10 — Goals, Tags, Reports, Scope don't pass `workspaceId` to create mutations
- **Problem**: `Goals.tsx:219 createGoalMutation`, `Tags.tsx:53 createTagMutation`, `Reports.tsx:165 createReportMutation`, and `Scope.tsx:672 createScopeMutation` all call their backend without `workspaceId`. The mutations accept it as optional, store `undefined`, and the records are scoped only by `userId`. When the user switches workspaces, these records remain visible (the `by_workspace` index returns `[]`, but the fallback `by_user` query returns all of them — see e.g. `goals/crud.ts:9-23`).
- **Fix**: In each page, read `useWorkspaceContext().activeWorkspaceId` (gated by `isConvexConnected`) and pass it to the create mutation. Also: in the backend mutations, consider making `workspaceId` required when the user has at least one workspace (enforced via a check against `getMyWorkspaces`).
- **Files affected**: `src/pages/Goals.tsx`, `src/pages/Tags.tsx`, `src/pages/Reports.tsx`, `src/pages/Scope.tsx`, optionally the corresponding `convex/*/crud.ts` mutation args.

### Honorable mentions (not in top 10 but worth noting)

- **Dead duplicate table files** (`tables/clients.ts`, `tables/business.ts`, `tables/platform.ts`, `tables/work.ts`, `tables/security.ts`) should be deleted to prevent reader confusion. The `extensionTokens` schema in `security.ts` (with `tokenHash`+`tokenSuffix`) is BETTER than the live one in `features.ts` (which stores `token` plaintext) — consider migrating.
- **`disputeReports.clientId` is a string (`v.string().maxLength(1000)`)** in `features.ts:187`, not a FK to `clients`. Should be `v.id("clients")` or at least `v.optional(v.id("clients"))`.
- **`clientWorkspaceTokens.freelancerUserId` is a string** (`tables/projects.ts:258`), not a FK to `users`. Should be `v.id("users")`.
- **`clientPolicies.clientName` is a string** (`tables/projects.ts:9`), not a FK. Should be `v.id("clients")` or carry both.
- **No `deleteProject` mutation exists** — projects can only be archived. This is probably intentional (preserve history for evidence/disputes) but should be documented.
- **`notifications.entityId` is a string** — flexible but loses type safety. Acceptable trade-off.
- **`tagIds[]` is not on any business record** — tags are essentially standalone. Either remove the feature or add a `tags: v.array(v.id("tags"))` field to clients/projects/etc.
- **`customFields` is `v.any()` on every business record** — no schema enforcement that keys match `customFieldDefinitions`. Acceptable for flexibility but worth a runtime validator.

---

End of Task ID 3.
