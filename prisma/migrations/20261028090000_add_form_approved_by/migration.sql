-- AlterTable
ALTER TABLE "LocalDevelopmentAgencyForm" ADD COLUMN     "approvedById" INTEGER;

-- AddForeignKey
ALTER TABLE "LocalDevelopmentAgencyForm" ADD CONSTRAINT "LocalDevelopmentAgencyForm_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
