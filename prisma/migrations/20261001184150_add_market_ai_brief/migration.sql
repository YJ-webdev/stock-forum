-- AlterTable
ALTER TABLE "MarketAsset" ADD COLUMN     "aiBriefEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "MarketAiBrief" (
    "id" TEXT NOT NULL,
    "marketSymbol" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sources" JSONB,
    "lastCheckedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketAiBrief_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MarketAiBrief_marketSymbol_key" ON "MarketAiBrief"("marketSymbol");

-- CreateIndex
CREATE INDEX "MarketAiBrief_publishedAt_idx" ON "MarketAiBrief"("publishedAt");

-- AddForeignKey
ALTER TABLE "MarketAiBrief" ADD CONSTRAINT "MarketAiBrief_marketSymbol_fkey" FOREIGN KEY ("marketSymbol") REFERENCES "MarketAsset"("symbol") ON DELETE CASCADE ON UPDATE CASCADE;
