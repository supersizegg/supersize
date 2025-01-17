import { PublicKey } from "@solana/web3.js";
import { ApplySystem } from "@magicblock-labs/bolt-sdk";

import { MagicBlockEngine } from "../engine/MagicBlockEngine";
import {
    COMPONENT_MAP_ID,
    SYSTEM_SPAWN_FOOD_ID,
    COMPONENT_SECTION_ID,
  } from "./gamePrograms";

import { ActiveGame } from "@utils/types";
import { getSectionIndex } from "@utils/helper";


export async function gameSystemSpawnFood(
  engine: MagicBlockEngine,
  gameInfo: ActiveGame,
  foodX: number,
  foodY: number,
  foodListLen: number[],
  entityMatch: PublicKey,
  foodEntities: PublicKey[],
) {
    const currentSection = getSectionIndex(
        foodX,
        foodY,
        gameInfo.size,
        2,
    );
    const selectedSection = currentSection.reduce(
        (minIndex, currentIndex) =>
            foodListLen[currentIndex] < foodListLen[minIndex]
                ? currentIndex
                : minIndex,
        currentSection[0],
    );

    const newFoodTx = await ApplySystem({
        authority: engine.getSessionPayer(),
        world: gameInfo.worldPda,
        entities: [
            {
                entity: entityMatch,
                components: [{ componentId: COMPONENT_MAP_ID }],
            },
            {
                entity: foodEntities[selectedSection],
                components: [{ componentId: COMPONENT_SECTION_ID }],
            },
        ],
        systemId: SYSTEM_SPAWN_FOOD_ID,
        args: {
            timestamp: performance.now(),
        },
    });
    
    return await engine.processSessionEphemTransaction(
      "new food@" + performance.now(),
      newFoodTx.transaction
    );
}