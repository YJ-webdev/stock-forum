"use client";

import Link from "next/link";

import { useCurrentUser } from "@/app/context/user-context";
import { resolveLanguage } from "@/lib/data/languages";
import { FOOTER_LABELS } from "@/lib/data/translations";

export const Footer = () => {
  const user = useCurrentUser();
  const labels = FOOTER_LABELS[resolveLanguage(user?.language)];

  const links = [
    { href: "/help", label: labels.help },
    { href: "/feedback", label: labels.feedback },
    { href: "/privacy-terms", label: labels.privacy_terms },
    { href: "/disclaimer", label: labels.disclaimer },
  ];

  return (
    <footer
      className="
        flex shrink-0  flex-wrap-reverse  items-center px-4 sm:mx-0 justify-center
        gap-3 sm:gap-x-5 gap-y-1 bg-white
        pb-[max(0.625rem,env(safe-area-inset-bottom))]
        text-zinc-700 dark:bg-zinc-900 dark:text-zinc-100
      "
    >
      {links.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          className="
            text-sm tracking-tighter sm:tracking-normal transition-colors
            text-zinc-500 
            hover:text-zinc-950
            dark:hover:text-white
          "
        >
          {label}
        </Link>
      ))}
    </footer>
  );
};
