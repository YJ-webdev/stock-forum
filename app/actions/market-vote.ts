"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PredictionDirection } from "@/generated/prisma/client";

export type VoteDirection = PredictionDirection;

interface GetMarketVoteInput {
  symbol: string;
  sessionDate: Date;
}

interface SubmitMarketVoteInput {
  symbol: string;
  nationality: string;
  direction: VoteDirection;
  pointsBet: number;
  referenceClose: number;
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
      nationality: nationality,
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

  return prediction;
}
