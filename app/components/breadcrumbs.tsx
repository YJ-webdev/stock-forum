"use client";

import { usePathname, useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";

import { useCurrentUser } from "@/app/context/user-context";
import { ALL_MARKET_SYMBOLS } from "@/lib/data/market-symbols";
import { resolveLanguage } from "@/lib/data/languages";
import { BREADCRUMB_LABELS, FOOTER_LABELS } from "@/lib/data/translations";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

export const BreadCrumbs = () => {
  const router = useRouter();
  const pathname = usePathname();
  const user = useCurrentUser();

  const language = resolveLanguage(user?.language);
  const labels = BREADCRUMB_LABELS[language];
  const footerLabels = FOOTER_LABELS[language];

  const pageLabels: Record<string, string> = {
    help: footerLabels.help,
    feedback: footerLabels.feedback,
    "privacy-terms": footerLabels.privacy_terms,
    disclaimer: footerLabels.disclaimer,
    news: labels.news,
  };

  const segments = pathname.split("/").filter(Boolean);
  const isMarketRoute = segments[0] === "market";

  const rawRouteSymbol = isMarketRoute ? (segments[1] ?? null) : null;

  let routeSymbol: string | null = null;

  if (rawRouteSymbol) {
    try {
      routeSymbol = decodeURIComponent(rawRouteSymbol);
    } catch {
      routeSymbol = null;
    }
  }

  const matchedMarketItem = routeSymbol
    ? ALL_MARKET_SYMBOLS.find(
        (item) =>
          item.symbol === routeSymbol ||
          item.displaySymbol?.toLowerCase() === routeSymbol.toLowerCase(),
      )
    : undefined;

  const items: BreadcrumbItem[] = [];

  if (matchedMarketItem) {
    const marketHref = `/market/${encodeURIComponent(
      matchedMarketItem.symbol,
    )}`;

    const childPage = segments[2];

    items.push({
      label: matchedMarketItem.name,
      href: childPage ? marketHref : undefined,
    });

    if (childPage === "news") {
      items.push({ label: labels.news });
    }

    if (childPage === "post") {
      items.push({ label: labels.post });
    }
  } else if (!isMarketRoute) {
    const pageLabel = pageLabels[segments[0]];

    if (pageLabel) {
      items.push({ label: pageLabel });
    }
  }

  return (
    <div
      className="
        sticky top-0 z-20
        flex w-full items-center justify-between
        bg-white px-4 py-3 dark:bg-zinc-900
      "
    >
      <nav
        aria-label={labels.breadcrumb}
        className="
          flex min-w-0 items-center gap-2
          text-sm font-medium text-zinc-500
          dark:text-zinc-300
        "
      >
        <button
          type="button"
          onClick={() => router.push("/")}
          aria-current={pathname === "/" ? "page" : undefined}
          className="
            shrink-0 cursor-pointer transition-colors
            hover:text-zinc-900 dark:hover:text-zinc-100
          "
        >
          {labels.home}
        </button>

        {items.map((item, index) => {
          const href = item.href;
          const isLast = index === items.length - 1;

          return (
            <div
              key={`${item.label}-${index}`}
              className="flex min-w-0 items-center gap-2"
            >
              <ChevronRight aria-hidden="true" className="size-4 shrink-0" />

              {href ? (
                <button
                  type="button"
                  onClick={() => router.push(href)}
                  className="
                    truncate cursor-pointer transition-colors
                    hover:text-zinc-900 dark:hover:text-zinc-100
                  "
                >
                  {item.label}
                </button>
              ) : (
                <span
                  aria-current={isLast ? "page" : undefined}
                  className="truncate"
                >
                  {item.label}
                </span>
              )}
            </div>
          );
        })}
      </nav>
    </div>
  );
};
