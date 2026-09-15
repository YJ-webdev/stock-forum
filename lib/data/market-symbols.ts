export type MarketRegion = "America" | "APEC" | "EMEA" | "Global";

export type AssetType = "index" | "stock" | "crypto" | "currency" | "futures";

// -----------------------------------------------------------------------------
// MARKET SCHEDULE
// -----------------------------------------------------------------------------

export type MarketSchedule =
  | "US_EQUITY"
  | "CA_EQUITY"
  | "BR_EQUITY"
  | "MX_EQUITY"
  | "JP_EQUITY"
  | "CN_EQUITY"
  | "HK_EQUITY"
  | "IN_EQUITY"
  | "TW_EQUITY"
  | "KR_EQUITY"
  | "AU_EQUITY"
  | "SG_EQUITY"
  | "ID_EQUITY"
  | "EU_EQUITY"
  | "DE_EQUITY"
  | "GB_EQUITY"
  | "FR_EQUITY"
  | "IT_EQUITY"
  | "CH_EQUITY"
  | "ES_EQUITY"
  | "NL_EQUITY"
  | "SE_EQUITY"
  | "SA_EQUITY";

export interface TradingHours {
  timezone: string;
  open: string;
  close: string;
}

// -----------------------------------------------------------------------------
// SYMBOL TYPE
// -----------------------------------------------------------------------------

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

  marketSchedule?: MarketSchedule;
}

// -----------------------------------------------------------------------------
// NORMAL TRADING HOURS
//
// These are normal weekday sessions only.
//
// Holidays, half-days, lunch breaks and special sessions
// will be handled separately.
// -----------------------------------------------------------------------------

export const TRADING_HOURS: Record<MarketSchedule, TradingHours> = {
  // ---------------------------------------------------------------------------
  // AMERICA
  // ---------------------------------------------------------------------------

  US_EQUITY: {
    timezone: "America/New_York",
    open: "09:30",
    close: "16:00",
  },

  CA_EQUITY: {
    timezone: "America/Toronto",
    open: "09:30",
    close: "16:00",
  },

  BR_EQUITY: {
    timezone: "America/Sao_Paulo",
    open: "10:00",
    close: "17:55",
  },

  MX_EQUITY: {
    timezone: "America/Mexico_City",
    open: "08:30",
    close: "15:00",
  },

  // ---------------------------------------------------------------------------
  // APEC
  // ---------------------------------------------------------------------------

  JP_EQUITY: {
    timezone: "Asia/Tokyo",
    open: "09:00",
    close: "15:30",
  },

  CN_EQUITY: {
    timezone: "Asia/Shanghai",
    open: "09:30",
    close: "15:00",
  },

  HK_EQUITY: {
    timezone: "Asia/Hong_Kong",
    open: "09:30",
    close: "16:00",
  },

  IN_EQUITY: {
    timezone: "Asia/Kolkata",
    open: "09:15",
    close: "15:30",
  },

  TW_EQUITY: {
    timezone: "Asia/Taipei",
    open: "09:00",
    close: "13:30",
  },

  KR_EQUITY: {
    timezone: "Asia/Seoul",
    open: "09:00",
    close: "15:30",
  },

  AU_EQUITY: {
    timezone: "Australia/Sydney",
    open: "10:00",
    close: "16:00",
  },

  SG_EQUITY: {
    timezone: "Asia/Singapore",
    open: "09:00",
    close: "17:00",
  },

  ID_EQUITY: {
    timezone: "Asia/Jakarta",
    open: "09:00",
    close: "16:00",
  },

  // ---------------------------------------------------------------------------
  // EMEA
  // ---------------------------------------------------------------------------

  EU_EQUITY: {
    timezone: "Europe/Berlin",
    open: "09:00",
    close: "17:30",
  },

  DE_EQUITY: {
    timezone: "Europe/Berlin",
    open: "09:00",
    close: "17:30",
  },

  GB_EQUITY: {
    timezone: "Europe/London",
    open: "08:00",
    close: "16:30",
  },

  FR_EQUITY: {
    timezone: "Europe/Paris",
    open: "09:00",
    close: "17:30",
  },

  IT_EQUITY: {
    timezone: "Europe/Rome",
    open: "09:00",
    close: "17:30",
  },

  CH_EQUITY: {
    timezone: "Europe/Zurich",
    open: "09:00",
    close: "17:30",
  },

  ES_EQUITY: {
    timezone: "Europe/Madrid",
    open: "09:00",
    close: "17:30",
  },

  NL_EQUITY: {
    timezone: "Europe/Amsterdam",
    open: "09:00",
    close: "17:30",
  },

  SE_EQUITY: {
    timezone: "Europe/Stockholm",
    open: "09:00",
    close: "17:30",
  },

  SA_EQUITY: {
    timezone: "Asia/Riyadh",
    open: "10:00",
    close: "15:00",
  },
};

// -----------------------------------------------------------------------------
// MARKET SYMBOLS
// -----------------------------------------------------------------------------

export const MARKET_SYMBOLS: Record<string, MarketSymbolItem[]> = {
  // ===========================================================================
  // AMERICA
  // ===========================================================================

  America: [
    {
      name: "S&P 500",
      symbol: "^GSPC",
      displaySymbol: "SPX",
      country: "US",
      region: "America",
      assetType: "index",
      timezone: "America/New_York",
      marketSchedule: "US_EQUITY",
    },

    {
      name: "Nasdaq 100",
      symbol: "^NDX",
      displaySymbol: "NDX",
      country: "US",
      region: "America",
      assetType: "index",
      timezone: "America/New_York",
      marketSchedule: "US_EQUITY",
    },

    {
      name: "Dow Jones Industrial Average",
      symbol: "^DJI",
      displaySymbol: "DJI",
      country: "US",
      region: "America",
      assetType: "index",
      timezone: "America/New_York",
      marketSchedule: "US_EQUITY",
    },

    {
      name: "Russell 2000",
      symbol: "^RUT",
      displaySymbol: "RUT",
      country: "US",
      region: "America",
      assetType: "index",
      timezone: "America/New_York",
      marketSchedule: "US_EQUITY",
    },

    {
      name: "S&P/TSX Composite Index",
      symbol: "^GSPTSE",
      displaySymbol: "TSX",
      country: "CA",
      region: "America",
      assetType: "index",
      timezone: "America/Toronto",
      marketSchedule: "CA_EQUITY",
    },

    {
      name: "Bovespa Index",
      symbol: "^BVSP",
      displaySymbol: "IBOV",
      country: "BR",
      region: "America",
      assetType: "index",
      timezone: "America/Sao_Paulo",
      marketSchedule: "BR_EQUITY",
    },

    {
      name: "S&P/BMV IPC",
      symbol: "^MXX",
      displaySymbol: "MEXBOL",
      country: "MX",
      region: "America",
      assetType: "index",
      timezone: "America/Mexico_City",
      marketSchedule: "MX_EQUITY",
    },
  ],

  // ===========================================================================
  // APEC
  // ===========================================================================

  APEC: [
    {
      name: "Nikkei 225",
      symbol: "^N225",
      displaySymbol: "N225",
      country: "JP",
      region: "APEC",
      assetType: "index",
      timezone: "Asia/Tokyo",
      marketSchedule: "JP_EQUITY",
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
      marketSchedule: "JP_EQUITY",
    },

    {
      name: "Shanghai Composite Index",
      symbol: "000001.SS",
      displaySymbol: "SSEC",
      country: "CN",
      region: "APEC",
      assetType: "index",
      timezone: "Asia/Shanghai",
      marketSchedule: "CN_EQUITY",
    },

    {
      name: "CSI 300 Index",
      symbol: "000300.SS",
      displaySymbol: "CSI300",
      country: "CN",
      region: "APEC",
      assetType: "index",
      timezone: "Asia/Shanghai",
      marketSchedule: "CN_EQUITY",
    },

    {
      name: "Hang Seng Index",
      symbol: "^HSI",
      displaySymbol: "HSI",
      country: "HK",
      region: "APEC",
      assetType: "index",
      timezone: "Asia/Hong_Kong",
      marketSchedule: "HK_EQUITY",
    },

    {
      name: "Nifty 50",
      symbol: "^NSEI",
      displaySymbol: "NIFTY",
      country: "IN",
      region: "APEC",
      assetType: "index",
      timezone: "Asia/Kolkata",
      marketSchedule: "IN_EQUITY",
    },

    {
      name: "TAIEX",
      symbol: "^TWII",
      displaySymbol: "TAIEX",
      country: "TW",
      region: "APEC",
      assetType: "index",
      timezone: "Asia/Taipei",
      marketSchedule: "TW_EQUITY",
    },

    {
      name: "KOSPI",
      symbol: "^KS11",
      displaySymbol: "KOSPI",
      country: "KR",
      region: "APEC",
      assetType: "index",
      timezone: "Asia/Seoul",
      marketSchedule: "KR_EQUITY",
    },

    {
      name: "KOSDAQ",
      symbol: "^KQ11",
      displaySymbol: "KOSDAQ",
      country: "KR",
      region: "APEC",
      assetType: "index",
      timezone: "Asia/Seoul",
      marketSchedule: "KR_EQUITY",
    },

    {
      name: "S&P/ASX 200",
      symbol: "^AXJO",
      displaySymbol: "ASX200",
      country: "AU",
      region: "APEC",
      assetType: "index",
      timezone: "Australia/Sydney",
      marketSchedule: "AU_EQUITY",
    },

    {
      name: "Straits Times Index",
      symbol: "^STI",
      displaySymbol: "STI",
      country: "SG",
      region: "APEC",
      assetType: "index",
      timezone: "Asia/Singapore",
      marketSchedule: "SG_EQUITY",
    },

    {
      name: "IDX Composite",
      symbol: "^JKSE",
      displaySymbol: "JCI",
      country: "ID",
      region: "APEC",
      assetType: "index",
      timezone: "Asia/Jakarta",
      marketSchedule: "ID_EQUITY",
    },

    {
      name: "Shenzhen Component",
      symbol: "399001.SZ",
      displaySymbol: "SZSE",
      country: "CN",
      region: "APEC",
      assetType: "index",
      timezone: "Asia/Shanghai",
      marketSchedule: "CN_EQUITY",
    },
  ],

  // ===========================================================================
  // EMEA
  // ===========================================================================

  EMEA: [
    {
      name: "EURO STOXX 50",
      symbol: "^STOXX50E",
      displaySymbol: "SX5E",
      country: "EU",
      region: "EMEA",
      assetType: "index",
      timezone: "Europe/Berlin",
      marketSchedule: "EU_EQUITY",
    },

    {
      name: "DAX",
      symbol: "^GDAXI",
      displaySymbol: "DAX",
      country: "DE",
      region: "EMEA",
      assetType: "index",
      timezone: "Europe/Berlin",
      marketSchedule: "DE_EQUITY",
    },

    {
      name: "FTSE 100",
      symbol: "^FTSE",
      displaySymbol: "UK100",
      country: "GB",
      region: "EMEA",
      assetType: "index",
      timezone: "Europe/London",
      marketSchedule: "GB_EQUITY",
    },

    {
      name: "CAC 40",
      symbol: "^FCHI",
      displaySymbol: "FCHI",
      country: "FR",
      region: "EMEA",
      assetType: "index",
      timezone: "Europe/Paris",
      marketSchedule: "FR_EQUITY",
    },

    {
      name: "FTSE MIB",
      symbol: "FTSEMIB.MI",
      displaySymbol: "FTSE MIB",
      country: "IT",
      region: "EMEA",
      assetType: "index",
      timezone: "Europe/Rome",
      marketSchedule: "IT_EQUITY",
    },

    {
      name: "Swiss Market Index",
      symbol: "^SSMI",
      displaySymbol: "SMI",
      country: "CH",
      region: "EMEA",
      assetType: "index",
      timezone: "Europe/Zurich",
      marketSchedule: "CH_EQUITY",
    },

    {
      name: "IBEX 35",
      symbol: "^IBEX",
      displaySymbol: "IBEX35",
      country: "ES",
      region: "EMEA",
      assetType: "index",
      timezone: "Europe/Madrid",
      marketSchedule: "ES_EQUITY",
    },

    {
      name: "AEX Index",
      symbol: "^AEX",
      displaySymbol: "AEX",
      country: "NL",
      region: "EMEA",
      assetType: "index",
      timezone: "Europe/Amsterdam",
      marketSchedule: "NL_EQUITY",
    },

    {
      name: "OMX Stockholm 30",
      symbol: "^OMX",
      displaySymbol: "OMXS30",
      country: "SE",
      region: "EMEA",
      assetType: "index",
      timezone: "Europe/Stockholm",
      marketSchedule: "SE_EQUITY",
    },

    {
      name: "Tadawul All Share Index",
      symbol: "^TASI.SR",
      displaySymbol: "TASI",
      country: "SA",
      region: "EMEA",
      assetType: "index",
      timezone: "Asia/Riyadh",
      marketSchedule: "SA_EQUITY",
    },
  ],
};

// -----------------------------------------------------------------------------
// CRYPTO
//
// Crypto is 24/7, so it intentionally has no marketSchedule.
// -----------------------------------------------------------------------------

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

// -----------------------------------------------------------------------------
// CURRENCIES
//
// Forex has a different weekly session model.
// We will handle that separately rather than forcing it into equity hours.
// -----------------------------------------------------------------------------

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

// -----------------------------------------------------------------------------
// FUTURES
//
// Futures also have their own sessions and maintenance breaks.
// We'll handle those separately.
// -----------------------------------------------------------------------------

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

// -----------------------------------------------------------------------------
// ALL SYMBOLS
// -----------------------------------------------------------------------------

export const ALL_MARKET_SYMBOLS: MarketSymbolItem[] = [
  ...Object.values(MARKET_SYMBOLS).flat(),
  ...CRYPTO_SYMBOLS,
  ...CURRENCY_SYMBOLS,
  ...FUTURES_SYMBOLS,
];
