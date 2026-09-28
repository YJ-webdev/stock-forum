"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";

import { ALL_MARKET_SYMBOLS } from "@/lib/data/market-symbols";

export const BreadCrumbs = () => {
  const router = useRouter();
  const pathname = usePathname();

  const segments = pathname.split("/").filter(Boolean);

  // ---------------------------------------------------------------------------
  // Market symbol
  // ---------------------------------------------------------------------------

  const rawRouteSymbol = segments[0] ?? null;

  // pathname can contain encoded symbols such as %5EN225
  const routeSymbol = rawRouteSymbol
    ? decodeURIComponent(rawRouteSymbol)
    : null;

  const matchedMarketItem = routeSymbol
    ? ALL_MARKET_SYMBOLS.find(
        (item) =>
          item.symbol === routeSymbol ||
          item.displaySymbol?.toLowerCase() === routeSymbol.toLowerCase(),
      )
    : null;

  const routeDisplaySymbol = matchedMarketItem?.displaySymbol ?? routeSymbol;

  // ---------------------------------------------------------------------------
  // Breadcrumb items
  // ---------------------------------------------------------------------------

  const items: {
    label: string;
    href?: string;
  }[] = [];

  if (routeSymbol && routeDisplaySymbol) {
    const marketHref = `/${encodeURIComponent(
      matchedMarketItem?.symbol ?? routeSymbol,
    )}`;

    // Market
    items.push({
      label: routeDisplaySymbol,

      // Only clickable when we're inside a child page
      href: segments.length > 1 ? marketHref : undefined,
    });

    // News
    if (segments[1] === "news") {
      items.push({
        label: "News",
      });
    }

    // Post
    if (segments[1] === "post") {
      items.push({
        label: "Post",
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Scroll border
  // ---------------------------------------------------------------------------

  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };

    handleScroll();

    window.addEventListener("scroll", handleScroll, {
      passive: true,
    });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div
      className={`fixed top-14 z-10 mb-10 flex w-full items-center justify-between
        border-zinc-100 bg-white pl-4 pt-6 pb-2
        dark:border-zinc-800 dark:bg-zinc-900
        ${isScrolled ? "border-b" : ""}
      `}
    >
      <div className="flex items-center gap-2 text-sm font-medium text-zinc-500 dark:text-zinc-300">
        {/* Home */}
        <button
          type="button"
          onClick={() => router.push("/")}
          className="cursor-pointer transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          Home
        </button>

        {/* Breadcrumb items */}
        {items.map((item, index) => (
          <div
            key={`${item.label}-${index}`}
            className="flex items-center gap-2"
          >
            <ChevronRight className="h-4 w-4" />

            {item.href ? (
              <button
                type="button"
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
