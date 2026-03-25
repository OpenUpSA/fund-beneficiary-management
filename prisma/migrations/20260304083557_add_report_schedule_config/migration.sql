-- CreateEnum
CREATE TYPE "ReportFrequency" AS ENUM ('MONTHLY', 'QUARTERLY', 'BIANNUALLY', 'ANNUALLY');

-- CreateTable
CREATE TABLE "ReportScheduleConfig" (
    "id" SERIAL NOT NULL,
    "applicationTemplateId" INTEGER NOT NULL,
    "reportTemplateId" INTEGER NOT NULL,
    "frequency" "ReportFrequency" NOT NULL DEFAULT 'QUARTERLY',
    "availableDaysBefore" INTEGER NOT NULL DEFAULT 14,
    "dueDaysAfterPeriodEnd" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportScheduleConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportPeriodSchedule" (
    "id" SERIAL NOT NULL,
    "reportConfigId" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "period" INTEGER NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "availableDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "isCustomized" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportPeriodSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReportScheduleConfig_applicationTemplateId_reportTemplateId_key" ON "ReportScheduleConfig"("applicationTemplateId", "reportTemplateId", "frequency");

-- CreateIndex
CREATE UNIQUE INDEX "ReportPeriodSchedule_reportConfigId_year_period_key" ON "ReportPeriodSchedule"("reportConfigId", "year", "period");

-- AddForeignKey
ALTER TABLE "ReportScheduleConfig" ADD CONSTRAINT "ReportScheduleConfig_applicationTemplateId_fkey" FOREIGN KEY ("applicationTemplateId") REFERENCES "FormTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportScheduleConfig" ADD CONSTRAINT "ReportScheduleConfig_reportTemplateId_fkey" FOREIGN KEY ("reportTemplateId") REFERENCES "FormTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportPeriodSchedule" ADD CONSTRAINT "ReportPeriodSchedule_reportConfigId_fkey" FOREIGN KEY ("reportConfigId") REFERENCES "ReportScheduleConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
