"use client";

import React, { useState } from "react";
import {
  TrendingUp,
  AreaChart,
  CandlestickChart,
  BarChart3,
  ChevronDown,
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
  lunchStartMs?: number; // e.g. Timestamp for 11:30
  lunchEndMs?: number; // e.g. Timestamp for 13:00
}

export function DetailChart({
  history,
  isPositive,
  isClosed,
  range,
  previousClose,
  lunchStartMs,
  lunchEndMs,
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

  // Layout Dimensions
  const width = 800;
  const height = 320;
  const paddingLeft = 65;
  const paddingRight = 20;
  const paddingTop = 30;
  const paddingBottom = 40;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const prices = history.map((p) => p.price);
  const validPrices = previousClose ? [...prices, previousClose] : prices;

  const rawMin = Math.min(...validPrices);
  const rawMax = Math.max(...validPrices);

  const min = rawMin - (rawMax - rawMin) * 0.05;
  const max = rawMax + (rawMax - rawMin) * 0.05;
  const priceRange = max - min || 1;

  const baselinePrice = previousClose ?? history[0]?.price ?? 1;

  // Map Coordinates
  const coords = history.map((pt, idx) => {
    const x =
      paddingLeft + (idx / Math.max(history.length - 1, 1)) * chartWidth;
    const y =
      paddingTop + chartHeight - ((pt.price - min) / priceRange) * chartHeight;

    const prevPrice = idx > 0 ? history[idx - 1].price : pt.price;
    const open = pt.open ?? prevPrice;
    const close = pt.close ?? pt.price;

    const high =
      pt.high ?? Math.max(open, close) + Math.abs(close - open) * 0.5;
    const low = pt.low ?? Math.min(open, close) - Math.abs(close - open) * 0.5;

    const openY =
      paddingTop + chartHeight - ((open - min) / priceRange) * chartHeight;
    const closeY =
      paddingTop + chartHeight - ((close - min) / priceRange) * chartHeight;
    const highY =
      paddingTop + chartHeight - ((high - min) / priceRange) * chartHeight;
    const lowY =
      paddingTop + chartHeight - ((low - min) / priceRange) * chartHeight;

    const isRising = close >= open;

    const unclampedPrevCloseY = previousClose
      ? paddingTop +
        chartHeight -
        ((previousClose - min) / priceRange) * chartHeight
      : null;

    // Clamp y-position within canvas padding bounds
    const prevCloseY =
      unclampedPrevCloseY !== null
        ? Math.max(
            paddingTop,
            Math.min(paddingTop + chartHeight, unclampedPrevCloseY),
          )
        : null;

    return {
      x,
      y,
      price: pt.price,
      timestampMs: pt.timestampMs,
      openY,
      closeY,
      highY,
      lowY,
      isRising,
    };
  });

  const lastPoint = coords[coords.length - 1];

  // Identify Lunch indices when range === "1D"
  const is1D = range === "1D";
  let preLunchCoords = coords;
  let postLunchCoords: typeof coords = [];
  let lunchStartPt: (typeof coords)[0] | undefined;
  let lunchEndPt: (typeof coords)[0] | undefined;

  if (is1D && lunchStartMs && lunchEndMs) {
    const startIdx = coords.findIndex((c) => c.timestampMs >= lunchStartMs);
    const endIdx = coords.findIndex((c) => c.timestampMs >= lunchEndMs);

    if (startIdx !== -1 && endIdx !== -1) {
      preLunchCoords = coords.slice(0, startIdx);
      postLunchCoords = coords.slice(endIdx);
      lunchStartPt = coords[startIdx - 1] || coords[0];
      lunchEndPt = coords[endIdx];
    }
  }

  const buildPath = (pts: typeof coords) =>
    pts.reduce(
      (acc, pt, i) =>
        i === 0 ? `M ${pt.x},${pt.y}` : `${acc} L ${pt.x},${pt.y}`,
      "",
    );

  const prePathD = buildPath(preLunchCoords);
  const postPathD = buildPath(postLunchCoords);

  const preAreaD = prePathD
    ? `${prePathD} L ${
        preLunchCoords[preLunchCoords.length - 1].x
      },${paddingTop + chartHeight} L ${preLunchCoords[0].x},${
        paddingTop + chartHeight
      } Z`
    : "";

  const postAreaD = postPathD
    ? `${postPathD} L ${
        postLunchCoords[postLunchCoords.length - 1].x
      },${paddingTop + chartHeight} L ${postLunchCoords[0].x},${
        paddingTop + chartHeight
      } Z`
    : "";

  // Grid Ticks
  const yTicks = Array.from({ length: 5 }, (_, i) => {
    const priceVal = min + (i / 4) * priceRange;
    const yPos = paddingTop + chartHeight - (i / 4) * chartHeight;
    return { price: priceVal, y: yPos };
  });

  const xTicks = Array.from({ length: 4 }, (_, i) => {
    const index = Math.floor((i / 3) * (history.length - 1));
    const pt = history[index] || history[0];
    const xPos = paddingLeft + (i / 3) * chartWidth;

    const d = new Date(pt.timestampMs);
    let timeLabel = "";
    if (range === "1D") {
      timeLabel = d.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    } else if (range === "5D") {
      timeLabel = `${d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })} ${d.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })}`;
    } else {
      timeLabel = d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    }

    return { label: timeLabel, x: xPos };
  });

  const prevCloseY = previousClose
    ? paddingTop +
      chartHeight -
      ((previousClose - min) / priceRange) * chartHeight
    : null;

  const strokeColor = isClosed ? "#94a3b8" : isPositive ? "#008549" : "#cf0000";
  const gradientId = `detail-area-grad-${isPositive ? "pos" : "neg"}`;

  const chartTypeOptions = [
    { id: "line", label: "Line", icon: TrendingUp },
    { id: "area", label: "Area", icon: AreaChart },
    { id: "candle", label: "Candle", icon: CandlestickChart },
    { id: "bar", label: "Bar", icon: BarChart3 },
  ];

  const CurrentIcon =
    chartTypeOptions.find((o) => o.id === chartType)?.icon || AreaChart;

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
    });
    const timeStr = d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    const percent = ((closest.price - baselinePrice) / baselinePrice) * 100;

    setHoveredPoint({
      x: closest.x,
      y: closest.y,
      price: closest.price,
      percentChange: percent,
      timeStr: `${dateStr}, ${timeStr} UTC-4`,
    });
  };

  return (
    <div className="w-full relative bg-white dark:bg-zinc-900 md:rounded-2xl md:border border-zinc-200 dark:border-zinc-800 p-4 md:shadow-sm select-none">
      {/* TOP CONTROL BAR */}
      <div className="relative z-20 flex items-center gap-6 mb-4 px-2 dark:text-zinc-300">
        <div className="relative">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="flex items-center gap-2 text-sm font-medium  hover:text-black dark:hover:text-white transition-colors cursor-pointer"
          >
            <CurrentIcon className="w-4 h-4 " />
            <span className="capitalize ">{chartType}</span>
            <ChevronDown className="hidden md:block w-3.5 h-3.5 " />
          </button>

          {isMenuOpen && (
            <div className="absolute top-full left-0 mt-2 w-36 bg-zinc-100/90 dark:bg-zinc-800/90 backdrop-blur-md border border-zinc-200/80 dark:border-zinc-700/80 rounded-2xl p-1.5 shadow-xl space-y-0.5">
              {chartTypeOptions.map((opt) => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.id}
                    onClick={() => {
                      setChartType(opt.id as ChartType);
                      setIsMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                      chartType === opt.id
                        ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs"
                        : "text-zinc-600 dark:text-zinc-300! hover:bg-zinc-200/60 dark:hover:bg-zinc-700/50"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <button className="flex items-center gap-2 text-sm font-medium  hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer">
          <TrendingUp className="w-4 h-4 " />
          <span className="">Compare</span>
          <ChevronDown className="hidden md:block w-3.5 h-3.5 " />
        </button>

        <button className="flex items-center gap-2 text-sm font-medium  hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer">
          <BarChart3 className="w-4 h-4  " />
          <span className="">Indicators</span>
          <ChevronDown className="w-3.5 h-3.5 " />
        </button>
      </div>

      {/* HOVER PRICE BADGE */}
      {hoveredPoint && (
        <div className="absolute top-14 left-4 z-10 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-2.5 py-1 rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5">
          <span className="text-zinc-600 dark:text-zinc-400">Price:</span>
          <span className="text-zinc-900 dark:text-zinc-100 font-bold">
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
            {hoveredPoint.percentChange.toFixed(2)}%)
          </span>
        </div>
      )}

      {/* MAIN SVG CHART */}
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto overflow-visible cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredPoint(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.25" />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Y-AXIS LABELS */}
        {yTicks.map((tick, i) => (
          <text
            key={i}
            x={paddingLeft - 12}
            y={tick.y + 4}
            textAnchor="end"
            className="fill-zinc-400 dark:fill-zinc-500 text-[13px] font-medium"
          >
            {tick.price.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </text>
        ))}

        {/* X-AXIS LABELS & VERTICAL GRID LINES */}
        {xTicks.map((tick, i) => (
          <g key={i}>
            <line
              x1={tick.x}
              y1={paddingTop}
              x2={tick.x}
              y2={paddingTop + chartHeight}
              stroke="#e2e8f0"
              strokeWidth="1"
              className="dark:stroke-zinc-800"
            />
            <text
              x={tick.x}
              y={height - 10}
              textAnchor="middle"
              className="fill-zinc-400 dark:fill-zinc-500 text-[12px] font-medium"
            >
              {tick.label}
            </text>
          </g>
        ))}

        {/* PREVIOUS CLOSE DASHED BASELINE */}
        {/* {prevCloseY && (
          <g>
            <line
              x1={paddingLeft}
              y1={prevCloseY}
              x2={paddingLeft + chartWidth}
              y2={prevCloseY}
              stroke="#94a3b8"
              strokeDasharray="2 3"
              strokeWidth="1"
            />
            <text
              x={paddingLeft + chartWidth - 10}
              y={prevCloseY - 6}
              textAnchor="end"
              className="fill-zinc-500 dark:fill-zinc-400 text-[11px] font-semibold"
            >
              Prev. close {previousClose?.toFixed(2) ?? "N/A"}
            </text>
          </g>
        )} */}
        {previousClose &&
          prevCloseY !== null &&
          (() => {
            const isAboveChart = previousClose > max;
            const isBelowChart = previousClose < min;
            const isOutOfBounds = isAboveChart || isBelowChart;

            // Clamp line position so it stays inside chart area even when out of bounds
            const clampedY = Math.max(
              paddingTop,
              Math.min(paddingTop + chartHeight, prevCloseY),
            );

            return (
              <g>
                {/* BASELINE (Dashed Line) */}
                <line
                  x1={paddingLeft}
                  y1={clampedY}
                  x2={paddingLeft + chartWidth}
                  y2={clampedY}
                  stroke="#94a3b8"
                  strokeDasharray="2 3"
                  strokeWidth="1"
                />

                {/* CASE A: IN-BOUNDS TEXT (Renders right above the line inside the chart) */}
                {!isOutOfBounds && (
                  <text
                    x={paddingLeft + chartWidth - 10}
                    y={prevCloseY - 6}
                    textAnchor="end"
                    className="fill-zinc-500 dark:fill-zinc-400 text-[11px] font-semibold"
                  >
                    Prev. close {previousClose.toFixed(2)}
                  </text>
                )}

                {/* CASE B: OUT-OF-BOUNDS BADGE (Renders safely inside top or bottom margin) */}
                {isOutOfBounds && (
                  <g
                    transform={`translate(${paddingLeft + chartWidth - 120}, ${
                      isAboveChart
                        ? paddingTop + 4
                        : paddingTop + chartHeight - 20
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
                      Prev. close {previousClose.toFixed(2)}
                    </text>
                  </g>
                )}
              </g>
            );
          })()}

        {/* AREA CHART */}
        {chartType === "area" && (
          <g>
            <path d={preAreaD} fill={`url(#${gradientId})`} />
            <path
              d={prePathD}
              fill="none"
              stroke={strokeColor}
              strokeWidth="1"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {postLunchCoords.length > 0 && (
              <>
                <path d={postAreaD} fill={`url(#${gradientId})`} />
                <path
                  d={postPathD}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth="1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
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
              strokeWidth="1"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {postLunchCoords.length > 0 && (
              <path
                d={postPathD}
                fill="none"
                stroke={strokeColor}
                strokeWidth="1"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
          </g>
        )}

        {/* LUNCH BREAK BRIDGE AND LABEL */}
        {lunchStartPt && lunchEndPt && (
          <g>
            {/* Dashed Horizontal Bridge Line */}
            <line
              x1={lunchStartPt.x}
              y1={lunchStartPt.y}
              x2={lunchEndPt.x}
              y2={lunchStartPt.y}
              stroke={strokeColor}
              strokeDasharray="3 3"
              strokeWidth="1.2"
              opacity="0.8"
            />
            {/* Lunch Break Text Label */}
            <text
              x={(lunchStartPt.x + lunchEndPt.x) / 2}
              y={lunchStartPt.y - 12}
              textAnchor="middle"
              className="fill-zinc-600 dark:fill-zinc-300 text-[13px] font-semibold"
            >
              Lunch break
            </text>
          </g>
        )}

        {/* CANDLESTICK CHART */}
        {chartType === "candle" && (
          <g>
            {coords.map((pt, i) => {
              const color = pt.isRising ? "#008549" : "#cf0000";
              const candleTop = Math.min(pt.openY, pt.closeY);
              const candleHeight = Math.max(Math.abs(pt.closeY - pt.openY), 2);

              return (
                <g key={i}>
                  <line
                    x1={pt.x}
                    y1={pt.highY}
                    x2={pt.x}
                    y2={pt.lowY}
                    stroke={color}
                    strokeWidth="1.2"
                  />
                  <rect
                    x={pt.x - 3}
                    y={candleTop}
                    width="6"
                    height={candleHeight}
                    fill={color}
                    rx="0.5"
                  />
                </g>
              );
            })}
          </g>
        )}

        {/* BAR CHART */}
        {chartType === "bar" && (
          <g>
            {coords.map((pt, i) => {
              const fillColor = pt.isRising
                ? "rgba(0, 133, 73, 0.45)"
                : "rgba(207, 0, 0, 0.45)";
              const barStroke = pt.isRising ? "#008549" : "#cf0000";
              const barWidth = Math.max(chartWidth / coords.length - 1.5, 2);

              return (
                <rect
                  key={i}
                  x={pt.x - barWidth / 2}
                  y={pt.y}
                  width={barWidth}
                  height={paddingTop + chartHeight - pt.y}
                  fill={fillColor}
                  stroke={barStroke}
                  strokeWidth="0.5"
                  rx="1"
                />
              );
            })}
          </g>
        )}

        {/* END POINT DOT */}
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
              y2={paddingTop + chartHeight}
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
              }, ${paddingTop + chartHeight - 5})`}
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
