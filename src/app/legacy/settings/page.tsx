"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/providers/auth-provider";
import { useLogout } from "@/hooks/auth";
import { useUpdateCurrentUser } from "@/hooks/users/use-update-user";
import { useUploadAvatar } from "@/hooks/users/use-upload-avatar";
import { getUserById } from "@/services/user";
import {
  getMyFriendships,
  acceptFriendRequest,
  rejectFriendRequest,
  revokeFriendRequest,
  removeFriendship,
  blockUser,
  unblockUser,
  changeFriendshipType,
} from "@/services/friendship";
import {
  isPending,
  isAccepted,
  isRemoved,
  isBlocked,
  getMyFriendshipType,
  FRIENDSHIP_TYPE_LABELS,
} from "@/types/friendship";
import type { FriendshipTypeValue } from "@/types/friendship";
import { appHub } from "@/lib/signalr/app-hub";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  LogOut,
  User,
  Bell,
  Shield,
  HelpCircle,
  Pencil,
  Upload,
  Users,
  UserPlus,
} from "lucide-react";
import { PwaInstallRow } from "@/components/pwa-install-button";
import type { User as UserType } from "@/types/user";
import type { FriendshipDto } from "@/types/friendship";
import { requestNotificationPermission } from "@/lib/fcm";

export default function SettingsPage() {
  const { user, token, login } = useAuth();
  const { mutate: logout, isLoading: loggingOut } = useLogout();
  const { mutate: updateCurrentUser, isLoading: updatingMe } = useUpdateCurrentUser();
  const { mutate: uploadAvatar, isLoading: uploadingAvatar } = useUploadAvatar();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showEditDialog, setShowEditDialog] = useState(false);
  const [userDetail, setUserDetail] = useState<UserType | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", age: "", genderId: "1" });
  const [avatarUrl, setAvatarUrl] = useState("");
  const [friendships, setFriendships] = useState<FriendshipDto[]>([]);
  const [showFriendRequests, setShowFriendRequests] = useState(false);
  const [showFriendsList, setShowFriendsList] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [notificationPermission, setNotificationPermission] =
    useState<NotificationPermission | null>(null);

  const fetchUserDetail = useCallback(async () => {
    if (!user) return;
    setLoadingDetail(true);
    try {
      const detail = await getUserById(user.id);
      setUserDetail(detail);
    } catch {
    } finally {
      setLoadingDetail(false);
    }
  }, [user]);

  const fetchFriendships = useCallback(async () => {
    try {
      const list = await getMyFriendships({ take: 100 });
      setFriendships(list.data.filter((f) => !isRemoved(f)));
    } catch {}
  }, []);

  useEffect(() => {
    fetchUserDetail();
  }, [fetchUserDetail]);

  useEffect(() => {
    if (typeof Notification !== "undefined") {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  useEffect(() => {
    if (!showFriendRequests && !showFriendsList) return;
    fetchFriendships();
  }, [showFriendRequests, showFriendsList, fetchFriendships]);

  useEffect(() => {
    if (!showFriendRequests && !showFriendsList) return;

    const unsubCreated = appHub.onReceiveFriendshipCreated((dto) => {
      setFriendships((prev) => {
        if (prev.some((f) => f.id === dto.id)) {
          return prev.map((f) => (f.id === dto.id ? dto : f));
        }
        return isRemoved(dto) ? prev : [...prev, dto];
      });
    });

    const unsubAccepted = appHub.onReceiveFriendshipAccepted((dto) => {
      setFriendships((prev) => prev.map((f) => (f.id === dto.id ? dto : f)));
    });

    const unsubBlocked = appHub.onReceiveFriendshipBlocked((dto) => {
      setFriendships((prev) => {
        if (prev.some((f) => f.id === dto.id)) {
          return prev.map((f) => (f.id === dto.id ? dto : f));
        }
        return [...prev, dto];
      });
    });

    const unsubUnblocked = appHub.onReceiveFriendshipUnblocked((dto) => {
      setFriendships((prev) => prev.map((f) => (f.id === dto.id ? dto : f)));
    });

    return () => {
      unsubCreated();
      unsubAccepted();
      unsubBlocked();
      unsubUnblocked();
    };
  }, [showFriendRequests, showFriendsList]);

  useEffect(() => {
    if (!userDetail) return;
    setForm({
      name: userDetail.name || "",
      age: String(userDetail.age || ""),
      genderId: String(userDetail.genderId || 1),
    });
    setAvatarUrl(userDetail.images?.[0]?.originalUrl ?? userDetail.images?.[0]?.thumbUrl ?? "");
  }, [userDetail]);

  const handleOpenChange = (open: boolean) => {
    setShowEditDialog(open);
    if (!open) {
      setError(null);
      setUserDetail(null);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setError(null);
    try {
      const result = await uploadAvatar(file);
      setAvatarUrl(result.images?.[0]?.originalUrl ?? result.images?.[0]?.thumbUrl ?? "");
      login({ id: user.id, name: form.name, email: user.email }, token || undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tải ảnh lên thất bại");
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError(null);
    try {
      await updateCurrentUser({
        name: form.name,
        age: Number(form.age),
        genderId: Number(form.genderId),
      });
      login({ id: user.id, name: form.name, email: user.email }, token || undefined);
      setShowEditDialog(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cập nhật hồ sơ thất bại");
    }
  };

  const isUpdating = updatingMe;
  const isUploading = uploadingAvatar;

  const pendingReceived = friendships.filter((f) => isPending(f) && f.requestedById !== user?.id);
  const pendingSent = friendships.filter((f) => isPending(f) && f.requestedById === user?.id);
  const friends = friendships.filter((f) => isAccepted(f) || isBlocked(f));

  const handleAccept = async (id: number) => {
    setActionLoading(id);
    try {
      const res = await acceptFriendRequest(id);
      setFriendships((p) => p.map((f) => (f.id === id ? res : f)));
    } catch {
    } finally {
      setActionLoading(null);
    }
  };
  const handleReject = async (id: number) => {
    setActionLoading(id);
    try {
      const res = await rejectFriendRequest(id);
      setFriendships((p) => p.map((f) => (f.id === id ? res : f)));
    } catch {
    } finally {
      setActionLoading(null);
    }
  };
  const handleRevoke = async (id: number) => {
    setActionLoading(id);
    try {
      const res = await revokeFriendRequest(id);
      setFriendships((p) => p.map((f) => (f.id === id ? res : f)));
    } catch {
    } finally {
      setActionLoading(null);
    }
  };
  const handleRemove = async (id: number) => {
    setActionLoading(id);
    try {
      await removeFriendship(id);
      setFriendships((p) => p.filter((f) => f.id !== id));
    } catch {
    } finally {
      setActionLoading(null);
    }
  };
  const handleBlock = async (id: number) => {
    setActionLoading(id);
    try {
      const res = await blockUser(id);
      setFriendships((p) => p.map((f) => (f.id === id ? res : f)));
    } catch {
    } finally {
      setActionLoading(null);
    }
  };
  const handleUnblock = async (id: number) => {
    setActionLoading(id);
    try {
      const res = await unblockUser(id);
      setFriendships((p) => p.map((f) => (f.id === id ? res : f)));
    } catch {
    } finally {
      setActionLoading(null);
    }
  };

  const handleRequestNotificationPermission = async () => {
    try {
      const permission = await requestNotificationPermission();
      setNotificationPermission(permission);
    } catch (err) {
      console.error("Failed to request notification permission:", err);
    }
  };
  const handleChangeType = async (id: number, type: FriendshipTypeValue) => {
    setActionLoading(id);
    try {
      const res = await changeFriendshipType(id, type);
      setFriendships((p) => p.map((f) => (f.id === id ? res : f)));
    } catch {
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-2xl font-bold">Cài đặt</h1>

      <Card>
        <CardHeader className="space-y-0 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-muted flex h-12 w-12 items-center justify-center overflow-hidden rounded-full">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <User className="text-muted-foreground h-6 w-6" />
                )}
              </div>
              <div>
                <CardTitle className="text-lg">{user?.name || "Khách"}</CardTitle>
                <p className="text-muted-foreground text-sm">{user?.email || "Không có email"}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowEditDialog(true)}>
              <Pencil className="mr-1.5 h-3.5 w-3.5" /> Sửa
            </Button>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardContent className="p-0">
          <PwaInstallRow />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <button
            onClick={() => setShowFriendRequests(true)}
            className="hover:bg-muted/50 flex w-full items-center gap-4 p-4 text-left"
          >
            <UserPlus className="text-muted-foreground h-5 w-5" />
            <span className="flex-1">Lời mời kết bạn</span>
            {pendingReceived.length > 0 && (
              <span className="bg-primary flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-xs text-white">
                {pendingReceived.length}
              </span>
            )}
            <span className="text-muted-foreground">›</span>
          </button>
          <Separator />
          <button
            onClick={() => setShowFriendsList(true)}
            className="hover:bg-muted/50 flex w-full items-center gap-4 p-4 text-left"
          >
            <Users className="text-muted-foreground h-5 w-5" />
            <span className="flex-1">Danh sách bạn bè</span>
            {friends.length > 0 && (
              <span className="text-muted-foreground text-sm">{friends.length}</span>
            )}
            <span className="text-muted-foreground">›</span>
          </button>
          <Separator />
          <button className="hover:bg-muted/50 flex w-full items-center gap-4 p-4 text-left">
            <Bell className="text-muted-foreground h-5 w-5" />
            <span className="flex-1">Thông báo</span>
            {notificationPermission === "granted" ? (
              <span className="text-sm text-green-600">Đã bật</span>
            ) : notificationPermission === "denied" ? (
              <span className="text-sm text-red-600">Đã tắt</span>
            ) : notificationPermission === "default" ? (
              <Button size="sm" variant="outline" onClick={handleRequestNotificationPermission}>
                Bật thông báo
              </Button>
            ) : null}
            <span className="text-muted-foreground">›</span>
          </button>
          <Separator />
          <div className="hover:bg-muted/50 flex w-full items-center gap-4 p-4 text-left">
            <Shield className="text-muted-foreground h-5 w-5" />
            <span className="flex-1">Quyền riêng tư</span>
            <span className="text-muted-foreground">›</span>
          </div>
          <Separator />
          <div className="hover:bg-muted/50 flex w-full items-center gap-4 p-4 text-left">
            <HelpCircle className="text-muted-foreground h-5 w-5" />
            <span className="flex-1">Trợ giúp</span>
            <span className="text-muted-foreground">›</span>
          </div>
        </CardContent>
      </Card>

      <Button
        variant="outline"
        className="text-destructive hover:bg-destructive/10 w-full"
        onClick={() => logout()}
        disabled={loggingOut}
      >
        <LogOut className="mr-2 h-4 w-4" />
        {loggingOut ? "Đang đăng xuất..." : "Đăng xuất"}
      </Button>

      <Dialog open={showFriendRequests} onOpenChange={setShowFriendRequests}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lời mời kết bạn</DialogTitle>
          </DialogHeader>
          <div className="max-h-80 overflow-y-auto">
            {pendingReceived.length === 0 && pendingSent.length === 0 ? (
              <p className="text-muted-foreground py-8 text-center text-sm">Không có lời mời nào</p>
            ) : (
              <div className="flex flex-col gap-3">
                <p className="text-muted-foreground text-xs font-medium uppercase">Nhận được</p>
                {pendingReceived.length === 0 ? (
                  <p className="text-muted-foreground py-4 text-center text-sm">
                    Không có lời mời nào
                  </p>
                ) : (
                  pendingReceived.map((f) => (
                    <div key={f.id} className="flex items-center gap-3 rounded-lg border p-3">
                      {f.otherUserImage?.thumbUrl ? (
                        <img
                          src={f.otherUserImage.thumbUrl}
                          alt=""
                          className="h-10 w-10 shrink-0 rounded-full object-cover"
                        />
                      ) : (
                        <div className="bg-muted text-muted-foreground flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold">
                          {f.otherUserName?.charAt(0)?.toUpperCase() ?? "?"}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{f.otherUserName}</p>
                        <p className="text-muted-foreground text-xs">
                          {new Date(f.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          disabled={actionLoading === f.id}
                          onClick={() => handleAccept(f.id)}
                        >
                          Chấp nhận
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={actionLoading === f.id}
                          onClick={() => handleReject(f.id)}
                        >
                          Từ chối
                        </Button>
                      </div>
                    </div>
                  ))
                )}
                <p className="text-muted-foreground mt-2 text-xs font-medium uppercase">Đã gửi</p>
                {pendingSent.length === 0 ? (
                  <p className="text-muted-foreground py-4 text-center text-sm">
                    Chưa gửi lời mời nào
                  </p>
                ) : (
                  pendingSent.map((f) => (
                    <div key={f.id} className="flex items-center gap-3 rounded-lg border p-3">
                      {f.otherUserImage?.thumbUrl ? (
                        <img
                          src={f.otherUserImage.thumbUrl}
                          alt=""
                          className="h-10 w-10 shrink-0 rounded-full object-cover"
                        />
                      ) : (
                        <div className="bg-muted text-muted-foreground flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold">
                          {f.otherUserName?.charAt(0)?.toUpperCase() ?? "?"}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{f.otherUserName}</p>
                        <p className="text-muted-foreground text-xs">
                          {new Date(f.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={actionLoading === f.id}
                        onClick={() => handleRevoke(f.id)}
                      >
                        Thu hồi
                      </Button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showFriendsList} onOpenChange={setShowFriendsList}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Danh sách bạn bè</DialogTitle>
          </DialogHeader>
          <div className="max-h-80 overflow-y-auto">
            {friends.length === 0 ? (
              <p className="text-muted-foreground py-8 text-center text-sm">Chưa có bạn bè</p>
            ) : (
              <div className="flex flex-col gap-3">
                {friends.map((f) => (
                  <div key={f.id} className="flex items-center gap-3 rounded-lg border p-3">
                    {f.otherUserImage?.thumbUrl ? (
                      <img
                        src={f.otherUserImage.thumbUrl}
                        alt=""
                        className="h-10 w-10 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <div className="bg-muted text-muted-foreground flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold">
                        {f.otherUserName?.charAt(0)?.toUpperCase() ?? "?"}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{f.otherUserName}</p>
                      {isBlocked(f) && <p className="text-destructive text-xs">Đã chặn</p>}
                      {isAccepted(f) && !isBlocked(f) && (
                        <select
                          value={String(getMyFriendshipType(f, user?.id))}
                          disabled={actionLoading === f.id}
                          onChange={(e) =>
                            handleChangeType(f.id, Number(e.target.value) as FriendshipTypeValue)
                          }
                          className="border-border bg-background mt-1 rounded-md border px-1.5 py-0.5 text-xs"
                        >
                          {Object.entries(FRIENDSHIP_TYPE_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {isBlocked(f) && f.blockedById === user?.id ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={actionLoading === f.id}
                          onClick={() => handleUnblock(f.id)}
                        >
                          Bỏ chặn
                        </Button>
                      ) : isBlocked(f) ? null : (
                        <>
                          {isAccepted(f) && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-destructive hover:bg-destructive/10"
                              disabled={actionLoading === f.id}
                              onClick={() => handleBlock(f.id)}
                            >
                              Chặn
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive hover:bg-destructive/10"
                            disabled={actionLoading === f.id}
                            onClick={() => handleRemove(f.id)}
                          >
                            Hủy
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditDialog} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chỉnh sửa hồ sơ</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {loadingDetail ? (
              <div className="flex items-center justify-center py-8">
                <div className="border-border border-t-primary h-6 w-6 animate-spin rounded-full border-2" />
              </div>
            ) : (
              <>
                <div className="flex flex-col items-center gap-3">
                  <div className="bg-muted relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                    ) : (
                      <User className="text-muted-foreground h-8 w-8" />
                    )}
                    {isUploading && (
                      <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      </div>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isUploading}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="mr-1.5 h-3.5 w-3.5" />
                    {isUploading ? "Đang tải lên..." : "Đổi ảnh đại diện"}
                  </Button>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="edit-name">Tên</Label>
                  <Input
                    id="edit-name"
                    placeholder="Tên của bạn"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                    minLength={2}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="edit-age">Tuổi</Label>
                  <Input
                    id="edit-age"
                    type="number"
                    placeholder="Tuổi của bạn"
                    value={form.age}
                    onChange={(e) => setForm({ ...form, age: e.target.value })}
                    required
                    min={1}
                    max={150}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="edit-gender">Giới tính</Label>
                  <select
                    id="edit-gender"
                    className="border-border bg-background rounded-md border px-3 py-2 text-sm"
                    value={form.genderId}
                    onChange={(e) => setForm({ ...form, genderId: e.target.value })}
                  >
                    <option value="1">Nam</option>
                    <option value="2">Nữ</option>
                    <option value="3">Gay</option>
                    <option value="4">Les</option>
                  </select>
                </div>
              </>
            )}
            {error && <p className="text-sm text-red-500">{error}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Hủy
              </Button>
              <Button type="submit" disabled={isUpdating || loadingDetail}>
                {isUpdating ? "Đang lưu..." : "Lưu"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
