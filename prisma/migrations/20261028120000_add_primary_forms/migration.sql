-- AlterTable
ALTER TABLE "FormTemplate" ADD COLUMN     "isPrimary" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "primaryCategory" TEXT;

-- AlterTable
ALTER TABLE "LocalDevelopmentAgencyForm" ADD COLUMN     "primaryFormId" INTEGER;

-- CreateIndex
CREATE INDEX "LocalDevelopmentAgencyForm_primaryFormId_idx" ON "LocalDevelopmentAgencyForm"("primaryFormId");

-- AddForeignKey
ALTER TABLE "LocalDevelopmentAgencyForm" ADD CONSTRAINT "LocalDevelopmentAgencyForm_primaryFormId_fkey" FOREIGN KEY ("primaryFormId") REFERENCES "LocalDevelopmentAgencyForm"("id") ON DELETE SET NULL ON UPDATE CASCADE;
