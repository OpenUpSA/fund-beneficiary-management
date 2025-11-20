-- CreateEnum
CREATE TYPE "FundType" AS ENUM ('CORE_FUND', 'PROJECT_FUND');

-- AlterTable
ALTER TABLE "Fund" ADD COLUMN     "fundType" "FundType" NOT NULL DEFAULT 'CORE_FUND';
