# Axia — Feature & Algorithm Implementation Plan

**Created:** 2026-06-03
**Status:** DRAFT — awaiting user review and prioritization

---

## Current State Summary

| Dimension | Status |
|-----------|--------|
| Pages | 29 pages, most UI-complete but many use mock data |
| Components | 80+ components, 12+ are stubbed with mock data |
| Convex Backend | 60+ function files exist, most have real logic |
| Algorithms | 5 key algorithms (Pattern #7, WCVM, Dispute Prediction, Tier Detection, Protection Scoring) |
| Tier System | 5 tiers, localStorage-only enforcement, 3 conflicting pricing tables |
| Critical Gaps | No real payments, no server-side tier enforcement, no platform APIs, no dispute workflow, no evidence storage |

---

## PHASE 1: Fix What's Broken (Foundation)

### 1.1 Reconnect Pages to Real Convex Backend
**Priority:** 🔴 Critical
**Effort:** 2-3 days
**Files:** EvidenceLibrary.tsx, Clients.tsx, Dashboard.tsx, CollapsibleSidebar.tsx

Currently these pages use hardcoded mock data. The Convex backend functions EXIST but pages aren't calling them. We need to:

- **EvidenceLibrary.tsx** — Replace MOCK_* constants with `useQuery(api.evidence.library.getEvidenceLibraryData)` wrapped in safe-convex-react.ts (returns undefined on error, falls back to mock)
- **Clients.tsx** — Re-add tier-gated features (Trust Score, Protection Score) but with REAL Convex queries + safe fallbacks. NOT the old 857-line version — a clean rebuild.
- **CollapsibleSidebar.tsx** — Replace 7 mock objects with real Convex queries for profile, metrics, reports
- **Dashboard.tsx** — Replace mock session/metrics with real queries

**Pattern to follow for ALL pages:**
```typescript
const realData = useQuery(api.something.getData, { args });
const safeData = realData ?? MOCK_FALLBACK; // Show real data, fall back to mock
```

### 1.2 Unify Pricing & Protection Rates
**Priority:** 🟠 High
**Effort:** 0.5 day
**Files:** Subscription.tsx, tiers/tierDetection.ts, protection/protectionValue.ts

Three different pricing tables exist:
- UI: Free=$0, Starter=$9, Pro=$29, Expert=$79
- Tier Detection: Free=$0, Starter=$7, Pro=$15, Expert=$49
- Protection Value: Free=$0, Starter=$4, Pro=$8, Expert=$16

**Action:** Pick ONE source of truth. Create `src/lib/pricing.ts` with constants. Import everywhere.

### 1.3 Server-Side Tier Enforcement
**Priority:** 🔴 Critical
**Effort:** 2 days
**Files:** All Convex mutations, new middleware

Currently anyone can `localStorage.setItem('axia_subscription_tier', 'expert')` and unlock everything.

**Action:**
1. Add `subscriptionTier` field to `users` table in Convex schema
2. Every Convex mutation/action checks the user's actual tier before executing
3. Create a `requireTier(minTier)` helper in Convex
4. Remove client-side-only tier gates — make them server-validated

### 1.4 Clean Up Deprecated Files
**Priority:** 🟡 Low
**Effort:** 0.5 day
**Files:** EvidenceCollection.tsx, MilestoneProtectionTest.tsx, old backup variants

Remove 2 deprecated components and any unused imports.

---

## PHASE 2: Core Algorithms — Build New & Improve Existing

### 2.1 Pattern #7 Vulnerability Engine (UPGRADE)
**Priority:** 🟠 High
**Effort:** 3 days

**Current:** Simple 3-factor heuristic (client requirements + activity density + memo quality). Max 100 points, binary thresholds.

**Upgrade to:**
- **7 vulnerability signals** instead of 3:
  1. Missing/documented client requirements (existing)
  2. Low activity density (existing)
  3. Poor memo quality (existing)
  4. **Scope creep indicator** — work sessions extending beyond original contract scope
  5. **Communication gap** — no client messages for >48 hours during active contract
  6. **Payment timing anomaly** — client payment pattern deviates from historical average
  7. **Evidence density drop** — screenshots/memos decreasing over time

- **Weighted scoring** instead of equal 40/30/30:
  - Each signal gets a learned weight based on dispute outcome history
  - Signals interact: e.g., "scope creep + missing requirements" = multiplied risk

- **Temporal analysis** — not just current snapshot, but trajectory:
  - Is the risk increasing or decreasing?
  - When is the projected dispute window?

### 2.2 WCVM — Work Context Verification Model (UPGRADE)
**Priority:** 🟠 High
**Effort:** 4 days

**Current:** 4-requirement scorer with hardcoded work domains, fake crypto signature.

**Upgrade to:**
- **Dynamic work domain classification** — instead of hardcoded list (github, figma, etc.), learn from the user's project URLs what "work" looks like for them
- **Real cryptographic verification** — HMAC-SHA256 signature using server-side secret, not base64 JSON
- **Evidence chain scoring** — not just individual screenshots, but the NARRATIVE: does the sequence of screenshots tell a coherent work story?
- **Real-time streaming** — push WCVM score updates via Convex subscriptions, not polling
- **Client-specific requirements mapping** — fetch real client policies from `clientPolicies` table (currently hardcoded mock)

### 2.3 AI Dispute Prediction (UPGRADE)
**Priority:** 🟠 High
**Effort:** 3 days

**Current:** Rule-based (activity gaps + social media URLs) + optional GPT-4o-mini.

**Upgrade to:**
- **Multi-model ensemble:**
  - Rule engine (existing, improved)
  - Pattern matching against historical dispute outcomes
  - LLM analysis (keep GPT-4o-mini as option, add local model fallback)
- **Confidence scoring** — each prediction includes confidence level and reasoning chain
- **Preventive action suggestions** — not just "you might get disputed" but "do X, Y, Z to reduce risk by N%"
- **Learning loop** — track which predictions came true, adjust weights

### 2.4 NEW: Payment Protection Score Algorithm
**Priority:** 🔴 Critical
**Effort:** 3 days

**This is Axia's core value proposition and it doesn't exist as a unified algorithm.**

Currently scattered across: protectionValue.ts (compliance block counting), clientTrustScore.ts, clientProtectionScore.ts.

**Build as a single, cohesive algorithm:**
```
ProtectionScore = f(
  evidence_strength,      // How much proof you have
  compliance_rate,        // % of time that meets platform requirements  
  pattern7_risk,          // Vulnerability to Pattern #7 disputes
  wcvm_confidence,        // Work context verification quality
  client_trust,           // Client relationship health
  historical_outcomes,    // Past dispute win/loss rate
  platform_policy_match   // Evidence meets specific platform requirements
)
```

Output:
- Overall score (0-100)
- Per-dimension breakdown
- "If you do X, your score goes to Y" suggestions
- Dollar value of protection ($ protected / $ at risk)

### 2.5 NEW: Smart Evidence Gap Predictor
**Priority:** 🟠 High  
**Effort:** 2 days

**Current:** EvidenceGapPrediction was REMOVED from Evidence Library. But the concept is essential.

**Build new version:**
- Analyze current evidence items vs. platform requirements
- Predict WHEN the next gap will occur (not just that one exists)
- Suggest what evidence to collect RIGHT NOW to prevent it
- Factor in: time of day (when disputes typically happen), contract milestone timing, client behavior patterns

### 2.6 NEW: Dispute Outcome Simulator
**Priority:** 🟠 High
**Effort:** 2 days

**Current:** ClientDisputeSimulation was REMOVED. But simulating dispute outcomes is a key feature.

**Build new version:**
- Input: client, project, evidence items, platform
- Simulate a dispute scenario on that platform
- Output: win probability, weak spots in evidence, recommended additional evidence
- Show side-by-side: "Your evidence" vs "What platform requires"
- Tier-gated: Free sees win/lose, Starter sees win %, Pro sees detailed breakdown, Expert sees full simulation

---

## PHASE 3: Real Integrations

### 3.1 Stripe Payment Integration
**Priority:** 🔴 Critical
**Effort:** 3 days
**New files:** `src/convex/billing/stripe.ts`, `src/hooks/use-subscription.ts`

- Stripe Checkout for subscription signup
- Webhook handler for payment events
- Server-side subscription status (replaces localStorage tier)
- Cancel/upgrade/downgrade flows

### 3.2 Platform API Integration (Upwork First)
**Priority:** 🟠 High
**Effort:** 5 days
**New files:** `src/convex/platforms/upworkApi.ts`, OAuth flow

- Upwork OAuth2 connection
- Import work diary data
- Import contract/milestone data
- Import client communication history
- Real compliance check against Upwork's actual policies

### 3.3 Chrome Extension → Backend Pipeline
**Priority:** 🟠 High
**Effort:** 3 days

- Extension captures: screenshots, URL visits, mouse/keyboard activity, active tab
- Sends to Convex via authenticated API
- Backend processes into evidence items
- WCVM scores update in real-time

### 3.4 Real Evidence Storage (S3/R2)
**Priority:** 🟠 High
**Effort:** 2 days

- File upload to Cloudflare R2 or S3
- Screenshot storage with metadata
- Evidence item → file URL mapping
- Download/export with chain of custody

---

## PHASE 4: Missing Features

### 4.1 Dispute Filing Workflow
**Priority:** 🔴 Critical
**Effort:** 4 days

Complete dispute lifecycle:
1. **Detect** — Pattern #7 or compliance alert triggers
2. **Prepare** — Auto-generate evidence package from library
3. **File** — Template dispute response for specific platform
4. **Track** — Status tracking (filed → under review → resolved)
5. **Learn** — Outcome feeds back into AI prediction model

### 4.2 Notification System
**Priority:** 🟠 High
**Effort:** 2 days

- Email notifications (via Resend/SendGrid)
- In-app notification center
- Alert types: dispute risk, evidence gap, payment anomaly, compliance warning
- Convex cron jobs for periodic checks

### 4.3 Client Portal (Real)
**Priority:** 🟡 Medium
**Effort:** 3 days

- Client auth (separate from freelancer auth)
- Client sees: verification requests, evidence shared with them, protection status
- Client can request evidence verification
- Client dashboard with real data

### 4.4 Audit Trail & Chain of Custody
**Priority:** 🟡 Medium
**Effort:** 2 days

- Every evidence event logged with timestamp, hash, and actor
- Tamper detection via hash chain
- Exportable audit log for legal proceedings
- Chronological evidence timeline with integrity verification

### 4.5 Legal-Format Evidence Export
**Priority:** 🟡 Medium
**Effort:** 2 days

- PDF generation with legal formatting
- Evidence package as ZIP with manifest
- Timestamped, signed export files
- Platform-specific dispute templates (Upwork dispute form, Fiverr resolution center)

---

## PHASE 5: Polish & Scale

### 5.1 Team Features (Real Multi-Tenancy)
**Priority:** 🟡 Medium | **Effort:** 4 days

### 5.2 Premium Network (Real Connection System)
**Priority:** 🟢 Low | **Effort:** 3 days

### 5.3 Mobile Responsive Overhaul
**Priority:** 🟡 Medium | **Effort:** 2 days

### 5.4 Performance Optimization (Code Splitting)
**Priority:** 🟢 Low | **Effort:** 1 day

### 5.5 Rate Limiting & Security Hardening
**Priority:** 🟡 Medium | **Effort:** 2 days

---

## IMPLEMENTATION ORDER (Recommended)

| Week | Phase | Tasks |
|------|-------|-------|
| **Week 1** | Phase 1 | Fix broken pages, unify pricing, server-side tiers |
| **Week 2-3** | Phase 2 | Build Payment Protection Score, upgrade Pattern #7, upgrade WCVM |
| **Week 4** | Phase 2 | Smart Evidence Gap Predictor, Dispute Outcome Simulator, upgrade AI Prediction |
| **Week 5** | Phase 3 | Stripe integration, start Upwork API |
| **Week 6** | Phase 3 | Upwork API completion, Extension pipeline, Evidence storage |
| **Week 7** | Phase 4 | Dispute filing workflow, Notification system |
| **Week 8** | Phase 4 | Client portal, Audit trail, Legal export |
| **Week 9-10** | Phase 5 | Team features, Polish, Performance |

---

## ALGORITHM SPECIFICATIONS

### Payment Protection Score (NEW)

```
Input:
  - userId: ID
  - period: "week" | "month" | "quarter"

Processing:
  1. Fetch all evidence items for period
  2. Fetch all time blocks for period
  3. Fetch client policies for active clients
  4. Run Pattern #7 analysis
  5. Run WCVM context scan
  6. Fetch historical dispute outcomes

  evidence_strength = (evidence_count / expected_evidence_count) × 100
  compliance_rate = (compliant_blocks / total_blocks) × 100
  pattern7_risk = pattern7Score (0-100, inverted)
  wcvm_confidence = wcvmContextScore (0-100)
  client_trust = avg(clientTrustScores) (0-100)
  platform_match = avg(requirementMatchScores) (0-100)
  
  historical_weight = min(1, disputes_resolved / max(1, disputes_total))
  
  raw_score = (
    evidence_strength × 0.20 +
    compliance_rate × 0.20 +
    pattern7_risk × 0.15 +
    wcvm_confidence × 0.15 +
    client_trust × 0.15 +
    platform_match × 0.15
  )
  
  // Adjust for historical accuracy
  adjusted_score = raw_score × (0.7 + 0.3 × historical_weight)

Output:
  score: 0-100
  dimensions: { evidence_strength, compliance_rate, pattern7_risk, wcvm_confidence, client_trust, platform_match }
  dollar_protected: sum(protected_hours × hourly_rate)
  dollar_at_risk: sum(at_risk_hours × hourly_rate)
  suggestions: [{ action, dimension, projected_improvement }]
```

### Smart Evidence Gap Predictor (NEW)

```
Input:
  - userId: ID
  - currentTime: timestamp

Processing:
  1. Fetch platform requirements for active contracts
  2. Fetch current evidence items
  3. Calculate coverage per requirement
  4. Identify gaps (requirements with <50% coverage)
  5. Predict next gap timing based on:
     - Historical gap frequency
     - Time since last evidence capture
     - Active session duration
     - Contract milestone proximity

  gap_score = (uncovered_requirements / total_requirements) × 100
  next_gap_eta = avg_time_between_gaps - time_since_last_evidence
  
  if next_gap_eta < 30 minutes:
    urgency = "critical"
  elif next_gap_eta < 2 hours:
    urgency = "high"
  elif next_gap_eta < 1 day:
    urgency = "medium"
  else:
    urgency = "low"

Output:
  gap_score: 0-100
  gaps: [{ requirement, coverage_pct, suggested_evidence_type, urgency }]
  next_gap_eta: minutes
  urgent_actions: [{ action, prevents_gap, time_to_capture }]
```

---

**This plan is a DRAFT. User must review and prioritize before any implementation begins.**
