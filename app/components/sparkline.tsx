import React from "react";

export interface SparklineProps {
  points: number[];
  timestamps?: number[];

  isPositive: boolean;
  isClosed: boolean;
  totalExpectedPoints?: number;
  lunchStartMs?: number;
  lunchEndMs?: number;
}

export function Sparkline({
  points,
  timestamps = [],
  isPositive,
  isClosed,
  totalExpectedPoints,
  lunchStartMs,
  lunchEndMs,
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

    return {
      x,
      y,
      timestampMs: timestamps[idx],
    };
  });

  const lastPoint = coords[coords.length - 1];

  // --------------------------------------------------
  // Lunch break detection
  // Same logic as the detailed chart
  // --------------------------------------------------

  // let preLunchCoords = coords;
  // let postLunchCoords: typeof coords = [];

  // let lunchStartPt: (typeof coords)[0] | undefined;
  // let lunchEndPt: (typeof coords)[0] | undefined;

  // if (
  //   lunchStartMs !== undefined &&
  //   lunchEndMs !== undefined &&
  //   timestamps.length === points.length
  // ) {
  //   const startIdx = coords.findIndex(
  //     (c) => c.timestampMs !== undefined && c.timestampMs >= lunchStartMs,
  //   );

  //   const endIdx = coords.findIndex(
  //     (c) => c.timestampMs !== undefined && c.timestampMs >= lunchEndMs,
  //   );

  //   if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
  //     preLunchCoords = coords.slice(0, startIdx);
  //     postLunchCoords = coords.slice(endIdx);

  //     lunchStartPt = coords[startIdx - 1] || coords[0];
  //     lunchEndPt = coords[endIdx];
  //   }
  // }

  // const hasLunch =
  //   lunchStartPt !== undefined &&
  //   lunchEndPt !== undefined &&
  //   postLunchCoords.length > 0;

  let preLunchCoords = coords;
  let postLunchCoords: typeof coords = [];

  let lunchStartPt: (typeof coords)[0] | undefined;
  let lunchEndPt: (typeof coords)[0] | undefined;

  if (lunchStartMs !== undefined && lunchEndMs !== undefined) {
    const startIdx = coords.findIndex(
      (c) => c.timestampMs !== undefined && c.timestampMs >= lunchStartMs,
    );

    const endIdx = coords.findIndex(
      (c) => c.timestampMs !== undefined && c.timestampMs >= lunchEndMs,
    );

    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      preLunchCoords = coords.slice(0, startIdx);
      postLunchCoords = coords.slice(endIdx);

      lunchStartPt = coords[startIdx - 1] || coords[0];
      lunchEndPt = coords[endIdx];
    }
  }

  const hasLunch =
    lunchStartPt !== undefined &&
    lunchEndPt !== undefined &&
    postLunchCoords.length > 0;

  // --------------------------------------------------
  // Build paths
  // --------------------------------------------------

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

  // --------------------------------------------------
  // Areas
  // --------------------------------------------------

  const preAreaD = prePathD
    ? `${prePathD} L ${preLast.x},${height} L ${preLunchCoords[0].x},${height} Z`
    : "";

  const postAreaD = postPathD
    ? `${postPathD} L ${lastPoint.x},${height} L ${postFirst.x},${height} Z`
    : "";

  const strokeColor = isClosed ? "#94a3b8" : isPositive ? "#008549" : "#cf0000";

  const baselineY = height / 2;

  const gradientId = `spark-grad-${
    isClosed ? "closed" : isPositive ? "pos" : "neg"
  }`;

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

            <stop offset="100%" stopColor={strokeColor} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Baseline */}
        <line
          x1="0"
          y1={baselineY}
          x2={width}
          y2={baselineY}
          stroke="#cbd5e1"
          strokeDasharray="2 2"
          strokeWidth="1"
        />

        {/* Pre-lunch area */}
        <path d={preAreaD} fill={`url(#${gradientId})`} />

        {/* Post-lunch area */}
        {hasLunch && <path d={postAreaD} fill={`url(#${gradientId})`} />}

        {/* Before lunch */}
        <path
          d={prePathD}
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* After lunch */}
        {hasLunch && (
          <path
            d={postPathD}
            fill="none"
            stroke={strokeColor}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Lunch break bridge */}
        {hasLunch && lunchStartPt && lunchEndPt && (
          <line
            x1={lunchStartPt.x}
            y1={lunchStartPt.y}
            x2={lunchEndPt.x}
            y2={lunchStartPt.y}
            stroke={strokeColor}
            strokeDasharray="2 2"
            strokeWidth="1.2"
            opacity="0.7"
          />
        )}

        {/* Current point */}
        {!isClosed && lastPoint && (
          <g transform={`translate(${lastPoint.x}, ${lastPoint.y})`}>
            <circle r="2.5" fill={strokeColor}>
              <animate
                attributeName="r"
                values="2.5;7"
                dur="2.5s"
                repeatCount="indefinite"
              />

              <animate
                attributeName="opacity"
                values="0.6;0"
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
