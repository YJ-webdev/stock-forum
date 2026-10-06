"use server";

import { prisma } from "@/lib/prisma";
import { getVotingWindow } from "@/lib/utils/get-voting-window";
import type { JSONContent } from "@tiptap/react";

import { getTopBetters } from "./leaderboard";
import { ALL_MARKET_SYMBOLS } from "@/lib/data/market-symbols";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface PopularBoard {
  symbol: string;
  name: string;
  icon?: string;
  commentCount: number;
  newCommentCount: number;
}

export interface MostLikedComment {
  id: string;
  content: JSONContent;

  createdAt: Date;
  updatedAt: Date;

  author: {
    id: string;
    name: string | null;
    image: string | null;
    nationality: string | null;
  };

  assets: {
    asset: {
      name: string;
      symbol: string;
      displaySymbol: string | null;
    };
  }[];

  _count: {
    likes: number;
    replies: number;
  };
}

export interface PanelLeftData {
  comments: MostLikedComment[];
  popularBoards: PopularBoard[];
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function hasTextContent(content: JSONContent): boolean {
  if (content.type === "text") {
    return Boolean(content.text?.trim());
  }

  if (!content.content) {
    return false;
  }

  return content.content.some(hasTextContent);
}

function isDeletedCommentContent(content: JSONContent): boolean {
  const text =
    content.content
      ?.flatMap((node) => node.content ?? [])
      .map((node) => node.text ?? "")
      .join("")
      .trim() ?? "";

  return text === "Comment deleted by user";
}

// -----------------------------------------------------------------------------
// Popular boards
// -----------------------------------------------------------------------------

export async function getPopularBoards(limit = 7): Promise<PopularBoard[]> {
  const allowedSymbols = [
    "^IXIC", // Nasdaq Composite
    "^GSPC", // S&P 500
    "^NSEI", // Nifty 50
    "^KS11", // KOSPI
    "^N225", // Nikkei 225
    "^FTSE", // FTSE 100
    "^GDAXI", // DAX
    "^HSI", // Hang Seng Index
    "^DJI",
  ];

  const assets = await prisma.marketAsset.findMany({
    where: {
      symbol: {
        in: allowedSymbols,
      },
    },

    select: {
      symbol: true,
      name: true,

      _count: {
        select: {
          comments: true,
        },
      },
    },
  });

  const popularAssets = assets
    .sort(
      (a, b) =>
        b._count.comments - a._count.comments ||
        allowedSymbols.indexOf(a.symbol) - allowedSymbols.indexOf(b.symbol),
    )
    .slice(0, limit);

  if (popularAssets.length === 0) {
    return [];
  }

  const nowMs = Date.now();
  const last24HoursMs = nowMs - 24 * 60 * 60 * 1000;

  const newCommentStartBySymbol = new Map<string, number>();

  for (const asset of popularAssets) {
    const { currentSessionStartMs } = getVotingWindow(asset.symbol, nowMs);

    newCommentStartBySymbol.set(
      asset.symbol,
      currentSessionStartMs ?? last24HoursMs,
    );
  }

  const earliestStart = Math.min(...newCommentStartBySymbol.values());
  const symbols = popularAssets.map((asset) => asset.symbol);

  const recentComments = await prisma.comment.findMany({
    where: {
      withdrawnAt: null,
      moderatedAt: null,

      createdAt: {
        gte: new Date(earliestStart),
      },

      assets: {
        some: {
          asset: {
            symbol: {
              in: symbols,
            },
          },
        },
      },
    },

    select: {
      createdAt: true,

      assets: {
        where: {
          asset: {
            symbol: {
              in: symbols,
            },
          },
        },

        select: {
          asset: {
            select: {
              symbol: true,
            },
          },
        },
      },
    },
  });

  const newCommentCounts = new Map<string, number>();

  for (const comment of recentComments) {
    const createdAtMs = comment.createdAt.getTime();

    for (const { asset } of comment.assets) {
      const newCommentStart = newCommentStartBySymbol.get(asset.symbol);

      if (newCommentStart !== undefined && createdAtMs >= newCommentStart) {
        newCommentCounts.set(
          asset.symbol,
          (newCommentCounts.get(asset.symbol) ?? 0) + 1,
        );
      }
    }
  }

  return popularAssets.map((asset) => {
    const metadata = ALL_MARKET_SYMBOLS.find(
      (market) => market.symbol === asset.symbol,
    );

    return {
      symbol: asset.symbol,
      name: asset.name,
      icon: metadata?.icon,
      commentCount: asset._count.comments,
      newCommentCount: newCommentCounts.get(asset.symbol) ?? 0,
    };
  });
}

// -----------------------------------------------------------------------------
// Most liked comments
// -----------------------------------------------------------------------------

export async function getMostLikedComments(
  limit = 5,
): Promise<MostLikedComment[]> {
  if (limit <= 0) {
    return [];
  }

  const comments = await prisma.comment.findMany({
    where: {
      withdrawnAt: null,
      moderatedAt: null,

      author: {
        status: "ACTIVE",
      },
    },

    select: {
      id: true,
      content: true,

      createdAt: true,
      updatedAt: true,

      author: {
        select: {
          id: true,
          name: true,
          image: true,
          nationality: true,
        },
      },

      assets: {
        select: {
          asset: {
            select: {
              name: true,
              symbol: true,
              displaySymbol: true,
            },
          },
        },
      },

      _count: {
        select: {
          likes: true,
          replies: true,
        },
      },
    },

    orderBy: [
      {
        likes: {
          _count: "desc",
        },
      },
      {
        createdAt: "desc",
      },
    ],

    // We still need extras because TipTap JSON
    // content is filtered in JS below.
    take: Math.max(limit * 3, limit),
  });

  const result: MostLikedComment[] = [];

  for (const comment of comments) {
    const content = comment.content as JSONContent;

    if (!hasTextContent(content) || isDeletedCommentContent(content)) {
      continue;
    }

    result.push({
      ...comment,
      content,
    });

    // Stop immediately once we have enough.
    if (result.length === limit) {
      break;
    }
  }

  return result;
}

// -----------------------------------------------------------------------------
// LEFT PANEL
//
// Important:
// The client calls ONE server action instead of calling
// getPopularBoards() and getMostLikedComments() separately.
// Both database jobs also run concurrently.
// -----------------------------------------------------------------------------

export async function getPanelLeftData(
  commentLimit = 3,
  boardLimit = 7,
): Promise<PanelLeftData> {
  console.time("PANEL_LEFT_TOTAL");

  console.time("MOST_LIKED");
  const commentsPromise = getMostLikedComments(commentLimit).finally(() => {
    console.timeEnd("MOST_LIKED");
  });

  console.time("POPULAR_BOARDS");
  const boardsPromise = getPopularBoards(boardLimit).finally(() => {
    console.timeEnd("POPULAR_BOARDS");
  });

  const [comments, popularBoards] = await Promise.all([
    commentsPromise,
    boardsPromise,
  ]);

  console.timeEnd("PANEL_LEFT_TOTAL");

  return {
    comments,
    popularBoards,
  };
}

export async function getLayoutSideData() {
  const [comments, popularBoards, traders] = await Promise.all([
    getMostLikedComments(3),
    getPopularBoards(7),
    getTopBetters(10),
  ]);

  return {
    comments,
    popularBoards,
    traders,
  };
}

export type LayoutSideData = Awaited<ReturnType<typeof getLayoutSideData>>;

export async function checkCommentExists(commentId: string) {
  const comment = await prisma.comment.findUnique({
    where: {
      id: commentId,
    },
    select: {
      id: true,
    },
  });

  return Boolean(comment);
}
