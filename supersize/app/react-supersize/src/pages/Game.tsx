import React, { useState } from "react";
import GameComponent from "@components/Game";
import { PublicKey } from "@solana/web3.js";
import { useNavigate } from "react-router-dom";
import { useSupersizeContext } from "@contexts/SupersizeContext";
import { scale } from "@utils/constants";
import useSupersize from "@hooks/useSupersize";

const Game = () => {
    const navigate = useNavigate();
    const {
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
        cleanUp,
    } = useSupersizeContext();

    const [exitHovered, setExitHovered] = useState(false);

    /*
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
    }, [playerKey, gameId, screenSize]);

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
    }, [gameId, screenSize]);

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
    */
    return (
        <div className="gameWrapper w-screen h-screen overflow-hidden">
            <div
                id="status"
                className={`${
                    gameId !== null ? "block" : "hidden"
                } absolute p-2.5 bg-[rgba(17,19,20,0.4)] text-white font-['Terminus'] text-[16.1px] top-2.5 right-2.5 font-bold text-center rounded-[5px] border border-gray-400 filter drop-shadow-[0px_0px_5px_gray]`}
                style={{ zIndex: 9999 }}
            >
                <span className="font-[25px] text-white">Leaderboard</span>
            </div>

            <div
                className={`${
                    gameId !== null ? "block" : "hidden"
                } flex items-center fixed top-0 left-0 m-2.5 z-[9999]`}
                style={{ zIndex: 9999 }}
                onMouseEnter={() => {
                    setExitHovered(true);
                }}
                onMouseLeave={() => {
                    setExitHovered(false);
                }}
            >
                <button
                    className="flex items-center justify-center text-center relative box-border text-sm cursor-pointer text-black no-underline bg-[#f07171] float-right border border-[#f07171] rounded-full py-1.5 px-2.5 transition-colors duration-300 z-[9999999] hover:bg-black hover:text-[#f07171] active:bg-black active:text-[#f07171]"
                    onClick={handleExitClick}
                >
                    X
                </button>
                {playerExiting && countdown > 0 && (
                    <div className="block text-[#f07171] font-[Terminus] text-xl text-right ml-2.5">
                        Disconnecting in {countdown} seconds
                    </div>
                )}
            </div>

            <div
                className={`${
                    gameId !== null ? "block" : "hidden"
                } fixed bottom-0 left-0 m-2 z-[9999] text-white text-base font-[terminus] flex flex-col`}
            >
                <div>
                    <span className="opacity-50">Your size: </span>
                    <span className="opacity-100">
                        {currentPlayer ? currentPlayer.score : null}
                    </span>
                </div>
            </div>

            <div
                className="game"
                style={{
                    display: gameId !== null ? "block" : "none",
                    height: screenSize.height * scale,
                    width: screenSize.width * scale,
                }}
            >
                <GameComponent
                    gameId={gameId}
                    players={players}
                    visibleFood={visibleFood.flat()}
                    currentPlayer={currentPlayer}
                    screenSize={screenSize}
                    scale={scale}
                />
            </div>

            <div
                className={`${
                    gameId === null ? "block" : "hidden"
                } w-screen h-screen`}
            >
                {gameEnded === 1 && (
                    <div className="fixed top-0 left-0 w-full h-full flex justify-center items-center bg-black z-[9999]">
                        <div className="bg-black flex flex-col items-center justify-center">
                            <p className="font-terminus p-0 m-1 text-center text-white text-xl inline">
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
                            <p className="font-terminus p-0 m-1 text-center text-white text-xl inline">
                                Final score: {currentPlayer ? currentPlayer.score + currentPlayer.tax : ''}
                            </p>
                            <p className="font-terminus p-0 m-1 text-center text-white text-xl inline">
                                Exit tax:{" "}
                                {currentPlayer ? currentPlayer.tax + currentPlayer.score * 0.02 : ''}
                            </p>
                            <p className="font-terminus p-0 m-1 text-center text-white text-xl inline">
                                Payout: {currentPlayer ? currentPlayer.score * 0.98 : ''}
                            </p>
                            <div
                                className="flex items-center justify-center"
                                style={{ flexDirection: "column" }}
                            >
                                <pre style={{ margin: "20px 0" }}>
                                    {cashoutTx !== null &&
                                    cashoutTx !== "error" ? (
                                        <a
                                            className="font-terminus p-0 m-1 text-center text-white text-xl inline"
                                            href={`https://explorer.solana.com/tx/${cashoutTx}?cluster=mainnet`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{textDecoration: 'underline'}}
                                        >
                                            Cashout transaction
                                        </a>
                                    ) : (
                                        <span className="warning-alert">Confirm the cashout TX in your wallet</span>
                                    )}
                                </pre>
                                {cashoutTx != null ? (
                                    <>
                                        {cashoutTx != "error" ? (
                                            <svg
                                                className="w-5 h-5 rounded-full inline-block stroke-[2px] stroke-[#15bd12] stroke-miter-10 shadow-inner ml-[5px] mt-[2px]"
                                                style={{
                                                    animation:
                                                        "fill 0.4s ease-in-out 0.4s forwards, scale 0.3s ease-in-out 0.9s both;",
                                                }}
                                                xmlns="http://www.w3.org/2000/svg"
                                                viewBox="0 0 52 52"
                                            >
                                                <circle
                                                    className="stroke-[2px] stroke-[#15bd12] stroke-miter-10 fill-[#15bd12]"
                                                    style={{
                                                        strokeDasharray:
                                                            "166; stroke-dashoffset: 166; animation: stroke 0.6s cubic-bezier(0.650, 0.000, 0.450, 1.000) forwards;",
                                                    }}
                                                    cx="26"
                                                    cy="26"
                                                    r="25"
                                                    fill="none"
                                                />
                                                <path
                                                    className="stroke-[white] stroke-dasharray-[48] stroke-dashoffset-[48] transform-origin-[50%_50%] animation-stroke"
                                                    fill="none"
                                                    d="M14.1 27.2l7.1 7.2 16.7-16.8"
                                                />
                                            </svg>
                                        ) : (
                                            <button
                                                className="w-full bg-white flex items-center justify-center h-[3em] rounded-[1em] border border-white font-[Conthrax] text-black text-base cursor-pointer transition-all duration-300 z-[10] hover:bg-black hover:text-[#eee] hover:border-white"
                                                onClick={() => cleanUp()}
                                            >
                                                Retry
                                            </button>
                                        )}
                                    </>
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
