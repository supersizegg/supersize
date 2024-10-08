import React, {useCallback, useEffect, useRef, useState} from "react";
import {AnimatePresence, motion} from "framer-motion";
import Button from "./components/Button";
import FoodEntity from "./components/FoodEntity";
import PlayerEntity from "./components/PlayerEntity";
import CreateGame from "./components/CreateGame";
import SelectGame from "./components/SelectGame";
import GameComponent from "./components/GameComponent";

import {
    AddEntity,
    ApplySystem,
    createApplyInstruction,
    createInitializeComponentInstruction,
    FindComponentPda,
    FindWorldPda,
    FindEntityPda,
    createAddEntityInstruction,
    createInitializeRegistryInstruction,
    FindRegistryPda,
    InitializeNewWorld,
    InitializeComponent,
    createDelegateInstruction,
    DELEGATION_PROGRAM_ID,
    createAllowUndelegationInstruction,
    createUndelegateInstruction,
} from "@magicblock-labs/bolt-sdk";

import {WalletNotConnectedError} from '@solana/wallet-adapter-base';
import {useConnection, useWallet} from '@solana/wallet-adapter-react';
import {WalletMultiButton} from "@solana/wallet-adapter-react-ui";
import Alert from "./components/Alert";
import {AccountInfo, Commitment, PublicKey} from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import {Idl, Program, Provider, Wallet, AnchorProvider} from "@coral-xyz/anchor";
import {SimpleProvider} from "./components/Wallet";
import { Connection, clusterApiUrl, Keypair, LAMPORTS_PER_SOL, Transaction, sendAndConfirmTransaction,SystemProgram } from '@solana/web3.js';
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import BN from 'bn.js';
import * as splToken from '@solana/spl-token';

import {
    getAccount,
    getOrCreateAssociatedTokenAccount,
  } from "@solana/spl-token";
import { keypairIdentity, token, Metaplex } from "@metaplex-foundation/js";

  
//import { Map } from "../../../target/types/map";
const bs58 = require('bs58');

const WORLD_INSTANCE_ID = 4;

//new
const PLAYER_COMPONENT = new PublicKey("6Fop7M4mMiaychdgjqfbG1T9nCakkQ3qYiJdCvWqoNUk"); //anchor.workspace.Player1 as Program<Player1>;
const MOVEMENT = new PublicKey("D8FAfmH5VUExyXkR1LauJ1AegDo4oBm1hJeC1pM8moSF");
const JOIN_GAME = new PublicKey("akenBL2VuSTGPTpHfjH7dyFdz97LCEfLu1qsoHnSbJc");
const EXIT_GAME = new PublicKey("7oVQL91wR82S6tPtTftpgqnsYkeYuXxBshmauAhoLf2k");
const FOOD_COMPONENT = new PublicKey("GpcXtob64TmsL9gGCk44EBoQWS8SSej9vU1kJgFVE4se");
const MAP_COMPONENT = new PublicKey("2NtsDp7az1CxG1v6HFPWekYQkhbJC7ZVHFF5GBSGaC7K");
const INIT_GAME = new PublicKey("BYA1jUA9yTtdxoU8QECwW4vi9aojn1KQaxfQXRffEqeC");
const EAT_FOOD = new PublicKey("BMVTi61fTnQCtoGiMi1m4eXKnxGmxDoTcLL2CV3dAZDp");
const EAT_PLAYER = new PublicKey("53uMER8y9i2NYzLdJu97guJtmkZBRdL55G8NXCo3rALt");
const CHARGE = new PublicKey("CWC5hS8EAvw1SRS7hmDzkdbxYG5hpovnsUH1EKVfYtC8");

interface Food {
    x: number;
    y: number;
}
interface Blob {
    name: string;
    authority: PublicKey;
    x: number;
    y: number;
    radius: number;
    mass: number;
    score: number;
    speed: number;
    charging: number;
    target_x: number;
    target_y: number;
}


type ActiveGame = {
    worldPda: PublicKey;
    worldId: BN;
    delegated: boolean;
    name: string;
    active_players: number;
    max_players: number;
    size: number;
  };

const App: React.FC = () => {
    //let { connection } =  useConnection();
    const  connection =  new Connection("https://devnet.helius-rpc.com/?api-key=cba33294-aa96-414c-9a26-03d5563aa676"); 
    const { publicKey, sendTransaction } = useWallet(); 
    let userKey = publicKey;
    const [savedPublicKey, setSavedPublicKey] = useState<PublicKey | null>(null);
    const [exitTxn, setExitTxn] = useState<string>('');
    const endpoints = [
        "https://supersize-sin.magicblock.app",
        "https://supersize-fra.magicblock.app",
        "https://supersize.magicblock.app",
      ];
      
      // Function to ping an endpoint and return the ping time
      const pingEndpoint = async (url: string): Promise<number> => {
        const startTime = performance.now();
        try {
          await fetch(url, { method: "HEAD" });
        } catch (error) {
          console.error(`Failed to ping ${url}:`, error);
        }
        const endTime = performance.now();
        return endTime - startTime;
      };
      const [fastestEndpoint, setFastestEndpoint] = useState<string | null>(null);
      const [wsEndpoint, setWsEndpoint] = useState<string | null>(null);
      const [pings, setPings] = useState<Record<string, number>>({});
      
      useEffect(() => {
        const checkEndpoints = async () => {
          const results: Record<string, number> = {};
          
          for (const endpoint of endpoints) {
            const pingTime = await pingEndpoint(endpoint);
            results[endpoint] = pingTime;
          }
    
          // Set the endpoint with the lowest ping
          const lowestPingEndpoint = Object.keys(results).reduce((a, b) => (results[a] < results[b] ? a : b));
          setPings(results);
          setFastestEndpoint(lowestPingEndpoint);
          // Construct the wsEndpoint by replacing "https" with "wss"
          const wsUrl = lowestPingEndpoint.replace("https", "wss");
          setWsEndpoint(wsUrl);
        };
    
        checkEndpoints();
      }, []);
      
    useEffect(() => {
      if (publicKey) {
        setSavedPublicKey(publicKey); // Save publicKey to the state variable when it updates
      }
    }, [publicKey]);

    const [wallet] = useState<Keypair>(() => Keypair.generate());
    
    //const connection = new Connection(clusterApiUrl('devnet'), {
    //    commitment: 'processed',
    //  });
      
    const provider = new anchor.AnchorProvider(
        connection,
        new NodeWallet(wallet),
        {
            preflightCommitment: 'processed',
            commitment: 'processed',
        }
    );

    const providerEphemeralRollup = useRef<anchor.AnchorProvider>(new anchor.AnchorProvider(
        new anchor.web3.Connection("https://supersize.magicblock.app", {
        wsEndpoint: "wss://supersize.magicblock.app",
        }),
        new NodeWallet(wallet) 
    ));

    anchor.setProvider(provider);

    const [playerKey, setPlayerKey] = useState<PublicKey>(wallet.publicKey);
    const walletRef = useRef<Keypair>(wallet);
    const [players, setPlayers] = useState<Blob[]>([]);
    const [allplayers, setAllPlayers] = useState<Blob[]>([]);
    const [leaderboard, setLeaderboard] = useState<Blob[]>([]);
    const [food, setFood] = useState<Food[]>([]);
    const [foodListLen, setFoodListLen] = useState<number[]>([]);
    const [allFood, setAllFood] = useState<Food[][]>([]);
    const [visibleFood, setVisibleFood] = useState<Food[][]>([]);
    const [currentPlayer, setCurrentPlayer] = useState<Blob | null>(null);
    const [currentPlayerOnchain, setCurrentPlayerOnchain] = useState<Blob | null>(null);
    const [creatingGame, setCreatingGame] = useState(false);
    const [playerName, setPlayerName] = useState("unnamed");
    const [delegationDone, setDelegationDone] = useState(false);
    const [expandlist, setexpandlist] = useState(false);
    const [timeToEat, setTimeToEat] = useState(false);
    const [newGameCreated, setNewGameCreated] = useState<ActiveGame | null>(null);
    const [currentTPS, setCurrentTPS] = useState(0);
    const [price, setPrice] = useState(0);
    const [confirmedXY, setConfirmedXY] = useState<Transaction | null>(null);
    const [queueXY, setQueueXY] = useState<Food | null>(null);
    const scale = 1;
    const [screenSize, setScreenSize] = useState({width: 2000,height: 2000}); //530*3,300*3
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [transactionError, setTransactionError] = useState<string | null>(null);
    const [transactionSuccess, setTransactionSuccess] = useState<string | null>(null);
    const [activeGameIds, setActiveGameIds] = useState<PublicKey[]>([new PublicKey('4gc82J1Qg9vJh6BcUiTsP73NCCJNF66dvk4vcx9JP7Ri'),new PublicKey('uk8PU7wgRzrqhibkhwQzyfJ33BnvmAzRCbNNvfNWVVd')]); //new PublicKey('DS3511vmVxC4MQpiAQawsh8ZmRTy59KqeDRH9vqUcfvd')
    const endpointToWorldMap: Record<string, { worldId: anchor.BN; worldPda: PublicKey }> = {
        "https://supersize-sin.magicblock.app": {
          worldId: new anchor.BN(1315),
          worldPda: new PublicKey('DXkWfajEXk5Ubvg27YWNvVacsacXV9o12i6UsK8X2d27'),
        },
        "https://supersize.magicblock.app": {
          worldId: new anchor.BN(1316),
          worldPda: new PublicKey('2mwqCY4pRk6zB1HZoG4eACedHBGKGCvdhyo7PsPWpWRh'),
        },
        "https://supersize-fra.magicblock.app": {
          worldId: new anchor.BN(1317),
          worldPda: new PublicKey('DMetLgWyitfBgV5JUuBRmddxiCAB85HsPiR3RacJYxQb'),
        },
      };
    const [activeGames, setActiveGames] = useState<ActiveGame[]>([]);

    useEffect(() => {
        if (fastestEndpoint) {
          const wsUrl = fastestEndpoint.replace("https", "wss");
      
          // Update the providerEphemeralRollup ref
          providerEphemeralRollup.current = new anchor.AnchorProvider(
            new anchor.web3.Connection(fastestEndpoint, {
              wsEndpoint: wsUrl,
            }),
            new NodeWallet(wallet)
          );
      
          // Log the updated providerEphemeralRollup to ensure it's updated
          console.log('Updated providerEphemeralRollup:', providerEphemeralRollup.current);
      
          // Update the activeGames state based on the fastest endpoint
          const { worldId, worldPda } = endpointToWorldMap[fastestEndpoint];
          setActiveGames([{ worldId: worldId, worldPda: worldPda, delegated: false } as ActiveGame]);
      
          console.log(fastestEndpoint);
        }
      }, [fastestEndpoint]); 

    const [openGameInfo, setOpenGameInfo] = useState<boolean[]>(new Array(activeGames.length).fill(false));
    let entityMatch = useRef<PublicKey | null>(null);
    let playerEntities = useRef<PublicKey[]>([]);
    let foodEntities = useRef<PublicKey[]>([]);
    let currentPlayerEntity = useRef<PublicKey | null>(null);
    const [gameId, setGameId] = useState<PublicKey | null>(null);
    
    const [exitHovered, setExitHovered] = useState(false);

    const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setPlayerName(event.target.value);
    };

    let playersComponentSubscriptionId = useRef<number[] | null>([]);
    let foodComponentSubscriptionId = useRef<number[] | null>([]);
    let myplayerComponentSubscriptionId = useRef<number | null>(null);
    let mapComponentSubscriptionId= useRef<number | null>(null);

    // Use useRef for persisting values without causing re-renders
    const playersComponentClient = useRef<Program | null>(null);
    const mapComponentClient = useRef<Program | null>(null);
    const foodComponentClient = useRef<Program | null>(null); 

    const [isMouseDown, setIsMouseDown] = useState(false);
    const [isSpaceDown, setIsSpaceDown] = useState(false);
    const [chargeStart, setChargeStart] = useState(0);
    const [mousePosition, setMousePosition] = useState({x: 0,y: 0});
    const [charging, setCharging] = useState(false);
    
    const [panelContent, setPanelContent] = useState<JSX.Element | null>(null);
    const [buildViewerNumber, setbuildViewerNumber] = useState(0);
    const [isHovered, setIsHovered] = useState([false,false,false,false,false,false]);

   const [playerRank, setPlayerRank] = useState(0);
   const [gameEnded, setGameEnded] = useState(0);
   const [playerCashout, setPlayerCashout] = useState(0);

    const openDocs = useCallback(() => {
        window.open('https://docs.supersize.app/', '_blank');
    }, []); 
    const openX = useCallback(() => {
        window.open('https://x.com/SUPERSIZEgg', '_blank');
    }, []); 
    const runCreatingGame = useCallback(() => {
        setCreatingGame(true);
    }, []);


    const getComponentsClientBasic = useCallback(async (component: PublicKey): Promise<Program> => {
        //console.log("Fetching IDL for component:", component.toString());
        //console.log("Provider status:", provider.current);
        
        const idl = await Program.fetchIdl(component);
        //console.log("Fetched IDL:", idl);

        if (!idl) throw new Error('IDL not found');

        return new Program(idl, provider);
    }, [provider]);

    const getComponentsClient = useCallback(async (component: PublicKey): Promise<Program> => {
        //console.log("Fetching IDL for component:", component.toString());
        //console.log("Provider status:", provider.current);
        
        const idl = await Program.fetchIdl(component);
        //console.log("Fetched IDL:", idl);
        if (!idl) throw new Error('IDL not found');

        return new Program(idl, providerEphemeralRollup.current);
    }, [providerEphemeralRollup.current]);

    const updateFoodList = useCallback((section: any, food_index: number) => {
        const foodArray = section.food as any[];  
        const visibleFood: Food[] = [];
        const foodData: Food[] = [];
        //console.log('foodarray', foodArray);
        foodArray.forEach((foodItem) => {
            // Always add raw coordinates to the food array
            foodData.push({ x: foodItem.x, y: foodItem.y });
        
            if (currentPlayer) {
                const halfWidth = screenSize.width / 2;
                const halfHeight = screenSize.height / 2;
                const diffX = (foodItem.x - currentPlayer.x);
                const diffY = (foodItem.y - currentPlayer.y);
                if (Math.abs(diffX) <= halfWidth && Math.abs(diffY) <= halfHeight) {
                    // Food is visible, adjust position and log the adjusted food item
                    //console.log(foodItem, '1');
                    visibleFood.push({
                        x: diffX + screenSize.width / 2,
                        y: diffY + screenSize.height / 2
                    } as Food);
                }
            }
        });
        if(foodData.length>0){
            //overwrite newfood[section index]
            //flatten for ui
            setFood(foodData);
            //console.log(food_index, foodData.length) 
            setAllFood((prevAllFood) => {
                return prevAllFood.map((foodArray, index) =>
                food_index === index ? foodData : foodArray
                );
            });
            setFoodListLen((prevFoodListLen) => {
                // Create a copy of the current state
                const updatedFoodListLen = [...prevFoodListLen];
              
                // Update the element at the specific index
                updatedFoodListLen[food_index] = foodData.length;
              
                // Return the updated array
                return updatedFoodListLen;
              });
        }
         
        //setVisibleFood(visibleFood);
        //console.log(`food length: ${foodData.length}, visible food length: ${visibleFood.length}`);
    }, [setFood, setAllFood, screenSize, currentPlayer]);

    const updateLeaderboard = useCallback((players: any[]) => {
        const top10Players = players
        .sort((a, b) => b.score - a.score) 
        .slice(0, 10)
        .map(player => ({ 
            name: player.name,
            authority: player.authority,
            x: player.x,
            y: player.y,
            radius: 4 + Math.sqrt(player.mass) * 6,
            mass: player.mass,
            score: player.score,
            speed: player.speed,
            charging: player.charging,
            target_x: player.target_x,
            target_y: player.target_y,
        }));
        setLeaderboard(top10Players);

        if (currentPlayer){
            const sortedPlayers = players
            .sort((a, b) => b.score - a.score);
            // Find the index of the current player in the sorted array
            const currentPlayerRank = sortedPlayers.findIndex(
                player => player.authority.equals(currentPlayer.authority)
            ); // Add 1 to make the rank 1-based instead of 0-based
            setPlayerRank(currentPlayerRank);
        }
    }, [setLeaderboard, playerKey]);

    useEffect(() => {
        let status: string = '<span class="title">Leaderboard</span>';
        for (let i = 0; i < leaderboard.length; i++) {
          status += '<br />';
          const currentItem = leaderboard[i];
          if(currentPlayer && currentItem && currentItem.authority && currentPlayer.authority){
            if (currentItem.authority.equals(currentPlayer.authority)) {
                status += '<span class="me">' + (i + 1) + '. ' + currentItem.name + "</span>";
            } else {
                status += (i + 1) + '. ' + currentItem.name;
            }
          }else {
            status += (i + 1) + '. ' + currentItem.name;
          }
        }
        // The following code assumes you are still manipulating the DOM directly
        const statusElement = document.getElementById('status');
        if (statusElement) {
          statusElement.innerHTML = status;
        }
      }, [setLeaderboard,leaderboard]); 

    const updateMyPlayer = useCallback((player: any) => {
        if (!player) {
            setCurrentPlayer(null);
            setCurrentPlayerOnchain(null);
            setPlayers([]);
            setFood([]);
            setAllFood([]);
            setFoodListLen([]);
            console.error("Player eaten, not in game.");
            return;
        }
        //console.log(player.x, player.y)
        if(!currentPlayer){
        if(player.chargeStart){
            //console.log(player.chargeStart, Date.now()-player.chargeStart);
            setCurrentPlayer({  
                name: player.name,
                authority: player.authority,
                x: player.x,
                y: player.y,
                radius: 4 + Math.sqrt(player.mass) * 6,
                mass: player.mass,
                score: player.score,
                speed: player.speed,
                charging: player.chargeStart,
                target_x: player.target_x,
                target_y: player.target_y,
                } as Blob);
                setCurrentPlayerOnchain({  
                    name: player.name,
                    authority: player.authority,
                    x: player.x,
                    y: player.y,
                    radius: 4 + Math.sqrt(player.mass) * 6,
                    mass: player.mass,
                    score: player.score,
                    speed: player.speed,
                    charging: player.chargeStart,
                    target_x: player.target_x,
                    target_y: player.target_y,
                    } as Blob);
        }else{
            setCurrentPlayer({ 
                name: player.name, 
                authority: player.authority,
                x: player.x,
                y: player.y,
                radius: 4 + Math.sqrt(player.mass) * 6,
                mass: player.mass,
                score: player.score,
                speed: player.speed,
                charging: 0,
                target_x: player.target_x,
                target_y: player.target_y,
                } as Blob);
                setCurrentPlayerOnchain({  
                    name: player.name,
                    authority: player.authority,
                    x: player.x,
                    y: player.y,
                    radius: 4 + Math.sqrt(player.mass) * 6,
                    mass: player.mass,
                    score: player.score,
                    speed: player.speed,
                    charging: 0,
                    target_x: player.target_x,
                    target_y: player.target_y,
                    } as Blob);
        }
        }else{
            setCurrentPlayer({  
                name: player.name,
                authority: player.authority,
                x: player.x,
                y: player.y,
                radius: 4 + Math.sqrt(player.mass) * 6,
                mass: player.mass,
                score: player.score,
                speed: player.speed,
                charging: 0,
                target_x: player.target_x,
                target_y: player.target_y,
                } as Blob);
            setCurrentPlayerOnchain({  
                name: player.name,
                authority: player.authority,
                x: player.x,
                y: player.y,
                radius: 4 + Math.sqrt(player.mass) * 6,
                mass: player.mass,
                score: player.score,
                speed: player.speed,
                charging: 0,
                target_x: player.target_x,
                target_y: player.target_y,
                } as Blob);
        }
    }, [setCurrentPlayer,  setCurrentPlayerOnchain, playerKey, food]);

    useEffect(() => {
        if(currentPlayer){
        updateLeaderboard(allplayers);
        const newVisiblePlayers: Blob[] = allplayers.reduce((accumulator: Blob[], playerx) => {
            if (currentPlayer && playerx.authority && currentPlayer.authority){
                if(currentPlayer.authority.toString() != playerx.authority.toString()) {
                const halfWidth = screenSize.width / 2;
                const halfHeight = screenSize.height / 2;
                const diffX = (playerx.x - currentPlayer.x);
                const diffY = (playerx.y - currentPlayer.y);
    
                if (Math.abs(diffX) <= halfWidth && Math.abs(diffY) <= halfHeight) {
                    accumulator.push({
                        name: playerx.name,
                        authority: playerx.authority,
                        x: diffX + screenSize.width / 2,
                        y: diffY + screenSize.height / 2,
                        radius: 4 + Math.sqrt(playerx.mass) * 6,
                        mass: playerx.mass,
                        score: playerx.score,
                        speed: playerx.speed,
                        charging: playerx.charging,
                        target_x: playerx.target_x,
                        target_y: playerx.target_y,
                    });
                }
            }
            }
            return accumulator;
        }, []);
        setPlayers(newVisiblePlayers);
        }
      }, [currentPlayer, allplayers]);


    const updateMap = useCallback((map: any) => {
        const playerArray = map.players as any[];
        const playerEntityIds = playerArray.map((player, index) => {
            const seed = player.toString().substring(0, 7);
            const newPlayerEntityPda = FindEntityPda({
                worldId: activeGames[0].worldId,
                entityId: new anchor.BN(0),
                seed: seed,
            });
            return newPlayerEntityPda;
        });

        if(playerArray.length > 0){
            // filter allplayers for those not in playerArray
            setAllPlayers((prevPlayers) => {
            // Step 1: Filter out players from prevPlayers that are not in playerArray
            const filteredPlayers = prevPlayers.filter(prevPlayer =>
                playerArray.some(player => prevPlayer?.authority && player.toString() == prevPlayer.authority.toString())
            );
            return filteredPlayers; 
             });

             /*
             playerEntities.current.forEach((entityId, index) => {
                // Check if entityId exists in playerEntities.current
                //const exists = playerEntityIds.includes(entityId);
                const playerIndex = playerEntityIds.findIndex(p => p.equals(entityId));
                
                if (playerIndex == -1) {
                    // add listener 
                    const playersComponenti = FindComponentPda({
                        componentId: PLAYER_COMPONENT,
                        entity: entityId,
                    }); 
                    if (playersComponentSubscriptionId && playersComponentSubscriptionId.current) providerEphemeralRollup.connection.removeAccountChangeListener(playersComponentSubscriptionId.current[playerIndex]);
                } 
              });
              playerEntityIds.forEach((entityId) => {
                // Check if entityId exists in playerEntities.current
                //const exists = playerEntities.current.includes(entityId);
                const playerIndex = playerEntities.current.findIndex(p => p.equals(entityId));
                if (playerIndex == -1) {
                    // add listener 
                    const playersComponenti = FindComponentPda({
                        componentId: PLAYER_COMPONENT,
                        entity: entityId,
                    }); 
                    if (playersComponentSubscriptionId.current === null) {
                        playersComponentSubscriptionId.current = [providerEphemeralRollup.connection.onAccountChange(playersComponenti, handlePlayersComponentChange, 'processed')];
                    } else {
                        playersComponentSubscriptionId.current = [...playersComponentSubscriptionId.current,providerEphemeralRollup.connection.onAccountChange(playersComponenti, handlePlayersComponentChange, 'processed')];
                    }
                } 
              });*/
              
            playerEntities.current = playerEntityIds;
            //console.log(playerEntities.current, playersComponentSubscriptionId.current, foodComponentSubscriptionId.current)
        }else{
            playerEntities.current = playerEntityIds;
            
        }
    }, [setPlayers, setCurrentPlayer, setCurrentPlayerOnchain, playerKey, food]);

    const updatePlayers = useCallback((player: any) => {
        if (currentPlayer && player && player.authority && currentPlayer.authority) {
                setAllPlayers((prevPlayers) => {
                    const playerIndex = prevPlayers.findIndex(p => p.authority.equals(player.authority));
                    //console.log('name', player.name)
                    const newPlayer: Blob = {
                        name: player.name,
                        authority: player.authority,
                        x: player.x,
                        y: player.y,
                        radius: 4 + Math.sqrt(player.mass) * 6,
                        mass: player.mass,
                        score: player.score,
                        speed: player.speed,
                        charging: 0,
                        target_x: player.target_x,
                        target_y: player.target_y,
                    }; 
                    if(player.chargeStart){
                        newPlayer.charging = player.chargeStart;
                    }
                    if (playerIndex !== -1) {
                        // Replace the existing player
                        const updatedPlayers = [...prevPlayers];
                        updatedPlayers[playerIndex] = newPlayer
                        return updatedPlayers;
                    } else {
                        // Add the new player
                        return [...prevPlayers, newPlayer];
                    }
                });
            
        }
    }, [setAllPlayers, screenSize, currentPlayer]);
    
    // Define callbacks function to handle account changes
    const handlePlayersComponentChange = useCallback((accountInfo: AccountInfo<Buffer>) => {
        const parsedData = playersComponentClient.current?.coder.accounts.decode("player1", accountInfo.data);
        updatePlayers(parsedData);
    }, [updatePlayers]);

    const handleFoodComponentChange = useCallback((accountInfo: AccountInfo<Buffer>, index: number) => {
        const parsedData = foodComponentClient.current?.coder.accounts.decode("section", accountInfo.data);
        updateFoodList(parsedData, index);
    }, [updateFoodList]);

    const handleMyPlayerComponentChange = useCallback((accountInfo: AccountInfo<Buffer>) => {
        const parsedData = playersComponentClient.current?.coder.accounts.decode("player1", accountInfo.data);
        updateMyPlayer(parsedData);
    }, [updateMyPlayer]);


    const handleMapComponentChange = useCallback((accountInfo: AccountInfo<Buffer>) => {
        const parsedData = mapComponentClient.current?.coder.accounts.decode("maplite", accountInfo.data);
        updateMap(parsedData);
    }, [updateMap]);


    // Subscribe to the game state
    const subscribeToGame = useCallback(async (): Promise<void> => {
        if (!entityMatch.current) return;
        if (!currentPlayerEntity.current) return;

        //console.log("Subscribing to game", entityMatch.current);

        playersComponentClient.current = await getComponentsClient(PLAYER_COMPONENT);
        foodComponentClient.current = await getComponentsClient(FOOD_COMPONENT);
        mapComponentClient.current = await getComponentsClient(MAP_COMPONENT);

        if (mapComponentSubscriptionId && mapComponentSubscriptionId.current) await  providerEphemeralRollup.current.connection.removeAccountChangeListener(mapComponentSubscriptionId.current);
        if (myplayerComponentSubscriptionId && myplayerComponentSubscriptionId.current) await  providerEphemeralRollup.current.connection.removeAccountChangeListener(myplayerComponentSubscriptionId.current);
        for (let i = 0; i < foodEntities.current.length; i++) {
            if (foodComponentSubscriptionId && foodComponentSubscriptionId.current) await  providerEphemeralRollup.current.connection.removeAccountChangeListener(foodComponentSubscriptionId.current[i]);
        }
        for (let i = 0; i < playerEntities.current.length; i++) {
            if (playersComponentSubscriptionId && playersComponentSubscriptionId.current) await  providerEphemeralRollup.current.connection.removeAccountChangeListener(playersComponentSubscriptionId.current[i]);
        }


        for (let i = 0; i < foodEntities.current.length; i++) {
            const foodComponenti = FindComponentPda({
                componentId: FOOD_COMPONENT,
                entity: foodEntities.current[i],
            });
            if (foodComponentSubscriptionId.current === null) {
                foodComponentSubscriptionId.current = [providerEphemeralRollup.current.connection.onAccountChange(foodComponenti, (accountInfo) => handleFoodComponentChange(accountInfo, i), 'processed')];
            } else {
                foodComponentSubscriptionId.current = [...foodComponentSubscriptionId.current, providerEphemeralRollup.current.connection.onAccountChange(foodComponenti, (accountInfo) => handleFoodComponentChange(accountInfo, i), 'processed')];
            }
            }   

        for (let i = 0; i < playerEntities.current.length; i++) {
        const playersComponenti = FindComponentPda({
            componentId: PLAYER_COMPONENT,
            entity: playerEntities.current[i],
        });
        console.log( i, playerEntities.current[i]);
        console.log('player component', playersComponenti);
        if (playersComponentSubscriptionId.current === null) {
            playersComponentSubscriptionId.current = [providerEphemeralRollup.current.connection.onAccountChange(playersComponenti, handlePlayersComponentChange, 'processed')];
        } else {
            playersComponentSubscriptionId.current = [...playersComponentSubscriptionId.current,providerEphemeralRollup.current.connection.onAccountChange(playersComponenti, handlePlayersComponentChange, 'processed')];
        }
        }     
        
        const myplayerComponent = FindComponentPda({
            componentId: PLAYER_COMPONENT,
            entity: currentPlayerEntity.current,
        });
        
        myplayerComponentSubscriptionId.current = providerEphemeralRollup.current.connection.onAccountChange(myplayerComponent, handleMyPlayerComponentChange, 'processed');
         (playersComponentClient.current?.account as any).player1.fetch(myplayerComponent, "processed").then(updateMyPlayer).catch((error: any) => {
            console.error("Failed to fetch account:", error);
         });
        for (let i = 0; i < foodEntities.current.length; i++) {
            const foodComponenti = FindComponentPda({
                componentId: FOOD_COMPONENT,
                entity: foodEntities.current[i],
            });
           /* (foodComponentClient.current?.account as any).section.fetch(foodComponenti, "processed").then(updateFoodList).catch((error: any) => {
                console.error("Failed to fetch account:", error);
             });*/
             (foodComponentClient.current?.account as any).section
             .fetch(foodComponenti, "processed")
             .then((fetchedData: any) => updateFoodList(fetchedData, i))
             .catch((error: any) => {
               console.error("Failed to fetch account:", error);
             });
        }

        for (let i = 0; i < playerEntities.current.length; i++) {
            const playersComponenti = FindComponentPda({
                componentId: PLAYER_COMPONENT,
                entity: playerEntities.current[i],
            });
            console.log( i, playerEntities.current[i]);
            console.log('player component', playersComponenti);
            (playersComponentClient.current?.account as any).player1.fetch(playersComponenti, "processed").then(updatePlayers).catch((error: any) => {
                console.error("Failed to fetch account:", error);
             });
        }    
        
        // Subscribe to grid changes
        const mapComponent = FindComponentPda({
            componentId: MAP_COMPONENT,
            entity: entityMatch.current,
        });
        mapComponentSubscriptionId.current = providerEphemeralRollup.current.connection.onAccountChange(mapComponent, handleMapComponentChange, 'processed');
        (mapComponentClient.current?.account as any).maplite.fetch(mapComponent, "processed").then(updateMap).catch((error: any) => {
            console.error("Failed to fetch account:", error);
         });
    }, [connection, handlePlayersComponentChange, handleMyPlayerComponentChange,handleFoodComponentChange, handleMapComponentChange, updatePlayers, updateFoodList, updateMap, updateMyPlayer]);

    const handleGameIdChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = event.target.value;
        try {
            //gameId.current = new PublicKey(newValue);
            setGameId(new PublicKey(newValue));
        } catch {
        }
    };

    const submitTransactionER = useCallback(async (transaction: Transaction, commitmetLevel: Commitment, skipPre: boolean): Promise<string | null> => {
        if (isSubmitting) return null;
        setIsSubmitting(true);
        setTransactionError(null);
        setTransactionSuccess(null);
        try {
            if (!walletRef.current) {
                throw new Error('Wallet is not initialized');
            }

            const signature = await providerEphemeralRollup.current.sendAndConfirm(transaction, [], { commitment: commitmetLevel }); 

            // Transaction was successful
            //console.log(`Transaction confirmed: ${signature}`);
            //setTransactionSuccess(`Transaction confirmed`);
            return signature;
        } catch (error) {
           // setTransactionError(`Transaction failed: ${error}`);
        } finally {
            setIsSubmitting(false);
        }
        return null;
    }, [connection, isSubmitting, sendTransaction]);

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

            // Transaction was successful
            //console.log(`Transaction confirmed: ${signature}`);
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
            //const signature = await sendTransaction(transaction, connection, { minContextSlot});
            await provider.connection.confirmTransaction({ blockhash, lastValidBlockHeight, signature }, commitmetLevel);

            // Transaction was successful
           // console.log(`Transaction confirmed: ${signature}`);
            setTransactionSuccess(`Transaction confirmed`);
            return signature; 
        } catch (error) {
            setTransactionError(`Transaction failed: ${error}`);
        } finally {
            setIsSubmitting(false);
        }
        return null;
    }, [connection, isSubmitting, sendTransaction]);

    /**
     * Create a new game transaction
     */
    const newGameTx = useCallback(async (width: number, height: number, entry_fee: number, max_players: number, emit_type: number, emit_data: number, frozen: boolean, game_name: string) => {
        if (!publicKey) throw new WalletNotConnectedError();
        //const mintAuthority = pg.wallet.keypair;
        /*
        const decimals = 9;
        
        let [tokenAccountOwnerPda] = PublicKey.findProgramAddressSync(
          [Buffer.from("token_account_owner_pda")],
          PLAYER_COMPONENT
        );
        
        const metaplex = new Metaplex(connection).use(
          keypairIdentity(wallet)
        );
        
        const createdSFT = await metaplex.nfts().createSft({
          uri: "https://shdw-drive.genesysgo.net/AzjHvXgqUJortnr5fXDG2aPkp2PfFMvu4Egr57fdiite/PirateCoinMeta",
          name: "Gold",
          symbol: "GOLD",
          sellerFeeBasisPoints: 100,
          updateAuthority: wallet,
          mintAuthority: wallet,
          decimals: decimals,
          tokenStandard: 2,
          isMutable: true,
        });
        
        console.log(
          "Creating semi fungible spl token with address: " + createdSFT.sft.address
        );
        
        const mintDecimals = Math.pow(10, decimals);

        let mintResult = await metaplex.nfts().mint({
          nftOrSft: createdSFT.sft,
          authority: wallet,
          toOwner: wallet.publicKey,
          amount: token(100 * mintDecimals),
        });
        
        console.log("Mint to result: " + mintResult.response.signature);

        const tokenAccount = await getOrCreateAssociatedTokenAccount(
            connection,
            wallet,
            createdSFT.mintAddress,
            wallet.publicKey
          );
          console.log("tokenAccount: " + tokenAccount.address);
          console.log("TokenAccountOwnerPda: " + tokenAccountOwnerPda);
          
          let tokenAccountInfo = await getAccount(connection, tokenAccount.address);
          console.log(
            "Owned token amount: " + tokenAccountInfo.amount / BigInt(mintDecimals)
          );
          let [tokenVault] = PublicKey.findProgramAddressSync(
            [Buffer.from("token_vault"), createdSFT.mintAddress.toBuffer()],
            PLAYER_COMPONENT
          );
          console.log("VaultAccount: " + tokenVault);
          
          let confirmOptions = {
            skipPreflight: true,
          };
          
          let txHash = await program.methods
            .initialize()
            .accounts({
              tokenAccountOwnerPda: tokenAccountOwnerPda,
              vaultTokenAccount: tokenVault,
              senderTokenAccount: tokenAccount.address,
              mintOfTokenBeingSent: createdSFT.mintAddress,
              signer: wallet.publicKey,
            })
            .rpc(confirmOptions);
          
          console.log(`Initialize`);
          await logTransaction(txHash);
          
          console.log(`Vault initialized.`);
          tokenAccountInfo = await getAccount(connection, tokenAccount.address);
          console.log(
            "Owned token amount: " + tokenAccountInfo.amount / BigInt(mintDecimals)
          );
          tokenAccountInfo = await getAccount(connection, tokenVault);
          console.log(
            "Vault token amount: " + tokenAccountInfo.amount / BigInt(mintDecimals)
          );
          
          async function logTransaction(txHash) {
            const { blockhash, lastValidBlockHeight } =
              await connection.getLatestBlockhash();
          
            await connection.confirmTransaction({
              blockhash,
              lastValidBlockHeight,
              signature: txHash,
            });
          
            console.log(
              `Solana Explorer: https://explorer.solana.com/tx/${txHash}?cluster=devnet`
            );
          }

          txHash = await program.methods
          .transferIn(new anchor.BN(1 * mintDecimals))
          .accounts({
            tokenAccountOwnerPda: tokenAccountOwnerPda,
            vaultTokenAccount: tokenVault,
            senderTokenAccount: tokenAccount.address,
            mintOfTokenBeingSent: createdSFT.mintAddress,
            signer: wallet.publicKey,
          })
          .signers([wallet])
          .rpc(confirmOptions);
        
        console.log(`Transfer one token into the vault.`);
        await logTransaction(txHash);
        
        tokenAccountInfo = await getAccount(connection, tokenAccount.address);
        console.log(
          "Owned token amount: " + tokenAccountInfo.amount / BigInt(mintDecimals)
        );
        
        tokenAccountInfo = await getAccount(connection, tokenVault);
        console.log(
          "Vault token amount: " + tokenAccountInfo.amount / BigInt(mintDecimals)
        );*/

        /*
        txHash = await pg.program.methods
        .transferOut(new anchor.BN(1 * mintDecimals))
        .accounts({
            tokenAccountOwnerPda: tokenAccountOwnerPda,
            vaultTokenAccount: tokenVault,
            senderTokenAccount: tokenAccount.address,
            mintOfTokenBeingSent: createdSFT.mintAddress,
            signer: pg.wallet.publicKey,
        })
        .signers([pg.wallet.keypair])
        .rpc(confirmOptions);

        console.log(`Transfer one token out of the vault.`);
        await logTransaction(txHash);

        tokenAccountInfo = await getAccount(pg.connection, tokenAccount.address);
        console.log(
        "Owned token amount: " + tokenAccountInfo.amount / BigInt(mintDecimals)
        );

        tokenAccountInfo = await getAccount(pg.connection, tokenVault);
        console.log(
        "Vault token amount: " + tokenAccountInfo.amount / BigInt(mintDecimals)
        );
        */

        const initNewWorld = await InitializeNewWorld({
            payer:  publicKey, //playerKey,
            connection: connection,
          });
        const txSign = await submitTransactionUser(initNewWorld.transaction); //submitTransaction(initNewWorld.transaction, "processed", false);
        const worldPda = initNewWorld.worldPda;
        // Create the entity
        /*const addEntity = await AddEntity({
            payer: publicKey,
            world: worldPda,
            connection: connection,
        });
        const transaction = addEntity.transaction;*/

        const mapseed = "origin"; // There is a current limitation on the size of the seeds, will be increased
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
        
        /*
        const seed = "11111111111111111111"; 
        const newfoodEntityPda = FindEntityPda({
            worldId: initNewWorld.worldId,
            entityId: new anchor.BN(0),
            seed: seed
        })
        const addEntityIx = await createAddEntityInstruction(
            {
                payer: publicKey,
                world: worldPda,
                entity: newfoodEntityPda,
            },
            { extraSeed: seed }
        )
        transaction.add(addEntityIx)*/
        //console.log('food id', newfoodEntityPda.toString())
        
        const newfoodEntityPdas: any[] = [];
        const newfoodComponentPdas: any[] = [];
        for (let i = 1; i < max_players / 2; i++) {
            // Convert the loop index to a padded string of 'i's
            const seed = i.toString().repeat(20);
            
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
        
            transaction.add(addEntityIx);
        }

        const initMapIx = await InitializeComponent({
            payer: publicKey,
            entity: newmapentityPda,
            componentId: MAP_COMPONENT,
        });
        
        /*const initComponent = await InitializeComponent({
            payer: publicKey,
            entity: newfoodEntityPda,
            componentId: FOOD_COMPONENT,
          });*/

          transaction.add(initMapIx.transaction);

        for (const foodPda of newfoodEntityPdas) {
            // Perform operations on each foodPda
            const initComponent = await InitializeComponent({
                payer: publicKey,
                entity: foodPda,
                componentId: FOOD_COMPONENT,
              });
            transaction.add(initComponent.transaction);
            newfoodComponentPdas.push(initComponent.componentPda);
            // You can add any additional logic you need here
        }
        const signature1 = await submitTransactionUser(transaction);
        const inittransaction = new anchor.web3.Transaction();
        console.log(
            width,
            height,
            entry_fee,
            max_players,
            emit_type,
            emit_data,
            frozen,
        )
        const initGame = await ApplySystem({
            authority: publicKey,
            entities: [
              {
                entity: newmapentityPda,
                components: [{ componentId: MAP_COMPONENT }],
              },
            ],
            systemId: INIT_GAME,
            args: {
                name:game_name,
                width: width,
                height: height,
                entry_fee: entry_fee,
                max_players: max_players,
                emit_type: emit_type,
                emit_data: emit_data,
                frozen: frozen,
            },
          });
          inittransaction.add(initGame.transaction);
          //transaction.add(initMapIx.transaction);
          //transaction.add(initComponent.transaction);

        const signature = await submitTransactionUser(inittransaction); //await submitTransaction(initGame.transaction, "processed", false);

        const mapdelegateIx = createDelegateInstruction({
        entity: newmapentityPda,
        account: initMapIx.componentPda,
        ownerProgram: MAP_COMPONENT,
        payer: playerKey,
        });
        const maptx = new anchor.web3.Transaction().add(mapdelegateIx);
        const delsignature = await submitTransaction(maptx, "finalized", true); //provider.sendAndConfirm(playertx, [], { skipPreflight: true, commitment: 'finalized' }); 
        const playertx = new anchor.web3.Transaction();

        newfoodEntityPdas.forEach((foodEntityPda, index) => {
            const fooddelegateIx = createDelegateInstruction({
                entity: foodEntityPda,
                account: newfoodComponentPdas[index],
                ownerProgram: FOOD_COMPONENT,
                payer: playerKey,
                });
                playertx.add(fooddelegateIx);
        });
        
        const delsignature2 = await submitTransaction(playertx, "finalized", true); //provider.sendAndConfirm(playertx, [], { skipPreflight: true, commitment: 'finalized' }); 
        console.log(
            `Delegation signature: ${delsignature}`
        );

        if (signature != null) {
            setCreatingGame(false);
            const newGameInfo : ActiveGame = {worldId: initNewWorld.worldId, worldPda: initNewWorld.worldPda, delegated: false, name: game_name, active_players: 0, max_players: max_players, size: width}
            console.log('new game info', newGameInfo.worldId,newGameInfo.worldPda.toString())
            setNewGameCreated(newGameInfo);
            //entityMatch.current = newmapentityPda;
            const copiedActiveGameIds: ActiveGame[] = [...activeGames];
            copiedActiveGameIds.push(newGameInfo);  
            setActiveGames(copiedActiveGameIds);
            //console.log(newmapentityPda, newmapentityPda.toString());
        }
    }, [playerKey, connection]);
    /**
     * Create a new join game transaction
     */
    const joinGameTx = useCallback(async (selectGameId: ActiveGame) => {
        if (!playerKey) throw new WalletNotConnectedError();
        //if (!entityMatch.current) throw new WalletNotConnectedError(); 
        setScreenSize({width:selectGameId.size, height:selectGameId.size});
        const gameInfo = selectGameId; 

        const mapseed = "origin"; // There is a current limitation on the size of the seeds, will be increased
        const mapEntityPda = FindEntityPda({
            worldId: gameInfo.worldId,
            entityId: new anchor.BN(0),
            seed: mapseed
        })
        
        //console.log('map settings',currentMap)
        entityMatch.current = mapEntityPda;
        const foodEntityPdas: any[] = [];
        let targetfoodid = 0;
        let lowestfood = 100;
        for (let i = 1; i < selectGameId.max_players / 2; i++) {
            // Convert the loop index to a padded string of 'i's
            const foodseed = i.toString().repeat(20);
            //console.log(foodseed)
            const foodEntityPda =  FindEntityPda({
                worldId: gameInfo.worldId,
                entityId: new anchor.BN(0),
                seed: foodseed
            })
            foodEntityPdas.push(foodEntityPda)

            const foodComponentPda = FindComponentPda({
                componentId: FOOD_COMPONENT,
                entity: foodEntityPda,
            });
            const foodComponentClient= await getComponentsClient(FOOD_COMPONENT);
            const foodacc = await providerEphemeralRollup.current.connection.getAccountInfo(
                foodComponentPda, "processed"
            );
            if(foodacc){
                
                const foodParsedData = foodComponentClient.coder.accounts.decode("section", foodacc.data);
                if (foodParsedData.food.length < lowestfood){
                    lowestfood= foodParsedData.food.length;
                    targetfoodid = i-1;
                }
            }
        }

        /*const foodseed = "11111111111111111111"; // There is a current limitation on the size of the seeds, will be increased
        const foodEntityPda =  FindEntityPda({
            worldId: gameInfo.worldId,
            entityId: new anchor.BN(0),
            seed: foodseed
        })*/
    
        //await subscribeToGame();
        if(!gameInfo.delegated){
            const mapComponentPda = FindComponentPda({
                componentId: MAP_COMPONENT,
                entity: mapEntityPda,
            });
            
            //await subscribeToGame();
            /*let seednum = 0;
            console.log(playerEntities.current.length);
            const mapComponentClient= await getComponentsClient(MAP_COMPONENT);
            const mapacc = await providerEphemeralRollup.connection.getAccountInfo(
            mapComponentPda, "processed"
            );
            if(mapacc){
            const mapParsedData = mapComponentClient.coder.accounts.decode("maplite", mapacc.data);
            console.log(mapParsedData);
             seednum = mapParsedData.players.length;
            }*/
            
            const playerseed = playerKey.toString().substring(0, 7); //'player-' +  seednum.toString(); // There is a current limitation on the size of the seeds, will be increased
            //console.log(playerseed)
            const newplayerEntityPda =  FindEntityPda({
                worldId: gameInfo.worldId,
                entityId: new anchor.BN(0),
                seed: playerseed
            })
            const addEntityIx = await createAddEntityInstruction(
                {
                    payer: playerKey,
                    world: gameInfo.worldPda,
                    entity: newplayerEntityPda,
                },
                { extraSeed: playerseed }
            )
    
            const tx = new anchor.web3.Transaction().add(addEntityIx);
            //const txSign = await provider.sendAndConfirm(tx);
            const initComponent = await InitializeComponent({
                payer: playerKey,
                entity: newplayerEntityPda,
                componentId: PLAYER_COMPONENT,
              });
             // const txSign = await provider.sendAndConfirm(initComponent.transaction);
              tx.add(initComponent.transaction);
              //const txSign = await submitTransaction(tx, "confirmed", true); //await provider.sendAndConfirm(tx);
                //playerEntityPda = newplayerEntityPda;
                //console.log(
                //    ` new player signature: ${txSign}`
                //);

                const playerComponentPda = FindComponentPda({
                    componentId: PLAYER_COMPONENT,
                    entity: newplayerEntityPda,
                });
                //console.log('player', playerComponentPda.toString())
                const playerdelegateIx = createDelegateInstruction({
                entity: newplayerEntityPda,
                account: playerComponentPda,
                ownerProgram: PLAYER_COMPONENT,
                payer: playerKey,
                });
                //const playertx = new anchor.web3.Transaction().add(playerdelegateIx);
                tx.add(playerdelegateIx)
                const playerdelsignature = await submitTransaction(tx, "confirmed", true); //provider.sendAndConfirm(playertx, [], { skipPreflight: true, commitment: 'finalized' }); 
                console.log(
                    `Delegation signature: ${playerdelsignature}`
                );

            //console.log('join game', gameInfo.worldId.toString(), newplayerEntityPda.toString(), foodEntityPdas[targetfoodid].toString(),mapEntityPda.toString())
            const applySystem = await ApplySystem({
                authority: playerKey,
                entities: [
                  {
                    entity: newplayerEntityPda,
                    components: [{ componentId:PLAYER_COMPONENT}],
                  },
                  {
                    entity: foodEntityPdas[targetfoodid],
                    components: [{ componentId:FOOD_COMPONENT}],
                  },
                  {
                    entity: mapEntityPda,
                    components: [{ componentId:MAP_COMPONENT }],
                  },
                ],
                systemId: JOIN_GAME,
                args: {
                    name: playerName,
                }, 
              });
            const transaction = applySystem.transaction;
            const {
                context: { slot: minContextSlot },
                value: { blockhash, lastValidBlockHeight }
            } = await providerEphemeralRollup.current.connection.getLatestBlockhashAndContext();

            if (!walletRef.current) {
                throw new Error('Wallet is not initialized');
            } 
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = walletRef.current.publicKey;
            transaction.sign(walletRef.current);
            const signature = await providerEphemeralRollup.current.connection.sendRawTransaction(
                transaction.serialize(), 
                { skipPreflight: true } // We don't want to do preflight in most cases
            );
            //const signature = await providerEphemeralRollup.sendAndConfirm(applySystem.transaction);   
            //console.log(signature)
            if (signature != null) {
                setGameId(mapEntityPda);
                setDelegationDone(true);
                setActiveGames(prevActiveGames => {
                    const updatedGames = prevActiveGames.map(game =>
                        game.worldId === gameInfo.worldId && game.worldPda.toString() === gameInfo.worldPda.toString()
                            ? { ...game, delegated: true }
                            : game
                    );
                    return updatedGames;
                });
                entityMatch.current = mapEntityPda;
                currentPlayerEntity.current = newplayerEntityPda;
                foodEntities.current = foodEntityPdas;
                setAllFood(new Array(foodEntityPdas.length).fill([]));
                setFoodListLen(new Array(foodEntityPdas.length).fill(0));
                await subscribeToGame();
            }
        }else{
            const playerseed = playerKey.toString().substring(0, 7);
            //console.log(playerseed)
            const newplayerEntityPda =  FindEntityPda({
                worldId: gameInfo.worldId,
                entityId: new anchor.BN(0),
                seed: playerseed
            })
           const applySystem = await ApplySystem({
                authority: playerKey,
                entities: [
                  {
                    entity: newplayerEntityPda,
                    components: [{ componentId:PLAYER_COMPONENT}],
                  },
                  {
                    entity: foodEntityPdas[targetfoodid],
                    components: [{ componentId:FOOD_COMPONENT}],
                  },
                  {
                    entity: mapEntityPda,
                    components: [{ componentId:MAP_COMPONENT }],
                  },
                ],
                systemId: JOIN_GAME,
                args: {
                    name: playerName,
                }, 
              });
              const transaction = applySystem.transaction;
              const {
                  context: { slot: minContextSlot },
                  value: { blockhash, lastValidBlockHeight }
              } = await providerEphemeralRollup.current.connection.getLatestBlockhashAndContext();
  
              if (!walletRef.current) {
                  throw new Error('Wallet is not initialized');
              } 
              transaction.recentBlockhash = blockhash;
              transaction.feePayer = walletRef.current.publicKey;
              transaction.sign(walletRef.current);
              const signature = await providerEphemeralRollup.current.connection.sendRawTransaction(
                  transaction.serialize(), 
                  { skipPreflight: true } // We don't want to do preflight in most cases
              );
            //const signature = await submitTransactionER(transaction, "processed", false); //providerEphemeralRollup.sendAndConfirm(applySystem.transaction); 
            if (signature != null) {
                await subscribeToGame();
                currentPlayerEntity.current = newplayerEntityPda;
                foodEntities.current = foodEntityPdas;
                setAllFood(new Array(foodEntityPdas.length).fill([]));
                setFoodListLen(new Array(foodEntityPdas.length).fill(0));
                setGameId(mapEntityPda);
                entityMatch.current = mapEntityPda;
            }
        }
    }, [playerKey, submitTransaction, subscribeToGame]);

    const exitGameTx = useCallback(async () => {
        if (!playerKey) throw new WalletNotConnectedError();
        if (gameId == null) setTransactionError("Not connected to game");
        let cashoutValue = 0;
        if(currentPlayer){
            setPlayerCashout(Math.ceil(currentPlayer.score));
            cashoutValue = Math.ceil(currentPlayer.score);
        }
        const player_entity = currentPlayerEntity.current as PublicKey;
        const map_entity = entityMatch.current as PublicKey;
        const applySystem = await ApplySystem({
            authority: playerKey,
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
        });
        const transaction = applySystem.transaction;
        const {
            context: { slot: minContextSlot },
            value: { blockhash, lastValidBlockHeight }
        } = await providerEphemeralRollup.current.connection.getLatestBlockhashAndContext();

        if (!walletRef.current) {
            throw new Error('Wallet is not initialized');
        } 
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = walletRef.current.publicKey;
        transaction.sign(walletRef.current);
        console.log('exiting')
        currentPlayerEntity.current = null;
        entityMatch.current = null;
        setGameId(null);
        setGameEnded(2);
        if(savedPublicKey){
            transferToken(savedPublicKey, Math.ceil(cashoutValue))
            .then((txn) => {
              setGameEnded(3);
            })
            .catch((error) => {
              setGameEnded(4);
            });
        }else{
            setGameEnded(4);
        }
        const signature = await providerEphemeralRollup.current.connection.sendRawTransaction(
            transaction.serialize(), 
            { skipPreflight: true } // We don't want to do preflight in most cases
        );
        //const signature = await submitTransactionER(transaction, "processed", false);  //providerEphemeralRollup.sendAndConfirm(transaction); 
        //console.log(signature)
        if (signature != null) {
            playersComponentSubscriptionId.current = [];
            entityMatch.current = null;
            setGameId(null);
        }

    }, [playerKey, submitTransaction, subscribeToGame]);

    useEffect(() => {
        const cleanUp = async () => {
            if (currentPlayer) {
                if (
                    currentPlayer.authority == null &&
                    currentPlayer.score === 0 &&
                    currentPlayer.mass === 0 &&
                    currentPlayer.x === 50000 &&
                    currentPlayer.y === 50000
                ) {
                    currentPlayerEntity.current = null;
                    entityMatch.current = null;
                    setGameId(null);
                    if(gameEnded==0){
                        setGameEnded(1);
                    }
                    setPlayers([]);
                    setFood([]);
                    setAllFood([]);
                    setFoodListLen([]);

                    if (mapComponentSubscriptionId?.current) {
                        await providerEphemeralRollup.current.connection.removeAccountChangeListener(mapComponentSubscriptionId.current);
                    }
                    if (myplayerComponentSubscriptionId?.current) {
                        await providerEphemeralRollup.current.connection.removeAccountChangeListener(myplayerComponentSubscriptionId.current);
                    }
                    if (foodComponentSubscriptionId?.current) {
                        for (let i = 0; i < foodEntities.current.length; i++) {
                            await providerEphemeralRollup.current.connection.removeAccountChangeListener(foodComponentSubscriptionId.current[i]);
                        }
                    }
                    if (playersComponentSubscriptionId?.current) {
                        for (let i = 0; i < playerEntities.current.length; i++) {
                            await providerEphemeralRollup.current.connection.removeAccountChangeListener(playersComponentSubscriptionId.current[i]);
                        }
                    }
                }
            }
        };
        if(currentPlayer){
        /*if(currentPlayer.authority == null && currentPlayer.score == 0 && currentPlayer.mass == 0 && currentPlayer.x == 50000 && currentPlayer.y == 50000){
            currentPlayerEntity.current = null;
            entityMatch.current = null;
            setGameId(null);
        }*/
        /*const visibleFood = allFood[0].reduce<Food[]>((accumulator, foodItem) => {
            const diffX = foodItem.x - currentPlayer.x;
            const diffY = foodItem.y - currentPlayer.y;
            if (Math.abs(diffX) <= screenSize.width/2 && Math.abs(diffY) <= screenSize.height/2) {
              // Food is visible, adjust position
              accumulator.push({
                x: foodItem.x - currentPlayer.x + screenSize.width/2,
                y: foodItem.y - currentPlayer.y + screenSize.height/2
              });
            } 
            return accumulator;
        }, []);
        setVisibleFood(visibleFood);*/
        const visibleFood = allFood.map((foodList) => {
            return foodList.reduce<Food[]>((innerAcc, foodItem) => {
                const diffX = foodItem.x - currentPlayer.x;
                const diffY = foodItem.y - currentPlayer.y;
                if (Math.abs(diffX) <= screenSize.width / 2 && Math.abs(diffY) <= screenSize.height / 2) {
                    // Food is visible, adjust position
                    innerAcc.push({
                        x: foodItem.x - currentPlayer.x + screenSize.width / 2,
                        y: foodItem.y - currentPlayer.y + screenSize.height / 2
                    });
                }
                return innerAcc;
            }, []);
        });        
        setVisibleFood(visibleFood);
        cleanUp();
        //console.log(`food length: ${allFood.length}, all food 0 length: ${allFood[0].length}, all food 1 length: ${allFood[1].length}`);
        }
        //console.log('current player', currentPlayer)
    }, [currentPlayer]);

    // Function to handle movement and charging
    const handleMovementAndCharging = async () => {
        const processSessionEphemTransaction = async (
            transaction: anchor.web3.Transaction
        ): Promise<string> => {
            const signature = await providerEphemeralRollup.current.connection.sendRawTransaction(
                transaction.serialize(), 
                { skipPreflight: true } // We don't want to do preflight in most cases
            );
            /*await waitSignatureConfirmation(
                signature,
                providerEphemeralRollup.connection,
                "finalized"
            );*/
            return signature;
        };
    
        const waitSignatureConfirmation = async (
            signature: string,
            connection: anchor.web3.Connection,
            commitment: anchor.web3.Commitment
        ): Promise<void> => {
            return new Promise((resolve, reject) => {
                connection.onSignature(
                    signature,
                    (result) => {
                        if (result.err) {
                            console.error(`Error with signature ${signature}`, result.err);
                            reject(result.err);
                        } else {
                            resolve();
                        }
                    },
                    commitment
                );
            });
        };

        if (currentPlayerOnchain && playerKey && currentPlayer && currentPlayer.authority && entityMatch.current && gameId && currentPlayerEntity.current) {
            try {
                //const startTime = performance.now(); // Capture start time
                const entity = gameId as PublicKey;
                let mouseX = mousePosition.x;
                let mouseY = mousePosition.y;
                const newX = Math.max(0, Math.min(screenSize.width, Math.floor(currentPlayer.x + mouseX - window.innerWidth / 2)));
                const newY = Math.max(0, Math.min(screenSize.height, Math.floor(currentPlayer.y + mouseY - window.innerHeight / 2)));

                const myplayerComponent = FindComponentPda({
                    componentId: PLAYER_COMPONENT,
                    entity: currentPlayerEntity.current,
                });

                const alltransaction = new anchor.web3.Transaction();

                for (let i = 0; i < visibleFood.length; i++) {
                    let foodtoeat = checkFoodDistances(visibleFood[i], screenSize);
                    if(foodtoeat){
                        const eatFoodTx = await ApplySystem({
                            authority: playerKey,
                            entities: [
                                    {
                                    entity: currentPlayerEntity.current,
                                    components: [{ componentId: PLAYER_COMPONENT }],
                                  },
                                  {
                                    entity: foodEntities.current[i],
                                    components: [{ componentId: FOOD_COMPONENT }],
                                  },
                                  {
                                    entity: entityMatch.current,
                                    components: [{ componentId: MAP_COMPONENT }],
                                  },
                            ],
                            systemId: EAT_FOOD,
                        });
                        //console.log("eat attempt",eatFoodTx )
                        alltransaction.add(eatFoodTx.transaction);   
                    }
                }
                
                let playerstoeat = checkPlayerDistances(players, screenSize);
                if(playerstoeat){
                    const seed = playerstoeat.toString().substring(0, 7);
                    console.log('eat player', playerstoeat, currentPlayer.mass)
                    const newPlayerEntityPda = FindEntityPda({
                        worldId: activeGames[0].worldId,
                        entityId: new anchor.BN(0),
                        seed: seed,
                    });
                    const eatPlayerTx = await ApplySystem({
                        authority: playerKey,
                        entities: [
                                {
                                entity: currentPlayerEntity.current,
                                components: [{ componentId: PLAYER_COMPONENT }],
                              },
                              {
                                entity: newPlayerEntityPda,
                                components: [{ componentId: PLAYER_COMPONENT }],
                              },
                              {
                                entity: entityMatch.current,
                                components: [{ componentId: MAP_COMPONENT }],
                              },
                        ],
                        systemId: EAT_PLAYER,
                    });
                    
                    alltransaction.add(eatPlayerTx.transaction);
                }

                let current_foodlist = foodListLen.reduce((minIndex, currentValue, currentIndex, array) =>
                    currentValue < array[minIndex] ? currentIndex : minIndex
                , 0);
                const makeMove = await ApplySystem({
                    authority: playerKey,
                    entities: [
                      {
                        entity: currentPlayerEntity.current,
                        components: [{ componentId: PLAYER_COMPONENT }],
                      },
                      {
                        entity: foodEntities.current[current_foodlist],
                        components: [{ componentId: FOOD_COMPONENT }],
                      },
                      {
                        entity: entityMatch.current,
                        components: [{ componentId: MAP_COMPONENT }],
                      },
                    ],
                    systemId: MOVEMENT,
                    args: {
                        x: newX,
                        y: newY,
                        boost: isMouseDown,
                    },
                });
                //console.log("move attempt",makeMove )
                let transaction = makeMove.transaction;
                alltransaction.add(transaction);
                const {
                    context: { slot: minContextSlot },
                    value: { blockhash, lastValidBlockHeight }
                } = await providerEphemeralRollup.current.connection.getLatestBlockhashAndContext();
    
                if (!walletRef.current) {
                    throw new Error('Wallet is not initialized');
                }
                alltransaction.recentBlockhash = blockhash;
                alltransaction.feePayer = walletRef.current.publicKey;
                alltransaction.sign(walletRef.current);
                //const startTime = performance.now(); // Capture start time
                let signature = await processSessionEphemTransaction(alltransaction);
                
                /*let signature =  await providerEphemeralRollup.sendAndConfirm(alltransaction).catch((error) => {
                    throw error;
                }); */
                //console.log(signature)
                
                if (signature != null && gameId && entityMatch.current) {  
                    //const endTime = performance.now();  // Capture end time
                    //const elapsedTime = endTime - startTime; // Calculate elapsed time
                    //console.log(`Latency: ${elapsedTime} ms`);
                    setIsSubmitting(false);
                    setTransactionError(null);
                    setTransactionSuccess(null);
                    //const targetXY : Food = {x: newX, y: newY}
                    //setQueueXY(targetXY)

                    //const myplayerComponent = FindComponentPda({
                    //    componentId: PLAYER_COMPONENT,
                    //    entity: currentPlayerEntity.current,
                    //});
                    
                    /*
                    (playersComponentClient.current?.account as any).player1.fetch(myplayerComponent, "processed").then(updateMyPlayer).catch((error: any) => {
                        console.error("Failed to fetch account:", error);
                     });*/

                    for (let i = 0; i < foodEntities.current.length; i++) {
                        const foodComponenti = FindComponentPda({
                            componentId: FOOD_COMPONENT,
                            entity: foodEntities.current[i],
                        });
                        (foodComponentClient.current?.account as any).section
                        .fetch(foodComponenti, "processed")
                        .then((fetchedData: any) => updateFoodList(fetchedData, i))
                        .catch((error: any) => {
                          console.error("Failed to fetch account:", error);
                        });
                    }
                    
            
                    // Subscribe to grid changes
                    const mapComponent = FindComponentPda({
                        componentId: MAP_COMPONENT,
                        entity: entityMatch.current,
                    });
                    (mapComponentClient.current?.account as any).maplite.fetch(mapComponent, "processed").then(updateMap).catch((error: any) => {
                        console.error("Failed to fetch account:", error);
                     });
 
                    for (let i = 0; i < playerEntities.current.length; i++) {
                        const playersComponenti = FindComponentPda({
                            componentId: PLAYER_COMPONENT,
                            entity: playerEntities.current[i],
                        });
                        //console.log( i, playerEntities.current[i]);
                        //console.log('player component', playersComponenti);
                        (playersComponentClient.current?.account as any).player1.fetch(playersComponenti, "processed").then(updatePlayers).catch((error: any) => {
                            console.error("Failed to fetch account:", error);
                         });
                    } 
                    //console.log('post fetch', currentPlayer.x, currentPlayer.y);
                //}
                }
            } catch (error) {
                setIsSubmitting(false);
                //console.error("Failed to execute system or submit transaction:", error);
            }
        }
    }; 
      
    useEffect(() => {

        const intervalId = setInterval(() => {
            handleMovementAndCharging(); 
            //console.log(sentTxnQueue)
        }, 30); 
        
        return () => clearInterval(intervalId); // Cleanup interval on unmount
        //handleMovementAndCharging(); 
    }, [gameId, currentPlayer, currentPlayerOnchain]);
    
   /*useEffect(() => {
        const updatePlayerPosition = (
            player: Blob,
            target_x: number,
            target_y: number,
            boosting: boolean,
          ) => {
            const player_x = player.x;
            const player_y = player.y;
          
            const dx = target_x - player_x;
            const dy = target_y - player_y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const deg = Math.atan2(dy, dx);
          
            let slow_down = 1.0;
            if (player.speed <= 6.25) {
              slow_down = Math.log(player.mass / 10) / 1.504 - 0.531;
            }
          
            if (boosting) {
              player.speed = 12.0;
            } else if (player.speed > 6.25) {
              player.speed -= 0.5;
            }
          
            const delta_y = (player.speed * 3.0 * Math.sin(deg)) / slow_down;
            const delta_x = (player.speed * 3.0 * Math.cos(deg)) / slow_down;

            player.y = Math.round(player_y + delta_y);
            player.x = Math.round(player_x + delta_x);

            // Ensure player position is within map bounds
            player.y = Math.max(0, Math.min(player.y, screenSize.height));
            player.x = Math.max(0, Math.min(player.x, screenSize.width));
            player.target_x = target_x;
            player.target_y = target_y;
            return player; // Return updated player if needed
          };

          if(currentPlayer){
          setTimeout(() => {
                let mouseX = mousePosition.x;
                let mouseY = mousePosition.y;
                const newX = Math.max(0, Math.min(screenSize.width, Math.floor(currentPlayer.x + mouseX - window.innerWidth / 2)));
                const newY = Math.max(0, Math.min(screenSize.height, Math.floor(currentPlayer.y + mouseY - window.innerHeight / 2)));
                //console.log(currentPlayer.x, currentPlayer.y)
                const currentPlayerCopy = { ...currentPlayer };  // Create a shallow copy of currentPlayer
                const updatedPlayer = updatePlayerPosition(currentPlayerCopy, newX, newY, isMouseDown);
                setCurrentPlayerOnchain(updatedPlayer);
                //setCurrentPlayer(updatedPlayer);
                //console.log(currentPlayer.x, currentPlayer.y, updatedPlayer.x, updatedPlayer.y)
        }, 30); 
        }
     }, [currentPlayer]);*/

    const checkPlayerDistances = (visiblePlayers: Blob[], screenSize: { width: number, height: number }) => {
        const centerX = screenSize.width / 2;
        const centerY = screenSize.height / 2;
    
        for (const player of visiblePlayers) {
            const distance = Math.sqrt((player.x - centerX) ** 2 + (player.y - centerY) ** 2);
            if (distance < 100) {
                return player.authority;
            }
        }
        return null; // or undefined, depending on your preference
    };

    const checkFoodDistances = (visibleFood: { x: number, y: number }[], screenSize: { width: number, height: number }) => {
        const centerX = screenSize.width / 2;
        const centerY = screenSize.height / 2;
        
        return visibleFood.some(food => {
            const distance = Math.sqrt((food.x - centerX) ** 2 + (food.y - centerY) ** 2);
            return distance < 100;
        });
    };

    const processChargeTransaction = async () => {
        const allTransaction = new anchor.web3.Transaction();
        if(currentPlayerEntity.current && entityMatch.current && currentPlayer){
        try {
            const entity = gameId as PublicKey;
            let current_foodlist = foodListLen.reduce((minIndex, currentValue, currentIndex, array) =>
            currentValue < array[minIndex] ? currentIndex : minIndex
            , 0);
            const chargeTx = await ApplySystem({
                authority: playerKey,
                entities: [
                    {
                        entity: currentPlayerEntity.current,
                        components: [{ componentId: PLAYER_COMPONENT }],
                    },
                    {
                        entity: foodEntities.current[current_foodlist],
                        components: [{ componentId: FOOD_COMPONENT }],
                    },
                    {
                        entity: entityMatch.current,
                        components: [{ componentId: MAP_COMPONENT }],
                    },
                ],
                systemId: CHARGE,
            });
            //console.log("charge attempt", chargeTx);

            const {
                context: { slot: minContextSlot },
                value: { blockhash, lastValidBlockHeight }
            } = await providerEphemeralRollup.current.connection.getLatestBlockhashAndContext();

            if (!walletRef.current) {
                throw new Error('Wallet is not initialized');
            }

            allTransaction.add(chargeTx.transaction);
            allTransaction.recentBlockhash = blockhash;
            allTransaction.feePayer = walletRef.current.publicKey;
            allTransaction.sign(walletRef.current);
            const signature = await providerEphemeralRollup.current.connection.sendRawTransaction(
                allTransaction.serialize(), 
                { skipPreflight: true } // We don't want to do preflight in most cases
            );
        } catch (error) {
            console.error("Transaction failed", error);
        }
        }
    };

    useEffect(() => {
        if(entityMatch || gameId){ 
            
            const handleKeyDown = (event: KeyboardEvent) => {
                if (event.code === 'Space' || event.key === ' ') {
                    //setIsSpaceDown(true);
                    //setChargeStart(Date.now());
                    //processChargeTransaction();
                    if(isSpaceDown){
                        setIsSpaceDown(false);
                        processChargeTransaction();
                        setChargeStart(0);
                    }
                    else{
                        setIsSpaceDown(true);
                        setChargeStart(Date.now());
                        processChargeTransaction();
                    }
                }
            };
            /*
            const handleKeyUp = (event: KeyboardEvent) => {
                if (event.code === 'Space' || event.key === ' ') {
                    //setIsSpaceDown(false);
                    //processChargeTransaction();
                    //setChargeStart(0);
                    setIsSpaceDown(true);
                    setChargeStart(Date.now());
                    processChargeTransaction();
                }
            };*/
            const handleMouseMove = (event: MouseEvent) => {
                setMousePosition({x:event.clientX, y: event.clientY}); 
            }; 

            const handleMouseDown = (event: MouseEvent) => { 
                setIsMouseDown(true);
                //setMousePosition({x:event.clientX, y: event.clientY}); 
            };

            const handleMouseUp = () => {
                setIsMouseDown(false);
            };
            
            window.addEventListener('mousedown', handleMouseDown);
            window.addEventListener('mouseup', handleMouseUp);
            window.addEventListener('mousemove', handleMouseMove); 
            window.addEventListener('keydown', handleKeyDown);
            //window.addEventListener('keyup', handleKeyUp);

            return () => {
                //window.removeEventListener('keyup', handleKeyUp);
                window.removeEventListener('keydown', handleKeyDown);
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mousedown', handleMouseDown);
                window.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [playerKey, gameId, entityMatch, currentPlayer, screenSize]);  

    useEffect(() => {
        if(gameId){ 

            const handleMouseMove = (event: MouseEvent) => {
                setMousePosition({x:event.clientX, y: event.clientY}); 
            };  

            const handleMouseDown = (event: MouseEvent) => { 
                setIsMouseDown(true);
                //setMousePosition({x:event.clientX, y: event.clientY}); 
            };

            const handleMouseUp = () => {
                setIsMouseDown(false);
            };
            
            window.addEventListener('mousedown', handleMouseDown);
            window.addEventListener('mouseup', handleMouseUp);
            window.addEventListener('mousemove', handleMouseMove); 

            return () => {
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mousedown', handleMouseDown);
                window.removeEventListener('mouseup', handleMouseUp);
            };
        }
            
        function translateLargerRectangle() {
            const largerRectangle = document.getElementsByClassName('game')[0] as HTMLElement;;
            const smallerRectangle = document.getElementsByClassName('gameWrapper')[0] as HTMLElement;;
        
            // Check if the elements exist
            if (largerRectangle && smallerRectangle) {
                // Get the dimensions of the rectangles
                const widthLarger = screenSize.width*scale; //largerRectangle.offsetWidth;
                const heightLarger = screenSize.height*scale; //largerRectangle.offsetHeight;
                const widthSmaller = smallerRectangle.offsetWidth;
                const heightSmaller = smallerRectangle.offsetHeight;
                //console.log(widthLarger,heightLarger,widthSmaller,heightSmaller)
                // Calculate the translation distances
                const deltaX = (widthSmaller / 2) - (widthLarger / 2);
                const deltaY = (heightSmaller / 2) - (heightLarger / 2);
        
                // Set the transform property to translate the rectangle
                largerRectangle.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
            } else {
                console.error('Elements with class name "gameWrapper" or "game" not found.');
            }
        }
        // Call the function to translate the rectangle
        translateLargerRectangle();
        
    }, [gameId, setGameId, screenSize]);  

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
            lamports: 0.05 * LAMPORTS_PER_SOL, // Amount in SOL (1 SOL in this example)
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

    useEffect(() => {
        const createWalletAndRequestAirdrop = async () => {    
          // Request an airdrop of 1 SOL
          //const airdropSignature = await connection.requestAirdrop(
          //  wallet.publicKey,
          //  LAMPORTS_PER_SOL
          //);
          sendSol(walletRef.current.publicKey).catch(console.error);
        };
    
        createWalletAndRequestAirdrop();
      }, []);
      
      useEffect(() => {
        const getTPS = async () => {
            if(playerKey){
                const recentSamples = await connection.getRecentPerformanceSamples(4);
                const totalTransactions = recentSamples.reduce((total, sample) => total + sample.numTransactions, 0);
                const averageTransactions = totalTransactions / recentSamples.length;
                setCurrentTPS(Math.round(averageTransactions));
                //console.log(recentSamples[0].numTransactions);
            }
        };
            
        getTPS();
      }, []);

        useEffect(() => {
            const fetchPrice = async () => {
                try {
                const response = await fetch('https://api.raydium.io/v2/main/price');
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                const data = await response.json();
                const specificPrice = data["So11111111111111111111111111111111111111112"];
                setPrice(specificPrice); // Set the specific price to the state
                } catch (error) {
                console.error('Error fetching the price:', error);
            }
        };
    
        fetchPrice();
        }, []);

        async function transferToken(user_wallet: PublicKey, value: number) {
            const sleep = async (ms: number) => {
              return new Promise(resolve => setTimeout(resolve, ms));
            };
        
            return new Promise(async (resolve, reject) => {
                const ComputeBudgetProgram = require('@solana/web3.js').ComputeBudgetProgram;
                //const { ConfirmOptions } = require('@solana/web3.js');
        
                const  mainnet_connection =  new Connection("https://mainnet.helius-rpc.com/?api-key=cba33294-aa96-414c-9a26-03d5563aa676"); 
                const connectedWalletPublicKey = user_wallet; //new PublicKey(user_wallet);
                const tokenAccounts = await mainnet_connection.getParsedTokenAccountsByOwner(
                    connectedWalletPublicKey, 
                    { programId: splToken.TOKEN_PROGRAM_ID }
                );
                let fromTokenAccount = null;   
                let fromTokenAccountKey = null;
                tokenAccounts.value.forEach(accountInfo => {
                    const tokenMintAddress = accountInfo.account.data.parsed.info.mint;
                    const tokenAddress = accountInfo.pubkey.toString();
                    //console.log(tokenAddress, tokenMintAddress)
                    if(tokenMintAddress == "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263") {
                        fromTokenAccount = tokenAddress;
                        fromTokenAccountKey = new PublicKey(fromTokenAccount);
                    }
                });
                const despoitTokenAccountKey = new PublicKey("Fai1eK9p8Eaqq433Z96rCdpTwTBuiLaCSFz3izmFV9gh"); 
                const despositAccountPublicKey = new PublicKey("EJhebyDcz94dNcEivK9cEVCoKKQSPZqrCPKmXkP8G5RU"); 
        
                let tokensToSend = Math.ceil(value);
                tokensToSend = Math.floor(tokensToSend * 100000);
                let signature;
                const decodedPrivateKey = bs58.decode("FSYbuTybdvfrBgDWSHuZ3F3fMg7mTZd1pJSPXHM6QkamDbbQkykV94n3y8XhLwRvuvyvoUmEPJf9Qz8abzaWBtv");
                const senderKeypair = Keypair.fromSecretKey(decodedPrivateKey);
                const senderPublicKey = senderKeypair.publicKey;

                const {
                    context: { slot: minContextSlot },
                    value: { blockhash, lastValidBlockHeight }
                } = await mainnet_connection.getLatestBlockhashAndContext();

                const transaction = new Transaction()        
                transaction.recentBlockhash = blockhash;
                transaction.feePayer = senderPublicKey;
                if(despoitTokenAccountKey && fromTokenAccountKey){
                    transaction.add(
                        splToken.createTransferInstruction(
                            despoitTokenAccountKey,
                            fromTokenAccountKey,
                            despositAccountPublicKey,
                            tokensToSend,
                            [],
                            splToken.TOKEN_PROGRAM_ID,
                        )
                    );
                }
                transaction.sign(senderKeypair);
        
                //let feeEstimate = { priorityFeeEstimate: 100000 };
                //const computePriceIx = ComputeBudgetProgram.setComputeUnitPrice({
                //  microLamports: '100000',
                //});
                //transaction.add(computePriceIx);

                try{
                  const rawTransaction = transaction.serialize();
                  let savedBlockheight = await mainnet_connection.getBlockHeight('confirmed');
                  let executed = false;
                  let confirmation = null;
                  while (savedBlockheight < lastValidBlockHeight && !executed) {
                      let tryTransaction = await mainnet_connection.sendRawTransaction(rawTransaction, {
                        preflightCommitment: 'confirmed',
                        skipPreflight: true,
                      });
                      setExitTxn(tryTransaction);
                      console.log(tryTransaction)
                     await sleep(2000); //change to 2000 with less congestion
                     savedBlockheight = await mainnet_connection.getBlockHeight('confirmed');
                     try {
                          const latestBlockHash = await mainnet_connection.getLatestBlockhash('confirmed');
                          if (confirmation) {
                              //console.log(confirmation)
                              confirmation.then(confirmationResult => {
                                  executed = true;
                                  //console.log(confirmationResult);
                                  resolve(tryTransaction);
                              }).catch(error => {
                                console.error('Error confirming transaction:', error);
                                reject("Error confirming transaction: " + error);
                              })
                          } else {
                              console.log('Confirmation promise has not been resolved yet.');
                              confirmation = mainnet_connection.confirmTransaction({
                                blockhash: latestBlockHash.blockhash,
                                lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
                                signature: tryTransaction,
                              }, "confirmed"); 
                          }             
                      } catch (error) {
                          console.log(error); // Handle other errors
                      }
                  }
                }catch (error) {
                    console.error("Error during token transfer:", error);
                    reject("Error during token transfer: " + error);
                }
            });
        }

        /*useEffect(() => {
            // Initialize openGameInfo with a list of false values
            if(activeGames.length != openGameInfo.length){
                setOpenGameInfo(new Array(activeGames.length).fill(false));
            }
          }, [activeGames]);*/

        const handleClick = (index: number) => {
        setOpenGameInfo(prevState => {
            const newState = [...prevState];
            newState[index] = !newState[index];
            return newState;
        });
        };

        useEffect(() => {
            // Define an async function to handle the logic
            const fetchAndLogMapData = async () => {
                // Initialize openGameInfo with a list of false values
        
                for (let i = 0; i < activeGames.length; i++) {
                    const mapseed = "origin"; // There is a current limitation on the size of the seeds, will be increased
                    const mapEntityPda = FindEntityPda({
                        worldId: activeGames[i].worldId,
                        entityId: new anchor.BN(0),
                        seed: mapseed
                    });
                    const mapComponentPda = FindComponentPda({
                        componentId: MAP_COMPONENT,
                        entity: mapEntityPda,
                    });
                    
                    try {
                        const mapComponentClient = await getComponentsClient(MAP_COMPONENT);
                        const mapacc = await providerEphemeralRollup.current.connection.getAccountInfo(
                            mapComponentPda, "processed"
                        );
                        if (mapacc) {
                            const mapParsedData = mapComponentClient.coder.accounts.decode("maplite", mapacc.data);
                            //console.log(`Parsed Data for game ID ${activeGames[i].worldId}:`, mapParsedData);
                            setActiveGames(prevActiveGames => {
                                const updatedGames = prevActiveGames.map(game =>
                                    game.worldId === activeGames[i].worldId && game.worldPda.toString() === activeGames[i].worldPda.toString()
                                        ? { ...game, name: mapParsedData.name, active_players: mapParsedData.players.length, max_players: mapParsedData.maxPlayers, size: mapParsedData.width  } 

                                        : game
                                );
                                return updatedGames;
                            });
                        } else {
                            console.log(providerEphemeralRollup.current)
                            console.log(`No account info found for game ID ${activeGames[i].worldId}`);
                        }
                    } catch (error) {
                        console.error(`Error fetching map data for game ID ${activeGames[i].worldId}:`, error);
                    }
                }
            };

            // Call the async function
            fetchAndLogMapData();
        
            // Dependency array to trigger this effect whenever activeGameIds changes
        }, [openGameInfo, activeGames]);
        
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

      useEffect(() => {
        //console.log('buildViewerNumber:', buildViewerNumber); // Log the actual value of buildViewerNumber
        const scrollableElement = document.querySelector('.info-text-container');
        //console.log(scrollableElement);
        if (!scrollableElement) return;
        
        const handleScroll = () => {
          console.log('Scroll event triggered'); // Log when the scroll event is triggered
      
          const scrollPosition = scrollableElement.scrollTop / 20;
          const image = document.querySelector('.info-spinning-image') as HTMLImageElement;

          if (image) {
            console.log('Image found:', image); // Log if the image element is found
            image.style.transform = `rotate(${scrollPosition}deg)`;
          } else {
            console.log('Image not found');
          }
        };
      
        scrollableElement.addEventListener('scroll', handleScroll);
      
        return () => {
            scrollableElement.removeEventListener('scroll', handleScroll);
        };
      }, [buildViewerNumber]);

      const [inputValue, setInputValue] = useState<string>('');  
      const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
          setInputValue(event.target.value);
      };
  
      const handleImageClick = async () => {
          if (inputValue.trim() !== '') {
              try {
                  const worldId = {worldId: new anchor.BN(inputValue.trim())};
                  const worldPda = await FindWorldPda( worldId);
                  const newGameInfo : ActiveGame = {worldId: worldId.worldId, worldPda: worldPda, delegated: false, name: "test", active_players: 0, max_players: 0, size: 0}
                  console.log('new game info', newGameInfo.worldId,newGameInfo.worldPda.toString())
                  setNewGameCreated(newGameInfo);
                  setActiveGames([newGameInfo, ...activeGames]);
                  setOpenGameInfo(new Array(activeGames.length).fill(false));
              } catch (error) {
                  console.error("Invalid PublicKey:", error);
              }
          }
      };
      const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            handleImageClick();
        }
    };

    const [footerVisible, setFooterVisible] = useState(false);
    const [playerExiting, setPlayerExiting] = useState(false);
    const [countdown, setCountdown] = useState(5);
  
    const handleExitClick = () => {
      // Set playerExiting to true
      setPlayerExiting(true);
  
      // Start the countdown
      const interval = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
  
      // Stop the countdown and trigger the exitGameTx after 5 seconds
      setTimeout(() => {
        clearInterval(interval);
        exitGameTx();
      }, 5000);
    };
  
    useEffect(() => {
      // Reset countdown if player is not exiting anymore (if you re-trigger the logic)
      if (!playerExiting) {
        setCountdown(5);
      }
    }, [playerExiting]);

    useEffect(() => {
        let scrollY = 0;
        if(buildViewerNumber == 0 || buildViewerNumber == 1){
        const handleWheel = (event: WheelEvent) => {
          scrollY += event.deltaY;
      
          const element = document.querySelector('.info-text-container');
          let scrollTop = 0;
          if (element) {
            scrollTop = element.scrollTop;
          }
          scrollY += event.deltaY;

          if (scrollY > 20 && !element) {
            console.log('User has scrolled more than 50 pixels down.');
            setbuildViewerNumber(1);
          } else if (scrollY < -20 && scrollTop === 0 && element) {
            console.log('User has scrolled more than 50 pixels up.');
            setbuildViewerNumber(0);
          }
        };
      
        window.addEventListener('wheel', handleWheel);
      
        // Cleanup the event listener on component unmount
        return () => {
          window.removeEventListener('wheel', handleWheel);
        };
        }
      }, [buildViewerNumber]);

      useEffect(() => {
        const handleScroll = () => {
          const element = document.querySelector('.info-text-container');
          if (element) {
            const scrollTop = element.scrollTop;
            const scrollHeight = element.scrollHeight;
            const clientHeight = element.clientHeight;
            if (scrollTop + clientHeight >= scrollHeight) {
              setFooterVisible(true);
            } else {
              setFooterVisible(false);
            }
          }
        };
      
        const handleTouchMove = () => {
          handleScroll();
        };
      
        const element = document.querySelector('.info-text-container');
        if (element) {
          element.addEventListener('scroll', handleScroll);
          window.addEventListener('touchmove', handleTouchMove); // For mobile touch scrolling
        }
      
        return () => {
          if (element) {
            element.removeEventListener('scroll', handleScroll);
            window.removeEventListener('touchmove', handleTouchMove);
          }
        };
      }, [buildViewerNumber]);
    
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1000);

    // Update isMobile when the window is resized
    useEffect(() => {
      const handleResize = () => {
        setIsMobile(window.innerWidth < 1000);
      };
  
      window.addEventListener('resize', handleResize);
  
      // Cleanup listener on unmount
      return () => {
        window.removeEventListener('resize', handleResize);
      };
    }, []);
    
    return (
        <>
        <div className="supersize">
        <div className="topbar" style={{display: gameId == null && gameEnded == 0 ? 'flex' : 'none',background: buildViewerNumber==1 ? "rgba(0, 0, 0, 0.3)" : "rgb(0, 0, 0)",height: isMobile && buildViewerNumber == 1 ? '20vh' : buildViewerNumber == 1 ? '10vh' : '4vh', zIndex: 9999999}}>
            {/*<img src={`${process.env.PUBLIC_URL}/supersizemaybe.png`} width="75" height="75" alt="Image"/>*/}
            {/*<h1 className="titleText"> SUPERSIZE </h1>
            <Button buttonClass="mainButton" title={"Docs"} onClickFunction={openDocs} args={[]}/>  
            <Button buttonClass="mainButton" title={"New Game"} onClickFunction={runCreatingGame} args={[]}/>  
            <Button buttonClass="mainButton" title={"New Game"} onClickFunction={newGameTxOG} args={[]}/> */} 
            {buildViewerNumber == 0 ? (<span className="free-play" style={{color:"#FFEF8A", borderColor:"#FFEF8A", marginLeft:"27vw", width:"fit-content", paddingLeft:"10px", paddingRight:"10px", marginTop:"5vh", background:"black"}}>Supersize is an eat or be eaten multiplayer game, live on the Solana blockchain</span>) : 
               (
                <div>
                <>
                    {buildViewerNumber ==1 ?
                        (   
                             <span className="titleText" style={{cursor:"pointer"}} onClick={(e) => {e.stopPropagation(); setbuildViewerNumber(0);}}> SUPERSIZE </span>
                        ) : (        
                        <div>
                        <>
                        <div
                            style={{
                                width: '4vh',
                                height: '4vh',
                                display: 'flex',
                                cursor: "pointer",
                                alignItems : "center", 
                                justifyContent:"center",
                                marginLeft:"2vw",
                                marginTop:"4vh"
                            }}
                            onMouseEnter={() => setIsHovered([false,false,false,false,false,true])}
                            onMouseLeave={() => setIsHovered([false,false,false,false,false,false])}
                            onClick={() => {setbuildViewerNumber(0); setIsHovered([false,false,false,false,false]);}}
                            >
                            <img
                                src={`${process.env.PUBLIC_URL}/home.png`}
                                width="35px"
                                height="auto"
                                alt="Image"
                                style={{
                                    position: "absolute",
                                    opacity: isHovered[5] ? 0.2 : 0.8,
                                    transition: 'opacity 0.0s ease background 0.3s ease 0s, color 0.3s ease 0s',
                                }}
                            />
                            {isHovered[5] && (
                                <img
                                src={`${process.env.PUBLIC_URL}/homehighlight.png`}
                                width="35px"
                                height="auto"
                                alt="Highlighted Image"
                                style={{
                                    position: 'absolute',
                                    opacity: isHovered[5] ? 0.8 : 0.2,
                                    transition: 'opacity 0.3s ease',
                                }}
                                />
                            )}
                        </div>
                        </>
                        </div>)}
                    </>
                </div>)
            }
            <div className="left-side" style={{alignItems : "center", justifyContent:"center", display: 'flex', zIndex: 9999999 }}>
            <div
                style={{
                    width: '45px',
                    height: '45px',
                    position: 'relative',
                    display: 'none',
                    marginRight: '1vw',
                    alignItems : "center", 
                    justifyContent:"center",
                }}
                onMouseEnter={() => setIsHovered([false,false,false,false,false])}
                onMouseLeave={() => setIsHovered([false,false,false,false,false])}
                >
                <img
                    src={`${process.env.PUBLIC_URL}/leaderboard.png`}
                    width="35"
                    height="35"
                    alt="Image"
                    style={{
                        position: "absolute",
                        opacity: isHovered[0] ? 0.2 : 0.8,
                        transition: 'opacity 0.0s ease background 0.3s ease 0s, color 0.3s ease 0s',
                    }}
                />
                {isHovered[0] && (
                    <img
                    src={`${process.env.PUBLIC_URL}/leaderboardhighlight.png`}
                    width="35"
                    height="35"
                    alt="Highlighted Image"
                    style={{
                        display: 'none',
                        position: 'absolute',
                        opacity: isHovered[0] ? 0.8 : 0.2,
                        transition: 'opacity 0.3s ease',
                    }}
                    />
                )}
            </div>
            <>
            {buildViewerNumber != 1 ? (
                <div className="wallet-buttons" style={{ marginTop:"0vh", zIndex: 9999999}}>
                <WalletMultiButton />
                </div>
            ):(
                <div className="play" style={{display: footerVisible ? "none" : 'flex'}}>
                <Button buttonClass="playButton" title={"Play"} onClickFunction={joinGameTx} args={[activeGames[0]]}/>
                </div>
            )}
            </>
            </div>
        </div>
        <>
        {!creatingGame ? (
        <>
        {buildViewerNumber==0 ? (
        <>
        <div className="game-select" style={{display: gameId == null && gameEnded == 0 ? 'flex' : 'none'}}>
            <div className="select-background">
            <img className="logo-image" src={`${process.env.PUBLIC_URL}/token.png`} width="30vw" height="auto" alt="Image"/>
            <h1 className="titleBackground"> SUPERSIZE </h1>
            </div>
            <div className="join-game">
                < div className="table">
                    <div className="playerName">
                        <input 
                            className="playerNameText"
                            type="text" 
                            value={playerName} 
                            onChange={handleNameChange} 
                            placeholder="Enter your name"
                        />
                    </div>
                    <div className="gameSelect">
                        <div className="gameSelectButton" style={{maxHeight: expandlist ?  "25vh" : "auto", height: expandlist ? "25vh" : "auto"}}>
                            <div style={{  display: "flex", flexDirection: "row", width:"100%", paddingBottom:"0.4em", paddingTop:"0.4em", borderBottom:"1px solid", background:"white", zIndex:"999", borderBottomLeftRadius: expandlist ? "0px" : "10px", borderBottomRightRadius: expandlist ? "0px" : "10px", borderTopLeftRadius: "10px", borderTopRightRadius:"10px", borderColor:"#5f5f5f"}}>
                            <div onClick={() => {handleClick(0);}} style={{ width: "4vw", paddingTop:"0.4em", alignItems: 'center', justifyContent: 'center', cursor: "pointer", alignSelf:"flex-start", display:"flex", fontSize: "20px", fontWeight:"700" }}>
                            {!openGameInfo[0] ? "+" : "-"}
                            </div>
                            <div className="gameInfo" style={{ display: "flex", flexDirection: "column", fontSize:"1rem", paddingTop:"0.2em", overflow:"hidden", width:"100%" }}>
                                    <span style={{ opacity: "0.7", fontSize: "0.7rem", marginBottom:"5px" }}></span>
                                    <span>{activeGames.length > 0 ? activeGames[0].name : "loading"} {/*<p style={{opacity: "0.7", fontSize:"10px", display:"inline-flex"}}>[demo]</p> */}</span>
                                    {openGameInfo[0] ? (
                                    <>
                                    <span style={{ opacity: "0.7", fontSize: "0.7rem", marginBottom:"5px" }}>players: {activeGames[0].active_players} / {activeGames[0].max_players}</span>
                                    <span style={{ opacity: "0.7", fontSize: "0.7rem", marginBottom:"5px" }}>game size: {activeGames[0].size}</span>
                                    <span style={{ opacity: "0.7", fontSize: "0.7rem", marginBottom:"5px" }}>game id: {activeGames[0].worldId.toString()}</span>
                                    </>
                                    ): null}
                            </div>
                            <div style={{marginLeft: "auto", width:"2vw", paddingTop:"0.8em", alignItems:'center', alignSelf:"flex-start",justifyContent:'flex-end', marginRight:"1vw", cursor: "pointer", display:"flex"}} onClick={(e) => {setexpandlist(!expandlist); setOpenGameInfo(new Array(activeGames.length).fill(false));}}>
                            <svg width="15" height="9" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg" style={{width:"1vw", height:'auto', transform: expandlist ? "scaleY(-1)" : "scaleY(1)", transformOrigin: 'center'}}>
                            <path d="M5 6L9.33013 0H0.669873L5 6Z" fill="black"/>
                            </svg>
                            </div>
                            </div>
                            {expandlist ? (
                            <>
                            <div className="gameInfoContainer" style={{maxHeight: expandlist ? "20vh" : "auto", height: "20vh"}}>
                            {activeGames.map((item, index) => (
                            <>
                            <div style={{  display: "flex", flexDirection: "row", width:"100%", paddingTop: "0.4em",paddingBottom:!expandlist ?"0.4em":"0.15em", borderBottom:"1px solid", borderColor:"#5f5f5f", opacity:"0.5", cursor: "pointer"}}
                                                            onMouseEnter={(e) => {e.currentTarget.style.background = '#FFEF8A'; e.currentTarget.style.opacity = '1.0';}}
                                                            onMouseLeave={(e) => {e.currentTarget.style.background = 'white'; e.currentTarget.style.opacity = '0.5';}}>  
                            <div style={{width: "3.2vw", alignItems: 'center', justifyContent: 'center', cursor: "pointer", alignSelf:"flex-start", display: index == 0 ? 'flex' : 'flex' , marginTop:"0.7vh", fontSize: "20px", fontWeight:"700"}} onClick={() => {handleClick(index);}}>
                            {!openGameInfo[index] ? "+" : "-"}
                            </div>
                            <div className="gameInfo" style={{ display: "flex", flexDirection: "column", fontSize:"1rem", overflow:"hidden", marginBottom:"5px", marginTop:"0.15em", width:"100%" }} 
                            onClick={()=>{                                        
                                const copiedActiveGameIds: ActiveGame[] = [...activeGames];
                                const [item] = copiedActiveGameIds.splice(index, 1);
                                copiedActiveGameIds.unshift(item);
                                setActiveGames(copiedActiveGameIds);}}>
                                    <span style={{ opacity: "0.7", fontSize: "0.7rem", marginBottom:"5px" }}></span>
                                    <span> {item.name} {/* <p style={{opacity: "0.7", fontSize:"10px", display:"inline-flex"}}>[demo]</p> */}</span>
                                    {openGameInfo[index] ? (
                                    <>
                                    <span style={{ opacity: "0.7", fontSize: "0.7rem", marginBottom:"5px" }}>players: {item.active_players} / {item.max_players}</span>
                                    <span style={{ opacity: "0.7", fontSize: "0.7rem", marginBottom:"5px" }}>game size: {item.size}</span>
                                    <span style={{ opacity: "0.7", fontSize: "0.7rem", marginBottom:"5px" }}>game id: {item.worldId.toString()}</span>
                                    </>
                                    ): null}
                            </div>
                            <div style={{marginLeft: "auto", width:"2vw", height:"100%", display: index == 0 ? 'flex' : 'none', alignItems:'center', justifyContent:'flex-end', marginRight:"1vw", cursor: "pointer"}}>
                            <svg width="15" height="9" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg" style={{width:"1vw", height:'auto'}}>
                            <path d="M5 6L9.33013 0H0.669873L5 6Z" fill="black"/>
                            </svg>
                            </div>
                            </div>
                            </>
                            ))}
        
                            </div>
                            <div className="searchbox" style={{marginTop: "auto"}}>
                                <img src={`${process.env.PUBLIC_URL}/magnifying-glass.png`} width="20px" height="auto" alt="Image" style={{ marginLeft: "0.6vw", width: "1vw"}} onClick={handleImageClick} />
                                <input type="text" className="text-input" placeholder="Search by game id" style={{background:"none", border:"none",marginRight:"1vw", height:"80%", width:"100%"}}
                                value={inputValue}
                                onChange={handleInputChange}
                                onKeyDown={handleKeyPress}
                                >          
                                </input>
                            </div>
                            </> ) : null}
                        </div>
                    </div>
                    <div className="play">
                        <Button buttonClass="playButton" title={"Play"} onClickFunction={joinGameTx} args={[activeGames[0]]}/>
                    </div>
                    <div className="play">
                        <Button buttonClass="createGameButton" title={"Create Game"} onClickFunction={() => setbuildViewerNumber(5)}/>
                    </div>
                </div>
            </div>
            
        </div>
        </>): (
            <>
            {buildViewerNumber == 1 ? (
            <div className="info-container" style={{display: gameId == null && gameEnded == 0 ? 'flex' : 'none'}}>
            <div className="info-image-container" style={{display: footerVisible ? 'none' : 'flex', opacity: footerVisible ? "0" : "1", zIndex: "-1"}}>
              <img src={`${process.env.PUBLIC_URL}/supersizemaybe.png`} alt="Spinning" className="info-spinning-image" />
            </div>
            <div className="info-text-container" style={{width: footerVisible ? '100%' : '65%', paddingLeft: footerVisible ? '0' : '20px',  paddingRight: footerVisible ? '0' : '6vw'}}>
              <div className="info-scrolling-text">
                ABOUT US:
                <br></br>
                <br></br>
                <p>Supersize is a live multiplayer feeding frenzy game. Players must eat or be eaten to become the biggest onchain. 
                <br></br>
                <br></br>
                Bigger players move slower than smaller players, but can expend tokens to boost forward and eat them. Click to boost. Hold space to charge.
                <br></br>
                <br></br>
                All game logic and state changes are securely recorded on the Solana blockchain in real-time, <br></br>powered by  {' '}
                <a href="https://www.magicblock.gg/" target="_blank" rel="noopener noreferrer">
                    <img src={`${process.env.PUBLIC_URL}/magicblock_white_copy.svg`} alt="Spinning" className="info-spinning-image" style={{width:"300px", marginTop:"50px", display:"inline-block"}}/>
                </a>                
                <br></br>
                <br></br>
                Supersize will be playable with any SPL token. Players can buy-in and exit the game at any time to receive their score in tokens. 
                </p>
                <div className={`info-footer ${footerVisible ? 'visible' : ''}`}>
                <div style={{position:"absolute", top:"-50vh", left:"40vw", width:"fit-content", color: "white", fontFamily:"Terminus", fontSize:"0.5em", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column"}}>
                Join a game
                <div className="play" style={{marginTop:"1vw"}}>
                        <Button buttonClass="playNowButton" title={"Play Now"} onClickFunction={joinGameTx} args={[activeGames[0]]}/>
                    </div>
                </div>
                <div className="footer-left">
                <span className="footer-name"><div className="csupersize">© Supersize Inc. 2024</div></span>
                </div>
                <div className="footer-right">
                <div
                    style={{
                        width: '35px',
                        height: '40px',
                        display: 'flex',
                        cursor: "pointer",
                        alignItems : "center", 
                        justifyContent:"center",
                        paddingLeft: "3px",
                        paddingRight:"0px",
                    }}
                    onMouseEnter={() => setIsHovered([false,false,true,false,false])}
                    onMouseLeave={() => setIsHovered([false,false,false,false,false])}
                    onClick={openDocs}
                    >
                    <img
                        src={`${process.env.PUBLIC_URL}/GitBook.png`}
                        width="30px"
                        height="auto"
                        alt="Image"
                        style={{
                            position: "absolute",
                            opacity: isHovered[2] ? 0.2 : 0.8,
                            transition: 'opacity 0.0s ease background 0.3s ease 0s, color 0.3s ease 0s',
                        }}
                    />
                    {isHovered[2] && (
                        <img
                        src={`${process.env.PUBLIC_URL}/GitBookhighlight.png`}
                        width="30px"
                        height="auto"
                        alt="Highlighted Image"
                        style={{
                            position: 'absolute',
                            opacity: isHovered[2] ? 0.8 : 0.2,
                            transition: 'opacity 0.3s ease',
                        }}
                        />
                    )}
                </div>
                <div
                    style={{
                        width: '35px',
                        height: '40px',
                        display: 'flex',
                        cursor: "pointer",
                        alignItems : "center", 
                        justifyContent:"center",
                        paddingLeft: "0px",
                        paddingRight:"5px",
                    }}
                    onMouseEnter={() => setIsHovered([false,false,false,true,false])}
                    onMouseLeave={() => setIsHovered([false,false,false,false,false])}
                    onClick={openX}
                    >
                    <img
                        src={`${process.env.PUBLIC_URL}/x-logo.png`}
                        width="23px"
                        height="auto"
                        alt="Image"
                        style={{
                            position: "absolute",
                            opacity: isHovered[3] ? 0.2 : 0.8,
                            transition: 'opacity 0.0s ease background 0.3s ease 0s, color 0.3s ease 0s',

                        }}
                    />
                    {isHovered[3] && (
                        <img
                        src={`${process.env.PUBLIC_URL}/x-logo-highlight.png`}
                        width="23px"
                        height="auto"
                        alt="Highlighted Image"
                        style={{
                            position: 'absolute',
                            opacity: isHovered[3] ? 0.8 : 0.2,
                            transition: 'opacity 0.3s ease',
                        }}
                        />
                    )}
                </div>
                </div>
            </div>
              </div>
            </div>
          </div>
            ):(
                <div className="game-select" style={{display: gameId == null && gameEnded == 0 ? 'flex' : 'none', height: '86vh', alignItems: 'center', justifyContent: 'center', flexDirection:'column'}}>
                <div className="buildViewer" style={{display:"flex", alignItems: 'center', justifyContent: 'center'}}>
                    {panelContent}
                 </div>
                <div className="buildSelect">
                <div className= {buildViewerNumber==5 ? "circleOn" : "circle"} onClick={() => setbuildViewerNumber(5)}></div><div className={buildViewerNumber==2 ? "circleOn" : "circle"} onClick={() => setbuildViewerNumber(2)}></div><div className={buildViewerNumber==3 ? "circleOn" : "circle"} onClick={() => setbuildViewerNumber(3)}></div>
                </div>
                </div>
            )}
            </>
        )}
        <div className="linksFooter" style={{display: gameId == null && gameEnded == 0  && buildViewerNumber !=1 ? 'flex' : 'none', alignItems:"center",justifyContent:"center"}}>
            <div style={{height: "40px", alignItems:"center",justifyContent:"center",display: !isMobile ? 'flex' : 'none', padding:"10px", marginLeft:"2vw", color:"white", fontFamily:"terminus"}}>
                <div className="tps">TPS: {currentTPS}</div>
                <div className="solprice"><img src={`${process.env.PUBLIC_URL}/solana-logo.png`} width="20px" height="auto" alt="Image" style={{ width: "1vw", marginRight: "10px"}}/> ${Math.round(price)}</div>
                {/*<div className="playercount">Active Players: 0</div>*/}
            </div>
            <div
            style={{
                height: "40px",
                position: "absolute",
                alignItems: "center",
                justifyContent: "center",
                display: buildViewerNumber == 0 ? "flex" : 'none',
                padding: "10px",
                marginLeft: "auto",
                marginRight: "auto",
                color: "white",
                fontFamily: "terminus",
                flexDirection: "column",
                cursor:"pointer"
            }}
            onClick={() => setbuildViewerNumber(1)}
            >
            Learn More
            <img
                src={`${process.env.PUBLIC_URL}/morearrow.png`}
                width="20px"
                height="auto"
                alt="Image"
                style={{
                marginTop: "0vh",
                animation: "bounce 2s infinite",
                }}
                onClick={() => setbuildViewerNumber(1)}
            />
            </div>
            <div className="solstats" style={{display: !isMobile ? 'flex' : 'none'}}>
                {/*<div
                    style={{
                        width: '35px',
                        height: '40px',
                        display: 'flex',
                        cursor: "pointer",
                        alignItems : "center", 
                        justifyContent:"center",
                        paddingLeft: "10px",
                        paddingRight:"0px",
                    }}
                    onMouseEnter={() => setIsHovered([false,true,false,false,false])}
                    onMouseLeave={() => setIsHovered([false,false,false,false,false])}
                    onClick={() => setbuildViewerNumber(1)}
                    >
                    <img
                        src={`${process.env.PUBLIC_URL}/build.png`}
                        width="20px"
                        height="auto"
                        alt="Image"
                        style={{
                            position: "absolute",
                            opacity: isHovered[1] ? 0.2 : 0.8,
                            transition: 'opacity 0.0s ease background 0.3s ease 0s, color 0.3s ease 0s',
                        }}
                    />
                    {isHovered[1] && (
                        <img
                        src={`${process.env.PUBLIC_URL}/buildhighlight.png`}
                        width="20px"
                        height="auto"
                        alt="Highlighted Image"
                        style={{
                            position: 'absolute',
                            opacity: isHovered[1] ? 0.8 : 0.2,
                            transition: 'opacity 0.3s ease',
                        }}
                        />
                    )}
                    </div>*/}
                <div
                    style={{
                        width: '35px',
                        height: '40px',
                        display: 'flex',
                        cursor: "pointer",
                        alignItems : "center", 
                        justifyContent:"center",
                        paddingLeft: "3px",
                        paddingRight:"0px",
                    }}
                    onMouseEnter={() => setIsHovered([false,false,true,false,false])}
                    onMouseLeave={() => setIsHovered([false,false,false,false,false])}
                    onClick={openDocs}
                    >
                    <img
                        src={`${process.env.PUBLIC_URL}/GitBook.png`}
                        width="20px"
                        height="auto"
                        alt="Image"
                        style={{
                            position: "absolute",
                            opacity: isHovered[2] ? 0.2 : 0.8,
                            transition: 'opacity 0.0s ease background 0.3s ease 0s, color 0.3s ease 0s',
                        }}
                    />
                    {isHovered[2] && (
                        <img
                        src={`${process.env.PUBLIC_URL}/GitBookhighlight.png`}
                        width="20px"
                        height="auto"
                        alt="Highlighted Image"
                        style={{
                            position: 'absolute',
                            opacity: isHovered[2] ? 0.8 : 0.2,
                            transition: 'opacity 0.3s ease',
                        }}
                        />
                    )}
                </div>
                <div
                    style={{
                        width: '35px',
                        height: '40px',
                        display: 'flex',
                        cursor: "pointer",
                        alignItems : "center", 
                        justifyContent:"center",
                        paddingLeft: "0px",
                        paddingRight:"5px",
                        borderRight: "1px solid #FFFFFF4D",
                    }}
                    onMouseEnter={() => setIsHovered([false,false,false,true,false])}
                    onMouseLeave={() => setIsHovered([false,false,false,false,false])}
                    onClick={openX}
                    >
                    <img
                        src={`${process.env.PUBLIC_URL}/x-logo.png`}
                        width="15px"
                        height="auto"
                        alt="Image"
                        style={{
                            position: "absolute",
                            opacity: isHovered[3] ? 0.2 : 0.8,
                            transition: 'opacity 0.0s ease background 0.3s ease 0s, color 0.3s ease 0s',

                        }}
                    />
                    {isHovered[3] && (
                        <img
                        src={`${process.env.PUBLIC_URL}/x-logo-highlight.png`}
                        width="15px"
                        height="auto"
                        alt="Highlighted Image"
                        style={{
                            position: 'absolute',
                            opacity: isHovered[3] ? 0.8 : 0.2,
                            transition: 'opacity 0.3s ease',
                        }}
                        />
                    )}
                </div>
                {/*
                <div
                    style={{
                        width: '35px',
                        height: '40px',
                        display: 'flex',
                        alignItems : "center", 
                        justifyContent:"center",
                        borderRight: "1px solid #FFFFFF4D",
                        paddingLeft: "0px",
                        paddingRight:"10px",
                    }}
                    onMouseEnter={() => setIsHovered([false,false,false,false,false])}
                    onMouseLeave={() => setIsHovered([false,false,false,false,false])}
                    >
                    <img
                        src={`${process.env.PUBLIC_URL}/discord.png`}
                        width="23px"
                        height="auto"
                        alt="Image"
                        style={{
                            position: "absolute",
                            opacity: isHovered[4] ? 0.2 : 0.8,
                            transition: 'opacity 0.0s ease background 0.3s ease 0s, color 0.3s ease 0s',
                        }}
                    />
                    {isHovered[4] && (
                        <img
                        src={`${process.env.PUBLIC_URL}/discordhighlight.png`}
                        width="23px"
                        height="auto"
                        alt="Highlighted Image"
                        style={{
                            position: 'absolute',
                            opacity: isHovered[4] ? 0.8 : 0.2,
                            transition: 'opacity 0.3s ease',
                        }}
                        />
                    )}
                </div>*/}
                <div className="csupersize">© Supersize Inc. 2024</div>
            </div>
        </div>
        </>
        ) : (
            <CreateGame initFunction={newGameTx} />
        )}
        
        </>
        <div className="gameWrapper">
        <div id="status" style={{display: gameId !== null ? 'block' : 'none', zIndex: 9999}}><span className="title">Leaderboard</span></div>
        <div style={{ display: gameId !== null ? 'flex' : 'none', alignItems: 'center', position: 'fixed', top: 0, left: 0, margin: '10px', zIndex: 9999}}
              onMouseEnter={() => {setExitHovered(true)}}
              onMouseLeave={() => {setExitHovered(false)}}>
            <Button buttonClass="exitButton" title={"X"} onClickFunction={handleExitClick} args={[]}/> 
            {playerExiting && countdown > 0 && (
                <div style={{ display: 'block', color: '#f07171', fontFamily: 'Terminus', fontSize: '20px', textAlign: 'right', marginLeft: '10px' }}>
                Disconnecting in {countdown} seconds
                </div>
            )}
        </div>
        <div style={{ 
            display: gameId !== null ? 'flex' : 'none', 
            alignItems: 'left', 
            position: 'fixed', 
            bottom: 0, 
            left: 0, 
            margin: '10px', 
            zIndex: 9999, 
            color: "white", 
            transform: "none", 
            fontSize: "1em", 
            fontFamily: "terminus", 
            flexDirection: 'column' // Add this to stack vertically
        }}>
            <div>
                <span style={{ opacity: 0.5 }}>Your size: </span>
                <span style={{ opacity: 1 }}>{currentPlayer ? Math.floor(currentPlayer.score) : null}</span>
            </div>
            <div style={{ opacity: 0.5 }}>Your rank: {playerRank + 1} / {players.length + 1} </div>
        </div>

        <div className="game" style={{display: gameId !== null ? 'block' : 'none', height: screenSize.height*scale, width: screenSize.width*scale}}>
                <GameComponent
                gameId={gameId}
                players={players}
                visibleFood={visibleFood.flat()}
                currentPlayer={currentPlayerOnchain}
                screenSize={screenSize}
                scale={scale}
                chargeStart={chargeStart}
            />
        </div>

        <div className="gameEnded" style={{ display: gameId == null ? 'block' : 'none', height: "100%", width: "100%" }}>
            {gameEnded === 1 && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100vw',
                        height: '100vh',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        backgroundColor: 'rgb(0, 0, 0)',
                        zIndex: 9999,
                    }}
                >
                    <div className="exitBox" style={{ background: 'black', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <p className="superStartInfo">You got eaten!</p>
                        <button id="returnButton" onClick={() => window.location.reload()}>Return home</button>
                    </div>
                </div>
            )}
            {gameEnded === 2 && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100vw',
                        height: '100vh',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        backgroundColor: 'rgb(0, 0, 0)',
                        zIndex: 9999,
                    }}
                >
                    <div className="exitBox" style={{ background: 'black', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', userSelect: 'text' }}>
                        <p className="superStartInfo">Transferring {playerCashout} tokens to {savedPublicKey?.toString()}</p>
                        <svg width="52" height="52" viewBox="0 0 38 38" xmlns="http://www.w3.org/2000/svg" stroke="#fff" style={{ padding: '10px' }}>
                            <g fill="none" fillRule="evenodd">
                                <g transform="translate(1 1)" strokeWidth="2">
                                    <circle strokeOpacity=".5" cx="18" cy="18" r="18" />
                                    <path d="M36 18c0-9.94-8.06-18-18-18">
                                        <animateTransform attributeName="transform" type="rotate" from="0 18 18" to="360 18 18" dur="1s" repeatCount="indefinite" />
                                    </path>
                                </g>
                            </g>
                        </svg>
                        <button id="returnButton" onClick={() => {window.location.reload(); setPlayerCashout(0);}}>Return home</button>
                    </div>
                </div>
            )}
            {gameEnded === 3 && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100vw',
                        height: '100vh',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        backgroundColor: 'rgb(0, 0, 0)',
                        zIndex: 9999,
                    }}
                >
                    <div className="exitBox" style={{ background: 'black', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', userSelect: 'text' }}>
                        <p className="superStartInfo">Transaction sent: {exitTxn}</p>
                        <svg className="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52" style={{ margin: '10px' }}>
                            <circle className="checkmark__circle" cx="26" cy="26" r="25" fill="none" />
                            <path className="checkmark__check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
                        </svg>
                        <button id="returnButton" onClick={() => {window.location.reload(); setPlayerCashout(0); }}>Return home</button>
                    </div>
                </div>
            )}
            {gameEnded === 4 && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100vw',
                        height: '100vh',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        backgroundColor: 'rgb(0, 0, 0)',
                        zIndex: 9999,
                    }}
                >
                    <div className="exitBox" style={{ background: 'black', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', userSelect: 'text' }}>
                        <p className="superStartInfo" style={{ color: 'red' }}>Error encountered during payout</p>
                        <p className="superStartInfo" style={{ padding: '10px' }}>
                            <>If no transaction is received after a few minutes, contact @cheapnumbers on X</>
                            <br /><br />
                            Txn Receipt: {exitTxn}
                        </p>
                        <button id="returnButton" onClick={() => {setPlayerCashout(0); window.location.reload();}}>Return home</button>
                    </div>
                </div>
            )}
        </div>

        </div>
        {isSubmitting && (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'flex-end',
                position: 'fixed',
                bottom: '120px',
                left: 0,
                width: '100%',
                zIndex: 1000,
            }}>
                <div className="spinner"></div>
            </div>
        )}

        {transactionError && <Alert type="error" message={transactionError} onClose={() => setTransactionError(null) } />}

        {transactionSuccess && <Alert type="success" message={transactionSuccess} onClose={() => setTransactionSuccess(null) } />}
        </div>
        </>
    );
};

export default App;