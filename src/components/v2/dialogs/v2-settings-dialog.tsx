"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { X } from "lucide-react";

interface V2SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function V2SettingsDialog({ open, onOpenChange }: V2SettingsDialogProps) {
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
          <p className="dialog-description">Customize your app experience</p>
          <div className="dialog-options">
            <div className="dialog-option">
              <span className="option-label">Location Visibility</span>
              <span className="option-value">Friends</span>
            </div>
            <div className="dialog-option">
              <span className="option-label">Notifications</span>
              <span className="option-value">On</span>
            </div>
            <div className="dialog-option">
              <span className="option-label">Theme</span>
              <span className="option-value">Dark</span>
            </div>
            <div className="dialog-option">
              <span className="option-label">Language</span>
              <span className="option-value">English</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}