"use client";

import { createContext, useCallback, useContext, useState } from "react";

interface CommentRefreshContextValue {
  refreshKey: number;
  notifyCommentChanged: () => void;
}

const CommentRefreshContext = createContext<CommentRefreshContextValue | null>(
  null,
);

export function CommentRefreshProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [refreshKey, setRefreshKey] = useState(0);

  const notifyCommentChanged = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  return (
    <CommentRefreshContext.Provider
      value={{
        refreshKey,
        notifyCommentChanged,
      }}
    >
      {children}
    </CommentRefreshContext.Provider>
  );
}

export function useCommentRefresh() {
  const context = useContext(CommentRefreshContext);

  if (!context) {
    throw new Error(
      "useCommentRefresh must be used inside CommentRefreshProvider",
    );
  }

  return context;
}
