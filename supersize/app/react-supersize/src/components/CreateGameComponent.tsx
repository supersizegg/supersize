import React, {useCallback, useEffect, useRef, useState} from "react";
import { Connection, 
    clusterApiUrl, 
    AccountInfo, 
    Commitment,
    Keypair, 
    LAMPORTS_PER_SOL,
    SYSVAR_RENT_PUBKEY,
    Transaction, 
    sendAndConfirmTransaction,
    SystemProgram,
    SystemInstruction 
} from '@solana/web3.js';
import {PublicKey} from "@solana/web3.js";
import BN from 'bn.js';
import CreateGame from "./CreateGame";
import {
    ApplySystem,
    createApplyInstruction,
    FindEntityPda,
    createAddEntityInstruction,
    InitializeNewWorld,
    InitializeComponent,
    createDelegateInstruction,
} from "@magicblock-labs/bolt-sdk";
import {
    getAccount,
    getOrCreateAssociatedTokenAccount,
    createAssociatedTokenAccountInstruction,
    createAssociatedTokenAccount,
    createTransferInstruction,
    createCloseAccountInstruction,
    getAssociatedTokenAddress,
    TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {useConnection, useWallet} from '@solana/wallet-adapter-react';
import {WalletNotConnectedError} from '@solana/wallet-adapter-base';
import * as anchor from "@coral-xyz/anchor";
const bs58 = require('bs58');

const FOOD_COMPONENT = new PublicKey("Dnh8jDMM6HDY1bXHt55Fi2yKfUPiu4TMhAJiotfb4oHq"); //2D7pVfWpF8NAqBFJQ5FHfMLzQR2wRZk8dRUf5SV1Hw5N, DEmfhh4qTaeXsJztECTtiU61m5ygTGrQPC4CnvQwqnVA
const MAP_COMPONENT = new PublicKey("2dZ5DLJhEVFRA5xRnRD779ojsWsf3HMi6YB1zmVDdsYb"); //73x8SGXgkhk84Yk943eJRAVAW3yGoQz5m1Q2sb2THLsA, 6YbpcyDerGUMFXnW8rAP6rg7Xknp3knLeXLmZNpVgCzv
const PLAYER_COMPONENT = new PublicKey("2ewyq31Atu7yLcYMg51CEa22HmcCSJwM4jjHH8kKVAJw");  //39c3gAHBe74wPgfhP5wBRCdcNHuMBY53awGBBjJUeWSw, Hc3Mh3NYXrEy8yHdLXeCmejFtr8e98AE9j3NApkZv7Yf
//const PLAYERS_COMPONENT = new PublicKey("DM7jvvNssHqKjKXsSoJjrzAQXp9X8rTCDFskyGAjSXQB"); //DSjd5Y9zWmfXmnhm9vdzqAR1HvbaTs45ueo15SRsAoUq, AjK6CRGGmcVSvcCd7PQZJuPqewjoqRtLxno8qvhuTCQR
const ANTEROOM_COMPONENT = new PublicKey("EbGkJPaMY8XCJCNjkWwk971xzE32X5LBPg5s2g4LDYcW");  //6PWyQF9YxtQLCZeYtJhPftVg4qXv2pHGyT5NteJVjacJ, 334RfoujN9JQqxXQ3Cx4ZW9Xs6QnoiPm4eQE94XKxrXn

const INIT_ANTEROOM = new PublicKey("DbKbkJC5Dw6RvQUkaM4CH7Z5hTcWGP51t7hZ3Hu42rXp"); //5oEk3USUXwmriWFsH5cKzyfmbetYuWvRQpk4ZTzdqs47, 9rcYNGJ2xmAtdSDfXM86DhGxKxLmigYKChScFT1R2QE3
const INIT_GAME = new PublicKey("NrQkd31YsAWX6qyuLgktt4VPG4Q2DY94rBq7fWdRgo7");  //68caW8nVmZnUSunBotTTM5wuYQ3aymEsEHuTnsXgec65, 3afF5EsmrUyzAukV5gK8VcCtHFaroEigQC5LZtSLSooQ
const INIT_PLAYER = new PublicKey("58N5j49P3u351T6DSFKhPeKwBiXGnXwaYE1nWjtVkRZQ"); //84UTvkLscZVoznsgC4ppfQ3xSjBxod617g1nwTqEiMLM, 4Viwh8k4jYCuxWF1ogTA484y4UaTspbFhBph9UhJ2o4A
const INIT_FOOD = new PublicKey("3YdRbDukWkyE2tBPoUhPSJzB1MCE1gKnoNjx5WdEq6aE"); //6vFNtK3uopAUxJ4AhXbsfKyb9JZPkKnPvkFXEpUwNSEc, 57ZASAqcrm2ErhB9cJ5eBJWNWxu2B7xiy1BqMwYN6ywT

type ActiveGame = {
    worldPda: PublicKey;
    worldId: BN;
    name: string;
    active_players: number;
    max_players: number;
    size: number;
  };
  
interface GameComponentProps {
    connection: Connection;
    playerKey: PublicKey;
    walletRef: React.MutableRefObject<Keypair>;
    provider: anchor.AnchorProvider;
    buildViewerNumber: number;
    isSubmitting: Boolean;
    newGameCreated: ActiveGame | null;
    activeGames: ActiveGame[];
    setTransactionError: SetState<string | null>;
    setTransactionSuccess: SetState<string | null>;
    setIsSubmitting: SetState<boolean>;
    setActiveGames: SetState<ActiveGame[]>;
    setbuildViewerNumber: SetState<number>;
    setNewGameCreated: SetState<ActiveGame | null>;
}

type SetState<T> = React.Dispatch<React.SetStateAction<T>>;

const CreateGameComponent: React.FC<GameComponentProps> = ({ 
    connection,
    playerKey,
    walletRef,
    provider,
    buildViewerNumber,
    isSubmitting, 
    newGameCreated,
    activeGames,
    setTransactionError,
    setTransactionSuccess,
    setIsSubmitting,
    setActiveGames,
    setbuildViewerNumber,
    setNewGameCreated,
}) => {
    const { publicKey, sendTransaction } = useWallet(); 
    const [panelContent, setPanelContent] = useState<JSX.Element | null>(null);

    const submitTransactionUser = useCallback(async (transaction: Transaction): Promise<string | null> => {
        if (isSubmitting) return null;
        setIsSubmitting(true);
        setTransactionError(null);
        setTransactionSuccess(null);
        try {
            const {
                context: { slot: minContextSlot },
                value: { blockhash, lastValidBlockHeight }
            } = await connection.getLatestBlockhashAndContext();

            const signature = await sendTransaction(transaction, connection, { minContextSlot});
            await connection.confirmTransaction({ blockhash, lastValidBlockHeight, signature }, "processed");

            setTransactionSuccess(`Transaction confirmed`);
            return signature;
        } catch (error) {
            setTransactionError(`Transaction failed: ${error}`);
        } finally {
            setIsSubmitting(false);
        }
        return null;
    }, [connection, isSubmitting, sendTransaction]);

    const submitTransaction = useCallback(async (transaction: Transaction, commitmetLevel: Commitment, skipPre: boolean): Promise<string | null> => {
        if (isSubmitting) return null;
        setIsSubmitting(true);
        setTransactionError(null);
        setTransactionSuccess(null);
        try {
            const {
                context: { slot: minContextSlot },
                value: { blockhash, lastValidBlockHeight }
            } = await provider.connection.getLatestBlockhashAndContext();

            if (!walletRef.current) {
                throw new Error('Wallet is not initialized');
            }
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = walletRef.current.publicKey;
            transaction.sign(walletRef.current);

            const signature = await provider.connection.sendRawTransaction(transaction.serialize(), {
              skipPreflight: skipPre,
              preflightCommitment: commitmetLevel,
            });
            await provider.connection.confirmTransaction({ blockhash, lastValidBlockHeight, signature }, commitmetLevel);

            setTransactionSuccess(`Transaction confirmed`);
            return signature; 
        } catch (error) {
            setTransactionError(`Transaction failed: ${error}`);
        } finally {
            setIsSubmitting(false);
        }
        return null;
    }, [connection, isSubmitting, sendTransaction]);

        // Function to send SOL
        async function sendSol(destWallet: PublicKey) {
            const privateKey = "FSYbuTybdvfrBgDWSHuZ3F3fMg7mTZd1pJSPXHM6QkamDbbQkykV94n3y8XhLwRvuvyvoUmEPJf9Qz8abzaWBtv"; 
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
            } = await connection.getLatestBlockhashAndContext();
            const transaction = new Transaction();
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = senderPublicKey;
            transaction.add(SystemProgram.transfer({
                fromPubkey: senderPublicKey,
                toPubkey: recipientPublicKey,
                lamports: 1.0 * LAMPORTS_PER_SOL, // Amount in SOL (1 SOL in this example)
            }));
    
            transaction.sign(senderKeypair);
            const signature = await connection.sendRawTransaction(transaction.serialize(), {
            skipPreflight: false,
            preflightCommitment: 'processed',
            });
    
            // Confirm the transaction
            await connection.confirmTransaction({ blockhash, lastValidBlockHeight, signature }, "processed");
    
            console.log('Transaction successful with signature:', signature);
        }

    /**
     * Create a new game transaction
     */
    const newGameTx = useCallback(async (width: number, height: number, entry_fee: number, max_players: number, emit_type: number, emit_data: number, frozen: boolean, game_name: string) => {
        if (!publicKey) throw new WalletNotConnectedError();
        let maxplayer = 20;
        let foodcomponents = 32;
        if(width==4000){
            maxplayer=20;
            foodcomponents = 32;
        }
        if(width==6000){
            maxplayer=40;
            foodcomponents = 64;
        }
        if(width==10000){
            maxplayer=100;
            foodcomponents = 200;
        }
        const initNewWorld = await InitializeNewWorld({
            payer:  publicKey, 
            connection: connection,
          });
        const txSign = await submitTransactionUser(initNewWorld.transaction); 
        const worldPda = initNewWorld.worldPda;

        const mapseed = "origin"; 
        const newmapentityPda = FindEntityPda({
            worldId: initNewWorld.worldId,
            entityId: new anchor.BN(0),
            seed: mapseed
        })
        const addMapEntityIx = await createAddEntityInstruction(
            {
                payer: publicKey,
                world: worldPda,
                entity: newmapentityPda,
            },
            { extraSeed: mapseed }
        )
        const transaction = new anchor.web3.Transaction().add(addMapEntityIx);
        const signaturemap = await submitTransactionUser(transaction);
        console.log(
            `Map entity signature: ${signaturemap}`
        );

        let transactionfood = new anchor.web3.Transaction();
        const totalEntities = foodcomponents;
        const batchSize = 16;
        const newfoodEntityPdas: any[] = [];
        const newfoodComponentPdas: any[] = [];
        
        for (let i = 1; i <= totalEntities; i++) {
            const seed = 'food' + i.toString();
            const newfoodEntityPda = FindEntityPda({
                worldId: initNewWorld.worldId,
                entityId: new anchor.BN(0),
                seed: seed
            });
        
            newfoodEntityPdas.push(newfoodEntityPda);
        
            const addEntityIx = await createAddEntityInstruction(
                {
                    payer: publicKey,
                    world: worldPda,
                    entity: newfoodEntityPda,
                },
                { extraSeed: seed }
            );
        
            transactionfood.add(addEntityIx);
        
            // Submit the transaction in batches of 16
            if (i % batchSize === 0 || i === totalEntities) {
                const signaturefood = await submitTransactionUser(transactionfood);
                console.log(`Food entity batch signature: ${signaturefood}`);
        
                // Reset transaction for the next batch
                transactionfood = new Transaction();
            }
        }

        let playercomponentstransaction = new anchor.web3.Transaction();
        const totalPlayers = maxplayer;
        const playerBatchSize = 16;
        const newplayerEntityPdas: any[] = [];
        const newplayerComponentPdas: any[] = [];
        
        for (let i = 1; i <= totalPlayers; i++) {
            const seed = 'player' + i.toString();
        
            const newplayerEntityPda = FindEntityPda({
                worldId: initNewWorld.worldId,
                entityId: new anchor.BN(0),
                seed: seed
            });
        
            newplayerEntityPdas.push(newplayerEntityPda);
        
            const addEntityIx = await createAddEntityInstruction(
                {
                    payer: publicKey,
                    world: worldPda,
                    entity: newplayerEntityPda,
                },
                { extraSeed: seed }
            );
        
            playercomponentstransaction.add(addEntityIx);
        
            // Submit the transaction in batches of 16
            if (i % playerBatchSize === 0 || i === totalPlayers) {
                const signatureplayerscomponents = await submitTransactionUser(playercomponentstransaction);
                console.log(`Player entity batch signature: ${signatureplayerscomponents}`);
        
                // Reset transaction for the next batch
                playercomponentstransaction = new anchor.web3.Transaction();
            }
        }

        const anteroomcomponenttransaction = new anchor.web3.Transaction();
        const anteroomseed = "ante"; 
        const newanteentityPda = FindEntityPda({
            worldId: initNewWorld.worldId,
            entityId: new anchor.BN(0),
            seed: anteroomseed
        })
        const addAnteEntityIx = await createAddEntityInstruction(
            {
                payer: publicKey,
                world: worldPda,
                entity: newanteentityPda,
            },
            { extraSeed: anteroomseed }
        )
        anteroomcomponenttransaction.add(addAnteEntityIx);
        const signatureanteroomcomponents = await submitTransactionUser(anteroomcomponenttransaction);
        console.log(
            `Anteroom entity signature: ${signatureanteroomcomponents}`
        );

        const initmapomponenttransaction = new anchor.web3.Transaction();
        const initMapIx = await InitializeComponent({
            payer: publicKey,
            entity: newmapentityPda,
            componentId: MAP_COMPONENT,
        });

        initmapomponenttransaction.add(initMapIx.transaction);
        const signature1map = await submitTransactionUser(initmapomponenttransaction);
        console.log(
            `Init map component signature: ${signature1map}`
        );

        const initbatchSize = 10;        
        for (let i = 0; i < newfoodEntityPdas.length; i += initbatchSize) {
            // Create a new transaction for each batch of 10
            const initfoodcomponenttransaction = new anchor.web3.Transaction();
        
            // Process up to `batchSize` items in each transaction
            const batch = newfoodEntityPdas.slice(i, i + initbatchSize);
            for (const foodPda of batch) {
                const initComponent = await InitializeComponent({
                    payer: publicKey,
                    entity: foodPda,
                    componentId: FOOD_COMPONENT,
                });
                initfoodcomponenttransaction.add(initComponent.transaction);
                newfoodComponentPdas.push(initComponent.componentPda);
            }
        
            // Submit the transaction for the current batch
            const signature1food = await submitTransactionUser(initfoodcomponenttransaction);
            console.log(`Init food component signature for batch: ${signature1food}`);
        }

        for (let i = 0; i < newplayerEntityPdas.length; i += initbatchSize) {
            // Create a new transaction for each batch of 10
            const initplayerscomponenttransaction = new anchor.web3.Transaction();
        
            // Process up to `playerBatchSize` items in each transaction
            const playerBatch = newplayerEntityPdas.slice(i, i + initbatchSize);
            for (const playerPda of playerBatch) {
                const initPlayerComponent = await InitializeComponent({
                    payer: publicKey,
                    entity: playerPda,
                    componentId: PLAYER_COMPONENT,
                });
                initplayerscomponenttransaction.add(initPlayerComponent.transaction);
                newplayerComponentPdas.push(initPlayerComponent.componentPda);
            }
        
            // Submit the transaction for the current batch
            const signature1players = await submitTransactionUser(initplayerscomponenttransaction);
            console.log(`Init players component signature for batch: ${signature1players}`);
        }

        const initantecomponenttransaction = new anchor.web3.Transaction();
        const initAnteIx = await InitializeComponent({
            payer: publicKey,
            entity: newanteentityPda,
            componentId: ANTEROOM_COMPONENT,
        });
        initantecomponenttransaction.add(initAnteIx.transaction);
        const signature1ante = await submitTransactionUser(initantecomponenttransaction);
        console.log(
            `Init anteroom component signature: ${signature1ante}`
        );

        //set up vault
        const decimals = 9;
        let vault_program_id = new PublicKey("Fd4CtjtcwwkES5rdeiMaYxJUaQYkGXD4dkNku9ik5PKk");
        let mint_of_token = new PublicKey("AsoX43Q5Y87RPRGFkkYUvu8CSksD9JXNEqWVGVsr8UEp");
        let map_component_id = initMapIx.componentPda;
        console.log('map component', map_component_id)
        let [tokenAccountOwnerPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("token_account_owner_pda"), map_component_id.toBuffer()],
        vault_program_id
        );
        const owner_token_account = new PublicKey("BDcjDpR9i62tqxVCB62fpa37kvcAWeciWQC2VfUjXvZu");
        const tokenVault = await getAssociatedTokenAddress(mint_of_token, tokenAccountOwnerPda, true);
        const createTokenAccountTx = createAssociatedTokenAccountInstruction(
            publicKey,
            tokenVault,
            tokenAccountOwnerPda,
            mint_of_token,
        );
        const combinedTx = new Transaction()
        .add(createTokenAccountTx); 
        const createvaultsig = await submitTransactionUser(combinedTx);
        console.log(
            `Created pda + vault signature: ${createvaultsig}`
        );
        
        console.log(
            width,
            height,
            entry_fee,
            max_players,
            tokenVault.toString(), 
            mint_of_token.toString(), 
            9,
            tokenAccountOwnerPda.toString(),
            owner_token_account.toString(), 
            frozen,
        )
        const inittransaction = new anchor.web3.Transaction();
        const initGame = await ApplySystem({
            authority: publicKey,
            world: worldPda,
            entities: [
              {
                entity: newmapentityPda,
                components: [{ componentId: MAP_COMPONENT }],
              },
            ],
            systemId: INIT_GAME,
            args: {
                name:game_name,
                size: width,
                entry_fee: 1.0,
                entry_fee_upper_bound_mul: 10,
                entry_fee_lower_bound_mul: 100,
                frozen: frozen,
            },
          });
          inittransaction.add(initGame.transaction);
          const signatureinitgame = await submitTransactionUser(inittransaction); 
          console.log(
              `Init func game signature: ${signatureinitgame}`
          );

          for (let i = 0; i < newfoodEntityPdas.length; i += initbatchSize) {
            // Create a new transaction for each batch of 10
            const initfoodtransaction = new anchor.web3.Transaction();
        
            // Process up to `foodBatchSize` items in each transaction
            const foodBatch = newfoodEntityPdas.slice(i, i + initbatchSize);
            for (const foodPda of foodBatch) {
                const initFood = await ApplySystem({
                    authority: publicKey,
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
                });
                initfoodtransaction.add(initFood.transaction);
            }
        
            // Submit the transaction for the current batch
            const signatureinitfood = await submitTransactionUser(initfoodtransaction);
            console.log(`Init func food signature for batch: ${signatureinitfood}`);
        }


        for (let i = 0; i < newplayerEntityPdas.length; i += initbatchSize) {
            // Create a new transaction for each batch of 10
            const initplayertransaction = new anchor.web3.Transaction();
        
            // Process up to `playerBatchSize` items in each transaction
            const playerBatch = newplayerEntityPdas.slice(i, i + initbatchSize);
            for (const playerPda of playerBatch) {
                const initPlayer = await ApplySystem({
                    authority: publicKey,
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
        
            // Submit the transaction for the current batch
            const signatureplayerdinited = await submitTransactionUser(initplayertransaction);
            console.log(`Init func players signature for batch: ${signatureplayerdinited}`);
            }

            const initantetransaction = new anchor.web3.Transaction();
            const initAnteroom = await ApplySystem({
                authority: publicKey,
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
                    token_decimals: 9,
                    gamemaster_wallet_string: owner_token_account.toString(), 
                },
              });
              initantetransaction.add(initAnteroom.transaction);
        const signatureanteinited = await submitTransactionUser(initantetransaction); 
        console.log(
            `Init func anteroom signature: ${signatureanteinited}`
        );

        sendSol(playerKey);
        const mapdelegateIx = createDelegateInstruction({
        entity: newmapentityPda,
        account: initMapIx.componentPda,
        ownerProgram: MAP_COMPONENT,
        payer: playerKey,
        });
        const maptx = new anchor.web3.Transaction().add(mapdelegateIx);
        const delsignature = await submitTransaction(maptx, "confirmed", true); 
        console.log(
            `Delegation signature map: ${delsignature}`
        );
        let delbatchSize = 2;
        for (let i = 0; i < newfoodEntityPdas.length; i += delbatchSize) {
            // Create a new transaction for each batch of 10
            const playertx = new anchor.web3.Transaction();
        
            // Process up to `delegationBatchSize` items in each transaction
            const batch = newfoodEntityPdas.slice(i, i + delbatchSize);
            batch.forEach((foodEntityPda, index) => {
                const fooddelegateIx = createDelegateInstruction({
                    entity: foodEntityPda,
                    account: newfoodComponentPdas[i + index], // Adjust index to get the correct component
                    ownerProgram: FOOD_COMPONENT,
                    payer: playerKey,
                });
                playertx.add(fooddelegateIx);
            });
        
            // Submit the transaction for the current batch
            const delsignature2 = await submitTransaction(playertx, "confirmed", true);
            console.log(`Delegation signature food for batch: ${delsignature2}`);
        }

        /*const realplayertx = new anchor.web3.Transaction();

        newplayerEntityPdas.forEach((playerEntityPda, index) => {
            const playerdelegateIx = createDelegateInstruction({
                entity: playerEntityPda,
                account: newplayerComponentPdas[index],
                ownerProgram: PLAYER_COMPONENT,
                payer: playerKey,
                });
                realplayertx.add(playerdelegateIx);
        });
        
        const delsignature3 = await submitTransaction(realplayertx, "confirmed", true);
        console.log(
            `Delegation signature players: ${delsignature3}`
        );*/

        if (delsignature != null) {
            const newGameInfo : ActiveGame = {worldId: initNewWorld.worldId, worldPda: initNewWorld.worldPda, name: game_name, active_players: 0, max_players: max_players, size: width}
            console.log('new game info', newGameInfo.worldId,newGameInfo.worldPda.toString())
            setNewGameCreated(newGameInfo);
            const copiedActiveGameIds: ActiveGame[] = [...activeGames];
            copiedActiveGameIds.push(newGameInfo);  
            setActiveGames(copiedActiveGameIds);
        }
    }, [playerKey, connection]);

    useEffect(() => {
        const renderPanel = (buildViewer: number) => {
            switch (buildViewer) {
              case 2:
                return (
                  <div className="panel" style={{ display: "flex", justifyContent: 'center', width: "100%", height: "100%", color:"white" }}>
                    <div style={{ marginTop: "2vw", width: "60%" }}>
                    <h1 style={{ margin: "2vw", marginLeft:"4vw", fontFamily: "conthrax", fontSize: "36px" }}>Earn Fees</h1>
                    <p style={{ marginLeft: "4vw", fontFamily: "terminus", fontSize: "20px", width: "80%" }}>
                      Supersize will be playable using SPL tokens. For paid games, a fee will be charged on each player buy-in. 
                      The game owner will recieve the majority of game fees. Fees accumulate in each game’s chosen SPL token.
                    </p>
                    </div>
                    <img src={`${process.env.PUBLIC_URL}/Group6.png`} width="100vw" height="auto" alt="Image" style={{ width: "25vw",height: "25vw", marginRight:"1vw", alignSelf:"center" }}/>
                  </div>
                );
              case 3:
                return (
                  <div className="panel" style={{display: "flex", width: "100%", height: "100%", color:"white", flexDirection:"column" }}>
                    <h1 style={{ margin: "2vw", marginLeft: "2vw", fontFamily: "conthrax", fontSize: "35px" }}>Mod Your Game</h1>
                    <p style={{ marginLeft: "2vw", fontFamily: "terminus", fontSize: "24px", width: "80%" }}>
                      Make your game stand out. Add everything from custom features and gameplay mechanics to in-game drops.
                      Supersize is a real-time fully onchain game powered by Magicblock engine. 
                      <br /><br />
                      Here are some resources to start modding realtime fully onchain games: 
                    </p>
                    <div style={{display: "flex", flexDirection:"column", marginLeft:"2vw", marginTop:"1vw"}}>
                    <div style={{display: "flex", flexDirection:"row", color:"white", alignItems:"center"}}><img style={{marginTop:"1vw"}} src={`${process.env.PUBLIC_URL}/Logomark_white.png`} width="30vw" height="auto" alt="Image" /> <a style={{marginTop:"20px", marginLeft:"1vw", cursor:"pointer"}} onClick={() => {window.open('https://docs.magicblock.gg/Forever%20Games', '_blank');}}> docs.magicblock.gg/Forever%20Games </a></div>
                    <div style={{display: "flex", flexDirection:"row", color:"white", alignItems:"center"}}><img style={{marginTop:"1vw"}} src={`${process.env.PUBLIC_URL}/GitBook.png`} width="30vw" height="auto" alt="Image" /> <a style={{marginTop:"10px", marginLeft:"1vw", cursor:"pointer"}} onClick={() => {window.open('https://docs.supersize.app', '_blank');}}> docs.supersize.app</a></div>
                    <div style={{display: "flex", flexDirection:"row", color:"white", alignItems:"center"}}><img style={{marginTop:"1vw"}} src={`${process.env.PUBLIC_URL}/github-mark-white.png`} width="30vw" height="auto" alt="Image" /> <a style={{marginTop:"10px", marginLeft:"1vw", cursor:"pointer"}} onClick={() => {window.open('https://github.com/magicblock-labss', '_blank');}}> github.com/magicblock-labs </a></div>
                    </div>
                  </div>
                );
              case 4:
                return (
                  <div className="panel" style={{display: "flex", justifyContent: 'center', alignItems:"center", height: "100%", color:"white", flexDirection:"column"}}>
                    <div>
                    <h1 style={{ margin: "2vw", marginLeft: "2vw", fontFamily: "conthrax", fontSize: "38px"}}>Get In Touch</h1>
                    <p style={{ marginLeft: "2vw", fontFamily: "terminus", fontSize: "24px"}}>
                      Interested in building or partnering with Supersize? <br />
                      Reach out to lewis@supersize.gg 
                    </p>
                    </div>
                  </div>
                );
                case 5:
                    return (
                      <div className="panel" style={{ display: "flex", justifyContent: 'center', width: "100%", height: "100%", color:"white" }}>
                        <div style={{ marginTop: "1vw", width: "60%" }}>
                          <h1 style={{ marginTop: "2vw", marginBottom: "2vw", marginLeft: "1.5vw", fontFamily: "conthrax", fontSize: "36px" }}>Launch Your Game</h1>
                          <p style={{ marginLeft: "1.5vw", fontFamily: "terminus", fontSize: "20px", width: "80%" }}>
                              Deploy and customize your own Supersize game. <br /><br />
                            <span style={{ opacity: "0.7" }}>
                              Deploying a game generates a new Supersize world that lives forever and is owned by you. 
                              Game deployment costs 0.05 sol. Currently, games can only be deployed to devnet.
                            </span>
                            <br /><br />
                             <span className="free-play" style={{display:newGameCreated?'flex':'none', width: 'fit-content', padding:"10px", fontSize:"15px", marginTop:"1vh"}}>New Game ID: {newGameCreated?.worldId.toString()}</span>
                          </p>
                        </div>
                        <div style={{ marginRight: "1.5vw", marginTop:"3vw" }}>
                          <CreateGame initFunction={newGameTx} />
                        </div>
                      </div>
                    );
              default:
                return null;
            }
        };
        
        setPanelContent(renderPanel(buildViewerNumber));
      }, [buildViewerNumber, newGameCreated]);

    return (
        <>
        <div className="buildViewer" style={{display:"flex", alignItems: 'center', justifyContent: 'center'}}>
            {panelContent}
            </div>
        <div className="buildSelect">
        <div className= {buildViewerNumber==5 ? "circleOn" : "circle"} onClick={() => setbuildViewerNumber(5)}></div><div className={buildViewerNumber==2 ? "circleOn" : "circle"} onClick={() => setbuildViewerNumber(2)}></div><div className={buildViewerNumber==3 ? "circleOn" : "circle"} onClick={() => setbuildViewerNumber(3)}></div>
        </div>
        </>
    );
};
  
export default CreateGameComponent;