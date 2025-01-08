import React from 'react';
import * as anchor from "@coral-xyz/anchor";
import { 
    ComputeBudgetProgram, 
    Connection, 
    Keypair, 
    LAMPORTS_PER_SOL, 
    PublicKey, 
    SystemProgram, 
    SYSVAR_RENT_PUBKEY, 
    Transaction 
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
import { 
    createAssociatedTokenAccountInstruction, 
    getAssociatedTokenAddress, 
    TOKEN_PROGRAM_ID 
} from "@solana/spl-token";
import { ActiveGame } from "@utils/types";
import { 
    ANTEROOM_COMPONENT,
    FOOD_COMPONENT,
    INIT_ANTEROOM,
    INIT_FOOD,
    INIT_GAME,
    INIT_PLAYER,
    MAP_COMPONENT,
    PLAYER_COMPONENT,
} from "@utils/constants";
import { getTopLeftCorner, checkTransactionStatus } from "@utils/helper";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";

interface UseNewGameProps {
    playerKey: PublicKey;
    publicKey: PublicKey | null;
    provider: anchor.Provider;
    connection: Connection;
    setActiveGames: (value: ActiveGame[]) => void;
    activeGames: ActiveGame[];
    setNewGameCreated: (value: ActiveGame | null) => void;
    setGameWallet: (value: string) => void;
    submitTransaction: (
        transaction: Transaction,
        commitment: anchor.web3.Commitment,
        skipPre: boolean
    ) => Promise<string | null>;
    submitTransactionUser: (transaction: Transaction) => Promise<string | null>;
    walletRef: React.MutableRefObject<anchor.web3.Keypair>;
    providerEphemeralRollup: React.MutableRefObject<anchor.AnchorProvider>;
}

export const useNewGame = ({
    playerKey,
    publicKey,
    provider,
    connection,
    setActiveGames,
    activeGames,
    setNewGameCreated,
    setGameWallet,
    submitTransaction,
    submitTransactionUser,
    walletRef,
    providerEphemeralRollup,
}: UseNewGameProps) => {

    const retrySubmitTransaction = async (
        transaction: Transaction,
        connection: anchor.web3.Connection,
        commitment: anchor.web3.Commitment,
        maxRetries = 3,
        delay = 2000,
    ): Promise<string | null> => {
        let attempts = 0;
        let signature: string | null = null;
    
        while (attempts < maxRetries) {
            try {
                // Submit the transaction
                signature = await submitTransaction(
                    transaction,
                    commitment,
                    true,
                );
                console.log("transaction attempt:", signature);
                await new Promise((resolve) => setTimeout(resolve, 1000));
                // Check transaction status
                if (signature) {
                    const success = await checkTransactionStatus(
                        connection,
                        signature,
                    );
                    if (success) {
                        console.log("Transaction confirmed successfully");
                        return signature;
                    }
                }
            } catch (error) {
                console.error(`Attempt ${attempts + 1} failed:`, error);
            }
            attempts++;
            await new Promise((resolve) => setTimeout(resolve, delay));
        }
    
        console.error("Max retries reached. Transaction failed to confirm.");
        return null; // Return null if all retries fail
    };

    const newGameTx = async (
        game_size: number,
        max_buyin: number,
        min_buyin: number,
        game_owner_wallet_string: string,
        game_token_string: string,
        game_name: string,
    ) => {
        if (!publicKey) throw new Error("Wallet not connected");

        const base_buyin = Math.sqrt(max_buyin * min_buyin);
        const max_multiple = max_buyin / base_buyin;
        const min_multiple = base_buyin / min_buyin;
        if (max_multiple > 10 || min_multiple > 10) {
            throw new Error("Min-Max buy-in spread too large (max 100x).");
        }

        let maxplayer = 20;
        let foodcomponents = 16;
        let cost = 1.0;
        if (game_size == 4000) {
            maxplayer = 20;
            foodcomponents = 16 * 5;
            cost = 1.0;
        }
        if (game_size == 6000) {
            maxplayer = 40;
            foodcomponents = 36 * 5;
            cost = 2.5;
        }
        if (game_size == 10000) {
            maxplayer = 100;
            foodcomponents = 100 * 5;
            cost = 4.0;
        }

        const gameOwnerWallet = new PublicKey(game_owner_wallet_string);
        const mint_of_token = new PublicKey(game_token_string);
        const owner_token_account = await getAssociatedTokenAddress(
            mint_of_token,
            gameOwnerWallet,
        );

        let decimals = 9;
        const mintInfo = await connection.getParsedAccountInfo(mint_of_token);
        if (mintInfo.value && "parsed" in mintInfo.value.data) {
            decimals = mintInfo.value.data.parsed.info.decimals;
        } else {
            throw new Error("Mint information could not be retrieved or is invalid.");
        }

        const supersize_wallet = new PublicKey("DdGB1EpmshJvCq48W1LvB1csrDnC4uataLnQbUVhp6XB");
        const supersizeAssociatedTokenAccount = await getAssociatedTokenAddress(
            mint_of_token,
            supersize_wallet,
        );

        // Transfer SOL to cover costs
        const soltransfertx = SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey: playerKey,
            lamports: cost * LAMPORTS_PER_SOL,
        });
        const sendsoltx = new Transaction().add(soltransfertx);
        const sendsolsig = await submitTransactionUser(sendsoltx);
        console.log(`Load wallet with SOL: ${sendsolsig}`);

        // Create token accounts if needed
        const createTokenAccountsTx = new Transaction();
        const accountInfoCreator = await connection.getAccountInfo(owner_token_account);
        if (accountInfoCreator === null) {
            createTokenAccountsTx.add(
                createAssociatedTokenAccountInstruction(
                    playerKey,
                    owner_token_account,
                    gameOwnerWallet,
                    mint_of_token,
                )
            );
        }

        const accountInfoSupersize = await connection.getAccountInfo(supersizeAssociatedTokenAccount);
        if (accountInfoSupersize === null) {
            createTokenAccountsTx.add(
                createAssociatedTokenAccountInstruction(
                    playerKey,
                    supersizeAssociatedTokenAccount,
                    supersize_wallet,
                    mint_of_token,
                )
            );
        }

        if (createTokenAccountsTx.instructions.length > 0) {
            const createwalletsig = await submitTransaction(createTokenAccountsTx, "confirmed", true);
            console.log(`Created wallet: ${createwalletsig}`);
        }

        // Initialize new world
        const computePriceIx = ComputeBudgetProgram.setComputeUnitPrice({
            microLamports: 1000002,
        });

        const initNewWorld = await InitializeNewWorld({
            payer: playerKey,
            connection: connection,
        });

        const computeLimitIx = ComputeBudgetProgram.setComputeUnitLimit({
            units: 30_000,
        });

        initNewWorld.transaction.add(computePriceIx).add(computeLimitIx);
        const txSign = await retrySubmitTransaction(initNewWorld.transaction, connection, "confirmed");
        console.log(`World entity signature: ${txSign}`);

        const worldPda = initNewWorld.worldPda;

        // Create map entity
        const mapseed = "origin";
        const newmapentityPda = FindEntityPda({
            worldId: initNewWorld.worldId,
            entityId: new anchor.BN(0),
            seed: mapseed
        });

        const addMapEntityIx = await createAddEntityInstruction(
            {
                payer: playerKey,
                world: worldPda,
                entity: newmapentityPda,
            },
            { extraSeed: mapseed },
        );

        const computeLimitIxMap = ComputeBudgetProgram.setComputeUnitLimit({
            units: 30_000,
        });

        const transaction = new anchor.web3.Transaction()
            .add(addMapEntityIx)
            .add(computeLimitIxMap)
            .add(computePriceIx);

        const signaturemap = await retrySubmitTransaction(transaction, connection, "confirmed");
        console.log(`Map entity signature: ${signaturemap}`);

        // Create food entities
        let transactionfood = new anchor.web3.Transaction();
        const totalEntities = foodcomponents;
        const batchSize = 8;
        const newfoodEntityPdas: PublicKey[] = [];
        const newfoodComponentPdas: PublicKey[] = [];

        for (let i = 1; i <= totalEntities; i++) {
            const seed = "food" + i.toString();
            const newfoodEntityPda = FindEntityPda({
                worldId: initNewWorld.worldId,
                entityId: new anchor.BN(0),
                seed: seed,
            });

            newfoodEntityPdas.push(newfoodEntityPda);

            const addEntityIx = await createAddEntityInstruction(
                {
                    payer: playerKey,
                    world: worldPda,
                    entity: newfoodEntityPda,
                },
                { extraSeed: seed },
            );

            transactionfood.add(addEntityIx);
            if (i % batchSize === 0 || i === totalEntities) {
                const computeLimitIxFood = ComputeBudgetProgram.setComputeUnitLimit({
                    units: 200_000,
                });
                transactionfood.add(computeLimitIxFood).add(computePriceIx);
                const signaturefood = await retrySubmitTransaction(transactionfood, connection, "confirmed");
                console.log(`Food entity batch signature: ${signaturefood}`);
                transactionfood = new Transaction();
            }
        }

        // Create player entities
        let playercomponentstransaction = new anchor.web3.Transaction();
        const totalPlayers = maxplayer + 1;
        const playerBatchSize = 8;
        const newplayerEntityPdas: PublicKey[] = [];
        const newplayerComponentPdas: PublicKey[] = [];

        for (let i = 1; i <= totalPlayers; i++) {
            const seed = "player" + i.toString();
            const newplayerEntityPda = FindEntityPda({
                worldId: initNewWorld.worldId,
                entityId: new anchor.BN(0),
                seed: seed,
            });

            newplayerEntityPdas.push(newplayerEntityPda);

            const addEntityIx = await createAddEntityInstruction(
                {
                    payer: playerKey,
                    world: worldPda,
                    entity: newplayerEntityPda,
                },
                { extraSeed: seed },
            );

            playercomponentstransaction.add(addEntityIx);
            if (i % playerBatchSize === 0 || i === totalPlayers) {
                const computeLimitIxPlayer = ComputeBudgetProgram.setComputeUnitLimit({
                    units: 200_000,
                });
                playercomponentstransaction.add(computeLimitIxPlayer).add(computePriceIx);
                const signatureplayerscomponents = await retrySubmitTransaction(
                    playercomponentstransaction,
                    connection,
                    "confirmed",
                );
                console.log(`Player entity batch signature: ${signatureplayerscomponents}`);
                playercomponentstransaction = new anchor.web3.Transaction();
            }
        }

        // Create anteroom entity
        const anteroomcomponenttransaction = new anchor.web3.Transaction();
        const anteroomseed = "ante";
        const newanteentityPda = FindEntityPda({
            worldId: initNewWorld.worldId,
            entityId: new anchor.BN(0),
            seed: anteroomseed
        });

        const addAnteEntityIx = await createAddEntityInstruction(
            {
                payer: playerKey,
                world: worldPda,
                entity: newanteentityPda,
            },
            { extraSeed: anteroomseed },
        );

        anteroomcomponenttransaction.add(addAnteEntityIx);
        const computeLimitIxAnteroom = ComputeBudgetProgram.setComputeUnitLimit({
            units: 30_000,
        });

        anteroomcomponenttransaction.add(computeLimitIxAnteroom).add(computePriceIx);
        const signatureanteroomcomponents = await retrySubmitTransaction(
            anteroomcomponenttransaction,
            connection,
            "confirmed",
        );
        console.log(`Anteroom entity signature: ${signatureanteroomcomponents}`);

        // Initialize map component
        const initmapomponenttransaction = new anchor.web3.Transaction();
        const initMapIx = await InitializeComponent({
            payer: playerKey,
            entity: newmapentityPda,
            componentId: MAP_COMPONENT,
        });

        initmapomponenttransaction.add(initMapIx.transaction);
        const computeLimitIxMapInit = ComputeBudgetProgram.setComputeUnitLimit({
            units: 50_000,
        });

        initmapomponenttransaction.add(computeLimitIxMapInit).add(computePriceIx);
        const signature1map = await retrySubmitTransaction(
            initmapomponenttransaction,
            connection,
            "confirmed",
        );
        console.log(`Init map component signature: ${signature1map}`);

        // Initialize food components
        const initbatchSize = 6;
        for (let i = 0; i < newfoodEntityPdas.length; i += initbatchSize) {
            const initfoodcomponenttransaction = new anchor.web3.Transaction();

            const batch = newfoodEntityPdas.slice(i, i + initbatchSize);
            for (const foodPda of batch) {
                const initComponent = await InitializeComponent({
                    payer: playerKey,
                    entity: foodPda,
                    componentId: FOOD_COMPONENT,
                });
                initfoodcomponenttransaction.add(initComponent.transaction);
                newfoodComponentPdas.push(initComponent.componentPda);
            }

            const computeLimitIxFoodInit = ComputeBudgetProgram.setComputeUnitLimit({
                units: 200_000,
            });
            initfoodcomponenttransaction.add(computeLimitIxFoodInit).add(computePriceIx);
            const signature1food = await retrySubmitTransaction(
                initfoodcomponenttransaction,
                connection,
                "confirmed",
            );
            console.log(`Init food component signature for batch: ${signature1food}`);
        }

        // Initialize player components
        for (let i = 0; i < newplayerEntityPdas.length; i += initbatchSize) {
            const initplayerscomponenttransaction = new anchor.web3.Transaction();

            const playerBatch = newplayerEntityPdas.slice(i, i + initbatchSize);
            for (const playerPda of playerBatch) {
                const initPlayerComponent = await InitializeComponent({
                    payer: playerKey,
                    entity: playerPda,
                    componentId: PLAYER_COMPONENT,
                });
                initplayerscomponenttransaction.add(initPlayerComponent.transaction);
                newplayerComponentPdas.push(initPlayerComponent.componentPda);
            }

            const computeLimitIxPlayersInit = ComputeBudgetProgram.setComputeUnitLimit({
                units: 200_000,
            });
            initplayerscomponenttransaction.add(computeLimitIxPlayersInit).add(computePriceIx);
            const signature1players = await retrySubmitTransaction(
                initplayerscomponenttransaction,
                connection,
                "confirmed",
            );
            console.log(`Init players component signature for batch: ${signature1players}`);
        }

        // Initialize anteroom component
        const initantecomponenttransaction = new anchor.web3.Transaction();
        const initAnteIx = await InitializeComponent({
            payer: playerKey,
            entity: newanteentityPda,
            componentId: ANTEROOM_COMPONENT,
        });

        initantecomponenttransaction.add(initAnteIx.transaction);
        const computeLimitIxAnteInit = ComputeBudgetProgram.setComputeUnitLimit({
            units: 50_000,
        });

        initantecomponenttransaction.add(computeLimitIxAnteInit).add(computePriceIx);
        const signature1ante = await retrySubmitTransaction(
            initantecomponenttransaction,
            connection,
            "confirmed",
        );
        console.log(`Init anteroom component signature: ${signature1ante}`);

        // Setup vault
        let vault_program_id = new PublicKey("BAP315i1xoAXqbJcTT1LrUS45N3tAQnNnPuNQkCcvbAr");
        let map_component_id = initMapIx.componentPda;
        console.log("map component", map_component_id);

        let [tokenAccountOwnerPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("token_account_owner_pda"), map_component_id.toBuffer()],
            vault_program_id
        );

        const tokenVault = await getAssociatedTokenAddress(
            mint_of_token,
            tokenAccountOwnerPda,
            true,
        );

        setGameWallet(tokenAccountOwnerPda.toString());

        const createTokenAccountTx = createAssociatedTokenAccountInstruction(
            playerKey,
            tokenVault,
            tokenAccountOwnerPda,
            mint_of_token,
        );

        const combinedTx = new Transaction().add(createTokenAccountTx);
        const computeLimitIxVault = ComputeBudgetProgram.setComputeUnitLimit({
            units: 200_000,
        });

        combinedTx.add(computeLimitIxVault).add(computePriceIx);
        const createvaultsig = await retrySubmitTransaction(combinedTx, connection, "confirmed");
        console.log(`Created pda + vault signature: ${createvaultsig}`);

        // Initialize game
        const inittransaction = new anchor.web3.Transaction();
        const initGame = await ApplySystem({
            authority: playerKey,
            world: worldPda,
            entities: [
                {
                    entity: newmapentityPda,
                    components: [{ componentId: MAP_COMPONENT }],
                },
            ],
            systemId: INIT_GAME,
            args: {
                name: game_name,
                size: game_size,
                entry_fee: base_buyin,
                entry_fee_upper_bound_mul: max_multiple,
                entry_fee_lower_bound_mul: min_multiple,
                frozen: false,
            },
        });

        inittransaction.add(initGame.transaction);
        const computeLimitIxMapFunc = ComputeBudgetProgram.setComputeUnitLimit({
            units: 50_000,
        });

        inittransaction.add(computeLimitIxMapFunc).add(computePriceIx);
        const signatureinitgame = await retrySubmitTransaction(inittransaction, connection, "confirmed");
        console.log(`Init func game signature: ${signatureinitgame}`);

        // Initialize players
        const initbatchSizePlayers = 4;
        for (let i = 0; i < newplayerEntityPdas.length; i += initbatchSizePlayers) {
            const initplayertransaction = new anchor.web3.Transaction();
            const playerBatch = newplayerEntityPdas.slice(i, i + initbatchSizePlayers);
            
            for (const playerPda of playerBatch) {
                const initPlayer = await ApplySystem({
                    authority: playerKey,
                    world: worldPda,
                    entities: [
                        {
                            entity: playerPda,
                            components: [{ componentId: PLAYER_COMPONENT }],
                        },
                        {
                            entity: newmapentityPda,
                            components: [{ componentId: MAP_COMPONENT }],
                        },
                    ],
                    systemId: INIT_PLAYER,
                });
                initplayertransaction.add(initPlayer.transaction);
            }

            const computeLimitIxPlayerFunc = ComputeBudgetProgram.setComputeUnitLimit({
                units: 200_000,
            });
            initplayertransaction.add(computeLimitIxPlayerFunc).add(computePriceIx);
            const signatureplayerdinited = await retrySubmitTransaction(
                initplayertransaction,
                connection,
                "confirmed",
            );
            console.log(`Init func players signature for batch: ${signatureplayerdinited}`);
        }

        // Initialize anteroom with token info
        const initantetransaction = new anchor.web3.Transaction();
        const initAnteroom = await ApplySystem({
            authority: playerKey,
            world: worldPda,
            entities: [
                {
                    entity: newanteentityPda,
                    components: [{ componentId: ANTEROOM_COMPONENT }],
                },
                {
                    entity: newmapentityPda,
                    components: [{ componentId: MAP_COMPONENT }],
                },
            ],
            systemId: INIT_ANTEROOM,
            args: {
                vault_token_account_string: tokenVault.toString(),
                token_string: mint_of_token.toString(),
                token_decimals: decimals,
                gamemaster_wallet_string: owner_token_account.toString(),
            },
        });

        initantetransaction.add(initAnteroom.transaction);
        const computeLimitIxAnteFunc = ComputeBudgetProgram.setComputeUnitLimit({
            units: 100_000,
        });

        initantetransaction.add(computeLimitIxAnteFunc).add(computePriceIx);
        const signatureanteinited = await retrySubmitTransaction(initantetransaction, connection, "confirmed");
        console.log(`Init func anteroom signature: ${signatureanteinited}`);

        // Delegate map component
        const mapdelegateIx = createDelegateInstruction({
            entity: newmapentityPda,
            account: initMapIx.componentPda,
            ownerProgram: MAP_COMPONENT,
            payer: playerKey,
        });

        const maptx = new anchor.web3.Transaction().add(mapdelegateIx);
        const computeLimitIxMapDel = ComputeBudgetProgram.setComputeUnitLimit({
            units: 80_000,
        });

        maptx.add(computeLimitIxMapDel).add(computePriceIx);
        const delsignature = await retrySubmitTransaction(maptx, connection, "confirmed");
        console.log(`Delegation signature map: ${delsignature}`);

        // Delegate food components
        let delbatchSize = 3;
        for (let i = 0; i < newfoodEntityPdas.length; i += delbatchSize) {
            const playertx = new anchor.web3.Transaction();

            const batch = newfoodEntityPdas.slice(i, i + delbatchSize);
            batch.forEach((foodEntityPda, index) => {
                const fooddelegateIx = createDelegateInstruction({
                    entity: foodEntityPda,
                    account: newfoodComponentPdas[i + index],
                    ownerProgram: FOOD_COMPONENT,
                    payer: playerKey,
                });
                playertx.add(fooddelegateIx);
            });

            const computeLimitIxPlayerDel = ComputeBudgetProgram.setComputeUnitLimit({
                units: 200_000,
            });
            playertx.add(computeLimitIxPlayerDel).add(computePriceIx);
            const delsignature2 = await retrySubmitTransaction(playertx, connection, "confirmed");
            console.log(`Delegation signature food for batch: ${delsignature2}`);
        }

        // Initialize food positions
        let overallIndex = 0;
        let initFoodBatchSize = 5;
        for (let i = 0; i < newfoodEntityPdas.length; i += initFoodBatchSize) {
            const initfoodtransaction = new anchor.web3.Transaction();
            const foodBatch = newfoodEntityPdas.slice(i, i + initFoodBatchSize);
            
            for (const foodPda of foodBatch) {
                const { x, y } = getTopLeftCorner(overallIndex, game_size);
                console.log(`Coordinates for foodPda at index ${overallIndex}: (${x}, ${y})`);
                
                const initFood = await ApplySystem({
                    authority: playerKey,
                    world: worldPda,
                    entities: [
                        {
                            entity: foodPda,
                            components: [{ componentId: FOOD_COMPONENT }],
                        },
                        {
                            entity: newmapentityPda,
                            components: [{ componentId: MAP_COMPONENT }],
                        },
                    ],
                    systemId: INIT_FOOD,
                    args: {
                        top_left_x: x,
                        top_left_y: y,
                    },
                });
                initfoodtransaction.add(initFood.transaction);
                overallIndex++;
            }

            const {
                context: { slot: minContextSlot },
                value: { blockhash, lastValidBlockHeight },
            } = await providerEphemeralRollup.current.connection.getLatestBlockhashAndContext();

            if (!walletRef.current) {
                throw new Error("Wallet is not initialized");
            }
            initfoodtransaction.recentBlockhash = blockhash;
            initfoodtransaction.feePayer = playerKey;
            const signatureinitfood = await providerEphemeralRollup.current.sendAndConfirm(
                initfoodtransaction,
            );
            console.log(`Init func food signature for batch: ${signatureinitfood}`);
        }

        // Update game state
        let token_image = "";
        let token_name = "";
        if (mint_of_token.toString() === "7dnMwS2yE6NE1PX81B9Xpm7zUhFXmQABqUiHHzWXiEBn") {
            token_image = `${process.env.PUBLIC_URL}/agld.jpg`;
            token_name = "AGLD";
        } else {
            token_image = `${process.env.PUBLIC_URL}/usdc.png`;
            token_name = "USDC";
        }

        const newGameInfo: ActiveGame = {
            worldId: initNewWorld.worldId,
            worldPda: initNewWorld.worldPda,
            name: game_name,
            active_players: 0,
            max_players: maxplayer,
            size: game_size,
            image: token_image,
            token: token_name,
            base_buyin: base_buyin,
            min_buyin: min_buyin,
            max_buyin: max_buyin,
        };

        console.log("new game info", newGameInfo.worldId, newGameInfo.worldPda.toString());
        setNewGameCreated(newGameInfo);
        setActiveGames([...activeGames, newGameInfo]);

        // Reclaim leftover SOL
        const playerbalance = await connection.getBalance(playerKey, "processed");
        const reclaim_transaction = new Transaction();
        const solTransferInstruction = SystemProgram.transfer({
            fromPubkey: playerKey,
            toPubkey: publicKey,
            lamports: playerbalance - 5000,
        });

        reclaim_transaction.add(solTransferInstruction);
        const reclaimsig = await retrySubmitTransaction(reclaim_transaction, connection, "confirmed");
        console.log(`Reclaim leftover SOL: ${reclaimsig}`);
    };

    return newGameTx;
}; 