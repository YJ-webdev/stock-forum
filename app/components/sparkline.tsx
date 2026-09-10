import React from "react";

export interface SparklineProps {
  points: number[];
  isPositive: boolean;
  isClosed: boolean;
  /** Maximum number of data points expected across the full timeframe (e.g., 36 points for 6 hours if sampled every 10 min) */
  totalExpectedPoints?: number;
}

export function Sparkline({
  points,
  isPositive,
  isClosed,
  totalExpectedPoints = 36, // Adjust to match your total 6-hour slot count
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

  // Use fixed total slots so incomplete trading sessions scale proportionally
  const totalSlots = Math.max(points.length - 1, totalExpectedPoints - 1, 1);

  // Map points to SVG coordinates up to current progress
  const coords = points.map((val, idx) => {
    const x = (idx / totalSlots) * width;
    const y = height - padding - ((val - min) / range) * (height - padding * 2);
    return { x, y };
  });

  const lastPoint = coords[coords.length - 1];

  // Path line covering data up to the latest point
  const pathD = coords.reduce((acc, point, i) => {
    return i === 0
      ? `M ${point.x},${point.y}`
      : `${acc} L ${point.x},${point.y}`;
  }, "");

  // Fill path closes straight down from the CURRENT last point (leaving the right empty)
  const areaD = `${pathD} L ${lastPoint.x},${height} L 0,${height} Z`;

  const strokeColor = isClosed ? "#94a3b8" : isPositive ? "#008549" : "#cf0000";

  const baselineY = height / 2;
  const gradientId = `spark-grad-${isClosed ? "closed" : isPositive ? "pos" : "neg"}`;

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

        {/* Dotted Baseline across full width */}
        <line
          x1="0"
          y1={baselineY}
          x2={width}
          y2={baselineY}
          stroke="#cbd5e1"
          strokeDasharray="2 2"
          strokeWidth="1"
        />

        {/* Fill Area up to current time */}
        <path d={areaD} fill={`url(#${gradientId})`} />

        {/* Dynamic Line up to current time */}
        <path
          d={pathD}
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Pulsing Dot at current live point */}
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
