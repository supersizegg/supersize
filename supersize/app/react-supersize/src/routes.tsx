import React from "react";
import { Route, Routes } from "react-router-dom";
import Home from "@pages/Home";
import NotFound from "@pages/NotFound";
import CreateGame from "@pages/CreateGame";
import Game from "@pages/Game";
import Leaderboard from "@pages/Leaderboard";
import Profile from "@pages/Profile";
import HowToPlay from "@pages/HowToPlay";
import { ActiveGame, FetchedGame } from "@utils/types";
import { useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { activeGamesList, NETWORK } from "@utils/constants";
import * as anchor from "@coral-xyz/anchor";

const AppRoutes = () => {
    const [selectedGame, setSelectedGame] = useState<ActiveGame | null>(null);
    const [activeGamesLoaded, setActiveGamesLoaded] = useState<FetchedGame[]>(activeGamesList[NETWORK].map((world: { worldId: anchor.BN; worldPda: PublicKey, endpoint: string }) => 
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
    } as FetchedGame)));
    const [myPlayerEntityPda, setMyPlayerEntityPda] = useState<PublicKey | null>(null);
    
    return (
        <Routes>
            <Route index element={<Home selectedGame={selectedGame} setSelectedGame={setSelectedGame}  setMyPlayerEntityPda={setMyPlayerEntityPda}
            activeGamesLoaded={activeGamesLoaded} setActiveGamesLoaded={setActiveGamesLoaded}/>} />
            <Route path="/create-game" element={<CreateGame activeGamesLoaded={activeGamesLoaded} setActiveGamesLoaded={setActiveGamesLoaded} />} />
            {selectedGame && (
                <Route path="/game" element={<Game gameInfo={selectedGame} myPlayerEntityPda={myPlayerEntityPda} />} />
            )}
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/about" element={<HowToPlay />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="*" element={<NotFound />} />
        </Routes>
    );
};

export default AppRoutes;
