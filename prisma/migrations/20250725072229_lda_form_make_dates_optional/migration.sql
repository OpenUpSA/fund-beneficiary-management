-- AlterTable
ALTER TABLE "LocalDevelopmentAgencyForm" ALTER COLUMN "submitted" DROP NOT NULL,
ALTER COLUMN "submitted" DROP DEFAULT,
ALTER COLUMN "approved" DROP NOT NULL,
ALTER COLUMN "approved" DROP DEFAULT;
