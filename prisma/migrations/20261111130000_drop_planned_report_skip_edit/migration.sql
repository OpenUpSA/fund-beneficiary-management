-- Planned reports can no longer be skipped or edited by hand (the form's Reports
-- panel was removed), so drop the SKIPPED status and the "edited" flag.
-- A skipped report was never going to be created; remove any such rows first.
DELETE FROM "PlannedReport" WHERE "status" = 'SKIPPED';

-- AlterEnum
BEGIN;
CREATE TYPE "PlannedReportStatus_new" AS ENUM ('PLANNED', 'CREATED');
ALTER TABLE "PlannedReport" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "PlannedReport" ALTER COLUMN "status" TYPE "PlannedReportStatus_new" USING ("status"::text::"PlannedReportStatus_new");
ALTER TYPE "PlannedReportStatus" RENAME TO "PlannedReportStatus_old";
ALTER TYPE "PlannedReportStatus_new" RENAME TO "PlannedReportStatus";
DROP TYPE "PlannedReportStatus_old";
ALTER TABLE "PlannedReport" ALTER COLUMN "status" SET DEFAULT 'PLANNED';
COMMIT;

-- AlterTable
ALTER TABLE "PlannedReport" DROP COLUMN "edited";

