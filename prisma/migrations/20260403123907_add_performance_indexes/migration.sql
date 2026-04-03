-- CreateIndex
CREATE INDEX "Contact_localDevelopmentAgencyId_idx" ON "Contact"("localDevelopmentAgencyId");

-- CreateIndex
CREATE INDEX "Document_localDevelopmentAgencyId_idx" ON "Document"("localDevelopmentAgencyId");

-- CreateIndex
CREATE INDEX "Document_localDevelopmentAgencyFormId_idx" ON "Document"("localDevelopmentAgencyFormId");

-- CreateIndex
CREATE INDEX "Document_fundId_idx" ON "Document"("fundId");

-- CreateIndex
CREATE INDEX "Document_funderId_idx" ON "Document"("funderId");

-- CreateIndex
CREATE INDEX "FundFunder_funderId_idx" ON "FundFunder"("funderId");

-- CreateIndex
CREATE INDEX "FundLocalDevelopmentAgency_localDevelopmentAgencyId_idx" ON "FundLocalDevelopmentAgency"("localDevelopmentAgencyId");

-- CreateIndex
CREATE INDEX "LocalDevelopmentAgency_developmentStageId_idx" ON "LocalDevelopmentAgency"("developmentStageId");

-- CreateIndex
CREATE INDEX "LocalDevelopmentAgency_fundingStatusId_idx" ON "LocalDevelopmentAgency"("fundingStatusId");

-- CreateIndex
CREATE INDEX "LocalDevelopmentAgency_locationId_idx" ON "LocalDevelopmentAgency"("locationId");

-- CreateIndex
CREATE INDEX "LocalDevelopmentAgency_programmeOfficerId_idx" ON "LocalDevelopmentAgency"("programmeOfficerId");

-- CreateIndex
CREATE INDEX "LocalDevelopmentAgencyForm_localDevelopmentAgencyId_idx" ON "LocalDevelopmentAgencyForm"("localDevelopmentAgencyId");

-- CreateIndex
CREATE INDEX "LocalDevelopmentAgencyForm_formStatusId_idx" ON "LocalDevelopmentAgencyForm"("formStatusId");

-- CreateIndex
CREATE INDEX "LocalDevelopmentAgencyForm_formTemplateId_idx" ON "LocalDevelopmentAgencyForm"("formTemplateId");

-- CreateIndex
CREATE INDEX "LocalDevelopmentAgencyForm_linkedFormId_idx" ON "LocalDevelopmentAgencyForm"("linkedFormId");

-- CreateIndex
CREATE INDEX "Media_localDevelopmentAgencyId_idx" ON "Media"("localDevelopmentAgencyId");

-- CreateIndex
CREATE INDEX "Media_localDevelopmentAgencyFormId_idx" ON "Media"("localDevelopmentAgencyFormId");

-- CreateIndex
CREATE INDEX "Media_fundId_idx" ON "Media"("fundId");

-- CreateIndex
CREATE INDEX "Media_funderId_idx" ON "Media"("funderId");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- CreateIndex
CREATE INDEX "StaffMember_localDevelopmentAgencyId_idx" ON "StaffMember"("localDevelopmentAgencyId");

-- CreateIndex
CREATE INDEX "UserAccess_localDevelopmentAgencyId_idx" ON "UserAccess"("localDevelopmentAgencyId");
