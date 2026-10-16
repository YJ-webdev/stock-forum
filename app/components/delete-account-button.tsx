"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { signOut } from "next-auth/react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deleteAccount } from "@/app/actions/delete-account";

interface DeleteAccountButtonProps {
  disabled?: boolean;
}

export function DeleteAccountButton({
  disabled = false,
}: DeleteAccountButtonProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const submittingRef = useRef(false);

  const titleId = useId();
  const descriptionId = useId();
  const confirmationId = useId();

  const [confirmation, setConfirmation] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  function openDialog() {
    if (disabled || submittingRef.current) return;

    const dialog = dialogRef.current;

    if (!dialog || dialog.open) return;

    setConfirmation("");
    dialog.showModal();
    inputRef.current?.focus();
  }

  function closeDialog() {
    if (submittingRef.current) return;

    dialogRef.current?.close();
    setConfirmation("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submittingRef.current || disabled || confirmation !== "DELETE") {
      return;
    }

    submittingRef.current = true;
    setIsDeleting(true);

    try {
      await deleteAccount(confirmation);
    } catch (error) {
      submittingRef.current = false;
      setIsDeleting(false);

      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to delete your account. Please try again.",
      );

      return;
    }

    // Deletion has succeeded. Keep the form locked while leaving.
    try {
      await signOut({ redirect: false });
    } catch (error) {
      console.error("Failed to clear the deleted account session:", error);
    } finally {
      // A full navigation also clears in-memory user state and caches.
      // auth.ts rejects any remaining JWT for the deleted account.
      window.location.replace("/");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        disabled={disabled || isDeleting}
        className="
          inline-flex cursor-pointer items-center gap-2
          rounded-md px-2 py-2 text-sm
          text-red-600 transition-colors
          hover:bg-red-50
          focus-visible:outline-none
          focus-visible:ring-2 focus-visible:ring-red-400
          disabled:cursor-default disabled:opacity-50
          dark:text-red-400 dark:hover:bg-red-950/30
        "
      >
        <Trash2 className="size-4" aria-hidden="true" />
        Delete account
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onCancel={(event) => {
          event.preventDefault();
          closeDialog();
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
          <h2
            id={titleId}
            className="flex items-center gap-2 text-lg font-semibold"
          >
            <Trash2
              className="size-5 shrink-0 text-red-500"
              aria-hidden="true"
            />
            Delete your account?
          </h2>

          <div
            id={descriptionId}
            className="mt-3 space-y-3 text-sm leading-6 text-zinc-600 dark:text-zinc-400"
          >
            <p>
              This permanently removes your profile information, watchlist,
              points, ranking, and activity history. Your comment and reply
              content will be cleared.
            </p>

            <p>
              An anonymized account record and prediction records remain to
              preserve community threads and market totals. Existing chat bans
              remain in effect.
            </p>

            <p className="font-medium text-red-600 dark:text-red-400">
              This cannot be undone.
            </p>
          </div>

          <label
            htmlFor={confirmationId}
            className="mt-5 block text-sm font-medium"
          >
            Type DELETE to confirm
          </label>

          <input
            ref={inputRef}
            id={confirmationId}
            type="text"
            required
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={6}
            value={confirmation}
            disabled={isDeleting}
            onChange={(event) => setConfirmation(event.target.value)}
            className="
              mt-2 block w-full rounded-lg
              border border-zinc-100 bg-transparent
              px-3 py-2 text-[15px] outline-none
              focus-visible:ring-2 focus-visible:ring-red-400
              disabled:opacity-50
              dark:border-zinc-700
            "
          />

          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={closeDialog}
              disabled={isDeleting}
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
              disabled={disabled || isDeleting || confirmation !== "DELETE"}
              className="
                inline-flex cursor-pointer items-center
                justify-center gap-2 rounded-lg
                bg-red-600 px-4 py-2
                text-sm font-medium text-white
                hover:bg-red-700
                disabled:cursor-default disabled:opacity-50
              "
            >
              {isDeleting ? (
                <span
                  aria-hidden="true"
                  className="
                    size-4 animate-spin rounded-full
                    border-2 border-white/40 border-t-white
                  "
                />
              ) : (
                <Trash2 className="size-4" aria-hidden="true" />
              )}

              {isDeleting ? "Deleting…" : "Delete account"}
            </button>
          </div>

          <span role="status" className="sr-only">
            {isDeleting ? "Deleting your account. Please wait." : ""}
          </span>
        </form>
      </dialog>
    </>
  );
}
