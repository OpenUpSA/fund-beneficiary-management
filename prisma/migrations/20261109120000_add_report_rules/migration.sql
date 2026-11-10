-- CreateEnum
CREATE TYPE "ReportRuleKind" AS ENUM ('AFTER_STATUS', 'PERIODIC');

-- AlterTable
ALTER TABLE "LocalDevelopmentAgencyForm" ADD COLUMN     "reportPeriod" INTEGER,
ADD COLUMN     "reportRuleId" INTEGER;

-- CreateTable
CREATE TABLE "ReportRule" (
    "id" SERIAL NOT NULL,
    "parentCategoryId" INTEGER NOT NULL,
    "reportCategoryId" INTEGER NOT NULL,
    "kind" "ReportRuleKind" NOT NULL,
    "triggerStatusId" INTEGER,
    "dueDays" INTEGER,
    "periodMonths" INTEGER,
    "opensDaysBefore" INTEGER NOT NULL DEFAULT 14,
    "dueDaysAfterPeriodEnd" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportRuleOverride" (
    "id" SERIAL NOT NULL,
    "reportRuleId" INTEGER NOT NULL,
    "formTemplateId" INTEGER NOT NULL,
    "enabled" BOOLEAN,
    "triggerStatusId" INTEGER,
    "dueDays" INTEGER,
    "periodMonths" INTEGER,
    "opensDaysBefore" INTEGER,
    "dueDaysAfterPeriodEnd" INTEGER,
    "reportTemplateId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportRuleOverride_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReportRuleOverride_reportRuleId_formTemplateId_key" ON "ReportRuleOverride"("reportRuleId", "formTemplateId");

-- CreateIndex
CREATE UNIQUE INDEX "LocalDevelopmentAgencyForm_linkedFormId_reportRuleId_report_key" ON "LocalDevelopmentAgencyForm"("linkedFormId", "reportRuleId", "reportPeriod");

-- AddForeignKey
ALTER TABLE "LocalDevelopmentAgencyForm" ADD CONSTRAINT "LocalDevelopmentAgencyForm_reportRuleId_fkey" FOREIGN KEY ("reportRuleId") REFERENCES "ReportRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportRule" ADD CONSTRAINT "ReportRule_parentCategoryId_fkey" FOREIGN KEY ("parentCategoryId") REFERENCES "FormCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportRule" ADD CONSTRAINT "ReportRule_reportCategoryId_fkey" FOREIGN KEY ("reportCategoryId") REFERENCES "FormCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportRule" ADD CONSTRAINT "ReportRule_triggerStatusId_fkey" FOREIGN KEY ("triggerStatusId") REFERENCES "FormStatus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportRuleOverride" ADD CONSTRAINT "ReportRuleOverride_reportRuleId_fkey" FOREIGN KEY ("reportRuleId") REFERENCES "ReportRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportRuleOverride" ADD CONSTRAINT "ReportRuleOverride_formTemplateId_fkey" FOREIGN KEY ("formTemplateId") REFERENCES "FormTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportRuleOverride" ADD CONSTRAINT "ReportRuleOverride_triggerStatusId_fkey" FOREIGN KEY ("triggerStatusId") REFERENCES "FormStatus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportRuleOverride" ADD CONSTRAINT "ReportRuleOverride_reportTemplateId_fkey" FOREIGN KEY ("reportTemplateId") REFERENCES "FormTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

