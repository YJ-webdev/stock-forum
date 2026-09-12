export type MarketRegion = "America" | "APEC" | "EMEA" | "Global";
export type AssetType = "index" | "stock" | "crypto" | "currency" | "futures";

export interface MarketSymbolItem {
  name: string;
  symbol: string;
  displaySymbol: string;
  country: string;
  region: MarketRegion;
  assetType: AssetType;
  providerSymbol?: string;
  isProxy?: boolean;
  timezone?: string;
  exchangeTimezone?: string;
}

export const getSymbolIcon = (symbol: string): string => {
  const cleanSymbol = symbol.replace(/[\^=]/g, "").split(".")[0];
  return `https://financialmodelingprep.com/image-stock/${cleanSymbol}.png`;
};

// --- SYMBOL LISTS ---

export const MARKET_SYMBOLS: Record<string, MarketSymbolItem[]> = {
  America: [
    {
      name: "S&P 500",
      symbol: "^GSPC",
      displaySymbol: "SPX",
      country: "US",
      region: "America",
      assetType: "index",
      timezone: "America/New_York",
    },
    {
      name: "Nasdaq 100",
      symbol: "^NDX",
      displaySymbol: "NDX",
      country: "US",
      region: "America",
      assetType: "index",
      timezone: "America/New_York",
    },
    {
      name: "Dow Jones Industrial Average",
      symbol: "^DJI",
      displaySymbol: "DJI",
      country: "US",
      region: "America",
      assetType: "index",
      timezone: "America/New_York",
    },
    {
      name: "Russell 2000",
      symbol: "^RUT",
      displaySymbol: "RUT",
      country: "US",
      region: "America",
      assetType: "index",
      timezone: "America/New_York",
    },
    {
      name: "S&P/TSX Composite Index",
      symbol: "^GSPTSE",
      displaySymbol: "TSX",
      country: "CA",
      region: "America",
      assetType: "index",
      timezone: "America/Toronto",
    },
    {
      name: "Bovespa Index",
      symbol: "^BVSP",
      displaySymbol: "IBOV",
      country: "BR",
      region: "America",
      assetType: "index",
      timezone: "America/Sao_Paulo",
    },
    {
      name: "S&P/BMV IPC",
      symbol: "^MXX",
      displaySymbol: "MEXBOL",
      country: "MX",
      region: "America",
      assetType: "index",
      timezone: "America/Mexico_City",
    },
  ],
  APEC: [
    {
      name: "Nikkei 225",
      symbol: "^N225",
      displaySymbol: "N225",
      country: "JP",
      region: "APEC",
      assetType: "index",
      timezone: "Asia/Tokyo",
    },
    {
      name: "TOPIX",
      symbol: "TOPIX",
      displaySymbol: "TOPIX",
      country: "JP",
      region: "APEC",
      assetType: "index",
      providerSymbol: "1306.T",
      isProxy: true,
      timezone: "Asia/Tokyo",
    },
    {
      name: "Shanghai Composite Index",
      symbol: "000001.SS",
      displaySymbol: "SSEC",
      country: "CN",
      region: "APEC",
      assetType: "index",
      timezone: "Asia/Shanghai",
    },
    {
      name: "CSI 300 Index",
      symbol: "000300.SS",
      displaySymbol: "CSI300",
      country: "CN",
      region: "APEC",
      assetType: "index",
      timezone: "Asia/Shanghai",
    },
    {
      name: "Hang Seng Index",
      symbol: "^HSI",
      displaySymbol: "HSI",
      country: "HK",
      region: "APEC",
      assetType: "index",
      timezone: "Asia/Hong_Kong",
    },
    {
      name: "Nifty 50",
      symbol: "^NSEI",
      displaySymbol: "NIFTY",
      country: "IN",
      region: "APEC",
      assetType: "index",
      timezone: "Asia/Kolkata",
    },
    {
      name: "TAIEX",
      symbol: "^TWII",
      displaySymbol: "TAIEX",
      country: "TW",
      region: "APEC",
      assetType: "index",
      timezone: "Asia/Taipei",
    },
    {
      name: "KOSPI",
      symbol: "^KS11",
      displaySymbol: "KOSPI",
      country: "KR",
      region: "APEC",
      assetType: "index",
      timezone: "Asia/Seoul",
    },
    {
      name: "KOSDAQ",
      symbol: "^KQ11",
      displaySymbol: "KOSDAQ",
      country: "KR",
      region: "APEC",
      assetType: "index",
      timezone: "Asia/Seoul",
    },
    {
      name: "S&P/ASX 200",
      symbol: "^AXJO",
      displaySymbol: "ASX200",
      country: "AU",
      region: "APEC",
      assetType: "index",
      timezone: "Australia/Sydney",
    },
    {
      name: "Straits Times Index",
      symbol: "^STI",
      displaySymbol: "STI",
      country: "SG",
      region: "APEC",
      assetType: "index",
      timezone: "Asia/Singapore",
    },
    {
      name: "IDX Composite",
      symbol: "^JKSE",
      displaySymbol: "IHSG",
      country: "ID",
      region: "APEC",
      assetType: "index",
      timezone: "Asia/Jakarta",
    },
  ],
  EMEA: [
    {
      name: "EURO STOXX 50",
      symbol: "^STOXX50E",
      displaySymbol: "SX5E",
      country: "EU",
      region: "EMEA",
      assetType: "index",
      timezone: "Europe/Berlin",
    },
    {
      name: "DAX",
      symbol: "^GDAXI",
      displaySymbol: "DAX",
      country: "DE",
      region: "EMEA",
      assetType: "index",
      timezone: "Europe/Berlin",
    },
    {
      name: "FTSE 100",
      symbol: "^FTSE",
      displaySymbol: "UK100",
      country: "GB",
      region: "EMEA",
      assetType: "index",
      timezone: "Europe/London",
    },
    {
      name: "CAC 40",
      symbol: "^FCHI",
      displaySymbol: "FCHI",
      country: "FR",
      region: "EMEA",
      assetType: "index",
      timezone: "Europe/Paris",
    },
    {
      name: "FTSE MIB",
      symbol: "FTSEMIB.MI",
      displaySymbol: "FTSE MIB",
      country: "IT",
      region: "EMEA",
      assetType: "index",
      timezone: "Europe/Rome",
    },
    {
      name: "Swiss Market Index",
      symbol: "^SSMI",
      displaySymbol: "SMI",
      country: "CH",
      region: "EMEA",
      assetType: "index",
      timezone: "Europe/Zurich",
    },
    {
      name: "IBEX 35",
      symbol: "^IBEX",
      displaySymbol: "IBEX35",
      country: "ES",
      region: "EMEA",
      assetType: "index",
      timezone: "Europe/Madrid",
    },
    {
      name: "AEX Index",
      symbol: "^AEX",
      displaySymbol: "AEX",
      country: "NL",
      region: "EMEA",
      assetType: "index",
      timezone: "Europe/Amsterdam",
    },
    {
      name: "OMX Stockholm 30",
      symbol: "^OMX",
      displaySymbol: "OMXS30",
      country: "SE",
      region: "EMEA",
      assetType: "index",
      timezone: "Europe/Stockholm",
    },
    {
      name: "Tadawul All Share Index",
      symbol: "^TASI.SR",
      displaySymbol: "TASI",
      country: "SA",
      region: "EMEA",
      assetType: "index",
      timezone: "Asia/Riyadh",
    },
  ],
};

export const CRYPTO_SYMBOLS: MarketSymbolItem[] = [
  {
    name: "Bitcoin",
    symbol: "BTC-USD",
    displaySymbol: "BTC",
    country: "GLOBAL",
    region: "Global",
    assetType: "crypto",
    timezone: "UTC",
  },
  {
    name: "Ethereum",
    symbol: "ETH-USD",
    displaySymbol: "ETH",
    country: "GLOBAL",
    region: "Global",
    assetType: "crypto",
    timezone: "UTC",
  },
  {
    name: "Tether",
    symbol: "USDT-USD",
    displaySymbol: "USDT",
    country: "GLOBAL",
    region: "Global",
    assetType: "crypto",
    timezone: "UTC",
  },
  {
    name: "USD Coin",
    symbol: "USDC-USD",
    displaySymbol: "USDC",
    country: "GLOBAL",
    region: "Global",
    assetType: "crypto",
    timezone: "UTC",
  },
  {
    name: "BNB",
    symbol: "BNB-USD",
    displaySymbol: "BNB",
    country: "GLOBAL",
    region: "Global",
    assetType: "crypto",
    timezone: "UTC",
  },
  {
    name: "Solana",
    symbol: "SOL-USD",
    displaySymbol: "SOL",
    country: "GLOBAL",
    region: "Global",
    assetType: "crypto",
    timezone: "UTC",
  },
  {
    name: "XRP",
    symbol: "XRP-USD",
    displaySymbol: "XRP",
    country: "GLOBAL",
    region: "Global",
    assetType: "crypto",
    timezone: "UTC",
  },
  {
    name: "TRON",
    symbol: "TRX-USD",
    displaySymbol: "TRX",
    country: "GLOBAL",
    region: "Global",
    assetType: "crypto",
    timezone: "UTC",
  },
  {
    name: "Dogecoin",
    symbol: "DOGE-USD",
    displaySymbol: "DOGE",
    country: "GLOBAL",
    region: "Global",
    assetType: "crypto",
    timezone: "UTC",
  },
  {
    name: "Cardano",
    symbol: "ADA-USD",
    displaySymbol: "ADA",
    country: "GLOBAL",
    region: "Global",
    assetType: "crypto",
    timezone: "UTC",
  },
];

export const CURRENCY_SYMBOLS: MarketSymbolItem[] = [
  {
    name: "EUR / USD",
    symbol: "EURUSD=X",
    displaySymbol: "EUR/USD",
    country: "GLOBAL",
    region: "Global",
    assetType: "currency",
    timezone: "America/New_York",
  },
  {
    name: "USD / JPY",
    symbol: "JPY=X",
    displaySymbol: "USD/JPY",
    country: "GLOBAL",
    region: "Global",
    assetType: "currency",
    timezone: "America/New_York",
  },
  {
    name: "GBP / USD",
    symbol: "GBPUSD=X",
    displaySymbol: "GBP/USD",
    country: "GLOBAL",
    region: "Global",
    assetType: "currency",
    timezone: "America/New_York",
  },
  {
    name: "USD / CAD",
    symbol: "CAD=X",
    displaySymbol: "USD/CAD",
    country: "GLOBAL",
    region: "Global",
    assetType: "currency",
    timezone: "America/New_York",
  },
  {
    name: "USD / CHF",
    symbol: "CHF=X",
    displaySymbol: "USD/CHF",
    country: "GLOBAL",
    region: "Global",
    assetType: "currency",
    timezone: "America/New_York",
  },
  {
    name: "AUD / USD",
    symbol: "AUDUSD=X",
    displaySymbol: "AUD/USD",
    country: "GLOBAL",
    region: "Global",
    assetType: "currency",
    timezone: "America/New_York",
  },
];

export const FUTURES_SYMBOLS: MarketSymbolItem[] = [
  {
    name: "Crude Oil Futures",
    symbol: "CL=F",
    displaySymbol: "OIL",
    country: "GLOBAL",
    region: "Global",
    assetType: "futures",
    timezone: "America/New_York",
  },
  {
    name: "Gold Futures",
    symbol: "GC=F",
    displaySymbol: "GOLD",
    country: "GLOBAL",
    region: "Global",
    assetType: "futures",
    timezone: "America/New_York",
  },
  {
    name: "Silver Futures",
    symbol: "SI=F",
    displaySymbol: "SILVER",
    country: "GLOBAL",
    region: "Global",
    assetType: "futures",
    timezone: "America/New_York",
  },
  {
    name: "Natural Gas Futures",
    symbol: "NG=F",
    displaySymbol: "GAS",
    country: "GLOBAL",
    region: "Global",
    assetType: "futures",
    timezone: "America/New_York",
  },
];

export const ALL_MARKET_SYMBOLS: MarketSymbolItem[] = [
  ...Object.values(MARKET_SYMBOLS).flat(),
  ...CRYPTO_SYMBOLS,
  ...CURRENCY_SYMBOLS,
  ...FUTURES_SYMBOLS,
];

// --- TIMEZONE-AWARE SCHEDULE HELPER ---

interface ExchangeSchedule {
  open: string; // "HH:mm" in local exchange timezone
  close: string; // "HH:mm" in local exchange timezone
  breakStart?: string;
  breakEnd?: string;
}

const LOCAL_SCHEDULES: Record<string, ExchangeSchedule> = {
  US: { open: "09:30", close: "16:00" },
  CA: { open: "09:30", close: "16:00" },
  JP: { open: "09:00", close: "15:00", breakStart: "11:30", breakEnd: "12:30" },
  CN: { open: "09:30", close: "15:00", breakStart: "11:30", breakEnd: "13:00" },
  HK: { open: "09:30", close: "16:00", breakStart: "12:00", breakEnd: "13:00" },
  KR: { open: "09:00", close: "15:30" },
  GB: { open: "08:00", close: "16:30" },
  DE: { open: "09:00", close: "17:30" },
  EU: { open: "09:00", close: "17:30" },
  MX: { open: "08:30", close: "15:00" },
  BR: { open: "10:00", close: "17:55" },
  SA: { open: "10:00", close: "15:00" },
};

function getLocalMinutes(
  date: Date,
  timezone: string,
): { day: number; mins: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(date);

  let hour = 0;
  let minute = 0;
  let dayName = "";

  for (const part of parts) {
    if (part.type === "weekday") dayName = part.value;
    if (part.type === "hour") hour = parseInt(part.value, 10) % 24;
    if (part.type === "minute") minute = parseInt(part.value, 10);
  }

  const dayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return { day: dayMap[dayName] ?? date.getUTCDay(), mins: hour * 60 + minute };
}

function parseMins(timeStr: string): number {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
}

export function isMarketOpen(item: MarketSymbolItem): boolean {
  if (item.assetType === "crypto") return true;

  const now = new Date();
  const tz = item.timezone || "America/New_York";
  const { day, mins } = getLocalMinutes(now, tz);

  // Forex market hours
  if (item.assetType === "currency") {
    if (day === 6) return false;
    if (day === 0 && mins < 17 * 60) return false; // Opens ~17:00 EST Sunday
    if (day === 5 && mins >= 17 * 60) return false; // Closes ~17:00 EST Friday
    return true;
  }

  // Stock/Index weekend check
  if (day === 0 || day === 6) return false;

  const sched = LOCAL_SCHEDULES[item.country] || LOCAL_SCHEDULES.US;
  const openMins = parseMins(sched.open);
  const closeMins = parseMins(sched.close);

  if (mins < openMins || mins >= closeMins) return false;

  if (sched.breakStart && sched.breakEnd) {
    const bStart = parseMins(sched.breakStart);
    const bEnd = parseMins(sched.breakEnd);
    if (mins >= bStart && mins < bEnd) return false;
  }

  return true;
}

export function getMarketCloseTarget(item: MarketSymbolItem): Date {
  const target = new Date();
  if (item.assetType === "crypto") {
    target.setUTCHours(23, 59, 59, 999);
    return target;
  }

  // Use dynamic market state verification
  if (!isMarketOpen(item)) {
    target.setMinutes(target.getMinutes() + 15);
    return target;
  }

  target.setHours(target.getHours() + 1);
  return target;
}

export function getMarketOpenTarget(item: MarketSymbolItem): Date {
  const now = new Date();
  const target = new Date(now);
  target.setMinutes(target.getMinutes() + 30);
  return target;
}
