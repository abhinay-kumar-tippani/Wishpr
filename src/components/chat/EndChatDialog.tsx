"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Flame } from "lucide-react";

interface EndChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isEnding: boolean;
}

export function EndChatDialog({
  open,
  onOpenChange,
  onConfirm,
  isEnding,
}: EndChatDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center mb-2 mx-auto sm:mx-0">
            <Flame className="w-6 h-6" />
          </div>
          <DialogTitle className="text-xl">End This Conversation?</DialogTitle>
          <DialogDescription className="text-sm space-y-2 pt-1 text-muted-foreground">
            <span>
              Ending the chat is <strong>permanent and irreversible</strong> for both participants:
            </span>
            <span className="block list-disc pl-5 space-y-1 text-xs">
              <span className="block">• Message input will be disabled immediately for both of you.</span>
              <span className="block">• A 1-hour retention timer will begin immediately.</span>
              <span className="block">• After 1 hour, all messages, participant logs, and room records will be permanently deleted from the database.</span>
            </span>
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-2 sm:gap-0 pt-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isEnding}
            className="rounded-xl"
          >
            Keep Chatting
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            disabled={isEnding}
            className="rounded-xl bg-red-600 hover:bg-red-700"
          >
            {isEnding ? "Ending Chat..." : "Yes, End Chat"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
