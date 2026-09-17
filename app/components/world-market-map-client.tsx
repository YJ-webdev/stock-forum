// app/components/world-market-map-client.tsx

"use client";

import dynamic from "next/dynamic";

const WorldMarketMap = dynamic(
  () => import("./world-market-map").then((mod) => mod.WorldMarketMap),
  {
    ssr: false,
  },
);

export function WorldMarketMapClient() {
  return <WorldMarketMap />;
}
