"use server";

import { prisma } from "@/lib/prisma";

export async function getForumCategories() {
  try {
    return await prisma.forumCategory.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { posts: true },
        },
      },
    });
  } catch (error) {
    console.error("Failed to fetch forum categories:", error);
    return [];
  }
}
