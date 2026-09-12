// components/ui/trend-sparkline.tsx
"use client";

import React, { useId } from "react";
import { ChartPoint } from "@/app/hooks/useMarketQuote";

interface TrendSparklineProps {
  data?: ChartPoint[]; // 🟢 Made optional to prevent TS errors when loading
  isPositive?: boolean; // 🟢 Made optional with default value
  width?: number;
  height?: number;
}

export function TrendSparkline({
  data = [],
  isPositive = true,
  width = 120,
  height = 40,
}: TrendSparklineProps) {
  // 🟢 Fix for ESLint impurity error: Use React's useId for stable SVG gradient IDs
  const rawId = useId();
  const gradientId = `sparkline-gradient-${isPositive ? "up" : "down"}-${rawId.replace(/:/g, "")}`;

  if (!data || data.length < 2) {
    return (
      <div
        style={{ width, height }}
        className="bg-zinc-100 dark:bg-zinc-800 animate-pulse rounded"
      />
    );
  }

  const prices = data.map((d) => d.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const range = maxPrice - minPrice || 1;

  // Normalize points to SVG coordinate space
  const points = data.map((d, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((d.price - minPrice) / range) * (height - 8) - 4;
    return { x, y };
  });

  const pathD = points.reduce(
    (acc, pt, idx) => `${acc} ${idx === 0 ? "M" : "L"} ${pt.x},${pt.y}`,
    "",
  );

  const fillD = `${pathD} L ${width},${height} L 0,${height} Z`;

  const lastPoint = points[points.length - 1];
  //   const strokeColor = isPositive ? "#047857" : "#cf0000";

  const strokeColorClass = isPositive
    ? "text-[#047857] dark:text-[#059669]" // 라이트: emerald-700 (#047857) | 다크: emerald-600 (#059669)
    : "text-[#cf0000]";

  return (
    <svg
      width={width}
      height={height}
      className={`overflow-visible ${strokeColorClass}`}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          {/* currentColor를 그대로 그라데이션에 사용 */}
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.25" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.0" />
        </linearGradient>
      </defs>

      {/* Dotted Reference Base Line */}
      <line
        x1="0"
        y1={height - 4}
        x2={width}
        y2={height - 4}
        stroke="currentColor"
        strokeDasharray="2 2"
        strokeWidth="1"
        /* 🟢 라이트 모드: zinc-400 (#a1a1aa)로 시인성 확보 | 다크 모드: zinc-700 (#3f3f46) */
        className="text-zinc-800 dark:text-zinc-300"
      />
      {/* Area Gradient Fill */}
      <path d={fillD} fill={`url(#${gradientId})`} />

      {/* Main Trend Line */}
      <path
        d={pathD}
        fill="none"
        stroke="currentColor" // 🟢 Hex 대신 currentColor 사용
        strokeWidth="0.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Ending Price Point Indicator */}
      {/* <circle cx={lastPoint.x} cy={lastPoint.y} r="2.5" fill="currentColor" /> */}

      <g className={strokeColorClass}>
        {/* Pulsing Outer Ring */}
        <circle
          cx={lastPoint.x}
          cy={lastPoint.y}
          r="4"
          fill="currentColor"
          className="animate-ping opacity-10 origin-center"
          style={{
            transformOrigin: `${lastPoint.x}px ${lastPoint.y}px`,
          }}
        />
        {/* Solid Inner Dot */}
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
