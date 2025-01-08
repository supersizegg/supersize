import React from 'react';
import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { ApplySystem } from "@magicblock-labs/bolt-sdk";
import { EAT_FOOD, EAT_PLAYER, FOOD_COMPONENT, MAP_COMPONENT, MOVEMENT, PLAYER_COMPONENT } from "@utils/constants";
import { Blob } from "@utils/types";

interface UseMovementProps {
    currentPlayerRef: React.MutableRefObject<Blob | null>;
    mousePositionRef: React.MutableRefObject<{x: number, y: number}>;
    isMouseDownRef: React.MutableRefObject<boolean>;
    exitHoveredRef: React.MutableRefObject<boolean>;
    currentWorldId: React.MutableRefObject<PublicKey | null>;
    playerKey: PublicKey;
    currentPlayerEntity: React.MutableRefObject<PublicKey | null>;
    entityMatch: React.MutableRefObject<PublicKey | null>;
    gameId: PublicKey | null;
    foodEntities: React.MutableRefObject<PublicKey[]>;
    foodListLen: number[];
    players: Blob[];
    screenSize: { width: number; height: number };
    mapSize: number;
    providerEphemeralRollup: React.MutableRefObject<anchor.AnchorProvider>;
    walletRef: React.MutableRefObject<anchor.web3.Keypair>;
    setIsSubmitting: (value: boolean) => void;
    setTransactionError: (value: string | null) => void;
    setTransactionSuccess: (value: string | null) => void;
    playerEntities: React.MutableRefObject<PublicKey[]>;
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

const getClampedFoodPosition = (
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

const checkPlayerDistances = (
    visiblePlayers: Blob[],
    currentPlayer: Blob,
    screenSize: { width: number; height: number },
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

const findListIndex = (pubkey: PublicKey, players: Blob[]): number | null => {
    const index = players.findIndex(
        (player) => player.authority?.toString() === pubkey.toString(),
    );
    return index !== -1 ? index : null;
};

export const useMovement = ({
    currentPlayerRef,
    mousePositionRef,
    isMouseDownRef,
    exitHoveredRef,
    currentWorldId,
    playerKey,
    currentPlayerEntity,
    entityMatch,
    gameId,
    foodEntities,
    foodListLen,
    players,
    screenSize,
    mapSize,
    providerEphemeralRollup,
    walletRef,
    setIsSubmitting,
    setTransactionError,
    setTransactionSuccess,
    playerEntities,
}: UseMovementProps) => {

    const handleMovementAndCharging = async () => {
        const currentPlayer = currentPlayerRef.current;
        const mousePosition = mousePositionRef.current;
        const isMouseDown = isMouseDownRef.current;
        const exitHovered = exitHoveredRef.current;

        const processSessionEphemTransaction = async (
            transaction: anchor.web3.Transaction,
        ): Promise<string> => {
            const signature = await providerEphemeralRollup.current.connection.sendRawTransaction(
                transaction.serialize(),
                { skipPreflight: true },
            );
            return signature;
        };

        if (!exitHovered && currentWorldId.current && playerKey && currentPlayer && 
            currentPlayer.authority && entityMatch.current && gameId && currentPlayerEntity.current) {
            try {
                const entity = gameId as PublicKey;
                let mouseX = mousePosition.x;
                let mouseY = mousePosition.y;
                const newX = Math.max(
                    0,
                    Math.min(
                        screenSize.width,
                        Math.floor(currentPlayer.x + mouseX - window.innerWidth / 2),
                    ),
                );
                const newY = Math.max(
                    0,
                    Math.min(
                        screenSize.height,
                        Math.floor(currentPlayer.y + mouseY - window.innerHeight / 2),
                    ),
                );

                const alltransaction = new anchor.web3.Transaction();

                let currentSection = getSectionIndex(currentPlayer.x, currentPlayer.y, mapSize, 2);
                for (const section_index of currentSection) { 
                    const eatFoodTx = await ApplySystem({
                        authority: playerKey,
                        world: currentWorldId.current,
                        entities: [
                            {
                                entity: currentPlayerEntity.current,
                                components: [{ componentId: PLAYER_COMPONENT }],
                            }, 
                            {
                                entity: foodEntities.current[section_index],
                                components: [{ componentId: FOOD_COMPONENT }],
                            },
                            {
                                entity: entityMatch.current,
                                components: [{ componentId: MAP_COMPONENT }],
                            },
                        ],
                        systemId: EAT_FOOD,
                        args: {
                            timestamp: performance.now(),
                        },
                    });
                    alltransaction.add(eatFoodTx.transaction);   
                }

                let playerstoeat = checkPlayerDistances(players, currentPlayer, screenSize);
                if (playerstoeat) {
                    let playersListIndex = findListIndex(playerstoeat, players);
                    if (playersListIndex != null) {
                        const eatPlayerTx = await ApplySystem({ 
                            authority: playerKey,
                            world: currentWorldId.current,
                            entities: [
                                {
                                    entity: currentPlayerEntity.current,
                                    components: [{ componentId: PLAYER_COMPONENT }],
                                },
                                {
                                    entity: playerEntities.current[playersListIndex],
                                    components: [{ componentId: PLAYER_COMPONENT }],
                                }, 
                                {
                                    entity: entityMatch.current,
                                    components: [{ componentId: MAP_COMPONENT }],
                                },
                            ],
                            systemId: EAT_PLAYER, 
                            args: {
                                timestamp: performance.now(),
                            },
                        });
                        
                        alltransaction.add(eatPlayerTx.transaction);
                    }
                }

                let {food_x, food_y} = getClampedFoodPosition(
                    currentPlayer.x, 
                    currentPlayer.y, 
                    newX, 
                    newY, 
                    currentPlayer.radius, 
                    mapSize, 
                    mapSize
                );

                let targetSectionBoosting = getSectionIndex(food_x, food_y, mapSize, 2);
                let selectedSection = targetSectionBoosting.reduce(
                    (minIndex, currentIndex) =>
                        foodListLen[currentIndex] < foodListLen[minIndex] ? currentIndex : minIndex,
                    targetSectionBoosting[0]
                );

                const makeMove = await ApplySystem({
                    authority: playerKey,
                    world: currentWorldId.current,
                    entities: [
                        {
                            entity: currentPlayerEntity.current,
                            components: [{ componentId: PLAYER_COMPONENT }],
                        },
                        {
                            entity: foodEntities.current[selectedSection],
                            components: [{ componentId: FOOD_COMPONENT }],
                        },
                        { 
                            entity: entityMatch.current,
                            components: [{ componentId: MAP_COMPONENT }],
                        },
                    ],
                    systemId: MOVEMENT,
                    args: {
                        x: newX,
                        y: newY,
                        boost: isMouseDown,
                        timestamp: performance.now(),
                    },
                });

                alltransaction.add(makeMove.transaction);

                const {
                    context: { slot: minContextSlot },
                    value: { blockhash, lastValidBlockHeight },
                } = await providerEphemeralRollup.current.connection.getLatestBlockhashAndContext();

                alltransaction.recentBlockhash = blockhash;
                alltransaction.feePayer = walletRef.current.publicKey;
                alltransaction.sign(walletRef.current);

                let signature = await processSessionEphemTransaction(alltransaction).catch((error) => {
                    console.log(error);
                });

                setIsSubmitting(false);
                setTransactionError(null);
                setTransactionSuccess(null);
            } catch (error) {
                setIsSubmitting(false);
            }
        }
    };

    return handleMovementAndCharging;
}; 