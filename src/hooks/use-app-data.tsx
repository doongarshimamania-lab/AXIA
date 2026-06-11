/**
 * Centralized Data Store for Axia
 *
 * All pages share this single source of truth. Every entity cross-references
 * others by ID so the UI can show connected data (e.g. which team members
 * are on a project, which projects belong to a client, etc.).
 *
 * HYBRID DATA SOURCE:
 * Pipeline deals and proposals use Convex as the primary data source when
 * the user is authenticated. When Convex returns no data (unauthenticated),
 * the mock data is used as a fallback. Other entities still use local state.
 */

import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from "react";
import { useConvexPipeline } from "./use-convex-pipeline";
import { useConvexProposals } from "./use-convex-proposals";
import { STAGE_COLORS } from "@/lib/tokens";

// ─── Shared Types ────────────────────────────────────────────────────────────

export type WorkspaceRole = "owner" | "manager" | "member";
export type MemberStatus = "active" | "invited" | "removed";

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: WorkspaceRole;
  status: MemberStatus;
  avatar?: string;
  joinedAt: number;
  lastActiveAt: number | null;
  title: string; // e.g. "Senior Developer", "UI Designer"
  hoursThisWeek: number;
}

export interface Client {
  id: string;
  name: string;
  platform: "upwork" | "fiverr" | "toptal" | "freelancer" | "direct";
  hourlyRate: number;
  contractType: "hourly" | "fixed";
  riskLevel: "low" | "medium" | "high";
  protectionScore: number;
  totalHours: number;
  totalValue: number;
  addedAt: number;
  lastActivityAt: number;
  assignedMemberIds: string[];
  contactEmail: string;
  contactName: string;
  notes: string;
}

export type ProjectStatus = "active" | "paused" | "completed" | "at_risk";
export type ProjectType = "ongoing" | "fixed" | "milestone";

export interface Project {
  id: string;
  name: string;
  clientId: string;
  status: ProjectStatus;
  projectType: ProjectType;
  protectionLevel: "standard" | "enhanced" | "maximum";
  protectionScore: number;
  hourlyRate: number;
  totalHours: number;
  totalValue: number;
  atRiskAmount: number;
  rejectedHours: number;
  assignedMemberIds: string[];
  createdAt: number;
  lastActivityAt: number;
  deadline: number | null;
  description: string;
  tags: string[];
}

export type InvoiceStatus = "draft" | "sent" | "viewed" | "paid" | "overdue";

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
  hasProof?: boolean;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  clientId: string;
  projectId: string | null;
  status: InvoiceStatus;
  issueDate: number;
  dueDate: number;
  paidDate?: number;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  notes: string;
  proofCount: number;
}

export interface TimeEntry {
  id: string;
  projectId: string;
  memberId: string;
  platform: "upwork" | "fiverr" | "toptal" | "manual";
  startTime: number;
  endTime: number | null;
  duration: number; // ms
  memo: string;
  compliance: "compliant" | "at_risk" | "flagged";
  tags: string[];
}

export type DealStage = "lead" | "qualified" | "proposal" | "negotiation" | "won" | "lost";

export interface RichClient {
  id: string;
  name: string;
  platform: string;
  contactEmail: string | null;
  contactName: string | null;
}

export interface RichMember {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: string;
  title: string | null;
}

export interface RichProposal {
  id: string;
  title: string;
  status: string;
  totalValue: number;
}

export interface RichDeal {
  id: string;
  title: string;
  value: number;
  stageName: string;
  stageColor: string;
}

export interface PipelineDeal {
  id: string;
  title: string;
  clientId: string | null;
  stage: DealStage;
  value: number;
  probability: number;
  source: string;
  contactName: string;
  contactEmail: string;
  expectedCloseDate: number | null;
  assignedMemberId: string | null;
  notes: string;
  createdAt: number;
  proposalId?: string | null;
  description?: string;
  workspaceId?: string | null;
  // Enriched fields (resolved server-side from Convex)
  client?: RichClient | null;
  assignedMember?: RichMember | null;
  linkedProposal?: RichProposal | null;
  stageName?: string;
  stageColor?: string;
}

export type ProposalStatus = "draft" | "sent" | "viewed" | "signed" | "declined" | "expired";

export interface Proposal {
  id: string;
  title: string;
  clientId: string | null;
  status: ProposalStatus;
  totalValue: number;
  clientEmail: string;
  assignedMemberId: string | null;
  sentAt: number | null;
  viewedAt: number | null;
  signedAt: number | null;
  validUntil: number | null;
  createdAt: number;
  dealId?: string | null;
  workspaceId?: string | null;
  // Enriched fields (resolved server-side from Convex)
  client?: RichClient | null;
  assignedMember?: RichMember | null;
  linkedDeal?: RichDeal | null;
}

// ─── Rich Mock Data ──────────────────────────────────────────────────────────

const INITIAL_TEAM_MEMBERS: TeamMember[] = [
  {
    id: "mem_001",
    name: "Alex Rivera",
    email: "alex.rivera@axiaagency.com",
    role: "owner",
    status: "active",
    joinedAt: Date.now() - 90 * 24 * 60 * 60 * 1000,
    lastActiveAt: Date.now() - 5 * 60 * 1000,
    title: "Founder & Creative Director",
    hoursThisWeek: 34.5,
  },
  {
    id: "mem_002",
    name: "Priya Sharma",
    email: "priya.sharma@axiaagency.com",
    role: "manager",
    status: "active",
    joinedAt: Date.now() - 60 * 24 * 60 * 60 * 1000,
    lastActiveAt: Date.now() - 15 * 60 * 1000,
    title: "Senior Project Manager",
    hoursThisWeek: 28.0,
  },
  {
    id: "mem_003",
    name: "Jordan Kim",
    email: "jordan.kim@axiaagency.com",
    role: "manager",
    status: "active",
    joinedAt: Date.now() - 45 * 24 * 60 * 60 * 1000,
    lastActiveAt: Date.now() - 2 * 60 * 60 * 1000,
    title: "Account Manager",
    hoursThisWeek: 22.5,
  },
  {
    id: "mem_004",
    name: "Sam Chen",
    email: "sam.chen@axiaagency.com",
    role: "member",
    status: "active",
    joinedAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
    lastActiveAt: Date.now() - 1 * 60 * 60 * 1000,
    title: "Full-Stack Developer",
    hoursThisWeek: 40.0,
  },
  {
    id: "mem_005",
    name: "Elena Volkov",
    email: "elena.volkov@axiaagency.com",
    role: "member",
    status: "active",
    joinedAt: Date.now() - 21 * 24 * 60 * 60 * 1000,
    lastActiveAt: Date.now() - 30 * 60 * 1000,
    title: "UI/UX Designer",
    hoursThisWeek: 35.0,
  },
  {
    id: "mem_006",
    name: "Marcus Thompson",
    email: "marcus.t@axiaagency.com",
    role: "member",
    status: "active",
    joinedAt: Date.now() - 14 * 24 * 60 * 60 * 1000,
    lastActiveAt: Date.now() - 4 * 60 * 60 * 1000,
    title: "Brand Strategist",
    hoursThisWeek: 18.0,
  },
  {
    id: "mem_007",
    name: "Aisha Patel",
    email: "aisha.patel@axiaagency.com",
    role: "member",
    status: "invited",
    joinedAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
    lastActiveAt: null,
    title: "Motion Designer",
    hoursThisWeek: 0,
  },
  {
    id: "mem_008",
    name: "Lucas Weber",
    email: "lucas.w@freelance.dev",
    role: "member",
    status: "invited",
    joinedAt: Date.now() - 6 * 60 * 60 * 1000,
    lastActiveAt: null,
    title: "Backend Developer",
    hoursThisWeek: 0,
  },
];

const INITIAL_CLIENTS: Client[] = [
  {
    id: "client_1",
    name: "TechCorp Solutions",
    platform: "upwork",
    hourlyRate: 85,
    contractType: "hourly",
    riskLevel: "low",
    protectionScore: 94,
    totalHours: 127.5,
    totalValue: 10837.5,
    addedAt: Date.now() - 90 * 24 * 60 * 60 * 1000,
    lastActivityAt: Date.now() - 2 * 60 * 60 * 1000,
    assignedMemberIds: ["mem_001", "mem_002", "mem_004"],
    contactEmail: "david.chen@techcorp.io",
    contactName: "David Chen",
    notes: "Long-term enterprise client. Prefers weekly check-ins.",
  },
  {
    id: "client_2",
    name: "StartupHub Inc",
    platform: "fiverr",
    hourlyRate: 65,
    contractType: "fixed",
    riskLevel: "medium",
    protectionScore: 78,
    totalHours: 89.0,
    totalValue: 5785.0,
    addedAt: Date.now() - 45 * 24 * 60 * 60 * 1000,
    lastActivityAt: Date.now() - 15 * 60 * 1000,
    assignedMemberIds: ["mem_002", "mem_005"],
    contactEmail: "sarah@startuphub.co",
    contactName: "Sarah Mitchell",
    notes: "Startup with tight deadlines. Responsive on Slack.",
  },
  {
    id: "client_3",
    name: "Global Enterprises",
    platform: "toptal",
    hourlyRate: 120,
    contractType: "hourly",
    riskLevel: "high",
    protectionScore: 65,
    totalHours: 156.0,
    totalValue: 18720.0,
    addedAt: Date.now() - 120 * 24 * 60 * 60 * 1000,
    lastActivityAt: Date.now() - 24 * 60 * 60 * 1000,
    assignedMemberIds: ["mem_003", "mem_004"],
    contactEmail: "procurement@globalent.com",
    contactName: "Richard Holmes",
    notes: "High-value but slow payer. Requires detailed invoices and milestones.",
  },
  {
    id: "client_4",
    name: "Digital Marketing Co",
    platform: "freelancer",
    hourlyRate: 45,
    contractType: "hourly",
    riskLevel: "low",
    protectionScore: 88,
    totalHours: 67.0,
    totalValue: 3015.0,
    addedAt: Date.now() - 60 * 24 * 60 * 60 * 1000,
    lastActivityAt: Date.now() - 48 * 60 * 60 * 1000,
    assignedMemberIds: ["mem_006"],
    contactEmail: "lisa@digitalmarketingco.com",
    contactName: "Lisa Park",
    notes: "Small but reliable client. Focuses on branding work.",
  },
  {
    id: "client_5",
    name: "Creative Studios",
    platform: "direct",
    hourlyRate: 95,
    contractType: "fixed",
    riskLevel: "medium",
    protectionScore: 72,
    totalHours: 103.5,
    totalValue: 9832.5,
    addedAt: Date.now() - 150 * 24 * 60 * 60 * 1000,
    lastActivityAt: Date.now() - 72 * 60 * 60 * 1000,
    assignedMemberIds: ["mem_001", "mem_005", "mem_006"],
    contactEmail: "tom@creativestudios.art",
    contactName: "Tom Bradley",
    notes: "Design-focused client. Needs brand and motion design work.",
  },
  {
    id: "client_6",
    name: "FinServe Analytics",
    platform: "upwork",
    hourlyRate: 110,
    contractType: "hourly",
    riskLevel: "low",
    protectionScore: 91,
    totalHours: 84.0,
    totalValue: 9240.0,
    addedAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
    lastActivityAt: Date.now() - 6 * 60 * 60 * 1000,
    assignedMemberIds: ["mem_003", "mem_004"],
    contactEmail: "cto@finserve.io",
    contactName: "Michael Torres",
    notes: "Fintech client. Needs data visualization dashboards.",
  },
];

const INITIAL_PROJECTS: Project[] = [
  {
    id: "proj_1",
    name: "TechCorp Website Redesign",
    clientId: "client_1",
    status: "active",
    projectType: "fixed",
    protectionLevel: "enhanced",
    protectionScore: 92,
    hourlyRate: 85,
    totalHours: 64.5,
    totalValue: 5482.5,
    atRiskAmount: 0,
    rejectedHours: 0,
    assignedMemberIds: ["mem_001", "mem_004", "mem_005"],
    createdAt: Date.now() - 60 * 24 * 60 * 60 * 1000,
    lastActivityAt: Date.now() - 2 * 60 * 60 * 1000,
    deadline: Date.now() + 30 * 24 * 60 * 60 * 1000,
    description: "Complete redesign of TechCorp corporate website with responsive design, new brand identity, and CMS integration.",
    tags: ["web", "design", "development"],
  },
  {
    id: "proj_2",
    name: "StartupHub Mobile App MVP",
    clientId: "client_2",
    status: "active",
    projectType: "milestone",
    protectionLevel: "enhanced",
    protectionScore: 78,
    hourlyRate: 65,
    totalHours: 45.0,
    totalValue: 2925.0,
    atRiskAmount: 650,
    rejectedHours: 2.5,
    assignedMemberIds: ["mem_002", "mem_004"],
    createdAt: Date.now() - 45 * 24 * 60 * 60 * 1000,
    lastActivityAt: Date.now() - 15 * 60 * 1000,
    deadline: Date.now() + 14 * 24 * 60 * 60 * 1000,
    description: "Mobile app MVP for StartupHub — includes user auth, dashboard, and notification system.",
    tags: ["mobile", "backend", "api"],
  },
  {
    id: "proj_3",
    name: "GlobalEnt Data Dashboard",
    clientId: "client_3",
    status: "at_risk",
    projectType: "ongoing",
    protectionLevel: "maximum",
    protectionScore: 58,
    hourlyRate: 120,
    totalHours: 89.0,
    totalValue: 10680.0,
    atRiskAmount: 4320,
    rejectedHours: 12,
    assignedMemberIds: ["mem_003", "mem_004"],
    createdAt: Date.now() - 120 * 24 * 60 * 60 * 1000,
    lastActivityAt: Date.now() - 24 * 60 * 60 * 1000,
    deadline: Date.now() - 5 * 24 * 60 * 60 * 1000, // overdue
    description: "Enterprise analytics dashboard with real-time data streaming, complex visualizations, and role-based access.",
    tags: ["data-viz", "enterprise", "dashboard"],
  },
  {
    id: "proj_4",
    name: "DigiMark Brand Identity",
    clientId: "client_4",
    status: "active",
    projectType: "fixed",
    protectionLevel: "standard",
    protectionScore: 88,
    hourlyRate: 45,
    totalHours: 32.0,
    totalValue: 1440.0,
    atRiskAmount: 0,
    rejectedHours: 0,
    assignedMemberIds: ["mem_006"],
    createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
    lastActivityAt: Date.now() - 48 * 60 * 60 * 1000,
    deadline: Date.now() + 45 * 24 * 60 * 60 * 1000,
    description: "Complete brand identity package — logo, color palette, typography, and brand guidelines document.",
    tags: ["branding", "design"],
  },
  {
    id: "proj_5",
    name: "Creative Studios Motion Reel",
    clientId: "client_5",
    status: "paused",
    projectType: "fixed",
    protectionLevel: "enhanced",
    protectionScore: 72,
    hourlyRate: 95,
    totalHours: 28.0,
    totalValue: 2660.0,
    atRiskAmount: 950,
    rejectedHours: 3,
    assignedMemberIds: ["mem_001", "mem_005"],
    createdAt: Date.now() - 90 * 24 * 60 * 60 * 1000,
    lastActivityAt: Date.now() - 72 * 60 * 60 * 1000,
    deadline: null,
    description: "Motion graphics reel and video content for social media campaigns. Paused pending client feedback.",
    tags: ["motion", "video", "social"],
  },
  {
    id: "proj_6",
    name: "FinServe Analytics Platform",
    clientId: "client_6",
    status: "active",
    projectType: "ongoing",
    protectionLevel: "maximum",
    protectionScore: 91,
    hourlyRate: 110,
    totalHours: 52.0,
    totalValue: 5720.0,
    atRiskAmount: 0,
    rejectedHours: 0,
    assignedMemberIds: ["mem_003", "mem_004"],
    createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
    lastActivityAt: Date.now() - 6 * 60 * 60 * 1000,
    deadline: Date.now() + 60 * 24 * 60 * 60 * 1000,
    description: "Financial analytics platform with real-time market data, portfolio tracking, and compliance reporting.",
    tags: ["fintech", "data-viz", "compliance"],
  },
  {
    id: "proj_7",
    name: "TechCorp API Integration",
    clientId: "client_1",
    status: "completed",
    projectType: "fixed",
    protectionLevel: "enhanced",
    protectionScore: 96,
    hourlyRate: 85,
    totalHours: 63.0,
    totalValue: 5355.0,
    atRiskAmount: 0,
    rejectedHours: 0,
    assignedMemberIds: ["mem_004"],
    createdAt: Date.now() - 120 * 24 * 60 * 60 * 1000,
    lastActivityAt: Date.now() - 7 * 24 * 60 * 60 * 1000,
    deadline: null,
    description: "REST API integration layer connecting TechCorp's CRM, ERP, and marketing automation systems.",
    tags: ["api", "integration", "backend"],
  },
  {
    id: "proj_8",
    name: "StartupHub Landing Pages",
    clientId: "client_2",
    status: "active",
    projectType: "fixed",
    protectionLevel: "standard",
    protectionScore: 82,
    hourlyRate: 65,
    totalHours: 44.0,
    totalValue: 2860.0,
    atRiskAmount: 0,
    rejectedHours: 1,
    assignedMemberIds: ["mem_002", "mem_005"],
    createdAt: Date.now() - 20 * 24 * 60 * 60 * 1000,
    lastActivityAt: Date.now() - 3 * 60 * 60 * 1000,
    deadline: Date.now() + 7 * 24 * 60 * 60 * 1000,
    description: "A/B tested landing pages for StartupHub's product launch campaign. 5 variants with analytics tracking.",
    tags: ["web", "marketing", "design"],
  },
];

const INITIAL_TIME_ENTRIES: TimeEntry[] = [
  {
    id: "time_1",
    projectId: "proj_1",
    memberId: "mem_004",
    platform: "upwork",
    startTime: Date.now() - 7 * 24 * 60 * 60 * 1000,
    endTime: Date.now() - 7 * 24 * 60 * 60 * 1000 + 4.5 * 60 * 60 * 1000,
    duration: 4.5 * 60 * 60 * 1000,
    memo: "Implemented responsive navigation and hero section",
    compliance: "compliant",
    tags: ["development", "frontend"],
  },
  {
    id: "time_2",
    projectId: "proj_2",
    memberId: "mem_004",
    platform: "fiverr",
    startTime: Date.now() - 6 * 24 * 60 * 60 * 1000,
    endTime: Date.now() - 6 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000,
    duration: 3 * 60 * 60 * 1000,
    memo: "API integration and data fetching layer",
    compliance: "compliant",
    tags: ["development", "backend"],
  },
  {
    id: "time_3",
    projectId: "proj_4",
    memberId: "mem_006",
    platform: "upwork",
    startTime: Date.now() - 5 * 24 * 60 * 60 * 1000,
    endTime: Date.now() - 5 * 24 * 60 * 60 * 1000 + 2.5 * 60 * 60 * 1000,
    duration: 2.5 * 60 * 60 * 1000,
    memo: "Logo variations and color palette exploration",
    compliance: "at_risk",
    tags: ["design"],
  },
  {
    id: "time_4",
    projectId: "proj_6",
    memberId: "mem_004",
    platform: "toptal",
    startTime: Date.now() - 4 * 24 * 60 * 60 * 1000,
    endTime: Date.now() - 4 * 24 * 60 * 60 * 1000 + 6 * 60 * 60 * 1000,
    duration: 6 * 60 * 60 * 1000,
    memo: "Chart components and real-time data streaming",
    compliance: "compliant",
    tags: ["development", "frontend", "data-viz"],
  },
  {
    id: "time_5",
    projectId: "proj_3",
    memberId: "mem_004",
    platform: "upwork",
    startTime: Date.now() - 3 * 24 * 60 * 60 * 1000,
    endTime: Date.now() - 3 * 24 * 60 * 60 * 1000 + 1.5 * 60 * 60 * 1000,
    duration: 1.5 * 60 * 60 * 1000,
    memo: "Low activity period - minimal keyboard/mouse events",
    compliance: "flagged",
    tags: ["development"],
  },
  {
    id: "time_6",
    projectId: "proj_1",
    memberId: "mem_005",
    platform: "upwork",
    startTime: Date.now() - 2 * 24 * 60 * 60 * 1000,
    endTime: Date.now() - 2 * 24 * 60 * 60 * 1000 + 5 * 60 * 60 * 1000,
    duration: 5 * 60 * 60 * 1000,
    memo: "UI component library and design system updates",
    compliance: "compliant",
    tags: ["design", "frontend"],
  },
  {
    id: "time_7",
    projectId: "proj_8",
    memberId: "mem_005",
    platform: "fiverr",
    startTime: Date.now() - 1 * 24 * 60 * 60 * 1000,
    endTime: Date.now() - 1 * 24 * 60 * 60 * 1000 + 3.5 * 60 * 60 * 1000,
    duration: 3.5 * 60 * 60 * 1000,
    memo: "Landing page designs — variant A and B",
    compliance: "compliant",
    tags: ["design", "marketing"],
  },
  {
    id: "time_8",
    projectId: "proj_6",
    memberId: "mem_003",
    platform: "upwork",
    startTime: Date.now() - 8 * 60 * 60 * 1000,
    endTime: Date.now() - 3 * 60 * 60 * 1000,
    duration: 5 * 60 * 60 * 1000,
    memo: "Client meeting + project scope review + reporting setup",
    compliance: "compliant",
    tags: ["management", "client"],
  },
];

const INITIAL_INVOICES: Invoice[] = [
  {
    id: "inv_1",
    invoiceNumber: "INV-2024-001",
    clientId: "client_1",
    projectId: "proj_1",
    status: "paid",
    issueDate: Date.now() - 60 * 24 * 60 * 60 * 1000,
    dueDate: Date.now() - 30 * 24 * 60 * 60 * 1000,
    paidDate: Date.now() - 25 * 24 * 60 * 60 * 1000,
    lineItems: [
      { id: "li_1", description: "Website Redesign — Phase 1: Discovery & Wireframes", quantity: 20, rate: 85, amount: 1700, hasProof: true },
      { id: "li_2", description: "Website Redesign — Phase 2: UI Design", quantity: 25, rate: 85, amount: 2125, hasProof: true },
    ],
    subtotal: 3825,
    taxRate: 0,
    taxAmount: 0,
    total: 3825,
    notes: "Net-30 terms. Payment received on time.",
    proofCount: 8,
  },
  {
    id: "inv_2",
    invoiceNumber: "INV-2024-002",
    clientId: "client_3",
    projectId: "proj_3",
    status: "overdue",
    issueDate: Date.now() - 45 * 24 * 60 * 60 * 1000,
    dueDate: Date.now() - 15 * 24 * 60 * 60 * 1000,
    lineItems: [
      { id: "li_3", description: "Data Dashboard — Backend Architecture", quantity: 40, rate: 120, amount: 4800, hasProof: true },
      { id: "li_4", description: "Data Dashboard — Frontend Components", quantity: 30, rate: 120, amount: 3600, hasProof: false },
    ],
    subtotal: 8400,
    taxRate: 0,
    taxAmount: 0,
    total: 8400,
    notes: "Payment 15 days overdue. Follow-up sent.",
    proofCount: 3,
  },
  {
    id: "inv_3",
    invoiceNumber: "INV-2024-003",
    clientId: "client_2",
    projectId: "proj_2",
    status: "sent",
    issueDate: Date.now() - 7 * 24 * 60 * 60 * 1000,
    dueDate: Date.now() + 23 * 24 * 60 * 60 * 1000,
    lineItems: [
      { id: "li_5", description: "Mobile App MVP — Sprint 1: Auth & Dashboard", quantity: 30, rate: 65, amount: 1950, hasProof: true },
    ],
    subtotal: 1950,
    taxRate: 0,
    taxAmount: 0,
    total: 1950,
    notes: "",
    proofCount: 4,
  },
  {
    id: "inv_4",
    invoiceNumber: "INV-2024-004",
    clientId: "client_6",
    projectId: "proj_6",
    status: "sent",
    issueDate: Date.now() - 5 * 24 * 60 * 60 * 1000,
    dueDate: Date.now() + 25 * 24 * 60 * 60 * 1000,
    lineItems: [
      { id: "li_6", description: "Analytics Platform — Month 1 Retainer", quantity: 52, rate: 110, amount: 5720, hasProof: true },
    ],
    subtotal: 5720,
    taxRate: 0,
    taxAmount: 0,
    total: 5720,
    notes: "Monthly retainer. Auto-invoiced.",
    proofCount: 6,
  },
  {
    id: "inv_5",
    invoiceNumber: "INV-2024-005",
    clientId: "client_4",
    projectId: "proj_4",
    status: "draft",
    issueDate: Date.now(),
    dueDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
    lineItems: [
      { id: "li_7", description: "Brand Identity — Logo & Guidelines", quantity: 32, rate: 45, amount: 1440, hasProof: false },
    ],
    subtotal: 1440,
    taxRate: 0,
    taxAmount: 0,
    total: 1440,
    notes: "Pending final review before sending.",
    proofCount: 0,
  },
  {
    id: "inv_6",
    invoiceNumber: "INV-2024-006",
    clientId: "client_1",
    projectId: "proj_7",
    status: "paid",
    issueDate: Date.now() - 90 * 24 * 60 * 60 * 1000,
    dueDate: Date.now() - 60 * 24 * 60 * 60 * 1000,
    paidDate: Date.now() - 55 * 24 * 60 * 60 * 1000,
    lineItems: [
      { id: "li_8", description: "API Integration — CRM Connector", quantity: 25, rate: 85, amount: 2125, hasProof: true },
      { id: "li_9", description: "API Integration — ERP Sync Module", quantity: 38, rate: 85, amount: 3230, hasProof: true },
    ],
    subtotal: 5355,
    taxRate: 0,
    taxAmount: 0,
    total: 5355,
    notes: "Completed project. Final invoice.",
    proofCount: 12,
  },
];

const INITIAL_PIPELINE_DEALS: PipelineDeal[] = [
  // ── Lead stage (5 deals) ──
  {
    id: "deal_1",
    title: "E-Commerce Platform Build",
    clientId: "client_5",
    stage: "lead",
    value: 12000,
    probability: 10,
    source: "upwork",
    contactName: "Tom Bradley",
    contactEmail: "tom@creativestudios.art",
    expectedCloseDate: Date.now() + 60 * 24 * 60 * 60 * 1000,
    assignedMemberId: "mem_001",
    notes: "Initial inquiry received. Needs scoping call scheduled for next week. Client wants Shopify-like functionality with custom checkout flow.",
    description: "Full e-commerce platform with product catalog, cart, checkout, and admin dashboard for a boutique retail brand.",
    createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
    proposalId: null,
    workspaceId: null,
    client: { id: "client_5", name: "Creative Studios", platform: "direct", contactEmail: "tom@creativestudios.art", contactName: "Tom Bradley" },
    assignedMember: { id: "mem_001", name: "Alex Rivera", email: "alex.rivera@axiaagency.com", image: null, role: "owner", title: "Founder & Creative Director" },
    linkedProposal: null,
    stageName: "Lead",
    stageColor: STAGE_COLORS.lead,
  },
  {
    id: "deal_7",
    title: "AI Chatbot Integration",
    clientId: null,
    stage: "lead",
    value: 6000,
    probability: 10,
    source: "fiverr",
    contactName: "Nina Patel",
    contactEmail: "nina@smartassist.ai",
    expectedCloseDate: Date.now() + 75 * 24 * 60 * 60 * 1000,
    assignedMemberId: "mem_004",
    notes: "Inbound lead from Fiverr. Wants to integrate a custom AI chatbot into their existing SaaS product. Early stage exploration.",
    description: "Custom AI chatbot with NLP capabilities for customer support automation in a SaaS product.",
    createdAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
    proposalId: null,
    workspaceId: null,
    client: null,
    assignedMember: { id: "mem_004", name: "Sam Chen", email: "sam.chen@axiaagency.com", image: null, role: "member", title: "Full-Stack Developer" },
    linkedProposal: null,
    stageName: "Lead",
    stageColor: STAGE_COLORS.lead,
  },
  {
    id: "deal_13",
    title: "Real Estate Listing Portal",
    clientId: null,
    stage: "lead",
    value: 18000,
    probability: 15,
    source: "linkedin",
    contactName: "Marcus Rivera",
    contactEmail: "marcus@primeproperty.com",
    expectedCloseDate: Date.now() + 90 * 24 * 60 * 60 * 1000,
    assignedMemberId: "mem_003",
    notes: "Found us on LinkedIn. Currently using an off-the-shelf solution and wants something custom. Budget not confirmed yet.",
    description: "Property listing portal with map search, virtual tours, and agent management for a regional real estate firm.",
    createdAt: Date.now() - 1 * 24 * 60 * 60 * 1000,
    proposalId: null,
    workspaceId: null,
    client: null,
    assignedMember: { id: "mem_003", name: "Jordan Kim", email: "jordan.kim@axiaagency.com", image: null, role: "manager", title: "Account Manager" },
    linkedProposal: null,
    stageName: "Lead",
    stageColor: STAGE_COLORS.lead,
  },
  {
    id: "deal_14",
    title: "EdTech Course Platform",
    clientId: null,
    stage: "lead",
    value: 9500,
    probability: 10,
    source: "referral",
    contactName: "Prof. Anika Desai",
    contactEmail: "anika@learnvista.edu",
    expectedCloseDate: Date.now() + 50 * 24 * 60 * 60 * 1000,
    assignedMemberId: "mem_004",
    notes: "Referred by Priya at FinServe. University setting, so compliance and accessibility are critical. Long sales cycle expected.",
    description: "Online course platform with video hosting, quizzes, progress tracking, and certificate generation.",
    createdAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
    proposalId: null,
    workspaceId: null,
    client: null,
    assignedMember: { id: "mem_004", name: "Sam Chen", email: "sam.chen@axiaagency.com", image: null, role: "member", title: "Full-Stack Developer" },
    linkedProposal: null,
    stageName: "Lead",
    stageColor: STAGE_COLORS.lead,
  },
  {
    id: "deal_15",
    title: "Fitness App MVP",
    clientId: null,
    stage: "lead",
    value: 7500,
    probability: 8,
    source: "upwork",
    contactName: "Jake Morrison",
    contactEmail: "jake@fittrack.app",
    expectedCloseDate: Date.now() + 40 * 24 * 60 * 60 * 1000,
    assignedMemberId: "mem_005",
    notes: "Startup founder with limited budget. Exploring options. May need phased approach to fit their funding timeline.",
    description: "MVP fitness tracking app with workout plans, progress photos, and social features.",
    createdAt: Date.now() - 4 * 24 * 60 * 60 * 1000,
    proposalId: null,
    workspaceId: null,
    client: null,
    assignedMember: { id: "mem_005", name: "Elena Volkov", email: "elena.volkov@axiaagency.com", image: null, role: "member", title: "UI/UX Designer" },
    linkedProposal: null,
    stageName: "Lead",
    stageColor: STAGE_COLORS.lead,
  },

  // ── Qualified stage (4 deals) ──
  {
    id: "deal_2",
    title: "SaaS Dashboard Redesign",
    clientId: null,
    stage: "qualified",
    value: 8500,
    probability: 25,
    source: "linkedin",
    contactName: "Jennifer Wu",
    contactEmail: "jen@cloudmetrics.io",
    expectedCloseDate: Date.now() + 45 * 24 * 60 * 60 * 1000,
    assignedMemberId: "mem_003",
    notes: "Qualified lead. Demo scheduled for next week. They are comparing 3 agencies and we are shortlisted. CTO is our champion internally.",
    description: "Complete redesign of analytics dashboard with real-time data visualization, team collaboration, and role-based views.",
    createdAt: Date.now() - 12 * 24 * 60 * 60 * 1000,
    proposalId: null,
    workspaceId: null,
    client: null,
    assignedMember: { id: "mem_003", name: "Jordan Kim", email: "jordan.kim@axiaagency.com", image: null, role: "manager", title: "Account Manager" },
    linkedProposal: null,
    stageName: "Qualified",
    stageColor: STAGE_COLORS.qualified,
  },
  {
    id: "deal_8",
    title: "Digital Marketing Landing Pages",
    clientId: "client_4",
    stage: "qualified",
    value: 4500,
    probability: 25,
    source: "upwork",
    contactName: "Lisa Park",
    contactEmail: "lisa@digitalmarketingco.com",
    expectedCloseDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
    assignedMemberId: "mem_006",
    notes: "Returning client. Budget approved internally. Wants to start as soon as proposal is approved. Quick turnaround expected.",
    description: "5 A/B tested landing pages with analytics tracking and conversion optimization for product launch campaign.",
    createdAt: Date.now() - 8 * 24 * 60 * 60 * 1000,
    proposalId: null,
    workspaceId: null,
    client: { id: "client_4", name: "Digital Marketing Co", platform: "freelancer", contactEmail: "lisa@digitalmarketingco.com", contactName: "Lisa Park" },
    assignedMember: { id: "mem_006", name: "Marcus Thompson", email: "marcus.t@axiaagency.com", image: null, role: "member", title: "Brand Strategist" },
    linkedProposal: null,
    stageName: "Qualified",
    stageColor: STAGE_COLORS.qualified,
  },
  {
    id: "deal_16",
    title: "Supply Chain Management System",
    clientId: null,
    stage: "qualified",
    value: 32000,
    probability: 30,
    source: "direct",
    contactName: "Robert Chang",
    contactEmail: "rchang@logisync.com",
    expectedCloseDate: Date.now() + 60 * 24 * 60 * 60 * 1000,
    assignedMemberId: "mem_002",
    notes: "Enterprise client. Very thorough evaluation process. We presented our capabilities deck and they were impressed. Decision expected in 3 weeks.",
    description: "End-to-end supply chain management with inventory tracking, vendor management, and predictive analytics.",
    createdAt: Date.now() - 15 * 24 * 60 * 60 * 1000,
    proposalId: null,
    workspaceId: null,
    client: null,
    assignedMember: { id: "mem_002", name: "Priya Sharma", email: "priya.sharma@axiaagency.com", image: null, role: "manager", title: "Senior Project Manager" },
    linkedProposal: null,
    stageName: "Qualified",
    stageColor: STAGE_COLORS.qualified,
  },
  {
    id: "deal_17",
    title: "Restaurant POS & Ordering System",
    clientId: null,
    stage: "qualified",
    value: 14000,
    probability: 20,
    source: "referral",
    contactName: "Maria Santos",
    contactEmail: "maria@freshbites.co",
    expectedCloseDate: Date.now() + 35 * 24 * 60 * 60 * 1000,
    assignedMemberId: "mem_004",
    notes: "Referred by Sam from TechCorp. Chain of 12 restaurants. Needs consistent system across all locations. Pilot at 2 locations first.",
    description: "Point-of-sale system with online ordering, table management, and kitchen display integration.",
    createdAt: Date.now() - 10 * 24 * 60 * 60 * 1000,
    proposalId: null,
    workspaceId: null,
    client: null,
    assignedMember: { id: "mem_004", name: "Sam Chen", email: "sam.chen@axiaagency.com", image: null, role: "member", title: "Full-Stack Developer" },
    linkedProposal: null,
    stageName: "Qualified",
    stageColor: STAGE_COLORS.qualified,
  },

  // ── Proposal stage (4 deals) ──
  {
    id: "deal_3",
    title: "Mobile Banking App",
    clientId: "client_6",
    stage: "proposal",
    value: 25000,
    probability: 50,
    source: "referral",
    contactName: "Michael Torres",
    contactEmail: "cto@finserve.io",
    expectedCloseDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
    assignedMemberId: "mem_002",
    notes: "Proposal sent. Awaiting board approval. CTO is our champion internally. Decision expected within 2 weeks. Very strong relationship.",
    description: "Full-featured mobile banking app with biometric auth, real-time transactions, and compliance reporting.",
    createdAt: Date.now() - 20 * 24 * 60 * 60 * 1000,
    proposalId: "prop_2",
    workspaceId: null,
    client: { id: "client_6", name: "FinServe Analytics", platform: "upwork", contactEmail: "cto@finserve.io", contactName: "Michael Torres" },
    assignedMember: { id: "mem_002", name: "Priya Sharma", email: "priya.sharma@axiaagency.com", image: null, role: "manager", title: "Senior Project Manager" },
    linkedProposal: { id: "prop_2", title: "Mobile Banking App — Full Development", status: "sent", totalValue: 25000 },
    stageName: "Proposal",
    stageColor: STAGE_COLORS.proposal,
  },
  {
    id: "deal_9",
    title: "Creative Studios Motion Design Package",
    clientId: "client_5",
    stage: "proposal",
    value: 7500,
    probability: 50,
    source: "direct",
    contactName: "Tom Bradley",
    contactEmail: "tom@creativestudios.art",
    expectedCloseDate: Date.now() + 21 * 24 * 60 * 60 * 1000,
    assignedMemberId: "mem_001",
    notes: "Existing client expanding scope. Proposal includes motion graphics, social media content, and brand animations. They viewed it within 2 hours of sending.",
    description: "Motion graphics reel and social media content package for brand launch campaign.",
    createdAt: Date.now() - 10 * 24 * 60 * 60 * 1000,
    proposalId: "prop_4",
    workspaceId: null,
    client: { id: "client_5", name: "Creative Studios", platform: "direct", contactEmail: "tom@creativestudios.art", contactName: "Tom Bradley" },
    assignedMember: { id: "mem_001", name: "Alex Rivera", email: "alex.rivera@axiaagency.com", image: null, role: "owner", title: "Founder & Creative Director" },
    linkedProposal: { id: "prop_4", title: "Creative Studios Motion Design Package", status: "viewed", totalValue: 7500 },
    stageName: "Proposal",
    stageColor: STAGE_COLORS.proposal,
  },
  {
    id: "deal_18",
    title: "Healthcare Patient Portal",
    clientId: null,
    stage: "proposal",
    value: 35000,
    probability: 45,
    source: "direct",
    contactName: "Dr. Robert Singh",
    contactEmail: "robert@medportal.health",
    expectedCloseDate: Date.now() + 28 * 24 * 60 * 60 * 1000,
    assignedMemberId: "mem_003",
    notes: "Proposal sent with detailed compliance section. Their CIO requested additional security documentation. Providing supplemental materials this week.",
    description: "HIPAA-compliant patient portal with appointment scheduling, secure messaging, and medical records access.",
    createdAt: Date.now() - 14 * 24 * 60 * 60 * 1000,
    proposalId: "prop_3",
    workspaceId: null,
    client: null,
    assignedMember: { id: "mem_003", name: "Jordan Kim", email: "jordan.kim@axiaagency.com", image: null, role: "manager", title: "Account Manager" },
    linkedProposal: { id: "prop_3", title: "Healthcare Patient Portal", status: "draft", totalValue: 18000 },
    stageName: "Proposal",
    stageColor: STAGE_COLORS.proposal,
  },
  {
    id: "deal_19",
    title: "Brand Identity for NovaTech",
    clientId: null,
    stage: "proposal",
    value: 8500,
    probability: 55,
    source: "fiverr",
    contactName: "Aisha Khan",
    contactEmail: "aisha@novatech.io",
    expectedCloseDate: Date.now() + 14 * 24 * 60 * 60 * 1000,
    assignedMemberId: "mem_006",
    notes: "Startup rebranding after Series A. They love our portfolio. Decision maker is the CEO who we have a direct line to. Close date is tight.",
    description: "Complete brand identity package: logo, color palette, typography, brand guidelines, and marketing collateral templates.",
    createdAt: Date.now() - 7 * 24 * 60 * 60 * 1000,
    proposalId: "prop_7",
    workspaceId: null,
    client: null,
    assignedMember: { id: "mem_006", name: "Marcus Thompson", email: "marcus.t@axiaagency.com", image: null, role: "member", title: "Brand Strategist" },
    linkedProposal: { id: "prop_7", title: "Brand Identity for NovaTech", status: "sent", totalValue: 8500 },
    stageName: "Proposal",
    stageColor: STAGE_COLORS.proposal,
  },

  // ── Negotiation stage (3 deals) ──
  {
    id: "deal_4",
    title: "Full-Stack SaaS Platform",
    clientId: null,
    stage: "negotiation",
    value: 45000,
    probability: 70,
    source: "referral",
    contactName: "Rachel Green",
    contactEmail: "rachel@scaleup.io",
    expectedCloseDate: Date.now() + 7 * 24 * 60 * 60 * 1000,
    assignedMemberId: "mem_003",
    notes: "Close to agreement. Their legal team is reviewing our contract terms. Only sticking point is the IP ownership clause. Our lawyer is preparing a compromise.",
    description: "Multi-tenant SaaS platform with subscription billing, analytics, and white-label capabilities.",
    createdAt: Date.now() - 35 * 24 * 60 * 60 * 1000,
    proposalId: "prop_8",
    workspaceId: null,
    client: null,
    assignedMember: { id: "mem_003", name: "Jordan Kim", email: "jordan.kim@axiaagency.com", image: null, role: "manager", title: "Account Manager" },
    linkedProposal: { id: "prop_8", title: "Full-Stack SaaS Platform", status: "sent", totalValue: 45000 },
    stageName: "Negotiation",
    stageColor: STAGE_COLORS.negotiation,
  },
  {
    id: "deal_10",
    title: "StartupHub Mobile App MVP — Phase 2",
    clientId: "client_2",
    stage: "negotiation",
    value: 9500,
    probability: 70,
    source: "fiverr",
    contactName: "Sarah Mitchell",
    contactEmail: "sarah@startuphub.co",
    expectedCloseDate: Date.now() + 10 * 24 * 60 * 60 * 1000,
    assignedMemberId: "mem_002",
    notes: "Phase 1 was successful. Client wants to add push notifications, payment integration, and analytics. Negotiating final scope and timeline.",
    description: "Phase 2 of StartupHub mobile app: push notifications, payment integration, and analytics dashboard.",
    createdAt: Date.now() - 18 * 24 * 60 * 60 * 1000,
    proposalId: null,
    workspaceId: null,
    client: { id: "client_2", name: "StartupHub Inc", platform: "fiverr", contactEmail: "sarah@startuphub.co", contactName: "Sarah Mitchell" },
    assignedMember: { id: "mem_002", name: "Priya Sharma", email: "priya.sharma@axiaagency.com", image: null, role: "manager", title: "Senior Project Manager" },
    linkedProposal: null,
    stageName: "Negotiation",
    stageColor: STAGE_COLORS.negotiation,
  },
  {
    id: "deal_20",
    title: "Insurance Claims Platform",
    clientId: null,
    stage: "negotiation",
    value: 28000,
    probability: 65,
    source: "linkedin",
    contactName: "Vikram Mehta",
    contactEmail: "vikram@insureflow.com",
    expectedCloseDate: Date.now() + 14 * 24 * 60 * 60 * 1000,
    assignedMemberId: "mem_002",
    notes: "Very promising. Budget approved by CFO. Final negotiation on maintenance terms and SLA guarantees. They want 99.9% uptime commitment.",
    description: "Claims processing platform with document OCR, automated workflows, and regulatory compliance engine.",
    createdAt: Date.now() - 25 * 24 * 60 * 60 * 1000,
    proposalId: "prop_9",
    workspaceId: null,
    client: null,
    assignedMember: { id: "mem_002", name: "Priya Sharma", email: "priya.sharma@axiaagency.com", image: null, role: "manager", title: "Senior Project Manager" },
    linkedProposal: { id: "prop_9", title: "Insurance Claims Processing Platform", status: "sent", totalValue: 28000 },
    stageName: "Negotiation",
    stageColor: STAGE_COLORS.negotiation,
  },

  // ── Negotiation stage (additional 1 deal) ──
  {
    id: "deal_23",
    title: "Manufacturing Quality Control System",
    clientId: null,
    stage: "negotiation",
    value: 38000,
    probability: 60,
    source: "direct",
    contactName: "Ingrid Svensson",
    contactEmail: "ingrid@precisemfg.se",
    expectedCloseDate: Date.now() + 5 * 24 * 60 * 60 * 1000,
    assignedMemberId: "mem_001",
    notes: "Final negotiation on change order process. They want Agile sprints but their procurement team prefers fixed-scope contracts. Proposing a hybrid model. Decision imminent.",
    description: "IoT-connected quality control system for a precision manufacturing plant with real-time defect detection, statistical process control, and compliance reporting.",
    createdAt: Date.now() - 40 * 24 * 60 * 60 * 1000,
    proposalId: "prop_16",
    workspaceId: null,
    client: null,
    assignedMember: { id: "mem_001", name: "Alex Rivera", email: "alex.rivera@axiaagency.com", image: null, role: "owner", title: "Founder & Creative Director" },
    linkedProposal: { id: "prop_16", title: "Manufacturing Quality Control System Proposal", status: "viewed", totalValue: 38000 },
    stageName: "Negotiation",
    stageColor: STAGE_COLORS.negotiation,
  },

  // ── Won stage (6 deals) ──
  {
    id: "deal_5",
    title: "TechCorp Phase 2 — CMS & Marketing Automation",
    clientId: "client_1",
    stage: "won",
    value: 15000,
    probability: 100,
    source: "upwork",
    contactName: "David Chen",
    contactEmail: "david.chen@techcorp.io",
    expectedCloseDate: Date.now() - 3 * 24 * 60 * 60 * 1000,
    assignedMemberId: "mem_002",
    notes: "Won! Phase 2 approved. CMS integration and marketing automation modules confirmed. Kickoff meeting scheduled for next Monday.",
    description: "Phase 2 of TechCorp website: CMS integration, marketing automation, and analytics dashboard.",
    createdAt: Date.now() - 60 * 24 * 60 * 60 * 1000,
    proposalId: "prop_1",
    workspaceId: null,
    client: { id: "client_1", name: "TechCorp Solutions", platform: "upwork", contactEmail: "david.chen@techcorp.io", contactName: "David Chen" },
    assignedMember: { id: "mem_002", name: "Priya Sharma", email: "priya.sharma@axiaagency.com", image: null, role: "manager", title: "Senior Project Manager" },
    linkedProposal: { id: "prop_1", title: "TechCorp Phase 2 — CMS & Marketing Automation", status: "signed", totalValue: 15000 },
    stageName: "Won",
    stageColor: "var(--success)",
  },
  {
    id: "deal_11",
    title: "FinServe Analytics Platform",
    clientId: "client_6",
    stage: "won",
    value: 5720,
    probability: 100,
    source: "upwork",
    contactName: "Michael Torres",
    contactEmail: "cto@finserve.io",
    expectedCloseDate: Date.now() - 10 * 24 * 60 * 60 * 1000,
    assignedMemberId: "mem_003",
    notes: "Monthly retainer won. Ongoing engagement for analytics platform. First invoice paid. Excellent client relationship.",
    description: "Financial analytics platform with real-time market data, portfolio tracking, and compliance reporting.",
    createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
    proposalId: null,
    workspaceId: null,
    client: { id: "client_6", name: "FinServe Analytics", platform: "upwork", contactEmail: "cto@finserve.io", contactName: "Michael Torres" },
    assignedMember: { id: "mem_003", name: "Jordan Kim", email: "jordan.kim@axiaagency.com", image: null, role: "manager", title: "Account Manager" },
    linkedProposal: null,
    stageName: "Won",
    stageColor: "var(--success)",
  },
  {
    id: "deal_21",
    title: "GlobalEnt Data Dashboard",
    clientId: "client_3",
    stage: "won",
    value: 22000,
    probability: 100,
    source: "toptal",
    contactName: "Anna Schmidt",
    contactEmail: "anna@insightdata.de",
    expectedCloseDate: Date.now() - 15 * 24 * 60 * 60 * 1000,
    assignedMemberId: "mem_004",
    notes: "Won after 3-month sales cycle. Enterprise contract with annual renewal. Dedicated team of 3 assigned. First sprint starting next week.",
    description: "Enterprise analytics dashboard with real-time data streaming, complex visualizations, and role-based access control.",
    createdAt: Date.now() - 45 * 24 * 60 * 60 * 1000,
    proposalId: null,
    workspaceId: null,
    client: { id: "client_3", name: "Global Enterprises", platform: "toptal", contactEmail: "anna@insightdata.de", contactName: "Anna Schmidt" },
    assignedMember: { id: "mem_004", name: "Sam Chen", email: "sam.chen@axiaagency.com", image: null, role: "member", title: "Full-Stack Developer" },
    linkedProposal: null,
    stageName: "Won",
    stageColor: "var(--success)",
  },
  {
    id: "deal_22",
    title: "DigiMark Brand Identity",
    clientId: "client_4",
    stage: "won",
    value: 3200,
    probability: 100,
    source: "freelancer",
    contactName: "Lisa Park",
    contactEmail: "lisa@digitalmarketingco.com",
    expectedCloseDate: Date.now() - 7 * 24 * 60 * 60 * 1000,
    assignedMemberId: "mem_006",
    notes: "Small but reliable client. Quick project, already delivered. They loved the work and are referring us to their network.",
    description: "Complete brand identity package: logo, color palette, typography, and brand guidelines document.",
    createdAt: Date.now() - 25 * 24 * 60 * 60 * 1000,
    proposalId: "prop_10",
    workspaceId: null,
    client: { id: "client_4", name: "Digital Marketing Co", platform: "freelancer", contactEmail: "lisa@digitalmarketingco.com", contactName: "Lisa Park" },
    assignedMember: { id: "mem_006", name: "Marcus Thompson", email: "marcus.t@axiaagency.com", image: null, role: "member", title: "Brand Strategist" },
    linkedProposal: { id: "prop_10", title: "DigiMark Brand Identity Package", status: "signed", totalValue: 3200 },
    stageName: "Won",
    stageColor: "var(--success)",
  },

  // ── Lost stage (4 deals) ──
  {
    id: "deal_6",
    title: "Legacy System Migration",
    clientId: null,
    stage: "lost",
    value: 22000,
    probability: 0,
    source: "toptal",
    contactName: "Frank Miller",
    contactEmail: "frank@oldtech.com",
    expectedCloseDate: null,
    assignedMemberId: "mem_003",
    notes: "Lost to competitor. Budget constraints cited by client. Went with a cheaper offshore alternative. Follow up in 6 months when they likely need fixes.",
    description: "Legacy .NET system migration to modern React/Node.js stack with zero downtime.",
    createdAt: Date.now() - 45 * 24 * 60 * 60 * 1000,
    proposalId: null,
    workspaceId: null,
    client: null,
    assignedMember: { id: "mem_003", name: "Jordan Kim", email: "jordan.kim@axiaagency.com", image: null, role: "manager", title: "Account Manager" },
    linkedProposal: null,
    stageName: "Lost",
    stageColor: "var(--danger)",
  },
  {
    id: "deal_12",
    title: "Retail Inventory System",
    clientId: null,
    stage: "lost",
    value: 14000,
    probability: 0,
    source: "linkedin",
    contactName: "Amy Foster",
    contactEmail: "amy@retailpro.com",
    expectedCloseDate: null,
    assignedMemberId: "mem_001",
    notes: "Lost due to project scope mismatch. Client needed an off-the-shelf solution rather than custom development. Good learning for future retail leads.",
    description: "Custom inventory management system with barcode scanning and supplier integration.",
    createdAt: Date.now() - 55 * 24 * 60 * 60 * 1000,
    proposalId: null,
    workspaceId: null,
    client: null,
    assignedMember: { id: "mem_001", name: "Alex Rivera", email: "alex.rivera@axiaagency.com", image: null, role: "owner", title: "Founder & Creative Director" },
    linkedProposal: null,
    stageName: "Lost",
    stageColor: "var(--danger)",
  },
  {
    id: "deal_24",
    title: "Government Portal Redesign",
    clientId: null,
    stage: "lost",
    value: 48000,
    probability: 0,
    source: "direct",
    contactName: "Director Helen Park",
    contactEmail: "helen.park@citygov.org",
    expectedCloseDate: null,
    assignedMemberId: "mem_002",
    notes: "Lost due to procurement process favoring incumbent vendor. Our proposal scored highest on technical merit but the incumbent had a 5-year relationship. Will bid on next cycle.",
    description: "Municipal government services portal with citizen authentication, document submission, and payment processing for city services.",
    createdAt: Date.now() - 65 * 24 * 60 * 60 * 1000,
    proposalId: null,
    workspaceId: null,
    client: null,
    assignedMember: { id: "mem_002", name: "Priya Sharma", email: "priya.sharma@axiaagency.com", image: null, role: "manager", title: "Senior Project Manager" },
    linkedProposal: null,
    stageName: "Lost",
    stageColor: "var(--danger)",
  },
  {
    id: "deal_25",
    title: "Crypto Exchange Dashboard",
    clientId: null,
    stage: "lost",
    value: 19000,
    probability: 0,
    source: "fiverr",
    contactName: "Dmitri Volkov",
    contactEmail: "dmitri@cointrack.io",
    expectedCloseDate: null,
    assignedMemberId: "mem_004",
    notes: "Lost — client paused all development due to regulatory uncertainty in their jurisdiction. Good prospect to re-engage when regulations clear.",
    description: "Real-time cryptocurrency trading dashboard with portfolio analytics, price alerts, and multi-exchange aggregation.",
    createdAt: Date.now() - 40 * 24 * 60 * 60 * 1000,
    proposalId: null,
    workspaceId: null,
    client: null,
    assignedMember: { id: "mem_004", name: "Sam Chen", email: "sam.chen@axiaagency.com", image: null, role: "member", title: "Full-Stack Developer" },
    linkedProposal: null,
    stageName: "Lost",
    stageColor: "var(--danger)",
  },

  // ── Additional Lead deals (2) ──
  {
    id: "deal_26",
    title: "Nonprofit Donation Platform",
    clientId: null,
    stage: "lead",
    value: 8000,
    probability: 12,
    source: "referral",
    contactName: "Dr. Sarah Okonkwo",
    contactEmail: "sarah@givehope.org",
    expectedCloseDate: Date.now() + 55 * 24 * 60 * 60 * 1000,
    assignedMemberId: "mem_006",
    notes: "Referred by Marcus at Digital Marketing Co. Nonprofit has limited budget but strong mission. Exploring grant funding to cover development costs. Warm introduction.",
    description: "Donation and volunteer management platform for a mid-size nonprofit with event registration, recurring donations, and impact reporting.",
    createdAt: Date.now() - 6 * 24 * 60 * 60 * 1000,
    proposalId: null,
    workspaceId: null,
    client: null,
    assignedMember: { id: "mem_006", name: "Marcus Thompson", email: "marcus.t@axiaagency.com", image: null, role: "member", title: "Brand Strategist" },
    linkedProposal: null,
    stageName: "Lead",
    stageColor: STAGE_COLORS.lead,
  },
  {
    id: "deal_27",
    title: "Travel Booking Engine",
    clientId: null,
    stage: "lead",
    value: 22000,
    probability: 8,
    source: "upwork",
    contactName: "Carlos Mendez",
    contactEmail: "carlos@wanderlust.travel",
    expectedCloseDate: Date.now() + 70 * 24 * 60 * 60 * 1000,
    assignedMemberId: "mem_004",
    notes: "Inbound Upwork inquiry. Client currently reselling a competitor's platform and wants their own. Needs GDS integration expertise. Early discovery stage.",
    description: "White-label travel booking engine with flight, hotel, and activity search API integrations plus custom itinerary builder.",
    createdAt: Date.now() - 7 * 24 * 60 * 60 * 1000,
    proposalId: null,
    workspaceId: null,
    client: null,
    assignedMember: { id: "mem_004", name: "Sam Chen", email: "sam.chen@axiaagency.com", image: null, role: "member", title: "Full-Stack Developer" },
    linkedProposal: null,
    stageName: "Lead",
    stageColor: STAGE_COLORS.lead,
  },

  // ── Additional Qualified deal (1) ──
  {
    id: "deal_28",
    title: "Legal Practice Management",
    clientId: null,
    stage: "qualified",
    value: 16000,
    probability: 28,
    source: "linkedin",
    contactName: "Attorney James Whitfield",
    contactEmail: "james@whitfieldlaw.com",
    expectedCloseDate: Date.now() + 40 * 24 * 60 * 60 * 1000,
    assignedMemberId: "mem_003",
    notes: "LinkedIn prospect. Met at a legal tech conference. Very interested in modernizing their 15-year-old system. They want a demo with their partners next Thursday.",
    description: "Practice management system for a mid-size law firm with case management, time tracking, billing, document assembly, and court deadline calendaring.",
    createdAt: Date.now() - 18 * 24 * 60 * 60 * 1000,
    proposalId: null,
    workspaceId: null,
    client: null,
    assignedMember: { id: "mem_003", name: "Jordan Kim", email: "jordan.kim@axiaagency.com", image: null, role: "manager", title: "Account Manager" },
    linkedProposal: null,
    stageName: "Qualified",
    stageColor: STAGE_COLORS.qualified,
  },

  // ── Additional Won deals (2) ──
  {
    id: "deal_29",
    title: "Creative Studios Brand Refresh",
    clientId: "client_5",
    stage: "won",
    value: 5500,
    probability: 100,
    source: "direct",
    contactName: "Tom Bradley",
    contactEmail: "tom@creativestudios.art",
    expectedCloseDate: Date.now() - 1 * 24 * 60 * 60 * 1000,
    assignedMemberId: "mem_001",
    notes: "Won! Existing client expanding relationship. Quick brand refresh project to align with their upcoming product launch. Kickoff tomorrow.",
    description: "Brand refresh for Creative Studios including updated visual identity, social media templates, and brand animation toolkit.",
    createdAt: Date.now() - 50 * 24 * 60 * 60 * 1000,
    proposalId: "prop_14",
    workspaceId: null,
    client: { id: "client_5", name: "Creative Studios", platform: "direct", contactEmail: "tom@creativestudios.art", contactName: "Tom Bradley" },
    assignedMember: { id: "mem_001", name: "Alex Rivera", email: "alex.rivera@axiaagency.com", image: null, role: "owner", title: "Founder & Creative Director" },
    linkedProposal: { id: "prop_14", title: "Creative Studios Brand Refresh", status: "signed", totalValue: 5500 },
    stageName: "Won",
    stageColor: "var(--success)",
  },
  {
    id: "deal_30",
    title: "CloudMetrics SaaS Dashboard",
    clientId: null,
    stage: "won",
    value: 8500,
    probability: 100,
    source: "linkedin",
    contactName: "Jennifer Wu",
    contactEmail: "jen@cloudmetrics.io",
    expectedCloseDate: Date.now() - 5 * 24 * 60 * 60 * 1000,
    assignedMemberId: "mem_003",
    notes: "Won after competitive evaluation against 2 other agencies. Their CTO championed us. 3-month engagement starting next week. Potential for expansion into their mobile app.",
    description: "Analytics dashboard redesign with real-time data visualization, team collaboration features, and role-based access views.",
    createdAt: Date.now() - 55 * 24 * 60 * 60 * 1000,
    proposalId: "prop_15",
    workspaceId: null,
    client: null,
    assignedMember: { id: "mem_003", name: "Jordan Kim", email: "jordan.kim@axiaagency.com", image: null, role: "manager", title: "Account Manager" },
    linkedProposal: { id: "prop_15", title: "CloudMetrics SaaS Dashboard Proposal", status: "signed", totalValue: 8500 },
    stageName: "Won",
    stageColor: "var(--success)",
  },
];

const INITIAL_PROPOSALS: Proposal[] = [
  // ── Signed proposals (5) ──
  {
    id: "prop_1",
    title: "TechCorp Phase 2 — CMS & Marketing Automation",
    clientId: "client_1",
    status: "signed",
    totalValue: 15000,
    clientEmail: "david.chen@techcorp.io",
    assignedMemberId: "mem_002",
    sentAt: Date.now() - 20 * 24 * 60 * 60 * 1000,
    viewedAt: Date.now() - 18 * 24 * 60 * 60 * 1000,
    signedAt: Date.now() - 10 * 24 * 60 * 60 * 1000,
    validUntil: Date.now() + 15 * 24 * 60 * 60 * 1000,
    createdAt: Date.now() - 25 * 24 * 60 * 60 * 1000,
    dealId: "deal_5",
    workspaceId: null,
    client: { id: "client_1", name: "TechCorp Solutions", platform: "upwork", contactEmail: "david.chen@techcorp.io", contactName: "David Chen" },
    assignedMember: { id: "mem_002", name: "Priya Sharma", email: "priya.sharma@axiaagency.com", image: null, role: "manager", title: "Senior Project Manager" },
    linkedDeal: { id: "deal_5", title: "TechCorp Phase 2 — CMS & Marketing Automation", value: 15000, stageName: "Won", stageColor: "var(--success)" },
  },
  {
    id: "prop_6",
    title: "E-Commerce Platform Redesign",
    clientId: null,
    status: "signed",
    totalValue: 28000,
    clientEmail: "sarah@acmecorp.com",
    assignedMemberId: "mem_002",
    sentAt: Date.now() - 25 * 24 * 60 * 60 * 1000,
    viewedAt: Date.now() - 22 * 24 * 60 * 60 * 1000,
    signedAt: Date.now() - 12 * 24 * 60 * 60 * 1000,
    validUntil: Date.now() + 10 * 24 * 60 * 60 * 1000,
    createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
    dealId: null,
    workspaceId: null,
    client: null,
    assignedMember: { id: "mem_002", name: "Priya Sharma", email: "priya.sharma@axiaagency.com", image: null, role: "manager", title: "Senior Project Manager" },
    linkedDeal: null,
  },
  {
    id: "prop_10",
    title: "DigiMark Brand Identity Package",
    clientId: "client_4",
    status: "signed",
    totalValue: 3200,
    clientEmail: "lisa@digitalmarketingco.com",
    assignedMemberId: "mem_006",
    sentAt: Date.now() - 15 * 24 * 60 * 60 * 1000,
    viewedAt: Date.now() - 14 * 24 * 60 * 60 * 1000,
    signedAt: Date.now() - 8 * 24 * 60 * 60 * 1000,
    validUntil: Date.now() + 15 * 24 * 60 * 60 * 1000,
    createdAt: Date.now() - 18 * 24 * 60 * 60 * 1000,
    dealId: "deal_22",
    workspaceId: null,
    client: { id: "client_4", name: "Digital Marketing Co", platform: "freelancer", contactEmail: "lisa@digitalmarketingco.com", contactName: "Lisa Park" },
    assignedMember: { id: "mem_006", name: "Marcus Thompson", email: "marcus.t@axiaagency.com", image: null, role: "member", title: "Brand Strategist" },
    linkedDeal: { id: "deal_22", title: "DigiMark Brand Identity", value: 3200, stageName: "Won", stageColor: "var(--success)" },
  },

  // ── Sent proposals (2) ──
  {
    id: "prop_2",
    title: "Mobile Banking App — Full Development",
    clientId: "client_6",
    status: "sent",
    totalValue: 25000,
    clientEmail: "cto@finserve.io",
    assignedMemberId: "mem_002",
    sentAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
    viewedAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
    signedAt: null,
    validUntil: Date.now() + 25 * 24 * 60 * 60 * 1000,
    createdAt: Date.now() - 10 * 24 * 60 * 60 * 1000,
    dealId: "deal_3",
    workspaceId: null,
    client: { id: "client_6", name: "FinServe Analytics", platform: "upwork", contactEmail: "cto@finserve.io", contactName: "Michael Torres" },
    assignedMember: { id: "mem_002", name: "Priya Sharma", email: "priya.sharma@axiaagency.com", image: null, role: "manager", title: "Senior Project Manager" },
    linkedDeal: { id: "deal_3", title: "Mobile Banking App", value: 25000, stageName: "Proposal", stageColor: STAGE_COLORS.proposal },
  },
  {
    id: "prop_9",
    title: "Insurance Claims Processing Platform",
    clientId: null,
    status: "sent",
    totalValue: 28000,
    clientEmail: "vikram@insureflow.com",
    assignedMemberId: "mem_002",
    sentAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
    viewedAt: Date.now() - 1 * 24 * 60 * 60 * 1000,
    signedAt: null,
    validUntil: Date.now() + 27 * 24 * 60 * 60 * 1000,
    createdAt: Date.now() - 8 * 24 * 60 * 60 * 1000,
    dealId: "deal_20",
    workspaceId: null,
    client: null,
    assignedMember: { id: "mem_002", name: "Priya Sharma", email: "priya.sharma@axiaagency.com", image: null, role: "manager", title: "Senior Project Manager" },
    linkedDeal: { id: "deal_20", title: "Insurance Claims Platform", value: 28000, stageName: "Negotiation", stageColor: STAGE_COLORS.negotiation },
  },

  // ── Viewed proposals (2) ──
  {
    id: "prop_4",
    title: "Creative Studios Motion Design Package",
    clientId: "client_5",
    status: "viewed",
    totalValue: 7500,
    clientEmail: "tom@creativestudios.art",
    assignedMemberId: "mem_001",
    sentAt: Date.now() - 8 * 24 * 60 * 60 * 1000,
    viewedAt: Date.now() - 6 * 24 * 60 * 60 * 1000,
    signedAt: null,
    validUntil: Date.now() + 10 * 24 * 60 * 60 * 1000,
    createdAt: Date.now() - 12 * 24 * 60 * 60 * 1000,
    dealId: "deal_9",
    workspaceId: null,
    client: { id: "client_5", name: "Creative Studios", platform: "direct", contactEmail: "tom@creativestudios.art", contactName: "Tom Bradley" },
    assignedMember: { id: "mem_001", name: "Alex Rivera", email: "alex.rivera@axiaagency.com", image: null, role: "owner", title: "Founder & Creative Director" },
    linkedDeal: { id: "deal_9", title: "Creative Studios Motion Design Package", value: 7500, stageName: "Proposal", stageColor: STAGE_COLORS.proposal },
  },
  {
    id: "prop_11",
    title: "Brand Identity for HealthTech Startup",
    clientId: null,
    status: "viewed",
    totalValue: 12000,
    clientEmail: "marketing@meditech.org",
    assignedMemberId: "mem_006",
    sentAt: Date.now() - 7 * 24 * 60 * 60 * 1000,
    viewedAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
    signedAt: null,
    validUntil: Date.now() + 23 * 24 * 60 * 60 * 1000,
    createdAt: Date.now() - 10 * 24 * 60 * 60 * 1000,
    dealId: null,
    workspaceId: null,
    client: null,
    assignedMember: { id: "mem_006", name: "Marcus Thompson", email: "marcus.t@axiaagency.com", image: null, role: "member", title: "Brand Strategist" },
    linkedDeal: null,
  },

  // ── Draft proposals (3) ──
  {
    id: "prop_3",
    title: "Healthcare Patient Portal",
    clientId: null,
    status: "draft",
    totalValue: 18000,
    clientEmail: "robert@medportal.health",
    assignedMemberId: "mem_003",
    sentAt: null,
    viewedAt: null,
    signedAt: null,
    validUntil: null,
    createdAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
    dealId: "deal_18",
    workspaceId: null,
    client: null,
    assignedMember: { id: "mem_003", name: "Jordan Kim", email: "jordan.kim@axiaagency.com", image: null, role: "manager", title: "Account Manager" },
    linkedDeal: { id: "deal_18", title: "Healthcare Patient Portal", value: 35000, stageName: "Proposal", stageColor: STAGE_COLORS.proposal },
  },
  {
    id: "prop_12",
    title: "Supply Chain Management System",
    clientId: null,
    status: "draft",
    totalValue: 32000,
    clientEmail: "rchang@logisync.com",
    assignedMemberId: "mem_002",
    sentAt: null,
    viewedAt: null,
    signedAt: null,
    validUntil: null,
    createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
    dealId: "deal_16",
    workspaceId: null,
    client: null,
    assignedMember: { id: "mem_002", name: "Priya Sharma", email: "priya.sharma@axiaagency.com", image: null, role: "manager", title: "Senior Project Manager" },
    linkedDeal: { id: "deal_16", title: "Supply Chain Management System", value: 32000, stageName: "Qualified", stageColor: STAGE_COLORS.qualified },
  },
  {
    id: "prop_13",
    title: "Restaurant POS & Ordering System",
    clientId: null,
    status: "draft",
    totalValue: 14000,
    clientEmail: "maria@freshbites.co",
    assignedMemberId: "mem_004",
    sentAt: null,
    viewedAt: null,
    signedAt: null,
    validUntil: null,
    createdAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
    dealId: "deal_17",
    workspaceId: null,
    client: null,
    assignedMember: { id: "mem_004", name: "Sam Chen", email: "sam.chen@axiaagency.com", image: null, role: "member", title: "Full-Stack Developer" },
    linkedDeal: { id: "deal_17", title: "Restaurant POS & Ordering System", value: 14000, stageName: "Qualified", stageColor: STAGE_COLORS.qualified },
  },

  // ── Declined proposal (1) ──
  {
    id: "prop_5",
    title: "Social Platform MVP",
    clientId: null,
    status: "declined",
    totalValue: 35000,
    clientEmail: "founders@socialnext.com",
    assignedMemberId: "mem_003",
    sentAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
    viewedAt: Date.now() - 28 * 24 * 60 * 60 * 1000,
    signedAt: null,
    validUntil: Date.now() - 5 * 24 * 60 * 60 * 1000,
    createdAt: Date.now() - 35 * 24 * 60 * 60 * 1000,
    dealId: null,
    workspaceId: null,
    client: null,
    assignedMember: { id: "mem_003", name: "Jordan Kim", email: "jordan.kim@axiaagency.com", image: null, role: "manager", title: "Account Manager" },
    linkedDeal: null,
  },

  // ── Expired proposal (1) ──
  {
    id: "prop_14",
    title: "EdTech Course Platform Proposal",
    clientId: null,
    status: "expired",
    totalValue: 9500,
    clientEmail: "anika@learnvista.edu",
    assignedMemberId: "mem_004",
    sentAt: Date.now() - 45 * 24 * 60 * 60 * 1000,
    viewedAt: Date.now() - 43 * 24 * 60 * 60 * 1000,
    signedAt: null,
    validUntil: Date.now() - 15 * 24 * 60 * 60 * 1000,
    createdAt: Date.now() - 50 * 24 * 60 * 60 * 1000,
    dealId: "deal_14",
    workspaceId: null,
    client: null,
    assignedMember: { id: "mem_004", name: "Sam Chen", email: "sam.chen@axiaagency.com", image: null, role: "member", title: "Full-Stack Developer" },
    linkedDeal: { id: "deal_14", title: "EdTech Course Platform", value: 9500, stageName: "Lead", stageColor: STAGE_COLORS.lead },
  },

  // ── Additional Signed proposals (2) ──
  {
    id: "prop_14",
    title: "Creative Studios Brand Refresh",
    clientId: "client_5",
    status: "signed",
    totalValue: 5500,
    clientEmail: "tom@creativestudios.art",
    assignedMemberId: "mem_001",
    sentAt: Date.now() - 12 * 24 * 60 * 60 * 1000,
    viewedAt: Date.now() - 11 * 24 * 60 * 60 * 1000,
    signedAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
    validUntil: Date.now() + 18 * 24 * 60 * 60 * 1000,
    createdAt: Date.now() - 14 * 24 * 60 * 60 * 1000,
    dealId: "deal_29",
    workspaceId: null,
    client: { id: "client_5", name: "Creative Studios", platform: "direct", contactEmail: "tom@creativestudios.art", contactName: "Tom Bradley" },
    assignedMember: { id: "mem_001", name: "Alex Rivera", email: "alex.rivera@axiaagency.com", image: null, role: "owner", title: "Founder & Creative Director" },
    linkedDeal: { id: "deal_29", title: "Creative Studios Brand Refresh", value: 5500, stageName: "Won", stageColor: "var(--success)" },
  },
  {
    id: "prop_15",
    title: "CloudMetrics SaaS Dashboard Proposal",
    clientId: null,
    status: "signed",
    totalValue: 8500,
    clientEmail: "jen@cloudmetrics.io",
    assignedMemberId: "mem_003",
    sentAt: Date.now() - 18 * 24 * 60 * 60 * 1000,
    viewedAt: Date.now() - 16 * 24 * 60 * 60 * 1000,
    signedAt: Date.now() - 8 * 24 * 60 * 60 * 1000,
    validUntil: Date.now() + 12 * 24 * 60 * 60 * 1000,
    createdAt: Date.now() - 20 * 24 * 60 * 60 * 1000,
    dealId: "deal_30",
    workspaceId: null,
    client: null,
    assignedMember: { id: "mem_003", name: "Jordan Kim", email: "jordan.kim@axiaagency.com", image: null, role: "manager", title: "Account Manager" },
    linkedDeal: { id: "deal_30", title: "CloudMetrics SaaS Dashboard", value: 8500, stageName: "Won", stageColor: "var(--success)" },
  },

  // ── Additional Sent proposals (2) ──
  {
    id: "prop_16",
    title: "Nonprofit Donation Platform Proposal",
    clientId: null,
    status: "sent",
    totalValue: 8000,
    clientEmail: "sarah@givehope.org",
    assignedMemberId: "mem_006",
    sentAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
    viewedAt: null,
    signedAt: null,
    validUntil: Date.now() + 28 * 24 * 60 * 60 * 1000,
    createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
    dealId: "deal_26",
    workspaceId: null,
    client: null,
    assignedMember: { id: "mem_006", name: "Marcus Thompson", email: "marcus.t@axiaagency.com", image: null, role: "member", title: "Brand Strategist" },
    linkedDeal: { id: "deal_26", title: "Nonprofit Donation Platform", value: 8000, stageName: "Lead", stageColor: STAGE_COLORS.lead },
  },
  {
    id: "prop_17",
    title: "Legal Practice Management Proposal",
    clientId: null,
    status: "sent",
    totalValue: 16000,
    clientEmail: "james@whitfieldlaw.com",
    assignedMemberId: "mem_003",
    sentAt: Date.now() - 4 * 24 * 60 * 60 * 1000,
    viewedAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
    signedAt: null,
    validUntil: Date.now() + 26 * 24 * 60 * 60 * 1000,
    createdAt: Date.now() - 8 * 24 * 60 * 60 * 1000,
    dealId: "deal_28",
    workspaceId: null,
    client: null,
    assignedMember: { id: "mem_003", name: "Jordan Kim", email: "jordan.kim@axiaagency.com", image: null, role: "manager", title: "Account Manager" },
    linkedDeal: { id: "deal_28", title: "Legal Practice Management", value: 16000, stageName: "Qualified", stageColor: STAGE_COLORS.qualified },
  },

  // ── Additional Viewed proposal (1) ──
  {
    id: "prop_18",
    title: "Manufacturing Quality Control System Proposal",
    clientId: null,
    status: "viewed",
    totalValue: 38000,
    clientEmail: "ingrid@precisemfg.se",
    assignedMemberId: "mem_001",
    sentAt: Date.now() - 6 * 24 * 60 * 60 * 1000,
    viewedAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
    signedAt: null,
    validUntil: Date.now() + 24 * 24 * 60 * 60 * 1000,
    createdAt: Date.now() - 10 * 24 * 60 * 60 * 1000,
    dealId: "deal_23",
    workspaceId: null,
    client: null,
    assignedMember: { id: "mem_001", name: "Alex Rivera", email: "alex.rivera@axiaagency.com", image: null, role: "owner", title: "Founder & Creative Director" },
    linkedDeal: { id: "deal_23", title: "Manufacturing Quality Control System", value: 38000, stageName: "Negotiation", stageColor: STAGE_COLORS.negotiation },
  },

  // ── Additional Draft proposal (1) ──
  {
    id: "prop_19",
    title: "Travel Booking Engine Proposal",
    clientId: null,
    status: "draft",
    totalValue: 22000,
    clientEmail: "carlos@wanderlust.travel",
    assignedMemberId: "mem_004",
    sentAt: null,
    viewedAt: null,
    signedAt: null,
    validUntil: null,
    createdAt: Date.now() - 1 * 24 * 60 * 60 * 1000,
    dealId: "deal_27",
    workspaceId: null,
    client: null,
    assignedMember: { id: "mem_004", name: "Sam Chen", email: "sam.chen@axiaagency.com", image: null, role: "member", title: "Full-Stack Developer" },
    linkedDeal: { id: "deal_27", title: "Travel Booking Engine", value: 22000, stageName: "Lead", stageColor: STAGE_COLORS.lead },
  },
];

// ─── Context Interface ───────────────────────────────────────────────────────

interface AppDataContext {
  // Data
  teamMembers: TeamMember[];
  clients: Client[];
  projects: Project[];
  timeEntries: TimeEntry[];
  invoices: Invoice[];
  pipelineDeals: PipelineDeal[];
  proposals: Proposal[];

  // Convex status
  isConvexDataAvailable: boolean;
  isConvexLoading: boolean;

  // Lookup helpers
  getClient: (id: string) => Client | undefined;
  getProject: (id: string) => Project | undefined;
  getMember: (id: string) => TeamMember | undefined;
  getProjectsForClient: (clientId: string) => Project[];
  getProjectsForMember: (memberId: string) => Project[];
  getClientsForMember: (memberId: string) => Client[];
  getInvoicesForClient: (clientId: string) => Invoice[];
  getInvoicesForProject: (projectId: string) => Invoice[];
  getTimeEntriesForProject: (projectId: string) => TimeEntry[];
  getTimeEntriesForMember: (memberId: string) => TimeEntry[];
  getDealsForClient: (clientId: string) => PipelineDeal[];
  getProposalsForClient: (clientId: string) => Proposal[];

  // Mutations (update local state)
  assignMemberToProject: (projectId: string, memberId: string) => void;
  unassignMemberFromProject: (projectId: string, memberId: string) => void;
  assignMemberToClient: (clientId: string, memberId: string) => void;
  unassignMemberFromClient: (clientId: string, memberId: string) => void;
  updateProjectStatus: (projectId: string, status: ProjectStatus) => void;
  updateInvoiceStatus: (invoiceId: string, status: InvoiceStatus) => void;
  addTimeEntry: (entry: Omit<TimeEntry, "id">) => void;
  addProject: (project: Omit<Project, "id" | "createdAt" | "lastActivityAt">) => void;
  addClient: (client: Omit<Client, "id" | "addedAt" | "lastActivityAt">) => void;
  moveDealToStage: (dealId: string, stage: DealStage) => void;
  updateProposalStatus: (proposalId: string, status: ProposalStatus) => void;
}

const AppDataCtx = createContext<AppDataContext | null>(null);

export function useAppData() {
  const ctx = useContext(AppDataCtx);
  if (!ctx) throw new Error("useAppData must be used within AppDataProvider");
  return ctx;
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [teamMembers] = useState<TeamMember[]>(INITIAL_TEAM_MEMBERS);
  const [clients, setClients] = useState<Client[]>(INITIAL_CLIENTS);
  const [projects, setProjects] = useState<Project[]>(INITIAL_PROJECTS);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>(INITIAL_TIME_ENTRIES);
  const [invoices, setInvoices] = useState<Invoice[]>(INITIAL_INVOICES);
  const [mockPipelineDeals, setMockPipelineDeals] = useState<PipelineDeal[]>(INITIAL_PIPELINE_DEALS);
  const [mockProposals, setMockProposals] = useState<Proposal[]>(INITIAL_PROPOSALS);

  // ── Convex Hooks ──
  const convexPipeline = useConvexPipeline();
  const convexProposals = useConvexProposals();

  // ── Hybrid data: use Convex per-source when available, fall back to mock ──
  // Each data source (pipeline / proposals) independently decides whether
  // to use Convex or mock data. Previously, OR logic caused both to use
  // Convex if either had data, leading to empty pages when one source
  // returned [] from an unauthenticated session.
  const isPipelineConvexAvailable = convexPipeline.isConvexAvailable;
  const isProposalsConvexAvailable = convexProposals.isConvexAvailable;
  const isConvexDataAvailable = isPipelineConvexAvailable || isProposalsConvexAvailable;
  const isConvexLoading = convexPipeline.isLoading || convexProposals.isLoading;

  const pipelineDeals = isPipelineConvexAvailable ? convexPipeline.deals : mockPipelineDeals;
  const proposals = isProposalsConvexAvailable ? convexProposals.proposals : mockProposals;

  // ── Lookup helpers ──
  const getClient = useCallback((id: string) => clients.find(c => c.id === id), [clients]);
  const getProject = useCallback((id: string) => projects.find(p => p.id === id), [projects]);
  const getMember = useCallback((id: string) => teamMembers.find(m => m.id === id), [teamMembers]);

  const getProjectsForClient = useCallback((clientId: string) =>
    projects.filter(p => p.clientId === clientId), [projects]);

  const getProjectsForMember = useCallback((memberId: string) =>
    projects.filter(p => p.assignedMemberIds.includes(memberId)), [projects]);

  const getClientsForMember = useCallback((memberId: string) =>
    clients.filter(c => c.assignedMemberIds.includes(memberId)), [clients]);

  const getInvoicesForClient = useCallback((clientId: string) =>
    invoices.filter(i => i.clientId === clientId), [invoices]);

  const getInvoicesForProject = useCallback((projectId: string) =>
    invoices.filter(i => i.projectId === projectId), [invoices]);

  const getTimeEntriesForProject = useCallback((projectId: string) =>
    timeEntries.filter(t => t.projectId === projectId), [timeEntries]);

  const getTimeEntriesForMember = useCallback((memberId: string) =>
    timeEntries.filter(t => t.memberId === memberId), [timeEntries]);

  const getDealsForClient = useCallback((clientId: string) =>
    pipelineDeals.filter(d => d.clientId === clientId), [pipelineDeals]);

  const getProposalsForClient = useCallback((clientId: string) =>
    proposals.filter(p => p.clientId === clientId), [proposals]);

  // ── Mutations ──
  const assignMemberToProject = useCallback((projectId: string, memberId: string) => {
    setProjects(prev => prev.map(p =>
      p.id === projectId && !p.assignedMemberIds.includes(memberId)
        ? { ...p, assignedMemberIds: [...p.assignedMemberIds, memberId] }
        : p
    ));
  }, []);

  const unassignMemberFromProject = useCallback((projectId: string, memberId: string) => {
    setProjects(prev => prev.map(p =>
      p.id === projectId
        ? { ...p, assignedMemberIds: p.assignedMemberIds.filter(id => id !== memberId) }
        : p
    ));
  }, []);

  const assignMemberToClient = useCallback((clientId: string, memberId: string) => {
    setClients(prev => prev.map(c =>
      c.id === clientId && !c.assignedMemberIds.includes(memberId)
        ? { ...c, assignedMemberIds: [...c.assignedMemberIds, memberId] }
        : c
    ));
  }, []);

  const unassignMemberFromClient = useCallback((clientId: string, memberId: string) => {
    setClients(prev => prev.map(c =>
      c.id === clientId
        ? { ...c, assignedMemberIds: c.assignedMemberIds.filter(id => id !== memberId) }
        : c
    ));
  }, []);

  const updateProjectStatus = useCallback((projectId: string, status: ProjectStatus) => {
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, status } : p));
  }, []);

  const updateInvoiceStatus = useCallback((invoiceId: string, status: InvoiceStatus) => {
    setInvoices(prev => prev.map(i =>
      i.id === invoiceId ? { ...i, status, paidDate: status === "paid" ? Date.now() : i.paidDate } : i
    ));
  }, []);

  const addTimeEntry = useCallback((entry: Omit<TimeEntry, "id">) => {
    const newEntry: TimeEntry = { ...entry, id: `time_${Date.now()}` };
    setTimeEntries(prev => [newEntry, ...prev]);
  }, []);

  const addProject = useCallback((project: Omit<Project, "id" | "createdAt" | "lastActivityAt">) => {
    const newProject: Project = { ...project, id: `proj_${Date.now()}`, createdAt: Date.now(), lastActivityAt: Date.now() };
    setProjects(prev => [newProject, ...prev]);
  }, []);

  const addClient = useCallback((client: Omit<Client, "id" | "addedAt" | "lastActivityAt">) => {
    const newClient: Client = { ...client, id: `client_${Date.now()}`, addedAt: Date.now(), lastActivityAt: Date.now() };
    setClients(prev => [newClient, ...prev]);
  }, []);

  const moveDealToStage = useCallback((dealId: string, stage: DealStage) => {
    if (isPipelineConvexAvailable) {
      // Use Convex mutation - the query will auto-refresh
      convexPipeline.moveDeal(dealId, stage).catch((err) => {
        console.error("Failed to move deal in Convex:", err);
      });
    } else {
      // Fallback to local state
      setMockPipelineDeals(prev => prev.map(d =>
        d.id === dealId ? { ...d, stage, probability: stage === "won" ? 100 : stage === "lost" ? 0 : d.probability } : d
      ));
    }
  }, [isPipelineConvexAvailable, convexPipeline]);

  const updateProposalStatus = useCallback((proposalId: string, status: ProposalStatus) => {
    if (isProposalsConvexAvailable) {
      // Use Convex mutation for send/sign operations
      if (status === "sent") {
        convexProposals.sendProposal(proposalId).catch((err) => {
          console.error("Failed to send proposal in Convex:", err);
        });
      } else {
        // For other status changes, we fall through to local state update
        // (Convex doesn't expose a generic status update mutation for all statuses)
      }
    }
    // Always update local/mock state too for immediate UI feedback
    if (!isProposalsConvexAvailable) {
      setMockProposals(prev => prev.map(p =>
        p.id === proposalId ? { ...p, status, signedAt: status === "signed" ? Date.now() : p.signedAt, sentAt: status === "sent" ? Date.now() : p.sentAt } : p
      ));
    }
  }, [isProposalsConvexAvailable, convexProposals]);

  const contextValue = useMemo<AppDataContext>(() => ({
    teamMembers, clients, projects, timeEntries, invoices, pipelineDeals, proposals,
    isConvexDataAvailable, isConvexLoading,
    getClient, getProject, getMember,
    getProjectsForClient, getProjectsForMember, getClientsForMember,
    getInvoicesForClient, getInvoicesForProject,
    getTimeEntriesForProject, getTimeEntriesForMember,
    getDealsForClient, getProposalsForClient,
    assignMemberToProject, unassignMemberFromProject,
    assignMemberToClient, unassignMemberFromClient,
    updateProjectStatus, updateInvoiceStatus,
    addTimeEntry, addProject, addClient,
    moveDealToStage, updateProposalStatus,
  }), [
    teamMembers, clients, projects, timeEntries, invoices, pipelineDeals, proposals,
    isConvexDataAvailable, isConvexLoading,
    getClient, getProject, getMember,
    getProjectsForClient, getProjectsForMember, getClientsForMember,
    getInvoicesForClient, getInvoicesForProject,
    getTimeEntriesForProject, getTimeEntriesForMember,
    getDealsForClient, getProposalsForClient,
    assignMemberToProject, unassignMemberFromProject,
    assignMemberToClient, unassignMemberFromClient,
    updateProjectStatus, updateInvoiceStatus,
    addTimeEntry, addProject, addClient,
    moveDealToStage, updateProposalStatus,
  ]);

  return <AppDataCtx.Provider value={contextValue}>{children}</AppDataCtx.Provider>;
}
