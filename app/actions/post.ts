"use server";

import { cookies } from "next/headers";
import type { JSONContent } from "@tiptap/react";
import type { Prisma } from "@/generated/prisma/client";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

import { ALL_MARKET_SYMBOLS } from "@/lib/data/market-symbols";
import { validateCommentImages } from "@/lib/utils/validate-comment-images";

import { resolveLanguage } from "@/lib/data/languages";
import { COMMENT_ACTION_LABELS } from "@/lib/data/translations";

import { hasEditorContent } from "@/lib/utils/tiptap-utils";

import { moderateContent } from "@/lib/moderation/moderate-content";
import { getContentText } from "@/lib/moderation/get-content-text";
import { getVotingWindow } from "@/lib/utils/get-voting-window";
import { recordUserActivity } from "@/lib/activity/record-user-activity";
import { getReferenceClose } from "@/lib/utils/get-reference-close";
import { getGifDimensions } from "@/lib/utils/gif-dimensions";

const MARKET_COMMENTS_PAGE_SIZE = 20;
const HOME_COMMENTS_PAGE_SIZE = 10;
const DELETED_COMMENT_TEXT = "Comment deleted by user";

const AUTHOR_SELECT = {
  id: true,
  name: true,
  image: true,
  nationality: true,
} satisfies Prisma.UserSelect;

const PREDICTION_SELECT = {
  id: true,
  symbol: true,
  direction: true,
  pointsBet: true,
  sessionDate: true,
  status: true,
} satisfies Prisma.PredictionSelect;

const REPLY_SELECT = {
  id: true,
  commentId: true,
  parentId: true,
  content: true,

  gifUrl: true,
  gifWidth: true,
  gifHeight: true,

  createdAt: true,
  updatedAt: true,
  editedAt: true,
  moderatedAt: true,

  author: {
    select: AUTHOR_SELECT,
  },

  _count: {
    select: {
      likes: true,
      replies: true,
    },
  },
} satisfies Prisma.ReplySelect;

function getVisibilityWhere(userId: string | null, isAdmin: boolean) {
  if (isAdmin) {
    return {};
  }

  if (userId) {
    return {
      OR: [
        { visibility: "PUBLIC" as const },
        {
          visibility: "PRIVATE" as const,
          authorId: userId,
        },
      ],
    };
  }

  return { visibility: "PUBLIC" as const };
}

function getCommentSelect(userId: string | null, isAdmin: boolean) {
  return {
    id: true,
    content: true,
    createdAt: true,
    updatedAt: true,
    editedAt: true,
    withdrawnAt: true,
    moderatedAt: true,

    author: {
      select: AUTHOR_SELECT,
    },

    prediction: {
      select: PREDICTION_SELECT,
    },

    likes: {
      where: userId ? { userId } : { userId: { in: [] as string[] } },
      select: { id: true },
    },

    _count: {
      select: {
        likes: true,
        replies: {
          where: getVisibilityWhere(userId, isAdmin),
        },
      },
    },
  } satisfies Prisma.CommentSelect;
}

async function getCommentById(commentId: string, userId: string | null = null) {
  const guestId = userId
    ? null
    : ((await cookies()).get("bbv_guest_voter")?.value ?? null);

  const likeWhere: Prisma.CommentLikeWhereInput = userId
    ? { userId }
    : guestId
      ? { guestId, userId: null }
      : { id: { in: [] } };

  const comment = await prisma.comment.findUnique({
    where: {
      id: commentId,
    },
    select: {
      id: true,
      content: true,
      createdAt: true,
      updatedAt: true,
      editedAt: true,
      withdrawnAt: true,
      moderatedAt: true,

      author: {
        select: AUTHOR_SELECT,
      },

      prediction: {
        select: PREDICTION_SELECT,
      },

      likes: {
        where: likeWhere,
        select: {
          id: true,
        },
      },

      _count: {
        select: {
          likes: true,
          replies: true,
        },
      },
    },
  });

  if (!comment) return null;

  const { _count, likes, ...rest } = comment;

  return {
    ...rest,
    content: comment.content as JSONContent,
    likeCount: _count.likes,
    replyCount: _count.replies,
    likedByMe: likes.length > 0,
  };
}

type PredictionInput = {
  direction: "BULL" | "BEAR";
  pointsBet: number;
  sessionDate: Date;
};

type CreateCommentInput = {
  botUserId?: string;
  content?: JSONContent | null;
  assetSymbols: string[];
  prediction?: PredictionInput | null;
};

export async function createComment({
  content = null,
  assetSymbols,
  prediction = null,
  botUserId,
}: CreateCommentInput) {
  const session = await auth();

  const labels =
    COMMENT_ACTION_LABELS[resolveLanguage(session?.user?.language)];

  if (!session?.user?.id) {
    throw new Error(labels.login_required);
  }

  const sessionUserId = session.user.id;
  let userId = sessionUserId;

  if (
    !Array.isArray(assetSymbols) ||
    assetSymbols.length !== 1 ||
    typeof assetSymbols[0] !== "string" ||
    !assetSymbols[0].trim()
  ) {
    throw new Error("Select exactly one board.");
  }

  const symbol = assetSymbols[0].trim();

  const market = ALL_MARKET_SYMBOLS.find((item) => item.symbol === symbol);

  if (!market) {
    throw new Error(labels.invalid_board);
  }

  const hasContent = content !== null && hasEditorContent(content);

  if (!hasContent && !prediction) {
    throw new Error(labels.write_comment);
  }

  function validatePredictionSession() {
    if (!prediction) return;

    const votingWindow = getVotingWindow(market!.symbol, Date.now());

    if (
      votingWindow.isMarketOpen ||
      !votingWindow.canVote ||
      !votingWindow.predictionFor
    ) {
      throw new Error("Voting is closed.");
    }

    const expectedSession = votingWindow.predictionFor;

    if (
      !Number.isFinite(expectedSession.getTime()) ||
      prediction.sessionDate.getTime() !== expectedSession.getTime()
    ) {
      throw new Error(labels.invalid_prediction_session);
    }
  }

  if (prediction) {
    if (market.assetType !== "index") {
      throw new Error("Predictions are available for indices only.");
    }

    if (prediction.direction !== "BULL" && prediction.direction !== "BEAR") {
      throw new Error("Choose Bull or Bear.");
    }

    if (
      !Number.isInteger(prediction.pointsBet) ||
      prediction.pointsBet < 0 ||
      prediction.pointsBet > 500 ||
      prediction.pointsBet % 50 !== 0
    ) {
      throw new Error(labels.invalid_points);
    }

    if (
      !(prediction.sessionDate instanceof Date) ||
      !Number.isFinite(prediction.sessionDate.getTime())
    ) {
      throw new Error(labels.invalid_prediction_session);
    }

    validatePredictionSession();
  }

  if (botUserId !== undefined) {
    const admin = await prisma.user.findUnique({
      where: {
        id: sessionUserId,
      },
      select: {
        role: true,
        status: true,
        deletedAt: true,
      },
    });

    if (!admin || admin.deletedAt || admin.role !== "ADMIN") {
      throw new Error(labels.permission_denied);
    }

    if (admin.status === "BANNED" || admin.status === "MUTED") {
      throw new Error("You cannot post comments while chat is restricted.");
    }

    const bot = await prisma.user.findUnique({
      where: {
        id: botUserId,
      },
      select: {
        id: true,
        isBot: true,
        deletedAt: true,
      },
    });

    if (!bot?.isBot || bot.deletedAt) {
      throw new Error("Invalid bot user.");
    }

    userId = bot.id;
  }

  const author = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      status: true,
      deletedAt: true,
    },
  });

  if (!author || author.deletedAt) {
    throw new Error("Account unavailable.");
  }

  if (hasContent && (author.status === "BANNED" || author.status === "MUTED")) {
    throw new Error("You cannot post comments while chat is restricted.");
  }

  // Validate Blob attachments before opening the transaction.
  // Admins posting as bots upload under their own session ID.
  await validateCommentImages({
    content,
    uploaderId: sessionUserId,
  });

  if (prediction) {
    const existingPrediction = await prisma.prediction.findUnique({
      where: {
        userId_symbol_sessionDate: {
          userId,
          symbol: market.symbol,
          sessionDate: prediction.sessionDate,
        },
      },
      select: {
        id: true,
      },
    });

    if (existingPrediction) {
      throw new Error("You have already voted for this market session.");
    }
  }

  const commentContent: Prisma.InputJsonValue = hasContent
    ? (JSON.parse(JSON.stringify(content)) as Prisma.InputJsonValue)
    : {
        type: "doc",
        content: [],
      };

  const moderationText =
    hasContent && content !== null ? getContentText(content) : "";

  const moderationResult = moderateContent(moderationText);

  const commentVisibility = moderationResult.shouldBePrivate
    ? "PRIVATE"
    : "PUBLIC";

  let referenceClose: number | null = null;

  if (prediction) {
    referenceClose = await getReferenceClose(
      market.symbol,
      prediction.sessionDate,
    );

    if (!Number.isFinite(referenceClose) || referenceClose <= 0) {
      throw new Error(labels.previous_close_unavailable);
    }
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

  const result = await prisma.$transaction(async (tx) => {
    const lockedUserIds = [...new Set([sessionUserId, userId])].sort();

    for (const lockedUserId of lockedUserIds) {
      await tx.$queryRaw`
        SELECT "id"
        FROM "User"
        WHERE "id" = ${lockedUserId}
        FOR UPDATE
      `;
    }

    const currentCaller = await tx.user.findUnique({
      where: {
        id: sessionUserId,
      },
      select: {
        role: true,
        status: true,
        deletedAt: true,
      },
    });

    if (!currentCaller || currentCaller.deletedAt) {
      throw new Error("Account unavailable.");
    }

    if (botUserId !== undefined) {
      if (currentCaller.role !== "ADMIN") {
        throw new Error(labels.permission_denied);
      }

      if (
        currentCaller.status === "BANNED" ||
        currentCaller.status === "MUTED"
      ) {
        throw new Error("You cannot post comments while chat is restricted.");
      }
    }

    const currentAuthor = await tx.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        status: true,
        deletedAt: true,
        nationality: true,
        isBot: true,
      },
    });

    if (!currentAuthor || currentAuthor.deletedAt) {
      throw new Error("Account unavailable.");
    }

    if (botUserId !== undefined && !currentAuthor.isBot) {
      throw new Error("Invalid bot user.");
    }

    if (
      hasContent &&
      (currentAuthor.status === "BANNED" || currentAuthor.status === "MUTED")
    ) {
      throw new Error("You cannot post comments while chat is restricted.");
    }

    let createdPrediction: { id: string } | null = null;

    if (prediction) {
      validatePredictionSession();

      if (
        referenceClose === null ||
        !Number.isFinite(referenceClose) ||
        referenceClose <= 0
      ) {
        throw new Error(labels.previous_close_unavailable);
      }

      const nationalityValue = currentAuthor.nationality?.trim().toUpperCase();

      const predictionNationality =
        !nationalityValue || nationalityValue === "OTHERS"
          ? "OTHER"
          : nationalityValue;

      try {
        createdPrediction = await tx.prediction.create({
          data: {
            userId,
            guestId: null,
            symbol: market.symbol,
            direction: prediction.direction,
            pointsBet: prediction.pointsBet,
            referenceClose,
            sessionDate: prediction.sessionDate,
            nationality: predictionNationality,
          },
          select: {
            id: true,
          },
        });
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

      if (prediction.pointsBet > 0) {
        await tx.pointBalance.upsert({
          where: {
            userId,
          },
          update: {},
          create: {
            userId,
            points: 10000,
          },
        });

        const deducted = await tx.pointBalance.updateMany({
          where: {
            userId,
            points: {
              gte: prediction.pointsBet,
            },
          },
          data: {
            points: {
              decrement: prediction.pointsBet,
            },
          },
        });

        if (deducted.count !== 1) {
          throw new Error(labels.insufficient_points);
        }

        await tx.pointTransaction.create({
          data: {
            userId,
            predictionId: createdPrediction.id,
            type: "BET",
            amount: -prediction.pointsBet,
          },
        });
      }
    }

    const createdComment = await tx.comment.create({
      data: {
        content: commentContent,
        hasContent,
        authorId: userId,
        predictionId: createdPrediction?.id ?? null,
        visibility: commentVisibility,
        assets: {
          create: {
            asset: {
              connect: {
                symbol: market.symbol,
              },
            },
          },
        },
      },
      select: {
        id: true,
      },
    });

    if (hasContent) {
      await recordUserActivity(tx, {
        userId,
        type: "COMMENT_CREATED",
        marketSymbol: market.symbol,
        commentId: createdComment.id,
      });
    }

    if (prediction && createdPrediction) {
      await recordUserActivity(tx, {
        userId,
        type: "PREDICTION_SUBMITTED",
        marketSymbol: market.symbol,
        commentId: createdComment.id,
        predictionId: createdPrediction.id,
        metadata: {
          direction: prediction.direction,
          pointsBet: prediction.pointsBet,
          sessionDate: prediction.sessionDate.toISOString(),
        },
      });
    }

    const pointBalance = prediction
      ? await tx.pointBalance.findUnique({
          where: {
            userId,
          },
          select: {
            points: true,
          },
        })
      : null;

    // Roll back if the voting cutoff passed during the transaction.
    if (prediction) {
      validatePredictionSession();
    }

    return {
      success: true,
      commentId: createdComment.id,
      predictionId: createdPrediction?.id ?? null,
      points: pointBalance?.points ?? null,
    };
  });

  const createdComment = await getCommentById(result.commentId, userId);

  return {
    ...result,
    comment: createdComment,
  };
}

export async function editComment({
  commentId,
  content,
  prediction: predictionInput,
}: {
  commentId: string;
  content: JSONContent;
  prediction?: {
    direction: "BULL" | "BEAR";
    pointsBet: number;
  };
}) {
  const session = await auth();

  const labels =
    COMMENT_ACTION_LABELS[resolveLanguage(session?.user?.language)];

  if (!session?.user?.id) {
    throw new Error(labels.login_required);
  }

  const userId = session.user.id;

  if (predictionInput) {
    if (
      predictionInput.direction !== "BULL" &&
      predictionInput.direction !== "BEAR"
    ) {
      throw new Error("Invalid prediction direction.");
    }

    if (
      !Number.isInteger(predictionInput.pointsBet) ||
      predictionInput.pointsBet < 0 ||
      predictionInput.pointsBet > 500 ||
      predictionInput.pointsBet % 50 !== 0
    ) {
      throw new Error("Bet amount must be 0–500 in increments of 50.");
    }
  }

  // Check permission before performing Blob requests.
  const existingComment = await prisma.comment.findUnique({
    where: {
      id: commentId,
    },
    select: {
      authorId: true,
      content: true,
      withdrawnAt: true,
      moderatedAt: true,
    },
  });

  if (!existingComment) {
    throw new Error(labels.comment_not_found);
  }

  if (existingComment.authorId !== userId) {
    throw new Error(labels.permission_denied);
  }

  if (existingComment.withdrawnAt || existingComment.moderatedAt) {
    throw new Error(labels.comment_not_editable);
  }

  const existingAuthor = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      status: true,
      deletedAt: true,
    },
  });

  if (!existingAuthor || existingAuthor.deletedAt) {
    throw new Error("Account unavailable.");
  }

  const submittedHasContent = hasEditorContent(content);

  if (
    submittedHasContent &&
    (existingAuthor.status === "BANNED" || existingAuthor.status === "MUTED")
  ) {
    throw new Error(
      "You cannot edit comment content while chat is restricted.",
    );
  }

  // Keep external Blob requests outside the DB transaction.
  await validateCommentImages({
    content,
    uploaderId: userId,
    previousContent: existingComment.content as JSONContent,
  });

  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`
      SELECT "id"
      FROM "User"
      WHERE "id" = ${userId}
      FOR UPDATE
    `;

    const author = await tx.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        status: true,
        deletedAt: true,
      },
    });

    if (!author || author.deletedAt) {
      throw new Error("Account unavailable.");
    }

    await tx.$queryRaw`
      SELECT 1 AS locked
      FROM pg_advisory_xact_lock(
        hashtext(${`comment-edit-delete:${commentId}`})::bigint
      )
    `;

    const comment = await tx.comment.findUnique({
      where: {
        id: commentId,
      },
      select: {
        authorId: true,
        predictionId: true,
        withdrawnAt: true,
        moderatedAt: true,
        visibility: true,
        assets: {
          take: 1,
          select: {
            assetSymbol: true,
          },
        },
      },
    });

    if (!comment) {
      throw new Error(labels.comment_not_found);
    }

    if (comment.authorId !== userId) {
      throw new Error(labels.permission_denied);
    }

    if (comment.withdrawnAt || comment.moderatedAt) {
      throw new Error(labels.comment_not_editable);
    }

    const hasContent = submittedHasContent;

    if (!hasContent && !comment.predictionId) {
      throw new Error(labels.write_comment);
    }

    if (
      hasContent &&
      (author.status === "BANNED" || author.status === "MUTED")
    ) {
      throw new Error(
        "You cannot edit comment content while chat is restricted.",
      );
    }

    const updatedContent: JSONContent = hasContent
      ? content
      : {
          type: "doc",
          content: [],
        };

    const moderationText = hasContent ? getContentText(updatedContent) : "";

    const moderationResult = moderateContent(moderationText);

    const visibility =
      comment.visibility === "PRIVATE" || moderationResult.shouldBePrivate
        ? "PRIVATE"
        : "PUBLIC";

    if (predictionInput && !comment.predictionId) {
      throw new Error("This comment has no linked prediction.");
    }

    if (predictionInput && comment.predictionId) {
      await tx.$queryRaw`
        SELECT "id"
        FROM "Prediction"
        WHERE "id" = ${comment.predictionId}
        FOR UPDATE
      `;
    }

    const linkedPrediction = comment.predictionId
      ? await tx.prediction.findUnique({
          where: {
            id: comment.predictionId,
          },
          select: {
            id: true,
            userId: true,
            symbol: true,
            direction: true,
            pointsBet: true,
            sessionDate: true,
            status: true,
            createdAt: true,
          },
        })
      : null;

    function validatePredictionEditing() {
      if (!linkedPrediction || linkedPrediction.userId !== userId) {
        throw new Error("No editable prediction was found.");
      }

      if (linkedPrediction.status !== "PENDING") {
        throw new Error("Only pending predictions can be edited.");
      }

      const votingWindow = getVotingWindow(linkedPrediction.symbol, Date.now());

      if (
        votingWindow.isMarketOpen ||
        !votingWindow.canVote ||
        !votingWindow.predictionFor ||
        votingWindow.predictionFor.getTime() !==
          linkedPrediction.sessionDate.getTime()
      ) {
        throw new Error("Voting is closed for this prediction.");
      }
    }

    let predictionChanged = false;

    if (predictionInput) {
      validatePredictionEditing();

      if (!linkedPrediction) {
        throw new Error("No editable prediction was found.");
      }

      const nextPointsBet = predictionInput.pointsBet;

      const additionalBet = nextPointsBet - linkedPrediction.pointsBet;

      predictionChanged =
        linkedPrediction.direction !== predictionInput.direction ||
        additionalBet !== 0;

      if (additionalBet !== 0) {
        await tx.pointBalance.upsert({
          where: {
            userId,
          },
          update: {},
          create: {
            userId,
            points: 10000,
          },
        });

        if (additionalBet > 0) {
          const deducted = await tx.pointBalance.updateMany({
            where: {
              userId,
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
            throw new Error(labels.insufficient_points);
          }
        } else {
          await tx.pointBalance.update({
            where: {
              userId,
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
              predictionId: linkedPrediction.id,
              type: "BET",
            },
          },
          update: {
            amount: -nextPointsBet,
          },
          create: {
            userId,
            predictionId: linkedPrediction.id,
            type: "BET",
            amount: -nextPointsBet,
          },
        });
      }

      validatePredictionEditing();

      if (predictionChanged) {
        await tx.prediction.update({
          where: {
            id: linkedPrediction.id,
          },
          data: {
            direction: predictionInput.direction,
            pointsBet: nextPointsBet,
          },
        });

        const metadata = {
          direction: predictionInput.direction,
          pointsBet: nextPointsBet,
          sessionDate: linkedPrediction.sessionDate.toISOString(),
          lastEditedAt: new Date().toISOString(),
        };

        const activity = await tx.userActivity.findFirst({
          where: {
            userId,
            predictionId: linkedPrediction.id,
            type: "PREDICTION_SUBMITTED",
          },
          orderBy: [
            {
              createdAt: "desc",
            },
            {
              id: "desc",
            },
          ],
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
          await tx.userActivity.create({
            data: {
              userId,
              type: "PREDICTION_SUBMITTED",
              marketSymbol: linkedPrediction.symbol,
              predictionId: linkedPrediction.id,
              commentId,
              metadata,
              createdAt: linkedPrediction.createdAt,
            },
          });
        }
      }
    }

    const editedAt = new Date();

    await tx.comment.update({
      where: {
        id: commentId,
      },
      data: {
        content: JSON.parse(
          JSON.stringify(updatedContent),
        ) as Prisma.InputJsonValue,
        hasContent,
        visibility,
        editedAt,
      },
    });

    await recordUserActivity(tx, {
      userId,
      type: "COMMENT_EDITED",
      marketSymbol:
        linkedPrediction?.symbol ?? comment.assets[0]?.assetSymbol ?? null,
      commentId,
      predictionId: comment.predictionId,
    });

    if (predictionInput) {
      validatePredictionEditing();
    }

    const [prediction, balance] = await Promise.all([
      comment.predictionId
        ? tx.prediction.findUnique({
            where: {
              id: comment.predictionId,
            },
            select: PREDICTION_SELECT,
          })
        : Promise.resolve(null),

      predictionInput
        ? tx.pointBalance.findUnique({
            where: {
              userId,
            },
            select: {
              points: true,
            },
          })
        : Promise.resolve(null),
    ]);

    // Include the final reads in the cutoff check.
    if (predictionInput) {
      validatePredictionEditing();
    }

    return {
      success: true,
      content: updatedContent,
      visibility,
      editedAt,
      prediction,
      predictionChanged,
      points: balance?.points ?? null,
    };
  });
}

export async function getMarketComments(
  assetSymbol: string,
  cursor?: {
    createdAt: Date;
    id: string;
    priority: "CONTENT" | "VOTE_ONLY" | "PREVIOUS";
  } | null,
  currentSessionStartMs: number | null = null,
) {
  const session = await auth();
  const labels =
    COMMENT_ACTION_LABELS[resolveLanguage(session?.user?.language)];

  const userId = session?.user?.id ?? null;
  const isAdmin = session?.user?.role === "ADMIN";

  const baseWhere: Prisma.CommentWhereInput = {
    assets: {
      some: { assetSymbol },
    },
    ...getVisibilityWhere(userId, isAdmin),
  };

  const guestId = userId
    ? null
    : ((await cookies()).get("bbv_guest_voter")?.value ?? null);

  const likeWhere: Prisma.CommentLikeWhereInput = userId
    ? { userId }
    : guestId
      ? { guestId, userId: null }
      : { id: { in: [] } };

  const select = {
    ...getCommentSelect(userId, isAdmin),

    likes: {
      where: likeWhere,
      select: {
        id: true,
      },
    },
  } satisfies Prisma.CommentSelect;

  type SelectedComment = Prisma.CommentGetPayload<{
    select: typeof select;
  }>;

  type Priority = "CONTENT" | "VOTE_ONLY" | "PREVIOUS";

  const orderBy: Prisma.CommentOrderByWithRelationInput[] = [
    { createdAt: "desc" },
    { id: "desc" },
  ];

  const sessionStart =
    currentSessionStartMs === null ? null : new Date(currentSessionStartMs);

  if (sessionStart && !Number.isFinite(sessionStart.getTime())) {
    throw new Error(labels.invalid_session);
  }

  const cursorDate = cursor ? new Date(cursor.createdAt) : null;

  if (cursorDate && !Number.isFinite(cursorDate.getTime())) {
    throw new Error(labels.invalid_cursor);
  }

  const olderThanCursorWhere: Prisma.CommentWhereInput =
    cursor && cursorDate
      ? {
          OR: [
            { createdAt: { lt: cursorDate } },
            {
              createdAt: cursorDate,
              id: { lt: cursor.id },
            },
          ],
        }
      : {};

  const groups: {
    priority: Priority;
    where: Prisma.CommentWhereInput;
  }[] = sessionStart
    ? [
        {
          priority: "CONTENT",
          where: {
            createdAt: { gte: sessionStart },
            OR: [
              { hasContent: true },
              { predictionId: null },
              ...(userId ? [{ authorId: userId }] : []),
            ],
          },
        },
        {
          priority: "VOTE_ONLY",
          where: {
            createdAt: { gte: sessionStart },
            hasContent: false,
            predictionId: { not: null },
            ...(userId ? { authorId: { not: userId } } : {}),
          },
        },
        {
          priority: "PREVIOUS",
          where: {
            createdAt: { lt: sessionStart },
          },
        },
      ]
    : [
        {
          priority: "PREVIOUS",
          where: {},
        },
      ];

  const fetchComments = async () => {
    const take = MARKET_COMMENTS_PAGE_SIZE + 1;

    const startIndex = cursor
      ? groups.findIndex((group) => group.priority === cursor.priority)
      : 0;

    if (startIndex < 0) {
      throw new Error(labels.invalid_cursor);
    }

    const items: {
      comment: SelectedComment;
      priority: Priority;
    }[] = [];

    for (let index = startIndex; index < groups.length; index++) {
      const group = groups[index];

      const comments = await prisma.comment.findMany({
        where: {
          AND: [
            baseWhere,
            group.where,
            ...(cursor && index === startIndex ? [olderThanCursorWhere] : []),
          ],
        },
        orderBy,
        take: take - items.length,
        select,
      });

      items.push(
        ...comments.map((comment) => ({
          comment,
          priority: group.priority,
        })),
      );

      if (items.length >= take) {
        break;
      }
    }

    return items;
  };

  const [items, totalCount] = await Promise.all([
    fetchComments(),
    prisma.comment.count({
      where: baseWhere,
    }),
  ]);

  const hasMore = items.length > MARKET_COMMENTS_PAGE_SIZE;
  const page = hasMore ? items.slice(0, MARKET_COMMENTS_PAGE_SIZE) : items;
  const lastItem = page.at(-1);

  const nextCursor =
    hasMore && lastItem
      ? {
          createdAt: lastItem.comment.createdAt,
          id: lastItem.comment.id,
          priority: lastItem.priority,
        }
      : null;

  const comments = page.map(({ comment }) => {
    const { _count, likes, ...rest } = comment;

    return {
      ...rest,
      content: comment.content as JSONContent,
      likeCount: _count.likes,
      replyCount: _count.replies,
      likedByMe: likes.length > 0,
    };
  });

  return {
    comments,
    nextCursor,
    totalCount,
  };
}

export type MarketCommentsPage = Awaited<ReturnType<typeof getMarketComments>>;
export type MarketPageComments = MarketCommentsPage["comments"];

export async function deleteComment(commentId: string) {
  const session = await auth();

  const labels =
    COMMENT_ACTION_LABELS[resolveLanguage(session?.user?.language)];

  if (!session?.user?.id) {
    throw new Error(labels.login_required);
  }

  const userId = session.user.id;

  return prisma.$transaction(async (tx) => {
    // Use the same lock as editComment.
    await tx.$queryRaw`
      SELECT 1 AS locked
      FROM pg_advisory_xact_lock(
        hashtext(${`comment-edit-delete:${commentId}`})::bigint
      )
    `;

    const comment = await tx.comment.findUnique({
      where: {
        id: commentId,
      },

      select: {
        authorId: true,
        predictionId: true,
        content: true,

        assets: {
          take: 1,
          select: {
            assetSymbol: true,
          },
        },
      },
    });

    if (!comment) {
      throw new Error(labels.comment_not_found);
    }

    if (comment.authorId !== userId) {
      throw new Error(labels.permission_denied);
    }

    // Capture the symbol before deleting the comment's asset relations.
    const marketSymbol = comment.assets[0]?.assetSymbol ?? null;

    // -------------------------------------------------------------------------
    // PREDICTION COMMENT: REMOVE CONTENT
    // -------------------------------------------------------------------------

    if (comment.predictionId) {
      const deletedContent: JSONContent = {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: DELETED_COMMENT_TEXT,
              },
            ],
          },
        ],
      };

      const currentContent = comment.content as JSONContent;

      const currentText =
        currentContent.content
          ?.flatMap((node) => node.content ?? [])
          .map((node) => node.text ?? "")
          .join("")
          .trim() ?? "";

      if (currentText === DELETED_COMMENT_TEXT) {
        return {
          success: true,
          action: "ALREADY_CONTENT_REMOVED" as const,
          content: deletedContent,
        };
      }

      await tx.comment.update({
        where: {
          id: commentId,
        },

        data: {
          content: JSON.parse(
            JSON.stringify(deletedContent),
          ) as Prisma.InputJsonValue,
          hasContent: false,
          editedAt: null,
        },
      });

      await recordUserActivity(tx, {
        userId,
        type: "COMMENT_DELETED",
        marketSymbol,
        commentId,
        predictionId: comment.predictionId,
      });

      return {
        success: true,
        action: "CONTENT_REMOVED" as const,
        content: deletedContent,
      };
    }

    // -------------------------------------------------------------------------
    // REGULAR COMMENT: DELETE
    // -------------------------------------------------------------------------

    await tx.comment.delete({
      where: {
        id: commentId,
      },
    });

    await recordUserActivity(tx, {
      userId,
      type: "COMMENT_DELETED",
      marketSymbol,
      commentId,
    });

    return {
      success: true,
      action: "DELETED" as const,
    };
  });
}

export async function hideComment(commentId: string, reason?: string) {
  const session = await auth();
  const labels =
    COMMENT_ACTION_LABELS[resolveLanguage(session?.user?.language)];

  if (!session?.user?.id) {
    throw new Error(labels.login_required);
  }

  if (session.user.role !== "ADMIN") {
    throw new Error(labels.permission_denied);
  }

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: {
      id: true,
      authorId: true,
      moderatedAt: true,
    },
  });

  if (!comment) {
    throw new Error(labels.comment_not_found);
  }

  if (comment.moderatedAt) {
    return {
      success: true,
      action: "ALREADY_HIDDEN" as const,
      moderatedAt: comment.moderatedAt,
    };
  }

  const now = new Date();

  await prisma.$transaction([
    prisma.comment.update({
      where: { id: commentId },
      data: { moderatedAt: now },
    }),

    prisma.moderationAction.create({
      data: {
        type: "HIDE_COMMENT",
        reason: reason?.trim() || null,
        moderatorId: session.user.id,
        targetUserId: comment.authorId,
        commentId,
      },
    }),
  ]);

  return {
    success: true,
    action: "HIDDEN" as const,
    moderatedAt: now,
  };
}

export async function restoreComment(commentId: string, reason?: string) {
  const session = await auth();
  const labels =
    COMMENT_ACTION_LABELS[resolveLanguage(session?.user?.language)];

  if (!session?.user?.id) {
    throw new Error(labels.login_required);
  }

  if (session.user.role !== "ADMIN") {
    throw new Error(labels.permission_denied);
  }

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: {
      id: true,
      authorId: true,
      moderatedAt: true,
    },
  });

  if (!comment) {
    throw new Error(labels.comment_not_found);
  }

  if (!comment.moderatedAt) {
    return {
      success: true,
      action: "ALREADY_VISIBLE" as const,
    };
  }

  await prisma.$transaction([
    prisma.comment.update({
      where: { id: commentId },
      data: { moderatedAt: null },
    }),

    prisma.moderationAction.create({
      data: {
        type: "RESTORE_COMMENT",
        reason: reason?.trim() || null,
        moderatorId: session.user.id,
        targetUserId: comment.authorId,
        commentId,
      },
    }),
  ]);

  return {
    success: true,
    action: "RESTORED" as const,
  };
}

export async function createReply({
  commentId,
  parentId = null,
  content,
  gifUrl = null,
  gifWidth = null,
  gifHeight = null,
}: {
  commentId: string;
  parentId?: string | null;
  content: string;
  gifUrl?: string | null;
  gifWidth?: number | null;
  gifHeight?: number | null;
}) {
  const session = await auth();

  const labels =
    COMMENT_ACTION_LABELS[resolveLanguage(session?.user?.language)];

  if (!session?.user?.id) {
    throw new Error(labels.login_required);
  }

  const userId = session.user.id;
  const trimmedContent = content.trim();

  if (!trimmedContent && !gifUrl) {
    throw new Error(labels.write_reply);
  }

  const dimensions = gifUrl ? getGifDimensions(gifWidth, gifHeight) : null;

  const moderationResult = moderateContent(trimmedContent);

  const replyVisibility = moderationResult.shouldBePrivate
    ? "PRIVATE"
    : "PUBLIC";

  return prisma.$transaction(async (tx) => {
    // Serialize reply creation with bans and account deletion.
    await tx.$queryRaw`
      SELECT "id"
      FROM "User"
      WHERE "id" = ${userId}
      FOR UPDATE
    `;

    const author = await tx.user.findUnique({
      where: { id: userId },
      select: {
        status: true,
        deletedAt: true,
      },
    });

    if (!author || author.deletedAt) {
      throw new Error("Account unavailable.");
    }

    if (author.status === "BANNED" || author.status === "MUTED") {
      throw new Error("You cannot post replies while chat is restricted.");
    }

    const comment = await tx.comment.findUnique({
      where: { id: commentId },
      select: {
        authorId: true,
        withdrawnAt: true,
        moderatedAt: true,
        assets: {
          take: 1,
          select: {
            assetSymbol: true,
          },
        },
      },
    });

    if (!comment) {
      throw new Error(labels.comment_not_found);
    }

    if (comment.withdrawnAt || comment.moderatedAt) {
      throw new Error(labels.cannot_reply);
    }

    const parentReply = parentId
      ? await tx.reply.findUnique({
          where: { id: parentId },
          select: {
            authorId: true,
            commentId: true,
            moderatedAt: true,
          },
        })
      : null;

    if (parentId) {
      if (!parentReply) {
        throw new Error(labels.reply_not_found);
      }

      if (parentReply.commentId !== commentId) {
        throw new Error(labels.invalid_parent);
      }

      if (parentReply.moderatedAt) {
        throw new Error(labels.cannot_reply);
      }
    }

    const reply = await tx.reply.create({
      data: {
        content: trimmedContent,

        gifUrl,
        gifWidth: dimensions?.width ?? null,
        gifHeight: dimensions?.height ?? null,

        commentId,
        authorId: userId,
        parentId,
        visibility: replyVisibility,
      },
      select: REPLY_SELECT,
    });

    const targetUserId = parentReply?.authorId ?? comment.authorId;

    if (replyVisibility === "PUBLIC" && targetUserId !== userId) {
      await tx.notification.create({
        data: {
          userId: targetUserId,
          actorId: userId,
          type: parentReply ? "REPLY_REPLIED" : "COMMENT_REPLIED",
          title: "New reply",
          message: parentReply
            ? `${session.user.name ?? "Someone"} replied to your reply.`
            : `${session.user.name ?? "Someone"} replied to your comment.`,
          commentId,
          replyId: reply.id,
          eventKey: parentReply
            ? `reply-replied:${reply.id}`
            : `comment-replied:${reply.id}`,
        },
      });
    }

    await recordUserActivity(tx, {
      userId,
      type: "REPLY_CREATED",
      targetUserId,
      marketSymbol: comment.assets[0]?.assetSymbol ?? null,
      commentId,
      replyId: reply.id,
      metadata: {
        parentId,
      },
    });

    return {
      success: true,
      reply,
    };
  });
}

export async function editReply({
  replyId,
  content,
  gifUrl = null,
  gifWidth = null,
  gifHeight = null,
}: {
  replyId: string;
  content: string;
  gifUrl?: string | null;
  gifWidth?: number | null;
  gifHeight?: number | null;
}) {
  const session = await auth();

  const labels =
    COMMENT_ACTION_LABELS[resolveLanguage(session?.user?.language)];

  if (!session?.user?.id) {
    throw new Error(labels.login_required);
  }

  const userId = session.user.id;
  const trimmedContent = content.trim();

  if (!trimmedContent && !gifUrl) {
    throw new Error(labels.write_reply);
  }

  const submittedDimensions = gifUrl
    ? getGifDimensions(gifWidth, gifHeight)
    : null;

  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`
      SELECT "id"
      FROM "User"
      WHERE "id" = ${userId}
      FOR UPDATE
    `;

    const author = await tx.user.findUnique({
      where: { id: userId },
      select: {
        status: true,
        deletedAt: true,
      },
    });

    if (!author || author.deletedAt) {
      throw new Error("Account unavailable.");
    }

    if (author.status === "BANNED" || author.status === "MUTED") {
      throw new Error("You cannot edit replies while chat is restricted.");
    }

    const reply = await tx.reply.findUnique({
      where: { id: replyId },
      select: {
        authorId: true,
        commentId: true,
        content: true,

        gifUrl: true,
        gifWidth: true,
        gifHeight: true,

        moderatedAt: true,
        visibility: true,

        comment: {
          select: {
            assets: {
              take: 1,
              select: {
                assetSymbol: true,
              },
            },
          },
        },
      },
    });

    if (!reply) {
      throw new Error(labels.reply_not_found);
    }

    if (reply.authorId !== userId) {
      throw new Error(labels.permission_denied);
    }

    if (reply.moderatedAt) {
      throw new Error(labels.reply_not_editable);
    }

    const existingDimensions =
      gifUrl && gifUrl === reply.gifUrl
        ? getGifDimensions(reply.gifWidth, reply.gifHeight)
        : null;

    const dimensions = gifUrl
      ? (submittedDimensions ?? existingDimensions)
      : null;

    const nextGifWidth = dimensions?.width ?? null;
    const nextGifHeight = dimensions?.height ?? null;

    const contentChanged =
      reply.content !== trimmedContent || reply.gifUrl !== gifUrl;

    const dimensionsChanged =
      reply.gifWidth !== nextGifWidth || reply.gifHeight !== nextGifHeight;

    if (!contentChanged) {
      // Metadata-only changes should not create an edited
      // badge or a content-edit activity.
      const unchangedReply = dimensionsChanged
        ? await tx.reply.update({
            where: { id: replyId },
            data: {
              gifWidth: nextGifWidth,
              gifHeight: nextGifHeight,
            },
            select: REPLY_SELECT,
          })
        : await tx.reply.findUniqueOrThrow({
            where: { id: replyId },
            select: REPLY_SELECT,
          });

      return {
        success: true,
        reply: unchangedReply,
      };
    }

    const moderationResult = moderateContent(trimmedContent);

    const visibility =
      reply.visibility === "PRIVATE" || moderationResult.shouldBePrivate
        ? "PRIVATE"
        : "PUBLIC";

    const updatedReply = await tx.reply.update({
      where: { id: replyId },
      data: {
        content: trimmedContent,

        gifUrl,
        gifWidth: nextGifWidth,
        gifHeight: nextGifHeight,

        visibility,
        editedAt: new Date(),
      },
      select: REPLY_SELECT,
    });

    await recordUserActivity(tx, {
      userId,
      type: "REPLY_EDITED",
      marketSymbol: reply.comment.assets[0]?.assetSymbol ?? null,
      commentId: reply.commentId,
      replyId,
    });

    return {
      success: true,
      reply: updatedReply,
    };
  });
}

export async function deleteReply(replyId: string) {
  const session = await auth();
  const labels =
    COMMENT_ACTION_LABELS[resolveLanguage(session?.user?.language)];

  if (!session?.user?.id) {
    throw new Error(labels.login_required);
  }

  const userId = session.user.id;

  return prisma.$transaction(async (tx) => {
    const reply = await tx.reply.findUnique({
      where: { id: replyId },
      select: {
        authorId: true,
        commentId: true,
        comment: {
          select: {
            assets: {
              take: 1,
              select: { assetSymbol: true },
            },
          },
        },
      },
    });

    if (!reply) {
      throw new Error(labels.reply_not_found);
    }

    if (reply.authorId !== userId) {
      throw new Error(labels.permission_denied);
    }

    await tx.reply.delete({
      where: { id: replyId },
    });

    await recordUserActivity(tx, {
      userId,
      type: "REPLY_DELETED",
      marketSymbol: reply.comment.assets[0]?.assetSymbol ?? null,
      commentId: reply.commentId,
      replyId,
    });

    return {
      success: true,
    };
  });
}

export async function hideReply(replyId: string) {
  const session = await auth();
  const labels =
    COMMENT_ACTION_LABELS[resolveLanguage(session?.user?.language)];

  if (!session?.user?.id) {
    throw new Error(labels.login_required);
  }

  if (session.user.role !== "ADMIN") {
    throw new Error(labels.permission_denied);
  }

  const reply = await prisma.reply.findUnique({
    where: { id: replyId },
    select: {
      id: true,
      moderatedAt: true,
    },
  });

  if (!reply) {
    throw new Error(labels.reply_not_found);
  }

  if (reply.moderatedAt) {
    return {
      success: true,
      action: "ALREADY_HIDDEN" as const,
    };
  }

  await prisma.reply.update({
    where: { id: replyId },
    data: { moderatedAt: new Date() },
  });

  return {
    success: true,
    action: "HIDDEN" as const,
  };
}

export async function restoreReply(replyId: string) {
  const session = await auth();
  const labels =
    COMMENT_ACTION_LABELS[resolveLanguage(session?.user?.language)];

  if (!session?.user?.id) {
    throw new Error(labels.login_required);
  }

  if (session.user.role !== "ADMIN") {
    throw new Error(labels.permission_denied);
  }

  const reply = await prisma.reply.findUnique({
    where: { id: replyId },
    select: {
      id: true,
      moderatedAt: true,
    },
  });

  if (!reply) {
    throw new Error(labels.reply_not_found);
  }

  if (!reply.moderatedAt) {
    return {
      success: true,
      action: "ALREADY_VISIBLE" as const,
    };
  }

  await prisma.reply.update({
    where: { id: replyId },
    data: { moderatedAt: null },
  });

  return {
    success: true,
    action: "RESTORED" as const,
  };
}

export async function getCommentReplies(commentId: string) {
  const session = await auth();

  const userId = session?.user?.id ?? null;
  const isAdmin = session?.user?.role === "ADMIN";
  const visibilityWhere = getVisibilityWhere(userId, isAdmin);

  const guestId = userId
    ? null
    : ((await cookies()).get("bbv_guest_voter")?.value ?? null);

  const likeWhere: Prisma.ReplyLikeWhereInput = userId
    ? { userId }
    : guestId
      ? { guestId, userId: null }
      : { id: { in: [] } };

  const replies = await prisma.reply.findMany({
    where: {
      commentId,
      ...visibilityWhere,
    },
    orderBy: {
      createdAt: "asc",
    },
    select: {
      ...REPLY_SELECT,

      likes: {
        where: likeWhere,
        select: {
          id: true,
        },
      },

      _count: {
        select: {
          likes: true,
          replies: {
            where: visibilityWhere,
          },
        },
      },
    },
  });

  return replies.map((reply) => {
    const { _count, likes, ...rest } = reply;

    return {
      ...rest,
      likeCount: _count.likes,
      replyCount: _count.replies,
      likedByMe: likes.length > 0,
    };
  });
}

export async function reportComment(commentId: string) {
  const session = await auth();
  const labels =
    COMMENT_ACTION_LABELS[resolveLanguage(session?.user?.language)];

  if (!session?.user?.id) {
    throw new Error(labels.login_required);
  }

  const userId = session.user.id;
  const eventKeyPrefix = `comment-report:${commentId}:`;

  return prisma.$transaction(async (tx) => {
    // 같은 댓글의 동시 신고를 순서대로 처리.
    await tx.$queryRaw`
      SELECT 1 AS locked
      FROM pg_advisory_xact_lock(
        hashtext(${eventKeyPrefix})::bigint
      )
    `;

    const comment = await tx.comment.findUnique({
      where: { id: commentId },
      select: {
        authorId: true,
        assets: {
          take: 1,
          select: { assetSymbol: true },
        },
      },
    });

    if (!comment) {
      throw new Error(labels.comment_not_found);
    }

    const existingReport = await tx.notification.findFirst({
      where: {
        eventKey: { startsWith: eventKeyPrefix },
      },
      select: { id: true },
    });

    if (existingReport) {
      throw new Error(labels.comment_reported);
    }

    const admins = await tx.user.findMany({
      where: { role: "ADMIN" },
      select: { id: true },
    });

    if (admins.length === 0) {
      throw new Error(labels.admin_unavailable);
    }

    await tx.notification.createMany({
      data: admins.map((admin) => ({
        userId: admin.id,
        actorId: null,
        type: "COMMENT_REPORTED" as const,
        title: "Comment reported",
        message: "A comment has been reported for review.",
        commentId,
        eventKey: `${eventKeyPrefix}${admin.id}`,
      })),
    });

    await recordUserActivity(tx, {
      userId,
      type: "COMMENT_REPORTED",
      targetUserId: comment.authorId,
      marketSymbol: comment.assets[0]?.assetSymbol ?? null,
      commentId,
    });

    return {
      success: true,
    };
  });
}

export async function reportReply(replyId: string) {
  const session = await auth();
  const labels =
    COMMENT_ACTION_LABELS[resolveLanguage(session?.user?.language)];

  if (!session?.user?.id) {
    throw new Error(labels.login_required);
  }

  const userId = session.user.id;
  const eventKeyPrefix = `reply-report:${replyId}:`;

  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`
      SELECT 1 AS locked
      FROM pg_advisory_xact_lock(
        hashtext(${eventKeyPrefix})::bigint
      )
    `;

    const reply = await tx.reply.findUnique({
      where: { id: replyId },
      select: {
        authorId: true,
        commentId: true,
        comment: {
          select: {
            assets: {
              take: 1,
              select: { assetSymbol: true },
            },
          },
        },
      },
    });

    if (!reply) {
      throw new Error(labels.reply_not_found);
    }

    const existingReport = await tx.notification.findFirst({
      where: {
        eventKey: { startsWith: eventKeyPrefix },
      },
      select: { id: true },
    });

    if (existingReport) {
      throw new Error(labels.reply_reported);
    }

    const admins = await tx.user.findMany({
      where: { role: "ADMIN" },
      select: { id: true },
    });

    if (admins.length === 0) {
      throw new Error(labels.admin_unavailable);
    }

    await tx.notification.createMany({
      data: admins.map((admin) => ({
        userId: admin.id,
        actorId: null,
        type: "REPLY_REPORTED" as const,
        title: "Reply reported",
        message: "A reply has been reported for review.",
        commentId: reply.commentId,
        replyId,
        eventKey: `${eventKeyPrefix}${admin.id}`,
      })),
    });

    await recordUserActivity(tx, {
      userId,
      type: "REPLY_REPORTED",
      targetUserId: reply.authorId,
      marketSymbol: reply.comment.assets[0]?.assetSymbol ?? null,
      commentId: reply.commentId,
      replyId,
    });

    return {
      success: true,
    };
  });
}

export type HomeCommentSort = "latest" | "most-liked";

export interface HomeCommentCursor {
  id: string;
  createdAt: Date;
  likeCount: number;
  sort: HomeCommentSort;
  assetSymbol: string | null;
}

interface GetHomeCommentsOptions {
  assetSymbol?: string | null;
  sort?: HomeCommentSort;
  cursor?: HomeCommentCursor | null;
}

export async function getHomeComments({
  assetSymbol = null,
  sort = "latest",
  cursor = null,
}: GetHomeCommentsOptions = {}) {
  const session = await auth();
  const labels =
    COMMENT_ACTION_LABELS[resolveLanguage(session?.user?.language)];

  const userId = session?.user?.id ?? null;
  const isAdmin = session?.user?.role === "ADMIN";
  const marketSymbol = assetSymbol?.trim() || null;

  if (sort !== "latest" && sort !== "most-liked") {
    throw new Error(labels.invalid_sort);
  }

  const baseWhere: Prisma.CommentWhereInput = {
    AND: [
      getVisibilityWhere(userId, isAdmin),
      {
        hasContent: true,
        withdrawnAt: null,
        moderatedAt: null,
      },
      ...(marketSymbol
        ? [
            {
              assets: {
                some: { assetSymbol: marketSymbol },
              },
            },
          ]
        : []),
    ],
  };

  const guestId = userId
    ? null
    : ((await cookies()).get("bbv_guest_voter")?.value ?? null);

  const likeWhere: Prisma.CommentLikeWhereInput = userId
    ? { userId }
    : guestId
      ? { guestId, userId: null }
      : { id: { in: [] } };

  const select = {
    ...getCommentSelect(userId, isAdmin),

    likes: {
      where: likeWhere,
      select: {
        id: true,
      },
    },

    assets: {
      select: {
        assetSymbol: true,
      },
    },
  } satisfies Prisma.CommentSelect;

  let cursorDate: Date | null = null;

  if (cursor) {
    cursorDate = new Date(cursor.createdAt);

    if (
      !Number.isFinite(cursorDate.getTime()) ||
      !cursor.id ||
      !Number.isSafeInteger(cursor.likeCount) ||
      cursor.likeCount < 0 ||
      cursor.sort !== sort ||
      cursor.assetSymbol !== marketSymbol
    ) {
      throw new Error(labels.invalid_cursor);
    }
  }

  const orderBy: Prisma.CommentOrderByWithRelationInput[] =
    sort === "most-liked"
      ? [{ likes: { _count: "desc" } }, { createdAt: "desc" }, { id: "desc" }]
      : [{ createdAt: "desc" }, { id: "desc" }];

  const olderThanCursorWhere: Prisma.CommentWhereInput =
    cursor && cursorDate
      ? {
          OR: [
            { createdAt: { lt: cursorDate } },
            {
              createdAt: cursorDate,
              id: { lt: cursor.id },
            },
          ],
        }
      : {};

  if (cursor && sort === "most-liked") {
    const cursorExists = await prisma.comment.findFirst({
      where: {
        AND: [baseWhere, { id: cursor.id }],
      },
      select: { id: true },
    });

    if (!cursorExists) {
      throw new Error(labels.list_changed);
    }
  }

  const [items, totalCount] = await Promise.all([
    prisma.comment.findMany({
      where:
        sort === "latest" && cursor
          ? {
              AND: [baseWhere, olderThanCursorWhere],
            }
          : baseWhere,

      orderBy,

      ...(sort === "most-liked" && cursor
        ? {
            cursor: { id: cursor.id },
            skip: 1,
          }
        : {}),

      take: HOME_COMMENTS_PAGE_SIZE + 1,
      select,
    }),

    prisma.comment.count({
      where: baseWhere,
    }),
  ]);

  const hasMore = items.length > HOME_COMMENTS_PAGE_SIZE;
  const page = hasMore ? items.slice(0, HOME_COMMENTS_PAGE_SIZE) : items;
  const lastItem = page.at(-1);

  const nextCursor: HomeCommentCursor | null =
    hasMore && lastItem
      ? {
          id: lastItem.id,
          createdAt: lastItem.createdAt,
          likeCount: lastItem._count.likes,
          sort,
          assetSymbol: marketSymbol,
        }
      : null;

  const comments = page.map((comment) => {
    const { _count, likes, ...rest } = comment;

    return {
      ...rest,
      content: comment.content as JSONContent,
      likeCount: _count.likes,
      replyCount: _count.replies,
      likedByMe: likes.length > 0,
    };
  });

  return {
    comments,
    nextCursor,
    totalCount,
  };
}

export type HomeComments = Awaited<
  ReturnType<typeof getHomeComments>
>["comments"];

export async function getHomeCommunityMarkets() {
  const session = await auth();

  const userId = session?.user?.id ?? null;
  const isAdmin = session?.user?.role === "ADMIN";

  const comments = await prisma.comment.findMany({
    where: {
      AND: [
        getVisibilityWhere(userId, isAdmin),
        {
          hasContent: true,
          withdrawnAt: null,
          moderatedAt: null,
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
      ],
    },

    select: {
      assets: {
        select: { assetSymbol: true },
      },
    },
  });

  const counts = new Map<string, number>();

  for (const comment of comments) {
    for (const { assetSymbol } of comment.assets) {
      counts.set(assetSymbol, (counts.get(assetSymbol) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([symbol, commentCount]) => {
      const market = ALL_MARKET_SYMBOLS.find((item) => item.symbol === symbol);

      return {
        symbol,
        displaySymbol: market?.displaySymbol ?? symbol,
        name: market?.name ?? symbol,
        commentCount,
      };
    })
    .sort(
      (a, b) =>
        b.commentCount - a.commentCount ||
        a.displaySymbol.localeCompare(b.displaySymbol),
    );
}

export async function getPredictionCommentForEdit({
  symbol,
  sessionDate,
}: {
  symbol: string;
  sessionDate: Date;
}) {
  const session = await auth();

  const labels =
    COMMENT_ACTION_LABELS[resolveLanguage(session?.user?.language)];

  if (!session?.user?.id) {
    throw new Error(labels.login_required);
  }

  if (
    !(sessionDate instanceof Date) ||
    !Number.isFinite(sessionDate.getTime())
  ) {
    throw new Error(labels.comment_not_editable);
  }

  const userId = session.user.id;

  const comment = await prisma.comment.findFirst({
    where: {
      authorId: userId,
      withdrawnAt: null,
      moderatedAt: null,
      prediction: {
        is: {
          userId,
          symbol,
          sessionDate,
        },
      },
    },
    select: {
      id: true,
      content: true,
      prediction: {
        select: {
          id: true,
          symbol: true,
          direction: true,
          pointsBet: true,
          sessionDate: true,
          status: true,
        },
      },
    },
  });

  if (!comment?.prediction) {
    throw new Error(labels.comment_not_editable);
  }

  return {
    id: comment.id,
    content: comment.content as JSONContent,
    prediction: comment.prediction,
  };
}
