import { PublicKey } from "@solana/web3.js";
import { ApplySystem } from "@magicblock-labs/bolt-sdk";

import { MagicBlockEngine } from "../engine/MagicBlockEngine";
import {
    COMPONENT_MAP_ID,
    COMPONENT_PLAYER_ID,
    SYSTEM_INIT_PLAYER_ID,
  } from "./gamePrograms";

export async function gameSystemInitPlayer(
  engine: MagicBlockEngine,
  worldPda: PublicKey,
  newplayerPda: PublicKey,
  newmapentityPda: PublicKey,
) {
    const initPlayer = await ApplySystem({
        authority: engine.getSessionPayer(),
        world: worldPda,
        entities: [
            {
                entity: newplayerPda,
                components: [{ componentId: COMPONENT_PLAYER_ID }],
            },
            {
                entity: newmapentityPda,
                components: [{ componentId: COMPONENT_MAP_ID }],
            },
        ],
        systemId: SYSTEM_INIT_PLAYER_ID,
    });

    
    return await engine.processSessionChainTransaction(
      "initplayer:" + newplayerPda,
      initPlayer.transaction
    );
}