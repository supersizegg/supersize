import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import FooterLink from "@components/Footer";

import "./Home.scss";

import { ActiveGame } from "@utils/types";
import { activeGamesList } from "@utils/constants";

import { fetchTokenMetadata } from "@utils/helper";
import { FindEntityPda, FindComponentPda } from "@magicblock-labs/bolt-sdk";
import { PublicKey } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";

import BuyInModal from "@components/buyInModal";

import {
    COMPONENT_MAP_ID,
    COMPONENT_ANTEROOM_ID,
    COMPONENT_PLAYER_ID,
} from "../states/gamePrograms";
import { anteroomFetchOnChain, mapFetchOnChain, mapFetchOnEphem, playerFetchOnChain } from "../states/gameFetch";
import { useMagicBlockEngine } from "../engine/MagicBlockEngineProvider";

interface GameRow {
    server: string;
    gameId: string;
    token: string;
    buyIn: number;
    players: string;
    ping: number;
}

function getPingColor(ping: number) {
    if (ping <= 100) return "green";
    if (ping <= 800) return "yellow";
    return "red";
}

const Home = () => {
    const navigate = useNavigate();
    const engine = useMagicBlockEngine();

    const [isBuyInModalOpen, setIsBuyInModalOpen] = useState(false);
    const [selectedGame, setSelectedGame] = useState<ActiveGame | null>(null);
    const [gameInfo, setGameInfo] = useState<ActiveGame[]>([]);
    const [activeGames, setActiveGames] = useState<ActiveGame[]>(activeGamesList.map((world: { worldId: anchor.BN; worldPda: PublicKey, endpoint: string }) => ({
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

    const pingEndpoint = async (url: string): Promise<number> => {
        const startTime = performance.now();
        try {
            await fetch(url, { method: "HEAD" });
        } catch (error) {
            console.error(`Failed to ping ${url}:`, error);
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
                seed: mapseed,
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
                    seed: anteseed,
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
                            seed: playerentityseed,
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
                            //skip
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
        <div>
            {isBuyInModalOpen && selectedGame && (
            <BuyInModal
                isBuyInModalOpen={isBuyInModalOpen}
                setIsBuyInModalOpen={setIsBuyInModalOpen}
                activeGame={selectedGame}
            />
            )}
            <div className="home-container">
                <div className="home-header">
                    <input className="search-game-input" type="text" placeholder="Search Game" />
                    <div className="header-buttons">
                        <button className="btn-outlined btn-orange" disabled>How to Play</button>
                        <button className="btn-outlined btn-green" onClick={() => navigate("/create-game")}>
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
                                    <td>{row.name}</td>
                                    <td>{getRegion(activeGamesList[idx].endpoint)}</td>
                                    <td>{row.worldId.toString()}</td>
                                    <td>{row.token}</td>
                                    <td>{row.min_buyin} - {row.max_buyin}</td>
                                    <td>{row.active_players}/{row.max_players}</td>
                                    <td>
                                        <div className="ping-cell">
                                            <span className="ping-circle" style={{ backgroundColor: getPingColor(row.ping) }} />
                                            {row.ping}ms
                                        </div>
                                    </td>
                                    <td>
                                        <button
                                            className="btn-play"
                                            onClick={() => {
                                                engine.setEndpointEphemRpc(activeGamesList[idx].endpoint);
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
