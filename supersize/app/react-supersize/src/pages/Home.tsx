import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import FooterLink from "@components/Footer";

import "./Home.scss";

import { ActiveGame } from "@utils/types";
import { activeGamesList } from "@utils/constants";

import { fetchTokenMetadata } from "@utils/helper";
import { FindEntityPda, FindComponentPda, FindWorldPda } from "@magicblock-labs/bolt-sdk";
import { PublicKey } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";

import { MenuBar } from "@components/menu/MenuBar";
import BuyInModal from "@components/buyInModal";
import { Spinner } from "@components/util/Spinner";

import {
    COMPONENT_MAP_ID,
    COMPONENT_ANTEROOM_ID,
    COMPONENT_PLAYER_ID,
} from "../states/gamePrograms";
import { anteroomFetchOnChain, mapFetchOnChain, mapFetchOnEphem, playerFetchOnChain } from "../states/gameFetch";
import { useMagicBlockEngine } from "../engine/MagicBlockEngineProvider";
import {endpoints } from "@utils/constants";
import { stringToUint8Array } from "@utils/helper";

/*
interface GameRow {
    server: string;
    gameId: string;
    token: string;
    buyIn: number;
    players: string;
    ping: number;
}
*/

function getPingColor(ping: number) {
    if (ping < 0) return "red";
    if (ping <= 100) return "green";
    if (ping <= 800) return "yellow";
    return "red";
}

type homeProps = {
    selectedGame: ActiveGame | null;
    setSelectedGame: (game: ActiveGame | null) => void;
    setMyPlayerEntityPda: (pda: PublicKey | null) => void;
    setScreenSize: (size: { width: number; height: number }) => void;
}

const Home = ({selectedGame, setSelectedGame, setMyPlayerEntityPda, setScreenSize}: homeProps) => {
    const navigate = useNavigate();
    const engine = useMagicBlockEngine();

    const [inputValue, setInputValue] = useState<string>('');  
    const [isBuyInModalOpen, setIsBuyInModalOpen] = useState(false);

    //set selected game to 0
    const [activeGames, setActiveGames] = useState<ActiveGame[]>(activeGamesList.map((world: { worldId: anchor.BN; worldPda: PublicKey, endpoint: string }) => ({
        isLoaded: false,
        worldId: world.worldId,
        worldPda: world.worldPda,
        name: "loading",
        active_players: 0,
        max_players: 0,
        size: 0,
        image: `${process.env.PUBLIC_URL}/token.png`,
        token: "LOADING",
        base_buyin: 0,
        min_buyin: 0,
        max_buyin: 0,
        endpoint: world.endpoint,
        ping: 0
    })));

    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(event.target.value);
    };
    const handleEnterKeyPress = async () => {
        if (inputValue.trim() !== '') {
            try {
                const worldId = {worldId: new anchor.BN(inputValue.trim())};
                const worldPda = await FindWorldPda( worldId);
                const newGameInfo : ActiveGame = {worldId: worldId.worldId, worldPda: worldPda, name: "loading", active_players: 0, max_players: 0, size: 0, image:"", token:"", base_buyin: 0, min_buyin: 0, max_buyin: 0, endpoint: "", ping: 0, isLoaded: false}
                for (const endpoint of endpoints) {
                    engine.setEndpointEphemRpc(endpoint);
                    try {
                        const mapEntityPda = FindEntityPda({
                            worldId: worldId.worldId,
                            entityId: new anchor.BN(0),
                            seed: stringToUint8Array("origin"),
                        });
                        const mapComponentPda = FindComponentPda({
                            componentId: COMPONENT_MAP_ID,
                            entity: mapEntityPda,
                        });
                        const mapParsedData = await mapFetchOnEphem(engine, mapComponentPda);
                        if (mapParsedData) {
                            console.log('mapdata', mapParsedData, endpoint)
                            newGameInfo.endpoint = endpoint;
                            newGameInfo.name = mapParsedData.name;
                            newGameInfo.max_players = mapParsedData.maxPlayers;
                            newGameInfo.size = mapParsedData.width;
                            newGameInfo.base_buyin = mapParsedData.baseBuyin;
                            newGameInfo.min_buyin = mapParsedData.minBuyin;
                            newGameInfo.max_buyin = mapParsedData.maxBuyin;
                            newGameInfo.isLoaded = true;

                            const pingTime = await pingEndpoint(endpoint);
                            newGameInfo.ping = pingTime;

                            const anteseed = "ante";
                            const anteEntityPda = FindEntityPda({
                                worldId: worldId.worldId,
                                entityId: new anchor.BN(0),
                                seed: stringToUint8Array(anteseed),
                            });
                            const anteComponentPda = FindComponentPda({
                                componentId: COMPONENT_ANTEROOM_ID,
                                entity: anteEntityPda,
                            });
                            const anteParsedData = await anteroomFetchOnChain(engine, anteComponentPda);
                            let mint_of_token_being_sent = new PublicKey(0);
                            if (anteParsedData && anteParsedData.token) {
                                mint_of_token_being_sent = anteParsedData.token;
                                if (
                                    mint_of_token_being_sent.toString() ===
                                    "7dnMwS2yE6NE1PX81B9Xpm7zUhFXmQABqUiHHzWXiEBn"
                                ) {
                                    newGameInfo.image = `${process.env.PUBLIC_URL}/agld.jpg`;
                                    newGameInfo.token = "AGLD";
                                } else {
                                    try {
                                        const { name, image } = await fetchTokenMetadata(
                                            mint_of_token_being_sent.toString(),
                                        );
                                        newGameInfo.image = image;
                                        newGameInfo.token = name;
                                    } catch (error) {
                                        console.error("Error fetching token data:", error);
                                    }
                                }
                            }
                            console.log('new game info', newGameInfo.worldId,newGameInfo.worldPda.toString())
                            newGameInfo.isLoaded = true;
                            setSelectedGame(newGameInfo);
                            setActiveGames([newGameInfo, ...activeGames]);
                            break;
                        }
                    } catch (error) {
                        console.error("Error fetching map data:", error);
                    }
                }
            } catch (error) {
                console.error("Invalid PublicKey:", error);
            }
        }
    };        
    const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            handleEnterKeyPress();
        }
      };

    const pingEndpoint = async (url: string): Promise<number> => {
        const startTime = performance.now();
        try {
            await fetch(url, { method: "HEAD" });
        } catch (error) {
            console.error(`Failed to ping ${url}:`, error);
             // -1 indicates an error/timeout
            return -1;
        }
        const endTime = performance.now();
        return Math.round(endTime - startTime);
    };

    function getRegion(endpoint: string): string {
        if (endpoint === "https://supersize-fra.magicblock.app") return "europe";
        if (endpoint === "https://supersize.magicblock.app") return "america";
        if (endpoint === "https://supersize-sin.magicblock.app") return "asia";
        return "unknown";
    }

    const fetchAndLogMapData = async () => {
        for (let i = 0; i < activeGamesList.length; i++) {
            engine.setEndpointEphemRpc(activeGamesList[i].endpoint);
            const mapseed = "origin";
            const mapEntityPda = FindEntityPda({
                worldId: activeGamesList[i].worldId,
                entityId: new anchor.BN(0),
                seed: stringToUint8Array(mapseed),
            });
            const mapComponentPda = FindComponentPda({
                componentId: COMPONENT_MAP_ID,
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
                    worldId: activeGamesList[i].worldId,
                    entityId: new anchor.BN(0),
                    seed: stringToUint8Array(anteseed),
                });
                const anteComponentPda = FindComponentPda({
                    componentId: COMPONENT_ANTEROOM_ID,
                    entity: anteEntityPda,
                });
                const anteParsedData = await anteroomFetchOnChain(engine, anteComponentPda);
                let mint_of_token_being_sent = new PublicKey(0);
                if (anteParsedData && anteParsedData.token) {
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
                        try {
                            const { name, image } = await fetchTokenMetadata(
                                mint_of_token_being_sent.toString(),
                            );
                            token_image = image;
                            token_name = name;
                        } catch (error) {
                            console.error("Error fetching token data:", error);
                        }
                    }
                }
                const mapParsedData = await mapFetchOnChain(engine, mapComponentPda);
                if (mapParsedData) {
                    let activeplayers = 0;
                    for (
                        let player_index = 1;
                        player_index < mapParsedData.maxPlayers + 1;
                        player_index++
                    ) {
                        const playerentityseed =
                            "player" + player_index.toString();
                        const playerEntityPda = FindEntityPda({
                            worldId: activeGamesList[i].worldId,
                            entityId: new anchor.BN(0),
                            seed: stringToUint8Array(playerentityseed),
                        });
                        const playersComponentPda = FindComponentPda({
                            componentId: COMPONENT_PLAYER_ID,
                            entity: playerEntityPda,
                        });
                        try {
                            const playersParsedData = await playerFetchOnChain(engine, playersComponentPda);
                            if (playersParsedData && playersParsedData.authority != null) {
                                activeplayers = activeplayers + 1;
                            }
                        } catch (error) {
                            console.log(error);
                        }
                    }

                    const pingTime = await pingEndpoint(activeGamesList[i].endpoint);

                    setActiveGames((prevActiveGames) => {
                        const updatedGames = prevActiveGames.map((game) =>
                            game.worldId === activeGames[i].worldId &&
                                game.worldPda.toString() ===
                                activeGamesList[i].worldPda.toString()
                                ? {
                                    ...game,
                                    isLoaded: true,
                                    name: mapParsedData.name,
                                    active_players: activeplayers,
                                    max_players: mapParsedData.maxPlayers,
                                    size: mapParsedData.width,
                                    image: token_image,
                                    token: token_name,
                                    base_buyin: base_buyin,
                                    min_buyin: min_buyin,
                                    max_buyin: max_buyin,
                                    ping: Math.round(pingTime)
                                }
                                : game,
                        );
                        return updatedGames;
                    });
                    console.log(activeGames)
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

    useEffect(() => {
        fetchAndLogMapData();
    }, []);

    return (
        <div className="main-container">
            <MenuBar />
            {isBuyInModalOpen && selectedGame && (
            <BuyInModal
                setIsBuyInModalOpen={setIsBuyInModalOpen}
                activeGame={selectedGame}
                setMyPlayerEntityPda={setMyPlayerEntityPda}
                setScreenSize={setScreenSize}
            /> 
            )}
            <div className="home-container">
                <div className="home-header">
                    <input type="text" className="search-game-input" placeholder="Search Game"
                                value={inputValue}
                                onChange={handleInputChange}
                                onKeyDown={handleKeyPress}
                    >          
                    </input>
                    <div className="header-buttons">
                        <button className="btn-outlined btn-orange" style={{ backgroundColor: "black" }} disabled>How to Play</button>
                        <button className="btn-outlined btn-green"  style={{ backgroundColor: "black" }}  onClick={() => navigate("/create-game")}>
                            + Create Game
                        </button>
                    </div>
                </div>

                <div className="table-container">
                    <table className="lobby-table">
                        <thead>
                            <tr>
                                <th>Name</th>
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
                            {activeGames.map((row, idx) => (
                                <tr key={idx}>
                                    <td>{row.isLoaded ? row.name : <Spinner />}</td>
                                    <td>{getRegion(activeGames[idx].endpoint)}</td>
                                    <td>{row.worldId.toString()}</td>
                                    <td>{row.isLoaded ? row.token : <Spinner />}</td>
                                    <td>{row.isLoaded ? row.min_buyin + " - " + row.max_buyin : <Spinner />}</td>
                                    <td>{row.isLoaded ? row.active_players + "/" + row.max_players : <Spinner />}</td>
                                    <td>
                                        <div className="ping-cell">
                                            <span className="ping-circle" style={{ backgroundColor: getPingColor(row.ping) }} />
                                            <span style={{color: getPingColor(row.ping)}}>{row.ping >= 0 ? `${row.ping}ms` : 'Timeout'}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <button
                                            className="btn-play"
                                            disabled={!row.isLoaded || row.ping < 0}
                                            onClick={() => {
                                                engine.setEndpointEphemRpc(activeGames[idx].endpoint);
                                                setSelectedGame(row);
                                                setIsBuyInModalOpen(true);
                                            }}
                                        >
                                            Play
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            <FooterLink />
        </div>
    );
};

export default Home;
