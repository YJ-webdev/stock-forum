import { getMarketComments } from "@/app/actions/post";
import { getLatestMarketNews } from "@/app/actions/news";
import MarketPageClient from "./market-page-client";

interface PageProps {
  params: Promise<{
    symbol: string;
  }>;
}

export default async function Page({ params }: PageProps) {
  const { symbol } = await params;

  const decodedSymbol = decodeURIComponent(symbol);

  const commentsPage = await getMarketComments(decodedSymbol);
  const latestNews = await getLatestMarketNews(decodedSymbol, 3);

  return (
    <MarketPageClient
      symbol={decodedSymbol}
      commentsPage={commentsPage}
      latestNews={latestNews}
    />
  );
}
