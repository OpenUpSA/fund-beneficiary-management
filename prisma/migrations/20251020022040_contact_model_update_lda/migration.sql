/*
  Warnings:

  - Made the column `localDevelopmentAgencyId` on table `Contact` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Contact" DROP CONSTRAINT "Contact_localDevelopmentAgencyId_fkey";

-- AlterTable
ALTER TABLE "Contact" ALTER COLUMN "localDevelopmentAgencyId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_localDevelopmentAgencyId_fkey" FOREIGN KEY ("localDevelopmentAgencyId") REFERENCES "LocalDevelopmentAgency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
