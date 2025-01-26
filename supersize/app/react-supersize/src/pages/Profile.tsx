import React, { useEffect, useRef, useState } from "react";
import { MenuSession } from "@components/menu/MenuSession";
import FooterLink from "@components/Footer";
import "./Profile.scss";
import { getMemberPDA, useBuddyLink } from "buddy.link";
import { useWallet } from "@solana/wallet-adapter-react";
import Invite from "../components/buddyInvite";
import CopyLink from "../components/buddyReferral";
import TweetLink from "../components/buddyTweet";
import { anchor, ApplySystem, createUndelegateInstruction, FindComponentPda, FindWorldPda } from "@magicblock-labs/bolt-sdk";
import { ActiveGame } from "@utils/types";
import { FindEntityPda } from "@magicblock-labs/bolt-sdk";
import { COMPONENT_ANTEROOM_ID, COMPONENT_MAP_ID, COMPONENT_PLAYER_ID, COMPONENT_SECTION_ID, SYSTEM_CASH_OUT_ID } from "@states/gamePrograms";
import { anteroomFetchOnChain, mapFetchOnChain, mapFetchOnEphem, playerFetchOnChain, playerFetchOnEphem, sectionFetchOnChain, sectionFetchOnEphem } from "@states/gameFetch";
import { useMagicBlockEngine } from "@engine/MagicBlockEngineProvider";
import { fetchTokenMetadata, pingEndpoint, stringToUint8Array } from "@utils/helper";
import { AccountMeta, Connection, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { PublicKey } from "@solana/web3.js";
import { getAccount, getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { endpoints, MAINNET_CONNECTION } from "@utils/constants";
import { Spinner } from "@components/util/Spinner";
import Graph from "../components/Graph";
import { Chart, LineElement, PointElement, LinearScale, Title, Tooltip, Legend } from 'chart.js';
import { ParsedInstruction, ParsedTransactionWithMeta } from "@solana/web3.js";
import { getTopLeftCorner } from "@utils/helper";
import { createTransferInstruction } from "@solana/spl-token";
// Register the components
Chart.register(LineElement, PointElement, LinearScale, Title, Tooltip, Legend);

export default function Profile() {
  const [activeTab, setActiveTab] = useState<"general" | "quests" | "admin">("general");

  return (
    <div className="profile-page">
      <div className="profile-container">
        <div className="profile-tabs">
          <button className={activeTab === "general" ? "active" : ""} onClick={() => setActiveTab("general")}>
            General
          </button>
          <button className={activeTab === "quests" ? "active" : ""} onClick={() => setActiveTab("quests")}>
            Quests
          </button>
          <button className={activeTab === "admin" ? "active" : ""} onClick={() => setActiveTab("admin")}>
            Admin panel
          </button>
        </div>

        <div className="profile-content">
          {activeTab === "general" && <GeneralTab />}
          {activeTab === "quests" && <QuestsTab />}
          {activeTab === "admin" && <AdminTab />}
        </div>
      </div>

      <FooterLink />
    </div>
  );
}

function GeneralTab() {

  const { publicKey } = useWallet();
  const [username, setUsername] = useState<string>("");
  const [referrerInput, setReferrerInput] = useState<string>("");
  const myReferrer = useRef<string>("");
  const { referrer, member, profile } = useBuddyLink();
  const [joinedOrg, setJoinedOrg] = useState<boolean>(false);

  const setInputUsername = (inputUsername: any) => {  
      const user = { name: inputUsername, referrer: referrer, referral_done: false};
      localStorage.setItem('user', JSON.stringify(user));
      setUsername(inputUsername);
  };

  useEffect(() => {
      const retrievedUser = localStorage.getItem('user');
      if(retrievedUser){
          let myusername = JSON.parse(retrievedUser).name;
          console.log('myusername', myusername);
          setUsername(myusername);
      }
  }, []);

  useEffect(() => {
      if (publicKey) {
          const retrievedUser = localStorage.getItem('user');
          const retrievedRefferal = localStorage.getItem('referrer');
          //console.log('retrieved', member[0], retrievedRefferal, retrievedUser);
          if(member){
              if(member[0]){
                  const retrievedUser = localStorage.getItem('user');
                  let user = { name: member[0].account.name, referrer: referrer, referral_done: true};
                  if(retrievedUser){
                      let myusername = JSON.parse(retrievedUser).name;
                      user = { name: myusername, referrer: referrer, referral_done: true};
                      setUsername(myusername);
                  }
                  else{ 
                      user = { name: member[0].account.name, referrer: referrer, referral_done: true};
                      setUsername(member[0].account.name);
                  }
                  setReferrerInput(member[0].account.name);
                  localStorage.setItem('user', JSON.stringify(user));
                  setJoinedOrg(true);
              }
              else{ 
                  if(!retrievedUser || retrievedRefferal !== null){
                    if (retrievedUser && JSON.parse(retrievedUser).name !== null && JSON.parse(retrievedUser).name !== ""){
                      const user = { name: JSON.parse(retrievedUser).name, referrer: referrer, referral_done: false};
                      localStorage.setItem('user', JSON.stringify(user));
                    }else{
                      const user = { name: publicKey.toString().slice(0,12), referrer: referrer, referral_done: false};
                      localStorage.setItem('user', JSON.stringify(user));
                    }
                    setJoinedOrg(false);
                  }
              }
          }
          else{ 
              if(!retrievedUser || retrievedRefferal !== null){
                if (retrievedUser && JSON.parse(retrievedUser).name !== null && JSON.parse(retrievedUser).name !== ""){
                  const user = { name: JSON.parse(retrievedUser).name, referrer: referrer, referral_done: false};
                  localStorage.setItem('user', JSON.stringify(user));
                }else{
                  const user = { name: publicKey.toString().slice(0,12), referrer: referrer, referral_done: false};
                  localStorage.setItem('user', JSON.stringify(user));
                }
                  setJoinedOrg(false);
              }
          }
      }
  }, [member]);

  return (
    <div className="general-tab">
      <MenuSession />

      <hr className="divider" />

      <div className="row-inline">
        <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
        <button className="btn-save" onClick={() => setInputUsername(username)}>Save</button>
      </div>

      <div className="row-inline referral-row">
        <label>Referral code</label>
        <input type="text" readOnly value={joinedOrg ? referrerInput : referrer} />
        { joinedOrg ? ( <><button className="btn-copy"><CopyLink handleCreateClick={() => {}}/> </button> 
        <TweetLink/> </>)
        : 
          <button className="btn-create-referral"><Invite /></button>
        }
      </div>

    </div>
  );
}

function QuestsTab() {
  const { member } = useBuddyLink();
  const engine = useMagicBlockEngine();
  const [joinedOrg, setJoinedOrg] = useState<boolean>(false);
  const BUDDY_LINK_PROGRAM_ID = new PublicKey("BUDDYtQp7Di1xfojiCSVDksiYLQx511DPdj2nbtG9Yu5");
  let referral_vault_program_id = new PublicKey("CLC46PuyXnSuZGmUrqkFbAh7WwzQm8aBPjSQ3HMP56kp");
  const mainnet_connection = new Connection(MAINNET_CONNECTION);

  useEffect(() => {
    const checkMembership = async () => {
      if (member) {
        if (member[0]) {
          const memberName = member[0].account.name;
          const buddyMemberPdaAccount = getMemberPDA(BUDDY_LINK_PROGRAM_ID, "supersize", member[0].account.name);
          let [refferalPdaAccount] = PublicKey.findProgramAddressSync(
            [Buffer.from("subsidize"), buddyMemberPdaAccount.toBuffer(), new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v").toBuffer()],
            referral_vault_program_id
          );
          console.log('refferalPdaAccount', refferalPdaAccount.toString());
          const accountInfo = await mainnet_connection.getAccountInfo(refferalPdaAccount);
          console.log('accountInfo', accountInfo);
          if (accountInfo && accountInfo.lamports > 0) {
            setJoinedOrg(true);
          }
        } else {
          setJoinedOrg(false);
        }
      } else {
        setJoinedOrg(false);
      }
    };

    checkMembership();
  }, [member]);

  return (
    <div className="quests-tab">
      <div className="quest-item">
        <span>Join referral program + play free USDC game</span>
        <button>{joinedOrg ? "Complete" : "TODO"}</button>
      </div>
    </div>
  );
}

function AdminTab() {
  const engine = useMagicBlockEngine();
  const isLoading = useRef(false);
  const [myGames, setMyGames] = useState<ActiveGame[]>([]);
  const [openPanelIndex, setOpenPanelIndex] = useState<number | null>(null);
  const [gameOwner, setGameOwner] = useState<string>("");
  const [gameWallet, setGameWallet] = useState<string>("");
  const [tokenBalance, setTokenBalance] = useState<number>(0);
  const [gameTokenAccount, setGameTokenAccount] = useState<string>("");
  const [currentFoodToAdd, setCurrentFoodToAdd] = useState<number>(0);
  const [inspectAnteParsedData, setAnteParsedData] = useState<any>(null);
  const [inspectMapParsedData, setMapParsedData] = useState<any>(null);
  const [foodComponentCheck, setFoodComponentCheck] = useState<string>("");
  const [playerComponentCheck, setPlayerComponentCheck] = useState<string>("");
  const [tokenAddress, setTokenAddress] = useState<string>("");
  const [referralProgramAccount, setReferralProgramAccount] = useState<string>("");
  const [depositValue, setDepositValue] = useState<number>(0);
  const [decimals, setDecimals] = useState<number>(0);
  const [cashoutStats, setCashoutStats] = useState<any>({
    cashOutSum: 0,
    buyInSum: 0,
    buyInCount: 0,
  });

  function getRegion(endpoint: string): string {
    if (endpoint === "https://supersize-fra.magicblock.app") return "europe";
    if (endpoint === "https://supersize.magicblock.app") return "america";
    if (endpoint === "https://supersize-sin.magicblock.app") return "asia";
    return "unknown";
  }

  useEffect(() => {
    const fetchGames = async () => {
      if (isLoading.current) return;
      isLoading.current = true;
      console.log('fetching games');
      for (let i = 1780; i < 1900; i++) {
        const worldId = { worldId: new anchor.BN(i) };
        const worldPda = await FindWorldPda(worldId);

        for (const endpoint of endpoints) {
          engine.setEndpointEphemRpc(endpoint);
          try {
            const mapEntityPda = FindEntityPda({
              worldId: worldId.worldId,
              entityId: new anchor.BN(0),
              seed: stringToUint8Array("origin"),
            });

            const mapComponentPda = FindComponentPda({
              componentId: COMPONENT_MAP_ID,
              entity: mapEntityPda,
            });

            const mapParsedData = await mapFetchOnEphem(engine, mapComponentPda);
            const readableMapParsedData = `
            Name: ${mapParsedData?.name} |
            Authority: ${mapParsedData?.authority?.toString()} |
            Width: ${mapParsedData?.width} |
            Height: ${mapParsedData?.height} |
            Base Buyin: ${mapParsedData?.baseBuyin} |
            Min Buyin: ${mapParsedData?.minBuyin} |
            Max Buyin: ${mapParsedData?.maxBuyin} |
            Max Players: ${mapParsedData?.maxPlayers} |
            Total Active Buyins: ${mapParsedData?.totalActiveBuyins} |
            Total Food on Map: ${mapParsedData?.totalFoodOnMap} |
            Food Queue: ${mapParsedData?.foodQueue} |
            Next Food: ${mapParsedData?.nextFood} |
            Frozen: ${mapParsedData?.frozen}
           `;
            setMapParsedData(readableMapParsedData);

            if (mapParsedData && mapParsedData.authority) {
                if (mapParsedData.authority.toString() === engine.getSessionPayer().toString()) {
                    const newGameInfo : ActiveGame = {worldId: worldId.worldId, worldPda: worldPda, name: "loading", active_players: 0, max_players: 0, size: 0, image:"", token:"", 
                      base_buyin: 0, min_buyin: 0, max_buyin: 0, endpoint: "", ping: 0, isLoaded: false}
                    newGameInfo.endpoint = endpoint;
                    newGameInfo.name = mapParsedData.name;
                    newGameInfo.max_players = mapParsedData.maxPlayers;
                    newGameInfo.size = mapParsedData.width;
                    newGameInfo.base_buyin = mapParsedData.baseBuyin;
                    newGameInfo.min_buyin = mapParsedData.minBuyin;
                    newGameInfo.max_buyin = mapParsedData.maxBuyin;
                    newGameInfo.isLoaded = true;
                    const pingTime = await pingEndpoint(endpoint);
                    newGameInfo.ping = pingTime;
                  newGameInfo.isLoaded = true;

                  setMyGames(prevMyGames => {
                    const gameExists = prevMyGames.some(game => game.worldId === newGameInfo.worldId);
                    if (gameExists) {
                      return prevMyGames;
                    }
                    return [newGameInfo, ...prevMyGames];
                  });
           }
          }
        }catch(error){
          console.log('error', error)
        }
      }
    }
    }
    fetchGames();
  }, []);
  
  const handlePanelOpen = async (newGameInfo: ActiveGame) => {
    setTokenBalance(0);
    setCurrentFoodToAdd(0);
    setFoodComponentCheck("");
    setPlayerComponentCheck("");
    setGameOwner("");
    setGameWallet("");
    setGameTokenAccount("");
    setReferralProgramAccount("");
    setCashoutStats({
      cashOutSum: 0,
      buyInSum: 0,
      buyInCount: 0,
    });

    const anteseed = "ante";
    const anteEntityPda = FindEntityPda({
        worldId: newGameInfo.worldId,
        entityId: new anchor.BN(0),
        seed: stringToUint8Array(anteseed),
    });
    const anteComponentPda = FindComponentPda({
        componentId: COMPONENT_ANTEROOM_ID,
        entity: anteEntityPda,
    });

    const account = anteComponentPda.toString();                
    const { cashOutSum, buyInSum, buyInCount } = await calculateTokenBalances(account);
    setCashoutStats({
      cashOutSum: cashOutSum,
      buyInSum: buyInSum,
      buyInCount: buyInCount,
    });

    const anteParsedData = await anteroomFetchOnChain(engine, anteComponentPda);
    const readableAnteParsedData = `
        Map: ${anteParsedData?.map?.toString()} |
        Base Buyin: ${anteParsedData?.baseBuyin} |
        Min Buyin: ${anteParsedData?.minBuyin} |
        Max Buyin: ${anteParsedData?.maxBuyin} |
        Token: ${anteParsedData?.token?.toString()} |
        Token Decimals: ${anteParsedData?.tokenDecimals} |
        Vault Token Account: ${anteParsedData?.vaultTokenAccount?.toString()} |
        Gamemaster Token Account: ${anteParsedData?.gamemasterTokenAccount?.toString()}
    `;
    setAnteParsedData(readableAnteParsedData);
    if(anteParsedData?.tokenDecimals){
      setDecimals(anteParsedData.tokenDecimals);
    }
    if(anteParsedData?.token){
      setTokenAddress(anteParsedData.token.toString());
    }
    let mint_of_token_being_sent = new PublicKey(0);
    
    if (anteParsedData && anteParsedData.token) {
      mint_of_token_being_sent = anteParsedData.token;
      if(!anteParsedData.gamemasterTokenAccount){
        return;
      } 
      if(!anteParsedData.tokenDecimals){
        return;
      } 

      setGameOwner(anteParsedData.gamemasterTokenAccount.toString());

      const mapEntityPda = FindEntityPda({
        worldId: newGameInfo.worldId,
        entityId: new anchor.BN(0),
        seed: stringToUint8Array("origin")
      })

      const mapComponentPda = FindComponentPda({
          componentId: COMPONENT_MAP_ID,
          entity: mapEntityPda,
      });

      const [tokenAccountOwnerPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("token_account_owner_pda"), mapComponentPda.toBuffer()],
        new PublicKey("BAP315i1xoAXqbJcTT1LrUS45N3tAQnNnPuNQkCcvbAr"),
      );
    
      const tokenVault = await getAssociatedTokenAddress(mint_of_token_being_sent, tokenAccountOwnerPda, true);

      setGameWallet(tokenAccountOwnerPda.toString());
      setGameTokenAccount(tokenVault.toString());

      try {
        const tokenAccount = await getAccount(engine.getConnectionChain(), new PublicKey(tokenVault.toString()));
        console.log('Balance:', tokenAccount.amount.toString());
        const readableBalance = Number(tokenAccount.amount) / (10 ** anteParsedData.tokenDecimals);
        setTokenBalance(readableBalance);
      } catch (error) {
        console.error('Error fetching token account balance:', error);
      }
    
      let referral_vault_program_id = new PublicKey("CLC46PuyXnSuZGmUrqkFbAh7WwzQm8aBPjSQ3HMP56kp");
      let [referralTokenAccountOwnerPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("token_account_owner_pda"), mint_of_token_being_sent.toBuffer()],
        referral_vault_program_id
        );
      //const referraltokenVault = await getAssociatedTokenAddress(mint_of_token_being_sent, referralTokenAccountOwnerPda, true);
      setReferralProgramAccount(referralTokenAccountOwnerPda.toString());
        
      if (
          mint_of_token_being_sent.toString() ===
          "7dnMwS2yE6NE1PX81B9Xpm7zUhFXmQABqUiHHzWXiEBn"
      ) {
          newGameInfo.image = `${process.env.PUBLIC_URL}/agld.jpg`;
          newGameInfo.token = "AGLD";
      } else {
          try {
              const { name, image } = await fetchTokenMetadata(
                  mint_of_token_being_sent.toString(),
              );
              newGameInfo.image = image;
              newGameInfo.token = name;
          } catch (error) {
              console.error("Error fetching token data:", error);
          }
      }
      setMyGames(prevMyGames => {
        const gameExists = prevMyGames.some(game => game.worldId === newGameInfo.worldId);
        if (gameExists) {
          return prevMyGames;
        }
        return [newGameInfo, ...prevMyGames];
      });
  }

    let foodcomponents = 32;

    const map_size = newGameInfo.size;

    if (map_size === 4000) {
      foodcomponents = 16 * 2;
    } else if (map_size === 6000) {
      foodcomponents = 36 * 2;
    } else if (map_size === 8000) {
      foodcomponents = 64 * 2;
    }

    const foodEntityPdas: PublicKey[] = [];
    let sectionMessage = "";
    for (let i = 1; i < foodcomponents + 1; i++) {
      const foodseed = 'food' + i.toString();
      const foodEntityPda = FindEntityPda({
        worldId: newGameInfo.worldId,
        entityId: new anchor.BN(0),
        seed: stringToUint8Array(foodseed)
      });
      const foodComponentPda = FindComponentPda({
        componentId: COMPONENT_SECTION_ID,
        entity: foodEntityPda,
      });
      const foodParsedData = await sectionFetchOnChain(engine, foodComponentPda);
      const index = i;
      const { x, y } = getTopLeftCorner(i - 1, newGameInfo.size);
      //console.log('foodParsedData', foodParsedData, x, y)
      if (foodParsedData && (foodParsedData.topLeftX !== x || foodParsedData.topLeftY !== y)) {
        console.error(`Food section ${index} has incorrect top left coordinates: (${foodParsedData.topLeftX}, ${foodParsedData.topLeftY})`);
        sectionMessage = "section incorrect";
      } else if (!foodParsedData) {
        sectionMessage = "section not found";
      }
    }
    if (sectionMessage === "") {
      sectionMessage = "success";
    }
    console.log('sectionMessage', sectionMessage)
    setFoodComponentCheck(sectionMessage);

    const checkPlayers = await handleCleanupClick(newGameInfo, false);
    console.log('checkPlayers', checkPlayers)
    if (checkPlayers !== undefined) {
      setPlayerComponentCheck(checkPlayers);
    }
  };

  const handleCleanupClick = async (selectGameId: ActiveGame, isActive: boolean): Promise<void | string> => {
    const gameInfo = selectGameId; 
    let maxplayer=20;

    const mapEntityPda = FindEntityPda({
        worldId: gameInfo.worldId,
        entityId: new anchor.BN(0),
        seed: stringToUint8Array("origin")
    })

    const mapComponentPda = FindComponentPda({
        componentId: COMPONENT_MAP_ID,
        entity: mapEntityPda,
    });
    let map_size = 4000;
    const mapParsedData = await mapFetchOnEphem(engine, mapComponentPda);
    if(mapParsedData){
      console.log('map size', mapParsedData.width)
      map_size = mapParsedData.width;
    }

    if(map_size==4000){
        maxplayer=20;
    }
    else if(map_size==6000){
        maxplayer=40;
    }
    else if(map_size==10000){
        maxplayer=100;
    }

    let newplayerEntityPda : any = null;
    let myPlayerId = '';
    let myPlayerStatus = 'new_player';
    let need_to_undelegate = false;
    for (let i = 1; i < maxplayer+1; i++) {
        const playerentityseed = 'player' + i.toString();
        const playerEntityPda =  FindEntityPda({
            worldId: gameInfo.worldId,
            entityId: new anchor.BN(0),
            seed: stringToUint8Array(playerentityseed)
        })
        const playersComponentPda = FindComponentPda({
            componentId: COMPONENT_PLAYER_ID,
            entity: playerEntityPda,
        });
        const playersacc = await engine.getChainAccountInfo(
          playersComponentPda
      );
      const playersaccER = await engine.getEphemAccountInfo(
          playersComponentPda
      );
        if(playersacc){
          const playersParsedData = await playerFetchOnChain(engine, playersComponentPda);
        if(playersParsedData && playersParsedData.authority !== null){
        if(
          playersParsedData.mass.toNumber() == 0 &&
          playersParsedData.score != 0 && 
            isActive
        ){
        const undelegateIx = createUndelegateInstruction({
            payer: engine.getSessionPayer(),
            delegatedAccount: playersComponentPda,
            componentPda: COMPONENT_PLAYER_ID,
            });
        const tx = new anchor.web3.Transaction()
        .add(undelegateIx);
        tx.recentBlockhash = (await engine.getConnectionEphem().getLatestBlockhash()).blockhash;
        tx.feePayer = engine.getSessionPayer();
        try {
          const playerundelsignature = await engine.processSessionEphemTransaction("undelPlayer:" + playersComponentPda.toString(), tx);
          console.log('undelegate', playerundelsignature)
        } catch (error) {
            console.log('Error undelegating:', error);
        }

        const anteseed = "ante"; 
        const anteEntityPda = FindEntityPda({
            worldId: gameInfo.worldId,
            entityId: new anchor.BN(0),
            seed: stringToUint8Array(anteseed)
        })
        const anteComponentPda = FindComponentPda({
            componentId: COMPONENT_ANTEROOM_ID,
            entity: anteEntityPda,
        });
        const anteParsedData = await anteroomFetchOnChain(engine, anteComponentPda);

        let sender_token_account = new PublicKey(0);
        let supersize_token_account = new PublicKey(0);
        let vault_program_id = new PublicKey("BAP315i1xoAXqbJcTT1LrUS45N3tAQnNnPuNQkCcvbAr");

        if(anteParsedData){
            let vault_token_account = anteParsedData.vaultTokenAccount;
            let mint_of_token_being_sent = anteParsedData.token;
            let owner_token_account = anteParsedData.gamemasterTokenAccount;
            if (!mint_of_token_being_sent) {
              return;
            }
            //supersize_token_account = anteParsedData.gamemasterTokenAccount;
            supersize_token_account = await getAssociatedTokenAddress(mint_of_token_being_sent, new PublicKey("DdGB1EpmshJvCq48W1LvB1csrDnC4uataLnQbUVhp6XB"));
            let sender_token_account = playersParsedData.payoutTokenAccount;
            let [tokenAccountOwnerPda] = PublicKey.findProgramAddressSync(
                [Buffer.from("token_account_owner_pda"), mapComponentPda.toBuffer()],
                vault_program_id
                );
            let referrer_token_account = null;
            
            const extraAccounts = [
              {
                  pubkey: vault_token_account,
                  isWritable: true,
                  isSigner: false,
              },
              {
                  pubkey: sender_token_account,
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
                world:  gameInfo.worldPda,
                entities: [
                {
                    entity: playerEntityPda,
                    components: [{ componentId:COMPONENT_PLAYER_ID}],
                },
                {
                    entity: anteEntityPda,
                    components: [{ componentId:COMPONENT_ANTEROOM_ID }],
                },
                ], 
                systemId: SYSTEM_CASH_OUT_ID,
                args: {
                    referred: false,
                },
                extraAccounts: extraAccounts as AccountMeta[],
            });
            const cashouttx = new anchor.web3.Transaction().add(applyCashOutSystem.transaction); 
            const cashoutsignature = await engine.processWalletTransaction("playercashout", cashouttx);

            console.log('cashout', cashoutsignature);
        }
    }else if(
        playersParsedData.mass.toNumber() == 0 &&
        playersParsedData.score != 0 && 
        !isActive
    ){
      return "clogged";
    }
    }
    }}

    return "clean";
  };

  async function calculateTokenBalances(
    account: string,
) {
    const accountPubkey = new PublicKey(account);

    const signatures = await engine.getConnectionChain().getSignaturesForAddress(accountPubkey, { limit: 1000 });

    let cashOutSum = 0;
    let buyInSum = 0;
    let buyInCount = 0;

    for (const signatureInfo of signatures) {
        const transactionDetails = await engine.getConnectionChain().getTransaction(signatureInfo.signature, {
            commitment: "confirmed",
        });

        if (transactionDetails) {
            const { meta, transaction } = transactionDetails;
            if (meta && meta.preTokenBalances && meta.postTokenBalances) {
              //if supersize wallet receives tokens its a cash out -> amount recieved by supersize goes to fee (unless only supersize, then no fee)
              //otherwise its a buy in -> add amount sent to buy in sum, increment buy in count
                const tokenPreAccountIndex = meta.preTokenBalances.findIndex(
                    (token) => token.owner === "DdGB1EpmshJvCq48W1LvB1csrDnC4uataLnQbUVhp6XB"
                );
                const tokenPostAccountIndex = meta.postTokenBalances.findIndex(
                  (token) => token.owner === "DdGB1EpmshJvCq48W1LvB1csrDnC4uataLnQbUVhp6XB"
                );
                if (tokenPreAccountIndex !== -1 && tokenPostAccountIndex !== -1) {
                    const preBalance = meta.preTokenBalances[tokenPreAccountIndex]?.uiTokenAmount.uiAmount || 0;
                    const postBalance = meta.postTokenBalances[tokenPostAccountIndex]?.uiTokenAmount.uiAmount || 0;
                    const balanceChange = postBalance - preBalance;
                    if(balanceChange > 0){
                      if(meta.preTokenBalances.length > 2){
                        cashOutSum += balanceChange;
                      }
                    }
                }else{
                    const preBalance = meta.preTokenBalances[0]?.uiTokenAmount.uiAmount || 0;
                    const postBalance = meta.postTokenBalances[0]?.uiTokenAmount.uiAmount || 0;
                    const balanceChange = postBalance - preBalance;
                    buyInSum += Math.abs(balanceChange);
                    buyInCount++;
                  
                }
                
            }
        }
    }

    return { cashOutSum, buyInSum, buyInCount };
}

  const deposit = async (amount: number, gameWallet: PublicKey, mint_of_token_being_sent: PublicKey, decimals: number) => {
    if (amount <= 0) {
      console.error("Deposit amount must be greater than zero.");
      return;
    }
    try {
      const transaction = new anchor.web3.Transaction();
      let usertokenAccountInfo = await getAssociatedTokenAddress(
        new PublicKey(mint_of_token_being_sent),        
        engine.getWalletPayer()       
      ); 
      const transferIx = createTransferInstruction(
          usertokenAccountInfo,
          gameWallet,
          engine.getWalletPayer(),
          amount * 10 ** decimals,
          [],
          TOKEN_PROGRAM_ID,
      );
      transaction.add(transferIx)
      const desposittx = await engine.processWalletTransaction("deposit", transaction);
      console.log("Deposit successful, transaction signature:", desposittx);
    } catch (error) {
      console.error("Error during deposit:", error);
    }
  };
  return (
    <div className="admin-tab">
      <div className="game-stack" style={{ overflowY: 'scroll', maxHeight: '700px', width: '600px' }}>
        {myGames.map((row, idx) => (
          <CollapsiblePanel
            key={idx}
            title={row.isLoaded ? row.name + " " + `(${row.worldId.toString()})` : <Spinner />}
            onOpen={() => {setOpenPanelIndex(idx); handlePanelOpen(row)}}
            defaultOpen={openPanelIndex === idx}
          >
            <div className="game-details" style={{ display: 'flex', flexWrap: 'wrap' }}>
              <p style={{ flex: '1 1 30%' }}>Game Id: {row.worldId.toString()}</p>
              <p style={{ flex: '1 1 30%' }}>Server: {getRegion(myGames[idx].endpoint)}</p>
              <p style={{ flex: '1 1 30%' }}>Max Players: {row.max_players}</p>
              <p style={{ flex: '1 1 30%' }}>Size: {row.size}</p>
              <p style={{ flex: '1 1 70%' }}>Token: {row.token.slice(0, 11)}</p>
              <p style={{ flex: '1 1 20%' }}>Base Buyin: {row.base_buyin}</p>
              <p style={{ flex: '1 1 20%' }}>Min Buyin: {row.min_buyin}</p>
              <p style={{ flex: '1 1 20%' }}>Max Buyin: {row.max_buyin}</p>
              <p style={{ flex: '1 1 100%', marginTop: '10px' }}>Owner: {gameOwner}</p>
              <p style={{ flex: '1 1 100%' }}>Game Wallet: {gameWallet}</p>
              <p style={{ flex: '1 1 100%' }}>Token Account: {gameTokenAccount}</p>
              <p style={{ flex: '1 1 100%' }}>Referral Program Account (optional): {referralProgramAccount}</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', width: '100%', alignItems: 'center', justifyContent: 'center' }}>
              <p style={{ flex: '1 1 10%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Token Balance: {tokenBalance} <br/>{row.token}</p>
              <input
                type="number"
                placeholder="deposit value"
                value={depositValue}
                style={{ color: 'black' }}
                onChange={(e) => setDepositValue(parseFloat(e.target.value))}
                step={1}
                min={0.1}
                max={100000000}
              />
              <button className="btn-copy" style={{ flex: '1 1 10%', margin: '10px' }} onClick={() => deposit(depositValue, new PublicKey(gameTokenAccount), new PublicKey(tokenAddress), decimals)}>Deposit </button> 
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', width: '100%', alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ margin: '10px' }}>Fees Earned: {cashoutStats.cashOutSum.toFixed(2)}</p>
                <p style={{ margin: '10px' }}>Total Wagered: {cashoutStats.buyInSum.toFixed(2)}</p>
                <p style={{ margin: '10px' }}>Total Plays: {cashoutStats.buyInCount}</p>
              </div>
              <p style={{ margin: '10px' }}>Food unit value: {row.base_buyin / 1000} {row.token}</p>
              <p style={{ margin: '10px' }}>Current food in wallet: {tokenBalance / (row.base_buyin / 1000)}</p>
              <p style={{ margin: '10px' }}>Current food to add: {currentFoodToAdd}</p>
              <p style={{ margin: '10px' }}>Current token boost (max 1000%): +{currentFoodToAdd}% </p>
              <p style={{ margin: '10px' }}>Current tax (max 10%): {Math.max(0, (100 - currentFoodToAdd) / 10)}% </p>
              <p style={{ margin: '10px' }}>*For base buy in or greater,
                if less than 100 food is available to add, 100 food is still added and the player is taxed the 
                remainder. For less than base buy in, the amount of food added is proportional to the buy in.*
              </p>
              <Graph maxPlayers={row.max_players} foodInWallet={tokenBalance * 1000 / row.base_buyin} setCurrentFoodToAdd={setCurrentFoodToAdd} />
              <div style={{ display: 'flex', flexWrap: 'wrap', width: '100%', alignItems: 'center', justifyContent: 'center' }}>
              <p style={{ flex: '1 1 10%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '10px' }}>Player components check
              {playerComponentCheck !== "clean" ? (
                <>
                {playerComponentCheck !== "clogged" ? (
                <svg
                  className="inline ml-[5px] mt-[2px] h-[20px] w-[20px] stroke-[white]"
                  width="52"
                  height="52"
                  viewBox="0 0 38 38"
                  xmlns="http://www.w3.org/2000/svg"
              >
                  <g fill="none" fillRule="evenodd">
                      <g
                          transform="translate(1 1)"
                          strokeWidth="2"
                      >
                          <circle
                              strokeOpacity=".5"
                              cx="18"
                              cy="18"
                              r="18"
                          />
                          <path d="M36 18c0-9.94-8.06-18-18-18">
                              <animateTransform
                                  attributeName="transform"
                                  type="rotate"
                                  from="0 18 18"
                                  to="360 18 18"
                                  dur="1s"
                                  repeatCount="indefinite"
                              />
                          </path>
                      </g>
                  </g>
              </svg>
            ) : 
            (
            <button className="btn-copy" style={{ flex: '1 1 10%', margin: '10px' }} onClick={() => {handleCleanupClick(row, true)}}>Clean up</button> 
          )}
            </>
                ): (
              <>
                <svg
                  className="w-5 h-5 rounded-full inline-block stroke-[2px] stroke-[#15bd12] stroke-miter-10 shadow-inner ml-[5px] mt-[2px]"
                  style={{
                      animation:
                          "fill 0.4s ease-in-out 0.4s forwards, scale 0.3s ease-in-out 0.9s both;",
                  }}
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 52 52"
              >
                  <circle
                      className="stroke-[2px] stroke-[#15bd12] stroke-miter-10 fill-[#15bd12]"
                      style={{
                          strokeDasharray:
                              "166; stroke-dashoffset: 166; animation: stroke 0.6s cubic-bezier(0.650, 0.000, 0.450, 1.000) forwards;",
                      }}
                      cx="26"
                      cy="26"
                      r="25"
                      fill="none"
                  />
                  <path
                      className="stroke-[white] stroke-dasharray-[48] stroke-dashoffset-[48] transform-origin-[50%_50%] animation-stroke"
                      fill="none"
                      d="M14.1 27.2l7.1 7.2 16.7-16.8"
                  />
              </svg>
              </>
                )
              }
               </p>

              </div>
              <p style={{ flex: '1 1 100%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '10px' }}>Food components check 
                {foodComponentCheck !== "success" ? (
                <>
                {foodComponentCheck !== "section not found" && foodComponentCheck !== "section incorrect" ? (
                <svg
                  className="inline ml-[5px] mt-[2px] h-[20px] w-[20px] stroke-[white]"
                  width="52"
                  height="52"
                  viewBox="0 0 38 38"
                  xmlns="http://www.w3.org/2000/svg"
              >
                  <g fill="none" fillRule="evenodd">
                      <g
                          transform="translate(1 1)"
                          strokeWidth="2"
                      >
                          <circle
                              strokeOpacity=".5"
                              cx="18"
                              cy="18"
                              r="18"
                          />
                          <path d="M36 18c0-9.94-8.06-18-18-18">
                              <animateTransform
                                  attributeName="transform"
                                  type="rotate"
                                  from="0 18 18"
                                  to="360 18 18"
                                  dur="1s"
                                  repeatCount="indefinite"
                              />
                          </path>
                      </g>
                  </g>
              </svg>
              ): (
                <span style={{ color: 'red', margin: '10px', fontWeight: 'bold' }}>
                  {foodComponentCheck}
                </span>
              )
              }
              </>
                ): (
              <>
                <svg
                  className="w-5 h-5 rounded-full inline-block stroke-[2px] stroke-[#15bd12] stroke-miter-10 shadow-inner ml-[5px] mt-[2px]"
                  style={{
                      animation:
                          "fill 0.4s ease-in-out 0.4s forwards, scale 0.3s ease-in-out 0.9s both;",
                  }}
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 52 52"
              >
                  <circle
                      className="stroke-[2px] stroke-[#15bd12] stroke-miter-10 fill-[#15bd12]"
                      style={{
                          strokeDasharray:
                              "166; stroke-dashoffset: 166; animation: stroke 0.6s cubic-bezier(0.650, 0.000, 0.450, 1.000) forwards;",
                      }}
                      cx="26"
                      cy="26"
                      r="25"
                      fill="none"
                  />
                  <path
                      className="stroke-[white] stroke-dasharray-[48] stroke-dashoffset-[48] transform-origin-[50%_50%] animation-stroke"
                      fill="none"
                      d="M14.1 27.2l7.1 7.2 16.7-16.8"
                  />
              </svg>
              </>
                )
              }
              </p>
              <CollapsiblePanel title="Anteroom component check" defaultOpen={true}>
                <p style={{ flex: '1 1 100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{inspectAnteParsedData}</p>
              </CollapsiblePanel>
              <CollapsiblePanel title="Map component check" defaultOpen={true}>
                <p style={{ flex: '1 1 100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{inspectMapParsedData}</p>
              </CollapsiblePanel>
              <div style={{ display: 'flex', flexWrap: 'wrap', width: '100%', alignItems: 'center', justifyContent: 'center' }}>
              <p style={{ flex: '1 1 10%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Close game accounts, reclaim SOL</p>
              <button className="btn-copy" style={{ flex: '1 1 10%', margin: '10px' }}>Delete Game</button> 
              </div>
            </div>
          </CollapsiblePanel>
        ))}
      </div>
    </div>
  );
}

function CollapsiblePanel({ title, children, onOpen, defaultOpen }: { title: React.ReactNode, children: React.ReactNode, onOpen?: () => void, defaultOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  useEffect(() => {
    setIsOpen(defaultOpen);
  }, [defaultOpen]);

  const handleToggle = () => {
    if (!isOpen && onOpen) {
      onOpen();
    }
    setIsOpen(!isOpen);
  };

  return (
    <div className="collapsible-panel">
      <div className="panel-header" onClick={handleToggle}>
        {title} {isOpen ? "▲" : "▼"} 
      </div>
      {isOpen && <div className="panel-content">{children}</div>}
    </div>
  );
}
