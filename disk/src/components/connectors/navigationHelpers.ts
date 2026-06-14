import type { NavigateFunction } from "react-router";

// Navigate to create a project from a signed proposal
export function navigateToCreateProject(navigate: NavigateFunction, proposalId: string): void {
  navigate(`/projects?createFromProposal=${proposalId}`);
}

// Navigate to time tracking with project pre-selected
export function navigateToStartTimer(navigate: NavigateFunction, projectId: string, projectName?: string): void {
  const params = new URLSearchParams({ project: projectId });
  if (projectName) params.set("projectName", projectName);
  navigate(`/time-tracking?${params.toString()}`);
}

// Navigate to create invoice from project
export function navigateToCreateInvoice(navigate: NavigateFunction, projectId: string, projectName?: string): void {
  const params = new URLSearchParams({ projectId });
  if (projectName) params.set("projectName", projectName);
  navigate(`/invoices/new?${params.toString()}`);
}

// Navigate to scope page for project
export function navigateToProjectScope(navigate: NavigateFunction, projectId: string, projectName?: string): void {
  const params = new URLSearchParams({ projectId });
  if (projectName) params.set("projectName", projectName);
  navigate(`/scope?${params.toString()}`);
}

// Navigate to evidence library filtered by project
export function navigateToProjectEvidence(navigate: NavigateFunction, projectId: string, projectName?: string): void {
  const params = new URLSearchParams({ projectId });
  if (projectName) params.set("projectName", projectName);
  navigate(`/evidence-library?${params.toString()}`);
}

// Navigate to payment patterns for a client
export function navigateToClientPayments(navigate: NavigateFunction, clientId: string, clientName?: string): void {
  const params = new URLSearchParams({ clientId });
  if (clientName) params.set("clientName", clientName);
  navigate(`/payment-patterns?${params.toString()}`);
}

// Navigate to payment reminders
export function navigateToReminders(navigate: NavigateFunction): void {
  navigate(`/invoices?tab=reminders`);
}

// Feature icons mapping
export const featureIcons: Record<string, string> = {
  proposal: "📄",
  project: "💼",
  time: "⏱️",
  evidence: "🛡️",
  invoice: "🧾",
  scope: "📐",
  payment: "💰",
  reminder: "🔔",
};

export const featureLabels: Record<string, string> = {
  proposal: "Proposal",
  project: "Project",
  time: "Time Tracking",
  evidence: "Evidence",
  invoice: "Invoice",
  scope: "Scope",
  payment: "Payments",
  reminder: "Reminders",
};
