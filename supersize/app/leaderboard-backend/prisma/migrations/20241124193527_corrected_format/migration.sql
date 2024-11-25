/*
  Warnings:

  - The primary key for the `Contests` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `Contests` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_contestId_fkey";

-- DropForeignKey
ALTER TABLE "Winning" DROP CONSTRAINT "Winning_userWalletAddress_fkey";

-- DropIndex
DROP INDEX "User_walletAddress_key";

-- AlterTable
ALTER TABLE "Contests" DROP CONSTRAINT "Contests_pkey",
DROP COLUMN "id",
ADD CONSTRAINT "Contests_pkey" PRIMARY KEY ("name");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contests"("name") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Winning" ADD CONSTRAINT "Winning_id_fkey" FOREIGN KEY ("id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
