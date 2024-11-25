"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const client_1 = require("@prisma/client");
const returnParticipantInfo_1 = require("./returnParticipantInfo");
const app = (0, express_1.default)();
const prisma = new client_1.PrismaClient();
//@ts-ignore
app.post("/create-user", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { walletAddress, name } = req.body;
    if (!walletAddress || !name) {
        return res.status(400).json({ error: "Wallet address and name are required" });
    }
    try {
        const user = yield prisma.user.create({
            data: {
                walletAddress,
                name,
                contestId: ""
            },
        });
        return res.json({ user });
    }
    catch (error) {
        return res.status(500).json({ error: "Failed to create user" });
    }
}));
//@ts-ignore
app.post("/updateWins", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { walletAddress, updateId, amount } = req.body;
    if (!walletAddress || updateId !== 0 && updateId !== 1 && updateId !== 2) {
        return res.status(400).json({ error: "Invalid request" });
    }
    try {
        const contests = yield prisma.contests.findMany();
        let contest;
        if (updateId === 0) {
            contest = contests[0];
            yield prisma.winning.update({
                where: { userWalletAddress: walletAddress, id: contest.id },
                data: {
                    usdc: amount
                }
            });
        }
        else if (updateId === 1) {
            contest = contests[1];
            yield prisma.winning.update({
                where: { userWalletAddress: walletAddress, id: contest.id },
                data: {
                    sol: amount
                }
            });
        }
        else if (updateId === 2) {
            contest = contests[2];
            yield prisma.winning.update({
                where: { userWalletAddress: walletAddress, id: contest.id },
                data: {
                    agld: amount
                }
            });
            return res.json({ success: true });
        }
    }
    catch (error) {
        return res.status(500).json({ error: "Failed to update wins" });
    }
}));
//@ts-ignore
app.get("/get-user-position", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    const { walletAddress, contestName } = req.query;
    if (!walletAddress || !contestName) {
        return res.status(400).json({ error: "Wallet address and contest name are required" });
    }
    try {
        const contest = yield prisma.contests.findUnique({
            where: { name: contestName },
            include: {
                participants: {
                    include: {
                        winning: true
                    }
                }
            }
        });
        if (!contest) {
            return res.status(400).json({ error: "Contest not found" });
        }
        const sortedParticipants = (0, returnParticipantInfo_1.returnParticipantInfo)(contest.participants, contest.name);
        const position = sortedParticipants.findIndex(p => p.walletAddress === walletAddress) + 1;
        if (position === 0) {
            return res.status(400).json({ error: "User not found in contest" });
        }
        const topParticipants = sortedParticipants.slice(0, 100);
        let points = 0;
        if (contest.name === "USDC") {
            points = ((_a = sortedParticipants[position - 1].winning) === null || _a === void 0 ? void 0 : _a.usdc) || 0;
        }
        else if (contest.name === "SOL") {
            points = ((_b = sortedParticipants[position - 1].winning) === null || _b === void 0 ? void 0 : _b.sol) || 0;
        }
        else if (contest.name === "AGLD") {
            points = ((_c = sortedParticipants[position - 1].winning) === null || _c === void 0 ? void 0 : _c.agld) || 0;
        }
        return res.json({
            position,
            points,
            totalCandidates: contest.participants.length,
            topParticipants
        });
    }
    catch (error) {
        return res.status(500).json({ error: "Failed to get user position" });
    }
}));
app.listen(3000, () => {
    console.log("Server is running on port 3000");
});
