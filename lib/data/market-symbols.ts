export interface MarketSymbolItem {
  name: string;
  symbol: string;
  category: string;
  logoUrl?: string;
}

// Optional helper to generate financial asset icons automatically
export const getSymbolIcon = (symbol: string): string => {
  // Strip special symbols like '^' or '=X'
  const cleanSymbol = symbol.replace(/[\^=]/g, "").split(".")[0];

  // Financial Modeling Prep free image endpoint
  return `https://financialmodelingprep.com/image-stock/${cleanSymbol}.png`;
};

export const MARKET_SYMBOLS: Record<string, MarketSymbolItem[]> = {
  US: [
    { name: "S&P 500", symbol: "^GSPC", category: "us" },
    { name: "Nasdaq 100", symbol: "^NDX", category: "us" },
    { name: "Nasdaq Composite", symbol: "^IXIC", category: "us" }, // 추가됨 (IXIC)
    { name: "Dow Jones Industrial Average", symbol: "^DJI", category: "us" },
    { name: "Russell 2000", symbol: "^RUT", category: "us" },
    { name: "Total Stock Market", symbol: "VTI", category: "us" },
    { name: "S&P/TSX Composite", symbol: "^GSPTSE", category: "us" },
  ],
  EMEA: [
    { name: "Euro Stoxx 50", symbol: "^STOXX50E", category: "EMEA" },
    { name: "DAX 40", symbol: "^GDAXI", category: "EMEA" },
    { name: "FTSE 100", symbol: "^FTSE", category: "EMEA" },
    { name: "CAC 40", symbol: "^FCHI", category: "EMEA" }, // SA40에 해당하는 파리 CAC40
    { name: "FTSE MIB", symbol: "FTSEMIB.MI", category: "EMEA" },
    { name: "Swiss Market Index (SMI)", symbol: "^SSMI", category: "EMEA" }, // CH20 / SWI20
    { name: "IBEX 35", symbol: "^IBEX", category: "EMEA" },
    { name: "AEX Index", symbol: "^AEX", category: "EMEA" },
    { name: "OMX Stockholm 30", symbol: "^OMX", category: "EMEA" },
    {
      name: "Tadawul All Share (TASI)",
      symbol: "^TASI.SR",
      category: "middle-east",
    },
  ],
  APEC: [
    { name: "Nikkei 225", symbol: "^N225", category: "APEC" },
    { name: "TOPIX", symbol: "DXJ", category: "APEC" },
    { name: "Shanghai Composite", symbol: "000001.SS", category: "APEC" },
    { name: "CSI 300 Index", symbol: "000300.SS", category: "APEC" },
    { name: "Hang Seng Index", symbol: "^HSI", category: "APEC" },
    { name: "Nifty 50", symbol: "^NSEI", category: "APEC" },
    { name: "TAIEX (Taiwan Weighted)", symbol: "^TWII", category: "APEC" },
    { name: "KOSPI", symbol: "^KS11", category: "APEC" },
    { name: "KOSDAQ", symbol: "^KQ11", category: "APEC" },
    { name: "S&P/ASX 200", symbol: "^AXJO", category: "APEC" },
    { name: "Straits Times Index (STI)", symbol: "^STI", category: "APEC" },
    {
      name: "IDX Composite (IHSG / Jakarta)",
      symbol: "^JKSE",
      category: "asia",
    }, // IHSG 심볼 명시
  ],

  "Latin America": [
    { name: "Bovespa Index", symbol: "^BVSP", category: "latin-america" },
    { name: "S&P/BMV IPC Mexico", symbol: "^MXX", category: "latin-america" },
    { name: "Vale S.A.", symbol: "VALE", category: "latin-america" },
    { name: "Petrobras", symbol: "PBR", category: "latin-america" },
    { name: "MercadoLibre", symbol: "MELI", category: "latin-america" },
    { name: "Nu Holdings", symbol: "NU", category: "latin-america" },
  ],
  Crypto: [
    { name: "Bitcoin", symbol: "BTC-USD", category: "crypto" },
    { name: "Ethereum", symbol: "ETH-USD", category: "crypto" },
    { name: "Tether", symbol: "USDT-USD", category: "crypto" },
    { name: "USD Coin", symbol: "USDC-USD", category: "crypto" },
    { name: "Binance Coin", symbol: "BNB-USD", category: "crypto" },
    { name: "Solana", symbol: "SOL-USD", category: "crypto" },
    { name: "XRP", symbol: "XRP-USD", category: "crypto" },
    { name: "TRON", symbol: "TRX-USD", category: "crypto" },
    { name: "Dogecoin", symbol: "DOGE-USD", category: "crypto" },
    { name: "Cardano", symbol: "ADA-USD", category: "crypto" },
  ],
  Currency: [
    { name: "EUR / USD", symbol: "EURUSD=X", category: "currency" },
    { name: "USD / JPY", symbol: "JPY=X", category: "currency" },
    { name: "GBP / USD", symbol: "GBPUSD=X", category: "currency" },
    { name: "USD / CAD", symbol: "CAD=X", category: "currency" },
    { name: "USD / CHF", symbol: "CHF=X", category: "currency" },
    { name: "AUD / USD", symbol: "AUDUSD=X", category: "currenc" },
  ],
  Futures: [
    { name: "Crude Oil Futures", symbol: "CL=F", category: "futures" },
    { name: "Gold Futures", symbol: "GC=F", category: "futures" },
    { name: "Silver Futures", symbol: "SI=F", category: "futures" },
    { name: "Natural Gas Futures", symbol: "NG=F", category: "futures" },
  ],
} as const;

// Flattened list for quick param checks across all categories
export const ALL_MARKET_SYMBOLS: MarketSymbolItem[] =
  Object.values(MARKET_SYMBOLS).flat();
