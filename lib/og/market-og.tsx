import "server-only";

import { ImageResponse } from "next/og";
import { unstable_cache } from "next/cache";

import { GET as getCandles } from "@/app/api/candles/route";
import { ALL_MARKET_SYMBOLS } from "@/lib/data/market-symbols";

export const OG_SIZE = {
  width: 1200,
  height: 630,
};

interface Point {
  timestampMs: number;
  price: number;
}

interface CandleData {
  points: Point[];
  currentPrice: number;
  previousClose: number;
  updatedAt: number | null;
  lunchStartMs: number | null;
  lunchEndMs: number | null;
}

const getOgData = unstable_cache(
  async (symbol: string): Promise<CandleData> => {
    const url = new URL("https://bullbearvote.com/api/candles");

    url.searchParams.set("symbol", symbol);
    url.searchParams.set("range", "1D");
    url.searchParams.set("interval", "5m");

    // Direct server function call; no HTTP fetch.
    const response = await getCandles(new Request(url));

    if (!response.ok) {
      throw new Error(`OG market data failed: ${response.status}`);
    }

    const data = (await response.json()) as CandleData;

    if (!Number.isFinite(data.currentPrice) || data.currentPrice <= 0) {
      throw new Error("OG market price unavailable.");
    }

    return {
      ...data,
      points: (data.points ?? [])
        .filter(
          (point) =>
            Number.isFinite(point.price) &&
            point.price > 0 &&
            Number.isFinite(point.timestampMs),
        )
        .sort((a, b) => a.timestampMs - b.timestampMs),
    };
  },
  ["market-og-data-v1"],
  { revalidate: 300 },
);

const CHART_WIDTH = 1072;
const CHART_HEIGHT = 220;
const PADDING = 12;

function buildChart(data: CandleData) {
  const points = data.points;

  if (points.length === 0) return null;

  const previousClose =
    Number.isFinite(data.previousClose) && data.previousClose > 0
      ? data.previousClose
      : null;

  const prices = points.map((point) => point.price);

  if (previousClose !== null) prices.push(previousClose);

  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min;

  const firstTime = points[0].timestampMs;
  const lastTime = points[points.length - 1].timestampMs;
  const timeRange = lastTime - firstTime;

  const bottom = CHART_HEIGHT - PADDING;

  const getY = (price: number) =>
    range === 0
      ? CHART_HEIGHT / 2
      : bottom - ((price - min) / range) * (CHART_HEIGHT - PADDING * 2);

  const coords = points.map((point) => ({
    ...point,
    x:
      timeRange === 0
        ? CHART_WIDTH / 2
        : PADDING +
          ((point.timestampMs - firstTime) / timeRange) *
            (CHART_WIDTH - PADDING * 2),
    y: getY(point.price),
  }));

  let segments = [coords];

  const { lunchStartMs, lunchEndMs } = data;

  if (
    typeof lunchStartMs === "number" &&
    typeof lunchEndMs === "number" &&
    lunchEndMs > lunchStartMs
  ) {
    let before = -1;

    for (let index = coords.length - 1; index >= 0; index--) {
      if (coords[index].timestampMs <= lunchStartMs) {
        before = index;
        break;
      }
    }

    const after = coords.findIndex((point) => point.timestampMs >= lunchEndMs);

    if (before >= 0 && after > before) {
      segments = [coords.slice(0, before + 1), coords.slice(after)];
    }
  }

  const paths = segments.map((segment) => {
    const line = segment
      .map(
        (point, index) =>
          `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`,
      )
      .join(" ");

    const first = segment[0];
    const last = segment[segment.length - 1];

    return {
      line,
      area:
        segment.length > 1
          ? `${line} L ${last.x.toFixed(2)} ${bottom} L ${first.x.toFixed(2)} ${bottom} Z`
          : null,
    };
  });

  return {
    paths,
    last: coords[coords.length - 1],
    previousCloseY: previousClose !== null ? getY(previousClose) : null,
  };
}

function formatPrice(value: number) {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatTime(value: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(value));
}

export async function createMarketOg(symbol: string) {
  const market = ALL_MARKET_SYMBOLS.find((item) => item.symbol === symbol);

  const name = market?.name ?? symbol;

  let data: CandleData | null = null;

  try {
    data = await getOgData(symbol);
  } catch (error) {
    console.error("[market-og]", symbol, error);
  }

  const hasPreviousClose =
    data !== null &&
    Number.isFinite(data.previousClose) &&
    data.previousClose > 0;

  const change =
    data && hasPreviousClose ? data.currentPrice - data.previousClose : null;

  const percent =
    change !== null && data ? (change / data.previousClose) * 100 : null;

  const color =
    change === null || change === 0
      ? "#a1a1aa"
      : change > 0
        ? "#09b374"
        : "#ed1838";

  const sign = change !== null && change > 0 ? "+" : "";
  const chart = data ? buildChart(data) : null;
  const updatedAt = data ? formatTime(data.updatedAt) : null;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        padding: "44px 64px",
        background: "#101214",
        color: "#fafafa",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <svg width="44" height="44" viewBox="0 0 44 44">
            <rect x="1" y="2" width="34" height="19" rx="9.5" fill="#398fba" />
            <path
              d="M20 12 L20 34 L26 29 L31 40 L36 38 L31 27 L40 26 Z"
              fill="#e4e4e7"
              stroke="#18181b"
              strokeWidth="3"
              strokeLinejoin="round"
            />
          </svg>

          <span style={{ fontSize: 28, fontWeight: 700 }}>BullBearVote</span>
        </div>

        <span style={{ fontSize: 19, color: "#a1a1aa" }}>
          Market predictions & discussion
        </span>
      </div>

      <div
        style={{
          display: "flex",
          marginTop: 28,
          fontSize: name.length > 36 ? 32 : 42,
          fontWeight: 700,
          lineHeight: 1.2,
          maxHeight: 100,
          overflow: "hidden",
        }}
      >
        {name}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 24,
          marginTop: 12,
        }}
      >
        <span style={{ fontSize: 56, fontWeight: 700 }}>
          {data ? formatPrice(data.currentPrice) : "Data unavailable"}
        </span>

        {change !== null && percent !== null && (
          <span style={{ fontSize: 28, color }}>
            {`${sign}${formatPrice(change)} (${sign}${percent.toFixed(2)}%)`}
          </span>
        )}
      </div>

      <div
        style={{
          display: "flex",
          marginTop: 22,
          width: CHART_WIDTH,
          height: CHART_HEIGHT,
          flexShrink: 0,
        }}
      >
        {chart ? (
          <svg
            width={CHART_WIDTH}
            height={CHART_HEIGHT}
            viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          >
            <defs>
              <linearGradient id="og-area" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity="0.25" />
                <stop offset="100%" stopColor={color} stopOpacity="0" />
              </linearGradient>
            </defs>

            {chart.previousCloseY !== null && (
              <line
                x1={PADDING}
                x2={CHART_WIDTH - PADDING}
                y1={chart.previousCloseY}
                y2={chart.previousCloseY}
                stroke="#52525b"
                strokeWidth="1.5"
                strokeDasharray="5 5"
              />
            )}

            {chart.paths.map((path, index) => (
              <g key={index}>
                {path.area && <path d={path.area} fill="url(#og-area)" />}

                <path
                  d={path.line}
                  fill="none"
                  stroke={color}
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>
            ))}

            <circle cx={chart.last.x} cy={chart.last.y} r="5" fill={color} />
          </svg>
        ) : (
          <div
            style={{
              display: "flex",
              width: "100%",
              height: "100%",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 16,
              background: "#18181b",
              color: "#a1a1aa",
              fontSize: 24,
            }}
          >
            Chart temporarily unavailable
          </div>
        )}
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: "auto",
          fontSize: 18,
          color: "#a1a1aa",
        }}
      >
        <span>bullbearvote.com</span>
        <span>
          {updatedAt
            ? `As of ${updatedAt} UTC · Latest session`
            : "Latest session"}
        </span>
      </div>
    </div>,
    {
      ...OG_SIZE,
      headers: {
        // Retry sooner if the data provider is unavailable.
        "Cache-Control": data
          ? "public, max-age=300, s-maxage=300"
          : "public, max-age=30, s-maxage=30",
      },
    },
  );
}
