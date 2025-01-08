import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { useWallet } from "@solana/wallet-adapter-react";
import {
    AccountInfo,
    Commitment,
    ComputeBudgetProgram,
    Connection,
    Keypair,
    LAMPORTS_PER_SOL,
    PublicKey,
    SystemProgram,
    SYSVAR_RENT_PUBKEY,
    Transaction,
} from "@solana/web3.js";
import { ActiveGame, Food, Blob } from "@utils/types";
import { useCallback, useEffect, useRef, useState } from "react";
import BN from "bn.js";
import axios from "axios";
import {
    ANTEROOM_COMPONENT,
    BUY_IN,
    CASH_OUT,
    connection,
    EAT_FOOD,
    EAT_PLAYER,
    endpoints,
    endpointToWorldMap,
    EXIT_GAME,
    FOOD_COMPONENT,
    INIT_ANTEROOM,
    INIT_FOOD,
    INIT_GAME,
    INIT_PLAYER,
    JOIN_GAME,
    MAP_COMPONENT,
    MOVEMENT,
    options,
    PLAYER_COMPONENT,
    SOL_USDC_POOL_ID,
    SPAWN_FOOD,
} from "@utils/constants";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import { Client, USDC_MINT } from "@ladderlabs/buddy-sdk";
import {
    checkTransactionStatus,
    deriveKeypairFromPublicKey,
    getTopLeftCorner,
    pingEndpoint,
    waitSignatureConfirmation,
} from "@utils/helper";
import {
    ApplySystem,
    createAddEntityInstruction,
    createDelegateInstruction,
    createUndelegateInstruction,
    FindComponentPda,
    FindEntityPda,
    FindWorldPda,
    InitializeComponent,
    InitializeNewWorld,
} from "@magicblock-labs/bolt-sdk";
import {
    createAssociatedTokenAccountInstruction,
    getAssociatedTokenAddress,
    TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { LIQUIDITY_STATE_LAYOUT_V4 } from "@raydium-io/raydium-sdk";
import { WalletNotConnectedError } from "@solana/wallet-adapter-base";
import { initBuddyState, initialBuddyLink, useInitBuddyLink,
    useBuddyState, useBuddyLink, BUDDY_STATUS, getTreasuryPDA, getBuddyPDA,
    BUDDY_MINTS, getMemberPDA
 } from "buddy.link";
import { useJoinGame } from './useJoinGame';
import { useExitGame } from './useExitGame';
import { useCleanup } from './useCleanup';
import { useMovement } from './useMovement';
import { useFood } from './useFood';
import { useNewGame } from './useNewGame';

const useSupersize = () => {
    const { publicKey, sendTransaction } = useWallet();
    const [savedPublicKey, setSavedPublicKey] = useState<PublicKey | null>(
        null,
    );
    const [exitTxn, setExitTxn] = useState<string>("");

    const [isReferrerModalOpen, setIsReferrerModalOpen] = useState(false);
    const [referrerInput, setReferrerInput] = useState<string>("");
    const [username, setUsername] = useState<string>("");
    const myReferralAccount = useRef<string>("");
    const myReferrer = useRef<string>("");
    const { referrer, member, profile } = useBuddyLink();

    const [fastestEndpoint, setFastestEndpoint] = useState<string | null>(null);
    const [enpointDone, setEndpointDone] = useState<boolean>(false);
    const [wallet, setWallet] = useState<Keypair>(Keypair.generate());
    const [playerKey, setPlayerKey] = useState<PublicKey>(wallet.publicKey);
    const walletRef = useRef<Keypair>(wallet);
    const [foodwallet] = useState<Keypair>(() => Keypair.generate());
    const [foodKey, setFoodKey] = useState<PublicKey>(foodwallet.publicKey);
    const foodwalletRef = useRef<Keypair>(foodwallet);
    const [players, setPlayers] = useState<Blob[]>([]);
    const [allplayers, setAllPlayers] = useState<Blob[]>([]);
    const [leaderboard, setLeaderboard] = useState<Blob[]>([]);
    const [foodListLen, setFoodListLen] = useState<number[]>([]);
    const [allFood, setAllFood] = useState<Food[][]>([]);
    const [visibleFood, setVisibleFood] = useState<Food[][]>([]);
    const [currentPlayer, setCurrentPlayer] = useState<Blob | null>(null);
    const [playerName, setPlayerName] = useState("unnamed");
    const [newGameCreated, setNewGameCreated] = useState<ActiveGame | null>(
        null,
    );
    const [currentTPS, setCurrentTPS] = useState(0);
    const [price, setPrice] = useState(0);
    const scale = 1;
    const [screenSize, setScreenSize] = useState({ width: 2000, height: 2000 });
    const [mapSize, setMapSize] = useState(4000);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [isJoining, setIsJoining] = useState<boolean>(false);
    const [transactionError, setTransactionError] = useState<string | null>(
        null,
    );
    const [transactionSuccess, setTransactionSuccess] = useState<string | null>(
        null,
    );

    const [activeGames, setActiveGames] = useState<ActiveGame[]>([]);
    const [gamewallet, setGameWallet] = useState("");
    const [openGameInfo, setOpenGameInfo] = useState<boolean[]>(
        new Array(activeGames.length).fill(false),
    );
    const entityMatch = useRef<PublicKey | null>(null);
    const playerEntities = useRef<PublicKey[]>([]);
    const foodEntities = useRef<PublicKey[]>([]);
    const currentPlayerEntity = useRef<PublicKey | null>(null);
    const currentWorldId = useRef<PublicKey | null>(null);
    const anteroomEntity = useRef<PublicKey | null>(null);
    const [gameId, setGameId] = useState<PublicKey | null>(null);

    const [exitHovered, setExitHovered] = useState(false);

    const playersComponentSubscriptionId = useRef<number[] | null>([]);
    const foodComponentSubscriptionId = useRef<number[] | null>([]);
    const myplayerComponentSubscriptionId = useRef<number | null>(null);
    const mapComponentSubscriptionId = useRef<number | null>(null);

    const playersComponentClient = useRef<Program | null>(null);
    const mapComponentClient = useRef<Program | null>(null);
    const foodComponentClient = useRef<Program | null>(null);

    const [isMouseDown, setIsMouseDown] = useState(false);
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

    const currentPlayerRef = useRef(currentPlayer);
    const exitHoveredRef = useRef(exitHovered);
    const mousePositionRef = useRef(mousePosition);
    const isMouseDownRef = useRef(isMouseDown);

    useEffect(() => {
        currentPlayerRef.current = currentPlayer;
    }, [currentPlayer]);

    useEffect(() => {
        mousePositionRef.current = mousePosition;
    }, [mousePosition]);

    useEffect(() => {
        exitHoveredRef.current = exitHovered;
    }, [exitHovered]);

    useEffect(() => {
        isMouseDownRef.current = isMouseDown;
    }, [isMouseDown]);

    const [panelContent, setPanelContent] = useState<JSX.Element | null>(null);
    const [leaderBoardActive, setLeaderboardActive] = useState(false);

    const [gameEnded, setGameEnded] = useState(0);
    const playerCashout = useRef(0);
    const playerBuyIn = useRef(0);
    const [playerTax, setPlayerTax] = useState(0);
    const playerRemovalTimeRef = useRef<BN | null>(null);
    const [cashoutTx, setCashoutTx] = useState<string | null>(null);
    const [reclaimTx, setReclaimTx] = useState<string | null>(null);
    const [cashingOut, setCashingOut] = useState<boolean>(false);
    const [playerCashoutAddy, setPlayerCashoutAddy] =
        useState<PublicKey | null>(null);
    const nextFood = useRef({ x: -1, y: -1 });

    const [inputValue, setInputValue] = useState<string>("");
    const [playerExiting, setPlayerExiting] = useState(false);
    const [countdown, setCountdown] = useState(5);
    const [buyIn, setBuyIn] = useState(0.0);
    const [joinedOrg, setJoinedOrg] = useState(false);

    const [selectedOption, setSelectedOption] = useState(options[0]);

    const lastUpdateRef = useRef<number | null>(null); // Track the last update time
    const leaderBoardOptions = useRef([
        { icon: `${process.env.PUBLIC_URL}/token.png`, name: "LOADING" },
    ]);
    const [season, setSeason] = useState({
        icon: `${process.env.PUBLIC_URL}/token.png`,
        name: "LOADING",
    });

    let provider = new anchor.AnchorProvider(
        connection,
        new NodeWallet(wallet),
        {
            preflightCommitment: "processed",
            commitment: "processed",
        },
    );

    const providerEphemeralRollup = useRef<anchor.AnchorProvider>(
        new anchor.AnchorProvider(
            new anchor.web3.Connection("https://supersize-fra.magicblock.app", {
                wsEndpoint: "wss://supersize-fra.magicblock.app",
            }),
            new NodeWallet(wallet),
        ),
    );

    anchor.setProvider(provider);

    const submitTransactionUser = useCallback(
        async (transaction: Transaction): Promise<string> => {
            if (isSubmitting) throw new Error("Transaction in progress");
            setIsSubmitting(true);
            setTransactionError(null);
            setTransactionSuccess(null);
            try {
                const {
                    context: { slot: minContextSlot },
                    value: { blockhash, lastValidBlockHeight },
                } = await connection.getLatestBlockhashAndContext();

                const signature = await sendTransaction(transaction, connection, { minContextSlot });
                await connection.confirmTransaction({ blockhash, lastValidBlockHeight, signature }, "processed");
                setTransactionSuccess(`Transaction confirmed`);
                return signature;
            } catch (error) {
                setTransactionError(`Transaction failed: ${error}`);
                setIsJoining(false);
                throw error;
            } finally {
                setIsSubmitting(false);
            }
        },
        [connection, isSubmitting, sendTransaction],
    );

    const submitTransaction = useCallback(
        async (
            transaction: Transaction,
            commitmetLevel: Commitment,
            skipPre: boolean,
        ): Promise<string | null> => {
            if (isSubmitting) return null;
            setIsSubmitting(true);
            setTransactionError(null);
            setTransactionSuccess(null);
            try {
                const {
                    context: { slot: minContextSlot },
                    value: { blockhash, lastValidBlockHeight },
                } = await provider.connection.getLatestBlockhashAndContext();

                if (!walletRef.current) {
                    setTransactionError("Wallet is not initialized");
                    return null;
                }
                transaction.recentBlockhash = blockhash;
                transaction.feePayer = walletRef.current.publicKey;
                transaction.sign(walletRef.current);
                const signature = await provider.connection.sendRawTransaction(
                    transaction.serialize(),
                    {
                        skipPreflight: skipPre,
                        preflightCommitment: commitmetLevel,
                    },
                );
                console.log(signature);
                await provider.connection.confirmTransaction(
                    { blockhash, lastValidBlockHeight, signature },
                    commitmetLevel,
                );
                //const signature = await sendAndConfirmTransaction(connection, transaction, [
                //    walletRef.current,
                //]);
                setTransactionSuccess(`Transaction confirmed`);
                return signature;
            } catch (error) {
                console.log(error);
                setTransactionError(`Transaction failed: ${error}`);
            } finally {
                setIsSubmitting(false);
            }
            return null;
        },
        [connection, isSubmitting, sendTransaction],
    );

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

    useEffect(() => {
        if (publicKey) {
            const newWallet = deriveKeypairFromPublicKey(publicKey);
            setWallet(newWallet);
            setPlayerKey(newWallet.publicKey);
            walletRef.current = newWallet;
            if (fastestEndpoint) {
                const wsUrl = fastestEndpoint.replace("https", "wss");
                providerEphemeralRollup.current = new anchor.AnchorProvider(
                    new anchor.web3.Connection(fastestEndpoint, {
                        wsEndpoint: wsUrl,
                    }),
                    new NodeWallet(newWallet),
                );
                provider = new anchor.AnchorProvider(
                    connection,
                    new NodeWallet(newWallet),
                    {
                        preflightCommitment: "processed",
                        commitment: "processed",
                    },
                );
            }

            console.log(newWallet, playerKey.toString());
        }
    }, [publicKey, savedPublicKey]);

    const setInputUsername = (inputUsername: any) => {
        const user = { name: inputUsername, referrer: referrer, referral_done: false};
        localStorage.setItem('user', JSON.stringify(user));
        setPlayerName(inputUsername);
    };

    useEffect(() => {
        const retrievedUser = localStorage.getItem('user');
        if(retrievedUser){
            let myusername = JSON.parse(retrievedUser).name;
            setPlayerName(myusername);
        }
    }, []);

    useEffect(() => {
        if (publicKey) {
            const retrievedUser = localStorage.getItem('user');
            const retrievedRefferal = localStorage.getItem('referrer');
            //console.log('retrieved', member[0], retrievedRefferal, retrievedUser);
            if(member){
                if(member[0]){
                    const user = { name: member[0].account.name, referrer: referrer, referral_done: true};
                    localStorage.setItem('user', JSON.stringify(user));
                    setPlayerName(member[0].account.name);
                    setJoinedOrg(true);
                }
                else{ 
                    if(!retrievedUser || retrievedRefferal !== null){
                        const user = { name: publicKey.toString().slice(0,12), referrer: referrer, referral_done: false};
                        localStorage.setItem('user', JSON.stringify(user));
                        setUsername(publicKey.toString().slice(0,12));
                        setIsReferrerModalOpen(true);
                        setJoinedOrg(false);
                    }
                }
            }
            else{ 
                if(!retrievedUser || retrievedRefferal !== null){
                    const user = { name: publicKey.toString().slice(0,12), referrer: referrer, referral_done: false};
                    localStorage.setItem('user', JSON.stringify(user));
                    setUsername(publicKey.toString().slice(0,12));
                    setIsReferrerModalOpen(true);
                    setJoinedOrg(false);
                }
            }
        }
    }, [member]);

    useEffect(() => {
        if (publicKey) {
            setSavedPublicKey(publicKey); 
        }
    }, [publicKey]);

    const handleOptionClick = (option: any) => {
        setSelectedOption(option);
        const selectedIndex = options.indexOf(option);
        setFastestEndpoint(endpoints[selectedIndex]);
    };

    useEffect(() => {
        const checkEndpoints = async () => {
            const results: Record<string, number> = {};
            setEndpointDone(false);
            for (const endpoint of endpoints) {
                const pingTime = await pingEndpoint(endpoint);
                results[endpoint] = pingTime;
            }

            const lowestPingEndpoint = Object.keys(results).reduce((a, b) =>
                results[a] < results[b] ? a : b,
            );
            setFastestEndpoint(lowestPingEndpoint);
            const index = endpoints.indexOf(lowestPingEndpoint);
            if (index !== -1) {
                setSelectedOption(options[index]);
            }
            const wsUrl = lowestPingEndpoint.replace("https", "wss");
        };

        checkEndpoints();
    }, []);

    useEffect(() => {
        if (activeGames[0]) {
            if (buyIn > activeGames[0].max_buyin) {
                setBuyIn(activeGames[0].max_buyin);
            }
            if (buyIn < activeGames[0].min_buyin) {
                setBuyIn(activeGames[0].min_buyin);
            }
        }
    }, [buyIn, activeGames]);

    useEffect(() => {
        if (fastestEndpoint) {
            const wsUrl = fastestEndpoint.replace("https", "wss");
            providerEphemeralRollup.current = new anchor.AnchorProvider(
                new anchor.web3.Connection(fastestEndpoint, {
                    wsEndpoint: wsUrl,
                }),
                new NodeWallet(wallet),
            );

            console.log(
                "Updated providerEphemeralRollup:",
                providerEphemeralRollup.current,
            );
            const { worldId, worldPda } = endpointToWorldMap[fastestEndpoint];
            //setActiveGames([{ worldId: worldId, worldPda: worldPda} as ActiveGame]);
            const newGameInfo: ActiveGame = {
                worldId: worldId,
                worldPda: worldPda,
                name: "loading",
                active_players: 0,
                max_players: 0,
                size: 0,
                image: `${process.env.PUBLIC_URL}/token.png`,
                token: "LOADING",
                base_buyin: 0,
                min_buyin: 0,
                max_buyin: 0,
            };
            //setNewGameCreated(newGameInfo);
            setActiveGames([newGameInfo]);
            fetchAndLogMapData();
            setOpenGameInfo(new Array(activeGames.length).fill(false));
            setEndpointDone(true);
            console.log(fastestEndpoint);
        }
    }, [fastestEndpoint]);

    const getComponentsClientBasic = useCallback(
        async (component: PublicKey): Promise<Program> => {
            const idl = await Program.fetchIdl(component);
            if (!idl) throw new Error("IDL not found");
            return new Program(idl, provider);
        },
        [provider],
    );

    const getComponentsClient = useCallback(
        async (component: PublicKey): Promise<Program> => {
            const idl = await Program.fetchIdl(component);
            if (!idl) throw new Error("IDL not found");
            return new Program(idl, providerEphemeralRollup.current);
        },
        [providerEphemeralRollup.current],
    );

    const decodeFood = (data: Uint8Array) => {
        if (!(data instanceof Uint8Array) || data.length !== 4) {
            throw new Error('Invalid food data format. Expected a Uint8Array of length 4.');
        }
        const buffer = data.buffer; // Get the ArrayBuffer from Uint8Array
        const packed = new DataView(buffer).getUint32(data.byteOffset, true); // Little-endian
        const x = packed & 0x3FFF;
        const y = (packed >> 14) & 0x3FFF;
        const size = (packed >> 28) & 0x0F;
        return { x, y, size };
    };
    

    const updateFoodList = useCallback((section: any, food_index: number) => {
        const foodArray = section.food as any[];  
        const visibleFood: Food[] = [];
        const foodData: Food[] = [];
        foodArray.forEach((foodItem, index) => {
            const foodDataArray = new Uint8Array(foodItem.data);
            const decodedFood = decodeFood(foodDataArray); 
            foodData.push({ 
                x: decodedFood.x, 
                y: decodedFood.y, 
                size: decodedFood.size
            });
            foodData.push({ x: decodedFood.x, y: decodedFood.y, size: decodedFood.size});
            if (currentPlayer) {
                const halfWidth = screenSize.width / 2;
                const halfHeight = screenSize.height / 2;
                const diffX = (decodedFood.x - currentPlayer.x);
                const diffY = (decodedFood.y - currentPlayer.y);
                if (Math.abs(diffX) <= halfWidth && Math.abs(diffY) <= halfHeight) {
                    visibleFood.push({
                        x: diffX + screenSize.width / 2,
                        y: diffY + screenSize.height / 2,
                        size: decodedFood.size,
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

    const updateLeaderboard = useCallback(
        (players: any[]) => {
            const top10Players = players
                .sort((a, b) => b.score - a.score)
                .slice(0, 10)
                .map((player) => ({
                    name: player.name,
                    authority: player.authority,
                    x: player.x,
                    y: player.y,
                    radius: 4 + Math.sqrt(player.mass / 10) * 6,
                    mass: player.mass,
                    score: player.score,
                    tax: player.tax,
                    speed: player.speed,
                    removal: player.scheduledRemovalTime,
                    target_x: player.target_x,
                    target_y: player.target_y,
                    timestamp: performance.now(),
                }));
            setLeaderboard(top10Players);

            if (currentPlayer) {
                const sortedPlayers = players.sort((a, b) => b.score - a.score);
                const currentPlayerRank = sortedPlayers.findIndex((player) =>
                    player.authority.equals(currentPlayer.authority),
                );
            }
        },
        [setLeaderboard, playerKey],
    );

    useEffect(() => {
        let status: string = '<span class="title">Leaderboard</span>';
        for (let i = 0; i < leaderboard.length; i++) {
            status += "<br />";
            const currentItem = leaderboard[i];
            if (
                currentPlayer &&
                currentItem &&
                currentItem.authority &&
                currentPlayer.authority
            ) {
                if (currentItem.authority.equals(currentPlayer.authority)) {
                    status +=
                        '<span class="me">' +
                        (i + 1) +
                        ". " +
                        currentItem.name +
                        "</span>";
                } else {
                    status += i + 1 + ". " + currentItem.name;
                }
            } else {
                status += i + 1 + ". " + currentItem.name;
            }
        }
        const statusElement = document.getElementById("status");
        if (statusElement) {
            statusElement.innerHTML = status;
        }
    }, [setLeaderboard, leaderboard]);

    const updateMyPlayerCashout = useCallback(
        (player: any) => {
            console.log("updating cashout data", player);
            playerCashout.current = player.score;
            myReferrer.current = player.referrerTokenAccount;
            setPlayerTax(player.tax);
            setPlayerCashoutAddy(player.payoutTokenAccount);
        },
        [setCurrentPlayer, playerKey, allFood],
    );

    const updateMyPlayer = useCallback(
        (player: any) => {
            if (player.scheduledRemovalTime) {
                //console.log(player.scheduledRemovalTime.toNumber() * 1000)
                playerRemovalTimeRef.current = player.scheduledRemovalTime;
            }
            //console.log('elapsed time', elapsedTime)
            if (
                Math.sqrt(player.mass) == 0 &&
                player.score == 0.0 &&
                !cashingOut &&
                !isJoining
            ) {
                const startTime = player.joinTime.toNumber() * 1000;
                const currentTime = Date.now();
                const elapsedTime = currentTime - startTime;
                if (elapsedTime >= 6000) {
                    setGameEnded(1);
                    setGameId(null);
                }
            }
            if (playerBuyIn.current == 0) {
                playerBuyIn.current = player.buyIn;
            }
            setCurrentPlayer({
                name: player.name,
                authority: player.authority,
                x: player.x,
                y: player.y,
                radius: 4 + Math.sqrt(player.mass / 10) * 6,
                mass: player.mass,
                score: player.score,
                tax: player.tax,
                speed: player.speed,
                removal: player.scheduledRemovalTime,
                target_x: player.targetX,
                target_y: player.targetY,
                timestamp: performance.now(),
            } as Blob);

            if (
                Math.sqrt(player.mass) == 0 &&
                player.score != 0.0 &&
                !isJoining
            ) {
                setCashingOut(true);
                setGameEnded(2);
                setGameId(null);
            }
        },
        [setCurrentPlayer, playerKey, allFood],
    );

    useEffect(() => {
        if (currentPlayer) {
            const playersWithAuthority = allplayers.filter(
                (player) =>
                    player.authority !== null &&
                    player.x !== 50000 &&
                    player.y !== 50000 &&
                    Math.sqrt(player.mass) !== 0,
            );
            updateLeaderboard(playersWithAuthority);
            const newVisiblePlayers: Blob[] = playersWithAuthority.reduce(
                (accumulator: Blob[], playerx) => {
                    if (
                        currentPlayer &&
                        playerx.authority &&
                        currentPlayer.authority
                    ) {
                        if (
                            currentPlayer.authority.toString() !=
                            playerx.authority.toString()
                        ) {
                            const halfWidth = screenSize.width / 2;
                            const halfHeight = screenSize.height / 2;
                            const diffX = playerx.x - currentPlayer.x;
                            const diffY = playerx.y - currentPlayer.y;

                            if (
                                Math.abs(diffX) <= halfWidth &&
                                Math.abs(diffY) <= halfHeight
                            ) {
                                accumulator.push({
                                    name: playerx.name,
                                    authority: playerx.authority,
                                    x: playerx.x, //diffX + screenSize.width / 2,
                                    y: playerx.y, //diffY + screenSize.height / 2,
                                    radius:
                                        4 + Math.sqrt(playerx.mass / 10) * 6,
                                    mass: playerx.mass,
                                    score: playerx.score,
                                    tax: playerx.tax,
                                    speed: playerx.speed,
                                    removal: playerx.removal,
                                    target_x: playerx.target_x,
                                    target_y: playerx.target_y,
                                    timestamp: performance.now(),
                                });
                            }
                        }
                    }
                    return accumulator;
                },
                [],
            );
            setPlayers(newVisiblePlayers);
        }
    }, [currentPlayer]);

    const updateMap = useCallback((map: any) => {
        const playerArray = map.players as any[];
        //console.log(map); 
        if(map.nextFood){
            const foodDataArray = new Uint8Array(map.nextFood.data);
            const decodedFood = decodeFood(foodDataArray); 
            if(decodedFood.x !== nextFood.current.x || decodedFood.y !== nextFood.current.y){
            //console.log('new food', map.nextFood, nextFood.current);
            nextFood.current = {x: decodedFood.x, y: decodedFood.y};
            //processNewFoodTransaction(map.nextFood.x, map.nextFood.y);
            }
        }else if(map.foodQueue > 0){
            nextFood.current = {x: 0, y: 0};
            //console.log('new food', map.foodQueue);
            //processNewFoodTransaction(0, 0);
        }
    }, [setPlayers, setCurrentPlayer, playerKey, allFood]);

    const updatePlayers = useCallback(
        (player: any, player_index: number) => {
            if (player) {
                setAllPlayers((prevPlayers) => {
                    const newPlayer: Blob = {
                        name: player.name,
                        authority: player.authority,
                        x: player.x,
                        y: player.y,
                        radius: 4 + Math.sqrt(player.mass / 10) * 6,
                        mass: player.mass,
                        score: player.score,
                        tax: player.tax,
                        speed: player.speed,
                        removal: player.scheduledRemovalTime,
                        target_x: player.targetX,
                        target_y: player.targetY,
                        timestamp: performance.now(),
                    };
                    const updatedPlayers = [...prevPlayers];
                    updatedPlayers[player_index] = newPlayer;
                    return updatedPlayers;
                });
            }
        },
        [setAllPlayers, screenSize, currentPlayer],
    );

    const handlePlayersComponentChange = useCallback(
        (accountInfo: AccountInfo<Buffer>, index: number) => {
            const parsedData =
                playersComponentClient.current?.coder.accounts.decode(
                    "player",
                    accountInfo.data,
                );
            updatePlayers(parsedData, index);
        },
        [updatePlayers],
    );

    const handleFoodComponentChange = useCallback(
        (accountInfo: AccountInfo<Buffer>, index: number) => {
            const parsedData =
                foodComponentClient.current?.coder.accounts.decode(
                    "section",
                    accountInfo.data,
                );
            updateFoodList(parsedData, index);
        },
        [updateFoodList],
    );

    const handleMyPlayerComponentChange = useCallback(
        (accountInfo: AccountInfo<Buffer>) => {
            const parsedData =
                playersComponentClient.current?.coder.accounts.decode(
                    "player",
                    accountInfo.data,
                );
            updateMyPlayer(parsedData);
        },
        [updateMyPlayer],
    );

    const handleMapComponentChange = useCallback(
        (accountInfo: AccountInfo<Buffer>) => {
            const parsedData =
                mapComponentClient.current?.coder.accounts.decode(
                    "map",
                    accountInfo.data,
                );
            updateMap(parsedData);
        },
        [updateMap],
    );

    // Subscribe to the game state
    const subscribeToGame = useCallback(async (): Promise<void> => {
        if (!entityMatch.current) return;
        if (!currentPlayerEntity.current) return;

        playersComponentClient.current =
            await getComponentsClient(PLAYER_COMPONENT);
        foodComponentClient.current = await getComponentsClient(FOOD_COMPONENT);
        mapComponentClient.current = await getComponentsClient(MAP_COMPONENT);

        if (mapComponentSubscriptionId && mapComponentSubscriptionId.current)
            await providerEphemeralRollup.current.connection.removeAccountChangeListener(
                mapComponentSubscriptionId.current,
            );
        if (
            myplayerComponentSubscriptionId &&
            myplayerComponentSubscriptionId.current
        )
            await providerEphemeralRollup.current.connection.removeAccountChangeListener(
                myplayerComponentSubscriptionId.current,
            );
        for (let i = 0; i < foodEntities.current.length; i++) {
            if (
                foodComponentSubscriptionId &&
                foodComponentSubscriptionId.current
            )
                await providerEphemeralRollup.current.connection.removeAccountChangeListener(
                    foodComponentSubscriptionId.current[i],
                );
        }
        for (let i = 0; i < playerEntities.current.length; i++) {
            if (
                playersComponentSubscriptionId &&
                playersComponentSubscriptionId.current
            )
                await providerEphemeralRollup.current.connection.removeAccountChangeListener(
                    playersComponentSubscriptionId.current[i],
                );
        }

        for (let i = 0; i < foodEntities.current.length; i++) {
            const foodComponenti = FindComponentPda({
                componentId: FOOD_COMPONENT,
                entity: foodEntities.current[i],
            });
            if (foodComponentSubscriptionId.current === null) {
                foodComponentSubscriptionId.current = [
                    providerEphemeralRollup.current.connection.onAccountChange(
                        foodComponenti,
                        (accountInfo) =>
                            handleFoodComponentChange(accountInfo, i),
                        "processed",
                    ),
                ];
            } else {
                foodComponentSubscriptionId.current = [
                    ...foodComponentSubscriptionId.current,
                    providerEphemeralRollup.current.connection.onAccountChange(
                        foodComponenti,
                        (accountInfo) =>
                            handleFoodComponentChange(accountInfo, i),
                        "processed",
                    ),
                ];
            }
        }

        for (let i = 0; i < playerEntities.current.length; i++) {
            const playersComponenti = FindComponentPda({
                componentId: PLAYER_COMPONENT,
                entity: playerEntities.current[i],
            });
            if (playersComponentSubscriptionId.current === null) {
                playersComponentSubscriptionId.current = [
                    providerEphemeralRollup.current.connection.onAccountChange(
                        playersComponenti,
                        (accountInfo) =>
                            handlePlayersComponentChange(accountInfo, i),
                        "processed",
                    ),
                ];
            } else {
                playersComponentSubscriptionId.current = [
                    ...playersComponentSubscriptionId.current,
                    providerEphemeralRollup.current.connection.onAccountChange(
                        playersComponenti,
                        (accountInfo) =>
                            handlePlayersComponentChange(accountInfo, i),
                        "processed",
                    ),
                ];
            }
        }

        const myplayerComponent = FindComponentPda({
            componentId: PLAYER_COMPONENT,
            entity: currentPlayerEntity.current,
        });

        myplayerComponentSubscriptionId.current =
            providerEphemeralRollup.current.connection.onAccountChange(
                myplayerComponent,
                handleMyPlayerComponentChange,
                "processed",
            );
        (playersComponentClient.current?.account as any).player
            .fetch(myplayerComponent, "processed")
            .then(updateMyPlayer)
            .catch((error: any) => {
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
                .catch((error: any) => { });
        }

        for (let i = 0; i < playerEntities.current.length; i++) {
            const playersComponenti = FindComponentPda({
                componentId: PLAYER_COMPONENT,
                entity: playerEntities.current[i],
            });
            //console.log( i, playerEntities.current[i]);
            //console.log('player component', playersComponenti);
            (playersComponentClient.current?.account as any).player
                .fetch(playersComponenti, "processed")
                .then((fetchedData: any) => updatePlayers(fetchedData, i))
                .catch((error: any) => {
                    //console.error("Failed to fetch account:", error);
                });
        }

        const mapComponent = FindComponentPda({
            componentId: MAP_COMPONENT,
            entity: entityMatch.current,
        });
        mapComponentSubscriptionId.current =
            providerEphemeralRollup.current.connection.onAccountChange(
                mapComponent,
                handleMapComponentChange,
                "processed",
            );
        (mapComponentClient.current?.account as any).map
            .fetch(mapComponent, "processed")
            .then(updateMap)
            .catch((error: any) => {
                console.error("Failed to fetch account:", error);
            });

    }, [
        connection,
        handlePlayersComponentChange,
        handleMyPlayerComponentChange,
        handleFoodComponentChange,
        handleMapComponentChange,
        updatePlayers,
        updateFoodList,
        updateMap,
        updateMyPlayer,
    ]);

    function findListIndex(pubkey: PublicKey): number | null {
        const index = allplayers.findIndex(
            (player) => player.authority?.toString() === pubkey.toString(),
        );
        if (index !== -1) {
            return index;
        } else {
            return null;
        }
    }

    useEffect(() => {
        if (entityMatch || gameId) {
            const handleMouseMove = (event: MouseEvent) => {
                setMousePosition({ x: event.clientX, y: event.clientY });
            };

            const handleMouseDown = (event: MouseEvent) => {
                setIsMouseDown(true);
            };

            const handleMouseUp = () => {
                setIsMouseDown(false);
            };
            console.log('Set mouse listeners');
            window.addEventListener("mousedown", handleMouseDown);
            window.addEventListener("mouseup", handleMouseUp);
            window.addEventListener("mousemove", handleMouseMove);

            return () => {
                console.log('Remove mouse listeners');
                window.removeEventListener("mousemove", handleMouseMove);
                window.removeEventListener("mousedown", handleMouseDown);
                window.removeEventListener("mouseup", handleMouseUp);
            };
        }
    }, [playerKey, gameId, entityMatch, screenSize]);

    useEffect(() => {
        function translateLargerRectangle() {
            const largerRectangle = document.getElementsByClassName(
                "game",
            )[0] as HTMLElement;
            const smallerRectangle = document.getElementsByClassName(
                "gameWrapper",
            )[0] as HTMLElement;

            if (largerRectangle && smallerRectangle) {
                const widthLarger = screenSize.width * scale;
                const heightLarger = screenSize.height * scale;
                const widthSmaller = smallerRectangle.offsetWidth;
                const heightSmaller = smallerRectangle.offsetHeight;
                const deltaX = widthSmaller / 2 - widthLarger / 2;
                const deltaY = heightSmaller / 2 - heightLarger / 2;
                largerRectangle.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
            } else {
                console.error(
                    'Elements with class name "gameWrapper" or "game" not found.',
                );
            }
        }
        translateLargerRectangle();
    }, [gameId, setGameId, screenSize]);

    useEffect(() => {
        const getTPS = async () => {
            const recentSamples =
                await connection.getRecentPerformanceSamples(4);
            const totalTransactions = recentSamples.reduce(
                (total, sample) => total + sample.numTransactions,
                0,
            );
            const averageTransactions =
                totalTransactions / recentSamples.length;
            setCurrentTPS(Math.round(averageTransactions));
        };
        getTPS();
    }, []);

    async function getTokenBalance(
        connection: Connection,
        vault: PublicKey,
        decimals: number,
    ): Promise<number> {
        const balance = await connection.getTokenAccountBalance(vault);
        return parseFloat(balance.value.amount) / Math.pow(10, decimals);
    }
    async function parsePoolInfo() {
        const mainnet_connection = new Connection(
            "https://floral-convincing-dawn.solana-mainnet.quiknode.pro/73d5d52678fd227b48dd0aec6a8e94ac9dd61f59",
        );
        const info = await mainnet_connection.getAccountInfo(
            new PublicKey(SOL_USDC_POOL_ID),
        );
        if (!info) return;
        const poolState = LIQUIDITY_STATE_LAYOUT_V4.decode(info.data);
        const baseTokenDecimals = 9;
        const quoteTokenDecimals = 6;
        const baseTokenBalance = await getTokenBalance(
            mainnet_connection,
            poolState.baseVault,
            baseTokenDecimals,
        );
        const quoteTokenBalance = await getTokenBalance(
            mainnet_connection,
            poolState.quoteVault,
            quoteTokenDecimals,
        );
        const priceOfBaseInQuote = quoteTokenBalance / baseTokenBalance;
        setPrice(priceOfBaseInQuote);
    }

    useEffect(() => {
        parsePoolInfo();
    }, []);

    const fetchTokenMetadata = async (
        tokenAddress: string,
    ): Promise<{ name: string; image: string }> => {
        try {
            const response = await fetch(
                "https://devnet.helius-rpc.com/?api-key=07a045b7-c535-4d6f-852b-e7290408c937",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        jsonrpc: "2.0",
                        id: 1, // Unique identifier
                        method: "getAsset",
                        params: [tokenAddress], // Token address passed in an array
                    }),
                },
            );

            if (!response.ok) {
                const errorText = await response.text();
                console.error("Error fetching asset:", errorText);
                throw new Error(
                    `HTTP Error: ${response.status} ${response.statusText}`,
                );
            }

            const data = await response.json();

            if (data.error) {
                throw new Error(data.error.message);
            }

            const content = data.result?.content;
            if (!content) {
                throw new Error("Content not found in response");
            }

            // Check if json_uri is present and not empty
            const jsonUri = content.json_uri;
            if (jsonUri) {
                const metadataResponse = await fetch(jsonUri);
                if (!metadataResponse.ok) {
                    const errorText = await metadataResponse.text();
                    console.error(
                        "Error fetching metadata from json_uri:",
                        errorText,
                    );
                    throw new Error(
                        `HTTP Error: ${metadataResponse.status} ${metadataResponse.statusText}`,
                    );
                }
                const metadataJson = await metadataResponse.json();
                return {
                    name: metadataJson.name || "Unknown",
                    image: metadataJson.image || "",
                };
            }

            // Fallback to metadata from content if json_uri is empty
            const name = content.metadata?.symbol || "Unknown";
            const image = content.links?.image || content.files?.[0]?.uri || "";

            if (!image) {
                throw new Error("Image URI not found");
            }

            return { name, image };
        } catch (error) {
            console.error("Error fetching token metadata:", error);
            throw error;
        }
    };

    const fetchAndLogMapData = async () => {
        for (let i = 0; i < activeGames.length; i++) {
            const mapseed = "origin";
            const mapEntityPda = FindEntityPda({
                worldId: activeGames[i].worldId,
                entityId: new anchor.BN(0),
                seed: mapseed,
            });
            const mapComponentPda = FindComponentPda({
                componentId: MAP_COMPONENT,
                entity: mapEntityPda,
            });

            try {
                let token_image = `${process.env.PUBLIC_URL}/token.png`;
                let token_name = "LOADING";
                let base_buyin = 0;
                let min_buyin = 0;
                let max_buyin = 0;
                const anteseed = "ante";
                const anteEntityPda = FindEntityPda({
                    worldId: activeGames[i].worldId,
                    entityId: new anchor.BN(0),
                    seed: anteseed,
                });
                const anteComponentPda = FindComponentPda({
                    componentId: ANTEROOM_COMPONENT,
                    entity: anteEntityPda,
                });
                const anteComponentClient =
                    await getComponentsClient(ANTEROOM_COMPONENT);
                const anteacc = await provider.connection.getAccountInfo(
                    anteComponentPda,
                    "processed",
                );
                let mint_of_token_being_sent = new PublicKey(0);
                if (anteacc) {
                    const anteParsedData =
                        anteComponentClient.coder.accounts.decode(
                            "anteroom",
                            anteacc.data,
                        );
                    //console.log(anteParsedData)
                    mint_of_token_being_sent = anteParsedData.token;
                    base_buyin = anteParsedData.baseBuyin;
                    max_buyin = anteParsedData.maxBuyin;
                    min_buyin = anteParsedData.minBuyin;
                    if (
                        mint_of_token_being_sent.toString() ===
                        "7dnMwS2yE6NE1PX81B9Xpm7zUhFXmQABqUiHHzWXiEBn"
                    ) {
                        token_image = `${process.env.PUBLIC_URL}/agld.jpg`;
                        token_name = "AGLD";
                    } else {
                        //token_image = `${process.env.PUBLIC_URL}/usdc.png`;
                        //token_name = "USDC";
                        try {
                            //console.log(mint_of_token_being_sent.toString())
                            const { name, image } = await fetchTokenMetadata(
                                mint_of_token_being_sent.toString(),
                            );
                            //console.log('metadata', name, image)
                            token_image = image;
                            token_name = name;
                        } catch (error) {
                            console.error("Error fetching token data:", error);
                        }
                    }
                }

                const mapComponentClient =
                    await getComponentsClient(MAP_COMPONENT);
                const mapacc =
                    await providerEphemeralRollup.current.connection.getAccountInfo(
                        mapComponentPda,
                        "processed",
                    );
                if (mapacc) {
                    const mapParsedData =
                        mapComponentClient.coder.accounts.decode(
                            "map",
                            mapacc.data,
                        );
                    console.log(
                        `Parsed Data for game ID ${activeGames[i].worldId}:`,
                        mapParsedData,
                    );
                    const playerClient =
                        await getComponentsClientBasic(PLAYER_COMPONENT);
                    let activeplayers = 0;
                    for (
                        let player_index = 1;
                        i < mapParsedData.maxPlayers + 1;
                        player_index++
                    ) {
                        const playerentityseed =
                            "player" + player_index.toString();
                        const playerEntityPda = FindEntityPda({
                            worldId: activeGames[i].worldId,
                            entityId: new anchor.BN(0),
                            seed: playerentityseed,
                        });
                        const playersComponentPda = FindComponentPda({
                            componentId: PLAYER_COMPONENT,
                            entity: playerEntityPda,
                        });
                        const playersacc =
                            await provider.connection.getAccountInfo(
                                playersComponentPda,
                                "processed",
                            );
                        if (playersacc) {
                            const playersParsedData =
                                playerClient.coder.accounts.decode(
                                    "player",
                                    playersacc.data,
                                );
                            //console.log(playersParsedData)
                            if (playersParsedData.authority != null) {
                                activeplayers = activeplayers + 1;
                            }
                        } else {
                            break;
                        }
                    }
                    setActiveGames((prevActiveGames) => {
                        const updatedGames = prevActiveGames.map((game) =>
                            game.worldId === activeGames[i].worldId &&
                                game.worldPda.toString() ===
                                activeGames[i].worldPda.toString()
                                ? {
                                    ...game,
                                    name: mapParsedData.name,
                                    active_players: activeplayers,
                                    max_players: mapParsedData.maxPlayers,
                                    size: mapParsedData.width,
                                    image: token_image,
                                    token: token_name,
                                    base_buyin: base_buyin,
                                    min_buyin: min_buyin,
                                    max_buyin: max_buyin,
                                }
                                : game,
                        );
                        return updatedGames;
                    });
                } else {
                    console.log(
                        `No account info found for game ID ${activeGames[i].worldId}`,
                    );
                }
            } catch (error) {
                console.log(
                    `Error fetching map data for game ID ${activeGames[i].worldId}:`,
                    error,
                );
            }
        }
    };

    const joinGameTx = useJoinGame({
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
    });

    const { preExitGameTx, exitGameTx } = useExitGame({
        playerKey,
        currentWorldId,
        currentPlayerEntity,
        entityMatch,
        providerEphemeralRollup,
        walletRef,
        setGameId,
        setGameEnded,
        setTransactionError,
        setCashingOut
    });

    const cleanUp = useCleanup({
        currentPlayer,
        cashingOut,
        gameEnded,
        currentWorldId,
        currentPlayerEntity,
        anteroomEntity,
        entityMatch,
        playerKey,
        publicKey,
        providerEphemeralRollup,
        walletRef,
        myReferrer,
        playerCashout,
        setPlayerTax,
        setPlayerCashoutAddy,
        setCashoutTx,
        setGameId,
        setTransactionError,
        setPlayers,
        setAllFood,
        setFoodListLen,
        playersComponentSubscriptionId,
        myplayerComponentSubscriptionId,
        mapComponentSubscriptionId,
        foodComponentSubscriptionId,
        submitTransactionUser,
        playerBuyIn,
        getComponentsClient,
        getComponentsClientBasic,
        fetchTokenMetadata,
    });

    const handleMovementAndCharging = useMovement({
        currentPlayerRef,
        mousePositionRef,
        isMouseDownRef,
        exitHoveredRef,
        currentWorldId,
        playerKey,
        currentPlayerEntity,
        entityMatch,
        gameId,
        foodEntities,
        foodListLen,
        players,
        screenSize,
        mapSize,
        providerEphemeralRollup,
        walletRef,
        setIsSubmitting,
        setTransactionError,
        setTransactionSuccess,
        playerEntities
    });

    const processNewFoodTransaction = useFood({
        currentWorldId,
        currentPlayerEntity,
        entityMatch,
        foodEntities,
        foodListLen,
        foodKey,
        foodwalletRef,
        providerEphemeralRollup,
        mapSize
    });

    const newGameTx = useNewGame({
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
        providerEphemeralRollup
    });


    const handleExitClick = () => {
        if(playerRemovalTimeRef.current !== null){
            const currentTime = Date.now();
            const elapsedTime = currentTime - playerRemovalTimeRef.current.toNumber() * 1000;
            if (elapsedTime > 10000 || elapsedTime < 5000) {
                preExitGameTx();
            }
            else{
                return;
            }
        }

        setCountdown(5);
        setPlayerExiting(true);
        preExitGameTx().then(() => {
            if(currentPlayerEntity.current){
            const myplayerComponent = FindComponentPda({
                componentId: PLAYER_COMPONENT,
                entity: currentPlayerEntity.current,
            });
            (playersComponentClient.current?.account as any).player.fetch(myplayerComponent, "processed").then(updateMyPlayer).catch((error: any) => {
                console.error("Failed to fetch account:", error);
            });
            }
        });

        const interval = setInterval(() => {
            setCountdown(countdown - 1)
        }, 1000);
        
        let startTime = Date.now();
        const checkRemovalTime = setInterval(() => {
            if (playerRemovalTimeRef.current && !playerRemovalTimeRef.current.isZero()) {
              startTime = playerRemovalTimeRef.current.toNumber() * 1000; 
              clearInterval(checkRemovalTime); 
        
              const timeoutinterval = setInterval(() => {
                if (playerRemovalTimeRef.current){
                startTime = playerRemovalTimeRef.current.toNumber() * 1000; 
                }
                const currentTime = Date.now();
                const elapsedTime = currentTime - startTime;
        
                if (elapsedTime >= 6000) {
                  console.log("5 seconds have passed");
                  exitGameTx();
                  clearInterval(timeoutinterval);
                  clearInterval(interval);
                  setPlayerExiting(false);
                } else {
                  console.log("Waiting...", elapsedTime);
                }
              }, 1000);
            }
          }, 100); 
      };


    return {
        newGameTx,
        selectedOption,
        handleOptionClick,
        leaderBoardOptions,
        setSeason,
        season,
        referrerInput, 
        setReferrerInput, 
        setIsReferrerModalOpen, 
        isReferrerModalOpen,
        referrer,
        username,
        setUsername,
        setInputUsername,
        currentTPS, 
        price,
        gameId,
        gameEnded,
        playerExiting,
        countdown,
        screenSize,
        reclaimTx,
        cashoutTx,
        handleExitClick,
        players,
        visibleFood,
        currentPlayer,
        buyIn,
        setBuyIn,
        playerName,
        activeGames,
        setActiveGames,
        openGameInfo,
        setOpenGameInfo,
        inputValue,
        joinGameTx,
        isJoining,
        isSubmitting,
        transactionError,
        transactionSuccess,
        setTransactionError,
        setTransactionSuccess,
        setPlayerName,
        setInputValue,
        setNewGameCreated,
        cleanUp,
        getComponentsClient,
        getComponentsClientBasic,
        fetchTokenMetadata,
    };
};

export default useSupersize;
