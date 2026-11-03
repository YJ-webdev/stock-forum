import "server-only";

import { randomUUID } from "node:crypto";

import {
  NotificationType,
  PredictionStatus,
  Prisma,
  UserTier,
} from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";

// -----------------------------------------------------------------------------
// CONFIG
// -----------------------------------------------------------------------------

const RANKING_PERIOD_DAYS = 30;
const MIN_SETTLED_PREDICTIONS = 10;

const DAY_MS = 24 * 60 * 60 * 1000;
const WRITE_BATCH_SIZE = 250;

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

interface RankingRow {
  userId: string;
  tier: UserTier;
  rank: number | null;
  netProfit: number;
  settledCount: number;
  wonCount: number;
  lostCount: number;
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
// HELPERS
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

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];

  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }

  return chunks;
}

// -----------------------------------------------------------------------------
// UPDATE USER RANKINGS
// -----------------------------------------------------------------------------

export async function updateUserRankings(): Promise<RankingUpdateSummary> {
  return prisma.$transaction(
    async (tx) => {
      // Only one ranking job may run at a time.
      const [lock] = await tx.$queryRaw<{ locked: boolean }[]>`
        SELECT pg_try_advisory_xact_lock(482731, 1)
          AS locked
      `;

      if (!lock?.locked) {
        throw new Error("A ranking update is already running.");
      }

      const periodEnd = new Date();

      const periodStart = new Date(
        periodEnd.getTime() - RANKING_PERIOD_DAYS * DAY_MS,
      );

      // No full-table FOR UPDATE lock.
      const users = await tx.user.findMany({
        where: {
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

      // Aggregate directly in PostgreSQL.
      // No large userId IN (...) array.
      const results = await tx.prediction.groupBy({
        by: ["userId", "status"],
        where: {
          userId: {
            not: null,
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

        if (!stats) continue;

        const settledCount = stats.wonCount + stats.lostCount;

        if (settledCount < MIN_SETTLED_PREDICTIONS) {
          continue;
        }

        eligibleUsers.push({
          userId: user.id,
          netProfit: stats.netProfit,
        });
      }

      eligibleUsers.sort(
        (a, b) => b.netProfit - a.netProfit || a.userId.localeCompare(b.userId),
      );

      // -----------------------------------------------------------------------
      // SHARED RANKS
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
      // BUILD RANKING ROWS
      // -----------------------------------------------------------------------

      const rankingRows: RankingRow[] = [];

      const notifications: Prisma.NotificationCreateManyInput[] = [];

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

        rankingRows.push({
          userId: user.id,
          tier: nextTier,
          rank,
          netProfit: stats.netProfit,
          settledCount: stats.wonCount + stats.lostCount,
          wonCount: stats.wonCount,
          lostCount: stats.lostCount,
        });

        if (previousTier === nextTier) {
          continue;
        }

        const upgraded = TIER_ORDER[nextTier] > TIER_ORDER[previousTier];

        notifications.push({
          id: randomUUID(),
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
        });
      }

      // -----------------------------------------------------------------------
      // INSERT MISSING RANKINGS
      // -----------------------------------------------------------------------

      // New users get a ranking row before the bulk update.
      // Existing users are skipped.
      for (const batch of chunkArray(rankingRows, WRITE_BATCH_SIZE)) {
        await tx.userRanking.createMany({
          data: batch.map((row) => ({
            id: randomUUID(),
            userId: row.userId,
            tier: row.tier,
            rank: row.rank,
            netProfit: row.netProfit,
            settledCount: row.settledCount,
            wonCount: row.wonCount,
            lostCount: row.lostCount,
            periodStart,
            periodEnd,
            calculatedAt: periodEnd,
          })),
          skipDuplicates: true,
        });
      }

      // -----------------------------------------------------------------------
      // BULK UPDATE
      // -----------------------------------------------------------------------

      for (const batch of chunkArray(rankingRows, WRITE_BATCH_SIZE)) {
        const values = Prisma.join(
          batch.map(
            (row) =>
              Prisma.sql`(
              ${row.userId},
              ${row.tier},
              ${row.rank},
              ${row.netProfit},
              ${row.settledCount},
              ${row.wonCount},
              ${row.lostCount}
            )`,
          ),
        );

        await tx.$executeRaw`
          UPDATE "UserRanking" AS ranking
          SET
            "tier" = data.tier::"UserTier",
            "rank" = data.rank,
            "netProfit" = data.net_profit,
            "settledCount" = data.settled_count,
            "wonCount" = data.won_count,
            "lostCount" = data.lost_count,
            "periodStart" = ${periodStart},
            "periodEnd" = ${periodEnd},
            "calculatedAt" = ${periodEnd},
            "updatedAt" = NOW()
          FROM (
            VALUES ${values}
          ) AS data(
            user_id,
            tier,
            rank,
            net_profit,
            settled_count,
            won_count,
            lost_count
          )
          WHERE ranking."userId" = data.user_id
        `;
      }

      // -----------------------------------------------------------------------
      // TIER NOTIFICATIONS
      // -----------------------------------------------------------------------

      for (const batch of chunkArray(notifications, WRITE_BATCH_SIZE)) {
        await tx.notification.createMany({
          data: batch,
          skipDuplicates: true,
        });
      }

      return {
        totalUsers: users.length,
        rankedUsers: eligibleUsers.length,
        unrankedUsers: users.length - eligibleUsers.length,
        tierChangedUsers: notifications.length,
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
      };
    },
    {
      maxWait: 10_000,
      timeout: 120_000,
    },
  );
}
