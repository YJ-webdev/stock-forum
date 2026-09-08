import { NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance();

export async function GET() {
  try {
    // Search general market news
    const result = await yahooFinance.search("stock market", { newsCount: 5 });

    const formattedNews = (result.news || []).map((item) => ({
      id: item.uuid,
      title: item.title,
      source: item.publisher,
      time: new Date(item.providerPublishTime).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      url: item.link,
      thumbnail: item.thumbnail?.resolutions?.[0]?.url ?? null,
    }));

    return NextResponse.json(formattedNews);
  } catch (error) {
    console.error("Failed to fetch news:", error);
    return NextResponse.json(
      { error: "Failed to fetch news" },
      { status: 500 },
    );
  }
}
