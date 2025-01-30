import React, { useEffect, useRef, useState } from "react";
import { useMagicBlockEngine } from "../../engine/MagicBlockEngineProvider";
import { ActiveGame, FetchedGame } from "@utils/types";
import TxnModal from "@components/txnModal";
import { useWallet } from "@solana/wallet-adapter-react"
import { gameExecuteNewGame } from "../../states/gameExecuteNewGame";

type gameProps = {
    game_size: number;
    activeGamesLoaded: FetchedGame[];
    setActiveGamesLoaded: React.Dispatch<React.SetStateAction<FetchedGame[]>>;
    selectedServer: string;
};

type FormData = [number, number, number, string, string, string];

const CreateGame: React.FC<gameProps> = ({ game_size, activeGamesLoaded, setActiveGamesLoaded, selectedServer }) => {
    const engine = useMagicBlockEngine();
    const { publicKey } = useWallet();
    const userKey = publicKey?.toString() || "Connect Wallet";
    const [formData, setFormData] = useState<FormData>([
        game_size,
        10.0,
        0.1,
        userKey,
        "AsoX43Q5Y87RPRGFkkYUvu8CSksD9JXNEqWVGVsr8UEp",
        "ffa",
    ]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [gameCreated, setGameCreated] = useState(false);
    const [transactions, setTransactions] = useState<{ id: string; status: string }[]>([]);
    const [newGameId, setNewGameId] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const resolveFnRef = useRef<(value: boolean) => void>();

    function showPrompt(errorMessage: string): Promise<boolean> {
        setErrorMessage(errorMessage);
        return new Promise<boolean>((resolve) => {
            resolveFnRef.current = resolve;
        });
    }

    useEffect(() => {
        try{
            let userKey = engine.getWalletPayer().toString();
            setFormData((prev) => ({ ...prev, 3: userKey }));
        } catch(e){
            console.log(e);
        }
    }, [engine])

    useEffect(() => {
        const updatedFormData = [...formData] as FormData;
        updatedFormData[0] = game_size;
        setFormData(updatedFormData);
    }, [game_size])

    const handleChange =
        (index: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
            const { value } = e.target;
            const updatedFormData = [...formData] as FormData;
            if (index > 2) {
                updatedFormData[index] = value as string;
            } else {
                updatedFormData[index] = parseFloat(value) as number;
            }
            setFormData(updatedFormData);
        };

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsModalOpen(true); // Open the modal
        console.log(selectedServer);
        engine.setEndpointEphemRpc(selectedServer);
        gameExecuteNewGame(engine, formData[0], formData[1], formData[2], formData[3], formData[4], formData[5], activeGamesLoaded, setActiveGamesLoaded, setTransactions, showPrompt, setNewGameId, setGameCreated);
    };

    return (
        <>
        <TxnModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            transactions={transactions}
            setTransactions={setTransactions}
            errorMessage={errorMessage}
            newGameId={newGameId}
            gameCreated={gameCreated}
            handleUserRetry={() => {
                if (resolveFnRef.current) resolveFnRef.current(true);
            }}
        />
        <form
            className="flex flex-col h-fit w-[21vw] gap-2.5 p-5 border border-[#272B30] rounded-[10px] text-white bg-black shadow-[rgba(0,0,0,0.05)_0px_1px_2px_0px] font-[Terminus]"
            onSubmit={handleSubmit}
        >
            <h2 className="mb-[0.2vw]">Game Settings</h2>
            <label>
                <span className="mb-[5px] ml-[10px]">Name</span>
                <input
                    type="text"
                    className="border border-[#272B30] rounded-[5px] w-full h-[30px] bg-black text-white pl-1 font-[Terminus]"
                    name="game_name"
                    value={String(formData[5])}
                    onChange={handleChange(5)}
                />
            </label>
            <label>
                <span className="mb-[5px] ml-[10px]">Max Buy-In</span>
                <input
                    className="no-arrows border border-[#272B30] rounded-[5px] w-full h-[30px] bg-black text-white pl-1 font-[Terminus]"
                    type="number"
                    name="buy_in_min"
                    value={String(formData[1])}
                    onChange={handleChange(1)}
                />
            </label>
            <label>
                <span className="mb-[5px] ml-[10px]">Min Buy-In</span>
                <input
                    className="no-arrows border border-[#272B30] rounded-[5px] w-full h-[30px] bg-black text-white pl-1 font-[Terminus]"
                    type="number"
                    name="buy_in_max"
                    value={String(formData[2])}
                    onChange={handleChange(2)}
                />
            </label>
            <label>
                <span className="mb-[5px] ml-[10px]">Token (mint address)</span>
                <input
                    className="no-arrows border border-[#272B30] rounded-[5px] w-full h-[30px] bg-black text-white pl-1 font-[Terminus]"
                    type="text"
                    name="game_token"
                    value={String(formData[4])}
                    onChange={handleChange(4)}
                />
            </label>
            <label style={{ marginBottom: "5px" }}>
                <span className="mb-[5px] ml-[10px]">
                    Game Owner (wallet address)
                </span>
                <input
                    className="no-arrows border border-[#272B30] rounded-[5px] w-full h-[30px] bg-black text-white pl-1 font-[Terminus]"
                    type="text"
                    name="game_owner"
                    value={String(formData[3])}
                    onChange={handleChange(3)}
                />
            </label>
            <button
                type="submit"
                className="px-4 py-2 text-[20px] font-[Terminus] rounded-[10px] cursor-pointer bg-[#000] text-white border-[1px] border-[#C4B5FD] shadow-[rgb(109,88,135)_0px_0px_10px_0px] transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] hover:bg-[#000] hover:border-[#755E92] hover:shadow-none"
            >
                Create Game
            </button>
        </form>
        </>
    );
};

export default CreateGame;
