// scripts/reset-news-cache.ts

import { prisma } from "@/lib/prisma";

async function main() {
  const result = await prisma.marketAsset.updateMany({
    data: {
      newsLastFetchedAt: null,
    },
  });

  console.log(`Reset ${result.count} market news caches.`);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
