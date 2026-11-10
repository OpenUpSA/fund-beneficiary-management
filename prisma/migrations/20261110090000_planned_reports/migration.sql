-- Report timing moves from the rule (parent category → report category) onto the
-- report category itself; the rule becomes a plain link. Each form stores the
-- reports it will get (PlannedReport), with real dates approvers can edit.

-- CreateEnum
CREATE TYPE "PlannedReportStatus" AS ENUM ('PLANNED', 'SKIPPED', 'CREATED');

-- AlterTable: base timing on report categories
ALTER TABLE "FormCategory" ADD COLUMN     "reportDueDays" INTEGER,
ADD COLUMN     "reportDueDaysAfterPeriodEnd" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "reportKind" "ReportRuleKind",
ADD COLUMN     "reportOpensDaysBefore" INTEGER NOT NULL DEFAULT 14,
ADD COLUMN     "reportPeriodMonths" INTEGER,
ADD COLUMN     "reportTriggerStatusId" INTEGER;

-- Each report category takes the timing of the first rule that used it
UPDATE "FormCategory" c SET
    "reportKind" = r."kind",
    "reportTriggerStatusId" = r."triggerStatusId",
    "reportDueDays" = r."dueDays",
    "reportPeriodMonths" = r."periodMonths",
    "reportOpensDaysBefore" = r."opensDaysBefore",
    "reportDueDaysAfterPeriodEnd" = r."dueDaysAfterPeriodEnd"
FROM (
    SELECT DISTINCT ON ("reportCategoryId") *
    FROM "ReportRule"
    ORDER BY "reportCategoryId", "id"
) r
WHERE c."id" = r."reportCategoryId";

-- CreateTable
CREATE TABLE "PlannedReport" (
    "id" SERIAL NOT NULL,
    "parentFormId" INTEGER NOT NULL,
    "reportRuleId" INTEGER,
    "reportCategoryId" INTEGER NOT NULL,
    "reportTemplateId" INTEGER,
    "period" INTEGER,
    "label" TEXT NOT NULL,
    "triggerStatusId" INTEGER,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "opensOn" TIMESTAMP(3),
    "dueOn" TIMESTAMP(3),
    "dueDays" INTEGER,
    "status" "PlannedReportStatus" NOT NULL DEFAULT 'PLANNED',
    "edited" BOOLEAN NOT NULL DEFAULT false,
    "reportFormId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlannedReport_pkey" PRIMARY KEY ("id")
);

-- Reports the rules already created become CREATED planned reports
INSERT INTO "PlannedReport" (
    "parentFormId", "reportRuleId", "reportCategoryId", "period", "label",
    "periodStart", "periodEnd", "dueOn", "status", "reportFormId", "updatedAt"
)
SELECT f."linkedFormId", f."reportRuleId", r."reportCategoryId", f."reportPeriod", f."title",
    f."fundingStart", f."fundingEnd", f."dueDate", 'CREATED', f."id", CURRENT_TIMESTAMP
FROM "LocalDevelopmentAgencyForm" f
JOIN "ReportRule" r ON r."id" = f."reportRuleId"
WHERE f."linkedFormId" IS NOT NULL;

-- One link per parent/report category pair (rules of different kinds collapse into the oldest)
UPDATE "PlannedReport" p SET "reportRuleId" = keep."id"
FROM "ReportRule" r
JOIN (
    SELECT MIN("id") AS "id", "parentCategoryId", "reportCategoryId" FROM "ReportRule"
    GROUP BY "parentCategoryId", "reportCategoryId"
) keep ON keep."parentCategoryId" = r."parentCategoryId" AND keep."reportCategoryId" = r."reportCategoryId"
WHERE p."reportRuleId" = r."id" AND r."id" <> keep."id";

DELETE FROM "ReportRule" r
USING "ReportRule" older
WHERE older."parentCategoryId" = r."parentCategoryId"
  AND older."reportCategoryId" = r."reportCategoryId"
  AND older."id" < r."id";

-- DropForeignKey
ALTER TABLE "LocalDevelopmentAgencyForm" DROP CONSTRAINT "LocalDevelopmentAgencyForm_reportRuleId_fkey";

-- DropForeignKey
ALTER TABLE "ReportRule" DROP CONSTRAINT "ReportRule_triggerStatusId_fkey";

-- DropIndex
DROP INDEX "LocalDevelopmentAgencyForm_linkedFormId_reportRuleId_report_key";

-- AlterTable
ALTER TABLE "LocalDevelopmentAgencyForm" DROP COLUMN "reportPeriod",
DROP COLUMN "reportRuleId";

-- AlterTable
ALTER TABLE "ReportRule" DROP COLUMN "dueDays",
DROP COLUMN "dueDaysAfterPeriodEnd",
DROP COLUMN "kind",
DROP COLUMN "opensDaysBefore",
DROP COLUMN "periodMonths",
DROP COLUMN "triggerStatusId";

-- CreateIndex
CREATE UNIQUE INDEX "PlannedReport_reportFormId_key" ON "PlannedReport"("reportFormId");

-- CreateIndex
CREATE INDEX "PlannedReport_status_opensOn_idx" ON "PlannedReport"("status", "opensOn");

-- CreateIndex
CREATE INDEX "PlannedReport_parentFormId_idx" ON "PlannedReport"("parentFormId");

-- CreateIndex
CREATE UNIQUE INDEX "ReportRule_parentCategoryId_reportCategoryId_key" ON "ReportRule"("parentCategoryId", "reportCategoryId");

-- AddForeignKey
ALTER TABLE "FormCategory" ADD CONSTRAINT "FormCategory_reportTriggerStatusId_fkey" FOREIGN KEY ("reportTriggerStatusId") REFERENCES "FormStatus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlannedReport" ADD CONSTRAINT "PlannedReport_parentFormId_fkey" FOREIGN KEY ("parentFormId") REFERENCES "LocalDevelopmentAgencyForm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlannedReport" ADD CONSTRAINT "PlannedReport_reportRuleId_fkey" FOREIGN KEY ("reportRuleId") REFERENCES "ReportRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlannedReport" ADD CONSTRAINT "PlannedReport_reportCategoryId_fkey" FOREIGN KEY ("reportCategoryId") REFERENCES "FormCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlannedReport" ADD CONSTRAINT "PlannedReport_reportTemplateId_fkey" FOREIGN KEY ("reportTemplateId") REFERENCES "FormTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlannedReport" ADD CONSTRAINT "PlannedReport_triggerStatusId_fkey" FOREIGN KEY ("triggerStatusId") REFERENCES "FormStatus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlannedReport" ADD CONSTRAINT "PlannedReport_reportFormId_fkey" FOREIGN KEY ("reportFormId") REFERENCES "LocalDevelopmentAgencyForm"("id") ON DELETE SET NULL ON UPDATE CASCADE;
