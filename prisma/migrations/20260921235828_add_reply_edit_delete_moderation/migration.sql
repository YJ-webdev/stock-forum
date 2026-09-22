-- AlterTable
ALTER TABLE "Reply" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "editedAt" TIMESTAMP(3),
ADD COLUMN     "moderatedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Reply_deletedAt_idx" ON "Reply"("deletedAt");

-- CreateIndex
CREATE INDEX "Reply_moderatedAt_idx" ON "Reply"("moderatedAt");
