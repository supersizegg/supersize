import React, { useEffect, useRef, useState } from "react";
import GameComponent from "@components/Game";
import { PublicKey } from "@solana/web3.js";
import { useNavigate } from "react-router-dom";
import { MAP_COMPONENT, scale } from "@utils/constants";
import { ActiveGame, Blob, Food } from "@utils/types";
import { createUndelegateInstruction, FindComponentPda, FindEntityPda } from "@magicblock-labs/bolt-sdk";
import { COMPONENT_PLAYER_ID } from "../states/gamePrograms";
import { BN } from "@coral-xyz/anchor";
import { gameSystemExit } from "../states/gameSystemExit";
import { useMagicBlockEngine } from "../engine/MagicBlockEngineProvider";
import { mapFetchOnEphem, playerFetchOnEphem } from "../states/gameFetch";
import { subscribeToGame, updateLeaderboard, updateMyPlayer } from "../states/gameListen";
import { gameSystemCashOut } from "../states/gameSystemCashOut";
import { gameSystemMove } from "../states/gameSystemMove";
import { gameSystemSpawnFood } from "../states/gameSystemSpawnFood";
import { decodeFood, stringToUint8Array } from "@utils/helper";
import * as anchor from "@coral-xyz/anchor";
import "./game.scss";

type gameProps = {
    gameInfo: ActiveGame;
    myPlayerEntityPda: PublicKey | null;
};


const Game = ({gameInfo,  myPlayerEntityPda}: gameProps) => {
    const navigate = useNavigate();
    const engine = useMagicBlockEngine();

    const animationFrame = useRef(0);

    const [screenSize, setScreenSize] = useState({ width: window.innerWidth, height: window.innerHeight });
    const exitHovered = useRef(false);  

    const [target, setTarget] = useState({ x: 0, y: 0, boost: false });

    const [currentPlayer, setCurrentPlayer] = useState<Blob | null>(null);

    const entityMatch = useRef<PublicKey | null>(null);
    const currentPlayerEntity = useRef<PublicKey | null>(null);
    const anteroomEntity = useRef<PublicKey | null>(null);
    const foodEntities = useRef<PublicKey[]>([]);
    const playerEntities = useRef<PublicKey[]>([]);


    const countdown = useRef(5);
    const playerRemovalTimeRef = useRef<BN | null>(null);
    const [playerExiting, setPlayerExiting] = useState(false);
    const [gameEnded, setGameEnded] = useState(0);
    const [cashoutTx, setCashoutTx] = useState<string | null>(null);
    
    const [leaderboard, setLeaderboard] = useState<Blob[]>([]);
    const [allplayers, setAllPlayers] = useState<Blob[]>([]);
    const [players, setPlayers] = useState<Blob[]>([]);
    const [allFood, setAllFood] = useState<Food[][]>([]);
    const [visibleFood, setVisibleFood] = useState<Food[][]>([]);
    const [foodListLen, setFoodListLen] = useState<number[]>([]);

    const playersComponentSubscriptionId = useRef<number[] | null>([]);
    const foodComponentSubscriptionId = useRef<number[] | null>([]);
    const myplayerComponentSubscriptionId = useRef<number | null>(null);
    const mapComponentSubscriptionId= useRef<number | null>(null);

    const currentPlayerRef = useRef<Blob | null>(null);
    const currentMousePositionRef = useRef<{ x: number; y: number }>({x: 0, y: 0});
    const lastMousePosition = useRef({ x: 0, y: 0 });
    const currentIsMouseDownRef = useRef<boolean>(false);
    const allplayersRef = useRef<Blob[]>([]);
    useEffect(() => {
        allplayersRef.current = allplayers;
    }, [allplayers]);
    useEffect(() => {
        if(currentPlayer?.removal){
            playerRemovalTimeRef.current = currentPlayer.removal;
        }
        currentPlayerRef.current = currentPlayer;
    }, [currentPlayer]);

    const getRoundedAmount = (amount: number, foodUnitValue: number) : string => {
        const decimals = getDecimals(foodUnitValue);
        if (decimals > 0) {
            return amount.toFixed(decimals);
        } else {
            return amount.toString();
        }
    }

    const getDecimals = (amount: number) : number => {
        if (amount % 1 !== 0) {
            return amount.toString().split('.')[1]?.length || 0;
        } else {
            return 0;
        }
    }

    const handleExitClick = () => {
        if (!currentPlayerEntity.current) {
            return;
        }
        if (!entityMatch.current) {
            return;
        }

        if (playerRemovalTimeRef.current !== null) {
            const currentTime = Date.now();
            const elapsedTime = currentTime - playerRemovalTimeRef.current.toNumber() * 1000;
            
            if (elapsedTime > 10000 || elapsedTime < 5000) {
                gameSystemExit(engine, gameInfo, currentPlayerEntity.current, entityMatch.current);
            } else {
                return;
            }
        }

        countdown.current = 5;
        setPlayerExiting(true);
        gameSystemExit(engine, gameInfo, currentPlayerEntity.current, entityMatch.current).then(async () => {
            if (currentPlayerEntity.current) {
                const myplayerComponent = FindComponentPda({
                    componentId: COMPONENT_PLAYER_ID,
                    entity: currentPlayerEntity.current,
                });
                const playerData = await playerFetchOnEphem(engine, myplayerComponent);
                if (playerData) {
                    updateMyPlayer(playerData, setCurrentPlayer, gameEnded, setGameEnded);
                }
            }
        });

        const interval = setInterval(() => {
            countdown.current = countdown.current - 1;
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
                        if (!currentPlayerEntity.current) {
                            return;
                        }
                        if (!entityMatch.current) {
                            return;
                        }
                        console.log("5 seconds have passed");
                        gameSystemExit(engine, gameInfo, currentPlayerEntity.current, entityMatch.current);
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

    const processNewFoodTransaction = async () => {
        if(!entityMatch.current) return;
        try {
            const mapComponent = FindComponentPda({
                componentId: MAP_COMPONENT,
                entity: entityMatch.current,
            });

            let newFood = {x: 0, y: 0};
            const mapParsedData = await mapFetchOnEphem(engine, mapComponent);
            if(mapParsedData && mapParsedData.nextFood){
                const foodDataArray = new Uint8Array(mapParsedData.nextFood.data);
                const decodedFood = decodeFood(foodDataArray); 
                newFood = {x: decodedFood.x, y: decodedFood.y};
            }else if(mapParsedData && mapParsedData.foodQueue.gt(new BN(0))){
                newFood = {x: 0, y: 0};
            }
            else{
                return;
            }
            await gameSystemSpawnFood(engine, gameInfo, newFood.x, newFood.y, foodListLen, entityMatch.current, foodEntities.current);
        } catch (error) {
            console.log("Transaction failed", error);
        }
    };
    
    useEffect(() => {
        console.log('subscribeToGame');
        const mapEntityPda = FindEntityPda({
            worldId: gameInfo.worldId,
            entityId: new anchor.BN(0),
            seed: stringToUint8Array("origin")
        });
        
        const anteEntityPda = FindEntityPda({
            worldId: gameInfo.worldId,
            entityId: new anchor.BN(0),
            seed: stringToUint8Array("ante")
        });
        const foodEntityPdas: PublicKey[] = [];
        let maxplayer = 20;
        let foodcomponents = 32;

        if (gameInfo.size == 4000) {
            maxplayer = 20;
            foodcomponents = 16 * 2;
        }
        else if (gameInfo.size == 6000) {
            maxplayer = 45;
            foodcomponents = 36 * 2;
        }
        else if (gameInfo.size == 8000) {
            maxplayer = 80;
            foodcomponents = 64 * 2;
        }
        
        for (let i = 1; i < foodcomponents + 1; i++) {
            const foodseed = 'food' + i.toString();
            const foodEntityPda = FindEntityPda({
                worldId: gameInfo.worldId,
                entityId: new anchor.BN(0),
                seed: stringToUint8Array(foodseed)
            });
            foodEntityPdas.push(foodEntityPda);
        }

        const playerEntityPdas: PublicKey[] = [];
        for (let i = 1; i < maxplayer + 1; i++) {
            const playerentityseed = 'player' + i.toString();
            const playerEntityPda = FindEntityPda({
                worldId: gameInfo.worldId,
                entityId: new anchor.BN(0),
                seed: stringToUint8Array(playerentityseed)
            });
            playerEntityPdas.push(playerEntityPda);
        }

        entityMatch.current = mapEntityPda;
        currentPlayerEntity.current = myPlayerEntityPda;
        anteroomEntity.current = anteEntityPda;
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
            buyIn: 0,
            payoutTokenAccount: null,
            speed: 0,
            removal: new BN(0),
            target_x: 0,
            target_y: 0,
            timestamp: 0,
        }; 
        setAllPlayers(new Array(playerEntityPdas.length).fill(emptyPlayer));
        setAllFood(new Array(foodEntityPdas.length).fill([]));
        setFoodListLen(new Array(foodEntityPdas.length).fill(0));
        if (!entityMatch.current || !currentPlayerEntity.current) return;
        subscribeToGame(engine, 
            foodEntities.current, playerEntities.current, entityMatch.current, currentPlayerEntity.current, 
            emptyPlayer, gameEnded,
            foodComponentSubscriptionId, playersComponentSubscriptionId, myplayerComponentSubscriptionId, 
            setAllPlayers, setCurrentPlayer, setGameEnded, setAllFood, setFoodListLen);
    }, [engine, gameInfo]);
    
    const endGame = async () => {
        if (
            currentPlayer &&
            Math.sqrt(currentPlayer.mass) == 0
            && currentPlayerEntity.current
            && anteroomEntity.current
        ) {
            console.log("endGame", currentPlayer);
            if(currentPlayer.score > 0){
                //gameended == 2
                playersComponentSubscriptionId.current = [];
                entityMatch.current = null;
                foodEntities.current = [];
                setPlayers([]);
                setAllFood([]);
                setFoodListLen([]);
                try{
                    const cashoutTx = await gameSystemCashOut(engine, gameInfo, anteroomEntity.current, currentPlayerEntity.current)
                    console.log('cashoutTx', cashoutTx);
                    if (cashoutTx){
                        setCashoutTx(cashoutTx);
                        currentPlayerEntity.current = null;
                    }else{
                        setCashoutTx("error");
                    }
                }catch(error){
                    console.log('error', error);
                    setCashoutTx("error");
                }
            }else{

                try{
                    const myplayerComponent = FindComponentPda({
                        componentId: COMPONENT_PLAYER_ID,
                        entity: currentPlayerEntity.current,
                    });
    
                    const undelegateIx = createUndelegateInstruction({
                        payer: engine.getSessionPayer(),
                        delegatedAccount: myplayerComponent,
                        componentPda: COMPONENT_PLAYER_ID,
                    });
            
                    const undeltx = new anchor.web3.Transaction().add(undelegateIx);
                    undeltx.recentBlockhash = (await engine.getConnectionEphem().getLatestBlockhash()).blockhash;
                    undeltx.feePayer = engine.getSessionPayer();
                    const playerundelsignature = await engine.processSessionEphemTransaction("undelPlayer:" + myplayerComponent.toString(), undeltx); 
                    console.log('undelegate', playerundelsignature);
                }catch(error){
                    console.log('error', error);
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
    }

    useEffect(() => {
        endGame();
    }, [gameEnded]);

    useEffect(() => {
        if(currentPlayer && allFood){
            const visibleFood = allFood.map((foodList) => {
                return foodList.reduce<Food[]>((innerAcc, foodItem) => {
                    const diffX = foodItem.x - currentPlayer.x;
                    const diffY = foodItem.y - currentPlayer.y;
                    if (Math.abs(diffX) <= ((screenSize.width / 2) + 100) && Math.abs(diffY) <= ((screenSize.height / 2) + 100)) {
                        innerAcc.push({
                            x: foodItem.x,
                            y: foodItem.y, 
                            size: foodItem.size
                        });
                    }
                    return innerAcc;
                }, []);
            });
        setVisibleFood(visibleFood);
        }
    }, [currentPlayer, allFood]);


    useEffect(() => {

        const handleMouseMove = (event: MouseEvent) => {
            lastMousePosition.current = { x: event.clientX, y: event.clientY };
        };

        const handleMouseDown = () => {
            if(!exitHovered.current){
                currentIsMouseDownRef.current = true;
            }
        };

        const handleMouseUp = () => {
            currentIsMouseDownRef.current = false;
        };

        const handleResize = () => {
            const gameDiv = document.querySelector('.game');
            if (gameDiv) {
                const { width, height } = gameDiv.getBoundingClientRect();
                setScreenSize({width: width, height: height});
            }else{
                setScreenSize({width: window.innerWidth, height: window.innerHeight});
            }
        };

        console.log('Set mouse listeners');
        window.addEventListener("mousedown", handleMouseDown);
        window.addEventListener("mouseup", handleMouseUp);
        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener('resize', handleResize);

        return () => {
            console.log('Remove mouse listeners');
            window.removeEventListener("mousemove", handleMouseMove);
            cancelAnimationFrame(animationFrame.current);
            window.removeEventListener("mousedown", handleMouseDown);
            window.removeEventListener("mouseup", handleMouseUp);
            window.removeEventListener('resize', handleResize);
        };
        
    }, []);


    useEffect(() => {
        const smoothUpdate = () => {

            const dx = (lastMousePosition.current.x - currentMousePositionRef.current.x) * 0.03;
            const dy = (lastMousePosition.current.y - currentMousePositionRef.current.y) * 0.03;

            const newMousePosition = {
                    x: currentMousePositionRef.current.x + dx,
                    y: currentMousePositionRef.current.y + dy
            }

            currentMousePositionRef.current = newMousePosition;

            animationFrame.current = requestAnimationFrame(smoothUpdate);
        };

        animationFrame.current = requestAnimationFrame(smoothUpdate);

        return () => cancelAnimationFrame(animationFrame.current);
    }, []);

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
    }, [gameInfo, leaderboard]);


    useEffect(() => {
        if (currentPlayer) {
            const playersWithAuthority = allplayers.filter(
                (player) =>
                    player.authority !== null &&
                    player.x !== 50000 &&
                    player.y !== 50000 &&
                    Math.sqrt(player.mass) !== 0,
            );
            updateLeaderboard(playersWithAuthority, setLeaderboard);
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
                            const halfWidth = (screenSize.width / 2) + 100;
                            const halfHeight = (screenSize.height / 2) + 100;
                            const diffX = playerx.x - currentPlayer.x;
                            const diffY = playerx.y - currentPlayer.y;

                            if (
                                Math.abs(diffX) <= halfWidth &&
                                Math.abs(diffY) <= halfHeight
                            ) {
                                accumulator.push({
                                    name: playerx.name,
                                    authority: playerx.authority,
                                    x: playerx.x, 
                                    y: playerx.y, 
                                    radius:
                                        4 + Math.sqrt(playerx.mass / 10) * 6,
                                    mass: playerx.mass,
                                    score: playerx.score,
                                    tax: playerx.tax,
                                    buyIn: playerx.buyIn,
                                    payoutTokenAccount: playerx.payoutTokenAccount,
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

     useEffect(() => {
        const intervalId = setInterval(() => {
            processNewFoodTransaction();
        }, 200);

        return () => clearInterval(intervalId);
    }, []); 

    useEffect(() => {

        const intervalId = setInterval(() => {
            if (currentPlayerEntity.current && currentPlayerRef.current && entityMatch.current  && foodEntities.current && playerEntities.current && players && foodListLen) {
                gameSystemMove(engine, gameInfo, currentPlayerEntity.current, currentPlayerRef.current, entityMatch.current, foodEntities.current, playerEntities.current, allplayersRef.current, foodListLen, currentMousePositionRef.current.x, currentMousePositionRef.current.y, currentIsMouseDownRef.current, {width: gameInfo.size, height: gameInfo.size}); 
                    const newX = Math.max(
                        0,
                        Math.min(
                            gameInfo.size,
                            Math.floor(currentPlayerRef.current.x + currentMousePositionRef.current.x- screenSize.width / 2),
                        ), 
                    );
                    const newY = Math.max(
                        0,
                        Math.min(
                            gameInfo.size,
                            Math.floor(currentPlayerRef.current.y + currentMousePositionRef.current.y - screenSize.height / 2),
                        ),
                    );
                    setTarget({ x: newX, y: newY, boost: currentIsMouseDownRef.current });
            }  
        }, 30); //testing 30-50

        return () => clearInterval(intervalId);
     
    }, []);

    return (
        <div className="gameWrapper w-screen h-screen overflow-hidden">
            <div
                id="status"
                className={`absolute p-2.5  text-white text-[16px] top-2.5 right-2.5 font-bold text-center rounded-[5px] border border-gray-400`}
                style={{ zIndex: 9999 }}
            >
                <span className="font-[25px] text-white">Leaderboard</span>
            </div>

            <div
                className={`flex items-center fixed top-0 left-0 m-2.5 z-[9999]`}
                style={{ zIndex: 9999 }}
            >
                <button
                    style={{border: '1px solid red', background: '#ff000042', color: '#fff'}}
                    className="flex items-center justify-center text-center relative box-border text-sm cursor-pointer text-black no-underline bg-[#f07171] float-right border border-[#f07171] rounded-full py-1.5 px-2.5 transition-colors duration-300 z-[9999999] hover:bg-black hover:text-[#f07171] active:bg-black active:text-[#f07171]"
                    onClick={handleExitClick}
                    onMouseEnter={() => {
                        exitHovered.current = true;
                    }}
                    onMouseLeave={() => {
                        exitHovered.current = false;
                    }}
                >
                    Exit & Cash Out
                </button>
                {playerExiting && countdown.current > 0 && (
                    <div className="text-[#f07171] font-[Terminus] text-xl text-right ml-2.5">
                        Disconnecting in {countdown.current} seconds
                    </div>
                )}
            </div>

            <div
                className={`fixed bottom-0 left-0 m-2 z-[9999] text-white text-base font-[terminus] flex flex-col`}
            >
                <div>
                    <span className="opacity-50">Your size: </span>
                    <span className="opacity-100">
                        {currentPlayer ? getRoundedAmount(currentPlayer.score, gameInfo.base_buyin / 1000) : null}
                    </span>
                </div>
            </div>

            <div
               className="game"
               style={{
                    display: "block",
                    height: "100%",
                    width: "100%",
                }}
            >
                <GameComponent
                    players={players}
                    visibleFood={visibleFood.flat()}
                    currentPlayer={currentPlayer}
                    screenSize={screenSize}
                    newTarget={target}
                    gameSize={gameInfo.size}
                />
            </div>

            <div
                className={`block w-screen h-screen`}
            >
                {gameEnded === 1 && (
                    <div className="fixed top-0 left-0 w-full h-full flex justify-center items-center bg-black z-[9999]">
                        <div className="bg-black flex flex-col items-center justify-center">
                            <p className=" p-0 m-1 text-center text-white text-xl inline">
                                You got eaten!
                            </p>
                            <button
                                id="returnButton"
                                onClick={() => navigate("/")}
                            >
                                Return home
                            </button>
                        </div>
                    </div>
                )}

                {(gameEnded === 2 || gameEnded === 3) && (
                    <div className="fixed top-0 left-0 w-full h-full flex justify-center items-center bg-black z-[9999]">
                        <div className="bg-black flex flex-col items-center justify-center select-text">
                            <p className=" p-0 m-1 text-center text-white text-xl inline">
                                Final score: {currentPlayer ? 
                                getRoundedAmount(currentPlayer.score + currentPlayer.tax, gameInfo.base_buyin / 1000) : ''}
                            </p>
                            <p className=" p-0 m-1 text-center text-white text-xl inline">
                                Exit tax:{" "}
                                {currentPlayer ?
                                getRoundedAmount(currentPlayer.tax + currentPlayer.score * 0.02, gameInfo.base_buyin / 1000)
                                 : ''}
                            </p>
                            <p className=" p-0 m-1 text-center text-white text-xl inline">
                                <b>Payout: {currentPlayer ? 
                                getRoundedAmount(currentPlayer.score * 0.98, gameInfo.base_buyin / 1000) : ''}</b>
                            </p>
                            <div
                                className="flex items-center justify-center"
                                style={{ flexDirection: "column" }}
                            >
                                <pre style={{ margin: "20px 0" }}>
                                    {cashoutTx !== null &&
                                    cashoutTx !== "error" ? (
                                        <>✅ 
                                        <a
                                            className=" p-0 m-1 text-center text-white text-xl inline"
                                            href={`https://explorer.solana.com/tx/${cashoutTx}?cluster=mainnet`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{textDecoration: 'underline'}}
                                        >
                                            Cashout transaction
                                        </a></>
                                    ) : (
                                        <span className="warning-alert">Confirm the cashout TX in your wallet</span>
                                    )}
                                </pre>
                                {cashoutTx != null ? (
                                    (cashoutTx == "error" && <button
                                            className="w-full bg-white flex items-center justify-center h-[3em] rounded-[1em] border border-white text-black text-base cursor-pointer transition-all duration-300 z-[10] hover:bg-black hover:text-[#eee] hover:border-white"
                                            onClick={async () => {
                                                if(anteroomEntity.current && currentPlayerEntity.current && currentPlayer) {
                                                    setCashoutTx(null);
                                                    try {   
                                                        let cashouttx = await gameSystemCashOut(engine, gameInfo, anteroomEntity.current, currentPlayerEntity.current);
                                                        if(cashouttx) {
                                                            setCashoutTx(cashouttx);
                                                        } else {
                                                            setCashoutTx("error");
                                                        }
                                                    }
                                                    catch(error) {
                                                        setCashoutTx("error");
                                                    }
                                                }
                                            }}
                                        >
                                            Retry
                                        </button>)
                                ) : (
                                    <svg
                                        className="inline ml-[5px] mt-[2px] h-[20px] w-[20px] stroke-[white]"
                                        width="52"
                                        height="52"
                                        viewBox="0 0 38 38"
                                        xmlns="http://www.w3.org/2000/svg"
                                    >
                                        <g fill="none" fillRule="evenodd">
                                            <g
                                                transform="translate(1 1)"
                                                strokeWidth="2"
                                            >
                                                <circle
                                                    strokeOpacity=".5"
                                                    cx="18"
                                                    cy="18"
                                                    r="18"
                                                />
                                                <path d="M36 18c0-9.94-8.06-18-18-18">
                                                    <animateTransform
                                                        attributeName="transform"
                                                        type="rotate"
                                                        from="0 18 18"
                                                        to="360 18 18"
                                                        dur="1s"
                                                        repeatCount="indefinite"
                                                    />
                                                </path>
                                            </g>
                                        </g>
                                    </svg>
                                )}
                            </div>
                            {cashoutTx !== null && cashoutTx !== "error" && (
                                <button
                                    id="returnButton"
                                    onClick={() => navigate("/")}
                                >
                                    Return home
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {gameEnded === 4 && (
                    <div className="fixed top-0 left-0 w-full h-full flex justify-center items-center bg-black z-[9999]">
                        <div className="bg-black flex flex-col items-center justify-center select-text">
                            <p className="font-[Terminus] text-red-600 text-center text-sm m-0 p-0">
                                Error encountered during payout
                            </p>
                            <p className="font-[Terminus] text-white text-center text-sm m-0 p-[10px]">
                                <>
                                    If no transaction is received after a few
                                    minutes, contact @cheapnumbers on X
                                </>
                                <br />
                                <br />
                                Txn Receipt:
                            </p>
                            <button
                                id="returnButton"
                                onClick={() => navigate("/")}
                            >
                                Return home
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Game;
