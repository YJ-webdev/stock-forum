// app/actions/ai-market-brief.ts

"use server";

import { auth } from "@/auth";
import { generateMarketBrief } from "@/lib/ai/generate-market-brief";
import { prisma } from "@/lib/prisma";

export async function getAiBriefMarkets() {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  return prisma.marketAsset.findMany({
    select: {
      id: true,
      symbol: true,
      displaySymbol: true,
      name: true,
      category: true,
      assetType: true,
      aiBriefEnabled: true,

      aiBrief: {
        select: {
          lastCheckedAt: true,
          publishedAt: true,
        },
      },
    },

    orderBy: {
      name: "asc",
    },
  });
}

export async function setAiBriefEnabled(symbol: string, enabled: boolean) {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  return prisma.marketAsset.update({
    where: {
      symbol,
    },

    data: {
      aiBriefEnabled: enabled,
    },

    select: {
      symbol: true,
      aiBriefEnabled: true,
    },
  });
}

export async function testGenerateAiMarketBrief() {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  const market = await prisma.marketAsset.findUnique({
    where: {
      symbol: "^N225",
    },

    select: {
      symbol: true,
      name: true,
      displaySymbol: true,
      lastPrice: true,
      change: true,
      changePercent: true,
      high: true,
      low: true,
    },
  });

  if (!market) {
    throw new Error("Nikkei 225 market asset not found.");
  }

  const result = await generateMarketBrief({
    symbol: market.symbol,
    name: market.name,
    displaySymbol: market.displaySymbol,

    marketData: {
      lastPrice: Number(market.lastPrice),
      change: Number(market.change),
      changePercent: Number(market.changePercent),
      high: Number(market.high),
      low: Number(market.low),
    },
  });

  const now = new Date();

  const sources = result.sources.map((source) => ({
    title: source.title,
    url: source.url,
  }));

  await prisma.marketAiBrief.upsert({
    where: {
      marketSymbol: market.symbol,
    },

    create: {
      marketSymbol: market.symbol,
      content: JSON.stringify(result.brief),
      sources,
      lastCheckedAt: now,
      publishedAt: now,
    },

    update: {
      content: JSON.stringify(result.brief),
      sources,
      lastCheckedAt: now,
      publishedAt: now,
    },
  });

  return result;
}
