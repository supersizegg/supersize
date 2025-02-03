import React, { useEffect, useRef, useState } from "react";
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
import { FetchedGame, PlayerInfo } from "@utils/types";
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
    activeGamesLoaded: FetchedGame[];
    setActiveGamesLoaded: (games: FetchedGame[]) => void;
}

const Home = ({selectedGame, setSelectedGame, setMyPlayerEntityPda, activeGamesLoaded, setActiveGamesLoaded}: homeProps) => {
    const navigate = useNavigate();
    const engine = useMagicBlockEngine();
    const activeGamesRef = useRef<FetchedGame[]>(activeGamesLoaded);
    const [isSearchingGame, setIsSearchingGame] = useState(false);
    const [inputValue, setInputValue] = useState<string>('');  
    const [isBuyInModalOpen, setIsBuyInModalOpen] = useState(false);
    const [selectedGamePlayerInfo, setSelectedGamePlayerInfo] = useState<PlayerInfo>({
        playerStatus: "new_player",
        need_to_delegate: false,
        need_to_undelegate: false,
        newplayerEntityPda: new PublicKey(0)
    });
    const pingResultsRef = useRef<{ endpoint: string; pingTime: number }[]>([]);

    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(event.target.value);
    };
    const handleEnterKeyPress = async (inputValue: string) => {
        if (inputValue.trim() !== '') {
            setIsSearchingGame(true);
            try {
                const worldId = {worldId: new anchor.BN(inputValue.trim())};

                const alreadyExists = activeGamesLoaded.some(
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
                            setActiveGamesLoaded([...activeGamesLoaded, {activeGame: newGameInfo, playerInfo: {
                                playerStatus: playerStatus,
                                need_to_delegate: need_to_delegate,
                                need_to_undelegate: need_to_undelegate,
                                newplayerEntityPda: newplayerEntityPda
                            }}]);
                            activeGamesRef.current = [...activeGamesRef.current, {activeGame: newGameInfo, playerInfo: {
                                playerStatus: playerStatus,
                                need_to_delegate: need_to_delegate,
                                need_to_undelegate: need_to_undelegate,
                                newplayerEntityPda: newplayerEntityPda
                            }}];
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

    const handleRefresh = async (reloadActiveGame: FetchedGame, index: number) => {
        try {
            const clearThisGame = [...activeGamesLoaded];
            clearThisGame[index].activeGame.active_players = -1;
            setActiveGamesLoaded(clearThisGame);

            const pingResults = await Promise.all(endpoints.map(async (endpoint) => {
                const pingTimes = await Promise.all([
                    pingEndpoint(endpoint),
                    pingEndpoint(endpoint),
                    pingEndpoint(endpoint),
                ]);
                const bestPingTime = Math.min(...pingTimes);
                return { endpoint, pingTime: bestPingTime };
            }));

            const result = await getMyPlayerStatus(engine, reloadActiveGame.activeGame.worldId, reloadActiveGame.activeGame.max_players);

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
            } else {
                console.log("Error fetching player status");
            }

            const newgame: FetchedGame = {
                activeGame: {
                    ...reloadActiveGame.activeGame,
                    isLoaded: true,
                    active_players: activeplayers,
                    ping: pingResults.find(ping => ping.endpoint === reloadActiveGame.activeGame.endpoint)?.pingTime || 0,
                } as ActiveGame, 
                playerInfo: {
                    playerStatus: playerStatus,
                    need_to_delegate: need_to_delegate,
                    need_to_undelegate: need_to_undelegate,
                    newplayerEntityPda: newplayerEntityPda
                } as PlayerInfo
            }

            const refreshedGames = [...activeGamesLoaded];
            refreshedGames[index] = newgame;
            setActiveGamesLoaded(refreshedGames);
        
        }catch (error) {
            console.log("Error refreshing games:", error);
        }
    }

    const fetchAndLogMapData = async (activeGamesLoaded: FetchedGame[]) => {
        const pingResults = await Promise.all(endpoints.map(async (endpoint) => {
            const pingTimes = await Promise.all([
                pingEndpoint(endpoint),
                pingEndpoint(endpoint),
                pingEndpoint(endpoint),
            ]);
            const bestPingTime = Math.min(...pingTimes);
            return { endpoint, pingTime: bestPingTime };
        }));

        const gameCopy = [...activeGamesLoaded];
        let filteredGames = gameCopy.filter((game, i) => {
            const ping = pingResults.find(ping => ping.endpoint === game.activeGame.endpoint);
            if (ping && ping.pingTime > 1000) {
                return false;
            }
            gameCopy[i].activeGame.ping = ping?.pingTime || 0;
            return true; 
        });
        filteredGames.sort((a, b) => {
            const pingA = pingResults.find(ping => ping.endpoint === a.activeGame.endpoint)?.pingTime || 0;
            const pingB = pingResults.find(ping => ping.endpoint === b.activeGame.endpoint)?.pingTime || 0;
            return pingA - pingB;
        });

        for (let i = 0; i < filteredGames.length; i++) {
            const startTime = performance.now();
            engine.setEndpointEphemRpc(filteredGames[i].activeGame.endpoint);

            const mapseed = "origin";
            const mapEntityPda = FindEntityPda({
                worldId: filteredGames[i].activeGame.worldId,
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
                    worldId: filteredGames[i].activeGame.worldId,
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
                const mapParsedData = await mapFetchOnChain(engine, mapComponentPda);
                if (mapParsedData) {
                    const preNewGame: FetchedGame = {
                        activeGame: {
                            ...filteredGames[i].activeGame,
                            isLoaded: true,
                            name: mapParsedData.name,
                            active_players: -1,
                            max_players: mapParsedData.maxPlayers,
                            size: mapParsedData.width,
                            image: token_image,
                            token: token_name,
                            base_buyin: base_buyin,
                            min_buyin: min_buyin,
                            max_buyin: max_buyin,
                            endpoint: filteredGames[i].activeGame.endpoint,
                        } as ActiveGame,
                        playerInfo: {
                            playerStatus: "new_player",
                            need_to_delegate: false,
                            need_to_undelegate: false,
                            newplayerEntityPda: new PublicKey(0)
                        } as PlayerInfo
                    }

                    const preMergedGames = [...filteredGames];
                    preMergedGames[i] = preNewGame;
                    filteredGames = preMergedGames;
                    setActiveGamesLoaded(preMergedGames);
                    
                    const result = await getMyPlayerStatus(engine, filteredGames[i].activeGame.worldId, mapParsedData.maxPlayers);
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

                    const newgame: FetchedGame = {
                        activeGame: {
                            ...filteredGames[i].activeGame,
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
                            endpoint: filteredGames[i].activeGame.endpoint,
                        } as ActiveGame, 
                        playerInfo: {
                            playerStatus: playerStatus,
                            need_to_delegate: need_to_delegate,
                            need_to_undelegate: need_to_undelegate,
                            newplayerEntityPda: newplayerEntityPda
                        } as PlayerInfo
                    }

                    const mergedGames = [...filteredGames];
                    mergedGames[i] = newgame;
                    filteredGames = mergedGames;
                    setActiveGamesLoaded(mergedGames);

                    /* 
                    setActiveGamesLoaded((prevActiveGames: FetchedGame[]) => {
                        const updatedGames = prevActiveGames.map((game : FetchedGame, index) =>
                            game.activeGame.worldId === activeGamesLoaded[i].activeGame.worldId &&
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
                    }); */
                    console.log('fetchAndLogMapData', i, performance.now() - startTime);
                    console.log(filteredGames)
                    console.log(
                        `No account info found for game ID ${filteredGames[i].activeGame.worldId}`,
                    );
                }
            } catch (error) {
                console.log(
                    `Error fetching map data for game ID ${filteredGames[i].activeGame.worldId}:`,
                    error,
                );
            }
        }
    };

    useEffect(() => {
        setTimeout(() => {
            try {
                fetchAndLogMapData(activeGamesLoaded); 
            } catch (error) {
                console.log("Error fetching map data:", error);
            }
        }, 2000);
    }, [engine]);

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
                navigate(`/game?id=${mapEntityPda.toString()}`);
              } catch (joinError) {
                console.log("error", joinError);
              }
        }
        if (game.playerInfo.playerStatus === "in_game") {
            setMyPlayerEntityPda(game.playerInfo.newplayerEntityPda);
            navigate(`/game?id=${game.activeGame.worldPda.toString()}`);
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
                        <button className="btn-outlined btn-orange" onClick={() => navigate("/about")}>How to Play</button>
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
                                <th>
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginRight: '10%' }}>
                                        <span className="flex-row justify-center items-center inline-flex m-0 w-[100%] mr-[20%]">Ready?</span>
                                        <div className="tooltip-container" style={{ position: 'absolute', display: 'inline-block', marginTop: '3px' }}>
                                            <button
                                                className="inline-flex m-0"
                                                onClick={() => { fetchAndLogMapData(activeGamesRef.current) }}
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg"  className="refresh-icon" style={{ color: "white" }} fill="none" viewBox="-0.5 -0.5 16 16" stroke-linecap="round" stroke-linejoin="round" stroke="#FFFFFF" id="Refresh--Streamline-Mynaui" height="20" width="20"><path d="M12.8125 5c-0.8699999999999999 -1.986875 -3.0143750000000002 -3.125 -5.32625 -3.125C4.561875000000001 1.875 2.158125 4.095 1.875 6.9375" stroke-width="1"></path><path d="M10.305625000000001 5.25h2.48125a0.3375 0.3375 0 0 0 0.3375 -0.3375V2.4375M2.1875 10c0.8699999999999999 1.986875 3.0143750000000002 3.125 5.32625 3.125 2.9243750000000004 0 5.328125 -2.22 5.61125 -5.0625" stroke-width="1"></path><path d="M4.694375 9.75h-2.48125a0.3375 0.3375 0 0 0 -0.338125 0.3375v2.475" stroke-width="1"></path></svg>                                       
                                            </button>
                                            <span className="tooltip-text">Refresh All</span>
                                        </div>
                                    </div>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {activeGamesLoaded.filter(row => row.activeGame.ping > 0).length == 0 && <tr><td colSpan={10} style={{textAlign: 'center'}}><Spinner /> {' '} Loading games, please wait. </td></tr>}
                            {activeGamesLoaded.map((row, idx) => (
                                <tr key={idx} style={{display: row.activeGame.ping <= 0 ? 'none' : 'table-row'}}>
                                    <td>{row.activeGame.isLoaded ? row.activeGame.name : <Spinner />}</td>
                                    <td>{getRegion(activeGamesLoaded[idx].activeGame.endpoint)}</td>
                                    <td>{row.activeGame.worldId.toString()}</td>
                                    <td>{row.activeGame.isLoaded ? row.activeGame.token : <Spinner />}</td>
                                    <td>{row.activeGame.isLoaded ? row.activeGame.min_buyin + " - " + row.activeGame.max_buyin : <Spinner />}</td>
                                    <td>{row.activeGame.isLoaded && row.activeGame.active_players >= 0 ? row.activeGame.active_players + "/" + row.activeGame.max_players : <Spinner />}</td>
                                    <td>
                                        <div className="ping-cell">
                                            <span className="ping-circle" style={{ backgroundColor: getPingColor(row.activeGame.ping) }} />
                                            <span style={{color: getPingColor(row.activeGame.ping)}}>{row.activeGame.ping >= 0 ? `${row.activeGame.ping}ms` : 'Timeout'}</span>
                                        </div>
                                    </td>
                                    <td>
                                    <button
                                            className="btn-play"
                                            disabled={!row.activeGame.isLoaded || row.activeGame.ping < 0 || row.activeGame.active_players < 0}
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
                                    <div className="tooltip-container" style={{ position: 'absolute', display: 'inline-block', marginTop: '8px' }}>
                                        <button
                                            onClick={() => {
                                                handleRefresh(row, idx);
                                            }}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="refresh-icon" style={{marginLeft:"20px", color: "white"}} fill="none" viewBox="-0.5 -0.5 16 16" stroke-linecap="round" stroke-linejoin="round" stroke="#FFFFFF" id="Refresh--Streamline-Mynaui" height="20" width="20"><path d="M12.8125 5c-0.8699999999999999 -1.986875 -3.0143750000000002 -3.125 -5.32625 -3.125C4.561875000000001 1.875 2.158125 4.095 1.875 6.9375" stroke-width="1"></path><path d="M10.305625000000001 5.25h2.48125a0.3375 0.3375 0 0 0 0.3375 -0.3375V2.4375M2.1875 10c0.8699999999999999 1.986875 3.0143750000000002 3.125 5.32625 3.125 2.9243750000000004 0 5.328125 -2.22 5.61125 -5.0625" stroke-width="1"></path><path d="M4.694375 9.75h-2.48125a0.3375 0.3375 0 0 0 -0.338125 0.3375v2.475" stroke-width="1"></path></svg>                                       
                                        </button>
                                        <span className="tooltip-text">Refresh</span>
                                    </div>
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
