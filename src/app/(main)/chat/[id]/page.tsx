"use client";
import { useEffect, useState, useCallback, useRef, useMemo, Fragment } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  setMessages,
  prependMessages,
  appendMessage,
  updateMessage,
  deleteMessage,
  mergeMessageReaction,
  removeMessageReaction,
  markMessagesRead,
  setActiveConversation,
  resetUnreadCount,
  setConversationBlocked,
  setConversationUnblocked,
  updateConversationState,
} from "@/store/slices/chat-slice";
import {
  getMessages,
  getConversation,
  blockChatUser,
  unblockChatUser,
  getMessageReactions,
  searchMessages,
} from "@/services/chat";
import { getPresignedUploadUrls, uploadToPresignedUrl } from "@/services/upload";
import { searchGiphy, type GiphyItem } from "@/services/giphy";
import { getMomentById, getMomentThumbnail } from "@/services/moment";
import type { MomentDto } from "@/types/moment";
import { MessageBubble } from "@/components/chat/message-bubble";
import { GroupSettingsDialog } from "@/components/chat/group-settings-dialog";
import { V2UserDetailDialog } from "@/components/v2/dialogs/v2-user-detail-dialog";
import { V2MomentViewer } from "@/components/v2/pages/v2-moment-viewer";
import { LoadingVideo } from "@/components/common/loading-video";
import { appHub } from "@/lib/signalr/app-hub";
import { useAuth } from "@/providers/auth-provider";
import { useCall } from "@/providers/call-provider";
import {
  ArrowLeft,
  Send,
  Ban,
  ShieldOff,
  X,
  Smile,
  Loader2,
  Phone,
  Film,
  ImagePlus,
  Reply,
  Pencil,
  Trash2,
  Copy,
  Link2,
  Search,
  ChevronDown,
  BellOff,
  Users,
  Info,
} from "lucide-react";
import EmojiPicker from "emoji-picker-react";
import { toast } from "sonner";
import type { MessageDto, ImageDto, MessageReactionUserDto } from "@/types/chat";
import { MessageType, toChatMessageRenderType, getMessagePreview } from "@/types/chat";
import { getMomentById as fetchMomentFull } from "@/services/moment";
import type { MomentDto as FullMomentDto } from "@/types/moment";

interface PendingFile {
  id: string;
  file: File;
  preview: string;
  isVideo: boolean;
  fileId?: string;
  key?: string;
  uploading: boolean;
}

const resolveContentType = (file: File): string => {
  if (file.type) return file.type;
  if (/\.(jpe?g|png|gif|webp|bmp|avif)$/i.test(file.name)) return "image/jpeg";
  if (/\.(mp4|webm|mov|m4v|avi)$/i.test(file.name)) return "video/mp4";
  return "application/octet-stream";
};

const extractFileKey = (data: unknown): string | undefined => {
  if (typeof data === "string") return data;
  if (!data || typeof data !== "object") return undefined;
  const obj = data as Record<string, unknown>;
  return (
    (typeof obj.originalKey === "string" ? obj.originalKey : undefined) ??
    (typeof obj.key === "string" ? obj.key : undefined) ??
    (typeof obj.fileId === "string" ? obj.fileId : undefined) ??
    undefined
  );
};

const normalizeKeyToken = (key: string | undefined): string => {
  if (!key) return "";
  const idx = key.lastIndexOf("/");
  return idx > 0 ? key.slice(0, idx) : key;
};

const URL_RE = /https?:\/\/[^\s]+/g;
const PHONE_RE = /(\+?\d{1,4}[\s.-]?)?(\(?\d{2,4}\)?[\s.-]?)?\d{3,4}[\s.-]?\d{3,4}/g;

const extractLinks = (text: string): string[] => Array.from(new Set(text.match(URL_RE) ?? []));

const extractPhones = (text: string): string[] =>
  Array.from(new Set((text.match(PHONE_RE) ?? []).filter((p) => p.replace(/\D/g, "").length >= 7)));

const QUICK_REACTIONS = ["👍", "❤️", "😂", "🔥", "🎉", "😮"];

export default function V2ChatDetailPage() {
  const router = useRouter();
  const params = useParams();
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const { startCall } = useCall();
  const conversationId = Number(params.id);
  const [convName, setConvName] = useState("Chat");
  const [convOnline, setConvOnline] = useState(false);
  const [isGroup, setIsGroup] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockedById, setBlockedById] = useState<number | null>(null);
  const [opponentId, setOpponentId] = useState<number | null>(null);
  const [blocking, setBlocking] = useState(false);
  const [showGroupSettings, setShowGroupSettings] = useState(false);
  const searchParams = useSearchParams();
  const momentIdParam = searchParams.get("momentId") ? Number(searchParams.get("momentId")) : null;
  const [pendingMoment, setPendingMoment] = useState<ImageDto | null>(null);
  const [pendingMomentLoading, setPendingMomentLoading] = useState(!!momentIdParam);
  const [viewingUserId, setViewingUserId] = useState<number | null>(null);
  const [viewMoment, setViewMoment] = useState<MomentDto | null>(null);
  const [viewMomentLoading, setViewMomentLoading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGiphyPicker, setShowGiphyPicker] = useState(false);
  const [giphyTab, setGiphyTab] = useState<"gif" | "sticker">("gif");
  const [giphyQuery, setGiphyQuery] = useState("");
  const [giphyResults, setGiphyResults] = useState<GiphyItem[]>([]);
  const [giphyLoading, setGiphyLoading] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [typingUsers, setTypingUsers] = useState<Map<number, string>>(new Map());
  const typingSentRef = useRef(false);
  const typingStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const stickToBottomRef = useRef(true);
  const messages = useAppSelector((s) => s.chat.messages[conversationId] ?? []);
  const hasMore = useAppSelector((s) => s.chat.messageHasMore[conversationId] ?? false);
  const editedMessageIds = useAppSelector((s) => s.chat.editedMessageIds);
  const currentConv = useAppSelector((s) =>
    s.chat.conversations.find((c) => c.id === conversationId),
  );
  const [actionMessage, setActionMessage] = useState<MessageDto | null>(null);
  const [actionPos, setActionPos] = useState({ x: 0, y: 0 });
  const [replyTo, setReplyTo] = useState<MessageDto | null>(null);
  const [editingMessage, setEditingMessage] = useState<MessageDto | null>(null);
  const [reactionMessage, setReactionMessage] = useState<MessageDto | null>(null);
  const [reactionUsers, setReactionUsers] = useState<MessageReactionUserDto[]>([]);
  const [reactionHasMore, setReactionHasMore] = useState(false);
  const [reactionPrevId, setReactionPrevId] = useState<number | null>(null);
  const [reactionsLoading, setReactionsLoading] = useState(false);
  const [highlightedMsgId, setHighlightedMsgId] = useState<number | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchMode, setSearchMode] = useState(false);
  const prevIdRef = useRef<number | null>(null);
  const markedFileKeysRef = useRef<Set<string>>(new Set());
  const fileWaitersRef = useRef<
    Array<{ keys: string[]; resolve: () => void; timer: ReturnType<typeof setTimeout> }>
  >([]);

  const resolveFileWaiters = useCallback(() => {
    fileWaitersRef.current = fileWaitersRef.current.filter((waiter) => {
      const remaining = waiter.keys.filter((key) => !markedFileKeysRef.current.has(key));
      if (remaining.length === 0) {
        clearTimeout(waiter.timer);
        waiter.resolve();
        return false;
      }
      waiter.keys = remaining;
      return true;
    });
  }, []);

  // ===== v2 chrome: hide header + nav button while on this page =====
  useEffect(() => {
    window.dispatchEvent(new Event("v2:close-modals"));
    window.dispatchEvent(new Event("v2:sheet-open"));
    window.dispatchEvent(new Event("v2:compose-open"));
    return () => {
      window.dispatchEvent(new Event("v2:sheet-close"));
      window.dispatchEvent(new Event("v2:compose-close"));
    };
  }, []);

  useEffect(() => {
    const unsub = appHub.onReceiveFileMarkedSuccess((data) => {
      const fileKey = normalizeKeyToken(extractFileKey(data));
      if (!fileKey) return;
      markedFileKeysRef.current.add(fileKey);
      setPendingFiles((prev) =>
        prev.map((p) => (p.key === fileKey ? { ...p, uploading: false } : p)),
      );
      resolveFileWaiters();
    });
    return unsub;
  }, [resolveFileWaiters]);

  const fetchMessages = useCallback(
    async (prevId: number | null = null) => {
      const container = messagesContainerRef.current;
      const prevScrollHeight = prevId !== null && container ? container.scrollHeight : 0;
      try {
        const res = await getMessages(conversationId, prevId, 20);
        if (prevId === null) {
          setSearchMode(false);
          dispatch(
            setMessages({ conversationId, messages: res.data.reverse(), hasMore: res.hasMore }),
          );
        } else {
          dispatch(
            prependMessages({ conversationId, messages: res.data.reverse(), hasMore: res.hasMore }),
          );
          requestAnimationFrame(() => {
            const el = messagesContainerRef.current;
            if (el && prevScrollHeight > 0) {
              el.scrollTop = el.scrollHeight - prevScrollHeight;
            }
          });
        }
        prevIdRef.current = res.prevId;
      } catch (err) {
        console.error("Failed to fetch messages", err);
      }
    },
    [conversationId, dispatch],
  );

  useEffect(() => {
    if (momentIdParam) {
      getMomentById(momentIdParam)
        .then((res) => {
          if (res.success && res.data) {
            setPendingMoment(getMomentThumbnail(res.data));
          }
        })
        .catch(() => {})
        .finally(() => setPendingMomentLoading(false));
    }
  }, [momentIdParam]);

  useEffect(() => {
    dispatch(setActiveConversation(conversationId));
    dispatch(resetUnreadCount(conversationId));
    setLoading(true);
    Promise.all([
      getConversation(conversationId)
        .then((res) => {
          if (res.data) {
            setConvName(res.data.name);
            setConvOnline(res.data.isOnline);
            setIsGroup(!res.data.isDirect);
            setIsBlocked(res.data.isBlocked);
            setBlockedById(res.data.blockedById);
            dispatch(updateConversationState({ conversationId, patch: res.data }));
          }
        })
        .catch(() => {}),
      fetchMessages(),
    ])
      .then(() => appHub.joinConversation(conversationId))
      .then(() => dispatch(resetUnreadCount(conversationId)))
      .catch((err) => {
        if (err) console.error(err);
      })
      .finally(() => setLoading(false));
    return () => {
      if (typingSentRef.current) {
        typingSentRef.current = false;
        appHub.sendTyping(conversationId, false).catch(() => {});
      }
      if (typingStopTimerRef.current) clearTimeout(typingStopTimerRef.current);
      dispatch(setActiveConversation(null));
      appHub.leaveConversation(conversationId).catch(console.error);
    };
  }, [conversationId, dispatch, fetchMessages]);

  useEffect(() => {
    const unsub = appHub.onReceiveTyping((data) => {
      if (data.conversationId !== conversationId) return;
      setTypingUsers((prev) => {
        const next = new Map(prev);
        if (data.isTyping) {
          next.set(data.userId, data.userName);
        } else {
          next.delete(data.userId);
        }
        return next;
      });
    });
    return unsub;
  }, [conversationId]);

  useEffect(() => {
    const cb = (message: MessageDto) => {
      if (message.conversationId === conversationId) {
        dispatch(appendMessage({ conversationId, message }));
      }
    };
    return appHub.onReceiveMessage(cb);
  }, [conversationId, dispatch]);

  useEffect(() => {
    const unsubEdited = appHub.onReceiveMessageEdited((message) => {
      if (message.conversationId !== conversationId) return;
      dispatch(updateMessage({ conversationId, message }));
    });
    const unsubDeleted = appHub.onReceiveMessageDeleted((messageId) => {
      dispatch(deleteMessage({ conversationId, messageId }));
    });
    const unsubReacted = appHub.onReceiveMessageReacted((data) => {
      if (data.conversationId !== conversationId) return;
      dispatch(
        mergeMessageReaction({
          conversationId: data.conversationId,
          messageId: data.messageId,
          userId: data.userId,
          emoji: data.emoji,
        }),
      );
    });
    const unsubReactedRemoved = appHub.onReceiveMessageReactedRemoved((data) => {
      if (data.conversationId !== conversationId) return;
      dispatch(
        removeMessageReaction({
          conversationId: data.conversationId,
          messageId: data.messageId,
          userId: data.userId,
          emoji: data.emoji,
        }),
      );
    });
    const unsubMessagesRead = appHub.onReceiveMessagesRead((data) => {
      if (data.conversationId !== conversationId) return;
      if (!user || data.readerUserId === user.id) return;
      dispatch(
        markMessagesRead({
          conversationId: data.conversationId,
          messageIds: data.messageIds,
          myUserId: user.id,
        }),
      );
    });
    return () => {
      unsubEdited();
      unsubDeleted();
      unsubReacted();
      unsubReactedRemoved();
      unsubMessagesRead();
    };
  }, [conversationId, dispatch, user]);

  useEffect(() => {
    if (!user || messages.length === 0) return;
    const otherMsg = messages.find((m) => m.senderId !== user.id);
    if (otherMsg) setOpponentId(otherMsg.senderId);
  }, [messages, user]);

  const opponentAvatar = useMemo(() => {
    if (!opponentId) return null;
    return messages.find((m) => m.senderId === opponentId)?.senderAvatar ?? null;
  }, [messages, opponentId]);

  useEffect(() => {
    const unsubBlocked = appHub.onReceiveChatBlocked((data) => {
      if (data.targetUserId === user?.id) {
        setIsBlocked(true);
        if (opponentId) setBlockedById(opponentId);
        dispatch(setConversationBlocked({ conversationId, blockedById: opponentId ?? 0 }));
      }
    });
    const unsubUnblocked = appHub.onReceiveChatUnblocked((data) => {
      if (data.targetUserId === user?.id) {
        setIsBlocked(false);
      setBlockedById(null);
        dispatch(setConversationUnblocked(conversationId));
      }
    });
    return () => {
      unsubBlocked();
      unsubUnblocked();
    };
  }, [conversationId, user, opponentId, dispatch]);

  useEffect(() => {
    const unsubRemoved = appHub.onReceiveMemberRemoved((data) => {
      if (data.conversationId === conversationId) {
        router.replace("/chat");
      }
    });
    const unsubLeft = appHub.onReceiveMemberLeft((data) => {
      if (data.conversationId === conversationId) {
        router.replace("/chat");
      }
    });
    const unsubGroupDeleted = appHub.onReceiveGroupDeleted((data) => {
      if (data.conversationId === conversationId) {
        router.replace("/chat");
      }
    });
    return () => {
      unsubRemoved();
      unsubLeft();
      unsubGroupDeleted();
    };
  }, [conversationId, router]);

  useEffect(() => {
    if (!loading) {
      const el = messagesContainerRef.current;
      if (el) el.scrollTo({ top: el.scrollHeight });
    }
  }, [loading]);

  useEffect(() => {
    const el = messagesContainerRef.current;
    if (el && stickToBottomRef.current) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, [messages.length]);

  const handleScroll = useCallback(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    stickToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    if (el.scrollTop <= 0 && hasMore) {
      fetchMessages(prevIdRef.current);
    }
  }, [hasMore, fetchMessages]);

  const waitForFilesMarked = useCallback((fileKeys: string[]): Promise<void> => {
    return new Promise((resolve) => {
      const remaining = fileKeys.filter((key) => !markedFileKeysRef.current.has(key));
      if (remaining.length === 0) {
        resolve();
        return;
      }
      const waiter = {
        keys: remaining,
        resolve,
        timer: setTimeout(() => {
          fileWaitersRef.current = fileWaitersRef.current.filter((w) => w !== waiter);
          resolve();
        }, 30000),
      };
      fileWaitersRef.current.push(waiter);
    });
  }, []);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if ((!text && !pendingMoment && pendingFiles.length === 0) || sending || isBlocked) return;
    if (typingSentRef.current) {
      typingSentRef.current = false;
      appHub.sendTyping(conversationId, false).catch(() => {});
    }
    if (typingStopTimerRef.current) clearTimeout(typingStopTimerRef.current);
    setSending(true);
    setInput("");
    try {
      if (editingMessage) {
        await appHub.editMessage({ conversationId, messageId: editingMessage.id, content: text });
        setEditingMessage(null);
      } else if (pendingFiles.length > 0) {
        const files = pendingFiles;
        setPendingFiles((prev) => prev.map((p) => ({ ...p, uploading: true })));
        const contentTypes = files.map((f) => resolveContentType(f.file));
        const presigned = await getPresignedUploadUrls({
          bucket: "Chat",
          contentTypes,
        });
        await Promise.all(
          presigned.map((item, i) =>
            uploadToPresignedUrl(item.uploadUrl, files[i].file, contentTypes[i]),
          ),
        );
        const fileIds = presigned.map((item) => item.fileId);
        const fileKeys = presigned.map((item) => normalizeKeyToken(item.key));
        setPendingFiles((prev) =>
          prev.map((p, i) => ({
            ...p,
            fileId: fileIds[i],
            key: fileKeys[i],
            uploading: true,
          })),
        );
        await waitForFilesMarked(fileKeys);
        await appHub.sendMessage({
          conversationId,
          content: text || null,
          messageType: MessageType.File,
          replyToId: replyTo?.id ?? null,
          idempotencyKey: crypto.randomUUID(),
          momentId: pendingMoment ? momentIdParam : undefined,
          fileIds,
        });
        setPendingFiles([]);
        files.forEach((f) => URL.revokeObjectURL(f.preview));
      } else {
        await appHub.sendMessage({
          conversationId,
          content: text,
          messageType: 0,
          replyToId: replyTo?.id ?? null,
          idempotencyKey: crypto.randomUUID(),
          momentId: pendingMoment ? momentIdParam : undefined,
        });
      }
      setReplyTo(null);
      setPendingMoment(null);
    } catch (err) {
      console.error("Failed to send message", err);
      setInput(text);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }, [
    input,
    sending,
    conversationId,
    isBlocked,
    pendingMoment,
    pendingFiles,
    momentIdParam,
    waitForFilesMarked,
    editingMessage,
    replyTo,
  ]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && !isBlocked) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const text = e.target.value;
      setInput(text);
      const hasText = text.trim().length > 0;
      if (hasText && !typingSentRef.current && !isBlocked) {
        typingSentRef.current = true;
        appHub.sendTyping(conversationId, true).catch(() => {});
      }
      if (!hasText && typingSentRef.current) {
        typingSentRef.current = false;
        appHub.sendTyping(conversationId, false).catch(() => {});
      }
      if (typingStopTimerRef.current) clearTimeout(typingStopTimerRef.current);
      if (hasText) {
        typingStopTimerRef.current = setTimeout(() => {
          if (typingSentRef.current) {
            typingSentRef.current = false;
            appHub.sendTyping(conversationId, false).catch(() => {});
          }
        }, 1500);
      }
    },
    [conversationId, isBlocked],
  );

  const removePendingFile = useCallback((id: string) => {
    setPendingFiles((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.preview);
      return prev.filter((p) => p.id !== id);
    });
  }, []);

  const handleImageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;
    const images = files.filter((f) => f.type.startsWith("image/"));
    if (images.length === 0) return;
    setPendingFiles((prev) => [
      ...prev.filter((p) => !p.isVideo),
      ...images.map((file) => ({
        id: crypto.randomUUID(),
        file,
        preview: URL.createObjectURL(file),
        isVideo: false,
        uploading: false,
      })),
    ]);
  }, []);

  const handleVideoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !file.type.startsWith("video/")) return;
    setPendingFiles((prev) => {
      prev.filter((p) => p.isVideo).forEach((p) => URL.revokeObjectURL(p.preview));
      const nonVideos = prev.filter((p) => !p.isVideo);
      return [
        ...nonVideos,
        {
          id: crypto.randomUUID(),
          file,
          preview: URL.createObjectURL(file),
          isVideo: true,
          uploading: false,
        },
      ];
    });
  }, []);

  const pendingFilesRef = useRef<PendingFile[]>([]);
  useEffect(() => {
    pendingFilesRef.current = pendingFiles;
  }, [pendingFiles]);
  useEffect(() => {
    return () => {
      pendingFilesRef.current.forEach((p) => URL.revokeObjectURL(p.preview));
    };
  }, []);

  const sendMessageByType = useCallback(
    async (content: string, messageType: number) => {
      if (isBlocked || sending) return;
      setSending(true);
      try {
        await appHub.sendMessage({
          conversationId,
          content,
          messageType,
          replyToId: null,
          idempotencyKey: crypto.randomUUID(),
          momentId: undefined,
        });
      } catch (err) {
        console.error("Failed to send message", err);
      } finally {
        setSending(false);
      }
    },
    [conversationId, isBlocked, sending],
  );

  const handleSendEmoji = useCallback(
    (emoji: string) => {
      setShowEmojiPicker(false);
      sendMessageByType(emoji, MessageType.Emoji);
    },
    [sendMessageByType],
  );

  const handleSendGiphy = useCallback(
    (item: GiphyItem) => {
      setShowGiphyPicker(false);
      sendMessageByType(item.url, giphyTab === "sticker" ? MessageType.Sticker : MessageType.Gif);
    },
    [sendMessageByType, giphyTab],
  );

  const fetchGiphy = useCallback(async (q: string, tab: "gif" | "sticker") => {
    setGiphyLoading(true);
    try {
      setGiphyResults(await searchGiphy(q, tab));
    } catch (err) {
      console.error("Failed to fetch giphy", err);
      setGiphyResults([]);
    } finally {
      setGiphyLoading(false);
    }
  }, []);

  const handleToggleEmojiPicker = useCallback(() => {
    setShowEmojiPicker((v) => !v);
  }, []);

  const handleToggleGiphyPicker = useCallback(() => {
    setShowGiphyPicker((v) => !v);
    if (!showGiphyPicker) fetchGiphy(giphyQuery, giphyTab);
  }, [showGiphyPicker, giphyQuery, giphyTab, fetchGiphy]);

  const handleGiphyTabChange = useCallback(
    (tab: "gif" | "sticker") => {
      setGiphyTab(tab);
      if (showGiphyPicker) fetchGiphy(giphyQuery, tab);
    },
    [showGiphyPicker, giphyQuery, fetchGiphy],
  );

  const handleGiphySearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      fetchGiphy(giphyQuery, giphyTab);
    },
    [giphyQuery, giphyTab, fetchGiphy],
  );

  const handleBlock = useCallback(async () => {
    if (!opponentId || blocking) return;
    setBlocking(true);
    try {
      await blockChatUser(opponentId);
      setIsBlocked(true);
      setBlockedById(user?.id ?? null);
      dispatch(setConversationBlocked({ conversationId, blockedById: user?.id ?? 0 }));
    } catch (err) {
      console.error("Failed to block user", err);
    } finally {
      setBlocking(false);
    }
  }, [opponentId, blocking, user, conversationId, dispatch]);

  const handleUnblock = useCallback(async () => {
    if (!opponentId || blocking) return;
    setBlocking(true);
    try {
      await unblockChatUser(opponentId);
      setIsBlocked(false);
      setBlockedById(null);
      dispatch(setConversationUnblocked(conversationId));
    } catch (err) {
      console.error("Failed to unblock user", err);
    } finally {
      setBlocking(false);
    }
  }, [opponentId, blocking, conversationId, dispatch]);

  const handleLongPress = useCallback((msg: MessageDto, pos: { x: number; y: number }) => {
    if (msg.isDeleted) return;
    setActionMessage(msg);
    setActionPos(pos);
  }, []);

  const handleReply = useCallback((msg: MessageDto) => {
    setReplyTo(msg);
    setActionMessage(null);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  const handleEdit = useCallback((msg: MessageDto) => {
    setEditingMessage(msg);
    setInput(msg.content ?? "");
    setActionMessage(null);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  const handleDelete = useCallback(
    (msg: MessageDto) => {
      setActionMessage(null);
      if (replyTo?.id === msg.id) setReplyTo(null);
      if (editingMessage?.id === msg.id) {
        setEditingMessage(null);
        setInput("");
      }
      appHub
        .deleteMessage({ conversationId, messageId: msg.id })
        .catch((err) => console.error("Failed to delete message", err));
    },
    [conversationId, replyTo, editingMessage],
  );

  const copyText = useCallback(async (text: string) => {
    setActionMessage(null);
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error("Failed to copy text", err);
    }
  }, []);

  const handleCopy = useCallback(
    (msg: MessageDto) => {
      copyText(msg.content ?? getMessagePreview(msg));
    },
    [copyText],
  );

  const cancelReplyAndEdit = useCallback(() => {
    setReplyTo(null);
    setEditingMessage(null);
    setInput("");
  }, []);

  const toggleReaction = useCallback(
    async (msg: MessageDto, emoji: string) => {
      if (msg.isDeleted) return;
      const currentUserId = user?.id;
      if (currentUserId === undefined) return;
      const liveMsg = messages.find((m) => m.id === msg.id) ?? msg;
      const hasEmoji = (liveMsg.reactions ?? []).some(
        (r) => r.userId === currentUserId && r.emoji === emoji,
      );
      try {
        if (hasEmoji) {
          await appHub.removeReactMessage({ conversationId, messageId: msg.id, emoji });
          dispatch(
            removeMessageReaction({
              conversationId,
              messageId: msg.id,
              userId: currentUserId,
              emoji,
            }),
          );
        } else {
          await appHub.reactMessage({ conversationId, messageId: msg.id, emoji });
          dispatch(
            mergeMessageReaction({
              conversationId,
              messageId: msg.id,
              userId: currentUserId,
              emoji,
            }),
          );
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Không thể cập nhật phản ứng";
        toast.error(message);
      }
    },
    [conversationId, messages, user?.id, dispatch],
  );

  const handleReact = useCallback(
    (msg: MessageDto, emoji: string) => {
      setActionMessage(null);
      toggleReaction(msg, emoji);
    },
    [toggleReaction],
  );

  const loadReactions = useCallback(async (msg: MessageDto, prevId: number | null = null) => {
    setReactionsLoading(true);
    try {
      const res = await getMessageReactions(msg.conversationId, msg.id, prevId, 20);
      setReactionUsers((prev) => (prevId ? [...prev, ...res.data] : res.data));
      setReactionHasMore(res.hasMore);
      setReactionPrevId(res.prevId);
    } catch (err) {
      console.error("Failed to load reactions", err);
    } finally {
      setReactionsLoading(false);
    }
  }, []);

  const openReactions = useCallback(
    (msg: MessageDto) => {
      setReactionMessage(msg);
      setReactionUsers([]);
      setReactionHasMore(false);
      setReactionPrevId(null);
      loadReactions(msg);
    },
    [loadReactions],
  );

  const scrollToAndHighlight = useCallback((messageId: number): boolean => {
    const el = document.getElementById(`message-${messageId}`);
    if (!el) return false;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightedMsgId(null);
    setHighlightedMsgId(messageId);
    setTimeout(() => {
      setHighlightedMsgId((cur) => (cur === messageId ? null : cur));
    }, 2000);
    return true;
  }, []);

  const applySearchWindow = useCallback(
    (data: MessageDto[], targetId: number) => {
      setSearchMode(true);
      dispatch(setMessages({ conversationId, messages: data, hasMore: true }));
      stickToBottomRef.current = false;
      prevIdRef.current = data.length > 0 ? data[0].id - 1 : null;
      setTimeout(() => scrollToAndHighlight(targetId), 60);
    },
    [conversationId, dispatch, scrollToAndHighlight],
  );

  const onTapReply = useCallback(
    async (messageId: number) => {
      if (messages.some((m) => m.id === messageId)) {
        scrollToAndHighlight(messageId);
        return;
      }
      try {
        const res = await searchMessages(conversationId, { messageId });
        if (res.success && res.data.length) {
          applySearchWindow(res.data, messageId);
        } else {
          toast.error(res.message || "Không tìm thấy tin nhắn");
        }
      } catch {
        toast.error("Không thể tải tin nhắn");
      }
    },
    [messages, conversationId, scrollToAndHighlight, applySearchWindow],
  );

  const handleSearchSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const query = searchQuery.trim();
      if (!query || searching) return;
      setSearching(true);
      try {
        const res = await searchMessages(conversationId, { content: query });
        if (res.success && res.data.length) {
          const target = res.data[Math.floor(res.data.length / 2)] ?? res.data[res.data.length - 1];
          applySearchWindow(res.data, target.id);
        } else {
          toast.error(res.message || "Không tìm thấy tin nhắn");
        }
      } catch {
        toast.error("Không thể tìm kiếm tin nhắn");
      } finally {
        setSearching(false);
      }
    },
    [conversationId, searchQuery, searching, applySearchWindow],
  );

  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    setSearchQuery("");
    fetchMessages(null);
  }, [fetchMessages]);

  const reloadToLatest = useCallback(async () => {
    setSearchOpen(false);
    setSearchQuery("");
    try {
      await fetchMessages(null);
    } finally {
      const el = messagesContainerRef.current;
      if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, [fetchMessages]);

  // Moment share bubble → shared v2 viewer (fetch full moment once)
  const handleViewMoment = useCallback(
    (momentId: number) => {
      if (viewMomentLoading) return;
      setViewMomentLoading(true);
      getMomentById(momentId)
        .then((res) => {
          if (res.success && res.data) setViewMoment(res.data);
        })
        .catch(() => toast.error("Không thể tải khoảnh khắc"))
        .finally(() => setViewMomentLoading(false));
    },
    [viewMomentLoading],
  );

  if (loading) {
    return (
      <div className="vcd2-page">
        <div className="vcd2-loading">
          <LoadingVideo size="md" />
        </div>
      </div>
    );
  }

  const actionContent = actionMessage
    ? actionMessage.isDeleted
      ? ""
      : (actionMessage.content ?? getMessagePreview(actionMessage))
    : "";
  const actionLinks = actionMessage && !actionMessage.isDeleted ? extractLinks(actionContent) : [];
  const actionPhones =
    actionMessage && !actionMessage.isDeleted ? extractPhones(actionContent) : [];
  const actionIsMine = actionMessage?.senderId === user?.id;
  const actionIsText = actionMessage
    ? toChatMessageRenderType(actionMessage.type) === "Text"
    : false;
  const actionLiveMessage = actionMessage
    ? (messages.find((m) => m.id === actionMessage.id) ?? actionMessage)
    : null;
  const myReactionSet = new Set(
    (actionLiveMessage?.reactions ?? []).filter((r) => r.userId === user?.id).map((r) => r.emoji),
  );

  return (
    <div className="vcd2-page">
      <div className="vcd2-header">
        <button onClick={() => router.back()} className="vcd2-icon-btn" aria-label="Quay lại">
          <ArrowLeft className="vcd2-icon" />
        </button>
        {searchOpen ? (
          <form onSubmit={handleSearchSubmit} className="vcd2-search-form">
            <div className="vcd2-search-box">
              <Search className="vcd2-search-icon" />
              <input
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm tin nhắn..."
                className="vcd2-search-input"
              />
            </div>
            {searching && <Loader2 className="vcd2-spin-icon" />}
            <button
              type="button"
              onClick={closeSearch}
              className="vcd2-icon-btn"
              aria-label="Đóng tìm kiếm"
            >
              <X className="vcd2-icon" />
            </button>
          </form>
        ) : (
          <>
            <div className="vcd2-header-info">
              <p className="vcd2-conv-name">
                <span className="vcd2-conv-name-text">{convName}</span>
                {currentConv?.isMuted && <BellOff className="vcd2-mini-icon" />}
              </p>
              <p className={`vcd2-presence ${convOnline ? "online" : ""}`}>
                {convOnline ? "Đang hoạt động" : "Ngoại tuyến"}
              </p>
            </div>
            {!isGroup && opponentId && (
              <button
                onClick={() => setViewingUserId(opponentId)}
                className="vcd2-icon-btn"
                aria-label="Thông tin người dùng"
              >
                <Info className="vcd2-icon" />
              </button>
            )}
            <button
              onClick={() => setSearchOpen(true)}
              className="vcd2-icon-btn"
              aria-label="Tìm kiếm"
            >
              <Search className="vcd2-icon" />
            </button>
            {!isGroup && (
              <button
                onClick={() => opponentId && startCall(opponentId, convName, opponentAvatar)}
                disabled={!opponentId || isBlocked}
                className="vcd2-icon-btn call"
                aria-label="Gọi video"
              >
                <Phone className="vcd2-icon" />
              </button>
            )}
            {!isGroup &&
              (isBlocked ? (
                <button
                  onClick={handleUnblock}
                  disabled={blocking || blockedById !== user?.id}
                  className="vcd2-icon-btn danger"
                  aria-label="Bỏ chặn"
                >
                  <ShieldOff className="vcd2-icon" />
                </button>
              ) : (
                <button
                  onClick={handleBlock}
                  disabled={blocking}
                  className="vcd2-icon-btn danger"
                  aria-label="Chặn người dùng"
                >
                  <Ban className="vcd2-icon" />
                </button>
              ))}
            {isGroup && (
              <button
                onClick={() => setShowGroupSettings(true)}
                className="vcd2-icon-btn"
                aria-label="Thiết lập nhóm"
              >
                <Users className="vcd2-icon" />
              </button>
            )}
          </>
        )}
      </div>

      <div ref={messagesContainerRef} onScroll={handleScroll} className="vcd2-messages">
        {messages.length === 0 && (
          <p className="vcd2-empty">Chưa có tin nhắn. Hãy gửi tin nhắn đầu tiên!</p>
        )}
        {messages.map((msg) => {
          const isMe = msg.senderId === user?.id;
          const isSystem = toChatMessageRenderType(msg.type) === "System";
          return (
            <Fragment key={msg.id}>
              <div
                id={`message-${msg.id}`}
                className={`vcd2-msg-row ${highlightedMsgId === msg.id ? "highlighted" : ""} ${
                  isSystem ? "center" : isMe ? "me" : "them"
                }`}
              >
                {!isMe && !isSystem && (
                  <button
                    onClick={() => setViewingUserId(msg.senderId)}
                    className="vcd2-msg-avatar"
                  >
                    {msg.senderAvatar?.thumbUrl ? (
                      <img
                        src={msg.senderAvatar.thumbUrl}
                        alt=""
                        className="vcd2-msg-avatar-img"
                      />
                    ) : (
                      <span className="vcd2-msg-avatar-letter">
                        {msg.senderName?.charAt(0)?.toUpperCase() ?? "?"}
                      </span>
                    )}
                  </button>
                )}
                <div className="vcd2-bubble-col">
                  {!isMe && !isSystem && (
                    <p className="vcd2-sender-name" onClick={() => setViewingUserId(msg.senderId)}>
                      {msg.senderName}
                    </p>
                  )}
                  <MessageBubble
                    msg={msg}
                    isMe={isMe}
                    currentUserId={user?.id}
                    onViewMoment={handleViewMoment}
                    onLongPress={handleLongPress}
                    onOpenReactions={openReactions}
                    onReplyClick={onTapReply}
                    isEdited={editedMessageIds.includes(msg.id)}
                  />
                </div>
              </div>
            </Fragment>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {searchMode && (
        <button onClick={reloadToLatest} className="vcd2-latest-fab" aria-label="Quay lại tin nhắn mới nhất">
          <ChevronDown className="vcd2-icon" />
        </button>
      )}

      {isBlocked ? (
        <div className="vcd2-blocked-bar">
          {blockedById === user?.id ? (
            <p>Bạn đã chặn người này. Nhấn nút bỏ chặn để gửi tin nhắn.</p>
          ) : (
            <p>Bạn đã bị chặn. Không thể gửi tin nhắn.</p>
          )}
        </div>
      ) : (
        <div className="vcd2-composer-zone">
          {typingUsers.size > 0 && (
            <div className="vcd2-typing">
              <span className="vcd2-typing-dots">
                <span />
                <span />
                <span />
              </span>
              <span>{Array.from(typingUsers.values()).join(", ")} đang nhập...</span>
            </div>
          )}
          {pendingFiles.length > 0 && (
            <div className="vcd2-pending-files">
              {pendingFiles.map((pf) => (
                <div key={pf.id} className="vcd2-pending-file">
                  {pf.isVideo ? (
                    <video src={pf.preview} className="vcd2-pending-media" muted />
                  ) : (
                    <img src={pf.preview} alt="" className="vcd2-pending-media" />
                  )}
                  {pf.uploading && (
                    <div className="vcd2-pending-overlay">
                      <Loader2 className="vcd2-spin-icon white" />
                    </div>
                  )}
                  <button
                    onClick={() => removePendingFile(pf.id)}
                    disabled={sending}
                    className="vcd2-pending-remove"
                    aria-label="Xóa tệp"
                  >
                    <X className="vcd2-pending-remove-icon" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {pendingMomentLoading ? (
            <div className="vcd2-moment-thumb skeleton" />
          ) : pendingMoment ? (
            <div className="vcd2-moment-thumb-wrap">
              <img src={pendingMoment.thumbUrl} alt="" className="vcd2-moment-thumb" />
              <button
                onClick={() => setPendingMoment(null)}
                className="vcd2-pending-remove"
                aria-label="Xóa khoảnh khắc"
              >
                <X className="vcd2-pending-remove-icon" />
              </button>
            </div>
          ) : null}

          {showEmojiPicker && (
            <div className="vcd2-picker-panel">
              <EmojiPicker
                onEmojiClick={(emojiData) => handleSendEmoji(emojiData.emoji)}
                width={300}
                height={320}
              />
            </div>
          )}

          {showGiphyPicker && (
            <div className="vcd2-picker-panel giphy">
              <form onSubmit={handleGiphySearch} className="vcd2-giphy-form">
                <div className="vcd2-giphy-tabs">
                  <button
                    type="button"
                    onClick={() => handleGiphyTabChange("gif")}
                    className={`vcd2-giphy-tab ${giphyTab === "gif" ? "active" : ""}`}
                  >
                    GIF
                  </button>
                  <button
                    type="button"
                    onClick={() => handleGiphyTabChange("sticker")}
                    className={`vcd2-giphy-tab ${giphyTab === "sticker" ? "active" : ""}`}
                  >
                    Sticker
                  </button>
                </div>
                <input
                  value={giphyQuery}
                  onChange={(e) => setGiphyQuery(e.target.value)}
                  placeholder="Tìm kiếm..."
                  className="vcd2-giphy-input"
                />
              </form>
              <div className="vcd2-giphy-grid">
                {giphyLoading ? (
                  <div className="vcd2-giphy-state">
                    <Loader2 className="vcd2-spin-icon" />
                  </div>
                ) : giphyResults.length === 0 ? (
                  <p className="vcd2-giphy-state text">
                    Không tìm thấy {giphyTab === "sticker" ? "sticker" : "GIF"}
                  </p>
                ) : (
                  giphyResults.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleSendGiphy(item)}
                      className="vcd2-giphy-item"
                    >
                      <img src={item.thumbUrl} alt="" loading="lazy" />
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {(replyTo || editingMessage) && (
            <div className="vcd2-reply-bar">
              <div className="vcd2-reply-info">
                {editingMessage ? (
                  <>
                    <p className="vcd2-reply-title">Đang chỉnh sửa tin nhắn</p>
                    <p className="vcd2-reply-preview">
                      {editingMessage.content ?? getMessagePreview(editingMessage)}
                    </p>
                  </>
                ) : replyTo ? (
                  <>
                    <p className="vcd2-reply-title">Trả lời {replyTo.senderName}</p>
                    <p className="vcd2-reply-preview">{getMessagePreview(replyTo)}</p>
                  </>
                ) : null}
              </div>
              <button onClick={cancelReplyAndEdit} className="vcd2-icon-btn" aria-label="Hủy">
                <X className="vcd2-icon sm" />
              </button>
            </div>
          )}

          <div className="vcd2-composer">
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageChange}
              className="vcd2-hidden-input"
            />
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              onChange={handleVideoChange}
              className="vcd2-hidden-input"
            />
            <button
              onClick={() => imageInputRef.current?.click()}
              className="vcd2-attach-btn"
              aria-label="Gửi ảnh"
            >
              <ImagePlus className="vcd2-icon" />
            </button>
            <button
              onClick={() => videoInputRef.current?.click()}
              className="vcd2-attach-btn"
              aria-label="Gửi video"
            >
              <Film className="vcd2-icon" />
            </button>
            <button
              onClick={handleToggleEmojiPicker}
              className="vcd2-attach-btn"
              aria-label="Biểu tượng cảm xúc"
            >
              <Smile className="vcd2-icon" />
            </button>
            <button
              onClick={handleToggleGiphyPicker}
              className="vcd2-attach-btn gif"
              aria-label="GIF & Sticker"
            >
              GIF
            </button>
            <input
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Nhập tin nhắn..."
              className="vcd2-input"
            />
            <button
              onClick={handleSend}
              disabled={(!input.trim() && !pendingMoment && pendingFiles.length === 0) || sending}
              className="vcd2-send-btn"
              aria-label="Gửi"
            >
              <Send className="vcd2-send-icon" />
            </button>
          </div>
        </div>
      )}

      {reactionMessage && (
        <div className="vcd2-sheet-backdrop" onClick={() => setReactionMessage(null)}>
          <div className="vcd2-modal" onClick={(e) => e.stopPropagation()}>
            <div className="vcd2-modal-head">
              <p>Phản ứng</p>
              <button
                onClick={() => setReactionMessage(null)}
                className="vcd2-icon-btn"
                aria-label="Đóng"
              >
                <X className="vcd2-icon sm" />
              </button>
            </div>
            <div className="vcd2-modal-body">
              {reactionsLoading && reactionUsers.length === 0 ? (
                <div className="vcd2-giphy-state">
                  <Loader2 className="vcd2-spin-icon" />
                </div>
              ) : reactionUsers.length === 0 ? (
                <p className="vcd2-empty-text">Chưa có phản ứng</p>
              ) : (
                reactionUsers.map((u) => (
                  <div key={u.userId} className="vcd2-reaction-row">
                    <div className="vcd2-reaction-avatar">
                      {u.userImage?.thumbUrl ? (
                        <img src={u.userImage.thumbUrl} alt="" />
                      ) : (
                        <span>{u.userName?.charAt(0)?.toUpperCase() ?? "?"}</span>
                      )}
                    </div>
                    <p className="vcd2-reaction-name">{u.userName}</p>
                    <div className="vcd2-reaction-emojis">
                      {u.emojis.map((emoji, i) => (
                        <span key={`${emoji}-${i}`}>{emoji}</span>
                      ))}
                    </div>
                  </div>
                ))
              )}
              {reactionHasMore && (
                <div className="vcd2-giphy-state">
                  <button
                    onClick={() =>
                      reactionMessage && loadReactions(reactionMessage, reactionPrevId)
                    }
                    disabled={reactionsLoading}
                    className="vcd2-more-btn"
                  >
                    {reactionsLoading ? "Đang tải..." : "Xem thêm"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {actionMessage && (
        <div className="vcd2-action-layer" onClick={() => setActionMessage(null)}>
          <div
            className="vcd2-action-popup"
            style={{
              left: Math.max(8, Math.min(actionPos.x, window.innerWidth - 218)),
              top: Math.max(8, actionPos.y),
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="vcd2-action-head">
              <p className="vcd2-action-name">{actionMessage.senderName}</p>
              <p className="vcd2-action-preview">
                {actionMessage.isDeleted ? "Tin nhắn đã bị xóa" : actionContent}
              </p>
            </div>
            {!actionMessage.isDeleted && (
              <div className="vcd2-quick-reactions">
                {QUICK_REACTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleReact(actionMessage, emoji)}
                    className={`vcd2-qr-btn ${myReactionSet.has(emoji) ? "mine" : ""}`}
                    aria-label={`Phản ứng ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
            <div className="vcd2-action-list">
              <button onClick={() => handleReply(actionMessage)} className="vcd2-action-item">
                <Reply className="vcd2-action-item-icon" />
                Trả lời
              </button>
              {actionIsMine && actionIsText && (
                <button onClick={() => handleEdit(actionMessage)} className="vcd2-action-item">
                  <Pencil className="vcd2-action-item-icon" />
                  Chỉnh sửa
                </button>
              )}
              {actionIsMine && (
                <button
                  onClick={() => handleDelete(actionMessage)}
                  className="vcd2-action-item danger"
                >
                  <Trash2 className="vcd2-action-item-icon" />
                  Xóa
                </button>
              )}
              {actionLinks.length > 0 && (
                <button
                  onClick={() => copyText(actionLinks.join("\n"))}
                  className="vcd2-action-item"
                >
                  <Link2 className="vcd2-action-item-icon" />
                  Sao chép liên kết
                </button>
              )}
              {actionPhones.length > 0 && (
                <button
                  onClick={() => copyText(actionPhones.join("\n"))}
                  className="vcd2-action-item"
                >
                  <Phone className="vcd2-action-item-icon" />
                  Sao chép số điện thoại
                </button>
              )}
              <button onClick={() => handleCopy(actionMessage)} className="vcd2-action-item">
                <Copy className="vcd2-action-item-icon" />
                Sao chép
              </button>
            </div>
          </div>
        </div>
      )}

      {viewMoment && (
        <V2MomentViewer moment={viewMoment} onClose={() => setViewMoment(null)} />
      )}

      <V2UserDetailDialog userId={viewingUserId} onClose={() => setViewingUserId(null)} />

      <GroupSettingsDialog
        open={showGroupSettings}
        onOpenChange={setShowGroupSettings}
        conversation={currentConv ?? null}
        onNameChanged={(newName) => setConvName(newName)}
        onExitGroup={() => router.replace("/chat")}
      />

      <style jsx global>{`
        .vcd2-page {
          position: relative;
          height: 100%;
          width: 100%;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          /* Neon backdrop like the moments page */
          background:
            radial-gradient(circle at 15% 20%, rgba(43, 176, 175, 0.35), transparent 50%),
            radial-gradient(circle at 85% 85%, rgba(43, 176, 175, 0.28), transparent 50%),
            var(--vm-bg, #f4f4f5);
          color: var(--vm-text, #18181b);
        }

        .vcd2-loading {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .vcd2-header {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          padding-top: calc(8px + env(safe-area-inset-top, 0px));
          border-bottom: 1px solid var(--vm-border, #e4e4e7);
          background: color-mix(in srgb, var(--vm-surface, #fff) 65%, transparent);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
        }

        .vcd2-header-info {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
        }

        .vcd2-conv-name {
          display: flex;
          align-items: center;
          gap: 6px;
          margin: 0;
          font-size: 15px;
          font-weight: 800;
          min-width: 0;
        }

        .vcd2-conv-name-text {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .vcd2-mini-icon {
          width: 13px;
          height: 13px;
          flex-shrink: 0;
          color: var(--vm-text-3, #a1a1aa);
        }

        .vcd2-presence {
          margin: 0;
          font-size: 11px;
          color: var(--vm-text-3, #a1a1aa);
        }

        .vcd2-presence.online {
          color: #22c55e;
        }

        .vcd2-icon-btn {
          width: 34px;
          height: 34px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          border: none;
          background: none;
          border-radius: 50%;
          color: var(--vm-text-2, #52525b);
          cursor: pointer;
          transition: background 0.15s, transform 0.15s;
        }

        .vcd2-icon-btn:active {
          background: rgba(43, 176, 175, 0.12);
          transform: scale(0.92);
        }

        .vcd2-icon-btn.call {
          color: #2bb0af;
        }

        .vcd2-icon-btn.danger {
          color: #ef4444;
        }

        .vcd2-icon-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .vcd2-icon {
          width: 19px;
          height: 19px;
        }

        .vcd2-icon.sm {
          width: 16px;
          height: 16px;
        }

        .vcd2-search-form {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .vcd2-search-box {
          position: relative;
          flex: 1;
        }

        .vcd2-search-icon {
          position: absolute;
          top: 50%;
          left: 12px;
          transform: translateY(-50%);
          width: 15px;
          height: 15px;
          color: var(--vm-text-3, #a1a1aa);
        }

        .vcd2-search-input {
          width: 100%;
          border: 1px solid var(--vm-border, #e4e4e7);
          background: var(--vm-surface, #fff);
          border-radius: 999px;
          padding: 8px 12px 8px 34px;
          font-size: 14px;
          outline: none;
          color: var(--vm-text, #18181b);
        }

        .vcd2-spin-icon {
          width: 16px;
          height: 16px;
          animation: vcd2-rotate 1s linear infinite;
        }

        .vcd2-spin-icon.white {
          color: white;
        }

        @keyframes vcd2-rotate {
          to {
            transform: rotate(360deg);
          }
        }

        .vcd2-messages {
          flex: 1;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          padding: 14px 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .vcd2-empty {
          text-align: center;
          padding: 32px 16px;
          margin: 0;
          font-size: 13px;
          color: var(--vm-text-3, #a1a1aa);
        }

        .vcd2-empty-text {
          text-align: center;
          padding: 24px;
          margin: 0;
          font-size: 13px;
          color: var(--vm-text-3, #a1a1aa);
        }

        .vcd2-msg-row {
          display: flex;
          gap: 8px;
          user-select: none;
          border-radius: 12px;
        }

        .vcd2-msg-row.me {
          justify-content: flex-end;
        }

        .vcd2-msg-row.them {
          justify-content: flex-start;
        }

        .vcd2-msg-row.center {
          justify-content: center;
        }

        .vcd2-msg-row.highlighted {
          outline: 2px solid rgba(43, 176, 175, 0.7);
          background: rgba(43, 176, 175, 0.08);
        }

        .vcd2-msg-avatar {
          align-self: flex-end;
          flex-shrink: 0;
          border: none;
          padding: 0;
          background: none;
          cursor: pointer;
        }

        .vcd2-msg-avatar-img {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          object-fit: cover;
          display: block;
        }

        .vcd2-msg-avatar-letter {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 800;
          background: var(--vm-surface-2, #f4f4f5);
          color: var(--vm-text-2, #52525b);
        }

        .vcd2-bubble-col {
          max-width: 75%;
        }

        .vcd2-sender-name {
          margin: 0 0 2px 4px;
          font-size: 11px;
          font-weight: 600;
          color: var(--vm-text-3, #a1a1aa);
          cursor: pointer;
        }

        .vcd2-latest-fab {
          position: absolute;
          right: 16px;
          bottom: 96px;
          z-index: 30;
          width: 44px;
          height: 44px;
          border: none;
          border-radius: 50%;
          background: linear-gradient(135deg, #2bb0af 0%, #1a8a89 100%);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 6px 20px rgba(43, 176, 175, 0.5);
        }

        .vcd2-blocked-bar {
          padding: 14px;
          text-align: center;
          border-top: 1px solid var(--vm-border, #e4e4e7);
          font-size: 13px;
          color: var(--vm-text-3, #a1a1aa);
        }

        .vcd2-blocked-bar p {
          margin: 0;
        }

        .vcd2-composer-zone {
          position: relative;
          border-top: 1px solid var(--vm-border, #e4e4e7);
          background: color-mix(in srgb, var(--vm-surface, #fff) 75%, transparent);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          padding-bottom: env(safe-area-inset-bottom, 0px);
        }

        .vcd2-typing {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 16px 0;
          font-size: 11px;
          color: var(--vm-text-3, #a1a1aa);
        }

        .vcd2-typing-dots {
          display: flex;
          gap: 3px;
        }

        .vcd2-typing-dots span {
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: currentColor;
          animation: vcd2-bounce 1s infinite;
        }

        .vcd2-typing-dots span:nth-child(2) {
          animation-delay: 0.15s;
        }

        .vcd2-typing-dots span:nth-child(3) {
          animation-delay: 0.3s;
        }

        @keyframes vcd2-bounce {
          0%,
          60%,
          100% {
            transform: translateY(0);
          }
          30% {
            transform: translateY(-4px);
          }
        }

        .vcd2-pending-files {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          padding: 10px 14px 0;
        }

        .vcd2-pending-file {
          position: relative;
          width: 76px;
          height: 76px;
        }

        .vcd2-pending-media {
          width: 100%;
          height: 100%;
          border-radius: 12px;
          object-fit: cover;
          background: #000;
          display: block;
        }

        .vcd2-pending-overlay {
          position: absolute;
          inset: 0;
          border-radius: 12px;
          background: rgba(0, 0, 0, 0.45);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .vcd2-pending-remove {
          position: absolute;
          top: -7px;
          right: -7px;
          width: 22px;
          height: 22px;
          border: none;
          border-radius: 50%;
          background: var(--vm-surface, #fff);
          color: var(--vm-text, #18181b);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
          cursor: pointer;
          padding: 0;
        }

        .vcd2-pending-remove-icon {
          width: 13px;
          height: 13px;
        }

        .vcd2-moment-thumb-wrap {
          position: relative;
          display: inline-block;
          margin: 10px 14px 0;
        }

        .vcd2-moment-thumb {
          width: 76px;
          height: 76px;
          border-radius: 12px;
          object-fit: cover;
          display: block;
        }

        .vcd2-moment-thumb.skeleton {
          margin: 10px 14px 0;
          background: var(--vm-surface-2, #f4f4f5);
          animation: vcd2-pulse 1.4s ease-in-out infinite;
        }

        @keyframes vcd2-pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }

        .vcd2-picker-panel {
          position: absolute;
          bottom: 100%;
          left: 12px;
          z-index: 50;
          margin-bottom: 8px;
          border-radius: 16px;
          overflow: hidden;
          border: 1px solid var(--vm-border, #e4e4e7);
          background: var(--vm-surface, #fff);
          box-shadow: 0 16px 48px rgba(0, 0, 0, 0.3);
        }

        .vcd2-picker-panel.giphy {
          width: min(90vw, 340px);
        }

        .vcd2-giphy-form {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px;
          border-bottom: 1px solid var(--vm-border, #e4e4e7);
        }

        .vcd2-giphy-tabs {
          display: flex;
          gap: 2px;
          background: var(--vm-surface-2, #f4f4f5);
          border-radius: 999px;
          padding: 2px;
          flex-shrink: 0;
        }

        .vcd2-giphy-tab {
          border: none;
          border-radius: 999px;
          padding: 5px 12px;
          font-size: 11px;
          font-weight: 700;
          background: none;
          color: var(--vm-text-3, #a1a1aa);
          cursor: pointer;
        }

        .vcd2-giphy-tab.active {
          background: var(--vm-surface, #fff);
          color: #2bb0af;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
        }

        .vcd2-giphy-input {
          flex: 1;
          min-width: 0;
          border: none;
          background: var(--vm-surface-2, #f4f4f5);
          border-radius: 999px;
          padding: 7px 12px;
          font-size: 13px;
          outline: none;
          color: var(--vm-text, #18181b);
        }

        .vcd2-giphy-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 4px;
          max-height: 256px;
          overflow-y: auto;
          padding: 8px;
        }

        .vcd2-giphy-state {
          grid-column: 1 / -1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }

        .vcd2-giphy-state.text {
          font-size: 12px;
          color: var(--vm-text-3, #a1a1aa);
        }

        .vcd2-giphy-item {
          border: none;
          padding: 0;
          background: none;
          border-radius: 10px;
          overflow: hidden;
          cursor: pointer;
        }

        .vcd2-giphy-item img {
          width: 100%;
          height: 64px;
          object-fit: cover;
          display: block;
        }

        .vcd2-reply-bar {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          border-top: 1px solid var(--vm-border, #e4e4e7);
          background: rgba(43, 176, 175, 0.06);
        }

        .vcd2-reply-info {
          flex: 1;
          min-width: 0;
        }

        .vcd2-reply-title {
          margin: 0;
          font-size: 11px;
          font-weight: 800;
          color: #2bb0af;
        }

        .vcd2-reply-preview {
          margin: 0;
          font-size: 11px;
          color: var(--vm-text-3, #a1a1aa);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .vcd2-composer {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 10px 12px;
        }

        .vcd2-hidden-input {
          display: none;
        }

        .vcd2-attach-btn {
          width: 36px;
          height: 36px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          border: none;
          background: none;
          border-radius: 50%;
          color: var(--vm-text-2, #52525b);
          cursor: pointer;
          font-size: 10px;
          font-weight: 800;
        }

        .vcd2-attach-btn:active {
          background: rgba(43, 176, 175, 0.12);
        }

        .vcd2-input {
          flex: 1;
          min-width: 0;
          border: 1px solid var(--vm-border, #e4e4e7);
          background: var(--vm-surface, #fff);
          border-radius: 999px;
          padding: 9px 16px;
          font-size: 14px;
          outline: none;
          color: var(--vm-text, #18181b);
        }

        .vcd2-send-btn {
          width: 38px;
          height: 38px;
          flex-shrink: 0;
          border: none;
          border-radius: 50%;
          background: linear-gradient(135deg, #2bb0af 0%, #1a8a89 100%);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(43, 176, 175, 0.4);
          transition: transform 0.15s;
        }

        .vcd2-send-btn:active {
          transform: scale(0.9);
        }

        .vcd2-send-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .vcd2-send-icon {
          width: 16px;
          height: 16px;
          margin-left: 1px;
        }

        .vcd2-sheet-backdrop {
          position: fixed;
          inset: 0;
          z-index: 95;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .vcd2-modal {
          width: 100%;
          max-width: 380px;
          background: var(--vm-surface, #fff);
          border: 1px solid var(--vm-border, #e4e4e7);
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 24px 64px rgba(0, 0, 0, 0.35);
        }

        .vcd2-modal-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          border-bottom: 1px solid var(--vm-border, #e4e4e7);
          font-size: 14px;
          font-weight: 800;
        }

        .vcd2-modal-head p {
          margin: 0;
        }

        .vcd2-modal-body {
          max-height: 320px;
          overflow-y: auto;
        }

        .vcd2-reaction-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 16px;
        }

        .vcd2-reaction-avatar {
          width: 36px;
          height: 36px;
          flex-shrink: 0;
          border-radius: 50%;
          overflow: hidden;
          background: var(--tm-surface-2, #f4f4f5);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: 800;
          color: var(--vm-text-2, #52525b);
        }

        .vcd2-reaction-avatar img {
          width: 100%;
        height: 100%;
          object-fit: cover;
        }

        .vcd2-reaction-name {
          flex: 1;
          margin: 0;
          font-size: 13px;
          font-weight: 600;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .vcd2-reaction-emojis {
          display: flex;
          gap: 2px;
          font-size: 17px;
        }

        .vcd2-more-btn {
          border: 1px solid var(--vm-border, #e4e4e7);
          background: var(--vm-surface, #fff);
          color: var(--vm-text-2, #52525b);
          border-radius: 999px;
          padding: 6px 16px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }

        .vcd2-action-layer {
          position: fixed;
          inset: 0;
          z-index: 90;
        }

        .vcd2-action-popup {
          position: absolute;
          width: 210px;
          background: var(--vm-surface, #fff);
          border: 1px solid var(--vm-border, #e4e4e7);
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 20px 56px rgba(0, 0, 0, 0.35);
        }

        .vcd2-action-head {
          padding: 8px 12px;
          border-bottom: 1px solid var(--vm-border, #e4e4e7);
        }

        .vcd2-action-name {
          margin: 0;
          font-size: 12px;
          font-weight: 700;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .vcd2-action-preview {
          margin: 2px 0 0;
          font-size: 11px;
          color: var(--vm-text-3, #a1a1aa);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .vcd2-quick-reactions {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 2px;
          padding: 8px 10px;
          border-bottom: 1px solid var(--vm-border, #e4e4e7);
        }

        .vcd2-qr-btn {
          width: 32px;
          height: 32px;
          border: none;
          background: none;
          border-radius: 50%;
          font-size: 20px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.15s;
        }

        .vcd2-qr-btn:active {
          transform: scale(1.25);
        }

        .vcd2-qr-btn.mine {
          background: rgba(43, 176, 175, 0.15);
        }

        .vcd2-action-list {
          padding: 4px;
        }

        .vcd2-action-item {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 9px 10px;
          border: none;
          background: none;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 600;
          color: var(--vm-text, #18181b);
          cursor: pointer;
          text-align: left;
        }

        .vcd2-action-item:active {
          background: var(--vm-surface-2, #f4e4e4);
        }

        .vcd2-action-item.danger {
          color: #ef4444;
        }

        .vcd2-action-item-icon {
          width: 15px;
          height: 15px;
        }
      `}</style>
    </div>
  );
}
