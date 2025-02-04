import React, { useEffect, useRef, useState } from "react";
import { ActiveGame } from "@utils/types";
import "./BuyInModal.css";
import { useNavigate } from "react-router-dom";
import { gameExecuteJoin } from "../../states/gameExecuteJoin";
import { useMagicBlockEngine } from "../../engine/MagicBlockEngineProvider";
import { PublicKey, Transaction } from "@solana/web3.js";
import { getMyPlayerStatus, stringToUint8Array } from "@utils/helper";
import { anchor, createDelegateInstruction, FindComponentPda, FindEntityPda } from "@magicblock-labs/bolt-sdk";
import { gameSystemJoin } from "@states/gameSystemJoin";
import { PlayerInfo } from "@utils/types";
import { playerFetchOnChain } from "@states/gameFetch";
import { COMPONENT_PLAYER_ID } from "@states/gamePrograms";
import { gameSystemCashOut } from "@states/gameSystemCashOut";


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
  const [retryModalView, setRetryModalView] = useState(0);
  const statusMessageRef = useRef("");
  const errorMessageRef = useRef("");
  const selectedPlayerGameInfoRef = useRef<PlayerInfo>(selectedGamePlayerInfo);

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
    statusMessageRef.current = "Submitting buy-in transaction...";

    try {
      const playerEntityPda = selectedPlayerGameInfoRef.current.newplayerEntityPda;

      const playerComponentPda = FindComponentPda({
         componentId: COMPONENT_PLAYER_ID,
         entity: playerEntityPda,
      });
      const thisPlayerStatus = await playerFetchOnChain(engine, playerComponentPda);
      console.log('thisPlayerStatus', thisPlayerStatus, thisPlayerStatus?.authority !== null)
      console.log('statusMessageRef.current', statusMessageRef.current, statusMessageRef.current !== "")
      let retryModalViewNum = 0
      if(thisPlayerStatus?.authority !== null || errorMessageRef.current !== ""){
        const result = await getMyPlayerStatus(engine, activeGame.worldId, activeGame.max_players);
        if (isPlayerStatus(result)) {
            console.log('result', result)
            if (result.need_to_delegate){
                try {
                    const playerComponentPda = FindComponentPda({
                        componentId: COMPONENT_PLAYER_ID,
                        entity: selectedPlayerGameInfoRef.current.newplayerEntityPda,
                    });
                    const playerdelegateIx = createDelegateInstruction({
                        entity: selectedPlayerGameInfoRef.current.newplayerEntityPda,
                        account: playerComponentPda,
                        ownerProgram: COMPONENT_PLAYER_ID,
                        payer: engine.getWalletPayer(),
                    });
                    const deltx = new Transaction().add(playerdelegateIx);
                    const playerdelsignature = await engine.processWalletTransaction("playerdelegate", deltx);
                    console.log(`delegation signature: ${playerdelsignature}`);
                } catch (error) {
                    console.log('Error delegating:', error);
                }
            }
            if(result.playerStatus == "cashing_out"){
                //retryModalViewNum = 2;
                statusMessageRef.current = "Need to cash out!";
                return;
            }
            else if(result.playerStatus == "in_game"){
                statusMessageRef.current = "Already in game, rejoining...";
                setTimeout(() => {
                    setMyPlayerEntityPda(result.newplayerEntityPda);
                    navigate("/game");
                }, 1000);
                return;
            }
            else if(result.playerStatus == "bought_in"){
                retryModalViewNum = 1;
            }
        }
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
      console.log('selectedPlayerGameInfoRef.current', selectedPlayerGameInfoRef.current.newplayerEntityPda.toString())
      const result = await gameExecuteJoin(engine, activeGame, buyIn, myusername, selectedPlayerGameInfoRef.current, setMyPlayerEntityPda);

      if (result.success) {
        statusMessageRef.current = "success";
        navigate("/game");
      } else {
        errorMessageRef.current = result.error || "Failed to join the game. Please try again.";
        if(result.message == "buyin_failed"){
            statusMessageRef.current = "Buy in failed, please try again";
        }
        if(result.message == "join_failed"){
            retryModalViewNum = 1;       
        }
      }
      setRetryModalView(retryModalViewNum);
    } catch (error) {
      console.error("Error executing join:", error);
      statusMessageRef.current = "An unexpected error occurred. Please try again.";
    } finally {
      setIsSubmitting(false);
      // setStatusMessage("");
    }
  };

  const handleRetry = async () => {
    let retrySuccess = false;
    if(retryModalView == 1){    
      try {
        const mapseed = "origin";
        const mapEntityPda = FindEntityPda({
          worldId: activeGame.worldId,
          entityId: new anchor.BN(0),
          seed: stringToUint8Array(mapseed),
        });
        const joinsig = await gameSystemJoin(engine, activeGame, selectedPlayerGameInfoRef.current.newplayerEntityPda, mapEntityPda, "unnamed");
        retrySuccess = true;
        setMyPlayerEntityPda(selectedPlayerGameInfoRef.current.newplayerEntityPda);
        navigate("/game");
      } catch (joinError) {
        console.log("error", joinError);
        statusMessageRef.current = "Failed to join the game. Please try again.";
      }
    }
    else if(retryModalView == 2){
        try {
            const anteEntityPda = FindEntityPda({
                worldId: activeGame.worldId,
                entityId: new anchor.BN(0),
                seed: stringToUint8Array("ante")
            });
            const cashoutTx = await gameSystemCashOut(engine, activeGame, anteEntityPda, selectedPlayerGameInfoRef.current.newplayerEntityPda);       
            if(cashoutTx){
                retrySuccess = true;
                statusMessageRef.current = "Cash out successful";
            }
        } catch (cashoutError) {
            console.log("error", cashoutError);
            statusMessageRef.current = "Failed to cash out. Please try again.";
        }
    }

    if(!retrySuccess){
        const result = await getMyPlayerStatus(engine, activeGame.worldId, activeGame.max_players);
        if (isPlayerStatus(result)) {
            if (result.need_to_delegate){
                try {
                    const playerComponentPda = FindComponentPda({
                        componentId: COMPONENT_PLAYER_ID,
                        entity: selectedPlayerGameInfoRef.current.newplayerEntityPda,
                    });
                    const playerdelegateIx = createDelegateInstruction({
                        entity: selectedPlayerGameInfoRef.current.newplayerEntityPda,
                        account: playerComponentPda,
                        ownerProgram: COMPONENT_PLAYER_ID,
                        payer: engine.getWalletPayer(),
                    });
                    const deltx = new Transaction().add(playerdelegateIx);
                    const playerdelsignature = await engine.processWalletTransaction("playerdelegate", deltx);
                    console.log(`delegation signature: ${playerdelsignature}`);
                } catch (error) {
                    console.log('Error delegating:', error);
                }
            }
            console.log('result', result)
            if(result.playerStatus == "cashing_out"){
                //setRetryModalView(2);
                statusMessageRef.current = "Need to cash out!";
                return;
            }
            else if(result.playerStatus == "in_game"){
                statusMessageRef.current = "Already in game, rejoining...";
                setTimeout(() => {
                    setMyPlayerEntityPda(result.newplayerEntityPda);
                    navigate("/game");
                }, 1000);
            }
            else if(result.playerStatus == "bought_in"){
                setRetryModalView(1);
            }
            else if(result.playerStatus == "new_player"){
                setRetryModalView(0);
            }
        }
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
  }


  return (
    <div className="modal-overlay">
      <div className="modal-container">
        {retryModalView !== 0 && (
          <button
            className="close-button"
            onClick={() => setIsBuyInModalOpen(false)}
            style={{
              alignSelf: 'flex-end',
              top: '-15px',
              right: '-10px',
              position: 'relative',
              border: 'none',
              fontSize: '15px',
              cursor: 'pointer',
            }}
          >
            X
          </button>
        )}
        <h1 className="modal-title" style={{marginTop: retryModalView !== 0 ? '-30px' : '0', marginBottom: retryModalView !== 0 ? '8px' : '0'}}>
          {retryModalView == 0 ? "Choose Buy In" : retryModalView == 1 ? "Buy In Success! Retry Spawn" : "Need to Cash Out"}
        </h1>
        {retryModalView == 0 ? (
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

        {statusMessageRef.current !== "" && <div className="status-message">{statusMessageRef.current}</div>}
        </>
        ) : (
        <>
          <div className="retry-modal-view" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <button className="cancel-button" onClick={handleRetry} style={{width: 'fit-content'}}>Retry {retryModalView == 1 ? "Spawn Player" : "Cash Out"}</button>
          </div>
          {statusMessageRef.current !== "" && <div className="status-message">{statusMessageRef.current}</div>}
        </>
        )}
      </div>
    </div>
  );
};

export default BuyInModal;
