---
Task ID: main-session
Agent: main
Task: Complete 4-phase workspace-first architecture migration, frontend updates, GitHub release

Work Log:
- Updated deploy key in .env.local with new permissions
- Verified backend schemas already had workspaceId/teamId/sharing/customFields (partially added)
- Added processDueFollowUps internalMutation to proposals.ts (fixing cron error)
- Changed processDueReminders from mutation to internalMutation in invoices.ts
- Updated Dashboard.tsx to use workspace context and pass workspaceId to all queries
- Updated Proposals.tsx to pass workspaceId to getProposals and getProposalStats queries
- Updated Invoices.tsx to pass workspaceId to getInvoices and getInvoiceStats queries
- Updated PaymentPatterns.tsx to add workspace context and pass workspaceId
- Built frontend successfully with Vite
- Committed all changes (22 files, +2356/-636 lines)
- Pushed to GitHub main branch
- Created GitHub release v1.0.0-workspace-migration
- Uploaded clean/lean zip (7.5MB) matching webapp folder structure
- Preview server running on port 3000 (Caddy proxy on 81)

Stage Summary:
- All 4 phases of workspace migration are implemented in backend
- Frontend pages now pass workspaceId for workspace-aware data filtering
- GitHub release: https://github.com/doongarshimania-lab/AXIA/releases/tag/v1.0.0-workspace-migration
- Preview URL: https://preview-81.space-z.ai/
- Convex deploy needs re-attempt (deploy key has PushCode but not ViewData permission)
