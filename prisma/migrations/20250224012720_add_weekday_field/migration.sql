/*
  Warnings:

  - Added the required column `weekday` to the `Schedule` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Schedule_employeeId_locationId_startTime_endTime_idx";

-- AlterTable
ALTER TABLE "Schedule" ADD COLUMN     "weekday" TEXT NOT NULL,
ALTER COLUMN "startTime" SET DATA TYPE TEXT,
ALTER COLUMN "endTime" SET DATA TYPE TEXT;

-- CreateIndex
CREATE INDEX "Schedule_employeeId_locationId_weekday_idx" ON "Schedule"("employeeId", "locationId", "weekday");
