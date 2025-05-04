-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('DOC', 'SPREADSHEET');

-- CreateTable
CREATE TABLE "Document" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "documentType" "DocumentType" NOT NULL DEFAULT 'DOC',
    "validFromDate" TIMESTAMP(3) NOT NULL,
    "validUntilDate" TIMESTAMP(3) NOT NULL,
    "localDevelopmentAgencyId" INTEGER NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_localDevelopmentAgencyId_fkey" FOREIGN KEY ("localDevelopmentAgencyId") REFERENCES "LocalDevelopmentAgency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
