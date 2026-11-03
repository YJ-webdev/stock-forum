import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

import { getMarketNews } from "@/app/actions/news";

import { prisma } from "@/lib/prisma";
import { NewsFeed } from "@/app/components/news/news-feed";

interface PageProps {
  params: Promise<{
    symbol: string;
  }>;
}

const getMarket = cache(async (symbol: string) => {
  const market = await prisma.marketAsset.findUnique({
    where: { symbol },
    select: {
      symbol: true,
      name: true,
    },
  });

  if (!market) {
    notFound();
  }

  return market;
});

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { symbol } = await params;
  const market = await getMarket(decodeURIComponent(symbol));

  const title = `${market.name} News`;
  const description = `Browse recent news and market headlines for ${market.name} on BullBearVote.`;

  const url = `/market/${encodeURIComponent(market.symbol)}/news`;
  const shareTitle = `${title} | BullBearVote`;

  return {
    title,
    description,

    alternates: {
      canonical: url,
    },

    openGraph: {
      type: "website",
      siteName: "BullBearVote",
      url,
      title: shareTitle,
      description,
    },

    twitter: {
      card: "summary_large_image",
      title: shareTitle,
      description,
    },
  };
}

export default async function MarketNewsPage({ params }: PageProps) {
  const { symbol } = await params;
  const market = await getMarket(decodeURIComponent(symbol));
  const news = await getMarketNews(market.symbol);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <NewsFeed
        key={market.symbol}
        initialNews={news}
        marketName={market.name}
      />
    </main>
  );
}
