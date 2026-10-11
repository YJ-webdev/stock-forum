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
  await tx.userActivity.create({
    data: input,
    select: {
      id: true,
    },
  });
}
