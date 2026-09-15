"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

interface CreatePostInput {
  title: string;
  content: object;
  categoryId: string;
  stockTicker?: string;
}

export async function createPost({
  title,
  content,
  categoryId,
  stockTicker,
}: CreatePostInput) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("You must be logged in to post.");
  }

  const cleanTitle = title.trim();

  if (!cleanTitle) {
    throw new Error("Title is required.");
  }

  if (!categoryId) {
    throw new Error("Category is required.");
  }

  const category = await prisma.forumCategory.findUnique({
    where: {
      id: categoryId,
    },
    select: {
      id: true,
    },
  });

  if (!category) {
    throw new Error("Invalid category.");
  }

  const post = await prisma.post.create({
    data: {
      title: cleanTitle,
      content,
      categoryId,
      authorId: session.user.id,
      stockTicker: stockTicker?.trim().toUpperCase() || null,
    },
    select: {
      id: true,
    },
  });

  return post;
}
