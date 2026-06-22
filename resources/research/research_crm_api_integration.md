# Axia Integration Research: CRM, Project Management & Freelance Tool APIs

## Executive Summary

Research conducted across 26 tools in 5 categories to assess API viability for Axia's data aggregation platform. Each tool was evaluated on: API type & availability, OAuth 2.0 support, exportable data types, rate limits, and webhook support for real-time sync.

**Key Finding**: 18 of 26 tools offer robust public APIs with OAuth 2.0. The freelance platform category is the weakest — Fiverr and Toptal have no public APIs. Proposal/contract tools have limited API access (HoneyBook and Bonsai lack public APIs).

---

## 1. CRM & Pipeline Management

### HubSpot
| Attribute | Details |
|---|---|
| **API Type** | REST (primary), GraphQL (limited — HubDB, CRM associations) |
| **OAuth 2.0** | ✅ Yes — full OAuth 2.0 with refresh tokens; also supports private apps (access tokens) |
| **Key Exportable Data** | Contacts, Companies, Deals (pipeline), Tickets, Engagements (calls/emails/notes), Products, Line Items, Quotes, Owners, Pipelines & Stages, Custom Objects |
| **Rate Limits** | 100 req/10sec per OAuth token (110 for marketplace apps); 200 records/page for CRM search; daily limit of 500K requests for Pro+; CRM search ~5 req/sec per account |
| **Webhooks** | ✅ Yes — subscription-based; 100 req/sec journal API, 50 req/sec subscriptions API; supports contact/deal/company/ticket events |
| **Migration Tools** | Native import (CSV/Excel); HubSpot Data Sync for bi-directional sync; bulk export via API |
| **Integration Effort** | 🟢 **LOW** — Excellent docs, mature API, large ecosystem |

### Salesforce
| Attribute | Details |
|---|---|
| **API Type** | REST, SOAP, Bulk API 2.0, Streaming API, GraphQL (limited) |
| **OAuth 2.0** | ✅ Yes — full OAuth 2.0 with multiple flows (web server, JWT, SAML, client credentials) |
| **Key Exportable Data** | Leads, Contacts, Accounts, Opportunities (pipeline), Cases, Tasks, Events, Products, Price Books, Contracts, Custom Objects, Reports |
| **Rate Limits** | API limits based on edition & license count (e.g., 100K for Enterprise); 10-min timeout for REST/SOAP; concurrent request limits; Bulk API 2.0 for high-volume |
| **Webhooks** | ✅ Via Streaming API (PushTopics, Generic Events, Change Data Capture); also Platform Events |
| **Migration Tools** | Salesforce Data Loader; Data Import Wizard; Bulk API for mass operations |
| **Integration Effort** | 🟡 **MEDIUM-HIGH** — Powerful but complex; SOQL query language; multiple API paradigms |

### Pipedrive
| Attribute | Details |
|---|---|
| **API Type** | REST (fully RESTful) |
| **OAuth 2.0** | ✅ Yes — OAuth 2.0 authorization code flow; also supports API tokens |
| **Key Exportable Data** | Deals, Persons (contacts), Organizations, Activities, Notes, Products, Pipelines & Stages, Files, Mail |
| **Rate Limits** | Token-based rate limiting (introduced Dec 2024); varies by plan; ~40 req/10sec for basic plans; webhooks don't count toward rate limits |
| **Webhooks** | ✅ Yes — deal, person, organization, activity, note events; webhooks bypass rate limits |
| **Migration Tools** | CSV import; third-party migration tools (PieSync, etc.) |
| **Integration Effort** | 🟢 **LOW** — Clean RESTful API, intuitive data model, good documentation |

### Zoho CRM
| Attribute | Details |
|---|---|
| **API Type** | REST (v8 API — current version) |
| **OAuth 2.0** | ✅ Yes — OAuth 2.0 with authorization code grant, refresh tokens, client credentials |
| **Key Exportable Data** | Contacts, Accounts, Deals (potentials/pipeline), Leads, Tasks, Events, Calls, Products, Quotes, Sales Orders, Invoices, Custom Modules |
| **Rate Limits** | Based on edition: Free=1K/day, Standard=5K/day, Professional=15K/day, Enterprise=25K/day; bulk insert/update 100 records/call |
| **Webhooks** | ✅ Yes — workflow-based webhooks (via automation rules); limited to specific module events |
| **Migration Tools** | Zoho Migration tools; CSV import; built-in data import wizard |
| **Integration Effort** | 🟡 **MEDIUM** — Good API but rate limits can be restrictive on lower tiers |

### Copper (G Suite CRM)
| Attribute | Details |
|---|---|
| **API Type** | REST (JSON-formatted responses) |
| **OAuth 2.0** | ✅ Yes — Google OAuth 2.0 (deep G Suite integration) |
| **Key Exportable Data** | People (contacts), Companies, Opportunities (pipeline), Projects, Tasks, Activities, Custom Fields |
| **Rate Limits** | 180 req/min per account; 600 notifications/min per account (webhooks) |
| **Webhooks** | ✅ Yes — up to 10 subscriptions; 600 notifications/min; 1,800 per 10-min window |
| **Migration Tools** | CSV import; Google Contacts sync; limited native migration tools |
| **Integration Effort** | 🟢 **LOW-MEDIUM** — Simple REST API, good for Google-centric users |

---

## 2. Project Management

### Asana
| Attribute | Details |
|---|---|
| **API Type** | REST |
| **OAuth 2.0** | ✅ Yes — OAuth 2.0 with authorization code grant; also supports PAT |
| **Key Exportable Data** | Projects, Tasks, Subtasks, Sections, Tags, Stories (comments/activity), Custom Fields, Teams, Workspaces, Attachments |
| **Rate Limits** | ~1,500 req/min per token; minute-long windows |
| **Webhooks** | ✅ Yes — 10,000 per app token, 1,000 per resource; supports project, task, and story events |
| **Migration Tools** | CSV import; native Asana integration marketplace |
| **Integration Effort** | 🟢 **LOW** — Excellent API docs, predictable REST endpoints, generous rate limits |

### Trello
| Attribute | Details |
|---|---|
| **API Type** | REST |
| **OAuth 2.0** | ⚠️ Partial — OAuth 1.0a and API key/token; NOT full OAuth 2.0 |
| **Key Exportable Data** | Boards, Lists, Cards, Labels, Members, Checklists, Attachments, Actions (activity log), Custom Fields |
| **Rate Limits** | 300 req/10sec per API key; 100 req/10sec per token |
| **Webhooks** | ✅ Yes — callback-based webhooks on board, list, card, and label changes |
| **Migration Tools** | JSON export per board; limited bulk export; third-party tools |
| **Integration Effort** | 🟢 **LOW** — Simple API, flat data model, but OAuth 1.0a is dated |

### Monday.com
| Attribute | Details |
|---|---|
| **API Type** | GraphQL (primary); no REST API |
| **OAuth 2.0** | ✅ Yes — OAuth 2.0 authorization code flow |
| **Key Exportable Data** | Boards, Items (rows), Columns, Groups, Updates (comments), Tags, Workspaces, Files, Activity Logs |
| **Rate Limits** | Complexity-based: 10M complexity points/min per account; daily limit varies by plan; timeout at 30sec per query |
| **Webhooks** | ✅ Yes — per-board webhooks; supports item creation, update, and column value changes |
| **Migration Tools** | CSV import; Monday.com integrations; export to Excel |
| **Integration Effort** | 🟡 **MEDIUM** — GraphQL-only adds complexity; complexity-based rate limiting is non-standard |

### ClickUp
| Attribute | Details |
|---|---|
| **API Type** | REST |
| **OAuth 2.0** | ✅ Yes — OAuth 2.0 authorization code flow; also API tokens |
| **Key Exportable Data** | Spaces, Folders, Lists, Tasks, Subtasks, Time Tracking, Tags, Custom Fields, Goals, Documents, Comments, Attachments |
| **Rate Limits** | Free/Unlimited/Business: 100 req/min per token; Business Plus: 1,000 req/min; Enterprise: custom |
| **Webhooks** | ✅ Yes — task events (create, update, delete), list events |
| **Migration Tools** | CSV import; ClickUp import from other PM tools |
| **Integration Effort** | 🟢 **LOW** — Straightforward REST API; includes time tracking data natively |

### Basecamp
| Attribute | Details |
|---|---|
| **API Type** | REST (Basecamp 3/4 API) |
| **OAuth 2.0** | ✅ Yes — OAuth 2.0 via Basecamp/37signals |
| **Key Exportable Data** | Projects, To-do Lists, To-dos, Messages, Campfires (chat), Schedules, Documents, Uploads, Card Tables (kanban) |
| **Rate Limits** | 50 req/10sec per IP address |
| **Webhooks** | ✅ Yes — per-project webhooks; supports recording events |
| **Migration Tools** | Limited; no CSV import; manual setup recommended |
| **Integration Effort** | 🟡 **MEDIUM** — Simple API but low rate limits; no time tracking; no bulk import |

### Jira
| Attribute | Details |
|---|---|
| **API Type** | REST (v2 and v3); also JQL (Jira Query Language) |
| **OAuth 2.0** | ✅ Yes — OAuth 2.0 (Cloud); OAuth 1.0a also supported; API tokens |
| **Key Exportable Data** | Issues (tasks/bugs/stories), Projects, Boards, Sprints, Epics, Worklogs (time tracking), Comments, Attachments, Custom Fields |
| **Rate Limits** | Complexity-based (Cloud); ~10 concurrent requests; varies by plan |
| **Webhooks** | ✅ Yes — extensive; per-project or global; issue, sprint, project events |
| **Migration Tools** | Jira Data Loader; CSV import; native migration from other tools |
| **Integration Effort** | 🟡 **MEDIUM** — Powerful but complex API; JQL learning curve; good for dev agencies |

### Notion
| Attribute | Details |
|---|---|
| **API Type** | REST |
| **OAuth 2.0** | ✅ Yes — OAuth 2.0 public integrations; also internal integration tokens |
| **Key Exportable Data** | Databases, Pages (documents), Blocks (content), Properties, Users, Comments |
| **Rate Limits** | 3 req/sec average per connection; ~2,700 API calls per 15-min window |
| **Webhooks** | ❌ **No native webhooks** — Must poll for changes; third-party workarounds via Zapier/Make |
| **Migration Tools** | CSV import for databases; HTML/Markdown export |
| **Integration Effort** | 🟡 **MEDIUM** — Good API but NO webhooks; strict rate limits; flexible data model requires schema mapping |

---

## 3. Invoicing & Payments

### FreshBooks
| Attribute | Details |
|---|---|
| **API Type** | REST |
| **OAuth 2.0** | ✅ Yes — OAuth 2.0 authorization code grant with refresh tokens |
| **Key Exportable Data** | Clients, Invoices, Estimates, Expenses, Time Entries, Projects, Payments, Reports, Taxes, Items |
| **Rate Limits** | Not publicly published; throttling enforced; recommended ~5 req/sec with concurrency of 3 |
| **Webhooks** | ✅ Yes — invoice, estimate, payment, expense, time entry events |
| **Migration Tools** | CSV import; limited native migration |
| **Integration Effort** | 🟢 **LOW** — Clean REST API, comprehensive data model including time tracking |

### QuickBooks (Online)
| Attribute | Details |
|---|---|
| **API Type** | REST |
| **OAuth 2.0** | ✅ Yes — OAuth 2.0 required; no API keys; authorization code grant with refresh tokens |
| **Key Exportable Data** | Customers, Invoices, Estimates, Payments, Bills, Expenses, Purchase Orders, Products/Services, Reports (P&L, Balance Sheet), Journal Entries |
| **Rate Limits** | 10 concurrent requests per realmID; 500 req/min per app; sandbox: 100 req/min |
| **Webhooks** | ✅ Yes — entity-level webhooks (create, update, delete) for customers, invoices, payments, etc. |
| **Migration Tools** | QuickBooks import (CSV/Excel); built-in conversion tools; extensive partner integrations |
| **Integration Effort** | 🟡 **MEDIUM** — Mature API but strict concurrent limits; complex financial data model |

### Xero
| Attribute | Details |
|---|---|
| **API Type** | REST; also GraphQL (limited — bank feeds) |
| **OAuth 2.0** | ✅ Yes — OAuth 2.0 with authorization code + client credentials flows |
| **Key Exportable Data** | Contacts, Invoices, Quotes, Payments, Bank Transactions, Purchase Orders, Bills, Expenses, Projects, Time Entries, Tracking Categories, Reports |
| **Rate Limits** | 5 concurrent calls; 60 calls/min; daily: 1K (Starter), 5K (Standard), 10K (Premium) |
| **Webhooks** | ✅ Yes — event-driven webhooks with signature verification; contact, invoice, payment events |
| **Migration Tools** | CSV import; Xero-to-Xero org migration; conversion tools |
| **Integration Effort** | 🟢 **LOW-MEDIUM** — Good API with comprehensive data; daily limits can be restrictive |

### Wave
| Attribute | Details |
|---|---|
| **API Type** | REST + GraphQL |
| **OAuth 2.0** | ✅ Yes — OAuth 2.0 authorization code grant |
| **Key Exportable Data** | Customers, Invoices, Products, Payments, Transactions, Accounts, Taxes, Receipts |
| **Rate Limits** | Not explicitly published; throttling applied; GraphQL query depth limits |
| **Webhooks** | ❌ No native webhooks |
| **Migration Tools** | CSV import; limited migration tools |
| **Integration Effort** | 🟡 **MEDIUM** — Has API but less mature; no webhooks; smaller ecosystem |

### Stripe
| Attribute | Details |
|---|---|
| **API Type** | REST |
| **OAuth 2.0** | ✅ Partial — Stripe Connect uses OAuth 2.0 for platform→connected account access; standard API uses API keys |
| **Key Exportable Data** | Customers, Invoices, Payments, Subscriptions, Refunds, Disputes, Payouts, Balance Transactions, Products, Prices, Charges |
| **Rate Limits** | 100 read req/sec (average); 25 write req/sec; rate limit headers in responses |
| **Webhooks** | ✅ Yes — comprehensive; 40+ event types; signature verification; retry logic |
| **Migration Tools** | N/A (payment processor); Stripe Data Pipeline to Snowflake/BigQuery; Sigma for SQL queries |
| **Integration Effort** | 🟢 **LOW** — Gold-standard API; best-in-class documentation; excellent webhooks |

---

## 4. Freelance Platforms

### Upwork
| Attribute | Details |
|---|---|
| **API Type** | REST |
| **OAuth 2.0** | ✅ Yes — OAuth 2.0 authorization code flow |
| **Key Exportable Data** | Jobs/Contracts, Freelancer Profiles, Messages, Time Reports, Milestones, Work Diaries, Transactions, Teams |
| **Rate Limits** | 300 req/min per IP; 10 req/sec per IP; HTTP 429 when exceeded |
| **Webhooks** | ❌ No native webhooks — Must poll for changes |
| **Migration Tools** | No migration tools; export limited to API access |
| **Integration Effort** | 🟡 **MEDIUM** — Has API but no webhooks; OAuth setup required; data access limited to own account |

### Fiverr
| Attribute | Details |
|---|---|
| **API Type** | ❌ **No public API** |
| **OAuth 2.0** | ❌ Not available |
| **Key Exportable Data** | N/A — Only manual export; unofficial Python scraper exists (against ToS) |
| **Rate Limits** | N/A |
| **Webhooks** | ❌ Not available |
| **Migration Tools** | None |
| **Integration Effort** | 🔴 **NOT VIABLE** — No public API; scraping violates ToS |

### Toptal
| Attribute | Details |
|---|---|
| **API Type** | ❌ **No public API** |
| **OAuth 2.0** | ❌ Not available |
| **Key Exportable Data** | N/A — No programmatic access; Toptal is a curated talent network, not a marketplace |
| **Rate Limits** | N/A |
| **Webhooks** | ❌ Not available |
| **Migration Tools** | None |
| **Integration Effort** | 🔴 **NOT VIABLE** — No public API; closed platform |

### Freelancer.com
| Attribute | Details |
|---|---|
| **API Type** | REST |
| **OAuth 2.0** | ✅ Yes — OAuth 2.0 |
| **Key Exportable Data** | Projects, Bids, Milestones, Messages, Freelancer Profiles, Employer Info, Contests, Reviews |
| **Rate Limits** | Published in docs; not widely documented numerically; pagination required |
| **Webhooks** | ❌ No native webhooks |
| **Migration Tools** | None |
| **Integration Effort** | 🟡 **MEDIUM** — API primarily for marketplace building, not data extraction |

---

## 5. Proposal & Contract Tools

### PandaDoc
| Attribute | Details |
|---|---|
| **API Type** | REST |
| **OAuth 2.0** | ✅ Yes — OAuth 2.0 with sandbox/production environments; also API keys |
| **Key Exportable Data** | Documents (proposals/contracts), Templates, Contacts, Recipients, Sessions, Form Fields, Payments |
| **Rate Limits** | 60 req/min default; per-minute and per-day limits; not fully published |
| **Webhooks** | ✅ Yes — document events (created, sent, viewed, completed, declined) |
| **Migration Tools** | CSV import for contacts; template import; limited migration tools |
| **Integration Effort** | 🟢 **LOW** — Good API, comprehensive document lifecycle webhooks, sandbox environment |

### DocuSign
| Attribute | Details |
|---|---|
| **API Type** | REST (eSignature API, Rooms API, Click API, Monitor API) |
| **OAuth 2.0** | ✅ Yes — OAuth 2.0 with multiple grant types (authorization code, JWT, implicit) |
| **Key Exportable Data** | Envelopes, Documents, Templates, Recipients, Custom Fields, Signing Status, Tabs (form fields), Audit Trails |
| **Rate Limits** | 3,000 req/hour per account (default); 500 req per 30-sec burst; 1 GET per unique envelope per 15 min |
| **Webhooks** | ✅ Yes — Connect (webhook) service; envelope-level events; reliable with retry logic |
| **Migration Tools** | Template migration; bulk send; CSV import for recipients |
| **Integration Effort** | 🟡 **MEDIUM** — Enterprise-grade API with complex envelope model; good webhooks |

### Proposify
| Attribute | Details |
|---|---|
| **API Type** | REST |
| **OAuth 2.0** | ✅ Yes — OAuth 2.0 Bearer token authentication |
| **Key Exportable Data** | Proposals, Templates, Contacts, Content Library, Values, Stats |
| **Rate Limits** | Not publicly documented |
| **Webhooks** | ❓ Unclear — No clear documentation on webhook support |
| **Migration Tools** | CSV import; template import from other tools |
| **Integration Effort** | 🟡 **MEDIUM** — Newer public API; less mature; limited documentation |

### Bonsai (HelloBonsai)
| Attribute | Details |
|---|---|
| **API Type** | ❌ **No public API** (for the freelance management product) |
| **OAuth 2.0** | ❌ Not available |
| **Key Exportable Data** | N/A — Manual export only; proposals, contracts, invoices, time tracking via UI only |
| **Rate Limits** | N/A |
| **Webhooks** | ❌ Not available |
| **Migration Tools** | CSV export; no import API |
| **Integration Effort** | 🔴 **NOT VIABLE** — No public API for the freelance management product |

### HoneyBook
| Attribute | Details |
|---|---|
| **API Type** | ❌ **No public API** |
| **OAuth 2.0** | ❌ Not available |
| **Key Exportable Data** | N/A — Only via Zapier integration (limited); manual export |
| **Rate Limits** | N/A |
| **Webhooks** | ❌ Not available directly |
| **Migration Tools** | CSV import for contacts; Zapier for limited integrations |
| **Integration Effort** | 🔴 **NOT VIABLE** — No public developer program or direct API access |

---

## Summary Comparison Matrix

| Tool | API | OAuth 2.0 | Webhooks | Rate Limits | Viability |
|---|---|---|---|---|---|
| **HubSpot** | REST | ✅ | ✅ | 100/10sec | 🟢 Excellent |
| **Salesforce** | REST/SOAP/Bulk | ✅ | ✅ (Streaming) | Edition-based | 🟡 Good |
| **Pipedrive** | REST | ✅ | ✅ | Token-based | 🟢 Excellent |
| **Zoho CRM** | REST (v8) | ✅ | ✅ (Limited) | 1K-25K/day | 🟡 Good |
| **Copper** | REST | ✅ | ✅ | 180/min | 🟢 Good |
| **Asana** | REST | ✅ | ✅ | ~1,500/min | 🟢 Excellent |
| **Trello** | REST | OAuth 1.0a | ✅ | 300/10sec | 🟢 Good |
| **Monday.com** | GraphQL | ✅ | ✅ | Complexity-based | 🟡 Good |
| **ClickUp** | REST | ✅ | ✅ | 100-1,000/min | 🟢 Excellent |
| **Basecamp** | REST | ✅ | ✅ | 50/10sec | 🟡 Moderate |
| **Jira** | REST | ✅ | ✅ | Complexity-based | 🟡 Good |
| **Notion** | REST | ✅ | ❌ | 3/sec | 🟡 Moderate |
| **FreshBooks** | REST | ✅ | ✅ | ~5/sec | 🟢 Good |
| **QuickBooks** | REST | ✅ | ✅ | 10 concurrent | 🟡 Good |
| **Xero** | REST | ✅ | ✅ | 60/min, 5K/day | 🟡 Good |
| **Wave** | REST+GQL | ✅ | ❌ | Undocumented | 🟡 Moderate |
| **Stripe** | REST | Connect OAuth | ✅ | 100 read/sec | 🟢 Excellent |
| **Upwork** | REST | ✅ | ❌ | 300/min | 🟡 Moderate |
| **Fiverr** | ❌ | ❌ | ❌ | N/A | 🔴 Not viable |
| **Toptal** | ❌ | ❌ | ❌ | N/A | 🔴 Not viable |
| **Freelancer.com** | REST | ✅ | ❌ | Undocumented | 🟡 Limited |
| **PandaDoc** | REST | ✅ | ✅ | 60/min | 🟢 Good |
| **DocuSign** | REST | ✅ | ✅ (Connect) | 3K/hr | 🟡 Good |
| **Proposify** | REST | ✅ | ❓ Unclear | Undocumented | 🟡 Moderate |
| **Bonsai** | ❌ | ❌ | ❌ | N/A | 🔴 Not viable |
| **HoneyBook** | ❌ | ❌ | ❌ | N/A | 🔴 Not viable |

---

## Most Viable for Axia Integration — Ranked

### Tier 1: Maximum Value, Minimal Effort (Build First)

| Rank | Tool | Category | Why |
|---|---|---|---|
| 1 | **Stripe** | Payments | Gold-standard API, best docs, excellent webhooks, 40+ event types, predictable REST design |
| 2 | **HubSpot** | CRM | Most comprehensive CRM API, excellent OAuth, robust webhooks, massive market share among agencies |
| 3 | **ClickUp** | PM + Time | REST API with native time tracking, generous rate limits (1K/min on Business+), tasks + projects + time in one |
| 4 | **Pipedrive** | CRM/Pipeline | Cleanest REST API in CRM category, pipeline-focused data model, webhooks bypass rate limits |
| 5 | **Asana** | PM | Generous rate limits, excellent webhooks, widely used by agencies, predictable data model |
| 6 | **PandaDoc** | Proposals | Good API, document lifecycle webhooks (sent/viewed/signed), fills the proposals gap |

### Tier 2: High Value, Moderate Effort (Build Second)

| Rank | Tool | Category | Why |
|---|---|---|---|
| 7 | **FreshBooks** | Invoicing | Clean API with time tracking + invoicing + expenses, webhooks, freelancer-friendly |
| 8 | **QuickBooks** | Accounting | Most popular accounting for small biz, webhooks, OAuth 2.0; strict concurrent limits |
| 9 | **Xero** | Accounting | Strong API, webhooks with signature verification, good for non-US markets |
| 10 | **Salesforce** | CRM | Highest value per customer but most complex API; reserve for enterprise tier |
| 11 | **Copper** | CRM | Easy API for Google-centric freelancers; fills G-Suite CRM niche |
| 12 | **Zoho CRM** | CRM | Large market, good API, but restrictive daily limits on lower tiers |

### Tier 3: Useful but With Caveats (Build Third)

| Rank | Tool | Category | Why |
|---|---|---|---|
| 13 | **Monday.com** | PM | GraphQL-only adds dev complexity; complexity-based rate limits are non-standard |
| 14 | **Jira** | PM | Valuable for dev agencies but complex; JQL learning curve |
| 15 | **Upwork** | Freelance | Has API but no webhooks (polling only); approval process; own-account data only |
| 16 | **DocuSign** | Contracts | Enterprise-grade but complex envelope model; restrictive rate limits |
| 17 | **Notion** | PM/Knowledge | No webhooks is a dealbreaker for real-time; polling at 3 req/sec is very limiting |
| 18 | **Trello** | PM | Simple but OAuth 1.0a is dated; limited data model for project management |
| 19 | **Basecamp** | PM | Low rate limits (50/10sec); no time tracking; limited data model |
| 20 | **Freelancer.com** | Freelance | API exists but marketplace-focused, not data-extraction focused |

### Tier 4: Not Currently Viable

| Rank | Tool | Category | Why |
|---|---|---|---|
| 21 | **Wave** | Invoicing | No webhooks; API less mature; Wave reducing free features |
| 22 | **Proposify** | Proposals | New API, unclear webhook support, limited documentation |
| 23 | **Fiverr** | Freelance | No public API; scraping violates ToS |
| 24 | **Toptal** | Freelance | No public API; closed platform |
| 25 | **Bonsai** | Freelance Mgmt | No public API for the product |
| 26 | **HoneyBook** | Freelance Mgmt | No public developer program or API |

---

## Key Recommendations for Axia

### 1. Start with the "Data-Rich Six"
**Stripe + HubSpot + ClickUp + Pipedrive + Asana + PandaDoc** cover payments, CRM/pipeline, project management (with time tracking), and proposals — the four core data domains Axia needs.

### 2. Use Unified API Aggregators as a Shortcut
Services like **Merge.dev**, **Apideck**, or **Rutter** already normalize APIs across many of these tools. They could accelerate initial integration by 3-5x, at the cost of per-connection fees.

### 3. Webhook-First Architecture
Design Axia's sync engine as webhook-primary with polling fallback. 18 of 26 tools support webhooks. For those that don't (Notion, Upwork, Wave, Fiverr, Bonsai, HoneyBook), implement scheduled polling.

### 4. OAuth 2.0 Connection Flow
Build a single OAuth 2.0 connection manager. 20 of 26 tools use OAuth 2.0 (with minor flow variations). Trello's OAuth 1.0a is the outlier — consider a compatibility shim.

### 5. Freelance Platform Gap
The freelance category is the weakest for API access. Only Upwork and Freelancer.com have APIs. For Fiverr/Toptal/Bonsai/HoneyBook, the only options are:
- Manual CSV import
- Zapier/Make as middleware (HoneyBook supports Zapier)
- Email parsing for notifications

### 6. Data Normalization Strategy
These tools share common data entities that Axia should normalize:
- **Contacts** → HubSpot Contacts, Pipedrive Persons, Asana Users, FreshBooks Clients, Stripe Customers
- **Projects/Deals** → HubSpot Deals, Pipedrive Deals, Asana Projects, ClickUp Spaces, Monday Boards
- **Invoices/Payments** → FreshBooks Invoices, QuickBooks Invoices, Xero Invoices, Stripe Charges/Invoices
- **Time Entries** → ClickUp Time Tracking, FreshBooks Time Entries, Asana (via custom fields), Jira Worklogs
- **Proposals/Contracts** → PandaDoc Documents, DocuSign Envelopes, Proposify Proposals

### 7. Rate Limit Strategy
Design a rate limit awareness layer:
- **Aggressive polling**: Stripe (100/sec), Asana (1,500/min), ClickUp (1K/min)
- **Moderate polling**: HubSpot (100/10sec), Pipedrive (~40/10sec), Copper (180/min)
- **Conservative polling**: Notion (3/sec), QuickBooks (10 concurrent), Xero (60/min, daily cap)
- **Webhook-reliant**: PandaDoc, DocuSign (avoid polling; use webhooks)

### 8. Sandboxed Development
These tools offer sandbox/developer environments:
- **Stripe**: Full test mode with test keys
- **HubSpot**: Developer sandbox accounts
- **QuickBooks**: Sandbox company
- **PandaDoc**: Sandbox API key
- **DocuSign**: Demo/sandbox environment
- **Xero**: Demo company
