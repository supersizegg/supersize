import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { ApplySystem, createUndelegateInstruction, FindComponentPda, FindEntityPda } from "@magicblock-labs/bolt-sdk";
import * as anchor from "@coral-xyz/anchor";

import { MagicBlockEngine } from "../engine/MagicBlockEngine";
import {
    COMPONENT_PLAYER_ID,
    COMPONENT_ANTEROOM_ID,
    SYSTEM_CASH_OUT_ID,
    COMPONENT_MAP_ID,
  } from "./gamePrograms";

  
import { ActiveGame, Blob } from "@utils/types";
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { anteroomFetchOnChain } from "./gameFetch";
import { fetchTokenMetadata } from "@utils/helper";
import axios from "axios";

export async function gameSystemCashOut(
  engine: MagicBlockEngine,
  gameInfo: ActiveGame,
  anteroomEntity: PublicKey,
  currentPlayerEntity: PublicKey,
) {
    const mapseed = "origin"; 
    const mapEntityPda = FindEntityPda({
        worldId: gameInfo.worldId,
        entityId: new anchor.BN(0),
        seed: Buffer.from(mapseed)
    })

    const mapComponentPda = FindComponentPda({
        componentId: COMPONENT_MAP_ID,
        entity: mapEntityPda,
    });
    
    const myplayerComponent = FindComponentPda({
        componentId: COMPONENT_PLAYER_ID,
        entity: currentPlayerEntity,
    });

    const undelegateIx = createUndelegateInstruction({
        payer: engine.getSessionPayer(),
        delegatedAccount: myplayerComponent,
        componentPda: COMPONENT_PLAYER_ID,
    });

    try{ 
        const undeltx = new anchor.web3.Transaction().add(undelegateIx);
        undeltx.recentBlockhash = (await engine.getConnectionEphem().getLatestBlockhash()).blockhash;
        undeltx.feePayer = engine.getSessionPayer();
        //undeltx.sign(engine.getSessionKey());
        //const playerundelsignature = await engine.getProviderEphemeralRollup().sendAndConfirm(undeltx, [], { skipPreflight: false });
        const playerundelsignature = await engine.processSessionEphemTransaction("undelPlayer:" + myplayerComponent.toString(), undeltx); 
        console.log('undelegate', playerundelsignature);
    }catch(error){
        console.log('error', error);
    }

    //const myReferrer = currentPlayer?.referrerTokenAccount;
    
    const anteComponentPda = FindComponentPda({
        componentId: COMPONENT_ANTEROOM_ID,
        entity: anteroomEntity,
    });
    const anteAccount = await anteroomFetchOnChain(engine, anteComponentPda);

    console.log('cashing out', anteComponentPda.toString(), myplayerComponent.toString());

    console.log("anteAccount", anteAccount);
    if (anteAccount) {
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

        /*
        try {
            await axios.post('https://supersize.lewisarnsten.workers.dev/update-wins', {
                walletAddress: engine.getWalletPayer().toString(),
                amount: (playerCashout * 0.98) - playerBuyIn,
                contestId: name
            });
        } catch (error) {
            console.log('error', error);
        } */

        const usertokenAccountInfo = await getAssociatedTokenAddress(
            mint_of_token_being_sent,
            engine.getWalletPayer()
        );

        let vault_program_id = new PublicKey("BAP315i1xoAXqbJcTT1LrUS45N3tAQnNnPuNQkCcvbAr");

        let [tokenAccountOwnerPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("token_account_owner_pda"), mapComponentPda.toBuffer()],
            vault_program_id
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
                    pubkey: tokenAccountOwnerPda,
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

            let cashoutsig = await engine.processWalletTransaction("playercashout", cashouttx);
            console.log('cashoutsig', cashoutsig);
            if (cashoutsig){
                /*const retrievedMyPlayers = localStorage.getItem('myplayers');
                if (retrievedMyPlayers){
                    let myplayers = JSON.parse(retrievedMyPlayers).filter((player: any) => player.worldId !== gameInfo.worldId.toNumber().toString());
                    localStorage.setItem('myplayers', JSON.stringify(myplayers));
                }*/
                return cashoutsig;
            }
            else{
                return null;
            }
    }   
}