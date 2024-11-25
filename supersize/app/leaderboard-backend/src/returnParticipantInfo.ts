import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const returnParticipantInfo = (participants: any[], contestName: string) => {
    let sortedParticipants = [];
    if (contestName === "USDC") {
        sortedParticipants = participants
            .filter(p => p.winning) // Filter out participants without winning records
            .sort((a, b) => {
                return (b.winning?.usdc || 0) - (a.winning?.usdc || 0); // Sort by USDC amount descending
            });
    } else if (contestName === "SOL") {
        sortedParticipants = participants
            .filter(p => p.winning) // Filter out participants without winning records
            .sort((a, b) => {
                return (b.winning?.sol || 0) - (a.winning?.sol || 0); // Sort by SOL amount descending
            });
    } else if (contestName === "AGLD") {
        sortedParticipants = participants
            .filter(p => p.winning) // Filter out participants without winning records
            .sort((a, b) => {
                return (b.winning?.agld || 0) - (a.winning?.agld || 0); // Sort by AGLD amount descending
            });
    }   
    return sortedParticipants;
};

