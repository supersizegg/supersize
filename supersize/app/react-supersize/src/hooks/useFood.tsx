import React from 'react';
import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { ApplySystem } from "@magicblock-labs/bolt-sdk";
import { FOOD_COMPONENT, MAP_COMPONENT, SPAWN_FOOD } from "@utils/constants";
import { waitSignatureConfirmation } from "@utils/helper";

interface UseFoodProps {
    currentWorldId: React.MutableRefObject<PublicKey | null>;
    currentPlayerEntity: React.MutableRefObject<PublicKey | null>;
    entityMatch: React.MutableRefObject<PublicKey | null>;
    foodEntities: React.MutableRefObject<PublicKey[]>;
    foodListLen: number[];
    foodKey: PublicKey;
    foodwalletRef: React.MutableRefObject<anchor.web3.Keypair>;
    providerEphemeralRollup: React.MutableRefObject<anchor.AnchorProvider>;
    mapSize: number;
}

const getSectionIndex = (
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
    let baseIndex = row * sectionsPerRow + col;
    let food_indices: number[] = [];
    for (let i = 0; i < duplicateEncodings; i++) {
        food_indices.push(baseIndex + i * mapSectionCount);
    }
    return food_indices;
};

export const useFood = ({
    currentWorldId,
    currentPlayerEntity,
    entityMatch,
    foodEntities,
    foodListLen,
    foodKey,
    foodwalletRef,
    providerEphemeralRollup,
    mapSize,
}: UseFoodProps) => {
    const processNewFoodTransaction = async (foodX: number, foodY: number) => {
        if (currentWorldId.current !== null) {
            const allTransaction = new anchor.web3.Transaction();
            if (currentPlayerEntity.current && entityMatch.current) {
                try {
                    let currentSection = getSectionIndex(
                        foodX,
                        foodY,
                        mapSize,
                        2,
                    );
                    let selectedSection = currentSection.reduce(
                        (minIndex, currentIndex) =>
                            foodListLen[currentIndex] < foodListLen[minIndex]
                                ? currentIndex
                                : minIndex,
                        currentSection[0],
                    );

                    const newFoodTx = await ApplySystem({
                        authority: foodKey,
                        world: currentWorldId.current,
                        entities: [
                            {
                                entity: entityMatch.current,
                                components: [{ componentId: MAP_COMPONENT }],
                            },
                            {
                                entity: foodEntities.current[selectedSection],
                                components: [{ componentId: FOOD_COMPONENT }],
                            },
                        ],
                        systemId: SPAWN_FOOD,
                        args: {
                            timestamp: performance.now(),
                        },
                    });

                    const {
                        context: { slot: minContextSlot },
                        value: { blockhash, lastValidBlockHeight },
                    } = await providerEphemeralRollup.current.connection.getLatestBlockhashAndContext();

                    allTransaction.add(newFoodTx.transaction);
                    allTransaction.recentBlockhash = blockhash;
                    allTransaction.feePayer = foodwalletRef.current.publicKey;
                    allTransaction.sign(foodwalletRef.current);

                    const signature = await providerEphemeralRollup.current.connection
                        .sendRawTransaction(allTransaction.serialize(), {
                            skipPreflight: true,
                        })
                        .catch((error) => {
                            console.log(error);
                        });

                    if (signature) {
                        await waitSignatureConfirmation(
                            signature,
                            providerEphemeralRollup.current.connection,
                            "finalized",
                        );
                    }
                } catch (error) {
                    console.log("Transaction failed", error);
                }
            }
        }
    };

    return processNewFoodTransaction;
}; 