import React, { useEffect, useState } from "react";
import CreateGame from "@components/CreateGame";
import { useWallet } from "@solana/wallet-adapter-react"
import { MagicBlockEngine } from "../../engine/MagicBlockEngine";
import { ActiveGame, FetchedGame } from "@utils/types";
import Dropdown from "@components/Dropdown";
import { endpoints } from "@utils/constants";
import "./LaunchGame.scss";

type launchProps = {
    activeGamesLoaded: FetchedGame[];
    setActiveGamesLoaded: React.Dispatch<React.SetStateAction<FetchedGame[]>>;
};

const LanchGame: React.FC<launchProps> = ({ activeGamesLoaded, setActiveGamesLoaded }) => {
    const options = [
        { id: 0, size: 4000, players: 20, cost: "0.4 SOL" },
        { id: 1, size: 6000, players: 45, cost: "1.0 SOL" },
        { id: 2, size: 8000, players: 80, cost: "1.6 SOL" },
    ];

    const [selectedOption, setSelectedOption] = useState(0);
    const [selectedServer, setSelectedServer] = useState<string>("Europe");
    const [selectedEndpoint, setSelectedEndpoint] = useState<string>("");

    useEffect(() => {
        if(selectedServer === "Europe"){
            setSelectedEndpoint(endpoints[0]);
        }   
        if(selectedServer === "America"){
            setSelectedEndpoint(endpoints[1]);
        }
        if(selectedServer === "Asia"){
            setSelectedEndpoint(endpoints[2]);
        }
    }, [selectedServer]);

    return (
        <div className="launch-game-container">
          <div className="launch-game-content">
            <p className="launch-game-description">Select game size:</p>
            <div className="options-container">
              {options.map((option) => (
                <div
                  key={option.id}
                  onClick={() => setSelectedOption(option.id)}
                  className={`option-card ${
                    selectedOption === option.id ? "selected" : ""
                  }`}
                >
                  <div>Size: {option.size}</div>
                  <div>Players: {option.players}</div>
                  <div>Cost: {option.cost}</div>
                </div>
              ))}
            </div>
            <p className="launch-game-description">Select server:</p>
            <Dropdown
              items={["Europe", "America", "Asia"]}
              onSelect={setSelectedServer}
              selectedItem={selectedServer}
            />
            <p className="info-text">
              Deploying a game creates a new Supersize world that lasts forever and is owned by you. The deployment cost is refundable if you decide to close the game accounts in your profile. <b>The game owner recieves a 1% fee charged on each player exit.</b>
            </p>
          </div>
          <div className="create-game-form-container">
            <CreateGame
              game_size={options[selectedOption].size}
              activeGamesLoaded={activeGamesLoaded}
              setActiveGamesLoaded={setActiveGamesLoaded}
              selectedServer={selectedEndpoint}
            />
          </div>
        </div>
      );
};

export default LanchGame;
