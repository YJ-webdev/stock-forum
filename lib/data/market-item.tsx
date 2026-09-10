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
}

export const MARKET_ITEMS: MarketItem[] = [
  // Stock Indices
  {
    id: "sp500",
    symbol: "US500",
    ticker: "SPY", // ETF equivalent for S&P 500
    name: "S&P 500",
    category: "Stock Indices",
    priority: 1,
    icon: <Sp500Logo className="w-5 h-5 text-red-600" />,
    initialPrice: 5460.25,
  },
  {
    id: "nasdaq",
    symbol: "US100",
    ticker: "QQQ", // ETF equivalent for Nasdaq 100
    name: "나스닥 100",
    category: "Stock Indices",
    priority: 2,
    icon: <NasdaqLogo className="w-5 h-5 text-blue-500" />,
    initialPrice: 19720.8,
  },
  {
    id: "kospi",
    symbol: "KOSPI",
    ticker: "EWY", // iShares MSCI South Korea ETF (Free Finnhub alternative)
    name: "코스피",
    category: "Stock Indices",
    priority: 3,
    icon: <KospiLogo className="w-5 h-5 text-zinc-800 dark:text-zinc-200" />,
    initialPrice: 2768.2,
  },

  // Crypto
  {
    id: "bitcoin",
    symbol: "BTCUSD",
    ticker: "BINANCE:BTCUSDT", // Finnhub WebSocket/REST format
    name: "비트코인",
    category: "Crypto",
    priority: 1,
    icon: <BitcoinLogo className="w-5 h-5" />,
    initialPrice: 64250.0,
  },

  // Commodities
  {
    id: "gold",
    symbol: "GOLD",
    ticker: "GLD", // SPDR Gold Shares ETF
    name: "금 선물 (GLD)",
    category: "Commodities",
    priority: 1,
    icon: <GoldLogo className="w-5 h-5" />,
    initialPrice: 2382.4,
  },
  {
    id: "oil",
    symbol: "OIL",
    ticker: "USO", // United States Oil Fund ETF
    name: "WTI 원유 (USO)",
    category: "Commodities",
    priority: 2,
    icon: <OilLogo className="w-5 h-5" />,
    initialPrice: 81.45,
  },
];
