import { ComputeBudgetProgram, LAMPORTS_PER_SOL, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, Transaction } from "@solana/web3.js";
import { ApplySystem, createAddEntityInstruction, createDelegateInstruction, createUndelegateInstruction, FindComponentPda, FindEntityPda, InitializeComponent, InitializeNewWorld } from "@magicblock-labs/bolt-sdk";

import { ActiveGame } from "@utils/types";
import { fetchTokenMetadata, getTopLeftCorner } from "@utils/helper";

import { MagicBlockEngine } from "../engine/MagicBlockEngine";
import { gameSystemInitMap } from "./gameSystemInitMap";
import { gameSystemInitAnteroom } from "./gameSystemInitAnteroom";
import { gameSystemInitPlayer } from "./gameSystemInitPlayer";
import { gameSystemInitSection } from "./gameSystemInitSection";

import {
  COMPONENT_PLAYER_ID,
  COMPONENT_ANTEROOM_ID,
  COMPONENT_MAP_ID,
  COMPONENT_SECTION_ID,
} from "./gamePrograms";

import * as anchor from "@coral-xyz/anchor";
import {anteroomFetchOnChain, 
  mapFetchOnChain, 
  playerFetchOnChain} 
from "./gameFetch";
import { createAssociatedTokenAccountInstruction, getAssociatedTokenAddress } from "@solana/spl-token";
import { connection } from "@utils/constants";

export async function gameExecuteNewGame(
  engine: MagicBlockEngine,
  game_size: number,
  max_buyin: number,
  min_buyin: number,
  game_owner_wallet_string: string,
  game_token_string: string,
  game_name: string,
  activeGames: ActiveGame[],
  setActiveGames: (games: ActiveGame[]) => void
) {

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
        fromPubkey: engine.getWalletPayer(),
        toPubkey: engine.getSessionPayer(),
        lamports: cost * LAMPORTS_PER_SOL,
    });
    const sendsoltx = new Transaction().add(soltransfertx);
    const sendsolsig = await engine.processWalletTransaction("create-game", sendsoltx);
    console.log(`Load wallet with SOL: ${sendsolsig}`);

    // Create token accounts if needed
    const createTokenAccountsTx = new Transaction();
    const accountInfoCreator = await connection.getAccountInfo(owner_token_account);
    if (accountInfoCreator === null) {
        createTokenAccountsTx.add(
            createAssociatedTokenAccountInstruction(
                engine.getSessionPayer(),
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
                engine.getSessionPayer(),
                supersizeAssociatedTokenAccount,
                supersize_wallet,
                mint_of_token,
            )
        );
    }

    if (createTokenAccountsTx.instructions.length > 0) {
        const createwalletsig = await engine.processSessionChainTransaction("createTokenAccounts", createTokenAccountsTx);
        console.log(`Created wallet: ${createwalletsig}`);
    }

    // Initialize new world
    const computePriceIx = ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: 1000002,
    });

    const initNewWorld = await InitializeNewWorld({
        payer: engine.getSessionPayer(),
        connection: connection,
    });

    const computeLimitIx = ComputeBudgetProgram.setComputeUnitLimit({
        units: 30_000,
    });

    initNewWorld.transaction.add(computePriceIx).add(computeLimitIx);
    const txSign = await engine.processSessionChainTransaction("initNewWorld", initNewWorld.transaction);
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
            payer: engine.getSessionPayer(),
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

    const signaturemap = await engine.processSessionChainTransaction("addMapEntity", transaction);
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
                payer: engine.getSessionPayer(),
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
            const signaturefood = await engine.processSessionChainTransaction("addFoodEntity", transactionfood);
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
                payer: engine.getSessionPayer(),
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
            const signatureplayerscomponents = await engine.processSessionChainTransaction("addPlayerEntity", playercomponentstransaction);
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
            payer: engine.getSessionPayer(),
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
    const signatureanteroomcomponents = await engine.processSessionChainTransaction("addAnteroomEntity", anteroomcomponenttransaction);
    console.log(`Anteroom entity signature: ${signatureanteroomcomponents}`);

    // Initialize map component
    const initmapomponenttransaction = new anchor.web3.Transaction();
    const initMapIx = await InitializeComponent({
        payer: engine.getSessionPayer(),
        entity: newmapentityPda,
        componentId: COMPONENT_MAP_ID,
    });

    initmapomponenttransaction.add(initMapIx.transaction);
    const computeLimitIxMapInit = ComputeBudgetProgram.setComputeUnitLimit({
        units: 50_000,
    });

    initmapomponenttransaction.add(computeLimitIxMapInit).add(computePriceIx);
    const signature1map = await engine.processSessionChainTransaction("initMapComponent", initmapomponenttransaction);
    console.log(`Init map component signature: ${signature1map}`);

    // Initialize food components
    const initbatchSize = 6;
    for (let i = 0; i < newfoodEntityPdas.length; i += initbatchSize) {
        const initfoodcomponenttransaction = new anchor.web3.Transaction();

        const batch = newfoodEntityPdas.slice(i, i + initbatchSize);
        for (const foodPda of batch) {
            const initComponent = await InitializeComponent({
                payer: engine.getSessionPayer(),
                entity: foodPda,
                componentId: COMPONENT_SECTION_ID,
            });
            initfoodcomponenttransaction.add(initComponent.transaction);
            newfoodComponentPdas.push(initComponent.componentPda);
        }

        const computeLimitIxFoodInit = ComputeBudgetProgram.setComputeUnitLimit({
            units: 200_000,
        });
        initfoodcomponenttransaction.add(computeLimitIxFoodInit).add(computePriceIx);
        const signature1food = await engine.processSessionChainTransaction("initFoodComponent", initfoodcomponenttransaction);
        console.log(`Init food component signature for batch: ${signature1food}`);
    }

    // Initialize player components
    for (let i = 0; i < newplayerEntityPdas.length; i += initbatchSize) {
        const initplayerscomponenttransaction = new anchor.web3.Transaction();

        const playerBatch = newplayerEntityPdas.slice(i, i + initbatchSize);
        for (const playerPda of playerBatch) {
            const initPlayerComponent = await InitializeComponent({
                payer: engine.getSessionPayer(),
                entity: playerPda,
                componentId: COMPONENT_PLAYER_ID,
            });
            initplayerscomponenttransaction.add(initPlayerComponent.transaction);
            newplayerComponentPdas.push(initPlayerComponent.componentPda);
        }

        const computeLimitIxPlayersInit = ComputeBudgetProgram.setComputeUnitLimit({
            units: 200_000,
        });
        initplayerscomponenttransaction.add(computeLimitIxPlayersInit).add(computePriceIx);
        const signature1players = await engine.processSessionChainTransaction("initPlayerComponent", initplayerscomponenttransaction);
        console.log(`Init players component signature for batch: ${signature1players}`);
    }

    // Initialize anteroom component
    const initantecomponenttransaction = new anchor.web3.Transaction();
    const initAnteIx = await InitializeComponent({
        payer: engine.getSessionPayer(),
        entity: newanteentityPda,
        componentId: COMPONENT_ANTEROOM_ID,
    });

    initantecomponenttransaction.add(initAnteIx.transaction);
    const computeLimitIxAnteInit = ComputeBudgetProgram.setComputeUnitLimit({
        units: 50_000,
    });

    initantecomponenttransaction.add(computeLimitIxAnteInit).add(computePriceIx);
    const signature1ante = await engine.processSessionChainTransaction("initAnteroomComponent", initantecomponenttransaction);
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

    console.log('game wallet', tokenAccountOwnerPda.toString());

    const createTokenAccountTx = createAssociatedTokenAccountInstruction(
        engine.getSessionPayer(),
        tokenVault,
        tokenAccountOwnerPda,
        mint_of_token,
    );

    const combinedTx = new Transaction().add(createTokenAccountTx);
    const computeLimitIxVault = ComputeBudgetProgram.setComputeUnitLimit({
        units: 200_000,
    });

    combinedTx.add(computeLimitIxVault).add(computePriceIx);
    const createvaultsig = await engine.processSessionChainTransaction("createTokenAccount", combinedTx);
    console.log(`Created pda + vault signature: ${createvaultsig}`);

    const signatureinitgame = await gameSystemInitMap(engine, worldPda, newmapentityPda, game_name, game_size, base_buyin, max_multiple, min_multiple);
    console.log(`Init func game signature: ${signatureinitgame}`);

    // Initialize players
    const initbatchSizePlayers = 1;
    for (let i = 0; i < newplayerEntityPdas.length; i += initbatchSizePlayers) {
        const initplayertransaction = new anchor.web3.Transaction();
        const playerBatch = newplayerEntityPdas.slice(i, i + initbatchSizePlayers);
        
        for (const playerPda of playerBatch) {
            const initPlayer = await gameSystemInitPlayer(engine, worldPda, playerPda, newmapentityPda);
            console.log(`Init func players signature for batch: ${initPlayer}`);
        }
    }

    // Initialize anteroom with token info
    const initAnteroom = gameSystemInitAnteroom(engine, worldPda, newanteentityPda, newmapentityPda, mint_of_token, tokenVault, decimals, owner_token_account);
    console.log(`Init func anteroom signature: ${initAnteroom}`);

    // Delegate map component
    const mapdelegateIx = createDelegateInstruction({
        entity: newmapentityPda,
        account: initMapIx.componentPda,
        ownerProgram: COMPONENT_MAP_ID,
        payer: engine.getSessionPayer(),
    });

    const maptx = new anchor.web3.Transaction().add(mapdelegateIx);
    const computeLimitIxMapDel = ComputeBudgetProgram.setComputeUnitLimit({
        units: 80_000,
    });

    maptx.add(computeLimitIxMapDel).add(computePriceIx);
    const delsignature = await engine.processSessionChainTransaction("delegateMapComponent", maptx);
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
                ownerProgram: COMPONENT_SECTION_ID,
                payer: engine.getSessionPayer(),
            });
            playertx.add(fooddelegateIx);
        });

        const computeLimitIxPlayerDel = ComputeBudgetProgram.setComputeUnitLimit({
            units: 200_000,
        });
        playertx.add(computeLimitIxPlayerDel).add(computePriceIx);
        const delsignature2 = await engine.processSessionChainTransaction("delegateFoodComponent", playertx);
        console.log(`Delegation signature food for batch: ${delsignature2}`);
    }

    // Initialize food positions
    let overallIndex = 0;
    let initFoodBatchSize = 1;
    for (let i = 0; i < newfoodEntityPdas.length; i += initFoodBatchSize) {
        const initfoodtransaction = new anchor.web3.Transaction();
        const foodBatch = newfoodEntityPdas.slice(i, i + initFoodBatchSize);
        
        for (const foodPda of foodBatch) {
            const { x, y } = getTopLeftCorner(overallIndex, game_size);
            console.log(`Coordinates for foodPda at index ${overallIndex}: (${x}, ${y})`);
            
            const signatureinitfood = await gameSystemInitSection(
                engine,
                worldPda,
                foodPda,
                newmapentityPda,
                x,
                y
            );
            console.log(`Init func food signature for batch: ${signatureinitfood}`);
            overallIndex++;
        }
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
        endpoint: "https://api.supersize.gg/game",
        ping: 1000,
    };

    console.log("new game info", newGameInfo.worldId, newGameInfo.worldPda.toString());
    setActiveGames([...activeGames, newGameInfo]);

    // Reclaim leftover SOL
    const playerbalance = await connection.getBalance(engine.getSessionPayer(), "processed");
    const reclaim_transaction = new Transaction();
    const solTransferInstruction = SystemProgram.transfer({
        fromPubkey: engine.getSessionPayer(),
        toPubkey: engine.getWalletPayer(),
        lamports: playerbalance - 5000,
    });

    reclaim_transaction.add(solTransferInstruction);
    const reclaimsig = await engine.processSessionChainTransaction("reclaimLeftoverSOL", reclaim_transaction);
    console.log(`Reclaim leftover SOL: ${reclaimsig}`);
};

