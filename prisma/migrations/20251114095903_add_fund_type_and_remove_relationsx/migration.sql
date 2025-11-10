/*
  Warnings:

  - You are about to drop the `_FundToLocalDevelopmentAgency` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_FundToLocation` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_FunderToFund` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_FundToLocalDevelopmentAgency" DROP CONSTRAINT "_FundToLocalDevelopmentAgency_A_fkey";

-- DropForeignKey
ALTER TABLE "_FundToLocalDevelopmentAgency" DROP CONSTRAINT "_FundToLocalDevelopmentAgency_B_fkey";

-- DropForeignKey
ALTER TABLE "_FundToLocation" DROP CONSTRAINT "_FundToLocation_A_fkey";

-- DropForeignKey
ALTER TABLE "_FundToLocation" DROP CONSTRAINT "_FundToLocation_B_fkey";

-- DropForeignKey
ALTER TABLE "_FunderToFund" DROP CONSTRAINT "_FunderToFund_A_fkey";

-- DropForeignKey
ALTER TABLE "_FunderToFund" DROP CONSTRAINT "_FunderToFund_B_fkey";

-- DropTable
DROP TABLE "_FundToLocalDevelopmentAgency";

-- DropTable
DROP TABLE "_FundToLocation";

-- DropTable
DROP TABLE "_FunderToFund";
