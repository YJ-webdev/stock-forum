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
    { name: "Dow Jones Industrial Average", symbol: "^DJI", category: "us" },
    { name: "Russell 2000", symbol: "^RUT", category: "us" },
    { name: "Total Stock Market", symbol: "VTI", category: "us" },
    { name: "S&P/TSX Composite", symbol: "^GSPTSE", category: "us" },
  ],
  Asia: [
    { name: "Nikkei 225", symbol: "^N225", category: "asia" },
    { name: "TOPIX", symbol: "DXJ", category: "asia" }, // Using DXJ direct mapping to fix backend error
    { name: "Shanghai Composite", symbol: "000001.SS", category: "asia" },
    { name: "CSI 300 Index", symbol: "000300.SS", category: "asia" },
    { name: "Hang Seng Index", symbol: "^HSI", category: "asia" },
    { name: "Nifty 50", symbol: "^NSEI", category: "asia" },
    { name: "TAIEX (Taiwan Weighted)", symbol: "^TWII", category: "asia" },
    { name: "KOSPI", symbol: "^KS11", category: "asia" },
    { name: "KOSDAQ", symbol: "^KQ11", category: "asia" },
    { name: "S&P/ASX 200", symbol: "^AXJO", category: "asia" },
    { name: "Straits Times Index (STI)", symbol: "^STI", category: "asia" },
    { name: "IDX Composite (Jakarta)", symbol: "^JKSE", category: "asia" },
  ],
  Europe: [
    { name: "Euro Stoxx 50", symbol: "^STOXX50E", category: "europe" },
    { name: "DAX 40", symbol: "^GDAXI", category: "europe" },
    { name: "FTSE 100", symbol: "^FTSE", category: "europe" },
    { name: "CAC 40", symbol: "^FCHI", category: "europe" },
    { name: "FTSE MIB", symbol: "FTSEMIB.MI", category: "europe" },
    { name: "Swiss Market Index (SMI)", symbol: "^SSMI", category: "europe" },
    { name: "IBEX 35", symbol: "^IBEX", category: "europe" },
    { name: "AEX Index", symbol: "^AEX", category: "europe" },
    { name: "OMX Stockholm 30", symbol: "^OMX", category: "europe" },
    {
      name: "Tadawul All Share (TASI)",
      symbol: "^TASI.SR",
      category: "europe",
    },
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
    { name: "Solana", symbol: "SOL-USD", category: "crypto" },
    { name: "Cardano", symbol: "ADA-USD", category: "crypto" },
  ],
  Currency: [
    { name: "EUR / USD", symbol: "EURUSD=X", category: "currency" },
    { name: "USD / JPY", symbol: "JPY=X", category: "currency" },
    { name: "GBP / USD", symbol: "GBPUSD=X", category: "currency" },
    { name: "USD / CAD", symbol: "CAD=X", category: "currency" },
    { name: "USD / CHF", symbol: "CHF=X", category: "currency" },
    { name: "AUD / USD", symbol: "AUDUSD=X", category: "currency" },
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
