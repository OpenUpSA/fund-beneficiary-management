/*
  Warnings:

  - You are about to drop the `_FunderToLocation` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_FunderToLocation" DROP CONSTRAINT "_FunderToLocation_A_fkey";

-- DropForeignKey
ALTER TABLE "_FunderToLocation" DROP CONSTRAINT "_FunderToLocation_B_fkey";

-- DropTable
DROP TABLE "_FunderToLocation";
