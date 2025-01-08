import React from 'react';
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { ApplySystem, createUndelegateInstruction, FindComponentPda } from "@magicblock-labs/bolt-sdk";
import { ANTEROOM_COMPONENT, CASH_OUT, MAP_COMPONENT, PLAYER_COMPONENT } from "@utils/constants";
import { Blob } from "@utils/types";
import { getAssociatedTokenAddress } from "@solana/spl-token";
import axios from "axios";
import { SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

interface UseCleanupProps { 
    currentPlayer: Blob | null;
    cashingOut: boolean;
    gameEnded: number;
    currentWorldId: React.MutableRefObject<PublicKey | null>;
    currentPlayerEntity: React.MutableRefObject<PublicKey | null>;
    anteroomEntity: React.MutableRefObject<PublicKey | null>;
    entityMatch: React.MutableRefObject<PublicKey | null>;
    playerKey: PublicKey;
    publicKey: PublicKey | null; 
    providerEphemeralRollup: React.MutableRefObject<anchor.AnchorProvider>;
    walletRef: React.MutableRefObject<anchor.web3.Keypair>;
    myReferrer: React.MutableRefObject<string>;
    playerCashout: React.MutableRefObject<number>;
    setPlayerTax: (value: number) => void;
    setPlayerCashoutAddy: (value: PublicKey | null) => void;
    setCashoutTx: (value: string | null) => void;
    setGameId: (value: PublicKey | null) => void;
    setTransactionError: (value: string | null) => void;
    setPlayers: (value: Blob[]) => void;
    setAllFood: (value: any[][]) => void;
    setFoodListLen: (value: number[]) => void;
    playersComponentSubscriptionId: React.MutableRefObject<number[] | null>;
    myplayerComponentSubscriptionId: React.MutableRefObject<number | null>;
    mapComponentSubscriptionId: React.MutableRefObject<number | null>;
    foodComponentSubscriptionId: React.MutableRefObject<number[] | null>;
    submitTransactionUser: (transaction: anchor.web3.Transaction) => Promise<string | null>;
    playerBuyIn: React.MutableRefObject<number>;
    getComponentsClient: (componentId: PublicKey) => Promise<Program>;
    getComponentsClientBasic: (componentId: PublicKey) => Promise<Program>;
    fetchTokenMetadata: (tokenAddress: string) => Promise<{ name: string; image: string }>;
}

export const useCleanup = ({
    currentPlayer,
    cashingOut,
    gameEnded,
    currentWorldId,
    currentPlayerEntity,
    anteroomEntity,
    entityMatch,
    playerKey,
    publicKey,
    providerEphemeralRollup,
    walletRef,
    myReferrer,
    playerCashout,
    setPlayerTax,
    setPlayerCashoutAddy,
    setCashoutTx,
    setGameId,
    setTransactionError,
    setPlayers,
    setAllFood,
    setFoodListLen,
    playersComponentSubscriptionId,
    myplayerComponentSubscriptionId,
    mapComponentSubscriptionId,
    foodComponentSubscriptionId,
    submitTransactionUser,
    playerBuyIn,
    getComponentsClient,
    getComponentsClientBasic,
    fetchTokenMetadata,
}: UseCleanupProps) => {
    const updateMyPlayerCashout = (player: any) => {
        console.log("updating cashout data", player);
        playerCashout.current = player.score;
        myReferrer.current = player.referrerTokenAccount;
        setPlayerTax(player.tax);
        setPlayerCashoutAddy(player.payoutTokenAccount);
    };

    const cleanup = async () => {
        if (
            currentPlayer &&
            Math.sqrt(currentPlayer.mass) == 0 &&
            ((cashingOut && gameEnded == 2) || !cashingOut)
        ) {
            if (currentWorldId.current == null) {
                setTransactionError('world not found');
                return;
            }

            if (currentPlayerEntity.current && anteroomEntity.current && entityMatch.current) {
                console.log('cashing out');
                const myplayerComponent = FindComponentPda({
                    componentId: PLAYER_COMPONENT,
                    entity: currentPlayerEntity.current,
                });

                let newplayersComponentClient = await getComponentsClient(PLAYER_COMPONENT);
                try {
                    const playerAccount = await (newplayersComponentClient.account as any).player
                        .fetch(myplayerComponent, "processed");
                    updateMyPlayerCashout(playerAccount);
                } catch (error) {
                    console.error("Failed to fetch account:", error);
                }

                const undelegateIx = createUndelegateInstruction({
                    payer: playerKey,
                    delegatedAccount: myplayerComponent,
                    componentPda: PLAYER_COMPONENT,
                });

                const tx = new anchor.web3.Transaction().add(undelegateIx);
                tx.recentBlockhash = (await providerEphemeralRollup.current.connection.getLatestBlockhash()).blockhash;
                tx.feePayer = walletRef.current.publicKey;
                tx.sign(walletRef.current);

                try {
                    const playerdelsignature = await providerEphemeralRollup.current.sendAndConfirm(
                        tx,
                        [],
                        { skipPreflight: false }
                    );
                    console.log('undelegate', playerdelsignature);
                } catch (error) {
                    console.log('Error undelegating:', error);
                }

                const anteComponentPda = FindComponentPda({
                    componentId: ANTEROOM_COMPONENT,
                    entity: anteroomEntity.current,
                });

                const anteComponentClient = await getComponentsClient(ANTEROOM_COMPONENT);
                const anteacc = await providerEphemeralRollup.current.connection.getAccountInfo(
                    anteComponentPda,
                    "processed"
                );

                if (anteacc && publicKey) {
                    const anteParsedData = anteComponentClient.coder.accounts.decode(
                        "anteroom",
                        anteacc.data
                    );

                    const vault_token_account = anteParsedData.vaultTokenAccount;
                    const mint_of_token_being_sent = anteParsedData.token;
                    const owner_token_account = anteParsedData.gamemasterTokenAccount;
                    const supersize_token_account = await getAssociatedTokenAddress(
                        mint_of_token_being_sent,
                        new PublicKey("DdGB1EpmshJvCq48W1LvB1csrDnC4uataLnQbUVhp6XB")
                    );

                    const { name } = await fetchTokenMetadata(mint_of_token_being_sent.toString());
                    console.log('win amount', (playerCashout.current * 0.98) - playerBuyIn.current);

                    try {
                        await axios.post('https://supersize.lewisarnsten.workers.dev/update-wins', {
                            walletAddress: publicKey.toString(),
                            amount: (playerCashout.current * 0.98) - playerBuyIn.current,
                            contestId: name
                        });
                    } catch (error) {
                        console.log('error', error);
                    }

                    let usertokenAccountInfo = await getAssociatedTokenAddress(
                        mint_of_token_being_sent,
                        publicKey
                    );

                    if (cashingOut && gameEnded == 2) {
                        setCashoutTx(null);
                        const extraAccounts = [
                            {
                                pubkey: vault_token_account,
                                isWritable: true,
                                isSigner: false,
                            },
                            {
                                pubkey: usertokenAccountInfo,
                                isWritable: true,
                                isSigner: false,
                            },
                            {
                                pubkey: owner_token_account,
                                isWritable: true,
                                isSigner: false,
                            },
                            {
                                pubkey: supersize_token_account,
                                isWritable: true,
                                isSigner: false,
                            },
                            {
                                pubkey: publicKey,
                                isWritable: true,
                                isSigner: false,
                            },
                            {
                                pubkey: SystemProgram.programId,
                                isWritable: false,
                                isSigner: false,
                            },
                            {
                                pubkey: TOKEN_PROGRAM_ID,
                                isWritable: false,
                                isSigner: false,
                            },
                            {
                                pubkey: SYSVAR_RENT_PUBKEY,
                                isWritable: false,
                                isSigner: false,
                            },
                        ];

                        const applyCashOutSystem = await ApplySystem({
                            authority: publicKey,
                            world: currentWorldId.current,
                            entities: [
                                {
                                    entity: currentPlayerEntity.current,
                                    components: [{ componentId: PLAYER_COMPONENT }],
                                },
                                {
                                    entity: anteroomEntity.current,
                                    components: [{ componentId: ANTEROOM_COMPONENT }],
                                },
                            ],
                            systemId: CASH_OUT,
                            args: {
                                referred: false,
                            },
                            extraAccounts: extraAccounts,
                        });

                        const cashouttx = new anchor.web3.Transaction()
                            .add(applyCashOutSystem.transaction);

                        const cashoutsignature = await submitTransactionUser(cashouttx);
                        console.log('cashout', cashoutsignature);

                        if (cashoutsignature) {
                            setCashoutTx(cashoutsignature);
                            cleanupSubscriptions();
                            resetGameState();
                        } else {
                            setCashoutTx("error");
                            setTransactionError("Error cashing out, please retry");
                            return;
                        }
                    } else {
                        cleanupSubscriptions();
                        resetGameState();
                    }
                }
            }
        }
    };

    const cleanupSubscriptions = async () => {
        if (mapComponentSubscriptionId?.current) {
            await providerEphemeralRollup.current.connection
                .removeAccountChangeListener(mapComponentSubscriptionId.current);
        }
        if (myplayerComponentSubscriptionId?.current) {
            await providerEphemeralRollup.current.connection
                .removeAccountChangeListener(myplayerComponentSubscriptionId.current);
        }
        if (foodComponentSubscriptionId?.current) {
            for (let i = 0; i < foodComponentSubscriptionId.current.length; i++) {
                await providerEphemeralRollup.current.connection
                    .removeAccountChangeListener(foodComponentSubscriptionId.current[i]);
            }
        }
        if (playersComponentSubscriptionId?.current) {
            for (let i = 0; i < playersComponentSubscriptionId.current.length; i++) {
                await providerEphemeralRollup.current.connection
                    .removeAccountChangeListener(playersComponentSubscriptionId.current[i]);
            }
        }
    };

    const resetGameState = () => {
        playersComponentSubscriptionId.current = [];
        currentPlayerEntity.current = null;
        entityMatch.current = null;
        setPlayers([]);
        setAllFood([]);
        setFoodListLen([]);
        setGameId(null);
    };

    return cleanup;
}; 