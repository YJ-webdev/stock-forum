/*
  Warnings:

  - You are about to drop the column `deletedAt` on the `Reply` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Reply_deletedAt_idx";

-- AlterTable
ALTER TABLE "Reply" DROP COLUMN "deletedAt",
ADD COLUMN     "parentId" TEXT;

-- CreateIndex
CREATE INDEX "Reply_parentId_createdAt_idx" ON "Reply"("parentId", "createdAt");

-- AddForeignKey
ALTER TABLE "Reply" ADD CONSTRAINT "Reply_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Reply"("id") ON DELETE CASCADE ON UPDATE CASCADE;
