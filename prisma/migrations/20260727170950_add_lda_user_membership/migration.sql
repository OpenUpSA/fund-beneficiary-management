-- CreateTable
CREATE TABLE "LocalDevelopmentAgencyUser" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "localDevelopmentAgencyId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LocalDevelopmentAgencyUser_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LocalDevelopmentAgencyUser_userId_key" ON "LocalDevelopmentAgencyUser"("userId");

-- CreateIndex
CREATE INDEX "LocalDevelopmentAgencyUser_localDevelopmentAgencyId_idx" ON "LocalDevelopmentAgencyUser"("localDevelopmentAgencyId");

-- AddForeignKey
ALTER TABLE "LocalDevelopmentAgencyUser" ADD CONSTRAINT "LocalDevelopmentAgencyUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocalDevelopmentAgencyUser" ADD CONSTRAINT "LocalDevelopmentAgencyUser_localDevelopmentAgencyId_fkey" FOREIGN KEY ("localDevelopmentAgencyId") REFERENCES "LocalDevelopmentAgency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DataMigration: USER-role accounts were historically linked to their LDA via
-- programmeOfficerId (the only User<->LDA relation). Move them into the new
-- membership table and free the officer slot for an actual programme officer.
INSERT INTO "LocalDevelopmentAgencyUser" ("userId", "localDevelopmentAgencyId")
SELECT lda."programmeOfficerId", lda."id"
FROM "LocalDevelopmentAgency" lda
JOIN "User" u ON u."id" = lda."programmeOfficerId"
WHERE u."role" = 'USER';

UPDATE "LocalDevelopmentAgency" lda
SET "programmeOfficerId" = NULL
FROM "User" u
WHERE u."id" = lda."programmeOfficerId" AND u."role" = 'USER';
