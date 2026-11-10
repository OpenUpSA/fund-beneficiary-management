-- A template's type now follows its category: templates in report categories are
-- reports, templates in primary/secondary categories are applications.
UPDATE "FormTemplate" t
SET "templateType" = CASE WHEN c."role" = 'REPORT' THEN 'REPORT'::"FormTemplateType" ELSE 'APPLICATION'::"FormTemplateType" END
FROM "FormCategory" c
WHERE t."formCategoryId" = c."id";
