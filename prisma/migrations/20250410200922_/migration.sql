-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'PROGRAMME_OFFICER', 'ADMIN');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FundingStatus" (
    "id" SERIAL NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FundingStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Funder" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "amount" MONEY NOT NULL,
    "about" TEXT NOT NULL,
    "fundingStatusId" INTEGER NOT NULL,
    "fundingStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fundingEnd" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Funder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" SERIAL NOT NULL,
    "label" TEXT NOT NULL,
    "short" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FocusArea" (
    "id" SERIAL NOT NULL,
    "label" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FocusArea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fund" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "about" TEXT NOT NULL,
    "funderId" INTEGER NOT NULL,
    "fundingStatusId" INTEGER NOT NULL,
    "amount" MONEY NOT NULL,
    "fundingStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fundingEnd" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Fund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DevelopmentStage" (
    "id" SERIAL NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DevelopmentStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocalDevelopmentAgency" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "about" TEXT NOT NULL,
    "totalFundingRounds" INTEGER NOT NULL,
    "amount" MONEY NOT NULL,
    "fundingStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fundingEnd" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "developmentStageId" INTEGER NOT NULL,
    "fundingStatusId" INTEGER NOT NULL,
    "locationId" INTEGER NOT NULL,
    "programmeOfficerId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LocalDevelopmentAgency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormStatus" (
    "id" SERIAL NOT NULL,
    "label" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FormStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormTemplate" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "form" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FormTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocalDevelopmentAgencyForm" (
    "id" SERIAL NOT NULL,
    "localDevelopmentAgencyId" INTEGER NOT NULL,
    "formStatusId" INTEGER NOT NULL,
    "formTemplateId" INTEGER NOT NULL,
    "formData" JSONB NOT NULL,
    "title" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submitted" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approved" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LocalDevelopmentAgencyForm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_FunderToLocation" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_FunderToLocation_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_FundToFocusArea" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_FundToFocusArea_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_FunderToFocusArea" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_FunderToFocusArea_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_LocalDevelopmentAgencyToFocusArea" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_LocalDevelopmentAgencyToFocusArea_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_FundToLocalDevelopmentAgency" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_FundToLocalDevelopmentAgency_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_FundToLocation" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_FundToLocation_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "FundingStatus_label_key" ON "FundingStatus"("label");

-- CreateIndex
CREATE UNIQUE INDEX "Funder_name_key" ON "Funder"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Location_label_key" ON "Location"("label");

-- CreateIndex
CREATE UNIQUE INDEX "Location_short_key" ON "Location"("short");

-- CreateIndex
CREATE UNIQUE INDEX "FocusArea_label_key" ON "FocusArea"("label");

-- CreateIndex
CREATE UNIQUE INDEX "DevelopmentStage_label_key" ON "DevelopmentStage"("label");

-- CreateIndex
CREATE UNIQUE INDEX "LocalDevelopmentAgency_name_key" ON "LocalDevelopmentAgency"("name");

-- CreateIndex
CREATE UNIQUE INDEX "FormTemplate_name_key" ON "FormTemplate"("name");

-- CreateIndex
CREATE INDEX "_FunderToLocation_B_index" ON "_FunderToLocation"("B");

-- CreateIndex
CREATE INDEX "_FundToFocusArea_B_index" ON "_FundToFocusArea"("B");

-- CreateIndex
CREATE INDEX "_FunderToFocusArea_B_index" ON "_FunderToFocusArea"("B");

-- CreateIndex
CREATE INDEX "_LocalDevelopmentAgencyToFocusArea_B_index" ON "_LocalDevelopmentAgencyToFocusArea"("B");

-- CreateIndex
CREATE INDEX "_FundToLocalDevelopmentAgency_B_index" ON "_FundToLocalDevelopmentAgency"("B");

-- CreateIndex
CREATE INDEX "_FundToLocation_B_index" ON "_FundToLocation"("B");

-- AddForeignKey
ALTER TABLE "Funder" ADD CONSTRAINT "Funder_fundingStatusId_fkey" FOREIGN KEY ("fundingStatusId") REFERENCES "FundingStatus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fund" ADD CONSTRAINT "Fund_funderId_fkey" FOREIGN KEY ("funderId") REFERENCES "Funder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fund" ADD CONSTRAINT "Fund_fundingStatusId_fkey" FOREIGN KEY ("fundingStatusId") REFERENCES "FundingStatus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocalDevelopmentAgency" ADD CONSTRAINT "LocalDevelopmentAgency_developmentStageId_fkey" FOREIGN KEY ("developmentStageId") REFERENCES "DevelopmentStage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocalDevelopmentAgency" ADD CONSTRAINT "LocalDevelopmentAgency_fundingStatusId_fkey" FOREIGN KEY ("fundingStatusId") REFERENCES "FundingStatus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocalDevelopmentAgency" ADD CONSTRAINT "LocalDevelopmentAgency_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocalDevelopmentAgency" ADD CONSTRAINT "LocalDevelopmentAgency_programmeOfficerId_fkey" FOREIGN KEY ("programmeOfficerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocalDevelopmentAgencyForm" ADD CONSTRAINT "LocalDevelopmentAgencyForm_formStatusId_fkey" FOREIGN KEY ("formStatusId") REFERENCES "FormStatus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocalDevelopmentAgencyForm" ADD CONSTRAINT "LocalDevelopmentAgencyForm_formTemplateId_fkey" FOREIGN KEY ("formTemplateId") REFERENCES "FormTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocalDevelopmentAgencyForm" ADD CONSTRAINT "LocalDevelopmentAgencyForm_localDevelopmentAgencyId_fkey" FOREIGN KEY ("localDevelopmentAgencyId") REFERENCES "LocalDevelopmentAgency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FunderToLocation" ADD CONSTRAINT "_FunderToLocation_A_fkey" FOREIGN KEY ("A") REFERENCES "Funder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FunderToLocation" ADD CONSTRAINT "_FunderToLocation_B_fkey" FOREIGN KEY ("B") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FundToFocusArea" ADD CONSTRAINT "_FundToFocusArea_A_fkey" FOREIGN KEY ("A") REFERENCES "FocusArea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FundToFocusArea" ADD CONSTRAINT "_FundToFocusArea_B_fkey" FOREIGN KEY ("B") REFERENCES "Fund"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FunderToFocusArea" ADD CONSTRAINT "_FunderToFocusArea_A_fkey" FOREIGN KEY ("A") REFERENCES "FocusArea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FunderToFocusArea" ADD CONSTRAINT "_FunderToFocusArea_B_fkey" FOREIGN KEY ("B") REFERENCES "Funder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_LocalDevelopmentAgencyToFocusArea" ADD CONSTRAINT "_LocalDevelopmentAgencyToFocusArea_A_fkey" FOREIGN KEY ("A") REFERENCES "FocusArea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_LocalDevelopmentAgencyToFocusArea" ADD CONSTRAINT "_LocalDevelopmentAgencyToFocusArea_B_fkey" FOREIGN KEY ("B") REFERENCES "LocalDevelopmentAgency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FundToLocalDevelopmentAgency" ADD CONSTRAINT "_FundToLocalDevelopmentAgency_A_fkey" FOREIGN KEY ("A") REFERENCES "Fund"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FundToLocalDevelopmentAgency" ADD CONSTRAINT "_FundToLocalDevelopmentAgency_B_fkey" FOREIGN KEY ("B") REFERENCES "LocalDevelopmentAgency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FundToLocation" ADD CONSTRAINT "_FundToLocation_A_fkey" FOREIGN KEY ("A") REFERENCES "Fund"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FundToLocation" ADD CONSTRAINT "_FundToLocation_B_fkey" FOREIGN KEY ("B") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;
