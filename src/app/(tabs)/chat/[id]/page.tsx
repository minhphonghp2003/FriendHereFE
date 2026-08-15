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
import { MomentDetailOverlay } from "@/components/moments/moment-detail-overlay";
import { MessageBubble } from "@/components/chat/message-bubble";
import { GroupSettingsDialog } from "@/components/chat/group-settings-dialog";
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

export default function ChatScreenPage() {
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
  const [viewMomentId, setViewMomentId] = useState<number | null>(null);
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
  const [actionPos, setActionPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
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
          setPendingFiles((prev) => prev.map((p) => ({ ...p, uploading: false })));
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

  if (loading) {
    return (
      <div className="flex h-[calc(100dvh-4rem)] items-center justify-center">
        <LoadingVideo size="md" />
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
  let actionItemCount = 1 + (actionIsMine ? 1 : 0) + (actionIsMine && actionIsText ? 1 : 0);
  if (actionLinks.length > 0) actionItemCount += 1;
  if (actionPhones.length > 0) actionItemCount += 1;
  actionItemCount += 1;
  const actionPopupWidth = 210;
  const actionPopupHeight = actionMessage
    ? 52 + actionItemCount * 40 + (actionMessage.isDeleted ? 0 : 48)
    : 0;
  const actionPad = 8;
  const actionLeft = Math.max(
    actionPad,
    Math.min(actionPos.x, window.innerWidth - actionPopupWidth - actionPad),
  );
  const actionTop = Math.max(
    actionPad,
    Math.min(actionPos.y, window.innerHeight - actionPopupHeight - actionPad),
  );

  return (
    <div
      className="fixed inset-x-0 z-40 flex flex-col overflow-hidden"
      style={{
        top: "env(safe-area-inset-top)",
        bottom: "calc(4rem + env(safe-area-inset-bottom))",
      }}
    >
      <div className="border-border flex items-center gap-3 border-b p-3">
        <button onClick={() => router.back()} className="hover:bg-muted rounded p-1">
          <ArrowLeft className="h-5 w-5" />
        </button>
        {searchOpen ? (
          <form onSubmit={handleSearchSubmit} className="flex flex-1 items-center gap-2">
            <div className="relative flex-1">
              <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
              <input
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm tin nhắn..."
                className="bg-muted w-full rounded-full py-2 pr-3 pl-9 text-sm outline-none"
              />
            </div>
            {searching && (
              <Loader2 className="text-muted-foreground h-4 w-4 shrink-0 animate-spin" />
            )}
            <button
              type="button"
              onClick={closeSearch}
              className="text-muted-foreground hover:bg-muted rounded-full p-1"
              aria-label="Đóng tìm kiếm"
            >
              <X className="h-5 w-5" />
            </button>
          </form>
        ) : (
          <>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 truncate font-semibold">
                <span className="truncate">{convName}</span>
                {currentConv?.isMuted && (
                  <BellOff className="text-muted-foreground h-4 w-4 shrink-0" />
                )}
              </p>
              <p className={`text-xs ${convOnline ? "text-emerald-500" : "text-zinc-400"}`}>
                {convOnline ? "Online" : "Offline"}
              </p>
            </div>
            {!isGroup && opponentId && (
              <button
                onClick={() => router.push(`/user/${opponentId}`)}
                className="hover:bg-muted text-muted-foreground rounded-full p-2"
                title="Thông tin"
                aria-label="Thông tin người dùng"
              >
                <Info className="h-5 w-5" />
              </button>
            )}
            <button
              onClick={() => setSearchOpen(true)}
              className="hover:bg-muted text-muted-foreground rounded-full p-2"
              title="Tìm kiếm"
              aria-label="Tìm kiếm"
            >
              <Search className="h-5 w-5" />
            </button>
            {!isGroup && (
              <button
                onClick={() => opponentId && startCall(opponentId, convName, opponentAvatar)}
                disabled={!opponentId || isBlocked}
                className="hover:bg-muted rounded-full p-2 text-blue-600 disabled:opacity-50"
                title="Gọi video"
              >
                <Phone className="h-5 w-5" />
              </button>
            )}
            {!isGroup &&
              (isBlocked ? (
                <button
                  onClick={handleUnblock}
                  disabled={blocking || blockedById !== user?.id}
                  className="hover:bg-muted rounded-full p-2 text-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                  title="Bỏ chặn"
                >
                  <ShieldOff className="h-5 w-5" />
                </button>
              ) : (
                <button
                  onClick={handleBlock}
                  disabled={blocking}
                  className="hover:bg-muted rounded-full p-2 text-red-500 disabled:opacity-50"
                  title="Chặn người dùng"
                >
                  <Ban className="h-5 w-5" />
                </button>
              ))}
            {isGroup && (
              <button
                onClick={() => setShowGroupSettings(true)}
                className="hover:bg-muted text-muted-foreground rounded-full p-2"
                title="Thiết lập nhóm"
                aria-label="Thiết lập nhóm"
              >
                <Users className="h-5 w-5" />
              </button>
            )}
          </>
        )}
      </div>
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 space-y-2 overflow-y-auto p-4"
      >
        {messages.length === 0 && (
          <p className="text-muted-foreground py-8 text-center text-sm">
            Chưa có tin nhắn. Hãy gửi tin nhắn đầu tiên!
          </p>
        )}
        {messages.map((msg) => {
          const isMe = msg.senderId === user?.id;
          const isSystem = toChatMessageRenderType(msg.type) === "System";
          return (
            <Fragment key={msg.id}>
              <div
                id={`message-${msg.id}`}
                className={`flex gap-2 select-none ${highlightedMsgId === msg.id ? "rounded-lg ring-2 ring-blue-400" : ""} ${isSystem ? "justify-center" : isMe ? "justify-end" : "justify-start"}`}
              >
                {!isMe && !isSystem && (
                  <button
                    onClick={() => router.push(`/user/${msg.senderId}`)}
                    className="shrink-0 self-end"
                  >
                    {msg.senderAvatar?.thumbUrl ? (
                      <img
                        src={msg.senderAvatar.thumbUrl}
                        alt=""
                        className="h-7 w-7 rounded-full object-cover"
                      />
                    ) : (
                      <div className="bg-muted text-muted-foreground flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold">
                        {msg.senderName?.charAt(0)?.toUpperCase() ?? "?"}
                      </div>
                    )}
                  </button>
                )}
                <div className={`max-w-[75%] ${isMe ? "text-right" : ""}`}>
                  {!isMe && !isSystem && (
                    <p
                      className="text-muted-foreground mb-0.5 ml-1 cursor-pointer text-[11px] font-medium hover:underline"
                      onClick={() => router.push(`/user/${msg.senderId}`)}
                    >
                      {msg.senderName}
                    </p>
                  )}
                  <MessageBubble
                    msg={msg}
                    isMe={isMe}
                    currentUserId={user?.id}
                    onViewMoment={(id) => setViewMomentId(id)}
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
        <button
          onClick={reloadToLatest}
          className="bg-primary hover:bg-primary/90 absolute right-4 bottom-24 z-30 flex h-11 w-11 items-center justify-center rounded-full text-white shadow-lg transition-transform hover:scale-105"
          title="Quay lại tin nhắn mới nhất"
          aria-label="Quay lại tin nhắn mới nhất"
        >
          <ChevronDown className="h-5 w-5" />
        </button>
      )}
      {isBlocked ? (
        <div className="border-border bg-muted/50 flex items-center justify-center border-t p-3">
          {blockedById === user?.id ? (
            <p className="text-muted-foreground text-sm">
              Bạn đã chặn người này. Nhấn nút bỏ chặn để gửi tin nhắn.
            </p>
          ) : (
            <p className="text-muted-foreground text-sm">Bạn đã bị chặn. Không thể gửi tin nhắn.</p>
          )}
        </div>
      ) : (
        <div className="border-border relative border-t">
          {typingUsers.size > 0 && (
            <div className="text-muted-foreground flex items-center gap-1.5 px-4 pt-2 text-xs">
              <span className="flex gap-0.5">
                <span className="h-1 w-1 animate-bounce rounded-full bg-current" />
                <span className="h-1 w-1 animate-bounce rounded-full bg-current [animation-delay:0.15s]" />
                <span className="h-1 w-1 animate-bounce rounded-full bg-current [animation-delay:0.3s]" />
              </span>
              <span>{Array.from(typingUsers.values()).join(", ")} đang nhập...</span>
            </div>
          )}
          {pendingFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 px-3 pt-3">
              {pendingFiles.map((pf) => (
                <div key={pf.id} className="relative h-20 w-20">
                  {pf.isVideo ? (
                    <video
                      src={pf.preview}
                      className="h-full w-full rounded-lg bg-black object-cover"
                      muted
                    />
                  ) : (
                    <img
                      src={pf.preview}
                      alt=""
                      className="h-full w-full rounded-lg object-cover"
                    />
                  )}
                  {pf.uploading && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/40">
                      <Loader2 className="h-5 w-5 animate-spin text-white" />
                    </div>
                  )}
                  <button
                    onClick={() => removePendingFile(pf.id)}
                    disabled={sending}
                    className="bg-background absolute -top-2 -right-2 rounded-full p-0.5 shadow disabled:opacity-50"
                    aria-label="Xóa tệp"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {pendingMomentLoading ? (
            <div className="bg-muted mx-3 mt-3 h-20 w-20 animate-pulse rounded-lg" />
          ) : pendingMoment ? (
            <div className="relative mx-3 mt-3 inline-block">
              <img
                src={pendingMoment.thumbUrl}
                alt=""
                className="h-20 w-20 rounded-lg object-cover"
              />
              <button
                onClick={() => setPendingMoment(null)}
                className="bg-background absolute -top-2 -right-2 rounded-full p-0.5 shadow"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : null}

          {showEmojiPicker && (
            <div className="absolute bottom-full left-3 z-50 mb-2">
              <div className="border-border bg-background rounded-xl border shadow-lg">
                <EmojiPicker
                  onEmojiClick={(emojiData) => handleSendEmoji(emojiData.emoji)}
                  width={300}
                  height={320}
                />
              </div>
            </div>
          )}

          {showGiphyPicker && (
            <div className="border-border bg-background absolute bottom-full left-3 z-50 mb-2 w-[min(90vw,340px)] overflow-hidden rounded-xl border shadow-lg">
              <form
                onSubmit={handleGiphySearch}
                className="border-border flex items-center gap-1.5 border-b p-2"
              >
                <div className="bg-muted flex shrink-0 rounded-full p-0.5">
                  <button
                    type="button"
                    onClick={() => handleGiphyTabChange("gif")}
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${giphyTab === "gif" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
                  >
                    GIF
                  </button>
                  <button
                    type="button"
                    onClick={() => handleGiphyTabChange("sticker")}
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${giphyTab === "sticker" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
                  >
                    Sticker
                  </button>
                </div>
                <input
                  value={giphyQuery}
                  onChange={(e) => setGiphyQuery(e.target.value)}
                  placeholder="Tìm kiếm..."
                  className="bg-muted flex-1 rounded-full px-3 py-1.5 text-sm outline-none"
                />
              </form>
              <div className="grid max-h-64 grid-cols-3 gap-1 overflow-y-auto p-2">
                {giphyLoading ? (
                  <div className="col-span-3 flex items-center justify-center py-8">
                    <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
                  </div>
                ) : giphyResults.length === 0 ? (
                  <p className="text-muted-foreground col-span-3 py-8 text-center text-xs">
                    Không tìm thấy {giphyTab === "sticker" ? "sticker" : "GIF"}
                  </p>
                ) : (
                  giphyResults.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleSendGiphy(item)}
                      className="overflow-hidden rounded-lg"
                    >
                      <img
                        src={item.thumbUrl}
                        alt=""
                        className="h-16 w-full object-cover"
                        loading="lazy"
                      />
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {(replyTo || editingMessage) && (
            <div className="border-border bg-muted/50 flex items-center gap-2 border-t px-3 py-2">
              <div className="min-w-0 flex-1">
                {editingMessage ? (
                  <>
                    <p className="text-xs font-semibold text-blue-600">Đang chỉnh sửa tin nhắn</p>
                    <p className="text-muted-foreground truncate text-xs">
                      {editingMessage.content ?? getMessagePreview(editingMessage)}
                    </p>
                  </>
                ) : replyTo ? (
                  <>
                    <p className="text-xs font-semibold text-blue-600">
                      Trả lời {replyTo.senderName}
                    </p>
                    <p className="text-muted-foreground truncate text-xs">
                      {getMessagePreview(replyTo)}
                    </p>
                  </>
                ) : null}
              </div>
              <button
                onClick={cancelReplyAndEdit}
                className="text-muted-foreground hover:bg-muted rounded-full p-1"
                aria-label="Hủy"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <div className="flex items-center gap-1 p-3">
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageChange}
              className="hidden"
            />
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              onChange={handleVideoChange}
              className="hidden"
            />
            <button
              onClick={() => imageInputRef.current?.click()}
              className="text-muted-foreground hover:bg-muted flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
              aria-label="Gửi ảnh"
            >
              <ImagePlus className="h-5 w-5" />
            </button>
            <button
              onClick={() => videoInputRef.current?.click()}
              className="text-muted-foreground hover:bg-muted flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
              aria-label="Gửi video"
            >
              <Film className="h-5 w-5" />
            </button>
            <button
              onClick={handleToggleEmojiPicker}
              className="text-muted-foreground hover:bg-muted flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
              aria-label="Biểu tượng cảm xúc"
            >
              <Smile className="h-5 w-5" />
            </button>
            <button
              onClick={handleToggleGiphyPicker}
              className="text-muted-foreground hover:bg-muted flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold"
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
              className="bg-muted flex-1 rounded-full px-4 py-2 text-sm outline-none"
            />
            <button
              onClick={handleSend}
              disabled={(!input.trim() && !pendingMoment && pendingFiles.length === 0) || sending}
              className="bg-primary hover:bg-primary/90 rounded-full p-2 text-white disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
      {reactionMessage && (
        <div
          className="fixed inset-0 z-[95] flex items-center justify-center p-4"
          onClick={() => setReactionMessage(null)}
        >
          <div className="absolute inset-0 bg-black/50" onClick={() => setReactionMessage(null)} />
          <div
            className="bg-background relative z-10 w-full max-w-sm overflow-hidden rounded-2xl shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-border flex items-center justify-between border-b px-4 py-3">
              <p className="text-sm font-semibold">Reactions</p>
              <button
                onClick={() => setReactionMessage(null)}
                className="text-muted-foreground hover:bg-muted rounded-full p-1"
                aria-label="Đóng"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {reactionsLoading && reactionUsers.length === 0 ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
                </div>
              ) : reactionUsers.length === 0 ? (
                <p className="text-muted-foreground py-8 text-center text-xs">Chưa có phản ứng</p>
              ) : (
                reactionUsers.map((u) => (
                  <div key={u.userId} className="flex items-center gap-3 px-4 py-2.5">
                    <div className="bg-muted h-9 w-9 shrink-0 overflow-hidden rounded-full">
                      {u.userImage?.thumbUrl ? (
                        <img
                          src={u.userImage.thumbUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="text-muted-foreground flex h-full w-full items-center justify-center text-sm font-bold">
                          {u.userName?.charAt(0)?.toUpperCase() ?? "?"}
                        </div>
                      )}
                    </div>
                    <p className="flex-1 truncate text-sm">{u.userName}</p>
                    <div className="flex gap-0.5 text-lg">
                      {u.emojis.map((emoji, i) => (
                        <span key={`${emoji}-${i}`}>{emoji}</span>
                      ))}
                    </div>
                  </div>
                ))
              )}
              {reactionHasMore && (
                <div className="flex justify-center py-3">
                  <button
                    onClick={() =>
                      reactionMessage && loadReactions(reactionMessage, reactionPrevId)
                    }
                    disabled={reactionsLoading}
                    className="bg-muted text-muted-foreground hover:bg-muted/70 rounded-full px-4 py-1.5 text-xs font-medium disabled:opacity-50"
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
        <div className="fixed inset-0 z-[90]" onClick={() => setActionMessage(null)}>
          <div className="absolute inset-0" onClick={() => setActionMessage(null)} />
          <div
            className="border-border bg-background absolute z-10 w-52 overflow-hidden rounded-xl border shadow-2xl"
            style={{ left: actionLeft, top: actionTop }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-border border-b px-3 py-2">
              <p className="truncate text-xs font-medium">{actionMessage.senderName}</p>
              <p className="text-muted-foreground truncate text-xs">
                {actionMessage.isDeleted ? "Message has been deleted" : actionContent}
              </p>
            </div>
            {!actionMessage.isDeleted && (
              <div className="border-border flex items-center justify-between gap-1 border-b px-3 py-2">
                {QUICK_REACTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleReact(actionMessage, emoji)}
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xl transition-transform hover:scale-125 ${myReactionSet.has(emoji) ? "bg-blue-100" : ""}`}
                    aria-label={`React ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
            <div className="py-1">
              <button
                onClick={() => handleReply(actionMessage)}
                className="hover:bg-muted flex w-full items-center gap-3 px-3 py-2 text-sm"
              >
                <Reply className="h-4 w-4" />
                Reply
              </button>
              {actionIsMine && actionIsText && (
                <button
                  onClick={() => handleEdit(actionMessage)}
                  className="hover:bg-muted flex w-full items-center gap-3 px-3 py-2 text-sm"
                >
                  <Pencil className="h-4 w-4" />
                  Edit
                </button>
              )}
              {actionIsMine && (
                <button
                  onClick={() => handleDelete(actionMessage)}
                  className="hover:bg-muted flex w-full items-center gap-3 px-3 py-2 text-sm text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              )}
              {actionLinks.length > 0 && (
                <button
                  onClick={() => copyText(actionLinks.join("\n"))}
                  className="hover:bg-muted flex w-full items-center gap-3 px-3 py-2 text-sm"
                >
                  <Link2 className="h-4 w-4" />
                  Copy link
                </button>
              )}
              {actionPhones.length > 0 && (
                <button
                  onClick={() => copyText(actionPhones.join("\n"))}
                  className="hover:bg-muted flex w-full items-center gap-3 px-3 py-2 text-sm"
                >
                  <Phone className="h-4 w-4" />
                  Copy phone
                </button>
              )}
              <button
                onClick={() => handleCopy(actionMessage)}
                className="hover:bg-muted flex w-full items-center gap-3 px-3 py-2 text-sm"
              >
                <Copy className="h-4 w-4" />
                Copy
              </button>
            </div>
          </div>
        </div>
      )}
      <MomentDetailOverlay
        momentId={viewMomentId}
        currentUserId={user?.id}
        onClose={() => setViewMomentId(null)}
      />
      <GroupSettingsDialog
        open={showGroupSettings}
        onOpenChange={setShowGroupSettings}
        conversation={currentConv ?? null}
        onNameChanged={(newName) => setConvName(newName)}
        onExitGroup={() => router.replace("/chat")}
      />
    </div>
  );
}
