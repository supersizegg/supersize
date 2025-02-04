import { PublicKey } from "@solana/web3.js";
import { createUndelegateInstruction, FindComponentPda, FindEntityPda } from "@magicblock-labs/bolt-sdk";

import { ActiveGame } from "@utils/types";
import { fetchTokenMetadata } from "@utils/helper";

import { MagicBlockEngine } from "../engine/MagicBlockEngine";
import { gameSystemJoin } from "./gameSystemJoin";
import { gameSystemBuyIn } from "./gameSystemBuyIn";
import { COMPONENT_PLAYER_ID, COMPONENT_ANTEROOM_ID, COMPONENT_MAP_ID } from "./gamePrograms";

import * as anchor from "@coral-xyz/anchor";
import { anteroomFetchOnChain, mapFetchOnChain, playerFetchOnChain, playerFetchOnEphem } from "./gameFetch";
import axios from "axios";

import { stringToUint8Array } from "@utils/helper";

type GameExecuteJoinResult = {
  success: boolean;
  message?: string;
  transactionSignature?: string;
  error?: string;
};

type PlayerInfo = {
    playerStatus: string;
    need_to_delegate: boolean;
    need_to_undelegate: boolean;
    newplayerEntityPda: PublicKey;
}

export async function gameExecuteJoin(
  engine: MagicBlockEngine,
  selectGameId: ActiveGame,
  buyIn: number,
  playerName: string,
  selectedGamePlayerInfo: PlayerInfo,
  setMyPlayerEntityPda: (pda: PublicKey | null) => void,
): Promise<GameExecuteJoinResult> {
  if (!selectGameId || selectGameId.name === "loading") {
    return { success: false, error: "Game not loaded or invalid game ID", message: "error" };
  }
  const gameInfo = selectGameId;
  let maxplayer = 20;

  const mapseed = "origin";
  const mapEntityPda = FindEntityPda({
    worldId: gameInfo.worldId,
    entityId: new anchor.BN(0),
    seed: stringToUint8Array(mapseed),
  });

  const mapComponentPda = FindComponentPda({
    componentId: COMPONENT_MAP_ID,
    entity: mapEntityPda,
  });

  let map_size = 4000;
  const mapacc = await mapFetchOnChain(engine, mapComponentPda);
  if (mapacc) {
    map_size = mapacc.width;
  }
  if (map_size == 4000) {
      maxplayer = 20;
  }
  else if (map_size == 6000) {
      maxplayer = 45;
  }
  else if (map_size == 8000) {
      maxplayer = 80;
  }

  let newplayerEntityPda = selectedGamePlayerInfo.newplayerEntityPda;
  let need_to_undelegate = selectedGamePlayerInfo.need_to_undelegate;

  if (!newplayerEntityPda) {
    return { success: false, error: "No available player slots in this game", message: "error" };
  }

  const playerComponentPda = FindComponentPda({
    componentId: COMPONENT_PLAYER_ID,
    entity: newplayerEntityPda,
  });
  console.log("component pda", playerComponentPda.toString());

  if (need_to_undelegate) {
    try {
      const undelegateIx = createUndelegateInstruction({
        payer: engine.getSessionPayer(),
        delegatedAccount: playerComponentPda,
        componentPda: COMPONENT_PLAYER_ID,
      });
      const undeltx = new anchor.web3.Transaction().add(undelegateIx);
      undeltx.recentBlockhash = (await engine.getConnectionEphem().getLatestBlockhash()).blockhash;
      undeltx.feePayer = engine.getSessionPayer();
      const playerundelsignature = await engine.processSessionEphemTransaction(
        "undelPlayer:" + playerComponentPda.toString(),
        undeltx,
      ); 
      console.log("undelegate", playerundelsignature);
    } catch (error) {
      console.log("Error undelegating:", error);
    }
  }

  const anteseed = "ante";
  const anteEntityPda = FindEntityPda({
    worldId: gameInfo.worldId,
    entityId: new anchor.BN(0),
    seed: stringToUint8Array(anteseed),
  });

  const anteComponentPda = FindComponentPda({
    componentId: COMPONENT_ANTEROOM_ID,
    entity: anteEntityPda,
  });

  const anteParsedData = await anteroomFetchOnChain(engine, anteComponentPda);
  let mint_of_token_being_sent = new PublicKey(0);

  if (!anteParsedData || !anteParsedData.vaultTokenAccount || !anteParsedData.token) {
    return { success: false, error: "Missing or invalid ante data", message: "error" };
  }

  mint_of_token_being_sent = anteParsedData.token;

  const { name } = await fetchTokenMetadata(mint_of_token_being_sent.toString());
  console.log("token", name, mint_of_token_being_sent.toString());

  try {
    const response = await axios.post("https://supersize.lewisarnsten.workers.dev/create-contest", {
      name: name,
      tokenAddress: mint_of_token_being_sent.toString(),
    });
    console.log(response);
  } catch (error) {
    console.log("error", error);
  }

  try {
    let username = engine.getWalletPayer().toString();
    if (mint_of_token_being_sent.toString() != "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v") {
      username = engine.getWalletPayer().toString() + "_" + name;
    }
    const response = await axios.post("https://supersize.lewisarnsten.workers.dev/create-user", {
      walletAddress: engine.getWalletPayer().toString(),
      name: username,
      contestId: name,
    });
    console.log(response);
  } catch (error) {
    console.log("error", error);
  }

  try {
    let buyInResult = await gameSystemBuyIn(engine, selectGameId, newplayerEntityPda, anteEntityPda, buyIn);
    if (!buyInResult.success) {
        return { success: false, error: buyInResult.error, message: "buyin_failed" };
    }
    /*
    else{
        const retrievedMyPlayers = localStorage.getItem('myplayers');
        let myplayers = [{ playerEntityPda: newplayerEntityPda.toString(), worldId: gameInfo.worldId.toNumber().toString()}];
        if (retrievedMyPlayers) {
            let index = -1;
            const players = JSON.parse(retrievedMyPlayers);
            for (let i = 0; i < players.length; i++) {
                if (players[i].worldId == gameInfo.worldId.toNumber().toString()) {
                    index = i;
                    break;
                }
            }
            if (index !== -1) {
                myplayers = JSON.parse(retrievedMyPlayers);
                myplayers[index] = { playerEntityPda: newplayerEntityPda.toString(), worldId: gameInfo.worldId.toNumber().toString()};
            }
            else{
                myplayers = [...JSON.parse(retrievedMyPlayers), { playerEntityPda: newplayerEntityPda.toString(), worldId: gameInfo.worldId.toNumber().toString()}];
            }
        }
        console.log('myplayers', myplayers)
        localStorage.setItem('myplayers', JSON.stringify(myplayers));
    }*/
  } catch (buyInError) {
    console.error("Buy-in error:", buyInError);
    return { success: false, error: `Buy-in transaction failed: ${(buyInError as Error)?.message}`, message: "buyin_failed" };
  }
 
  try {
    const joinsig = await gameSystemJoin(engine, selectGameId, newplayerEntityPda, mapEntityPda, playerName);
    if(joinsig){
      setMyPlayerEntityPda(newplayerEntityPda);
      return { success: true, transactionSignature: joinsig };
    }
    else{
      return { success: false, error: `Error joining the game`, message: "join_failed" };
    }
  } catch (joinError) {
    console.log("error", joinError);
    return {
      success: false,
      error: `Error joining the game: ${(joinError as Error)?.message}`,
      message: "join_failed"
    }; 
  } 
}
