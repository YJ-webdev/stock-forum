"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { getMyPointBalance } from "@/app/actions/points";
import { useCurrentUser } from "@/app/context/user-context";

type PointBalanceContextValue = {
  points: number;
  isLoading: boolean;

  setPoints: (points: number) => void;
  refreshPoints: () => Promise<void>;
};

const PointBalanceContext = createContext<PointBalanceContextValue | null>(
  null,
);

export function PointBalanceProvider({ children }: { children: ReactNode }) {
  const user = useCurrentUser();

  const [points, setPoints] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const refreshPoints = useCallback(async () => {
    if (!user) {
      setPoints(0);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const balance = await getMyPointBalance();

      setPoints(balance ?? 0);
    } catch (error) {
      console.error("Failed to load point balance:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void refreshPoints();
  }, [refreshPoints]);

  return (
    <PointBalanceContext.Provider
      value={{
        points,
        isLoading,
        setPoints,
        refreshPoints,
      }}
    >
      {children}
    </PointBalanceContext.Provider>
  );
}

export function usePointBalance() {
  const context = useContext(PointBalanceContext);

  if (!context) {
    throw new Error(
      "usePointBalance must be used inside PointBalanceProvider.",
    );
  }

  return context;
}
