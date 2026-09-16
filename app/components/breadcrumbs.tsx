"use client";

import { useEffect, useState } from "react";
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
  // Asset / [symbol]
  // -------------------------

  const rawRouteSymbol =
    section && section !== "market" && section !== "news" ? section : null;

  // pathname can contain encoded symbols such as %5EN225
  const routeSymbol = rawRouteSymbol
    ? decodeURIComponent(rawRouteSymbol)
    : null;

  const isGeneral = routeSymbol?.toLowerCase() === "general";

  const matchedRouteItem =
    routeSymbol && !isGeneral
      ? ALL_MARKET_SYMBOLS.find(
          (item) =>
            item.symbol === routeSymbol ||
            item.displaySymbol?.toLowerCase() === routeSymbol.toLowerCase(),
        )
      : null;

  const routeDisplaySymbol: string = isGeneral
    ? "General"
    : (matchedRouteItem?.displaySymbol ?? routeSymbol ?? "General");

  // -------------------------
  // Breadcrumb items
  // -------------------------

  const items: { label: string; href?: string }[] = [];

  // /market
  if (section === "market") {
    items.push({
      label: selectedDisplaySymbol,
    });
  }

  // /news/[id]
  if (section === "news") {
    items.push({
      label: "News",
    });
  }

  // /[symbol]
  // /[symbol]/post/[slug]
  if (routeSymbol) {
    items.push({
      label: routeDisplaySymbol,
      href: isGeneral
        ? "/general"
        : `/${matchedRouteItem?.displaySymbol ?? encodeURIComponent(routeSymbol)}`,
    });

    if (segments[1] === "post") {
      items.push({
        label: "Post",
      });
    }
  }

  // -------------------------
  // Scroll border
  // -------------------------

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

  // -------------------------
  // Render
  // -------------------------

  return (
    <div
      className={`fixed top-14 z-10 mb-10 flex w-full items-center justify-between
        border-zinc-100 bg-white pl-3 pt-6 pb-2
        dark:border-zinc-800 dark:bg-zinc-900
        ${isScrolled ? "border-b" : ""}
      `}
    >
      <div className="flex items-center gap-2 text-sm font-medium text-zinc-500 dark:text-zinc-300">
        <button
          type="button"
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
