-- A planned report can be skipped for one form: it's never created and re-planning keeps it.
-- AlterEnum
ALTER TYPE "PlannedReportStatus" ADD VALUE 'SKIPPED';

