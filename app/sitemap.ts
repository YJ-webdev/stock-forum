import type { MetadataRoute } from "next";

import { ALL_MARKET_SYMBOLS } from "@/lib/data/market-symbols";

const SITE_URL = "https://bullbearvote.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const symbols = [
    ...new Set(ALL_MARKET_SYMBOLS.map((market) => market.symbol)),
  ];

  const marketPages: MetadataRoute.Sitemap = symbols.map((symbol) => ({
    url: `${SITE_URL}/market/${encodeURIComponent(symbol)}`,
    changeFrequency: "hourly",
    priority: 1.0,
  }));

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/about`,
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];

  return [...marketPages, ...staticPages];
}
