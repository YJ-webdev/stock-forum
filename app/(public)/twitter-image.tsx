import { createMarketOg, OG_SIZE } from "@/lib/og/market-og";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const alt = "S&P 500 market overview | BullBearVote";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image() {
  return createMarketOg("^GSPC");
}
