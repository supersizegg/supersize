import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { useWallet } from "@solana/wallet-adapter-react";
import { AccountInfo, Commitment, ComputeBudgetProgram, Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, Transaction } from "@solana/web3.js";
import { ActiveGame, Food, Blob } from "@utils/types";
import { useCallback, useEffect, useRef, useState } from "react";
import BN from "bn.js"
import axios from "axios"
import { ANTEROOM_COMPONENT, BUY_IN, CASH_OUT, connection, EAT_FOOD, EAT_PLAYER, endpoints, endpointToWorldMap, EXIT_GAME, FOOD_COMPONENT, INIT_ANTEROOM, INIT_FOOD, INIT_GAME, INIT_PLAYER, JOIN_GAME, MAP_COMPONENT, MOVEMENT, options, PLAYER_COMPONENT, SOL_USDC_POOL_ID, SPAWN_FOOD } from "@utils/constants";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import { Client, USDC_MINT } from "@ladderlabs/buddy-sdk";
import { deriveKeypairFromPublicKey, getTopLeftCorner, pingEndpoint } from "@utils/helper";
import { ApplySystem, createAddEntityInstruction, createDelegateInstruction, createUndelegateInstruction, FindComponentPda, FindEntityPda, FindWorldPda, InitializeComponent, InitializeNewWorld } from "@magicblock-labs/bolt-sdk";
import { createAssociatedTokenAccountInstruction, getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { LIQUIDITY_STATE_LAYOUT_V4 } from "@raydium-io/raydium-sdk";
import { WalletNotConnectedError } from "@solana/wallet-adapter-base";

const useSupersize = () => {
    const { publicKey, sendTransaction } = useWallet();
    const [savedPublicKey, setSavedPublicKey] = useState<PublicKey | null>(null);
    const [exitTxn, setExitTxn] = useState<string>('');

    const [isReferrerModalOpen, setIsReferrerModalOpen] = useState(false);
    const [referrerInput, setReferrerInput] = useState<string>("");
    const myReferralAccount = useRef<string>("");
    const myReferrer = useRef<string>("");

    const [fastestEndpoint, setFastestEndpoint] = useState<string | null>(null);
    const [enpointDone, setEndpointDone] = useState<boolean>(false);
    const [wallet, setWallet] = useState<Keypair>(Keypair.generate());
    const [playerKey, setPlayerKey] = useState<PublicKey>(wallet.publicKey);
    const walletRef = useRef<Keypair>(wallet);
    const [foodwallet] = useState<Keypair>(() => Keypair.generate());
    const [foodKey, setFoodKey] = useState<PublicKey>(foodwallet.publicKey);
    const foodwalletRef = useRef<Keypair>(foodwallet);
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
    const [subscribedToGame, setSubscribedToGame] = useState(false);
    const [newGameCreated, setNewGameCreated] = useState<ActiveGame | null>(null);
    const [currentTPS, setCurrentTPS] = useState(0);
    const [price, setPrice] = useState(0);
    const scale = 1;
    const [screenSize, setScreenSize] = useState({ width: 2000, height: 2000 });
    const [mapSize, setMapSize] = useState(4000);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [isJoining, setIsJoining] = useState<boolean>(false);
    const [moveSignature, setMoveSignature] = useState<string | null>(null);
    const [transactionError, setTransactionError] = useState<string | null>(null);
    const [transactionSuccess, setTransactionSuccess] = useState<string | null>(null);

    const [activeGames, setActiveGames] = useState<ActiveGame[]>([]);
    const [gamewallet, setGameWallet] = useState("");
    const [openGameInfo, setOpenGameInfo] = useState<boolean[]>(new Array(activeGames.length).fill(false));
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

    const [panelContent, setPanelContent] = useState<JSX.Element | null>(null);
    const [buildViewerNumber, setbuildViewerNumber] = useState(0);
    const [leaderBoardActive, setLeaderboardActive] = useState(false)
    const [isHovered, setIsHovered] = useState([false, false, false, false, false, false]);

    const [gameEnded, setGameEnded] = useState(0);
    const playerCashout = useRef(0);
    const playerBuyIn = useRef(0);
    const [playerTax, setPlayerTax] = useState(0);
    const playerRemovalTimeRef = useRef<BN | null>(null);
    const [cashoutTx, setCashoutTx] = useState<string | null>(null);
    const [reclaimTx, setReclaimTx] = useState<string | null>(null);
    const [cashingOut, setCashingOut] = useState<boolean>(false);
    const [playerCashoutAddy, setPlayerCashoutAddy] = useState<PublicKey | null>(null);
    const nextFood = useRef({ x: -1, y: -1 });

    const [inputValue, setInputValue] = useState<string>('');
    const [footerVisible, setFooterVisible] = useState(false);
    const [playerExiting, setPlayerExiting] = useState(false);
    const [countdown, setCountdown] = useState(5);
    const [buyIn, setBuyIn] = useState(0.0);

    const [isMobile, setIsMobile] = useState(window.innerWidth < 1000);
    const [selectedOption, setSelectedOption] = useState("Europe");
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const lastUpdateRef = useRef<number | null>(null); // Track the last update time

    let provider = new anchor.AnchorProvider(
        connection,
        new NodeWallet(wallet),
        {
            preflightCommitment: 'processed',
            commitment: 'processed',
        }
    );

    const providerEphemeralRollup = useRef<anchor.AnchorProvider>(new anchor.AnchorProvider(
        new anchor.web3.Connection("https://supersize-fra.magicblock.app", {
            wsEndpoint: "wss://supersize-fra.magicblock.app",
        }),
        new NodeWallet(wallet)
    ));

    anchor.setProvider(provider);

    const getRefferal = async (inputKey: any) => {
        const buddyLinkClient = new Client(connection as any, inputKey, "2iF3HaLpk6vuUXxGK3uDsxWoP5htC7NWZNctAevxZewY");
        const transaction = new Transaction();
        const organizationName = "Supersize";
        // check if user has buddy link profile and treasury
        const playerBuddyProfile = await buddyLinkClient.buddy.getProfile(inputKey);
        if (!playerBuddyProfile) {
            const playerProfileCreateIx = await buddyLinkClient.initialize.createProfile(playerName);
            const playerSolTreasuryCreateIx = await buddyLinkClient.initialize.createTreasuryByName(playerName);
            const playerUsdcTreasuryCreateIx = await buddyLinkClient.initialize.createTreasuryByName(playerName, USDC_MINT);
            transaction.add(...playerProfileCreateIx, ...playerSolTreasuryCreateIx, ...playerUsdcTreasuryCreateIx);
        }
        // check if user has member
        const playerBuddyMember = await buddyLinkClient.member.getByName(organizationName, playerName);
        if (!playerBuddyMember) {
            const playerMemberCreateIx = await buddyLinkClient.initialize.createMember(organizationName, playerName);
            transaction.add(...playerMemberCreateIx);
        }

        if (transaction.instructions.length > 0) {
            const buddyTxSig = await submitTransactionUser(transaction);
        }
        //myReferralAccount.current = "";
        //setIsReferrerModalOpen(true);
        do {
            await new Promise(resolve => setTimeout(resolve, 500));
        } while (!isReferrerModalOpen)
        setIsReferrerModalOpen(false);
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

            const signature = await sendTransaction(transaction, connection, { minContextSlot });
            await connection.confirmTransaction({ blockhash, lastValidBlockHeight, signature }, "processed");

            setTransactionSuccess(`Transaction confirmed`);
            return signature;
        } catch (error) {
            setTransactionError(`Transaction failed: ${error}`);
            setIsJoining(false);
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
                setTransactionError('Wallet is not initialized');
                return null;
            }
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = walletRef.current.publicKey;
            transaction.sign(walletRef.current);
            const signature = await provider.connection.sendRawTransaction(transaction.serialize(), {
                skipPreflight: skipPre,
                preflightCommitment: commitmetLevel,
            });
            console.log(signature);
            await provider.connection.confirmTransaction({ blockhash, lastValidBlockHeight, signature }, commitmetLevel);
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
    }, [connection, isSubmitting, sendTransaction]);

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
                    new NodeWallet(newWallet)
                );
                provider = new anchor.AnchorProvider(
                    connection,
                    new NodeWallet(newWallet),
                    {
                        preflightCommitment: 'processed',
                        commitment: 'processed',
                    }
                );
            }

            console.log(newWallet, playerKey.toString());
        }
    }, [publicKey, savedPublicKey]);

    useEffect(() => {
        if (publicKey) {
            setSavedPublicKey(publicKey);
            setIsReferrerModalOpen(true);
            //getRefferal(publicKey);
        }
    }, [publicKey]);

    const handleOptionClick = (option: any) => {
        setSelectedOption(option);
        setIsDropdownOpen(false);
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

            const lowestPingEndpoint = Object.keys(results).reduce((a, b) => (results[a] < results[b] ? a : b));
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
                new NodeWallet(wallet)
            );

            console.log('Updated providerEphemeralRollup:', providerEphemeralRollup.current);
            const { worldId, worldPda } = endpointToWorldMap[fastestEndpoint];
            //setActiveGames([{ worldId: worldId, worldPda: worldPda} as ActiveGame]);
            const newGameInfo: ActiveGame = { worldId: worldId, worldPda: worldPda, name: "loading", active_players: 0, max_players: 0, size: 0, image: `${process.env.PUBLIC_URL}/token.png`, token: "LOADING", base_buyin: 0, min_buyin: 0, max_buyin: 0 }
            //setNewGameCreated(newGameInfo);
            setActiveGames([newGameInfo]);
            fetchAndLogMapData();
            setOpenGameInfo(new Array(activeGames.length).fill(false));
            setEndpointDone(true);
            console.log(fastestEndpoint);
        }
    }, [fastestEndpoint]);

    const openDocs = useCallback(() => {
        window.open('https://docs.supersize.gg/', '_blank');
    }, []);
    const openX = useCallback(() => {
        window.open('https://x.com/SUPERSIZEgg', '_blank');
    }, []);
    const openTG = useCallback(() => {
        window.open('https://t.me/supersizeplayers', '_blank');
    }, []);

    const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setPlayerName(event.target.value);
    };
    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(event.target.value);
    };
    const handleSliderChange = (event: any) => {
        let value = parseFloat(event.target.value);
        value = value > 10 ? 10 : value;
        value = value > 0.1 ? parseFloat(value.toFixed(1)) : value;
        setBuyIn(value);
    };

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
        foodArray.forEach((foodItem, index) => {
            /*const colors = [
                '#da375c', '#d7f5e2', '#fae661', '#e9392d', '#91cf97', '#4d6bad', '#5fb1f2', 
              ];
            const randomColor = colors[index % colors.length];
            console.log(randomColor)*/
            foodData.push({ x: foodItem.x, y: foodItem.y, color: 'None' });
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
        if (foodData.length > 0) {
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
                tax: player.tax,
                speed: player.speed,
                removal: player.scheduledRemovalTime,
                target_x: player.target_x,
                target_y: player.target_y,
                timestamp: performance.now(),
            }));
        setLeaderboard(top10Players);

        if (currentPlayer) {
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
            if (currentPlayer && currentItem && currentItem.authority && currentPlayer.authority) {
                if (currentItem.authority.equals(currentPlayer.authority)) {
                    status += '<span class="me">' + (i + 1) + '. ' + currentItem.name + "</span>";
                } else {
                    status += (i + 1) + '. ' + currentItem.name;
                }
            } else {
                status += (i + 1) + '. ' + currentItem.name;
            }
        }
        const statusElement = document.getElementById('status');
        if (statusElement) {
            statusElement.innerHTML = status;
        }
    }, [setLeaderboard, leaderboard]);


    const updateMyPlayerCashout = useCallback((player: any) => {
        console.log('updating cashout data', player);
        playerCashout.current = player.score;
        myReferrer.current = player.referrerTokenAccount;
        setPlayerTax(player.tax);
        setPlayerCashoutAddy(player.payoutTokenAccount)
    }, [setCurrentPlayer, playerKey, allFood]);

    const updateMyPlayer = useCallback((player: any) => {
        if (player.scheduledRemovalTime) {
            //console.log(player.scheduledRemovalTime.toNumber() * 1000)
            playerRemovalTimeRef.current = player.scheduledRemovalTime;
        }
        //console.log('elapsed time', elapsedTime)
        if (Math.sqrt(player.mass) == 0 &&
            player.score == 0.0 &&
            !cashingOut &&
            !isJoining) {
            const startTime = player.joinTime.toNumber() * 1000;
            const currentTime = Date.now();
            const elapsedTime = currentTime - startTime;
            if (elapsedTime >= 6000) {
                setGameEnded(1);
                setGameId(null);
            }
        }
        if (playerBuyIn.current == 0
        ) {
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

        if (Math.sqrt(player.mass) == 0 &&
            player.score != 0.0 &&
            !isJoining
        ) {
            setCashingOut(true);
            setGameEnded(2);
            setGameId(null);
        }
    }, [setCurrentPlayer, playerKey, allFood]);

    useEffect(() => {
        if (currentPlayer) {
            const playersWithAuthority = allplayers.filter(
                (player) =>
                    player.authority !== null &&
                    player.x !== 50000 &&
                    player.y !== 50000 &&
                    Math.sqrt(player.mass) !== 0
            );
            updateLeaderboard(playersWithAuthority);
            const newVisiblePlayers: Blob[] = playersWithAuthority.reduce((accumulator: Blob[], playerx) => {
                if (currentPlayer && playerx.authority && currentPlayer.authority) {
                    if (currentPlayer.authority.toString() != playerx.authority.toString()) {
                        const halfWidth = screenSize.width / 2;
                        const halfHeight = screenSize.height / 2;
                        const diffX = (playerx.x - currentPlayer.x);
                        const diffY = (playerx.y - currentPlayer.y);

                        if (Math.abs(diffX) <= halfWidth && Math.abs(diffY) <= halfHeight) {
                            accumulator.push({
                                name: playerx.name,
                                authority: playerx.authority,
                                x: playerx.x, //diffX + screenSize.width / 2,
                                y: playerx.y, //diffY + screenSize.height / 2,
                                radius: 4 + Math.sqrt(playerx.mass / 10) * 6,
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
            }, []);
            setPlayers(newVisiblePlayers);
        }
    }, [currentPlayer]);

    const updateMap = useCallback((map: any) => {
        const playerArray = map.players as any[];
        //console.log(map); 
        if (map.nextFood) {
            if (map.nextFood.x !== nextFood.current.x || map.nextFood.y !== nextFood.current.y) {
                //console.log('new food', map.nextFood, nextFood.current);
                nextFood.current = { x: map.nextFood.x, y: map.nextFood.y };
                //processNewFoodTransaction(map.nextFood.x, map.nextFood.y);
            }
        } else if (map.foodQueue > 0) {
            nextFood.current = { x: 0, y: 0 };
            //console.log('new food', map.foodQueue);
            //processNewFoodTransaction(0, 0);
        }
    }, [setPlayers, setCurrentPlayer, playerKey, allFood]);

    const updatePlayers = useCallback((player: any, player_index: number) => {
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
    }, [setAllPlayers, screenSize, currentPlayer]);

    const handlePlayersComponentChange = useCallback((accountInfo: AccountInfo<Buffer>, index: number) => {
        const parsedData = playersComponentClient.current?.coder.accounts.decode("player", accountInfo.data);
        updatePlayers(parsedData, index);
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

    // Subscribe to the game state
    const subscribeToGame = useCallback(async (): Promise<void> => {
        if (!entityMatch.current) return;
        if (!currentPlayerEntity.current) return;

        playersComponentClient.current = await getComponentsClient(PLAYER_COMPONENT);
        foodComponentClient.current = await getComponentsClient(FOOD_COMPONENT);
        mapComponentClient.current = await getComponentsClient(MAP_COMPONENT);

        if (mapComponentSubscriptionId && mapComponentSubscriptionId.current) await providerEphemeralRollup.current.connection.removeAccountChangeListener(mapComponentSubscriptionId.current);
        if (myplayerComponentSubscriptionId && myplayerComponentSubscriptionId.current) await providerEphemeralRollup.current.connection.removeAccountChangeListener(myplayerComponentSubscriptionId.current);
        for (let i = 0; i < foodEntities.current.length; i++) {
            if (foodComponentSubscriptionId && foodComponentSubscriptionId.current) await providerEphemeralRollup.current.connection.removeAccountChangeListener(foodComponentSubscriptionId.current[i]);
        }
        for (let i = 0; i < playerEntities.current.length; i++) {
            if (playersComponentSubscriptionId && playersComponentSubscriptionId.current) await providerEphemeralRollup.current.connection.removeAccountChangeListener(playersComponentSubscriptionId.current[i]);
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
            if (playersComponentSubscriptionId.current === null) {
                playersComponentSubscriptionId.current = [providerEphemeralRollup.current.connection.onAccountChange(playersComponenti, (accountInfo) => handlePlayersComponentChange(accountInfo, i), 'processed')];
            } else {
                playersComponentSubscriptionId.current = [...playersComponentSubscriptionId.current, providerEphemeralRollup.current.connection.onAccountChange(playersComponenti, (accountInfo) => handlePlayersComponentChange(accountInfo, i), 'processed')];
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

        for (let i = 0; i < playerEntities.current.length; i++) {
            const playersComponenti = FindComponentPda({
                componentId: PLAYER_COMPONENT,
                entity: playerEntities.current[i],
            });
            //console.log( i, playerEntities.current[i]);
            //console.log('player component', playersComponenti);
            (playersComponentClient.current?.account as any).player.fetch(playersComponenti, "processed").then((fetchedData: any) => updatePlayers(fetchedData, i)).catch((error: any) => {
                //console.error("Failed to fetch account:", error);
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

        setSubscribedToGame(true);
    }, [connection, handlePlayersComponentChange, handleMyPlayerComponentChange, handleFoodComponentChange, handleMapComponentChange, updatePlayers, updateFoodList, updateMap, updateMyPlayer]);

    const handleGameIdChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = event.target.value;
        try {
            setGameId(new PublicKey(newValue));
        } catch {
        }
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
                        //console.error(`Error with signature ${signature}`, result.err);
                        reject(result.err);
                    } else {
                        setTimeout(() => resolve(), 1000);
                    }
                },
                commitment
            );
        });
    };

    const checkTransactionStatus = async (
        connection: anchor.web3.Connection,
        signature: string
    ): Promise<boolean> => {
        try {
            const status = await connection.getSignatureStatus(signature, { searchTransactionHistory: true });
            if (status && status.value && status.value.confirmationStatus === "confirmed" && status.value.err === null) {
                console.log("Transaction succeeded:", signature);
                return true;
            } else {
                console.warn("Transaction still pending or failed:", signature);
                return false;
            }
        } catch (error) {
            console.error("Error checking transaction status:", error);
            return false;
        }
    };

    const retrySubmitTransaction = async (
        transaction: Transaction,
        connection: anchor.web3.Connection,
        commitment: anchor.web3.Commitment,
        maxRetries = 3,
        delay = 2000
    ): Promise<string | null> => {
        let attempts = 0;
        let signature: string | null = null;

        while (attempts < maxRetries) {
            try {
                // Submit the transaction
                signature = await submitTransaction(transaction, commitment, true);
                console.log("transaction attempt:", signature);
                await new Promise(resolve => setTimeout(resolve, 1000));
                // Check transaction status
                if (signature) {
                    const success = await checkTransactionStatus(connection, signature);
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

    async function getPriorityFeeEstimate(priorityLevel: string, publicKeys: string[]) {
        const response = await fetch("https://mainnet.helius-rpc.com/?api-key=cba33294-aa96-414c-9a26-03d5563aa676", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 'helius-example',
                method: 'getPriorityFeeEstimate',
                params: [
                    {
                        accountKeys: publicKeys,
                        options: {
                            recommended: true,
                        },
                    }
                ],
            }),
        });
        const data = await response.json();
        console.log(
            "Fee in function for",
            priorityLevel,
            " :",
            data.result.priorityFeeEstimate
        );
        return data.result;
    }

    /**
     * Create a new join game transaction
     */
    const joinGameTx = useCallback(async (selectGameId: ActiveGame) => {
        if (!playerKey) {
            setTransactionError("Wallet not connected");
            return;
        }
        if (!publicKey) {
            setTransactionError("Wallet not connected");
            return;
        }
        if (isSubmitting) return;
        if (isJoining) return;
        if (selectGameId.name == "loading") return;
        setIsJoining(true);
        setScreenSize({ width: selectGameId.size, height: selectGameId.size });
        const gameInfo = selectGameId;
        let maxplayer = 20;
        let foodcomponents = 32;

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
        let map_size = 4000;
        const mapComponentClient = await getComponentsClient(MAP_COMPONENT);
        const mapacc = await providerEphemeralRollup.current.connection.getAccountInfo(
            mapComponentPda, "processed"
        );
        if (mapacc) {
            const mapParsedData = mapComponentClient.coder.accounts.decode("map", mapacc.data);
            console.log('map size', mapParsedData.width)
            map_size = mapParsedData.width;
        }
        setMapSize(map_size);
        if (map_size == 4000) {
            maxplayer = 20;
            foodcomponents = 16 * 5;
        }
        else if (map_size == 6000) {
            maxplayer = 40;
            foodcomponents = 36 * 5;
        }
        else if (map_size == 10000) {
            maxplayer = 100;
            foodcomponents = 100 * 5;
        }

        entityMatch.current = mapEntityPda;
        const foodEntityPdas: any[] = [];
        console.log(foodcomponents)

        for (let i = 1; i < foodcomponents + 1; i++) {
            const foodseed = 'food' + i.toString();
            const foodEntityPda = FindEntityPda({
                worldId: gameInfo.worldId,
                entityId: new anchor.BN(0),
                seed: foodseed
            })
            foodEntityPdas.push(foodEntityPda);
        }

        const playerEntityPdas: any[] = [];
        const playerClientER = await getComponentsClient(PLAYER_COMPONENT);
        const playerClient = await getComponentsClientBasic(PLAYER_COMPONENT);
        let newplayerEntityPda: any = null;
        let myPlayerId = '';
        let myPlayerStatus = 'new_player';
        let need_to_undelegate = false;
        for (let i = 1; i < maxplayer + 1; i++) {
            const playerentityseed = 'player' + i.toString();
            const playerEntityPda = FindEntityPda({
                worldId: gameInfo.worldId,
                entityId: new anchor.BN(0),
                seed: playerentityseed
            })
            playerEntityPdas.push(playerEntityPda);
            const playersComponentPda = FindComponentPda({
                componentId: PLAYER_COMPONENT,
                entity: playerEntityPda,
            });
            const playersacc = await provider.connection.getAccountInfo(
                playersComponentPda, "processed"
            );
            const playersaccER = await providerEphemeralRollup.current.connection.getAccountInfo(
                playersComponentPda, "processed"
            );
            if (playersacc) {
                const playersParsedData = playerClient.coder.accounts.decode("player", playersacc.data);
                if (playersacc.owner.toString() === "DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh") {
                    if (playersParsedData.authority !== null) {
                        if (playersaccER) {
                            const playersParsedDataER = playerClientER.coder.accounts.decode("player", playersaccER.data);
                            if (playersParsedData.authority.toString() == playerKey.toString()) {
                                if (playersParsedDataER.authority) {
                                    if (playersParsedDataER.authority.toString() == playerKey.toString()) {
                                        myPlayerStatus = "resume_session";
                                        newplayerEntityPda = playerEntityPda;
                                        myPlayerId = playerentityseed;
                                        need_to_undelegate = false;
                                    }
                                    else {
                                        myPlayerStatus = "rejoin_session";
                                        newplayerEntityPda = playerEntityPda;
                                        myPlayerId = playerentityseed;
                                        need_to_undelegate = false;
                                    }
                                } else {
                                    myPlayerStatus = "rejoin_session";
                                    newplayerEntityPda = playerEntityPda;
                                    myPlayerId = playerentityseed;
                                    need_to_undelegate = false;
                                }
                            } else {
                                if (playersParsedDataER.authority == null &&
                                    playersParsedData.authority !== null &&
                                    playersParsedDataER.x == 50000 &&
                                    playersParsedDataER.y == 50000 &&
                                    playersParsedDataER.score == 0 &&
                                    newplayerEntityPda == null
                                ) {
                                    const startTime = playersParsedDataER.joinTime.toNumber() * 1000;
                                    const currentTime = Date.now();
                                    const elapsedTime = currentTime - startTime;
                                    if (elapsedTime >= 10000) {
                                        newplayerEntityPda = playerEntityPda;
                                        myPlayerId = playerentityseed;
                                        need_to_undelegate = true;
                                    }
                                }
                            }
                        } else if (playersParsedData.authority !== null) {
                            if (playersParsedData.authority.toString() == playerKey.toString()) {
                                myPlayerStatus = "rejoin_session";
                                newplayerEntityPda = playerEntityPda;
                                myPlayerId = playerentityseed;
                                need_to_undelegate = false;
                            }
                        }
                    }
                }
                else if (playersParsedData.authority == null && newplayerEntityPda == null) {
                    newplayerEntityPda = playerEntityPda;
                    myPlayerId = playerentityseed;
                    need_to_undelegate = false;
                }
                else {
                    if (playersParsedData.authority !== null) {
                        if (playersParsedData.authority.toString() == playerKey.toString()) {
                            myPlayerStatus = "rejoin_undelegated";
                            newplayerEntityPda = playerEntityPda;
                            myPlayerId = playerentityseed;
                            need_to_undelegate = false;
                        }
                    }
                }
            }
            else {
                if (newplayerEntityPda == null) {
                    newplayerEntityPda = playerEntityPda;
                    myPlayerId = playerentityseed;
                    need_to_undelegate = false;
                }
            }
        }
        console.log('my player', myPlayerId, myPlayerStatus);

        const playerComponentPda = FindComponentPda({
            componentId: PLAYER_COMPONENT,
            entity: newplayerEntityPda,
        });
        console.log('component pda', playerComponentPda.toString())

        if (need_to_undelegate) {
            try {
                const undelegateIx = createUndelegateInstruction({
                    payer: playerKey,
                    delegatedAccount: playerComponentPda,
                    componentPda: PLAYER_COMPONENT,
                });
                let undeltx = new anchor.web3.Transaction()
                    .add(undelegateIx);
                undeltx.recentBlockhash = (await providerEphemeralRollup.current.connection.getLatestBlockhash()).blockhash;
                undeltx.feePayer = walletRef.current.publicKey;
                undeltx.sign(walletRef.current);
                //undeltx = await providerEphemeralRollup.current.wallet.signTransaction(undeltx);
                const playerundelsignature = await providerEphemeralRollup.current.sendAndConfirm(undeltx, [], { skipPreflight: false });
                console.log('undelegate', playerundelsignature);
            } catch (error) {
                console.log('Error undelegating:', error);
            }
        }

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
        const anteComponentClient = await getComponentsClient(ANTEROOM_COMPONENT);
        const anteacc = await provider.connection.getAccountInfo(
            anteComponentPda, "processed"
        );

        let token_account_owner_pda = new PublicKey(0);
        let vault_token_account = new PublicKey(0);
        let mint_of_token_being_sent = new PublicKey(0);
        let sender_token_account = new PublicKey(0);
        let payout_token_account = new PublicKey(0);
        let vault_program_id = new PublicKey("BAP315i1xoAXqbJcTT1LrUS45N3tAQnNnPuNQkCcvbAr");
        const combinedTx = new Transaction();

        if (anteacc) {
            const anteParsedData = anteComponentClient.coder.accounts.decode("anteroom", anteacc.data);
            vault_token_account = anteParsedData.vaultTokenAccount;
            mint_of_token_being_sent = anteParsedData.token;
            let usertokenAccountInfo = await getAssociatedTokenAddress(
                mint_of_token_being_sent,
                publicKey
            );
            payout_token_account = usertokenAccountInfo;
            const { name, image } = await fetchTokenMetadata(mint_of_token_being_sent.toString());
            console.log("token", name);

            try {
                await axios.post("https://supersize.lewisarnsten.workers.dev/create-contest", {
                    name: name,
                    tokenAddress: mint_of_token_being_sent.toString()
                })
            } catch (error) {
                console.log('error', error)
            }
            try {
                await axios.post("https://supersize.lewisarnsten.workers.dev/create-user", {
                    walletAddress: publicKey.toString(),
                    contestId: name,
                    name: publicKey.toString(),
                })
            } catch (error) {
                console.log('error', error)
            }

            /*
            const playerbalance = await connection.getBalance(playerKey, 'processed');
            let targetBalance = 0.002 * LAMPORTS_PER_SOL;
            const amountToTransfer = targetBalance > playerbalance ? targetBalance - playerbalance : 0;
            console.log(amountToTransfer);
            if(amountToTransfer > 0){
                const soltransfertx = SystemProgram.transfer({
                    fromPubkey: publicKey,
                    toPubkey: playerKey,
                    lamports: amountToTransfer, 
                });
                
                combinedTx.add(soltransfertx);
            } */
        } else {
            setTransactionError("Failed to find game token info");
            return;
        }

        if (myPlayerStatus !== "rejoin_undelegated" && myPlayerStatus !== "resume_session" && myPlayerStatus !== "rejoin_session") {
            let applyBuyInSystem = await ApplySystem({
                authority: publicKey,
                world: gameInfo.worldPda,
                entities: [
                    {
                        entity: newplayerEntityPda,
                        components: [{ componentId: PLAYER_COMPONENT }],
                    },
                    {
                        entity: anteEntityPda,
                        components: [{ componentId: ANTEROOM_COMPONENT }],
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
                        pubkey: playerKey,
                        isWritable: true,
                        isSigner: false,
                    },
                    {
                        pubkey: payout_token_account,
                        isWritable: true,
                        isSigner: false,
                    },
                    {
                        pubkey: publicKey,
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

            const buddyLinkClient = new Client(connection as any, publicKey, "2iF3HaLpk6vuUXxGK3uDsxWoP5htC7NWZNctAevxZewY");
            if (myReferralAccount.current) {
                const referrerRes = ""; //await getUser(referrerInput);
                if (myReferralAccount.current !== "") { //referrerRes.success
                    const referrerBuddyLinkProfile = await buddyLinkClient.buddy.getProfile(new PublicKey(myReferralAccount.current)); //.data.wallet
                    if (referrerBuddyLinkProfile) {
                        const treasury = await buddyLinkClient.pda.getTreasuryPDA(
                            [referrerBuddyLinkProfile?.account.pda],
                            [10_000],
                            mint_of_token_being_sent
                        );
                        const member = (await buddyLinkClient.member.getByTreasuryOwner(treasury))[0] || null;
                        const remainingAccounts =
                            await buddyLinkClient.accounts.validateReferrerAccounts(
                                mint_of_token_being_sent,
                                member.account.pda
                            );

                        if (!remainingAccounts.memberPDA.equals(PublicKey.default)) {
                            // submit with referrer
                            applyBuyInSystem = await ApplySystem({
                                authority: publicKey,
                                world: gameInfo.worldPda,
                                entities: [
                                    {
                                        entity: newplayerEntityPda,
                                        components: [{ componentId: PLAYER_COMPONENT }],
                                    },
                                    {
                                        entity: anteEntityPda,
                                        components: [{ componentId: ANTEROOM_COMPONENT }],
                                    },
                                ],
                                systemId: BUY_IN,
                                args: {
                                    buyin: buyIn,
                                    referrer: null,
                                },
                                extraAccounts: [
                                    {
                                        pubkey: vault_token_account,
                                        isWritable: true,
                                        isSigner: false,
                                    },
                                    {
                                        pubkey: playerKey,
                                        isWritable: true,
                                        isSigner: false,
                                    },
                                    {
                                        pubkey: payout_token_account,
                                        isWritable: true,
                                        isSigner: false,
                                    },
                                    {
                                        pubkey: publicKey,
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
                                    {
                                        pubkey: remainingAccounts.programId,
                                        isWritable: false,
                                        isSigner: false
                                    },
                                    {
                                        pubkey: remainingAccounts.buddyProfile,
                                        isWritable: false,
                                        isSigner: false
                                    },
                                    {
                                        pubkey: remainingAccounts.buddy,
                                        isWritable: false,
                                        isSigner: false
                                    },
                                    {
                                        pubkey: remainingAccounts.buddyTreasury,
                                        isWritable: false,
                                        isSigner: false
                                    },
                                    {
                                        pubkey: remainingAccounts.memberPDA,
                                        isWritable: false,
                                        isSigner: false
                                    },
                                    {
                                        pubkey: remainingAccounts.referrerMember,
                                        isWritable: false,
                                        isSigner: false
                                    },
                                    {
                                        pubkey: remainingAccounts.referrerTreasury,
                                        isWritable: true,
                                        isSigner: false
                                    },
                                    {
                                        pubkey: remainingAccounts.referrerTreasuryReward,
                                        isWritable: false,
                                        isSigner: false
                                    },
                                    {
                                        pubkey: remainingAccounts.mint,
                                        isWritable: false,
                                        isSigner: false
                                    },
                                    {
                                        pubkey: remainingAccounts.referrerATA,
                                        isWritable: false,
                                        isSigner: false
                                    },
                                ],
                            });
                        }
                    }
                }
            }
            combinedTx.add(applyBuyInSystem.transaction);
        }

        if (myPlayerStatus !== "resume_session") {
            try {
                const playerdeltx = new anchor.web3.Transaction();
                const playerdelegateIx = createDelegateInstruction({
                    entity: newplayerEntityPda,
                    account: playerComponentPda,
                    ownerProgram: PLAYER_COMPONENT,
                    payer: publicKey,
                });
                combinedTx.add(playerdelegateIx)
                const playerdelsignature = await submitTransactionUser(combinedTx);
                console.log(
                    `Delegation signature: ${playerdelsignature}`
                );
                const acc = await providerEphemeralRollup.current.connection.getAccountInfo(
                    playerComponentPda
                );
                if (acc) {
                    console.log('confirm del', acc.owner.toString());
                }
            } catch (error) {
                console.log('Error delegating:', error);
                {/* const reclaim_transaction = new Transaction();
                    const playerbalance = await connection.getBalance(playerKey, 'processed');
                    const solTransferInstruction = SystemProgram.transfer({
                        fromPubkey: playerKey,
                        toPubkey: publicKey,
                        lamports: playerbalance - 1500000,
                    });
                    reclaim_transaction.add(solTransferInstruction);
                    const computePriceIx = ComputeBudgetProgram.setComputeUnitPrice({
                        microLamports: 1000002,
                    });
                    const computeLimitIx = ComputeBudgetProgram.setComputeUnitLimit({
                        units: 10_000,
                    });
                    reclaim_transaction.add(computePriceIx).add(computeLimitIx);
                    const reclaimsig = await submitTransaction(reclaim_transaction, "confirmed", true);
                    console.log(
                        `buy in failed, reclaimed tokens: ${reclaimsig}`
                    ); */}
                setTransactionError("Buy in failed, please retry");
                setIsSubmitting(false);
                setIsJoining(false);
                return;
            }
        }

        const applySystem = await ApplySystem({
            authority: playerKey,
            world: gameInfo.worldPda,
            entities: [
                {
                    entity: newplayerEntityPda,
                    components: [{ componentId: PLAYER_COMPONENT }],
                },
                {
                    entity: mapEntityPda,
                    components: [{ componentId: MAP_COMPONENT }],
                },
            ],
            systemId: JOIN_GAME,
            args: {
                name: playerName,
                //buyin: 1.0,
            },
        });
        const jointransaction = applySystem.transaction;
        const {
            context: { slot: minContextSlot },
            value: { blockhash, lastValidBlockHeight }
        } = await providerEphemeralRollup.current.connection.getLatestBlockhashAndContext();
        jointransaction.recentBlockhash = blockhash;
        jointransaction.feePayer = walletRef.current.publicKey;
        jointransaction.sign(walletRef.current);
        const signature = await providerEphemeralRollup.current.connection.sendRawTransaction(
            jointransaction.serialize(),
            { skipPreflight: true }
        ).catch((error) => {
            console.log(error)
        });
        console.log('joined game', signature);

        if (signature) {
            setGameId(mapEntityPda);
            setMapSize(selectGameId.size);
            entityMatch.current = mapEntityPda;
            currentPlayerEntity.current = newplayerEntityPda;
            anteroomEntity.current = anteEntityPda;
            currentWorldId.current = gameInfo.worldPda;
            foodEntities.current = foodEntityPdas;
            playerEntities.current = playerEntityPdas;
            const emptyPlayer: Blob = {
                name: 'unnamed',
                authority: null,
                x: 50000,
                y: 50000,
                radius: 0,
                mass: 0,
                score: 0,
                tax: 0,
                speed: 0,
                removal: new BN(0),
                target_x: 0,
                target_y: 0,
                timestamp: 0,
            };
            setAllPlayers(new Array(playerEntityPdas.length).fill(emptyPlayer));
            setAllFood(new Array(foodEntityPdas.length).fill([]));
            setFoodListLen(new Array(foodEntityPdas.length).fill(0));
            await subscribeToGame();
            //setTimeout(() => {
            setIsJoining(false);
            //}, 5000);
        }

    }, [playerKey, submitTransaction, subscribeToGame]);

    function findListIndex(pubkey: PublicKey): number | null {
        const index = allplayers.findIndex((player) => player.authority?.toString() === pubkey.toString());
        if (index !== -1) {
            return index;
        } else {
            return null;
        }
    }

    const preExitGameTx = useCallback(async () => {
        if (!playerKey) {
            setTransactionError('Wallet is not initialized');
            return null;
        }
        if (currentWorldId.current == null) {
            setTransactionError('world not found');
            return null;
        }
        const player_entity = currentPlayerEntity.current as PublicKey;
        const map_entity = entityMatch.current as PublicKey;
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
            ],
            systemId: EXIT_GAME,
            args: {
                timestamp: performance.now(),
            },
        });
        const transaction = applySystem.transaction;
        const {
            context: { slot: minContextSlot },
            value: { blockhash, lastValidBlockHeight }
        } = await providerEphemeralRollup.current.connection.getLatestBlockhashAndContext();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = walletRef.current.publicKey;
        transaction.sign(walletRef.current);
        console.log('staged exit');
        const signature = await providerEphemeralRollup.current.connection.sendRawTransaction(
            transaction.serialize(),
            { skipPreflight: true }
        );
    }, [playerKey, submitTransaction, subscribeToGame]);

    const exitGameTx = useCallback(async () => {
        if (!playerKey) {
            setTransactionError('Wallet is not initialized');
            return null;
        }
        if (currentWorldId.current == null) {
            setTransactionError('world not found');
            return null;
        }
        const player_entity = currentPlayerEntity.current as PublicKey;
        const map_entity = entityMatch.current as PublicKey;
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
            ],
            systemId: EXIT_GAME,
            args: {
                timestamp: performance.now(),
            },
        });
        const transaction = applySystem.transaction;
        const {
            context: { slot: minContextSlot },
            value: { blockhash, lastValidBlockHeight }
        } = await providerEphemeralRollup.current.connection.getLatestBlockhashAndContext();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = walletRef.current.publicKey;
        transaction.sign(walletRef.current);
        setCashingOut(true);
        try {
            const signature = await providerEphemeralRollup.current.sendAndConfirm(transaction);
            console.log('exiting', signature)
            if (signature != null) {
                setGameId(null);
                setGameEnded(2);
            }
        } catch (error) {
            console.log('Error cashing out:', error);
        }
        //const signature = await providerEphemeralRollup.current.sendAndConfirm(transaction); 

    }, [playerKey, submitTransaction, subscribeToGame]);


    const cleanUp = async () => {
        //currentPlayer.x === 50000 &&
        //currentPlayer.y === 50000 && 
        if (
            currentPlayer &&
            Math.sqrt(currentPlayer.mass) == 0 &&
            ((cashingOut && gameEnded == 2) ||
                !cashingOut)
        ) {
            if (currentWorldId.current == null) {
                setTransactionError('world not found');
                return;
            }
            //console.log(currentPlayer)
            if (currentPlayerEntity.current && anteroomEntity.current && entityMatch.current) {
                console.log('cashing out')
                const myplayerComponent = FindComponentPda({
                    componentId: PLAYER_COMPONENT,
                    entity: currentPlayerEntity.current,
                });
                let newplayersComponentClient = await getComponentsClient(PLAYER_COMPONENT);
                (newplayersComponentClient.account as any).player.fetch(myplayerComponent, "processed").then(updateMyPlayerCashout).catch((error: any) => {
                    console.error("Failed to fetch account:", error);
                });
                const undelegateIx = createUndelegateInstruction({
                    payer: playerKey,
                    delegatedAccount: myplayerComponent,
                    componentPda: PLAYER_COMPONENT,
                });
                const tx = new anchor.web3.Transaction()
                    .add(undelegateIx);
                tx.recentBlockhash = (await providerEphemeralRollup.current.connection.getLatestBlockhash()).blockhash;
                tx.feePayer = walletRef.current.publicKey;
                tx.sign(walletRef.current);
                try {
                    const playerdelsignature = await providerEphemeralRollup.current.sendAndConfirm(tx, [], { skipPreflight: false });
                    /*await waitSignatureConfirmation(
                        playerdelsignature,
                        providerEphemeralRollup.current.connection,
                        "finalized"
                    );*/
                    console.log('undelegate', playerdelsignature)
                } catch (error) {
                    console.log('Error undelegating:', error);
                }

                const anteComponentPda = FindComponentPda({
                    componentId: ANTEROOM_COMPONENT,
                    entity: anteroomEntity.current,
                });
                const anteComponentClient = await getComponentsClient(ANTEROOM_COMPONENT);
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
                let vault_program_id = new PublicKey("BAP315i1xoAXqbJcTT1LrUS45N3tAQnNnPuNQkCcvbAr");

                if (anteacc && savedPublicKey) {
                    const anteParsedData = anteComponentClient.coder.accounts.decode("anteroom", anteacc.data);
                    vault_token_account = anteParsedData.vaultTokenAccount;
                    mint_of_token_being_sent = anteParsedData.token;
                    owner_token_account = anteParsedData.gamemasterTokenAccount;
                    const { name, image } = await fetchTokenMetadata(mint_of_token_being_sent.toString());
                    console.log('win amount', (playerCashout.current * 0.98) - playerBuyIn.current, playerCashout.current, playerBuyIn.current);

                    try {
                        await axios.post('https://supersize.lewisarnsten.workers.dev/update-wins', {
                            walletAddress: savedPublicKey?.toString(),
                            amount: (playerCashout.current * 0.98) - playerBuyIn.current,
                            contestId: name
                        })
                    } catch (error) {
                        console.log('error', error)
                    }

                    //supersize_token_account = anteParsedData.gamemasterTokenAccount;
                    supersize_token_account = await getAssociatedTokenAddress(mint_of_token_being_sent, new PublicKey("DdGB1EpmshJvCq48W1LvB1csrDnC4uataLnQbUVhp6XB"));
                    let usertokenAccountInfo = await getAssociatedTokenAddress(
                        mint_of_token_being_sent,
                        savedPublicKey
                    );
                    sender_token_account = usertokenAccountInfo;
                    let [tokenAccountOwnerPda] = PublicKey.findProgramAddressSync(
                        [Buffer.from("token_account_owner_pda"), mapComponent.toBuffer()],
                        vault_program_id
                    );
                    if (playerCashoutAddy) {
                        sender_token_account = playerCashoutAddy;
                    }
                    if (cashingOut && gameEnded == 2) {
                        let referrer_token_account = null;
                        if (myReferrer.current) {
                            referrer_token_account = new PublicKey(myReferrer.current);
                        }
                        const extraAccounts = referrer_token_account ? [
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
                                pubkey: referrer_token_account,
                                isWritable: true,
                                isSigner: false,
                            },
                            {
                                pubkey: savedPublicKey,
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
                        ] : [
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
                                pubkey: savedPublicKey,
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
                        ]

                        const applyCashOutSystem = await ApplySystem({
                            authority: savedPublicKey,
                            world: currentWorldId.current,
                            entities: [
                                {
                                    entity: currentPlayerEntity.current,
                                    components: [{ componentId: PLAYER_COMPONENT }],
                                },
                                {
                                    entity: anteroomEntity.current,
                                    components: [{ componentId: ANTEROOM_COMPONENT }],
                                },
                            ],
                            systemId: CASH_OUT,
                            extraAccounts: extraAccounts
                        /*[
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
                              pubkey: savedPublicKey,
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
                          ]*/,
                        });
                        const cashouttx = new anchor.web3.Transaction().add(applyCashOutSystem.transaction);
                        const cashoutsignature = await submitTransactionUser(cashouttx);

                        console.log('cashout', cashoutsignature);
                        if (cashoutsignature) {
                            setCashoutTx(cashoutsignature);
                            playersComponentSubscriptionId.current = [];
                            currentPlayerEntity.current = null;
                            entityMatch.current = null;
                            foodEntities.current = [];
                            setPlayers([]);
                            setAllFood([]);
                            setFoodListLen([]);
                            setGameId(null);
                        } else {
                            setCashoutTx("error");
                            setTransactionError("Error cashing out, please retry");
                            return;
                        }
                    } else {
                        playersComponentSubscriptionId.current = [];
                        currentPlayerEntity.current = null;
                        entityMatch.current = null;
                        foodEntities.current = [];
                        setPlayers([]);
                        setAllFood([]);
                        setFoodListLen([]);
                        setGameId(null);
                    }

                    /*const reclaim_transaction = new Transaction(); //.add(computePriceIx);
                    const playerbalance = await connection.getBalance(playerKey, 'processed');
                    const solTransferInstruction = SystemProgram.transfer({
                        fromPubkey: playerKey,
                        toPubkey: savedPublicKey,
                        lamports: playerbalance - 1000000,
                    });
                    reclaim_transaction.add(solTransferInstruction);
                    const computePriceIx = ComputeBudgetProgram.setComputeUnitPrice({
                        microLamports: 1000002,
                    });
                    const computeLimitIx = ComputeBudgetProgram.setComputeUnitLimit({
                        units: 10_000,
                    });
                    reclaim_transaction.add(computePriceIx).add(computeLimitIx);
                    const reclaimsig = await submitTransaction(reclaim_transaction, "confirmed", true);
                    console.log("Reclaim SOL", reclaimsig, playerbalance);

                    if(reclaimsig){
                        setReclaimTx(reclaimsig);
                    }else{
                        setTransactionError("Error reclaiming SOL");
                        //setGameEnded(4);
                    }*/
                }
            }
            //if(gameEnded==0){
            //    setGameEnded(1);
            //}

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

    useEffect(() => {
        cleanUp();
    }, [gameEnded]);

    useEffect(() => {
        if (currentPlayer) {
            const visibleFood = allFood.map((foodList) => {
                return foodList.reduce<Food[]>((innerAcc, foodItem) => {
                    const diffX = foodItem.x - currentPlayer.x;
                    const diffY = foodItem.y - currentPlayer.y;
                    if (Math.abs(diffX) <= screenSize.width / 2 && Math.abs(diffY) <= screenSize.height / 2) {
                        innerAcc.push({
                            x: foodItem.x, // - currentPlayer.x + screenSize.width / 2,
                            y: foodItem.y, //- currentPlayer.y + screenSize.height / 2
                            color: foodItem.color
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
                let currentSection = getSectionIndex(currentPlayer.x, currentPlayer.y, mapSize, 2);
                for (const section_index of currentSection) {
                    const eatFoodTx = await ApplySystem({
                        authority: playerKey,
                        world: currentWorldId.current,
                        entities: [
                            {
                                entity: currentPlayerEntity.current,
                                components: [{ componentId: PLAYER_COMPONENT }],
                            },
                            {
                                entity: foodEntities.current[section_index],
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
                let playerstoeat = checkPlayerDistances(players, screenSize);
                if (playerstoeat) {
                    let playersListIndex = findListIndex(playerstoeat);
                    if (playersListIndex != null) {
                        const eatPlayerTx = await ApplySystem({
                            authority: playerKey,
                            world: currentWorldId.current,
                            entities: [
                                {
                                    entity: currentPlayerEntity.current,
                                    components: [{ componentId: PLAYER_COMPONENT }],
                                },
                                {
                                    entity: playerEntities.current[playersListIndex],
                                    components: [{ componentId: PLAYER_COMPONENT }],
                                },
                                {
                                    entity: entityMatch.current,
                                    components: [{ componentId: MAP_COMPONENT }],
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

                let { food_x, food_y } = getClampedFoodPosition(currentPlayer.x, currentPlayer.y, newX, newY, currentPlayer.radius, mapSize, mapSize);
                let targetSectionBoosting = getSectionIndex(food_x, food_y, mapSize, 2);
                let selectedSection = targetSectionBoosting.reduce(
                    (minIndex, currentIndex) =>
                        foodListLen[currentIndex] < foodListLen[minIndex] ? currentIndex : minIndex,
                    targetSectionBoosting[0]
                );
                //let targetSectionBoosting = getSectionIndex(food_x, food_y, mapSize, true);
                const makeMove = await ApplySystem({
                    authority: playerKey,
                    world: currentWorldId.current,
                    entities: [
                        {
                            entity: currentPlayerEntity.current,
                            components: [{ componentId: PLAYER_COMPONENT }],
                        },
                        {
                            entity: foodEntities.current[selectedSection],
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
                        timestamp: performance.now(),
                    },
                });
                let transaction = makeMove.transaction;
                alltransaction.add(transaction);

                const {
                    context: { slot: minContextSlot },
                    value: { blockhash, lastValidBlockHeight }
                } = await providerEphemeralRollup.current.connection.getLatestBlockhashAndContext();

                alltransaction.recentBlockhash = blockhash;
                alltransaction.feePayer = walletRef.current.publicKey;
                alltransaction.sign(walletRef.current);
                let signature = await processSessionEphemTransaction(alltransaction).catch((error) => {
                    console.log(error)
                });
                lastUpdateRef.current = performance.now();
                //console.log(currentPlayer);
                setIsSubmitting(false);
                setTransactionError(null);
                setTransactionSuccess(null);
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
    }, [gameId, currentPlayer, exitHovered, isMouseDown]);

    useEffect(() => {
        const interval = setInterval(() => {
            if (lastUpdateRef.current !== null) {
                const now = performance.now();
                //console.log(currentPlayer);
                if (now - lastUpdateRef.current > 1000) {
                    console.log('force update');
                    setCurrentPlayer((prev) => {
                        if (!prev) {
                            return null;
                        }
                        return {
                            ...prev,
                            x: prev.x,
                            y: prev.y,
                            name: prev.name,
                            authority: prev.authority,
                            radius: prev.radius,
                            mass: prev.mass,
                            score: prev.score,
                            target_x: prev.target_x,
                            target_y: prev.target_y,
                            timestamp: performance.now(),
                        };
                    });
                }
            }
        }, 1000);

        return () => clearInterval(interval); // Cleanup interval on unmount
    }, [gameId]);

    useEffect(() => {
        //const firstHalf = foodListLen.slice(0, Math.floor(foodListLen.length / 2));
        //const hasValueLessThan100 = firstHalf.some(value => value < 100);

        const intervalId = setInterval(() => {
            processNewFoodTransaction(nextFood.current.x, nextFood.current.y);
        }, 200);

        return () => clearInterval(intervalId);
    }, [gameId, nextFood]);

    function getClampedFoodPosition(player_x: number, player_y: number, target_x: number, target_y: number, player_radius: number, map_width: number, map_height: number): { food_x: number; food_y: number } {
        const dx = target_x - player_x;
        const dy = target_y - player_y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const unit_x = dx / dist;
        const unit_y = dy / dist;
        const pseudo_random_float_x = 1.5;
        const pseudo_random_float_y = 1.5;
        const offset_x = -unit_x * player_radius * pseudo_random_float_x;
        const offset_y = -unit_y * player_radius * pseudo_random_float_y;
        const food_x = Math.round(player_x + offset_x);
        const food_y = Math.round(player_y + offset_y);
        const clamped_food_x = Math.min(Math.max(food_x, 0), map_width);
        const clamped_food_y = Math.min(Math.max(food_y, 0), map_height);
        return { food_x: clamped_food_x, food_y: clamped_food_y };
    }

    const checkPlayerDistances = (visiblePlayers: Blob[], screenSize: { width: number, height: number }) => {
        if (currentPlayer?.radius) {
            const centerX = screenSize.width / 2;
            const centerY = screenSize.height / 2;

            for (const player of visiblePlayers) {
                const distance = Math.sqrt((player.x - currentPlayer.x) ** 2 + (player.y - currentPlayer.y) ** 2);
                if (distance < currentPlayer.radius) {
                    return player.authority;
                }
            }
        }
        return null;
    };

    const checkFoodDistances = (visibleFood: { x: number, y: number }[], screenSize: { width: number, height: number }) => {
        if (currentPlayer?.radius) {
            const centerX = screenSize.width / 2;
            const centerY = screenSize.height / 2;
            return visibleFood.some(food => {
                const distance = Math.sqrt((food.x - centerX) ** 2 + (food.y - centerY) ** 2);
                return distance < currentPlayer.radius;
            });
        }
        return null;
    };

    function getSectionIndex(x: number, y: number, mapSize: number, duplicateEncodings: number = 5): number[] {
        const sectionSize = 1000;
        const sectionsPerRow = mapSize / sectionSize;
        const mapSectionCount = sectionsPerRow * sectionsPerRow;
        const adjustedX = Math.min(x, mapSize - 1);
        const adjustedY = Math.min(y, mapSize - 1);
        const row = Math.floor(adjustedY / sectionSize);
        const col = Math.floor(adjustedX / sectionSize);
        let baseIndex = row * sectionsPerRow + col;
        let food_indices: number[] = [];
        for (let i = 0; i < duplicateEncodings; i++) {
            food_indices.push(baseIndex + i * mapSectionCount)
        }

        return food_indices;
    }

    const processNewFoodTransaction = async (foodX: number, foodY: number) => {
        if (currentWorldId.current !== null) {
            const allTransaction = new anchor.web3.Transaction();
            if (currentPlayerEntity.current && entityMatch.current) {
                try {
                    const mapComponent = FindComponentPda({
                        componentId: MAP_COMPONENT,
                        entity: entityMatch.current,
                    });
                    const mapacc = await providerEphemeralRollup.current.connection.getAccountInfo(
                        mapComponent, "processed"
                    );
                    let nextFoodx = foodX;
                    let nextFoody = foodY;
                    if (mapacc) {
                        const mapParsedData = mapComponentClient.current?.coder.accounts.decode("map", mapacc?.data);
                        if (mapParsedData.nextFood != null) {
                            nextFoodx = mapParsedData.nextFood.x;
                            nextFoody = mapParsedData.nextFood.y;
                        }
                    }
                    let currentSection = getSectionIndex(foodX, foodY, mapSize, 2);
                    let selectedSection = currentSection.reduce(
                        (minIndex, currentIndex) =>
                            foodListLen[currentIndex] < foodListLen[minIndex] ? currentIndex : minIndex,
                        currentSection[0]
                    );
                    /*let current_foodlist = foodListLen.reduce((minIndex, currentValue, currentIndex, array) =>
                        currentValue < array[minIndex] ? currentIndex : minIndex
                    , 0);*/
                    const newFoodTx = await ApplySystem({
                        authority: foodKey,
                        world: currentWorldId.current,
                        entities: [
                            {
                                entity: entityMatch.current,
                                components: [{ componentId: MAP_COMPONENT }],
                            },
                            {
                                entity: foodEntities.current[selectedSection],
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

                    allTransaction.add(newFoodTx.transaction);
                    allTransaction.recentBlockhash = blockhash;
                    allTransaction.feePayer = foodwalletRef.current.publicKey;
                    allTransaction.sign(foodwalletRef.current);
                    const signature = await providerEphemeralRollup.current.connection.sendRawTransaction(
                        allTransaction.serialize(),
                        { skipPreflight: true }
                    ).catch((error) => {
                        //console.log(error); 
                    });
                    if (signature) {
                        await waitSignatureConfirmation(
                            signature,
                            providerEphemeralRollup.current.connection,
                            "finalized"
                        );
                    }
                } catch (error) {
                    //console.log("Transaction failed", error);
                }
            }
        }
    };

    const handleExitClick = () => {
        if (playerRemovalTimeRef.current !== null) {
            const currentTime = Date.now();
            const elapsedTime = currentTime - playerRemovalTimeRef.current.toNumber() * 1000;
            if (elapsedTime > 10000 || elapsedTime < 5000) {
                preExitGameTx();
                setCountdown(5);
            }
            else {
                return;
            }
        }
        setPlayerExiting(true);
        preExitGameTx().then(() => {
            if (currentPlayerEntity.current) {
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
            setCountdown((prev) => prev - 1);
        }, 1000);

        let startTime = Date.now();
        const checkRemovalTime = setInterval(() => {
            if (playerRemovalTimeRef.current && !playerRemovalTimeRef.current.isZero()) {
                startTime = playerRemovalTimeRef.current.toNumber() * 1000;
                clearInterval(checkRemovalTime);

                const timeoutinterval = setInterval(() => {
                    if (playerRemovalTimeRef.current) {
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

    useEffect(() => {
        if (!playerExiting) {
            setCountdown(5);
        }
    }, [playerExiting]);

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
        function translateLargerRectangle() {
            const largerRectangle = document.getElementsByClassName('game')[0] as HTMLElement;;
            const smallerRectangle = document.getElementsByClassName('gameWrapper')[0] as HTMLElement;;

            if (largerRectangle && smallerRectangle) {
                const widthLarger = screenSize.width * scale;
                const heightLarger = screenSize.height * scale;
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

    useEffect(() => {
        const getTPS = async () => {
            const recentSamples = await connection.getRecentPerformanceSamples(4);
            const totalTransactions = recentSamples.reduce((total, sample) => total + sample.numTransactions, 0);
            const averageTransactions = totalTransactions / recentSamples.length;
            setCurrentTPS(Math.round(averageTransactions));
        };
        getTPS();
    }, []);

    async function getTokenBalance(connection: Connection, vault: PublicKey, decimals: number): Promise<number> {
        const balance = await connection.getTokenAccountBalance(vault);
        return parseFloat(balance.value.amount) / Math.pow(10, decimals);
    }
    async function parsePoolInfo() {
        const mainnet_connection = new Connection("https://floral-convincing-dawn.solana-mainnet.quiknode.pro/73d5d52678fd227b48dd0aec6a8e94ac9dd61f59");
        const info = await mainnet_connection.getAccountInfo(new PublicKey(SOL_USDC_POOL_ID));
        if (!info) return;
        const poolState = LIQUIDITY_STATE_LAYOUT_V4.decode(info.data);
        const baseTokenDecimals = 9;
        const quoteTokenDecimals = 6;
        const baseTokenBalance = await getTokenBalance(mainnet_connection, poolState.baseVault, baseTokenDecimals);
        const quoteTokenBalance = await getTokenBalance(mainnet_connection, poolState.quoteVault, quoteTokenDecimals);
        const priceOfBaseInQuote = quoteTokenBalance / baseTokenBalance;
        setPrice(priceOfBaseInQuote);
    }

    useEffect(() => {
        parsePoolInfo();
    }, []);

    const handleClick = (index: number) => {
        setOpenGameInfo(prevState => {
            const newState = [...prevState];
            newState[index] = !newState[index];
            return newState;
        });
    };

    const handleImageClick = async () => {
        if (inputValue.trim() !== '') {
            try {
                const worldId = { worldId: new anchor.BN(inputValue.trim()) };
                const worldPda = await FindWorldPda(worldId);
                const newGameInfo: ActiveGame = { worldId: worldId.worldId, worldPda: worldPda, name: "loading", active_players: 0, max_players: 0, size: 0, image: "", token: "", base_buyin: 0, min_buyin: 0, max_buyin: 0 }
                console.log('new game info', newGameInfo.worldId, newGameInfo.worldPda.toString())
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

    const fetchTokenMetadata = async (tokenAddress: string): Promise<{ name: string; image: string }> => {
        try {
            const response = await fetch("https://devnet.helius-rpc.com/?api-key=07a045b7-c535-4d6f-852b-e7290408c937", {
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
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error("Error fetching asset:", errorText);
                throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
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
                    console.error("Error fetching metadata from json_uri:", errorText);
                    throw new Error(`HTTP Error: ${metadataResponse.status} ${metadataResponse.statusText}`);
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
                seed: mapseed
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
                    seed: anteseed
                })
                const anteComponentPda = FindComponentPda({
                    componentId: ANTEROOM_COMPONENT,
                    entity: anteEntityPda,
                });
                const anteComponentClient = await getComponentsClient(ANTEROOM_COMPONENT);
                const anteacc = await provider.connection.getAccountInfo(
                    anteComponentPda, "processed"
                );
                let mint_of_token_being_sent = new PublicKey(0);
                if (anteacc) {
                    const anteParsedData = anteComponentClient.coder.accounts.decode("anteroom", anteacc.data);
                    //console.log(anteParsedData)
                    mint_of_token_being_sent = anteParsedData.token;
                    base_buyin = anteParsedData.baseBuyin;
                    max_buyin = anteParsedData.maxBuyin;
                    min_buyin = anteParsedData.minBuyin;
                    if (mint_of_token_being_sent.toString() === "7dnMwS2yE6NE1PX81B9Xpm7zUhFXmQABqUiHHzWXiEBn") {
                        token_image = `${process.env.PUBLIC_URL}/agld.jpg`;
                        token_name = "AGLD";
                    } else {
                        //token_image = `${process.env.PUBLIC_URL}/usdc.png`;
                        //token_name = "USDC";
                        try {
                            //console.log(mint_of_token_being_sent.toString())
                            const { name, image } = await fetchTokenMetadata(mint_of_token_being_sent.toString());
                            //console.log('metadata', name, image)
                            token_image = image;
                            token_name = name;
                        } catch (error) {
                            console.error("Error fetching token data:", error);
                        }
                    }
                }

                const mapComponentClient = await getComponentsClient(MAP_COMPONENT);
                const mapacc = await providerEphemeralRollup.current.connection.getAccountInfo(
                    mapComponentPda, "processed"
                );
                if (mapacc) {
                    const mapParsedData = mapComponentClient.coder.accounts.decode("map", mapacc.data);
                    console.log(`Parsed Data for game ID ${activeGames[i].worldId}:`, mapParsedData);
                    const playerClient = await getComponentsClientBasic(PLAYER_COMPONENT);
                    let activeplayers = 0;
                    for (let player_index = 1; i < mapParsedData.maxPlayers + 1; player_index++) {
                        const playerentityseed = 'player' + player_index.toString();
                        const playerEntityPda = FindEntityPda({
                            worldId: activeGames[i].worldId,
                            entityId: new anchor.BN(0),
                            seed: playerentityseed
                        })
                        const playersComponentPda = FindComponentPda({
                            componentId: PLAYER_COMPONENT,
                            entity: playerEntityPda,
                        });
                        const playersacc = await provider.connection.getAccountInfo(
                            playersComponentPda, "processed"
                        );
                        if (playersacc) {
                            const playersParsedData = playerClient.coder.accounts.decode("player", playersacc.data);
                            //console.log(playersParsedData)
                            if (playersParsedData.authority != null) {
                                activeplayers = activeplayers + 1;
                            }
                        } else {
                            break;
                        }
                    }
                    setActiveGames(prevActiveGames => {
                        const updatedGames = prevActiveGames.map(game =>
                            game.worldId === activeGames[i].worldId && game.worldPda.toString() === activeGames[i].worldPda.toString()
                                ? { ...game, name: mapParsedData.name, active_players: activeplayers, max_players: mapParsedData.maxPlayers, size: mapParsedData.width, image: token_image, token: token_name, base_buyin: base_buyin, min_buyin: min_buyin, max_buyin: max_buyin }

                                : game
                        );
                        return updatedGames;
                    });
                } else {
                    console.log(`No account info found for game ID ${activeGames[i].worldId}`);
                }
            } catch (error) {
                console.log(`Error fetching map data for game ID ${activeGames[i].worldId}:`, error);
            }
        }
    };

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
        //const txSign = await submitTransaction(initNewWorld.transaction, "confirmed", true);  
        const txSign = await retrySubmitTransaction(initNewWorld.transaction, connection, "confirmed");
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
        const computeLimitIxMap = ComputeBudgetProgram.setComputeUnitLimit({
            units: 30_000,
        });
        const transaction = new anchor.web3.Transaction().add(addMapEntityIx).add(computeLimitIxMap).add(computePriceIx);
        const signaturemap = await retrySubmitTransaction(transaction, connection, "confirmed");
        //const signaturemap = await submitTransaction(transaction, "confirmed", true); 
        console.log(
            `Map entity signature: ${signaturemap}`
        );

        let transactionfood = new anchor.web3.Transaction();
        const totalEntities = foodcomponents; //+1;
        const batchSize = 8; //16
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
                const computeLimitIxFood = ComputeBudgetProgram.setComputeUnitLimit({
                    units: 200_000,
                });
                transactionfood.add(computeLimitIxFood).add(computePriceIx);
                const signaturefood = await retrySubmitTransaction(transactionfood, connection, "confirmed");
                //const signaturefood = await submitTransaction(transactionfood, "confirmed", true); 
                console.log(`Food entity batch signature: ${signaturefood}`);
                transactionfood = new Transaction();
            }
        }

        let playercomponentstransaction = new anchor.web3.Transaction();
        const totalPlayers = maxplayer + 1;
        const playerBatchSize = 8; //16
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
                const computeLimitIxPlayer = ComputeBudgetProgram.setComputeUnitLimit({
                    units: 200_000,
                });
                playercomponentstransaction.add(computeLimitIxPlayer).add(computePriceIx);
                const signatureplayerscomponents = await retrySubmitTransaction(playercomponentstransaction, connection, "confirmed");
                //const signatureplayerscomponents = await submitTransaction(playercomponentstransaction, "confirmed", true);
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
        const computeLimitIxAnteroom = ComputeBudgetProgram.setComputeUnitLimit({
            units: 30_000,
        });
        anteroomcomponenttransaction.add(computeLimitIxAnteroom).add(computePriceIx);
        const signatureanteroomcomponents = await retrySubmitTransaction(anteroomcomponenttransaction, connection, "confirmed");
        //const signatureanteroomcomponents = await submitTransaction(anteroomcomponenttransaction, "confirmed", true); //await submitTransactionUser(anteroomcomponenttransaction);
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
        const computeLimitIxMapInit = ComputeBudgetProgram.setComputeUnitLimit({
            units: 50_000,
        });
        initmapomponenttransaction.add(computeLimitIxMapInit).add(computePriceIx);
        const signature1map = await retrySubmitTransaction(initmapomponenttransaction, connection, "confirmed");
        //const signature1map = await submitTransaction(initmapomponenttransaction, "confirmed", true); //await submitTransactionUser(initmapomponenttransaction);
        console.log(
            `Init map component signature: ${signature1map}`
        );

        const initbatchSize = 6; //10
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
            const signature1food = await retrySubmitTransaction(initfoodcomponenttransaction, connection, "confirmed");
            //const signature1food = await submitTransaction(initfoodcomponenttransaction, "confirmed", true);  //await submitTransactionUser(initfoodcomponenttransaction);
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
            const computeLimitIxPlayersInit = ComputeBudgetProgram.setComputeUnitLimit({
                units: 200_000,
            });
            initplayerscomponenttransaction.add(computeLimitIxPlayersInit).add(computePriceIx);
            const signature1players = await retrySubmitTransaction(initplayerscomponenttransaction, connection, "confirmed");
            //const signature1players = await submitTransaction(initplayerscomponenttransaction, "confirmed", true); //await submitTransactionUser(initplayerscomponenttransaction);
            console.log(`Init players component signature for batch: ${signature1players}`);
        }

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
        const signature1ante = await retrySubmitTransaction(initantecomponenttransaction, connection, "confirmed");
        //const signature1ante = await submitTransaction(initantecomponenttransaction, "confirmed", true); //await submitTransactionUser(initantecomponenttransaction);
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
        const computeLimitIxVault = ComputeBudgetProgram.setComputeUnitLimit({
            units: 200_000,
        });
        combinedTx.add(computeLimitIxVault).add(computePriceIx);
        const createvaultsig = await retrySubmitTransaction(combinedTx, connection, "confirmed");
        //const createvaultsig = await submitTransaction(combinedTx, "confirmed", true); 
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
        //const signatureinitgame = await submitTransaction(inittransaction, "confirmed", true);  
        console.log(
            `Init func game signature: ${signatureinitgame}`
        );

        const initbatchSizePlayers = 4; //initbatchSize, 10
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
            //const signatureplayerdinited = await submitTransaction(initplayertransaction, "confirmed", true); //await submitTransactionUser(initplayertransaction);
            const signatureplayerdinited = await retrySubmitTransaction(initplayertransaction, connection, "confirmed");
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
        //const signatureanteinited = await submitTransaction(initantetransaction, "confirmed", true);  //await submitTransactionUser(initantetransaction); 
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
        const computeLimitIxMapDel = ComputeBudgetProgram.setComputeUnitLimit({
            units: 80_000,
        });
        maptx.add(computeLimitIxMapDel).add(computePriceIx);
        const delsignature = await retrySubmitTransaction(maptx, connection, "confirmed");
        //const delsignature = await submitTransaction(maptx, "confirmed", true); 
        console.log(
            `Delegation signature map: ${delsignature}`
        );
        let delbatchSize = 3; //5
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
            //const delsignature2 = await submitTransaction(playertx, "confirmed", true);
            const delsignature2 = await retrySubmitTransaction(playertx, connection, "confirmed");
            console.log(`Delegation signature food for batch: ${delsignature2}`);
        }

        //await new Promise(resolve => setTimeout(resolve, 2000));

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
                overallIndex = overallIndex + 1;
            }

            //const signatureinitfood = await submitTransaction(initfoodtransaction, "confirmed", true); //await submitTransactionUser(initfoodtransaction);
            //const signatureinitfood = await retrySubmitTransaction(initfoodtransaction, connection, "confirmed");
            const {
                context: { slot: minContextSlot },
                value: { blockhash, lastValidBlockHeight }
            } = await providerEphemeralRollup.current.connection.getLatestBlockhashAndContext();

            if (!walletRef.current) {
                throw new Error('Wallet is not initialized');
            }
            initfoodtransaction.recentBlockhash = blockhash;
            initfoodtransaction.feePayer = walletRef.current.publicKey;
            initfoodtransaction.sign(walletRef.current);
            const signatureinitfood = await providerEphemeralRollup.current.sendAndConfirm(initfoodtransaction);
            console.log(`Init func food signature for batch: ${signatureinitfood}`);
        }

        //if (signatureinitfood != null) {
        let token_image = "";
        let token_name = "";
        if (mint_of_token.toString() === "7dnMwS2yE6NE1PX81B9Xpm7zUhFXmQABqUiHHzWXiEBn") {
            token_image = `${process.env.PUBLIC_URL}/agld.jpg`;
            token_name = "AGLD";
        } else {
            token_image = `${process.env.PUBLIC_URL}/usdc.png`;
            token_name = "USDC";
        }
        const newGameInfo: ActiveGame = { worldId: initNewWorld.worldId, worldPda: initNewWorld.worldPda, name: game_name, active_players: 0, max_players: maxplayer, size: game_size, image: token_image, token: token_name, base_buyin: base_buyin, min_buyin: min_buyin, max_buyin: max_buyin }
        console.log('new game info', newGameInfo.worldId, newGameInfo.worldPda.toString())
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
        //const reclaimsig = await submitTransaction(reclaim_transaction, "confirmed", true);
        const reclaimsig = await retrySubmitTransaction(reclaim_transaction, connection, "confirmed");
        console.log(`Reclaim leftover SOL: ${reclaimsig}`);
        //}
    }, [playerKey]);

    useEffect(() => {

        fetchAndLogMapData();

    }, [openGameInfo, enpointDone, selectedOption]);

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

    useEffect(() => {
        let scrollY = 0;
        if (buildViewerNumber == 0 || buildViewerNumber == 1) {
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

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 1000);
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    useEffect(() => {
        const logoElement = document.querySelector('.logo-image') as HTMLElement | null;
        if (logoElement) {
            logoElement.style.transform = 'none';
        } else {
            console.warn('Element with class name "logo-image" not found.');
        }
    }, [buildViewerNumber]);

    return {
        savedPublicKey,
        setSavedPublicKey,
        exitTxn,
        setExitTxn,
        isReferrerModalOpen,
        setIsReferrerModalOpen,
        referrerInput,
        setReferrerInput,
        myReferralAccount,
        myReferrer,
        fastestEndpoint,
        setFastestEndpoint,
        enpointDone,
        setEndpointDone,
        wallet,
        setWallet,
        playerKey,
        setPlayerKey,
        walletRef,
        foodwallet,
        foodKey,
        setFoodKey,
        foodwalletRef,
        players,
        setPlayers,
        playersLists,
        setPlayersLists,
        playersListsLen,
        setPlayersListsLen,
        allplayers,
        setAllPlayers,
        leaderboard,
        setLeaderboard,
        foodListLen,
        setFoodListLen,
        allFood,
        setAllFood,
        visibleFood,
        setVisibleFood,
        currentPlayer,
        setCurrentPlayer,
        playerName,
        setPlayerName,
        expandlist,
        setexpandlist,
        subscribedToGame,
        setSubscribedToGame,
        newGameCreated,
        setNewGameCreated,
        currentTPS,
        setCurrentTPS,
        price,
        setPrice,
        screenSize,
        setScreenSize,
        mapSize,
        setMapSize,
        isSubmitting,
        setIsSubmitting,
        isJoining,
        setIsJoining,
        moveSignature,
        setMoveSignature,
        transactionError,
        setTransactionError,
        transactionSuccess,
        setTransactionSuccess,
        activeGames,
        setActiveGames,
        gamewallet,
        setGameWallet,
        openGameInfo,
        setOpenGameInfo,
        entityMatch,
        playerEntities,
        foodEntities,
        currentPlayerEntity,
        currentWorldId,
        anteroomEntity,
        gameId,
        setGameId,
        exitHovered,
        setExitHovered,
        playersComponentSubscriptionId,
        foodComponentSubscriptionId,
        myplayerComponentSubscriptionId,
        mapComponentSubscriptionId,
        playersComponentClient,
        mapComponentClient,
        foodComponentClient,
        isMouseDown,
        setIsMouseDown,
        mousePosition,
        setMousePosition,
        panelContent,
        setPanelContent,
        buildViewerNumber,
        setbuildViewerNumber,
        leaderBoardActive,
        setLeaderboardActive,
        isHovered,
        setIsHovered,
        gameEnded,
        setGameEnded,
        playerCashout,
        playerBuyIn,
        playerTax,
        setPlayerTax,
        playerRemovalTimeRef,
        cashoutTx,
        setCashoutTx,
        reclaimTx,
        setReclaimTx,
        cashingOut,
        setCashingOut,
        playerCashoutAddy,
        setPlayerCashoutAddy,
        nextFood,
        inputValue,
        setInputValue,
        footerVisible,
        setFooterVisible,
        playerExiting,
        setPlayerExiting,
        countdown,
        setCountdown,
        buyIn,
        setBuyIn,
        isMobile,
        setIsMobile,
        selectedOption,
        setSelectedOption,
        isDropdownOpen,
        setIsDropdownOpen,
        lastUpdateRef,
        provider,
        providerEphemeralRollup,
        handleNameChange,
        handleOptionClick,
        handleSliderChange,
        handleInputChange,
        handleKeyPress,
        joinGameTx,
        openDocs,
        openX,
        openTG,
        handleExitClick,
        cleanUp,
        getRefferal,
        handleClick,
        handleImageClick,
        submitTransactionUser,
        submitTransaction,
        retrySubmitTransaction,
        newGameTx
    }
}

export default useSupersize;