import type { MarketAsset } from "@/generated/prisma/client";

// Allow Date objects directly from Prisma
export type MarketAssetClient = Omit<MarketAsset, "createdAt" | "updatedAt"> & {
  createdAt: Date | string;
  updatedAt: Date | string;
};
