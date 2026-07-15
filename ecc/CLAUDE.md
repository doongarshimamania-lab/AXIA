# Axia Project — ECC-Integrated Configuration

## Project Overview

**Axia** — A freelancer/agency protection SaaS platform that helps freelancers and agencies protect their work, manage contracts, invoices, and proposals.

**Stack:** Vite + React + TypeScript + Tailwind CSS + shadcn/ui + Convex (reactive backend)

**Architecture:** Client-side React SPA with Convex as the reactive backend. Convex handles all data, auth, and real-time updates. No traditional server-side rendering.

## ECC Integration

This project uses **ECC (Everything Claude Code) v2.0.0-rc.1** as its development operating system. All code should follow ECC's principles, patterns, and agent workflows.

### Core Principles (from ECC SOUL.md)

1. **Agent-First** — Route work to the right specialist as early as possible
2. **Test-Driven** — Write or refresh tests before trusting implementation changes
3. **Security-First** — Validate inputs, protect secrets, keep safe defaults
4. **Immutability** — Prefer explicit state transitions over mutation
5. **Plan Before Execute** — Complex changes should be broken into deliberate phases

### Active ECC Skills (use these when working on related files)

| File Pattern | ECC Skill |
|---|---|
| `*.tsx`, `*.jsx`, `components/**` | `frontend-patterns`, `react-patterns`, `react-testing` |
| `convex/**` (queries, mutations) | `backend-patterns`, `api-design` |
| `src/lib/**`, `src/hooks/**` | `react-patterns`, `coding-standards` |
| Auth, secrets, env vars | `security-review`, `security-scan` |
| `*.test.*`, `*.spec.*` | `tdd-workflow`, `react-testing`, `e2e-testing` |
| CSS, styling, design | `frontend-design-direction` |
| Deployment, CI/CD | `deployment-patterns`, `production-audit` |

### Active ECC Agents (delegate to when appropriate)

| Agent | When to Use |
|---|---|
| `react-reviewer` | Reviewing .tsx/.jsx files for hook correctness, performance, accessibility |
| `typescript-reviewer` | Reviewing .ts/.tsx for type safety, async correctness, security |
| `code-reviewer` | General quality review |
| `security-reviewer` | Vulnerability analysis, auth checks |
| `planner` | Feature implementation planning |
| `architect` | System design decisions |
| `tdd-guide` | Test-driven development |
| `build-error-resolver` | Fixing build errors |
| `react-build-resolver` | Fixing React-specific build errors |
| `performance-optimizer` | Performance improvements |
| `database-reviewer` | Convex schema and query review |

## Critical Rules

### Convex Backend
- All data operations use Convex queries/mutations — never bypass Convex
- Schema definitions in `convex/schema.ts` — always update schema when adding features
- Use `@convex-dev/auth` for authentication — never roll your own auth
- Environment variables on Convex cloud: `PLATFORM_SECRET_KEY`, `JWT_SECRET_KEY`, `ENCRYPTION_KEY`
- Frontend connects via `VITE_CONVEX_URL` in `.env.local`

### React/TypeScript
- No `any` types — use `unknown` and narrow safely
- Immutable patterns only — spread operator, never mutate state
- Custom hooks prefixed with `use` — e.g., `useProjects`, `useAuth`
- Component props defined with named `interface` or `type`
- No `console.log` in production code
- Use Zod schemas for input validation where applicable
- Error boundaries around async/data-fetching subtrees

### Security (ECC Security Guidelines)
- No hardcoded secrets
- All user inputs validated
- Authentication/authorization verified on all protected routes
- Error messages don't leak sensitive data
- Rate limiting on all Convex mutations

### Code Style
- No emojis in code or comments
- Immutable patterns only — spread operator, never mutate
- Prefer `const` by default, `let` when reassignment is needed
- Use strict equality `===` throughout
- Named exports preferred over default exports

## File Structure

```
src/
  components/
    ui/              # shadcn/ui components
    pipeline/        # Pipeline components (Proposals, Invoices, etc.)
    layout/          # Layout components
    dashboard/       # Dashboard-specific components
  hooks/             # Custom React hooks
  lib/               # Utility functions, shared logic
  pages/             # Page components
convex/
  schema.ts          # Convex schema definition
  queries.ts         # Convex query functions
  mutations.ts       # Convex mutation functions
  auth.ts            # Auth configuration
  _generated/        # Auto-generated Convex types
.ecc/                # ECC integration (rules, skills, agents, commands)
```

## API Response Format (Convex → Frontend)

```typescript
// Convex queries return typed data directly
// Error handling follows ECC backend-patterns
type ApiResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string }
```

## ECC Workflow

When implementing features for Axia:

1. **Plan** — Use `planner` agent to break down the feature
2. **Design** — Use `architect` agent for system design decisions
3. **Implement** — Follow `frontend-patterns` and `react-patterns` skills
4. **Review** — Use `react-reviewer` + `typescript-reviewer` for code review
5. **Secure** — Use `security-reviewer` for auth/security sensitive code
6. **Test** — Follow `tdd-workflow` and `react-testing` skills
7. **Verify** — Use `verification-loop` for continuous verification

## Environment Variables

```bash
# Frontend (.env.local)
VITE_CONVEX_URL=https://artful-civet-344.convex.cloud

# Backend (Convex Cloud)
PLATFORM_SECRET_KEY=    # Platform secret for API access
JWT_SECRET_KEY=         # JWT signing key
ENCRYPTION_KEY=         # Data encryption key
```

## Testing Strategy

| Layer | Target | Tool |
|---|---|---|
| Unit (hooks, utils) | >=85% | Vitest + React Testing Library |
| Component | >=80% | Vitest + React Testing Library |
| E2E (critical flows) | Golden paths | Playwright |
| Security | Auth + billing | security-reviewer agent |

## Git Workflow

- `feat:` new features, `fix:` bug fixes, `refactor:` code changes
- Feature branches from `main`, PRs required
- Before commit: `/code-review`, `/security-scan`
- Before release: `/quality-gate`, `/test-coverage`
