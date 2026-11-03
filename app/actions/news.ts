"use server";

import { unstable_cache } from "next/cache";

import { prisma } from "@/lib/prisma";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

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

export interface GlobalMarketNewsItem extends MarketNewsItem {
  market: {
    symbol: string;
    displaySymbol: string | null;
    name: string;
    category: string;
  };
}

export interface HomeMarketHeadline {
  id: string;
  title: string;
  summary: string;
  source: string;
  url: string;
  publishedAt: string;
}

type NewsAssetType = "index" | "crypto" | "currency" | "commodity";

interface NewsContext {
  assetType: NewsAssetType;
  primaryQuery: string;

  searchTerms: string[];
  macroTerms: string[];

  directTerms?: string[];
  topicTerms?: string[];
}

interface IndexNewsProfile {
  aliases: string[];
  topics: string[];
  queries: string[];
}

// -----------------------------------------------------------------------------
// Settings
// -----------------------------------------------------------------------------

const MARKETAUX_URL = "https://api.marketaux.com/v1/news/all";

const NEWS_CACHE_TIME_MS = 24 * 60 * 60 * 1000;
const NEWS_HISTORY_DAYS = 4;

const MARKET_PAGE_NEWS_LIMIT = 3;
const NEWS_PAGE_LIMIT = 21;

const MARKETAUX_CANDIDATE_LIMIT = 3;

// -----------------------------------------------------------------------------
// Index-specific profiles
// -----------------------------------------------------------------------------

const INDEX_NEWS_PROFILES: Record<string, IndexNewsProfile> = {
  "^NDX": {
    aliases: ["Nasdaq 100", "Nasdaq-100", "NDX"],

    topics: [
      "technology stocks",
      "tech stocks",
      "tech shares",
      "semiconductor",
      "semiconductors",
      "chip stocks",
      "chipmakers",
      "big tech",
      "megacap",
      "mega cap",
      "growth stocks",
      "artificial intelligence",
    ],

    queries: [
      "Nasdaq 100",
      "Nasdaq-100",
      "tech stocks",
      "semiconductor",
      "big tech",
    ],
  },

  "^GSPC": {
    aliases: ["S&P 500", "S&P500", "SPX", "Standard & Poor's 500"],

    topics: [
      "US stocks",
      "U.S. stocks",
      "US equities",
      "Wall Street",
      "corporate earnings",
      "earnings season",
      "company earnings",
      "earnings growth",
    ],

    queries: [
      "S&P 500",
      "SPX",
      "US stocks",
      "corporate earnings",
      "Wall Street",
    ],
  },

  "^DJI": {
    aliases: ["Dow Jones", "Dow Jones Industrial Average", "DJIA", "the Dow"],

    topics: [
      "blue chip",
      "blue chips",
      "industrial stocks",
      "industrial shares",
      "industrials",
      "manufacturing",
      "industrial production",
      "capital spending",
    ],

    queries: [
      "Dow Jones",
      "DJIA",
      "blue chip",
      "industrial stocks",
      "manufacturing",
    ],
  },

  "^RUT": {
    aliases: ["Russell 2000", "Russell2000", "RUT"],

    topics: [
      "small cap",
      "small caps",
      "smallcap",
      "smallcaps",
      "small companies",
      "small businesses",
      "regional banks",
      "lending standards",
      "credit conditions",
      "borrowing costs",
      "loan demand",
      "domestic demand",
      "US consumer spending",
    ],

    queries: [
      "Russell 2000",
      "small cap",
      "regional banks",
      "lending standards",
      "domestic demand",
    ],
  },
};

const INDEX_PROFILE_ALIASES: Record<string, string> = {
  NDX: "^NDX",
  SPX: "^GSPC",
  DJI: "^DJI",
  DJIA: "^DJI",
  RUT: "^RUT",
};

function indexProfile(symbol: string): IndexNewsProfile | undefined {
  const resolvedSymbol = INDEX_PROFILE_ALIASES[symbol] ?? symbol;

  return INDEX_NEWS_PROFILES[resolvedSymbol];
}

// -----------------------------------------------------------------------------
// Country macro context
// -----------------------------------------------------------------------------

const TIMEZONE_MACRO_TERMS: Record<string, string[]> = {
  "America/New_York": [
    "US economy",
    "Federal Reserve",
    "US inflation",
    "US interest rates",
    "Wall Street",
  ],

  "America/Toronto": [
    "Canada economy",
    "Bank of Canada",
    "Canada inflation",
    "Canadian dollar",
  ],

  "America/Sao_Paulo": [
    "Brazil economy",
    "Brazil central bank",
    "Brazil inflation",
    "Brazilian real",
  ],

  "America/Mexico_City": [
    "Mexico economy",
    "Bank of Mexico",
    "Mexico inflation",
    "Mexican peso",
  ],

  "Asia/Tokyo": [
    "Japan economy",
    "Bank of Japan",
    "Japanese yen",
    "Japan inflation",
    "Japan stocks",
  ],

  "Asia/Seoul": [
    "South Korea economy",
    "Bank of Korea",
    "Korean won",
    "South Korea exports",
    "Korean stocks",
  ],

  "Asia/Shanghai": [
    "China economy",
    "People's Bank of China",
    "Chinese yuan",
    "China trade",
    "China stocks",
  ],

  "Asia/Hong_Kong": [
    "Hong Kong economy",
    "Hong Kong stocks",
    "China economy",
    "Chinese yuan",
  ],

  "Asia/Taipei": [
    "Taiwan economy",
    "Taiwan exports",
    "Taiwan semiconductor",
    "Taiwan stocks",
  ],

  "Asia/Kolkata": [
    "India economy",
    "Reserve Bank of India",
    "Indian rupee",
    "India inflation",
    "India stocks",
  ],

  "Asia/Singapore": [
    "Singapore economy",
    "Monetary Authority of Singapore",
    "Singapore dollar",
    "Singapore stocks",
  ],

  "Australia/Sydney": [
    "Australia economy",
    "Reserve Bank of Australia",
    "Australian dollar",
    "Australia inflation",
    "Australia stocks",
  ],

  "Europe/London": [
    "UK economy",
    "Bank of England",
    "British pound",
    "UK inflation",
    "UK stocks",
  ],

  "Europe/Berlin": [
    "Germany economy",
    "European Central Bank",
    "Eurozone economy",
    "euro",
    "European stocks",
  ],

  "Europe/Paris": [
    "France economy",
    "European Central Bank",
    "Eurozone economy",
    "euro",
  ],

  "Europe/Madrid": [
    "Spain economy",
    "European Central Bank",
    "Eurozone economy",
    "euro",
  ],

  "Europe/Amsterdam": [
    "Netherlands economy",
    "European Central Bank",
    "Eurozone economy",
    "euro",
  ],

  "Europe/Zurich": [
    "Switzerland economy",
    "Swiss National Bank",
    "Swiss franc",
    "Switzerland stocks",
  ],

  "Europe/Stockholm": [
    "Sweden economy",
    "Riksbank",
    "Swedish krona",
    "Sweden stocks",
  ],

  "Africa/Johannesburg": [
    "South Africa economy",
    "South African Reserve Bank",
    "South African rand",
    "South Africa stocks",
  ],
};

// -----------------------------------------------------------------------------
// Crypto context
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
// Commodity context
// -----------------------------------------------------------------------------

const COMMODITY_NEWS_TERMS: Record<string, string[]> = {
  "GC=F": [
    "gold",
    "gold prices",
    "precious metals",
    "Federal Reserve",
    "US dollar",
    "interest rates",
  ],

  "SI=F": [
    "silver",
    "silver prices",
    "precious metals",
    "US dollar",
    "interest rates",
  ],

  "CL=F": [
    "crude oil",
    "WTI",
    "oil prices",
    "OPEC",
    "oil supply",
    "oil demand",
  ],

  "BZ=F": ["Brent crude", "oil prices", "OPEC", "oil supply", "oil demand"],

  "NG=F": ["natural gas", "natural gas prices", "gas supply", "gas demand"],

  "HG=F": ["copper", "copper prices", "China demand", "industrial metals"],

  "PL=F": ["platinum", "platinum prices", "precious metals"],
  "PA=F": ["palladium", "palladium prices", "precious metals"],

  "ZC=F": ["corn", "corn prices", "grain market", "crop supply"],
  "ZW=F": ["wheat", "wheat prices", "grain market", "crop supply"],
  "ZS=F": ["soybeans", "soybean prices", "grain market", "crop supply"],
};

// -----------------------------------------------------------------------------
// Currency context
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
// Text / date / publisher helpers
// -----------------------------------------------------------------------------

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
  if (!text) return false;

  const normalizedText = normalizeText(text);
  const normalizedQuery = normalizeText(query);

  if (!normalizedText || !normalizedQuery) return false;

  return normalizedText.includes(normalizedQuery);
}

function matchesPhrase(
  text: string | null | undefined,
  phrase: string,
): boolean {
  if (!text) return false;

  const term = normalizeText(phrase);

  if (!term) return false;

  return ` ${normalizeText(text)} `.includes(` ${term} `);
}

function sevenDaysAgo(): Date {
  const date = new Date();

  date.setDate(date.getDate() - NEWS_HISTORY_DAYS);

  return date;
}

function getPublisherDomain(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function getSourceIcon(url: string): string | null {
  const domain = getPublisherDomain(url);

  if (!domain) return null;

  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(
    domain,
  )}&sz=64`;
}

function cleanSummary(article: MarketauxArticle): string | null {
  const summary = article.description?.trim() || article.snippet?.trim();

  return summary ? summary.slice(0, 700) : null;
}

function clampNewsLimit(limit: number, fallback: number): number {
  return Number.isFinite(limit)
    ? Math.max(1, Math.min(100, Math.floor(limit)))
    : fallback;
}

// -----------------------------------------------------------------------------
// Duplicate detection
// -----------------------------------------------------------------------------

function articleUrlKey(value: string): string {
  try {
    const url = new URL(value);

    url.hash = "";

    for (const key of [...url.searchParams.keys()]) {
      if (/^utm_/i.test(key) || /^(fbclid|gclid|msclkid)$/i.test(key)) {
        url.searchParams.delete(key);
      }
    }

    url.searchParams.sort();

    return url.toString();
  } catch {
    return value.trim();
  }
}

function deduplicateNews<T extends { url: string; title: string }>(
  items: T[],
): T[] {
  const urls = new Set<string>();
  const titles = new Set<string>();

  return items.filter((item) => {
    const url = articleUrlKey(item.url);
    const title = normalizeText(item.title);

    if (urls.has(url) || (title && titles.has(title))) {
      return false;
    }

    urls.add(url);

    if (title) {
      titles.add(title);
    }

    return true;
  });
}

// -----------------------------------------------------------------------------
// Investment product filter
// -----------------------------------------------------------------------------

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
// Currency helpers
// -----------------------------------------------------------------------------

function getCurrencyPair(symbol: string): [string, string] | null {
  const match = symbol.match(/^([A-Z]{3})([A-Z]{3})=X$/);

  if (!match) return null;

  return [match[1], match[2]];
}

function getCurrencyNewsTerms(symbol: string): string[] {
  const pair = getCurrencyPair(symbol);

  if (!pair) return [];

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
// Build market context
// -----------------------------------------------------------------------------

function normalizeNewsAssetType(assetType: string): NewsAssetType {
  const normalized = assetType.toLowerCase();

  if (normalized.includes("crypto")) {
    return "crypto";
  }

  if (normalized.includes("currency") || normalized.includes("forex")) {
    return "currency";
  }

  if (normalized.includes("commodity") || normalized.includes("commodities")) {
    return "commodity";
  }

  return "index";
}

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

    case "currency": {
      const terms = getCurrencyNewsTerms(symbol);

      return {
        assetType: "currency",
        primaryQuery,
        searchTerms: [...new Set([primaryQuery, ...terms])],
        macroTerms: terms,
      };
    }

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

    default: {
      const macroTerms = timezone ? (TIMEZONE_MACRO_TERMS[timezone] ?? []) : [];

      const profile = indexProfile(symbol);

      return {
        assetType: "index",
        primaryQuery,

        searchTerms: profile
          ? [...profile.queries, macroTerms[1] ?? macroTerms[0] ?? primaryQuery]
          : [...new Set([primaryQuery, ...macroTerms])],

        macroTerms,

        directTerms: profile
          ? [...new Set([primaryQuery, ...profile.aliases])]
          : [primaryQuery],

        topicTerms: profile?.topics ?? [],
      };
    }
  }
}

// -----------------------------------------------------------------------------
// Relevance scoring
// -----------------------------------------------------------------------------

function calculateArticleRelevance(
  article: MarketauxArticle,
  context: NewsContext,
): number {
  if (!article.title || looksLikeInvestmentProductArticle(article.title)) {
    return 0;
  }

  const title = article.title;
  const description = article.description ?? article.snippet ?? "";

  if (context.assetType === "index") {
    const aliases = context.directTerms ?? [context.primaryQuery];

    let score = 0;

    // Direct index mention has the highest priority.
    if (aliases.some((term) => matchesPhrase(title, term))) {
      score += 200;
    } else if (aliases.some((term) => matchesPhrase(description, term))) {
      score += 100;
    }

    const titleTopics = (context.topicTerms ?? []).filter((term) =>
      matchesPhrase(title, term),
    );

    const bodyTopics = (context.topicTerms ?? []).filter((term) =>
      matchesPhrase(description, term),
    );

    // Cap topic matches so repeated keywords cannot dominate.
    score += Math.min(titleTopics.length, 2) * 30;
    score += Math.min(bodyTopics.length, 2) * 10;

    const macroTitle = context.macroTerms.some((term) =>
      matchesPhrase(title, term),
    );

    const macroBody = context.macroTerms.some((term) =>
      matchesPhrase(description, term),
    );

    if (macroTitle) {
      score += 10;
    } else if (macroBody) {
      score += 5;
    }

    return score;
  }

  // Preserve the existing scoring for non-index assets.
  let score = 0;

  if (containsMarketQuery(title, context.primaryQuery)) {
    score += 100;
  } else if (containsMarketQuery(description, context.primaryQuery)) {
    score += 25;
  }

  for (const entity of article.entities ?? []) {
    if (!entity.name) continue;

    const normalizedEntity = normalizeText(entity.name);
    const normalizedPrimary = normalizeText(context.primaryQuery);

    const namesMatch =
      normalizedEntity === normalizedPrimary ||
      normalizedEntity.includes(normalizedPrimary) ||
      normalizedPrimary.includes(normalizedEntity);

    if (!namesMatch) continue;

    score += Math.min(entity.match_score ?? 0, 50);
  }

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
  if (!article.title || looksLikeInvestmentProductArticle(article.title)) {
    return false;
  }

  const score = calculateArticleRelevance(article, context);

  switch (context.assetType) {
    case "index":
    case "currency":
      return score >= 10;

    case "crypto":
    case "commodity":
      return score >= 15;
  }
}

// -----------------------------------------------------------------------------
// Fetch candidates
// -----------------------------------------------------------------------------

async function fetchRelevantMarketNews(
  context: NewsContext,
): Promise<MarketauxArticle[]> {
  const apiKey = process.env.MARKETAUX_API_KEY;

  if (!apiKey) {
    console.error("MARKETAUX_API_KEY is missing.");
    return [];
  }

  const params = new URLSearchParams({
    api_token: apiKey,
    search: context.searchTerms.slice(0, 6).join(" | "),
    language: "en",
    published_after: sevenDaysAgo().toISOString().slice(0, 19),
    limit: String(MARKETAUX_CANDIDATE_LIMIT),
    group_similar: "true",
  });

  try {
    const response = await fetch(`${MARKETAUX_URL}?${params.toString()}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      const errorText = await response.text();

      if (response.status === 402 || response.status === 429) {
        console.warn(`Marketaux unavailable (${response.status}):`, errorText);
      }

      return [];
    }

    const json = (await response.json()) as MarketauxResponse;

    return (json.data ?? [])
      .filter((article) => isRelevantMarketArticle(article, context))
      .sort((a, b) => {
        const scoreA = calculateArticleRelevance(a, context);
        const scoreB = calculateArticleRelevance(b, context);

        return (
          scoreB - scoreA ||
          new Date(b.published_at).getTime() -
            new Date(a.published_at).getTime()
        );
      });
  } catch (error) {
    console.error(
      `Failed to fetch Marketaux news for "${context.primaryQuery}":`,
      error,
    );

    return [];
  }
}

// -----------------------------------------------------------------------------
// Sync market news
// -----------------------------------------------------------------------------

export async function syncMarketNews(
  symbol: string,
  limit = MARKET_PAGE_NEWS_LIMIT,
): Promise<MarketNewsItem[]> {
  // Keep the existing function signature.
  // Collection size is independent of the requested display size.
  void limit;

  const market = await prisma.marketAsset.findUnique({
    where: { symbol },

    select: {
      symbol: true,
      name: true,
      assetType: true,
      timezone: true,
      newsLastFetchedAt: true,
    },
  });

  if (!market || !market.name.trim()) {
    return [];
  }

  if (market.newsLastFetchedAt) {
    const elapsed = Date.now() - new Date(market.newsLastFetchedAt).getTime();

    if (elapsed < NEWS_CACHE_TIME_MS) {
      return [];
    }
  }

  const context = buildNewsContext(market);

  let articles: MarketauxArticle[] = [];

  try {
    articles = await fetchRelevantMarketNews(context);
  } finally {
    // Preserve the existing policy: failed/empty attempts also
    // count toward the 24-hour collection interval.
    try {
      await prisma.marketAsset.update({
        where: { symbol },

        data: {
          newsLastFetchedAt: new Date(),
        },
      });
    } catch (error) {
      console.error(`Failed to update newsLastFetchedAt for ${symbol}:`, error);
    }
  }

  const savedNews: MarketNewsItem[] = [];

  // Save all valid candidates even when the ticker requested only 3.
  for (const article of deduplicateNews(articles)) {
    if (!article.title || !article.url || !article.published_at) {
      continue;
    }

    const publishedAt = new Date(article.published_at);

    if (Number.isNaN(publishedAt.getTime())) {
      continue;
    }

    const data = {
      title: article.title,
      summary: cleanSummary(article),
      imageUrl: article.image_url ?? null,
      source: article.source || "Market News",
      sourceIcon: getSourceIcon(article.url),
      publishedAt,
    };

    try {
      const news = await prisma.marketNews.upsert({
        where: {
          marketSymbol_url: {
            marketSymbol: symbol,
            url: article.url,
          },
        },

        update: data,

        create: {
          marketSymbol: symbol,
          url: article.url,
          ...data,
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
// Read and rank persisted market news
// -----------------------------------------------------------------------------

async function readRankedMarketNews(
  symbol: string,
  limit: number,
): Promise<MarketNewsItem[]> {
  const market = await prisma.marketAsset.findUnique({
    where: { symbol },

    select: {
      symbol: true,
      name: true,
      assetType: true,
      timezone: true,
    },
  });

  if (!market) return [];

  await syncMarketNews(symbol);

  const context = buildNewsContext(market);

  const items = await prisma.marketNews.findMany({
    where: {
      marketSymbol: symbol,
      publishedAt: {
        gte: sevenDaysAgo(),
      },
    },

    orderBy: [{ publishedAt: "desc" }, { id: "asc" }],
  });

  // Apply relevance again when reading stored news.
  // A publishedAt-only DB sort would discard the relevance order.
  const ranked = items
    .map((item) => {
      const article: MarketauxArticle = {
        uuid: item.id,
        title: item.title,
        description: item.summary,
        url: item.url,
        published_at: item.publishedAt.toISOString(),
      };

      return {
        item,
        article,
        score: calculateArticleRelevance(article, context),
      };
    })
    .filter((entry) => isRelevantMarketArticle(entry.article, context))
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.item.publishedAt.getTime() - a.item.publishedAt.getTime(),
    );

  return deduplicateNews(ranked.map((entry) => entry.item)).slice(0, limit);
}

const getCachedMarketNews = unstable_cache(
  readRankedMarketNews,
  ["market-news-relevance-v2"],
  {
    revalidate: 60 * 60,
  },
);

// -----------------------------------------------------------------------------
// Market ticker
// -----------------------------------------------------------------------------

export async function getLatestMarketNews(
  symbol: string,
): Promise<MarketNewsItem[]> {
  return getCachedMarketNews(symbol, MARKET_PAGE_NEWS_LIMIT);
}

// -----------------------------------------------------------------------------
// Market news page
// -----------------------------------------------------------------------------

export async function getMarketNews(
  symbol: string,
  limit = NEWS_PAGE_LIMIT,
): Promise<MarketNewsItem[]> {
  return getCachedMarketNews(symbol, clampNewsLimit(limit, NEWS_PAGE_LIMIT));
}

// -----------------------------------------------------------------------------
// Global news page
// -----------------------------------------------------------------------------

export type GlobalNewsRegion =
  | "All"
  | "America"
  | "Asia"
  | "Middle_East"
  | "Europe"
  | "Africa"
  | "Global";

const GLOBAL_NEWS_REGIONS: Exclude<GlobalNewsRegion, "All">[] = [
  "America",
  "Asia",
  "Middle_East",
  "Europe",
  "Africa",
  "Global",
];

const GLOBAL_NEWS_CANDIDATE_LIMIT = 500;

function globalNewsScore(
  item: GlobalMarketNewsItem,
  context: NewsContext,
): number {
  const article: MarketauxArticle = {
    uuid: item.id,
    title: item.title,
    description: item.summary,
    url: item.url,
    published_at: new Date(item.publishedAt).toISOString(),
  };

  const relevance = calculateArticleRelevance(article, context);

  const ageHours = Math.max(
    0,
    (Date.now() - new Date(item.publishedAt).getTime()) / 3_600_000,
  );

  // Relevance and freshness both contribute to ranking.
  const relevanceScore = Math.min(relevance, 200) / 200;
  const freshnessScore = Math.exp(-ageHours / 48);

  return relevanceScore * 0.65 + freshnessScore * 0.35;
}

export async function getGlobalMarketNews(
  limit = 50,
  region: GlobalNewsRegion = "All",
): Promise<GlobalMarketNewsItem[]> {
  const target = clampNewsLimit(limit, 50);

  if (region !== "All" && !GLOBAL_NEWS_REGIONS.includes(region)) {
    return [];
  }

  const marketFilter =
    region === "All" ? { in: GLOBAL_NEWS_REGIONS } : { equals: region };

  const items = await prisma.marketNews.findMany({
    where: {
      publishedAt: {
        gte: sevenDaysAgo(),
      },
      market: {
        category: marketFilter,
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
          assetType: true,
          timezone: true,
        },
      },
    },
    orderBy: [{ publishedAt: "desc" }, { id: "asc" }],
    take: GLOBAL_NEWS_CANDIDATE_LIMIT,
  });

  const contexts = new Map<string, NewsContext>();

  const ranked = items.map((item) => {
    let context = contexts.get(item.marketSymbol);

    if (!context) {
      context = buildNewsContext({
        symbol: item.market.symbol,
        name: item.market.name,
        assetType: item.market.assetType,
        timezone: item.market.timezone,
      });

      contexts.set(item.marketSymbol, context);
    }

    return {
      item,
      score: globalNewsScore(item, context),
    };
  });

  ranked.sort(
    (a, b) =>
      b.score - a.score ||
      new Date(b.item.publishedAt).getTime() -
        new Date(a.item.publishedAt).getTime(),
  );

  const unique = deduplicateNews(
    ranked.map(({ item }) => ({
      id: item.id,
      marketSymbol: item.marketSymbol,
      title: item.title,
      summary: item.summary,
      imageUrl: item.imageUrl,
      source: item.source,
      sourceIcon: item.sourceIcon,
      url: item.url,
      publishedAt: item.publishedAt,
      market: {
        symbol: item.market.symbol,
        displaySymbol: item.market.displaySymbol,
        name: item.market.name,
        category: item.market.category,
      },
    })),
  );

  return unique.slice(0, target);
}
