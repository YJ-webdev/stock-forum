// In your ../data/type file
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
  id: string | number;
  title: string;
  href?: string;
  url?: string;
  source: string;
  sourceIcon?: string;
  timeAgo?: string;
  time?: string;
  category?: string;
  thumbnail?: string | null;
}
