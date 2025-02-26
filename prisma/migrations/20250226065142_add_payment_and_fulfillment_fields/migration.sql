-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "fulfillmentDate" TIMESTAMP(3),
ADD COLUMN     "paymentAmount" DOUBLE PRECISION,
ADD COLUMN     "paymentStatus" TEXT;
