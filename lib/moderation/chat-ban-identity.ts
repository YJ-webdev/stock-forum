import "server-only";

import { createHmac } from "node:crypto";

export function getChatBanIdentityHash(
  provider: string,
  providerAccountId: string,
) {
  const secret = process.env.CHAT_BAN_HASH_SECRET;

  if (!secret) {
    throw new Error("CHAT_BAN_HASH_SECRET is not configured.");
  }

  return createHmac("sha256", secret)
    .update(JSON.stringify([provider, providerAccountId]))
    .digest("hex");
}
