/*
  Warnings:

  - You are about to drop the column `includeAdminFeedback` on the `FormTemplate` table. All the data in the column will be lost.
  - You are about to drop the column `adminFeedback` on the `LocalDevelopmentAgencyForm` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "FormTemplate" DROP COLUMN "includeAdminFeedback";

-- AlterTable
ALTER TABLE "LocalDevelopmentAgencyForm" DROP COLUMN "adminFeedback";
