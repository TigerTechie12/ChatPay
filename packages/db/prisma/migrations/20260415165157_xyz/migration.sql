/*
  Warnings:

  - You are about to drop the column `provider` on the `OffRampTransaction` table. All the data in the column will be lost.
  - You are about to drop the column `provider` on the `OnRampTransaction` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "OffRampTransaction" DROP COLUMN "provider";

-- AlterTable
ALTER TABLE "OnRampTransaction" DROP COLUMN "provider";
