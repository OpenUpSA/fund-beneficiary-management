-- CreateEnum
CREATE TYPE "DocumentUploadType" AS ENUM ('Funder', 'Fund', 'SCAT', 'LDA');

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "createdById" INTEGER,
ADD COLUMN     "uploadedBy" "DocumentUploadType" NOT NULL DEFAULT 'SCAT';

-- AlterTable
ALTER TABLE "Media" ADD COLUMN     "createdById" INTEGER,
ADD COLUMN     "mediaSourceTypeId" INTEGER;

-- CreateTable
CREATE TABLE "MediaSourceType" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,

    CONSTRAINT "MediaSourceType_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Media" ADD CONSTRAINT "Media_mediaSourceTypeId_fkey" FOREIGN KEY ("mediaSourceTypeId") REFERENCES "MediaSourceType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Media" ADD CONSTRAINT "Media_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
