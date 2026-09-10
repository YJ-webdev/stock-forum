import type { MarketAsset } from "@/generated/prisma/client";

export type MarketAssetClient = Omit<MarketAsset, "createdAt" | "updatedAt"> & {
  createdAt: Date | string;
  updatedAt: Date | string;
  price?: number;
  lastPrice?: number;
  change?: number;
  changePercent?: number;
  high?: number;
  low?: number;
  volume?: string;
};

export interface NewsItem {
  id: string;
  title: string;
  source: string;
  category: string;
  url?: string;
  sourceIcon?: string;
  thumbnail?: string; // Large cover image for the detail page
  content?: string; // Full script/article body text
  description?: string; // Fallback short summary
  timeAgo: string;
}
