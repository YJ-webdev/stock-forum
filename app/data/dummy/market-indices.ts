export interface IndexCardData {
  id: string;
  region: "America" | "Asia/Oceania" | "EMEA" | "Commodities/Crypto";
  country: string;
  countryCode?: string; // FlagCDN 연동용
  assetType: "flag" | "commodity" | "crypto";
  symbol: string;
  ticker: string;
  name: string;
  price: string;
  change: string;
  changePercent: string;
  isUp: boolean;
}

export const MARKET_INDICES: IndexCardData[] = [
  // --- America ---
  {
    id: "sp500",
    region: "America",
    country: "미국",
    countryCode: "us",
    assetType: "flag",
    symbol: "US500",
    ticker: "SPX",
    name: "S&P 500",
    price: "5,460.25",
    change: "+24.10",
    changePercent: "+0.44%",
    isUp: true,
  },
  {
    id: "nasdaq",
    region: "America",
    country: "미국",
    countryCode: "us",
    assetType: "flag",
    symbol: "US100",
    ticker: "IXIC",
    name: "나스닥 100",
    price: "19,720.80",
    change: "+182.50",
    changePercent: "+0.93%",
    isUp: true,
  },

  // --- Asia / Oceania ---
  {
    id: "kospi",
    region: "Asia/Oceania",
    country: "한국",
    countryCode: "kr",
    assetType: "flag",
    symbol: "KOSPI",
    ticker: "KOSPI",
    name: "코스피",
    price: "2,768.20",
    change: "+15.40",
    changePercent: "+0.56%",
    isUp: true,
  },
  {
    id: "nikkei",
    region: "Asia/Oceania",
    country: "일본",
    countryCode: "jp",
    assetType: "flag",
    symbol: "JP225",
    ticker: "NI225",
    name: "닛케이 225",
    price: "38,620.50",
    change: "-140.00",
    changePercent: "-0.36%",
    isUp: false,
  },

  // --- Commodities & Crypto (상품/암호화폐 섹션) ---
  {
    id: "gold",
    region: "Commodities/Crypto",
    country: "원자재",
    assetType: "commodity",
    symbol: "XAUUSD",
    ticker: "GOLD",
    name: "금 선물",
    price: "2,382.40",
    change: "+14.20",
    changePercent: "+0.60%",
    isUp: true,
  },
  {
    id: "crude_oil",
    region: "Commodities/Crypto",
    country: "원자재",
    assetType: "commodity",
    symbol: "WTI",
    ticker: "CL1!",
    name: "WTI 원유",
    price: "81.45",
    change: "-1.15",
    changePercent: "-1.39%",
    isUp: false,
  },
  {
    id: "bitcoin",
    region: "Commodities/Crypto",
    country: "암호화폐",
    assetType: "crypto",
    symbol: "BTCUSD",
    ticker: "BTC",
    name: "비트코인",
    price: "64,250.00",
    change: "+1,280.00",
    changePercent: "+2.03%",
    isUp: true,
  },
  {
    id: "ethereum",
    region: "Commodities/Crypto",
    country: "암호화폐",
    assetType: "crypto",
    symbol: "ETHUSD",
    ticker: "ETH",
    name: "이더리움",
    price: "3,480.10",
    change: "-42.50",
    changePercent: "-1.21%",
    isUp: false,
  },
];
