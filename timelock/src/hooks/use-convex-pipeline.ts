/**
 * Convex-backed Pipeline Hook for Axia
 *
 * Fetches stages and deals from Convex using the ENRICHED query that resolves
 * related client, member, and proposal data server-side.
 * Maps everything to the frontend PipelineDeal type with enriched fields.
 *
 * Falls back gracefully when the user is not authenticated (returns empty data).
 */

import { useQuery, useMutation } from "@/lib/safe-convex-react";
import { api } from "../convex/_generated/api";
import type { PipelineDeal, DealStage, RichClient, RichMember, RichProposal } from "./use-app-data";
import type { Id } from "../convex/_generated/dataModel";

// ─── Stage name → DealStage mapping ─────────────────────────────────────────

const STAGE_NAME_TO_ID: Record<string, DealStage> = {
  lead: "lead",
  qualified: "qualified",
  proposal: "proposal",
  negotiation: "negotiation",
  won: "won",
  lost: "lost",
};

function stageNameToDealStage(name: string): DealStage {
  const key = name.toLowerCase();
  return STAGE_NAME_TO_ID[key] ?? "lead";
}

// ─── Types for Convex data ──────────────────────────────────────────────────

interface ConvexStage {
  _id: Id<"pipelineStages">;
  userId: Id<"users">;
  workspaceId?: Id<"workspaces">;
  name: string;
  color: string;
  order: number;
  isDefault?: boolean;
}

interface EnrichedDealRow {
  _id: Id<"deals">;
  userId: Id<"users">;
  workspaceId?: Id<"workspaces">;
  stageId: Id<"pipelineStages">;
  clientId?: Id<"clients">;
  title: string;
  description?: string;
  value: number;
  probability: number;
  currency?: string;
  source?: string;
  contactEmail?: string;
  contactName?: string;
  expectedCloseDate?: number;
  notes?: string;
  assignedMemberId?: Id<"workspaceMembers">;
  proposalId?: Id<"proposals">;
  order: number;
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
  linkedProposal: {
    id: Id<"proposals">;
    title: string;
    status: string;
    totalValue: number;
  } | null;
  stageName: string;
  stageColor: string;
}

// ─── Hook return type ───────────────────────────────────────────────────────

export interface ConvexPipelineData {
  /** True when Convex queries are still loading */
  isLoading: boolean;
  /** True when the user is authenticated and Convex has data */
  isConvexAvailable: boolean;
  /** Mapped pipeline deals from Convex (with enriched data) */
  deals: PipelineDeal[];
  /** Raw stages from Convex (for stageId lookups) */
  stages: ConvexStage[];
  /** Map from DealStage string → Convex stageId */
  stageIdMap: Map<DealStage, Id<"pipelineStages">>;
  /** Map from Convex stageId → DealStage string */
  stageIdToNameMap: Map<string, DealStage>;

  // Mutations
  createDeal: (args: {
    stage: DealStage;
    title: string;
    value: number;
    probability?: number;
    source?: string;
    contactName?: string;
    contactEmail?: string;
    expectedCloseDate?: number;
    notes?: string;
    description?: string;
    clientId?: string;
    assignedMemberId?: string;
    workspaceId?: string;
  }) => Promise<void>;
  updateDeal: (dealId: string, args: {
    title?: string;
    value?: number;
    probability?: number;
    stage?: DealStage;
    source?: string;
    contactName?: string;
    contactEmail?: string;
    expectedCloseDate?: number | null;
    notes?: string;
    description?: string;
    clientId?: string;
    assignedMemberId?: string;
  }) => Promise<void>;
  moveDeal: (dealId: string, targetStage: DealStage) => Promise<void>;
  deleteDeal: (dealId: string) => Promise<void>;
  linkDealToProposal: (dealId: string, proposalId: string) => Promise<void>;
  ensureDefaultStages: () => Promise<void>;
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useConvexPipeline(): ConvexPipelineData {
  const stages = useQuery(api.pipeline.crud.getStages) as ConvexStage[] | undefined;
  const rawDeals = useQuery(api.pipeline.crud.getDealsEnriched, {}) as EnrichedDealRow[] | undefined;

  const createDealMutation = useMutation(api.pipeline.crud.createDeal);
  const updateDealMutation = useMutation(api.pipeline.crud.updateDeal);
  const moveDealMutation = useMutation(api.pipeline.crud.moveDeal);
  const deleteDealMutation = useMutation(api.pipeline.crud.deleteDeal);
  const linkDealToProposalMutation = useMutation(api.pipeline.crud.linkDealToProposal);
  const createDefaultStagesMutation = useMutation(api.pipeline.crud.createDefaultStages);

  const isLoading = stages === undefined || rawDeals === undefined;
  const isConvexAvailable = !isLoading && stages !== undefined && stages.length > 0;

  // Build stage mapping: DealStage → Convex stageId
  const stageIdMap = new Map<DealStage, Id<"pipelineStages">>();
  const stageIdToNameMap = new Map<string, DealStage>();

  if (stages) {
    for (const stage of stages) {
      const dealStage = stageNameToDealStage(stage.name);
      stageIdMap.set(dealStage, stage._id);
      stageIdToNameMap.set(stage._id, dealStage);
    }
  }

  // Map Convex enriched deals → frontend PipelineDeal[]
  const deals: PipelineDeal[] = (rawDeals && stages)
    ? rawDeals.map((d: EnrichedDealRow): PipelineDeal => ({
        id: d._id,
        title: d.title,
        clientId: d.clientId ? String(d.clientId) : null,
        stage: stageIdToNameMap.get(d.stageId) ?? stageNameToDealStage(d.stageName) ?? "lead",
        value: d.value,
        probability: d.probability,
        source: d.source ?? "",
        contactName: d.contactName ?? "",
        contactEmail: d.contactEmail ?? "",
        expectedCloseDate: d.expectedCloseDate ?? null,
        assignedMemberId: d.assignedMemberId ? String(d.assignedMemberId) : null,
        notes: d.notes ?? "",
        createdAt: d.createdAt,
        proposalId: d.proposalId ? String(d.proposalId) : null,
        description: d.description ?? "",
        workspaceId: d.workspaceId ? String(d.workspaceId) : null,
        // Enriched data from server
        client: d.client ? {
          id: String(d.client.id),
          name: d.client.name,
          platform: d.client.platform,
          contactEmail: d.client.contactEmail,
          contactName: d.client.contactName,
        } : null,
        assignedMember: d.assignedMember ? {
          id: String(d.assignedMember.id),
          name: d.assignedMember.name,
          email: d.assignedMember.email,
          image: d.assignedMember.image,
          role: d.assignedMember.role,
          title: d.assignedMember.title,
        } : null,
        linkedProposal: d.linkedProposal ? {
          id: String(d.linkedProposal.id),
          title: d.linkedProposal.title,
          status: d.linkedProposal.status,
          totalValue: d.linkedProposal.totalValue,
        } : null,
        stageName: d.stageName,
        stageColor: d.stageColor,
      }))
    : [];

  const createDeal = async (args: {
    stage: DealStage;
    title: string;
    value: number;
    probability?: number;
    source?: string;
    contactName?: string;
    contactEmail?: string;
    expectedCloseDate?: number;
    notes?: string;
    description?: string;
    clientId?: string;
    assignedMemberId?: string;
    workspaceId?: string;
  }) => {
    const stageId = stageIdMap.get(args.stage);
    if (!stageId) throw new Error(`No Convex stage found for "${args.stage}". Ensure default stages exist.`);
    await createDealMutation({
      stageId,
      title: args.title,
      value: args.value,
      probability: args.probability,
      source: args.source,
      contactName: args.contactName,
      contactEmail: args.contactEmail,
      expectedCloseDate: args.expectedCloseDate,
      notes: args.notes,
      description: args.description,
      clientId: args.clientId as Id<"clients"> | undefined,
      assignedMemberId: args.assignedMemberId as Id<"workspaceMembers"> | undefined,
      workspaceId: args.workspaceId as Id<"workspaces"> | undefined,
    });
  };

  const updateDeal = async (dealId: string, args: {
    title?: string;
    value?: number;
    probability?: number;
    stage?: DealStage;
    source?: string;
    contactName?: string;
    contactEmail?: string;
    expectedCloseDate?: number | null;
    notes?: string;
    description?: string;
    clientId?: string;
    assignedMemberId?: string;
  }) => {
    const patch: Record<string, unknown> = { dealId: dealId as Id<"deals"> };
    if (args.title !== undefined) patch.title = args.title;
    if (args.value !== undefined) patch.value = args.value;
    if (args.probability !== undefined) patch.probability = args.probability;
    if (args.stage !== undefined) {
      const stageId = stageIdMap.get(args.stage);
      if (stageId) patch.stageId = stageId;
    }
    if (args.source !== undefined) patch.source = args.source;
    if (args.contactName !== undefined) patch.contactName = args.contactName;
    if (args.contactEmail !== undefined) patch.contactEmail = args.contactEmail;
    if (args.expectedCloseDate !== undefined) patch.expectedCloseDate = args.expectedCloseDate;
    if (args.notes !== undefined) patch.notes = args.notes;
    if (args.description !== undefined) patch.description = args.description;
    if (args.clientId !== undefined) patch.clientId = args.clientId as Id<"clients">;
    if (args.assignedMemberId !== undefined) patch.assignedMemberId = args.assignedMemberId as Id<"workspaceMembers">;
    await updateDealMutation(patch);
  };

  const moveDeal = async (dealId: string, targetStage: DealStage) => {
    const stageId = stageIdMap.get(targetStage);
    if (!stageId) throw new Error(`No Convex stage found for "${targetStage}"`);
    await moveDealMutation({
      dealId: dealId as Id<"deals">,
      stageId,
    });
  };

  const deleteDeal = async (dealId: string) => {
    await deleteDealMutation({ dealId: dealId as Id<"deals"> });
  };

  const linkDealToProposal = async (dealId: string, proposalId: string) => {
    await linkDealToProposalMutation({
      dealId: dealId as Id<"deals">,
      proposalId: proposalId as Id<"proposals">,
    });
  };

  const ensureDefaultStages = async () => {
    await createDefaultStagesMutation({});
  };

  return {
    isLoading,
    isConvexAvailable,
    deals,
    stages: stages ?? [],
    stageIdMap,
    stageIdToNameMap,
    createDeal,
    updateDeal,
    moveDeal,
    deleteDeal,
    linkDealToProposal,
    ensureDefaultStages,
  };
}
