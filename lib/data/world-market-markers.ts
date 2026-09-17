export interface WorldMarketMarker {
  symbol: string;
  name: string;
  displaySymbol: string;
  coordinates: [number, number];

  labelX?: number;
  labelY?: number;
}

export const WORLD_MARKET_MARKERS: WorldMarketMarker[] = [
  {
    symbol: "^GSPC",
    name: "S&P 500",
    displaySymbol: "SPX",
    coordinates: [-98, 38],
  },
  {
    symbol: "^MXX",
    name: "S&P/BMV IPC",
    displaySymbol: "MEXBOL",
    coordinates: [-102, 23],
  },

  // Europe
  {
    symbol: "^FTSE",
    name: "FTSE 100",
    displaySymbol: "FTSE",
    coordinates: [-3, 55],
    labelX: -18,
    labelY: -18,
  },
  {
    symbol: "^GDAXI",
    name: "DAX",
    displaySymbol: "DAX",
    coordinates: [10, 51],
    labelX: 20,
    labelY: -16,
  },
  {
    symbol: "^FCHI",
    name: "CAC 40",
    displaySymbol: "CAC",
    coordinates: [2, 46],
    labelX: -22,
    labelY: 18,
  },
  {
    symbol: "FTSEMIB.MI",
    name: "FTSE MIB",
    displaySymbol: "MIB",
    coordinates: [12, 42],
    labelX: 24,
    labelY: 20,
  },

  {
    symbol: "^NSEI",
    name: "NIFTY 50",
    displaySymbol: "NIFTY",
    coordinates: [79, 22],
  },

  {
    symbol: "^HSI",
    name: "Hang Seng",
    displaySymbol: "HSI",
    coordinates: [114, 22],
    labelX: -15,
    labelY: 20,
  },

  // East Asia
  // {
  //   symbol: "^KS11",
  //   name: "KOSPI",
  //   displaySymbol: "KOSPI",
  //   coordinates: [127.5, 36],
  //   labelX: -22,
  //   labelY: -17,
  // },
  {
    symbol: "^N225",
    name: "Nikkei 225",
    displaySymbol: "N225",
    coordinates: [138, 37],
    labelX: 23,
    labelY: -15,
  },

  {
    symbol: "^JKSE",
    name: "IDX Composite",
    displaySymbol: "JCI",
    coordinates: [118, -2],
  },
  {
    symbol: "^AXJO",
    name: "ASX 200",
    displaySymbol: "ASX",
    coordinates: [134, -25],
  },
];
