-- CreateTable
CREATE TABLE "_FunderToFund" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_FunderToFund_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_FunderToFund_B_index" ON "_FunderToFund"("B");

-- AddForeignKey
ALTER TABLE "_FunderToFund" ADD CONSTRAINT "_FunderToFund_A_fkey" FOREIGN KEY ("A") REFERENCES "Fund"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FunderToFund" ADD CONSTRAINT "_FunderToFund_B_fkey" FOREIGN KEY ("B") REFERENCES "Funder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
