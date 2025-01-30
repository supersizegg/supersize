import React, { useEffect, useState } from "react";
import CreateGame from "@components/CreateGame";
import { useWallet } from "@solana/wallet-adapter-react"
import { MagicBlockEngine } from "../../engine/MagicBlockEngine";
import { ActiveGame, FetchedGame } from "@utils/types";
import Dropdown from "@components/Dropdown";
import { endpoints } from "@utils/constants";

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
    const [selectedServer, setSelectedServer] = useState<string>("");
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
        <div className="flex justify-center w-full h-full text-white">

            <div className="mt-0 w-[60%]">
                <h1 className="mt-[2vw] mb-[2vw] ml-[1.5vw] text-[36px] font-[Conthrax]">
                    Launch Your Game
                </h1>
                <p className="ml-[1.5vw] font-[Terminus] text-[20px] w-[80%]">
                    Select game size: 
                    <div className="flex justify-around bg-black w-full text-[16px]">
                        {options.map((option) => (
                            <div
                                key={option.id}
                                onClick={() => setSelectedOption(option.id)}
                                className={`m-[5px] rounded-[8px] cursor-pointer text-center w-[150px] p-[5px] shadow-[rgba(0,0,0,0.05)_0px_1px_2px_0px] bg-[#000000]`}
                                style={{
                                    border:
                                        selectedOption === option.id
                                            ? "1px solid #67F4B6"
                                            : "1px solid #272B30",
                                }}
                            >
                                <div>Size: {option.size}</div>
                                <div>Players: {option.players}</div>
                                <div>Cost: {option.cost}</div>
                            </div>
                        ))}
                    </div>
                    <br />
                    Select server:
                    <Dropdown items={["Europe", "America", "Asia"]} onSelect={setSelectedServer} selectedItem={selectedServer} />

                    <br />
                    <span className="opacity-70">
                        Deploying a game generates a new Supersize world that
                        lives forever and is owned by you. 
                    </span>
                    <br />
                    {/* <span className="free-play" style={{display:newGameCreated?'flex':'none', width: 'fit-content', padding:"10px", fontSize:"15px", marginTop:"1vh"}}>New Game ID: {newGameCreated?.worldId.toString()}, Game Wallet: {gamewallet}</span> */}
                </p>
            </div>
            <div style={{ marginRight: "1.5vw", marginTop: "1vw" }}>
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
