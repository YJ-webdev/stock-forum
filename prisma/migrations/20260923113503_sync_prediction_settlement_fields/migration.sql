/*
  Warnings:

  - You are about to drop the column `settlementPrice` on the `Prediction` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[eventKey]` on the table `Notification` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'PREDICTION_PENDING';

-- DropIndex
DROP INDEX "Notification_predictionId_key";

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "eventKey" TEXT;

-- AlterTable
ALTER TABLE "Prediction" DROP COLUMN "settlementPrice",
ADD COLUMN     "settlementClose" DECIMAL(18,4);

-- CreateIndex
CREATE UNIQUE INDEX "Notification_eventKey_key" ON "Notification"("eventKey");

-- CreateIndex
CREATE INDEX "Notification_predictionId_idx" ON "Notification"("predictionId");
