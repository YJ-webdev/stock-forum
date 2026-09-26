"use server";

import { prisma } from "@/lib/prisma";

// -----------------------------------------------------------------------------
// TYPES
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

  source: string;
  sourceIcon: string | null;

  url: string;
  publishedAt: Date;
}

// -----------------------------------------------------------------------------
// CONSTANTS
// -----------------------------------------------------------------------------

const MARKETAUX_URL = "https://api.marketaux.com/v1/news/all";

const NEWS_CACHE_TIME_MS = 6 * 60 * 60 * 1000; // 6 hours
const NEWS_HISTORY_DAYS = 7;

const MARKET_PAGE_NEWS_LIMIT = 3;
const MARKET_NEWS_PAGE_LIMIT = 21;

// Fetch more candidates than we display because some will be rejected by
// our relevance filter.
const MARKETAUX_CANDIDATE_LIMIT = 10;

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
 * Example:
 *
 * "S&P 500" -> "s p 500"
 * "S&P 500 Index" -> "s p 500 index"
 */
function normalizeText(value: string): string {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Terms that strongly suggest the article is primarily about an investment
 * product rather than the underlying market index.
 *
 * We only use these as a rejection signal when they appear in the title.
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

/**
 * Some articles mention an index only because an ETF/fund tracks it.
 *
 * Those aren't useful as the main headline on the index's forum page.
 */
function looksLikeInvestmentProductArticle(title: string): boolean {
  const normalizedTitle = normalizeText(title);

  return INVESTMENT_PRODUCT_TERMS.some((term) =>
    normalizedTitle.includes(normalizeText(term)),
  );
}

/**
 * Check whether the market query is actually present in a piece of text.
 */
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

/**
 * Determine whether a Marketaux article is sufficiently related to this
 * particular market.
 *
 * For the small headline shown on /[asset], we'd rather return nothing than
 * show a weakly related article.
 */
function isRelevantMarketArticle(
  article: MarketauxArticle,
  newsQuery: string,
): boolean {
  if (!article.title) {
    return false;
  }

  // ---------------------------------------------------------------------------
  // 1. Reject obvious ETF/fund/product headlines.
  // ---------------------------------------------------------------------------

  if (looksLikeInvestmentProductArticle(article.title)) {
    return false;
  }

  // ---------------------------------------------------------------------------
  // 2. Strongest signal: the actual market/index appears in the title.
  // ---------------------------------------------------------------------------

  if (containsMarketQuery(article.title, newsQuery)) {
    return true;
  }

  // ---------------------------------------------------------------------------
  // 3. Marketaux entity signal.
  //
  // If Marketaux extracted an entity whose name matches our query and gave it
  // a meaningful match score, accept it.
  // ---------------------------------------------------------------------------

  const matchingEntity = article.entities?.find((entity) => {
    if (!entity.name) {
      return false;
    }

    const normalizedEntityName = normalizeText(entity.name);
    const normalizedQuery = normalizeText(newsQuery);

    const namesMatch =
      normalizedEntityName === normalizedQuery ||
      normalizedEntityName.includes(normalizedQuery) ||
      normalizedQuery.includes(normalizedEntityName);

    if (!namesMatch) {
      return false;
    }

    return (entity.match_score ?? 0) >= 20;
  });

  if (matchingEntity) {
    return true;
  }

  // ---------------------------------------------------------------------------
  // 4. Description/snippet alone is intentionally NOT enough.
  //
  // Otherwise articles can sneak through simply because they briefly mention
  // the index somewhere in the body.
  // ---------------------------------------------------------------------------

  return false;
}

// -----------------------------------------------------------------------------
// FETCH RELEVANT MARKET NEWS
// -----------------------------------------------------------------------------

async function fetchRelevantMarketNews(
  newsQuery: string,
  limit = MARKET_PAGE_NEWS_LIMIT,
): Promise<MarketauxArticle[]> {
  const apiKey = process.env.MARKETAUX_API_KEY;

  if (!apiKey) {
    console.error("MARKETAUX_API_KEY is missing.");

    return [];
  }

  const publishedAfter = sevenDaysAgo().toISOString().slice(0, 19);

  const params = new URLSearchParams({
    api_token: apiKey,

    search: newsQuery,

    language: "en",

    published_after: publishedAfter,

    // Fetch extra candidates because our own relevance filter will reject
    // some of them.
    limit: String(MARKETAUX_CANDIDATE_LIMIT),

    group_similar: "true",
  });

  try {
    const response = await fetch(`${MARKETAUX_URL}?${params.toString()}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      console.error(
        "Marketaux news failed:",
        response.status,
        await response.text(),
      );

      return [];
    }

    const json = (await response.json()) as MarketauxResponse;

    const candidates = json.data ?? [];

    const relevantArticles = candidates.filter((article) =>
      isRelevantMarketArticle(article, newsQuery),
    );

    console.log(`MARKETAUX NEWS "${newsQuery}"`, {
      candidates: candidates.length,
      relevant: relevantArticles.length,

      articles: relevantArticles.map((article) => ({
        title: article.title,

        entities: article.entities?.map((entity) => ({
          symbol: entity.symbol,
          name: entity.name,
          type: entity.type,
          matchScore: entity.match_score,
        })),
      })),
    });

    return relevantArticles.slice(0, limit);
  } catch (error) {
    console.error(`Failed to fetch Marketaux news for "${newsQuery}":`, error);

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

  // ---------------------------------------------------------------------------
  // FETCH
  // ---------------------------------------------------------------------------

  let articles: MarketauxArticle[] = [];

  try {
    articles = await fetchRelevantMarketNews(newsQuery, limit);
  } finally {
    // Record the attempt even if:
    //
    // - Marketaux returned zero articles
    // - our relevance filter rejected everything
    // - Marketaux returned an error
    //
    // This prevents every page visit from consuming another API request.

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

  for (const article of articles) {
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

          source: article.source || "Market News",

          sourceIcon: getSourceIcon(article.url),

          publishedAt,
        },

        create: {
          marketSymbol: symbol,

          title: article.title,
          summary: cleanSummary(article),

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
// /[asset]
//
// Only a few highly relevant headlines are needed.
// -----------------------------------------------------------------------------

export async function getLatestMarketNews(
  symbol: string,
  limit = MARKET_PAGE_NEWS_LIMIT,
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
// MARKET NEWS PAGE
//
// Used on:
// /[asset]/news
//
// Last 7 days, maximum 21 stored articles.
// -----------------------------------------------------------------------------

export async function getMarketNews(symbol: string): Promise<MarketNewsItem[]> {
  await syncMarketNews(symbol, MARKET_NEWS_PAGE_LIMIT);

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

    take: MARKET_NEWS_PAGE_LIMIT,
  });
}
