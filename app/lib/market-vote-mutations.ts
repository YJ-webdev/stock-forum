"use client";

import {
  submitMarketVote,
  updateMarketVote,
  type VoteDirection,
} from "@/app/actions/market-vote";
import { createComment, type MarketPageComments } from "@/app/actions/post";
import type { CommentImage } from "@/lib/types/comment-image";
import type { GifResult } from "@/app/components/gif-picker";
import { buildCommentContent } from "@/lib/utils/build-comment-content";

interface VoteMutationBase {
  symbol: string;
  direction: VoteDirection;
  sessionDate: Date;
  pointsBet: number;
}

interface CreateVoteOptions extends VoteMutationBase {
  viewerId: string | null;
  canWriteComment: boolean;
  comment: string;
  gif: GifResult | null;
  image: CommentImage | null;
}

export async function createMarketPrediction({
  symbol,
  direction,
  sessionDate,
  pointsBet,
  viewerId,
  canWriteComment,
  comment,
  gif,
  image,
}: CreateVoteOptions) {
  if (!viewerId) {
    const vote = await submitMarketVote({
      symbol,
      direction,
      pointsBet: 0,
      sessionDate,
    });
    return {
      direction: vote.direction,
      pointsBet: vote.pointsBet,
      status: vote.status,
      points: null,
      comment: null as MarketPageComments[number] | null,
    };
  }

  const text = canWriteComment ? comment.trim() : "";
  const selectedImage = canWriteComment ? image : null;
  const selectedGif = canWriteComment && !selectedImage ? gif : null;
  const content =
    text || selectedGif || selectedImage
      ? buildCommentContent(text, selectedGif, selectedImage)
      : null;

  const result = await createComment({
    content,
    assetSymbols: [symbol],
    prediction: { direction, pointsBet, sessionDate },
  });

  return {
    direction,
    pointsBet,
    status: "PENDING" as const,
    points: result.points,
    comment: result.comment ?? null,
  };
}

export async function editMarketPrediction({
  symbol,
  direction,
  sessionDate,
  pointsBet,
}: VoteMutationBase) {
  return updateMarketVote({ symbol, direction, pointsBet, sessionDate });
}
