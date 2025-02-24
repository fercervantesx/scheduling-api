/*
  Warnings:

  - Added the required column `bookedBy` to the `Appointment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `bookedByName` to the `Appointment` table without a default value. This is not possible if the table is not empty.

*/
-- First add the columns as nullable
ALTER TABLE "Appointment" ADD COLUMN "bookedBy" TEXT;
ALTER TABLE "Appointment" ADD COLUMN "bookedByName" TEXT;

-- Update existing records with default values
UPDATE "Appointment" SET
  "bookedBy" = 'legacy@appointment.com',
  "bookedByName" = 'Legacy Appointment'
WHERE "bookedBy" IS NULL;

-- Make the columns required
ALTER TABLE "Appointment" ALTER COLUMN "bookedBy" SET NOT NULL;
ALTER TABLE "Appointment" ALTER COLUMN "bookedByName" SET NOT NULL;
