import { getMarketComments } from "@/app/actions/post";
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

  return (
    <MarketPageClient symbol={decodedSymbol} commentsPage={commentsPage} />
  );
}
