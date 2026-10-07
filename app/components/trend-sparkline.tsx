"use client";

import { useId } from "react";
import type { ChartPoint } from "@/app/hooks/useMarketQuote";

interface TrendSparklineProps {
  data?: ChartPoint[];
  isPositive?: boolean;
  width?: number;
  height?: number;

  sessionStartMs?: number | null;
  sessionEndMs?: number | null;

  lunchStartMs?: number | null;
  lunchEndMs?: number | null;
}

export function TrendSparkline({
  data = [],
  isPositive = true,
  width = 120,
  height = 40,
  sessionStartMs,
  sessionEndMs,
  lunchStartMs,
  lunchEndMs,
}: TrendSparklineProps) {
  const rawId = useId();

  const gradientId = `sparkline-gradient-${rawId.replace(/:/g, "")}`;

  const points = data.filter((point) => Number.isFinite(point.price)).slice();

  const hasValidTimestamps =
    points.length > 0 &&
    points.every((point) => Number.isFinite(point.timestampMs));

  if (hasValidTimestamps) {
    points.sort((a, b) => a.timestampMs - b.timestampMs);
  }

  if (points.length === 0) {
    return (
      <div
        style={{ width, height }}
        className="animate-pulse rounded bg-zinc-100 dark:bg-zinc-800"
      />
    );
  }

  // --------------------------------------------------
  // LAYOUT
  // --------------------------------------------------

  const paddingX = Math.min(3, width / 4);
  const paddingY = Math.min(4, height / 4);

  const plotWidth = Math.max(width - paddingX * 2, 1);
  const plotHeight = Math.max(height - paddingY * 2, 1);
  const chartBottom = height - paddingY;

  // --------------------------------------------------
  // PRICE RANGE
  // --------------------------------------------------

  const prices = points.map((point) => point.price);

  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice;

  function getY(price: number) {
    if (priceRange === 0) {
      return height / 2;
    }

    return chartBottom - ((price - minPrice) / priceRange) * plotHeight;
  }

  // --------------------------------------------------
  // TIME RANGE
  // --------------------------------------------------

  const firstTimestamp = points[0].timestampMs;
  const lastTimestamp = points[points.length - 1].timestampMs;

  const hasSessionRange =
    hasValidTimestamps &&
    typeof sessionStartMs === "number" &&
    Number.isFinite(sessionStartMs) &&
    typeof sessionEndMs === "number" &&
    Number.isFinite(sessionEndMs) &&
    sessionEndMs > sessionStartMs &&
    firstTimestamp >= sessionStartMs &&
    lastTimestamp <= sessionEndMs;

  const axisStartMs = hasSessionRange ? sessionStartMs : firstTimestamp;

  const axisEndMs = hasSessionRange ? sessionEndMs : lastTimestamp;

  const timeRange = Math.max(axisEndMs - axisStartMs, 1);

  function getX(timestampMs: number) {
    const ratio = (timestampMs - axisStartMs) / timeRange;

    return paddingX + Math.max(0, Math.min(1, ratio)) * plotWidth;
  }

  // --------------------------------------------------
  // COORDINATES
  // --------------------------------------------------

  const coords = points.map((point, index) => {
    let x: number;

    if (hasValidTimestamps) {
      x =
        !hasSessionRange && firstTimestamp === lastTimestamp
          ? paddingX + plotWidth / 2
          : getX(point.timestampMs);
    } else {
      x =
        points.length === 1
          ? paddingX + plotWidth / 2
          : paddingX + (index / (points.length - 1)) * plotWidth;
    }

    return {
      x,
      y: getY(point.price),
      timestampMs: point.timestampMs,
    };
  });

  // --------------------------------------------------
  // LUNCH BREAK
  // --------------------------------------------------

  const hasLunchSchedule =
    hasValidTimestamps &&
    typeof lunchStartMs === "number" &&
    Number.isFinite(lunchStartMs) &&
    typeof lunchEndMs === "number" &&
    Number.isFinite(lunchEndMs) &&
    lunchEndMs > lunchStartMs;

  let preLunchCoords = coords;
  let postLunchCoords: typeof coords = [];

  let lunchStartPoint: (typeof coords)[number] | undefined;
  let lunchEndPoint: (typeof coords)[number] | undefined;

  if (hasLunchSchedule) {
    let beforeLunchIndex = -1;

    for (let index = coords.length - 1; index >= 0; index--) {
      if (coords[index].timestampMs <= lunchStartMs) {
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

  const segments = [preLunchCoords, postLunchCoords].filter(
    (segment) => segment.length > 0,
  );

  // --------------------------------------------------
  // PATH HELPERS
  // --------------------------------------------------

  function buildPath(segment: typeof coords) {
    return segment
      .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x},${point.y}`)
      .join(" ");
  }

  function buildArea(segment: typeof coords) {
    if (segment.length < 2) {
      return "";
    }

    const first = segment[0];
    const last = segment[segment.length - 1];

    // Close the fill at the actual last point.
    // Future time stays empty.
    return (
      `${buildPath(segment)} ` +
      `L ${last.x},${chartBottom} ` +
      `L ${first.x},${chartBottom} Z`
    );
  }

  // --------------------------------------------------
  // COLORS / LAST POINT
  // --------------------------------------------------

  const strokeColorClass = isPositive
    ? "text-[#047857] dark:text-emerald-400"
    : "text-[#cf0000] dark:text-[#ff4545]";

  const lastPoint = coords[coords.length - 1];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Market price trend"
      className={`overflow-visible ${strokeColorClass}`}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.22" />

          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* BASELINE */}

      <line
        x1={paddingX}
        y1={chartBottom}
        x2={paddingX + plotWidth}
        y2={chartBottom}
        stroke="currentColor"
        strokeDasharray="2 2"
        strokeWidth="1.25"
        className="text-zinc-300 dark:text-zinc-700"
      />

      {/* AREA / LINE SEGMENTS */}

      {segments.map((segment, index) => {
        const area = buildArea(segment);

        return (
          <g key={index}>
            {area && <path d={area} fill={`url(#${gradientId})`} />}

            {segment.length >= 2 && (
              <path
                d={buildPath(segment)}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.25"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {segment.length === 1 && segment[0] !== lastPoint && (
              <circle
                cx={segment[0].x}
                cy={segment[0].y}
                r="1.75"
                fill="currentColor"
              />
            )}
          </g>
        );
      })}

      {/* LUNCH GAP */}

      {lunchStartPoint && lunchEndPoint && (
        <line
          x1={lunchStartPoint.x}
          y1={lunchStartPoint.y}
          x2={lunchEndPoint.x}
          y2={lunchStartPoint.y}
          stroke="currentColor"
          strokeDasharray="2.5 2.5"
          strokeWidth="1.5"
          opacity="0.55"
        />
      )}

      {/* LAST ACTUAL PRICE */}

      <g>
        <circle
          cx={lastPoint.x}
          cy={lastPoint.y}
          r="4"
          fill="currentColor"
          className="animate-ping opacity-10 motion-reduce:animate-none"
          style={{
            transformOrigin: `${lastPoint.x}px ${lastPoint.y}px`,
          }}
        />

        <circle
          cx={lastPoint.x}
          cy={lastPoint.y}
          r="1.75"
          fill="currentColor"
        />
      </g>
    </svg>
  );
}
