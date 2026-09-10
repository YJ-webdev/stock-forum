//Optional API route for client fetches

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface FinnhubNewsItem {
  id: number;
  category: string;
  datetime: number; // Unix timestamp in seconds
  headline: string;
  image: string;
  related: string;
  source: string;
  summary: string;
  url: string;
}

// Known publisher domain mappings
const PUBLISHER_DOMAINS: Record<string, string> = {
  "Investor's Business Daily": "investors.com",
  "Benzinga Prediction Markets": "benzinga.com",
  Benzinga: "benzinga.com",
  TheStreet: "thestreet.com",
  Bloomberg: "bloomberg.com",
  Reuters: "reuters.com",
  "Wall Street Journal": "wsj.com",
  WSJ: "wsj.com",
  BBC: "bbc.com",
  CNBC: "cnbc.com",
  MarketWatch: "marketwatch.com",
  "Yahoo Finance": "finance.yahoo.com",
  "Barron's": "barrons.com",
  "Financial Times": "ft.com",
  Forbes: "forbes.com",
};

function getPublisherDomain(publisher: string, url?: string): string {
  // 1. Check known mappings first
  if (publisher && PUBLISHER_DOMAINS[publisher]) {
    return PUBLISHER_DOMAINS[publisher];
  }

  // 2. Fuzzy match publisher name if not exact
  const lowerPub = (publisher || "").toLowerCase();
  if (lowerPub.includes("investor")) return "investors.com";
  if (lowerPub.includes("benzinga")) return "benzinga.com";
  if (lowerPub.includes("street")) return "thestreet.com";
  if (lowerPub.includes("bloomberg")) return "bloomberg.com";
  if (lowerPub.includes("reuters")) return "reuters.com";
  if (lowerPub.includes("cnbc")) return "cnbc.com";

  // 3. Fallback to URL domain parsing
  if (url) {
    try {
      const hostname = new URL(url).hostname.replace("www.", "");
      return hostname;
    } catch {
      // Invalid URL syntax
    }
  }

  return "finnhub.io";
}

export async function GET() {
  const apiKey = process.env.FINNHUB_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "FINNHUB_API_KEY environment variable missing" },
      { status: 500 },
    );
  }

  try {
    // Categories available: general, forex, crypto, merger
    const res = await fetch(
      `https://finnhub.io/api/v1/news?category=general&token=${apiKey}`,
      { cache: "no-store" },
    );

    if (!res.ok) {
      throw new Error(`Finnhub returned status ${res.status}`);
    }

    const newsData: FinnhubNewsItem[] = await res.json();

    const formattedNews = newsData.slice(0, 5).map((item) => {
      const domain = getPublisherDomain(item.source, item.url);
      const sourceIcon = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;

      return {
        id: item.id.toString(),
        title: item.headline,
        source: item.source || "Market News",
        category: "Market News",
        timeAgo: new Date(item.datetime * 1000).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        url: item.url,
        sourceIcon,
      };
    });

    return NextResponse.json(formattedNews);
  } catch (error) {
    console.error("Failed to fetch news from Finnhub:", error);
    return NextResponse.json(
      { error: "Failed to fetch news" },
      { status: 500 },
    );
  }
}
