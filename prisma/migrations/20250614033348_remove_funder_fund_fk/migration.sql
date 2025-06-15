/*
  Warnings:

  - You are about to drop the column `funderId` on the `Fund` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Fund" DROP CONSTRAINT "Fund_funderId_fkey";

-- AlterTable
ALTER TABLE "Fund" DROP COLUMN "funderId";
