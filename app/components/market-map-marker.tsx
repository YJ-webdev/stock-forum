"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { useMarketQuote } from "@/app/hooks/useMarketQuote";

interface MarketMapMarkerProps {
  symbol: string;
  name: string;
  displaySymbol: string;

  x: number;
  y: number;

  labelX?: number;
  labelY?: number;

  view: "market" | "sentiment";
}

export function MarketMapMarker({
  symbol,
  name,
  displaySymbol,
  x,
  y,
  labelX = 0,
  labelY = -10,
  view,
}: MarketMapMarkerProps) {
  const router = useRouter();

  const [hovered, setHovered] = useState(false);

  const { data, loading } = useMarketQuote(
    symbol,
    name,
    "1D",
    displaySymbol,
    "index",
  );

  // =====================================================
  // LOADING
  // =====================================================

  if (loading || !data) {
    return (
      <g transform={`translate(${x} ${y})`}>
        <circle
          r={3.5}
          className="
            fill-zinc-400
            dark:fill-zinc-600
          "
        />
      </g>
    );
  }

  const colorClass = data.isPositive ? "fill-emerald-600" : "fill-rose-700";

  return (
    <g transform={`translate(${x} ${y})`}>
      {/* ===============================================
          HIT AREA
      =============================================== */}

      <circle
        r={16}
        fill="transparent"
        className="cursor-pointer"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={() => router.push(`/${encodeURIComponent(symbol)}`)}
      />

      {/* ===============================================
          MARKET DOT
      =============================================== */}

      <circle
        r={3.5}
        className={`
          ${colorClass}
          pointer-events-none
        `}
      />

      {/* ===============================================
          PERMANENT LABEL
      =============================================== */}

      <g
        transform={`translate(${labelX} ${labelY})`}
        className="pointer-events-none"
      >
        <text
          textAnchor="middle"
          className="
            fill-zinc-500
            text-[12px]
            font-medium
            dark:fill-zinc-400
          "
        >
          {displaySymbol}
        </text>

        <text
          y={14}
          textAnchor="middle"
          className={`
            text-[11px]
            font-semibold
            ${colorClass}
          `}
        >
          {view === "market" ? data.percent : "—"}
        </text>
      </g>

      {/* ===============================================
          HOVER CARD
      =============================================== */}

      {hovered && (
        <g
          transform={`translate(
            ${labelX}
            ${labelY - 75}
          )`}
          className="pointer-events-none"
        >
          <rect
            x={-90}
            y={-34}
            width={180}
            height={68}
            rx={8}
            className="
              fill-white
              stroke-zinc-200
              dark:fill-zinc-900
              dark:stroke-zinc-700
            "
            strokeWidth={0.75}
          />

          {/* Market name */}

          <text
            x={-78}
            y={-10}
            className="
              fill-zinc-900
              text-[16px]
              font-semibold
              dark:fill-zinc-100
            "
          >
            {name}
          </text>

          {/* Price */}

          <text
            x={-78}
            y={17}
            className="
              fill-zinc-600
              text-[16px]
              dark:fill-zinc-300
            "
          >
            {data.value}
          </text>

          {/* Percentage */}

          <text
            x={78}
            y={17}
            textAnchor="end"
            className={`
              ${colorClass}
              text-[17px]
              font-semibold
            `}
          >
            {data.percent}
          </text>
        </g>
      )}
    </g>
  );
}
