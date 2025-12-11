-- CreateEnum
CREATE TYPE "FundAmountType" AS ENUM ('USE_DEFAULT', 'AD_HOC');

-- AlterTable
ALTER TABLE "Fund" ADD COLUMN     "defaultAmount" MONEY;

-- AlterTable
ALTER TABLE "FundLocalDevelopmentAgency" ADD COLUMN     "amount" MONEY,
ADD COLUMN     "amountType" "FundAmountType" NOT NULL DEFAULT 'USE_DEFAULT';
