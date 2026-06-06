import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "@/lib/safe-convex-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { MessageSquare } from "lucide-react";
import { ChannelList, type Channel } from "@/components/messaging/ChannelList";
import { ChannelHeader } from "@/components/messaging/ChannelHeader";
import { MessageList, type Message } from "@/components/messaging/MessageList";
import { MessageInput } from "@/components/messaging/MessageInput";
import { ThreadPanel, type ThreadReply } from "@/components/messaging/ThreadPanel";
import { MemberList, type Member } from "@/components/messaging/MemberList";

// ── Mock Data (fallback when Convex returns empty) ─────────────────────────────

const CURRENT_USER_ID = "u-me";

const INITIAL_CHANNELS: Channel[] = [
  { id: "ch-1", name: "general", type: "channel", isPrivate: false, unreadCount: 3, members: 12, lastMessage: "Hey team, sprint review at 3pm", lastMessageTime: Date.now() - 600000 },
  { id: "ch-2", name: "project-updates", type: "channel", isPrivate: false, unreadCount: 0, members: 8, lastMessage: "Design mockups uploaded", lastMessageTime: Date.now() - 3600000 },
  { id: "ch-3", name: "client-escalations", type: "channel", isPrivate: true, unreadCount: 1, members: 4, lastMessage: "Urgent: Client X dispute", lastMessageTime: Date.now() - 1800000 },
  { id: "ch-4", name: "evidence-review", type: "channel", isPrivate: false, unreadCount: 5, members: 6, lastMessage: "New screenshots attached", lastMessageTime: Date.now() - 900000 },
  { id: "ch-5", name: "billing", type: "channel", isPrivate: true, unreadCount: 0, members: 3, lastMessage: "Invoice #1042 paid", lastMessageTime: Date.now() - 7200000 },
  { id: "dm-1", name: "Sarah Chen", type: "dm", isPrivate: true, unreadCount: 2, lastMessage: "Can you review the contract?", lastMessageTime: Date.now() - 300000 },
  { id: "dm-2", name: "Alex Rivera", type: "dm", isPrivate: true, unreadCount: 0, lastMessage: "Sounds good!", lastMessageTime: Date.now() - 5400000 },
  { id: "dm-3", name: "Jordan Kim", type: "dm", isPrivate: true, unreadCount: 1, lastMessage: "The deadline is Friday", lastMessageTime: Date.now() - 1200000 },
];

const INITIAL_MESSAGES: Record<string, Message[]> = {
  "ch-1": [
    { id: "m-1", authorId: "u-1", authorName: "Sarah Chen", content: "Good morning team! Quick update on the Acme Corp project — we've collected all the evidence files and the timeline report is ready for review.", timestamp: Date.now() - 7200000, isEdited: false, isPinned: false, reactions: [{ emoji: "👍", count: 3, hasReacted: false }, { emoji: "🎉", count: 1, hasReacted: false }], threadReplyCount: 2, readBy: ["u-1", "u-2", "u-3", "u-me"] },
    { id: "m-2", authorId: "u-2", authorName: "Alex Rivera", content: "Nice work Sarah! I'll take a look at the timeline report this afternoon.", timestamp: Date.now() - 6800000, isEdited: false, isPinned: false, reactions: [{ emoji: "✅", count: 1, hasReacted: true }], threadReplyCount: 0, readBy: ["u-1", "u-2", "u-me"] },
    { id: "m-3", authorId: "u-3", authorName: "Jordan Kim", content: "Hey team, sprint review at 3pm today. Please make sure your status updates are in before the meeting.", timestamp: Date.now() - 600000, isEdited: false, isPinned: true, reactions: [{ emoji: "👀", count: 4, hasReacted: false }], threadReplyCount: 1, readBy: ["u-3"] },
    { id: "m-4", authorId: "u-1", authorName: "Sarah Chen", content: "Also, just a reminder that the client onboarding for TechStart Inc. is tomorrow. @Alex can you prepare the welcome kit?", timestamp: Date.now() - 300000, isEdited: false, isPinned: false, reactions: [], threadReplyCount: 3, readBy: ["u-1"] },
    { id: "m-5", authorId: "u-2", authorName: "Alex Rivera", content: "On it! I'll have everything ready by EOD.", timestamp: Date.now() - 120000, isEdited: true, isPinned: false, reactions: [{ emoji: "🙌", count: 2, hasReacted: false }], threadReplyCount: 0, readBy: ["u-2"] },
  ],
  "ch-2": [
    { id: "m-10", authorId: "u-3", authorName: "Jordan Kim", content: "Design mockups for the new dashboard are uploaded to Figma. Link in the project channel.", timestamp: Date.now() - 3600000, isEdited: false, isPinned: true, reactions: [{ emoji: "🎨", count: 2, hasReacted: false }], threadReplyCount: 1, readBy: ["u-3", "u-me"] },
  ],
  "ch-3": [
    { id: "m-20", authorId: "u-1", authorName: "Sarah Chen", content: "Urgent: Client X has filed a dispute claiming work was not delivered per the contract terms. I've pulled the contract and work evidence — need eyes on this ASAP.", timestamp: Date.now() - 1800000, isEdited: false, isPinned: false, reactions: [{ emoji: "⚠️", count: 3, hasReacted: true }], threadReplyCount: 4, readBy: ["u-1"] },
  ],
  "ch-4": [
    { id: "m-30", authorId: "u-2", authorName: "Alex Rivera", content: "New screenshots attached for the Upwork project. The client changed requirements mid-sprint but we have documented everything.", timestamp: Date.now() - 900000, isEdited: false, isPinned: false, reactions: [{ emoji: "📸", count: 1, hasReacted: false }], threadReplyCount: 2, readBy: ["u-2"] },
  ],
  "ch-5": [
    { id: "m-40", authorId: "u-3", authorName: "Jordan Kim", content: "Invoice #1042 paid by Acme Corp. Marking as received.", timestamp: Date.now() - 7200000, isEdited: false, isPinned: false, reactions: [{ emoji: "💰", count: 2, hasReacted: false }], threadReplyCount: 0, readBy: ["u-3", "u-me"] },
  ],
  "dm-1": [
    { id: "m-50", authorId: "u-1", authorName: "Sarah Chen", content: "Hey! Can you review the contract for the new client? There are a few clauses I'm not sure about.", timestamp: Date.now() - 600000, isEdited: false, isPinned: false, reactions: [], threadReplyCount: 0, readBy: ["u-1"] },
    { id: "m-51", authorId: "u-me", authorName: "You", content: "Sure, send it over and I'll take a look this afternoon.", timestamp: Date.now() - 300000, isEdited: false, isPinned: false, reactions: [{ emoji: "👍", count: 1, hasReacted: false }], threadReplyCount: 0, readBy: ["u-me", "u-1"] },
  ],
  "dm-2": [
    { id: "m-60", authorId: "u-2", authorName: "Alex Rivera", content: "The evidence package is ready. Should I share it with the client?", timestamp: Date.now() - 5400000, isEdited: false, isPinned: false, reactions: [], threadReplyCount: 0, readBy: ["u-2", "u-me"] },
    { id: "m-61", authorId: "u-me", authorName: "You", content: "Sounds good! Go ahead and share it.", timestamp: Date.now() - 5300000, isEdited: false, isPinned: false, reactions: [], threadReplyCount: 0, readBy: ["u-me", "u-2"] },
  ],
  "dm-3": [
    { id: "m-70", authorId: "u-3", authorName: "Jordan Kim", content: "The deadline for the evidence submission is Friday. Make sure everything is uploaded by Thursday EOD.", timestamp: Date.now() - 1200000, isEdited: false, isPinned: false, reactions: [], threadReplyCount: 0, readBy: ["u-3"] },
  ],
};

const MOCK_MEMBERS: Member[] = [
  { id: "u-1", name: "Sarah Chen", role: "admin", isOnline: true },
  { id: "u-2", name: "Alex Rivera", role: "member", isOnline: true },
  { id: "u-3", name: "Jordan Kim", role: "member", isOnline: true },
  { id: "u-4", name: "Morgan Lee", role: "member", isOnline: false },
  { id: "u-5", name: "Casey Brooks", role: "viewer", isOnline: false },
  { id: "u-me", name: "You", role: "admin", isOnline: true },
];

const INITIAL_THREAD_REPLIES: Record<string, ThreadReply[]> = {
  "m-1": [
    { id: "tr-1", authorId: "u-2", authorName: "Alex Rivera", content: "Great work on pulling everything together!", timestamp: Date.now() - 7000000 },
    { id: "tr-2", authorId: "u-3", authorName: "Jordan Kim", content: "I'll add the billing records to the evidence package.", timestamp: Date.now() - 6900000 },
  ],
  "m-3": [
    { id: "tr-3", authorId: "u-2", authorName: "Alex Rivera", content: "Will do, updating my tasks now.", timestamp: Date.now() - 500000 },
  ],
  "m-4": [
    { id: "tr-4", authorId: "u-2", authorName: "Alex Rivera", content: "Working on the welcome kit now!", timestamp: Date.now() - 250000 },
    { id: "tr-5", authorId: "u-3", authorName: "Jordan Kim", content: "I can help with the onboarding docs.", timestamp: Date.now() - 200000 },
    { id: "tr-6", authorId: "u-1", authorName: "Sarah Chen", content: "Thanks both! Let's sync after the sprint review.", timestamp: Date.now() - 150000 },
  ],
};

// ── Component ──────────────────────────────────────────────────────────────────

export default function Messages() {
  // ── Convex Queries & Mutations ──
  const convexChannels = useQuery(api.messaging.channels.listChannels, {}) as any[] | undefined;
  const markChannelReadMutation = useMutation(api.messaging.messages.markChannelRead);
  const createChannelMutation = useMutation(api.messaging.channels.createChannel);
  const sendMessageMutation = useMutation(api.messaging.messages.sendMessage);
  const editMessageMutation = useMutation(api.messaging.messages.editMessage);
  const deleteMessageMutation = useMutation(api.messaging.messages.deleteMessage);
  const toggleReactionMutation = useMutation(api.messaging.messages.toggleReaction);
  const togglePinMutation = useMutation(api.messaging.messages.togglePinMessage);

  // ── Local State (used when Convex has no data or for mock fallback) ──
  const [channels, setChannels] = useState<Channel[]>(INITIAL_CHANNELS);
  const [activeChannelId, setActiveChannelId] = useState<string | null>("ch-1");
  const [messagesMap, setMessagesMap] = useState<Record<string, Message[]>>(INITIAL_MESSAGES);
  const [showMemberList, setShowMemberList] = useState(false);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [threadRepliesMap, setThreadRepliesMap] = useState<Record<string, ThreadReply[]>>(INITIAL_THREAD_REPLIES);

  // ── Determine data source ──
  const isConvexAvailable = convexChannels !== undefined && convexChannels.length > 0;

  // Use Convex channels when available, otherwise use local mock
  const activeChannels = isConvexAvailable
    ? convexChannels.map((ch: any) => ({
        id: ch._id,
        name: ch.name ?? "",
        type: (ch.type ?? "channel") as "channel" | "dm",
        isPrivate: ch.isPrivate ?? false,
        unreadCount: 0,
        lastMessage: ch.lastMessage ?? undefined,
        lastMessageTime: ch.lastMessageAt ?? undefined,
        members: ch.memberCount ?? 0,
      }))
    : channels;

  // ── Convex messages for active channel ──
  const isConvexChannel = isConvexAvailable && activeChannelId && activeChannelId.startsWith("k");
  const convexMessages = useQuery(
    api.messaging.messages.listMessages,
    isConvexChannel ? { channelId: activeChannelId as Id<"channels"> } : "skip"
  ) as any[] | undefined;

  const convexThreadReplies = useQuery(
    api.messaging.messages.getThreadReplies,
    activeThreadId && isConvexChannel ? { parentMessageId: activeThreadId as Id<"messages"> } : "skip"
  ) as any[] | undefined;

  const activeChannel = activeChannels.find((c) => c.id === activeChannelId);

  // Map Convex messages → frontend Message[] when available
  const activeMessages: Message[] = (() => {
    if (isConvexChannel && convexMessages && convexMessages.length > 0) {
      return convexMessages.map((m: any) => ({
        id: m._id,
        authorId: m.authorId ?? "",
        authorName: m.authorName ?? "Unknown",
        content: m.content ?? "",
        timestamp: m._creationTime ?? Date.now(),
        isEdited: m.isEdited ?? false,
        isPinned: m.isPinned ?? false,
        reactions: m.reactions ?? [],
        threadReplyCount: m.threadReplyCount ?? 0,
        readBy: m.readBy ?? [],
      }));
    }
    return activeChannelId ? messagesMap[activeChannelId] || [] : [];
  })();

  const activeThreadParent = activeThreadId
    ? activeMessages.find((m) => m.id === activeThreadId) || null
    : null;

  const activeThreadReplies: ThreadReply[] = (() => {
    if (isConvexChannel && convexThreadReplies && convexThreadReplies.length > 0) {
      return convexThreadReplies.map((r: any) => ({
        id: r._id,
        authorId: r.authorId ?? "",
        authorName: r.authorName ?? "Unknown",
        content: r.content ?? "",
        timestamp: r._creationTime ?? Date.now(),
      }));
    }
    return activeThreadId ? threadRepliesMap[activeThreadId] || [] : [];
  })();

  // Mark messages as read when channel is selected
  const handleChannelSelect = useCallback((channelId: string) => {
    setActiveChannelId(channelId);
    setActiveThreadId(null);

    // Mark as read in Convex
    if (isConvexAvailable && channelId.startsWith("k")) {
      markChannelReadMutation({ channelId: channelId as Id<"channels"> }).catch(() => {});
    }

    // Clear unread count for local state
    setChannels((prev) =>
      prev.map((c) =>
        c.id === channelId ? { ...c, unreadCount: 0 } : c
      )
    );

    // Mark all messages in this channel as read by current user
    setMessagesMap((prev) => {
      const msgs = prev[channelId] || [];
      const updated = msgs.map((m) => {
        if (m.readBy && m.readBy.includes(CURRENT_USER_ID)) return m;
        return { ...m, readBy: [...(m.readBy || []), CURRENT_USER_ID] };
      });
      return { ...prev, [channelId]: updated };
    });
  }, [isConvexAvailable, markChannelReadMutation]);

  // Also mark messages as read on initial load for the default channel
  useEffect(() => {
    if (activeChannelId) {
      setChannels((prev) =>
        prev.map((c) =>
          c.id === activeChannelId ? { ...c, unreadCount: 0 } : c
        )
      );
      setMessagesMap((prev) => {
        const msgs = prev[activeChannelId] || [];
        const updated = msgs.map((m) => {
          if (m.readBy && m.readBy.includes(CURRENT_USER_ID)) return m;
          return { ...m, readBy: [...(m.readBy || []), CURRENT_USER_ID] };
        });
        return { ...prev, [activeChannelId]: updated };
      });
    }
  }, []);

  const handleCreateChannel = useCallback((name: string, isPrivate: boolean) => {
    // Try Convex first
    if (isConvexAvailable) {
      createChannelMutation({
        name,
        isPrivate,
        type: "channel" as const,
      }).catch(() => {});
      return;
    }

    // Fallback to local state
    const newChannel: Channel = {
      id: `ch-${Date.now()}`,
      name: name.toLowerCase().replace(/\s+/g, "-"),
      type: "channel",
      isPrivate,
      unreadCount: 0,
      members: 1,
      lastMessage: undefined,
      lastMessageTime: undefined,
    };
    setChannels((prev) => [...prev, newChannel]);
    setMessagesMap((prev) => ({ ...prev, [newChannel.id]: [] }));
    setActiveChannelId(newChannel.id);
    setActiveThreadId(null);
  }, [isConvexAvailable, createChannelMutation]);

  const handleSendMessage = useCallback(
    (content: string) => {
      if (!activeChannelId) return;

      // Try Convex first
      if (isConvexChannel) {
        sendMessageMutation({
          channelId: activeChannelId as Id<"channels">,
          content,
        }).catch(() => {});
        return;
      }

      // Fallback to local state
      const newMsg: Message = {
        id: `m-${Date.now()}`,
        authorId: CURRENT_USER_ID,
        authorName: "You",
        content,
        timestamp: Date.now(),
        isEdited: false,
        isPinned: false,
        reactions: [],
        threadReplyCount: 0,
        readBy: [CURRENT_USER_ID],
      };
      setMessagesMap((prev) => ({
        ...prev,
        [activeChannelId]: [...(prev[activeChannelId] || []), newMsg],
      }));
      setChannels((prev) =>
        prev.map((c) =>
          c.id === activeChannelId
            ? { ...c, lastMessage: content, lastMessageTime: Date.now() }
            : c
        )
      );
    },
    [activeChannelId, isConvexChannel, sendMessageMutation]
  );

  const handleReact = useCallback(
    (messageId: string, emoji: string) => {
      // Try Convex first
      if (isConvexChannel) {
        toggleReactionMutation({
          messageId: messageId as Id<"messages">,
          emoji,
        }).catch(() => {});
        return;
      }

      if (!activeChannelId) return;
      setMessagesMap((prev) => {
        const msgs = prev[activeChannelId] || [];
        return {
          ...prev,
          [activeChannelId]: msgs.map((m) => {
            if (m.id !== messageId) return m;
            const existing = m.reactions.find((r) => r.emoji === emoji);
            if (existing) {
              return {
                ...m,
                reactions: m.reactions.map((r) =>
                  r.emoji === emoji
                    ? { ...r, count: r.hasReacted ? r.count - 1 : r.count + 1, hasReacted: !r.hasReacted }
                    : r
                ),
              };
            }
            return { ...m, reactions: [...m.reactions, { emoji, count: 1, hasReacted: true }] };
          }),
        };
      });
    },
    [activeChannelId, isConvexChannel, toggleReactionMutation]
  );

  const handlePin = useCallback(
    (messageId: string) => {
      if (isConvexChannel) {
        togglePinMutation({ messageId: messageId as Id<"messages"> }).catch(() => {});
        return;
      }
      if (!activeChannelId) return;
      setMessagesMap((prev) => {
        const msgs = prev[activeChannelId] || [];
        return {
          ...prev,
          [activeChannelId]: msgs.map((m) =>
            m.id === messageId ? { ...m, isPinned: !m.isPinned } : m
          ),
        };
      });
    },
    [activeChannelId, isConvexChannel, togglePinMutation]
  );

  const handleEdit = useCallback(
    (messageId: string, newContent: string) => {
      if (isConvexChannel) {
        editMessageMutation({ messageId: messageId as Id<"messages">, content: newContent }).catch(() => {});
        return;
      }
      if (!activeChannelId) return;
      setMessagesMap((prev) => {
        const msgs = prev[activeChannelId] || [];
        return {
          ...prev,
          [activeChannelId]: msgs.map((m) =>
            m.id === messageId ? { ...m, content: newContent, isEdited: true } : m
          ),
        };
      });
    },
    [activeChannelId, isConvexChannel, editMessageMutation]
  );

  const handleDelete = useCallback(
    (messageId: string) => {
      if (isConvexChannel) {
        deleteMessageMutation({ messageId: messageId as Id<"messages"> }).catch(() => {});
        return;
      }
      if (!activeChannelId) return;
      setMessagesMap((prev) => {
        const msgs = prev[activeChannelId] || [];
        return {
          ...prev,
          [activeChannelId]: msgs.filter((m) => m.id !== messageId),
        };
      });
    },
    [activeChannelId, isConvexChannel, deleteMessageMutation]
  );

  const handleReply = useCallback((messageId: string) => {
    setActiveThreadId(messageId);
  }, []);

  const handleOpenThread = useCallback((messageId: string) => {
    setActiveThreadId(messageId);
  }, []);

  const handleSendThreadReply = useCallback(
    (parentId: string, content: string) => {
      if (isConvexChannel) {
        sendMessageMutation({
          channelId: activeChannelId as Id<"channels">,
          content,
          parentId: parentId as Id<"messages">,
        }).catch(() => {});
        return;
      }

      const newReply: ThreadReply = {
        id: `tr-${Date.now()}`,
        authorId: CURRENT_USER_ID,
        authorName: "You",
        content,
        timestamp: Date.now(),
      };
      setThreadRepliesMap((prev) => ({
        ...prev,
        [parentId]: [...(prev[parentId] || []), newReply],
      }));
      setMessagesMap((prev) => {
        if (!activeChannelId) return prev;
        const msgs = prev[activeChannelId] || [];
        return {
          ...prev,
          [activeChannelId]: msgs.map((m) =>
            m.id === parentId
              ? { ...m, threadReplyCount: m.threadReplyCount + 1 }
              : m
          ),
        };
      });
    },
    [activeChannelId, isConvexChannel, sendMessageMutation]
  );

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-background">
      <ChannelList
        channels={activeChannels}
        activeChannelId={activeChannelId}
        onChannelSelect={handleChannelSelect}
        onCreateChannel={handleCreateChannel}
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
                currentUserId={CURRENT_USER_ID}
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

            {showMemberList && <MemberList members={MOCK_MEMBERS} />}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Select a channel to start messaging</p>
          </div>
        </div>
      )}
    </div>
  );
}
