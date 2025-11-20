-- CreateTable
CREATE TABLE "FundFunder" (
    "id" SERIAL NOT NULL,
    "fundId" INTEGER NOT NULL,
    "funderId" INTEGER NOT NULL,
    "amount" MONEY NOT NULL,
    "fundingStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fundingEnd" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FundFunder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FundFunder_fundId_funderId_key" ON "FundFunder"("fundId", "funderId");

-- AddForeignKey
ALTER TABLE "FundFunder" ADD CONSTRAINT "FundFunder_fundId_fkey" FOREIGN KEY ("fundId") REFERENCES "Fund"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FundFunder" ADD CONSTRAINT "FundFunder_funderId_fkey" FOREIGN KEY ("funderId") REFERENCES "Funder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
