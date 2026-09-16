"use client";

import { createContext, useContext } from "react";

interface SectionBContextValue {
  showWrite: () => void;
  showAccount: () => void;
  showNotification: () => void;
}

export const SectionBContext = createContext<SectionBContextValue | null>(null);

export function useSectionB() {
  const context = useContext(SectionBContext);

  if (!context) {
    throw new Error("useSectionB must be used inside SectionBContext.Provider");
  }

  return context;
}
