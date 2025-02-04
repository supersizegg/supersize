import {
  ComputeBudgetProgram,
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  createAddEntityInstruction,
  createDelegateInstruction,
  FindComponentPda,
  FindEntityPda,
  InitializeComponent,
  InitializeNewWorld,
} from "@magicblock-labs/bolt-sdk";
import { ActiveGame, FetchedGame, PlayerInfo } from "@utils/types";
import { fetchTokenMetadata, getTopLeftCorner, stringToUint8Array } from "@utils/helper";
import { MagicBlockEngine } from "../engine/MagicBlockEngine";
import { COMPONENT_PLAYER_ID, COMPONENT_ANTEROOM_ID, COMPONENT_MAP_ID, COMPONENT_SECTION_ID } from "./gamePrograms";
import * as anchor from "@coral-xyz/anchor";
import { createAssociatedTokenAccountInstruction, getAssociatedTokenAddress } from "@solana/spl-token";
import { RPC_CONNECTION, NETWORK } from "@utils/constants";
import React from "react";
import { gameSystemInitMap } from "./gameSystemInitMap";
import { gameSystemInitPlayer } from "./gameSystemInitPlayer";
import { gameSystemInitAnteroom } from "./gameSystemInitAnteroom";
import { gameSystemInitSection } from "./gameSystemInitSection";

const connection = new Connection(RPC_CONNECTION[NETWORK]); //"https://devnet.helius-rpc.com/?api-key=cba33294-aa96-414c-9a26-03d5563aa676");

const CONFIG = {
  computeUnitLimit: 200_000,
  computeUnitPrice: 1_000_002,
  reclaimLamportBuffer: 10_000, // Minimum buffer to avoid zero balance errors
  defaultBatchSize: 8,
};

async function addTransaction(
  setTransactions: React.Dispatch<React.SetStateAction<{ id: string; status: string }[]>>,
  id: string,
  status: string,
) {
  setTransactions((prev) => [...prev, { id, status }]);
}

async function updateTransaction(
  setTransactions: React.Dispatch<React.SetStateAction<{ id: string; status: string }[]>>,
  id: string,
  status: string,
) {
  setTransactions((prev) => prev.map((txn) => (txn.id === id ? { ...txn, status } : txn)));
}

async function retryTransaction(
  transactionId: string,
  transactionFn: () => Promise<void>,
  setTransactions: React.Dispatch<React.SetStateAction<{ id: string; status: string }[]>>,
  showPrompt: (errorMessage: string) => Promise<boolean>
) {
  let retry = true;
  while (retry) {
    try {
      await transactionFn();
      await updateTransaction(setTransactions, transactionId, "confirmed");
      retry = false;
    } catch (error) {
      await updateTransaction(setTransactions, transactionId, "failed");
      let message = "Unknown Error";
      if (error instanceof Error) {
        message = error.message;
      }
      //retry = window.confirm(`Transaction ${transactionId} failed: ${message}. Would you like to retry?`);      
      retry = await showPrompt(`Transaction ${transactionId} failed: ${message}`);
    }
  }
}

export async function gameExecuteNewGame(
  engine: MagicBlockEngine,
  game_size: number,
  max_buyin: number,
  min_buyin: number,
  game_owner_wallet_string: string,
  game_token_string: string,
  game_name: string,
  activeGamesLoaded: FetchedGame[],
  setActiveGamesLoaded: React.Dispatch<React.SetStateAction<FetchedGame[]>>,
  setTransactions: React.Dispatch<React.SetStateAction<{ id: string; status: string }[]>>,
  showPrompt: (errorMessage: string) => Promise<boolean>,
  setNewGameId: React.Dispatch<React.SetStateAction<string>>,
  setGameCreated: React.Dispatch<React.SetStateAction<boolean>>
) {
  const base_buyin = Math.sqrt(max_buyin * min_buyin);
  const max_multiple = max_buyin / base_buyin;
  const min_multiple = base_buyin / min_buyin;
  if (max_multiple > 10 || min_multiple > 10) {
    throw new Error("Min-Max buy-in spread too large (max 10x).");
  }

  const gameParams = {
    4000: { maxplayer: 20, foodcomponents: 32, cost: 0.4 },
    6000: { maxplayer: 45, foodcomponents: 72, cost: 1.0 },
    8000: { maxplayer: 80, foodcomponents: 128, cost: 1.6 },
  }[game_size];

  if (!gameParams) {
    throw new Error("Invalid game size.");
  }

  const { maxplayer, foodcomponents, cost } = gameParams;

  const gameOwnerWallet = new PublicKey(game_owner_wallet_string);
  const mint_of_token = new PublicKey(game_token_string);
  const owner_token_account = await getAssociatedTokenAddress(mint_of_token, gameOwnerWallet);

  let decimals = 9;
  const mintInfo = await connection.getParsedAccountInfo(mint_of_token);
  if (mintInfo.value && "parsed" in mintInfo.value.data) {
    decimals = mintInfo.value.data.parsed.info.decimals;
  } else {
    throw new Error("Invalid token mint info.");
  }

  const solTxnId = "transfer-sol";
  await addTransaction(setTransactions, solTxnId, "pending");
  await retryTransaction(
    solTxnId,
    async () => {
      const solTransfer = SystemProgram.transfer({
        fromPubkey: engine.getWalletPayer(),
        toPubkey: engine.getSessionPayer(),
        lamports: cost * LAMPORTS_PER_SOL,
      });
      const solTx = new Transaction().add(solTransfer);
      await engine.processWalletTransaction(solTxnId, solTx);
    },
    setTransactions,
    showPrompt
  );

  const worldTxnId = "init-world";
  await addTransaction(setTransactions, worldTxnId, "pending");

  interface NewWorldResult {
    instruction: TransactionInstruction;
    transaction: Transaction;
    worldPda: PublicKey;
    worldId: anchor.BN;
  }

  const initNewWorld = await InitializeNewWorld({
    payer: engine.getSessionPayer(),
    connection,
  });

  setNewGameId(initNewWorld.worldId.toNumber().toString());

  const computeIx = ComputeBudgetProgram.setComputeUnitLimit({
    units: CONFIG.computeUnitLimit,
  });
  //initNewWorld.transaction.add(computeIx);
  //await engine.processSessionChainTransaction(worldTxnId, initNewWorld.transaction);

  await retryTransaction(
    worldTxnId,
    async () => {

      const computeIx = ComputeBudgetProgram.setComputeUnitLimit({
        units: CONFIG.computeUnitLimit,
      });
      initNewWorld.transaction.add(computeIx);
      await engine.processSessionChainTransaction(worldTxnId, initNewWorld.transaction);

    },
    setTransactions,
    showPrompt
  );
  

  if (!initNewWorld) {
    throw new Error("Failed to initialize the new world.");
  }

  const mapTxnId = "create-map";
  await addTransaction(setTransactions, mapTxnId, "pending");

  const mapSeed = "origin";
  const mapEntityPda = FindEntityPda({
    worldId: initNewWorld.worldId,
    entityId: new anchor.BN(0),
    seed: stringToUint8Array(mapSeed),
  });

  await retryTransaction(
    mapTxnId,
    async () => {
      const mapAddIx = await createAddEntityInstruction(
        {
          payer: engine.getSessionPayer(),
          world: initNewWorld.worldPda,
          entity: mapEntityPda,
        },
        { extraSeed: stringToUint8Array(mapSeed) },
      );

      const mapTx = new Transaction()
        .add(mapAddIx)
        .add(ComputeBudgetProgram.setComputeUnitLimit({ units: CONFIG.computeUnitLimit }));

      await engine.processSessionChainTransaction(mapTxnId, mapTx);
    },
    setTransactions,
    showPrompt
  );

  const foodEntityPdas = Array.from({ length: foodcomponents }, (_, i) =>
    FindEntityPda({
      worldId: initNewWorld.worldId,
      entityId: new anchor.BN(0),
      seed: stringToUint8Array(`food${i + 1}`),
    }),
  );

  const foodTxnId = "create-food-entities";
  await addTransaction(setTransactions, foodTxnId, "pending");
  await retryTransaction(
    foodTxnId,
    async () => {
      for (let i = 0; i < foodEntityPdas.length; i += CONFIG.defaultBatchSize) {
        const batch = foodEntityPdas.slice(i, i + CONFIG.defaultBatchSize);
        const tx = new Transaction();
        const addEntityPromises = batch.map(async (foodPda, index) => {
          const addEntityIx = await createAddEntityInstruction(
            {
              payer: engine.getSessionPayer(),
              world: initNewWorld.worldPda,
              entity: foodPda,
            },
            { extraSeed: stringToUint8Array(`food${i + index + 1}`) },
          );
          tx.add(addEntityIx);
        });

        await Promise.all(addEntityPromises).catch((error) => {
          console.error("Error in batch processing:", error);
          throw new Error("Batch processing failed");
        });

        tx.add(
          ComputeBudgetProgram.setComputeUnitLimit({
            units: CONFIG.computeUnitLimit,
          }),
        );
        await engine.processSessionChainTransaction(foodTxnId, tx);
        console.log(`FoodEntityCreation batch ${i / CONFIG.defaultBatchSize + 1} completed.`);
      }
    },
    setTransactions,
    showPrompt
  );

  const playerEntityPdas = Array.from({ length: maxplayer + 1 }, (_, i) =>
    FindEntityPda({
      worldId: initNewWorld.worldId,
      entityId: new anchor.BN(0),
      seed: stringToUint8Array(`player${i + 1}`),
    }),
  );

  const playerTxnId = "create-player-entities";
  await addTransaction(setTransactions, playerTxnId, "pending");
  await retryTransaction(
    playerTxnId,
    async () => {
      for (let i = 0; i < playerEntityPdas.length; i += CONFIG.defaultBatchSize) {
        const batch = playerEntityPdas.slice(i, i + CONFIG.defaultBatchSize);
        const tx = new Transaction();
        const addEntityPromises = batch.map(async (playerPda, index) => {
          const addEntityIx = await createAddEntityInstruction(
            {
              payer: engine.getSessionPayer(),
              world: initNewWorld.worldPda,
              entity: playerPda,
            },
            { extraSeed: stringToUint8Array(`player${i + index + 1}`) },
          );
          tx.add(addEntityIx);
        });

        await Promise.all(addEntityPromises).catch((error) => {
          console.error("Error in batch processing:", error);
          throw new Error("Batch processing failed");
        });

        tx.add(
          ComputeBudgetProgram.setComputeUnitLimit({
            units: CONFIG.computeUnitLimit,
          }),
        );
        await engine.processSessionChainTransaction(playerTxnId, tx);
        console.log(`PlayerEntityCreation batch ${i / CONFIG.defaultBatchSize + 1} completed.`);
      }
    },
    setTransactions,
    showPrompt
  );

  const anteroomTxnId = "create-anteroom";
  await addTransaction(setTransactions, anteroomTxnId, "pending");
  const anteroomSeed = "ante";
  const anteroomEntityPda = FindEntityPda({
    worldId: initNewWorld.worldId,
    entityId: new anchor.BN(0),
    seed: stringToUint8Array(anteroomSeed),
  });

  await retryTransaction(
    anteroomTxnId,
    async () => {
      const anteroomAddIx = await createAddEntityInstruction(
        {
          payer: engine.getSessionPayer(),
          world: initNewWorld.worldPda,
          entity: anteroomEntityPda,
        },
        { extraSeed: stringToUint8Array(anteroomSeed) },
      );

      const anteroomTx = new Transaction()
        .add(anteroomAddIx)
        .add(ComputeBudgetProgram.setComputeUnitLimit({ units: CONFIG.computeUnitLimit }));

      await engine.processSessionChainTransaction(anteroomTxnId, anteroomTx);
    },
    setTransactions,
    showPrompt
  );

  // Initialize map component
  const initMapComponentTxnId = "init-map-component";
  await addTransaction(setTransactions, initMapComponentTxnId, "pending");

  await retryTransaction(
    initMapComponentTxnId,
    async () => {
      const initMapIx = await InitializeComponent({
        payer: engine.getSessionPayer(),
        entity: mapEntityPda,
        componentId: COMPONENT_MAP_ID,
      });

      const initMapTx = new Transaction()
        .add(initMapIx.transaction)
        .add(ComputeBudgetProgram.setComputeUnitLimit({ units: 50_000 }));

      await engine.processSessionChainTransaction(initMapComponentTxnId, initMapTx);
      console.log(`Init map component signature: ${initMapIx.transaction}`);
    },
    setTransactions,
    showPrompt
  );

  // Initialize food components
  const initFoodComponentTxnId = "init-food-components";
  await addTransaction(setTransactions, initFoodComponentTxnId, "pending");
  const foodComponentPdas: PublicKey[] = [];
  await retryTransaction(
    initFoodComponentTxnId,
    async () => {
      for (let i = 0; i < foodEntityPdas.length; i += CONFIG.defaultBatchSize) {
        const batch = foodEntityPdas.slice(i, i + CONFIG.defaultBatchSize);
        const tx = new Transaction();
        const initComponentPromises = batch.map(async (foodPda) => {
          const initComponent = await InitializeComponent({
            payer: engine.getSessionPayer(),
            entity: foodPda,
            componentId: COMPONENT_SECTION_ID,
          });
          tx.add(initComponent.transaction);
          foodComponentPdas.push(initComponent.componentPda);
        });

        await Promise.all(initComponentPromises).catch((error) => {
          console.error("Error in batch processing:", error);
          throw new Error("Batch processing failed");
        });

        tx.add(
          ComputeBudgetProgram.setComputeUnitLimit({
            units: 200_000,
          }),
        );
        await engine.processSessionChainTransaction(initFoodComponentTxnId, tx);
        console.log(`Init food component signature for batch: ${tx}`);
      }
    },
    setTransactions,
    showPrompt
  );

  // Initialize player components
  const initPlayerComponentTxnId = "init-player-components";
  await addTransaction(setTransactions, initPlayerComponentTxnId, "pending");

  await retryTransaction(
    initPlayerComponentTxnId,
    async () => {
      for (let i = 0; i < playerEntityPdas.length; i += CONFIG.defaultBatchSize) {
        const batch = playerEntityPdas.slice(i, i + CONFIG.defaultBatchSize);
        const tx = new Transaction();
        const initComponentPromises = batch.map(async (playerPda) => {
          const initPlayerComponent = await InitializeComponent({
            payer: engine.getSessionPayer(),
            entity: playerPda,
            componentId: COMPONENT_PLAYER_ID,
          });
          tx.add(initPlayerComponent.transaction);
        });

        // Wait for all promises to resolve and catch any errors
        await Promise.all(initComponentPromises).catch((error) => {
          console.error("Error in batch processing:", error);
          throw new Error("Batch processing failed");
        });

        tx.add(
          ComputeBudgetProgram.setComputeUnitLimit({
            units: 200_000,
          }),
        );
        await engine.processSessionChainTransaction(initPlayerComponentTxnId, tx);
        console.log(`Init player component signature for batch: ${tx}`);
      }
    },
    setTransactions,
    showPrompt
  );

  // Initialize anteroom component
  const initAnteroomComponentTxnId = "init-anteroom-component";
  await addTransaction(setTransactions, initAnteroomComponentTxnId, "pending");

  await retryTransaction(
    initAnteroomComponentTxnId,
    async () => {
      const initAnteIx = await InitializeComponent({
        payer: engine.getSessionPayer(),
        entity: anteroomEntityPda,
        componentId: COMPONENT_ANTEROOM_ID,
      });

      const initAnteTx = new Transaction()
        .add(initAnteIx.transaction)
        .add(ComputeBudgetProgram.setComputeUnitLimit({ units: 50_000 }));

      await engine.processSessionChainTransaction(initAnteroomComponentTxnId, initAnteTx);
      console.log(`Init anteroom component signature: ${initAnteIx.transaction}`);
    },
    setTransactions,
    showPrompt
  );

  const vaultTxnId = "setup-vault";
  await addTransaction(setTransactions, vaultTxnId, "pending");

  const mapComponentPda = FindComponentPda({
    componentId: COMPONENT_MAP_ID,
    entity: mapEntityPda,
  });

  const [tokenAccountOwnerPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("token_account_owner_pda"), mapComponentPda.toBuffer()],
    new PublicKey("BAP315i1xoAXqbJcTT1LrUS45N3tAQnNnPuNQkCcvbAr"),
  );

  const tokenVault = await getAssociatedTokenAddress(mint_of_token, tokenAccountOwnerPda, true);

  await retryTransaction(
    vaultTxnId,
    async () => {
      const vaultCreateIx = createAssociatedTokenAccountInstruction(
        engine.getSessionPayer(),
        tokenVault,
        tokenAccountOwnerPda,
        mint_of_token,
      );

      const vaultTx = new Transaction()
        .add(vaultCreateIx)
        .add(ComputeBudgetProgram.setComputeUnitLimit({ units: CONFIG.computeUnitLimit }));

      await engine.processSessionChainTransaction(vaultTxnId, vaultTx);
    },
    setTransactions,
    showPrompt
  );

  const initGameTxnId = "initialize-game";
  await addTransaction(setTransactions, initGameTxnId, "pending");

  await retryTransaction(
    initGameTxnId,
    async () => {
      const initGameSig = await gameSystemInitMap(
        engine,
        initNewWorld.worldPda,
        mapEntityPda,
        game_name,
        game_size,
        base_buyin,
        max_multiple,
        min_multiple,
      );
      console.log(`Game initialized with signature: ${initGameSig}`);
    },
    setTransactions,
    showPrompt
  );

  // Initialize players
  const initPlayersTxnId = "init-players";
  await addTransaction(setTransactions, initPlayersTxnId, "pending");

  await retryTransaction(
    initPlayersTxnId,
    async () => {
      const initbatchSizePlayers = 1;
      for (let i = 0; i < playerEntityPdas.length; i += initbatchSizePlayers) {
        // const initplayertransaction = new anchor.web3.Transaction();
        const playerBatch = playerEntityPdas.slice(i, i + initbatchSizePlayers);

        const initPlayerPromises = playerBatch.map(async (playerPda) => {
          const initPlayer = await gameSystemInitPlayer(engine, initNewWorld.worldPda, playerPda, mapEntityPda);
          console.log(`Init func players signature for batch: ${initPlayer}`);
        });

        // Wait for all promises to resolve and catch any errors
        await Promise.all(initPlayerPromises).catch((error) => {
          console.error("Error initializing players:", error);
          throw new Error("Batch processing failed");
        });
      }
    },
    setTransactions,
    showPrompt
  );

  // Initialize anteroom with token info
  const initAnteroomTxnId = "init-anteroom";
  await addTransaction(setTransactions, initAnteroomTxnId, "pending");

  await retryTransaction(
    initAnteroomTxnId,
    async () => {
      const initAnteroom = await gameSystemInitAnteroom(
        engine,
        initNewWorld.worldPda,
        anteroomEntityPda,
        mapEntityPda,
        mint_of_token,
        tokenVault,
        decimals,
        owner_token_account,
      );
      console.log(`Init func anteroom signature: ${initAnteroom}`);
    },
    setTransactions,
    showPrompt
  );

  // Delegate map component
  const delegateMapTxnId = "delegate-map";
  await addTransaction(setTransactions, delegateMapTxnId, "pending");

  await retryTransaction(
    delegateMapTxnId,
    async () => {
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
    },
    setTransactions,
    showPrompt
  );

  // Delegate food components
  const delegateFoodTxnId = "delegate-food";
  await addTransaction(setTransactions, delegateFoodTxnId, "pending");

  await retryTransaction(
    delegateFoodTxnId,
    async () => {
      const delbatchSize = 3;
      for (let i = 0; i < foodEntityPdas.length; i += delbatchSize) {
        const playertx = new anchor.web3.Transaction();

        const batch = foodEntityPdas.slice(i, i + delbatchSize);
        const delegatePromises = batch.map((foodEntityPda, index) => {
          return createDelegateInstruction({
            entity: foodEntityPda,
            account: foodComponentPdas[i + index],
            ownerProgram: COMPONENT_SECTION_ID,
            payer: engine.getSessionPayer(),
          });
        });

        // Wait for all promises to resolve and catch any errors
        const instructions = await Promise.all(delegatePromises).catch((error) => {
          console.error("Error in batch processing:", error);
          throw new Error("Batch processing failed");
        });

        instructions.forEach((instruction) => playertx.add(instruction));

        const computeLimitIxPlayerDel = ComputeBudgetProgram.setComputeUnitLimit({
          units: 200_000,
        });
        playertx.add(computeLimitIxPlayerDel);
        const delsignature2 = await engine.processSessionChainTransaction(delegateFoodTxnId, playertx);
        console.log(`Delegation signature food for batch: ${delsignature2}`);
      }
    },
    setTransactions,
    showPrompt
  );

  // Initialize food positions
  const initFoodTxnId = "init-food";
  await addTransaction(setTransactions, initFoodTxnId, "pending");

  await retryTransaction(
    initFoodTxnId,
    async () => {
      let overallIndex = 0;
      const initFoodBatchSize = 1;
      for (let i = 0; i < foodEntityPdas.length; i += initFoodBatchSize) {
        // const initfoodtransaction = new anchor.web3.Transaction();
        const foodBatch = foodEntityPdas.slice(i, i + initFoodBatchSize);

        const initFoodPromises = foodBatch.map(async (foodPda) => {
          const { x, y } = getTopLeftCorner(overallIndex, game_size);
          console.log(`Coordinates for foodPda at index ${overallIndex}: (${x}, ${y})`);

          const signatureinitfood = await gameSystemInitSection(
            engine,
            initNewWorld.worldPda,
            foodPda,
            mapEntityPda,
            x,
            y,
          );
          console.log(`Init func food signature for batch: ${signatureinitfood}`);
          overallIndex++;
        });

        // Wait for all promises to resolve and catch any errors
        await Promise.all(initFoodPromises).catch((error) => {
          console.error("Error processing food batch:", error);
          throw new Error("Batch processing failed");
        });
      }
    },
    setTransactions,
    showPrompt
  );

  // Finalize new game setup in active games
  const tokenMetadata = await fetchTokenMetadata(mint_of_token.toString());
  const newGame: FetchedGame = {
    activeGame: {
        isLoaded: true,
        worldId: initNewWorld.worldId,
        worldPda: initNewWorld.worldPda,
        name: game_name,
        active_players: 0,
        max_players: maxplayer,
        size: game_size,
        image: tokenMetadata.image || `${process.env.PUBLIC_URL}/default.png`,
        token: tokenMetadata.name || "TOKEN",
        base_buyin: base_buyin,
        min_buyin: min_buyin,
        max_buyin: max_buyin,
        endpoint: engine.getEndpointEphemRpc(),
        ping: 1000,
    } as ActiveGame, 
    playerInfo: {
        playerStatus: "new_player",
        need_to_delegate: false,
        need_to_undelegate: false,
        newplayerEntityPda: new PublicKey(0)
    } as PlayerInfo
  }


  setActiveGamesLoaded([...activeGamesLoaded, newGame]);
  console.log('activeGames', activeGamesLoaded, newGame);

  // Reclaim leftover SOL
  const reclaimSolTxnId = "reclaim-sol";
  await addTransaction(setTransactions, reclaimSolTxnId, "pending");
  await retryTransaction(
    reclaimSolTxnId,
    async () => {
      const reclaimSolTx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: engine.getSessionPayer(),
          toPubkey: gameOwnerWallet, // or another designated wallet
          lamports: CONFIG.reclaimLamportBuffer, // Adjust this value as needed
        }),
      );

      await engine.processSessionChainTransaction(reclaimSolTxnId, reclaimSolTx);
      console.log(`Reclaimed leftover SOL.`);
    },
    setTransactions,
    showPrompt
  );
  
  setGameCreated(true);
}