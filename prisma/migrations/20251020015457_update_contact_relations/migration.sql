/*
  Warnings:

  - You are about to drop the `_ContactToFund` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_ContactToFunder` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_ContactToFund" DROP CONSTRAINT "_ContactToFund_A_fkey";

-- DropForeignKey
ALTER TABLE "_ContactToFund" DROP CONSTRAINT "_ContactToFund_B_fkey";

-- DropForeignKey
ALTER TABLE "_ContactToFunder" DROP CONSTRAINT "_ContactToFunder_A_fkey";

-- DropForeignKey
ALTER TABLE "_ContactToFunder" DROP CONSTRAINT "_ContactToFunder_B_fkey";

-- AlterTable
ALTER TABLE "Contact" ADD COLUMN     "localDevelopmentAgencyId" INTEGER;

-- Data migration: Copy first LDA from M2M relationship to FK
UPDATE "Contact" 
SET "localDevelopmentAgencyId" = (
    SELECT "_ContactToLocalDevelopmentAgency"."B" 
    FROM "_ContactToLocalDevelopmentAgency" 
    WHERE "_ContactToLocalDevelopmentAgency"."A" = "Contact"."id" 
    ORDER BY "_ContactToLocalDevelopmentAgency"."B" 
    LIMIT 1
)
WHERE "id" IN (
    SELECT DISTINCT "A" FROM "_ContactToLocalDevelopmentAgency"
);

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_localDevelopmentAgencyId_fkey" FOREIGN KEY ("localDevelopmentAgencyId") REFERENCES "LocalDevelopmentAgency"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- DropTable
DROP TABLE "_ContactToFund";

-- DropTable
DROP TABLE "_ContactToFunder";
