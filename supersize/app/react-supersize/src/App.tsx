import React, {useCallback, useEffect, useRef, useState} from "react";
import {AnimatePresence, motion} from "framer-motion";
import Button from "./components/Button";
import CreateGame from "./components/CreateGame";
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
import { Connection, clusterApiUrl, Keypair, LAMPORTS_PER_SOL, Transaction, sendAndConfirmTransaction,SystemProgram,SystemInstruction } from '@solana/web3.js';
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import BN from 'bn.js';
import * as splToken from '@solana/spl-token';

import {
    getAccount,
    getOrCreateAssociatedTokenAccount,
    createAssociatedTokenAccountInstruction,
    createAssociatedTokenAccount,
    createTransferInstruction,
    createCloseAccountInstruction,
  } from "@solana/spl-token";
import { keypairIdentity, token, Metaplex } from "@metaplex-foundation/js";
import { SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { getAssociatedTokenAddress } from "@solana/spl-token";
  
//import { Map } from "../../../target/types/map";
const bs58 = require('bs58');

const WORLD_INSTANCE_ID = 4;

//new
const FOOD_COMPONENT = new PublicKey("Dnh8jDMM6HDY1bXHt55Fi2yKfUPiu4TMhAJiotfb4oHq"); //2D7pVfWpF8NAqBFJQ5FHfMLzQR2wRZk8dRUf5SV1Hw5N, DEmfhh4qTaeXsJztECTtiU61m5ygTGrQPC4CnvQwqnVA
const MAP_COMPONENT = new PublicKey("2dZ5DLJhEVFRA5xRnRD779ojsWsf3HMi6YB1zmVDdsYb"); //73x8SGXgkhk84Yk943eJRAVAW3yGoQz5m1Q2sb2THLsA, 6YbpcyDerGUMFXnW8rAP6rg7Xknp3knLeXLmZNpVgCzv
const PLAYER_COMPONENT = new PublicKey("2ewyq31Atu7yLcYMg51CEa22HmcCSJwM4jjHH8kKVAJw");  //39c3gAHBe74wPgfhP5wBRCdcNHuMBY53awGBBjJUeWSw, Hc3Mh3NYXrEy8yHdLXeCmejFtr8e98AE9j3NApkZv7Yf
const PLAYERS_COMPONENT = new PublicKey("DM7jvvNssHqKjKXsSoJjrzAQXp9X8rTCDFskyGAjSXQB"); //DSjd5Y9zWmfXmnhm9vdzqAR1HvbaTs45ueo15SRsAoUq, AjK6CRGGmcVSvcCd7PQZJuPqewjoqRtLxno8qvhuTCQR
const ANTEROOM_COMPONENT = new PublicKey("EbGkJPaMY8XCJCNjkWwk971xzE32X5LBPg5s2g4LDYcW");  //6PWyQF9YxtQLCZeYtJhPftVg4qXv2pHGyT5NteJVjacJ, 334RfoujN9JQqxXQ3Cx4ZW9Xs6QnoiPm4eQE94XKxrXn

const INIT_ANTEROOM = new PublicKey("DbKbkJC5Dw6RvQUkaM4CH7Z5hTcWGP51t7hZ3Hu42rXp"); //5oEk3USUXwmriWFsH5cKzyfmbetYuWvRQpk4ZTzdqs47, 9rcYNGJ2xmAtdSDfXM86DhGxKxLmigYKChScFT1R2QE3
const INIT_GAME = new PublicKey("NrQkd31YsAWX6qyuLgktt4VPG4Q2DY94rBq7fWdRgo7");  //68caW8nVmZnUSunBotTTM5wuYQ3aymEsEHuTnsXgec65, 3afF5EsmrUyzAukV5gK8VcCtHFaroEigQC5LZtSLSooQ
const EAT_FOOD = new PublicKey("J7R4J1RnFMGdXgEBqwseTR9ZFruAiT1wMAYYc2Hnxsre"); //B1M7AtzCds9MyoibMA3UhhrZMJ46BTJvFadvkCr7J71U, 4AGtQVGThaBqFVNnc4dH5jdk4of554LtaV2EapcxQsJ6
const EAT_PLAYER = new PublicKey("8Gm1Lz8L4dAEypGyctPVnT7p9Y5NapQKvhLdE9dGQLKA"); //VZ7h6UCzrrWtCm3xBghYSAVXBvHecc34qnyeyeyjASh, 3MPgnXAdJTwMtTWFxAycUgcmfcJbc9V4jMTTUxooMbXY
const JOIN_GAME = new PublicKey("QMpMFne3WkDRWEvY8LGKQB6n5ox6dvdhsoB8jZFjjmX"); //BaTXEmj1rf1Jq5uGHLBVrBihLqTA6gSd2ZddmD4rLdaD, ENb3WCgfjeEUEAAn7QxutqvDCa1Xc3irRERRKKZS7Q1i
const MOVEMENT = new PublicKey("C9yoUrN6yhiKF1DEWV9QPcwaJRrTCCtMVtbJKipVTrEi");  //EhLPnGqecy61peHT7j1WRsEWGqUZ11MZzYR4Xxm5RHRj, 3Zq52bMtNsPVZgUmtAcm3jdrL3dSPPtjGfFdN2ijKFgW
const EXIT_GAME = new PublicKey("5hVB37dXEFmEvtu2TST8iXAxvd8VXq3JQmGGLNprMVyo"); //4PvV5ZSgXpUGbzBpDVmaguzG1gWZw2LKpuevYcPPVPtk, 3okUSUfqGYbP2zrDrGTjyRCoMVkSte2w3q6379SSTb3H
const SPAWN_FOOD = new PublicKey("A3LybrLCJfYL2F1wrBVaaK1rUnhzpMoGD6Lp5VTqEFNG"); //EKSX8KynuiQCkvAZiyiVuYJcEAb77WBUaSUFkhZUqASk, 6mzy9FQyryvthEewwZJeG1aR6GNeafwpJoyG1wCiNiJk
const INIT_PLAYERS = new PublicKey("Ru2cmntBkvmUGcg6E7rrDFYrx6ujf1zVJs7hEDq3uT3"); //84UTvkLscZVoznsgC4ppfQ3xSjBxod617g1nwTqEiMLM, 4Viwh8k4jYCuxWF1ogTA484y4UaTspbFhBph9UhJ2o4A
const INIT_FOOD = new PublicKey("3YdRbDukWkyE2tBPoUhPSJzB1MCE1gKnoNjx5WdEq6aE"); //6vFNtK3uopAUxJ4AhXbsfKyb9JZPkKnPvkFXEpUwNSEc, 57ZASAqcrm2ErhB9cJ5eBJWNWxu2B7xiy1BqMwYN6ywT
const BUY_IN = new PublicKey("5uHMpZkSyXmERUusARBzf6ACAam9u3EXYa9EA7VW5t2B"); //7xHzX2a5VzBkRayf1uyVPTLmwNwNE2Hh4qS1CbEAjPsJ, bdmYHm1gmB1QRELBAfBbGu2aNm2uzHGjotLM7ye58Dg
const CASH_OUT = new PublicKey("HnT1pk8zrLfQ36LjhGXVdG3UgcHQXQdFxdAWK26bw5bS"); //8x4pQTDyoRe49NLiASjebyasW2shv1pRMCTwngSB5ari

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
    removal: BN;
    target_x: number;
    target_y: number;
}


type ActiveGame = {
    worldPda: PublicKey;
    worldId: BN;
    name: string;
    active_players: number;
    max_players: number;
    size: number;
  };

const App: React.FC = () => {
    //let { connection } =  useConnection();
    const  connection =  new Connection("https://devnet.helius-rpc.com/?api-key=cba33294-aa96-414c-9a26-03d5563aa676"); //"https://devnet.helius-rpc.com/?api-key=cba33294-aa96-414c-9a26-03d5563aa676"); 
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
      const [enpointDone, setEndpointDone] = useState<boolean>(false);
      useEffect(() => {
        const checkEndpoints = async () => {
          const results: Record<string, number> = {};
          setEndpointDone(false);
          for (const endpoint of endpoints) {
            const pingTime = await pingEndpoint(endpoint);
            results[endpoint] = pingTime;
          }
    
          // Set the endpoint with the lowest ping
          const lowestPingEndpoint = Object.keys(results).reduce((a, b) => (results[a] < results[b] ? a : b));
          setFastestEndpoint(lowestPingEndpoint);
          // Construct the wsEndpoint by replacing "https" with "wss"
          const wsUrl = lowestPingEndpoint.replace("https", "wss");
        };
    
        checkEndpoints();
      }, []);
      
    useEffect(() => {
      if (publicKey) {
        setSavedPublicKey(publicKey); // Save publicKey to the state variable when it updates
      }
    }, [publicKey]);

    const [wallet] = useState<Keypair>(() => Keypair.generate());
      
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
    const [playersLists, setPlayersLists] = useState<PublicKey[][]>([]);
    const [playersListsLen, setPlayersListsLen] = useState<number[]>([]);
    const [allplayers, setAllPlayers] = useState<Blob[]>([]);
    const [leaderboard, setLeaderboard] = useState<Blob[]>([]);
    const [foodListLen, setFoodListLen] = useState<number[]>([]);
    const [allFood, setAllFood] = useState<Food[][]>([]);
    const [visibleFood, setVisibleFood] = useState<Food[][]>([]);
    const [currentPlayer, setCurrentPlayer] = useState<Blob | null>(null);
    const [playerName, setPlayerName] = useState("unnamed");
    const [expandlist, setexpandlist] = useState(false);
    const [newGameCreated, setNewGameCreated] = useState<ActiveGame | null>(null);
    const [currentTPS, setCurrentTPS] = useState(0);
    const [price, setPrice] = useState(0);
    const scale = 1;
    const [screenSize, setScreenSize] = useState({width: 2000,height: 2000}); //530*3,300*3
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [transactionError, setTransactionError] = useState<string | null>(null);
    const [transactionSuccess, setTransactionSuccess] = useState<string | null>(null);
    const endpointToWorldMap: Record<string, { worldId: anchor.BN; worldPda: PublicKey }> = {
        "https://supersize-sin.magicblock.app": {
          worldId: new anchor.BN(1355),
          worldPda: new PublicKey('HfKR5HQupLdpnM7EREJPBK3nh13fRpe8ji61ParfTaVv'),
        },
        "https://supersize.magicblock.app": {
          worldId: new anchor.BN(1339),
          worldPda: new PublicKey('2tNAqh9kTgdVYS9eVFacVbAXgiwSL43k7bkJgCByoxky'),
        },
        "https://supersize-fra.magicblock.app": {
          worldId: new anchor.BN(1357),
          worldPda: new PublicKey('6kofJDbfA4DCaX6D7ev2gKa67Ko9C8CioWbp8wdYzyy6'),
        },
      };
    const [activeGames, setActiveGames] = useState<ActiveGame[]>([]);

    useEffect(() => {
        if (fastestEndpoint) {
          const wsUrl = fastestEndpoint.replace("https", "wss");
          providerEphemeralRollup.current = new anchor.AnchorProvider(
            new anchor.web3.Connection(fastestEndpoint, {
              wsEndpoint: wsUrl,
            }),
            new NodeWallet(wallet)
          );
      
          console.log('Updated providerEphemeralRollup:', providerEphemeralRollup.current);
          const { worldId, worldPda } = endpointToWorldMap[fastestEndpoint];
          setActiveGames([{ worldId: worldId, worldPda: worldPda} as ActiveGame]);
          setEndpointDone(true);
          console.log(fastestEndpoint);
        }
      }, [fastestEndpoint]); 

    const [openGameInfo, setOpenGameInfo] = useState<boolean[]>(new Array(activeGames.length).fill(false));
    let entityMatch = useRef<PublicKey | null>(null);
    let playerEntities = useRef<PublicKey[]>([]);
    let playerListEntities = useRef<PublicKey[]>([]);
    let foodEntities = useRef<PublicKey[]>([]);
    let currentPlayerEntity = useRef<PublicKey | null>(null);
    let currentWorldId = useRef<PublicKey | null>(null);
    let anteroomEntity = useRef<PublicKey | null>(null);
    const [gameId, setGameId] = useState<PublicKey | null>(null);
    
    const [exitHovered, setExitHovered] = useState(false);

    const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setPlayerName(event.target.value);
    };

    let playersComponentSubscriptionId = useRef<number[] | null>([]);
    let playersListsComponentSubscriptionId = useRef<number[] | null>([]);
    let foodComponentSubscriptionId = useRef<number[] | null>([]);
    let myplayerComponentSubscriptionId = useRef<number | null>(null);
    let mapComponentSubscriptionId= useRef<number | null>(null);

    // Use useRef for persisting values without causing re-renders
    const playersComponentClient = useRef<Program | null>(null);
    const mapComponentClient = useRef<Program | null>(null);
    const foodComponentClient = useRef<Program | null>(null); 
    const playersListsClient = useRef<Program | null>(null); 

    const [isMouseDown, setIsMouseDown] = useState(false);
    const [mousePosition, setMousePosition] = useState({x: 0,y: 0});
    
    const [panelContent, setPanelContent] = useState<JSX.Element | null>(null);
    const [buildViewerNumber, setbuildViewerNumber] = useState(0);
    const [isHovered, setIsHovered] = useState([false,false,false,false,false,false]);

   const [gameEnded, setGameEnded] = useState(0);
   const [playerCashout, setPlayerCashout] = useState(0);
   const [playerTax, setPlayerTax] = useState(0);
   const [cashoutTx, setCashoutTx] = useState<string| null>(null);
   const [playerCashoutAddy, setPlayerCashoutAddy] = useState<PublicKey| null>(null);
   const [nextFood, setNextFood] = useState({x: -1,y: -1});

    const openDocs = useCallback(() => {
        window.open('https://docs.supersize.app/', '_blank');
    }, []); 
    const openX = useCallback(() => {
        window.open('https://x.com/SUPERSIZEgg', '_blank');
    }, []); 


    const getComponentsClientBasic = useCallback(async (component: PublicKey): Promise<Program> => {
        const idl = await Program.fetchIdl(component);
        if (!idl) throw new Error('IDL not found');
        return new Program(idl, provider);
    }, [provider]); 

    const getComponentsClient = useCallback(async (component: PublicKey): Promise<Program> => {
        const idl = await Program.fetchIdl(component);
        if (!idl) throw new Error('IDL not found');
        return new Program(idl, providerEphemeralRollup.current);
    }, [providerEphemeralRollup.current]);

    const updateFoodList = useCallback((section: any, food_index: number) => {
        const foodArray = section.food as any[];  
        const visibleFood: Food[] = [];
        const foodData: Food[] = [];
        foodArray.forEach((foodItem) => {
            foodData.push({ x: foodItem.x, y: foodItem.y });
            if (currentPlayer) {
                const halfWidth = screenSize.width / 2;
                const halfHeight = screenSize.height / 2;
                const diffX = (foodItem.x - currentPlayer.x);
                const diffY = (foodItem.y - currentPlayer.y);
                if (Math.abs(diffX) <= halfWidth && Math.abs(diffY) <= halfHeight) {
                    visibleFood.push({
                        x: diffX + screenSize.width / 2,
                        y: diffY + screenSize.height / 2
                    } as Food);
                }
            }
        });
        if(foodData.length>0){
            setAllFood((prevAllFood) => {
                return prevAllFood.map((foodArray, index) =>
                food_index === index ? foodData : foodArray
                );
            });
            setFoodListLen((prevFoodListLen) => {
                const updatedFoodListLen = [...prevFoodListLen];
                updatedFoodListLen[food_index] = foodData.length;
                return updatedFoodListLen;
              });
        }
    }, [setAllFood, screenSize, currentPlayer]);

    const updateLeaderboard = useCallback((players: any[]) => {
        const top10Players = players
        .sort((a, b) => b.score - a.score) 
        .slice(0, 10)
        .map(player => ({ 
            name: player.name,
            authority: player.authority,
            x: player.x,
            y: player.y,
            radius: 4 + Math.sqrt(player.mass / 10) * 6,
            mass: player.mass,
            score: player.score,
            speed: player.speed,
            removal: player.scheduledRemovalTime,
            target_x: player.target_x,
            target_y: player.target_y,
        }));
        setLeaderboard(top10Players);

        if (currentPlayer){
            const sortedPlayers = players
            .sort((a, b) => b.score - a.score);
            const currentPlayerRank = sortedPlayers.findIndex(
                player => player.authority.equals(currentPlayer.authority)
            ); 
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
        const statusElement = document.getElementById('status');
        if (statusElement) {
          statusElement.innerHTML = status;
        }
      }, [setLeaderboard,leaderboard]); 

      
    const updateMyPlayerCashout = useCallback((player: any) => {
        setPlayerCashout(player.score);
        setPlayerTax(player.tax);
    }, [setCurrentPlayer, playerKey, allFood]);

    const updateMyPlayer = useCallback((player: any) => {
        console.log(player);
        if(player && player.score != 0){
            setPlayerCashout(player.score);
            setPlayerTax(player.tax);
            setPlayerCashoutAddy(player.payoutTokenAccount)
        }
        setCurrentPlayer({ 
            name: player.name, 
            authority: player.authority,
            x: player.x,
            y: player.y,
            radius: 4 + Math.sqrt(player.mass / 10) * 6,
            mass: player.mass,
            score: player.score,
            speed: player.speed,
            removal: player.scheduledRemovalTime,
            target_x: player.targetX,
            target_y: player.targetY,
            } as Blob);
    }, [setCurrentPlayer, playerKey, allFood]);

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
                        radius: 4 + Math.sqrt(playerx.mass / 10) * 6,
                        mass: playerx.mass,
                        score: playerx.score,
                        speed: playerx.speed,
                        removal: playerx.removal,
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

    const updatePlayersList = useCallback((players: any, players_index: number) => {
        const playerArray = players.playerkeys as any[];
        const playerData: PublicKey[] = [];
        playerArray.forEach((playerItem) => {
            playerData.push(playerItem);
        });
        setPlayersLists((prevPlayersList) => {
            const updatedPlayersList = [...prevPlayersList];
            updatedPlayersList[players_index] = playerArray;
            return updatedPlayersList;
        });
        setPlayersListsLen((prevPlayersListLen) => {
            const updatedPlayersListLen = [...prevPlayersListLen];
            
            updatedPlayersListLen[players_index] = playerData.length;
            
            return updatedPlayersListLen;
            });
        
    },[setPlayers, setCurrentPlayer, playerKey]);

    useEffect(() => {
        let current_players = playersLists.flat();
        const playerEntityIds = current_players.map((player, index) => {
            const seed = player.toString().substring(0, 7);
            const newPlayerEntityPda = FindEntityPda({
                worldId: activeGames[0].worldId,
                entityId: new anchor.BN(0),
                seed: seed,
            });
            return newPlayerEntityPda;
        });

        setAllPlayers((prevPlayers) => {
            const filteredPlayers = prevPlayers.filter(prevPlayer =>
                current_players.some(player => prevPlayer?.authority && player.toString() == prevPlayer.authority.toString())
            );
            return filteredPlayers; 
             });

        playerEntities.current = playerEntityIds;
    }, [playersLists, currentPlayer]);

    const updateMap = useCallback((map: any) => {
        const playerArray = map.players as any[];
        if(activeGames[0]){
        if(map.nextFood){
            setNextFood({x: map.nextFood.x, y: map.nextFood.y});
        }
        }
    }, [setPlayers, setCurrentPlayer, playerKey, allFood]);

    const updatePlayers = useCallback((player: any) => {
        if (currentPlayer && player && player.authority && currentPlayer.authority) {
                setAllPlayers((prevPlayers) => {
                    const playerIndex = prevPlayers.findIndex(p => p.authority.equals(player.authority));
                    const newPlayer: Blob = {
                        name: player.name,
                        authority: player.authority,
                        x: player.x,
                        y: player.y,
                        radius: 4 + Math.sqrt(player.mass / 10) * 6,
                        mass: player.mass,
                        score: player.score,
                        speed: player.speed,
                        removal: player.removal,
                        target_x: player.targetX,
                        target_y: player.targetY,
                    }; 
                    if(player.scheduledRemovalTime){
                        newPlayer.removal = player.scheduledRemovalTime;
                    }
                    if (playerIndex !== -1) {
                        const updatedPlayers = [...prevPlayers];
                        updatedPlayers[playerIndex] = newPlayer
                        return updatedPlayers;
                    } else {
                        return [...prevPlayers, newPlayer];
                    }
                });
            
        }
    }, [setAllPlayers, screenSize, currentPlayer]);
    
    const handlePlayersComponentChange = useCallback((accountInfo: AccountInfo<Buffer>) => {
        const parsedData = playersComponentClient.current?.coder.accounts.decode("player", accountInfo.data);
        updatePlayers(parsedData);
    }, [updatePlayers]);

    const handleFoodComponentChange = useCallback((accountInfo: AccountInfo<Buffer>, index: number) => {
        const parsedData = foodComponentClient.current?.coder.accounts.decode("section", accountInfo.data);
        updateFoodList(parsedData, index);
    }, [updateFoodList]);

    const handleMyPlayerComponentChange = useCallback((accountInfo: AccountInfo<Buffer>) => {
        const parsedData = playersComponentClient.current?.coder.accounts.decode("player", accountInfo.data);
        updateMyPlayer(parsedData);
    }, [updateMyPlayer]);


    const handleMapComponentChange = useCallback((accountInfo: AccountInfo<Buffer>) => {
        const parsedData = mapComponentClient.current?.coder.accounts.decode("map", accountInfo.data);
        updateMap(parsedData);
    }, [updateMap]);

    const handlePlayersListComponentChange = useCallback((accountInfo: AccountInfo<Buffer>, index: number) => {
        const parsedData = playersListsClient.current?.coder.accounts.decode("players", accountInfo.data);
        updatePlayersList(parsedData, index);
    }, [updatePlayersList]);

    // Subscribe to the game state
    const subscribeToGame = useCallback(async (): Promise<void> => {
        if (!entityMatch.current) return;
        if (!currentPlayerEntity.current) return;

        playersComponentClient.current = await getComponentsClient(PLAYER_COMPONENT);
        foodComponentClient.current = await getComponentsClient(FOOD_COMPONENT);
        mapComponentClient.current = await getComponentsClient(MAP_COMPONENT);
        playersListsClient.current = await getComponentsClient(PLAYERS_COMPONENT);

        if (mapComponentSubscriptionId && mapComponentSubscriptionId.current) await  providerEphemeralRollup.current.connection.removeAccountChangeListener(mapComponentSubscriptionId.current);
        if (myplayerComponentSubscriptionId && myplayerComponentSubscriptionId.current) await  providerEphemeralRollup.current.connection.removeAccountChangeListener(myplayerComponentSubscriptionId.current);
        for (let i = 0; i < foodEntities.current.length; i++) {
            if (foodComponentSubscriptionId && foodComponentSubscriptionId.current) await  providerEphemeralRollup.current.connection.removeAccountChangeListener(foodComponentSubscriptionId.current[i]);
        }
        for (let i = 0; i < playerListEntities.current.length; i++) {
            if (playersListsComponentSubscriptionId && playersListsComponentSubscriptionId.current) await  providerEphemeralRollup.current.connection.removeAccountChangeListener(playersListsComponentSubscriptionId.current[i]);
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

        for (let i = 0; i < playerListEntities.current.length; i++) {
            const playerListComponenti = FindComponentPda({
                componentId: PLAYERS_COMPONENT,
                entity: playerListEntities.current[i],
            });
            if (playersListsComponentSubscriptionId.current === null) {
                playersListsComponentSubscriptionId.current = [providerEphemeralRollup.current.connection.onAccountChange(playerListComponenti, (accountInfo) => handlePlayersListComponentChange(accountInfo, i), 'processed')];
            } else {
                playersListsComponentSubscriptionId.current = [...playersListsComponentSubscriptionId.current, providerEphemeralRollup.current.connection.onAccountChange(playerListComponenti, (accountInfo) => handlePlayersListComponentChange(accountInfo, i), 'processed')];
            }
        }  

        for (let i = 0; i < playerEntities.current.length; i++) {
        const playersComponenti = FindComponentPda({
            componentId: PLAYER_COMPONENT,
            entity: playerEntities.current[i],
        });
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
         (playersComponentClient.current?.account as any).player.fetch(myplayerComponent, "processed").then(updateMyPlayer).catch((error: any) => {
            console.error("Failed to fetch account:", error);
         });
        for (let i = 0; i < foodEntities.current.length; i++) {
            const foodComponenti = FindComponentPda({
                componentId: FOOD_COMPONENT,
                entity: foodEntities.current[i],
            });
             (foodComponentClient.current?.account as any).section
             .fetch(foodComponenti, "processed")
             .then((fetchedData: any) => updateFoodList(fetchedData, i))
             .catch((error: any) => {
             });
        }
        
        for (let i = 0; i < playerListEntities.current.length; i++) {
            const playersListComponenti = FindComponentPda({
                componentId: PLAYERS_COMPONENT,
                entity: playerListEntities.current[i],
            });
             (playersListsClient.current?.account as any).players
             .fetch(playersListComponenti, "processed")
             .then((fetchedData: any) => updatePlayersList(fetchedData, i))
             .catch((error: any) => {
             });
        }

        for (let i = 0; i < playerEntities.current.length; i++) {
            const playersComponenti = FindComponentPda({
                componentId: PLAYER_COMPONENT,
                entity: playerEntities.current[i],
            });
            console.log( i, playerEntities.current[i]);
            console.log('player component', playersComponenti);
            (playersComponentClient.current?.account as any).player.fetch(playersComponenti, "processed").then(updatePlayers).catch((error: any) => {
                console.error("Failed to fetch account:", error);
             });
        }    
        
        const mapComponent = FindComponentPda({
            componentId: MAP_COMPONENT,
            entity: entityMatch.current,
        });
        mapComponentSubscriptionId.current = providerEphemeralRollup.current.connection.onAccountChange(mapComponent, handleMapComponentChange, 'processed');
        (mapComponentClient.current?.account as any).map.fetch(mapComponent, "processed").then(updateMap).catch((error: any) => {
            console.error("Failed to fetch account:", error);
         });
    }, [connection, handlePlayersComponentChange, handleMyPlayerComponentChange,handleFoodComponentChange, handleMapComponentChange, updatePlayers, updateFoodList, updateMap, updateMyPlayer]);

    const handleGameIdChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = event.target.value;
        try {
            setGameId(new PublicKey(newValue));
        } catch {
        }
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

    /**
     * Create a new game transaction
     */
    const newGameTx = useCallback(async (width: number, height: number, entry_fee: number, max_players: number, emit_type: number, emit_data: number, frozen: boolean, game_name: string) => {
        if (!publicKey) throw new WalletNotConnectedError();

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
        
        const newfoodEntityPdas: any[] = [];
        const newfoodComponentPdas: any[] = [];
        for (let i = 1; i < 5; i++) {
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
        const signaturefoodmap = await submitTransactionUser(transaction);
        console.log(
            `Food+map entity signature: ${signaturefoodmap}`
        );

        const newplayerEntityPdas: any[] = [];
        const newplayerComponentPdas: any[] = [];
        const playercomponentstransaction = new anchor.web3.Transaction();
        for (let i = 1; i < 4; i++) {
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
        }

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
        playercomponentstransaction.add(addAnteEntityIx);
        const signatureplayerscomponents = await submitTransactionUser(playercomponentstransaction);
        console.log(
            `Players + anteroom entity signature: ${signatureplayerscomponents}`
        );

        const initeverycomponenttransaction = new anchor.web3.Transaction();
        const initMapIx = await InitializeComponent({
            payer: publicKey,
            entity: newmapentityPda,
            componentId: MAP_COMPONENT,
        });

        initeverycomponenttransaction.add(initMapIx.transaction);

        for (const foodPda of newfoodEntityPdas) {
            const initComponent = await InitializeComponent({
                payer: publicKey,
                entity: foodPda,
                componentId: FOOD_COMPONENT,
              });
              initeverycomponenttransaction.add(initComponent.transaction);
            newfoodComponentPdas.push(initComponent.componentPda);
        }
        const signature1 = await submitTransactionUser(initeverycomponenttransaction);
        console.log(
            `Init food + map component signature: ${signature1}`
        );

        const initallplayerscomponenttransaction = new anchor.web3.Transaction();
        for (const playerPda of newplayerEntityPdas) {
            const initPlayerComponent = await InitializeComponent({
                payer: publicKey,
                entity: playerPda,
                componentId: PLAYERS_COMPONENT,
              });
              initallplayerscomponenttransaction.add(initPlayerComponent.transaction);
            newplayerComponentPdas.push(initPlayerComponent.componentPda);
        }

        const initAnteIx = await InitializeComponent({
            payer: publicKey,
            entity: newanteentityPda,
            componentId: ANTEROOM_COMPONENT,
        });
        initallplayerscomponenttransaction.add(initAnteIx.transaction);
        const signatureinitplayers = await submitTransactionUser(initallplayerscomponenttransaction);
        console.log(
            `Init players + anteroom component signature: ${signatureinitplayers}`
        );

        //set up vault
        const decimals = 9;
        let vault_program_id = new PublicKey("HnT1pk8zrLfQ36LjhGXVdG3UgcHQXQdFxdAWK26bw5bS");
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
          for (const foodPda of newfoodEntityPdas) {
            // Perform operations on each foodPda
            const initFood = await ApplySystem({
                authority: publicKey,
                world: worldPda,
                entities: [
                    {
                        entity: foodPda,
                        components: [{ componentId:FOOD_COMPONENT}],
                      },
                      {
                        entity: newmapentityPda,
                        components: [{ componentId:MAP_COMPONENT }],
                      },
                ],
                systemId: INIT_FOOD,
              });
              inittransaction.add(initFood.transaction);
            }
        const signature = await submitTransactionUser(inittransaction); 
        console.log(
            `Init func game + food signature: ${signature}`
        );

        const initplayertransaction = new anchor.web3.Transaction();
        for (const playerPda of newplayerEntityPdas) {
            const initPlayer = await ApplySystem({
                authority: publicKey,
                world: worldPda,
                entities: [
                    {
                        entity: playerPda,
                        components: [{ componentId:PLAYERS_COMPONENT}],
                      },
                      {
                        entity: newmapentityPda,
                        components: [{ componentId:MAP_COMPONENT }],
                      },
                ],
                systemId: INIT_PLAYERS,
              });
              initplayertransaction.add(initPlayer.transaction);
            }

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
              initplayertransaction.add(initAnteroom.transaction);
        const signatureplayerdinited = await submitTransactionUser(initplayertransaction); 
        console.log(
            `Init func players + anteroom signature: ${signatureplayerdinited}`
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
        
        const delsignature2 = await submitTransaction(playertx, "confirmed", true); 
        console.log(
            `Delegation signature food: ${delsignature2}`
        );

        const realplayertx = new anchor.web3.Transaction();

        newplayerEntityPdas.forEach((playerEntityPda, index) => {
            const playerdelegateIx = createDelegateInstruction({
                entity: playerEntityPda,
                account: newplayerComponentPdas[index],
                ownerProgram: PLAYERS_COMPONENT,
                payer: playerKey,
                });
                realplayertx.add(playerdelegateIx);
        });
        
        const delsignature3 = await submitTransaction(realplayertx, "confirmed", true);
        console.log(
            `Delegation signature players: ${delsignature3}`
        );

        if (signature != null) {
            const newGameInfo : ActiveGame = {worldId: initNewWorld.worldId, worldPda: initNewWorld.worldPda, name: game_name, active_players: 0, max_players: max_players, size: width}
            console.log('new game info', newGameInfo.worldId,newGameInfo.worldPda.toString())
            setNewGameCreated(newGameInfo);
            const copiedActiveGameIds: ActiveGame[] = [...activeGames];
            copiedActiveGameIds.push(newGameInfo);  
            setActiveGames(copiedActiveGameIds);
        }
    }, [playerKey, connection]);

    /**
     * Create a new join game transaction
     */
    const joinGameTx = useCallback(async (selectGameId: ActiveGame) => {
        if (!playerKey) throw new WalletNotConnectedError();
        if (!publicKey) throw new WalletNotConnectedError();
        if (isSubmitting) return null;
        setScreenSize({width:selectGameId.size, height:selectGameId.size});
        const gameInfo = selectGameId; 

        const mapseed = "origin"; 
        const mapEntityPda = FindEntityPda({
            worldId: gameInfo.worldId,
            entityId: new anchor.BN(0),
            seed: mapseed
        })
        const mapComponentPda = FindComponentPda({
            componentId: MAP_COMPONENT,
            entity: mapEntityPda,
        });
        
        const anteseed = "ante"; 
        const anteEntityPda = FindEntityPda({
            worldId: gameInfo.worldId,
            entityId: new anchor.BN(0),
            seed: anteseed
        })
        const anteComponentPda = FindComponentPda({
            componentId: ANTEROOM_COMPONENT,
            entity: anteEntityPda,
        });
        const anteComponentClient= await getComponentsClient(ANTEROOM_COMPONENT);
        const anteacc = await provider.connection.getAccountInfo(
            anteComponentPda, "processed"
        );
        
        let token_account_owner_pda = new PublicKey(0);
        let vault_token_account = new PublicKey(0);
        let mint_of_token_being_sent = new PublicKey(0);
        let sender_token_account = new PublicKey(0);
        let payout_token_account = new PublicKey(0);
        let vault_program_id = new PublicKey("HnT1pk8zrLfQ36LjhGXVdG3UgcHQXQdFxdAWK26bw5bS");

        if(anteacc){
            const anteParsedData = anteComponentClient.coder.accounts.decode("anteroom", anteacc.data);
            vault_token_account = anteParsedData.vaultTokenAccount;
            mint_of_token_being_sent = anteParsedData.token;
            let usertokenAccountInfo = await getAssociatedTokenAddress(
                mint_of_token_being_sent,        
                publicKey       
              ); 
            payout_token_account = usertokenAccountInfo;
            const playerTokenAccount = await getAssociatedTokenAddress(mint_of_token_being_sent, playerKey);
            sender_token_account = playerTokenAccount;
            const createTokenAccountTx = createAssociatedTokenAccountInstruction(
                    publicKey,
                    playerTokenAccount,
                    playerKey,
                    mint_of_token_being_sent,
            );
            const transferIx = createTransferInstruction(
                usertokenAccountInfo,
                playerTokenAccount,
                publicKey,
                buyIn * 10 ** anteParsedData.tokenDecimals,
                [],
                splToken.TOKEN_PROGRAM_ID,
            );
            const soltransfertx = SystemProgram.transfer({
                fromPubkey: publicKey,
                toPubkey: playerKey,
                lamports: 0.01 * LAMPORTS_PER_SOL, 
            });
            const combinedTx = new Transaction().add(soltransfertx)
            .add(createTokenAccountTx).add(transferIx); 
            const createwalletsig = await submitTransactionUser(combinedTx);
        }

        entityMatch.current = mapEntityPda;
        const foodEntityPdas: any[] = [];
        let targetfoodid = 0;
        let lowestfood = 100;
        for (let i = 1; i < 5; i++) {
            const foodseed = i.toString().repeat(20);
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

        const playerEntityPdas: any[] = [];
        let totalplayers = 0;
        let targetplayersid = 0;
        const playersPerList: number[] = [];
        let lowestplayers = 10;
        for (let i = 1; i < 4; i++) {
            const playerentityseed = 'player' + i.toString();
            const playerEntityPda =  FindEntityPda({
                worldId: gameInfo.worldId,
                entityId: new anchor.BN(0),
                seed: playerentityseed
            })
            playerEntityPdas.push(playerEntityPda);
            const playersComponentPda = FindComponentPda({
                componentId: PLAYERS_COMPONENT,
                entity: playerEntityPda,
            });
            const playersListsClient = await getComponentsClient(PLAYERS_COMPONENT);
            const playersacc = await providerEphemeralRollup.current.connection.getAccountInfo(
                playersComponentPda, "processed"
            );
            if(playersacc){
                const playersParsedData = playersListsClient.coder.accounts.decode("players", playersacc.data);
                totalplayers = totalplayers + playersParsedData.playerkeys.length;
                playersPerList.push(playersParsedData.playerkeys.length);
            }else{
                playersPerList.push(0);
            }
        }
        targetplayersid = playersPerList.indexOf(0) !== -1 
            ? playersPerList.indexOf(0) 
            : playersPerList.reduce((lowestIndex, currentValue, currentIndex, arr) => 
                currentValue < arr[lowestIndex] ? currentIndex : lowestIndex, 0);
        console.log(totalplayers, targetplayersid)
    
            const playerseed = playerKey.toString().substring(0, 7); 
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
            const initComponent = await InitializeComponent({
                payer: playerKey,
                entity: newplayerEntityPda,
                componentId: PLAYER_COMPONENT,
              });
              tx.add(initComponent.transaction);
              const playercomponentsignature = await submitTransaction(tx, "confirmed", true); 
              console.log(
                  `Init player component signature: ${playercomponentsignature}`
              );


                console.log('vault', vault_token_account.toString(), 'sender', sender_token_account.toString());
                const applyBuyInSystem = await ApplySystem({
                    authority: playerKey,
                    world: gameInfo.worldPda,
                    entities: [
                      {
                        entity: newplayerEntityPda,
                        components: [{ componentId:PLAYER_COMPONENT}],
                      },
                      {
                        entity: anteEntityPda,
                        components: [{ componentId:ANTEROOM_COMPONENT }],
                      },
                    ], 
                    systemId: BUY_IN,
                    args: {
                        buyin: buyIn,
                    },
                    extraAccounts: [
                        {
                          pubkey: vault_token_account,
                          isWritable: true,
                          isSigner: false,
                        },
                        {
                          pubkey: sender_token_account,
                          isWritable: true,
                          isSigner: false,
                        },
                        {
                            pubkey: payout_token_account,
                            isWritable: true,
                            isSigner: false,
                          },
                        {
                          pubkey: playerKey,
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
                      ],
                  });
                const buyintx = new anchor.web3.Transaction().add(applyBuyInSystem.transaction);
                const buyinsignature = await submitTransaction(buyintx, "confirmed", true);
                console.log(
                    `buy in signature: ${buyinsignature}`
                );

                const playerdeltx = new anchor.web3.Transaction();
                const playerComponentPda = FindComponentPda({
                    componentId: PLAYER_COMPONENT,
                    entity: newplayerEntityPda,
                });
                const playerdelegateIx = createDelegateInstruction({
                entity: newplayerEntityPda,
                account: playerComponentPda,
                ownerProgram: PLAYER_COMPONENT,
                payer: playerKey,
                });
                playerdeltx.add(playerdelegateIx)
                const playerdelsignature = await submitTransaction(playerdeltx, "confirmed", true); //provider.sendAndConfirm(playertx, [], { skipPreflight: true, commitment: 'finalized' }); 
                console.log(
                    `Delegation signature: ${playerdelsignature}`
                );

            const applySystem = await ApplySystem({
                authority: playerKey,
                world: gameInfo.worldPda,
                entities: [
                  {
                    entity: newplayerEntityPda,
                    components: [{ componentId:PLAYER_COMPONENT}],
                  },
                  {
                    entity: mapEntityPda,
                    components: [{ componentId:MAP_COMPONENT }],
                  },
                  {
                    entity: playerEntityPdas[targetplayersid],
                    components: [{ componentId:PLAYERS_COMPONENT}],
                  },
                ], 
                systemId: JOIN_GAME,
                args: {
                    name: playerName,
                    //buyin: 1.0,
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
            ).catch((error) => {
                   console.log(error)
            });
            //const signature = await providerEphemeralRollup.current.sendAndConfirm(applySystem.transaction);   
            console.log(signature,transaction, walletRef.current.toString(), playerKey.toString())

            if (signature != null) {
                setGameId(mapEntityPda); 
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
                anteroomEntity.current = anteEntityPda;
                currentWorldId.current = gameInfo.worldPda;
                foodEntities.current = foodEntityPdas;
                playerListEntities.current = playerEntityPdas;
                setAllFood(new Array(foodEntityPdas.length).fill([]));
                setFoodListLen(new Array(foodEntityPdas.length).fill(0));
                processNewFoodTransaction();
                await subscribeToGame(); 
            }
        
    }, [playerKey, submitTransaction, subscribeToGame]);

    function findListIndex(pubkey: PublicKey): number | null {
        for (let i = 0; i < playersLists.length; i++) {
            const sublist = playersLists[i];
            if (sublist.some((key) => key.toString() == pubkey.toString())) { 
                return i; 
            }
        }
        return null; 
    }

    const preExitGameTx = useCallback(async () => {
        if (!playerKey) throw new WalletNotConnectedError();
        if (gameId == null) setTransactionError("Not connected to game");
        if(currentWorldId.current==null){
            throw new Error("world not found");
        }
        const player_entity = currentPlayerEntity.current as PublicKey;
        const map_entity = entityMatch.current as PublicKey;
        let myPlayersListIndex = null;
        if(currentPlayer){
            myPlayersListIndex = findListIndex(currentPlayer?.authority);
        }
        if(myPlayersListIndex == null){
            throw new Error("PublicKey not found in any list.");
        }
        const applySystem = await ApplySystem({
            authority: playerKey,
            world: currentWorldId.current,
            entities: [
              {
                entity: player_entity,
                components: [{ componentId: PLAYER_COMPONENT }],
              },
              {
                entity: map_entity,
                components: [{ componentId: MAP_COMPONENT }],
              },
              {
                entity: playerListEntities.current[myPlayersListIndex],
                components: [{ componentId:PLAYERS_COMPONENT}],
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
        console.log('staged exit')
        const signature = await providerEphemeralRollup.current.connection.sendRawTransaction(
            transaction.serialize(), 
            { skipPreflight: true } 
        );
    }, [playerKey, submitTransaction, subscribeToGame]);

    const exitGameTx = useCallback(async () => {
        if (!playerKey) throw new WalletNotConnectedError();
        if (gameId == null) setTransactionError("Not connected to game");
        if(currentWorldId.current==null){
            throw new Error("world not found");
        }
        const player_entity = currentPlayerEntity.current as PublicKey;
        const map_entity = entityMatch.current as PublicKey;
        let myPlayersListIndex = null;
        if(currentPlayer){
            myPlayersListIndex = findListIndex(currentPlayer?.authority);
        }
        if(myPlayersListIndex == null){
            throw new Error("PublicKey not found in any list.");
        }
        const applySystem = await ApplySystem({
            authority: playerKey,
            world: currentWorldId.current,
            entities: [
              {
                entity: player_entity,
                components: [{ componentId: PLAYER_COMPONENT }],
              },
              {
                entity: map_entity,
                components: [{ componentId: MAP_COMPONENT }],
              },
              {
                entity: playerListEntities.current[myPlayersListIndex],
                components: [{ componentId:PLAYERS_COMPONENT}],
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
        const signature = await providerEphemeralRollup.current.sendAndConfirm(transaction); 
        console.log('exiting', signature)
        if (signature != null) {
            setGameId(null);
            setGameEnded(2);
        }
        
    }, [playerKey, submitTransaction, subscribeToGame]);

    useEffect(() => {
        const cleanUp = async () => {
                if (
                    currentPlayer &&
                    Math.sqrt(currentPlayer.mass) == 0 &&
                    currentPlayer.x === 50000 &&
                    currentPlayer.y === 50000
                ) {
                    if(currentWorldId.current==null){
                        throw new Error("world not found");
                    }
                    console.log(currentPlayer)
                    if(currentPlayerEntity.current && anteroomEntity.current && entityMatch.current){
                        const myplayerComponent = FindComponentPda({
                            componentId: PLAYER_COMPONENT,
                            entity: currentPlayerEntity.current,
                        });
                        const undelegateIx = createUndelegateInstruction({
                            payer: playerKey,
                            delegatedAccount: myplayerComponent,
                            componentPda: PLAYER_COMPONENT,
                            });
                        const tx = new anchor.web3.Transaction()
                        .add(undelegateIx);
                        if (!walletRef.current) {
                            throw new Error('Wallet is not initialized');
                        } 
                        tx.recentBlockhash = (await providerEphemeralRollup.current.connection.getLatestBlockhash()).blockhash;
                        tx.feePayer = walletRef.current.publicKey;
                        tx.sign(walletRef.current);
                        const playerdelsignature = await providerEphemeralRollup.current.sendAndConfirm(tx, [], { skipPreflight: false });
                        console.log('undelegate', playerdelsignature)
                        
                        const anteComponentPda = FindComponentPda({
                            componentId: ANTEROOM_COMPONENT,
                            entity: anteroomEntity.current,
                        });
                        const anteComponentClient= await getComponentsClient(ANTEROOM_COMPONENT);
                        const anteacc = await provider.connection.getAccountInfo(
                            anteComponentPda, "processed"
                        );
                        const mapComponent = FindComponentPda({
                            componentId: MAP_COMPONENT,
                            entity: entityMatch.current,
                        });

                        let token_account_owner_pda = new PublicKey(0);
                        let vault_token_account = new PublicKey(0);
                        let mint_of_token_being_sent = new PublicKey(0);
                        let sender_token_account = new PublicKey(0);
                        let owner_token_account = new PublicKey(0);
                        let supersize_token_account = new PublicKey(0);
                        let vault_program_id = new PublicKey("HnT1pk8zrLfQ36LjhGXVdG3UgcHQXQdFxdAWK26bw5bS");
                
                        if(anteacc && savedPublicKey){
                            const anteParsedData = anteComponentClient.coder.accounts.decode("anteroom", anteacc.data);
                            vault_token_account = anteParsedData.vaultTokenAccount;
                            mint_of_token_being_sent = anteParsedData.token;
                            owner_token_account = anteParsedData.gamemasterTokenAccount;
                            supersize_token_account = anteParsedData.gamemasterTokenAccount;
                            let usertokenAccountInfo = await getAssociatedTokenAddress(
                                mint_of_token_being_sent,       
                                savedPublicKey     
                              ); 
                            let playerTokenAccount = await getAssociatedTokenAddress(mint_of_token_being_sent, playerKey);
                            sender_token_account = usertokenAccountInfo;
                            if (playerCashoutAddy){
                                sender_token_account = playerCashoutAddy;
                            }
                            let [tokenAccountOwnerPda] = PublicKey.findProgramAddressSync(
                                [Buffer.from("token_account_owner_pda"), mapComponent.toBuffer()],
                                vault_program_id
                                );
                            let newplayersComponentClient = await getComponentsClient(PLAYER_COMPONENT);
                            (newplayersComponentClient.account as any).player.fetch(myplayerComponent, "processed").then(updateMyPlayerCashout).catch((error: any) => {
                                console.error("Failed to fetch account:", error);
                                });
                            console.log('cashout data', sender_token_account.toString(), playerCashoutAddy?.toString());
                            const applyCashOutSystem = await ApplySystem({
                                authority: playerKey,
                                world: currentWorldId.current,
                                entities: [
                                  {
                                    entity: currentPlayerEntity.current,
                                    components: [{ componentId:PLAYER_COMPONENT}],
                                  },
                                  {
                                    entity: anteroomEntity.current,
                                    components: [{ componentId:ANTEROOM_COMPONENT }],
                                  },
                                ], 
                                systemId: CASH_OUT,
                                extraAccounts: [
                                    {
                                      pubkey: vault_token_account,
                                      isWritable: true,
                                      isSigner: false,
                                    },
                                    {
                                      pubkey: sender_token_account,
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
                                        pubkey: tokenAccountOwnerPda,
                                        isWritable: true,
                                        isSigner: false,
                                      },
                                    {
                                      pubkey: playerKey,
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
                                  ],
                              });
                            const cashouttx = new anchor.web3.Transaction().add(applyCashOutSystem.transaction);
                            const cashoutsignature = await submitTransaction(cashouttx, "confirmed", true);
                            console.log('cashout', cashoutsignature);

                            const reclaim_transaction = new Transaction();
                            const playerbalance = await connection.getBalance(playerKey, 'processed');
                            const accountInfo = await getAccount(connection, playerTokenAccount);
                            //console.log(accountInfo)
                            const transfertokens = createTransferInstruction(
                                playerTokenAccount,
                                usertokenAccountInfo,
                                playerKey,
                                accountInfo.amount,
                                [],
                                splToken.TOKEN_PROGRAM_ID,
                            );
                            const closeInstruction = createCloseAccountInstruction(
                                playerTokenAccount,
                                savedPublicKey,
                                playerKey,
                            );
                            const solTransferInstruction = SystemProgram.transfer({
                                fromPubkey: playerKey,
                                toPubkey: savedPublicKey,
                                lamports: playerbalance - 5000,
                            });
                            reclaim_transaction.add(transfertokens);
                            reclaim_transaction.add(closeInstruction);
                            reclaim_transaction.add(solTransferInstruction);
                            const reclaimsig = await submitTransaction(reclaim_transaction, "confirmed", true);
                            console.log("get winnings", reclaimsig, accountInfo.amount, playerbalance);

                            if(reclaimsig){
                                setGameEnded(3);
                                setCashoutTx(reclaimsig);
                            }else{
                                setGameEnded(4);
                            }

                            playersComponentSubscriptionId.current = [];
                            currentPlayerEntity.current = null;
                            entityMatch.current = null;
                            foodEntities.current = [];
                            setPlayers([]);
                            setAllFood([]);
                            setFoodListLen([]);
                        }
                        }

                        setGameId(null);
                        if(gameEnded==0){
                            setGameEnded(1);
                        }
                        
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
        };
        cleanUp();
    }, [gameEnded, gameId]);

    useEffect(() => {
        if(currentPlayer){
        const visibleFood = allFood.map((foodList) => {
            return foodList.reduce<Food[]>((innerAcc, foodItem) => {
                const diffX = foodItem.x - currentPlayer.x;
                const diffY = foodItem.y - currentPlayer.y;
                if (Math.abs(diffX) <= screenSize.width / 2 && Math.abs(diffY) <= screenSize.height / 2) {
                    innerAcc.push({
                        x: foodItem.x - currentPlayer.x + screenSize.width / 2,
                        y: foodItem.y - currentPlayer.y + screenSize.height / 2
                    });
                }
                return innerAcc;
            }, []);
        });        
        setVisibleFood(visibleFood);
        }
    }, [currentPlayer]);

    const handleMovementAndCharging = async () => {
        const processSessionEphemTransaction = async (
            transaction: anchor.web3.Transaction
        ): Promise<string> => {
            const signature = await providerEphemeralRollup.current.connection.sendRawTransaction(
                transaction.serialize(), 
                { skipPreflight: true } 
            );
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
        if (!exitHovered && currentWorldId.current && playerKey && currentPlayer && currentPlayer.authority && entityMatch.current && gameId && currentPlayerEntity.current) {
            try {
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
                            world: currentWorldId.current,
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
                            args: {
                                timestamp: performance.now(),
                            },
                        });
                        alltransaction.add(eatFoodTx.transaction);   
                    }
                }

                let playerstoeat = checkPlayerDistances(players, screenSize);
                if(playerstoeat){
                    const seed = playerstoeat.toString().substring(0, 7);
                    const newPlayerEntityPda = FindEntityPda({
                        worldId: activeGames[0].worldId,
                        entityId: new anchor.BN(0),
                        seed: seed,
                    });
                    let myPlayersListIndex = null;
                    if(currentPlayer){
                        myPlayersListIndex = findListIndex(playerstoeat);
                    }
                    if(myPlayersListIndex != null){
                    const eatPlayerTx = await ApplySystem({ 
                        authority: playerKey,
                        world: currentWorldId.current,
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
                              {
                                entity: playerListEntities.current[myPlayersListIndex],
                                components: [{ componentId:PLAYERS_COMPONENT}],
                              },
                        ],
                        systemId: EAT_PLAYER, 
                        args: {
                            timestamp: performance.now(),
                        },
                    });
                    
                    alltransaction.add(eatPlayerTx.transaction);
                    }
                }

                let current_foodlist = foodListLen.reduce((minIndex, currentValue, currentIndex, array) =>
                    currentValue < array[minIndex] ? currentIndex : minIndex
                , 0);
                const makeMove = await ApplySystem({
                    authority: playerKey,
                    world: currentWorldId.current,
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
                let signature = await processSessionEphemTransaction(alltransaction).catch((error) => {
                    console.log(error)
                });
                
                if (gameId && entityMatch.current) {   
                    setIsSubmitting(false);
                    setTransactionError(null);
                    setTransactionSuccess(null);
                    
                    
                    (playersComponentClient.current?.account as any).player.fetch(myplayerComponent, "processed").then(updateMyPlayer).catch((error: any) => {
                        console.error("Failed to fetch account:", error);
                     });

                    for (let i = 0; i < foodEntities.current.length; i++) {
                        const foodComponenti = FindComponentPda({
                            componentId: FOOD_COMPONENT,
                            entity: foodEntities.current[i],
                        });
                        (foodComponentClient.current?.account as any).section
                        .fetch(foodComponenti, "processed")
                        .then((fetchedData: any) => updateFoodList(fetchedData, i))
                        .catch((error: any) => {
                          //console.error("Failed to fetch account:", error);
                          //food account unpopulated
                        });
                    }
                    
                    const mapComponent = FindComponentPda({
                        componentId: MAP_COMPONENT,
                        entity: entityMatch.current,
                    });
                    (mapComponentClient.current?.account as any).map.fetch(mapComponent, "processed").then(updateMap).catch((error: any) => {
                        console.error("Failed to fetch account:", error);
                     });
 
                     for (let i = 0; i < playerListEntities.current.length; i++) {
                        const playersListComponenti = FindComponentPda({
                            componentId: PLAYERS_COMPONENT,
                            entity: playerListEntities.current[i],
                        });
                         (playersListsClient.current?.account as any).players
                         .fetch(playersListComponenti, "processed")
                         .then((fetchedData: any) => updatePlayersList(fetchedData, i))
                         .catch((error: any) => {
                         });
                    }

                    for (let i = 0; i < playerEntities.current.length; i++) {
                        const playersComponenti = FindComponentPda({
                            componentId: PLAYER_COMPONENT,
                            entity: playerEntities.current[i],
                        });
                        (playersComponentClient.current?.account as any).player.fetch(playersComponenti, "processed").then(updatePlayers).catch((error: any) => {
                            //console.error("Failed to fetch account:", error);
                         });
                    } 
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
        }, 30); 
        
        return () => clearInterval(intervalId);
    }, [gameId, currentPlayer, exitHovered]);

    const checkPlayerDistances = (visiblePlayers: Blob[], screenSize: { width: number, height: number }) => {
        if(currentPlayer?.radius){
            const centerX = screenSize.width / 2;
            const centerY = screenSize.height / 2;
        
            for (const player of visiblePlayers) {
                const distance = Math.sqrt((player.x - centerX) ** 2 + (player.y - centerY) ** 2);
                if (distance < currentPlayer.radius) {
                    return player.authority;
                }
            }
        }
        return null;
    };

    const checkFoodDistances = (visibleFood: { x: number, y: number }[], screenSize: { width: number, height: number }) => {
        if(currentPlayer?.radius){
            const centerX = screenSize.width / 2;
            const centerY = screenSize.height / 2;
            
            return visibleFood.some(food => {
                const distance = Math.sqrt((food.x - centerX) ** 2 + (food.y - centerY) ** 2);
                return distance < currentPlayer.radius;
            });
        }
        return null;
    };
    
    const processNewFoodTransaction = async () => {
        if(currentWorldId.current==null){
            throw new Error("world not found");
        }
        const allTransaction = new anchor.web3.Transaction();
        if(currentPlayerEntity.current && entityMatch.current && currentPlayer){
        try {
            let current_foodlist = foodListLen.reduce((minIndex, currentValue, currentIndex, array) =>
                currentValue < array[minIndex] ? currentIndex : minIndex
            , 0);
            const newFoodTx = await ApplySystem({
                authority: playerKey,
                world: currentWorldId.current,
                entities: [
                    {
                        entity: entityMatch.current,
                        components: [{ componentId: MAP_COMPONENT }],
                    },
                    {
                        entity: foodEntities.current[current_foodlist],
                        components: [{ componentId: FOOD_COMPONENT }],
                    },
                ],  
                systemId: SPAWN_FOOD,
                args: {
                    timestamp: performance.now(),
                },
            });
            const {
                context: { slot: minContextSlot },
                value: { blockhash, lastValidBlockHeight }
            } = await providerEphemeralRollup.current.connection.getLatestBlockhashAndContext();

            if (!walletRef.current) {
                throw new Error('Wallet is not initialized');
            }

            allTransaction.add(newFoodTx.transaction);
            allTransaction.recentBlockhash = blockhash;
            allTransaction.feePayer = walletRef.current.publicKey;
            allTransaction.sign(walletRef.current);
            const signature = await providerEphemeralRollup.current.connection.sendRawTransaction(
                allTransaction.serialize(), 
                { skipPreflight: true }
            );
        } catch (error) {
            console.error("Transaction failed", error);
        }
        }
    };
    useEffect(() => {
        const hasValueLessThan100 = foodListLen.some(value => value < 100);
        if(hasValueLessThan100){
            processNewFoodTransaction(); 
        }
    }, [gameId, nextFood, currentPlayer]);

    useEffect(() => {
        if(entityMatch || gameId){ 
            const handleMouseMove = (event: MouseEvent) => {
                setMousePosition({x:event.clientX, y: event.clientY}); 
            }; 

            const handleMouseDown = (event: MouseEvent) => { 
                setIsMouseDown(true);
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
    }, [playerKey, gameId, entityMatch, currentPlayer, screenSize]);  

    useEffect(() => {
        if(gameId){ 

            const handleMouseMove = (event: MouseEvent) => {
                setMousePosition({x:event.clientX, y: event.clientY}); 
            };  

            const handleMouseDown = (event: MouseEvent) => { 
                setIsMouseDown(true);
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
        
            if (largerRectangle && smallerRectangle) {
                const widthLarger = screenSize.width*scale;
                const heightLarger = screenSize.height*scale;
                const widthSmaller = smallerRectangle.offsetWidth;
                const heightSmaller = smallerRectangle.offsetHeight;
                const deltaX = (widthSmaller / 2) - (widthLarger / 2);
                const deltaY = (heightSmaller / 2) - (heightLarger / 2);        
                largerRectangle.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
            } else {
                console.error('Elements with class name "gameWrapper" or "game" not found.');
            }
        }
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

        const handleClick = (index: number) => {
        setOpenGameInfo(prevState => {
            const newState = [...prevState];
            newState[index] = !newState[index];
            return newState;
        });
        };

        useEffect(() => {
            const fetchAndLogMapData = async () => {
        
                for (let i = 0; i < activeGames.length; i++) {
                    const mapseed = "origin"; 
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
                            const mapParsedData = mapComponentClient.coder.accounts.decode("map", mapacc.data);
                            console.log(`Parsed Data for game ID ${activeGames[i].worldId}:`, mapParsedData);
                            setActiveGames(prevActiveGames => {
                                const updatedGames = prevActiveGames.map(game =>
                                    game.worldId === activeGames[i].worldId && game.worldPda.toString() === activeGames[i].worldPda.toString()
                                        ? { ...game, name: mapParsedData.name, active_players: 0, max_players: mapParsedData.maxPlayers, size: mapParsedData.width  } 

                                        : game
                                );
                                return updatedGames;
                            });
                        } else {
                            console.log(providerEphemeralRollup.current)
                            console.log(`No account info found for game ID ${activeGames[i].worldId}`);
                        }
                    } catch (error) {
                        console.log(`Error fetching map data for game ID ${activeGames[i].worldId}:`, error);
                    }
                }
            };

            fetchAndLogMapData();
        
        }, [openGameInfo, enpointDone]);
        
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
        const scrollableElement = document.querySelector('.info-text-container');
        if (!scrollableElement) return;
        
        const handleScroll = () => {      
          const scrollPosition = scrollableElement.scrollTop / 20;
          const image = document.querySelector('.info-spinning-image') as HTMLImageElement;

          if (image) {
            console.log('Image found:', image); 
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
                  const newGameInfo : ActiveGame = {worldId: worldId.worldId, worldPda: worldPda, name: "test", active_players: 0, max_players: 0, size: 0}
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
    const [buyIn, setBuyIn] = useState(1.0); 

    const handleSliderChange = (event: any) => {
        let value = parseFloat(event.target.value);
        value = value > 10 ? 10 : value;
        value = value > 0.1 ? parseFloat(value.toFixed(1)) : value;
        setBuyIn(value);
    };

    const handleExitClick = () => {
      preExitGameTx();
      setPlayerExiting(true);
  
      const interval = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
  
      setTimeout(() => {
        console.log("Timeout triggered");
        exitGameTx();
        clearInterval(interval);
      }, 6000);
    };
  
    useEffect(() => {
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
          window.addEventListener('touchmove', handleTouchMove); 
        }
      
        return () => {
          if (element) {
            element.removeEventListener('scroll', handleScroll);
            window.removeEventListener('touchmove', handleTouchMove);
          }
        };
      }, [buildViewerNumber]);
    
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1000);

    useEffect(() => {
      const handleResize = () => {
        setIsMobile(window.innerWidth < 1000);
      };
  
      window.addEventListener('resize', handleResize);
  
      return () => {
        window.removeEventListener('resize', handleResize);
      };
    }, []);
    
    return (
        <>
        <div className="supersize">
        <div className="topbar" style={{display: gameId == null && gameEnded == 0 ? 'flex' : 'none',background: buildViewerNumber==1 ? "rgba(0, 0, 0, 0.3)" : "rgb(0, 0, 0)",height: isMobile && buildViewerNumber == 1 ? '20vh' : buildViewerNumber == 1 ? '10vh' : '4vh', zIndex: 9999999}}>
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
                    display: 'flex',
                    marginRight: '1vw',
                    alignItems : "center", 
                    justifyContent:"center",
                    marginTop:"4.5vh",
                    cursor:"pointer",
                }}
                onMouseEnter={() => setIsHovered([true,false,false,false,false])}
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
                        display: 'flex',
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
                    <div className="buyInField">
                        <div className="buyInInfo" style={{marginLeft:"5px", width: "30%", display: "flex", alignItems: "center" }}>
                        <img src={`${process.env.PUBLIC_URL}/Solana_logo.png`} width="20px" height="auto" alt="Image" style={{alignItems:"center", justifyContent: "center"}}/>
                        <div style={{height:"20px", display: 'inline', marginLeft:"8px", marginTop:"3px"}}>SOL</div>
                        </div>
                        <input 
                            className="BuyInText"
                            type="text" 
                            value={buyIn}
                            onChange={handleSliderChange} 
                            placeholder="Enter your name"
                        />
                    </div>
                    <div className="buyInSlider">
                    <input 
                        type="range" 
                        min="0.01" 
                        max="10.01" 
                        step="0.1" 
                        value={buyIn} 
                        onChange={handleSliderChange} 
                        className="slider" 
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
                <span style={{ opacity: 1 }}>{currentPlayer ? currentPlayer.score : null}</span>
            </div>
        </div>

        <div className="game" style={{display: gameId !== null ? 'block' : 'none', height: screenSize.height*scale, width: screenSize.width*scale}}>
                <GameComponent
                gameId={gameId}
                players={players}
                visibleFood={visibleFood.flat()}
                currentPlayer={currentPlayer}
                screenSize={screenSize}
                scale={scale}
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
                        <p className="superExitInfo">Final score: {playerCashout + playerTax}</p>
                        <p className="superExitInfo">Exit tax: {playerTax}</p>
                        <p className="superExitInfo">Payout: {playerCashout}</p>
                        <div style={{display:"flex", alignItems:"center", justifyContent:"center"}}>
                        <a 
                            className="superExitInfo"
                            href={`https://explorer.solana.com/tx/${cashoutTx}?cluster=devnet`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                        >
                            Transaction
                        </a>                     
                        <svg width="52" height="52" viewBox="0 0 38 38" xmlns="http://www.w3.org/2000/svg" stroke="#fff" style={{ display:"inline", marginLeft:"5px", marginTop:"2px", height:"20px", width:"20px"}}>
                            <g fill="none" fillRule="evenodd">
                                <g transform="translate(1 1)" strokeWidth="2">
                                    <circle strokeOpacity=".5" cx="18" cy="18" r="18" />
                                    <path d="M36 18c0-9.94-8.06-18-18-18">
                                        <animateTransform attributeName="transform" type="rotate" from="0 18 18" to="360 18 18" dur="1s" repeatCount="indefinite" />
                                    </path>
                                </g>
                            </g>
                        </svg>
                        </div>
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
                        <p className="superExitInfo">Final score: {playerCashout + playerTax}</p>
                        <p className="superExitInfo">Exit tax: {playerTax}</p>
                        <p className="superExitInfo">Payout: {playerCashout}</p>
                        <div style={{display:"flex", alignItems:"center", justifyContent:"center"}}>
                        <a 
                            className="superExitInfo"
                            href={`https://explorer.solana.com/tx/${cashoutTx}?cluster=devnet`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                        >
                            Transaction
                        </a> 
                        <svg className="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52" style={{display:"inline", marginLeft:"5px", marginTop:"2px" }}>
                            <circle className="checkmark__circle" cx="26" cy="26" r="25" fill="none" />
                            <path className="checkmark__check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
                        </svg>
                        </div>
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