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
        r={30}
        fill="transparent"
        className="cursor-pointer"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={() =>
          router.push(`/market?symbol=${encodeURIComponent(symbol)}`)
        }
      />

      {/* <circle r={3} className={`${colorClass} pointer-events-none`} /> */}

      {/* permanent label */}
      <g
        transform={`translate(${labelX} ${labelY})`}
        className="pointer-events-none"
      >
        {/* ticker */}
        <text
          textAnchor="middle"
          className="
    fill-zinc-800
    text-[20px]
    font-medium
    dark:fill-zinc-300
  "
        >
          {displaySymbol}
        </text>

        {/* percentage - hide on small screens */}
        <text
          y={22}
          textAnchor="middle"
          className={`
      hidden
      sm:block
      text-[18px]
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
          transform={`translate(${labelX} ${labelY - 75})`}
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

          {/* market name */}
          <text
            x={-78}
            y={-10}
            className="fill-zinc-900 text-[16px] font-semibold dark:fill-zinc-100"
          >
            {name}
          </text>

          {/* price */}
          <text
            x={-78}
            y={17}
            className="fill-zinc-600 text-[16px] dark:fill-zinc-300"
          >
            {data.value}
          </text>

          {/* percent */}
          <text
            x={78}
            y={17}
            textAnchor="end"
            className={`${colorClass} text-[17px] font-semibold`}
          >
            {data.percent}
          </text>
        </g>
      )}
    </Marker>
  );
}
