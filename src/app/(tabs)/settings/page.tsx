"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/providers/auth-provider";
import { useLogout } from "@/hooks/auth";
import { useUpdateCurrentUser } from "@/hooks/users/use-update-user";
import { useUpdateWalkIn } from "@/hooks/users/use-update-walk-in";
import { getUserById } from "@/services/user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { LogOut, User, Bell, Shield, HelpCircle, Pencil } from "lucide-react";
import type { User as UserType } from "@/types/user";

export default function SettingsPage() {
  const { user, token, login } = useAuth();
  const { mutate: logout, isLoading: loggingOut } = useLogout();
  const { mutate: updateCurrentUser, isLoading: updatingMe } = useUpdateCurrentUser();
  const { mutate: updateWalkInUser, isLoading: updatingWalkIn } = useUpdateWalkIn();

  const [showEditDialog, setShowEditDialog] = useState(false);
  const [userDetail, setUserDetail] = useState<UserType | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    age: "",
    genderId: "1",
    image: "",
  });

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
    if (!showEditDialog || userDetail) return;
    fetchUserDetail();
  }, [showEditDialog, userDetail, fetchUserDetail]);

  useEffect(() => {
    if (!userDetail) return;
    setForm({
      name: userDetail.name || "",
      age: String(userDetail.age || ""),
      genderId: String(userDetail.genderId || 1),
      image: userDetail.image || "",
    });
  }, [userDetail]);

  const handleOpenChange = (open: boolean) => {
    setShowEditDialog(open);
    if (!open) {
      setError(null);
      setUserDetail(null);
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
      image: form.image || null,
    };

    try {
      if (user.isWalkIn) {
        await updateWalkInUser(user.id, payload);
      } else {
        await updateCurrentUser(payload);
      }
      login({ id: user.id, name: form.name, email: user.email, isWalkIn: user.isWalkIn }, token || undefined);
      setShowEditDialog(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile");
    }
  };

  const isUpdating = updatingMe || updatingWalkIn;

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-2xl font-bold">Settings</h1>

      <Card>
        <CardHeader className="space-y-0 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100">
                <User className="h-6 w-6 text-zinc-600" />
              </div>
              <div>
                <CardTitle className="text-lg">{user?.name || "Guest"}</CardTitle>
                <p className="text-sm text-zinc-500">{user?.email || "No email"}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowEditDialog(true)}>
              <Pencil className="mr-1.5 h-3.5 w-3.5" />
              Edit
            </Button>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardContent className="p-0">
          <button className="flex w-full items-center gap-4 p-4 text-left hover:bg-zinc-50">
            <Bell className="h-5 w-5 text-zinc-600" />
            <span className="flex-1">Notifications</span>
            <span className="text-zinc-400">›</span>
          </button>
          <Separator />
          <button className="flex w-full items-center gap-4 p-4 text-left hover:bg-zinc-50">
            <Shield className="h-5 w-5 text-zinc-600" />
            <span className="flex-1">Privacy</span>
            <span className="text-zinc-400">›</span>
          </button>
          <Separator />
          <button className="flex w-full items-center gap-4 p-4 text-left hover:bg-zinc-50">
            <HelpCircle className="h-5 w-5 text-zinc-600" />
            <span className="flex-1">Help</span>
            <span className="text-zinc-400">›</span>
          </button>
        </CardContent>
      </Card>

      <Button
        variant="outline"
        className="w-full text-red-600 hover:bg-red-50 hover:text-red-700"
        onClick={() => logout()}
        disabled={loggingOut}
      >
        <LogOut className="mr-2 h-4 w-4" />
        {loggingOut ? "Logging out..." : "Log Out"}
      </Button>

      <Dialog open={showEditDialog} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {loadingDetail ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-200 border-t-blue-600" />
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="edit-name">Name</Label>
                  <Input
                    id="edit-name"
                    placeholder="Your name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                    minLength={2}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="edit-age">Age</Label>
                  <Input
                    id="edit-age"
                    type="number"
                    placeholder="Your age"
                    value={form.age}
                    onChange={(e) => setForm({ ...form, age: e.target.value })}
                    required
                    min={1}
                    max={150}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="edit-gender">Gender</Label>
                  <select
                    id="edit-gender"
                    className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm"
                    value={form.genderId}
                    onChange={(e) => setForm({ ...form, genderId: e.target.value })}
                  >
                    <option value="1">Male</option>
                    <option value="2">Female</option>
                    <option value="3">Gay</option>
                    <option value="4">Les</option>
                  </select>
                </div>

                {!user?.isWalkIn && (
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="edit-image">Avatar URL</Label>
                    <Input
                      id="edit-image"
                      type="url"
                      placeholder="https://example.com/avatar.jpg"
                      value={form.image}
                      onChange={(e) => setForm({ ...form, image: e.target.value })}
                    />
                  </div>
                )}
              </>
            )}

            {error && <p className="text-sm text-red-500">{error}</p>}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isUpdating || loadingDetail}>
                {isUpdating ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
