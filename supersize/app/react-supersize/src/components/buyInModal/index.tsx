import React, { useEffect, useRef, useState } from "react";
import { ActiveGame } from "@utils/types";
import "./BuyInModal.css";
import { useNavigate } from "react-router-dom";
import { gameExecuteJoin } from "../../states/gameExecuteJoin";
import { useMagicBlockEngine } from "../../engine/MagicBlockEngineProvider";
import { PublicKey } from "@solana/web3.js";
import { getMyPlayerStatus, stringToUint8Array } from "@utils/helper";
import { anchor, FindEntityPda } from "@magicblock-labs/bolt-sdk";
import { gameSystemJoin } from "@states/gameSystemJoin";

type PlayerInfo = {
    playerStatus: string;
    need_to_delegate: boolean;
    need_to_undelegate: boolean;
    newplayerEntityPda: PublicKey;
}

type BuyInModalProps = {
  setIsBuyInModalOpen: (isOpen: boolean) => void;
  activeGame: ActiveGame;
  setMyPlayerEntityPda: (pda: PublicKey | null) => void;
  selectedGamePlayerInfo: PlayerInfo;
};

const BuyInModal: React.FC<BuyInModalProps> = ({
  setIsBuyInModalOpen,
  activeGame,
  setMyPlayerEntityPda,
  selectedGamePlayerInfo,
}) => {
  const navigate = useNavigate();
  const engine = useMagicBlockEngine();

  const [buyIn, setBuyIn] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [retryModalView, setRetryModalView] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const selectedPlayerGameInfoRef = useRef<PlayerInfo>(selectedGamePlayerInfo);
  const retryBuyIn = useRef(false);

  useEffect(() => {
    selectedPlayerGameInfoRef.current = selectedGamePlayerInfo;
  }, [selectedGamePlayerInfo]);

  function isPlayerStatus(result: any): result is { playerStatus: string; need_to_delegate: boolean; need_to_undelegate: boolean; newplayerEntityPda: PublicKey; activeplayers: number; } {
    return typeof result === 'object' && 'activeplayers' in result;
    }

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
      if(retryBuyIn.current){
        const result = await getMyPlayerStatus(engine, activeGame.worldId, activeGame.max_players);
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
            selectedPlayerGameInfoRef.current = {
                playerStatus: playerStatus,
                need_to_delegate: need_to_delegate,
                need_to_undelegate: need_to_undelegate,
                newplayerEntityPda: newplayerEntityPda,
            };
        } 
        
      }
      const retrievedUser = localStorage.getItem('user');
      let myusername = "unnamed";
      if(retrievedUser){
          myusername = JSON.parse(retrievedUser).name;
      }
      const result = await gameExecuteJoin(engine, activeGame, buyIn, myusername, selectedPlayerGameInfoRef.current, setMyPlayerEntityPda);

      if (result.success) {
        setStatusMessage("success");
        navigate("/game");
      } else {
        setStatusMessage(result.error || "Failed to join the game. Please try again.");
        if(result.message == "buyin_failed"){
            setStatusMessage("Buy in failed, please try again");
            retryBuyIn.current = true;
        }
        if(result.message == "join_failed"){
            setRetryModalView(true);
        }
      }
    } catch (error) {
      console.error("Error executing join:", error);
      setStatusMessage("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
      // setStatusMessage("");
    }
  };

  const handleRetry = async () => {
    try {
        const mapseed = "origin";
        const mapEntityPda = FindEntityPda({
          worldId: activeGame.worldId,
          entityId: new anchor.BN(0),
          seed: stringToUint8Array(mapseed),
        });
        const joinsig = await gameSystemJoin(engine, activeGame, selectedPlayerGameInfoRef.current.newplayerEntityPda, mapEntityPda, "unnamed");
        setMyPlayerEntityPda(selectedPlayerGameInfoRef.current.newplayerEntityPda);
        navigate("/game");
      } catch (joinError) {
        console.log("error", joinError);
      }
      setRetryModalView(false);
  }


  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <h1 className="modal-title">{retryModalView ? "Buy in successful, retry joining" : "Choose Buy In"}</h1>
        {!retryModalView ? (
        <>
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

        {statusMessage !== "" && <div className="status-message">{statusMessage}</div>}
        </>
        ) : (
          <div className="retry-modal-view" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <button className="cancel-button" onClick={handleRetry} style={{width: 'fit-content'}}>Retry Join Game</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BuyInModal;
