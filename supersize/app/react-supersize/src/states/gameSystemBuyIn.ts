import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, Transaction } from "@solana/web3.js";
import { ApplySystem, createDelegateInstruction, FindComponentPda } from "@magicblock-labs/bolt-sdk";

import { MagicBlockEngine } from "../engine/MagicBlockEngine";
import {
    COMPONENT_PLAYER_ID,
    SYSTEM_BUY_IN_ID,
    COMPONENT_ANTEROOM_ID,
  } from "./gamePrograms";

import { ActiveGame } from "@utils/types";
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { getMemberPDA } from "buddy.link";
import { anteroomFetchOnChain } from "./gameFetch";

export async function gameSystemBuyIn(
  engine: MagicBlockEngine,
  gameInfo: ActiveGame,
  newplayerEntityPda: PublicKey,
  anteEntityPda: PublicKey,
  myPlayerStatus: string,
  buyIn: number,
) {
    const playerComponentPda = FindComponentPda({
        componentId: COMPONENT_PLAYER_ID,
        entity: newplayerEntityPda,
    });

    const anteComponentPda = FindComponentPda({
        componentId: COMPONENT_ANTEROOM_ID,
        entity: anteEntityPda,
    });
  
    const anteParsedData = await anteroomFetchOnChain(engine, anteComponentPda);
  
    let vault_token_account = new PublicKey(0);
    let mint_of_token_being_sent = new PublicKey(0);
    let payout_token_account = new PublicKey(0);
    const referral_vault_program_id = new PublicKey("CLC46PuyXnSuZGmUrqkFbAh7WwzQm8aBPjSQ3HMP56kp");
    const combinedTx = new Transaction();
    console.log('anteParsedData', anteParsedData);
    if (anteParsedData && anteParsedData.vaultTokenAccount && anteParsedData.token) {
        vault_token_account = anteParsedData.vaultTokenAccount;
        mint_of_token_being_sent = anteParsedData.token;
        const usertokenAccountInfo = await getAssociatedTokenAddress(
            mint_of_token_being_sent,
            engine.getWalletPayer(),
        );
        payout_token_account = usertokenAccountInfo;
    }

    if (myPlayerStatus !== "rejoin_undelegated" && myPlayerStatus !== "resume_session" && myPlayerStatus !== "rejoin_session") {

        const [referralTokenAccountOwnerPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("token_account_owner_pda"), mint_of_token_being_sent.toBuffer()],
            referral_vault_program_id
        );
        const referraltokenVault = await getAssociatedTokenAddress(
            mint_of_token_being_sent, 
            referralTokenAccountOwnerPda, 
            true
        );
  
        const BUDDY_LINK_PROGRAM_ID = new PublicKey("BUDDYtQp7Di1xfojiCSVDksiYLQx511DPdj2nbtG9Yu5");
  
        const memberName = "notmembersalt";
        const buddyMemberPdaAccount = getMemberPDA(BUDDY_LINK_PROGRAM_ID, "supersize", memberName);
  
        const [refferalPdaAccount] = PublicKey.findProgramAddressSync(
            [Buffer.from("subsidize"), buddyMemberPdaAccount.toBuffer(), mint_of_token_being_sent.toBuffer()],
            referral_vault_program_id
        );
        console.log('vault_token_account', vault_token_account.toString());
        const extraAccounts = [
            {
                pubkey: vault_token_account,
                isWritable: true,
                isSigner: false,
            },
            {
                pubkey: engine.getSessionPayer(),
                isWritable: true,
                isSigner: false,
            },
            {
                pubkey: payout_token_account,
                isWritable: true,
                isSigner: false,
            },
            {
                pubkey: referraltokenVault,
                isWritable: true,
                isSigner: false,
            },
            {
                pubkey: referralTokenAccountOwnerPda,
                isWritable: true,
                isSigner: false,
            },
            {
                pubkey: refferalPdaAccount,
                isWritable: true,
                isSigner: false,
            },
            {
                pubkey: buddyMemberPdaAccount,
                isWritable: true,
                isSigner: false,
            },
            {
                pubkey: engine.getWalletPayer(),
                isWritable: true,
                isSigner: false,
            },
            {
                pubkey: SystemProgram.programId,
                isWritable: false,
                isSigner: false,
            },
            {
                pubkey: TOKEN_PROGRAM_ID,
                isWritable: false,
                isSigner: false,
            },
            {
                pubkey: SYSVAR_RENT_PUBKEY,
                isWritable: false,
                isSigner: false,
            },
        ];

        const applyBuyInSystem = await ApplySystem({
            authority: engine.getWalletPayer(),
            world: gameInfo.worldPda,
            entities: [
                {
                    entity: newplayerEntityPda,
                    components: [{ componentId: COMPONENT_PLAYER_ID }],
                },
                {
                    entity: anteEntityPda,
                    components: [{ componentId: COMPONENT_ANTEROOM_ID }],
                },
            ],
            systemId: SYSTEM_BUY_IN_ID,
            args: {
                buyin: buyIn,
                member_name: memberName,
            },
            extraAccounts: extraAccounts,
        });
        combinedTx.add(applyBuyInSystem.transaction);
    }
    if (myPlayerStatus !== "resume_session") {
        try {
            const playerdelegateIx = createDelegateInstruction({
                entity: newplayerEntityPda,
                account: playerComponentPda,
                ownerProgram: COMPONENT_PLAYER_ID,
                payer: engine.getWalletPayer(),
            });
            combinedTx.add(playerdelegateIx);
            const playerdelsignature = await engine.processWalletTransaction("playerdelegate", combinedTx);
            console.log(`buy in signature: ${playerdelsignature}`);
        } catch (error) {
            console.log('Error buying in:', error);
            //setTransactionError("Buy in failed, please retry");
            //setIsSubmitting(false);
            //setIsJoining(false);
            return;
        }
    }
}