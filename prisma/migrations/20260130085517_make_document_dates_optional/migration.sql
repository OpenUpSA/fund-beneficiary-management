-- AlterTable
ALTER TABLE "Document" ALTER COLUMN "validFromDate" DROP NOT NULL,
ALTER COLUMN "validUntilDate" DROP NOT NULL;
