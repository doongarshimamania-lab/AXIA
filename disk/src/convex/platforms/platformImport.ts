"use node";

import { internalAction } from "../_generated/server";
import { v } from "convex/values";

// Import platform data (Node.js action for API calls)
export const importPlatformData = internalAction({
  args: {
    connectionId: v.id("platformConnections"),
  },
  handler: async (ctx, args) => {
    // Mock platform API responses (in production, these would be real API calls)
    const mockData = {
      profile: {
        name: "Platform User",
        email: "user@example.com",
        hourlyRate: 50,
        totalEarnings: 15000,
        joinedDate: "2023-01-01",
      },
      workHistory: [
        {
          clientName: "Acme Corp",
          projectName: "Website Redesign",
          startDate: "2024-01-01",
          endDate: "2024-03-01",
          hoursWorked: 120,
          earnings: 6000,
        },
        {
          clientName: "Tech Startup",
          projectName: "Mobile App Development",
          startDate: "2024-04-01",
          endDate: "2024-06-01",
          hoursWorked: 200,
          earnings: 10000,
        },
      ],
      earnings: {
        totalEarnings: 15000,
        rejectedHours: 5,
        rejectedAmount: 250,
        successRate: 0.97,
      },
      reviews: {
        averageRating: 4.8,
        totalReviews: 12,
        positiveReviews: 11,
        negativeReviews: 1,
      },
    };

    return { success: true, importedDataTypes: ["profile", "workHistory", "earnings", "reviews"], data: mockData };
  },
});