"use client";

import React, { useCallback, useEffect, useId, useRef, useState } from "react";

import {
  AreaChart,
  CandlestickChart,
  ChartLine,
  Minimize2,
  Plus,
  Minus,
  RotateCcw,
} from "lucide-react";
import { resolveLanguage } from "@/lib/data/languages";
import { MARKET_LABELS } from "@/lib/data/translations";
import type { SelectedRange } from "@/app/hooks/useMarketQuote";

export type ChartType = "line" | "area" | "candle";
export type ChartRangeOption = SelectedRange;

export interface DetailChartProps {
  userLanguage?: string | null;
  ranges?: readonly ChartRangeOption[];
  rangeLabels?: Partial<Record<ChartRangeOption, string>>;
  onRangeChange?: (range: ChartRangeOption) => void | Promise<void>;
  rangeLoading?: boolean;

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

  /** Optional effective API interval, e.g. "1m" or "15m". */
  chartInterval?: string;
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
];

function formatTooltipDate(
  timestampMs: number,
  range: string,
  exchangeTimezone?: string,
) {
  const date = new Date(timestampMs);

  const options: Intl.DateTimeFormatOptions = exchangeTimezone
    ? { timeZone: exchangeTimezone }
    : {};

  if (range === "5Y" || range === "MAX") {
    return new Intl.DateTimeFormat("en-US", {
      ...options,
      month: "short",
      year: "numeric",
    }).format(date);
  }

  if (range === "1Y" || range === "1M" || range === "3M") {
    return new Intl.DateTimeFormat("en-US", {
      ...options,
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  }

  if (range === "5D") {
    return new Intl.DateTimeFormat("en-US", {
      ...options,
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(date);
  }

  return new Intl.DateTimeFormat("en-US", {
    ...options,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
}

export function DetailChart({
  history,
  isPositive,
  isClosed,
  range,
  previousClose,
  lunchStartMs,
  lunchEndMs,
  exchangeTimezone,
  sessionStartMs,
  sessionEndMs,
  userLanguage,
  ranges,
  rangeLabels,
  onRangeChange,
  rangeLoading = false,
  onClick,
}: DetailChartProps) {
  const chartId = useId().replace(/:/g, "");
  const language = resolveLanguage(userLanguage);
  const marketLabels = MARKET_LABELS[language];

  const [chartType, setChartType] = useState<ChartType>("area");
  // Optional overlays are exclusive to Candle mode. Off by default for clarity.
  const [showMA5, setShowMA5] = useState(false);
  const [showMA20, setShowMA20] = useState(false);
  const [showMA60, setShowMA60] = useState(false);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const repeatTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopHolding = useCallback(() => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    if (repeatTimer.current) clearInterval(repeatTimer.current);
    holdTimer.current = null;
    repeatTimer.current = null;
  }, []);
  useEffect(() => stopHolding, [stopHolding]);
  // Viewport is expressed in normalized coordinates of the original plot.
  // Keep roughly 24 or more real observations visible at maximum zoom.
  // This prevents exaggerated gaps between candles without inventing data.
  const observationCount = (history ?? []).filter(
    (point) =>
      Number.isFinite(point.timestampMs) && Number.isFinite(point.price),
  ).length;
  const minZoomSpan = Math.min(
    1,
    Math.max(0.025, 24 / Math.max(observationCount, 1)),
  );
  const [viewport, setViewport] = useState({ start: 0, end: 1 });
  const svgRef = useRef<SVGSVGElement>(null);
  const [svgPixelWidth, setSvgPixelWidth] = useState(800);
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const update = () =>
      setSvgPixelWidth(svg.getBoundingClientRect().width || 800);
    update();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(update);
    observer.observe(svg);
    return () => observer.disconnect();
  }, []);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{
    start: number;
    end: number;
    center: number;
    distance: number;
    anchor: number;
    mode: "pan" | "pinch";
  } | null>(null);
  const viewportRef = useRef(viewport);
  viewportRef.current = viewport;

  useEffect(() => {
    setViewport({ start: 0, end: 1 });
    pointers.current.clear();
    gesture.current = null;
  }, [range]);

  const updateViewport = useCallback(
    (start: number, end: number) => {
      const span = Math.max(minZoomSpan, Math.min(1, end - start));
      const left = Math.max(0, Math.min(1 - span, start));
      setViewport({ start: left, end: left + span });
      setHoveredPoint(null);
    },
    [minZoomSpan],
  );

  const zoom = useCallback(
    (factor: number, anchor = 0.5) => {
      const current = viewportRef.current;
      const span = current.end - current.start;
      const nextSpan = Math.max(minZoomSpan, Math.min(1, span * factor));
      const worldAnchor = current.start + span * anchor;
      updateViewport(
        worldAnchor - nextSpan * anchor,
        worldAnchor - nextSpan * anchor + nextSpan,
      );
    },
    [minZoomSpan, updateViewport],
  );

  const resetZoom = useCallback(() => updateViewport(0, 1), [updateViewport]);

  const startHolding = useCallback(
    (factor: number) => {
      stopHolding();
      zoom(factor);
      holdTimer.current = setTimeout(() => {
        repeatTimer.current = setInterval(() => zoom(factor), 75);
      }, 320);
    },
    [zoom, stopHolding],
  );

  const getSvgPosition = useCallback((clientX: number, clientY: number) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || !rect.width || !rect.height) return null;
    return {
      x: ((clientX - rect.left) / rect.width) * 800,
      y: ((clientY - rect.top) / rect.height) * 320,
    };
  }, []);

  const getAnchor = useCallback(
    (x: number) => Math.max(0, Math.min(1, (x - 65) / 715)),
    [],
  );

  useEffect(() => {
    const element = svgRef.current;
    if (!element) return;
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      const rect = element.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 800;
      if (x < 65 || x > 780) return;
      event.preventDefault();
      zoom(Math.exp(event.deltaY * 0.002), getAnchor(x));
    };
    element.addEventListener("wheel", onWheel, { passive: false });
    return () => element.removeEventListener("wheel", onWheel);
  }, [zoom, getAnchor]);

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
  const useFullSession = hasSessionRange && !isClosed;

  const axisStartMs = useFullSession ? sessionStartMs : firstTimestamp;

  const axisEndMs = useFullSession ? sessionEndMs : lastTimestamp;

  const fullTimeRange = Math.max(axisEndMs - axisStartMs, 1);

  function getOriginalX(timestampMs: number) {
    if (range === "5D") {
      if (data.length === 1) {
        return paddingLeft + chartWidth / 2;
      }

      // Find the surrounding candles.
      let left = 0;
      let right = data.length - 1;

      while (left < right) {
        const middle = Math.floor((left + right) / 2);

        if (data[middle].timestampMs < timestampMs) {
          left = middle + 1;
        } else {
          right = middle;
        }
      }

      const nextIndex = left;
      let position = nextIndex;

      if (nextIndex > 0) {
        const previousIndex = nextIndex - 1;
        const startMs = data[previousIndex].timestampMs;
        const endMs = data[nextIndex].timestampMs;

        const fraction =
          endMs > startMs ? (timestampMs - startMs) / (endMs - startMs) : 0;

        position = previousIndex + Math.max(0, Math.min(1, fraction));
      }

      return paddingLeft + (position / (data.length - 1)) * chartWidth;
    }

    if (firstTimestamp === lastTimestamp && !useFullSession) {
      return paddingLeft + chartWidth / 2;
    }

    const ratio = (timestampMs - axisStartMs) / fullTimeRange;

    return paddingLeft + Math.max(0, Math.min(1, ratio)) * chartWidth;
  }

  // Reproject the original X coordinate into the visible viewport.
  const visibleSpan = viewport.end - viewport.start;
  const viewportLeft = paddingLeft + viewport.start * chartWidth;
  const viewportRight = paddingLeft + viewport.end * chartWidth;
  function getX(timestampMs: number) {
    return (
      paddingLeft + (getOriginalX(timestampMs) - viewportLeft) / visibleSpan
    );
  }

  // --------------------------------------------------
  // PRICE RANGE
  // --------------------------------------------------

  const validPreviousClose =
    typeof previousClose === "number" && Number.isFinite(previousClose)
      ? previousClose
      : undefined;

  const visibleData = data.filter((point) => {
    const x = getOriginalX(point.timestampMs);
    return x >= viewportLeft && x <= viewportRight;
  });
  const priceSource = visibleData.length ? visibleData : data;
  const priceValues = priceSource.flatMap((point) => {
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

  const rawMin = Math.min(...priceValues);
  const rawMax = Math.max(...priceValues);
  const rawPriceRange = rawMax - rawMin;

  const pricePadding =
    rawPriceRange === 0
      ? Math.max(Math.abs(rawMin) * 0.005, 0.01)
      : rawPriceRange * 0.05;

  function getNiceStep(value: number) {
    const magnitude = 10 ** Math.floor(Math.log10(value));
    const fraction = value / magnitude;

    const niceFraction =
      fraction <= 1
        ? 1
        : fraction <= 2
          ? 2
          : fraction <= 2.5
            ? 2.5
            : fraction <= 5
              ? 5
              : 10;

    return niceFraction * magnitude;
  }

  const paddedMin = rawMin - pricePadding;
  const paddedMax = rawMax + pricePadding;

  const tickStep = getNiceStep((paddedMax - paddedMin) / 4);

  const min = Math.floor(paddedMin / tickStep) * tickStep;
  const max = Math.ceil(paddedMax / tickStep) * tickStep;

  const priceRange = max - min || tickStep;

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

  // Moving averages use real candle closes, not interpolated prices.
  // The initial candles are omitted until a full window is available.
  function movingAveragePath(period: number): string {
    if (data.length < period) return "";
    let sum = 0;
    const parts: string[] = [];
    for (let i = 0; i < data.length; i++) {
      const current = data[i].close ?? data[i].price;
      sum += current;
      if (i >= period) sum -= data[i - period].close ?? data[i - period].price;
      if (i < period - 1) continue;
      const x = coords[i].x;
      const y = getY(sum / period);
      parts.push(`${parts.length === 0 ? "M" : "L"} ${x},${y}`);
    }
    return parts.join(" ");
  }

  const ma5Path = showMA5 ? movingAveragePath(5) : "";
  const ma20Path = showMA20 ? movingAveragePath(20) : "";
  const ma60Path = showMA60 ? movingAveragePath(60) : "";

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

  const tickCount = Math.min(30, Math.round((max - min) / tickStep));

  const yTicks = Array.from({ length: tickCount + 1 }, (_, index) => {
    const price = Number((min + index * tickStep).toPrecision(12));

    return {
      price,
      y: getY(price),
    };
  });

  const yLabelDecimals =
    tickStep >= 1
      ? Number.isInteger(tickStep)
        ? 0
        : 1
      : Math.max(0, -Math.floor(Math.log10(tickStep))) +
        (Number.isInteger(
          Number(
            (tickStep / 10 ** Math.floor(Math.log10(tickStep))).toFixed(8),
          ),
        )
          ? 0
          : 1);

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

  const dateFormatter = new Intl.DateTimeFormat(language, {
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

  // --------------------------------------------------
  // ADAPTIVE X AXIS
  // Tick locations are derived from actual observations, not arbitrary
  // fractional timestamps. This avoids misleading labels on closed days,
  // weekends and the compressed overnight gaps of the 5D view.
  // --------------------------------------------------

  type XTick = { label: string; x: number };
  type TickUnit =
    | "minute"
    | "hour"
    | "day"
    | "week"
    | "month"
    | "quarter"
    | "year";
  type TickStep = { unit: TickUnit; every: number };

  const DAY_MS = 86_400_000;
  const visibleStartMs =
    range === "5D"
      ? (visibleData[0]?.timestampMs ?? firstTimestamp)
      : axisStartMs + fullTimeRange * viewport.start;
  const visibleEndMs =
    range === "5D"
      ? (visibleData[visibleData.length - 1]?.timestampMs ?? lastTimestamp)
      : axisStartMs + fullTimeRange * viewport.end;
  const visibleDurationMs = Math.max(1, visibleEndMs - visibleStartMs);

  // Use exchange-local calendar parts so date changes, DST, and market
  // sessions are interpreted in the exchange's timezone.
  const calendarFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: exchangeTimezone || "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const yearFormatter = new Intl.DateTimeFormat(language, {
    year: "numeric",
    ...timezoneOptions,
  });
  const monthFormatter = new Intl.DateTimeFormat(language, {
    month: "short",
    year: "numeric",
    ...timezoneOptions,
  });
  const monthDayYearFormatter = new Intl.DateTimeFormat(language, {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...timezoneOptions,
  });

  function localParts(ms: number) {
    const parts = calendarFormatter.formatToParts(new Date(ms));
    const numberPart = (name: Intl.DateTimeFormatPartTypes) =>
      Number(parts.find((part) => part.type === name)?.value ?? 0);
    return {
      year: numberPart("year"),
      month: numberPart("month"),
      day: numberPart("day"),
      hour: numberPart("hour") % 24,
      minute: numberPart("minute"),
    };
  }

  function bucketFor(ms: number, step: TickStep) {
    const p = localParts(ms);
    const dateOrdinal = Math.floor(
      Date.UTC(p.year, p.month - 1, p.day) / DAY_MS,
    );
    switch (step.unit) {
      case "minute":
        return `${dateOrdinal}-${Math.floor((p.hour * 60 + p.minute) / step.every)}`;
      case "hour":
        return `${dateOrdinal}-${Math.floor(p.hour / step.every)}`;
      case "day":
        return String(Math.floor(dateOrdinal / step.every));
      case "week":
        // Monday-aligned weeks; UTC day ordinal 0 is Thursday.
        return String(Math.floor((dateOrdinal + 3) / (7 * step.every)));
      case "month":
        return String(Math.floor((p.year * 12 + p.month - 1) / step.every));
      case "quarter":
        return String(
          Math.floor((p.year * 4 + Math.floor((p.month - 1) / 3)) / step.every),
        );
      case "year":
        return String(Math.floor(p.year / step.every));
    }
  }

  // Pick a calendar unit based on the *visible* duration, not the
  // original selected range. Thus zooming in naturally reveals details.
  const candidateSteps: { step: TickStep; approximateMs: number }[] = [
    { step: { unit: "minute", every: 1 }, approximateMs: 60_000 },
    { step: { unit: "minute", every: 2 }, approximateMs: 120_000 },
    { step: { unit: "minute", every: 5 }, approximateMs: 300_000 },
    { step: { unit: "minute", every: 10 }, approximateMs: 600_000 },
    { step: { unit: "minute", every: 15 }, approximateMs: 900_000 },
    { step: { unit: "minute", every: 30 }, approximateMs: 1_800_000 },
    { step: { unit: "hour", every: 1 }, approximateMs: 3_600_000 },
    { step: { unit: "hour", every: 2 }, approximateMs: 7_200_000 },
    { step: { unit: "hour", every: 4 }, approximateMs: 14_400_000 },
    { step: { unit: "hour", every: 6 }, approximateMs: 21_600_000 },
    { step: { unit: "day", every: 1 }, approximateMs: DAY_MS },
    { step: { unit: "day", every: 2 }, approximateMs: 2 * DAY_MS },
    { step: { unit: "week", every: 1 }, approximateMs: 7 * DAY_MS },
    { step: { unit: "week", every: 2 }, approximateMs: 14 * DAY_MS },
    { step: { unit: "month", every: 1 }, approximateMs: 30 * DAY_MS },
    { step: { unit: "quarter", every: 1 }, approximateMs: 91 * DAY_MS },
    { step: { unit: "month", every: 6 }, approximateMs: 183 * DAY_MS },
    { step: { unit: "year", every: 1 }, approximateMs: 365 * DAY_MS },
    { step: { unit: "year", every: 2 }, approximateMs: 730 * DAY_MS },
    { step: { unit: "year", every: 5 }, approximateMs: 1826 * DAY_MS },
    { step: { unit: "year", every: 10 }, approximateMs: 3652 * DAY_MS },
  ];

  // For 5D, the default overview should always use trading-day dates.
  // Once zoomed to a single trading day, switch to intraday clock times.
  const visibleDayKeys = new Set(
    (range === "5D" ? visibleData : []).map((point) => {
      const p = localParts(point.timestampMs);
      return `${p.year}-${p.month}-${p.day}`;
    }),
  );
  const fiveDayOverview = range === "5D" && visibleDayKeys.size > 1;

  function tickLabel(ms: number, unit: TickUnit) {
    if (unit === "minute" || unit === "hour") {
      return formatTimeLabel(ms);
    }
    if (unit === "year") return yearFormatter.format(new Date(ms));
    if (unit === "month" || unit === "quarter") {
      return monthFormatter.format(new Date(ms));
    }
    if (visibleDurationMs >= 365 * DAY_MS) {
      return monthDayYearFormatter.format(new Date(ms));
    }
    return formatDateLabel(ms);
  }

  // Grid and labels have independent spacing. The grid becomes denser
  // when zooming in, while labels remain readable on narrow screens.
  // Work in SVG units, converted from actual CSS pixels.
  const plotPixelWidth = Math.max(1, svgPixelWidth * (chartWidth / width));
  const gridSpacing = (40 / plotPixelWidth) * chartWidth;
  const labelSpacing = (85 / plotPixelWidth) * chartWidth;

  // Every tick is anchored to an actual observation, so 5D's compressed
  // overnight gaps do not produce fictional timestamps.
  function buildTicks(step: TickStep): XTick[] {
    const ticks: XTick[] = [];
    let previousBucket: string | null = null;
    for (const point of visibleData) {
      const bucket = bucketFor(point.timestampMs, step);
      if (bucket === previousBucket) continue;
      previousBucket = bucket;
      const x = getX(point.timestampMs);
      if (x < paddingLeft + 10 || x > chartRight - 10) continue;
      ticks.push({ x, label: tickLabel(point.timestampMs, step.unit) });
    }
    return ticks;
  }

  // Select the finest calendar step that keeps the *grid* readable.
  // On a 5D overview, show trading-day boundaries instead of arbitrary
  // hour labels; within a single day, use the same adaptive logic as 1D.
  let selectedStep: TickStep = candidateSteps[candidateSteps.length - 1].step;
  if (fiveDayOverview) {
    selectedStep = { unit: "day", every: 1 };
  } else {
    for (const candidate of candidateSteps) {
      const ticks = buildTicks(candidate.step);
      if (ticks.length < 2) {
        selectedStep = candidate.step;
        continue;
      }
      let minimumDistance = Infinity;
      for (let i = 1; i < ticks.length; i++) {
        minimumDistance = Math.min(
          minimumDistance,
          ticks[i].x - ticks[i - 1].x,
        );
      }
      selectedStep = candidate.step;
      if (minimumDistance >= gridSpacing) break;
    }
  }

  const xGridTicks = buildTicks(selectedStep);
  const xLabelTicks: XTick[] = [];
  let lastLabelX = -Infinity;
  for (const tick of xGridTicks) {
    if (tick.x - lastLabelX < labelSpacing) continue;
    xLabelTicks.push(tick);
    lastLabelX = tick.x;
  }

  // --------------------------------------------------
  // PREVIOUS CLOSE / COLOR
  // --------------------------------------------------

  const previousCloseY =
    validPreviousClose !== undefined ? getY(validPreviousClose) : null;
  const showPreviousClose =
    previousCloseY !== null &&
    previousCloseY >= paddingTop &&
    previousCloseY <= chartBottom;

  const strokeColor = isPositive ? "#008549" : "var(--chart-down)";
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
      mouseX < Math.max(paddingLeft, firstPoint.x - 6) ||
      mouseX > Math.min(chartRight, lastPoint.x + 6)
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
      timeStr: formatTooltipDate(closest.timestampMs, range, exchangeTimezone),
    });
  }

  function handlePointerDown(event: React.PointerEvent<SVGSVGElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const position = getSvgPosition(event.clientX, event.clientY);
    if (!position || position.x < paddingLeft || position.x > chartRight)
      return;
    pointers.current.set(event.pointerId, position);
    event.currentTarget.setPointerCapture(event.pointerId);
    const values = [...pointers.current.values()];
    const current = viewportRef.current;
    if (values.length >= 2) {
      const center = (values[0].x + values[1].x) / 2;
      gesture.current = {
        start: current.start,
        end: current.end,
        center,
        distance: Math.max(1, Math.abs(values[0].x - values[1].x)),
        anchor: getAnchor(center),
        mode: "pinch",
      };
    } else {
      gesture.current = {
        start: current.start,
        end: current.end,
        center: position.x,
        distance: 1,
        anchor: getAnchor(position.x),
        mode: "pan",
      };
    }
  }

  function handlePointerMove(event: React.PointerEvent<SVGSVGElement>) {
    if (!pointers.current.has(event.pointerId)) {
      if (event.pointerType === "mouse") handleMouseMove(event);
      return;
    }
    const position = getSvgPosition(event.clientX, event.clientY);
    if (!position) return;
    pointers.current.set(event.pointerId, position);
    const values = [...pointers.current.values()];
    const initial = gesture.current;
    if (!initial) return;
    if (values.length >= 2 && initial.mode === "pinch") {
      const distance = Math.max(1, Math.abs(values[0].x - values[1].x));
      const center = (values[0].x + values[1].x) / 2;
      const span = Math.max(
        minZoomSpan,
        Math.min(
          1,
          ((initial.end - initial.start) * initial.distance) / distance,
        ),
      );
      const worldAnchor =
        initial.start + (initial.end - initial.start) * initial.anchor;
      const screenAnchor = getAnchor(center);
      updateViewport(
        worldAnchor - span * screenAnchor,
        worldAnchor + span * (1 - screenAnchor),
      );
    } else if (values.length === 1 && initial.mode === "pan") {
      const delta =
        ((position.x - initial.center) / chartWidth) *
        (initial.end - initial.start);
      updateViewport(initial.start - delta, initial.end - delta);
    }
  }

  function handlePointerUp(event: React.PointerEvent<SVGSVGElement>) {
    pointers.current.delete(event.pointerId);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    gesture.current = null;
    const remaining = [...pointers.current.values()];
    if (remaining.length === 1) {
      const current = viewportRef.current;
      gesture.current = {
        start: current.start,
        end: current.end,
        center: remaining[0].x,
        distance: 1,
        anchor: getAnchor(remaining[0].x),
        mode: "pan",
      };
    }
  }

  // --------------------------------------------------
  // CANDLE WIDTH
  // --------------------------------------------------

  let minimumPointSpacing = chartWidth / Math.max(visibleData.length, 1);

  for (let index = 1; index < coords.length; index++) {
    const spacing = coords[index].x - coords[index - 1].x;

    if (spacing > 0) {
      minimumPointSpacing = Math.min(minimumPointSpacing, spacing);
    }
  }

  // Leave a visible gap between adjacent candle bodies (at least 1 SVG unit).
  // Width stays proportional to spacing and never overlaps neighboring candles.
  const candleWidth = Math.max(
    0.5,
    Math.min(minimumPointSpacing * 0.82, minimumPointSpacing - 1, 14),
  );

  const hoverLabelX = hoveredPoint
    ? Math.max(paddingLeft, Math.min(chartRight - 120, hoveredPoint.x - 60))
    : 0;

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------

  return (
    <div className="relative w-full select-none bg-zinc-50 p-4 md:rounded-2xl md:border md:border-zinc-200 dark:bg-zinc-800/50 dark:md:border-zinc-800">
      {/* TOP CONTROL BAR */}
      <div className="relative z-5 flex items-center justify-between gap-6 dark:text-zinc-100">
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
          className="mr-2 flex size-7 cursor-pointer items-center justify-center rounded-sm text-zinc-600 transition-colors hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 dark:text-zinc-100 dark:hover:text-white"
        >
          <Minimize2 className="size-5" strokeWidth={1.5} />
        </button>
      </div>

      {/* HOVER PRICE BADGE */}

      {hoveredPoint && (
        <div className="jakarta absolute left-1/2 top-14 z-10 flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-sm border border-zinc-200 bg-white px-2.5 py-1 text-xs font-normal shadow-xs dark:border-zinc-700 dark:bg-zinc-800">
          <span className="text-zinc-600 dark:text-zinc-400">
            {marketLabels.price}:
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
                ? "text-emerald-700 dark:text-emerald-400"
                : "text-[#cf0000] dark:text-[#ff4f4f]"
            }
          >
            ({hoveredPoint.percentChange >= 0 ? "+" : ""}
            {hoveredPoint.percentChange.toFixed(2)}%)
          </span>
        </div>
      )}

      <div
        className="mb-2 mt-3 flex flex-wrap items-center gap-2 text-xs"
        aria-label="Moving average indicators"
      >
        {(
          [
            {
              label: "MA 5",
              checked: showMA5,
              toggle: () => setShowMA5((v) => !v),
              color: "#2563eb",
              title: "Average closing price over 5 candles",
            },
            {
              label: "MA 20",
              checked: showMA20,
              toggle: () => setShowMA20((v) => !v),
              color: "#d97706",
              title: "Average closing price over 20 candles",
            },
            {
              label: "MA 60",
              checked: showMA60,
              toggle: () => setShowMA60((v) => !v),
              color: "#9333ea",
              title: "Average closing price over 60 candles",
            },
          ] as const
        ).map((indicator) => (
          <button
            key={indicator.label}
            type="button"
            title={indicator.title}
            aria-label={`${indicator.label}: ${indicator.title}`}
            aria-pressed={indicator.checked}
            onClick={indicator.toggle}
            className={`inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 ${indicator.checked ? "border-zinc-400 bg-zinc-200/70 text-zinc-900 dark:border-zinc-500 dark:bg-zinc-700 dark:text-zinc-100" : "border-zinc-200 text-zinc-500 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-700/50"}`}
          >
            <span
              className="h-0.5 w-3 rounded-full"
              style={{ backgroundColor: indicator.color }}
              aria-hidden="true"
            />
            {indicator.label}
          </button>
        ))}
        <span className="text-zinc-400 dark:text-zinc-500">
          MA = moving average of candle closes
        </span>
      </div>

      {/* MAIN SVG */}

      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full cursor-crosshair overflow-visible [touch-action:pan-y] [--chart-down:#cf0000] dark:[--chart-down:#ff4545]"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onMouseLeave={() => setHoveredPoint(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.25" />

            <stop offset="100%" stopColor={strokeColor} stopOpacity="0" />
          </linearGradient>
          <clipPath id={`plot-clip-${chartId}`}>
            <rect
              x={paddingLeft}
              y={paddingTop}
              width={chartWidth}
              height={chartHeight}
            />
          </clipPath>
        </defs>

        {/* Y AXIS LABELS */}

        {yTicks.map((tick, index) => (
          <text
            key={index}
            x={paddingLeft - 12}
            y={tick.y + 4}
            textAnchor="end"
            className="jakarta fill-zinc-800 text-[12px] font-normal dark:fill-zinc-100 dark:font-light"
          >
            {tick.price.toLocaleString("en-US", {
              minimumFractionDigits: yLabelDecimals,
              maximumFractionDigits: yLabelDecimals,
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

        {/* X GRID: more frequent than the text labels */}
        {xGridTicks.map((tick, index) => (
          <line
            key={`grid-${index}`}
            x1={tick.x}
            y1={paddingTop}
            x2={tick.x}
            y2={chartBottom}
            stroke="#e2e8f0"
            strokeWidth="1"
            className="dark:stroke-zinc-600/50"
          />
        ))}

        {/* X LABELS: independently spaced for legibility */}
        {xLabelTicks.map((tick, index) => (
          <text
            key={`label-${index}`}
            x={tick.x}
            y={chartBottom + 20}
            textAnchor="middle"
            className="jakarta fill-zinc-800 text-[12px] font-normal dark:fill-zinc-100 dark:font-light"
          >
            {tick.label}
          </text>
        ))}

        {/* PREVIOUS CLOSE */}

        {validPreviousClose !== undefined && showPreviousClose && (
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
          </g>
        )}

        <g clipPath={`url(#plot-clip-${chartId})`}>
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
                      strokeWidth="1.5"
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
                  strokeDasharray="2 3.5"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  opacity="0.6"
                />

                <text
                  x={(lunchStartPoint.x + lunchEndPoint.x) / 2}
                  y={(lunchStartPoint.y + lunchEndPoint.y) / 2 - 10}
                  textAnchor="middle"
                  className="outfit fill-zinc-400 text-[15px] font-medium dark:fill-zinc-400"
                >
                  {marketLabels.lunch_break}
                </text>
              </g>
            )}

          {/* CANDLESTICK */}

          {chartType === "candle" && (
            <g>
              {coords.map((point, index) => {
                const color = point.isRising ? "#008549" : "var(--chart-down)";

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

          {/* OPTIONAL MOVING AVERAGES — available in every chart mode */}
          <g pointerEvents="none">
            {showMA5 && ma5Path && (
              <path
                d={ma5Path}
                fill="none"
                stroke="#2563eb"
                strokeWidth="1.8"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            )}
            {showMA20 && ma20Path && (
              <path
                d={ma20Path}
                fill="none"
                stroke="#d97706"
                strokeWidth="1.8"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            )}
            {showMA60 && ma60Path && (
              <path
                d={ma60Path}
                fill="none"
                stroke="#9333ea"
                strokeWidth="1.8"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            )}
          </g>

          {/* LATEST DATA POINT */}

          {!hoveredPoint &&
            lastPoint.x >= paddingLeft &&
            lastPoint.x <= chartRight &&
            (chartType === "line" || chartType === "area") && (
              <circle
                cx={lastPoint.x}
                cy={lastPoint.y}
                r="4.5"
                fill={strokeColor}
              />
            )}
        </g>

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
                className="fill-white stroke-zinc-100 dark:fill-zinc-800 dark:stroke-zinc-700"
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

        {/* PREVIOUS CLOSE LABEL — above chart and crosshair */}
        {typeof validPreviousClose === "number" &&
          Number.isFinite(validPreviousClose) &&
          typeof previousCloseY === "number" &&
          Number.isFinite(previousCloseY) &&
          showPreviousClose && (
            <text
              x={chartRight - 10}
              y={previousCloseY - 15}
              textAnchor="end"
              pointerEvents="none"
              className="jakarta fill-zinc-800 text-[12px] dark:fill-zinc-100 dark:font-light"
            >
              {marketLabels.prev_close}:{" "}
              <tspan className="font-bold">
                {validPreviousClose.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </tspan>
            </text>
          )}
      </svg>

      {/* RANGE (left) + ZOOM (right) */}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="flex min-w-0 flex-wrap items-center gap-1 sm:gap-2">
          {ranges?.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={range === option}
              disabled={rangeLoading}
              onClick={() => void onRangeChange?.(option)}
              className={`cursor-pointer rounded-full px-2.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait disabled:opacity-50 ${
                range === option
                  ? "bg-zinc-200 text-zinc-900 dark:bg-zinc-600 dark:text-white"
                  : "text-zinc-600 hover:bg-zinc-200/60 dark:text-zinc-400 dark:hover:bg-zinc-700/50"
              }`}
            >
              {rangeLabels?.[option] ?? option}
            </button>
          ))}
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-1 dark:text-zinc-100">
          <button
            type="button"
            aria-label="Zoom out"
            title="Zoom out"
            disabled={visibleSpan >= 0.999}
            onPointerDown={(event) => {
              if (event.button === 0) startHolding(1.12);
            }}
            onPointerUp={stopHolding}
            onPointerCancel={stopHolding}
            onPointerLeave={stopHolding}
            onClick={(event) => {
              if (event.detail === 0) zoom(1.12);
            }}
            className="flex size-8 cursor-pointer touch-none items-center justify-center rounded-md text-zinc-600 hover:bg-zinc-200/60 disabled:cursor-not-allowed disabled:opacity-30 dark:text-zinc-300 dark:hover:bg-zinc-700/50"
          >
            <Minus className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Zoom in"
            title="Zoom in"
            disabled={visibleSpan <= minZoomSpan + 0.0001}
            onPointerDown={(event) => {
              if (event.button === 0) startHolding(1 / 1.12);
            }}
            onPointerUp={stopHolding}
            onPointerCancel={stopHolding}
            onPointerLeave={stopHolding}
            onClick={(event) => {
              if (event.detail === 0) zoom(1 / 1.12);
            }}
            className="flex size-8 cursor-pointer touch-none items-center justify-center rounded-md text-zinc-600 hover:bg-zinc-200/60 disabled:cursor-not-allowed disabled:opacity-30 dark:text-zinc-300 dark:hover:bg-zinc-700/50"
          >
            <Plus className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Reset zoom"
            title="Reset zoom"
            disabled={visibleSpan >= 0.999}
            onClick={resetZoom}
            className="flex size-8 cursor-pointer items-center justify-center rounded-md text-zinc-600 hover:bg-zinc-200/60 disabled:cursor-not-allowed disabled:opacity-30 dark:text-zinc-300 dark:hover:bg-zinc-700/50"
          >
            <RotateCcw className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
