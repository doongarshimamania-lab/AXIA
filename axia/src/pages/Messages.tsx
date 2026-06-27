import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation } from "@/lib/safe-convex-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { MessageSquare, Plus } from "lucide-react";
import { ChannelList, type Channel } from "@/components/messaging/ChannelList";
import { ChannelHeader } from "@/components/messaging/ChannelHeader";
import { MessageList, type Message } from "@/components/messaging/MessageList";
import { MessageInput } from "@/components/messaging/MessageInput";
import { ThreadPanel, type ThreadReply } from "@/components/messaging/ThreadPanel";
import { MemberList, type Member } from "@/components/messaging/MemberList";
import { useWorkspaceContext, isValidConvexId } from "@/hooks/use-workspace";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

// ── Component ──────────────────────────────────────────────────────────────────

export default function Messages() {
  const { activeWorkspaceId, isConvexConnected } = useWorkspaceContext();
  const { user } = useAuth();
  const currentUserId = (user as Record<string, unknown>)?._id as string ?? "";

  // ── Convex API references ──
  // Used via api.messaging.channels.* and api.messaging.messages.* below

  // Only use Convex when workspace is connected with a valid ID
  const canUseConvex = isConvexConnected && isValidConvexId(activeWorkspaceId);

  // ── Convex Queries ──
  const convexChannels = useQuery(
    canUseConvex ? api.messaging.channels.listChannels : "skip",
    canUseConvex ? { workspaceId: activeWorkspaceId as Id<"workspaces"> } : "skip"
  ) as unknown[] | undefined;

  // ── Local State ──
  const [channels] = useState<Channel[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [messagesMap] = useState<Record<string, Message[]>>({});
  const [showMemberList, setShowMemberList] = useState(false);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [threadRepliesMap] = useState<Record<string, ThreadReply[]>>({});

  // ── Determine data source ──
  const isConvexAvailable = convexChannels !== undefined;

  // Use Convex channels when available, otherwise use local state (empty)
  const activeChannels: Channel[] = useMemo(() => {
    if (convexChannels && convexChannels.length > 0) {
      return convexChannels.map((ch: Record<string, unknown>) => ({
        id: ch._id,
        name: ch.name ?? "",
        type: (ch.type ?? "channel") as "channel" | "dm",
        isPrivate: ch.isPrivate ?? false,
        unreadCount: ch.unreadCount ?? 0,
        lastMessage: ch.lastMessage ?? undefined,
        lastMessageTime: ch.lastMessageAt ?? undefined,
        members: ch.memberCount ?? 0,
      }));
    }
    return channels;
  }, [convexChannels, channels]);

  // ── Detect if active channel is a Convex channel ──
  const isConvexChannel = isConvexAvailable && !!activeChannelId && isValidConvexId(activeChannelId);

  // ── Convex messages for active channel ──
  const convexMessages = useQuery(
    isConvexChannel ? api.messaging.messages.listMessages : "skip",
    isConvexChannel ? { channelId: activeChannelId as Id<"channels"> } : "skip"
  ) as Record<string, unknown>[] | undefined;

  // ── Convex thread replies ──
  const convexThreadReplies = useQuery(
    activeThreadId && isConvexChannel ? api.messaging.messages.getThreadReplies : "skip",
    activeThreadId && isConvexChannel ? { parentMessageId: activeThreadId as Id<"messages"> } : "skip"
  ) as Record<string, unknown>[] | undefined;

  // ── Convex channel members ──
  const convexMembers = useQuery(
    isConvexChannel ? api.messaging.channels.getChannelMembers : "skip",
    isConvexChannel ? { channelId: activeChannelId as Id<"channels"> } : "skip"
  ) as Record<string, unknown>[] | undefined;

  // ── Convex Mutations ──
  const markChannelReadMutation = useMutation(api.messaging.messages.markChannelRead);
  const markAllMentionsReadMutation = useMutation(api.messaging.messages.markAllMentionsRead);
  const createChannelMutation = useMutation(api.messaging.channels.createChannel);
  const sendMessageMutation = useMutation(api.messaging.messages.sendMessage);
  const editMessageMutation = useMutation(api.messaging.messages.editMessage);
  const deleteMessageMutation = useMutation(api.messaging.messages.deleteMessage);
  const toggleReactionMutation = useMutation(api.messaging.messages.toggleReaction);
  const togglePinMutation = useMutation(api.messaging.messages.togglePinMessage);

  const activeChannel = activeChannels.find((c) => c.id === activeChannelId);

  // Map Convex messages → frontend Message[] when available
  const activeMessages: Message[] = useMemo(() => {
    if (isConvexChannel && convexMessages && convexMessages.length > 0) {
      return convexMessages
        .filter((m: Record<string, unknown>) => !m.parentId) // Only show top-level messages in main list
        .map((m: Record<string, unknown>) => ({
          id: m._id,
          authorId: m.authorId ?? "",
          authorName: m.authorName ?? "Unknown",
          content: m.content ?? "",
          timestamp: m._creationTime ?? Date.now(),
          isEdited: m.isEdited ?? false,
          isPinned: m.isPinned ?? false,
          parentId: m.parentId ?? undefined,
          reactions: m.reactions ?? [],
          threadReplyCount: m.threadReplyCount ?? 0,
          readBy: m.readBy ?? [],
        }));
    }
    return activeChannelId ? (messagesMap[activeChannelId] || []).filter((m) => !m.parentId) : [];
  }, [isConvexChannel, convexMessages, activeChannelId, messagesMap]);

  const activeThreadParent = activeThreadId
    ? activeMessages.find((m) => m.id === activeThreadId) || null
    : null;

  const activeThreadReplies: ThreadReply[] = useMemo(() => {
    if (isConvexChannel && convexThreadReplies && convexThreadReplies.length > 0) {
      return convexThreadReplies.map((r: Record<string, unknown>) => ({
        id: r._id,
        authorId: r.authorId ?? "",
        authorName: r.authorName ?? "Unknown",
        content: r.content ?? "",
        timestamp: r._creationTime ?? Date.now(),
      }));
    }
    return activeThreadId ? threadRepliesMap[activeThreadId] || [] : [];
  }, [isConvexChannel, convexThreadReplies, activeThreadId, threadRepliesMap]);

  // Map Convex members → Member[] when available
  const activeMembers: Member[] = useMemo(() => {
    if (isConvexChannel && convexMembers && convexMembers.length > 0) {
      return convexMembers.map((m: Record<string, unknown>) => ({
        id: m.userId ?? m._id,
        name: m.name ?? "Unknown",
        role: m.role === "admin" ? "admin" : "member",
        isOnline: m.isOnline ?? false,
      }));
    }
    return [];
  }, [isConvexChannel, convexMembers]);

  // Mark messages as read when channel is selected
  const handleChannelSelect = useCallback((channelId: string) => {
    setActiveChannelId(channelId);
    setActiveThreadId(null);

    // Mark as read in Convex
    if (isValidConvexId(channelId)) {
      markChannelReadMutation({ channelId: channelId as Id<"channels"> }).catch((err: unknown) => {
        console.warn("Failed to mark channel as read:", err);
      });
      // Also clear all unread mention notifications — the user is now viewing them.
      // This prevents stale "X mentioned you" notifications from lingering after
      // the user has clearly seen the messages.
      markAllMentionsReadMutation({}).catch((err: unknown) => {
        console.warn("Failed to clear mention notifications:", err);
      });
    }
  }, [markChannelReadMutation, markAllMentionsReadMutation]);

  const handleCreateChannel = useCallback((name: string, isPrivate: boolean, memberIds?: string[]) => {
    if (!activeWorkspaceId) {
      toast.error("No workspace selected");
      return;
    }
    createChannelMutation({
      name,
      workspaceId: activeWorkspaceId as Id<"workspaces">,
      isPrivate,
      type: "channel" as const,
      memberIds: memberIds && memberIds.length > 0 ? memberIds as Id<"users">[] : undefined,
    }).then((result: unknown) => {
      if (result) {
        setActiveChannelId(result as string);
        setActiveThreadId(null);
      }
    }).catch((err: unknown) => {
      toast.error("Failed to create channel", { description: String(err) });
    });
  }, [activeWorkspaceId, createChannelMutation]);

  const handleSendMessage = useCallback(
    (content: string) => {
      if (!activeChannelId) return;

      sendMessageMutation({
        channelId: activeChannelId as Id<"channels">,
        content,
      }).catch((err: unknown) => {
        toast.error("Failed to send message", { description: String(err) });
      });
    },
    [activeChannelId, sendMessageMutation]
  );

  const handleReact = useCallback(
    (messageId: string, emoji: string) => {
      toggleReactionMutation({
        messageId: messageId as Id<"messages">,
        emoji,
      }).catch((err: unknown) => {
        toast.error("Failed to toggle reaction", { description: String(err) });
      });
    },
    [toggleReactionMutation]
  );

  const handlePin = useCallback(
    (messageId: string) => {
      togglePinMutation({ messageId: messageId as Id<"messages"> }).then(() => {
        toast.success("Pin status updated");
      }).catch((err: unknown) => {
        toast.error("Failed to toggle pin", { description: String(err) });
      });
    },
    [togglePinMutation]
  );

  const handleEdit = useCallback(
    (messageId: string, newContent: string) => {
      editMessageMutation({ messageId: messageId as Id<"messages">, content: newContent }).catch((err: unknown) => {
        toast.error("Failed to edit message", { description: String(err) });
      });
    },
    [editMessageMutation]
  );

  const handleDelete = useCallback(
    (messageId: string) => {
      deleteMessageMutation({ messageId: messageId as Id<"messages"> }).catch((err: unknown) => {
        toast.error("Failed to delete message", { description: String(err) });
      });
    },
    [deleteMessageMutation]
  );

  const handleReply = useCallback((messageId: string) => {
    setActiveThreadId(messageId);
  }, []);

  const handleOpenThread = useCallback((messageId: string) => {
    setActiveThreadId(messageId);
  }, []);

  const handleSendThreadReply = useCallback(
    (parentId: string, content: string) => {
      if (!activeChannelId) return;

      sendMessageMutation({
        channelId: activeChannelId as Id<"channels">,
        content,
        parentId: parentId as Id<"messages">,
      }).catch((err: unknown) => {
        toast.error("Failed to send reply", { description: String(err) });
      });
    },
    [activeChannelId, sendMessageMutation]
  );

  return (
    // ponytail: subtract 56px (h-14) mobile header on mobile only — desktop has no top header.
    // Without this, the bottom of the chat input is hidden behind the mobile header offset.
    <div className="flex h-[calc(100vh-3.5rem)] md:h-[calc(100vh)] bg-background">
      <ChannelList
        channels={activeChannels}
        activeChannelId={activeChannelId}
        onChannelSelect={handleChannelSelect}
        onCreateChannel={handleCreateChannel}
        availableMembers={activeMembers.map((m) => ({
          id: m.id,
          name: m.name,
          role: m.role,
          isOnline: m.isOnline,
        }))}
      />

      {activeChannel ? (
        <div className="flex-1 flex flex-col min-w-0 h-full">
          <ChannelHeader
            channelName={activeChannel.name}
            channelType={activeChannel.type}
            isPrivate={activeChannel.isPrivate}
            memberCount={activeChannel.members || 0}
            pinnedCount={activeMessages.filter((m) => m.isPinned).length}
            showMemberList={showMemberList}
            onToggleMemberList={() => setShowMemberList(!showMemberList)}
          />

          <div className="flex-1 flex min-h-0 overflow-hidden">
            <div className="flex-1 flex flex-col min-w-0 min-h-0">
              <MessageList
                messages={activeMessages}
                currentUserId={currentUserId}
                onReact={handleReact}
                onReply={handleReply}
                onPin={handlePin}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onOpenThread={handleOpenThread}
              />
              <MessageInput
                onSend={handleSendMessage}
                channelName={activeChannel.name}
                members={activeMembers.map((m) => ({ id: m.id, name: m.name }))}
              />
            </div>

            {activeThreadId && (
              <ThreadPanel
                parentMessage={activeThreadParent}
                replies={activeThreadReplies}
                onClose={() => setActiveThreadId(null)}
                onSendReply={handleSendThreadReply}
              />
            )}

            {showMemberList && <MemberList members={activeMembers} />}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          {activeChannels.length === 0 && canUseConvex ? (
            <div className="text-center">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium mb-1">No channels yet</p>
              <p className="text-xs text-muted-foreground mb-4">Create your first channel to start messaging</p>
              <button
                onClick={() => {
                  const name = prompt("Channel name:");
                  if (name?.trim()) handleCreateChannel(name.trim(), false);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Create your first channel
              </button>
            </div>
          ) : (
            <div className="text-center">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Select a channel to start messaging</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
