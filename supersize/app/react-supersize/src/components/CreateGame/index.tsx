import React, { useEffect, useRef, useState } from "react";
import { useMagicBlockEngine } from "../../engine/MagicBlockEngineProvider";
import { FetchedGame } from "@utils/types";
import TxnModal from "@components/txnModal";
import { useWallet } from "@solana/wallet-adapter-react"
import { gameExecuteNewGame } from "../../states/gameExecuteNewGame";
import "./CreateGameForm.scss";

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
        "To the moon!",
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
      setTransactions([]);
      setNewGameId("");
      setGameCreated(false);
    }, []);

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
        setIsModalOpen(true);
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
          <form className="create-game-form" onSubmit={handleSubmit}>
            <label className="form-label">
              <span className="label-text">Name</span>
              <input
                type="text"
                className="form-input"
                name="game_name"
                value={formData[5]}
                onChange={handleChange(5)}
              />
            </label>
            <label className="form-label">
              <span className="label-text">Max Buy-In</span>
              <input
                type="number"
                className="form-input no-arrows"
                name="buy_in_min"
                value={formData[1]}
                onChange={handleChange(1)}
              />
            </label>
            <label className="form-label">
              <span className="label-text">Min Buy-In</span>
              <input
                type="number"
                className="form-input no-arrows"
                name="buy_in_max"
                value={formData[2]}
                onChange={handleChange(2)}
              />
            </label>
            <label className="form-label">
              <span className="label-text">Token (mint address)</span>
              <input
                type="text"
                className="form-input no-arrows"
                name="game_token"
                value={formData[4]}
                onChange={handleChange(4)}
              />
            </label>
            <label className="form-label">
              <span className="label-text">Game Owner (wallet address)</span>
              <input
                type="text"
                className="form-input no-arrows"
                name="game_owner"
                value={formData[3]}
                onChange={handleChange(3)}
              />
            </label>
            <button type="submit" className="submit-button">
              Create Game
            </button>
          </form>
        </>
      );
    
};

export default CreateGame;
