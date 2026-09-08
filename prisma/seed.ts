import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

const initialAssets = [
  {
    symbol: "US500",
    name: "S&P 500",
    category: "지수",
    logoUrl:
      "https://your-vercel-blob-url.public.blob.vercel-storage.com/logos/sp500.png",
    lastPrice: 5460.25,
    change: 24.1,
    changePercent: 0.44,
    high: 5472.1,
    low: 5440.0,
    volume: "3.2B",
  },
  {
    symbol: "US100",
    name: "나스닥 100",
    category: "지수",
    logoUrl:
      "https://your-vercel-blob-url.public.blob.vercel-storage.com/logos/nasdaq.png",
    lastPrice: 19720.8,
    change: 182.3,
    changePercent: 0.93,
    high: 19800.5,
    low: 19610.2,
    volume: "4.1B",
  },
  {
    symbol: "BTCUSD",
    name: "비트코인",
    category: "암호화폐",
    logoUrl:
      "https://your-vercel-blob-url.public.blob.vercel-storage.com/logos/bitcoin.png",
    lastPrice: 64250.0,
    change: 1240.0,
    changePercent: 1.97,
    high: 65100.0,
    low: 62800.0,
    volume: "28.4B",
  },
];

async function main() {
  console.log("🌱 Starting seeding...");

  for (const asset of initialAssets) {
    await prisma.marketAsset.upsert({
      where: { symbol: asset.symbol },
      update: asset,
      create: asset,
    });
  }

  console.log("✅ Seeding finished successfully.");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
