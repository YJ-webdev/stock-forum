"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PredictionDirection } from "@/generated/prisma/client";

export type MarketVoteListStats = {
  totalVotes: number;
  bullVotes: number;
  bearVotes: number;
  bullPercent: number;
  bearPercent: number;
};

export type MarketVoteListStatsMap = Record<string, MarketVoteListStats>;

export async function getMarketVoteListStats({
  markets,
}: {
  markets: {
    symbol: string;
    sessionDate: Date;
  }[];
}): Promise<MarketVoteListStatsMap> {
  if (markets.length === 0) {
    return {};
  }

  const predictions = await prisma.prediction.groupBy({
    by: ["symbol", "direction"],

    where: {
      OR: markets.map((market) => ({
        symbol: market.symbol,
        sessionDate: market.sessionDate,
      })),
    },

    _count: {
      _all: true,
    },
  });

  const result: MarketVoteListStatsMap = {};

  /*
   * Initialize every requested market.
   *
   * This means markets with zero predictions still get
   * a result instead of being missing from the object.
   */
  for (const market of markets) {
    result[market.symbol] = {
      totalVotes: 0,
      bullVotes: 0,
      bearVotes: 0,
      bullPercent: 0,
      bearPercent: 0,
    };
  }

  for (const prediction of predictions) {
    const stats = result[prediction.symbol];

    if (!stats) {
      continue;
    }

    const count = prediction._count._all;

    if (prediction.direction === "BULL") {
      stats.bullVotes = count;
    }

    if (prediction.direction === "BEAR") {
      stats.bearVotes = count;
    }

    stats.totalVotes += count;
  }

  /*
   * Calculate percentages after all groups have
   * been accumulated.
   */
  for (const stats of Object.values(result)) {
    if (stats.totalVotes === 0) {
      continue;
    }

    stats.bullPercent = Math.round((stats.bullVotes / stats.totalVotes) * 100);

    stats.bearPercent = 100 - stats.bullPercent;
  }

  return result;
}

export type VoteDirection = PredictionDirection;

interface GetMarketVoteInput {
  symbol: string;
  sessionDate: Date;
}

// GET CURRENT USER'S VOTE
// -----------------------------------------------------------------------------

export async function getMarketVote({
  symbol,
  sessionDate,
}: GetMarketVoteInput): Promise<VoteDirection | null> {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  const prediction = await prisma.prediction.findUnique({
    where: {
      userId_symbol_sessionDate: {
        userId: session.user.id,
        symbol,
        sessionDate,
      },
    },
    select: {
      direction: true,
    },
  });

  return prediction?.direction ?? null;
}

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

interface GetMarketVoteStatsInput {
  symbol: string;
  sessionDate: Date;
}

export async function getMarketVoteStats({
  symbol,
  sessionDate,
}: GetMarketVoteStatsInput): Promise<MarketVoteStats> {
  const predictions = await prisma.prediction.findMany({
    where: {
      symbol,
      sessionDate,
    },
    select: {
      direction: true,
      nationality: true,
    },
  });

  const totalVotes = predictions.length;

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

  // ---------------------------------------------------------------------------
  // BULL / BEAR
  // ---------------------------------------------------------------------------

  let bullVotes = 0;
  let bearVotes = 0;

  for (const prediction of predictions) {
    if (prediction.direction === "BULL") {
      bullVotes++;
    } else if (prediction.direction === "BEAR") {
      bearVotes++;
    }
  }

  const bullPercent = Math.round((bullVotes / totalVotes) * 100);
  const bearPercent = 100 - bullPercent;

  // ---------------------------------------------------------------------------
  // NATIONALITIES
  // ---------------------------------------------------------------------------

  const nationalityCounts = new Map<string, number>();

  for (const prediction of predictions) {
    const nationality = prediction.nationality?.trim().toUpperCase() || "OTHER";

    nationalityCounts.set(
      nationality,
      (nationalityCounts.get(nationality) ?? 0) + 1,
    );
  }

  const sortedNationalities = [...nationalityCounts.entries()]
    .filter(([nationality]) => nationality !== "OTHER")
    .sort((a, b) => b[1] - a[1]);

  // Show top 3 actual countries.
  const topNationalities = sortedNationalities.slice(0, 3);

  // Everything else + null nationalities becomes Other.
  const remainingNationalityVotes = sortedNationalities
    .slice(3)
    .reduce((total, [, votes]) => total + votes, 0);

  const nullNationalityVotes = nationalityCounts.get("OTHER") ?? 0;

  const otherVotes = remainingNationalityVotes + nullNationalityVotes;

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
    bearPercent,
    nationalities,
  };
}

interface SubmitMarketVoteInput {
  symbol: string;
  nationality: string;
  direction: VoteDirection;
  pointsBet: number;
  referenceClose: number;
  sessionDate: Date;
}

export async function submitMarketVote({
  symbol,
  nationality,
  direction,
  pointsBet,
  referenceClose,
  sessionDate,
}: SubmitMarketVoteInput) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("You must be logged in to vote.");
  }

  if (!nationality) {
    throw new Error("Please set your nationality before voting.");
  }

  if (!Number.isInteger(pointsBet)) {
    throw new Error("Points must be a whole number.");
  }

  if (pointsBet < 50 || pointsBet > 500) {
    throw new Error("Bet amount must be between 50 and 500 points.");
  }

  if (!Number.isFinite(referenceClose) || referenceClose <= 0) {
    throw new Error("Invalid prediction price.");
  }

  // Make sure this market actually exists.
  const asset = await prisma.marketAsset.findUnique({
    where: {
      symbol,
    },
    select: {
      symbol: true,
    },
  });

  if (!asset) {
    throw new Error("Market asset not found.");
  }

  // ---------------------------------------------------------------------------
  // IMPORTANT:
  // Do NOT use upsert here.
  //
  // One user gets ONE prediction for:
  // userId + symbol + sessionDate
  //
  // Your Prisma @@unique constraint also enforces this at DB level.
  // ---------------------------------------------------------------------------

  const existingPrediction = await prisma.prediction.findUnique({
    where: {
      userId_symbol_sessionDate: {
        userId: session.user.id,
        symbol,
        sessionDate,
      },
    },
    select: {
      id: true,
    },
  });

  if (existingPrediction) {
    throw new Error("You have already voted for this market session.");
  }

  const prediction = await prisma.prediction.create({
    data: {
      userId: session.user.id,
      symbol,
      direction,
      pointsBet,
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

  return {
    ...prediction,
    referenceClose: Number(prediction.referenceClose),
  };
}
