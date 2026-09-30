"use client";

import { createContext, useContext } from "react";

import type { LayoutSideData } from "../actions/query";

const LayoutSideDataContext = createContext<LayoutSideData | null>(null);

interface LayoutSideDataBridgeProps {
  data: LayoutSideData;
}

export default function LayoutSideDataBridge({
  data,
}: LayoutSideDataBridgeProps) {
  return (
    <LayoutSideDataContext.Provider value={data}>
      <div className="hidden" />
    </LayoutSideDataContext.Provider>
  );
}

export function useStreamedLayoutSideData() {
  return useContext(LayoutSideDataContext);
}
