import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import FooterLink from "@components/Footer";

import "./Home.scss";

import { ActiveGame } from "@utils/types";
import { activeGamesList } from "@utils/constants";

import { fetchTokenMetadata, getMyPlayerStatus } from "@utils/helper";
import { FindEntityPda, FindComponentPda, FindWorldPda, createDelegateInstruction } from "@magicblock-labs/bolt-sdk";
import { PublicKey, Transaction } from "@solana/web3.js";
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
import { gameSystemJoin } from "@states/gameSystemJoin";
import { gameSystemCashOut } from "@states/gameSystemCashOut";

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
type PlayerInfo = {
    playerStatus: string;
    need_to_delegate: boolean;
    need_to_undelegate: boolean;
    newplayerEntityPda: PublicKey;
}
type FetchedGame = {
    activeGame: ActiveGame;
    playerInfo: PlayerInfo;
}

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
    activeGames: ActiveGame[];
    setActiveGames: (games: ActiveGame[]) => void;
}

const Home = ({selectedGame, setSelectedGame, setMyPlayerEntityPda, activeGames, setActiveGames}: homeProps) => {
    const navigate = useNavigate();
    const engine = useMagicBlockEngine();

    const [isSearchingGame, setIsSearchingGame] = useState(false);
    const [inputValue, setInputValue] = useState<string>('');  
    const [isBuyInModalOpen, setIsBuyInModalOpen] = useState(false);
    const [selectedGamePlayerInfo, setSelectedGamePlayerInfo] = useState<PlayerInfo>({
        playerStatus: "new_player",
        need_to_delegate: false,
        need_to_undelegate: false,
        newplayerEntityPda: new PublicKey(0)
    });
    //set selected game to 0
    const [activeGamesStrict, setActiveGamesStrict] = useState<FetchedGame[]>(activeGamesList.map((world: { worldId: anchor.BN; worldPda: PublicKey, endpoint: string }) => 
        ({
        activeGame: {
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
            ping: 0,
        },
        playerInfo: {
            playerStatus: "new_player",
            need_to_delegate: false,
            need_to_undelegate: false,
            newplayerEntityPda: new PublicKey(0)
        }
    })));

    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(event.target.value);
    };
    const handleEnterKeyPress = async (inputValue: string) => {
        if (inputValue.trim() !== '') {
            setIsSearchingGame(true);
            try {
                const worldId = {worldId: new anchor.BN(inputValue.trim())};

                const alreadyExists = activeGamesStrict.some(
                    (item) => item.activeGame.worldId.eq(worldId.worldId)
                );
                if (alreadyExists) {
                    console.log("Game with this worldId already exists, skipping.");
                    setIsSearchingGame(false);
                    return;
                }

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

                            const result = await getMyPlayerStatus(engine, newGameInfo.worldId, mapParsedData.maxPlayers);
                            let activeplayers = 0;
                            let need_to_delegate = false;
                            let need_to_undelegate = false;
                            let newplayerEntityPda = new PublicKey(0);
                            let playerStatus = "new_player";
        
                            if (isPlayerStatus(result)) {
                                activeplayers = result.activeplayers;
                                need_to_delegate = result.need_to_delegate;
                                need_to_undelegate = result.need_to_undelegate;
                                newplayerEntityPda = result.newplayerEntityPda;
                                playerStatus = result.playerStatus;
                                console.log(result);
                            } else {
                                console.error("Error fetching player status");
                            }

                            newGameInfo.active_players = activeplayers;
                            setSelectedGamePlayerInfo({
                                playerStatus: playerStatus,
                                need_to_delegate: need_to_delegate,
                                need_to_undelegate: need_to_undelegate,
                                newplayerEntityPda: newplayerEntityPda
                            });
                            setActiveGamesStrict([...activeGamesStrict, {activeGame: newGameInfo, playerInfo: {
                                playerStatus: playerStatus,
                                need_to_delegate: need_to_delegate,
                                need_to_undelegate: need_to_undelegate,
                                newplayerEntityPda: newplayerEntityPda
                            }}]);
                            break;
                        }
                    } catch (error) {
                        console.error("Error fetching map data:", error);
                    }
                }
            } catch (error) {
                console.error("Invalid PublicKey:", error);
            } finally {
                setIsSearchingGame(false);
            }
        }
    };        
    const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            handleEnterKeyPress(inputValue);
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

    function isPlayerStatus(result: any): result is { playerStatus: string; need_to_delegate: boolean; need_to_undelegate: boolean; newplayerEntityPda: PublicKey; activeplayers: number; } {
        return typeof result === 'object' && 'activeplayers' in result;
    }

    const fetchAndLogMapData = async (activeGamesList: FetchedGame[]) => {
        for (let i = 0; i < activeGamesList.length; i++) {
            const startTime = performance.now();
            engine.setEndpointEphemRpc(activeGamesList[i].activeGame.endpoint);
            const mapseed = "origin";
            const mapEntityPda = FindEntityPda({
                worldId: activeGamesList[i].activeGame.worldId,
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
                    worldId: activeGamesList[i].activeGame.worldId,
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
                    const result = await getMyPlayerStatus(engine, activeGamesList[i].activeGame.worldId, mapParsedData.maxPlayers);
                    let activeplayers = 0;
                    let need_to_delegate = false;
                    let need_to_undelegate = false;
                    let newplayerEntityPda = new PublicKey(0);
                    let playerStatus = "new_player";

                    if (isPlayerStatus(result)) {
                        activeplayers = result.activeplayers;
                        need_to_delegate = result.need_to_delegate;
                        need_to_undelegate = result.need_to_undelegate;
                        newplayerEntityPda = result.newplayerEntityPda;
                        playerStatus = result.playerStatus;
                        //console.log(result);
                    } else {
                        console.error("Error fetching player status");
                    }

                    const pingTime = await pingEndpoint(activeGamesList[i].activeGame.endpoint);

                    setActiveGamesStrict((prevActiveGames) => {
                        const updatedGames = prevActiveGames.map((game, index) =>
                            game.activeGame.worldId === activeGamesStrict[i].activeGame.worldId &&
                            game.activeGame.worldPda.toString() === activeGamesList[i].activeGame.worldPda.toString()
                                ? {
                                    ...game,
                                    activeGame: {
                                        ...game.activeGame,
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
                                        endpoint: activeGamesList[index].activeGame.endpoint,
                                        ping: Math.round(pingTime),
                                    },
                                    playerInfo: {
                                        playerStatus: playerStatus,
                                        need_to_delegate: need_to_delegate,
                                        need_to_undelegate: need_to_undelegate,
                                        newplayerEntityPda: newplayerEntityPda
                                    }
                                }
                                : game,
                        );
                        return updatedGames;
                    });
                    console.log('fetchAndLogMapData', i, performance.now() - startTime);
                    console.log(activeGamesStrict)
                    console.log(
                        `No account info found for game ID ${activeGamesStrict[i].activeGame.worldId}`,
                    );
                }
            } catch (error) {
                console.log(
                    `Error fetching map data for game ID ${activeGamesStrict[i].activeGame.worldId}:`,
                    error,
                );
            }
        }
    };

    useEffect(() => {
        fetchAndLogMapData(activeGamesStrict); 
    }, []);

    useEffect(() => {
        for (let i = 0; i < activeGames.length; i++) {
            handleEnterKeyPress(activeGames[i].worldId.toString());
        }
    }, [activeGames]);

    const handlePlayButtonClick = async (game: FetchedGame) => {
        engine.setEndpointEphemRpc(game.activeGame.endpoint);
        setSelectedGame(game.activeGame);
        setSelectedGamePlayerInfo(game.playerInfo);

        if (game.playerInfo.need_to_delegate){
            try {
                const playerComponentPda = FindComponentPda({
                    componentId: COMPONENT_PLAYER_ID,
                    entity: game.playerInfo.newplayerEntityPda,
                });
                const playerdelegateIx = createDelegateInstruction({
                    entity: game.playerInfo.newplayerEntityPda,
                    account: playerComponentPda,
                    ownerProgram: COMPONENT_PLAYER_ID,
                    payer: engine.getWalletPayer(),
                });
                const deltx = new Transaction().add(playerdelegateIx);
                const playerdelsignature = await engine.processWalletTransaction("playerdelegate", deltx);
                console.log(`delegation signature: ${playerdelsignature}`);
            } catch (error) {
                console.log('Error delegating:', error);
            }
        }

        if (game.playerInfo.playerStatus === "new_player") {    
            setIsBuyInModalOpen(true);
        }
        if (game.playerInfo.playerStatus === "cashing_out") {
            const anteEntityPda = FindEntityPda({
                worldId: game.activeGame.worldId,
                entityId: new anchor.BN(0),
                seed: stringToUint8Array("ante")
            });
            const cashoutTx = await gameSystemCashOut(engine, game.activeGame, anteEntityPda, game.playerInfo.newplayerEntityPda);
        }
        if (game.playerInfo.playerStatus === "bought_in") {
            try {
                const mapseed = "origin";
                const mapEntityPda = FindEntityPda({
                  worldId: game.activeGame.worldId,
                  entityId: new anchor.BN(0),
                  seed: stringToUint8Array(mapseed),
                });
                const joinsig = await gameSystemJoin(engine, game.activeGame, game.playerInfo.newplayerEntityPda, mapEntityPda, "unnamed");
                setMyPlayerEntityPda(game.playerInfo.newplayerEntityPda);
                navigate("/game");
              } catch (joinError) {
                console.log("error", joinError);
              }
        }
        if (game.playerInfo.playerStatus === "in_game") {
            setMyPlayerEntityPda(game.playerInfo.newplayerEntityPda);
            navigate("/game");
        }
        if(game.playerInfo.playerStatus === "error"){
            console.log("error joining game");
        }
    }
    
    return (
        <div className="main-container">
            <MenuBar />
            {isBuyInModalOpen && selectedGame && (
            <BuyInModal
                setIsBuyInModalOpen={setIsBuyInModalOpen}
                activeGame={selectedGame}
                setMyPlayerEntityPda={setMyPlayerEntityPda}
                selectedGamePlayerInfo={selectedGamePlayerInfo}
            /> 
            )}
            <div className="home-container">
                <div className="home-header">
                    <div>
                        <input type="text" className="search-game-input" placeholder="Search Game by ID"
                                    value={inputValue}
                                    onChange={handleInputChange}
                                    onKeyDown={handleKeyPress}
                        >          
                        </input>
                        { isSearchingGame && <Spinner /> }
                    </div>
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
                            {activeGamesStrict.map((row, idx) => (
                                <tr key={idx}>
                                    <td>{row.activeGame.isLoaded ? row.activeGame.name : <Spinner />}</td>
                                    <td>{getRegion(activeGamesStrict[idx].activeGame.endpoint)}</td>
                                    <td>{row.activeGame.worldId.toString()}</td>
                                    <td>{row.activeGame.isLoaded ? row.activeGame.token : <Spinner />}</td>
                                    <td>{row.activeGame.isLoaded ? row.activeGame.min_buyin + " - " + row.activeGame.max_buyin : <Spinner />}</td>
                                    <td>{row.activeGame.isLoaded ? row.activeGame.active_players + "/" + row.activeGame.max_players : <Spinner />}</td>
                                    <td>
                                        <div className="ping-cell">
                                            <span className="ping-circle" style={{ backgroundColor: getPingColor(row.activeGame.ping) }} />
                                            <span style={{color: getPingColor(row.activeGame.ping)}}>{row.activeGame.ping >= 0 ? `${row.activeGame.ping}ms` : 'Timeout'}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <button
                                            className="btn-play"
                                            disabled={!row.activeGame.isLoaded || row.activeGame.ping < 0}
                                            onClick={() => {
                                                handlePlayButtonClick(row);
                                            }}
                                        >
                                            {{
                                                "new_player": "Play",
                                                "cashing_out": "Cash Out",
                                                "bought_in": "Resume",
                                                "in_game": "Resume"
                                            }[row.playerInfo.playerStatus] || row.playerInfo.playerStatus}
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
