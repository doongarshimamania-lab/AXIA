/**
 * useNotifications — Global notification hook for Axia
 *
 * Features:
 * - Derives "reaction" notifications from live Convex data
 * - Only shows events that happened TO the user (client viewed proposal,
 *   payment received, invoice overdue) — NOT self-initiated actions
 * - Persists "last seen count" per notification type in localStorage
 * - A notification is "unseen" when its current count exceeds the last seen count
 * - Marks notifications as seen by updating the last seen count to current value
 * - Provides unread count for badge display
 *
 * Persistence strategy:
 *   Instead of storing a set of dedup keys (which change when counts change),
 *   we store a map of { notificationType: lastSeenCount }.
 *   A notification is unseen when: currentValue > lastSeenValue
 *   When marked as seen: lastSeenValue = currentValue
 *   This means notifications only re-appear when the count actually increases.
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
  /** Unique key for this notification type (stable — does NOT include count) */
  dedupKey: string;
  /** The current numeric value driving this notification (for seen tracking) */
  currentValue: number;
  /** Whether the user has seen this notification */
  seen: boolean;
}

// ─── LocalStorage helpers — stores last seen counts per notification type ──
const LAST_SEEN_KEY = "axia_notifications_last_seen";

type LastSeenMap = Record<string, number>;

function getLastSeenMap(): LastSeenMap {
  try {
    const raw = localStorage.getItem(LAST_SEEN_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveLastSeenMap(map: LastSeenMap) {
  try {
    localStorage.setItem(LAST_SEEN_KEY, JSON.stringify(map));
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

  // Persisted "last seen" state — maps notification type key → last seen count
  const [lastSeenMap, setLastSeenMap] = useState<LastSeenMap>(() => getLastSeenMap());

  // Persist when changed
  useEffect(() => {
    saveLastSeenMap(lastSeenMap);
  }, [lastSeenMap]);

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
        dedupKey: "proposal-viewed",
        currentValue: proposalViewed,
        icon: Eye,
        iconColor: "text-blue-500 bg-blue-500/10",
        title: `${proposalViewed} Proposal${proposalViewed > 1 ? "s" : ""} Viewed by Client`,
        description: "A client opened your proposal — consider following up",
        timestamp: Date.now() - 300000,
        href: "/proposals",
        isReaction: true,
        seen: false, // computed below
      });
    }

    // 2. Proposal signed by client (THEY signed — reaction)
    if (proposalSigned > 0) {
      notifs.push({
        id: "proposal-signed-reaction",
        dedupKey: "proposal-signed",
        currentValue: proposalSigned,
        icon: FileSignature,
        iconColor: "text-emerald-500 bg-emerald-500/10",
        title: `${proposalSigned} Proposal${proposalSigned > 1 ? "s" : ""} Signed`,
        description: `${fmtCurrency(proposalTotalValue)} in signed contracts — well done!`,
        timestamp: Date.now() - 600000,
        href: "/proposals",
        isReaction: true,
        seen: false,
      });
    }

    // 3. Payment received (THEY paid — reaction)
    if (invoicePaid > 0 && invoiceRevenue > 0) {
      notifs.push({
        id: "payment-received-reaction",
        dedupKey: "payment-received",
        currentValue: invoicePaid,
        icon: DollarSign,
        iconColor: "text-emerald-500 bg-emerald-500/10",
        title: `${fmtCompactCurrency(invoiceRevenue)} Payment${invoicePaid > 1 ? "s" : ""} Received`,
        description: `${invoicePaid} invoice${invoicePaid > 1 ? "s" : ""} paid by clients`,
        timestamp: Date.now() - 1800000,
        href: "/invoices",
        isReaction: true,
        seen: false,
      });
    }

    // 4. Overdue invoices (SYSTEM detected — reaction)
    if (invoiceOverdue > 0) {
      notifs.push({
        id: "invoice-overdue-reaction",
        dedupKey: "invoice-overdue",
        currentValue: invoiceOverdue,
        icon: AlertCircle,
        iconColor: "text-red-500 bg-red-500/10",
        title: `${invoiceOverdue} Overdue Invoice${invoiceOverdue > 1 ? "s" : ""}`,
        description: `${fmtCurrency(invoiceOutstanding)} outstanding — client hasn't paid on time`,
        timestamp: Date.now() - 60000,
        href: "/invoices",
        isReaction: true,
        seen: false,
      });
    }

    // 5. Deal won (milestone event — reaction-ish, it's a result)
    if (wonDeals > 0) {
      notifs.push({
        id: "deal-won-reaction",
        dedupKey: "deal-won",
        currentValue: wonDeals,
        icon: CheckCircle2,
        iconColor: "text-emerald-500 bg-emerald-500/10",
        title: `${wonDeals} Deal${wonDeals > 1 ? "s" : ""} Won`,
        description: "Congratulations! Deals moved to won stage",
        timestamp: Date.now() - 2400000,
        href: "/pipeline",
        isReaction: true,
        seen: false,
      });
    }

    // 6. Proposals sent but not yet viewed (stale — attention needed)
    if (proposalSent > 0 && proposalViewed === 0) {
      notifs.push({
        id: "proposal-not-viewed-reaction",
        dedupKey: "proposal-not-viewed",
        currentValue: proposalSent,
        icon: Clock,
        iconColor: "text-amber-500 bg-amber-500/10",
        title: `${proposalSent} Proposal${proposalSent > 1 ? "s" : ""} Awaiting View`,
        description: "Sent but not yet opened by the client",
        timestamp: Date.now() - 3600000,
        href: "/proposals",
        isReaction: true,
        seen: false,
      });
    }

    // 7. Invoices pending payment (client hasn't paid — reaction)
    const pending = invoiceTotal - invoicePaid - invoiceOverdue - invoiceDraft;
    if (pending > 0) {
      notifs.push({
        id: "invoice-pending-reaction",
        dedupKey: "invoice-pending",
        currentValue: pending,
        icon: CreditCard,
        iconColor: "text-amber-500 bg-amber-500/10",
        title: `${pending} Invoice${pending > 1 ? "s" : ""} Awaiting Payment`,
        description: "Client has been billed but hasn't paid yet",
        timestamp: Date.now() - 5400000,
        href: "/invoices",
        isReaction: true,
        seen: false,
      });
    }

    // 8. New client added (system milestone — worth knowing about)
    if (totalClients > 0 && totalClients <= 3) {
      notifs.push({
        id: "client-onboarded-reaction",
        dedupKey: "client-onboarded",
        currentValue: totalClients,
        icon: UserPlus,
        iconColor: "text-violet-500 bg-violet-500/10",
        title: `${totalClients} Client${totalClients > 1 ? "s" : ""} Onboarded`,
        description: "Your client base is growing!",
        timestamp: Date.now() - 7200000,
        href: "/clients",
        isReaction: true,
        seen: false,
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
  // A notification is "seen" when the user has acknowledged it at this count level.
  // It becomes "unseen" again only when currentValue > lastSeenValue (i.e., count increased)
  const enrichedNotifications = useMemo(
    () =>
      notifications.map((n) => {
        const lastSeenValue = lastSeenMap[n.dedupKey] ?? 0;
        const isSeen = n.currentValue <= lastSeenValue;
        return { ...n, seen: isSeen };
      }),
    [notifications, lastSeenMap]
  );

  const unseenNotifications = useMemo(
    () => enrichedNotifications.filter((n) => !n.seen),
    [enrichedNotifications]
  );

  const unreadCount = unseenNotifications.length;

  // ─── Actions ────────────────────────────────────────────────────────────
  const markAsSeen = useCallback((dedupKey: string) => {
    // Find the current value for this notification type
    const notif = notifications.find((n) => n.dedupKey === dedupKey);
    if (!notif) return;
    const currentValue = notif.currentValue;
    setLastSeenMap((prev) => ({
      ...prev,
      [dedupKey]: currentValue,
    }));
  }, [notifications]);

  const markAllSeen = useCallback(() => {
    setLastSeenMap((prev) => {
      const next = { ...prev };
      notifications.forEach((n) => {
        // Only update if current value is higher (never downgrade)
        next[n.dedupKey] = Math.max(next[n.dedupKey] ?? 0, n.currentValue);
      });
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
