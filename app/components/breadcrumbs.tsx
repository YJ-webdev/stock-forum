"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";

import { ALL_MARKET_SYMBOLS } from "@/lib/data/market-symbols";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

export const BreadCrumbs = () => {
  const router = useRouter();
  const pathname = usePathname();

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
      items.push({
        label: "News",
      });
    }

    if (childPage === "post") {
      items.push({
        label: "Post",
      });
    }
  } else if (!isMarketRoute && segments[0] === "news") {
    items.push({
      label: "News",
    });
  }

  return (
    <div
      className={`
        sticky top-0 z-20
        flex w-full items-center justify-between
         px-4 py-3
         bg-white dark:bg-zinc-900
        
       
      `}
    >
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-2 text-sm font-medium text-zinc-500 dark:text-zinc-300"
      >
        <button
          type="button"
          onClick={() => router.push("/")}
          aria-current={pathname === "/" ? "page" : undefined}
          className="cursor-pointer transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          Home
        </button>

        {items.map((item, index) => {
          const href = item.href;
          const isLast = index === items.length - 1;

          return (
            <div
              key={`${item.label}-${index}`}
              className="flex items-center gap-2"
            >
              <ChevronRight aria-hidden="true" className="h-4 w-4" />

              {href ? (
                <button
                  type="button"
                  onClick={() => router.push(href)}
                  className="cursor-pointer transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
                >
                  {item.label}
                </button>
              ) : (
                <span aria-current={isLast ? "page" : undefined}>
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
