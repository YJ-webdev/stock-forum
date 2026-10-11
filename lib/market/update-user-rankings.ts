// lib/market/update-user-rankings.ts

import "server-only";

import { PredictionStatus, UserTier } from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";

// -----------------------------------------------------------------------------
// CONFIG
// -----------------------------------------------------------------------------

const RANKING_PERIOD_DAYS = 30;
const MIN_SETTLED_PREDICTIONS = 10;

const DAY_MS = 24 * 60 * 60 * 1000;

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

interface UserStats {
  netProfit: number;
  wonCount: number;
  lostCount: number;
}

interface RankedUser {
  userId: string;
  netProfit: number;
}

export interface RankingUpdateSummary {
  totalUsers: number;
  rankedUsers: number;
  unrankedUsers: number;
  periodStart: string;
  periodEnd: string;
}

// -----------------------------------------------------------------------------
// TIER
// -----------------------------------------------------------------------------

function getUserTier(rank: number, totalRankedUsers: number): UserTier {
  if (rank <= Math.ceil(totalRankedUsers * 0.01)) {
    return UserTier.DIAMOND;
  }

  if (rank <= Math.ceil(totalRankedUsers * 0.05)) {
    return UserTier.PLATINUM;
  }

  if (rank <= Math.ceil(totalRankedUsers * 0.1)) {
    return UserTier.GOLD;
  }

  if (rank <= Math.ceil(totalRankedUsers * 0.2)) {
    return UserTier.SILVER;
  }

  return UserTier.BRONZE;
}

// -----------------------------------------------------------------------------
// UPDATE USER RANKINGS
// -----------------------------------------------------------------------------

export async function updateUserRankings(): Promise<RankingUpdateSummary> {
  return prisma.$transaction(
    async (tx) => {
      // Prevent overlapping jobs from updating rankings simultaneously.
      // The lock is released automatically when the transaction ends.
      const [lock] = await tx.$queryRaw<{ locked: boolean }[]>`
        SELECT pg_try_advisory_xact_lock(482731, 1) AS locked
      `;

      if (!lock?.locked) {
        throw new Error("A ranking update is already running.");
      }

      const periodEnd = new Date();

      const periodStart = new Date(
        periodEnd.getTime() - RANKING_PERIOD_DAYS * DAY_MS,
      );

      // Include every account, regardless of role or isBot.
      const users = await tx.user.findMany({
        select: {
          id: true,
        },
      });

      const results = await tx.prediction.groupBy({
        by: ["userId", "status"],

        where: {
          status: {
            in: [PredictionStatus.WON, PredictionStatus.LOST],
          },

          settledAt: {
            gte: periodStart,
            lt: periodEnd,
          },
        },

        _sum: {
          pointsChange: true,
        },

        _count: {
          _all: true,
          pointsChange: true,
        },
      });

      const statsByUser = new Map<string, UserStats>();

      for (const result of results) {
        // Do not silently treat missing settlement profit as zero.
        if (result._count.pointsChange !== result._count._all) {
          throw new Error(
            `Missing pointsChange for settled predictions: ${result.userId}`,
          );
        }

        const stats = statsByUser.get(result.userId) ?? {
          netProfit: 0,
          wonCount: 0,
          lostCount: 0,
        };

        stats.netProfit += result._sum.pointsChange ?? 0;

        if (result.status === PredictionStatus.WON) {
          stats.wonCount += result._count._all;
        }

        if (result.status === PredictionStatus.LOST) {
          stats.lostCount += result._count._all;
        }

        statsByUser.set(result.userId, stats);
      }

      // -----------------------------------------------------------------------
      // ELIGIBLE USERS
      // -----------------------------------------------------------------------

      const eligibleUsers: RankedUser[] = [];

      for (const user of users) {
        const stats = statsByUser.get(user.id);

        if (!stats) {
          continue;
        }

        const settledCount = stats.wonCount + stats.lostCount;

        if (settledCount < MIN_SETTLED_PREDICTIONS) {
          continue;
        }

        eligibleUsers.push({
          userId: user.id,
          netProfit: stats.netProfit,
        });
      }

      eligibleUsers.sort((a, b) => b.netProfit - a.netProfit);

      // -----------------------------------------------------------------------
      // SHARED RANKS
      // Example: 1, 2, 2, 4
      // -----------------------------------------------------------------------

      const rankByUser = new Map<string, number>();

      let currentRank = 0;

      for (let index = 0; index < eligibleUsers.length; index += 1) {
        const current = eligibleUsers[index];

        if (
          index === 0 ||
          current.netProfit !== eligibleUsers[index - 1].netProfit
        ) {
          currentRank = index + 1;
        }

        rankByUser.set(current.userId, currentRank);
      }

      // -----------------------------------------------------------------------
      // SAVE ALL USERS
      // Also reset users who no longer meet the participation requirement.
      // -----------------------------------------------------------------------

      for (const user of users) {
        const stats = statsByUser.get(user.id) ?? {
          netProfit: 0,
          wonCount: 0,
          lostCount: 0,
        };

        const rank = rankByUser.get(user.id) ?? null;

        const data = {
          tier:
            rank === null
              ? UserTier.UNRANKED
              : getUserTier(rank, eligibleUsers.length),

          rank,

          netProfit: stats.netProfit,

          settledCount: stats.wonCount + stats.lostCount,
          wonCount: stats.wonCount,
          lostCount: stats.lostCount,

          periodStart,
          periodEnd,

          calculatedAt: periodEnd,
        };

        await tx.userRanking.upsert({
          where: {
            userId: user.id,
          },

          update: data,

          create: {
            userId: user.id,
            ...data,
          },
        });
      }

      return {
        totalUsers: users.length,
        rankedUsers: eligibleUsers.length,
        unrankedUsers: users.length - eligibleUsers.length,
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
      };
    },
    {
      maxWait: 10_000,
      timeout: 60_000,
    },
  );
}
