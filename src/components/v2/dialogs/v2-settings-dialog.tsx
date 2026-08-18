"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Bell, BellOff, LogOut, Eye, ChevronRight, Check, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { useAppDispatch } from "@/store/hooks";
import { setMyVisibility } from "@/store/slices/location-slice";
import { locationHub } from "@/lib/signalr";
import {
  LOCATION_VISIBILITY_VALUES,
  LOCATION_VISIBILITY_LABELS,
  type LocationVisibilityValue,
} from "@/lib/signalr/types";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import { requestNotificationPermission } from "@/lib/fcm";
import { useAuth } from "@/providers/auth-provider";

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "FriendHere";

const VISIBILITY_OPTIONS = Object.entries(LOCATION_VISIBILITY_LABELS) as [string, string][];

interface V2SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function V2SettingsDialog({ open, onOpenChange }: V2SettingsDialogProps) {
  const user = useSelector((state: RootState) => state.auth.user);
  const visibility = useSelector((state: RootState) => state.location.visibility);
  const dispatch = useAppDispatch();
  const { logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const [showVisibilityPicker, setShowVisibilityPicker] = useState(false);

  // v1 PWA install logic
  const { canInstall, isInstalled, isIOS, promptInstall } = usePwaInstall();
  const [showIOSInstall, setShowIOSInstall] = useState(false);

  // v1 notification permission logic
  const [notificationPermission, setNotificationPermission] =
    useState<NotificationPermission | null>(null);

  useEffect(() => {
    if (typeof Notification !== "undefined") {
      setNotificationPermission(Notification.permission);
    }
  }, [open]);

  const handleRequestNotificationPermission = async () => {
    try {
      // v1: requestNotificationPermission from lib/fcm
      const permission = await requestNotificationPermission();
      setNotificationPermission(permission);
    } catch (err) {
      console.error("Failed to request notification permission:", err);
    }
  };

  const handleInstall = () => {
    if (isIOS) {
      setShowIOSInstall(true);
    } else if (canInstall) {
      promptInstall();
    }
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

  // v1 logic (auth-provider): revoke the refresh token server-side, then clear state
  const handleLogout = async () => {
    if (window.confirm("Bạn có chắc chắn muốn đăng xuất?")) {
      setLoggingOut(true);
      await logout();
      setLoggingOut(false);
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
                      <h3 className="setting-title">Quyền riêng tư</h3>
                      <p className="setting-description">Ai có thể xem vị trí của tôi</p>
                    </div>
                  </div>
                  <div className="setting-item-right">
                    <span className="setting-value">{visibilityLabel}</span>
                    <ChevronRight className="setting-chevron" />
                  </div>
                </button>

                {/* Notifications — v1 permission flow */}
                <div className="setting-item">
                  <div className="setting-info">
                    <div className="setting-icon-wrapper">
                      {notificationPermission === "granted" ? (
                        <Bell className="setting-icon" />
                      ) : (
                        <BellOff className="setting-icon" />
                      )}
                    </div>
                    <div className="setting-details">
                      <h3 className="setting-title">Thông báo</h3>
                      <p className="setting-description">
                        {notificationPermission === "granted"
                          ? "Đã bật thông báo đẩy"
                          : notificationPermission === "denied"
                            ? "Đã chặn trong cài đặt trình duyệt"
                            : "Nhận thông báo đẩy"}
                      </p>
                    </div>
                  </div>
                  {notificationPermission === "granted" ? (
                    <span className="setting-perm-badge granted">Bật</span>
                  ) : notificationPermission === "denied" ? (
                    <span className="setting-perm-badge denied">Tắt</span>
                  ) : (
                    <button
                      onClick={handleRequestNotificationPermission}
                      className="setting-enable-btn"
                    >
                      Bật
                    </button>
                  )}
                </div>
              </div>

              {/* Download app — v1 usePwaInstall, hidden when already installed */}
              {!isInstalled && (
                <>
                  <div className="settings-divider" />
                  <button onClick={handleInstall} className="setting-item setting-item-btn">
                    <div className="setting-info">
                      <div className="setting-icon-wrapper">
                        <Download className="setting-icon" />
                      </div>
                      <div className="setting-details">
                        <h3 className="setting-title">Tải ứng dụng</h3>
                        <p className="setting-description">
                          {canInstall || isIOS
                            ? "Cài đặt để trải nghiệm ứng dụng toàn màn hình"
                            : "Trình duyệt chưa hỗ trợ cài đặt nhanh"}
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
                  <p className="account-label">Tài khoản</p>
                  <p className="account-email">{user?.email || ""}</p>
                </div>
                <Button onClick={handleLogout} variant="outline" className="logout-btn" disabled={loggingOut}>
                  <LogOut className="logout-icon" />
                  {loggingOut ? "Đang đăng xuất..." : "Đăng xuất"}
                </Button>
              </div>
            </>
          )}
        </div>

        {/* iOS install instructions — same steps as v1's PwaInstallButton */}
        {isIOS && (
          <Dialog open={showIOSInstall} onOpenChange={setShowIOSInstall}>
            <DialogContent className="v2-ios-install-dialog">
              <h3 className="ios-install-title">Cài đặt {APP_NAME}</h3>
              <p className="ios-install-sub">Thêm ứng dụng vào màn hình chính để trải nghiệm tốt nhất.</p>
              <ol className="ios-install-steps">
                <li>
                  <span className="ios-step-num">1</span>
                  <span>Nhấn nút Share ở thanh công cụ Safari.</span>
                </li>
                <li>
                  <span className="ios-step-num">2</span>
                  <span>Chọn &ldquo;Thêm vào Màn hình chính&rdquo;.</span>
                </li>
                <li>
                  <span className="ios-step-num">3</span>
                  <span>Nhấn &ldquo;Thêm&rdquo; để hoàn tất.</span>
                </li>
              </ol>
              <button onClick={() => setShowIOSInstall(false)} className="ios-install-done">
                Đã hiểu
              </button>
            </DialogContent>
          </Dialog>
        )}

        <style jsx global>{`
          /* Main settings dialog: flat translucent dark glass
             (no gradient — just blur + dark tint, readable over any bg) */
          .v2-dialog {
            background: rgb(13 17 21 / 0.88) !important;
            backdrop-filter: blur(40px) brightness(0.5) saturate(1.4) !important;
            -webkit-backdrop-filter: blur(40px) brightness(0.5) saturate(1.4) !important;
            border: 1px solid rgb(125 222 208 / 0.2) !important;
            border-radius: 24px !important;
            box-shadow:
              0 12px 44px rgb(0 0 0 / 0.5),
              inset 0 1px 0 rgb(255 255 255 / 0.06) !important;
          }

          /* iOS install dialog: same treatment */
          .v2-ios-install-dialog {
            background: rgb(13 17 21 / 0.88) !important;
            backdrop-filter: blur(40px) brightness(0.5) saturate(1.4) !important;
            -webkit-backdrop-filter: blur(40px) brightness(0.5) saturate(1.4) !important;
            border: 1px solid rgb(125 222 208 / 0.2) !important;
          }

          .setting-perm-badge {
            font-size: 12px;
            font-weight: 700;
            padding: 4px 12px;
            border-radius: 12px;
            flex-shrink: 0;
          }

          .setting-perm-badge.granted {
            background: rgba(34, 197, 94, 0.15);
            color: #22c55e;
          }

          .setting-perm-badge.denied {
            background: rgba(239, 68, 68, 0.15);
            color: #ef4444;
          }

          .setting-enable-btn {
            background: #2BB0AF;
            color: white;
            border: none;
            border-radius: 14px;
            padding: 6px 14px;
            font-size: 12px;
            font-weight: 700;
            cursor: pointer;
            flex-shrink: 0;
            transition: all 0.2s;
          }

          .setting-enable-btn:hover {
            background: #1a8a89;
          }

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

          /* iOS install dialog (v1 steps) */
          .v2-ios-install-dialog {
            background: rgba(20, 20, 20, 0.98) !important;
            border: 1px solid rgba(255, 255, 255, 0.1) !important;
            border-radius: 20px !important;
            padding: 24px !important;
            max-width: 320px;
          }

          .ios-install-title {
            font-size: 17px;
            font-weight: 700;
            color: white;
            margin: 0 0 6px;
          }

          .ios-install-sub {
            font-size: 13px;
            color: rgba(255, 255, 255, 0.6);
            margin: 0 0 16px;
          }

          .ios-install-steps {
            list-style: none;
            padding: 0;
            margin: 0 0 20px;
            display: flex;
            flex-direction: column;
            gap: 12px;
          }

          .ios-install-steps li {
            display: flex;
            align-items: flex-start;
            gap: 10px;
            font-size: 13px;
            color: rgba(255, 255, 255, 0.85);
          }

          .ios-step-num {
            width: 22px;
            height: 22px;
            flex-shrink: 0;
            background: #2BB0AF;
            color: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 11px;
            font-weight: 700;
          }

          .ios-install-done {
            width: 100%;
            background: #2BB0AF;
            color: white;
            border: none;
            border-radius: 12px;
            padding: 12px;
            font-size: 14px;
            font-weight: 700;
            cursor: pointer;
          }

          .ios-install-done:hover {
            background: #1a8a89;
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}
