import { defineTable } from "convex/server";
import { v } from "convex/values";

const roleValidator = v.union(v.literal("admin"), v.literal("user"));

export const users = defineTable({
    name: v.optional(v.string()), // name of the user. do not remove
    image: v.optional(v.string()), // image of the user. do not remove
    email: v.optional(v.string()), // email of the user. do not remove
    emailVerificationTime: v.optional(v.number()), // email verification time. do not remove
    isAnonymous: v.optional(v.boolean()), // is the user anonymous. do not remove

    role: v.optional(roleValidator), // role of the user. do not remove
    
    // TimeStop specific fields
    subscriptionTier: v.optional(v.string()), // "free" | "starter" | "pro" | "expert" | "client"
    tierUpgradedAt: v.optional(v.number()),
    vulnerabilityScore: v.optional(v.number()), // Pattern #7 vulnerability score (0-100)
    lastVulnerabilityCheck: v.optional(v.number()),
    hourlyRate: v.optional(v.number()),
    totalRejectedHours: v.optional(v.number()),
    totalLostIncome: v.optional(v.number()),
    joinedAt: v.optional(v.number()),

    // Add: Profile and protection fields
    professionalBio: v.optional(v.string()),
    protectedHours: v.optional(v.number()),
    protectedValue: v.optional(v.number()),

    // Add: Onboarding fields
    primaryPlatform: v.optional(v.string()),
    yearsExperience: v.optional(v.string()),
    acquisitionSource: v.optional(v.string()),
    acquisitionSourceDetail: v.optional(v.string()),
    onboardingComplete: v.optional(v.boolean()),
    onboardingCompletedAt: v.optional(v.number()),

    // Add: Platform integration fields
    connectedPlatforms: v.optional(v.array(v.string())),
    platformSyncStatus: v.optional(v.any()),
  }).index("email", ["email"]);
