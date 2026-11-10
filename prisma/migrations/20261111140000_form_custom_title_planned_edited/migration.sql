-- Form titles are filled in from the template name and period and kept up to
-- date until changed by hand; planned reports edited by hand are never re-planned.
ALTER TABLE "LocalDevelopmentAgencyForm" ADD COLUMN "customTitle" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PlannedReport" ADD COLUMN "edited" BOOLEAN NOT NULL DEFAULT false;

-- Titles someone already changed (anything other than the template's name or a
-- planned report's "<template> – <period>") are kept as they are.
UPDATE "LocalDevelopmentAgencyForm" f
SET "customTitle" = true
FROM "FormTemplate" t
WHERE f."formTemplateId" = t."id"
  AND f."title" <> t."name"
  AND NOT EXISTS (
    SELECT 1 FROM "PlannedReport" p
    WHERE p."reportFormId" = f."id" AND f."title" = t."name" || ' – ' || p."label"
  );
