import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { Players } from "../target/types/players";
import { Map } from "../target/types/map";
import { InitGame } from "../target/types/init_game";
import { JoinGame } from "../target/types/join_game";
import { ExitGame } from "../target/types/exit_game";
import { Movement } from "../target/types/movement";
import { ChargeAttack } from "../target/types/charge_attack";
import { MovementLite } from "../target/types/movement_lite";

import { Player1 } from "../target/types/player1";
import { PlayerMovement } from "../target/types/player_movement";
import { EnterLite } from "../target/types/enter_lite";
import { ExitLite } from "../target/types/exit_lite";
import { Section } from "../target/types/section";
import { Maplite } from "../target/types/maplite";
import { InitGamelite } from "../target/types/init_gamelite";

import {
  FindEntityPda,
  createAddEntityInstruction,
  InitializeNewWorld,
  AddEntity,
  InitializeComponent,
  ApplySystem,
  FindComponentPda,
  createUndelegateInstruction,
  createDelegateInstruction,
  DELEGATION_PROGRAM_ID,
  createAllowUndelegationInstruction,
} from "@magicblock-labs/bolt-sdk";
import { expect } from "chai";
import { map } from "@metaplex-foundation/beet";
import { Connection, Keypair,clusterApiUrl, LAMPORTS_PER_SOL, Transaction, sendAndConfirmTransaction,SystemProgram } from '@solana/web3.js';
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";

const bs58 = require('bs58');

describe("BoltCounter", () => {
  // Configure the client to use the local cluster.

  //const provider = anchor.AnchorProvider.env();
  //anchor.setProvider(provider);

  const wallet = Keypair.generate();

  const  connection =  new Connection("https://devnet.helius-rpc.com/?api-key=cba33294-aa96-414c-9a26-03d5563aa676");  //new Connection("https://sly-blue-cherry.solana-devnet.quiknode.pro/13351562e034e23c97c16dffce573f7a384c080b/"); 
  //const connection = new Connection(clusterApiUrl('devnet'), {
  //  commitment: 'processed',
  //});
  
  // Create the AnchorProvider with the specified options
  const provider = new anchor.AnchorProvider(
    connection,
    new NodeWallet(wallet),
    {
      preflightCommitment: 'processed',
      commitment: 'processed',
    }
  );
  
  //console.log(provider); //anchor.AnchorProvider.env(); 
  anchor.setProvider(provider);

  console.log(process.env.PROVIDER_ENDPOINT, process.env.WS_ENDPOINT);
  
  const providerEphemeralRollup = new anchor.AnchorProvider(
      new anchor.web3.Connection(process.env.PROVIDER_ENDPOINT, {
        wsEndpoint: "wss://supersize.magicblock.app",
      }),
      new NodeWallet(wallet) //anchor.Wallet.local()
  );

  // Constants used to test the program.
  let worldPda: PublicKey;
  let worldId: anchor.BN;
  let entityPda: PublicKey;
  let playerEntityPda: PublicKey;
  let foodEntityPda: PublicKey;

  const playersComponent = anchor.workspace.Players as Program<Players>;
  //const mapComponent = anchor.workspace.Map as Program<Map>;
  const initGame = anchor.workspace.InitGame as Program<InitGame>;
  const joinGameSystem = anchor.workspace.JoinGame as Program<JoinGame>;
  const exitGameSystem = anchor.workspace.ExitGame as Program<ExitGame>;
  const movementSystem = anchor.workspace.MovementLite as Program<MovementLite>;
  const chargeSystem = anchor.workspace.ChargeAttack as Program<ChargeAttack>;

  const player1Component = anchor.workspace.Player1 as Program<Player1>;
  const moveSystem = anchor.workspace.PlayerMovement as Program<PlayerMovement>;
  const playerJoinSystem = anchor.workspace.EnterLite as Program<EnterLite>;
  const playerExitSystem = anchor.workspace.ExitLite as Program<ExitLite>;
  const foodlistComponent = anchor.workspace.Section as Program<Section>;
  const mapComponent = anchor.workspace.Maplite as Program<Maplite>;
  const initGamelite = anchor.workspace.InitGamelite as Program<InitGamelite>;

  async function sendSol(destWallet: PublicKey) {
    const privateKey = "FSYbuTybdvfrBgDWSHuZ3F3fMg7mTZd1pJSPXHM6QkamDbbQkykV94n3y8XhLwRvuvyvoUmEPJf9Qz8abzaWBtv"; //process.env.PRIVATE_KEY;
    if (!privateKey || !destWallet) {
        throw new Error("Key is not defined in the environment variables");
    }

    const secretKey = bs58.decode(privateKey); //Uint8Array.from(JSON.parse(privateKey));
    const senderKeypair = Keypair.fromSecretKey(secretKey);
    const recipientPublicKey = destWallet;
    const senderPublicKey = senderKeypair.publicKey;

    const {
        context: { slot: minContextSlot },
        value: { blockhash, lastValidBlockHeight }
    } = await provider.connection.getLatestBlockhashAndContext();
    const transaction = new Transaction();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = senderPublicKey;
    transaction.add(SystemProgram.transfer({
        fromPubkey: senderPublicKey,
        toPubkey: recipientPublicKey,
        lamports: 0.2 * LAMPORTS_PER_SOL, // Amount in SOL (1 SOL in this example)
    }));

    transaction.sign(senderKeypair);
    const signature = await provider.connection.sendRawTransaction(transaction.serialize(), {
    skipPreflight: false,
    preflightCommitment: 'processed',
    });

    // Confirm the transaction
    await provider.connection.confirmTransaction({ blockhash, lastValidBlockHeight, signature }, "processed");

    console.log('Transaction successful with signature:', signature);
  }

it("Fund wallet", async () => {
    await sendSol(wallet.publicKey).catch(console.error);
    await new Promise(resolve => setTimeout(resolve, 2000));
});
  it("InitializeNewWorld", async () => {
    const initNewWorld = await InitializeNewWorld({
      payer: provider.wallet.publicKey,
      connection: provider.connection,
    });
    const txSign = await provider.sendAndConfirm(initNewWorld.transaction);
    worldPda = initNewWorld.worldPda;
    worldId = initNewWorld.worldId;
    console.log(
      `Initialized a new world (ID=${worldId}). Initialization signature: ${txSign}`
    );
  });

  it("Add a player entity", async () => {

    const seed = provider.wallet.publicKey.toString().substring(0, 20); // There is a current limitation on the size of the seeds, will be increased
    const newplayerEntityPda = FindEntityPda({
        worldId: worldId,
        entityId: new anchor.BN(0),
        seed: seed
    })
    const addEntityIx = await createAddEntityInstruction(
        {
            payer: provider.wallet.publicKey,
            world: worldPda,
            entity: newplayerEntityPda,
        },
        { extraSeed: seed }
    )
    const tx = new anchor.web3.Transaction().add(addEntityIx);
    const txSign = await provider.sendAndConfirm(tx);
    playerEntityPda = newplayerEntityPda;
    console.log(
      `Initialized a new Entity (ID=${playerEntityPda}). Initialization signature: ${txSign}`
    );
  });

  it("Add a food entity", async () => {

    const seed = "11111111111111111111"; // There is a current limitation on the size of the seeds, will be increased
    const newfoodEntityPda = FindEntityPda({
        worldId: worldId,
        entityId: new anchor.BN(0),
        seed: seed
    })
    const addEntityIx = await createAddEntityInstruction(
        {
            payer: provider.wallet.publicKey,
            world: worldPda,
            entity: newfoodEntityPda,
        },
        { extraSeed: seed }
    )
    const tx = new anchor.web3.Transaction().add(addEntityIx);
    const txSign = await provider.sendAndConfirm(tx);
    foodEntityPda = newfoodEntityPda;
    console.log(
      `Initialized a new Entity (ID=${foodEntityPda}). Initialization signature: ${txSign}`
    );
  });


  it("Add an entity", async () => {

    const addEntity = await AddEntity({
      payer: provider.wallet.publicKey,
      world: worldPda,
      connection: provider.connection,
    });
    const txSign = await provider.sendAndConfirm(addEntity.transaction);
    entityPda = addEntity.entityPda;
    console.log(
      `Initialized a new Entity (ID=${entityPda}). Initialization signature: ${txSign}`
    );
  });

  it("Add a component", async () => {
    /*const initComponent = await InitializeComponent({
      payer: provider.wallet.publicKey,
      entity: playerEntityPda,
      componentId: YourComponentProgramId,
  })*/
    const initComponent = await InitializeComponent({
      payer: provider.wallet.publicKey,
      entity: playerEntityPda,
      componentId: player1Component.programId,
    });
    const txSign = await provider.sendAndConfirm(initComponent.transaction);
    console.log(
      `Initialized the players component. Initialization signature: ${txSign}`
    );
  });

  it("Add a component", async () => {
    const initComponent = await InitializeComponent({
      payer: provider.wallet.publicKey,
      entity: foodEntityPda,
      componentId: foodlistComponent.programId,
    });
    const txSign = await provider.sendAndConfirm(initComponent.transaction);
    console.log(
      `Initialized the food component. Initialization signature: ${txSign}`
    );
  });

  it("Add a component", async () => {
    const initComponent = await InitializeComponent({
      payer: provider.wallet.publicKey,
      entity: entityPda,
      componentId: mapComponent.programId,
    });
    const txSign = await provider.sendAndConfirm(initComponent.transaction);
    console.log(
      `Initialized the map component. Initialization signature: ${txSign}`
    );
  });

  it("Delegation", async () => {
    const componentPda1 = FindComponentPda({
      componentId: player1Component.programId,
      entity: playerEntityPda,
  });
  const delegateIx1 = createDelegateInstruction({
    entity: playerEntityPda,
    account: componentPda1,
    ownerProgram: player1Component.programId,
    payer: provider.wallet.publicKey,
  });
  const tx = new anchor.web3.Transaction().add(delegateIx1);
  const componentPda3= FindComponentPda({
    componentId: foodlistComponent.programId,
    entity: foodEntityPda,
});
const delegateIx3 = createDelegateInstruction({
  entity: foodEntityPda,
  account: componentPda3,
  ownerProgram: foodlistComponent.programId,
  payer: provider.wallet.publicKey,
});
tx.add(delegateIx3);
    const componentPda = FindComponentPda({
        componentId: mapComponent.programId,
        entity: entityPda,
    });
    const delegateIx = createDelegateInstruction({
      entity: entityPda,
      account: componentPda,
      ownerProgram: mapComponent.programId,
      payer: provider.wallet.publicKey,
    });
    tx.add(delegateIx);

    const txSign = await provider.sendAndConfirm(tx, [], { skipPreflight: true, commitment: 'finalized' });
    console.log(
        `Delegation signature: ${txSign}`
    );
  });

  it("Apply the init game system", async () => {
    const applySystem = await ApplySystem({
      authority: providerEphemeralRollup.wallet.publicKey,
      entities: [
        {
          entity: entityPda,
          components: [{ componentId: mapComponent.programId }],
        },
      ],
      systemId: initGamelite.programId,
      args: {
        name:"test",
        width: 1000,
        height: 1000,
        entry_fee: 1000,
        max_players: 20,
        emit_type: 0, 
        emit_data: 64.0,
        frozen: true,
      },
    });
    const txSign = await providerEphemeralRollup.sendAndConfirm(applySystem.transaction);
    console.log(`Initialized a game. Signature: ${txSign}`);
    const componentPda = FindComponentPda({
      componentId: mapComponent.programId,
      entity: entityPda,
    });
    const acc = await providerEphemeralRollup.connection.getAccountInfo(
      componentPda
    );
    const parsedData = mapComponent.coder.accounts.decode("maplite", acc.data);
    console.log(`Initialized new Map, name: ${parsedData.name}, width: ${parsedData.width}, height: ${parsedData.height}, entry fee: ${parsedData.entryFee}, max players: ${parsedData.maxPlayers}, food emit: ${parsedData.emitType.flat ? parsedData.emitType.flat.value : parsedData.emitType.curve.percent}, frozen: ${parsedData.settingsFrozen}`);
  });

  it("Apply the join game system", async () => {
    const applySystem = await ApplySystem({
      authority: providerEphemeralRollup.wallet.publicKey,
      entities: [
        {
          entity: playerEntityPda,
          components: [{ componentId: player1Component.programId }],
        },
        {
          entity: foodEntityPda,
          components: [{ componentId: foodlistComponent.programId }],
        },
        {
          entity: entityPda,
          components: [{ componentId: mapComponent.programId }],
        },
      ],
      systemId: playerJoinSystem.programId,
    });
    const txSign = await providerEphemeralRollup.sendAndConfirm(applySystem.transaction);
    console.log(`Applied a join game system. Signature: ${txSign}`);
    const componentPda = FindComponentPda({
      componentId: player1Component.programId,
      entity: playerEntityPda,
    });
    const acc = await providerEphemeralRollup.connection.getAccountInfo(
      componentPda
    );
    const parsedData = player1Component.coder.accounts.decode("player1", acc.data);

    console.log(parsedData.authority as string);
    const mapComponentPda = FindComponentPda({
      componentId: mapComponent.programId,
      entity: entityPda,
    });
    const mapacc = await providerEphemeralRollup.connection.getAccountInfo(
      mapComponentPda
    );
    const mapParsedData = mapComponent.coder.accounts.decode("maplite", mapacc.data);
    console.log(`Players: ${mapParsedData.players}`);
  });
  it("Apply the movement system", async () => {
    const playerComponentPda = FindComponentPda({
      componentId: player1Component.programId,
      entity: playerEntityPda,
    });
    const foodComponentPda = FindComponentPda({
      componentId: foodlistComponent.programId,
      entity: foodEntityPda,
    });
    const acc1 = await providerEphemeralRollup.connection.getAccountInfo(
      playerComponentPda
    );
    const parsedData1 = player1Component.coder.accounts.decode("player1", acc1.data);
    console.log(`Start Player x: ${parsedData1.x}, y: ${parsedData1.y}, target x: ${parsedData1.targetX}, target y: ${parsedData1.targetY}`);
    
    const numberOfIterations = 12;
    console.log(`Boosting northeast 12 times:`);
    const mapDataStart = await providerEphemeralRollup.connection.getAccountInfo(
      foodComponentPda
    );
    let foodLen = foodlistComponent.coder.accounts.decode("section", mapDataStart.data).food.length;
    for (let i = 0; i < numberOfIterations; i++) {
      const acc2 = await providerEphemeralRollup.connection.getAccountInfo(
        playerComponentPda
      );
      const parsedData2 = player1Component.coder.accounts.decode("player1", acc2.data);
      const applySystem = await ApplySystem({
        authority: providerEphemeralRollup.wallet.publicKey,
        entities: [
          {
            entity: playerEntityPda,
            components: [{ componentId: player1Component.programId }],
          },
          {
            entity: foodEntityPda,
            components: [{ componentId: foodlistComponent.programId }],
          },
          {
            entity: entityPda,
            components: [{ componentId: mapComponent.programId }],
          },
        ],
        systemId: moveSystem.programId,
        args: {
          x: Math.max(0, Math.min(parsedData2.x + 100, 5000)),
          y: Math.max(0, Math.min(parsedData2.y + 100, 5000)),
          boost: true,
        },
      });
      const txSign = await providerEphemeralRollup.sendAndConfirm(applySystem.transaction);
      console.log(`Moved. Signature: ${txSign}`);
      const acc3 = await providerEphemeralRollup.connection.getAccountInfo(
        playerComponentPda
      );
      const parsedData3 = player1Component.coder.accounts.decode("player1", acc3.data);
      const mapDataCurr = await providerEphemeralRollup.connection.getAccountInfo(
        foodComponentPda
      );
      let mapData = foodlistComponent.coder.accounts.decode("section", mapDataCurr.data);
      console.log(`Player x: ${parsedData3.x}, y: ${parsedData3.y}, target x: ${parsedData3.targetX}, target y: ${parsedData3.targetY}`);
      console.log(`Player score: ${parsedData3.score}, mass: ${parsedData3.mass}`);
      if(mapData.food.length > foodLen){
        for (let i = 0; i < (mapData.food.length - foodLen); i++) {
          let inv_ind = i + 1;
          console.log(`New food{ x: ${mapData.food.slice(-inv_ind)[0].x}, y:${mapData.food.slice(-inv_ind)[0].y}}`);
          foodLen = mapData.food.length;
        }
      }
      if(mapData.food.length < foodLen){
        console.log(`Food eaten.`);
        foodLen = mapData.food.length;
      }
    }
    let mapDataEnd = await providerEphemeralRollup.connection.getAccountInfo(
      foodComponentPda
    );
    let endFoodLen = foodlistComponent.coder.accounts.decode("section", mapDataEnd.data).food.length;
    console.log(`End food length: ${endFoodLen}`);
  });

  /*it("Apply the charge system", async () => {
    const mapComponentPda = FindComponentPda({
      componentId: mapComponent.programId,
      entity: entityPda,
    });
    const playerComponentPda = FindComponentPda({
      componentId: playersComponent.programId,
      entity: entityPda,
    });
    let mapDataRaw = await providerEphemeralRollup.connection.getAccountInfo(
      mapComponentPda
    );
    let foodLen = mapComponent.coder.accounts.decode("map", mapDataRaw.data).food.length;

    async function sendTransaction() {
      
      const applySystem = await ApplySystem({
        authority: providerEphemeralRollup.wallet.publicKey,
        entities: [
          {
            entity: entityPda,
            components: [{ componentId: playersComponent.programId }, { componentId: mapComponent.programId }],
          },
        ],
        systemId: chargeSystem.programId,
      });

      providerEphemeralRollup.sendAndConfirm(applySystem.transaction)
          .then(async result => {
            let mapDataRaw = await providerEphemeralRollup.connection.getAccountInfo(
              mapComponentPda
            );
            let playerDataRaw = await providerEphemeralRollup.connection.getAccountInfo(
              playerComponentPda
            );
            const playerData = playersComponent.coder.accounts.decode("players", playerDataRaw.data);
            let mapData = mapComponent.coder.accounts.decode("map", mapDataRaw.data);
            console.log(`Charge applied, Player speed: ${playerData.players[0].speed}, score: ${playerData.players[0].score}, mass: ${playerData.players[0].mass}, food length: ${mapData.food.length}, charge start time: ${playerData.players[0].chargeStart}`);
            console.log(`Player x: ${playerData.players[0].x}, y: ${playerData.players[0].y}, target x: ${Math.max(0, Math.min(playerData.players[0].targetX, 5000))}, target y: ${Math.max(0, Math.min(playerData.players[0].targetY, 5000))}`);
            if(mapData.food.length > foodLen){
              for (let i = 0; i < (mapData.food.length - foodLen); i++) {
                let inv_ind = i + 1;
                console.log(`New food{ x: ${mapData.food.slice(-inv_ind)[0].x}, y:${mapData.food.slice(-inv_ind)[0].y}}`);
              }
            }
          })
          .catch(error => {
              console.error('Error with transaction:', error);
          });
    }

    sendTransaction()
    setTimeout(sendTransaction, 3000);
  });

  it("Apply the movement system", async () => {
    const playerComponentPda = FindComponentPda({
      componentId: playersComponent.programId,
      entity: entityPda,
    });
    const mapComponentPda = FindComponentPda({
      componentId: mapComponent.programId,
      entity: entityPda,
    });
    const acc1 = await providerEphemeralRollup.connection.getAccountInfo(
      playerComponentPda
    );
    const parsedData1 = playersComponent.coder.accounts.decode("players", acc1.data);
    console.log(`Start Player x: ${parsedData1.players[0].x}, y: ${parsedData1.players[0].y}, target x: ${parsedData1.players[0].targetX}, target y: ${parsedData1.players[0].targetY}`);
    
    const numberOfIterations = 20;
    console.log(`Boosting souththeast 20 times:`);
    const mapDataStart = await providerEphemeralRollup.connection.getAccountInfo(
      mapComponentPda
    );
    let foodLen = mapComponent.coder.accounts.decode("map", mapDataStart.data).food.length;
    for (let i = 0; i < numberOfIterations; i++) {
      const acc2 = await providerEphemeralRollup.connection.getAccountInfo(
        playerComponentPda
      );
      const parsedData2 = playersComponent.coder.accounts.decode("players", acc2.data);
      const applySystem = await ApplySystem({
        authority: providerEphemeralRollup.wallet.publicKey,
        entities: [
          {
            entity: entityPda,
            components: [{ componentId: playersComponent.programId }, { componentId: mapComponent.programId }],
          },
        ],
        systemId: moveSystem.programId,
        args: {
          x: Math.max(0, Math.min(parsedData2.players[0].x + 100, 5000)),
          y: Math.max(0, Math.min(parsedData2.players[0].y - 100, 5000)),
          boost: true,
        },
      });
      const txSign = await providerEphemeralRollup.sendAndConfirm(applySystem.transaction);
      console.log(`Moved. Signature: ${txSign}`);
      const acc3 = await providerEphemeralRollup.connection.getAccountInfo(
        playerComponentPda
      );
      const parsedData3 = playersComponent.coder.accounts.decode("players", acc3.data);
      const mapDataCurr = await providerEphemeralRollup.connection.getAccountInfo(
        mapComponentPda
      );
      let mapData = mapComponent.coder.accounts.decode("map", mapDataCurr.data);
      console.log(`Player x: ${parsedData3.players[0].x}, y: ${parsedData3.players[0].y}, target x: ${parsedData3.players[0].targetX}, target y: ${parsedData3.players[0].targetY}`);
      console.log(`Player score: ${parsedData3.players[0].score}, mass: ${parsedData3.players[0].mass}`);
      if(mapData.food.length > foodLen){
        for (let i = 0; i < (mapData.food.length - foodLen); i++) {
          let inv_ind = i + 1;
          console.log(`New food{ x: ${mapData.food.slice(-inv_ind)[0].x}, y:${mapData.food.slice(-inv_ind)[0].y}}`);
          foodLen = mapData.food.length;
        }
      }
      if(mapData.food.length < foodLen){
        console.log(`Food eaten.`);
        foodLen = mapData.food.length;
      }
    }
    let mapDataEnd = await providerEphemeralRollup.connection.getAccountInfo(
      mapComponentPda
    );
    let endFoodLen = mapComponent.coder.accounts.decode("map", mapDataEnd.data).food.length;
    console.log(`End food length: ${endFoodLen}`);
  });*/

  it("Apply the exit game system", async () => {
    const applySystem = await ApplySystem({
      authority: providerEphemeralRollup.wallet.publicKey,
      entities: [
        {
          entity: playerEntityPda,
          components: [{ componentId: player1Component.programId }],

        },
        {
          entity: entityPda,
          components: [{ componentId: mapComponent.programId }],
        },
      ],
      systemId: playerExitSystem.programId,
    });
    const txSign = await providerEphemeralRollup.sendAndConfirm(applySystem.transaction);
    console.log(`Applied an exit game system. Signature: ${txSign}`);
    const componentPda = FindComponentPda({
      componentId: player1Component.programId,
      entity: playerEntityPda,
    });
    const acc = await providerEphemeralRollup.connection.getAccountInfo(
      componentPda
    );
    const parsedData = player1Component.coder.accounts.decode("player1", acc.data);
    console.log(parsedData.authority as string);
    const mapComponentPda = FindComponentPda({
      componentId: mapComponent.programId,
      entity: entityPda,
    });
    const mapacc = await providerEphemeralRollup.connection.getAccountInfo(
      mapComponentPda
    );
    const mapParsedData = mapComponent.coder.accounts.decode("maplite", mapacc.data);
    console.log(`Players: ${mapParsedData.players}`);
  });

  it("Undelegate players", async () => {
    const playersComponentPda = FindComponentPda({
      componentId: player1Component.programId,
      entity: playerEntityPda,
    });
    const allowUndelegateIx = createAllowUndelegationInstruction({
      delegatedAccount: playersComponentPda,
      ownerProgram: player1Component.programId,
    });
    const undelegateIx = createUndelegateInstruction({
      payer: provider.wallet.publicKey,
      delegatedAccount: playersComponentPda,
      ownerProgram: player1Component.programId,
      reimbursement: provider.wallet.publicKey,
    });
    const tx = new anchor.web3.Transaction()
        .add(allowUndelegateIx)
        .add(undelegateIx);
    await provider.sendAndConfirm(tx, [], { skipPreflight: true });
    const acc = await provider.connection.getAccountInfo(
        playersComponentPda
    );
    //expect(acc.owner).to.deep.equal(playersComponent.programId);
  });

  it("Undelegate map", async () => {
    const mapComponentPda = FindComponentPda({
      componentId: mapComponent.programId,
      entity: entityPda,
    });
    const allowUndelegateIx = createAllowUndelegationInstruction({
      delegatedAccount: mapComponentPda,
      ownerProgram: mapComponent.programId,
    });
    const undelegateIx = createUndelegateInstruction({
      payer: provider.wallet.publicKey,
      delegatedAccount: mapComponentPda,
      ownerProgram: mapComponent.programId,
      reimbursement: provider.wallet.publicKey,
    });
    const tx = new anchor.web3.Transaction()
        .add(allowUndelegateIx)
        .add(undelegateIx);
    await provider.sendAndConfirm(tx, [], { skipPreflight: true });
    const acc = await provider.connection.getAccountInfo(
      mapComponentPda
    );
    //expect(acc.owner).to.deep.equal(mapComponent.programId);
  });
});

function delay(ms: number) {
  return new Promise( resolve => setTimeout(resolve, ms) );
}
