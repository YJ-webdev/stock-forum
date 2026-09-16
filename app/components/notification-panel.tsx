"use client";

import { Bell } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export function NotificationPanel() {
  return (
    <div className="flex h-full min-h-0 flex-col pt-4">
      <div className="shrink-0 pb-5">
        <div className="flex items-center gap-2">
          <Bell className="size-4 text-zinc-500" />

          <h2 className="text-[16px] font-medium text-zinc-900 dark:text-zinc-100">
            Notifications
          </h2>
        </div>

        <p className="mt-1 text-[13px] text-zinc-500 dark:text-zinc-400">
          Replies, predictions and account activity.
        </p>
      </div>

      <Separator />

      <div className="flex min-h-0 flex-1 items-center justify-center">
        <div className="max-w-60 text-center">
          <div className="mx-auto mb-3 flex size-9 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
            <Bell className="size-4 text-zinc-500" />
          </div>

          <p className="text-[14px] font-medium text-zinc-800 dark:text-zinc-200">
            No notifications yet
          </p>

          <p className="mt-1 text-[12px] leading-5 text-zinc-500">
            Replies and prediction results will appear here.
          </p>
        </div>
      </div>
    </div>
  );
}
