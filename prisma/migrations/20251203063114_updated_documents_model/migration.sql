-- DropForeignKey
ALTER TABLE "Document" DROP CONSTRAINT "Document_localDevelopmentAgencyId_fkey";

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "fundId" INTEGER,
ADD COLUMN     "funderId" INTEGER,
ADD COLUMN     "localDevelopmentAgencyFormId" INTEGER,
ALTER COLUMN "localDevelopmentAgencyId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_localDevelopmentAgencyId_fkey" FOREIGN KEY ("localDevelopmentAgencyId") REFERENCES "LocalDevelopmentAgency"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_localDevelopmentAgencyFormId_fkey" FOREIGN KEY ("localDevelopmentAgencyFormId") REFERENCES "LocalDevelopmentAgencyForm"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_fundId_fkey" FOREIGN KEY ("fundId") REFERENCES "Fund"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_funderId_fkey" FOREIGN KEY ("funderId") REFERENCES "Funder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
