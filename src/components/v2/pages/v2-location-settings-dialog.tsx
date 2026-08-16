"use client";

import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Eye, MessageSquare, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { useActiveUsers } from "@/hooks/location/use-active-users";
import { LOCATION_SORT } from "@/services/location";
import { locationHub } from "@/lib/signalr";
import {
  LOCATION_VISIBILITY_LABELS,
  type LocationVisibilityValue,
  LOCATION_VISIBILITY_VALUES,
} from "@/lib/signalr/types";
import { setMyVisibility, setMyStatus, setMyBattery } from "@/store/slices/location-slice";

const STATUS_MAX_LENGTH = 50;
const VISIBILITY_OPTIONS = Object.entries(LOCATION_VISIBILITY_LABELS) as [string, string][];

interface V2LocationSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function V2LocationSettingsDialog({ open, onOpenChange }: V2LocationSettingsDialogProps) {
  const dispatch = useAppDispatch();
  const visibility = useAppSelector((s) => s.location.visibility);
  const status = useAppSelector((s) => s.location.status);
  const battery = useAppSelector((s) => s.location.battery);
  const user = useAppSelector((s) => s.auth.user);

  const {
    data: activeUsers,
    isLoading: loadingActiveUsers,
    refetch: refetchActiveUsers,
  } = useActiveUsers(20, LOCATION_SORT.Distance);

  const nearbyFriends = activeUsers.filter((u) => u.userId !== user?.id);

  const [statusValue, setStatusValue] = useState(status ?? "");
  const [savingStatus, setSavingStatus] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Expand/collapse sections
  const [visibilityExpanded, setVisibilityExpanded] = useState(false);
  const [statusExpanded, setStatusExpanded] = useState(false);

  const visibilityLabel =
    LOCATION_VISIBILITY_LABELS[visibility as LocationVisibilityValue] ??
    LOCATION_VISIBILITY_LABELS[LOCATION_VISIBILITY_VALUES.Public];

  const handleVisibilityChange = async (value: number) => {
    dispatch(setMyVisibility(value as LocationVisibilityValue));
    try {
      await locationHub.updateVisibility(value);
    } finally {
      setVisibilityExpanded(false);
    }
  };

  const handleSaveStatus = async () => {
    const text = statusValue.trim().slice(0, STATUS_MAX_LENGTH);
    setSavingStatus(true);
    try {
      await locationHub.updateStatus(text);
      dispatch(setMyStatus(text || null));
      setStatusExpanded(false);
    } catch (err) {
      console.error("[StatusEditor] UpdateStatus error:", err);
    } finally {
      setSavingStatus(false);
    }
  };

  const handleClearStatus = async () => {
    setSavingStatus(true);
    try {
      await locationHub.updateStatus("");
      dispatch(setMyStatus(null));
      setStatusValue("");
      setStatusExpanded(false);
    } catch (err) {
      console.error("[StatusEditor] Clear status error:", err);
    } finally {
      setSavingStatus(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refetchActiveUsers();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="v2-location-settings-dialog" showCloseButton={false}>
        <div className="settings-content">
          {/* Friends Count */}
          <div className="settings-section">
            <div className="settings-item">
              <span className="settings-label">Bạn bè ở gần</span>
              <span className="settings-value">{nearbyFriends.length}</span>
            </div>
          </div>

          {/* Refresh */}
          <div className="settings-section">
            <div className="settings-item">
              <span className="settings-label">Làm mới</span>
              <button
                onClick={handleRefresh}
                disabled={refreshing || loadingActiveUsers}
                className="settings-action-btn"
              >
                <RefreshCw className={`settings-action-icon ${refreshing ? 'spinning' : ''}`} />
              </button>
            </div>
          </div>

          {/* Visibility */}
          <div className="settings-section">
            <button
              onClick={() => setVisibilityExpanded(!visibilityExpanded)}
              className="settings-item settings-item-expandable"
            >
              <div className="settings-item-left">
                <Eye className="settings-item-icon" />
                <span className="settings-label">Quyền riêng tư</span>
              </div>
              <div className="settings-item-right">
                <span className="settings-value">{visibilityLabel}</span>
                {visibilityExpanded ? (
                  <ChevronUp className="settings-chevron" />
                ) : (
                  <ChevronDown className="settings-chevron" />
                )}
              </div>
            </button>

            {visibilityExpanded && (
              <div className="settings-expanded">
                {VISIBILITY_OPTIONS.map(([value, label]) => {
                  const numericValue = Number(value);
                  const active = numericValue === visibility;
                  return (
                    <button
                      key={value}
                      onClick={() => handleVisibilityChange(numericValue)}
                      className={`settings-option ${active ? 'active' : ''}`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Status */}
          <div className="settings-section">
            <button
              onClick={() => {
                if (!statusExpanded) setStatusValue(status ?? "");
                setStatusExpanded(!statusExpanded);
              }}
              className="settings-item settings-item-expandable"
            >
              <div className="settings-item-left">
                <MessageSquare className="settings-item-icon" />
                <span className="settings-label">Trạng thái</span>
              </div>
              <div className="settings-item-right">
                <span className="settings-value">{status || "Đặt trạng thái"}</span>
                {statusExpanded ? (
                  <ChevronUp className="settings-chevron" />
                ) : (
                  <ChevronDown className="settings-chevron" />
                )}
              </div>
            </button>

            {statusExpanded && (
              <div className="settings-expanded">
                <input
                  value={statusValue}
                  onChange={(e) => setStatusValue(e.target.value)}
                  maxLength={STATUS_MAX_LENGTH}
                  placeholder="VD: Đang đi làm, Đừng làm phiền"
                  className="settings-input"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSaveStatus();
                    }
                  }}
                />
                <div className="settings-input-footer">
                  <span className="settings-input-count">{statusValue.length}/{STATUS_MAX_LENGTH}</span>
                  <div className="settings-input-actions">
                    <button
                      onClick={handleSaveStatus}
                      disabled={savingStatus}
                      className="settings-input-btn settings-input-save"
                    >
                      Save
                    </button>
                    {status && (
                      <button
                        onClick={handleClearStatus}
                        disabled={savingStatus}
                        className="settings-input-btn settings-input-clear"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Battery Info */}
          {battery != null && (
            <div className="settings-section">
              <div className="settings-item">
                <span className="settings-label">Pin</span>
                <span className="settings-value">{battery}%</span>
              </div>
            </div>
          )}
        </div>

        <style jsx global>{`
          .v2-location-settings-dialog {
            background: rgba(10, 10, 10, 0.95);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 24px 24px 0 0;
            max-width: 400px;
            width: calc(100% - 32px);
            position: fixed;
            top: 0;
            left: 50%;
            transform: translateX(-50%);
            max-height: 80vh;
            display: flex;
            flex-direction: column;
          }

          .settings-content {
            flex: 1;
            overflow-y: auto;
            padding: 16px 16px;
            padding-top: calc(16px + env(safe-area-inset-top, 0px));
          }

          .settings-section {
            margin-bottom: 8px;
          }

          .settings-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px 16px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            transition: background 0.2s;
          }

          .settings-item:hover {
            background: rgba(255, 255, 255, 0.08);
          }

          .settings-item-expandable {
            cursor: pointer;
            padding: 12px 16px;
          }

          .settings-item-left {
            display: flex;
            align-items: center;
            gap: 12px;
            flex: 1;
            min-width: 0;
          }

          .settings-item-icon {
            width: 16px;
            height: 16px;
            color: #2BB0AF;
            flex-shrink: 0;
          }

          .settings-label {
            font-size: 14px;
            font-weight: 500;
            color: rgba(255, 255, 255, 0.9);
          }

          .settings-item-right {
            display: flex;
            align-items: center;
            gap: 8px;
          }

          .settings-value {
            font-size: 13px;
            color: rgba(255, 255, 255, 0.6);
          }

          .settings-chevron {
            width: 16px;
            height: 16px;
            color: rgba(255, 255, 255, 0.5);
            transition: transform 0.3s;
          }

          .settings-action-btn {
            width: 36px;
            height: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(43, 176, 175, 0.15);
            border: 1px solid rgba(43, 176, 175, 0.3);
            border-radius: 50%;
            color: #2BB0AF;
            cursor: pointer;
            transition: all 0.3s;
            padding: 0;
          }

          .settings-action-btn:hover:not(:disabled) {
            background: rgba(43, 176, 175, 0.25);
            transform: scale(1.05);
          }

          .settings-action-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          .settings-action-icon {
            width: 16px;
            height: 16px;
          }

          .settings-action-icon.spinning {
            animation: spin 1s linear infinite;
          }

          @keyframes spin {
            to { transform: rotate(360deg); }
          }

          .settings-expanded {
            margin-top: 8px;
            background: rgba(0, 0, 0, 0.3);
            border-radius: 12px;
            overflow: hidden;
          }

          .settings-option {
            width: 100%;
            padding: 12px 16px;
            text-align: right;
            background: none;
            border: none;
            color: rgba(255, 255, 255, 0.8);
            font-size: 14px;
            cursor: pointer;
            transition: all 0.2s;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          }

          .settings-option:last-child {
            border-bottom: none;
          }

          .settings-option:hover {
            background: rgba(43, 176, 175, 0.1);
          }

          .settings-option.active {
            color: #2BB0AF;
            font-weight: 600;
          }

          .settings-input {
            width: 100%;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 8px;
            padding: 12px;
            color: white;
            font-size: 14px;
            outline: none;
          }

          .settings-input::placeholder {
            color: rgba(255, 255, 255, 0.4);
          }

          .settings-input:focus {
            border-color: rgba(43, 176, 175, 0.5);
            box-shadow: 0 0 0 2px rgba(43, 176, 175, 0.2);
          }

          .settings-input-footer {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-top: 8px;
            padding: 0 4px;
          }

          .settings-input-count {
            font-size: 11px;
            color: rgba(255, 255, 255, 0.4);
          }

          .settings-input-actions {
            display: flex;
            gap: 8px;
          }

          .settings-input-btn {
            padding: 6px 12px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            border: none;
          }

          .settings-input-save {
            background: rgba(43, 176, 175, 0.9);
            color: white;
          }

          .settings-input-save:hover:not(:disabled) {
            background: rgba(43, 176, 175, 1);
          }

          .settings-input-save:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          .settings-input-clear {
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            color: white;
          }

          .settings-input-clear:hover:not(:disabled) {
            background: rgba(255, 255, 255, 0.15);
          }

          .settings-input-clear:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}
