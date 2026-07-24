"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/providers/auth-provider";
import { useLogout } from "@/hooks/auth";
import { useUpdateCurrentUser } from "@/hooks/users/use-update-user";
import { useUploadAvatar } from "@/hooks/users/use-upload-avatar";
import { getUserById } from "@/services/user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { LogOut, User, Bell, Shield, HelpCircle, Pencil, Upload, Moon } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import type { User as UserType } from "@/types/user";

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
  const [form, setForm] = useState({
    name: "",
    age: "",
    genderId: "1",
  });
  const [avatarUrl, setAvatarUrl] = useState("");

  const fetchUserDetail = useCallback(async () => {
    if (!user) return;
    setLoadingDetail(true);
    try {
      const detail = await getUserById(user.id);
      setUserDetail(detail);
    } catch {
      // ignore
    } finally {
      setLoadingDetail(false);
    }
  }, [user]);

  useEffect(() => {
    fetchUserDetail();
  }, [fetchUserDetail]);

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
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setError(null);

    const payload = {
      name: form.name,
      age: Number(form.age),
      genderId: Number(form.genderId),
    };

    try {
      await updateCurrentUser(payload);
      login({ id: user.id, name: form.name, email: user.email }, token || undefined);
      setShowEditDialog(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cập nhật hồ sơ thất bại");
    }
  };

  const isUpdating = updatingMe;
  const isUploading = uploadingAvatar;

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-2xl font-bold">Cài đặt</h1>

      <Card>
        <CardHeader className="space-y-0 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-muted">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <User className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <div>
                <CardTitle className="text-lg">{user?.name || "Khách"}</CardTitle>
                <p className="text-sm text-muted-foreground">{user?.email || "Không có email"}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowEditDialog(true)}>
              <Pencil className="mr-1.5 h-3.5 w-3.5" />
              Sửa
            </Button>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="flex w-full items-center gap-4 p-4">
            <Moon className="h-5 w-5 text-muted-foreground" />
            <span className="flex-1">Chế độ tối</span>
            <ThemeToggle />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <button className="flex w-full items-center gap-4 p-4 text-left hover:bg-muted/50">
            <Bell className="h-5 w-5 text-muted-foreground" />
            <span className="flex-1">Thông báo</span>
            <span className="text-muted-foreground">›</span>
          </button>
          <Separator />
          <button className="flex w-full items-center gap-4 p-4 text-left hover:bg-muted/50">
            <Shield className="h-5 w-5 text-muted-foreground" />
            <span className="flex-1">Quyền riêng tư</span>
            <span className="text-muted-foreground">›</span>
          </button>
          <Separator />
          <button className="flex w-full items-center gap-4 p-4 text-left hover:bg-muted/50">
            <HelpCircle className="h-5 w-5 text-muted-foreground" />
            <span className="flex-1">Trợ giúp</span>
            <span className="text-muted-foreground">›</span>
          </button>
        </CardContent>
      </Card>

      <Button
        variant="outline"
        className="w-full text-destructive hover:bg-destructive/10"
        onClick={() => logout()}
        disabled={loggingOut}
      >
        <LogOut className="mr-2 h-4 w-4" />
        {loggingOut ? "Đang đăng xuất..." : "Đăng xuất"}
      </Button>

      <Dialog open={showEditDialog} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chỉnh sửa hồ sơ</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {loadingDetail ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-primary" />
              </div>
            ) : (
              <>
                <div className="flex flex-col items-center gap-3">
                  <div className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-muted">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                    ) : (
                      <User className="h-8 w-8 text-muted-foreground" />
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
                    className="rounded-md border border-border bg-background px-3 py-2 text-sm"
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
