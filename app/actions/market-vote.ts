"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getVotingWindow } from "@/lib/utils/get-voting-window";

export type VoteDirection = "BULL" | "BEAR";

interface SubmitMarketVoteInput {
  symbol: string;
  nationality: string;
  direction: VoteDirection;
}

interface GetMarketVoteInput {
  symbol: string;
}

/**
 * Get the logged-in user's vote for the CURRENT
 * prediction session of this asset.
 */
export async function getMarketVote({
  symbol,
}: GetMarketVoteInput): Promise<VoteDirection | null> {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  if (!symbol) {
    return null;
  }

  const votingWindow = getVotingWindow(symbol);

  const predictionFor = votingWindow.predictionFor;

  if (!predictionFor) {
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
 * Voting is allowed only while the market is closed.
 *
 * The server calculates the voting session itself.
 * The client cannot choose predictionFor.
 */
export async function submitMarketVote({
  symbol,
  nationality,
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

  // --------------------------------------------------
  // Calculate the CURRENT voting window on the server.
  // --------------------------------------------------

  const votingWindow = getVotingWindow(symbol);

  if (!votingWindow.predictionFor) {
    throw new Error("Prediction session is not available.");
  }

  if (!votingWindow.canVote) {
    throw new Error("Voting for this market is currently closed.");
  }

  const predictionFor = votingWindow.predictionFor;

  // --------------------------------------------------
  // Find asset
  // --------------------------------------------------

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

  // --------------------------------------------------
  // Create / update vote
  // --------------------------------------------------

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

export async function removeMarketVote({ symbol }: { symbol: string }) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("You must be logged in to vote.");
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

  await prisma.marketVote.deleteMany({
    where: {
      userId: session.user.id,
      assetId: asset.id,
    },
  });

  return { success: true };
}
