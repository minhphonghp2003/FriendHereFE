"use client";
import { useEffect, useState } from "react";
import type { AxiosError } from "axios";
import { appHub } from "@/lib/signalr/app-hub";
import { useConfirmJoinRequest } from "@/hooks/chat";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { useAppSelector } from "@/store/hooks";
import type { JoinRequestDto } from "@/types/chat";
import { JoinRequestResult } from "@/types/chat";
import { handleApiError } from "@/lib/axios";

const getNameDisplay = (name: string) => {
  const cleaned = name.trim();
  return cleaned.length > 4 ? cleaned.slice(0, 4) : cleaned;
};

export function JoinRequestNotifications() {
  const { mutate: confirmJoinRequest } = useConfirmJoinRequest();
  const conversations = useAppSelector((s) => s.chat.conversations);
  const [requests, setRequests] = useState<JoinRequestDto[]>([]);
  const [processingId, setProcessingId] = useState<number | null>(null);

  useEffect(() => {
    const unsubProcessed = appHub.onReceiveJoinRequestProcessed((data) => {
      const convName = data.conversationName ?? "nhóm";
      if (data.result === JoinRequestResult.Approved) {
        toast.success(`Yêu cầu tham gia nhóm "${convName}" đã được chấp nhận`);
      } else {
        toast.error(`Yêu cầu tham gia nhóm "${convName}" đã bị từ chối`);
      }
    });
    return () => {
      unsubProcessed();
    };
  }, []);

  const handleConfirm = async (req: JoinRequestDto, isApproved: boolean) => {
    setProcessingId(req.id);
    try {
      await confirmJoinRequest(req.id, isApproved);
      setRequests((prev) => prev.filter((r) => r.id !== req.id));
      toast.success(
        isApproved ? `Đã thêm ${req.userName} vào nhóm` : `Đã từ chối yêu cầu của ${req.userName}`,
      );
    } catch (err) {
      toast.error(handleApiError(err as AxiosError).message || "Không thể xử lý yêu cầu tham gia");
    } finally {
      setProcessingId(null);
    }
  };

  const groupName = (conversationId: number) =>
    conversations.find((c) => c.id === conversationId)?.name ?? "nhóm của bạn";

  const closeRequest = (id: number) => {
    setRequests((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <Dialog
      open={requests.length > 0}
      onOpenChange={(next) => {
        if (!next) setRequests([]);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Yêu cầu tham gia nhóm</DialogTitle>
        </DialogHeader>
        <div className="flex max-h-72 flex-col gap-2 overflow-y-auto">
          {requests.map((req) => {
            const processing = processingId === req.id;
            return (
              <div
                key={req.id}
                className="border-border flex items-center gap-3 rounded-lg border p-3"
              >
                <div className="bg-muted text-muted-foreground flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full text-sm font-bold">
                  {req.userImage?.thumbUrl ? (
                    <img
                      src={req.userImage.thumbUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    getNameDisplay(req.userName ?? "")
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{req.userName}</p>
                  <p className="text-muted-foreground truncate text-xs">
                    muốn tham gia {groupName(req.conversationId)}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <Button size="sm" disabled={processing} onClick={() => handleConfirm(req, true)}>
                    {processing ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Check className="h-3.5 w-3.5" />
                    )}
                    Duyệt
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={processing}
                    onClick={() => handleConfirm(req, false)}
                  >
                    <X className="h-3.5 w-3.5" />
                    Từ chối
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={processing}
                    className="px-2"
                    onClick={() => closeRequest(req.id)}
                    aria-label="Đóng"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => setRequests([])}
          >
            Đóng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
