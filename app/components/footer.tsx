"use client";

import { useCurrentUser } from "@/app/context/user-context";
import { resolveLanguage } from "@/lib/data/languages";
import { FOOTER_LABELS } from "@/lib/data/translations";

export const Footer = () => {
  const user = useCurrentUser();
  const labels = FOOTER_LABELS[resolveLanguage(user?.language)];

  return (
    <footer
      className="
        flex shrink-0 flex-wrap items-center justify-center
        gap-x-5 gap-y-1 bg-white px-4
        pb-[max(0.625rem,env(safe-area-inset-bottom))]
        text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300
      "
    >
      <button type="button" className="cursor-pointer text-sm tracking-tight">
        {labels.help}
      </button>

      <button type="button" className="cursor-pointer text-sm tracking-tight">
        {labels.feedback}
      </button>

      <button type="button" className="cursor-pointer text-sm tracking-tight">
        {labels.privacy_terms}
      </button>

      <button type="button" className="cursor-pointer text-sm tracking-tight">
        {labels.disclaimer}
      </button>
    </footer>
  );
};
