"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";

interface V2ChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function V2ChatDialog({ open, onOpenChange }: V2ChatDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="v2-dialog" showCloseButton={false}>
        <div className="dialog-content dialog-content-full">
          <iframe
            src="/v2/chat"
            className="dialog-iframe"
            title="Chat messages"
          />
        </div>

        <style jsx global>{`
          /* Native-style v2 dialogs: bottom sheet, no title bar */
          .v2-dialog {
            background: rgba(15, 15, 15, 0.97) !important;
            backdrop-filter: blur(30px);
            -webkit-backdrop-filter: blur(30px);
            border: 1px solid rgba(255, 255, 255, 0.1) !important;
            border-radius: 24px 24px 0 0 !important;
            border-bottom: none !important;
            padding: 0 !important;
            max-width: 100% !important;
            width: 100% !important;
            max-height: 92dvh !important;
            height: 92dvh;
            margin: 0 !important;
            position: fixed !important;
            bottom: 0 !important;
            top: auto !important;
            left: 50% !important;
            transform: translateX(-50%) !important;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            animation: v2-sheet-up 0.35s cubic-bezier(0.32, 0.72, 0, 1);
          }

          @keyframes v2-sheet-up {
            from {
              transform: translateX(-50%) translateY(100%);
            }
            to {
              transform: translateX(-50%) translateY(0);
            }
          }

          /* Native grabber handle */
          .v2-dialog::before {
            content: '';
            position: absolute;
            top: 8px;
            left: 50%;
            transform: translateX(-50%);
            width: 40px;
            height: 4px;
            border-radius: 2px;
            background: rgba(255, 255, 255, 0.25);
            z-index: 10;
          }

          .dialog-content {
            flex: 1;
            overflow-y: auto;
            padding: 24px 20px;
            padding-top: calc(24px + env(safe-area-inset-top, 0px) + 8px);
            -webkit-overflow-scrolling: touch;
            -ms-overflow-style: none;
            scrollbar-width: none;
          }

          .dialog-content::-webkit-scrollbar {
            display: none;
          }

          .dialog-content-full {
            padding: 20px 0 0 0;
            padding-top: calc(24px + env(safe-area-inset-top, 0px));
            display: flex;
            flex-direction: column;
          }

          .dialog-iframe {
            flex: 1;
            width: 100%;
            border: none;
            background: transparent;
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}