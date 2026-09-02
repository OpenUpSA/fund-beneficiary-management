/*
  Warnings:

  - You are about to drop the column `validFromDate` on the `Document` table. All the data in the column will be lost.
  - You are about to drop the column `validUntilDate` on the `Document` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Document" DROP COLUMN "validFromDate",
DROP COLUMN "validUntilDate";
