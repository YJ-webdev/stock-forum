"use client";

import { ChevronDown } from "lucide-react";

import { useCurrentUser } from "@/app/context/user-context";
import { resolveLanguage } from "@/lib/data/languages";
import { LOAD_MORE_BUTTON_LABELS } from "@/lib/data/translations";

interface LoadMoreButtonProps {
  loading: boolean;
  onClick: () => void;
}

export function LoadMoreButton({ loading, onClick }: LoadMoreButtonProps) {
  const user = useCurrentUser();
  const language = resolveLanguage(user?.language);
  const labels = LOAD_MORE_BUTTON_LABELS[language];

  return (
    <div className="flex justify-center py-4">
      <button
        type="button"
        onClick={onClick}
        disabled={loading}
        aria-busy={loading}
        className="
          inline-flex cursor-pointer items-center gap-2
          rounded-full px-4 py-2 text-sm text-zinc-500
          transition-colors
          hover:bg-zinc-100 hover:text-zinc-900
          focus-visible:outline-none
          focus-visible:ring-2
          focus-visible:ring-zinc-400
          disabled:cursor-wait disabled:opacity-50
          motion-reduce:transition-none
          dark:text-zinc-400 dark:hover:bg-zinc-800
          dark:hover:text-zinc-100
        "
      >
        {loading ? labels.loading : labels.load_more}

        <ChevronDown className="size-4" strokeWidth={1.5} aria-hidden="true" />
      </button>
    </div>
  );
}
