// lib/types/home-market.ts

import type { MarketSymbolItem } from "@/lib/data/market-symbols";

export type HomeMarketItem = Pick<
  MarketSymbolItem,
  "symbol" | "providerSymbol" | "name" | "displaySymbol" | "assetType"
>;

export interface HomeMarketEntry {
  market: HomeMarketItem;
  initialIsWatchlist: boolean;
}
