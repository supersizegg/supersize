import React, { useCallback, useEffect, useState, useRef } from "react";
import { ActiveGame } from "@utils/types";
import { Link } from "react-router-dom";
import Alert from "@components/Alert";
import { useSupersizeContext } from "@contexts/SupersizeContext";
import { FindWorldPda } from "@magicblock-labs/bolt-sdk";
import * as anchor from "@coral-xyz/anchor";
import { useNavigate } from "react-router-dom";
import "./Home.scss";

import FooterLink from "@components/Footer";

const Home = () => {
    const {
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
        setNewGameCreated
    } = useSupersizeContext();
    const [expandlist, setExpandlist] = useState(false);
    const swapAmount = useRef("");
    const navigate = useNavigate();
    
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

    const handleClick = (index: number) => {
        setOpenGameInfo((prevState) => {
            const newState = [...prevState];
            newState[index] = !newState[index];
            return newState;
        });
    };

    const handleImageClick = async () => {
        if (inputValue.trim() !== "") {
            try {
                const worldId = { worldId: new anchor.BN(inputValue.trim()) };
                const worldPda = await FindWorldPda(worldId);
                const newGameInfo: ActiveGame = {
                    worldId: worldId.worldId,
                    worldPda: worldPda,
                    name: "loading",
                    active_players: 0,
                    max_players: 0,
                    size: 0,
                    image: "",
                    token: "",
                    base_buyin: 0,
                    min_buyin: 0,
                    max_buyin: 0,
                };
                console.log(
                    "new game info",
                    newGameInfo.worldId,
                    newGameInfo.worldPda.toString(),
                );
                setNewGameCreated(newGameInfo);
                setActiveGames([newGameInfo, ...activeGames]);
                setOpenGameInfo(new Array(activeGames.length).fill(false));
            } catch (error) {
                console.error("Invalid PublicKey:", error);
            }
        }
    };

    const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === "Enter") {
            handleImageClick();
        }
    };

    useEffect(() => {
        if(activeGames[0]){
            if(activeGames[0].token == "AGLD"){
                swapAmount.current = "https://raydium.io/swap/?inputMint=sol&outputMint=7dnMwS2yE6NE1PX81B9Xpm7zUhFXmQABqUiHHzWXiEBn";
            }else{
                swapAmount.current = `https://jup.ag/swap/SOL-EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`; //${tokenMint}`
            }
        }
    }, [activeGames]);

    const handleBuyClick = () => {
        window.open(swapAmount.current, "_blank", "noopener,noreferrer");
    };
    
    /*
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
    */

    return (
        <div className="flex flex-col items-center h-screen space-y-5 mt-[10vh]">
            <h1 className="text-5xl font-bold text-gray-200">SUPERSIZE</h1>
            <div className="flex justify-between w-full max-w-4xl px-4">
                <button className="px-4 py-2 bg-blue-500 text-white rounded">Search Game</button>
                <div className="flex space-x-4">
                    <button className="px-4 py-2 bg-green-500 text-white rounded">How to Play</button>
                    <button className="px-4 py-2 bg-red-500 text-white rounded">Create Game</button>
                </div>
            </div>
            <div className="w-full max-w-4xl px-4">
                <table className="w-full border-collapse">
                    <thead>
                        <tr>
                        <th>Server</th>
                        <th>Game ID</th>
                        <th>Token</th>
                        <th>Buy In</th>
                        <th>Players</th>
                        <th>Ping</th>
                        <th></th> 
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                        <td>Server 1</td>
                        <td>12345</td>
                        <td>Token A</td>
                        <td>100</td>
                        <td>10</td>
                        <td>50ms</td>
                        <td><button>Play</button></td>
                        </tr>
                    </tbody>
                </table>
            </div>
            {isSubmitting && isJoining && (
                <div className="fixed bottom-[120px] left-0 flex justify-center items-end w-full z-[1000]">
                    <div className="w-9 h-9 border-4 border-solid border-black/10 border-l-[#09f] rounded-full animate-spin"></div>
                </div>
            )}

            {transactionError && (
                <Alert
                    type="error"
                    message={transactionError}
                    onClose={() => setTransactionError(null)}
                />
            )}
            {transactionSuccess && !isJoining && (
                <Alert
                    type="success"
                    message={transactionSuccess}
                    onClose={() => setTransactionSuccess(null)}
                />
            )}
            <FooterLink />
        </div>
    );
};

export default Home;
