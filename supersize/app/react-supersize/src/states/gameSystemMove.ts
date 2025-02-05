import { PublicKey } from "@solana/web3.js";
import { ApplySystem } from "@magicblock-labs/bolt-sdk";
import * as anchor from "@coral-xyz/anchor";

import { MagicBlockEngine } from "../engine/MagicBlockEngine";
import {
  COMPONENT_PLAYER_ID,
  COMPONENT_MAP_ID,
  SYSTEM_EAT_FOOD_ID,
  SYSTEM_EAT_PLAYER_ID,
  COMPONENT_SECTION_ID,
  SYSTEM_MOVEMENT_ID,
} from "./gamePrograms";

import { ActiveGame, Blob } from "@utils/types";
import { getSectionIndex, checkPlayerDistances, findListIndex, getClampedFoodPosition } from "@utils/helper";

export async function gameSystemMove(
  engine: MagicBlockEngine,
  gameInfo: ActiveGame,
  currentPlayerEntity: PublicKey,
  currentPlayer: Blob,
  entityMatch: PublicKey,
  foodEntities: PublicKey[],
  playerEntities: PublicKey[],
  allplayers: Blob[],
  players: Blob[],
  foodListLen: number[],
  mousePositionX: number,
  mousePositionY: number,
  isMouseDown: boolean,
  screenSize: { width: number; height: number },
) {
  try {
    const newX = Math.max(
      0,
      Math.min(screenSize.width, Math.floor(currentPlayer.x + mousePositionX - window.innerWidth / 2)),
    );
    const newY = Math.max(
      0,
      Math.min(screenSize.height, Math.floor(currentPlayer.y + mousePositionY - window.innerHeight / 2)),
    );

    const alltransaction = new anchor.web3.Transaction();

    const currentSection = getSectionIndex(currentPlayer.x, currentPlayer.y, gameInfo.size, 2);
    for (const section_index of currentSection) {
      const eatFoodTx = await ApplySystem({
        authority: engine.getSessionPayer(),
        world: gameInfo.worldPda,
        entities: [
          {
            entity: currentPlayerEntity,
            components: [{ componentId: COMPONENT_PLAYER_ID }],
          },
          {
            entity: foodEntities[section_index],
            components: [{ componentId: COMPONENT_SECTION_ID }],
          },
          {
            entity: entityMatch,
            components: [{ componentId: COMPONENT_MAP_ID }],
          },
        ],
        systemId: SYSTEM_EAT_FOOD_ID,
        args: {
          timestamp: performance.now(),
        },
      });
      alltransaction.add(eatFoodTx.transaction);
    }

    const playerstoeat = checkPlayerDistances(players, currentPlayer);
    if (playerstoeat) {
      const playersListIndex = findListIndex(playerstoeat, allplayers);
      if (playersListIndex != null) {
        const eatPlayerTx = await ApplySystem({
          authority: engine.getSessionPayer(),
          world: gameInfo.worldPda,
          entities: [
            {
              entity: currentPlayerEntity,
              components: [{ componentId: COMPONENT_PLAYER_ID }],
            },
            {
              entity: playerEntities[playersListIndex],
              components: [{ componentId: COMPONENT_PLAYER_ID }],
            },
            {
              entity: entityMatch,
              components: [{ componentId: COMPONENT_MAP_ID }],
            },
          ],
          systemId: SYSTEM_EAT_PLAYER_ID,
          args: {
            timestamp: performance.now(),
          },
        });

        alltransaction.add(eatPlayerTx.transaction);
      }
    }

    const { food_x, food_y } = getClampedFoodPosition(
      currentPlayer.x,
      currentPlayer.y,
      newX,
      newY,
      currentPlayer.radius,
      gameInfo.size,
      gameInfo.size,
    );

    const targetSectionBoosting = getSectionIndex(food_x, food_y, gameInfo.size, 2);
    const selectedSection = targetSectionBoosting.reduce(
      (minIndex: number, currentIndex: number) =>
        foodListLen[currentIndex] < foodListLen[minIndex] ? currentIndex : minIndex,
      targetSectionBoosting[0],
    );

    const makeMove = await ApplySystem({
      authority: engine.getSessionPayer(),
      world: gameInfo.worldPda,
      entities: [
        {
          entity: currentPlayerEntity,
          components: [{ componentId: COMPONENT_PLAYER_ID }],
        },
        {
          entity: foodEntities[selectedSection],
          components: [{ componentId: COMPONENT_SECTION_ID }],
        },
        {
          entity: entityMatch,
          components: [{ componentId: COMPONENT_MAP_ID }],
        },
      ],
      systemId: SYSTEM_MOVEMENT_ID,
      args: {
        x: newX,
        y: newY,
        boost: isMouseDown,
        timestamp: performance.now(),
      },
    });

    alltransaction.add(makeMove.transaction);

    await engine.processSessionEphemTransactionNoConfirm("txn:" + performance.now(), alltransaction).catch((error) => {
      console.log(error);
    });
    // eslint-disable-next-line
  } catch (error) {}
}
