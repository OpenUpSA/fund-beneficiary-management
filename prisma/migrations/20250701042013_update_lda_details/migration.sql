-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('Male', 'Female', 'Other');

-- CreateEnum
CREATE TYPE "AccessLevel" AS ENUM ('Admin', 'ReadOnly');

-- CreateTable
CREATE TABLE "OrganisationOperations" (
    "id" SERIAL NOT NULL,
    "localDevelopmentAgencyId" INTEGER NOT NULL,
    "vision" TEXT NOT NULL DEFAULT '',
    "mission" TEXT NOT NULL DEFAULT '',
    "objectives" TEXT NOT NULL DEFAULT '',
    "programmaticAreas" TEXT NOT NULL DEFAULT '',
    "climateFocus" TEXT NOT NULL DEFAULT '',
    "youthFocus" TEXT NOT NULL DEFAULT '',
    "genderFocus" TEXT NOT NULL DEFAULT '',
    "fundraisingStrategies" TEXT NOT NULL DEFAULT '',
    "partnershipsWithinOutside" TEXT NOT NULL DEFAULT '',
    "nationalAdvocacyStrategies" TEXT NOT NULL DEFAULT '',
    "monitoringAndLearning" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganisationOperations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffMember" (
    "id" SERIAL NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "gender" "Gender" NOT NULL,
    "position" TEXT,
    "isCommittee" BOOLEAN NOT NULL DEFAULT false,
    "localDevelopmentAgencyId" INTEGER NOT NULL,

    CONSTRAINT "StaffMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAccess" (
    "id" SERIAL NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "accessLevel" "AccessLevel" NOT NULL DEFAULT 'ReadOnly',
    "localDevelopmentAgencyId" INTEGER NOT NULL,

    CONSTRAINT "UserAccess_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrganisationOperations_localDevelopmentAgencyId_key" ON "OrganisationOperations"("localDevelopmentAgencyId");

-- CreateIndex
CREATE UNIQUE INDEX "StaffMember_localDevelopmentAgencyId_key" ON "StaffMember"("localDevelopmentAgencyId");

-- AddForeignKey
ALTER TABLE "OrganisationOperations" ADD CONSTRAINT "OrganisationOperations_localDevelopmentAgencyId_fkey" FOREIGN KEY ("localDevelopmentAgencyId") REFERENCES "LocalDevelopmentAgency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffMember" ADD CONSTRAINT "StaffMember_localDevelopmentAgencyId_fkey" FOREIGN KEY ("localDevelopmentAgencyId") REFERENCES "LocalDevelopmentAgency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAccess" ADD CONSTRAINT "UserAccess_localDevelopmentAgencyId_fkey" FOREIGN KEY ("localDevelopmentAgencyId") REFERENCES "LocalDevelopmentAgency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
