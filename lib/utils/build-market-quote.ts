import type {
  AssetType,
  ChartPoint,
  ChartRange,
  MarketItem,
} from "@/app/hooks/useMarketQuote";

export interface MarketCandlesData {
  points?: ChartPoint[];
  currentPrice?: number;
  previousClose?: number;
  rangeBasePrice?: number | null;

  isClosed?: boolean;
  marketOpenMs?: number | null;
  marketCloseMs?: number | null;

  updatedAt?: number | string | null;
  exchangeTimezone?: string;

  lunchStartMs?: number | null;
  lunchEndMs?: number | null;
}

export interface InitialMarketQuote {
  data: MarketItem;
  fetchedAt: number;
}

function isValidPrice(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

export function buildMarketQuote({
  candles,
  symbol,
  name,
  displaySymbol,
  assetType,
  range,
}: {
  candles: MarketCandlesData;
  symbol: string;
  name: string;
  displaySymbol: string;
  assetType: AssetType;
  range: ChartRange;
}): MarketItem {
  const points = Array.isArray(candles.points)
    ? candles.points.filter(
        (point) =>
          point &&
          isValidPrice(point.price) &&
          Number.isFinite(point.timestampMs),
      )
    : [];

  const lastPoint = points.at(-1);

  const currentPrice = isValidPrice(candles.currentPrice)
    ? candles.currentPrice
    : lastPoint?.price;

  if (!isValidPrice(currentPrice)) {
    throw new Error("No market data available");
  }

  const previousClose = isValidPrice(candles.previousClose)
    ? candles.previousClose
    : undefined;

  const rangeBasePrice = isValidPrice(candles.rangeBasePrice)
    ? candles.rangeBasePrice
    : undefined;

  const firstPoint = points[0];
  const firstOpen = firstPoint?.open;
  const fallbackStartPrice =
    typeof firstOpen === "number" && isValidPrice(firstOpen)
      ? firstOpen
      : firstPoint?.price;

  const basePrice =
    rangeBasePrice ??
    (range === "1D"
      ? (previousClose ?? fallbackStartPrice)
      : (fallbackStartPrice ?? previousClose)) ??
    currentPrice;

  const changeValue = currentPrice - basePrice;
  const percentValue = (changeValue / basePrice) * 100;

  const decimals = assetType === "currency" ? 4 : 2;

  return {
    id: symbol,
    name,
    displaySymbol,

    value: currentPrice.toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }),

    change: `${changeValue >= 0 ? "+" : ""}${changeValue.toFixed(2)}`,
    percent: `${percentValue >= 0 ? "+" : ""}${percentValue.toFixed(2)}%`,
    isPositive: percentValue >= 0,

    history: points,
    rawPrice: currentPrice,
    previousClose,

    isClosed: candles.isClosed ?? true,
    marketOpenMs: candles.marketOpenMs ?? null,
    marketCloseMs: candles.marketCloseMs ?? null,

    updatedAt: candles.updatedAt ?? lastPoint?.timestampMs,
    exchangeTimezone: candles.exchangeTimezone,

    lunchStartMs: candles.lunchStartMs ?? null,
    lunchEndMs: candles.lunchEndMs ?? null,
  };
}
