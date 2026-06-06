/**
 * Convex-backed Messaging Hook for Axia
 *
 * Connects the messaging UI to the Convex backend for channels, messages,
 * reactions, threads, and read receipts. Falls back to mock data when
 * the user is not authenticated or Convex returns no data.
 */

import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";

// ─── Frontend Types (matches UI components) ─────────────────────────────────

export interface Channel {
  id: string;
  name: string;
  type: "channel" | "dm";
  isPrivate: boolean;
  unreadCount: number;
  lastMessage?: string;
  lastMessageTime?: number;
  members?: number;
  avatar?: string;
}

export interface ChatMessage {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  timestamp: number;
  isEdited: boolean;
  isPinned: boolean;
  reactions: { emoji: string; count: number; hasReacted: boolean }[];
  threadReplyCount: number;
  lastThreadReplyTime?: number;
  threadParticipants?: string[];
  readBy?: string[];
}

export interface ChatThreadReply {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  timestamp: number;
}

export interface ChatMember {
  id: string;
  name: string;
  avatar?: string;
  role: "admin" | "member" | "viewer";
  isOnline: boolean;
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useConvexMessages() {
  // Queries
  const channels = useQuery(api.messaging.channels.listChannels, {}) as any[] | undefined;
  const dmChannels = useQuery(api.messaging.dms.listDMChannels, {}) as any[] | undefined;

  // Mutations
  const createChannelMutation = useMutation(api.messaging.channels.createChannel);
  const sendMessageMutation = useMutation(api.messaging.messages.sendMessage);
  const editMessageMutation = useMutation(api.messaging.messages.editMessage);
  const deleteMessageMutation = useMutation(api.messaging.messages.deleteMessage);
  const toggleReactionMutation = useMutation(api.messaging.messages.toggleReaction);
  const togglePinMessageMutation = useMutation(api.messaging.messages.togglePinMessage);
  const markChannelReadMutation = useMutation(api.messaging.messages.markChannelRead);
  const joinChannelMutation = useMutation(api.messaging.channels.joinChannel);
  const leaveChannelMutation = useMutation(api.messaging.channels.leaveChannel);
  const getOrCreateDMMutation = useMutation(api.messaging.dms.getOrCreateDMChannel);

  const isLoading = channels === undefined;

  // Map Convex channels → frontend Channel[]
  const mappedChannels: Channel[] = (() => {
    const allChannels: Channel[] = [];
    if (channels && channels.length > 0) {
      for (const ch of channels) {
        allChannels.push({
          id: ch._id,
          name: ch.name ?? "",
          type: ch.type ?? "channel",
          isPrivate: ch.isPrivate ?? false,
          unreadCount: 0, // computed client-side from lastReadAt
          lastMessage: ch.lastMessage ?? undefined,
          lastMessageTime: ch.lastMessageAt ?? undefined,
          members: ch.memberCount ?? 0,
        });
      }
    }
    if (dmChannels && dmChannels.length > 0) {
      for (const dm of dmChannels) {
        allChannels.push({
          id: dm._id,
          name: dm.otherUserName ?? "DM",
          type: "dm",
          isPrivate: true,
          unreadCount: 0,
          lastMessage: dm.lastMessage ?? undefined,
          lastMessageTime: dm.lastMessageAt ?? undefined,
        });
      }
    }
    return allChannels;
  })();

  const isConvexAvailable = !isLoading && mappedChannels.length > 0;

  return {
    isLoading,
    isConvexAvailable,
    channels: mappedChannels,
    rawChannels: channels ?? [],
    rawDmChannels: dmChannels ?? [],

    // Mutations
    createChannel: async (name: string, isPrivate: boolean, workspaceId?: string) => {
      return await createChannelMutation({
        name,
        isPrivate,
        type: "channel",
        workspaceId: workspaceId as Id<"workspaces"> | undefined,
      });
    },

    sendMessage: async (channelId: string, content: string, parentId?: string) => {
      return await sendMessageMutation({
        channelId: channelId as Id<"channels">,
        content,
        parentId: parentId as Id<"messages"> | undefined,
      });
    },

    editMessage: async (messageId: string, content: string) => {
      return await editMessageMutation({
        messageId: messageId as Id<"messages">,
        content,
      });
    },

    deleteMessage: async (messageId: string) => {
      return await deleteMessageMutation({
        messageId: messageId as Id<"messages">,
      });
    },

    toggleReaction: async (messageId: string, emoji: string) => {
      return await toggleReactionMutation({
        messageId: messageId as Id<"messages">,
        emoji,
      });
    },

    togglePinMessage: async (messageId: string) => {
      return await togglePinMessageMutation({
        messageId: messageId as Id<"messages">,
      });
    },

    markChannelRead: async (channelId: string) => {
      return await markChannelReadMutation({
        channelId: channelId as Id<"channels">,
      });
    },

    joinChannel: async (channelId: string) => {
      return await joinChannelMutation({
        channelId: channelId as Id<"channels">,
      });
    },

    leaveChannel: async (channelId: string) => {
      return await leaveChannelMutation({
        channelId: channelId as Id<"channels">,
      });
    },

    getOrCreateDM: async (otherUserId: string, workspaceId?: string) => {
      return await getOrCreateDMMutation({
        otherUserId: otherUserId as Id<"users">,
        workspaceId: workspaceId as Id<"workspaces"> | undefined,
      });
    },
  };
}
