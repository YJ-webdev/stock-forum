"use client";

import { ALL_MARKET_SYMBOLS } from "@/lib/data/market-symbols";
import { ChevronRight } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export const BreadCrumbs = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const segments = pathname.split("/").filter(Boolean);

  const section = segments[0];

  // -------------------------
  // Market
  // -------------------------

  const selectedSymbol = searchParams.get("symbol") ?? "^GSPC";

  const matchedMarketItem = ALL_MARKET_SYMBOLS.find(
    (item) => item.symbol === selectedSymbol,
  );

  const selectedDisplaySymbol =
    matchedMarketItem?.displaySymbol ?? selectedSymbol;

  // -------------------------
  // Forum
  // -------------------------

  const forumSlug = section === "forum" ? segments[1] : null;

  const matchedForumItem = forumSlug
    ? ALL_MARKET_SYMBOLS.find(
        (item) => item.displaySymbol?.toLowerCase() === forumSlug.toLowerCase(),
      )
    : null;

  const forumDisplaySymbol = matchedForumItem?.displaySymbol ?? forumSlug;

  // -------------------------
  // Breadcrumb items
  // -------------------------

  const items: { label: string; href?: string }[] = [];

  if (section === "market") {
    items.push({
      label: selectedDisplaySymbol,
    });
  }

  if (section === "news") {
    items.push({
      label: "News",
    });
  }

  if (section === "forum") {
    items.push({
      label: "Forum",
      href: "/forum",
    });

    if (forumDisplaySymbol) {
      items.push({
        label: forumDisplaySymbol,
        href: `/forum/${forumSlug}`,
      });
    }

    if (segments[2] === "post") {
      items.push({
        label: "Post",
      });
    }
  }

  return (
    <div className="mb-10 flex items-center justify-between bg-white dark:bg-zinc-900">
      <div className="flex items-center gap-2 text-sm font-medium text-zinc-500 dark:text-zinc-300">
        <button
          onClick={() => router.push("/")}
          className="cursor-pointer transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          Home
        </button>

        {items.map((item, index) => (
          <div
            key={`${item.label}-${index}`}
            className="flex items-center gap-2"
          >
            <ChevronRight className="h-4 w-4" />

            {item.href ? (
              <button
                onClick={() => router.push(item.href!)}
                className="cursor-pointer transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                {item.label}
              </button>
            ) : (
              <span>{item.label}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
