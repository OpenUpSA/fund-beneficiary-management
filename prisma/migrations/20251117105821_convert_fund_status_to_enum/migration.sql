/*
  Warnings:

  - You are about to drop the column `fundingStatusId` on the `Fund` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "FundStatus" AS ENUM ('Paused', 'Active', 'Cancelled');

-- DropForeignKey
ALTER TABLE "Fund" DROP CONSTRAINT "Fund_fundingStatusId_fkey";

-- AlterTable
ALTER TABLE "Fund" DROP COLUMN "fundingStatusId",
ADD COLUMN     "fundingStatus" "FundStatus" NOT NULL DEFAULT 'Active';
