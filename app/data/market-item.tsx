import {
  BitcoinLogo,
  GoldLogo,
  KospiLogo,
  NasdaqLogo,
  OilLogo,
  Sp500Logo,
} from "../components/market-logos";

export interface MarketItem {
  id: string;
  name: string;
  category: "Stock Indices" | "Crypto" | "Commodities";
  priority: number; // Priority ranking (1 = highest)
  icon: React.ReactNode;
  price: string;
}

export const MARKET_ITEMS: MarketItem[] = [
  // Stock Indices
  {
    id: "sp500",
    name: "S&P 500",
    category: "Stock Indices",
    priority: 1,
    icon: <Sp500Logo className="w-5 h-5 text-red-600" />,
    price: "5,460.25",
  },
  {
    id: "nasdaq",
    name: "나스닥 100",
    category: "Stock Indices",
    priority: 2,
    icon: <NasdaqLogo className="w-5 h-5 text-blue-500" />,
    price: "19,720.80",
  },
  {
    id: "kospi",
    name: "코스피",
    category: "Stock Indices",
    priority: 3,
    icon: <KospiLogo className="w-5 h-5 text-zinc-800 dark:text-zinc-200" />,
    price: "2,768.20",
  },
  // Crypto
  {
    id: "bitcoin",
    name: "비트코인",
    category: "Crypto",
    priority: 1,
    icon: <BitcoinLogo className="w-5 h-5" />,
    price: "$64,250.00",
  },
  // Commodities
  {
    id: "gold",
    name: "금 선물",
    category: "Commodities",
    priority: 1,
    icon: <GoldLogo className="w-5 h-5" />,
    price: "$2,382.40",
  },
  {
    id: "oil",
    name: "WTI 원유",
    category: "Commodities",
    priority: 2,
    icon: <OilLogo className="w-5 h-5" />,
    price: "$81.45",
  },
];
