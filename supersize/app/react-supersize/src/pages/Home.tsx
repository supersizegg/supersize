import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import FooterLink from "@components/Footer";

import "./Home.scss";

import { ActiveGame } from "@utils/types";
import { activeGamesList, options } from "@utils/constants";

import { fetchTokenMetadata, getActivePlayers, getMyPlayerStatus, getMyPlayerStatusFast } from "@utils/helper";
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
import { MagicBlockEngine } from "@engine/MagicBlockEngine";

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
    const [inputValue, setInputValue] = useState<string>('');  
    const [isBuyInModalOpen, setIsBuyInModalOpen] = useState(false);
    const [selectedGamePlayerInfo, setSelectedGamePlayerInfo] = useState<PlayerInfo>({
        playerStatus: "new_player",
        need_to_delegate: false,
        need_to_undelegate: false,
        newplayerEntityPda: new PublicKey(0)
    });
    const pingResultsRef = useRef<{ endpoint: string; pingTime: number, region: string }[]>(
        endpoints.map((endpoint, index) => ({ endpoint: endpoint, pingTime: 0, region: getRegion(endpoint) }))
    );
    const isSearchingGame = useRef(false);
    const server_index = useRef(-1);
    const selectedServer = useRef<string>("");
    const [isLoadingCurrentGames, setIsLoadingCurrentGames] = useState(true);
    const [loadingGameNum, setLoadingGameNum] = useState(-1);

    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(event.target.value);
    };
    const handleEnterKeyPress = async (inputValue: string) => {
        if (inputValue.trim() !== '') {
            isSearchingGame.current = true;
            try {
                const worldId = {worldId: new anchor.BN(inputValue.trim())};

                const alreadyExists = activeGamesLoaded.some(
                    (item) => item.activeGame.worldId.eq(worldId.worldId)
                );
                if (alreadyExists) {
                    console.log("Game with this worldId already exists, skipping.");
                    isSearchingGame.current = false;
                    return;
                }

                const worldPda = await FindWorldPda( worldId);
                const newGameInfo : ActiveGame = {worldId: worldId.worldId, worldPda: worldPda, name: "loading", active_players: 0, max_players: 0, size: 0, image:"", token:"", base_buyin: 0, min_buyin: 0, max_buyin: 0, endpoint: "", ping: 0, isLoaded: false}
                //for (const endpoint of endpoints) {
                //    engine.setEndpointEphemRpc(endpoint);
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
                            newGameInfo.endpoint = endpoints[options.indexOf(selectedServer.current)];
                            newGameInfo.name = mapParsedData.name;
                            newGameInfo.max_players = mapParsedData.maxPlayers;
                            newGameInfo.size = mapParsedData.width;
                            newGameInfo.base_buyin = mapParsedData.baseBuyin;
                            newGameInfo.min_buyin = mapParsedData.minBuyin;
                            newGameInfo.max_buyin = mapParsedData.maxBuyin;
                            newGameInfo.isLoaded = true;

                            const pingTime = await pingEndpoint(endpoints[options.indexOf(selectedServer.current)]);
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
                            } else {
                                console.error("Error fetching player status");
                            }

                            newGameInfo.active_players = activeplayers;
                            /* setSelectedGamePlayerInfo({
                                playerStatus: playerStatus,
                                need_to_delegate: need_to_delegate,
                                need_to_undelegate: need_to_undelegate,
                                newplayerEntityPda: newplayerEntityPda
                            }); */
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
                            //break;
                        }
                    } catch (error) {
                        console.error("Error fetching map data:", error);
                    }
             //}
            } catch (error) {
                console.error("Invalid PublicKey:", error);
            } finally {
                isSearchingGame.current = false;
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
    function isMyPlayerStatus(result: any): result is { playerStatus: string; need_to_delegate: boolean; need_to_undelegate: boolean; newplayerEntityPda: PublicKey; } {
        return typeof result === 'object';
    }
    function isActivePlayersStatus(result: any): result is { activeplayers: number; newplayerEntityPda: PublicKey; } {
        return typeof result === 'object';
    }

    const handleRefresh = async (engine: MagicBlockEngine, activeGamesLoaded: FetchedGame[], reloadActiveGame: FetchedGame, index: number) => {
        setIsLoadingCurrentGames(true);
        const playerComponentPda = FindComponentPda({
            componentId: COMPONENT_PLAYER_ID,
            entity: reloadActiveGame.playerInfo.newplayerEntityPda,
        });
        try {
                        
            const pingResults = await Promise.all(endpoints.map(async (endpoint) => {
                const pingTimes = await Promise.all([
                    pingEndpoint(endpoint),
                    pingEndpoint(endpoint),
                    pingEndpoint(endpoint),
                ]);
                const bestPingTime = Math.min(...pingTimes);
                return { endpoint, pingTime: bestPingTime };
            }));

            const refreshedGames = [...activeGamesLoaded];
            const prewnewgame: FetchedGame = {
                activeGame: {
                    ...refreshedGames[index].activeGame,
                    active_players: -1,
                    ping: pingResults.find(ping => ping.endpoint === reloadActiveGame.activeGame.endpoint)?.pingTime || 0,
                } as ActiveGame, 
                playerInfo: {
                    playerStatus: "new_player",
                    need_to_delegate: false,
                    need_to_undelegate: false,
                    newplayerEntityPda: new PublicKey(0)
                } as PlayerInfo
            }

            refreshedGames[index] = prewnewgame;
            setActiveGamesLoaded(refreshedGames);

            //engine.setEndpointEphemRpc(reloadActiveGame.activeGame.endpoint);

            const result = await getMyPlayerStatusFast(engine, reloadActiveGame.activeGame.worldId, playerComponentPda);
            const active_players = await getActivePlayers(engine, reloadActiveGame.activeGame.worldId, reloadActiveGame.activeGame.max_players);
            let activeplayers = 0;
            if(active_players !== "error"){
                activeplayers = active_players.activeplayers;
            }
            let need_to_delegate = false;
            let need_to_undelegate = false;
            let newplayerEntityPda = new PublicKey(0);
            let playerStatus = "new_player";

            if (isMyPlayerStatus(result)) {
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

            refreshedGames[index] = newgame;
            setActiveGamesLoaded([...refreshedGames]); 
            setIsLoadingCurrentGames(false);
        } catch (error) {
            console.log("Error refreshing games:", error);
            setIsLoadingCurrentGames(false);
        }
    };

    const fetchAndLogMapData = async (engine: MagicBlockEngine, activeGamesLoaded: FetchedGame[], server: string, reloadPlayerComponents: boolean = true, pingList: any = null, firstLoad: boolean = false) => {
        let pingResults = pingList;
        if(!pingResults){
            pingResults = await pingEndpoints();
            pingResults = pingResults.pingResults;
        }
        /* const pingResults = await Promise.all(endpoints.map(async (endpoint) => {
            const pingTimes = await Promise.all([
                pingEndpoint(endpoint),
                pingEndpoint(endpoint),
                pingEndpoint(endpoint),
            ]);
            const bestPingTime = Math.min(...pingTimes);
            return { endpoint, pingTime: bestPingTime };
        })); */
        const gameCopy = [...activeGamesLoaded];
        let filteredGames = gameCopy.filter((game, i) => {
            return endpoints[options.indexOf(server)] === game.activeGame.endpoint;
        });
        /*
        filteredGames.sort((a, b) => {
            const pingA = pingResults.find((ping: any) => ping.endpoint === a.activeGame.endpoint)?.pingTime || 0;
            const pingB = pingResults.find((ping: any) => ping.endpoint === b.activeGame.endpoint)?.pingTime || 0;
            return pingA - pingB;
        }); */
        for (let i = 0; i < filteredGames.length; i++) {
        try{
            const startTime = performance.now();

            const preNewGame: FetchedGame = {
                activeGame: {
                    ...filteredGames[i].activeGame,
                    isLoaded: true,
                    active_players: -1,
                    ping: 0,
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
                    let activeplayers = 0;
                    let need_to_delegate = false;
                    let need_to_undelegate = false;
                    let newplayerEntityPda = new PublicKey(0);
                    let playerStatus = "new_player";

                    if (reloadPlayerComponents){
                        const result = await getMyPlayerStatus(engine, filteredGames[i].activeGame.worldId, mapParsedData.maxPlayers);
                        if (isPlayerStatus(result)) {
                            activeplayers = result.activeplayers;
                            need_to_delegate = result.need_to_delegate;
                            need_to_undelegate = result.need_to_undelegate;
                            newplayerEntityPda = result.newplayerEntityPda;
                            playerStatus = result.playerStatus;
                        } else {
                            console.error("Error fetching player status");
                        }
                    }else{
                        const result = await getActivePlayers(engine, filteredGames[i].activeGame.worldId, mapParsedData.maxPlayers);
                        if (isActivePlayersStatus(result)) {
                            activeplayers = result.activeplayers;
                            newplayerEntityPda = result.newplayerEntityPda;
                        }else{
                            console.log("Error fetching player status");
                        }
                        /*
                        const retrievedMyPlayers = localStorage.getItem('myplayers');
                        if (retrievedMyPlayers) {
                            const myplayers = JSON.parse(retrievedMyPlayers);
                            console.log('myplayers', myplayers);
                            const worldIdIndex = myplayers.findIndex((player: any) => player.worldId === filteredGames[i].activeGame.worldId.toNumber().toString());
                            if (worldIdIndex !== -1) {
                                const playerEntityPda = myplayers[worldIdIndex].playerEntityPda;
                                const playerComponentPda = FindComponentPda({
                                    componentId: COMPONENT_PLAYER_ID,
                                    entity: new PublicKey(playerEntityPda),
                                });
                                const result = await getMyPlayerStatusFast(engine, filteredGames[i].activeGame.worldId, playerComponentPda);
                                console.log('result', result);
                                if (isMyPlayerStatus(result)) {
                                    //activeplayers = result.activeplayers;
                                    need_to_delegate = result.need_to_delegate;
                                    need_to_undelegate = result.need_to_undelegate;
                                    playerStatus = result.playerStatus;
                                    newplayerEntityPda = new PublicKey(playerEntityPda);
                                }else{
                                    console.log("Error fetching player status");
                                }
                            }
                        }*/
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
                            ping: pingResults.find((ping: any) => ping.endpoint === filteredGames[i].activeGame.endpoint)?.pingTime || 0,
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
                    activeGamesRef.current.forEach((game, index) => {
                        if (game.activeGame.worldId.toString() === filteredGames[i].activeGame.worldId.toString()) {
                            if ((filteredGames[i].activeGame.ping == 0 && !firstLoad)
                                || (activeGamesRef.current[i].activeGame.ping == 0 && firstLoad)
                            ) {
                                activeGamesRef.current[index] = filteredGames[i];
                            }                       
                        }
                    });
                    setActiveGamesLoaded(mergedGames);
                    console.log('fetchAndLogMapData', i, performance.now() - startTime);
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
        } catch (error) {
            //console.log("Error fetching map data:", error);
        }
        }
    };

    const handlePlayButtonClick = async (game: FetchedGame) => {
        engine.setEndpointEphemRpc(game.activeGame.endpoint);
        setSelectedGame(game.activeGame);
        setSelectedGamePlayerInfo(game.playerInfo);
        console.log('game.playerInfo', game.playerInfo)
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
            if(cashoutTx){
                fetchAndLogMapData(engine, activeGamesRef.current, selectedServer.current);
            }
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

    const pingEndpoints = async () => {
        const pingResults = await Promise.all(endpoints.map(async (endpoint) => {
            const pingTimes = await Promise.all([
                pingEndpoint(endpoint),
                pingEndpoint(endpoint),
                pingEndpoint(endpoint),
            ]);
            const bestPingTime = Math.min(...pingTimes);
            return {  endpoint: endpoint, pingTime: bestPingTime, region: options[endpoints.indexOf(endpoint)] };
        }));
        const lowestPingEndpoint = pingResults.reduce((a, b) =>
            a.pingTime < b.pingTime ? a : b
        );
        //const index = endpoints.indexOf(lowestPingEndpoint.endpoint);        
        return {pingResults: pingResults, lowestPingEndpoint: lowestPingEndpoint};
    }
    useEffect(() => {
        const handleEngineStable = debounce(() => {
            if (selectedServer.current === "") {
                setIsLoadingCurrentGames(true); // Ensure loading state is set to true at the start
                pingEndpoints().then((pingResults: any) => {
                    pingResultsRef.current = pingResults.pingResults;
                    const thisServer = pingResults.lowestPingEndpoint.region;
                    selectedServer.current = thisServer;
                    engine.setEndpointEphemRpc(pingResults.lowestPingEndpoint.endpoint);
                    try {
                        const checkActiveGamesLoaded = setInterval(async () => {
                            if (activeGamesRef.current.filter(row => row.activeGame.ping > 0).length == 0) {
                                await fetchAndLogMapData(engine, activeGamesRef.current, thisServer, true, pingResults.pingResults, true);
                            } else {
                                clearInterval(checkActiveGamesLoaded);
                                setIsLoadingCurrentGames(false); // Set loading state to false when games are loaded
                            }
                        }, pingResults.lowestPingEndpoint.pingTime * 5);
                    } catch (error) {
                        //console.log("Error fetching map data:", error);
                        selectedServer.current = ""
                    }
                }).finally(() => {
                    if (activeGamesRef.current.filter(row => row.activeGame.ping > 0).length > 0) {
                        selectedServer.current = getRegion(activeGamesRef.current[0].activeGame.endpoint);   
                        setIsLoadingCurrentGames(false); // Ensure loading state is set to false if games are already loaded
                    }
                });
            }else{
                setIsLoadingCurrentGames(false);
            }
        }, 500); 

        handleEngineStable();

        return () => {
            handleEngineStable.cancel();
        };
    }, [engine]);

    function debounce(func: Function, wait: number) {
        let timeout: NodeJS.Timeout;
        const debounced = (...args: any[]) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func(...args), wait);
        };
        debounced.cancel = () => {
            clearTimeout(timeout);
            setIsLoadingCurrentGames(false);
        }
        return debounced;
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
                    <div className="flex flex-row">
                        <input type="text" className="search-game-input" placeholder="Search Game by ID"
                                    value={inputValue}
                                    onChange={handleInputChange}
                                    onKeyDown={handleKeyPress}
                        >          
                        </input>
                        <span style={{opacity: isSearchingGame.current ? '1' : '0', alignSelf: 'center', marginRight: '10px'}}><Spinner /></span>
                    </div>
                    <div className="mr-[auto]">
                        <div>
                            <div className="region-buttons flex flex-row flex-start w-[fit-content] h-[100%] items-center justify-center">
                            Server: 
                            {pingResultsRef.current.map((item) => (
                                <button
                                className={`region-button mr-1 ml-1 text-white pl-2 pr-2 py-1 rounded-md ${
                                    isLoadingCurrentGames ? "cursor-not-allowed" : "cursor-pointer"
                                } transition-colors ${
                                    selectedServer.current === item.region ? "bg-[#666] hover:bg-[#555]" : "bg-[#444] hover:bg-[#555]"
                                }`}

                                onClick={async () => {
                                    console.log('isLoadingCurrentGames', isLoadingCurrentGames)
                                    setIsLoadingCurrentGames(true); 
                                    
                                    const clearPingGames = [...activeGamesRef.current];
                                    for (let i = 0; i < clearPingGames.length; i++) {
                                        const prewnewgame: FetchedGame = {
                                            activeGame: {
                                                ...clearPingGames[i].activeGame,
                                                active_players: -1,
                                                ping: 0,
                                            } as ActiveGame, 
                                            playerInfo: {
                                                playerStatus: "new_player",
                                                need_to_delegate: false,
                                                need_to_undelegate: false,
                                                newplayerEntityPda: new PublicKey(0)
                                            } as PlayerInfo
                                        }
                                        clearPingGames[i] = prewnewgame;
                                    }
                                    activeGamesRef.current = clearPingGames;
                                    setActiveGamesLoaded(clearPingGames); 
                                    const thisServer = item.region;
                                    selectedServer.current = thisServer;
                                    let pingResults = await pingEndpoints();
                                    pingResultsRef.current = pingResults.pingResults;
                                    engine.setEndpointEphemRpc(item.endpoint);
                                    try {
                                        await fetchAndLogMapData(engine, clearPingGames, thisServer, true, pingResults.pingResults, true);
                                        const checkActiveGamesLoaded = setInterval(async () => {
                                            if (activeGamesRef.current.filter(row => row.activeGame.ping > 0).length == 0) {
                                                await fetchAndLogMapData(engine, activeGamesRef.current, thisServer, true, pingResults.pingResults, true);
                                            } else {
                                                clearInterval(checkActiveGamesLoaded);
                                                setIsLoadingCurrentGames(false);
                                            }
                                        }, pingResults.lowestPingEndpoint.pingTime * 5);
                                    } catch (error) {
                                        console.log("Error fetching map data:", error);
                                        //setIsLoadingCurrentGames(false);
                                    } finally {
                                        if (activeGamesRef.current.filter(row => row.activeGame.ping > 0).length == activeGamesRef.current.length) {
                                            setIsLoadingCurrentGames(false); // Ensure loading state is set to false if games are already loaded
                                        }
                                    }
                                }}

                                disabled={isLoadingCurrentGames}
                                >           
                                    <div>                                 
                                        <span>{item.region}</span>
                                        {/* item.pingTime >= 0 && (
                                            <span className="text-xs" style={{ color: getPingColor(item.pingTime) }}>
                                                ({item.pingTime}ms)
                                            </span>
                                        ) */}
                                    </div>
                                </button>
                            ))}
                            </div>
                        </div>
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
                                        <span className="flex-row justify-center items-center inline-flex m-0 w-[100%] mr-[20%]">Status</span>
                                        <div className="tooltip-container" style={{ position: 'absolute', display: 'inline-block', marginTop: '3px' }}>
                                            <button
                                                className="inline-flex m-0"
                                                onClick={async () => {
                                                    setIsLoadingCurrentGames(true);
                                                    let pingResults = await pingEndpoints();
                                                    pingResultsRef.current = pingResults.pingResults;
                                                    await fetchAndLogMapData(engine, activeGamesRef.current, selectedServer.current, true, pingResults.pingResults); 
                                                    setIsLoadingCurrentGames(false);
                                                }}
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className={`${isLoadingCurrentGames && loadingGameNum == -1 ? 'refresh-icon' : ''}`} style={{ color: "white" }} fill="none" viewBox="-0.5 -0.5 16 16" stroke-linecap="round" stroke-linejoin="round" stroke="#FFFFFF" id="Refresh--Streamline-Mynaui" height="20" width="20"><path d="M12.8125 5c-0.8699999999999999 -1.986875 -3.0143750000000002 -3.125 -5.32625 -3.125C4.561875000000001 1.875 2.158125 4.095 1.875 6.9375" stroke-width="1"></path><path d="M10.305625000000001 5.25h2.48125a0.3375 0.3375 0 0 0 0.3375 -0.3375V2.4375M2.1875 10c0.8699999999999999 1.986875 3.0143750000000002 3.125 5.32625 3.125 2.9243750000000004 0 5.328125 -2.22 5.61125 -5.0625" stroke-width="1"></path><path d="M4.694375 9.75h-2.48125a0.3375 0.3375 0 0 0 -0.338125 0.3375v2.475" stroke-width="1"></path></svg>                                       
                                            </button>
                                            <span className="tooltip-text">Refresh All</span>
                                        </div>
                                    </div>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {activeGamesLoaded.filter(row => row.activeGame.ping > 0).length == 0 && <tr><td colSpan={10} style={{textAlign: 'center'}}> {/*<Spinner />*/} {' '} 
                            {selectedServer.current !== "" ? `Loading ${selectedServer.current} games, please wait...` : "Finding nearest server..."}</td></tr>}
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
                                            onClick={async() => {
                                                try {
                                                    setLoadingGameNum(idx);
                                                    await handleRefresh(engine, activeGamesLoaded, row, idx);
                                                    setLoadingGameNum(-1);
                                                } catch (error) {
                                                    console.log("Error refreshing game:", error);
                                                }   
                                            }}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className={`${loadingGameNum === idx ? 'refresh-icon' : ''}`} style={{marginLeft:"20px", color: "white"}} fill="none" viewBox="-0.5 -0.5 16 16" stroke-linecap="round" stroke-linejoin="round" stroke="#FFFFFF" id="Refresh--Streamline-Mynaui" height="20" width="20"><path d="M12.8125 5c-0.8699999999999999 -1.986875 -3.0143750000000002 -3.125 -5.32625 -3.125C4.561875000000001 1.875 2.158125 4.095 1.875 6.9375" stroke-width="1"></path><path d="M10.305625000000001 5.25h2.48125a0.3375 0.3375 0 0 0 0.3375 -0.3375V2.4375M2.1875 10c0.8699999999999999 1.986875 3.0143750000000002 3.125 5.32625 3.125 2.9243750000000004 0 5.328125 -2.22 5.61125 -5.0625" stroke-width="1"></path><path d="M4.694375 9.75h-2.48125a0.3375 0.3375 0 0 0 -0.338125 0.3375v2.475" stroke-width="1"></path></svg>                                       
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
