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

const validPrice = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value > 0;

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
  const points = (candles.points ?? [])
    .filter((p) => p && Number.isFinite(p.timestampMs) && validPrice(p.price))
    .slice()
    .sort((a, b) => a.timestampMs - b.timestampMs);

  const last = points.at(-1);
  const currentPrice = validPrice(candles.currentPrice)
    ? candles.currentPrice
    : last?.price;
  if (!validPrice(currentPrice))
    throw new Error("No valid market price available");

  const previousClose = validPrice(candles.previousClose)
    ? candles.previousClose
    : undefined;
  const first = points[0];
  const firstPrice = validPrice(first?.open) ? first.open : first?.price;
  const rangeBase = validPrice(candles.rangeBasePrice)
    ? candles.rangeBasePrice
    : undefined;
  const base =
    range === "1D" ? (previousClose ?? firstPrice) : (rangeBase ?? firstPrice);

  // A missing baseline is unknown, not a fabricated 0% return.
  const hasBase = validPrice(base);
  const change = hasBase ? currentPrice - base : null;
  const percent = hasBase ? (change! / base) * 100 : null;
  const decimals = assetType === "currency" ? 4 : 2;
  const signed = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(2)}`;

  return {
    id: symbol,
    name,
    displaySymbol,
    value: currentPrice.toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }),
    change: change === null ? "—" : signed(change),
    percent: percent === null ? "—" : `${signed(percent)}%`,
    isPositive: percent !== null && percent >= 0,
    history: points,
    rawPrice: currentPrice,
    previousClose,
    isClosed: candles.isClosed ?? true,
    marketOpenMs: candles.marketOpenMs ?? null,
    marketCloseMs: candles.marketCloseMs ?? null,
    updatedAt: candles.updatedAt ?? last?.timestampMs,
    exchangeTimezone: candles.exchangeTimezone,
    lunchStartMs: candles.lunchStartMs ?? null,
    lunchEndMs: candles.lunchEndMs ?? null,
  };
}
