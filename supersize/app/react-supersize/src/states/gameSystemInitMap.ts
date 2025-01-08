import { PublicKey } from "@solana/web3.js";
import { ApplySystem } from "@magicblock-labs/bolt-sdk";

import { MagicBlockEngine } from "../engine/MagicBlockEngine";
import {
    COMPONENT_MAP_ID,
    SYSTEM_INIT_MAP_ID,
  } from "./gamePrograms";

import { ActiveGame } from "@utils/types";


export async function gameSystemInitMap(
  engine: MagicBlockEngine,
  worldPda: PublicKey,
  newmapentityPda: PublicKey,
  game_name: string,
  game_size: number,
  base_buyin: number,
  max_multiple: number,
  min_multiple: number,
) {
    const initGame = await ApplySystem({
        authority: engine.getWalletPayer(),
        world: worldPda,
        entities: [
            {
                entity: newmapentityPda,
                components: [{ componentId: COMPONENT_MAP_ID }],
            },
        ],
        systemId: SYSTEM_INIT_MAP_ID,
        args: {
            name: game_name,
            size: game_size,
            entry_fee: base_buyin,
            entry_fee_upper_bound_mul: max_multiple,
            entry_fee_lower_bound_mul: min_multiple,
            frozen: false,
        },
    });

    
    return await engine.processWalletTransaction(
      "initmap:" + newmapentityPda,
      initGame.transaction
    );
}