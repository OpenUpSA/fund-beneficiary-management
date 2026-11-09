-- CreateEnum
CREATE TYPE "FormCategoryRole" AS ENUM ('PRIMARY', 'SECONDARY', 'REPORT');

-- CreateTable
CREATE TABLE "FormCategory" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "role" "FormCategoryRole" NOT NULL,
    "parentCategoryId" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FormCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FormCategory_key_key" ON "FormCategory"("key");

-- AddForeignKey
ALTER TABLE "FormCategory" ADD CONSTRAINT "FormCategory_parentCategoryId_fkey" FOREIGN KEY ("parentCategoryId") REFERENCES "FormCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed the categories that used to be hard-coded in the template dialog. Roles
-- and parents are a starting point; admins can change them on the Categories page.
INSERT INTO "FormCategory" ("key", "label", "role", "updatedAt") VALUES
    ('grant_funding', 'Grant Funding', 'PRIMARY', CURRENT_TIMESTAMP),
    ('fris_application', 'FRIS Application', 'PRIMARY', CURRENT_TIMESTAMP),
    ('dft_application', 'DFT Application', 'SECONDARY', CURRENT_TIMESTAMP),
    ('fris_claim', 'FRIS Claim', 'SECONDARY', CURRENT_TIMESTAMP),
    ('dft_report', 'DFT Report', 'REPORT', CURRENT_TIMESTAMP),
    ('narrative_report', 'Narrative Report', 'REPORT', CURRENT_TIMESTAMP),
    ('finance_report', 'Finance Report', 'REPORT', CURRENT_TIMESTAMP);

UPDATE "FormCategory" c SET "parentCategoryId" = p."id"
FROM "FormCategory" p
WHERE (c."key", p."key") IN (('dft_application', 'grant_funding'), ('fris_claim', 'fris_application'));

-- AlterTable: the category string becomes a link to the category
ALTER TABLE "FormTemplate" ADD COLUMN "formCategoryId" INTEGER;

UPDATE "FormTemplate" t SET "formCategoryId" = c."id"
FROM "FormCategory" c
WHERE c."key" = t."formCategory";

ALTER TABLE "FormTemplate" DROP COLUMN "formCategory",
DROP COLUMN "isPrimary",
DROP COLUMN "primaryCategory";

-- AddForeignKey
ALTER TABLE "FormTemplate" ADD CONSTRAINT "FormTemplate_formCategoryId_fkey" FOREIGN KEY ("formCategoryId") REFERENCES "FormCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
