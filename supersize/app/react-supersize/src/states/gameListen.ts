import { AccountInfo, PublicKey } from "@solana/web3.js";
import { MagicBlockEngine } from "../engine/MagicBlockEngine";
import { decodeFood } from "@utils/helper";
import { Food, Blob } from "@utils/types";
import { COMPONENT_MAP_ID, COMPONENT_PLAYER_ID, COMPONENT_SECTION_ID, getComponentMapOnEphem, getComponentPlayerOnEphem, getComponentSectionOnEphem } from "./gamePrograms";
import { useCallback } from "react";
import { FindComponentPda } from "@magicblock-labs/bolt-sdk";


export function updateFoodList(
  section: any, 
  food_index: number,
  setAllFood: (callback: (prevAllFood: any[][]) => any[][]) => void,
  setFoodListLen: (callback: (prevFoodListLen: number[]) => number[]) => void,
  currentPlayer: Blob,
) {
  const foodArray = section.food as any[];  
  const visibleFood: Food[] = [];
  const foodData: Food[] = [];
  foodArray.forEach((foodItem, index) => {
      const foodDataArray = new Uint8Array(foodItem.data);
      const decodedFood = decodeFood(foodDataArray); 
      foodData.push({ 
          x: decodedFood.x, 
          y: decodedFood.y, 
          size: decodedFood.size
      });
  });
  if(foodData.length>0){
    setAllFood((prevAllFood) => {
        return prevAllFood.map((foodArray, index) =>
        food_index === index ? foodData : foodArray
        );
    });
    setFoodListLen((prevFoodListLen) => {
        const updatedFoodListLen = [...prevFoodListLen];
        updatedFoodListLen[food_index] = foodData.length;
        return updatedFoodListLen;
      });
  }
};

export function updateLeaderboard(
  players: any[],
  setLeaderboard: (leaderboard: any[]) => void,
  currentPlayer: Blob,
) {
  const top10Players = players
    .sort((a, b) => b.score - a.score)
          .slice(0, 10)
          .map((player) => ({
              name: player.name,
              authority: player.authority,
              x: player.x,
              y: player.y,
              radius: 4 + Math.sqrt(player.mass / 10) * 6,
              mass: player.mass,
              score: player.score,
              buyIn: player.buyIn,
              payoutTokenAccount: player.payoutTokenAccount,
              tax: player.tax,
              speed: player.speed,
              removal: player.scheduledRemovalTime,
              target_x: player.target_x,
              target_y: player.target_y,
              timestamp: performance.now(),
          }));
      setLeaderboard(top10Players);

      if (currentPlayer) {
          const sortedPlayers = players.sort((a, b) => b.score - a.score);
          const currentPlayerRank = sortedPlayers.findIndex((player) =>
              player.authority.equals(currentPlayer.authority),
          );
      }
};

export function updateMyPlayer(
  player: any,
  setCurrentPlayer: (player: Blob) => void,
  setGameEnded: (gameEnded: number) => void,
  isJoining: boolean,
) {
  //console.log("updateMyPlayer", player); 
      if (
          Math.sqrt(player.mass) == 0 &&
          player.score == 0.0 &&
          !isJoining
      ) {
          const startTime = player.joinTime.toNumber() * 1000;
          const currentTime = Date.now();
          const elapsedTime = currentTime - startTime;
          if (elapsedTime >= 6000) {
              setGameEnded(1);
          }
      }
      setCurrentPlayer({
          name: player.name,
          authority: player.authority,
          x: player.x,
          y: player.y,
          radius: 4 + Math.sqrt(player.mass / 10) * 6,
          mass: player.mass,
          score: player.score,
          tax: player.tax,
          speed: player.speed,
          removal: player.scheduledRemovalTime,
          target_x: player.targetX,
          target_y: player.targetY,
          timestamp: performance.now(),
      } as Blob);

      if (
          Math.sqrt(player.mass) == 0 &&
          player.score != 0.0 &&
          !isJoining
      ) {
          setGameEnded(2);
      }
};

export function updateMap(
  map: any,
  nextFood: { x: number; y: number },
  setNextFood: (nextFood: { x: number; y: number }) => void,
) {
  const playerArray = map.players as any[];
  if(map.nextFood){
      const foodDataArray = new Uint8Array(map.nextFood.data);
      const decodedFood = decodeFood(foodDataArray); 
      if(decodedFood.x !== nextFood.x || decodedFood.y !== nextFood.y){
      nextFood = {x: decodedFood.x, y: decodedFood.y};
      setNextFood(nextFood);
      }
  }else if(map.foodQueue > 0){
      nextFood = {x: 0, y: 0};
      setNextFood(nextFood);
  }
};

export function updatePlayers(
  player: any,
  player_index: number,
  setAllPlayers: (callback: (prevAllPlayers: Blob[]) => Blob[]) => void,
) {
  if (player) {
    setAllPlayers((prevPlayers: Blob[]) => {
      const newPlayer: Blob = {
        name: player.name,
        authority: player.authority,
        x: player.x,
        y: player.y,
        radius: 4 + Math.sqrt(player.mass / 10) * 6,
        mass: player.mass,
        score: player.score,
        tax: player.tax,
        buyIn: player.buyIn,
        payoutTokenAccount: player.payoutTokenAccount,
        speed: player.speed,
        removal: player.scheduledRemovalTime,
        target_x: player.targetX,
        target_y: player.targetY,
        timestamp: performance.now(),
      };
      const updatedPlayers = [...prevPlayers];
      updatedPlayers[player_index] = newPlayer;
      return updatedPlayers as Blob[];
    });
  }
}

export function handlePlayersComponentChange(
  accountInfo: AccountInfo<Buffer>,
  index: number,
  engine: MagicBlockEngine,
  setAllPlayers: (callback: (prevAllPlayers: Blob[]) => Blob[]) => void,

) {
  console.log("handlePlayersComponentChange", accountInfo);
  const coder = getComponentPlayerOnEphem(engine).coder;
  const parsedData = coder.accounts.decode("player", accountInfo.data);
  updatePlayers(parsedData, index, setAllPlayers);
};

export function handleFoodComponentChange(
  accountInfo: AccountInfo<Buffer>,
  index: number,
  engine: MagicBlockEngine,
  setAllFood: (callback: (prevAllFood: any[][]) => any[][]) => void,
  setFoodListLen: (callback: (prevFoodListLen: number[]) => number[]) => void,
  currentPlayer: Blob,
) {
  const coder = getComponentSectionOnEphem(engine).coder;
  const parsedData = coder.accounts.decode("section", accountInfo.data);
  updateFoodList(parsedData, index, setAllFood, setFoodListLen, currentPlayer);
};

export function handleMyPlayerComponentChange(
  accountInfo: AccountInfo<Buffer>,
  engine: MagicBlockEngine,
  setCurrentPlayer: (player: Blob) => void,
  setGameEnded: (gameEnded: number) => void,
  isJoining: boolean,
) {
  const coder = getComponentPlayerOnEphem(engine).coder;
  const parsedData = coder.accounts.decode("player", accountInfo.data);
  updateMyPlayer(parsedData, setCurrentPlayer, setGameEnded, isJoining);
};

export function handleMapComponentChange(
  accountInfo: AccountInfo<Buffer>,
  engine: MagicBlockEngine,
  nextFood: { x: number; y: number },
  setNextFood: (nextFood: { x: number; y: number }) => void,
) {
  const coder = getComponentMapOnEphem(engine).coder;
  const parsedData = coder.accounts.decode("map", accountInfo.data);
  updateMap(parsedData, nextFood, setNextFood);
};

// Subscribe to the game state
export function subscribeToGame(
  engine: MagicBlockEngine,
  foodEntities: PublicKey[],
  playerEntities: PublicKey[],
  entityMatch: PublicKey,
  currentPlayerEntity: PublicKey,
  currentPlayer: Blob,
  nextFood: { x: number; y: number },
  isJoining: boolean,
  foodComponentSubscriptionId: any,
  playersComponentSubscriptionId: any,
  myplayerComponentSubscriptionId: any,
  mapComponentSubscriptionId: any,
  setAllPlayers: (callback: (prevAllPlayers: Blob[]) => Blob[]) => void,
  setCurrentPlayer: (player: Blob) => void,
  setGameEnded: (gameEnded: number) => void,
  setAllFood: (callback: (prevAllFood: any[][]) => any[][]) => void,
  setFoodListLen: (callback: (prevFoodListLen: number[]) => number[]) => void,
  setNextFood: (nextFood: { x: number; y: number }) => void,
) {
  for (let i = 0; i < foodEntities.length; i++) {
      const foodComponenti = FindComponentPda({
          componentId: COMPONENT_SECTION_ID,
          entity: foodEntities[i],
      });
      if (foodComponentSubscriptionId.current === null) {
          foodComponentSubscriptionId.current = [
              engine.subscribeToEphemAccountInfo(foodComponenti, (accountInfo) => {
                if (!accountInfo) {
                  return;
                }
                const coder = getComponentSectionOnEphem(engine).coder;
                handleFoodComponentChange(accountInfo, i, engine, setAllFood, setFoodListLen, currentPlayer);
              }),
          ];
      } else {
          foodComponentSubscriptionId.current = [
              ...foodComponentSubscriptionId.current,
              engine.subscribeToEphemAccountInfo(foodComponenti, (accountInfo) => {
                if (!accountInfo) {
                  return;
                }
                const coder = getComponentSectionOnEphem(engine).coder;
                handleFoodComponentChange(accountInfo, i, engine, setAllFood, setFoodListLen, currentPlayer);
              }),
          ];
      }
  }
  for (let i = 0; i < playerEntities.length; i++) {
      const playersComponenti = FindComponentPda({
          componentId: COMPONENT_PLAYER_ID,
          entity: playerEntities[i],
      });
      if (playersComponentSubscriptionId.current === null) {
          playersComponentSubscriptionId.current = [
              engine.subscribeToEphemAccountInfo(playersComponenti, (accountInfo) => {
                if (!accountInfo) {
                  return;
                }
                const coder = getComponentPlayerOnEphem(engine).coder;
                handlePlayersComponentChange(accountInfo, i, engine, setAllPlayers);
              }),
          ];
      } else {
          playersComponentSubscriptionId.current = [
              ...playersComponentSubscriptionId.current,
              engine.subscribeToEphemAccountInfo(playersComponenti, (accountInfo) => {
                if (!accountInfo) {
                  return;
                }
                const coder = getComponentPlayerOnEphem(engine).coder;
                handlePlayersComponentChange(accountInfo, i, engine, setAllPlayers);
              }),
          ];
      }
  }

  const myplayerComponent = FindComponentPda({
      componentId: COMPONENT_PLAYER_ID,
      entity: currentPlayerEntity,
  });
  myplayerComponentSubscriptionId.current = engine.subscribeToEphemAccountInfo(myplayerComponent, (accountInfo) => {
    if (!accountInfo) {
      return;
    }
    const coder = getComponentPlayerOnEphem(engine).coder;
    handleMyPlayerComponentChange(accountInfo, engine, setCurrentPlayer, setGameEnded, isJoining);
  });

  const mapComponent = FindComponentPda({
      componentId: COMPONENT_MAP_ID,
      entity: entityMatch,
  });

  mapComponentSubscriptionId.current = engine.subscribeToEphemAccountInfo(mapComponent, (accountInfo) => {
    if (!accountInfo) {
      return;
    }
    const coder = getComponentMapOnEphem(engine).coder;
    handleMapComponentChange(accountInfo, engine, nextFood, setNextFood);
  });

};