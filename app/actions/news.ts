// Server Action for fetching financial news
"use server";

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;

export interface NewsArticle {
  id: number;
  category: string;
  datetime: number;
  headline: string;
  image: string;
  related: string;
  source: string;
  summary: string;
  url: string;
}

export async function getMarketNews(): Promise<NewsArticle[]> {
  try {
    // Categories available: general, forex, crypto, merger
    const res = await fetch(
      `https://finnhub.io/api/v1/news?category=general&token=${FINNHUB_API_KEY}`,
      { next: { revalidate: 300 } }, // Cache news for 5 minutes
    );

    if (!res.ok) throw new Error("Failed to fetch news from Finnhub");

    const newsData: NewsArticle[] = await res.json();
    return newsData.slice(0, 10); // Return top 10 articles
  } catch (error) {
    console.error("[News Action Error]:", error);
    return [];
  }
}
