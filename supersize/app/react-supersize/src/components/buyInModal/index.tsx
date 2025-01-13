import { useWallet } from "@solana/wallet-adapter-react";
import { ActiveGame } from "@utils/types";
import { useEffect, useState } from "react";
import "./BuyInModal.css";

import { gameExecuteJoin } from "../../states/gameExecuteJoin";
import { useMagicBlockEngine } from "../../engine/MagicBlockEngineProvider";

type buyInModalProps = {
    isBuyInModalOpen: boolean;
    setIsBuyInModalOpen: (isOpen: boolean) => void;
    activeGame: ActiveGame;
};

const BuyInModal: React.FC<buyInModalProps> = ({
    isBuyInModalOpen, 
    setIsBuyInModalOpen, 
    activeGame,
}) => {
    const {publicKey} = useWallet();
    const [buyIn, setBuyIn] = useState(0);
    const engine = useMagicBlockEngine();

    const handleSliderChange = (event: any) => {
        let value = parseFloat(event.target.value);
        if(activeGame.max_buyin){
            value = value > activeGame.max_buyin ? activeGame.max_buyin : value;
        }else{
            value = value > 10 ? 10 : value;
        }
        value = value > 0.1 ? parseFloat(value.toFixed(1)) : value;
        setBuyIn(value);
    };

    useEffect(() => {
        if(activeGame){
            if (buyIn > activeGame.max_buyin) {
                setBuyIn(activeGame.max_buyin); 
            }
            if (buyIn < activeGame.min_buyin){
                setBuyIn(activeGame.min_buyin);
            }
        }
    }, [buyIn]);
    
    return (
        <div className="fixed top-0 left-0 w-full h-full flex items-center justify-center bg-black bg-opacity-50 pointer-events-auto transition-opacity duration-300 ease-in-out z-[99999]"
        >
            <div className="bg-black border border-[#272b30] text-white rounded-lg shadow-sm shadow-black/5 h-[310px] p-5 w-[400px] flex flex-col items-center justify-center">
                <h1 className="m-1 text-center font-conthrax text-2xl">Choose Buy In</h1>
                <div className="buyInField">
                    <div
                    style={{
                        display: "flex",
                        alignItems: "center", 
                        justifyContent: "center",
                        width: "100%", 
                        position: "relative", 
                    }}
                    >
                    <div
                        className="buyInInfo"
                        style={{
                        marginLeft: "5px",
                        width: "fit-content",
                        display: "flex",
                        alignItems: "center",
                        flexShrink: 1, 
                        overflow: "hidden", 
                        whiteSpace: "nowrap", 
                        textOverflow: "ellipsis",
                        }}
                    >
                        <img
                        src={activeGame ? activeGame.image : `${process.env.PUBLIC_URL}/token.png`}
                        width="20px"
                        height="auto"
                        alt="Image"
                        style={{
                            flexShrink: 0, 
                            marginRight: "8px",
                        }}
                        />
                        <div
                        style={{
                            display: "inline-block",
                            height: "20px",
                            overflow: "hidden",
                            whiteSpace: "nowrap",
                            textOverflow: "ellipsis",
                            marginTop: "-3px",
                            flexShrink: 1, 
                        }}
                        >
                        {activeGame ? activeGame.token : "LOADING"}
                        </div>
                    </div>
                    <input
                            className="BuyInText"
                            type="number"
                            value={buyIn}
                            onChange={(e) => setBuyIn(parseFloat(e.target.value))}
                            placeholder={activeGame ? activeGame.base_buyin.toString() : "0"}
                            step={activeGame ? activeGame.min_buyin / 10 : 0}
                            min={activeGame ? activeGame.min_buyin : 0}
                            max={activeGame ? activeGame.max_buyin : 0}
                            style={{
                            flexGrow: 1, 
                            flexShrink: 0,
                            marginLeft: "10px",
                            marginRight: "10px",
                            zIndex: 1,
                            position: "relative", 
                            }}
                    />
                </div>
                </div>
                <div className="buyInSlider">
                    <input 
                        type="range" 
                        style={{
                            width: "60%",
                            margin: "1em",
                        }}
                        min={activeGame ? activeGame.min_buyin : 0}  
                        max={activeGame ? (activeGame.max_buyin + activeGame.min_buyin/10) : 0} 
                        step={activeGame ? (activeGame.min_buyin/10) : 0} 
                        value={buyIn} 
                        onChange={handleSliderChange} 
                        className="slider" 
                    />
                </div>
                <div className="flex justify-between w-[100%] m-2 pl-10 pr-10">
                    <button className="w-[40%] bg-black border border-[#c4b5fd] rounded-md shadow-[0_0_10px_0] shadow-[#6d5887] text-white cursor-pointer font-terminus text-lg sm:text-xl px-4 py-2 transition-colors duration-250 ease-in-out hover:bg-black hover:border-[#755e92] hover:shadow-none" onClick={() => {setIsBuyInModalOpen(false)}}>Cancel</button>
                    <button className="w-[40%] bg-black border border-[#c4b5fd] rounded-md shadow-[0_0_10px_0] shadow-[#6d5887] text-white cursor-pointer font-terminus text-lg sm:text-xl px-4 py-2 transition-colors duration-250 ease-in-out hover:bg-black hover:border-[#755e92] hover:shadow-none" onClick={() => {gameExecuteJoin(engine, activeGame, buyIn, "unnamed")}}>Buy In</button>
                </div>
            </div>
        </div>
    )
}

export default BuyInModal;