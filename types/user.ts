import type { UserTier } from "@/generated/prisma/client";

export interface UserRanking {
  tier: UserTier;
  rank: number | null;
  netProfit: number;
  settledCount: number;
  wonCount: number;
  lostCount: number;
}

export interface User {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  nationality?: string | null;
  language?: string | null;
  role: "ADMIN" | "USER";
  statusMessage?: string | null;
  ranking: UserRanking | null;
  status: "ACTIVE" | "BANNED";
}
