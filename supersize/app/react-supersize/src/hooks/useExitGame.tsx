import React from 'react';
import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { ApplySystem } from "@magicblock-labs/bolt-sdk";
import { EXIT_GAME, MAP_COMPONENT, PLAYER_COMPONENT } from "@utils/constants";

interface UseExitGameProps {
    playerKey: PublicKey;
    currentWorldId: React.MutableRefObject<PublicKey | null>;
    currentPlayerEntity: React.MutableRefObject<PublicKey | null>;
    entityMatch: React.MutableRefObject<PublicKey | null>;
    providerEphemeralRollup: React.MutableRefObject<anchor.AnchorProvider>;
    walletRef: React.MutableRefObject<anchor.web3.Keypair>;
    setGameId: (value: PublicKey | null) => void;
    setGameEnded: (value: number) => void;
    setTransactionError: (value: string | null) => void;
    setCashingOut: (value: boolean) => void;
}

export const useExitGame = ({
    playerKey,
    currentWorldId,
    currentPlayerEntity,
    entityMatch,
    providerEphemeralRollup,
    walletRef,
    setGameId,
    setGameEnded,
    setTransactionError,
    setCashingOut,
}: UseExitGameProps) => {
    const preExitGameTx = async () => {
        if (!playerKey) {
            setTransactionError("Wallet is not initialized");
            return null;
        }
        if (currentWorldId.current == null) {
            setTransactionError("world not found");
            return null;
        }
        const player_entity = currentPlayerEntity.current as PublicKey;
        const map_entity = entityMatch.current as PublicKey;

        const applySystem = await ApplySystem({
            authority: playerKey,
            world: currentWorldId.current,
            entities: [
                {
                    entity: player_entity,
                    components: [{ componentId: PLAYER_COMPONENT }],
                },
                {
                    entity: map_entity,
                    components: [{ componentId: MAP_COMPONENT }],
                },
            ],
            systemId: EXIT_GAME,
            args: {
                timestamp: performance.now(),
            },
        });

        const transaction = applySystem.transaction;
        const {
            context: { slot: minContextSlot },
            value: { blockhash, lastValidBlockHeight },
        } = await providerEphemeralRollup.current.connection.getLatestBlockhashAndContext();

        transaction.recentBlockhash = blockhash;
        transaction.feePayer = walletRef.current.publicKey;
        transaction.sign(walletRef.current);
        console.log("staged exit");

        const signature = await providerEphemeralRollup.current.connection.sendRawTransaction(
            transaction.serialize(),
            { skipPreflight: true },
        );
    };

    const exitGameTx = async () => {
        if (!playerKey) {
            setTransactionError("Wallet is not initialized");
            return null;
        }
        if (currentWorldId.current == null) {
            setTransactionError("world not found");
            return null;
        }
        const player_entity = currentPlayerEntity.current as PublicKey;
        const map_entity = entityMatch.current as PublicKey;

        const applySystem = await ApplySystem({
            authority: playerKey,
            world: currentWorldId.current,
            entities: [
                {
                    entity: player_entity,
                    components: [{ componentId: PLAYER_COMPONENT }],
                },
                {
                    entity: map_entity,
                    components: [{ componentId: MAP_COMPONENT }],
                },
            ],
            systemId: EXIT_GAME,
            args: {
                timestamp: performance.now(),
            },
        });

        const transaction = applySystem.transaction;
        const {
            context: { slot: minContextSlot },
            value: { blockhash, lastValidBlockHeight },
        } = await providerEphemeralRollup.current.connection.getLatestBlockhashAndContext();

        transaction.recentBlockhash = blockhash;
        transaction.feePayer = walletRef.current.publicKey;
        transaction.sign(walletRef.current);
        setCashingOut(true);

        try {
            const signature = await providerEphemeralRollup.current.sendAndConfirm(transaction);
            console.log("exiting", signature);
            if (signature != null) {
                setGameId(null);
                setGameEnded(2);
            }
        } catch (error) {
            console.log("Error cashing out:", error);
        }
    };

    return { preExitGameTx, exitGameTx };
}; 