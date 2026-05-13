/*
  Warnings:

  - The values [RETRY,PENDING] on the enum `OffRampStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "OffRampStatus_new" AS ENUM ('QUEUED', 'PROCESSING', 'SUCCESS', 'FAILED', 'RETRYPENDING');
ALTER TABLE "OffRampTransaction" ALTER COLUMN "status" TYPE "OffRampStatus_new" USING ("status"::text::"OffRampStatus_new");
ALTER TYPE "OffRampStatus" RENAME TO "OffRampStatus_old";
ALTER TYPE "OffRampStatus_new" RENAME TO "OffRampStatus";
DROP TYPE "public"."OffRampStatus_old";
COMMIT;

-- CreateTable
CREATE TABLE "MerchantPayment" (
    "id" SERIAL NOT NULL,
    "amount" INTEGER NOT NULL,
    "merchantId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MerchantPayment_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "MerchantPayment" ADD CONSTRAINT "MerchantPayment_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MerchantPayment" ADD CONSTRAINT "MerchantPayment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
