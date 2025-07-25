-- AlterTable
ALTER TABLE "LocalDevelopmentAgencyForm" ADD COLUMN     "createdById" INTEGER;

-- AddForeignKey
ALTER TABLE "LocalDevelopmentAgencyForm" ADD CONSTRAINT "LocalDevelopmentAgencyForm_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
