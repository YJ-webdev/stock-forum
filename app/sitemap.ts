// app/sitemap.ts

import type { MetadataRoute } from "next";

import { ALL_MARKET_SYMBOLS } from "@/lib/data/market-symbols";

const SITE_URL = "https://bullbearvote.com";

const PUBLIC_PATHS = [
  "/",
  "/news",
  "/help",
  "/feedback",
  "/disclaimer",
  "/privacy-terms",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const publicPages: MetadataRoute.Sitemap = PUBLIC_PATHS.map((path) => ({
    url: new URL(path, SITE_URL).href,
  }));

  const symbols = [
    ...new Set(ALL_MARKET_SYMBOLS.map((market) => market.symbol)),
  ];

  const marketPages: MetadataRoute.Sitemap = symbols.flatMap((symbol) => {
    const marketPath = `/market/${encodeURIComponent(symbol)}`;

    return [
      {
        url: `${SITE_URL}${marketPath}`,
      },
    ];
  });

  return [...publicPages, ...marketPages];
}
