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
    SystemInstruction,
    PublicKey, 
} from '@solana/web3.js';
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

const FOOD_COMPONENT = new PublicKey("BEox2GnPkZ1upBAdUi7FVqTstjsC4tDjsbTpTiE17bah"); 
const MAP_COMPONENT = new PublicKey("2dZ5DLJhEVFRA5xRnRD779ojsWsf3HMi6YB1zmVDdsYb"); 
const PLAYER_COMPONENT = new PublicKey("2ewyq31Atu7yLcYMg51CEa22HmcCSJwM4jjHH8kKVAJw");  
const ANTEROOM_COMPONENT = new PublicKey("EbGkJPaMY8XCJCNjkWwk971xzE32X5LBPg5s2g4LDYcW"); 

const INIT_ANTEROOM = new PublicKey("AxmRc9buNLgWVMinrH2WunSxKmdsBXVCghhYZgh2hJT6");
const INIT_GAME = new PublicKey("NrQkd31YsAWX6qyuLgktt4VPG4Q2DY94rBq7fWdRgo7");  
const INIT_PLAYER = new PublicKey("58N5j49P3u351T6DSFKhPeKwBiXGnXwaYE1nWjtVkRZQ"); 
const INIT_FOOD = new PublicKey("4euz4ceqv5ugh1x6wZP3BsLNZHqBxQwXcK59psw5KeQw"); 

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
    gamewallet: string;
    setTransactionError: SetState<string | null>;
    setTransactionSuccess: SetState<string | null>;
    setIsSubmitting: SetState<boolean>;
    setActiveGames: SetState<ActiveGame[]>;
    setbuildViewerNumber: SetState<number>;
    setNewGameCreated: SetState<ActiveGame | null>;
    setGameWallet: SetState<string>;
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
    gamewallet,
    setTransactionError,
    setTransactionSuccess,
    setIsSubmitting,
    setActiveGames,
    setbuildViewerNumber,
    setNewGameCreated,
    setGameWallet,
}) => {
    const { publicKey, sendTransaction } = useWallet(); 
    const [panelContent, setPanelContent] = useState<JSX.Element | null>(null);
    const [selected, setSelected] = useState(0);

    const options = [
      { id: 0, size: 4000, players: 20, cost: '0.4 SOL' },
      { id: 1, size: 6000, players: 40, cost: '0.8 SOL' },
      { id: 2, size: 10000, players: 100, cost: '2.0 SOL' },
    ];

    const handleSelection = (id: any) => {
      setSelected(id);
    };

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

    function getTopLeftCorner(index: number, mapSize: number): { x: number, y: number } {
        const sectionSize = 1000; 
        const sectionsPerRow = mapSize / sectionSize; 
        const mapSectionCount = sectionsPerRow * sectionsPerRow;
        const wrappedIndex = index % mapSectionCount;
        const row = Math.floor(wrappedIndex / sectionsPerRow);
        const col = wrappedIndex % sectionsPerRow;
        const x = col * sectionSize;
        const y = row * sectionSize;
    
        return { x, y };
    }

    /**
     * Create a new game transaction
     */
    const newGameTx = useCallback(async (game_size: number, max_buyin: number, min_buyin: number, game_owner_wallet_string: string, game_token_string: string, game_name: string) => {
        if (!publicKey) throw new WalletNotConnectedError();
        const base_buyin = Math.sqrt(max_buyin * min_buyin);
        const max_multiple = max_buyin / base_buyin;
        const min_multiple = base_buyin / min_buyin;
        if (max_multiple > 10 || min_multiple > 10) {
            throw new Error("Min-Max buy-in spread too large (max 100x).");
        }
        console.log(min_multiple, max_multiple, base_buyin)
        let maxplayer = 20;
        let foodcomponents = 32;
        let cost = 0.4;
        if(game_size==4000){
            maxplayer=20;
            foodcomponents = 32;
            cost = 0.4;
        }
        if(game_size==6000){
            maxplayer=40;
            foodcomponents = 72;
            cost = 0.8;
        }
        if(game_size==10000){
            maxplayer=100;
            foodcomponents = 200;
            cost = 2.0;
        }

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
            console.log('token', mint_of_token, 'mint decimals', decimals);
          } else {
            throw new Error("Mint information could not be retrieved or is invalid.");
        }
               
        const supersize_wallet = new PublicKey("DdGB1EpmshJvCq48W1LvB1csrDnC4uataLnQbUVhp6XB");
        const supersizeAssociatedTokenAccount = await getAssociatedTokenAddress(mint_of_token, supersize_wallet);

        const soltransfertx = SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey: playerKey,
            lamports: cost * LAMPORTS_PER_SOL, 
        });
        const sendsoltx = new Transaction().add(soltransfertx);
        const sendsolsig = await submitTransactionUser(sendsoltx);
        console.log(`Load wallet with SOL: ${sendsolsig}`);

        const createTokenAccountsTx = new Transaction();
        const accountInfoCreator = await connection.getAccountInfo(owner_token_account);
        if (accountInfoCreator === null) {
            const createTokenAccountTx = createAssociatedTokenAccountInstruction(
                playerKey,
                owner_token_account,
                gameOwnerWallet,
                mint_of_token,
            );
            createTokenAccountsTx.add(createTokenAccountTx);
        } 
        const accountInfoSupersize = await connection.getAccountInfo(supersizeAssociatedTokenAccount);
        if (accountInfoSupersize === null) {
            const createSuperTokenAccountTx = createAssociatedTokenAccountInstruction(
                playerKey,
                supersizeAssociatedTokenAccount,
                supersize_wallet,
                mint_of_token,
            );
            createTokenAccountsTx.add(createSuperTokenAccountTx);
        } 
        const createwalletsig = await submitTransaction(createTokenAccountsTx, "confirmed", true); 
        console.log(
            `Created wallet: ${createwalletsig}`
        );

        const initNewWorld = await InitializeNewWorld({
            payer:  playerKey, 
            connection: connection,
          });
        const txSign = await submitTransaction(initNewWorld.transaction, "confirmed", true);  
        const worldPda = initNewWorld.worldPda;
        console.log(
            `World entity signature: ${txSign}`
        );

        const mapseed = "origin"; 
        const newmapentityPda = FindEntityPda({
            worldId: initNewWorld.worldId,
            entityId: new anchor.BN(0),
            seed: mapseed
        })
        const addMapEntityIx = await createAddEntityInstruction(
            {
                payer: playerKey,
                world: worldPda,
                entity: newmapentityPda,
            },
            { extraSeed: mapseed }
        )
        const transaction = new anchor.web3.Transaction().add(addMapEntityIx);
        const signaturemap = await submitTransaction(transaction, "confirmed", true); 
        console.log(
            `Map entity signature: ${signaturemap}`
        );

        let transactionfood = new anchor.web3.Transaction();
        const totalEntities = foodcomponents+1;
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
                    payer: playerKey,
                    world: worldPda,
                    entity: newfoodEntityPda,
                },
                { extraSeed: seed }
            );
        
            transactionfood.add(addEntityIx);
        
            if (i % batchSize === 0 || i === totalEntities) {
                const signaturefood = await submitTransaction(transactionfood, "confirmed", true); 
                console.log(`Food entity batch signature: ${signaturefood}`);
                transactionfood = new Transaction();
            }
        }

        let playercomponentstransaction = new anchor.web3.Transaction();
        const totalPlayers = maxplayer+1;
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
                    payer: playerKey,
                    world: worldPda,
                    entity: newplayerEntityPda,
                },
                { extraSeed: seed }
            );
        
            playercomponentstransaction.add(addEntityIx);
        
            if (i % playerBatchSize === 0 || i === totalPlayers) {
                const signatureplayerscomponents = await submitTransaction(playercomponentstransaction, "confirmed", true);
                console.log(`Player entity batch signature: ${signatureplayerscomponents}`);
        
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
                payer: playerKey,
                world: worldPda,
                entity: newanteentityPda,
            },
            { extraSeed: anteroomseed }
        )
        anteroomcomponenttransaction.add(addAnteEntityIx);
        const signatureanteroomcomponents = await submitTransaction(anteroomcomponenttransaction, "confirmed", true); //await submitTransactionUser(anteroomcomponenttransaction);
        console.log(
            `Anteroom entity signature: ${signatureanteroomcomponents}`
        );

        const initmapomponenttransaction = new anchor.web3.Transaction();
        const initMapIx = await InitializeComponent({
            payer: playerKey,
            entity: newmapentityPda,
            componentId: MAP_COMPONENT,
        });

        initmapomponenttransaction.add(initMapIx.transaction);
        const signature1map = await submitTransaction(initmapomponenttransaction, "confirmed", true); //await submitTransactionUser(initmapomponenttransaction);
        console.log(
            `Init map component signature: ${signature1map}`
        );

        const initbatchSize = 10;        
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
        
            const signature1food = await submitTransaction(initfoodcomponenttransaction, "confirmed", true);  //await submitTransactionUser(initfoodcomponenttransaction);
            console.log(`Init food component signature for batch: ${signature1food}`);
        }

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
        
            const signature1players = await submitTransaction(initplayerscomponenttransaction, "confirmed", true); //await submitTransactionUser(initplayerscomponenttransaction);
            console.log(`Init players component signature for batch: ${signature1players}`);
        }

        const initantecomponenttransaction = new anchor.web3.Transaction();
        const initAnteIx = await InitializeComponent({
            payer: playerKey,
            entity: newanteentityPda,
            componentId: ANTEROOM_COMPONENT,
        });
        initantecomponenttransaction.add(initAnteIx.transaction);
        const signature1ante = await submitTransaction(initantecomponenttransaction, "confirmed", true); //await submitTransactionUser(initantecomponenttransaction);
        console.log(
            `Init anteroom component signature: ${signature1ante}`
        );

        let vault_program_id = new PublicKey("BAP315i1xoAXqbJcTT1LrUS45N3tAQnNnPuNQkCcvbAr");
        let map_component_id = initMapIx.componentPda;
        console.log('map component', map_component_id)
        let [tokenAccountOwnerPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("token_account_owner_pda"), map_component_id.toBuffer()],
        vault_program_id
        );
        const tokenVault = await getAssociatedTokenAddress(mint_of_token, tokenAccountOwnerPda, true);
        setGameWallet(tokenAccountOwnerPda.toString());
        const createTokenAccountTx = createAssociatedTokenAccountInstruction(
            playerKey,
            tokenVault,
            tokenAccountOwnerPda,
            mint_of_token,
        );
        const combinedTx = new Transaction()
        .add(createTokenAccountTx); 
        const createvaultsig = await submitTransaction(combinedTx, "confirmed", true); 
        console.log(
            `Created pda + vault signature: ${createvaultsig}`
        );
        
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
                name:game_name,
                size: game_size,
                entry_fee: base_buyin,
                entry_fee_upper_bound_mul: max_multiple,
                entry_fee_lower_bound_mul: min_multiple,
                frozen: false,
            },
          });
          inittransaction.add(initGame.transaction);
          const signatureinitgame = await submitTransaction(inittransaction, "confirmed", true);  
          console.log(
              `Init func game signature: ${signatureinitgame}`
          );

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
                        top_left_x:x,
                        top_left_y: y,
                    },
                });
                initfoodtransaction.add(initFood.transaction);
                overallIndex = overallIndex + 1;
            }
        
            const signatureinitfood = await submitTransaction(initfoodtransaction, "confirmed", true); //await submitTransactionUser(initfoodtransaction);
            console.log(`Init func food signature for batch: ${signatureinitfood}`);
        }


        for (let i = 0; i < newplayerEntityPdas.length; i += initbatchSize) {
            const initplayertransaction = new anchor.web3.Transaction();        
            const playerBatch = newplayerEntityPdas.slice(i, i + initbatchSize);
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
        
            const signatureplayerdinited = await submitTransaction(initplayertransaction, "confirmed", true); //await submitTransactionUser(initplayertransaction);
            console.log(`Init func players signature for batch: ${signatureplayerdinited}`);
            }

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
                    token_decimals: 9,
                    gamemaster_wallet_string: owner_token_account.toString(), 
                },
              });
              initantetransaction.add(initAnteroom.transaction);
        const signatureanteinited = await submitTransaction(initantetransaction, "confirmed", true);  //await submitTransactionUser(initantetransaction); 
        console.log(
            `Init func anteroom signature: ${signatureanteinited}`
        );

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
        let delbatchSize = 5;
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
        
            const delsignature2 = await submitTransaction(playertx, "confirmed", true);
            console.log(`Delegation signature food for batch: ${delsignature2}`);
        }

        if (delsignature != null) {
            const newGameInfo : ActiveGame = {worldId: initNewWorld.worldId, worldPda: initNewWorld.worldPda, name: game_name, active_players: 0, max_players: maxplayer, size: game_size}
            console.log('new game info', newGameInfo.worldId,newGameInfo.worldPda.toString())
            setNewGameCreated(newGameInfo);
            const copiedActiveGameIds: ActiveGame[] = [...activeGames];
            copiedActiveGameIds.push(newGameInfo);  
            setActiveGames(copiedActiveGameIds);
            const playerbalance = await connection.getBalance(playerKey, 'processed');
            const reclaim_transaction = new Transaction();
            const solTransferInstruction = SystemProgram.transfer({
                fromPubkey: playerKey,
                toPubkey: publicKey,
                lamports: playerbalance - 5000,
            });
            reclaim_transaction.add(solTransferInstruction);
            const reclaimsig = await submitTransaction(reclaim_transaction, "confirmed", true);
            console.log(`Reclaim leftover SOL: ${reclaimsig}`);
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
                      Supersize will be playable using SPL tokens.
                      The game owner recieves a 1% fee charged on each player exit. Fees accumulate in each game’s chosen SPL token.
                    </p>
                    </div>
                    <img src={`${process.env.PUBLIC_URL}/Group7.png`} width="100vw" height="auto" alt="Image" style={{ width: "25vw",height: "25vw", marginRight:"1vw", alignSelf:"center" }}/>
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
                    </p>
                    <div style={{display: "flex", flexDirection:"column", marginLeft:"2vw", marginTop:"1vw"}}>
                    <div style={{display: "flex", flexDirection:"row", color:"white", alignItems:"center"}}><img style={{marginTop:"1vw"}} src={`${process.env.PUBLIC_URL}/Logomark_white.png`} width="30vw" height="auto" alt="Image" /> <a style={{marginTop:"20px", marginLeft:"1vw", cursor:"pointer"}} onClick={() => {window.open('https://docs.magicblock.gg/Forever%20Games', '_blank');}}> docs.magicblock.gg </a></div>
                    <div style={{display: "flex", flexDirection:"row", color:"white", alignItems:"center"}}><img style={{marginTop:"1vw"}} src={`${process.env.PUBLIC_URL}/GitBook.png`} width="30vw" height="auto" alt="Image" /> <a style={{marginTop:"10px", marginLeft:"1vw", cursor:"pointer"}} onClick={() => {window.open('https://docs.supersize.gg', '_blank');}}> docs.supersize.gg</a></div>
                    <div style={{display: "flex", flexDirection:"row", color:"white", alignItems:"center"}}><img style={{marginTop:"1vw"}} src={`${process.env.PUBLIC_URL}/github-mark-white.png`} width="30vw" height="auto" alt="Image" /> <a style={{marginTop:"10px", marginLeft:"1vw", cursor:"pointer"}} onClick={() => {window.open('https://github.com/Lewarn00/supersize-solana/', '_blank');}}> github.com/supersize-solana </a></div>
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
                        <div style={{ marginTop: "0vw", width: "60%" }}>
                          <h1 style={{ marginTop: "2vw", marginBottom: "2vw", marginLeft: "1.5vw", fontFamily: "conthrax", fontSize: "36px" }}>Launch Your Game</h1>
                          <p style={{ marginLeft: "1.5vw", fontFamily: "terminus", fontSize: "20px", width: "80%" }}>
                              Deploy and customize your own Supersize game. <br /><br />
                              <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-around',
                                    background: 'black',
                                    width: '100%',
                                    fontSize: '16px',
                                }}
                                >
                                {options.map(option => (
                                    <div
                                    key={option.id}
                                    onClick={() => handleSelection(option.id)}
                                    style={{
                                        margin: '5px',
                                        border: selected === option.id ? '1px solid #67F4B6' : '1px solid #272B30',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        textAlign: 'center',
                                        width: '150px',
                                        padding: '5px',
                                        boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px',
                                        backgroundColor: '#000000',
                                    }}
                                    >
                                    <div>Size: {option.size}</div>
                                    <div>Players: {option.players}</div>
                                    <div>Cost: {option.cost}</div>
                                    </div>
                                ))}
                                </div>
                                <br />
                            <span style={{ opacity: "0.7" }}>
                              Deploying a game generates a new Supersize world that lives forever and is owned by you. 
                              100% of tokens sent to your game wallet fund player incentives.
                            </span>
                            <br /><br />
                             <span className="free-play" style={{display:newGameCreated?'flex':'none', width: 'fit-content', padding:"10px", fontSize:"15px", marginTop:"1vh"}}>New Game ID: {newGameCreated?.worldId.toString()}, Game Wallet: {gamewallet}</span>
                          </p>
                        </div>
                        <div style={{ marginRight: "1.5vw", marginTop:"1vw" }}>
                          <CreateGame game_size={options[selected].size} userKey={publicKey !== null ? publicKey.toString() : "Connect Wallet"} initFunction={newGameTx} />
                        </div>
                      </div>
                    );
              default:
                return null;
            }
        };
        
        setPanelContent(renderPanel(buildViewerNumber));
      }, [buildViewerNumber, newGameCreated, selected]);

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