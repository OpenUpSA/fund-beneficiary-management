/*
  Warnings:

  - Added the required column `organisationDetailId` to the `Fund` table without a default value. This is not possible if the table is not empty.
  - Added the required column `organisationDetailId` to the `Funder` table without a default value. This is not possible if the table is not empty.
  - Added the required column `organisationDetailId` to the `LocalDevelopmentAgency` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Fund" ADD COLUMN     "organisationDetailId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Funder" ADD COLUMN     "organisationDetailId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "LocalDevelopmentAgency" ADD COLUMN     "organisationDetailId" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "OrganisationDetail" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "contactNumber" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "website" TEXT NOT NULL DEFAULT '',
    "addressStreet" TEXT NOT NULL DEFAULT '',
    "addressComplex" TEXT NOT NULL DEFAULT '',
    "addressCity" TEXT NOT NULL DEFAULT '',
    "addressProvince" TEXT NOT NULL DEFAULT '',
    "coordinates" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "OrganisationDetail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "contactNumber" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "position" TEXT NOT NULL DEFAULT '',
    "info" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ContactToLocalDevelopmentAgency" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_ContactToLocalDevelopmentAgency_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_ContactToFunder" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_ContactToFunder_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_ContactToFund" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_ContactToFund_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_ContactToLocalDevelopmentAgency_B_index" ON "_ContactToLocalDevelopmentAgency"("B");

-- CreateIndex
CREATE INDEX "_ContactToFunder_B_index" ON "_ContactToFunder"("B");

-- CreateIndex
CREATE INDEX "_ContactToFund_B_index" ON "_ContactToFund"("B");

-- AddForeignKey
ALTER TABLE "Funder" ADD CONSTRAINT "Funder_organisationDetailId_fkey" FOREIGN KEY ("organisationDetailId") REFERENCES "OrganisationDetail"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fund" ADD CONSTRAINT "Fund_organisationDetailId_fkey" FOREIGN KEY ("organisationDetailId") REFERENCES "OrganisationDetail"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocalDevelopmentAgency" ADD CONSTRAINT "LocalDevelopmentAgency_organisationDetailId_fkey" FOREIGN KEY ("organisationDetailId") REFERENCES "OrganisationDetail"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ContactToLocalDevelopmentAgency" ADD CONSTRAINT "_ContactToLocalDevelopmentAgency_A_fkey" FOREIGN KEY ("A") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ContactToLocalDevelopmentAgency" ADD CONSTRAINT "_ContactToLocalDevelopmentAgency_B_fkey" FOREIGN KEY ("B") REFERENCES "LocalDevelopmentAgency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ContactToFunder" ADD CONSTRAINT "_ContactToFunder_A_fkey" FOREIGN KEY ("A") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ContactToFunder" ADD CONSTRAINT "_ContactToFunder_B_fkey" FOREIGN KEY ("B") REFERENCES "Funder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ContactToFund" ADD CONSTRAINT "_ContactToFund_A_fkey" FOREIGN KEY ("A") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ContactToFund" ADD CONSTRAINT "_ContactToFund_B_fkey" FOREIGN KEY ("B") REFERENCES "Fund"("id") ON DELETE CASCADE ON UPDATE CASCADE;
