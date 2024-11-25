"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.returnParticipantInfo = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const returnParticipantInfo = (participants, contestName) => {
    let sortedParticipants = [];
    if (contestName === "USDC") {
        sortedParticipants = participants
            .filter(p => p.winning) // Filter out participants without winning records
            .sort((a, b) => {
            var _a, _b;
            return (((_a = b.winning) === null || _a === void 0 ? void 0 : _a.usdc) || 0) - (((_b = a.winning) === null || _b === void 0 ? void 0 : _b.usdc) || 0); // Sort by USDC amount descending
        });
    }
    else if (contestName === "SOL") {
        sortedParticipants = participants
            .filter(p => p.winning) // Filter out participants without winning records
            .sort((a, b) => {
            var _a, _b;
            return (((_a = b.winning) === null || _a === void 0 ? void 0 : _a.sol) || 0) - (((_b = a.winning) === null || _b === void 0 ? void 0 : _b.sol) || 0); // Sort by SOL amount descending
        });
    }
    else if (contestName === "AGLD") {
        sortedParticipants = participants
            .filter(p => p.winning) // Filter out participants without winning records
            .sort((a, b) => {
            var _a, _b;
            return (((_a = b.winning) === null || _a === void 0 ? void 0 : _a.agld) || 0) - (((_b = a.winning) === null || _b === void 0 ? void 0 : _b.agld) || 0); // Sort by AGLD amount descending
        });
    }
    return sortedParticipants;
};
exports.returnParticipantInfo = returnParticipantInfo;
