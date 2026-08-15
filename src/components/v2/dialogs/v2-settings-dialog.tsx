"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Bell, LogOut, Eye, ChevronRight, Check, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { useAppDispatch } from "@/store/hooks";
import { logout as reduxLogout } from "@/store/slices/auth-slice";
import { setMyVisibility } from "@/store/slices/location-slice";
import { locationHub } from "@/lib/signalr";
import {
  LOCATION_VISIBILITY_VALUES,
  LOCATION_VISIBILITY_LABELS,
  type LocationVisibilityValue,
} from "@/lib/signalr/types";

const VISIBILITY_OPTIONS = Object.entries(LOCATION_VISIBILITY_LABELS) as [string, string][];

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface V2SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const isStandalonePwa = (): boolean => {
  if (typeof window === "undefined") return false;
  const standaloneMedia = window.matchMedia?.("(display-mode: standalone)").matches;
  const iosStandalone =
    typeof window.navigator !== "undefined" &&
    // @ts-expect-error iOS Safari proprietary flag
    window.navigator.standalone === true;
  return Boolean(standaloneMedia || iosStandalone);
};

export function V2SettingsDialog({ open, onOpenChange }: V2SettingsDialogProps) {
  const user = useSelector((state: RootState) => state.auth.user);
  const visibility = useSelector((state: RootState) => state.location.visibility);
  const dispatch = useAppDispatch();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [showVisibilityPicker, setShowVisibilityPicker] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isPwa, setIsPwa] = useState(true);

  // Detect PWA mode + capture the install prompt when available
  useEffect(() => {
    setIsPwa(isStandalonePwa());

    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", () => setInstallPrompt(null));

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    };
  }, []);

  // Only show the section when not installed as PWA
  const showDownloadSection = !isPwa;

  const handleInstall = async () => {
    if (installPrompt) {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setInstallPrompt(null);
      }
      return;
    }
    // No native prompt (e.g. iOS Safari): guide the user
    alert(
      "To install the app:\n\n" +
        "iOS: Share → Add to Home Screen\n" +
        "Android: Menu → Install app / Add to Home screen",
    );
  };

  const visibilityLabel =
    LOCATION_VISIBILITY_LABELS[visibility as LocationVisibilityValue] ??
    LOCATION_VISIBILITY_LABELS[LOCATION_VISIBILITY_VALUES.Public];

  // v1 logic (VisibilityPicker): update store + push via locationHub
  const handleVisibilityChange = (value: LocationVisibilityValue) => {
    dispatch(setMyVisibility(value));
    locationHub.updateVisibility(value);
    setShowVisibilityPicker(false);
  };

  const handleToggleNotifications = () => {
    setNotificationsEnabled(!notificationsEnabled);
  };

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to log out?")) {
      dispatch(reduxLogout());
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="v2-dialog" showCloseButton={false}>
        <div className="dialog-content">
          {showVisibilityPicker ? (
            <div className="settings-sections">
              {VISIBILITY_OPTIONS.map(([value, label]) => {
                const numericValue = Number(value) as LocationVisibilityValue;
                const active = numericValue === visibility;
                return (
                  <button
                    key={value}
                    onClick={() => handleVisibilityChange(numericValue)}
                    className={`visibility-option ${active ? 'active' : ''}`}
                  >
                    <span>{label}</span>
                    {active && <Check className="visibility-check" />}
                  </button>
                );
              })}
            </div>
          ) : (
            <>
              <div className="settings-sections">
                {/* Location Visibility */}
                <button
                  onClick={() => setShowVisibilityPicker(true)}
                  className="setting-item setting-item-btn"
                >
                  <div className="setting-info">
                    <div className="setting-icon-wrapper">
                      <Eye className="setting-icon" />
                    </div>
                    <div className="setting-details">
                      <h3 className="setting-title">Visibility</h3>
                      <p className="setting-description">Who can see my location</p>
                    </div>
                  </div>
                  <div className="setting-item-right">
                    <span className="setting-value">{visibilityLabel}</span>
                    <ChevronRight className="setting-chevron" />
                  </div>
                </button>

                {/* Notifications */}
                <div className="setting-item">
                  <div className="setting-info">
                    <div className="setting-icon-wrapper">
                      <Bell className="setting-icon" />
                    </div>
                    <div className="setting-details">
                      <h3 className="setting-title">Notifications</h3>
                      <p className="setting-description">Receive push notifications</p>
                    </div>
                  </div>
                  <button
                    onClick={handleToggleNotifications}
                    className={`setting-toggle ${
                      notificationsEnabled ? "setting-toggle-on" : ""
                    }`}
                    aria-label="Toggle notifications"
                  >
                    <div className="toggle-slider" />
                  </button>
                </div>
              </div>

              {/* Download app — only shown when NOT running as installed PWA */}
              {showDownloadSection && (
                <>
                  <div className="settings-divider" />
                  <button onClick={handleInstall} className="setting-item setting-item-btn">
                    <div className="setting-info">
                      <div className="setting-icon-wrapper">
                        <Download className="setting-icon" />
                      </div>
                      <div className="setting-details">
                        <h3 className="setting-title">Download app</h3>
                        <p className="setting-description">
                          Install for a full-screen app experience
                        </p>
                      </div>
                    </div>
                    <div className="setting-item-right">
                      <ChevronRight className="setting-chevron" />
                    </div>
                  </button>
                </>
              )}

              <div className="settings-divider" />

              <div className="settings-account">
                <div className="account-info">
                  <p className="account-label">Account</p>
                  <p className="account-email">{user?.email || ""}</p>
                </div>
                <Button onClick={handleLogout} variant="outline" className="logout-btn">
                  <LogOut className="logout-icon" />
                  Log Out
                </Button>
              </div>
            </>
          )}
        </div>

        <style jsx global>{`
          .setting-item-btn {
            width: 100%;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            cursor: pointer;
            text-align: left;
            padding: 12px 16px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-radius: 12px;
            transition: all 0.2s;
          }

          .setting-item-btn:hover {
            background: rgba(255, 255, 255, 0.08);
          }

          .setting-item-right {
            display: flex;
            align-items: center;
            gap: 6px;
          }

          .setting-value {
            font-size: 13px;
            color: rgba(255, 255, 255, 0.6);
          }

          .setting-chevron {
            width: 16px;
            height: 16px;
            color: rgba(255, 255, 255, 0.4);
          }

          .visibility-option {
            display: flex;
            align-items: center;
            justify-content: space-between;
            width: 100%;
            padding: 14px 16px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            color: rgba(255, 255, 255, 0.85);
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
          }

          .visibility-option:hover {
            background: rgba(255, 255, 255, 0.08);
          }

          .visibility-option.active {
            color: #2BB0AF;
            border-color: rgba(43, 176, 175, 0.4);
            background: rgba(43, 176, 175, 0.1);
          }

          .visibility-check {
            width: 16px;
            height: 16px;
            color: #2BB0AF;
          }

          .settings-sections {
            display: flex;
            flex-direction: column;
            gap: 12px;
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
            gap: 6px;
          }

          .logout-btn:hover {
            background: rgba(239, 68, 68, 0.25);
            border-color: rgba(239, 68, 68, 0.5);
          }

          .logout-icon {
            width: 14px;
            height: 14px;
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}
