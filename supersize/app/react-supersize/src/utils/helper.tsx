import { API_BASE_URL } from "@utils/constants"
import { PublicKey, Keypair } from "@solana/web3.js";
import * as crypto from 'crypto-js';

export const deriveSeedFromPublicKey = (userPublicKey: PublicKey): Uint8Array => {
    const salt = 'supersizeSalt'; 
    const hash = crypto.SHA256(userPublicKey.toBuffer().toString() + salt);
    const hashArray = new Uint8Array(Buffer.from(hash.toString(crypto.enc.Hex), 'hex'));
    return hashArray.slice(0, 32); 
}

export const deriveKeypairFromPublicKey = (userPublicKey: PublicKey): Keypair => {
    const seed = deriveSeedFromPublicKey(userPublicKey);
    const keypair = Keypair.fromSeed(seed);
    return keypair;
}

export const updateWins = async (walletAddress: string, updateId: number, amount: number) => {
    const response = await fetch(`${API_BASE_URL}/updateWins`, {
        method: "POST",
        body: JSON.stringify({ walletAddress, updateId, amount }),
    });

    const resData = await response.json();
    if (!resData.success) {
        throw new Error("Failed to update wins");
    }
    return resData;
}
