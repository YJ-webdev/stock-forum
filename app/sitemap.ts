// app/sitemap.ts

import type { MetadataRoute } from "next";
import { ALL_MARKET_SYMBOLS } from "@/lib/data/market-symbols";

const SITE_URL = "https://bullbearvote.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const symbols = [
    ...new Set(ALL_MARKET_SYMBOLS.map((market) => market.symbol)),
  ];

  const marketPages: MetadataRoute.Sitemap = symbols.map((symbol) => {
    const marketPath = `/market/${encodeURIComponent(symbol)}`;

    return {
      url: `${SITE_URL}${marketPath}`,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 1.0,
    };
  });

  const homePage: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/`,
      lastModified: new Date(),
      changeFrequency: "always",
      priority: 0.9,
    },
  ];

  const staticPaths = [
    "/help",
    "/feedback",
    "/disclaimer",
    "/privacy-terms",
  ] as const;

  const publicPages: MetadataRoute.Sitemap = staticPaths.map((path) => ({
    url: new URL(path, SITE_URL).href,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: 0.3,
  }));

  return [...marketPages, ...homePage, ...publicPages];
}
