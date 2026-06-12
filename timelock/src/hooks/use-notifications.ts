/**
 * useNotifications — Global notification hook for Axia
 *
 * Features:
 * - Derives "reaction" notifications from live Convex data
 * - Only shows events that happened TO the user (client viewed proposal,
 *   payment received, invoice overdue) — NOT self-initiated actions
 * - Persists seen/unseen state in localStorage
 * - Marks notifications as seen only when explicitly clicked
 * - Provides unread count for badge display
 *
 * Usage:
 *   const { notifications, unreadCount, markAsSeen, markAllSeen } = useNotifications();
 */

import { useMemo, useState, useEffect, useCallback } from "react";
import { useQuery } from "@/lib/safe-convex-react";
import { api } from "@/convex/_generated/api";
import { useWorkspaceContext } from "@/hooks/use-workspace";
import {
  AlertCircle,
  Eye,
  FileSignature,
  CreditCard,
  DollarSign,
  CheckCircle2,
  Clock,
  UserPlus,
  Kanban,
  FileText,
  Receipt,
  ArrowUpRight,
  TrendingDown,
  Shield,
  MessageSquare,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────
export interface AppNotification {
  id: string;
  icon: React.ElementType;
  iconColor: string;
  title: string;
  description: string;
  timestamp: number;
  href: string;
  /** Is this a reaction/external event (true) or self-initiated (false) */
  isReaction: boolean;
  /** Unique key for dedup — based on the data that generated this notification */
  dedupKey: string;
}

// ─── LocalStorage helpers ───────────────────────────────────────────────────
const SEEN_KEY = "axia_notifications_seen";

function getSeenIds(): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw));
  } catch {
    return new Set();
  }
}

function saveSeenIds(ids: Set<string>) {
  try {
    // Keep only the most recent 200 entries to avoid unbounded growth
    const arr = Array.from(ids).slice(-200);
    localStorage.setItem(SEEN_KEY, JSON.stringify(arr));
  } catch {
    // Ignore storage errors
  }
}

// ─── Format helpers ─────────────────────────────────────────────────────────
function fmtCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtCompactCurrency(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return fmtCurrency(n);
}

// ─── Hook ───────────────────────────────────────────────────────────────────
export function useNotifications() {
  const { activeWorkspaceId, isConvexConnected } = useWorkspaceContext();
  const wsId = isConvexConnected ? (activeWorkspaceId as any) : undefined;
  const queryArgs = wsId ? { workspaceId: wsId } : "skip";

  // Live Convex data
  const pipelineStats = useQuery(api.pipeline.crud.getPipelineStats, queryArgs);
  const proposalStats = useQuery(api.proposals.crud.getProposalStats, queryArgs);
  const invoiceStats = useQuery(api.billing.crud.getInvoiceStats, queryArgs);
  const clientsEnriched = useQuery(api.clients.crud.getClientsEnriched, queryArgs);
  const deals = useQuery(api.pipeline.crud.getDeals, queryArgs);
  const proposals = useQuery(api.proposals.crud.getProposals, queryArgs);
  const invoices = useQuery(api.billing.crud.getInvoices, queryArgs);
  const scopeDefinitions = useQuery(api.scope.crud.getScopeDefinitions, queryArgs);

  // Seen state
  const [seenIds, setSeenIds] = useState<Set<string>>(() => getSeenIds());

  // Persist seen state when it changes
  useEffect(() => {
    saveSeenIds(seenIds);
  }, [seenIds]);

  // ─── Build reaction notifications ──────────────────────────────────────
  const notifications: AppNotification[] = useMemo(() => {
    const notifs: AppNotification[] = [];

    // Invoice stats
    const invoiceOverdue = invoiceStats?.overdue ?? 0;
    const invoiceOutstanding = invoiceStats?.totalOutstanding ?? 0;
    const invoicePaid = invoiceStats?.paid ?? 0;
    const invoiceTotal = invoiceStats?.total ?? 0;
    const invoiceRevenue = invoiceStats?.totalRevenue ?? 0;
    const invoiceDraft = invoiceStats?.draft ?? 0;

    // Proposal stats
    const proposalViewed = proposalStats?.viewed ?? 0;
    const proposalSigned = proposalStats?.signed ?? 0;
    const proposalTotalValue = proposalStats?.totalValue ?? 0;
    const proposalSent = proposalStats?.sent ?? 0;
    const proposalTotal = proposalStats?.total ?? 0;

    // Pipeline stats
    const totalDeals = pipelineStats?.totalDeals ?? 0;
    const pipelineValue = pipelineStats?.totalValue ?? 0;
    const wonDeals = pipelineStats?.won ?? 0;

    // Client stats
    const totalClients = clientsEnriched?.length ?? 0;

    // ──── REACTION NOTIFICATIONS ────
    // These are events that happened TO the user — external actions by clients/system

    // 1. Client viewed a proposal (THEY viewed it — reaction)
    if (proposalViewed > 0) {
      notifs.push({
        id: "proposal-viewed-reaction",
        dedupKey: `proposal-viewed-${proposalViewed}`,
        icon: Eye,
        iconColor: "text-blue-500 bg-blue-500/10",
        title: `${proposalViewed} Proposal${proposalViewed > 1 ? "s" : ""} Viewed by Client`,
        description: "A client opened your proposal — consider following up",
        timestamp: Date.now() - 300000,
        href: "/proposals",
        isReaction: true,
      });
    }

    // 2. Proposal signed by client (THEY signed — reaction)
    if (proposalSigned > 0) {
      notifs.push({
        id: "proposal-signed-reaction",
        dedupKey: `proposal-signed-${proposalSigned}`,
        icon: FileSignature,
        iconColor: "text-emerald-500 bg-emerald-500/10",
        title: `${proposalSigned} Proposal${proposalSigned > 1 ? "s" : ""} Signed`,
        description: `${fmtCurrency(proposalTotalValue)} in signed contracts — well done!`,
        timestamp: Date.now() - 600000,
        href: "/proposals",
        isReaction: true,
      });
    }

    // 3. Payment received (THEY paid — reaction)
    if (invoicePaid > 0 && invoiceRevenue > 0) {
      notifs.push({
        id: "payment-received-reaction",
        dedupKey: `payment-received-${invoicePaid}-${Math.floor(invoiceRevenue / 100)}`,
        icon: DollarSign,
        iconColor: "text-emerald-500 bg-emerald-500/10",
        title: `${fmtCompactCurrency(invoiceRevenue)} Payment${invoicePaid > 1 ? "s" : ""} Received`,
        description: `${invoicePaid} invoice${invoicePaid > 1 ? "s" : ""} paid by clients`,
        timestamp: Date.now() - 1800000,
        href: "/invoices",
        isReaction: true,
      });
    }

    // 4. Overdue invoices (SYSTEM detected — reaction)
    if (invoiceOverdue > 0) {
      notifs.push({
        id: "invoice-overdue-reaction",
        dedupKey: `invoice-overdue-${invoiceOverdue}`,
        icon: AlertCircle,
        iconColor: "text-red-500 bg-red-500/10",
        title: `${invoiceOverdue} Overdue Invoice${invoiceOverdue > 1 ? "s" : ""}`,
        description: `${fmtCurrency(invoiceOutstanding)} outstanding — client hasn't paid on time`,
        timestamp: Date.now() - 60000,
        href: "/invoices",
        isReaction: true,
      });
    }

    // 5. Deal won (milestone event — reaction-ish, it's a result)
    if (wonDeals > 0) {
      notifs.push({
        id: "deal-won-reaction",
        dedupKey: `deal-won-${wonDeals}`,
        icon: CheckCircle2,
        iconColor: "text-emerald-500 bg-emerald-500/10",
        title: `${wonDeals} Deal${wonDeals > 1 ? "s" : ""} Won`,
        description: "Congratulations! Deals moved to won stage",
        timestamp: Date.now() - 2400000,
        href: "/pipeline",
        isReaction: true,
      });
    }

    // 6. Proposals sent but not yet viewed (stale — attention needed)
    if (proposalSent > 0 && proposalViewed === 0) {
      notifs.push({
        id: "proposal-not-viewed-reaction",
        dedupKey: `proposal-not-viewed-${proposalSent}`,
        icon: Clock,
        iconColor: "text-amber-500 bg-amber-500/10",
        title: `${proposalSent} Proposal${proposalSent > 1 ? "s" : ""} Awaiting View`,
        description: "Sent but not yet opened by the client",
        timestamp: Date.now() - 3600000,
        href: "/proposals",
        isReaction: true,
      });
    }

    // 7. Invoices pending payment (client hasn't paid — reaction)
    if (invoiceTotal - invoicePaid - invoiceOverdue - invoiceDraft > 0) {
      const pending = invoiceTotal - invoicePaid - invoiceOverdue - invoiceDraft;
      notifs.push({
        id: "invoice-pending-reaction",
        dedupKey: `invoice-pending-${pending}`,
        icon: CreditCard,
        iconColor: "text-amber-500 bg-amber-500/10",
        title: `${pending} Invoice${pending > 1 ? "s" : ""} Awaiting Payment`,
        description: "Client has been billed but hasn't paid yet",
        timestamp: Date.now() - 5400000,
        href: "/invoices",
        isReaction: true,
      });
    }

    // 8. New client added (system milestone — worth knowing about)
    if (totalClients > 0 && totalClients <= 3) {
      notifs.push({
        id: "client-onboarded-reaction",
        dedupKey: `client-onboarded-${totalClients}`,
        icon: UserPlus,
        iconColor: "text-violet-500 bg-violet-500/10",
        title: `${totalClients} Client${totalClients > 1 ? "s" : ""} Onboarded`,
        description: "Your client base is growing!",
        timestamp: Date.now() - 7200000,
        href: "/clients",
        isReaction: true,
      });
    }

    // Sort by timestamp (most recent first)
    notifs.sort((a, b) => b.timestamp - a.timestamp);
    return notifs;
  }, [
    invoiceStats, proposalStats, pipelineStats, clientsEnriched,
    deals, proposals, invoices, scopeDefinitions,
  ]);

  // ─── Compute seen/unseen state ─────────────────────────────────────────
  const unseenNotifications = useMemo(
    () => notifications.filter((n) => !seenIds.has(n.dedupKey)),
    [notifications, seenIds]
  );

  const unreadCount = unseenNotifications.length;

  const enrichedNotifications = useMemo(
    () =>
      notifications.map((n) => ({
        ...n,
        seen: seenIds.has(n.dedupKey),
      })),
    [notifications, seenIds]
  );

  // ─── Actions ────────────────────────────────────────────────────────────
  const markAsSeen = useCallback((dedupKey: string) => {
    setSeenIds((prev) => {
      const next = new Set(prev);
      next.add(dedupKey);
      return next;
    });
  }, []);

  const markAllSeen = useCallback(() => {
    setSeenIds((prev) => {
      const next = new Set(prev);
      notifications.forEach((n) => next.add(n.dedupKey));
      return next;
    });
  }, [notifications]);

  return {
    notifications: enrichedNotifications,
    unseenNotifications,
    unreadCount,
    markAsSeen,
    markAllSeen,
  };
}
