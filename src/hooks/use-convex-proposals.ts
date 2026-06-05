/**
 * Convex-backed Proposals Hook for Axia
 *
 * Fetches proposals from Convex using the ENRICHED query that resolves
 * related client, member, and deal data server-side.
 * Maps everything to the frontend Proposal type with enriched fields.
 *
 * Falls back gracefully when the user is not authenticated (returns empty data).
 */

import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Proposal, ProposalStatus, RichClient, RichMember, RichDeal } from "./use-app-data";
import type { Id } from "../convex/_generated/dataModel";

// ─── Types for Convex enriched data ─────────────────────────────────────────

interface EnrichedProposalRow {
  _id: Id<"proposals">;
  userId: Id<"users">;
  workspaceId?: Id<"workspaces">;
  clientId?: Id<"clients">;
  title: string;
  status: "draft" | "sent" | "viewed" | "signed" | "declined" | "expired";
  publicToken: string;
  sections: Array<{
    id: string;
    type: "heading" | "text" | "pricing" | "terms" | "milestone" | "divider";
    content: string;
    metadata?: Record<string, unknown>;
  }>;
  totalValue: number;
  currency?: string;
  validUntil?: number;
  templateId?: Id<"proposalTemplates">;
  clientName?: string;
  clientEmail?: string;
  assignedMemberId?: Id<"workspaceMembers">;
  dealId?: Id<"deals">;
  sentAt?: number;
  viewedAt?: number;
  signedAt?: number;
  signatureData?: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
  // Enriched fields from server
  client: {
    id: Id<"clients">;
    name: string;
    platform: string;
    contactEmail: string | null;
    contactName: string | null;
  } | null;
  assignedMember: {
    id: Id<"workspaceMembers">;
    name: string;
    email: string;
    image: string | null;
    role: string;
    title: string | null;
  } | null;
  linkedDeal: {
    id: Id<"deals">;
    title: string;
    value: number;
    stageName: string;
    stageColor: string;
  } | null;
}

// ─── Hook return type ───────────────────────────────────────────────────────

export interface ConvexProposalsData {
  /** True when Convex queries are still loading */
  isLoading: boolean;
  /** True when the user is authenticated and Convex has data */
  isConvexAvailable: boolean;
  /** Mapped proposals from Convex (with enriched data) */
  proposals: Proposal[];
  /** Raw proposals from Convex (with sections, etc.) */
  rawProposals: EnrichedProposalRow[];

  // Mutations
  sendProposal: (proposalId: string) => Promise<void>;
  signProposal: (publicToken: string, signatureData: string) => Promise<void>;
  markViewed: (publicToken: string) => Promise<void>;
  deleteProposal: (proposalId: string) => Promise<void>;
  duplicateProposal: (proposalId: string) => Promise<void>;
  createProposal: (args: {
    title: string;
    sections: Array<{
      id: string;
      type: "heading" | "text" | "pricing" | "terms" | "milestone" | "divider";
      content: string;
      metadata?: Record<string, unknown>;
    }>;
    totalValue: number;
    workspaceId?: string;
    clientId?: string;
    clientName?: string;
    clientEmail?: string;
    dealId?: string;
    validUntil?: number;
    notes?: string;
    assignedMemberId?: string;
  }) => Promise<string | null>;
  updateProposal: (proposalId: string, args: {
    title?: string;
    sections?: Array<{
      id: string;
      type: "heading" | "text" | "pricing" | "terms" | "milestone" | "divider";
      content: string;
      metadata?: Record<string, unknown>;
    }>;
    totalValue?: number;
    clientId?: string;
    clientName?: string;
    clientEmail?: string;
    validUntil?: number;
    notes?: string;
  }) => Promise<void>;
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useConvexProposals(): ConvexProposalsData {
  const rawProposals = useQuery(api.proposals.crud.getProposalsEnriched, {}) as EnrichedProposalRow[] | undefined;

  const sendProposalMutation = useMutation(api.proposals.crud.sendProposal);
  const signProposalMutation = useMutation(api.proposals.crud.signProposal);
  const markViewedMutation = useMutation(api.proposals.crud.markProposalViewed);
  const deleteProposalMutation = useMutation(api.proposals.crud.deleteProposal);
  const duplicateProposalMutation = useMutation(api.proposals.crud.duplicateProposal);
  const createProposalMutation = useMutation(api.proposals.crud.createProposal);
  const updateProposalMutation = useMutation(api.proposals.crud.updateProposal);

  const isLoading = rawProposals === undefined;
  // Convex is only "available" when the user is authenticated AND has data.
  // When unauthenticated, Convex returns [] — we should fall back to mock data.
  const isConvexAvailable = !isLoading && rawProposals !== undefined && rawProposals.length > 0;

  // Map Convex enriched proposals → frontend Proposal[]
  const proposals: Proposal[] = rawProposals
    ? rawProposals.map((p: EnrichedProposalRow): Proposal => ({
        id: p._id,
        title: p.title,
        clientId: p.clientId ? String(p.clientId) : null,
        status: p.status as ProposalStatus,
        totalValue: p.totalValue,
        clientEmail: p.clientEmail ?? "",
        assignedMemberId: p.assignedMemberId ? String(p.assignedMemberId) : null,
        sentAt: p.sentAt ?? null,
        viewedAt: p.viewedAt ?? null,
        signedAt: p.signedAt ?? null,
        validUntil: p.validUntil ?? null,
        createdAt: p.createdAt,
        dealId: p.dealId ? String(p.dealId) : null,
        workspaceId: p.workspaceId ? String(p.workspaceId) : null,
        // Enriched data from server
        client: p.client ? {
          id: String(p.client.id),
          name: p.client.name,
          platform: p.client.platform,
          contactEmail: p.client.contactEmail,
          contactName: p.client.contactName,
        } : null,
        assignedMember: p.assignedMember ? {
          id: String(p.assignedMember.id),
          name: p.assignedMember.name,
          email: p.assignedMember.email,
          image: p.assignedMember.image,
          role: p.assignedMember.role,
          title: p.assignedMember.title,
        } : null,
        linkedDeal: p.linkedDeal ? {
          id: String(p.linkedDeal.id),
          title: p.linkedDeal.title,
          value: p.linkedDeal.value,
          stageName: p.linkedDeal.stageName,
          stageColor: p.linkedDeal.stageColor,
        } : null,
      }))
    : [];

  const sendProposal = async (proposalId: string) => {
    await sendProposalMutation({ proposalId: proposalId as Id<"proposals"> });
  };

  const signProposal = async (publicToken: string, signatureData: string) => {
    await signProposalMutation({ publicToken, signatureData });
  };

  const markViewed = async (publicToken: string) => {
    await markViewedMutation({ publicToken });
  };

  const deleteProposal = async (proposalId: string) => {
    await deleteProposalMutation({ proposalId: proposalId as Id<"proposals"> });
  };

  const duplicateProposal = async (proposalId: string) => {
    await duplicateProposalMutation({ proposalId: proposalId as Id<"proposals"> });
  };

  const createProposal = async (args: {
    title: string;
    sections: Array<{
      id: string;
      type: "heading" | "text" | "pricing" | "terms" | "milestone" | "divider";
      content: string;
      metadata?: Record<string, unknown>;
    }>;
    totalValue: number;
    workspaceId?: string;
    clientId?: string;
    clientName?: string;
    clientEmail?: string;
    dealId?: string;
    validUntil?: number;
    notes?: string;
    assignedMemberId?: string;
  }): Promise<string | null> => {
    const result = await createProposalMutation({
      title: args.title,
      sections: args.sections,
      totalValue: args.totalValue,
      workspaceId: args.workspaceId as Id<"workspaces"> | undefined,
      clientId: args.clientId as Id<"clients"> | undefined,
      clientName: args.clientName,
      clientEmail: args.clientEmail,
      dealId: args.dealId as Id<"deals"> | undefined,
      validUntil: args.validUntil,
      notes: args.notes,
      assignedMemberId: args.assignedMemberId as Id<"workspaceMembers"> | undefined,
    });
    return result ? String(result) : null;
  };

  const updateProposal = async (proposalId: string, args: {
    title?: string;
    sections?: Array<{
      id: string;
      type: "heading" | "text" | "pricing" | "terms" | "milestone" | "divider";
      content: string;
      metadata?: Record<string, unknown>;
    }>;
    totalValue?: number;
    clientId?: string;
    clientName?: string;
    clientEmail?: string;
    validUntil?: number;
    notes?: string;
  }) => {
    const patch: Record<string, unknown> = { proposalId: proposalId as Id<"proposals"> };
    if (args.title !== undefined) patch.title = args.title;
    if (args.sections !== undefined) patch.sections = args.sections;
    if (args.totalValue !== undefined) patch.totalValue = args.totalValue;
    if (args.clientId !== undefined) patch.clientId = args.clientId as Id<"clients">;
    if (args.clientName !== undefined) patch.clientName = args.clientName;
    if (args.clientEmail !== undefined) patch.clientEmail = args.clientEmail;
    if (args.validUntil !== undefined) patch.validUntil = args.validUntil;
    if (args.notes !== undefined) patch.notes = args.notes;
    await updateProposalMutation(patch);
  };

  return {
    isLoading,
    isConvexAvailable,
    proposals,
    rawProposals: rawProposals ?? [],
    sendProposal,
    signProposal,
    markViewed,
    deleteProposal,
    duplicateProposal,
    createProposal,
    updateProposal,
  };
}
