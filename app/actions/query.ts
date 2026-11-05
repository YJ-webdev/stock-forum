"use server";

import type { JSONContent } from "@tiptap/react";
import { prisma } from "@/lib/prisma";
import { ALL_MARKET_SYMBOLS } from "@/lib/data/market-symbols";
import { getLatestMarketCloseMs } from "@/lib/utils/get-latest-market-close";
import { getTopBetters } from "./leaderboard";

export interface PopularBoard {
  symbol: string;
  name: string;
  icon?: string;
  commentCount: number;
  newCommentCount: number;
}

export interface PanelLeftData {
  comments: MostLikedComment[];
  popularBoards: PopularBoard[];
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
  _count: { likes: number; replies: number };
}

function hasTextContent(content: JSONContent): boolean {
  if (content.type === "text") return Boolean(content.text?.trim());
  return content.content?.some(hasTextContent) ?? false;
}

function isDeletedCommentContent(content: JSONContent): boolean {
  const text = content.content
    ?.flatMap((node) => node.content ?? [])
    .map((node) => node.text ?? "")
    .join("")
    .trim();

  return text === "Comment deleted by user";
}

const POPULAR_SYMBOLS = [
  "^IXIC",
  "^GSPC",
  "^NSEI",
  "^KS11",
  "^N225",
  "^FTSE",
  "^GDAXI",
  "^HSI",
  "^DJI",
];

export async function getPopularBoards(limit = 7): Promise<PopularBoard[]> {
  if (limit <= 0) return [];

  const assets = await prisma.marketAsset.findMany({
    where: { symbol: { in: POPULAR_SYMBOLS } },
    select: {
      symbol: true,
      name: true,
      _count: { select: { comments: true } },
    },
  });

  const popularAssets = assets
    .sort(
      (a, b) =>
        b._count.comments - a._count.comments ||
        POPULAR_SYMBOLS.indexOf(a.symbol) - POPULAR_SYMBOLS.indexOf(b.symbol),
    )
    .slice(0, limit);

  if (!popularAssets.length) return [];

  const nowMs = Date.now();
  const fallbackMs = nowMs - 24 * 60 * 60 * 1000;
  const symbols = popularAssets.map(({ symbol }) => symbol);
  const startBySymbol = new Map(
    symbols.map((symbol) => [
      symbol,
      getLatestMarketCloseMs(symbol, nowMs) ?? fallbackMs,
    ]),
  );

  const earliestStart = Math.min(...startBySymbol.values());
  const visibleCommentWhere = {
    hasContent: true,
    visibility: "PUBLIC" as const,
    withdrawnAt: null,
    moderatedAt: null,
    author: { status: "ACTIVE" as const },
    assets: { some: { asset: { symbol: { in: symbols } } } },
  };

  const [recentComments, recentReplies] = await Promise.all([
    prisma.comment.findMany({
      where: {
        ...visibleCommentWhere,
        createdAt: { gte: new Date(earliestStart) },
      },
      select: {
        createdAt: true,
        assets: {
          where: { asset: { symbol: { in: symbols } } },
          select: { asset: { select: { symbol: true } } },
        },
      },
    }),
    prisma.reply.findMany({
      where: {
        createdAt: { gte: new Date(earliestStart) },
        withdrawnAt: null,
        moderatedAt: null,
        visibility: "PUBLIC",
        author: { status: "ACTIVE" },
        comment: visibleCommentWhere,
      },
      select: {
        createdAt: true,
        comment: {
          select: {
            assets: {
              where: { asset: { symbol: { in: symbols } } },
              select: { asset: { select: { symbol: true } } },
            },
          },
        },
      },
    }),
  ]);

  const newCounts = new Map<string, number>();
  for (const comment of recentComments) {
    const createdMs = comment.createdAt.getTime();
    for (const { asset } of comment.assets) {
      const startMs = startBySymbol.get(asset.symbol);
      if (startMs === undefined || createdMs < startMs) continue;
      newCounts.set(asset.symbol, (newCounts.get(asset.symbol) ?? 0) + 1);
    }
  }

  for (const reply of recentReplies) {
    const createdMs = reply.createdAt.getTime();
    for (const { asset } of reply.comment.assets) {
      const startMs = startBySymbol.get(asset.symbol);
      if (startMs === undefined || createdMs < startMs) continue;
      newCounts.set(asset.symbol, (newCounts.get(asset.symbol) ?? 0) + 1);
    }
  }

  const iconBySymbol = new Map(
    ALL_MARKET_SYMBOLS.map((market) => [market.symbol, market.icon]),
  );

  return popularAssets.map((asset) => ({
    symbol: asset.symbol,
    name: asset.name,
    icon: iconBySymbol.get(asset.symbol),
    commentCount: asset._count.comments,
    newCommentCount: newCounts.get(asset.symbol) ?? 0,
  }));
}

export async function getMostLikedComments(
  limit = 5,
): Promise<MostLikedComment[]> {
  if (limit <= 0) return [];

  const comments = await prisma.comment.findMany({
    where: {
      hasContent: true,
      visibility: "PUBLIC",
      withdrawnAt: null,
      moderatedAt: null,
      createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      author: { status: "ACTIVE" },
    },
    select: {
      id: true,
      content: true,
      createdAt: true,
      updatedAt: true,
      author: {
        select: { id: true, name: true, image: true, nationality: true },
      },
      assets: {
        select: {
          asset: {
            select: { name: true, symbol: true, displaySymbol: true },
          },
        },
      },
      _count: { select: { likes: true, replies: true } },
    },
    orderBy: [{ likes: { _count: "desc" } }, { createdAt: "desc" }],
    take: Math.max(limit * 3, limit),
  });

  const result: MostLikedComment[] = [];
  for (const comment of comments) {
    const content = comment.content as JSONContent;
    if (!hasTextContent(content) || isDeletedCommentContent(content)) continue;
    result.push({ ...comment, content });
    if (result.length >= limit) break;
  }
  return result;
}

export async function getPanelLeftData(
  commentLimit = 3,
  boardLimit = 7,
): Promise<PanelLeftData> {
  const [comments, popularBoards] = await Promise.all([
    getMostLikedComments(commentLimit),
    getPopularBoards(boardLimit),
  ]);
  return { comments, popularBoards };
}

export async function getLayoutSideData() {
  const [comments, popularBoards, traders] = await Promise.all([
    getMostLikedComments(5),
    getPopularBoards(7),
    getTopBetters(10),
  ]);
  return { comments, popularBoards, traders };
}

export type LayoutSideData = Awaited<ReturnType<typeof getLayoutSideData>>;

export async function checkCommentExists(commentId: string) {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { id: true },
  });
  return Boolean(comment);
}
