import React, { useEffect, useState } from "react";
import { ActiveGame } from "@utils/types";
import "./BuyInModal.css";
import { useNavigate } from "react-router-dom";
import { gameExecuteJoin } from "../../states/gameExecuteJoin";
import { useMagicBlockEngine } from "../../engine/MagicBlockEngineProvider";
import { PublicKey } from "@solana/web3.js";

type BuyInModalProps = {
  setIsBuyInModalOpen: (isOpen: boolean) => void;
  activeGame: ActiveGame;
  setMyPlayerEntityPda: (pda: PublicKey | null) => void;
  setScreenSize: (size: { width: number; height: number }) => void;
};

const BuyInModal: React.FC<BuyInModalProps> = ({ setIsBuyInModalOpen, activeGame, setMyPlayerEntityPda, setScreenSize }) => {
  const navigate = useNavigate();
  const engine = useMagicBlockEngine();

  const [buyIn, setBuyIn] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const handleSliderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    let value = parseFloat(event.target.value);
    if (activeGame?.max_buyin) {
      value = value > activeGame.max_buyin ? activeGame.max_buyin : value;
    } else {
      value = value > 10 ? 10 : value;
    }
    value = value > 0.1 ? parseFloat(value.toFixed(1)) : value;
    setBuyIn(value);
  };

  useEffect(() => {
    if (!activeGame) return;

    if (buyIn > activeGame.max_buyin) {
      setBuyIn(activeGame.max_buyin);
    } else if (buyIn < activeGame.min_buyin) {
      setBuyIn(activeGame.min_buyin);
    }
  }, [buyIn, activeGame]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setStatusMessage("Submitting buy-in transaction...");

    try {
      const transaction = await gameExecuteJoin(engine, activeGame, buyIn, "unnamed", setMyPlayerEntityPda);

      if (transaction) {
        setScreenSize({ width: activeGame.size, height: activeGame.size });
        navigate("/game");
      } else {
        alert("Failed to join the game. Please try again.");
      }
    } catch (error) {
      console.error("Error executing join:", error);
      alert("An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
      setStatusMessage("");
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <h1 className="modal-title">Choose Buy In</h1>

        <div className="buyInField">
          <div className="buyInInfoGroup">
            <img
              src={activeGame ? activeGame.image : `${process.env.PUBLIC_URL}/token.png`}
              alt="Token"
              className="token-image"
            />
            <div className="token-symbol">{activeGame ? activeGame.token : "LOADING"}</div>
            <input
              className="BuyInText"
              type="number"
              value={buyIn}
              onChange={(e) => setBuyIn(parseFloat(e.target.value))}
              placeholder={activeGame ? activeGame.base_buyin.toString() : "0"}
              step={activeGame ? activeGame.min_buyin / 10 : 0}
              min={activeGame ? activeGame.min_buyin : 0}
              max={activeGame ? activeGame.max_buyin : 0}
            />
          </div>
        </div>

        <div className="buyInSlider">
          <input
            type="range"
            className="slider"
            min={activeGame ? activeGame.min_buyin : 0}
            max={activeGame ? activeGame.max_buyin + activeGame.min_buyin / 10 : 0}
            step={activeGame ? activeGame.min_buyin / 10 : 0}
            value={buyIn}
            onChange={handleSliderChange}
          />
        </div>

        <div className="button-group">
          <button className="cancel-button" onClick={() => setIsBuyInModalOpen(false)} disabled={isSubmitting}>
            Cancel
          </button>
          <button className="buyin-button" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Processing..." : "Buy In"}
          </button>
        </div>

        {isSubmitting && <div className="status-message">{statusMessage}</div>}
      </div>
    </div>
  );
};

export default BuyInModal;
