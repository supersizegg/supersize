import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, Transaction } from "@solana/web3.js";
import { ApplySystem, createDelegateInstruction, createUndelegateInstruction, FindComponentPda } from "@magicblock-labs/bolt-sdk";
import * as anchor from "@coral-xyz/anchor";

import { MagicBlockEngine } from "../engine/MagicBlockEngine";
import {
    COMPONENT_PLAYER_ID,
    COMPONENT_MAP_ID,
    SYSTEM_SPAWN_PLAYER_ID,
    SYSTEM_BUY_IN_ID,
    COMPONENT_ANTEROOM_ID,
    getComponentAnteroomOnChain,
    SYSTEM_CASH_OUT_ID,
  } from "./gamePrograms";

  
import { ActiveGame, Blob } from "@utils/types";
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { getMemberPDA } from "buddy.link";
import { anteroomFetchOnChain, anteroomFetchOnEphem, playerFetchOnChain, playerFetchOnEphem } from "./gameFetch";
import { fetchTokenMetadata } from "@utils/helper";
import axios from "axios";

const referral_vault_program_id = new PublicKey("CLC46PuyXnSuZGmUrqkFbAh7WwzQm8aBPjSQ3HMP56kp");

export async function gameSystemCashOut(
  engine: MagicBlockEngine,
  gameInfo: ActiveGame,
  anteroomEntity: PublicKey,
  currentPlayerEntity: PublicKey,
  currentPlayer: Blob,
) {
    console.log('cashing out');
    const myplayerComponent = FindComponentPda({
        componentId: COMPONENT_PLAYER_ID,
        entity: currentPlayerEntity,
    });

    const undelegateIx = createUndelegateInstruction({
        payer: engine.getSessionPayer(),
        delegatedAccount: myplayerComponent,
        componentPda: COMPONENT_PLAYER_ID,
    });

    let undeltx = new anchor.web3.Transaction().add(undelegateIx);
    undeltx.recentBlockhash = (await engine.getConnectionEphem().getLatestBlockhash()).blockhash;
    undeltx.feePayer = engine.getSessionPayer();
    const playerundelsignature = await engine.processSessionEphemTransaction("undelPlayer:" + myplayerComponent.toString(), undeltx); 
    console.log('undelegate', playerundelsignature);

    const playerCashoutAddy = currentPlayer?.payoutTokenAccount ?? null;
    const playerCashout = currentPlayer?.score ?? 0;
    const playerBuyIn = currentPlayer?.buyIn ?? 0;
    const playerTax = currentPlayer?.tax ?? 0;
    const playerMass = currentPlayer?.mass ?? 0;
    //const myReferrer = currentPlayer?.referrerTokenAccount;
    
    const anteComponentPda = FindComponentPda({
        componentId: COMPONENT_ANTEROOM_ID,
        entity: anteroomEntity,
    });
    const anteAccount = await anteroomFetchOnChain(engine, anteComponentPda);

    console.log("anteAccount", anteAccount, playerMass == 0 && playerCashout > 0);
    if (anteAccount && playerMass == 0 && playerCashout > 0) {
        console.log("anteAccount", anteAccount);
        const vault_token_account = anteAccount.vaultTokenAccount;
        const mint_of_token_being_sent = anteAccount.token;
        const owner_token_account = anteAccount.gamemasterTokenAccount;
        if (!mint_of_token_being_sent || !owner_token_account || !vault_token_account) {
            return;
        }
        const supersize_token_account = await getAssociatedTokenAddress(
            mint_of_token_being_sent,
            new PublicKey("DdGB1EpmshJvCq48W1LvB1csrDnC4uataLnQbUVhp6XB")
        );

        const { name } = await fetchTokenMetadata(mint_of_token_being_sent.toString());

        try {
            await axios.post('https://supersize.lewisarnsten.workers.dev/update-wins', {
                walletAddress: engine.getWalletPayer().toString(),
                amount: (playerCashout * 0.98) - playerBuyIn,
                contestId: name
            });
        } catch (error) {
            console.log('error', error);
        }

        let usertokenAccountInfo = await getAssociatedTokenAddress(
            mint_of_token_being_sent,
            engine.getWalletPayer()
        );

            const extraAccounts = [
                {
                    pubkey: vault_token_account,
                    isWritable: true,
                    isSigner: false,
                },
                {
                    pubkey: usertokenAccountInfo,
                    isWritable: true,
                    isSigner: false,
                },
                {
                    pubkey: owner_token_account,
                    isWritable: true,
                    isSigner: false,
                },
                {
                    pubkey: supersize_token_account,
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

            const applyCashOutSystem = await ApplySystem({
                authority: engine.getWalletPayer(),
                world: gameInfo.worldPda,
                entities: [
                    {
                        entity: currentPlayerEntity,
                        components: [{ componentId: COMPONENT_PLAYER_ID }],
                    },
                    {
                        entity: anteroomEntity,
                        components: [{ componentId: COMPONENT_ANTEROOM_ID }],
                    },
                ],
                systemId: SYSTEM_CASH_OUT_ID,
                args: {
                    referred: false,
                },
                extraAccounts: extraAccounts,
            });

            const cashouttx = new anchor.web3.Transaction()
                .add(applyCashOutSystem.transaction);

            return await engine.processWalletTransaction("playerdelegate", cashouttx);
    }   
}