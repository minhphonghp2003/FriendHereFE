"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { X } from "lucide-react";
import { useSelector } from "react-redux";
import { RootState } from "@/store";

interface V2ProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function V2ProfileDialog({ open, onOpenChange }: V2ProfileDialogProps) {
  const user = useSelector((state: RootState) => state.auth.user);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="v2-dialog">
        <div className="dialog-header">
          <h2 className="dialog-title">Profile</h2>
          <button 
            onClick={() => onOpenChange(false)}
            className="dialog-close-btn"
            aria-label="Close"
          >
            <X className="dialog-close-icon" />
          </button>
        </div>
        <div className="dialog-content">
          <div className="profile-header">
            <div className="profile-avatar">
              {user?.name?.charAt(0) || "?"}
            </div>
            <div className="profile-info">
              <h3 className="profile-name">{user?.name || "User"}</h3>
              <p className="profile-email">{user?.email || ""}</p>
            </div>
          </div>
          <div className="profile-stats">
            <div className="profile-stat">
              <span className="stat-value">142</span>
              <span className="stat-label">Friends</span>
            </div>
            <div className="profile-stat">
              <span className="stat-value">89</span>
              <span className="stat-label">Moments</span>
            </div>
            <div className="profile-stat">
              <span className="stat-value">23</span>
              <span className="stat-label">Active</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}