"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type FeedbackCategoryInput = "suggestion" | "bug" | "other";

interface SubmitFeedbackInput {
  category: FeedbackCategoryInput;
  message: string;
}

type FeedbackError =
  | "feedback_invalid_category"
  | "feedback_invalid_message"
  | "feedback_too_short"
  | "feedback_too_long"
  | "feedback_rate_limited"
  | "feedback_error";

type SubmitFeedbackResult =
  | { success: true }
  | { success: false; error: FeedbackError };

const CATEGORY_MAP = {
  suggestion: "SUGGESTION",
  bug: "BUG",
  other: "OTHER",
} as const;

const MIN_MESSAGE_LENGTH = 5;
const MAX_MESSAGE_LENGTH = 2000;
const COOLDOWN_MS = 60_000;

export async function submitFeedback(
  input: SubmitFeedbackInput,
): Promise<SubmitFeedbackResult> {
  const { category, message } = input ?? {};

  if (
    typeof category !== "string" ||
    !Object.prototype.hasOwnProperty.call(CATEGORY_MAP, category)
  ) {
    return {
      success: false,
      error: "feedback_invalid_category",
    };
  }

  if (typeof message !== "string") {
    return {
      success: false,
      error: "feedback_invalid_message",
    };
  }

  const trimmedMessage = message.trim();

  if (trimmedMessage.length < MIN_MESSAGE_LENGTH) {
    return {
      success: false,
      error: "feedback_too_short",
    };
  }

  if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
    return {
      success: false,
      error: "feedback_too_long",
    };
  }

  try {
    const session = await auth();
    const userId = session?.user?.id ?? null;

    const categoryValue = CATEGORY_MAP[category];

    // Limit repeat submissions from signed-in users.
    if (userId) {
      const recentNotification = await prisma.notification.findFirst({
        where: {
          type: "FEEDBACK_RECEIVED",
          actorId: userId,
          createdAt: {
            gte: new Date(Date.now() - COOLDOWN_MS),
          },
        },
        select: {
          id: true,
        },
      });

      if (recentNotification) {
        return {
          success: false,
          error: "feedback_rate_limited",
        };
      }
    }

    const admins = await prisma.user.findMany({
      where: {
        role: "ADMIN",
        status: "ACTIVE",
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (admins.length === 0) {
      console.error("Feedback submission failed: No active admins.");

      return {
        success: false,
        error: "feedback_error",
      };
    }

    await prisma.notification.createMany({
      data: admins.map((admin) => ({
        userId: admin.id,
        actorId: userId,
        type: "FEEDBACK_RECEIVED" as const,
        title: categoryValue,
        message: trimmedMessage,
      })),
    });

    return {
      success: true,
    };
  } catch (error) {
    console.error("Failed to submit feedback:", error);

    return {
      success: false,
      error: "feedback_error",
    };
  }
}
