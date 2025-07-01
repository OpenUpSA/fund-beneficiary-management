-- CreateEnum
CREATE TYPE "RegistrationStatus" AS ENUM ('Not registered', 'Registered NPO', 'Registered BPO');

-- CreateEnum
CREATE TYPE "OrganisationStatus" AS ENUM ('Active', 'Inactive', 'Archived');

-- DropForeignKey
ALTER TABLE "LocalDevelopmentAgency" DROP CONSTRAINT "LocalDevelopmentAgency_developmentStageId_fkey";

-- DropForeignKey
ALTER TABLE "LocalDevelopmentAgency" DROP CONSTRAINT "LocalDevelopmentAgency_fundingStatusId_fkey";

-- DropForeignKey
ALTER TABLE "LocalDevelopmentAgency" DROP CONSTRAINT "LocalDevelopmentAgency_locationId_fkey";

-- AlterTable
ALTER TABLE "LocalDevelopmentAgency" ADD COLUMN     "organisationStatus" "OrganisationStatus" NOT NULL DEFAULT 'Active',
ADD COLUMN     "registrationCode" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "registrationDate" TIMESTAMP(3),
ADD COLUMN     "registrationStatus" "RegistrationStatus" NOT NULL DEFAULT 'Not registered',
ALTER COLUMN "about" SET DEFAULT '',
ALTER COLUMN "totalFundingRounds" SET DEFAULT 0,
ALTER COLUMN "developmentStageId" DROP NOT NULL,
ALTER COLUMN "fundingStatusId" DROP NOT NULL,
ALTER COLUMN "locationId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "LocalDevelopmentAgency" ADD CONSTRAINT "LocalDevelopmentAgency_developmentStageId_fkey" FOREIGN KEY ("developmentStageId") REFERENCES "DevelopmentStage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocalDevelopmentAgency" ADD CONSTRAINT "LocalDevelopmentAgency_fundingStatusId_fkey" FOREIGN KEY ("fundingStatusId") REFERENCES "FundingStatus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocalDevelopmentAgency" ADD CONSTRAINT "LocalDevelopmentAgency_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;
