"use client";

import React, { useId, useState } from "react";

import {
  AreaChart,
  CandlestickChart,
  BarChart3,
  ChartLine,
  Minimize2,
} from "lucide-react";

export type ChartType = "line" | "area" | "candle" | "bar";

export interface DetailChartProps {
  history: {
    timestampMs: number;
    price: number;
    open?: number;
    high?: number;
    low?: number;
    close?: number;
  }[];

  isPositive: boolean;
  isClosed: boolean;
  range: string;
  previousClose?: number;

  lunchStartMs?: number | null;
  lunchEndMs?: number | null;

  exchangeTimezone?: string;

  // 해당 데이터 거래일의 실제 개장·폐장 시각
  // Unix timestamp in milliseconds
  sessionStartMs?: number | null;
  sessionEndMs?: number | null;

  onClick?: () => void;
}

const chartTypeOptions: {
  id: ChartType;
  label: string;
  icon: typeof ChartLine;
}[] = [
  { id: "line", label: "Line", icon: ChartLine },
  { id: "area", label: "Area", icon: AreaChart },
  { id: "candle", label: "Candle", icon: CandlestickChart },
  { id: "bar", label: "Bar", icon: BarChart3 },
];

export function DetailChart({
  history,
  isPositive,
  range,
  previousClose,
  lunchStartMs,
  lunchEndMs,
  exchangeTimezone,
  sessionStartMs,
  sessionEndMs,
  onClick,
}: DetailChartProps) {
  const chartId = useId().replace(/:/g, "");

  const [chartType, setChartType] = useState<ChartType>("area");

  const [hoveredPoint, setHoveredPoint] = useState<{
    x: number;
    y: number;
    price: number;
    percentChange: number;
    timeStr: string;
  } | null>(null);

  const data = (history ?? [])
    .filter(
      (point) =>
        Number.isFinite(point.timestampMs) && Number.isFinite(point.price),
    )
    .slice()
    .sort((a, b) => a.timestampMs - b.timestampMs);

  if (data.length === 0) {
    return (
      <div className="flex h-64 w-full items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <span className="text-xs text-zinc-400">No chart data available</span>
      </div>
    );
  }

  // --------------------------------------------------
  // LAYOUT
  // --------------------------------------------------

  const width = 800;
  const height = 320;

  const paddingLeft = 65;
  const paddingRight = 20;
  const paddingTop = 30;
  const paddingBottom = 40;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const chartRight = paddingLeft + chartWidth;
  const chartBottom = paddingTop + chartHeight;

  // --------------------------------------------------
  // TIME RANGE
  // --------------------------------------------------

  const is1D = range === "1D";

  const firstTimestamp = data[0].timestampMs;
  const lastTimestamp = data[data.length - 1].timestampMs;

  const hasSessionRange =
    is1D &&
    typeof sessionStartMs === "number" &&
    Number.isFinite(sessionStartMs) &&
    typeof sessionEndMs === "number" &&
    Number.isFinite(sessionEndMs) &&
    sessionEndMs > sessionStartMs &&
    firstTimestamp >= sessionStartMs &&
    lastTimestamp <= sessionEndMs;

  // 1D uses the entire session, even when only a few
  // minutes of actual data are available.
  const axisStartMs = hasSessionRange ? sessionStartMs : firstTimestamp;

  const axisEndMs = hasSessionRange ? sessionEndMs : lastTimestamp;

  const fullTimeRange = Math.max(axisEndMs - axisStartMs, 1);

  function getX(timestampMs: number) {
    const ratio = (timestampMs - axisStartMs) / fullTimeRange;

    return paddingLeft + Math.max(0, Math.min(1, ratio)) * chartWidth;
  }

  // --------------------------------------------------
  // PRICE RANGE
  // --------------------------------------------------

  const validPreviousClose =
    typeof previousClose === "number" && Number.isFinite(previousClose)
      ? previousClose
      : undefined;

  const priceValues = data.flatMap((point) => {
    const values = [point.price];

    if (chartType === "candle") {
      for (const value of [point.open, point.high, point.low, point.close]) {
        if (typeof value === "number" && Number.isFinite(value)) {
          values.push(value);
        }
      }
    }

    return values;
  });

  if (validPreviousClose !== undefined) {
    priceValues.push(validPreviousClose);
  }

  const rawMin = Math.min(...priceValues);
  const rawMax = Math.max(...priceValues);
  const rawPriceRange = rawMax - rawMin;

  const pricePadding =
    rawPriceRange === 0
      ? Math.max(Math.abs(rawMin) * 0.005, 0.01)
      : rawPriceRange * 0.05;

  const min = rawMin - pricePadding;
  const max = rawMax + pricePadding;
  const priceRange = max - min || 1;

  const baselinePrice = validPreviousClose ?? data[0].price;

  function getY(price: number) {
    return (
      paddingTop + chartHeight - ((price - min) / priceRange) * chartHeight
    );
  }

  // --------------------------------------------------
  // CHART COORDINATES
  // --------------------------------------------------

  const coords = data.map((point, index) => {
    const previousPrice = index > 0 ? data[index - 1].price : point.price;

    const open =
      typeof point.open === "number" && Number.isFinite(point.open)
        ? point.open
        : previousPrice;

    const close =
      typeof point.close === "number" && Number.isFinite(point.close)
        ? point.close
        : point.price;

    const high =
      typeof point.high === "number" && Number.isFinite(point.high)
        ? point.high
        : Math.max(open, close);

    const low =
      typeof point.low === "number" && Number.isFinite(point.low)
        ? point.low
        : Math.min(open, close);

    return {
      x: getX(point.timestampMs),
      y: getY(point.price),
      price: point.price,
      timestampMs: point.timestampMs,
      openY: getY(open),
      closeY: getY(close),
      highY: getY(high),
      lowY: getY(low),
      isRising: close >= open,
    };
  });

  const firstPoint = coords[0];
  const lastPoint = coords[coords.length - 1];

  // --------------------------------------------------
  // LUNCH BREAK
  // --------------------------------------------------

  const hasLunch =
    is1D &&
    typeof lunchStartMs === "number" &&
    Number.isFinite(lunchStartMs) &&
    typeof lunchEndMs === "number" &&
    Number.isFinite(lunchEndMs) &&
    lunchEndMs > lunchStartMs;

  let preLunchCoords = coords;
  let postLunchCoords: typeof coords = [];

  let lunchStartPoint: (typeof coords)[number] | undefined;
  let lunchEndPoint: (typeof coords)[number] | undefined;

  if (hasLunch) {
    let beforeLunchIndex = -1;

    for (let index = coords.length - 1; index >= 0; index--) {
      if (coords[index].timestampMs < lunchStartMs) {
        beforeLunchIndex = index;
        break;
      }
    }

    const afterLunchIndex = coords.findIndex(
      (point) => point.timestampMs >= lunchEndMs,
    );

    if (
      beforeLunchIndex !== -1 &&
      afterLunchIndex !== -1 &&
      afterLunchIndex > beforeLunchIndex
    ) {
      lunchStartPoint = coords[beforeLunchIndex];
      lunchEndPoint = coords[afterLunchIndex];

      preLunchCoords = coords.slice(0, beforeLunchIndex + 1);
      postLunchCoords = coords.slice(afterLunchIndex);
    }
  }

  // --------------------------------------------------
  // PATH HELPERS
  // --------------------------------------------------

  function buildPath(points: typeof coords) {
    return points
      .map((point, index) =>
        index === 0 ? `M ${point.x},${point.y}` : `L ${point.x},${point.y}`,
      )
      .join(" ");
  }

  function buildArea(points: typeof coords) {
    if (points.length < 2) {
      return "";
    }

    const path = buildPath(points);
    const first = points[0];
    const last = points[points.length - 1];

    return (
      `${path} ` +
      `L ${last.x},${chartBottom} ` +
      `L ${first.x},${chartBottom} Z`
    );
  }

  const segments = [preLunchCoords, postLunchCoords].filter(
    (points) => points.length > 0,
  );

  // --------------------------------------------------
  // Y GRID / LABELS
  // --------------------------------------------------

  const yTicks = Array.from({ length: 5 }, (_, index) => {
    const ratio = index / 4;

    return {
      price: min + ratio * priceRange,
      y: paddingTop + chartHeight - ratio * chartHeight,
    };
  });

  // --------------------------------------------------
  // DATE / TIME FORMATTERS
  // --------------------------------------------------

  const timezoneOptions = exchangeTimezone
    ? { timeZone: exchangeTimezone }
    : {};

  const timeFormatter = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    ...timezoneOptions,
  });

  const dateFormatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    ...timezoneOptions,
  });

  function formatTimeLabel(timestampMs: number) {
    return timeFormatter.format(new Date(timestampMs));
  }

  function formatDateLabel(timestampMs: number) {
    return dateFormatter.format(new Date(timestampMs));
  }

  function getLocalTimeParts(timestampMs: number) {
    const parts = timeFormatter.formatToParts(new Date(timestampMs));

    return {
      hour: Number(parts.find((part) => part.type === "hour")?.value ?? 0) % 24,
      minute: Number(parts.find((part) => part.type === "minute")?.value ?? 0),
    };
  }

  // --------------------------------------------------
  // X GRID
  // --------------------------------------------------

  let xTicks: {
    label: string;
    x: number;
  }[] = [];

  if (is1D) {
    const ONE_MINUTE = 60 * 1000;
    const ONE_HOUR = 60 * ONE_MINUTE;
    const EDGE_MARGIN = 15 * ONE_MINUTE;

    const totalHours = fullTimeRange / ONE_HOUR;

    const tickEveryHours = totalHours >= 20 ? 4 : totalHours >= 6 ? 2 : 1;

    const scanStart = Math.ceil(axisStartMs / ONE_MINUTE) * ONE_MINUTE;

    for (
      let timestampMs = scanStart;
      timestampMs < axisEndMs;
      timestampMs += ONE_MINUTE
    ) {
      const { hour, minute } = getLocalTimeParts(timestampMs);

      if (minute !== 0 || hour % tickEveryHours !== 0) {
        continue;
      }

      if (
        timestampMs - axisStartMs > EDGE_MARGIN &&
        axisEndMs - timestampMs > EDGE_MARGIN
      ) {
        xTicks.push({
          label: formatTimeLabel(timestampMs),
          x: getX(timestampMs),
        });
      }
    }
  } else {
    xTicks = Array.from({ length: 4 }, (_, index) => {
      const ratio = index / 3;
      const timestampMs = axisStartMs + fullTimeRange * ratio;

      return {
        label:
          range === "5D"
            ? `${formatDateLabel(timestampMs)} ${formatTimeLabel(timestampMs)}`
            : formatDateLabel(timestampMs),
        x: paddingLeft + ratio * chartWidth,
      };
    });
  }

  // --------------------------------------------------
  // PREVIOUS CLOSE / COLOR
  // --------------------------------------------------

  const previousCloseY =
    validPreviousClose !== undefined ? getY(validPreviousClose) : null;

  const strokeColor = isPositive ? "#008549" : "#cf0000";
  const gradientId = `detail-area-gradient-${chartId}`;

  // --------------------------------------------------
  // HOVER
  // --------------------------------------------------

  function handleMouseMove(event: React.MouseEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect();

    const mouseX = ((event.clientX - rect.left) / rect.width) * width;

    const mouseY = ((event.clientY - rect.top) / rect.height) * height;

    // Future time has no data, so it has no tooltip.
    if (
      mouseX < paddingLeft ||
      mouseX > chartRight ||
      mouseY < paddingTop ||
      mouseY > chartBottom ||
      mouseX < firstPoint.x - 6 ||
      mouseX > lastPoint.x + 6
    ) {
      setHoveredPoint(null);
      return;
    }

    let closest = firstPoint;
    let minimumDistance = Math.abs(firstPoint.x - mouseX);

    for (let index = 1; index < coords.length; index++) {
      const distance = Math.abs(coords[index].x - mouseX);

      if (distance < minimumDistance) {
        minimumDistance = distance;
        closest = coords[index];
      }
    }

    // Do not select candles across the lunch break.
    if (
      hasLunch &&
      lunchStartPoint &&
      lunchEndPoint &&
      mouseX > getX(lunchStartMs) &&
      mouseX < getX(lunchEndMs)
    ) {
      setHoveredPoint(null);
      return;
    }

    const percentChange =
      baselinePrice !== 0
        ? ((closest.price - baselinePrice) / baselinePrice) * 100
        : 0;

    setHoveredPoint({
      x: closest.x,
      y: closest.y,
      price: closest.price,
      percentChange,
      timeStr:
        `${formatDateLabel(closest.timestampMs)}, ` +
        formatTimeLabel(closest.timestampMs),
    });
  }

  // --------------------------------------------------
  // CANDLE / BAR WIDTH
  // --------------------------------------------------

  let minimumPointSpacing = chartWidth / Math.max(coords.length, 1);

  for (let index = 1; index < coords.length; index++) {
    const spacing = coords[index].x - coords[index - 1].x;

    if (spacing > 0) {
      minimumPointSpacing = Math.min(minimumPointSpacing, spacing);
    }
  }

  const candleWidth = Math.max(Math.min(minimumPointSpacing * 0.7, 6), 1);

  const barWidth = Math.max(Math.min(minimumPointSpacing * 0.75, 7), 1);

  const hoverLabelX = hoveredPoint
    ? Math.max(paddingLeft, Math.min(chartRight - 120, hoveredPoint.x - 60))
    : 0;

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------

  return (
    <div className="relative w-full select-none bg-zinc-50 p-4 md:rounded-2xl md:border md:border-zinc-200 dark:bg-zinc-800/50 dark:md:border-zinc-800">
      {/* TOP CONTROL BAR */}

      <div className="relative z-5 flex items-center justify-between gap-6 dark:text-zinc-300">
        <div className="flex items-center">
          {chartTypeOptions.map((option) => {
            const Icon = option.icon;
            const isSelected = chartType === option.id;

            return (
              <button
                key={option.id}
                type="button"
                aria-label={`${option.label} chart`}
                aria-pressed={isSelected}
                onClick={() => {
                  setChartType(option.id);
                  setHoveredPoint(null);
                }}
                className={`flex cursor-pointer items-center justify-center rounded-sm px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 ${
                  isSelected
                    ? "text-zinc-900 dark:text-white"
                    : "text-zinc-600 hover:bg-zinc-200/60 dark:text-zinc-400 dark:hover:bg-zinc-700/50"
                }`}
              >
                <Icon className="size-3 md:size-4" />
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onClick}
          aria-label="Close chart"
          className="mr-2 flex size-7 cursor-pointer items-center justify-center rounded-sm text-zinc-600 transition-colors hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 dark:text-zinc-300 dark:hover:text-white"
        >
          <Minimize2 className="size-5" strokeWidth={1.5} />
        </button>
      </div>

      {/* HOVER PRICE BADGE */}

      {hoveredPoint && (
        <div className="jakarta absolute left-1/2 top-14 z-10 flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-sm border border-zinc-200 bg-white px-2.5 py-1 text-xs font-normal shadow-xs dark:border-zinc-700 dark:bg-zinc-800">
          <span className="text-zinc-600 dark:text-zinc-400">Price:</span>

          <span className="text-zinc-900 dark:text-zinc-100">
            {hoveredPoint.price.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>

          <span
            className={
              hoveredPoint.percentChange >= 0
                ? "text-emerald-700 dark:text-emerald-500"
                : "text-[#ff1414]"
            }
          >
            ({hoveredPoint.percentChange >= 0 ? "+" : ""}
            {hoveredPoint.percentChange.toFixed(2)}%)
          </span>
        </div>
      )}

      {/* MAIN SVG */}

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full cursor-crosshair overflow-visible"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredPoint(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.25" />

            <stop offset="100%" stopColor={strokeColor} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Y AXIS LABELS */}

        {yTicks.map((tick, index) => (
          <text
            key={index}
            x={paddingLeft - 12}
            y={tick.y + 4}
            textAnchor="end"
            className="jakarta fill-zinc-800 text-[12px] font-normal dark:fill-zinc-300 dark:font-light"
          >
            {tick.price.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </text>
        ))}

        {/* GRID BOUNDARIES */}

        {[paddingLeft, chartRight].map((x) => (
          <line
            key={x}
            x1={x}
            y1={paddingTop}
            x2={x}
            y2={chartBottom}
            stroke="#e2e8f0"
            strokeWidth="1"
            className="dark:stroke-zinc-600/50"
          />
        ))}

        {/* X GRID / LABELS */}

        {xTicks.map((tick, index) => (
          <g key={index}>
            <line
              x1={tick.x}
              y1={paddingTop}
              x2={tick.x}
              y2={chartBottom}
              stroke="#e2e8f0"
              strokeWidth="1"
              className="dark:stroke-zinc-600/50"
            />

            <text
              x={tick.x}
              y={chartBottom + 20}
              textAnchor="middle"
              className="jakarta fill-zinc-800 text-[12px] font-normal dark:fill-zinc-300 dark:font-light"
            >
              {tick.label}
            </text>
          </g>
        ))}

        {/* PREVIOUS CLOSE */}

        {validPreviousClose !== undefined && previousCloseY !== null && (
          <g>
            <line
              x1={paddingLeft}
              y1={previousCloseY}
              x2={chartRight}
              y2={previousCloseY}
              stroke="#94a3b8"
              strokeDasharray="2 3"
              strokeWidth="1.5"
            />

            <text
              x={chartRight - 10}
              y={previousCloseY - 6}
              textAnchor="end"
              className="jakarta fill-zinc-800 text-[12px] font-normal dark:fill-zinc-300 dark:font-light"
            >
              Prev. close{" "}
              {validPreviousClose.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </text>
          </g>
        )}

        {/* AREA / LINE CHART */}

        {(chartType === "area" || chartType === "line") &&
          segments.map((points, index) => {
            const path = buildPath(points);
            const area = buildArea(points);

            return (
              <g key={index}>
                {chartType === "area" && area && (
                  <path d={area} fill={`url(#${gradientId})`} />
                )}

                {points.length >= 2 && (
                  <path
                    d={path}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth="1.25"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {points.length === 1 && points[0] !== lastPoint && (
                  <circle
                    cx={points[0].x}
                    cy={points[0].y}
                    r="2.5"
                    fill={strokeColor}
                  />
                )}
              </g>
            );
          })}

        {/* LUNCH BREAK */}

        {hasLunch &&
          lunchStartPoint &&
          lunchEndPoint &&
          (chartType === "line" || chartType === "area") && (
            <g>
              <line
                x1={lunchStartPoint.x}
                y1={lunchStartPoint.y}
                x2={lunchEndPoint.x}
                y2={lunchStartPoint.y}
                stroke={strokeColor}
                strokeDasharray="2.5 2.5"
                strokeWidth="1.5"
                strokeLinecap="round"
                opacity="0.6"
              />

              <text
                x={(lunchStartPoint.x + lunchEndPoint.x) / 2}
                y={(lunchStartPoint.y + lunchEndPoint.y) / 2 - 10}
                textAnchor="middle"
                className="fill-zinc-700 text-[15px] font-medium tracking-wide dark:fill-zinc-400"
              >
                Lunch Break
              </text>
            </g>
          )}

        {/* CANDLESTICK */}

        {chartType === "candle" && (
          <g>
            {coords.map((point, index) => {
              const color = point.isRising ? "#008549" : "#cf0000";

              const candleTop = Math.min(point.openY, point.closeY);

              const candleHeight = Math.max(
                Math.abs(point.closeY - point.openY),
                1.5,
              );

              return (
                <g key={index}>
                  <line
                    x1={point.x}
                    y1={point.highY}
                    x2={point.x}
                    y2={point.lowY}
                    stroke={color}
                    strokeWidth="1.25"
                  />

                  <rect
                    x={point.x - candleWidth / 2}
                    y={candleTop}
                    width={candleWidth}
                    height={candleHeight}
                    fill={color}
                    rx="0.5"
                  />
                </g>
              );
            })}
          </g>
        )}

        {/* BAR */}

        {chartType === "bar" && (
          <g>
            {coords.map((point, index) => (
              <rect
                key={index}
                x={point.x - barWidth / 2}
                y={point.y}
                width={barWidth}
                height={chartBottom - point.y}
                fill={
                  point.isRising
                    ? "rgba(0, 133, 73, 0.45)"
                    : "rgba(207, 0, 0, 0.45)"
                }
                stroke={point.isRising ? "#008549" : "#cf0000"}
                strokeWidth="0.5"
                rx="1"
              />
            ))}
          </g>
        )}

        {/* LATEST DATA POINT */}

        {!hoveredPoint && (chartType === "line" || chartType === "area") && (
          <circle
            cx={lastPoint.x}
            cy={lastPoint.y}
            r="4.5"
            fill={strokeColor}
          />
        )}

        {/* HOVER CROSSHAIR */}

        {hoveredPoint && (
          <g>
            <line
              x1={hoveredPoint.x}
              y1={paddingTop}
              x2={hoveredPoint.x}
              y2={chartBottom}
              stroke="#94a3b8"
              strokeDasharray="3 3"
              strokeWidth="1.5"
            />

            <circle
              cx={hoveredPoint.x}
              cy={hoveredPoint.y}
              r="5"
              fill={strokeColor}
              strokeWidth="2"
              className="stroke-white dark:stroke-zinc-200"
            />

            <g transform={`translate(${hoverLabelX}, ${chartBottom - 5})`}>
              <rect
                x="0"
                y="0"
                width="120"
                height="24"
                rx="6"
                className="fill-white stroke-zinc-300 dark:fill-zinc-800 dark:stroke-zinc-700"
              />

              <text
                x="60"
                y="16"
                textAnchor="middle"
                className="fill-zinc-700 text-[10.5px] font-medium dark:fill-zinc-200"
              >
                {hoveredPoint.timeStr}
              </text>
            </g>
          </g>
        )}
      </svg>
    </div>
  );
}
