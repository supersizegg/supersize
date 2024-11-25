/*
  Warnings:

  - A unique constraint covering the columns `[userWalletAddress]` on the table `Winning` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Winning_userWalletAddress_key" ON "Winning"("userWalletAddress");
