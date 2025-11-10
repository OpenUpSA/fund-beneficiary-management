-- CreateEnum
CREATE TYPE "FundingCalculationType" AS ENUM ('total_funded_amount', 'lda_funding_per_month');

-- AlterTable
ALTER TABLE "Fund" ADD COLUMN     "fundingCalculationType" "FundingCalculationType" NOT NULL DEFAULT 'total_funded_amount';
