"use server";

import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PredictionDirection, type Prisma } from "@/generated/prisma/client";

import { ALL_MARKET_SYMBOLS } from "@/lib/data/market-symbols";
import { getVotingWindow } from "@/lib/utils/get-voting-window";
import { getReferenceClose } from "@/lib/utils/get-reference-close";

const GUEST_COOKIE_NAME = "bbv_guest_voter";
const GUEST_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export type VoteDirection = PredictionDirection;

export interface MarketVoteListStats {
  totalVotes: number;
  bullVotes: number;
  bearVotes: number;
  bullPercent: number;
  bearPercent: number;

  myPrediction: {
    direction: "BULL" | "BEAR";
    pointsBet: number;
  } | null;
}

export type MarketVoteListStatsMap = Record<string, MarketVoteListStats>;

export type MarketVoteStats = {
  totalVotes: number;
  bullVotes: number;
  bearVotes: number;
  bullPercent: number;
  bearPercent: number;

  nationalities: {
    nationality: string;
    votes: number;
    percent: number;
  }[];
};

interface GetMarketVoteInput {
  symbol: string;
  sessionDate: Date;
}

interface GetMarketVoteStatsInput {
  symbol: string;
  sessionDate: Date;
}

interface SubmitMarketVoteInput {
  symbol: string;
  direction: VoteDirection;
  pointsBet: number;
  sessionDate: Date;
}

type VoterIdentity =
  | { userId: string; guestId: null }
  | { userId: null; guestId: string };

function validateSessionDate(sessionDate: Date) {
  if (
    !(sessionDate instanceof Date) ||
    !Number.isFinite(sessionDate.getTime())
  ) {
    throw new Error("Invalid prediction session.");
  }
}

function normalizeNationality(value?: string | null) {
  const nationality = value?.trim().toUpperCase();

  return !nationality || nationality === "OTHERS" ? "OTHER" : nationality;
}

function validateVotingSession(symbol: string, sessionDate: Date) {
  const votingWindow = getVotingWindow(symbol, Date.now());

  if (!votingWindow.canVote || !votingWindow.predictionFor) {
    throw new Error("Voting is closed.");
  }

  const expectedSession = new Date(votingWindow.predictionFor);

  if (
    !Number.isFinite(expectedSession.getTime()) ||
    expectedSession.getTime() !== sessionDate.getTime()
  ) {
    throw new Error("Invalid prediction session.");
  }
}

function getPredictionUniqueWhere(
  identity: VoterIdentity,
  symbol: string,
  sessionDate: Date,
): Prisma.PredictionWhereUniqueInput {
  if (identity.userId !== null) {
    return {
      userId_symbol_sessionDate: {
        userId: identity.userId,
        symbol,
        sessionDate,
      },
    };
  }

  return {
    guestId_symbol_sessionDate: {
      guestId: identity.guestId,
      symbol,
      sessionDate,
    },
  };
}

async function getVoterIdentity(
  createGuestCookie = false,
): Promise<VoterIdentity | null> {
  const session = await auth();

  if (session?.user?.id) {
    return {
      userId: session.user.id,
      guestId: null,
    };
  }

  const cookieStore = await cookies();
  const storedGuestId = cookieStore.get(GUEST_COOKIE_NAME)?.value;

  const isValidGuestId =
    typeof storedGuestId === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      storedGuestId,
    );

  if (isValidGuestId) {
    return {
      userId: null,
      guestId: storedGuestId,
    };
  }

  if (!createGuestCookie) return null;

  const guestId = randomUUID();

  cookieStore.set(GUEST_COOKIE_NAME, guestId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: GUEST_COOKIE_MAX_AGE,
  });

  return {
    userId: null,
    guestId,
  };
}

export async function getMarketVoteListStats({
  markets,
}: {
  markets: {
    symbol: string;
    sessionDate: Date;
  }[];
}): Promise<MarketVoteListStatsMap> {
  if (markets.length === 0) return {};

  const sessionsBySymbol = new Map<string, number>();

  for (const market of markets) {
    validateSessionDate(market.sessionDate);

    const timestamp = market.sessionDate.getTime();
    const existing = sessionsBySymbol.get(market.symbol);

    if (existing !== undefined && existing !== timestamp) {
      throw new Error("Request only one session per market.");
    }

    sessionsBySymbol.set(market.symbol, timestamp);
  }

  const identity = await getVoterIdentity();

  const marketConditions = markets.map(({ symbol, sessionDate }) => ({
    symbol,
    sessionDate,
  }));

  const myVoterCondition: Prisma.PredictionWhereInput | null = identity
    ? identity.userId !== null
      ? { userId: identity.userId }
      : { guestId: identity.guestId, userId: null }
    : null;

  const [predictions, myPredictions] = await Promise.all([
    prisma.prediction.groupBy({
      by: ["symbol", "direction"],
      where: {
        OR: marketConditions,
      },
      _count: {
        _all: true,
      },
    }),

    myVoterCondition
      ? prisma.prediction.findMany({
          where: {
            ...myVoterCondition,
            OR: marketConditions,
          },
          select: {
            symbol: true,
            direction: true,
            pointsBet: true,
          },
        })
      : Promise.resolve([]),
  ]);

  const result: MarketVoteListStatsMap = {};

  for (const market of markets) {
    result[market.symbol] = {
      totalVotes: 0,
      bullVotes: 0,
      bearVotes: 0,
      bullPercent: 0,
      bearPercent: 0,
      myPrediction: null,
    };
  }

  for (const prediction of predictions) {
    const stats = result[prediction.symbol];

    if (!stats) continue;

    const count = prediction._count._all;

    if (prediction.direction === "BULL") {
      stats.bullVotes += count;
    } else if (prediction.direction === "BEAR") {
      stats.bearVotes += count;
    }

    stats.totalVotes += count;
  }

  for (const prediction of myPredictions) {
    const stats = result[prediction.symbol];

    if (!stats) continue;

    stats.myPrediction = {
      direction: prediction.direction,
      pointsBet: prediction.pointsBet,
    };
  }

  for (const stats of Object.values(result)) {
    if (stats.totalVotes === 0) continue;

    stats.bullPercent = Math.round((stats.bullVotes / stats.totalVotes) * 100);

    stats.bearPercent = 100 - stats.bullPercent;
  }

  return result;
}

export async function getMarketVote({
  symbol,
  sessionDate,
}: GetMarketVoteInput) {
  validateSessionDate(sessionDate);

  const identity = await getVoterIdentity();

  if (!identity) return null;

  return prisma.prediction.findUnique({
    where: getPredictionUniqueWhere(identity, symbol, sessionDate),
    select: {
      id: true,
      direction: true,
      pointsBet: true,
      status: true,
    },
  });
}

export async function getMarketVoteStats({
  symbol,
  sessionDate,
}: GetMarketVoteStatsInput): Promise<MarketVoteStats> {
  validateSessionDate(sessionDate);

  const groupedPredictions = await prisma.prediction.groupBy({
    by: ["direction", "nationality"],
    where: {
      symbol,
      sessionDate,
    },
    _count: {
      _all: true,
    },
  });

  let bullVotes = 0;
  let bearVotes = 0;

  const nationalityCounts = new Map<string, number>();

  for (const prediction of groupedPredictions) {
    const count = prediction._count._all;

    if (prediction.direction === "BULL") {
      bullVotes += count;
    } else if (prediction.direction === "BEAR") {
      bearVotes += count;
    }

    const nationality = normalizeNationality(prediction.nationality);

    nationalityCounts.set(
      nationality,
      (nationalityCounts.get(nationality) ?? 0) + count,
    );
  }

  const totalVotes = bullVotes + bearVotes;

  if (totalVotes === 0) {
    return {
      totalVotes: 0,
      bullVotes: 0,
      bearVotes: 0,
      bullPercent: 0,
      bearPercent: 0,
      nationalities: [],
    };
  }

  const bullPercent = Math.round((bullVotes / totalVotes) * 100);

  const sortedNationalities = [...nationalityCounts.entries()]
    .filter(([nationality]) => nationality !== "OTHER")
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

  const topNationalities = sortedNationalities.slice(0, 3);

  const otherVotes =
    (nationalityCounts.get("OTHER") ?? 0) +
    sortedNationalities.slice(3).reduce((total, [, votes]) => total + votes, 0);

  const nationalities = topNationalities.map(([nationality, votes]) => ({
    nationality,
    votes,
    percent: Math.round((votes / totalVotes) * 100),
  }));

  if (otherVotes > 0) {
    nationalities.push({
      nationality: "OTHER",
      votes: otherVotes,
      percent: Math.round((otherVotes / totalVotes) * 100),
    });
  }

  return {
    totalVotes,
    bullVotes,
    bearVotes,
    bullPercent,
    bearPercent: 100 - bullPercent,
    nationalities,
  };
}

export async function submitMarketVote({
  symbol,
  direction,
  pointsBet,
  sessionDate,
}: SubmitMarketVoteInput) {
  if (
    direction !== PredictionDirection.BULL &&
    direction !== PredictionDirection.BEAR
  ) {
    throw new Error("Invalid prediction direction.");
  }

  validateSessionDate(sessionDate);

  const market = ALL_MARKET_SYMBOLS.find((item) => item.symbol === symbol);

  if (!market || market.assetType !== "index") {
    throw new Error("Voting is only available for indices.");
  }

  validateVotingSession(symbol, sessionDate);

  const identity = await getVoterIdentity(true);

  if (!identity) {
    throw new Error("Unable to identify voter.");
  }

  const effectivePointsBet = identity.userId !== null ? pointsBet : 0;

  if (
    !Number.isInteger(effectivePointsBet) ||
    effectivePointsBet < 0 ||
    effectivePointsBet > 500 ||
    effectivePointsBet % 50 !== 0
  ) {
    throw new Error("Bet amount must be 0–500 in increments of 50.");
  }

  const uniqueWhere = getPredictionUniqueWhere(identity, symbol, sessionDate);

  const existingPrediction = await prisma.prediction.findUnique({
    where: uniqueWhere,
    select: {
      id: true,
    },
  });

  if (existingPrediction) {
    throw new Error("You have already voted for this market session.");
  }

  const referenceClose = await getReferenceClose(symbol, sessionDate);

  if (
    typeof referenceClose !== "number" ||
    !Number.isFinite(referenceClose) ||
    referenceClose <= 0
  ) {
    throw new Error("Previous close is unavailable.");
  }

  await prisma.marketAsset.upsert({
    where: {
      symbol: market.symbol,
    },
    update: {
      name: market.name,
      displaySymbol: market.displaySymbol,
      category: market.region,
      assetType: market.assetType,
      timezone: market.timezone ?? "UTC",
    },
    create: {
      symbol: market.symbol,
      name: market.name,
      displaySymbol: market.displaySymbol,
      category: market.region,
      assetType: market.assetType,
      timezone: market.timezone ?? "UTC",
    },
  });

  try {
    const result = await prisma.$transaction(async (tx) => {
      const memberId = identity.userId;
      let nationality = "OTHER";

      if (memberId !== null) {
        await tx.$queryRaw`
          SELECT "id"
          FROM "User"
          WHERE "id" = ${memberId}
          FOR UPDATE
        `;

        const member = await tx.user.findUnique({
          where: {
            id: memberId,
          },
          select: {
            deletedAt: true,
            nationality: true,
          },
        });

        if (!member || member.deletedAt) {
          throw new Error("Account unavailable.");
        }

        nationality = normalizeNationality(member.nationality);
      }

      validateVotingSession(symbol, sessionDate);

      const prediction = await tx.prediction.create({
        data: {
          userId: identity.userId,
          guestId: identity.guestId,
          symbol: market.symbol,
          direction,
          pointsBet: effectivePointsBet,
          referenceClose,
          sessionDate,
          nationality,
        },
        select: {
          id: true,
          symbol: true,
          direction: true,
          pointsBet: true,
          referenceClose: true,
          sessionDate: true,
          status: true,
          nationality: true,
          createdAt: true,
        },
      });

      if (memberId !== null && effectivePointsBet > 0) {
        await tx.pointBalance.upsert({
          where: {
            userId: memberId,
          },
          update: {},
          create: {
            userId: memberId,
            points: 10000,
          },
        });

        const deducted = await tx.pointBalance.updateMany({
          where: {
            userId: memberId,
            points: {
              gte: effectivePointsBet,
            },
          },
          data: {
            points: {
              decrement: effectivePointsBet,
            },
          },
        });

        if (deducted.count !== 1) {
          throw new Error("You do not have enough points.");
        }

        await tx.pointTransaction.create({
          data: {
            userId: memberId,
            predictionId: prediction.id,
            type: "BET",
            amount: -effectivePointsBet,
          },
        });
      }

      if (memberId !== null) {
        await tx.userActivity.create({
          data: {
            userId: memberId,
            type: "PREDICTION_SUBMITTED",
            marketSymbol: prediction.symbol,
            predictionId: prediction.id,
            metadata: {
              direction: prediction.direction,
              pointsBet: prediction.pointsBet,
              sessionDate: prediction.sessionDate.toISOString(),
            },
          },
        });
      }

      const balance =
        memberId !== null
          ? await tx.pointBalance.findUnique({
              where: {
                userId: memberId,
              },
              select: {
                points: true,
              },
            })
          : null;

      return {
        ...prediction,
        referenceClose: Number(prediction.referenceClose),
        points: balance?.points ?? null,
      };
    });

    return result;
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      throw new Error("You have already voted for this market session.");
    }

    throw error;
  }
}

export async function updateMarketVote({
  symbol,
  direction,
  pointsBet,
  sessionDate,
}: SubmitMarketVoteInput) {
  if (
    direction !== PredictionDirection.BULL &&
    direction !== PredictionDirection.BEAR
  ) {
    throw new Error("Invalid prediction direction.");
  }

  validateSessionDate(sessionDate);

  const market = ALL_MARKET_SYMBOLS.find((item) => item.symbol === symbol);

  if (!market || market.assetType !== "index") {
    throw new Error("Voting is only available for indices.");
  }

  validateVotingSession(symbol, sessionDate);

  const identity = await getVoterIdentity();

  if (!identity) {
    throw new Error("No existing vote was found.");
  }

  const effectivePointsBet = identity.userId !== null ? pointsBet : 0;

  if (
    !Number.isInteger(effectivePointsBet) ||
    effectivePointsBet < 0 ||
    effectivePointsBet > 500 ||
    effectivePointsBet % 50 !== 0
  ) {
    throw new Error("Bet amount must be 0–500 in increments of 50.");
  }

  const uniqueWhere = getPredictionUniqueWhere(identity, symbol, sessionDate);

  return prisma.$transaction(async (tx) => {
    const memberId = identity.userId;

    if (memberId !== null) {
      await tx.$queryRaw`
        SELECT "id"
        FROM "User"
        WHERE "id" = ${memberId}
        FOR UPDATE
      `;

      const member = await tx.user.findUnique({
        where: {
          id: memberId,
        },
        select: {
          deletedAt: true,
        },
      });

      if (!member || member.deletedAt) {
        throw new Error("Account unavailable.");
      }
    }

    const existing = await tx.prediction.findUnique({
      where: uniqueWhere,
      select: {
        id: true,
      },
    });

    if (!existing) {
      throw new Error("No existing vote was found.");
    }

    await tx.$queryRaw`
      SELECT "id"
      FROM "Prediction"
      WHERE "id" = ${existing.id}
      FOR UPDATE
    `;

    const current = await tx.prediction.findUnique({
      where: uniqueWhere,
      select: {
        id: true,
        direction: true,
        pointsBet: true,
        status: true,
      },
    });

    if (!current || current.id !== existing.id) {
      throw new Error("No existing vote was found.");
    }

    if (current.status !== "PENDING") {
      throw new Error("Only pending predictions can be edited.");
    }

    validateVotingSession(symbol, sessionDate);

    const changed =
      current.direction !== direction ||
      current.pointsBet !== effectivePointsBet;

    const additionalBet = effectivePointsBet - current.pointsBet;

    if (memberId !== null && additionalBet !== 0) {
      await tx.pointBalance.upsert({
        where: {
          userId: memberId,
        },
        update: {},
        create: {
          userId: memberId,
          points: 10000,
        },
      });

      if (additionalBet > 0) {
        const deducted = await tx.pointBalance.updateMany({
          where: {
            userId: memberId,
            points: {
              gte: additionalBet,
            },
          },
          data: {
            points: {
              decrement: additionalBet,
            },
          },
        });

        if (deducted.count !== 1) {
          throw new Error("You do not have enough points.");
        }
      } else {
        await tx.pointBalance.update({
          where: {
            userId: memberId,
          },
          data: {
            points: {
              increment: -additionalBet,
            },
          },
        });
      }

      await tx.pointTransaction.upsert({
        where: {
          predictionId_type: {
            predictionId: current.id,
            type: "BET",
          },
        },
        update: {
          amount: -effectivePointsBet,
        },
        create: {
          userId: memberId,
          predictionId: current.id,
          type: "BET",
          amount: -effectivePointsBet,
        },
      });
    }

    validateVotingSession(symbol, sessionDate);

    const prediction = await tx.prediction.update({
      where: {
        id: current.id,
      },
      data: changed
        ? {
            direction,
            pointsBet: effectivePointsBet,
          }
        : {},
      select: {
        id: true,
        symbol: true,
        direction: true,
        pointsBet: true,
        referenceClose: true,
        sessionDate: true,
        status: true,
        nationality: true,
        createdAt: true,
      },
    });

    if (memberId !== null && changed) {
      const metadata = {
        direction: prediction.direction,
        pointsBet: prediction.pointsBet,
        sessionDate: prediction.sessionDate.toISOString(),
        lastEditedAt: new Date().toISOString(),
      };

      const activity = await tx.userActivity.findFirst({
        where: {
          userId: memberId,
          predictionId: prediction.id,
          type: "PREDICTION_SUBMITTED",
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        select: {
          id: true,
        },
      });

      if (activity) {
        await tx.userActivity.update({
          where: {
            id: activity.id,
          },
          data: {
            metadata,
          },
        });
      } else {
        const linkedComment = await tx.comment.findUnique({
          where: {
            predictionId: prediction.id,
          },
          select: {
            id: true,
          },
        });

        await tx.userActivity.create({
          data: {
            userId: memberId,
            type: "PREDICTION_SUBMITTED",
            marketSymbol: prediction.symbol,
            predictionId: prediction.id,
            commentId: linkedComment?.id ?? null,
            metadata,
            createdAt: prediction.createdAt,
          },
        });
      }
    }

    const balance =
      memberId !== null
        ? await tx.pointBalance.findUnique({
            where: {
              userId: memberId,
            },
            select: {
              points: true,
            },
          })
        : null;

    return {
      ...prediction,
      referenceClose: Number(prediction.referenceClose),
      points: balance?.points ?? null,
      changed,
    };
  });
}
