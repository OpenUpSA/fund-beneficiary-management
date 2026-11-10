-- The old per-template "linked form template" setting was never used; reports
-- are attached to categories (ReportRule) and planned per form instead.
-- Forms keep "linkedFormId": it is how a report sits under its parent form.
ALTER TABLE "FormTemplate" DROP CONSTRAINT "FormTemplate_linkedFormTemplateId_fkey";
ALTER TABLE "FormTemplate" DROP CONSTRAINT "FormTemplate_linkedFormTriggerStatusId_fkey";
ALTER TABLE "FormTemplate" DROP COLUMN "linkedFormTemplateId",
DROP COLUMN "linkedFormTriggerStatusId",
DROP COLUMN "linkedFormDueDays";
