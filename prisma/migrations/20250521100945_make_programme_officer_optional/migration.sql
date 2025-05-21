-- DropForeignKey
ALTER TABLE "LocalDevelopmentAgency" DROP CONSTRAINT "LocalDevelopmentAgency_programmeOfficerId_fkey";

-- AlterTable
ALTER TABLE "LocalDevelopmentAgency" ALTER COLUMN "programmeOfficerId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "LocalDevelopmentAgency" ADD CONSTRAINT "LocalDevelopmentAgency_programmeOfficerId_fkey" FOREIGN KEY ("programmeOfficerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
