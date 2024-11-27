/*
  Warnings:

  - You are about to drop the `Winning` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[tokenAddress,name]` on the table `Contests` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "Winning" DROP CONSTRAINT "Winning_id_fkey";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "winAmount" INTEGER NOT NULL DEFAULT 0;

-- DropTable
DROP TABLE "Winning";

-- CreateIndex
CREATE UNIQUE INDEX "Contests_tokenAddress_name_key" ON "Contests"("tokenAddress", "name");

-- CreateIndex
CREATE UNIQUE INDEX "User_name_key" ON "User"("name");
