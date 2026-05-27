---
Task ID: 1
Agent: Main Agent
Task: Create custom Vite + Convex full-stack development skill

Work Log:
- Researched Vite + Convex stack comprehensively (architecture, functions, schema, auth, file storage, crons, deployment)
- Studied existing fullstack-dev skill for structure reference
- Designed skill with progressive disclosure: main SKILL.md + 4 reference files
- Created SKILL.md (807 lines) with YAML frontmatter, architecture diagram, 8-step workflow, non-negotiable rules, and code examples
- Created references/convex-functions.md (613 lines) — queries, mutations, actions, internal functions, pagination, search, file storage, crons, HTTP endpoints
- Created references/schema-and-db.md (452 lines) — schema definition, validators, indexes, search indexes, vector indexes, querying, design patterns
- Created references/auth-setup.md (317 lines) — Convex Auth, Clerk, OAuth, passwords, magic links, protected functions
- Created references/project-setup.md (363 lines) — scaffolding, configuration, deployment (Vercel, Netlify, self-hosting)
- Created evals/evals.json with 3 test prompts
- Ran validation, identified and fixed 5 critical issues:
  1. Added Next.js exclusion to YAML trigger description
  2. Fixed missing `returns` validators on getByAuthor query
  3. Fixed protected function example to use tokenIdentifier lookup instead of unsafe type cast
  4. Fixed saveFile return type consistency (v.id("files") instead of v.null())
  5. Fixed auth env var contradiction (OAuth secrets in Convex dashboard, not .env.local)
  6. Added error state handling for useQuery (instanceof Error check)
  7. Clarified v.optional() vs nullable fields distinction

Stage Summary:
- Custom skill created at /home/z/my-project/skills/vite-convex-dev/
- Total: ~2,552 lines across 5 files
- Covers: project scaffolding, schema, functions, auth, file storage, crons, deployment
- All validation issues resolved
- Skill is ready for packaging and use
