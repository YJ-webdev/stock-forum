"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Ban } from "lucide-react";
import { toast } from "sonner";

import { banUser } from "@/app/actions/user-moderation";

interface BanTarget {
  id: string;
  name: string;
}

interface BanUserDialogProps {
  target: BanTarget;
  onClose: () => void;
}

export function BanUserDialog({ target, onClose }: BanUserDialogProps) {
  const router = useRouter();

  const dialogRef = useRef<HTMLDialogElement>(null);
  const submittingRef = useRef(false);

  const titleId = useId();
  const descriptionId = useId();
  const reasonId = useId();

  const [reason, setReason] = useState("");
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) return;

    if (!dialog.open) {
      dialog.showModal();
    }

    return () => {
      dialog.close();
    };
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submittingRef.current) return;

    const trimmedReason = reason.trim();

    if (!trimmedReason || trimmedReason.length > 500) {
      return;
    }

    submittingRef.current = true;
    setIsPending(true);

    try {
      await banUser({
        userId: target.id,
        reason: trimmedReason,
      });
    } catch (error) {
      submittingRef.current = false;
      setIsPending(false);

      toast.error(
        error instanceof Error ? error.message : "Failed to ban this user.",
      );

      return;
    }

    toast.success("User banned.");
    router.refresh();
    onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={(event) => {
        event.preventDefault();

        if (!submittingRef.current) {
          onClose();
        }
      }}
      className="
        fixed inset-0 m-auto
        max-h-[calc(100dvh-2rem)]
        w-[calc(100%-2rem)] max-w-md
        overflow-y-auto rounded-xl
        border border-zinc-200 bg-white p-0
        text-zinc-900 shadow-xl
        backdrop:bg-black/50
        dark:border-zinc-800 dark:bg-zinc-950
        dark:text-zinc-100
      "
    >
      <form onSubmit={handleSubmit} className="p-5">
        <div className="flex items-center gap-2">
          <Ban aria-hidden="true" className="size-5 shrink-0 text-red-500" />

          <h2 id={titleId} className="min-w-0 text-lg font-semibold">
            Ban user
          </h2>
        </div>

        <p
          id={descriptionId}
          className="mt-3 text-sm text-zinc-600 dark:text-zinc-400"
        >
          Ban{" "}
          <span className="font-semibold wrap-break-word">{target.name}</span>?
          This ban remains in effect until an administrator removes it.
        </p>

        <label htmlFor={reasonId} className="mt-5 block text-sm font-medium">
          Reason
        </label>

        <textarea
          id={reasonId}
          autoFocus
          required
          maxLength={500}
          rows={4}
          value={reason}
          disabled={isPending}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Explain why this user is being banned."
          className="
            mt-2 block w-full resize-none rounded-lg
            border border-zinc-300 bg-transparent
            px-3 py-2 text-[15px]
            outline-none
            focus-visible:ring-2 focus-visible:ring-zinc-400
            disabled:opacity-50
            dark:border-zinc-700
          "
        />

        <p className="mt-1 text-right text-xs tabular-nums text-zinc-400">
          {reason.length}/500
        </p>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            disabled={isPending}
            onClick={onClose}
            className="
              cursor-pointer rounded-lg border
              border-zinc-300 px-4 py-2 text-sm
              hover:bg-zinc-100
              disabled:cursor-default disabled:opacity-50
              dark:border-zinc-700 dark:hover:bg-zinc-800
            "
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={isPending || !reason.trim()}
            className="
              inline-flex cursor-pointer items-center
              justify-center gap-2 rounded-lg
              bg-red-600 px-4 py-2
              text-sm font-medium text-white
              hover:bg-red-700
              disabled:cursor-default disabled:opacity-50
            "
          >
            <Ban aria-hidden="true" className="size-4" />
            {isPending ? "Banning…" : "Ban user"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
