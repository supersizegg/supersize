import { API_BASE_URL, cachedTokenMetadata } from "@utils/constants";
import {Blob } from "@utils/types";

import { PublicKey, Keypair } from "@solana/web3.js";
import * as crypto from "crypto-js";
import * as anchor from "@coral-xyz/anchor";
import { MagicBlockEngine } from "@engine/MagicBlockEngine";
import { playerFetchOnChain } from "@states/gameFetch";
import { playerFetchOnEphem } from "@states/gameFetch";
import { FindEntityPda } from "@magicblock-labs/bolt-sdk";
import { COMPONENT_PLAYER_ID } from "@states/gamePrograms";
import { FindComponentPda } from "@magicblock-labs/bolt-sdk";
import { BN } from "@coral-xyz/anchor";

export const stringToUint8Array = (str: string): Uint8Array => {
    return new TextEncoder().encode(str);
};

export const deriveSeedFromPublicKey = (
    userPublicKey: PublicKey,
): Uint8Array => {
    const salt = "supersizeSalt";
    const hash = crypto.SHA256(userPublicKey.toBuffer().toString() + salt);
    const hashArray = new Uint8Array(
        Buffer.from(hash.toString(crypto.enc.Hex), "hex"),
    );
    return hashArray.slice(0, 32);
};

export const deriveKeypairFromPublicKey = (
    userPublicKey: PublicKey,
): Keypair => {
    const seed = deriveSeedFromPublicKey(userPublicKey);
    const keypair = Keypair.fromSeed(seed);
    return keypair;
};

export const updateWins = async (
    walletAddress: string,
    updateId: number,
    amount: number,
) => {
    const response = await fetch(`${API_BASE_URL}/updateWins`, {
        method: "POST",
        body: JSON.stringify({ walletAddress, updateId, amount }),
    });

    const resData = await response.json();
    if (!resData.success) {
        throw new Error("Failed to update wins");
    }
    return resData;
};

export const getTopLeftCorner = (
    index: number,
    mapSize: number,
): { x: number; y: number } => {
    const sectionSize = 1000;
    const sectionsPerRow = mapSize / sectionSize;
    const mapSectionCount = sectionsPerRow * sectionsPerRow;
    const wrappedIndex = index % mapSectionCount;
    const row = Math.floor(wrappedIndex / sectionsPerRow);
    const col = wrappedIndex % sectionsPerRow;
    const x = col * sectionSize;
    const y = row * sectionSize;

    return { x, y };
};

export const pingEndpoint = async (url: string): Promise<number> => {
    const startTime = performance.now();
    try {
        await fetch(url, { method: "HEAD" });
    } catch (error) {
        console.error(`Failed to ping ${url}:`, error);
    }
    const endTime = performance.now();
    return endTime - startTime;
};

export const checkTransactionStatus = async (
    connection: anchor.web3.Connection,
    signature: string,
): Promise<boolean> => {
    try {
        const status = await connection.getSignatureStatus(signature, {
            searchTransactionHistory: true,
        });
        if (
            status &&
            status.value &&
            status.value.confirmationStatus === "confirmed" &&
            status.value.err === null
        ) {
            //console.log("Transaction succeeded:", signature);
            return true;
        } else {
            console.warn("Transaction still pending or failed:", signature);
            return false;
        }
    } catch (error) {
        console.error("Error checking transaction status:", error);
        return false;
    }
};

export const waitSignatureConfirmation = async (
    signature: string,
    connection: anchor.web3.Connection,
    commitment: anchor.web3.Commitment,
): Promise<void> => {
    return new Promise((resolve, reject) => {
        connection.onSignature(
            signature,
            (result) => {
                if (result.err) {
                    //console.error(`Error with signature ${signature}`, result.err);
                    reject(result.err);
                } else {
                    setTimeout(() => resolve(), 1000);
                }
            },
            commitment,
        );
    });
};

export async function getPriorityFeeEstimate(
    priorityLevel: string,
    publicKeys: string[],
) {
    const response = await fetch(
        "https://mainnet.helius-rpc.com/?api-key=cba33294-aa96-414c-9a26-03d5563aa676",
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                jsonrpc: "2.0",
                id: "helius-example",
                method: "getPriorityFeeEstimate",
                params: [
                    {
                        accountKeys: publicKeys,
                        options: {
                            recommended: true,
                        },
                    },
                ],
            }),
        },
    );
    const data = await response.json();
    console.log(
        "Fee in function for",
        priorityLevel,
        " :",
        data.result.priorityFeeEstimate,
    );
    return data.result;
}



export async function fetchTokenMetadata (
    tokenAddress: string,
    network?: string,
){
    if (cachedTokenMetadata[tokenAddress]) {
        return cachedTokenMetadata[tokenAddress];
    }

    try {
        const response = await fetch(
            `https://${network || 'devnet'}.helius-rpc.com/?api-key=07a045b7-c535-4d6f-852b-e7290408c937`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    jsonrpc: "2.0",
                    id: 1, // Unique identifier
                    method: "getAsset",
                    params: [tokenAddress], // Token address passed in an array
                }),
            },
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Error fetching asset:", errorText);
            throw new Error(
                `HTTP Error: ${response.status} ${response.statusText}`,
            );
        }

        const data = await response.json();

        if (data.error) {
            throw new Error(data.error.message);
        }

        const content = data.result?.content;
        if (!content) {
            throw new Error("Content not found in response");
        }

        // Check if json_uri is present and not empty
        const jsonUri = content.json_uri;
        if (jsonUri) {
            const metadataResponse = await fetch(jsonUri);
            if (!metadataResponse.ok) {
                const errorText = await metadataResponse.text();
                console.error(
                    "Error fetching metadata from json_uri:",
                    errorText,
                );
                throw new Error(
                    `HTTP Error: ${metadataResponse.status} ${metadataResponse.statusText}`,
                );
            }
            const metadataJson = await metadataResponse.json();
            return {
                name: metadataJson.name || "Unknown",
                image: metadataJson.image || "",
            };
        }

        // Fallback to metadata from content if json_uri is empty
        const name = content.metadata?.symbol || "Unknown";
        const image = content.links?.image || content.files?.[0]?.uri || "";

        if (!image) {
            throw new Error("Image URI not found");
        }

        return { name, image };
    } catch (error) {
        console.error("Error fetching token metadata:", error);
        throw error;
    }
};


export const getSectionIndex = (
    x: number,
    y: number,
    mapSize: number,
    duplicateEncodings: number = 5,
): number[] => {
    const sectionSize = 1000;
    const sectionsPerRow = mapSize / sectionSize;
    const mapSectionCount = sectionsPerRow * sectionsPerRow;
    const adjustedX = Math.min(x, mapSize - 1);
    const adjustedY = Math.min(y, mapSize - 1);
    const row = Math.floor(adjustedY / sectionSize);
    const col = Math.floor(adjustedX / sectionSize);
    const baseIndex = row * sectionsPerRow + col;
    const food_indices: number[] = [];
    for (let i = 0; i < duplicateEncodings; i++) {
        food_indices.push(baseIndex + i * mapSectionCount);
    }
    return food_indices;
};

export const getClampedFoodPosition = (
    player_x: number,
    player_y: number,
    target_x: number,
    target_y: number,
    player_radius: number,
    map_width: number,
    map_height: number,
): { food_x: number; food_y: number } => {
    const dx = target_x - player_x;
    const dy = target_y - player_y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const unit_x = dx / dist;
    const unit_y = dy / dist;
    const pseudo_random_float_x = 1.5;
    const pseudo_random_float_y = 1.5;
    const offset_x = -unit_x * player_radius * pseudo_random_float_x;
    const offset_y = -unit_y * player_radius * pseudo_random_float_y;
    const food_x = Math.round(player_x + offset_x);
    const food_y = Math.round(player_y + offset_y);
    const clamped_food_x = Math.min(Math.max(food_x, 0), map_width);
    const clamped_food_y = Math.min(Math.max(food_y, 0), map_height);
    return { food_x: clamped_food_x, food_y: clamped_food_y };
};

export const checkPlayerDistances = (
    visiblePlayers: Blob[],
    currentPlayer: Blob,
    // screenSize: { width: number; height: number },
) => {
    if (currentPlayer?.radius) {
        for (const player of visiblePlayers) {
            const distance = Math.sqrt(
                (player.x - currentPlayer.x) ** 2 +
                (player.y - currentPlayer.y) ** 2,
            );
            if (distance < currentPlayer.radius) {
                return player.authority;
            }
        }
    }
    return null;
};

export const findListIndex = (pubkey: PublicKey, players: Blob[]): number | null => {
    const index = players.findIndex(
        (player) => player.authority?.toString() === pubkey.toString(),
    );
    return index !== -1 ? index : null;
};

export const decodeFood = (data: Uint8Array) => {
    if (!(data instanceof Uint8Array) || data.length !== 4) {
        throw new Error('Invalid food data format. Expected a Uint8Array of length 4.');
    }
    const buffer = data.buffer; // Get the ArrayBuffer from Uint8Array
    const packed = new DataView(buffer).getUint32(data.byteOffset, true); // Little-endian
    const x = packed & 0x3FFF;
    const y = (packed >> 14) & 0x3FFF;
    const size = (packed >> 28) & 0x0F;
    return { x, y, size };
};

export const getMyPlayerStatus = async (
    engine: MagicBlockEngine,
    worldId: BN,
    maxplayer: number,
): Promise<{
    playerStatus: string;
    need_to_delegate: boolean;
    need_to_undelegate: boolean;
    newplayerEntityPda: PublicKey;
    activeplayers: number;
} | "error"> => {
  const playerEntityPdas: PublicKey[] = [];
  let newplayerEntityPda: PublicKey | null = null;
  let playerStatus = "new_player";
  let need_to_undelegate = false;
  let need_to_delegate = false; 
  let activeplayers = 0;
  for (let i = 1; i < maxplayer + 1; i++) {
    const playerentityseed = "player" + i.toString();

    const playerEntityPda = FindEntityPda({
      worldId: worldId,
      entityId: new anchor.BN(0),
      seed: stringToUint8Array(playerentityseed),
    });
    playerEntityPdas.push(playerEntityPda);

    const playersComponentPda = FindComponentPda({
      componentId: COMPONENT_PLAYER_ID,
      entity: playerEntityPda,
    });

    const playersacc = await engine.getChainAccountInfo(playersComponentPda);
    if (!playersacc) { 
        continue;
    }
    const playersParsedData = await playerFetchOnChain(engine, playersComponentPda);
    if (!playersParsedData) {
        continue;
    }
    const playersParsedDataER = await playerFetchOnEphem(engine, playersComponentPda);

    
    

    if(playersParsedData.authority != null) {
        activeplayers = activeplayers + 1;
    }

    if (playersParsedData.authority == null) {
        if( newplayerEntityPda == null){
            newplayerEntityPda = playerEntityPda;
            if (playersacc.owner.toString() === "DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh") {
                need_to_undelegate = true;
                need_to_delegate = false;
            }else{
                need_to_undelegate = false;
                need_to_delegate = false;
            }
        }
    } 
    else if (playersParsedData.authority.toString() == engine.getSessionPayer().toString()) {

        if(playersParsedData.mass.toNumber() == 0 && playersParsedData.score == 0){
            playerStatus = "bought_in";
        }else if(playersParsedDataER && 
            playersParsedDataER.authority &&
            playersParsedDataER.authority.toString() == engine.getSessionPayer().toString()
            && playersParsedDataER.mass.toNumber() == 0
            && playersParsedDataER.score !== 0
        ){
            playerStatus = "cashing_out";
        }
        else{ 
            playerStatus = "in_game";
        }

        if(playerStatus == "bought_in" || playerStatus == "in_game"){
            if (playersacc.owner.toString() !== "DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh") {
                need_to_delegate = true;
                need_to_undelegate = false;
            }else{
                need_to_delegate = false;
                need_to_undelegate = false;
            }
        }
        if(playerStatus == "cashing_out"){
            if (playersacc.owner.toString() === "DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh") {
                need_to_undelegate = true;
                need_to_delegate = false;
            }else{
                need_to_undelegate = false;
                need_to_delegate = false;
            }
        }
        newplayerEntityPda = playerEntityPda;
    }
    else if ( 
        playersParsedDataER && 
        playersParsedDataER.authority == null &&
        playersParsedData.authority !== null &&
        playersParsedDataER.x == 50000 &&
        playersParsedDataER.y == 50000 &&
        playersParsedDataER.score == 0 &&
        newplayerEntityPda == null
      ) {
        const startTime = playersParsedDataER.joinTime.toNumber() * 1000;
        const currentTime = Date.now();
        const elapsedTime = currentTime - startTime;
        if (elapsedTime >= 10000) {
          newplayerEntityPda = playerEntityPda;
        if (playersacc.owner.toString() === "DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh") {
            need_to_undelegate = true;
            need_to_delegate = false;
        }else{
            need_to_undelegate = false;
            need_to_delegate = false;
        }
        }
    }
    else{
        continue;
    }
    }
    if(newplayerEntityPda == null) return "error";
    return {
        playerStatus: playerStatus,
        need_to_delegate: need_to_delegate,
        need_to_undelegate: need_to_undelegate,
        newplayerEntityPda: newplayerEntityPda,
        activeplayers: activeplayers,
    };
};