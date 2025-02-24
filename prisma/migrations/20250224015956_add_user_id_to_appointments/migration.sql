/*
  Warnings:

  - Added the required column `userId` to the `Appointment` table without a default value. This is not possible if the table is not empty.

*/
-- First add the column as nullable
ALTER TABLE "Appointment" ADD COLUMN "userId" TEXT;

-- Update existing records with a default value
UPDATE "Appointment" SET
  "userId" = 'legacy_user'
WHERE "userId" IS NULL;

-- Make the column required
ALTER TABLE "Appointment" ALTER COLUMN "userId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Appointment_userId_startTime_idx" ON "Appointment"("userId", "startTime");
