-- CreateTable
CREATE TABLE "Contests" (
    "id" TEXT NOT NULL,
    "tokenAddress" TEXT NOT NULL,

    CONSTRAINT "Contests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "name" TEXT,
    "contestId" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Winning" (
    "id" TEXT NOT NULL,
    "userWalletAddress" TEXT NOT NULL,
    "usdc" INTEGER NOT NULL DEFAULT 0,
    "sol" INTEGER NOT NULL DEFAULT 0,
    "agld" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Winning_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_walletAddress_key" ON "User"("walletAddress");

-- CreateIndex
CREATE UNIQUE INDEX "User_walletAddress_contestId_key" ON "User"("walletAddress", "contestId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Winning" ADD CONSTRAINT "Winning_userWalletAddress_fkey" FOREIGN KEY ("userWalletAddress") REFERENCES "User"("walletAddress") ON DELETE RESTRICT ON UPDATE CASCADE;
