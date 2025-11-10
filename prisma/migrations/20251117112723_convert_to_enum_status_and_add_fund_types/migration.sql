/*
  Warnings:

  - You are about to drop the column `fundingStatusId` on the `Funder` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Funder" DROP CONSTRAINT "Funder_fundingStatusId_fkey";

-- AlterTable
ALTER TABLE "Funder" DROP COLUMN "fundingStatusId",
ADD COLUMN     "fundingStatus" "FundStatus" NOT NULL DEFAULT 'Active';
