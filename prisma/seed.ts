import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

import { ALL_MARKET_SYMBOLS } from "../lib/data/market-symbols";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not defined.");
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log(`🌱 Seeding ${ALL_MARKET_SYMBOLS.length} market assets...`);

  for (const asset of ALL_MARKET_SYMBOLS) {
    await prisma.marketAsset.upsert({
      where: {
        symbol: asset.symbol,
      },

      update: {
        name: asset.name,
        displaySymbol: asset.displaySymbol ?? null,
        category: asset.region,
        assetType: asset.assetType,
        timezone: asset.timezone,
      },

      create: {
        symbol: asset.symbol,
        name: asset.name,
        displaySymbol: asset.displaySymbol ?? null,
        category: asset.region,
        assetType: asset.assetType,
        timezone: asset.timezone,
      },
    });

    console.log(`✅ ${asset.symbol} — ${asset.name}`);
  }

  console.log("🌱 Market asset seeding finished.");
}

main()
  .catch((error) => {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
