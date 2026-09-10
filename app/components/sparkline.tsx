// components/Sparkline.tsx
import React from "react";

export interface SparklineProps {
  points: number[];
  isPositive: boolean;
  isClosed: boolean;
  totalExpectedPoints?: number;
  lunchStartIndex?: number; // e.g., index of point at 11:30
  lunchEndIndex?: number; // e.g., index of point at 13:00
}

export function Sparkline({
  points,
  isPositive,
  isClosed,
  totalExpectedPoints,
  lunchStartIndex,
  lunchEndIndex,
}: SparklineProps) {
  if (!points || points.length === 0) {
    return (
      <div className="h-10 w-full flex items-center justify-center">
        <div className="w-full border-b border-dashed border-slate-200" />
      </div>
    );
  }

  const width = 180;
  const height = 40;
  const padding = 4;

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;

  const totalSlots = Math.max(
    points.length - 1,
    (totalExpectedPoints ?? points.length) - 1,
    1,
  );

  const coords = points.map((val, idx) => {
    const x = (idx / totalSlots) * width;
    const y = height - padding - ((val - min) / range) * (height - padding * 2);
    return { x, y };
  });

  const lastPoint = coords[coords.length - 1];

  const pathD = coords.reduce((acc, point, i) => {
    return i === 0
      ? `M ${point.x},${point.y}`
      : `${acc} L ${point.x},${point.y}`;
  }, "");

  const areaD = `${pathD} L ${lastPoint.x},${height} L 0,${height} Z`;
  const strokeColor = isClosed ? "#94a3b8" : isPositive ? "#008549" : "#cf0000";
  const baselineY = height / 2;
  const gradientId = `spark-grad-${isClosed ? "closed" : isPositive ? "pos" : "neg"}`;

  const hasLunch =
    lunchStartIndex !== undefined &&
    lunchEndIndex !== undefined &&
    lunchStartIndex < coords.length &&
    lunchEndIndex < coords.length;

  // Separate coords into pre-lunch and post-lunch if lunch break exists
  const preLunchCoords = hasLunch
    ? coords.slice(0, lunchStartIndex + 1)
    : coords;
  const postLunchCoords = hasLunch ? coords.slice(lunchEndIndex) : [];

  const buildPath = (pts: typeof coords) =>
    pts.reduce(
      (acc, point, i) =>
        i === 0 ? `M ${point.x},${point.y}` : `${acc} L ${point.x},${point.y}`,
      "",
    );

  const prePathD = buildPath(preLunchCoords);
  const postPathD = buildPath(postLunchCoords);

  const preLast = preLunchCoords[preLunchCoords.length - 1];
  const postFirst = postLunchCoords[0];

  const preAreaD = prePathD
    ? `${prePathD} L ${preLast.x},${height} L ${preLunchCoords[0].x},${height} Z`
    : "";
  const postAreaD = postPathD
    ? `${postPathD} L ${lastPoint.x},${height} L ${postFirst.x},${height} Z`
    : "";

  return (
    <div className="w-full h-10 relative overflow-hidden mt-2 pr-0.5">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-full overflow-visible"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor={strokeColor}
              stopOpacity={isClosed ? "0.1" : "0.25"}
            />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        <line
          x1="0"
          y1={baselineY}
          x2={width}
          y2={baselineY}
          stroke="#cbd5e1"
          strokeDasharray="2 2"
          strokeWidth="1"
        />

        {/* Areas */}
        <path d={preAreaD} fill={`url(#${gradientId})`} />
        {hasLunch && <path d={postAreaD} fill={`url(#${gradientId})`} />}

        <path
          d={pathD}
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {hasLunch && (
          <>
            <path
              d={postPathD}
              fill="none"
              stroke={strokeColor}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Dashed Bridge Line during Lunch */}
            <line
              x1={preLast.x}
              y1={preLast.y}
              x2={postFirst.x}
              y2={preLast.y}
              stroke={strokeColor}
              strokeDasharray="2 2"
              strokeWidth="1.2"
              opacity="0.7"
            />
          </>
        )}

        {!isClosed && lastPoint && (
          <g transform={`translate(${lastPoint.x}, ${lastPoint.y})`}>
            <circle r="2.5" fill={strokeColor}>
              <animate
                attributeName="r"
                values="2.5; 7"
                dur="2.5s"
                repeatCount="indefinite"
              />
              <animate
                attributeName="opacity"
                values="0.6; 0"
                dur="2.5s"
                repeatCount="indefinite"
              />
            </circle>
            <circle r="2.5" fill={strokeColor} />
          </g>
        )}
      </svg>
    </div>
  );
}
