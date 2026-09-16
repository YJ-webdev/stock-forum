"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export type VoteDirection = "BULL" | "BEAR";

interface SubmitMarketVoteInput {
  symbol: string;
  nationality: string;
  predictionFor: Date;
  direction: VoteDirection;
}

interface GetMarketVoteInput {
  symbol: string;
  predictionFor: Date;
}

/**
 * Get the logged-in user's vote for this asset/session.
 */
export async function getMarketVote({
  symbol,
  predictionFor,
}: GetMarketVoteInput): Promise<VoteDirection | null> {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  const asset = await prisma.marketAsset.findUnique({
    where: {
      symbol,
    },
    select: {
      id: true,
    },
  });

  if (!asset) {
    return null;
  }

  const vote = await prisma.marketVote.findUnique({
    where: {
      userId_assetId_predictionFor: {
        userId: session.user.id,
        assetId: asset.id,
        predictionFor,
      },
    },
    select: {
      direction: true,
    },
  });

  return vote?.direction ?? null;
}

/**
 * Create a new vote or change the existing vote.
 *
 * Voting is allowed only before the market opens.
 */
export async function submitMarketVote({
  symbol,
  nationality,
  predictionFor,
  direction,
}: SubmitMarketVoteInput) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("You must be logged in to vote.");
  }

  if (!symbol) {
    throw new Error("Market symbol is required.");
  }

  if (!nationality) {
    throw new Error("Nationality is required.");
  }

  if (direction !== "BULL" && direction !== "BEAR") {
    throw new Error("Invalid vote direction.");
  }

  /*
   * predictionFor is the upcoming market-open timestamp.
   *
   * Once that timestamp has passed, the vote can no longer
   * be created or changed.
   */
  const now = new Date();

  if (now >= predictionFor) {
    throw new Error("Voting for this market is closed.");
  }

  const asset = await prisma.marketAsset.findUnique({
    where: {
      symbol,
    },
    select: {
      id: true,
    },
  });

  if (!asset) {
    throw new Error("Market asset not found.");
  }

  const vote = await prisma.marketVote.upsert({
    where: {
      userId_assetId_predictionFor: {
        userId: session.user.id,
        assetId: asset.id,
        predictionFor,
      },
    },

    update: {
      direction,
      nationality,
    },

    create: {
      userId: session.user.id,
      assetId: asset.id,
      nationality,
      direction,
      predictionFor,
    },

    select: {
      id: true,
      direction: true,
      predictionFor: true,
      updatedAt: true,
    },
  });

  return vote;
}
