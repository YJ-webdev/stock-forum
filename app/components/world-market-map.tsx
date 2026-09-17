"use client";

import { ComposableMap, Geographies, Geography } from "react-simple-maps/core";

import { ZoomableGroup } from "react-simple-maps/zoom";

import worldData from "world-atlas/countries-110m.json";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import { WORLD_MARKET_MARKERS } from "@/lib/data/world-market-markers";
import { MarketMapMarker } from "./market-map-marker";
import { useState } from "react";

export function WorldMarketMap() {
  type MapView = "market" | "sentiment";

  const [view, setView] = useState<MapView>("market");
  const topology = worldData as unknown as Topology<{
    countries: GeometryCollection;
  }>;

  const world = feature(topology, topology.objects.countries);

  return (
    <section className="w-full px-3 py-5 md:px-5">
      <div className="mx-auto w-full max-w-350">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex rounded-md bg-zinc-100 p-0.5 dark:bg-zinc-800">
            <button
              type="button"
              onClick={() => setView("market")}
              className={`rounded px-2.5 py-1 text-[13px] transition-colors ${
                view === "market"
                  ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-100"
                  : "text-zinc-500 dark:text-zinc-400"
              }`}
            >
              Market
            </button>

            <button
              type="button"
              onClick={() => setView("sentiment")}
              className={`rounded px-2.5 py-1 text-[13px] transition-colors ${
                view === "sentiment"
                  ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-100"
                  : "text-zinc-500 dark:text-zinc-400"
              }`}
            >
              Sentiment
            </button>
          </div>
        </div>

        <ComposableMap
          width={1000}
          height={480}
          projection="geoEqualEarth"
          projectionConfig={{
            scale: 180,
          }}
          className="h-auto w-full"
        >
          <ZoomableGroup center={[0, 0]} zoom={1} minZoom={1} maxZoom={5}>
            <Geographies geography={world}>
              {({ geographies }) =>
                geographies.map((geo) => (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    className="
    fill-zinc-200/50
    dark:fill-zinc-800
    outline-none
  "
                    stroke="none"
                    tabIndex={-1}
                  />
                ))
              }
            </Geographies>
            {WORLD_MARKET_MARKERS.map((market) => (
              <MarketMapMarker
                key={market.symbol}
                symbol={market.symbol}
                name={market.name}
                displaySymbol={market.displaySymbol}
                coordinates={market.coordinates}
                labelX={market.labelX}
                labelY={market.labelY}
                view={view}
              />
            ))}{" "}
          </ZoomableGroup>
        </ComposableMap>
      </div>
    </section>
  );
}
