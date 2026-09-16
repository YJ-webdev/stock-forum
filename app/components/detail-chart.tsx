"use client";

import React, { useState } from "react";
import {
  AreaChart,
  CandlestickChart,
  BarChart3,
  ChartLine,
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
}

export function DetailChart({
  history,
  isPositive,
  range,
  previousClose,
  lunchStartMs,
  lunchEndMs,
  exchangeTimezone,
}: DetailChartProps) {
  const [chartType, setChartType] = useState<ChartType>("area");
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const [hoveredPoint, setHoveredPoint] = useState<{
    x: number;
    y: number;
    price: number;
    percentChange: number;
    timeStr: string;
  } | null>(null);

  if (!history || history.length === 0) {
    return (
      <div className="h-64 w-full flex items-center justify-center bg-zinc-50 dark:bg-zinc-900 p-4 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800">
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

  // Reduced from 40 -> 30.
  // This gives the plot/grid a little more vertical room.
  const paddingBottom = 40;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const chartBottom = paddingTop + chartHeight;

  // --------------------------------------------------
  // PRICE RANGE
  // --------------------------------------------------

  const prices = history.map((p) => p.price);

  const validPrices =
    previousClose != null ? [...prices, previousClose] : prices;

  const rawMin = Math.min(...validPrices);
  const rawMax = Math.max(...validPrices);

  const rawPriceRange = rawMax - rawMin;

  const min =
    rawPriceRange === 0
      ? rawMin - rawMin * 0.005
      : rawMin - rawPriceRange * 0.05;

  const max =
    rawPriceRange === 0
      ? rawMax + rawMax * 0.005
      : rawMax + rawPriceRange * 0.05;

  const priceRange = max - min || 1;

  const baselinePrice = previousClose ?? history[0]?.price ?? 1;

  // --------------------------------------------------
  // TIME RANGE
  // --------------------------------------------------

  const is1D = range === "1D";

  const firstTimestamp = history[0]?.timestampMs ?? 0;

  const lastTimestamp =
    history[history.length - 1]?.timestampMs ?? firstTimestamp;

  const fullTimeRange = Math.max(lastTimestamp - firstTimestamp, 1);

  // --------------------------------------------------
  // X POSITION
  // --------------------------------------------------

  function getX(timestampMs: number) {
    const ratio = (timestampMs - firstTimestamp) / fullTimeRange;

    return paddingLeft + Math.max(0, Math.min(1, ratio)) * chartWidth;
  }

  // --------------------------------------------------
  // Y POSITION
  // --------------------------------------------------

  function getY(price: number) {
    return (
      paddingTop + chartHeight - ((price - min) / priceRange) * chartHeight
    );
  }

  // --------------------------------------------------
  // MAP DATA -> CHART COORDINATES
  // --------------------------------------------------

  const coords = history.map((pt, idx) => {
    const x = getX(pt.timestampMs);
    const y = getY(pt.price);

    const prevPrice = idx > 0 ? history[idx - 1].price : pt.price;

    const open = pt.open ?? prevPrice;
    const close = pt.close ?? pt.price;

    const high =
      pt.high ?? Math.max(open, close) + Math.abs(close - open) * 0.5;

    const low = pt.low ?? Math.min(open, close) - Math.abs(close - open) * 0.5;

    const openY = getY(open);
    const closeY = getY(close);
    const highY = getY(high);
    const lowY = getY(low);

    return {
      x,
      y,
      price: pt.price,
      timestampMs: pt.timestampMs,
      openY,
      closeY,
      highY,
      lowY,
      isRising: close >= open,
    };
  });

  const lastPoint = coords[coords.length - 1];

  // --------------------------------------------------
  // LUNCH BREAK
  // --------------------------------------------------

  // --------------------------------------------------
  // LUNCH BREAK
  // --------------------------------------------------

  // --------------------------------------------------
  // LUNCH BREAK
  // --------------------------------------------------

  const hasLunch =
    is1D &&
    lunchStartMs != null &&
    lunchEndMs != null &&
    lunchEndMs > lunchStartMs;

  let preLunchCoords = coords;
  let postLunchCoords: typeof coords = [];

  let lunchStartPt: (typeof coords)[number] | undefined;
  let lunchEndPt: (typeof coords)[number] | undefined;

  if (hasLunch) {
    // Last real candle before the lunch break
    const beforeLunchIndex = coords.findLastIndex(
      (point) => point.timestampMs < lunchStartMs!,
    );

    // First real candle after the lunch break
    const afterLunchIndex = coords.findIndex(
      (point) => point.timestampMs >= lunchEndMs!,
    );

    if (
      beforeLunchIndex !== -1 &&
      afterLunchIndex !== -1 &&
      afterLunchIndex > beforeLunchIndex
    ) {
      lunchStartPt = coords[beforeLunchIndex];
      lunchEndPt = coords[afterLunchIndex];

      // IMPORTANT: two completely separate paths
      preLunchCoords = coords.slice(0, beforeLunchIndex + 1);
      postLunchCoords = coords.slice(afterLunchIndex);
    }
  }

  // --------------------------------------------------
  // PATH HELPERS
  // --------------------------------------------------

  const buildPath = (pts: typeof coords) =>
    pts.reduce(
      (acc, pt, i) =>
        i === 0 ? `M ${pt.x},${pt.y}` : `${acc} L ${pt.x},${pt.y}`,
      "",
    );

  const prePathD = buildPath(preLunchCoords);
  const postPathD = buildPath(postLunchCoords);

  const preAreaD =
    prePathD && preLunchCoords.length > 0
      ? `${prePathD} L ${
          preLunchCoords[preLunchCoords.length - 1].x
        },${chartBottom} L ${preLunchCoords[0].x},${chartBottom} Z`
      : "";

  const postAreaD =
    postPathD && postLunchCoords.length > 0
      ? `${postPathD} L ${
          postLunchCoords[postLunchCoords.length - 1].x
        },${chartBottom} L ${postLunchCoords[0].x},${chartBottom} Z`
      : "";

  // --------------------------------------------------
  // Y GRID / LABELS
  // --------------------------------------------------

  const yTicks = Array.from({ length: 5 }, (_, i) => {
    const priceVal = min + (i / 4) * priceRange;

    const yPos = paddingTop + chartHeight - (i / 4) * chartHeight;

    return {
      price: priceVal,
      y: yPos,
    };
  });

  // --------------------------------------------------
  // DATE / TIME FORMATTERS
  // --------------------------------------------------

  const formatTimeLabel = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      ...(exchangeTimezone
        ? {
            timeZone: exchangeTimezone,
          }
        : {}),
    });
  };

  const formatDateLabel = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      ...(exchangeTimezone
        ? {
            timeZone: exchangeTimezone,
          }
        : {}),
    });
  };

  // --------------------------------------------------
  // EXCHANGE LOCAL TIME PARTS
  // --------------------------------------------------

  function getLocalTimeParts(timestamp: number) {
    const formatter = new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      ...(exchangeTimezone
        ? {
            timeZone: exchangeTimezone,
          }
        : {}),
    });

    const parts = formatter.formatToParts(new Date(timestamp));

    const hour =
      Number(parts.find((part) => part.type === "hour")?.value ?? 0) % 24;

    const minute = Number(
      parts.find((part) => part.type === "minute")?.value ?? 0,
    );

    return {
      hour,
      minute,
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

    const scanStart = Math.ceil(firstTimestamp / ONE_MINUTE) * ONE_MINUTE;

    for (
      let timestamp = scanStart;
      timestamp < lastTimestamp;
      timestamp += ONE_MINUTE
    ) {
      const { minute } = getLocalTimeParts(timestamp);

      if (minute === 0) {
        const distanceFromStart = timestamp - firstTimestamp;

        const distanceFromEnd = lastTimestamp - timestamp;

        const EDGE_MARGIN = 15 * 60 * 1000;

        if (distanceFromStart > EDGE_MARGIN && distanceFromEnd > EDGE_MARGIN) {
          xTicks.push({
            label: formatTimeLabel(timestamp),
            x: getX(timestamp),
          });
        }
      }
    }
  } else {
    xTicks = Array.from({ length: 4 }, (_, i) => {
      const ratio = i / 3;

      const timestamp = firstTimestamp + fullTimeRange * ratio;

      let label = "";

      if (range === "5D") {
        label = `${formatDateLabel(timestamp)} ${formatTimeLabel(timestamp)}`;
      } else {
        label = formatDateLabel(timestamp);
      }

      return {
        label,
        x: paddingLeft + ratio * chartWidth,
      };
    });
  }

  // --------------------------------------------------
  // PREVIOUS CLOSE
  // --------------------------------------------------

  const prevCloseY = previousClose != null ? getY(previousClose) : null;

  // --------------------------------------------------
  // COLOR
  // --------------------------------------------------

  const strokeColor = isPositive ? "#008549" : "#cf0000";

  const gradientId = `detail-area-grad-${isPositive ? "pos" : "neg"}`;

  // --------------------------------------------------
  // CHART TYPE MENU
  // --------------------------------------------------

  const chartTypeOptions = [
    {
      id: "line",
      label: "Line",
      icon: ChartLine,
    },
    {
      id: "area",
      label: "Area",
      icon: AreaChart,
    },
    {
      id: "candle",
      label: "Candle",
      icon: CandlestickChart,
    },
    {
      id: "bar",
      label: "Bar",
      icon: BarChart3,
    },
  ];

  const CurrentIcon =
    chartTypeOptions.find((o) => o.id === chartType)?.icon || AreaChart;

  // --------------------------------------------------
  // HOVER
  // --------------------------------------------------

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();

    const mouseX = ((e.clientX - rect.left) / rect.width) * width;

    let closest = coords[0];

    let minDistance = Math.abs(coords[0].x - mouseX);

    for (let i = 1; i < coords.length; i++) {
      const dist = Math.abs(coords[i].x - mouseX);

      if (dist < minDistance) {
        minDistance = dist;
        closest = coords[i];
      }
    }

    const d = new Date(closest.timestampMs);

    const dateStr = d.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      ...(exchangeTimezone
        ? {
            timeZone: exchangeTimezone,
          }
        : {}),
    });

    const timeStr = d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      ...(exchangeTimezone
        ? {
            timeZone: exchangeTimezone,
          }
        : {}),
    });

    const percent = ((closest.price - baselinePrice) / baselinePrice) * 100;

    setHoveredPoint({
      x: closest.x,
      y: closest.y,
      price: closest.price,
      percentChange: percent,
      timeStr: `${dateStr}, ${timeStr}`,
    });
  };

  // --------------------------------------------------
  // CANDLE / BAR WIDTH
  // --------------------------------------------------

  let minimumPointSpacing = chartWidth / Math.max(coords.length, 1);

  if (coords.length >= 2) {
    for (let i = 1; i < coords.length; i++) {
      const spacing = coords[i].x - coords[i - 1].x;

      if (spacing > 0) {
        minimumPointSpacing = Math.min(minimumPointSpacing, spacing);
      }
    }
  }

  const candleWidth = Math.max(Math.min(minimumPointSpacing * 0.7, 6), 1);

  const barWidth = Math.max(Math.min(minimumPointSpacing * 0.75, 7), 1);

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------

  return (
    <div className="w-full relative bg-zinc-50 dark:bg-zinc-800 md:rounded-2xl md:border border-zinc-200 dark:border-zinc-800 p-4 md:shadow-sm select-none">
      {/* TOP CONTROL BAR */}

      <div className="relative z-5 flex items-center gap-6 dark:text-zinc-300">
        <div className="relative flex">
          {chartTypeOptions.map((opt) => {
            const Icon = opt.icon;

            return (
              <button
                key={opt.id}
                onClick={() => {
                  setChartType(opt.id as ChartType);
                  setIsMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-sm text-sm font-medium transition-all cursor-pointer ${
                  chartType === opt.id
                    ? " text-zinc-900 dark:text-white"
                    : "text-zinc-600 dark:text-zinc-300! hover:bg-zinc-200/60 dark:hover:bg-zinc-700/50"
                }`}
              >
                <Icon className="w-3 h-3 md:w-4 md:h-4" />
              </button>
            );
          })}
        </div>
      </div>

      {/* HOVER PRICE BADGE */}

      {hoveredPoint && (
        <div className="absolute jakarta top-14 right-1/2 translate-x-12/29 z-10 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-2.5 py-1 rounded-sm text-xs font-normal shadow-xs flex items-center gap-1.5">
          <span className="text-zinc-600 jakarta dark:text-zinc-400">
            Price:
          </span>

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
                : "text-[#cf0000]"
            }
          >
            ({hoveredPoint.percentChange >= 0 ? "+" : ""}
            {hoveredPoint.percentChange.toFixed(2)}
            %)
          </span>
        </div>
      )}

      {/* MAIN SVG */}

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto overflow-visible cursor-crosshair"
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

        {yTicks.map((tick, i) => (
          <text
            key={i}
            x={paddingLeft - 12}
            y={tick.y + 4}
            textAnchor="end"
            className="fill-zinc-800 jakarta dark:fill-zinc-300 dark:font-light text-[12px] font-normal"
          >
            {tick.price.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </text>
        ))}

        {/* VERTICAL GRID */}

        {/* LEFT + RIGHT GRID BOUNDARIES */}
        <line
          x1={paddingLeft}
          y1={paddingTop}
          x2={paddingLeft}
          y2={chartBottom}
          stroke="#e2e8f0"
          strokeWidth="1"
          className="dark:stroke-zinc-600/50"
        />

        <line
          x1={paddingLeft + chartWidth}
          y1={paddingTop}
          x2={paddingLeft + chartWidth}
          y2={chartBottom}
          stroke="#e2e8f0"
          strokeWidth="1"
          className="dark:stroke-zinc-600/50"
        />

        {xTicks.map((tick, i) => (
          <g key={i}>
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
              className="fill-zinc-800 jakarta dark:fill-zinc-300 dark:font-light text-[12px] font-normal"
            >
              {tick.label}
            </text>
          </g>
        ))}

        {/* PREVIOUS CLOSE */}

        {previousClose != null &&
          prevCloseY != null &&
          (() => {
            const isAboveChart = previousClose > max;

            const isBelowChart = previousClose < min;

            const isOutOfBounds = isAboveChart || isBelowChart;

            const clampedY = Math.max(
              paddingTop,
              Math.min(chartBottom, prevCloseY),
            );

            return (
              <g>
                <line
                  x1={paddingLeft}
                  y1={clampedY}
                  x2={paddingLeft + chartWidth}
                  y2={clampedY}
                  stroke="#94a3b8"
                  strokeDasharray="2 3"
                  strokeWidth="1.5"
                />

                {!isOutOfBounds && (
                  <text
                    x={paddingLeft + chartWidth - 10}
                    y={prevCloseY - 6}
                    textAnchor="end"
                    className="fill-zinc-800 jakarta dark:fill-zinc-300 dark:font-light text-[12px] font-normal"
                  >
                    Prev. close {previousClose.toFixed(2)}
                  </text>
                )}

                {isOutOfBounds && (
                  <g
                    transform={`translate(${paddingLeft + chartWidth - 120}, ${
                      isAboveChart ? paddingTop + 4 : chartBottom - 20
                    })`}
                  >
                    <rect
                      x="0"
                      y="0"
                      width="120"
                      height="18"
                      rx="4"
                      className="fill-zinc-100 dark:fill-zinc-800 stroke-zinc-300 dark:stroke-zinc-700 opacity-90"
                    />

                    <text
                      x="60"
                      y="13"
                      textAnchor="middle"
                      className="fill-zinc-600 dark:fill-zinc-300 text-[10px] font-semibold"
                    >
                      Prev. close{" "}
                      {previousClose.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </text>
                  </g>
                )}
              </g>
            );
          })()}

        {/* AREA CHART */}

        {chartType === "area" && (
          <g>
            {preAreaD && <path d={preAreaD} fill={`url(#${gradientId})`} />}

            {prePathD && (
              <path
                d={prePathD}
                fill="none"
                stroke={strokeColor}
                strokeWidth="1.25"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {postLunchCoords.length > 0 && (
              <>
                {postAreaD && (
                  <path d={postAreaD} fill={`url(#${gradientId})`} />
                )}

                {postPathD && (
                  <path
                    d={postPathD}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth="1.25"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}
              </>
            )}
          </g>
        )}

        {/* LINE CHART */}

        {chartType === "line" && (
          <g>
            <path
              d={prePathD}
              fill="none"
              stroke={strokeColor}
              strokeWidth="1.25"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {postLunchCoords.length > 0 && (
              <path
                d={postPathD}
                fill="none"
                stroke={strokeColor}
                strokeWidth="1.25"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
          </g>
        )}

        {/* LUNCH BREAK */}
        {hasLunch && lunchStartPt && lunchEndPt && (
          <g>
            {/* Dashed break line */}
            <line
              x1={lunchStartPt.x}
              y1={lunchStartPt.y}
              x2={lunchEndPt.x}
              y2={lunchStartPt.y}
              stroke={strokeColor}
              strokeDasharray="2.5 2.5"
              strokeWidth="1.5"
              strokeLinecap="round"
              opacity="0.6"
            />

            {/* Break label */}
            {(() => {
              const labelX = (lunchStartPt.x + lunchEndPt.x) / 2;
              const labelY = (lunchStartPt.y + lunchEndPt.y) / 2;

              return (
                <g>
                  <text
                    x={labelX}
                    y={labelY - 10}
                    textAnchor="middle"
                    className="fill-zinc-700 dark:fill-zinc-400 text-[15px] tracking-wide font-medium"
                  >
                    Lunch Break
                  </text>
                </g>
              );
            })()}
          </g>
        )}

        {/* CANDLESTICK */}

        {chartType === "candle" && (
          <g>
            {coords.map((pt, i) => {
              const color = pt.isRising ? "#008549" : "#cf0000";

              const candleTop = Math.min(pt.openY, pt.closeY);

              const candleHeight = Math.max(
                Math.abs(pt.closeY - pt.openY),
                1.5,
              );

              return (
                <g key={i}>
                  <line
                    x1={pt.x}
                    y1={pt.highY}
                    x2={pt.x}
                    y2={pt.lowY}
                    stroke={color}
                    strokeWidth="1.25"
                  />

                  <rect
                    x={pt.x - candleWidth / 2}
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
            {coords.map((pt, i) => {
              const fillColor = pt.isRising
                ? "rgba(0, 133, 73, 0.45)"
                : "rgba(207, 0, 0, 0.45)";

              const barStroke = pt.isRising ? "#008549" : "#cf0000";

              return (
                <rect
                  key={i}
                  x={pt.x - barWidth / 2}
                  y={pt.y}
                  width={barWidth}
                  height={chartBottom - pt.y}
                  fill={fillColor}
                  stroke={barStroke}
                  strokeWidth="0.5"
                  rx="1"
                />
              );
            })}
          </g>
        )}

        {/* END POINT */}

        {lastPoint &&
          !hoveredPoint &&
          (chartType === "line" || chartType === "area") && (
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
              className="stroke-white dark:stroke-zinc-200"
              strokeWidth="2"
            />

            <g
              transform={`translate(${
                hoveredPoint.x + 60 > width - paddingRight
                  ? hoveredPoint.x - 120
                  : hoveredPoint.x - 60
              }, ${chartBottom - 5})`}
            >
              <rect
                x="0"
                y="0"
                width="120"
                height="24"
                rx="6"
                className="fill-white dark:fill-zinc-800 stroke-zinc-300 dark:stroke-zinc-700 shadow-sm"
              />

              <text
                x="60"
                y="16"
                textAnchor="middle"
                className="fill-zinc-700 dark:fill-zinc-200 text-[10.5px] font-medium"
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
