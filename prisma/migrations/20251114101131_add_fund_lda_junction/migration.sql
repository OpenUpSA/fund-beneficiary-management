-- CreateEnum
CREATE TYPE "FundLDAStatus" AS ENUM ('Paused', 'Active', 'Cancelled');

-- CreateTable
CREATE TABLE "FundLocalDevelopmentAgency" (
    "id" SERIAL NOT NULL,
    "fundId" INTEGER NOT NULL,
    "localDevelopmentAgencyId" INTEGER NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "fundingStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fundingEnd" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fundingStatus" "FundLDAStatus" NOT NULL DEFAULT 'Active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FundLocalDevelopmentAgency_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FundLocalDevelopmentAgency_fundId_localDevelopmentAgencyId_key" ON "FundLocalDevelopmentAgency"("fundId", "localDevelopmentAgencyId");

-- AddForeignKey
ALTER TABLE "FundLocalDevelopmentAgency" ADD CONSTRAINT "FundLocalDevelopmentAgency_fundId_fkey" FOREIGN KEY ("fundId") REFERENCES "Fund"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FundLocalDevelopmentAgency" ADD CONSTRAINT "FundLocalDevelopmentAgency_localDevelopmentAgencyId_fkey" FOREIGN KEY ("localDevelopmentAgencyId") REFERENCES "LocalDevelopmentAgency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
