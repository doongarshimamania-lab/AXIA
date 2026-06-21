/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ai_disputePrediction from "../ai/disputePrediction.js";
import type * as ai_disputePredictionNode from "../ai/disputePredictionNode.js";
import type * as audit_storeConsentAudit from "../audit/storeConsentAudit.js";
import type * as auth from "../auth.js";
import type * as auth_emailOtp from "../auth/emailOtp.js";
import type * as clientAuth from "../clientAuth.js";
import type * as clients_clientAuth from "../clients/clientAuth.js";
import type * as clients_clientDisputeSimulation from "../clients/clientDisputeSimulation.js";
import type * as clients_clientGapPrediction from "../clients/clientGapPrediction.js";
import type * as clients_clientPolicyProfile from "../clients/clientPolicyProfile.js";
import type * as clients_clientProtection from "../clients/clientProtection.js";
import type * as clients_clientProtectionScore from "../clients/clientProtectionScore.js";
import type * as clients_clientProtectionSimple from "../clients/clientProtectionSimple.js";
import type * as clients_clientTrustScore from "../clients/clientTrustScore.js";
import type * as clients_freelancerDirectory from "../clients/freelancerDirectory.js";
import type * as clients_verificationRequests from "../clients/verificationRequests.js";
import type * as complianceAlerts from "../complianceAlerts.js";
import type * as crons from "../crons.js";
import type * as debug from "../debug.js";
import type * as disputeReports from "../disputeReports.js";
import type * as evidence from "../evidence.js";
import type * as evidence_analytics from "../evidence/analytics.js";
import type * as evidence_library from "../evidence/library.js";
import type * as extension from "../extension.js";
import type * as extensionRotate from "../extensionRotate.js";
import type * as http from "../http.js";
import type * as network_premiumNetwork from "../network/premiumNetwork.js";
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
import type * as protection_protectionValue from "../protection/protectionValue.js";
import type * as protection_protectionValueSimple from "../protection/protectionValueSimple.js";
import type * as security_audit from "../security/audit.js";
import type * as security_consent from "../security/consent.js";
import type * as security_crypto from "../security/crypto.js";
import type * as seed from "../seed.js";
import type * as seedProjects from "../seedProjects.js";
import type * as tables_clients from "../tables/clients.js";
import type * as tables_compliance from "../tables/compliance.js";
import type * as tables_evidence from "../tables/evidence.js";
import type * as tables_features from "../tables/features.js";
import type * as tables_platform from "../tables/platform.js";
import type * as tables_projects from "../tables/projects.js";
import type * as tables_security from "../tables/security.js";
import type * as tables_tracking from "../tables/tracking.js";
import type * as tables_users from "../tables/users.js";
import type * as tables_work from "../tables/work.js";
import type * as teams from "../teams.js";
import type * as tiers_tierDetection from "../tiers/tierDetection.js";
import type * as tiers_upgradeTracking from "../tiers/upgradeTracking.js";
import type * as timeBlocks from "../timeBlocks.js";
import type * as users from "../users.js";
import type * as waitlist from "../waitlist.js";
import type * as waitlistHelpers from "../waitlistHelpers.js";
import type * as wcvm_contextScanner from "../wcvm/contextScanner.js";
import type * as workSessions from "../workSessions.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "ai/disputePrediction": typeof ai_disputePrediction;
  "ai/disputePredictionNode": typeof ai_disputePredictionNode;
  "audit/storeConsentAudit": typeof audit_storeConsentAudit;
  auth: typeof auth;
  "auth/emailOtp": typeof auth_emailOtp;
  clientAuth: typeof clientAuth;
  "clients/clientAuth": typeof clients_clientAuth;
  "clients/clientDisputeSimulation": typeof clients_clientDisputeSimulation;
  "clients/clientGapPrediction": typeof clients_clientGapPrediction;
  "clients/clientPolicyProfile": typeof clients_clientPolicyProfile;
  "clients/clientProtection": typeof clients_clientProtection;
  "clients/clientProtectionScore": typeof clients_clientProtectionScore;
  "clients/clientProtectionSimple": typeof clients_clientProtectionSimple;
  "clients/clientTrustScore": typeof clients_clientTrustScore;
  "clients/freelancerDirectory": typeof clients_freelancerDirectory;
  "clients/verificationRequests": typeof clients_verificationRequests;
  complianceAlerts: typeof complianceAlerts;
  crons: typeof crons;
  debug: typeof debug;
  disputeReports: typeof disputeReports;
  evidence: typeof evidence;
  "evidence/analytics": typeof evidence_analytics;
  "evidence/library": typeof evidence_library;
  extension: typeof extension;
  extensionRotate: typeof extensionRotate;
  http: typeof http;
  "network/premiumNetwork": typeof network_premiumNetwork;
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
  "protection/protectionValue": typeof protection_protectionValue;
  "protection/protectionValueSimple": typeof protection_protectionValueSimple;
  "security/audit": typeof security_audit;
  "security/consent": typeof security_consent;
  "security/crypto": typeof security_crypto;
  seed: typeof seed;
  seedProjects: typeof seedProjects;
  "tables/clients": typeof tables_clients;
  "tables/compliance": typeof tables_compliance;
  "tables/evidence": typeof tables_evidence;
  "tables/features": typeof tables_features;
  "tables/platform": typeof tables_platform;
  "tables/projects": typeof tables_projects;
  "tables/security": typeof tables_security;
  "tables/tracking": typeof tables_tracking;
  "tables/users": typeof tables_users;
  "tables/work": typeof tables_work;
  teams: typeof teams;
  "tiers/tierDetection": typeof tiers_tierDetection;
  "tiers/upgradeTracking": typeof tiers_upgradeTracking;
  timeBlocks: typeof timeBlocks;
  users: typeof users;
  waitlist: typeof waitlist;
  waitlistHelpers: typeof waitlistHelpers;
  "wcvm/contextScanner": typeof wcvm_contextScanner;
  workSessions: typeof workSessions;
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
