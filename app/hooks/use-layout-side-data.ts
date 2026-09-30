"use client";

import { useEffect, useState } from "react";

import {
  getLayoutSideData,
  type MostLikedComment,
  type PopularBoard,
} from "../actions/query";

import type { LeaderboardUser } from "../actions/leaderboard";

interface LayoutSideData {
  comments: MostLikedComment[];
  popularBoards: PopularBoard[];
  traders: LeaderboardUser[];
}

const initialData: LayoutSideData = {
  comments: [],
  popularBoards: [],
  traders: [],
};

export function useLayoutSideData() {
  const [data, setData] = useState<LayoutSideData>(initialData);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const result = await getLayoutSideData();

        if (cancelled) {
          return;
        }

        setData(result);
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load layout side data:", error);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  return {
    comments: data.comments,
    popularBoards: data.popularBoards,
    traders: data.traders,
    loading,
  };
}
