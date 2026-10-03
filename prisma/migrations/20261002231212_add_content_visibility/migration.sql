-- CreateEnum
CREATE TYPE "ContentVisibility" AS ENUM ('PUBLIC', 'PRIVATE');

-- AlterTable
ALTER TABLE "Comment" ADD COLUMN     "visibility" "ContentVisibility" NOT NULL DEFAULT 'PUBLIC';

-- AlterTable
ALTER TABLE "Reply" ADD COLUMN     "visibility" "ContentVisibility" NOT NULL DEFAULT 'PUBLIC';
