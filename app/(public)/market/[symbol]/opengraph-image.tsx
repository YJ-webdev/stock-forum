import { notFound } from "next/navigation";

import { ALL_MARKET_SYMBOLS } from "@/lib/data/market-symbols";
import { createMarketOg, OG_SIZE } from "@/lib/og/market-og";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const alt = "Market overview | BullBearVote";
export const size = OG_SIZE;
export const contentType = "image/png";

interface ImageProps {
  params: Promise<{
    symbol: string;
  }>;
}

export default async function Image({ params }: ImageProps) {
  const { symbol } = await params;
  const decodedSymbol = decodeURIComponent(symbol);

  const market = ALL_MARKET_SYMBOLS.find(
    (item) => item.symbol === decodedSymbol,
  );

  if (!market) notFound();

  return createMarketOg(decodedSymbol);
}
