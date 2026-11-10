-- Report schedules (per-template calendar schedules) were never used; report
-- timing now lives on report categories and each form's planned reports.
DROP TABLE "ReportPeriodSchedule";
DROP TABLE "ReportScheduleConfig";
DROP TYPE "ReportFrequency";
