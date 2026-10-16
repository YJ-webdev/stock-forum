"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Ban, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { banUser, unbanUser } from "@/app/actions/user-moderation";

const BAN_REASONS = [
  {
    value: "abusive",
    label: "Abusive or violent content",
  },
  {
    value: "harassment",
    label: "Harassment or hate speech",
  },
  {
    value: "advertising",
    label: "Advertising or spam",
  },
  {
    value: "scam",
    label: "Scams or deceptive content",
  },
  {
    value: "inappropriate",
    label: "Sexual or inappropriate content",
  },
  {
    value: "impersonation",
    label: "Impersonation",
  },
  {
    value: "repeated_violations",
    label: "Repeated community rule violations",
  },
  {
    value: "other",
    label: "Other community rule violation",
  },
] as const;

const UNBAN_REASONS = [
  {
    value: "reviewed",
    label: "Reviewed and approved for reinstatement",
  },
  {
    value: "mistake",
    label: "Ban applied in error",
  },
  {
    value: "appeal",
    label: "Appeal accepted",
  },
  {
    value: "other",
    label: "Other reason",
  },
] as const;

interface BanUserDialogProps {
  target: {
    id: string;
    name: string;
    isBanned?: boolean;
  };
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

  const isUnban = target.isBanned === true;
  const actionLabel = isUnban ? "Unban user" : "Ban user";
  const Icon = isUnban ? RotateCcw : Ban;

  const reasons = isUnban ? UNBAN_REASONS : BAN_REASONS;

  const selectedReason = reasons.find((item) => item.value === reason);

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

  function handleClose() {
    if (submittingRef.current) return;

    onClose();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submittingRef.current || !selectedReason) return;

    const submittedReason = selectedReason.label;

    submittingRef.current = true;
    setIsPending(true);

    try {
      const action = isUnban ? unbanUser : banUser;

      await action({
        userId: target.id,
        reason: submittedReason,
      });
    } catch (error) {
      submittingRef.current = false;
      setIsPending(false);

      toast.error(
        error instanceof Error ? error.message : "Failed to update this user.",
      );

      return;
    }

    toast.success(isUnban ? "User unbanned." : "User banned.");

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
        handleClose();
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
          <Icon
            aria-hidden="true"
            className={`size-5 shrink-0 ${
              isUnban ? "text-emerald-500" : "text-red-500"
            }`}
          />

          <h2 id={titleId} className="text-lg font-semibold">
            {actionLabel}
          </h2>
        </div>

        <p
          id={descriptionId}
          className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-400"
        >
          {isUnban ? "Unban " : "Ban "}
          <span className="font-semibold wrap-break-word">
            {target.name}
          </span>?{" "}
          {isUnban
            ? "This restores their ability to post comments and replies."
            : "This restricts their ability to post comments and replies until an administrator removes the ban."}
        </p>

        <label htmlFor={reasonId} className="mt-5 block text-sm font-medium">
          Reason
        </label>

        <select
          id={reasonId}
          autoFocus
          required
          value={reason}
          disabled={isPending}
          onChange={(event) => setReason(event.target.value)}
          className="
            mt-2 block min-h-11 w-full
            cursor-pointer rounded-lg
            border border-zinc-100 bg-white
            px-3 py-2 text-[15px] text-zinc-900
            outline-none
            focus-visible:ring-2 focus-visible:ring-zinc-400
            disabled:cursor-default disabled:opacity-50
            dark:border-zinc-700 dark:bg-zinc-950
            dark:text-zinc-100
          "
        >
          <option value="" disabled>
            Select a reason
          </option>

          {reasons.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>

        {!isUnban && (
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
            The selected reason will be included in the user's notification.
          </p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            disabled={isPending}
            onClick={handleClose}
            className="
              cursor-pointer rounded-lg border
              border-zinc-100 px-4 py-2 text-sm
              hover:bg-zinc-100
              disabled:cursor-default disabled:opacity-50
              dark:border-zinc-700 dark:hover:bg-zinc-800
            "
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={isPending || !selectedReason}
            className={`
              inline-flex cursor-pointer items-center
              justify-center gap-2 rounded-lg
              px-4 py-2 text-sm font-medium text-white
              disabled:cursor-default disabled:opacity-50
              ${
                isUnban
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-red-600 hover:bg-red-700"
              }
            `}
          >
            <Icon aria-hidden="true" className="size-4" />

            {isPending ? (isUnban ? "Unbanning…" : "Banning…") : actionLabel}
          </button>
        </div>
      </form>
    </dialog>
  );
}
