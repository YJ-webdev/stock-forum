"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { JSONContent } from "@tiptap/react";
import { getFirstImage } from "@/lib/utils/post-content";
import { detectPostMarket } from "@/lib/utils/detect-post-market";
import { createSlug } from "@/lib/utils/slugify";

export interface CreatePostInput {
  title: string | null;
  content: JSONContent;
  thumbnail?: string | null;
}

export async function createPost({
  title,
  content,
  thumbnail,
}: CreatePostInput) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("You must be logged in to post.");
  }

  const cleanTitle = title?.trim() ?? "";
  if (!cleanTitle) {
    throw new Error("Title is required.");
  }

  const slug = createSlug(cleanTitle);

  // Detect one primary asset
  const detectedMarket = detectPostMarket(cleanTitle, content);

  // Make sure the detected asset exists in MarketAsset
  if (detectedMarket) {
    await prisma.marketAsset.upsert({
      where: {
        symbol: detectedMarket.symbol,
      },

      update: {
        name: detectedMarket.name,

        displaySymbol: detectedMarket.displaySymbol,
        category: detectedMarket.region,
        assetType: detectedMarket.assetType,
        timezone: detectedMarket.timezone ?? "UTC",
      },

      create: {
        symbol: detectedMarket.symbol,
        name: detectedMarket.name,
        displaySymbol: detectedMarket.displaySymbol,
        category: detectedMarket.region,
        assetType: detectedMarket.assetType,
        timezone: detectedMarket.timezone ?? "UTC",
      },
    });
  }

  return prisma.post.create({
    data: {
      title: cleanTitle,
      content,
      thumbnail: thumbnail ?? getFirstImage(content),
      slug: slug,
      authorId: session.user.id,
      assetSymbol: detectedMarket?.symbol ?? null,
    },

    select: {
      id: true,
      title: true,
      thumbnail: true,
      slug: true,
      asset: {
        select: {
          name: true,
          symbol: true,
          displaySymbol: true,
        },
      },
    },
  });
}

export async function getMostViewedPosts(limit = 5) {
  return prisma.post.findMany({
    take: limit,

    orderBy: {
      viewCount: "desc",
    },

    select: {
      id: true,
      title: true,
      slug: true,
      thumbnail: true,
      viewCount: true,
      createdAt: true,

      asset: {
        select: {
          name: true,
          symbol: true,
          displaySymbol: true,
        },
      },

      author: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
    },
  });
}
