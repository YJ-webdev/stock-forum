"use client";

import { Marker } from "react-simple-maps/core";
import { useMarketQuote } from "@/app/hooks/useMarketQuote";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface MarketMapMarkerProps {
  symbol: string;
  name: string;
  displaySymbol: string;
  coordinates: [number, number];
  labelX?: number;
  labelY?: number;
  view: "market" | "sentiment";
}

export function MarketMapMarker({
  symbol,
  name,
  displaySymbol,
  coordinates,
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

  if (loading || !data) {
    return (
      <Marker coordinates={coordinates}>
        <circle r={2.5} className="fill-zinc-400 dark:fill-zinc-600" />
      </Marker>
    );
  }

  const colorClass = data.isPositive ? "fill-emerald-600" : "fill-rose-700";

  return (
    <Marker coordinates={coordinates}>
      {/* clickable/hoverable area */}
      <circle
        r={14}
        fill="transparent"
        className="cursor-pointer"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={() =>
          router.push(`/market?symbol=${encodeURIComponent(symbol)}`)
        }
      />

      <circle r={3} className={`${colorClass} pointer-events-none`} />

      {/* permanent label */}
      <g
        transform={`translate(${labelX} ${labelY})`}
        className="pointer-events-none"
      >
        {/* ticker */}
        <text
          textAnchor="middle"
          className="
      fill-zinc-500
      text-[10px]
      font-medium
      dark:fill-zinc-400
    "
        >
          {displaySymbol}
        </text>

        {/* percentage - hide on small screens */}
        <text
          y={12}
          textAnchor="middle"
          className={`
      hidden
      sm:block
      text-[10px]
      font-semibold
      ${colorClass}
    `}
        >
          {view === "market" ? data.percent : "—"}
        </text>
      </g>

      {/* hover card */}
      {hovered && (
        <g
          transform={`translate(${labelX} ${labelY - 50})`}
          className="pointer-events-none"
        >
          <rect
            x={-52}
            y={-23}
            width={104}
            height={42}
            rx={6}
            className="fill-white stroke-zinc-200 dark:fill-zinc-900 dark:stroke-zinc-700"
            strokeWidth={0.75}
          />

          <text
            x={-43}
            y={-7}
            className="fill-zinc-900 text-[8px] font-semibold dark:fill-zinc-100"
          >
            {name}
          </text>

          <text
            x={-43}
            y={7}
            className="fill-zinc-600 text-[8px] dark:fill-zinc-300"
          >
            {data.value}
          </text>

          <text
            x={43}
            y={7}
            textAnchor="end"
            className={`${colorClass} text-[8px] font-semibold`}
          >
            {data.percent}
          </text>
        </g>
      )}
    </Marker>
  );
}
