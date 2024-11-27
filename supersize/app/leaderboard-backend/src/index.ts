import express from "express";
import { PrismaClient } from "@prisma/client";
import { returnParticipantInfo } from "./returnParticipantInfo";
import cors from "cors";

const app = express();
const prisma = new PrismaClient();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

//@ts-ignore
app.post("/create-contest", async (req: express.Request, res: express.Response) => {
  const { name, tokenAddress } = req.body;
  if (!name || !tokenAddress) {
    return res.status(400).json({ error: "Name and token address are required" });
  }

  try {
    let contest;
   contest = await prisma.contests.findUnique({
      where: { name }
    });

    if (!contest) {
      await prisma.contests.create({
        data: { name, tokenAddress }
      });
    }
    console.log(contest);
    return res.json({ contest });
  } catch (error) {
    return res.status(500).json({ error: "Failed to create contest" });
  }
});

//@ts-ignore
app.post("/create-user", async (req: express.Request, res: express.Response) => {
  const { walletAddress, name, contestId } = req.body;

  if (!walletAddress || !name) {
    return res.status(400).json({ error: "Wallet address and name are required" });
  }
  //if (contestId !== "USDC" && contestId !== "SOL" && contestId !== "AGLD") {
  //  return res.status(400).json({ error: "Invalid contest ID" });
  //}
  try {
    let user;

    user = await prisma.user.findUnique({
      where: { walletAddress_contestId: { walletAddress, contestId } }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          walletAddress,
          name,
          contestId
    }
  });
    }
    
    return res.json({ user });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: "Failed to create user" });
  }
});

//@ts-ignore
app.post("/update-wins", async (req: express.Request, res: express.Response) => {
  const { walletAddress, contestId, amount }: { walletAddress: string; contestId: string; amount: number } = req.body;
  //if (!walletAddress || contestId !== "USDC" && contestId !== "SOL" && contestId !== "AGLD") {
  //  return res.status(400).json({ error: "Invalid request" });
  //}
    
  const user = await prisma.user.findUnique({
    where: { walletAddress_contestId: { walletAddress, contestId } }
  });

  if (!user) {
    return res.status(400).json({ error: "User not found" });
  }

  try {   
      await prisma.user.update({
        where: { walletAddress_contestId: { walletAddress, contestId } },
        data: {
          winAmount: {
            increment: amount
          }
        }
      })   

      return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: "Failed to update wins" });
  } 
});

//@ts-ignore
app.get("/get-user-position", async (req: express.Request, res: express.Response) => {
  const { walletAddress, contestName } = req.query;

  if (!walletAddress || !contestName) {
    return res.status(400).json({ error: "Wallet address and contest name are required" });
  }

  try {
    const contest = await prisma.contests.findUnique({
      where: { name: contestName as string },
      include: {
        participants: {
          orderBy: {
            winAmount: "desc"
          }
        }
      }
    });
  
    if (!contest) {
      return res.status(400).json({ error: "Contest not found" });
    }

    const position = contest.participants.findIndex(p => p.walletAddress === walletAddress) + 1;

    if (position === 0) {
      return res.status(400).json({ error: "User not found in contest" });
    }

    const topParticipants = contest.participants.slice(0, 100);

    let points = contest.participants[position - 1].winAmount;
 
    return res.json({ 
      position,
      points,
      totalCandidates: contest.participants.length,
      topParticipants
    });
  } catch (error) {
    return res.status(500).json({ error: "Failed to get user position" });
  }
});

app.listen(3001, () => {
  console.log("Server is running on port 3001");
});

