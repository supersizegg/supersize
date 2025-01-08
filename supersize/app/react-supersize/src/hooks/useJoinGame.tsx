import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import {
    Connection,
    Keypair,
    PublicKey,
    SystemProgram,
    SYSVAR_RENT_PUBKEY,
    Transaction,
} from "@solana/web3.js";
import { ActiveGame, Blob, Food } from "@utils/types";
import { useCallback } from "react";
import {
    ANTEROOM_COMPONENT,
    BUY_IN,
    FOOD_COMPONENT,
    JOIN_GAME,
    MAP_COMPONENT,
    PLAYER_COMPONENT,
} from "@utils/constants";
import {
    ApplySystem,
    createDelegateInstruction,
    FindComponentPda,
    FindEntityPda,
} from "@magicblock-labs/bolt-sdk";
import {
    createAssociatedTokenAccountInstruction,
    getAssociatedTokenAddress,
    TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { getMemberPDA } from "buddy.link";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import { createUndelegateInstruction } from "@magicblock-labs/bolt-sdk";
import axios from "axios";
import BN from "bn.js";

interface UseJoinGameProps {
    playerKey: PublicKey;
    setIsJoining: (value: boolean) => void;
    setGameId: (value: PublicKey | null) => void;
    setMapSize: (value: number) => void;
    entityMatch: React.MutableRefObject<PublicKey | null>;
    currentPlayerEntity: React.MutableRefObject<PublicKey | null>;
    anteroomEntity: React.MutableRefObject<PublicKey | null>;
    currentWorldId: React.MutableRefObject<PublicKey | null>;
    foodEntities: React.MutableRefObject<PublicKey[]>;
    playerEntities: React.MutableRefObject<PublicKey[]>;
    setAllPlayers: (value: Blob[]) => void;
    setAllFood: (value: Food[][]) => void;
    setFoodListLen: (value: number[]) => void;
    subscribeToGame: () => Promise<void>;
    walletRef: React.MutableRefObject<Keypair>;
    providerEphemeralRollup: React.MutableRefObject<anchor.AnchorProvider>;
    publicKey: PublicKey | null;
    playerName: string;
    buyIn: number;
    setCashoutTx: (value: string | null) => void;
    setTransactionError: (value: string | null) => void;
    joinedOrg: boolean;
    provider: anchor.Provider;
    setScreenSize: (value: { width: number; height: number }) => void;
    submitTransactionUser: (tx: anchor.web3.Transaction) => Promise<string>;
    setIsSubmitting: (value: boolean) => void;
    getComponentsClient: (componentId: PublicKey) => Promise<Program>;
    getComponentsClientBasic: (componentId: PublicKey) => Promise<Program>;
    fetchTokenMetadata: (tokenAddress: string) => Promise<{ name: string; image: string }>;
}

export const useJoinGame = ({
    playerKey,
    setIsJoining,
    setGameId,
    setMapSize,
    entityMatch,
    currentPlayerEntity,
    anteroomEntity,
    currentWorldId,
    foodEntities,
    playerEntities,
    setAllPlayers,
    setAllFood,
    setFoodListLen,
    subscribeToGame,
    walletRef,
    providerEphemeralRollup,
    publicKey,
    playerName,
    buyIn,
    setCashoutTx,
    setTransactionError,
    joinedOrg,
    provider,
    setScreenSize,
    submitTransactionUser,
    setIsSubmitting,
    getComponentsClient,
    getComponentsClientBasic,
    fetchTokenMetadata,
}: UseJoinGameProps) => {
    return useCallback(async (selectGameId: ActiveGame) => {
        if (!playerKey) {
            setTransactionError("Wallet not connected");
            return;
        }
        if (!publicKey) {
            setTransactionError("Wallet not connected");
            return;
        }
        if (selectGameId.name == "loading") return;
        setIsJoining(true);
        setScreenSize({ width: selectGameId.size, height: selectGameId.size });
        const gameInfo = selectGameId;
        let maxplayer = 20;
        let foodcomponents = 32;

        const mapseed = "origin";
        const mapEntityPda = FindEntityPda({
            worldId: gameInfo.worldId,
            entityId: new anchor.BN(0),
            seed: mapseed
        });

        const mapComponentPda = FindComponentPda({
            componentId: MAP_COMPONENT,
            entity: mapEntityPda,
        });

        let map_size = 4000;
        const mapComponentClient = await getComponentsClient(MAP_COMPONENT);
        const mapacc = await providerEphemeralRollup.current.connection.getAccountInfo(
            mapComponentPda, "processed"
        );
        if (mapacc) {
            const mapParsedData = mapComponentClient.coder.accounts.decode("map", mapacc.data);
            map_size = mapParsedData.width;
        }
        setMapSize(map_size);
        if (map_size == 4000) {
            maxplayer = 20;
            foodcomponents = 16 * 5;
        }
        else if (map_size == 6000) {
            maxplayer = 40;
            foodcomponents = 36 * 5;
        }
        else if (map_size == 10000) {
            maxplayer = 100;
            foodcomponents = 100 * 5;
        }

        entityMatch.current = mapEntityPda;
        const foodEntityPdas: PublicKey[] = [];

        for (let i = 1; i < foodcomponents + 1; i++) {
            const foodseed = 'food' + i.toString();
            const foodEntityPda = FindEntityPda({
                worldId: gameInfo.worldId,
                entityId: new anchor.BN(0),
                seed: foodseed
            });
            foodEntityPdas.push(foodEntityPda);
        }

        const playerEntityPdas: PublicKey[] = [];
        const playerClientER = await getComponentsClient(PLAYER_COMPONENT);
        const playerClient = await getComponentsClientBasic(PLAYER_COMPONENT);
        let newplayerEntityPda: PublicKey | null = null;
        let myPlayerId = '';
        let myPlayerStatus = 'new_player';
        let need_to_undelegate = false;

        for (let i = 1; i < maxplayer + 1; i++) {
            const playerentityseed = 'player' + i.toString();
            const playerEntityPda = FindEntityPda({
                worldId: gameInfo.worldId,
                entityId: new anchor.BN(0),
                seed: playerentityseed
            });
            playerEntityPdas.push(playerEntityPda);
            const playersComponentPda = FindComponentPda({
                componentId: PLAYER_COMPONENT,
                entity: playerEntityPda,
            });

            const playersacc = await provider.connection.getAccountInfo(
                playersComponentPda, "processed"
            );
            const playersaccER = await providerEphemeralRollup.current.connection.getAccountInfo(
                playersComponentPda, "processed"
            );

            if (playersacc) {
                const playersParsedData = playerClient.coder.accounts.decode("player", playersacc.data);
                if (playersacc.owner.toString() === "DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh") {
                    if (playersParsedData.authority !== null) {
                        if (playersaccER) {
                            const playersParsedDataER = playerClientER.coder.accounts.decode("player", playersaccER.data);
                            if (playersParsedData.authority.toString() == playerKey.toString()) {
                                if (playersParsedDataER.authority) {
                                    if (playersParsedDataER.authority.toString() == playerKey.toString()) {
                                        myPlayerStatus = "resume_session";
                                        newplayerEntityPda = playerEntityPda;
                                        myPlayerId = playerentityseed;
                                        need_to_undelegate = false;
                                    } else {
                                        myPlayerStatus = "rejoin_session";
                                        newplayerEntityPda = playerEntityPda;
                                        myPlayerId = playerentityseed;
                                        need_to_undelegate = false;
                                    }
                                } else {
                                    myPlayerStatus = "rejoin_session";
                                    newplayerEntityPda = playerEntityPda;
                                    myPlayerId = playerentityseed;
                                    need_to_undelegate = false;
                                }
                            } else {
                                if (playersParsedDataER.authority == null &&
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
                                        myPlayerId = playerentityseed;
                                        need_to_undelegate = true;
                                    }
                                }
                            }
                        } else if (playersParsedData.authority !== null) {
                            if (playersParsedData.authority.toString() == playerKey.toString()) {
                                myPlayerStatus = "rejoin_session";
                                newplayerEntityPda = playerEntityPda;
                                myPlayerId = playerentityseed;
                                need_to_undelegate = false;
                            }
                        }
                    }
                } else if (playersParsedData.authority == null && newplayerEntityPda == null) {
                    newplayerEntityPda = playerEntityPda;
                    myPlayerId = playerentityseed;
                    need_to_undelegate = false;
                } else {
                    if (playersParsedData.authority !== null) {
                        if (playersParsedData.authority.toString() == playerKey.toString()) {
                            myPlayerStatus = "rejoin_undelegated";
                            newplayerEntityPda = playerEntityPda;
                            myPlayerId = playerentityseed;
                            need_to_undelegate = false;
                        }
                    }
                }
            } else {
                if (newplayerEntityPda == null) {
                    newplayerEntityPda = playerEntityPda;
                    myPlayerId = playerentityseed;
                    need_to_undelegate = false;
                }
            }
        }

        console.log('my player', myPlayerId, myPlayerStatus);

        if (!newplayerEntityPda) {
            setTransactionError("No available player slots");
            setIsJoining(false);
            return;
        }

        const playerComponentPda = FindComponentPda({
            componentId: PLAYER_COMPONENT,
            entity: newplayerEntityPda,
        });
        console.log('component pda', playerComponentPda.toString());

        if (need_to_undelegate) {
            try {
                const undelegateIx = createUndelegateInstruction({
                    payer: playerKey,
                    delegatedAccount: playerComponentPda,
                    componentPda: PLAYER_COMPONENT,
                });
                let undeltx = new anchor.web3.Transaction().add(undelegateIx);
                undeltx.recentBlockhash = (await providerEphemeralRollup.current.connection.getLatestBlockhash()).blockhash;
                undeltx.feePayer = walletRef.current.publicKey;
                undeltx.sign(walletRef.current);
                const playerundelsignature = await providerEphemeralRollup.current.sendAndConfirm(undeltx, [], { skipPreflight: false });
                console.log('undelegate', playerundelsignature);
            } catch (error) {
                console.log('Error undelegating:', error);
            }
        }

        // ... Rest of join game logic including:
        // - Player component initialization
        // - Buy-in transaction
        // - Game joining transaction
        // - Subscription setup

        const anteseed = "ante";
        const anteEntityPda = FindEntityPda({
            worldId: gameInfo.worldId,
            entityId: new anchor.BN(0),
            seed: anteseed
        });

        const anteComponentPda = FindComponentPda({
            componentId: ANTEROOM_COMPONENT,
            entity: anteEntityPda,
        });

        const anteComponentClient = await getComponentsClient(ANTEROOM_COMPONENT);
        const anteacc = await provider.connection.getAccountInfo(
            anteComponentPda, "processed"
        );

        let token_account_owner_pda = new PublicKey(0);
        let vault_token_account = new PublicKey(0);
        let mint_of_token_being_sent = new PublicKey(0);
        let sender_token_account = new PublicKey(0);
        let payout_token_account = new PublicKey(0);
        let vault_program_id = new PublicKey("BAP315i1xoAXqbJcTT1LrUS45N3tAQnNnPuNQkCcvbAr");
        let referral_vault_program_id = new PublicKey("CLC46PuyXnSuZGmUrqkFbAh7WwzQm8aBPjSQ3HMP56kp");
        const combinedTx = new Transaction();

        if (anteacc) {
            const anteParsedData = anteComponentClient.coder.accounts.decode("anteroom", anteacc.data);
            vault_token_account = anteParsedData.vaultTokenAccount;
            mint_of_token_being_sent = anteParsedData.token;
            let usertokenAccountInfo = await getAssociatedTokenAddress(
                mint_of_token_being_sent,
                publicKey
            );
            payout_token_account = usertokenAccountInfo;
            const { name, image } = await fetchTokenMetadata(mint_of_token_being_sent.toString());
            console.log("token", name, mint_of_token_being_sent.toString());

            try {
                let response = await axios.post("https://supersize.lewisarnsten.workers.dev/create-contest", {
                    name: name,
                    tokenAddress: mint_of_token_being_sent.toString()
                });
                console.log(response);
            } catch (error) {
                console.log('error', error);
            }

            try {
                let username = publicKey.toString();
                if (mint_of_token_being_sent.toString() != "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v") {
                    username = publicKey.toString() + "_" + name;
                }
                let response = await axios.post("https://supersize.lewisarnsten.workers.dev/create-user", {
                    walletAddress: publicKey.toString(),
                    name: username,
                    contestId: name,
                });
                console.log(response);
            } catch (error) {
                console.log('error', error);
            }
        } else {
            setTransactionError("Failed to find game token info");
            return;
        }

        if (myPlayerStatus !== "rejoin_undelegated" && myPlayerStatus !== "resume_session" && myPlayerStatus !== "rejoin_session") {
            let [referralTokenAccountOwnerPda] = PublicKey.findProgramAddressSync(
                [Buffer.from("token_account_owner_pda"), mint_of_token_being_sent.toBuffer()],
                referral_vault_program_id
            );
            const referraltokenVault = await getAssociatedTokenAddress(
                mint_of_token_being_sent, 
                referralTokenAccountOwnerPda, 
                true
            );

            const BUDDY_LINK_PROGRAM_ID = new PublicKey("BUDDYtQp7Di1xfojiCSVDksiYLQx511DPdj2nbtG9Yu5");

            let buddyMemberPdaAccount: PublicKey;
            let memberName = "notmembersalt";
            buddyMemberPdaAccount = getMemberPDA(BUDDY_LINK_PROGRAM_ID, "supersize", memberName);

            let [refferalPdaAccount] = PublicKey.findProgramAddressSync(
                [Buffer.from("subsidize"), buddyMemberPdaAccount.toBuffer(), mint_of_token_being_sent.toBuffer()],
                referral_vault_program_id
            );

            const extraAccounts = [
                {
                    pubkey: vault_token_account,
                    isWritable: true,
                    isSigner: false,
                },
                {
                    pubkey: playerKey,
                    isWritable: true,
                    isSigner: false,
                },
                {
                    pubkey: payout_token_account,
                    isWritable: true,
                    isSigner: false,
                },
                {
                    pubkey: referraltokenVault,
                    isWritable: true,
                    isSigner: false,
                },
                {
                    pubkey: referralTokenAccountOwnerPda,
                    isWritable: true,
                    isSigner: false,
                },
                {
                    pubkey: refferalPdaAccount,
                    isWritable: true,
                    isSigner: false,
                },
                {
                    pubkey: buddyMemberPdaAccount,
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

            const applyBuyInSystem = await ApplySystem({
                authority: publicKey,
                world: gameInfo.worldPda,
                entities: [
                    {
                        entity: newplayerEntityPda,
                        components: [{ componentId: PLAYER_COMPONENT }],
                    },
                    {
                        entity: anteEntityPda,
                        components: [{ componentId: ANTEROOM_COMPONENT }],
                    },
                ],
                systemId: BUY_IN,
                args: {
                    buyin: buyIn,
                    member_name: memberName,
                },
                extraAccounts: extraAccounts,
            });
            combinedTx.add(applyBuyInSystem.transaction);
        }

        if (myPlayerStatus !== "resume_session") {
            try {
                const playerdeltx = new anchor.web3.Transaction();
                const playerdelegateIx = createDelegateInstruction({
                    entity: newplayerEntityPda,
                    account: playerComponentPda,
                    ownerProgram: PLAYER_COMPONENT,
                    payer: publicKey,
                });
                combinedTx.add(playerdelegateIx);
                const playerdelsignature = await submitTransactionUser(combinedTx);
                console.log(`Delegation signature: ${playerdelsignature}`);
                
                const acc = await providerEphemeralRollup.current.connection.getAccountInfo(
                    playerComponentPda
                );
                if (acc) {
                    console.log('confirm del', acc.owner.toString());
                }
            } catch (error) {
                console.log('Error delegating:', error);
                setTransactionError("Buy in failed, please retry");
                setIsSubmitting(false);
                setIsJoining(false);
                return;
            }
        }

        const applySystem = await ApplySystem({
            authority: playerKey,
            world: gameInfo.worldPda,
            entities: [
                {
                    entity: newplayerEntityPda,
                    components: [{ componentId: PLAYER_COMPONENT }],
                },
                {
                    entity: mapEntityPda,
                    components: [{ componentId: MAP_COMPONENT }],
                },
            ],
            systemId: JOIN_GAME,
            args: {
                name: playerName,
            },
        });

        const jointransaction = applySystem.transaction;
        const {
            context: { slot: minContextSlot },
            value: { blockhash, lastValidBlockHeight }
        } = await providerEphemeralRollup.current.connection.getLatestBlockhashAndContext();

        jointransaction.recentBlockhash = blockhash;
        jointransaction.feePayer = walletRef.current.publicKey;
        jointransaction.sign(walletRef.current);

        let signature = await providerEphemeralRollup.current.connection.sendRawTransaction(
            jointransaction.serialize(),
            { skipPreflight: true }
        ).catch((error) => {
            console.log(error);
        });
        console.log('joined game', signature);

        const startTime = Date.now();
        while (Date.now() - startTime < 5000) {
            const playersacc = await providerEphemeralRollup.current.connection.getAccountInfo(
                playerComponentPda,
                "processed"
            );
            if (playersacc) {
                const playersParsedData = playerClientER.coder.accounts.decode("player", playersacc.data);
                if (playersParsedData.authority !== null && playersParsedData.mass !== 0) {
                    break;
                }
            }
            signature = await providerEphemeralRollup.current.connection.sendRawTransaction(
                jointransaction.serialize(),
                { skipPreflight: true }
            ).catch((error) => {
                console.log(error);
            });
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        if (signature) {
            setCashoutTx(null);
            setGameId(mapEntityPda);
            setMapSize(selectGameId.size);
            entityMatch.current = mapEntityPda;
            currentPlayerEntity.current = newplayerEntityPda;
            anteroomEntity.current = anteEntityPda;
            currentWorldId.current = gameInfo.worldPda;
            foodEntities.current = foodEntityPdas;
            playerEntities.current = playerEntityPdas;

            const emptyPlayer: Blob = {
                name: 'unnamed',
                authority: null,
                x: 50000,
                y: 50000,
                radius: 0,
                mass: 0,
                score: 0,
                tax: 0,
                speed: 0,
                removal: new BN(0),
                target_x: 0,
                target_y: 0,
                timestamp: 0,
            };

            setAllPlayers(new Array(playerEntityPdas.length).fill(emptyPlayer));
            setAllFood(new Array(foodEntityPdas.length).fill([]));
            setFoodListLen(new Array(foodEntityPdas.length).fill(0));
            await subscribeToGame();
            setIsJoining(false);
        }

    }, [
        playerKey,
        setIsJoining,
        setGameId,
        setMapSize,
        entityMatch,
        currentPlayerEntity,
        anteroomEntity,
        currentWorldId,
        foodEntities,
        playerEntities,
        setAllPlayers,
        setAllFood,
        setFoodListLen,
        subscribeToGame,
        walletRef,
        providerEphemeralRollup,
        publicKey,
        playerName,
        buyIn,
        setCashoutTx,
        setTransactionError,
        joinedOrg,
        provider,
        setScreenSize,
        submitTransactionUser,
        setIsSubmitting,
        getComponentsClient,
        getComponentsClientBasic,
        fetchTokenMetadata,
    ]);
}; 