"use client";

import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { X, Bell, Lock, Moon, Sun, Globe, Shield } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { useAppDispatch } from "@/store/hooks";
import { logout as reduxLogout } from "@/store/slices/auth-slice";
import { toast } from "sonner";

interface V2SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function V2SettingsDialog({ open, onOpenChange }: V2SettingsDialogProps) {
  const { theme, setTheme } = useTheme();
  const user = useSelector((state: RootState) => state.auth.user);
  const dispatch = useAppDispatch();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const handleToggleNotifications = async () => {
    setIsSaving(true);
    try {
      // Simulate API call - in real app, call notification settings service
      setNotificationsEnabled(!notificationsEnabled);
      toast.success(
        notificationsEnabled 
          ? "Notifications disabled" 
          : "Notifications enabled"
      );
    } catch (error) {
      toast.error("Failed to update notification settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to log out?")) {
      dispatch(reduxLogout());
      onOpenChange(false);
      toast.success("Logged out successfully");
    }
  };

  const settings = [
    {
      icon: Bell,
      title: "Notifications",
      description: "Receive push notifications",
      action: "toggle",
      value: notificationsEnabled,
      onChange: handleToggleNotifications,
    },
    {
      icon: Moon,
      title: "Dark Mode",
      description: "Use dark theme",
      action: "toggle",
      value: theme === "dark",
      onChange: handleToggleTheme,
    },
    {
      icon: Globe,
      title: "Language",
      description: "English (US)",
      action: "link",
    },
    {
      icon: Shield,
      title: "Privacy",
      description: "Manage your privacy settings",
      action: "link",
    },
    {
      icon: Lock,
      title: "Security",
      description: "Password and authentication",
      action: "link",
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="v2-dialog">
        <div className="dialog-header">
          <h2 className="dialog-title">Settings</h2>
          <button 
            onClick={() => onOpenChange(false)}
            className="dialog-close-btn"
            aria-label="Close"
          >
            <X className="dialog-close-icon" />
          </button>
        </div>
        <div className="dialog-content">
          <div className="settings-sections">
            {settings.map((setting, index) => {
              const Icon = setting.icon;
              return (
                <div key={index} className="setting-item">
                  <div className="setting-info">
                    <div className="setting-icon-wrapper">
                      <Icon className="setting-icon" />
                    </div>
                    <div className="setting-details">
                      <h3 className="setting-title">{setting.title}</h3>
                      <p className="setting-description">{setting.description}</p>
                    </div>
                  </div>
                  {setting.action === "toggle" && (
                    <button
                      onClick={setting.onChange}
                      disabled={isSaving}
                      className={`setting-toggle ${
                        setting.value ? "setting-toggle-on" : ""
                      }`}
                      aria-label={`Toggle ${setting.title}`}
                    >
                      <div className="toggle-slider" />
                    </button>
                  )}
                  {setting.action === "link" && (
                    <button className="setting-link-btn">
                      <X className="setting-chevron" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="settings-divider" />

          <div className="settings-account">
            <div className="account-info">
              <p className="account-label">Account</p>
              <p className="account-email">{user?.email || ""}</p>
            </div>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="logout-btn"
            >
              Log Out
            </Button>
          </div>
        </div>

        <style jsx global>{`
          .settings-sections {
            display: flex;
            flex-direction: column;
            gap: 16px;
          }

          .setting-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px 16px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            transition: all 0.2s;
          }

          .setting-item:hover {
            background: rgba(255, 255, 255, 0.08);
          }

          .setting-info {
            display: flex;
            align-items: center;
            gap: 12px;
            flex: 1;
            min-width: 0;
          }

          .setting-icon-wrapper {
            width: 36px;
            height: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(43, 176, 175, 0.15);
            border-radius: 8px;
            flex-shrink: 0;
          }

          .setting-icon {
            width: 18px;
            height: 18px;
            color: #2BB0AF;
          }

          .setting-details {
            min-width: 0;
          }

          .setting-title {
            font-size: 14px;
            font-weight: 600;
            color: white;
            margin: 0;
          }

          .setting-description {
            font-size: 12px;
            color: rgba(255, 255, 255, 0.5);
            margin: 2px 0 0;
          }

          .setting-toggle {
            width: 48px;
            height: 28px;
            border-radius: 14px;
            background: rgba(255, 255, 255, 0.15);
            border: 1px solid rgba(255, 255, 255, 0.2);
            position: relative;
            cursor: pointer;
            transition: all 0.3s;
            flex-shrink: 0;
            padding: 0;
          }

          .setting-toggle:hover {
            background: rgba(255, 255, 255, 0.2);
          }

          .setting-toggle.setting-toggle-on {
            background: #2BB0AF;
            border-color: #2BB0AF;
          }

          .toggle-slider {
            width: 22px;
            height: 22px;
            border-radius: 50%;
            background: white;
            position: absolute;
            top: 2px;
            left: 2px;
            transition: all 0.3s;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          }

          .setting-toggle.setting-toggle-on .toggle-slider {
            left: calc(100% - 24px);
          }

          .setting-link-btn {
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.12);
            border-radius: 8px;
            color: rgba(255, 255, 255, 0.5);
            cursor: pointer;
            transition: all 0.2s;
            padding: 0;
          }

          .setting-link-btn:hover {
            background: rgba(255, 255, 255, 0.12);
            color: white;
          }

          .setting-chevron {
            width: 16px;
            height: 16px;
            transform: rotate(-45deg);
          }

          .settings-divider {
            height: 1px;
            background: rgba(255, 255, 255, 0.1);
            margin: 16px 0;
          }

          .settings-account {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 16px;
            background: rgba(239, 68, 68, 0.08);
            border: 1px solid rgba(239, 68, 68, 0.2);
            border-radius: 12px;
          }

          .account-info {
            display: flex;
            flex-direction: column;
            gap: 2px;
          }

          .account-label {
            font-size: 11px;
            color: rgba(255, 255, 255, 0.5);
            font-weight: 600;
            margin: 0;
          }

          .account-email {
            font-size: 13px;
            color: rgba(255, 255, 255, 0.8);
            margin: 0;
          }

          .logout-btn {
            background: rgba(239, 68, 68, 0.15);
            border-color: rgba(239, 68, 68, 0.3);
            color: #ef4444;
            padding: 8px 16px;
            height: 36px;
            font-size: 13px;
            font-weight: 600;
          }

          .logout-btn:hover {
            background: rgba(239, 68, 68, 0.25);
            border-color: rgba(239, 68, 68, 0.5);
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}
