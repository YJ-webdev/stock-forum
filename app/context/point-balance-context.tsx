"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { getMyPointBalance } from "@/app/actions/points";
import { useCurrentUser } from "@/app/context/user-context";

interface PointBalanceContextValue {
  points: number;
  isLoading: boolean;
  setPoints: (points: number) => void;
  refreshPoints: () => Promise<void>;
}

const PointBalanceContext = createContext<PointBalanceContextValue | null>(
  null,
);

export function PointBalanceProvider({ children }: { children: ReactNode }) {
  const user = useCurrentUser();
  const userId = user?.id ?? null;

  return (
    <PointBalanceProviderForUser key={userId ?? "guest"} userId={userId}>
      {children}
    </PointBalanceProviderForUser>
  );
}

function PointBalanceProviderForUser({
  userId,
  children,
}: {
  userId: string | null;
  children: ReactNode;
}) {
  const [points, setPointState] = useState(0);
  const [isLoading, setIsLoading] = useState(userId !== null);

  const requestVersionRef = useRef(0);
  const mountedRef = useRef(false);

  const setPoints = useCallback((nextPoints: number) => {
    // A completed vote or settlement takes precedence over an older fetch.
    requestVersionRef.current += 1;

    setPointState(nextPoints);
    setIsLoading(false);
  }, []);

  const refreshPoints = useCallback(async () => {
    if (!mountedRef.current) return;

    const requestVersion = ++requestVersionRef.current;

    if (!userId) {
      setPointState(0);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    function isCurrentRequest() {
      return mountedRef.current && requestVersionRef.current === requestVersion;
    }

    try {
      const balance = await getMyPointBalance();

      if (!isCurrentRequest()) return;

      setPointState(balance ?? 0);
    } catch (error) {
      if (!isCurrentRequest()) return;

      console.error("Failed to load point balance:", error);
    } finally {
      if (isCurrentRequest()) {
        setIsLoading(false);
      }
    }
  }, [userId]);

  useEffect(() => {
    mountedRef.current = true;

    void refreshPoints();

    return () => {
      mountedRef.current = false;
      requestVersionRef.current += 1;
    };
  }, [refreshPoints]);

  const value = useMemo<PointBalanceContextValue>(
    () => ({
      points,
      isLoading,
      setPoints,
      refreshPoints,
    }),
    [points, isLoading, setPoints, refreshPoints],
  );

  return (
    <PointBalanceContext.Provider value={value}>
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
