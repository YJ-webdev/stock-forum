"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getRecentPosts(limit = 10) {
  try {
    const posts = await prisma.post.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        author: {
          select: {
            name: true,
            image: true,
          },
        },
        category: {
          select: {
            name: true,
            slug: true,
          },
        },
        _count: {
          select: {
            comments: true,
            likes: true,
          },
        },
      },
    });

    return posts;
  } catch (error) {
    console.error("Failed to fetch posts:", error);
    return [];
  }
}

// Fetch posts filtered by category slug (or all posts if no slug provided)
export async function getForumPosts(categorySlug?: string, limit = 20) {
  try {
    const posts = await prisma.post.findMany({
      where: categorySlug ? { category: { slug: categorySlug } } : undefined,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        author: {
          select: {
            name: true,
            image: true,
          },
        },
        category: {
          select: {
            name: true,
            slug: true,
          },
        },
        _count: {
          select: {
            comments: true,
            likes: true,
          },
        },
      },
    });

    return posts;
  } catch (error) {
    console.error("Failed to fetch forum posts:", error);
    return [];
  }
}

export async function createPost(formData: FormData) {
  const title = formData.get("title") as string;
  const content = formData.get("content") as string;
  const stockTicker = formData.get("stockTicker") as string | null;
  const categoryId = formData.get("categoryId") as string;
  const authorId = formData.get("authorId") as string;

  if (!title || !content || !categoryId || !authorId) {
    throw new Error("Missing required fields");
  }

  const post = await prisma.post.create({
    data: {
      title,
      content,
      stockTicker,
      categoryId,
      authorId,
    },
  });

  revalidatePath("/");
  return post;
}
