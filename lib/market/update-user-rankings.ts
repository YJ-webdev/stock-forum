import "server-only";

import {
  NotificationType,
  PredictionStatus,
  UserTier,
} from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";

// --------------------------------------------------------userId---------------------
// CONFIG
// -----------------------------------------------------------------------------

const RANKING_PERIOD_DAYS = 30;
const MIN_SETTLED_PREDICTIONS = 10;

const DAY_MS = 24 * 60 * 60 * 1000;

const TIER_NAMES: Record<UserTier, string> = {
  UNRANKED: "Unranked",
  BRONZE: "Bronze",
  SILVER: "Silver",
  GOLD: "Gold",
  PLATINUM: "Platinum",
  DIAMOND: "Diamond",
};

const TIER_ORDER: Record<UserTier, number> = {
  UNRANKED: 0,
  BRONZE: 1,
  SILVER: 2,
  GOLD: 3,
  PLATINUM: 4,
  DIAMOND: 5,
};

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
  tierChangedUsers: number;
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
      // Prevent overlapping ranking jobs.
      const [lock] = await tx.$queryRaw<{ locked: boolean }[]>`
        SELECT pg_try_advisory_xact_lock(482731, 1) AS locked
      `;

      if (!lock?.locked) {
        throw new Error("A ranking update is already running.");
      }

      // Coordinate ranking writes with account deletion and settlement.
      // Use a consistent lock order and a fixed set of users for this run.
      const lockedUsers = await tx.$queryRaw<{ id: string }[]>`
        SELECT "id"
        FROM "User"
        WHERE "deletedAt" IS NULL
        ORDER BY "id"
        FOR UPDATE
      `;

      const userIds = lockedUsers.map((user) => user.id);

      const periodEnd = new Date();

      const periodStart = new Date(
        periodEnd.getTime() - RANKING_PERIOD_DAYS * DAY_MS,
      );

      // Include non-deleted accounts regardless of role or isBot.
      // Read their previous tiers before updating rankings.
      const users = await tx.user.findMany({
        where: {
          id: {
            in: userIds,
          },
          deletedAt: null,
        },

        select: {
          id: true,
          ranking: {
            select: {
              tier: true,
            },
          },
        },

        orderBy: {
          id: "asc",
        },
      });

      const results = await tx.prediction.groupBy({
        by: ["userId", "status"],

        where: {
          userId: {
            in: userIds,
          },

          user: {
            deletedAt: null,
          },

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
        const userId = result.userId;

        if (userId === null) continue;

        // Missing settlement profit must not be treated as zero.
        if (result._count.pointsChange !== result._count._all) {
          throw new Error(
            `Missing pointsChange for settled predictions: ${userId}`,
          );
        }

        const stats = statsByUser.get(userId) ?? {
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

        statsByUser.set(userId, stats);
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
      // SAVE RANKINGS / CREATE TIER NOTIFICATIONS
      // -----------------------------------------------------------------------

      let tierChangedUsers = 0;

      for (const user of users) {
        const stats = statsByUser.get(user.id) ?? {
          netProfit: 0,
          wonCount: 0,
          lostCount: 0,
        };

        const rank = rankByUser.get(user.id) ?? null;

        const previousTier = user.ranking?.tier ?? UserTier.UNRANKED;

        const nextTier =
          rank === null
            ? UserTier.UNRANKED
            : getUserTier(rank, eligibleUsers.length);

        const data = {
          tier: nextTier,
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

        if (previousTier === nextTier) {
          continue;
        }

        const upgraded = TIER_ORDER[nextTier] > TIER_ORDER[previousTier];

        await tx.notification.create({
          data: {
            userId: user.id,

            type: upgraded
              ? NotificationType.TIER_UP
              : NotificationType.TIER_DOWN,

            tier: nextTier,

            title: upgraded ? "Tier upgraded" : "Tier downgraded",

            message: upgraded
              ? `Your tier has been upgraded to ${TIER_NAMES[nextTier]}.`
              : `Your tier has been downgraded to ${TIER_NAMES[nextTier]}.`,

            eventKey:
              `tier-change:${user.id}:${periodEnd.toISOString()}:` +
              `${previousTier}:${nextTier}`,
          },
        });

        tierChangedUsers += 1;
      }

      return {
        totalUsers: users.length,
        rankedUsers: eligibleUsers.length,
        unrankedUsers: users.length - eligibleUsers.length,
        tierChangedUsers,
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
