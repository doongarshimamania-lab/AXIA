import { QueryCtx, MutationCtx } from "../_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export async function getAuthenticatedUser(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("Not authenticated");
  }
  return userId;
}

export async function getChannelMember(
  ctx: QueryCtx | MutationCtx,
  channelId: string,
  userId: string
) {
  // Type assertion needed since Convex ID types are generated
  return await ctx.db
    .query("channelMembers")
    .withIndex("by_channel_user", (q: any) =>
      q.eq("channelId", channelId as any).eq("userId", userId as any)
    )
    .first();
}
