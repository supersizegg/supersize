import {
    ComputeBudgetProgram,
    LAMPORTS_PER_SOL,
    PublicKey,
    SystemProgram,
    Transaction,
} from "@solana/web3.js";
import {
    ApplySystem,
    createAddEntityInstruction,
    createDelegateInstruction,
    FindComponentPda,
    FindEntityPda,
    InitializeComponent,
    InitializeNewWorld,
} from "@magicblock-labs/bolt-sdk";
import { ActiveGame } from "@utils/types";
import {
    fetchTokenMetadata,
    getTopLeftCorner,
    stringToUint8Array,
} from "@utils/helper";
import { MagicBlockEngine } from "../engine/MagicBlockEngine";
import {
    COMPONENT_PLAYER_ID,
    COMPONENT_ANTEROOM_ID,
    COMPONENT_MAP_ID,
    COMPONENT_SECTION_ID,
} from "./gamePrograms";
import * as anchor from "@coral-xyz/anchor";
import {
    createAssociatedTokenAccountInstruction,
    getAssociatedTokenAddress,
} from "@solana/spl-token";
import { connection } from "@utils/constants";
import React from "react";
import { gameSystemInitMap } from "./gameSystemInitMap";
import { gameSystemInitPlayer } from "./gameSystemInitPlayer";
import { gameSystemInitAnteroom } from "./gameSystemInitAnteroom";
import { gameSystemInitSection } from "./gameSystemInitSection";
import { m } from "framer-motion";

const CONFIG = {
    computeUnitLimit: 200_000,
    computeUnitPrice: 1_000_002,
    reclaimLamportBuffer: 10_000, // Minimum buffer to avoid zero balance errors
    defaultBatchSize: 8,
};

async function addTransaction(
    setTransactions: React.Dispatch<React.SetStateAction<{ id: string; status: string }[]>>,
    id: string,
    status: string
) {
    setTransactions((prev) => [...prev, { id, status }]);
}

async function updateTransaction(
    setTransactions: React.Dispatch<React.SetStateAction<{ id: string; status: string }[]>>,
    id: string,
    status: string
) {
    setTransactions((prev) =>
        prev.map((txn) => (txn.id === id ? { ...txn, status } : txn))
    );
}

export async function gameExecuteNewGame(
    engine: any,
    game_size: number,
    max_buyin: number,
    min_buyin: number,
    game_owner_wallet_string: string,
    game_token_string: string,
    game_name: string,
    activeGames: any[],
    setActiveGames: (prev: any[]) => void,
    setTransactions: React.Dispatch<React.SetStateAction<{ id: string; status: string }[]>>
) {
    const base_buyin = Math.sqrt(max_buyin * min_buyin);
    const max_multiple = max_buyin / base_buyin;
    const min_multiple = base_buyin / min_buyin;
    if (max_multiple > 10 || min_multiple > 10) {
        throw new Error("Min-Max buy-in spread too large (max 10x).");
    }

    const gameParams = {
        4000: { maxplayer: 20, foodcomponents: 80, cost: 1.0 },
        6000: { maxplayer: 40, foodcomponents: 180, cost: 2.5 },
        10000: { maxplayer: 100, foodcomponents: 500, cost: 4.0 },
    }[game_size];

    if (!gameParams) {
        throw new Error("Invalid game size.");
    }

    const { maxplayer, foodcomponents, cost } = gameParams;

    const gameOwnerWallet = new PublicKey(game_owner_wallet_string);
    const mint_of_token = new PublicKey(game_token_string);
    const owner_token_account = await getAssociatedTokenAddress(
        mint_of_token,
        gameOwnerWallet
    );

    let decimals = 9;
    const mintInfo = await connection.getParsedAccountInfo(mint_of_token);
    if (mintInfo.value && "parsed" in mintInfo.value.data) {
        decimals = mintInfo.value.data.parsed.info.decimals;
    } else {
        throw new Error("Invalid token mint info.");
    }

    const solTxnId = "transfer-sol";
    await addTransaction(setTransactions, solTxnId, "pending");
    try {
        const solTransfer = SystemProgram.transfer({
            fromPubkey: engine.getWalletPayer(),
            toPubkey: engine.getSessionPayer(),
            lamports: cost * LAMPORTS_PER_SOL,
        });
        const solTx = new Transaction().add(solTransfer);
        await engine.processWalletTransaction(solTxnId, solTx);
        await updateTransaction(setTransactions, solTxnId, "confirmed");
    } catch (err: any) {
        await updateTransaction(setTransactions, solTxnId, "failed");
        throw new Error(`Failed to transfer SOL: ${err.message}`);
    }

    const worldTxnId = "init-world";
    await addTransaction(setTransactions, worldTxnId, "pending");
    let initNewWorld;
    try {
        initNewWorld = await InitializeNewWorld({
            payer: engine.getSessionPayer(),
            connection,
        });

        const computeIx = ComputeBudgetProgram.setComputeUnitLimit({
            units: CONFIG.computeUnitLimit,
        });
        initNewWorld.transaction.add(computeIx);
        await engine.processSessionChainTransaction(worldTxnId, initNewWorld.transaction);
        await updateTransaction(setTransactions, worldTxnId, "confirmed");
    } catch (err: any) {
        await updateTransaction(setTransactions, worldTxnId, "failed");
        throw new Error(`Failed to initialize new world: ${err.message}`);
    }

    const mapTxnId = "create-map";
    await addTransaction(setTransactions, mapTxnId, "pending");

    const mapSeed = "origin";
    const mapEntityPda = FindEntityPda({
        worldId: initNewWorld.worldId,
        entityId: new anchor.BN(0),
        seed: stringToUint8Array(mapSeed),
    });

    try {
        const mapAddIx = await createAddEntityInstruction({
            payer: engine.getSessionPayer(),
            world: initNewWorld.worldPda,
            entity: mapEntityPda,
        }, { extraSeed: stringToUint8Array(mapSeed) });

        const mapTx = new Transaction().add(mapAddIx).add(
            ComputeBudgetProgram.setComputeUnitLimit({ units: CONFIG.computeUnitLimit })
        );

        await engine.processSessionChainTransaction(mapTxnId, mapTx);
        await updateTransaction(setTransactions, mapTxnId, "confirmed");
    } catch (err: any) {
        await updateTransaction(setTransactions, mapTxnId, "failed");
        throw new Error(`Failed to create map: ${err.message}`);
    }

    const foodEntityPdas = Array.from({ length: foodcomponents }, (_, i) =>
        FindEntityPda({
            worldId: initNewWorld.worldId,
            entityId: new anchor.BN(0),
            seed: stringToUint8Array(`food${i + 1}`),
        })
    );

    const foodTxnId = "create-food-entities";
    await addTransaction(setTransactions, foodTxnId, "pending");
    try {
        for (let i = 0; i < foodEntityPdas.length; i += CONFIG.defaultBatchSize) {
            const batch = foodEntityPdas.slice(i, i + CONFIG.defaultBatchSize);
            const tx = new Transaction();
            batch.forEach(async (foodPda, index) => {
                const addEntityIx = await createAddEntityInstruction({
                    payer: engine.getSessionPayer(),
                    world: initNewWorld.worldPda,
                    entity: foodPda,
                }, { extraSeed: stringToUint8Array(`food${i + index + 1}`) });
                tx.add(addEntityIx);
            });
            tx.add(
                ComputeBudgetProgram.setComputeUnitLimit({
                    units: CONFIG.computeUnitLimit,
                })
            );
            await engine.processSessionChainTransaction(foodTxnId, tx);
            console.log(`FoodEntityCreation batch ${i / CONFIG.defaultBatchSize + 1} completed.`);
        }
        await updateTransaction(setTransactions, foodTxnId, "confirmed");
    } catch (err) {
        console.error("FoodEntityCreation failed:", err);
        await updateTransaction(setTransactions, foodTxnId, "failed");
    }

    const playerEntityPdas = Array.from({ length: maxplayer + 1 }, (_, i) =>
        FindEntityPda({
            worldId: initNewWorld.worldId,
            entityId: new anchor.BN(0),
            seed: stringToUint8Array(`player${i + 1}`),
        })
    );

    const playerTxnId = "create-player-entities";
    await addTransaction(setTransactions, playerTxnId, "pending");
    try {
        for (let i = 0; i < playerEntityPdas.length; i += CONFIG.defaultBatchSize) {
            const batch = playerEntityPdas.slice(i, i + CONFIG.defaultBatchSize);
            const tx = new Transaction();
            batch.forEach(async (playerPda, index) => {
                const addEntityIx = await createAddEntityInstruction({
                    payer: engine.getSessionPayer(),
                    world: initNewWorld.worldPda,
                    entity: playerPda,
                }, { extraSeed: stringToUint8Array(`player${i + index + 1}`) });
                tx.add(addEntityIx);
            });
            tx.add(
                ComputeBudgetProgram.setComputeUnitLimit({
                    units: CONFIG.computeUnitLimit,
                })
            );
            await engine.processSessionChainTransaction(playerTxnId, tx);
            console.log(`PlayerEntityCreation batch ${i / CONFIG.defaultBatchSize + 1} completed.`);
        }
        await updateTransaction(setTransactions, playerTxnId, "confirmed");
    } catch (err) {
        console.error("PlayerEntityCreation failed:", err);
        await updateTransaction(setTransactions, playerTxnId, "failed");
    }

    const anteroomTxnId = "create-anteroom";
    await addTransaction(setTransactions, anteroomTxnId, "pending");
    const anteroomSeed = "ante";
    const anteroomEntityPda = FindEntityPda({
        worldId: initNewWorld.worldId,
        entityId: new anchor.BN(0),
        seed: stringToUint8Array(anteroomSeed),
    });
    try {

        const anteroomAddIx = await createAddEntityInstruction({
            payer: engine.getSessionPayer(),
            world: initNewWorld.worldPda,
            entity: anteroomEntityPda,
        }, { extraSeed: stringToUint8Array(anteroomSeed) });

        const anteroomTx = new Transaction().add(anteroomAddIx).add(
            ComputeBudgetProgram.setComputeUnitLimit({ units: CONFIG.computeUnitLimit })
        );

        await engine.processSessionChainTransaction(anteroomTxnId, anteroomTx);
        await updateTransaction(setTransactions, anteroomTxnId, "confirmed");
    } catch (err: any) {
        await updateTransaction(setTransactions, anteroomTxnId, "failed");
        throw new Error(`Failed to create anteroom: ${err.message}`);
    }


    // Initialize map component
    const initMapComponentTxnId = "init-map-component";
    await addTransaction(setTransactions, initMapComponentTxnId, "pending");
    try {
        const initMapIx = await InitializeComponent({
            payer: engine.getSessionPayer(),
            entity: mapEntityPda,
            componentId: COMPONENT_MAP_ID,
        });

        const initMapTx = new Transaction().add(initMapIx.transaction).add(
            ComputeBudgetProgram.setComputeUnitLimit({ units: 50_000 })
        );

        await engine.processSessionChainTransaction(initMapComponentTxnId, initMapTx);
        console.log(`Init map component signature: ${initMapIx.transaction}`);
        await updateTransaction(setTransactions, initMapComponentTxnId, "confirmed");
    } catch (err: any) {
        console.error("Error initializing map component:", err);
        await updateTransaction(setTransactions, initMapComponentTxnId, "failed");
        throw err;
    }

    // Initialize food components
    const initFoodComponentTxnId = "init-food-components";
    await addTransaction(setTransactions, initFoodComponentTxnId, "pending");
    let foodComponentPdas = [];
    try {
        for (let i = 0; i < foodEntityPdas.length; i += CONFIG.defaultBatchSize) {
            const batch = foodEntityPdas.slice(i, i + CONFIG.defaultBatchSize);
            const tx = new Transaction();
            for (const foodPda of batch) {
                const initComponent = await InitializeComponent({
                    payer: engine.getSessionPayer(),
                    entity: foodPda,
                    componentId: COMPONENT_SECTION_ID,
                });
                tx.add(initComponent.transaction);
                foodComponentPdas.push(initComponent.componentPda);
            }
            tx.add(
                ComputeBudgetProgram.setComputeUnitLimit({
                    units: 200_000,
                })
            );
            await engine.processSessionChainTransaction(initFoodComponentTxnId, tx);
            console.log(`Init food component signature for batch: ${tx}`);
        }
        await updateTransaction(setTransactions, initFoodComponentTxnId, "confirmed");
    } catch (err: any) {
        console.error("Error initializing food components:", err);
        await updateTransaction(setTransactions, initFoodComponentTxnId, "failed");
        throw err;
    }

    // Initialize player components
    const initPlayerComponentTxnId = "init-player-components";
    await addTransaction(setTransactions, initPlayerComponentTxnId, "pending");
    try {
        for (let i = 0; i < playerEntityPdas.length; i += CONFIG.defaultBatchSize) {
            const batch = playerEntityPdas.slice(i, i + CONFIG.defaultBatchSize);
            const tx = new Transaction();
            for (const playerPda of batch) {
                const initPlayerComponent = await InitializeComponent({
                    payer: engine.getSessionPayer(),
                    entity: playerPda,
                    componentId: COMPONENT_PLAYER_ID,
                });
                tx.add(initPlayerComponent.transaction);
            }
            tx.add(
                ComputeBudgetProgram.setComputeUnitLimit({
                    units: 200_000,
                })
            );
            await engine.processSessionChainTransaction(initPlayerComponentTxnId, tx);
            console.log(`Init player component signature for batch: ${tx}`);
        }
        await updateTransaction(setTransactions, initPlayerComponentTxnId, "confirmed");
    } catch (err: any) {
        console.error("Error initializing player components:", err);
        await updateTransaction(setTransactions, initPlayerComponentTxnId, "failed");
        throw err;
    }

    // Initialize anteroom component
    const initAnteroomComponentTxnId = "init-anteroom-component";
    await addTransaction(setTransactions, initAnteroomComponentTxnId, "pending");
    try {
        const initAnteIx = await InitializeComponent({
            payer: engine.getSessionPayer(),
            entity: anteroomEntityPda,
            componentId: COMPONENT_ANTEROOM_ID,
        });

        const initAnteTx = new Transaction().add(initAnteIx.transaction).add(
            ComputeBudgetProgram.setComputeUnitLimit({ units: 50_000 })
        );

        await engine.processSessionChainTransaction(initAnteroomComponentTxnId, initAnteTx);
        console.log(`Init anteroom component signature: ${initAnteIx.transaction}`);
        await updateTransaction(setTransactions, initAnteroomComponentTxnId, "confirmed");
    } catch (err: any) {
        console.error("Error initializing anteroom component:", err);
        await updateTransaction(setTransactions, initAnteroomComponentTxnId, "failed");
        throw err;
    }

    const vaultTxnId = "setup-vault";
    await addTransaction(setTransactions, vaultTxnId, "pending");

    const mapComponentPda = FindComponentPda({
        componentId: COMPONENT_MAP_ID,
        entity: mapEntityPda,
    });

    const [tokenAccountOwnerPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("token_account_owner_pda"), mapComponentPda.toBuffer()],
        new PublicKey("BAP315i1xoAXqbJcTT1LrUS45N3tAQnNnPuNQkCcvbAr")
    );

    const tokenVault = await getAssociatedTokenAddress(
        mint_of_token,
        tokenAccountOwnerPda,
        true
    );
    try {
        const vaultCreateIx = createAssociatedTokenAccountInstruction(
            engine.getSessionPayer(),
            tokenVault,
            tokenAccountOwnerPda,
            mint_of_token
        );

        const vaultTx = new Transaction().add(vaultCreateIx).add(
            ComputeBudgetProgram.setComputeUnitLimit({ units: CONFIG.computeUnitLimit })
        );

        await engine.processSessionChainTransaction(vaultTxnId, vaultTx);
        await updateTransaction(setTransactions, vaultTxnId, "confirmed");
    } catch (err: any) {
        await updateTransaction(setTransactions, vaultTxnId, "failed");
        throw new Error(`Failed to setup vault: ${err.message}`);
    }

    const initGameTxnId = "initialize-game";
    await addTransaction(setTransactions, initGameTxnId, "pending");
    try {
        const initGameSig = await gameSystemInitMap(
            engine,
            initNewWorld.worldPda,
            mapEntityPda,
            game_name,
            game_size,
            base_buyin,
            max_multiple,
            min_multiple
        );
        console.log(`Game initialized with signature: ${initGameSig}`);
        await updateTransaction(setTransactions, initGameTxnId, "confirmed");
    } catch (err: any) {
        await updateTransaction(setTransactions, initGameTxnId, "failed");
        throw new Error(`Failed to initialize game: ${err.message}`);
    }

    // Initialize players
    const initPlayersTxnId = "init-players";
    await addTransaction(setTransactions, initPlayersTxnId, "pending");
    try {
        const initbatchSizePlayers = 1;
        for (let i = 0; i < playerEntityPdas.length; i += initbatchSizePlayers) {
            const initplayertransaction = new anchor.web3.Transaction();
            const playerBatch = playerEntityPdas.slice(i, i + initbatchSizePlayers);
            
            for (const playerPda of playerBatch) {
                const initPlayer = await gameSystemInitPlayer(engine, initNewWorld.worldPda, playerPda, mapEntityPda);
                console.log(`Init func players signature for batch: ${initPlayer}`);
            }
        }
        await updateTransaction(setTransactions, initPlayersTxnId, "confirmed");
    } catch (err: any) {
        console.error("Error initializing players:", err);
        await updateTransaction(setTransactions, initPlayersTxnId, "failed");
        throw err;
    }

    // Initialize anteroom with token info
    const initAnteroomTxnId = "init-anteroom";
    await addTransaction(setTransactions, initAnteroomTxnId, "pending");
    try {
        const initAnteroom = await gameSystemInitAnteroom(engine, initNewWorld.worldPda, anteroomEntityPda, mapEntityPda, mint_of_token, tokenVault, decimals, owner_token_account);
        console.log(`Init func anteroom signature: ${initAnteroom}`);
        await updateTransaction(setTransactions, initAnteroomTxnId, "confirmed");
    } catch (err: any) {
        console.error("Error initializing anteroom:", err);
        await updateTransaction(setTransactions, initAnteroomTxnId, "failed");
        throw err;
    }

    // Delegate map component
    const delegateMapTxnId = "delegate-map";
    await addTransaction(setTransactions, delegateMapTxnId, "pending");
    try {
        const mapdelegateIx = createDelegateInstruction({
            entity: mapEntityPda,
            account: mapComponentPda,
            ownerProgram: COMPONENT_MAP_ID,
            payer: engine.getSessionPayer(),
        });

        const maptx = new anchor.web3.Transaction().add(mapdelegateIx);
        const computeLimitIxMapDel = ComputeBudgetProgram.setComputeUnitLimit({
            units: 80_000,
        });

        maptx.add(computeLimitIxMapDel);
        const delsignature = await engine.processSessionChainTransaction(delegateMapTxnId, maptx);
        console.log(`Delegation signature map: ${delsignature}`);
        await updateTransaction(setTransactions, delegateMapTxnId, "confirmed");
    } catch (err) {
        console.error("Error delegating map component:", err);
        await updateTransaction(setTransactions, delegateMapTxnId, "failed");
        throw err;
    }

    // Delegate food components
    const delegateFoodTxnId = "delegate-food";
    await addTransaction(setTransactions, delegateFoodTxnId, "pending");
    try {
        let delbatchSize = 3;
        for (let i = 0; i < foodEntityPdas.length; i += delbatchSize) {
            const playertx = new anchor.web3.Transaction();

            const batch = foodEntityPdas.slice(i, i + delbatchSize);
            batch.forEach((foodEntityPda, index) => {
                const fooddelegateIx = createDelegateInstruction({
                    entity: foodEntityPda,
                    account: foodComponentPdas[i + index],
                    ownerProgram: COMPONENT_SECTION_ID,
                    payer: engine.getSessionPayer(),
                });
                playertx.add(fooddelegateIx);
            });

            const computeLimitIxPlayerDel = ComputeBudgetProgram.setComputeUnitLimit({
                units: 200_000,
            });
            playertx.add(computeLimitIxPlayerDel);
            const delsignature2 = await engine.processSessionChainTransaction(delegateFoodTxnId, playertx);
            console.log(`Delegation signature food for batch: ${delsignature2}`);
        }
        await updateTransaction(setTransactions, delegateFoodTxnId, "confirmed");
    } catch (err) {
        console.error("Error delegating food components:", err);
        await updateTransaction(setTransactions, delegateFoodTxnId, "failed");
        throw err;
    }

    // Initialize food positions
    const initFoodTxnId = "init-food";
    await addTransaction(setTransactions, initFoodTxnId, "pending");
    try {
        let overallIndex = 0;
        let initFoodBatchSize = 1;
        for (let i = 0; i < foodEntityPdas.length; i += initFoodBatchSize) {
            const initfoodtransaction = new anchor.web3.Transaction();
            const foodBatch = foodEntityPdas.slice(i, i + initFoodBatchSize);
            
            for (const foodPda of foodBatch) {
                try {
                    const { x, y } = getTopLeftCorner(overallIndex, game_size);
                    console.log(`Coordinates for foodPda at index ${overallIndex}: (${x}, ${y})`);
                    
                    const signatureinitfood = await gameSystemInitSection(
                        engine,
                        initNewWorld.worldPda,
                        foodPda,
                        mapEntityPda,
                        x,
                        y
                    );
                    console.log(`Init func food signature for batch: ${signatureinitfood}`);
                } catch (err) {
                    console.error(`Error processing foodPda at index ${overallIndex}:`, err);
                }
                overallIndex++;
            }
        }
        await updateTransaction(setTransactions, initFoodTxnId, "confirmed");
    } catch (err) {
        console.error("Error initializing food positions:", err);
        await updateTransaction(setTransactions, initFoodTxnId, "failed");
        throw err;
    }

    // Finalize new game setup in active games
    const tokenMetadata = await fetchTokenMetadata(mint_of_token.toString());
    const newGame: ActiveGame = {
        worldId: initNewWorld.worldId,
        worldPda: initNewWorld.worldPda,
        name: game_name,
        active_players: 0,
        max_players: maxplayer,
        size: game_size,
        image: tokenMetadata.image || `${process.env.PUBLIC_URL}/default.png`,
        token: tokenMetadata.name || "TOKEN",
        base_buyin,
        min_buyin,
        max_buyin,
        endpoint: "https://api.supersize.gg/game",
        ping: 1000,
    };

    setActiveGames([...activeGames, newGame]);

    // Reclaim leftover SOL
    const reclaimSolTxnId = "reclaim-sol";
    await addTransaction(setTransactions, reclaimSolTxnId, "pending");
    try {
        const reclaimSolTx = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: engine.getSessionPayer(),
                toPubkey: gameOwnerWallet, // or another designated wallet
                lamports: CONFIG.reclaimLamportBuffer, // Adjust this value as needed
            })
        );

        await engine.processSessionChainTransaction(reclaimSolTxnId, reclaimSolTx);
        console.log(`Reclaimed leftover SOL.`);
        await updateTransaction(setTransactions, reclaimSolTxnId, "confirmed");
    } catch (err) {
        console.error("Error reclaiming leftover SOL:", err);
        await updateTransaction(setTransactions, reclaimSolTxnId, "failed");
        throw err;
    }
}
