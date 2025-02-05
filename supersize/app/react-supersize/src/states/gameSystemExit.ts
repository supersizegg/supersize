import { PublicKey } from "@solana/web3.js";
import { ApplySystem } from "@magicblock-labs/bolt-sdk";

import { MagicBlockEngine } from "../engine/MagicBlockEngine";
import { COMPONENT_PLAYER_ID, COMPONENT_MAP_ID, SYSTEM_EXIT_GAME_ID } from "./gamePrograms";

import { ActiveGame } from "@utils/types";

export async function gameSystemExit(
  engine: MagicBlockEngine,
  gameInfo: ActiveGame,
  currentPlayerEntity: PublicKey,
  entityMatch: PublicKey,
) {
  const applySystem = await ApplySystem({
    authority: engine.getSessionPayer(),
    world: gameInfo.worldPda,
    entities: [
      {
        entity: currentPlayerEntity,
        components: [{ componentId: COMPONENT_PLAYER_ID }],
      },
      {
        entity: entityMatch,
        components: [{ componentId: COMPONENT_MAP_ID }],
      },
    ],
    systemId: SYSTEM_EXIT_GAME_ID,
    args: {
      timestamp: performance.now(),
    },
  });

  return await engine.processSessionEphemTransaction("exit:" + currentPlayerEntity, applySystem.transaction);
}
