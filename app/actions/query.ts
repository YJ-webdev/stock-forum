"use server";

import { prisma } from "@/lib/prisma";
import { getVotingWindow } from "@/lib/utils/get-voting-window";

export interface PopularBoard {
  symbol: string;
  name: string;
  commentCount: number;
  newCommentCount: number;
}

export async function getPopularBoards(limit = 7) {
  const assets = await prisma.marketAsset.findMany({
    select: {
      symbol: true,
      name: true,

      // 전체 누적 comment 수
      _count: {
        select: {
          comments: true,
        },
      },
    },
  });

  // 전체 누적 comment가 많은 board 순
  const popularAssets = assets
    .sort((a, b) => b._count.comments - a._count.comments)
    .slice(0, limit);

  const nowMs = Date.now();

  const boards = await Promise.all(
    popularAssets.map(async (asset) => {
      const { currentSessionStartMs } = getVotingWindow(asset.symbol, nowMs);

      let newCommentCount = 0;

      // 현재 voting session에 작성된 comment만 계산
      if (currentSessionStartMs) {
        newCommentCount = await prisma.comment.count({
          where: {
            assets: {
              some: {
                asset: {
                  symbol: asset.symbol,
                },
              },
            },

            createdAt: {
              gte: new Date(currentSessionStartMs),
            },

            withdrawnAt: null,
            moderatedAt: null,
          },
        });
      }

      return {
        symbol: asset.symbol,
        name: asset.name,

        // Popular Boards 순위 기준
        commentCount: asset._count.comments,

        // UI의 "New X"
        newCommentCount,
      };
    }),
  );

  return boards;
}
