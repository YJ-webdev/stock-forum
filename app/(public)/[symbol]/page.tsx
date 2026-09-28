import { getMarketComments } from "@/app/actions/post";
import { getLatestMarketNews } from "@/app/actions/news";
import MarketPageClient from "./market-page-client";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{
    symbol: string;
  }>;
}

export default async function Page({ params }: PageProps) {
  const { symbol } = await params;

  const decodedSymbol = decodeURIComponent(symbol);

  const market = await prisma.marketAsset.findUnique({
    where: {
      symbol: decodedSymbol,
    },
  });

  if (!market) {
    notFound();
  }

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
