"use server";

import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

interface MarketauxEntity {
  symbol?: string;
  name?: string;
  type?: string;
  country?: string;
  exchange?: string;
  match_score?: number;
  sentiment_score?: number | null;
}

interface MarketauxArticle {
  uuid: string;
  title: string;
  description?: string | null;
  snippet?: string | null;
  url: string;
  image_url?: string | null;
  language?: string;
  published_at: string;
  source?: string | null;
  entities?: MarketauxEntity[];
}

interface MarketauxResponse {
  meta?: {
    found?: number;
    returned?: number;
    limit?: number;
    page?: number;
  };

  data?: MarketauxArticle[];
}

export interface MarketNewsItem {
  id: string;
  marketSymbol: string;

  title: string;
  summary: string | null;
  imageUrl: string | null;

  source: string;
  sourceIcon: string | null;

  url: string;
  publishedAt: Date;
}

type NewsAssetType = "index" | "crypto" | "currency" | "commodity";

interface NewsContext {
  assetType: NewsAssetType;

  primaryQuery: string;

  searchTerms: string[];

  macroTerms: string[];
}

const MARKETAUX_URL = "https://api.marketaux.com/v1/news/all";
const NEWS_CACHE_TIME_MS = 24 * 60 * 60 * 1000; // 24 hours
const NEWS_HISTORY_DAYS = 7;
const MARKET_PAGE_NEWS_LIMIT = 3;
const NEWS_PAGE_LIMIT = 21;

/**
 * Keep this conservative for the free API.
 *
 * Our broader search query should already give us more candidates than before,
 * so we don't need to increase the API result count yet.
 */
const MARKETAUX_CANDIDATE_LIMIT = 10;

// -----------------------------------------------------------------------------
// INDEX / COUNTRY MACRO CONTEXT
// -----------------------------------------------------------------------------

/**
 * Used mainly for regional stock indices.
 *
 * This allows:
 *
 * Nikkei 225
 *   -> Nikkei-specific news
 *   -> Japan economy
 *   -> Bank of Japan
 *   -> yen
 *   -> inflation
 *
 * without requiring another Prisma field.
 */
const TIMEZONE_MACRO_TERMS: Record<string, string[]> = {
  // ---------------------------------------------------------------------------
  // United States
  // ---------------------------------------------------------------------------

  "America/New_York": [
    "US economy",
    "Federal Reserve",
    "US inflation",
    "US interest rates",
    "Wall Street",
  ],

  // ---------------------------------------------------------------------------
  // Canada
  // ---------------------------------------------------------------------------

  "America/Toronto": [
    "Canada economy",
    "Bank of Canada",
    "Canada inflation",
    "Canadian dollar",
  ],

  // ---------------------------------------------------------------------------
  // Brazil
  // ---------------------------------------------------------------------------

  "America/Sao_Paulo": [
    "Brazil economy",
    "Brazil central bank",
    "Brazil inflation",
    "Brazilian real",
  ],

  // ---------------------------------------------------------------------------
  // Mexico
  // ---------------------------------------------------------------------------

  "America/Mexico_City": [
    "Mexico economy",
    "Bank of Mexico",
    "Mexico inflation",
    "Mexican peso",
  ],

  // ---------------------------------------------------------------------------
  // Japan
  // ---------------------------------------------------------------------------

  "Asia/Tokyo": [
    "Japan economy",
    "Bank of Japan",
    "Japanese yen",
    "Japan inflation",
    "Japan stocks",
  ],

  // ---------------------------------------------------------------------------
  // South Korea
  // ---------------------------------------------------------------------------

  "Asia/Seoul": [
    "South Korea economy",
    "Bank of Korea",
    "Korean won",
    "South Korea exports",
    "Korean stocks",
  ],

  // ---------------------------------------------------------------------------
  // China
  // ---------------------------------------------------------------------------

  "Asia/Shanghai": [
    "China economy",
    "People's Bank of China",
    "Chinese yuan",
    "China trade",
    "China stocks",
  ],

  // ---------------------------------------------------------------------------
  // Hong Kong
  // ---------------------------------------------------------------------------

  "Asia/Hong_Kong": [
    "Hong Kong economy",
    "Hong Kong stocks",
    "China economy",
    "Chinese yuan",
  ],

  // ---------------------------------------------------------------------------
  // Taiwan
  // ---------------------------------------------------------------------------

  "Asia/Taipei": [
    "Taiwan economy",
    "Taiwan exports",
    "Taiwan semiconductor",
    "Taiwan stocks",
  ],

  // ---------------------------------------------------------------------------
  // India
  // ---------------------------------------------------------------------------

  "Asia/Kolkata": [
    "India economy",
    "Reserve Bank of India",
    "Indian rupee",
    "India inflation",
    "India stocks",
  ],

  // ---------------------------------------------------------------------------
  // Singapore
  // ---------------------------------------------------------------------------

  "Asia/Singapore": [
    "Singapore economy",
    "Monetary Authority of Singapore",
    "Singapore dollar",
    "Singapore stocks",
  ],

  // ---------------------------------------------------------------------------
  // Australia
  // ---------------------------------------------------------------------------

  "Australia/Sydney": [
    "Australia economy",
    "Reserve Bank of Australia",
    "Australian dollar",
    "Australia inflation",
    "Australia stocks",
  ],

  // ---------------------------------------------------------------------------
  // United Kingdom
  // ---------------------------------------------------------------------------

  "Europe/London": [
    "UK economy",
    "Bank of England",
    "British pound",
    "UK inflation",
    "UK stocks",
  ],

  // ---------------------------------------------------------------------------
  // Germany
  // ---------------------------------------------------------------------------

  "Europe/Berlin": [
    "Germany economy",
    "European Central Bank",
    "Eurozone economy",
    "euro",
    "European stocks",
  ],

  // ---------------------------------------------------------------------------
  // France
  // ---------------------------------------------------------------------------

  "Europe/Paris": [
    "France economy",
    "European Central Bank",
    "Eurozone economy",
    "euro",
  ],

  // ---------------------------------------------------------------------------
  // Spain
  // ---------------------------------------------------------------------------

  "Europe/Madrid": [
    "Spain economy",
    "European Central Bank",
    "Eurozone economy",
    "euro",
  ],

  // ---------------------------------------------------------------------------
  // Netherlands
  // ---------------------------------------------------------------------------

  "Europe/Amsterdam": [
    "Netherlands economy",
    "European Central Bank",
    "Eurozone economy",
    "euro",
  ],

  // ---------------------------------------------------------------------------
  // Switzerland
  // ---------------------------------------------------------------------------

  "Europe/Zurich": [
    "Switzerland economy",
    "Swiss National Bank",
    "Swiss franc",
    "Switzerland stocks",
  ],

  // ---------------------------------------------------------------------------
  // Sweden
  // ---------------------------------------------------------------------------

  "Europe/Stockholm": [
    "Sweden economy",
    "Riksbank",
    "Swedish krona",
    "Sweden stocks",
  ],

  // ---------------------------------------------------------------------------
  // South Africa
  // ---------------------------------------------------------------------------

  "Africa/Johannesburg": [
    "South Africa economy",
    "South African Reserve Bank",
    "South African rand",
    "South Africa stocks",
  ],
};

// -----------------------------------------------------------------------------
// CRYPTO CONTEXT
// -----------------------------------------------------------------------------

const CRYPTO_NEWS_TERMS: Record<string, string[]> = {
  "BTC-USD": ["Bitcoin", "BTC", "crypto market", "cryptocurrency regulation"],

  "ETH-USD": ["Ethereum", "ETH", "crypto market", "cryptocurrency regulation"],

  "SOL-USD": ["Solana", "SOL", "crypto market", "cryptocurrency regulation"],

  "XRP-USD": ["XRP", "Ripple", "crypto market", "cryptocurrency regulation"],

  "BNB-USD": ["BNB", "Binance", "crypto market", "cryptocurrency regulation"],

  "DOGE-USD": ["Dogecoin", "DOGE", "crypto market"],

  "ADA-USD": ["Cardano", "ADA", "crypto market"],

  "AVAX-USD": ["Avalanche", "AVAX", "crypto market"],

  "DOT-USD": ["Polkadot", "DOT", "crypto market"],

  "LINK-USD": ["Chainlink", "LINK", "crypto market"],
};

// -----------------------------------------------------------------------------
// COMMODITY CONTEXT
// -----------------------------------------------------------------------------

const COMMODITY_NEWS_TERMS: Record<string, string[]> = {
  // Gold
  "GC=F": [
    "gold",
    "gold prices",
    "precious metals",
    "Federal Reserve",
    "US dollar",
    "interest rates",
  ],

  // Silver
  "SI=F": [
    "silver",
    "silver prices",
    "precious metals",
    "US dollar",
    "interest rates",
  ],

  // WTI
  "CL=F": [
    "crude oil",
    "WTI",
    "oil prices",
    "OPEC",
    "oil supply",
    "oil demand",
  ],

  // Brent
  "BZ=F": ["Brent crude", "oil prices", "OPEC", "oil supply", "oil demand"],

  // Natural Gas
  "NG=F": ["natural gas", "natural gas prices", "gas supply", "gas demand"],

  // Copper
  "HG=F": ["copper", "copper prices", "China demand", "industrial metals"],

  // Platinum
  "PL=F": ["platinum", "platinum prices", "precious metals"],

  // Palladium
  "PA=F": ["palladium", "palladium prices", "precious metals"],

  // Corn
  "ZC=F": ["corn", "corn prices", "grain market", "crop supply"],

  // Wheat
  "ZW=F": ["wheat", "wheat prices", "grain market", "crop supply"],

  // Soybeans
  "ZS=F": ["soybeans", "soybean prices", "grain market", "crop supply"],
};

// -----------------------------------------------------------------------------
// CURRENCY CONTEXT
// -----------------------------------------------------------------------------

const CURRENCY_CONTEXT: Record<
  string,
  {
    name: string;
    terms: string[];
  }
> = {
  USD: {
    name: "US dollar",

    terms: [
      "Federal Reserve",
      "US economy",
      "US inflation",
      "US interest rates",
    ],
  },

  EUR: {
    name: "euro",

    terms: ["European Central Bank", "Eurozone economy", "Eurozone inflation"],
  },

  GBP: {
    name: "British pound",

    terms: ["Bank of England", "UK economy", "UK inflation"],
  },

  JPY: {
    name: "Japanese yen",

    terms: ["Bank of Japan", "Japan economy", "Japan inflation"],
  },

  KRW: {
    name: "Korean won",

    terms: ["Bank of Korea", "South Korea economy", "South Korea exports"],
  },

  CNY: {
    name: "Chinese yuan",

    terms: ["People's Bank of China", "China economy", "China trade"],
  },

  AUD: {
    name: "Australian dollar",

    terms: [
      "Reserve Bank of Australia",
      "Australia economy",
      "Australia inflation",
    ],
  },

  CAD: {
    name: "Canadian dollar",

    terms: ["Bank of Canada", "Canada economy", "Canada inflation"],
  },

  CHF: {
    name: "Swiss franc",

    terms: ["Swiss National Bank", "Switzerland economy"],
  },

  NZD: {
    name: "New Zealand dollar",

    terms: ["Reserve Bank of New Zealand", "New Zealand economy"],
  },

  SGD: {
    name: "Singapore dollar",

    terms: ["Monetary Authority of Singapore", "Singapore economy"],
  },

  HKD: {
    name: "Hong Kong dollar",

    terms: ["Hong Kong Monetary Authority", "Hong Kong economy"],
  },

  MXN: {
    name: "Mexican peso",

    terms: ["Bank of Mexico", "Mexico economy", "Mexico inflation"],
  },

  BRL: {
    name: "Brazilian real",

    terms: ["Brazil central bank", "Brazil economy", "Brazil inflation"],
  },

  INR: {
    name: "Indian rupee",

    terms: ["Reserve Bank of India", "India economy", "India inflation"],
  },

  ZAR: {
    name: "South African rand",

    terms: ["South African Reserve Bank", "South Africa economy"],
  },
};

// -----------------------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------------------

function getPublisherDomain(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function getSourceIcon(url: string): string | null {
  const domain = getPublisherDomain(url);

  if (!domain) {
    return null;
  }

  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(
    domain,
  )}&sz=64`;
}

function cleanSummary(article: MarketauxArticle): string | null {
  const summary = article.description?.trim() || article.snippet?.trim();

  if (!summary) {
    return null;
  }

  return summary.slice(0, 700);
}

function sevenDaysAgo(): Date {
  const date = new Date();

  date.setDate(date.getDate() - NEWS_HISTORY_DAYS);

  return date;
}

/**
 * Normalize text so comparisons are less sensitive to punctuation,
 * capitalization and spacing.
 *
 * "S&P 500" -> "s p 500"
 */
function normalizeText(value: string): string {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function containsMarketQuery(
  text: string | null | undefined,
  query: string,
): boolean {
  if (!text) {
    return false;
  }

  const normalizedText = normalizeText(text);
  const normalizedQuery = normalizeText(query);

  if (!normalizedText || !normalizedQuery) {
    return false;
  }

  return normalizedText.includes(normalizedQuery);
}

// -----------------------------------------------------------------------------
// INVESTMENT PRODUCT FILTER
// -----------------------------------------------------------------------------

/**
 * Prevent ETF / fund articles from taking over an underlying
 * index or commodity news feed.
 */
const INVESTMENT_PRODUCT_TERMS = [
  "etf",
  "fund",
  "trust",
  "ucits",
  "ishares",
  "vanguard",
  "invesco",
  "direxion",
  "proshares",
  "wisdomtree",
  "amundi",
  "xtrackers",
  "spdr",
  "maxis",
];

function looksLikeInvestmentProductArticle(title: string): boolean {
  const normalizedTitle = normalizeText(title);

  return INVESTMENT_PRODUCT_TERMS.some((term) =>
    normalizedTitle.includes(normalizeText(term)),
  );
}

// -----------------------------------------------------------------------------
// CURRENCY HELPERS
// -----------------------------------------------------------------------------

function getCurrencyPair(symbol: string): [string, string] | null {
  /**
   * Yahoo Finance format:
   *
   * EURUSD=X
   * USDJPY=X
   * GBPUSD=X
   */
  const match = symbol.match(/^([A-Z]{3})([A-Z]{3})=X$/);

  if (!match) {
    return null;
  }

  return [match[1], match[2]];
}

function getCurrencyNewsTerms(symbol: string): string[] {
  const pair = getCurrencyPair(symbol);

  if (!pair) {
    return [];
  }

  const [base, quote] = pair;

  const baseContext = CURRENCY_CONTEXT[base];
  const quoteContext = CURRENCY_CONTEXT[quote];

  const terms: string[] = [];

  if (baseContext) {
    terms.push(baseContext.name, ...baseContext.terms);
  }

  if (quoteContext) {
    terms.push(quoteContext.name, ...quoteContext.terms);
  }

  terms.push(`${base}/${quote}`, "forex", "currency market");

  return [...new Set(terms)];
}

// -----------------------------------------------------------------------------
// ASSET TYPE
// -----------------------------------------------------------------------------

function normalizeNewsAssetType(assetType: string): NewsAssetType {
  const normalized = assetType.toLowerCase();

  if (normalized.includes("crypto")) {
    return "crypto";
  }

  if (normalized.includes("currency") || normalized.includes("forex")) {
    return "currency";
  }

  if (normalized.includes("commodity") || normalized.includes("commodity")) {
    return "commodity";
  }

  return "index";
}

// -----------------------------------------------------------------------------
// BUILD NEWS CONTEXT
// -----------------------------------------------------------------------------

function buildNewsContext({
  symbol,
  name,
  assetType,
  timezone,
}: {
  symbol: string;
  name: string;
  assetType: string;
  timezone: string | null;
}): NewsContext {
  const normalizedAssetType = normalizeNewsAssetType(assetType);

  const primaryQuery = name.trim();

  switch (normalizedAssetType) {
    // -------------------------------------------------------------------------
    // CRYPTO
    // -------------------------------------------------------------------------

    case "crypto": {
      const terms = CRYPTO_NEWS_TERMS[symbol] ?? [
        primaryQuery,
        "crypto market",
        "cryptocurrency",
        "digital assets",
      ];

      return {
        assetType: "crypto",

        primaryQuery,

        searchTerms: [...new Set([primaryQuery, ...terms])],

        macroTerms: [
          "crypto market",
          "cryptocurrency regulation",
          "digital assets",
        ],
      };
    }

    // -------------------------------------------------------------------------
    // CURRENCY
    // -------------------------------------------------------------------------

    case "currency": {
      const terms = getCurrencyNewsTerms(symbol);

      return {
        assetType: "currency",

        primaryQuery,

        searchTerms: [...new Set([primaryQuery, ...terms])],

        macroTerms: terms,
      };
    }

    // -------------------------------------------------------------------------
    // COMMODITY
    // -------------------------------------------------------------------------

    case "commodity": {
      const terms = COMMODITY_NEWS_TERMS[symbol] ?? [
        primaryQuery,
        "commodity",
        "commodity market",
      ];

      return {
        assetType: "commodity",

        primaryQuery,

        searchTerms: [...new Set([primaryQuery, ...terms])],

        macroTerms: terms,
      };
    }

    // -------------------------------------------------------------------------
    // INDEX
    // -------------------------------------------------------------------------

    default: {
      const macroTerms = timezone ? (TIMEZONE_MACRO_TERMS[timezone] ?? []) : [];

      return {
        assetType: "index",

        primaryQuery,

        searchTerms: [...new Set([primaryQuery, ...macroTerms])],

        macroTerms,
      };
    }
  }
}

// -----------------------------------------------------------------------------
// RELEVANCE
// -----------------------------------------------------------------------------

function calculateArticleRelevance(
  article: MarketauxArticle,
  context: NewsContext,
): number {
  if (!article.title) {
    return 0;
  }

  if (looksLikeInvestmentProductArticle(article.title)) {
    return 0;
  }

  let score = 0;

  const title = article.title;

  const description = article.description ?? article.snippet ?? "";

  // ---------------------------------------------------------------------------
  // 1. Direct asset mention
  // ---------------------------------------------------------------------------

  if (containsMarketQuery(title, context.primaryQuery)) {
    score += 100;
  } else if (containsMarketQuery(description, context.primaryQuery)) {
    score += 25;
  }

  // ---------------------------------------------------------------------------
  // 2. Marketaux entity
  // ---------------------------------------------------------------------------

  for (const entity of article.entities ?? []) {
    if (!entity.name) {
      continue;
    }

    const normalizedEntity = normalizeText(entity.name);

    const normalizedPrimary = normalizeText(context.primaryQuery);

    const namesMatch =
      normalizedEntity === normalizedPrimary ||
      normalizedEntity.includes(normalizedPrimary) ||
      normalizedPrimary.includes(normalizedEntity);

    if (!namesMatch) {
      continue;
    }

    score += Math.min(entity.match_score ?? 0, 50);
  }

  // ---------------------------------------------------------------------------
  // 3. Related search terms
  // ---------------------------------------------------------------------------

  for (const term of context.searchTerms) {
    if (normalizeText(term) === normalizeText(context.primaryQuery)) {
      continue;
    }

    if (containsMarketQuery(title, term)) {
      score += 20;

      continue;
    }

    if (containsMarketQuery(description, term)) {
      score += 5;
    }
  }

  // ---------------------------------------------------------------------------
  // 4. Macro terms
  // ---------------------------------------------------------------------------

  for (const term of context.macroTerms) {
    if (containsMarketQuery(title, term)) {
      score += 10;
    }
  }

  return score;
}

function isRelevantMarketArticle(
  article: MarketauxArticle,
  context: NewsContext,
): boolean {
  if (!article.title) {
    return false;
  }

  if (looksLikeInvestmentProductArticle(article.title)) {
    return false;
  }

  const score = calculateArticleRelevance(article, context);

  switch (context.assetType) {
    case "index":
      return score >= 10;

    case "currency":
      return score >= 10;

    case "crypto":
      return score >= 15;

    case "commodity":
      return score >= 15;

    default:
      return score >= 15;
  }
}

// -----------------------------------------------------------------------------
// FETCH RELEVANT MARKET NEWS
// -----------------------------------------------------------------------------

async function fetchRelevantMarketNews(
  context: NewsContext,
): Promise<MarketauxArticle[]> {
  const apiKey = process.env.MARKETAUX_API_KEY;

  if (!apiKey) {
    console.error("MARKETAUX_API_KEY is missing.");

    return [];
  }

  const publishedAfter = sevenDaysAgo().toISOString().slice(0, 19);

  /**
   * Limit how many terms we send.
   *
   * The first term is always the actual asset.
   * Remaining terms provide broader context.
   */
  const searchTerms = context.searchTerms.slice(0, 6);

  /**
   * Marketaux OR search.
   *
   * Example:
   *
   * Nikkei 225 | Japan economy | Bank of Japan | Japanese yen
   */
  const searchQuery = searchTerms.join(" | ");

  const params = new URLSearchParams({
    api_token: apiKey,

    search: searchQuery,

    language: "en",

    published_after: publishedAfter,

    limit: String(MARKETAUX_CANDIDATE_LIMIT),

    group_similar: "true",
  });

  try {
    const response = await fetch(`${MARKETAUX_URL}?${params.toString()}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      const errorText = await response.text();

      if (response.status === 402 || response.status === 429) {
        console.warn(`Marketaux unavailable (${response.status}):`, errorText);

        return [];
      }

      return [];
    }

    const json = (await response.json()) as MarketauxResponse;

    const candidates = json.data ?? [];

    const relevantArticles = candidates
      .filter((article) => isRelevantMarketArticle(article, context))
      .sort((a, b) => {
        const scoreA = calculateArticleRelevance(a, context);

        const scoreB = calculateArticleRelevance(b, context);

        if (scoreB !== scoreA) {
          return scoreB - scoreA;
        }

        return (
          new Date(b.published_at).getTime() -
          new Date(a.published_at).getTime()
        );
      });

    return relevantArticles;
  } catch (error) {
    console.error(
      `Failed to fetch Marketaux news for "${context.primaryQuery}":`,
      error,
    );

    return [];
  }
}

// -----------------------------------------------------------------------------
// SYNC MARKET NEWS
// -----------------------------------------------------------------------------

export async function syncMarketNews(
  symbol: string,
  limit = MARKET_PAGE_NEWS_LIMIT,
): Promise<MarketNewsItem[]> {
  const market = await prisma.marketAsset.findUnique({
    where: {
      symbol,
    },

    select: {
      symbol: true,
      name: true,

      assetType: true,
      timezone: true,

      newsLastFetchedAt: true,
    },
  });

  if (!market) {
    return [];
  }

  const newsQuery = market.name.trim();

  if (!newsQuery) {
    return [];
  }

  const newsContext = buildNewsContext({
    symbol: market.symbol,

    name: market.name,

    assetType: market.assetType,

    timezone: market.timezone,
  });

  // ---------------------------------------------------------------------------
  // CACHE
  // ---------------------------------------------------------------------------

  if (market.newsLastFetchedAt) {
    const elapsed = Date.now() - new Date(market.newsLastFetchedAt).getTime();

    if (elapsed < NEWS_CACHE_TIME_MS) {
      return [];
    }
  }

  let articles: MarketauxArticle[] = [];

  try {
    articles = await fetchRelevantMarketNews(newsContext);
  } finally {
    /**
     * Record the attempt even when:
     *
     * - Marketaux returns zero results
     * - relevance filtering removes everything
     * - Marketaux fails
     *
     * Otherwise every page refresh could consume
     * another API request.
     */
    try {
      await prisma.marketAsset.update({
        where: {
          symbol,
        },

        data: {
          newsLastFetchedAt: new Date(),
        },
      });
    } catch (error) {
      console.error(`Failed to update newsLastFetchedAt for ${symbol}:`, error);
    }
  }

  if (articles.length === 0) {
    return [];
  }

  // ---------------------------------------------------------------------------
  // SAVE
  // ---------------------------------------------------------------------------

  const savedNews: MarketNewsItem[] = [];

  /**
   * We don't need to save an unlimited amount from one sync.
   *
   * News page requests may ask for more than the market page.
   */
  const articlesToSave = articles.slice(
    0,
    Math.max(limit, MARKET_PAGE_NEWS_LIMIT),
  );

  for (const article of articlesToSave) {
    if (!article.title || !article.url || !article.published_at) {
      continue;
    }

    const publishedAt = new Date(article.published_at);

    if (Number.isNaN(publishedAt.getTime())) {
      continue;
    }

    try {
      const news = await prisma.marketNews.upsert({
        where: {
          marketSymbol_url: {
            marketSymbol: symbol,

            url: article.url,
          },
        },

        update: {
          title: article.title,

          summary: cleanSummary(article),

          imageUrl: article.image_url ?? null,

          source: article.source || "Market News",

          sourceIcon: getSourceIcon(article.url),

          publishedAt,
        },

        create: {
          marketSymbol: symbol,

          title: article.title,

          summary: cleanSummary(article),

          imageUrl: article.image_url ?? null,

          source: article.source || "Market News",

          sourceIcon: getSourceIcon(article.url),

          url: article.url,

          publishedAt,
        },
      });

      savedNews.push(news);
    } catch (error) {
      console.error(`Failed to save news for ${symbol}:`, error);
    }
  }

  return savedNews;
}

// -----------------------------------------------------------------------------
// MARKET PAGE NEWS
//
// Used on:
//
// /[symbol]
//
// Only the newest few articles are needed.
// -----------------------------------------------------------------------------

const getCachedLatestMarketNews = unstable_cache(
  async (symbol: string): Promise<MarketNewsItem[]> => {
    await syncMarketNews(symbol, MARKET_PAGE_NEWS_LIMIT);

    return prisma.marketNews.findMany({
      where: {
        marketSymbol: symbol,

        publishedAt: {
          gte: sevenDaysAgo(),
        },
      },

      orderBy: {
        publishedAt: "desc",
      },

      take: MARKET_PAGE_NEWS_LIMIT,
    });
  },
  ["latest-market-news"],
  {
    revalidate: 60 * 60, // 1 hour
  },
);

export async function getLatestMarketNews(
  symbol: string,
): Promise<MarketNewsItem[]> {
  return getCachedLatestMarketNews(symbol);
}

// -----------------------------------------------------------------------------
// MARKET NEWS PAGE
//
// Used on:
//
// /[symbol]/news
// -----------------------------------------------------------------------------

export async function getMarketNews(
  symbol: string,
  limit = NEWS_PAGE_LIMIT,
): Promise<MarketNewsItem[]> {
  await syncMarketNews(symbol, limit);

  return prisma.marketNews.findMany({
    where: {
      marketSymbol: symbol,

      publishedAt: {
        gte: sevenDaysAgo(),
      },
    },

    orderBy: {
      publishedAt: "desc",
    },

    take: limit,
  });
}

// -----------------------------------------------------------------------------
// GLOBAL MARKET NEWS
//
// Used on:
//
// /news
//
// IMPORTANT:
//
// This does NOT call Marketaux.
//
// It only reads news already cached in our database.
// -----------------------------------------------------------------------------

export interface GlobalMarketNewsItem extends MarketNewsItem {
  market: {
    symbol: string;
    displaySymbol: string | null;
    name: string;
    category: string;
  };
}

export async function getGlobalMarketNews(
  limit = 30,
): Promise<GlobalMarketNewsItem[]> {
  return prisma.marketNews.findMany({
    where: {
      publishedAt: {
        gte: sevenDaysAgo(),
      },

      /**
       * Keep the existing global market feed limited
       * to regional market categories.
       *
       * Crypto / Currency / commodity can still have
       * their own /[symbol]/news pages.
       *
       * Remove this market.category filter later if you
       * want /news to mix every asset class together.
       */
      market: {
        category: {
          in: ["America", "Asia", "Europe"],
        },
      },
    },

    select: {
      id: true,
      marketSymbol: true,

      title: true,
      summary: true,
      imageUrl: true,

      source: true,
      sourceIcon: true,

      url: true,
      publishedAt: true,

      market: {
        select: {
          symbol: true,
          displaySymbol: true,
          name: true,
          category: true,
        },
      },
    },

    orderBy: {
      publishedAt: "desc",
    },

    take: limit,
  });
}
