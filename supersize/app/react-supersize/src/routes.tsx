import React from "react";
import { Route, Routes } from "react-router-dom";
import Home from "@pages/Home";
import NotFound from "@pages/NotFound";
import CreateGame from "@pages/CreateGame";
import Game from "@pages/Game";
import Leaderboard from "@pages/Leaderboard";
import Profile from "@pages/Profile";
import { ActiveGame } from "@utils/types";
import { useState } from "react";
import { PublicKey } from "@solana/web3.js";

const AppRoutes = () => {
    const [selectedGame, setSelectedGame] = useState<ActiveGame | null>(null);
    const [activeGames, setActiveGames] = useState<ActiveGame[]>([]);
    const [myPlayerEntityPda, setMyPlayerEntityPda] = useState<PublicKey | null>(null);
    
    return (
        <Routes>
            <Route index element={<Home selectedGame={selectedGame} setSelectedGame={setSelectedGame}  setMyPlayerEntityPda={setMyPlayerEntityPda}/>} />
            <Route path="/create-game" element={<CreateGame activeGames={activeGames} setActiveGames={setActiveGames} />} />
            {selectedGame && (
                <Route path="/game" element={<Game gameInfo={selectedGame} screenSize={{ width: 2000, height: 2000 }} myPlayerEntityPda={myPlayerEntityPda} />} />
            )}
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="*" element={<NotFound />} />
        </Routes>
    );
};

export default AppRoutes;
