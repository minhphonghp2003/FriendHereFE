"use client";

import { useState } from "react";
import { Download, Share, Plus } from "lucide-react";

import { usePwaInstall } from "@/hooks/use-pwa-install";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const IOS_INSTRUCTIONS = (
  <ol className="space-y-3 text-sm">
    <li className="flex items-start gap-3">
      <span className="bg-primary text-primary-foreground flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
        1
      </span>
      <span className="flex items-center gap-1.5">
        Nhấn nút
        <Share className="text-primary inline size-4" />
        Share ở thanh công cụ Safari.
      </span>
    </li>
    <li className="flex items-start gap-3">
      <span className="bg-primary text-primary-foreground flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
        2
      </span>
      <span className="flex items-center gap-1.5">
        Chọn
        <Plus className="text-primary inline size-4" />
        &ldquo;Thêm vào Màn hình chính&rdquo;.
      </span>
    </li>
    <li className="flex items-start gap-3">
      <span className="bg-primary text-primary-foreground flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
        3
      </span>
      <span>Nhấn &ldquo;Thêm&rdquo; để hoàn tất.</span>
    </li>
  </ol>
);

function IOSInstallDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cài đặt FriendHere</DialogTitle>
          <DialogDescription>
            Thêm ứng dụng vào màn hình chính để trải nghiệm tốt nhất.
          </DialogDescription>
        </DialogHeader>
        {IOS_INSTRUCTIONS}
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Đã hiểu</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Button-style install trigger for the /init page.
 */
export function PwaInstallButton() {
  const { canInstall, isInstalled, isIOS, promptInstall } = usePwaInstall();
  const [showIOSDialog, setShowIOSDialog] = useState(false);

  if (isInstalled) return null;

  const handleInstall = () => {
    if (isIOS) {
      setShowIOSDialog(true);
    } else if (canInstall) {
      promptInstall();
    }
  };

  // iOS or Android with prompt available
  if (isIOS || canInstall) {
    return (
      <>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground gap-1.5"
          onClick={handleInstall}
        >
          <Download className="size-4" />
          Cài đặt ứng dụng
        </Button>
        {isIOS && <IOSInstallDialog open={showIOSDialog} onOpenChange={setShowIOSDialog} />}
      </>
    );
  }

  // Browser doesn't support quick install yet
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="sm" className="text-muted-foreground gap-1.5" />}
      >
        <Download className="size-4" />
        Cài đặt ứng dụng
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center">
        <DropdownMenuItem disabled className="text-muted-foreground text-xs">
          Trình duyệt chưa hỗ trợ cài đặt nhanh. Hãy thử lại sau.
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Row-style install trigger for the settings page.
 * Renders a full-width row with icon + label, matching the settings UI pattern.
 */
export function PwaInstallRow() {
  const { canInstall, isInstalled, isIOS, promptInstall } = usePwaInstall();
  const [showIOSDialog, setShowIOSDialog] = useState(false);

  if (isInstalled) return null;

  const handleInstall = () => {
    if (isIOS) {
      setShowIOSDialog(true);
    } else if (canInstall) {
      promptInstall();
    }
  };

  return (
    <>
      <button
        onClick={handleInstall}
        className="hover:bg-muted/50 flex w-full items-center gap-4 p-4 text-left"
      >
        <Download className="text-muted-foreground h-5 w-5" />
        <span className="flex-1">Cài đặt ứng dụng</span>
        <span className="text-muted-foreground">›</span>
      </button>
      {isIOS && <IOSInstallDialog open={showIOSDialog} onOpenChange={setShowIOSDialog} />}
    </>
  );
}
