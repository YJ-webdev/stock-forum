// lib/activity/record-user-activity.ts

import "server-only";

import type { Prisma } from "@/generated/prisma/client";

type RecordUserActivityInput = Pick<
  Prisma.UserActivityUncheckedCreateInput,
  | "userId"
  | "type"
  | "targetUserId"
  | "marketSymbol"
  | "commentId"
  | "replyId"
  | "predictionId"
  | "metadata"
>;

export async function recordUserActivity(
  tx: Prisma.TransactionClient,
  input: RecordUserActivityInput,
) {
  const isFollowActivity =
    input.type === "USER_FOLLOWED" || input.type === "USER_UNFOLLOWED";

  if (isFollowActivity) {
    if (!input.targetUserId) {
      throw new Error("Follow activity requires a target user.");
    }

    await tx.userActivity.deleteMany({
      where: {
        userId: input.userId,
        targetUserId: input.targetUserId,
        type: {
          in: ["USER_FOLLOWED", "USER_UNFOLLOWED"],
        },
      },
    });
  }

  await tx.userActivity.create({
    data: input,
    select: {
      id: true,
    },
  });
}
