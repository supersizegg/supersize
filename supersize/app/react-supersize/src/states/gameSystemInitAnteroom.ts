import { PublicKey } from "@solana/web3.js";
import { ApplySystem } from "@magicblock-labs/bolt-sdk";

import { MagicBlockEngine } from "../engine/MagicBlockEngine";
import {
    COMPONENT_MAP_ID,
    SYSTEM_INIT_ANTEROOM_ID,
    COMPONENT_ANTEROOM_ID,
  } from "./gamePrograms";

import { ActiveGame } from "@utils/types";


export async function gameSystemInitAnteroom(
  engine: MagicBlockEngine,
  worldPda: PublicKey,
  newanteentityPda: PublicKey,
  newmapentityPda: PublicKey,
  mint_of_token: PublicKey,
  tokenVault: PublicKey,
  decimals: number,
  owner_token_account: PublicKey,
) {
    const initAnteroom = await ApplySystem({
        authority: engine.getWalletPayer(),
        world: worldPda,
        entities: [
            {
                entity: newanteentityPda,
                components: [{ componentId: COMPONENT_ANTEROOM_ID }],
            },
            {
                entity: newmapentityPda,
                components: [{ componentId: COMPONENT_MAP_ID }],
            },
        ],
        systemId: SYSTEM_INIT_ANTEROOM_ID,
        args: {
            vault_token_account_string: tokenVault.toString(),
            token_string: mint_of_token.toString(),
            token_decimals: decimals,
            gamemaster_wallet_string: owner_token_account.toString(),
        },
    });

    
    return await engine.processWalletTransaction(
      "initanteroom:" + newanteentityPda,
      initAnteroom.transaction
    );
}
