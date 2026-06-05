import { useState, useCallback, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@/lib/safe-convex-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useWorkspaceContext } from "@/hooks/use-workspace";
import { cn } from "@/lib/utils";
import { isValidConvexId } from "@/hooks/use-workspace";

import { ChannelList, type ChannelInfo } from "@/components/messaging/ChannelList";
import { MessageList, type MessageInfo } from "@/components/messaging/MessageList";
import { MessageInput } from "@/components/messaging/MessageInput";
import { ChannelHeader } from "@/components/messaging/ChannelHeader";
import { MemberList, type MemberInfo } from "@/components/messaging/MemberList";
import { ThreadPanel } from "@/components/messaging/ThreadPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { MessageSquare, Hash, Plus, Search } from "lucide-react";

// ─── Mock Data ────────────────────────────────────────────────────────────────
// Used when the workspace ID is not a valid Convex ID (i.e. in demo/local mode)

const NOW = Date.now();
const HOUR = 3600000;
const DAY = 86400000;

const MOCK_CURRENT_USER_ID = "user_owner";

const MOCK_CHANNELS: ChannelInfo[] = [
  {
    _id: "ch_general",
    name: "general",
    type: "general",
    description: "Company-wide announcements and work-based matters",
    isMember: true,
    unreadCount: 3,
    isMuted: false,
    lastMessageAt: NOW - 15 * 60000,
  },
  {
    _id: "ch_projects",
    name: "projects",
    type: "project",
    description: "Project coordination and updates",
    isMember: true,
    unreadCount: 0,
    isMuted: false,
    lastMessageAt: NOW - 2 * HOUR,
  },
  {
    _id: "ch_design",
    name: "design",
    type: "general",
    description: "Design discussions, reviews, and inspiration",
    isMember: true,
    unreadCount: 5,
    isMuted: false,
    lastMessageAt: NOW - 45 * 60000,
  },
  {
    _id: "ch_development",
    name: "development",
    type: "general",
    description: "Engineering discussions and code reviews",
    isMember: true,
    unreadCount: 1,
    isMuted: false,
    lastMessageAt: NOW - 3 * HOUR,
  },
  {
    _id: "ch_client-escalations",
    name: "client-escalations",
    type: "private",
    description: "Private channel for handling client disputes",
    isMember: true,
    unreadCount: 2,
    isMuted: false,
    lastMessageAt: NOW - 30 * 60000,
  },
  {
    _id: "ch_random",
    name: "random",
    type: "general",
    description: "Non-work banter and water cooler conversation",
    isMember: true,
    unreadCount: 12,
    isMuted: true,
    lastMessageAt: NOW - 5 * 60000,
  },
  {
    _id: "ch_dm_priya",
    name: "dm-priya-sharma",
    type: "direct",
    description: "Direct message with Priya Sharma",
    isMember: true,
    unreadCount: 1,
    otherUserName: "Priya Sharma",
    otherUserOnline: true,
    lastMessageAt: NOW - 10 * 60000,
  },
  {
    _id: "ch_dm_sam",
    name: "dm-sam-chen",
    type: "direct",
    description: "Direct message with Sam Chen",
    isMember: true,
    unreadCount: 0,
    otherUserName: "Sam Chen",
    otherUserOnline: true,
    lastMessageAt: NOW - 4 * HOUR,
  },
  {
    _id: "ch_dm_elena",
    name: "dm-elena-volkov",
    type: "direct",
    description: "Direct message with Elena Volkov",
    isMember: true,
    unreadCount: 0,
    otherUserName: "Elena Volkov",
    otherUserOnline: false,
    lastMessageAt: NOW - DAY,
  },
  {
    _id: "ch_dm_jordan",
    name: "dm-jordan-kim",
    type: "direct",
    description: "Direct message with Jordan Kim",
    isMember: true,
    unreadCount: 2,
    otherUserName: "Jordan Kim",
    otherUserOnline: false,
    lastMessageAt: NOW - 2 * HOUR,
  },
];

const MOCK_MESSAGES: Record<string, MessageInfo[]> = {
  ch_general: [
    {
      _id: "msg_g1",
      channelId: "ch_general",
      authorId: "user_owner",
      authorName: "Alex Rivera",
      body: "Good morning team! Just a heads up — the new client protection dashboard went live last night. Please test it out and report any issues here.",
      messageType: "text",
      isEdited: false,
      isPinned: true,
      createdAt: NOW - 4 * HOUR,
      reactions: [
        { emoji: "👍", count: 4, hasUser: false },
        { emoji: "🎉", count: 2, hasUser: true },
      ],
      threadReplyCount: 3,
      lastReplyAt: NOW - 3.5 * HOUR,
    },
    {
      _id: "msg_g2",
      channelId: "ch_general",
      authorId: "user_manager_1",
      authorName: "Priya Sharma",
      body: "Looks great! I've already run through the evidence timeline feature — the real-time sync with Upwork milestones is solid. Only noticed a small UI glitch on the compliance widget when switching workspaces.",
      messageType: "text",
      isEdited: false,
      isPinned: false,
      createdAt: NOW - 3.5 * HOUR,
      reactions: [
        { emoji: "👀", count: 2, hasUser: false },
      ],
      threadReplyCount: 0,
    },
    {
      _id: "msg_g3",
      channelId: "ch_general",
      authorId: "user_member_1",
      authorName: "Sam Chen",
      body: "Found it — the compliance score wasn't refreshing when switching between solo and team workspaces. I'll push a fix this afternoon.",
      messageType: "text",
      isEdited: false,
      isPinned: false,
      createdAt: NOW - 3 * HOUR,
      reactions: [
        { emoji: "✅", count: 3, hasUser: true },
      ],
      threadReplyCount: 1,
      lastReplyAt: NOW - 2.5 * HOUR,
    },
    {
      _id: "msg_g4",
      channelId: "ch_general",
      authorId: "user_owner",
      authorName: "Alex Rivera",
      body: "Also, we have a new client onboarding call at 2pm today with TechFlow Inc. @Priya.Sharma can you prepare the protection audit template? @Jordan.Kim please have the WCVM verification badge demo ready.",
      messageType: "text",
      isEdited: false,
      isPinned: false,
      createdAt: NOW - 2 * HOUR,
      reactions: [
        { emoji: "👍", count: 2, hasUser: false },
      ],
      threadReplyCount: 2,
      lastReplyAt: NOW - 1.5 * HOUR,
    },
    {
      _id: "msg_g5",
      channelId: "ch_general",
      authorId: "user_member_2",
      authorName: "Elena Volkov",
      body: "Quick update on the dispute resolution stats for Q2 — we achieved an 87% success rate across all platforms, up from 83% last quarter. The auto-evidence collection feature is really paying off. Full report is in the reports section.",
      messageType: "text",
      isEdited: true,
      isPinned: false,
      editedAt: NOW - 30 * 60000,
      createdAt: NOW - 1 * HOUR,
      reactions: [
        { emoji: "🔥", count: 5, hasUser: true },
        { emoji: "🎉", count: 3, hasUser: false },
      ],
      threadReplyCount: 4,
      lastReplyAt: NOW - 15 * 60000,
    },
    {
      _id: "msg_g6",
      channelId: "ch_general",
      authorId: "user_manager_2",
      authorName: "Jordan Kim",
      body: "The WCVM demo is ready! I also added the new cross-platform verification flow. Should we do a quick dry run before the call?",
      messageType: "text",
      isEdited: false,
      isPinned: false,
      createdAt: NOW - 45 * 60000,
      reactions: [],
      threadReplyCount: 0,
    },
    {
      _id: "msg_g7",
      channelId: "ch_general",
      authorId: "user_member_3",
      authorName: "Marcus Thompson",
      body: "Hey everyone, I'll be working remotely for the rest of the week. Will still be online during regular hours. Let me know if anything urgent comes up on the Fiverr integration side.",
      messageType: "text",
      isEdited: false,
      isPinned: false,
      createdAt: NOW - 20 * 60000,
      reactions: [
        { emoji: "👋", count: 3, hasUser: false },
      ],
      threadReplyCount: 0,
    },
  ],
  ch_design: [
    {
      _id: "msg_d1",
      channelId: "ch_design",
      authorId: "user_manager_2",
      authorName: "Jordan Kim",
      body: "Here are the new mockups for the client portal. I went with a cleaner approach — less dashboard chrome, more focus on the protection status and evidence timeline. Thoughts?",
      messageType: "text",
      isEdited: false,
      isPinned: false,
      createdAt: NOW - 3 * HOUR,
      reactions: [
        { emoji: "❤️", count: 3, hasUser: false },
      ],
      threadReplyCount: 5,
      lastReplyAt: NOW - 1 * HOUR,
    },
    {
      _id: "msg_d2",
      channelId: "ch_design",
      authorId: "user_member_2",
      authorName: "Elena Volkov",
      body: "Love the direction! The protection score visualization is much more intuitive. One thought — can we add a subtle animation when the score changes? It would make the real-time updates feel more alive.",
      messageType: "text",
      isEdited: false,
      isPinned: false,
      createdAt: NOW - 2 * HOUR,
      reactions: [
        { emoji: "👍", count: 2, hasUser: false },
      ],
      threadReplyCount: 2,
      lastReplyAt: NOW - 1.5 * HOUR,
    },
    {
      _id: "msg_d3",
      channelId: "ch_design",
      authorId: "user_owner",
      authorName: "Alex Rivera",
      body: "This looks fantastic. The minimalist approach aligns with our brand positioning. Let's also make sure the dark mode version maintains the same contrast ratios — accessibility is key for our compliance angle.",
      messageType: "text",
      isEdited: false,
      isPinned: false,
      createdAt: NOW - 1 * HOUR,
      reactions: [
        { emoji: "💯", count: 2, hasUser: true },
      ],
      threadReplyCount: 0,
    },
  ],
  ch_development: [
    {
      _id: "msg_dev1",
      channelId: "ch_development",
      authorId: "user_member_1",
      authorName: "Sam Chen",
      body: "Quick update on the Convex migration — all evidence tables are migrated and indexed. The real-time subscription performance is about 3x better than our previous setup. PR is up for review.",
      messageType: "text",
      isEdited: false,
      isPinned: false,
      createdAt: NOW - 5 * HOUR,
      reactions: [
        { emoji: "🚀", count: 4, hasUser: false },
      ],
      threadReplyCount: 3,
      lastReplyAt: NOW - 3 * HOUR,
    },
    {
      _id: "msg_dev2",
      channelId: "ch_development",
      authorId: "user_member_3",
      authorName: "Marcus Thompson",
      body: "Working on the Fiverr webhook integration. Their API documentation is... interesting 😅 But I've got the basic payment event listener working. Should have a PR by end of day.",
      messageType: "text",
      isEdited: false,
      isPinned: false,
      createdAt: NOW - 2 * HOUR,
      reactions: [
        { emoji: "😂", count: 2, hasUser: false },
        { emoji: "💪", count: 1, hasUser: true },
      ],
      threadReplyCount: 1,
      lastReplyAt: NOW - 1.5 * HOUR,
    },
  ],
  "ch_client-escalations": [
    {
      _id: "msg_ce1",
      channelId: "ch_client-escalations",
      authorId: "user_manager_1",
      authorName: "Priya Sharma",
      body: "Heads up — we have an escalation from the Upwork project with DataSync Corp. Client is disputing 12 hours of API integration work claiming it was out of scope. Our evidence timeline shows clear milestone approvals. Starting the dispute resolution process.",
      messageType: "text",
      isEdited: false,
      isPinned: true,
      createdAt: NOW - 6 * HOUR,
      reactions: [
        { emoji: "👀", count: 3, hasUser: false },
      ],
      threadReplyCount: 4,
      lastReplyAt: NOW - 1 * HOUR,
    },
    {
      _id: "msg_ce2",
      channelId: "ch_client-escalations",
      authorId: "user_owner",
      authorName: "Alex Rivera",
      body: "The auto-collected evidence should be more than sufficient — I can see the milestone approvals in the system. @Priya.Sharma make sure to include the WCVM verification logs. Our dispute success rate on similar cases is 91%.",
      messageType: "text",
      isEdited: false,
      isPinned: false,
      createdAt: NOW - 5 * HOUR,
      reactions: [
        { emoji: "✅", count: 2, hasUser: false },
      ],
      threadReplyCount: 2,
      lastReplyAt: NOW - 3 * HOUR,
    },
  ],
  ch_random: [
    {
      _id: "msg_r1",
      channelId: "ch_random",
      authorId: "user_member_1",
      authorName: "Sam Chen",
      body: "Who wants to do a team lunch tomorrow? There's a new ramen place that opened near the office 🍜",
      messageType: "text",
      isEdited: false,
      isPinned: false,
      createdAt: NOW - DAY,
      reactions: [
        { emoji: "🍜", count: 5, hasUser: true },
        { emoji: "👍", count: 3, hasUser: false },
      ],
      threadReplyCount: 8,
      lastReplyAt: NOW - 3 * HOUR,
    },
    {
      _id: "msg_r2",
      channelId: "ch_random",
      authorId: "user_member_2",
      authorName: "Elena Volkov",
      body: "Did anyone else see that Upwork updated their dispute policy again? They now require timestamped evidence for any claim over $500. This is literally what we built 😄",
      messageType: "text",
      isEdited: false,
      isPinned: false,
      createdAt: NOW - 5 * HOUR,
      reactions: [
        { emoji: "😂", count: 4, hasUser: false },
        { emoji: "🔥", count: 3, hasUser: true },
      ],
      threadReplyCount: 6,
      lastReplyAt: NOW - 2 * HOUR,
    },
  ],
  ch_projects: [
    {
      _id: "msg_p1",
      channelId: "ch_projects",
      authorId: "user_owner",
      authorName: "Alex Rivera",
      body: "Project status update:\n• **TechFlow Inc.** — On track, client review Friday\n• **DataSync Corp** — Escalation in progress (see #client-escalations)\n• **Nova Design** — Phase 2 starts next week\n• **CloudNine API** — Wrapping up, final delivery Thursday",
      messageType: "text",
      isEdited: false,
      isPinned: true,
      createdAt: NOW - 8 * HOUR,
      reactions: [
        { emoji: "📋", count: 2, hasUser: false },
      ],
      threadReplyCount: 1,
      lastReplyAt: NOW - 6 * HOUR,
    },
  ],
  ch_dm_priya: [
    {
      _id: "msg_dm_p1",
      channelId: "ch_dm_priya",
      authorId: "user_manager_1",
      authorName: "Priya Sharma",
      body: "Hey Alex, quick question about the TechFlow onboarding — should we set them up with the standard protection tier or the premium package?",
      messageType: "text",
      isEdited: false,
      isPinned: false,
      createdAt: NOW - 30 * 60000,
      reactions: [],
      threadReplyCount: 0,
    },
    {
      _id: "msg_dm_p2",
      channelId: "ch_dm_priya",
      authorId: "user_owner",
      authorName: "Alex Rivera",
      body: "Let's go with premium — they're a larger client and will benefit from the advanced dispute simulation. Plus it's a good upsell opportunity.",
      messageType: "text",
      isEdited: false,
      isPinned: false,
      createdAt: NOW - 15 * 60000,
      reactions: [
        { emoji: "👍", count: 1, hasUser: true },
      ],
      threadReplyCount: 0,
    },
  ],
  ch_dm_jordan: [
    {
      _id: "msg_dm_j1",
      channelId: "ch_dm_jordan",
      authorId: "user_manager_2",
      authorName: "Jordan Kim",
      body: "The design system update is ready for review. I've also prepared the client portal mockups for the TechFlow call. Want to review before the meeting?",
      messageType: "text",
      isEdited: false,
      isPinned: false,
      createdAt: NOW - 2 * HOUR,
      reactions: [],
      threadReplyCount: 0,
    },
    {
      _id: "msg_dm_j2",
      channelId: "ch_dm_jordan",
      authorId: "user_owner",
      authorName: "Alex Rivera",
      body: "Yes! Let's sync 30 mins before the call. I want to walk through the WCVM verification flow in detail.",
      messageType: "text",
      isEdited: false,
      isPinned: false,
      createdAt: NOW - 1.5 * HOUR,
      reactions: [],
      threadReplyCount: 0,
    },
  ],
};

const MOCK_MEMBERS: MemberInfo[] = [
  { _id: "cm_1", userId: "user_owner", name: "Alex Rivera", role: "admin", isOnline: true, title: "Founder & Creative Director" },
  { _id: "cm_2", userId: "user_manager_1", name: "Priya Sharma", role: "admin", isOnline: true, title: "Operations Manager" },
  { _id: "cm_3", userId: "user_manager_2", name: "Jordan Kim", role: "admin", isOnline: true, title: "Design Lead" },
  { _id: "cm_4", userId: "user_member_1", name: "Sam Chen", role: "member", isOnline: true, title: "Senior Developer" },
  { _id: "cm_5", userId: "user_member_2", name: "Elena Volkov", role: "member", isOnline: true, title: "Data Analyst" },
  { _id: "cm_6", userId: "user_member_3", name: "Marcus Thompson", role: "member", isOnline: false, title: "Integration Engineer" },
];

const MOCK_THREAD_REPLIES: Record<string, MessageInfo[]> = {
  msg_g1: [
    {
      _id: "msg_g1_r1",
      channelId: "ch_general",
      authorId: "user_manager_1",
      authorName: "Priya Sharma",
      body: "Tested on my end — everything looks good! The evidence timeline loads fast.",
      messageType: "text",
      isEdited: false,
      isPinned: false,
      createdAt: NOW - 3.8 * HOUR,
      reactions: [],
      threadReplyCount: 0,
    },
    {
      _id: "msg_g1_r2",
      channelId: "ch_general",
      authorId: "user_member_1",
      authorName: "Sam Chen",
      body: "Found a minor issue with the dark mode toggle on the evidence cards. Will fix.",
      messageType: "text",
      isEdited: false,
      isPinned: false,
      createdAt: NOW - 3.6 * HOUR,
      reactions: [],
      threadReplyCount: 0,
    },
    {
      _id: "msg_g1_r3",
      channelId: "ch_general",
      authorId: "user_owner",
      authorName: "Alex Rivera",
      body: "Thanks for the quick testing everyone! Let's keep this momentum going.",
      messageType: "text",
      isEdited: false,
      isPinned: false,
      createdAt: NOW - 3.5 * HOUR,
      reactions: [],
      threadReplyCount: 0,
    },
  ],
};

// ─── Main Component ──────────────────────────────────────────────────────────

export default function Messages() {
  const { activeWorkspaceId } = useWorkspaceContext();
  const isConvex = isValidConvexId(activeWorkspaceId);

  // ── State ────────────────────────────────────────────────────────
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>("ch_general");
  const [showMembers, setShowMembers] = useState(true);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [threadParentId, setThreadParentId] = useState<string | null>(null);
  const [showNewDMDialog, setShowNewDMDialog] = useState(false);

  // ── Convex Queries (only when workspace is a real Convex ID) ─────
  const convexChannels = useQuery(
    api.messaging.channels.getWorkspaceChannels,
    isConvex && activeWorkspaceId ? { workspaceId: activeWorkspaceId as Id<"workspaces"> } : "skip"
  ) as any[] | undefined;

  const convexMessages = useQuery(
    api.messaging.messages.getChannelMessages,
    isConvex && selectedChannelId ? { channelId: selectedChannelId as Id<"channels"> } : "skip"
  ) as any[] | undefined;

  const convexChannelMembers = useQuery(
    api.messaging.channels.getChannelMembers,
    isConvex && selectedChannelId ? { channelId: selectedChannelId as Id<"channels"> } : "skip"
  ) as any[] | undefined;

  const convexThreadReplies = useQuery(
    api.messaging.messages.getThreadReplies,
    isConvex && threadParentId ? { parentMessageId: threadParentId as Id<"messages"> } : "skip"
  ) as any[] | undefined;

  // ── Convex Mutations ─────────────────────────────────────────────
  const sendMessageMutation = useMutation(api.messaging.messageMutations.sendMessage);
  const createChannelMutation = useMutation(api.messaging.channelMutations.createChannel);
  const toggleReactionMutation = useMutation(api.messaging.messageMutations.toggleReaction);
  const deleteMessageMutation = useMutation(api.messaging.messageMutations.deleteMessage);
  const editMessageMutation = useMutation(api.messaging.messageMutations.editMessage);
  const togglePinMutation = useMutation(api.messaging.messageMutations.togglePinMessage);
  const markReadMutation = useMutation(api.messaging.messageMutations.markChannelRead);
  const getOrCreateDMMutation = useMutation(api.messaging.messageMutations.getOrCreateDMChannel);

  // ── Data Resolution (Convex or Mock) ─────────────────────────────
  const channels: ChannelInfo[] = useMemo(() => {
    if (isConvex && convexChannels && convexChannels.length > 0) {
      return convexChannels.map((c: any) => ({
        _id: c._id,
        name: c.name,
        type: c.type,
        description: c.description,
        icon: c.icon,
        isMember: c.isMember,
        unreadCount: c.unreadCount ?? 0,
        isMuted: c.isMuted,
        lastMessageAt: c.updatedAt,
      }));
    }
    return MOCK_CHANNELS;
  }, [isConvex, convexChannels]);

  const messages: MessageInfo[] = useMemo(() => {
    if (isConvex && convexMessages && convexMessages.length > 0) {
      return convexMessages.map((m: any) => ({
        _id: m._id,
        channelId: m.channelId,
        authorId: m.authorId,
        authorName: m.authorName ?? "Unknown",
        authorImage: m.authorImage,
        body: m.body,
        messageType: m.messageType ?? "text",
        isEdited: m.isEdited ?? false,
        isPinned: m.isPinned ?? false,
        editedAt: m.editedAt,
        createdAt: m._creationTime,
        reactions: m.reactions ?? [],
        threadReplyCount: m.threadReplyCount ?? 0,
        lastReplyAt: m.lastReplyAt,
        attachments: m.attachments,
      }));
    }
    return MOCK_MESSAGES[selectedChannelId ?? "ch_general"] ?? [];
  }, [isConvex, convexMessages, selectedChannelId]);

  const members: MemberInfo[] = useMemo(() => {
    if (isConvex && convexChannelMembers && convexChannelMembers.length > 0) {
      return convexChannelMembers.map((m: any) => ({
        _id: m._id,
        userId: m.userId,
        name: m.name ?? "Unknown",
        image: m.image,
        role: m.role,
        isOnline: false,
        title: m.title,
      }));
    }
    return MOCK_MEMBERS;
  }, [isConvex, convexChannelMembers]);

  const threadReplies: MessageInfo[] = useMemo(() => {
    if (isConvex && convexThreadReplies && convexThreadReplies.length > 0) {
      return convexThreadReplies.map((r: any) => ({
        _id: r._id,
        channelId: r.channelId,
        authorId: r.authorId,
        authorName: r.authorName ?? "Unknown",
        authorImage: r.authorImage,
        body: r.body,
        messageType: r.messageType ?? "text",
        isEdited: r.isEdited ?? false,
        isPinned: false,
        createdAt: r._creationTime,
        reactions: r.reactions ?? [],
        threadReplyCount: 0,
      }));
    }
    return MOCK_THREAD_REPLIES[threadParentId ?? ""] ?? [];
  }, [isConvex, convexThreadReplies, threadParentId]);

  const selectedChannel = useMemo(
    () => channels.find((c) => c._id === selectedChannelId),
    [channels, selectedChannelId]
  );

  const threadParent = useMemo(
    () => messages.find((m) => m._id === threadParentId) ?? null,
    [messages, threadParentId]
  );

  // ── Handlers ─────────────────────────────────────────────────────
  const handleSelectChannel = useCallback(
    (channelId: string) => {
      setSelectedChannelId(channelId);
      setThreadParentId(null);
      // Mark as read via Convex
      if (isConvex) {
        markReadMutation({ channelId: channelId as Id<"channels"> }).catch(() => {});
      }
    },
    [isConvex, markReadMutation]
  );

  const handleSendMessage = useCallback(
    async (body: string) => {
      if (isConvex && selectedChannelId) {
        try {
          await sendMessageMutation({
            channelId: selectedChannelId as Id<"channels">,
            body,
          });
        } catch (err) {
          console.error("Failed to send message:", err);
        }
      }
      // For mock mode, we just don't persist (messages stay as mock data)
    },
    [isConvex, selectedChannelId, sendMessageMutation]
  );

  const handleCreateChannel = useCallback(
    async (name: string, type: "general" | "project" | "private", description?: string) => {
      if (isConvex && activeWorkspaceId) {
        try {
          const channelId = await createChannelMutation({
            workspaceId: activeWorkspaceId as Id<"workspaces">,
            name,
            type,
            description,
          });
          if (channelId) setSelectedChannelId(channelId);
        } catch (err) {
          console.error("Failed to create channel:", err);
        }
      }
    },
    [isConvex, activeWorkspaceId, createChannelMutation]
  );

  const handleReact = useCallback(
    async (messageId: string, emoji: string) => {
      if (isConvex) {
        try {
          await toggleReactionMutation({
            messageId: messageId as Id<"messages">,
            emoji,
          });
        } catch (err) {
          console.error("Failed to toggle reaction:", err);
        }
      }
    },
    [isConvex, toggleReactionMutation]
  );

  const handleDelete = useCallback(
    async (messageId: string) => {
      if (isConvex) {
        try {
          await deleteMessageMutation({ messageId: messageId as Id<"messages"> });
        } catch (err) {
          console.error("Failed to delete message:", err);
        }
      }
    },
    [isConvex, deleteMessageMutation]
  );

  const handleEdit = useCallback(
    async (messageId: string, newBody: string) => {
      if (isConvex) {
        try {
          await editMessageMutation({
            messageId: messageId as Id<"messages">,
            body: newBody,
          });
        } catch (err) {
          console.error("Failed to edit message:", err);
        }
      }
    },
    [isConvex, editMessageMutation]
  );

  const handlePin = useCallback(
    async (messageId: string) => {
      if (isConvex) {
        try {
          await togglePinMutation({ messageId: messageId as Id<"messages"> });
        } catch (err) {
          console.error("Failed to pin message:", err);
        }
      }
    },
    [isConvex, togglePinMutation]
  );

  const handleSendThreadReply = useCallback(
    async (body: string) => {
      if (isConvex && threadParentId && selectedChannelId) {
        try {
          await sendMessageMutation({
            channelId: selectedChannelId as Id<"channels">,
            body,
            parentMessageId: threadParentId as Id<"messages">,
          });
        } catch (err) {
          console.error("Failed to send thread reply:", err);
        }
      }
    },
    [isConvex, threadParentId, selectedChannelId, sendMessageMutation]
  );

  const handleStartDM = useCallback(
    async (userId: string) => {
      if (isConvex && activeWorkspaceId) {
        try {
          const channelId = await getOrCreateDMMutation({
            workspaceId: activeWorkspaceId as Id<"workspaces">,
            otherUserId: userId as Id<"users">,
          });
          if (channelId) {
            setSelectedChannelId(channelId);
            setShowNewDMDialog(false);
          }
        } catch (err) {
          console.error("Failed to create DM:", err);
        }
      }
    },
    [isConvex, activeWorkspaceId, getOrCreateDMMutation]
  );

  // ── Render ───────────────────────────────────────────────────────
  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Channel Sidebar */}
      <ChannelList
        channels={channels}
        selectedChannelId={selectedChannelId}
        onSelectChannel={handleSelectChannel}
        onCreateChannel={handleCreateChannel}
        className="w-64 shrink-0"
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Channel Header */}
        <ChannelHeader
          channelName={selectedChannel?.name ?? "general"}
          channelType={selectedChannel?.type ?? "general"}
          description={selectedChannel?.description}
          memberCount={members.length}
          pinnedCount={messages.filter((m) => m.isPinned).length}
          isMuted={selectedChannel?.isMuted}
          onToggleMembers={() => setShowMembers(!showMembers)}
          onToggleSearch={() => setShowSearch(!showSearch)}
          onTogglePinned={() => {}}
          showMembers={showMembers}
        />

        {/* Search Bar (collapsible) */}
        {showSearch && (
          <div className="px-4 py-2 border-b bg-muted/20">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search messages in this channel..."
                className="pl-9 h-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
            </div>
          </div>
        )}

        {/* Messages + Thread Split */}
        <div className="flex-1 flex min-h-0">
          {/* Messages */}
          <div className="flex-1 flex flex-col min-w-0">
            <MessageList
              messages={
                showSearch && searchQuery
                  ? messages.filter((m) =>
                      m.body.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                  : messages
              }
              currentUserId={MOCK_CURRENT_USER_ID}
              onReact={handleReact}
              onDelete={handleDelete}
              onEdit={handleEdit}
              onOpenThread={setThreadParentId}
              onPin={handlePin}
            />

            <MessageInput
              onSend={handleSendMessage}
              channelName={selectedChannel?.name}
            />
          </div>

          {/* Thread Panel */}
          {threadParentId && threadParent && (
            <ThreadPanel
              parentMessage={threadParent}
              replies={threadReplies}
              currentUserId={MOCK_CURRENT_USER_ID}
              onSendReply={handleSendThreadReply}
              onReact={handleReact}
              onClose={() => setThreadParentId(null)}
            />
          )}
        </div>
      </div>

      {/* Member List */}
      {showMembers && (
        <MemberList
          members={members}
          onMemberClick={(member) => {
            // Could open DM with member
          }}
        />
      )}
    </div>
  );
}
