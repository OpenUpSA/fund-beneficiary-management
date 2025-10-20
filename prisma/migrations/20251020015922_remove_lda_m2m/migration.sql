/*
  Warnings:

  - You are about to drop the `_ContactToLocalDevelopmentAgency` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_ContactToLocalDevelopmentAgency" DROP CONSTRAINT "_ContactToLocalDevelopmentAgency_A_fkey";

-- DropForeignKey
ALTER TABLE "_ContactToLocalDevelopmentAgency" DROP CONSTRAINT "_ContactToLocalDevelopmentAgency_B_fkey";

-- DropTable
DROP TABLE "_ContactToLocalDevelopmentAgency";
