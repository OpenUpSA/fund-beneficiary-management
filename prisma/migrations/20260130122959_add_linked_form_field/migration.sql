/*
  Warnings:

  - A unique constraint covering the columns `[linkedFormId]` on the table `LocalDevelopmentAgencyForm` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "LocalDevelopmentAgencyForm" ADD COLUMN     "adminFeedback" TEXT,
ADD COLUMN     "linkedFormId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "LocalDevelopmentAgencyForm_linkedFormId_key" ON "LocalDevelopmentAgencyForm"("linkedFormId");

-- AddForeignKey
ALTER TABLE "LocalDevelopmentAgencyForm" ADD CONSTRAINT "LocalDevelopmentAgencyForm_linkedFormId_fkey" FOREIGN KEY ("linkedFormId") REFERENCES "LocalDevelopmentAgencyForm"("id") ON DELETE SET NULL ON UPDATE CASCADE;
