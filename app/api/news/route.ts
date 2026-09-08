import { NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance();

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
      if (!hostname.includes("yahoo.com")) {
        return hostname;
      }
    } catch {
      // Invalid URL syntax
    }
  }

  return "finance.yahoo.com";
}

export async function GET() {
  try {
    const result = await yahooFinance.search("stock market", { newsCount: 5 });

    const formattedNews = (result.news || []).map((item) => {
      const domain = getPublisherDomain(item.publisher, item.link);

      // Use unpkg clearbit or google favicon service with sz=64
      const sourceIcon = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;

      return {
        id: item.uuid,
        title: item.title,
        source: item.publisher || "Yahoo Finance",
        category: "Market News",
        timeAgo: new Date(item.providerPublishTime).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        url: item.link,
        sourceIcon,
      };
    });

    return NextResponse.json(formattedNews);
  } catch (error) {
    console.error("Failed to fetch news:", error);
    return NextResponse.json(
      { error: "Failed to fetch news" },
      { status: 500 },
    );
  }
}
