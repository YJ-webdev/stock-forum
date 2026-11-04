"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type FeedbackCategoryInput = "suggestion" | "bug" | "other";

interface SubmitFeedbackInput {
  category: FeedbackCategoryInput;
  message: string;
}

type SubmitFeedbackResult =
  | { success: true }
  | { success: false; error: string };

const CATEGORY_MAP = {
  suggestion: "SUGGESTION",
  bug: "BUG",
  other: "OTHER",
} as const;

const MAX_MESSAGE_LENGTH = 2000;
const MIN_MESSAGE_LENGTH = 5;
const COOLDOWN_MS = 60_000;

export async function submitFeedback({
  category,
  message,
}: SubmitFeedbackInput): Promise<SubmitFeedbackResult> {
  if (
    typeof category !== "string" ||
    !Object.prototype.hasOwnProperty.call(CATEGORY_MAP, category)
  ) {
    return {
      success: false,
      error: "Invalid feedback category.",
    };
  }

  if (typeof message !== "string") {
    return {
      success: false,
      error: "Invalid feedback message.",
    };
  }

  const trimmedMessage = message.trim();

  if (
    trimmedMessage.length < MIN_MESSAGE_LENGTH ||
    trimmedMessage.length > MAX_MESSAGE_LENGTH
  ) {
    return {
      success: false,
      error: "Feedback must contain 5–2000 characters.",
    };
  }

  const session = await auth();
  const userId = session?.user?.id ?? null;

  try {
    // This check limits submissions by signed-in users.
    // Guest IP-based rate limiting is configured separately.
    if (userId) {
      const recentFeedback = await prisma.feedback.findFirst({
        where: {
          userId,
          createdAt: {
            gte: new Date(Date.now() - COOLDOWN_MS),
          },
        },
        select: { id: true },
      });

      if (recentFeedback) {
        return {
          success: false,
          error: "Please wait before sending another feedback.",
        };
      }
    }

    await prisma.$transaction(async (tx) => {
      const feedback = await tx.feedback.create({
        data: {
          category: CATEGORY_MAP[category],
          message: trimmedMessage,
          userId,
        },
        select: {
          id: true,
        },
      });

      const admins = await tx.user.findMany({
        where: {
          role: "ADMIN",
          status: "ACTIVE",
          deletedAt: null,
        },
        select: {
          id: true,
        },
      });

      if (admins.length === 0) return;

      await tx.notification.createMany({
        data: admins.map((admin) => ({
          userId: admin.id,
          type: "FEEDBACK_RECEIVED" as const,
          title: `New Feedback · ${category}`,
          message: trimmedMessage.slice(0, 300),
          feedbackId: feedback.id,
        })),
      });
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to submit feedback:", error);

    return {
      success: false,
      error: "Unable to send feedback. Please try again.",
    };
  }
}
