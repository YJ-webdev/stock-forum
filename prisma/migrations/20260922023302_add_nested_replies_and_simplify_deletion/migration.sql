/*
  Warnings:

  - You are about to drop the column `deletedAt` on the `Comment` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Comment_deletedAt_idx";

-- AlterTable
ALTER TABLE "Comment" DROP COLUMN "deletedAt";
