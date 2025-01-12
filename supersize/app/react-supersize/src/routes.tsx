import React from "react";
import { Route, Routes } from "react-router-dom";
import Home from "@pages/Home";
import NotFound from "@pages/NotFound";
import CreateGame from "@pages/CreateGame";
import Game from "@pages/Game";
import Leaderboard from "@pages/Leaderboard";
import Profile from "@pages/Profile";

const AppRoutes = () => {
    return (
        <Routes>
            <Route index element={<Home />} />
            <Route path="/create-game" element={<CreateGame />} />
            <Route path="/game" element={<Game />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="*" element={<NotFound />} />
        </Routes>
    );
};

export default AppRoutes;
