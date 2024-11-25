/*
  Warnings:

  - A unique constraint covering the columns `[tokenAddress]` on the table `Contests` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name]` on the table `Contests` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Contests_tokenAddress_key" ON "Contests"("tokenAddress");

-- CreateIndex
CREATE UNIQUE INDEX "Contests_name_key" ON "Contests"("name");
