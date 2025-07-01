/*
  Warnings:

  - You are about to drop the column `addressCity` on the `OrganisationDetail` table. All the data in the column will be lost.
  - You are about to drop the column `addressComplex` on the `OrganisationDetail` table. All the data in the column will be lost.
  - You are about to drop the column `addressProvince` on the `OrganisationDetail` table. All the data in the column will be lost.
  - You are about to drop the column `addressStreet` on the `OrganisationDetail` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "OrganisationDetail" DROP COLUMN "addressCity",
DROP COLUMN "addressComplex",
DROP COLUMN "addressProvince",
DROP COLUMN "addressStreet",
ADD COLUMN     "physicalCity" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "physicalComplexName" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "physicalComplexNumber" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "physicalDistrict" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "physicalProvince" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "physicalStreet" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "postalCity" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "postalCode" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "postalComplexName" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "postalComplexNumber" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "postalDistrict" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "postalProvince" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "postalStreet" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "useDifferentPostalAddress" BOOLEAN NOT NULL DEFAULT false;
