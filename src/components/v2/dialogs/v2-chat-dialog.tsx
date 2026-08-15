"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { X } from "lucide-react";

interface V2ChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function V2ChatDialog({ open, onOpenChange }: V2ChatDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="v2-dialog">
        <div className="dialog-header">
          <h2 className="dialog-title">Messages</h2>
          <button 
            onClick={() => onOpenChange(false)}
            className="dialog-close-btn"
            aria-label="Close"
          >
            <X className="dialog-close-icon" />
          </button>
        </div>
        <div className="dialog-content">
          <iframe 
            src="/v2/chat" 
            className="dialog-iframe"
            title="Chat messages"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}