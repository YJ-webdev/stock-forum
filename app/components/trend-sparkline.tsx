// components/ui/trend-sparkline.tsx
"use client";

import React, { useId } from "react";
import { ChartPoint } from "@/app/hooks/useMarketQuote";

interface TrendSparklineProps {
  data?: ChartPoint[];
  isPositive?: boolean;
  width?: number;
  height?: number;
  lunchStartMs?: number | null;
  lunchEndMs?: number | null;
}

export function TrendSparkline({
  data = [],
  isPositive = true,
  width = 120,
  height = 40,
  lunchStartMs,
  lunchEndMs,
}: TrendSparklineProps) {
  const rawId = useId();

  const gradientId = `sparkline-gradient-${
    isPositive ? "up" : "down"
  }-${rawId.replace(/:/g, "")}`;

  if (!data || data.length < 2) {
    return (
      <div
        style={{ width, height }}
        className="animate-pulse rounded bg-zinc-100 dark:bg-zinc-800"
      />
    );
  }

  // --------------------------------------------------
  // PRICE RANGE
  // --------------------------------------------------

  const prices = data.map((d) => d.price);

  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice || 1;

  // --------------------------------------------------
  // TIME RANGE
  // --------------------------------------------------

  const validTimestamps = data
    .map((d) => d.timestampMs)
    .filter((timestamp): timestamp is number => Number.isFinite(timestamp));

  const hasValidTimestamps = validTimestamps.length === data.length;

  const firstTimestamp = hasValidTimestamps ? validTimestamps[0] : undefined;

  const lastTimestamp = hasValidTimestamps
    ? validTimestamps[validTimestamps.length - 1]
    : undefined;

  const timeRange =
    firstTimestamp !== undefined &&
    lastTimestamp !== undefined &&
    lastTimestamp > firstTimestamp
      ? lastTimestamp - firstTimestamp
      : 1;

  // --------------------------------------------------
  // SVG COORDINATES
  //
  // IMPORTANT:
  // X uses actual timestamp.
  //
  // This means:
  //
  // 11:30 ------------ 13:00
  //
  // receives actual visual width instead of being
  // compressed into a single point step.
  // --------------------------------------------------

  const coords = data.map((point, index) => {
    const x =
      hasValidTimestamps && firstTimestamp !== undefined
        ? ((point.timestampMs - firstTimestamp) / timeRange) * width
        : (index / (data.length - 1)) * width;

    const y =
      height - ((point.price - minPrice) / priceRange) * (height - 8) - 4;

    return {
      x,
      y,
      timestampMs: point.timestampMs,
    };
  });

  // --------------------------------------------------
  // LUNCH BREAK DETECTION
  //
  // Example:
  //
  // 11:15 ●
  //       \
  // 11:30 ● ............... ● 13:00
  //             Lunch
  //
  // We find:
  //
  // - last candle before lunch
  // - first candle after lunch
  // --------------------------------------------------

  let preLunchCoords = coords;
  let postLunchCoords: typeof coords = [];

  let lunchStartPoint: (typeof coords)[number] | undefined;
  let lunchEndPoint: (typeof coords)[number] | undefined;

  if (hasValidTimestamps && lunchStartMs != null && lunchEndMs != null) {
    const beforeLunchIndex = coords.findLastIndex(
      (point) => point.timestampMs != null && point.timestampMs <= lunchStartMs,
    );

    const afterLunchIndex = coords.findIndex(
      (point) => point.timestampMs != null && point.timestampMs >= lunchEndMs,
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

  const hasLunch =
    lunchStartPoint !== undefined &&
    lunchEndPoint !== undefined &&
    postLunchCoords.length > 0;

  // --------------------------------------------------
  // SVG PATH HELPERS
  // --------------------------------------------------

  const buildPath = (points: typeof coords) =>
    points
      .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x},${point.y}`)
      .join(" ");

  const prePathD = buildPath(preLunchCoords);
  const postPathD = buildPath(postLunchCoords);

  // --------------------------------------------------
  // AREA FILLS
  // --------------------------------------------------

  const preLastPoint = preLunchCoords[preLunchCoords.length - 1];

  const postFirstPoint = postLunchCoords[0];

  const preFillD =
    prePathD && preLastPoint
      ? `${prePathD} L ${preLastPoint.x},${height} L 0,${height} Z`
      : "";

  const postFillD =
    postPathD && postFirstPoint
      ? `${postPathD} L ${width},${height} L ${postFirstPoint.x},${height} Z`
      : "";

  // --------------------------------------------------
  // COLORS
  // --------------------------------------------------

  const strokeColorClass = isPositive
    ? "text-[#047857] dark:text-[#059669]"
    : "text-[#cf0000]";

  const lastPoint = coords[coords.length - 1];

  // --------------------------------------------------
  // LUNCH UI
  // --------------------------------------------------

  const lunchGapWidth =
    hasLunch && lunchStartPoint && lunchEndPoint
      ? lunchEndPoint.x - lunchStartPoint.x
      : 0;

  const lunchMidX =
    hasLunch && lunchStartPoint && lunchEndPoint
      ? (lunchStartPoint.x + lunchEndPoint.x) / 2
      : 0;

  const lunchBridgeY = hasLunch && lunchStartPoint ? lunchStartPoint.y : 0;

  // Only show text if there is enough horizontal room.
  const showLunchLabel = hasLunch && lunchGapWidth >= 45;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={`overflow-visible ${strokeColorClass} transition-all`}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.22" />

          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* -------------------------------------------------- */}
      {/* BASELINE */}
      {/* -------------------------------------------------- */}

      <line
        x1="0"
        y1={height - 4}
        x2={width}
        y2={height - 4}
        stroke="currentColor"
        strokeDasharray="2 2"
        strokeWidth="1.25"
        className="text-zinc-300 dark:text-zinc-700"
      />

      {/* -------------------------------------------------- */}
      {/* AREA — BEFORE LUNCH */}
      {/* -------------------------------------------------- */}

      {preFillD && <path d={preFillD} fill={`url(#${gradientId})`} />}

      {/* -------------------------------------------------- */}
      {/* AREA — AFTER LUNCH */}
      {/* -------------------------------------------------- */}

      {hasLunch && postFillD && (
        <path d={postFillD} fill={`url(#${gradientId})`} />
      )}

      {/* -------------------------------------------------- */}
      {/* LINE — BEFORE LUNCH */}
      {/* -------------------------------------------------- */}

      <path
        d={prePathD}
        fill="none"
        stroke="currentColor"
        strokeWidth="0.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* -------------------------------------------------- */}
      {/* LINE — AFTER LUNCH */}
      {/* -------------------------------------------------- */}

      {hasLunch && (
        <path
          d={postPathD}
          fill="none"
          stroke="currentColor"
          strokeWidth="0.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {/* -------------------------------------------------- */}
      {/* GOOGLE-STYLE LUNCH GAP */}
      {/* -------------------------------------------------- */}

      {hasLunch && lunchStartPoint && lunchEndPoint && (
        <>
          <line
            x1={lunchStartPoint.x}
            y1={lunchBridgeY}
            x2={lunchEndPoint.x}
            y2={lunchBridgeY}
            stroke="currentColor"
            strokeDasharray="2.5 2.5"
            strokeWidth="1.25"
            opacity="0.55"
          />
        </>
      )}

      {/* -------------------------------------------------- */}
      {/* LAST PRICE INDICATOR */}
      {/* -------------------------------------------------- */}

      <g className={strokeColorClass}>
        <circle
          cx={lastPoint.x}
          cy={lastPoint.y}
          r="4"
          fill="currentColor"
          className="animate-ping opacity-10"
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
