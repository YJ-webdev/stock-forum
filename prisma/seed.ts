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

const demoUsers = [
  {
    name: "Alex Trader",
    email: "trader@example.com",
    country: "US",
    cash: 15000,
    pnl: 2500,
  },
  {
    name: "Min-jun Kim",
    email: "kim@example.com",
    country: "KR",
    cash: 12000,
    pnl: 1100,
  },
  {
    name: "Elena Rostova",
    email: "elena@example.com",
    country: "DE",
    cash: 9500,
    pnl: -500,
  },
  {
    name: "Kenji Sato",
    email: "kenji@example.com",
    country: "JP",
    cash: 18000,
    pnl: 4200,
  },
];

async function main() {
  console.log("🌱 Starting seeding...");

  // 1. Seed Market Assets
  for (const asset of initialAssets) {
    await prisma.marketAsset.upsert({
      where: { symbol: asset.symbol },
      update: asset,
      create: asset,
    });
  }

  // 2. Seed Forum Categories
  const cryptoCategory = await prisma.forumCategory.upsert({
    where: { slug: "crypto" },
    update: {},
    create: {
      name: "Crypto Discussion",
      slug: "crypto",
      description: "Talk about BTC, ETH, and altcoins.",
    },
  });

  await prisma.forumCategory.upsert({
    where: { slug: "stocks" },
    update: {},
    create: {
      name: "Stock Market",
      slug: "stocks",
      description: "Equities, S&P 500, Nasdaq, and market trends.",
    },
  });

  // 3. Seed Demo Users, Balances, and Initial Trades
  let primaryDemoUser = null;

  for (const u of demoUsers) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { country: u.country },
      create: {
        name: u.name,
        email: u.email,
        country: u.country,
      },
    });

    // Seed Account Balance for each user
    await prisma.accountBalance.upsert({
      where: { userId: user.id },
      update: {
        cash: u.cash,
        pnl: u.pnl,
      },
      create: {
        userId: user.id,
        cash: u.cash,
        pnl: u.pnl,
      },
    });

    // Seed sample open trade if user has none
    const existingTrade = await prisma.trade.findFirst({
      where: { userId: user.id },
    });

    if (!existingTrade) {
      await prisma.trade.create({
        data: {
          userId: user.id,
          symbol: "BTCUSD",
          type: "BUY",
          status: "OPEN",
          quantity: 0.5,
          entryPrice: 63000.0,
        },
      });
    }

    if (u.email === "trader@example.com") {
      primaryDemoUser = user;
    }
  }

  // 4. Seed Initial Post
  if (primaryDemoUser) {
    const existingPost = await prisma.post.findFirst({
      where: { title: "Bitcoin breaks key resistance level" },
    });

    if (!existingPost) {
      await prisma.post.create({
        data: {
          title: "Bitcoin breaks key resistance level",
          content:
            "Looking at the 4-hour chart, momentum seems strong for another push.",
          stockTicker: "BTCUSD",
          authorId: primaryDemoUser.id,
          categoryId: cryptoCategory.id,
        },
      });
    }
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
