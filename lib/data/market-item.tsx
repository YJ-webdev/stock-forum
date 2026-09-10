import React from "react";
import {
  BitcoinLogo,
  GoldLogo,
  KospiLogo,
  NasdaqLogo,
  OilLogo,
  Sp500Logo,
} from "../../app/components/market-logos";

export interface MarketItem {
  id: string; // Database / Unique ID
  symbol: string; // Internal system symbol key
  ticker: string; // Finnhub / External API query ticker
  name: string;
  category: "Stock Indices" | "Crypto" | "Commodities";
  priority: number;
  icon: React.ReactNode;
  initialPrice: number; // Raw numeric fallback price
  price: number; // Display price
}
