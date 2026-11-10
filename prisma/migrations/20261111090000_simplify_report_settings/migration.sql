-- Simplify report settings: a template can only switch an attached report off or
-- change its trigger status; links have no on/off switch (detach instead); planned
-- reports always use the newest active template of their report category.

-- Links switched off: switch the report off for every template of the parent
-- category instead, so those forms still don't get it
INSERT INTO "ReportRuleOverride" ("reportRuleId", "formTemplateId", "enabled", "createdAt", "updatedAt")
SELECT r."id", t."id", false, NOW(), NOW()
FROM "ReportRule" r
JOIN "FormTemplate" t ON t."formCategoryId" = r."parentCategoryId"
WHERE r."active" = false
ON CONFLICT ("reportRuleId", "formTemplateId") DO UPDATE SET "enabled" = false;

UPDATE "ReportRuleOverride" SET "enabled" = true WHERE "enabled" IS NULL;

-- Overrides that no longer change anything
DELETE FROM "ReportRuleOverride" WHERE "enabled" = true AND "triggerStatusId" IS NULL;

-- DropForeignKey
ALTER TABLE "ReportRuleOverride" DROP CONSTRAINT "ReportRuleOverride_reportTemplateId_fkey";
ALTER TABLE "PlannedReport" DROP CONSTRAINT "PlannedReport_reportTemplateId_fkey";

-- AlterTable
ALTER TABLE "ReportRule" DROP COLUMN "active";

ALTER TABLE "ReportRuleOverride" DROP COLUMN "dueDays",
DROP COLUMN "dueDaysAfterPeriodEnd",
DROP COLUMN "opensDaysBefore",
DROP COLUMN "periodMonths",
DROP COLUMN "reportTemplateId",
ALTER COLUMN "enabled" SET NOT NULL,
ALTER COLUMN "enabled" SET DEFAULT true;

ALTER TABLE "PlannedReport" DROP COLUMN "reportTemplateId";
