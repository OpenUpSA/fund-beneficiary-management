-- AlterTable
ALTER TABLE "FormTemplate" ADD COLUMN     "linkedFormDueDays" INTEGER,
ADD COLUMN     "linkedFormTriggerStatusId" INTEGER;

-- AddForeignKey
ALTER TABLE "FormTemplate" ADD CONSTRAINT "FormTemplate_linkedFormTriggerStatusId_fkey" FOREIGN KEY ("linkedFormTriggerStatusId") REFERENCES "FormStatus"("id") ON DELETE SET NULL ON UPDATE CASCADE;
