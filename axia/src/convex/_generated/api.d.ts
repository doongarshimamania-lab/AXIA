/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as adminListAll from "../adminListAll.js";
import type * as adminSeed from "../adminSeed.js";
import type * as ai_disputePrediction from "../ai/disputePrediction.js";
import type * as ai_disputePredictionNode from "../ai/disputePredictionNode.js";
import type * as audit_storeConsentAudit from "../audit/storeConsentAudit.js";
import type * as auth from "../auth.js";
import type * as auth_emailOtp from "../auth/emailOtp.js";
import type * as autoSeed from "../autoSeed.js";
import type * as billing_crud from "../billing/crud.js";
import type * as billing_reminders from "../billing/reminders.js";
import type * as clientAuth from "../clientAuth.js";
import type * as clients from "../clients.js";
import type * as clients_bulkImport from "../clients/bulkImport.js";
import type * as clients_clientAuth from "../clients/clientAuth.js";
import type * as clients_clientPortal from "../clients/clientPortal.js";
import type * as clients_clientWorkspace from "../clients/clientWorkspace.js";
import type * as clients_crud from "../clients/crud.js";
import type * as clients_freelancerDirectory from "../clients/freelancerDirectory.js";
import type * as clients_verificationRequests from "../clients/verificationRequests.js";
import type * as complianceAlerts from "../complianceAlerts.js";
import type * as crons from "../crons.js";
import type * as customFields_crud from "../customFields/crud.js";
import type * as customFields_validate from "../customFields/validate.js";
import type * as deals from "../deals.js";
import type * as debug from "../debug.js";
import type * as disputeReports from "../disputeReports.js";
import type * as evidence from "../evidence.js";
import type * as evidence_analytics from "../evidence/analytics.js";
import type * as evidence_extension from "../evidence/extension.js";
import type * as evidence_library from "../evidence/library.js";
import type * as extension from "../extension.js";
import type * as extensionRotate from "../extensionRotate.js";
import type * as goals_crud from "../goals/crud.js";
import type * as http from "../http.js";
import type * as invoices from "../invoices.js";
import type * as manualSends from "../manualSends.js";
import type * as messaging_channelMutations from "../messaging/channelMutations.js";
import type * as messaging_channels from "../messaging/channels.js";
import type * as messaging_dms from "../messaging/dms.js";
import type * as messaging_helpers from "../messaging/helpers.js";
import type * as messaging_messageMutations from "../messaging/messageMutations.js";
import type * as messaging_messages from "../messaging/messages.js";
import type * as network_premiumNetwork from "../network/premiumNetwork.js";
import type * as notifications from "../notifications.js";
import type * as permissions from "../permissions.js";
import type * as permissions_shareRecord from "../permissions/shareRecord.js";
import type * as permissions_shareRecords from "../permissions/shareRecords.js";
import type * as permissions_transferOwnership from "../permissions/transferOwnership.js";
import type * as pipeline_bulkImport from "../pipeline/bulkImport.js";
import type * as pipeline_crud from "../pipeline/crud.js";
import type * as platforms_complianceStorage from "../platforms/complianceStorage.js";
import type * as platforms_platformAuth from "../platforms/platformAuth.js";
import type * as platforms_platformConnections from "../platforms/platformConnections.js";
import type * as platforms_platformImport from "../platforms/platformImport.js";
import type * as platforms_upworkComplianceCheck from "../platforms/upworkComplianceCheck.js";
import type * as policies_clientPolicies from "../policies/clientPolicies.js";
import type * as premium_crossPlatformVerification from "../premium/crossPlatformVerification.js";
import type * as premium_protectionAdvisor from "../premium/protectionAdvisor.js";
import type * as premium_protectionPlans from "../premium/protectionPlans.js";
import type * as premium_teamValidation from "../premium/teamValidation.js";
import type * as projects_adaptiveEvidenceSystem from "../projects/adaptiveEvidenceSystem.js";
import type * as projects_debugProjects from "../projects/debugProjects.js";
import type * as projects_milestoneAlerts from "../projects/milestoneAlerts.js";
import type * as projects_milestoneProtection from "../projects/milestoneProtection.js";
import type * as projects_milestoneProtectionTest from "../projects/milestoneProtectionTest.js";
import type * as projects_milestoneReports from "../projects/milestoneReports.js";
import type * as projects_milestoneSnapshots from "../projects/milestoneSnapshots.js";
import type * as projects_projectHealthDashboard from "../projects/projectHealthDashboard.js";
import type * as projects_projectProtection from "../projects/projectProtection.js";
import type * as projects_projectProtectionScore from "../projects/projectProtectionScore.js";
import type * as projects_projectProtectionSimple from "../projects/projectProtectionSimple.js";
import type * as projects_riskTimeline from "../projects/riskTimeline.js";
import type * as projects_scopeFormalization from "../projects/scopeFormalization.js";
import type * as proposals from "../proposals.js";
import type * as proposals_crud from "../proposals/crud.js";
import type * as protection_protectionValue from "../protection/protectionValue.js";
import type * as protection_protectionValueSimple from "../protection/protectionValueSimple.js";
import type * as scope from "../scope.js";
import type * as scope_crud from "../scope/crud.js";
import type * as security_audit from "../security/audit.js";
import type * as security_consent from "../security/consent.js";
import type * as security_crypto from "../security/crypto.js";
import type * as security_ownerAuth from "../security/ownerAuth.js";
import type * as security_rateLimit from "../security/rateLimit.js";
import type * as security_utils from "../security/utils.js";
import type * as seed from "../seed.js";
import type * as seedNew from "../seedNew.js";
import type * as seedProjects from "../seedProjects.js";
import type * as seedTeamUsers from "../seedTeamUsers.js";
import type * as sharedValidators from "../sharedValidators.js";
import type * as tables_billing from "../tables/billing.js";
import type * as tables_business from "../tables/business.js";
import type * as tables_clients from "../tables/clients.js";
import type * as tables_compliance from "../tables/compliance.js";
import type * as tables_customFields from "../tables/customFields.js";
import type * as tables_evidence from "../tables/evidence.js";
import type * as tables_features from "../tables/features.js";
import type * as tables_goals from "../tables/goals.js";
import type * as tables_manualSends from "../tables/manualSends.js";
import type * as tables_messaging from "../tables/messaging.js";
import type * as tables_notifications from "../tables/notifications.js";
import type * as tables_pipeline from "../tables/pipeline.js";
import type * as tables_platform from "../tables/platform.js";
import type * as tables_projects from "../tables/projects.js";
import type * as tables_proposals from "../tables/proposals.js";
import type * as tables_scope from "../tables/scope.js";
import type * as tables_security from "../tables/security.js";
import type * as tables_tags from "../tables/tags.js";
import type * as tables_teams from "../tables/teams.js";
import type * as tables_tracking from "../tables/tracking.js";
import type * as tables_users from "../tables/users.js";
import type * as tables_work from "../tables/work.js";
import type * as tables_workspaces from "../tables/workspaces.js";
import type * as tags_crud from "../tags/crud.js";
import type * as teams from "../teams.js";
import type * as teams_crud from "../teams/crud.js";
import type * as tiers_tierDetection from "../tiers/tierDetection.js";
import type * as tiers_upgradeTracking from "../tiers/upgradeTracking.js";
import type * as timeBlocks from "../timeBlocks.js";
import type * as tracking_crud from "../tracking/crud.js";
import type * as users from "../users.js";
import type * as waitlist from "../waitlist.js";
import type * as waitlistHelpers from "../waitlistHelpers.js";
import type * as wcvm_contextScanner from "../wcvm/contextScanner.js";
import type * as workSessions from "../workSessions.js";
import type * as workspaceFilter from "../workspaceFilter.js";
import type * as workspaces_crud from "../workspaces/crud.js";
import type * as workspaces_invitations from "../workspaces/invitations.js";
import type * as workspaces_members from "../workspaces/members.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  adminListAll: typeof adminListAll;
  adminSeed: typeof adminSeed;
  "ai/disputePrediction": typeof ai_disputePrediction;
  "ai/disputePredictionNode": typeof ai_disputePredictionNode;
  "audit/storeConsentAudit": typeof audit_storeConsentAudit;
  auth: typeof auth;
  "auth/emailOtp": typeof auth_emailOtp;
  autoSeed: typeof autoSeed;
  "billing/crud": typeof billing_crud;
  "billing/reminders": typeof billing_reminders;
  clientAuth: typeof clientAuth;
  clients: typeof clients;
  "clients/bulkImport": typeof clients_bulkImport;
  "clients/clientAuth": typeof clients_clientAuth;
  "clients/clientPortal": typeof clients_clientPortal;
  "clients/clientWorkspace": typeof clients_clientWorkspace;
  "clients/crud": typeof clients_crud;
  "clients/freelancerDirectory": typeof clients_freelancerDirectory;
  "clients/verificationRequests": typeof clients_verificationRequests;
  complianceAlerts: typeof complianceAlerts;
  crons: typeof crons;
  "customFields/crud": typeof customFields_crud;
  "customFields/validate": typeof customFields_validate;
  deals: typeof deals;
  debug: typeof debug;
  disputeReports: typeof disputeReports;
  evidence: typeof evidence;
  "evidence/analytics": typeof evidence_analytics;
  "evidence/extension": typeof evidence_extension;
  "evidence/library": typeof evidence_library;
  extension: typeof extension;
  extensionRotate: typeof extensionRotate;
  "goals/crud": typeof goals_crud;
  http: typeof http;
  invoices: typeof invoices;
  manualSends: typeof manualSends;
  "messaging/channelMutations": typeof messaging_channelMutations;
  "messaging/channels": typeof messaging_channels;
  "messaging/dms": typeof messaging_dms;
  "messaging/helpers": typeof messaging_helpers;
  "messaging/messageMutations": typeof messaging_messageMutations;
  "messaging/messages": typeof messaging_messages;
  "network/premiumNetwork": typeof network_premiumNetwork;
  notifications: typeof notifications;
  permissions: typeof permissions;
  "permissions/shareRecord": typeof permissions_shareRecord;
  "permissions/shareRecords": typeof permissions_shareRecords;
  "permissions/transferOwnership": typeof permissions_transferOwnership;
  "pipeline/bulkImport": typeof pipeline_bulkImport;
  "pipeline/crud": typeof pipeline_crud;
  "platforms/complianceStorage": typeof platforms_complianceStorage;
  "platforms/platformAuth": typeof platforms_platformAuth;
  "platforms/platformConnections": typeof platforms_platformConnections;
  "platforms/platformImport": typeof platforms_platformImport;
  "platforms/upworkComplianceCheck": typeof platforms_upworkComplianceCheck;
  "policies/clientPolicies": typeof policies_clientPolicies;
  "premium/crossPlatformVerification": typeof premium_crossPlatformVerification;
  "premium/protectionAdvisor": typeof premium_protectionAdvisor;
  "premium/protectionPlans": typeof premium_protectionPlans;
  "premium/teamValidation": typeof premium_teamValidation;
  "projects/adaptiveEvidenceSystem": typeof projects_adaptiveEvidenceSystem;
  "projects/debugProjects": typeof projects_debugProjects;
  "projects/milestoneAlerts": typeof projects_milestoneAlerts;
  "projects/milestoneProtection": typeof projects_milestoneProtection;
  "projects/milestoneProtectionTest": typeof projects_milestoneProtectionTest;
  "projects/milestoneReports": typeof projects_milestoneReports;
  "projects/milestoneSnapshots": typeof projects_milestoneSnapshots;
  "projects/projectHealthDashboard": typeof projects_projectHealthDashboard;
  "projects/projectProtection": typeof projects_projectProtection;
  "projects/projectProtectionScore": typeof projects_projectProtectionScore;
  "projects/projectProtectionSimple": typeof projects_projectProtectionSimple;
  "projects/riskTimeline": typeof projects_riskTimeline;
  "projects/scopeFormalization": typeof projects_scopeFormalization;
  proposals: typeof proposals;
  "proposals/crud": typeof proposals_crud;
  "protection/protectionValue": typeof protection_protectionValue;
  "protection/protectionValueSimple": typeof protection_protectionValueSimple;
  scope: typeof scope;
  "scope/crud": typeof scope_crud;
  "security/audit": typeof security_audit;
  "security/consent": typeof security_consent;
  "security/crypto": typeof security_crypto;
  "security/ownerAuth": typeof security_ownerAuth;
  "security/rateLimit": typeof security_rateLimit;
  "security/utils": typeof security_utils;
  seed: typeof seed;
  seedNew: typeof seedNew;
  seedProjects: typeof seedProjects;
  seedTeamUsers: typeof seedTeamUsers;
  sharedValidators: typeof sharedValidators;
  "tables/billing": typeof tables_billing;
  "tables/business": typeof tables_business;
  "tables/clients": typeof tables_clients;
  "tables/compliance": typeof tables_compliance;
  "tables/customFields": typeof tables_customFields;
  "tables/evidence": typeof tables_evidence;
  "tables/features": typeof tables_features;
  "tables/goals": typeof tables_goals;
  "tables/manualSends": typeof tables_manualSends;
  "tables/messaging": typeof tables_messaging;
  "tables/notifications": typeof tables_notifications;
  "tables/pipeline": typeof tables_pipeline;
  "tables/platform": typeof tables_platform;
  "tables/projects": typeof tables_projects;
  "tables/proposals": typeof tables_proposals;
  "tables/scope": typeof tables_scope;
  "tables/security": typeof tables_security;
  "tables/tags": typeof tables_tags;
  "tables/teams": typeof tables_teams;
  "tables/tracking": typeof tables_tracking;
  "tables/users": typeof tables_users;
  "tables/work": typeof tables_work;
  "tables/workspaces": typeof tables_workspaces;
  "tags/crud": typeof tags_crud;
  teams: typeof teams;
  "teams/crud": typeof teams_crud;
  "tiers/tierDetection": typeof tiers_tierDetection;
  "tiers/upgradeTracking": typeof tiers_upgradeTracking;
  timeBlocks: typeof timeBlocks;
  "tracking/crud": typeof tracking_crud;
  users: typeof users;
  waitlist: typeof waitlist;
  waitlistHelpers: typeof waitlistHelpers;
  "wcvm/contextScanner": typeof wcvm_contextScanner;
  workSessions: typeof workSessions;
  workspaceFilter: typeof workspaceFilter;
  "workspaces/crud": typeof workspaces_crud;
  "workspaces/invitations": typeof workspaces_invitations;
  "workspaces/members": typeof workspaces_members;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
