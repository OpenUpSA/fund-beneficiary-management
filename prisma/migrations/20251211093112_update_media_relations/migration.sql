-- DropForeignKey
ALTER TABLE "Media" DROP CONSTRAINT "Media_localDevelopmentAgencyId_fkey";

-- AlterTable
ALTER TABLE "Media" ADD COLUMN     "fundId" INTEGER,
ADD COLUMN     "funderId" INTEGER,
ADD COLUMN     "localDevelopmentAgencyFormId" INTEGER,
ALTER COLUMN "localDevelopmentAgencyId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Media" ADD CONSTRAINT "Media_localDevelopmentAgencyId_fkey" FOREIGN KEY ("localDevelopmentAgencyId") REFERENCES "LocalDevelopmentAgency"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Media" ADD CONSTRAINT "Media_localDevelopmentAgencyFormId_fkey" FOREIGN KEY ("localDevelopmentAgencyFormId") REFERENCES "LocalDevelopmentAgencyForm"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Media" ADD CONSTRAINT "Media_fundId_fkey" FOREIGN KEY ("fundId") REFERENCES "Fund"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Media" ADD CONSTRAINT "Media_funderId_fkey" FOREIGN KEY ("funderId") REFERENCES "Funder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
