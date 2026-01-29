-- CreateEnum
CREATE TYPE "FormTemplateType" AS ENUM ('APPLICATION', 'REPORT');

-- AlterTable
ALTER TABLE "FormTemplate" ADD COLUMN     "includeAdminFeedback" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "linkedFormTemplateId" INTEGER,
ADD COLUMN     "sidebarConfig" JSONB NOT NULL DEFAULT '{"amount": true, "status": true, "startDate": true, "endDate": true}',
ADD COLUMN     "templateType" "FormTemplateType" NOT NULL DEFAULT 'APPLICATION';

-- AddForeignKey
ALTER TABLE "FormTemplate" ADD CONSTRAINT "FormTemplate_linkedFormTemplateId_fkey" FOREIGN KEY ("linkedFormTemplateId") REFERENCES "FormTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
