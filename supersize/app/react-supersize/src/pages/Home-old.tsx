import React, {useCallback, useEffect, useRef, useState} from "react";
import {AnimatePresence, motion} from "framer-motion";
import Button from "../components/Button";
import CreateGame from "../components/CreateGame";
import GameComponent from "../components/GameComponent";
import CreateGameComponent from "../components/CreateGameComponent";
import Alert from "../components/Alert";
import Leaderboard from "../components/Leaderboard";

import {
    AddEntity,
    ApplySystem,
    createApplyInstruction,
    createInitializeComponentInstruction,
    FindComponentPda,
    FindWorldPda,
    FindEntityPda,
    createAddEntityInstruction,
    createInitializeRegistryInstruction,
    FindRegistryPda,
    InitializeNewWorld,
    InitializeComponent,
    createDelegateInstruction,
    DELEGATION_PROGRAM_ID,
    createAllowUndelegationInstruction,
    createUndelegateInstruction,
} from "@magicblock-labs/bolt-sdk";

import {WalletNotConnectedError} from '@solana/wallet-adapter-base';
import {useConnection, useWallet} from '@solana/wallet-adapter-react';
import WalletConnectButton from "@components/WalletConnectButton";
import {Connection, 
    SYSVAR_RENT_PUBKEY, 
    clusterApiUrl, 
    Keypair, 
    LAMPORTS_PER_SOL, 
    Transaction, 
    sendAndConfirmTransaction,
    SystemProgram,
    SystemInstruction, 
    AccountInfo, 
    Commitment, 
    ComputeBudgetProgram,
    PublicKey} from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import {Idl, Program, Provider, Wallet, AnchorProvider} from "@coral-xyz/anchor";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import BN from 'bn.js';
import * as splToken from '@solana/spl-token';
import {
    getAccount,
    getOrCreateAssociatedTokenAccount,
    createAssociatedTokenAccountInstruction,
    createAssociatedTokenAccount,
    createTransferInstruction,
    createCloseAccountInstruction,
    getAssociatedTokenAddress,
    TOKEN_PROGRAM_ID,
  } from "@solana/spl-token";
import { LIQUIDITY_STATE_LAYOUT_V4 } from "@raydium-io/raydium-sdk";
import { set } from "@metaplex-foundation/beet";
// import { Metadata, PROGRAM_ID } from "@metaplex-foundation/mpl-token-metadata";
import { Client, USDC_MINT } from "@ladderlabs/buddy-sdk";
import { initBuddyState, initialBuddyLink, useInitBuddyLink,
    useBuddyState, useBuddyLink, BUDDY_STATUS 
 } from "buddy.link";
import axios from "axios";

import { ANTEROOM_COMPONENT, BUY_IN, CASH_OUT, EAT_FOOD, EAT_PLAYER, EXIT_GAME, FOOD_COMPONENT, JOIN_GAME, MAP_COMPONENT, MOVEMENT, PLAYER_COMPONENT, SPAWN_FOOD, connection, endpoints, endpointToWorldMap, options, SOL_USDC_POOL_ID, scale } from "@utils/constants";
import { Food, Blob, ActiveGame} from "@utils/types";
import { deriveKeypairFromPublicKey, deriveSeedFromPublicKey } from "@utils/helper";
import useSupersize from "@hooks/useSupersize";

initBuddyState({
	...initialBuddyLink,
	...{
		ORGANIZATION_NAME: "",
		MEMBER_NAME: "",
		PROFILE_NAME: "",
		ORG_MEMBER_NAME: "",
	},
});

const Home: React.FC = () => {
    const { publicKey } = useWallet();

    const {
        exitTxn,
        isReferrerModalOpen,
        setIsReferrerModalOpen,
        referrerInput,
        setReferrerInput,
        playerKey,
        walletRef,
        players,
        visibleFood,
        currentPlayer,
        playerName,
        expandlist,
        setexpandlist,
        newGameCreated,
        setNewGameCreated,
        currentTPS,
        price,
        screenSize,
        isSubmitting,
        setIsSubmitting,
        isJoining,
        transactionError,
        setTransactionError,
        transactionSuccess,
        setTransactionSuccess,
        activeGames,
        setActiveGames,
        gamewallet,
        setGameWallet,
        openGameInfo,
        setOpenGameInfo,
        gameId,
        setExitHovered,
        buildViewerNumber,
        setbuildViewerNumber,
        leaderBoardActive,
        setLeaderboardActive,
        isHovered,
        setIsHovered,
        gameEnded,
        playerCashout,
        playerTax,
        cashoutTx,
        inputValue,
        footerVisible,
        playerExiting,
        countdown,
        buyIn,
        setBuyIn,
        isMobile,
        selectedOption,
        isDropdownOpen,
        setIsDropdownOpen,
        provider,
        providerEphemeralRollup,
        handleNameChange,
        handleOptionClick,
        handleSliderChange,
        handleInputChange,
        handleKeyPress,
        joinGameTx,
        openDocs,
        openX,
        openTG,
        handleExitClick,
        cleanUp,
        getRefferal,
        handleClick,
        handleImageClick
    } = useSupersize();

    return (
        <>
        <div className={`supersize ${isReferrerModalOpen ? "background-dim" : ""}`}>
        <div className="topbar" style={{display: gameId == null && gameEnded == 0 && buildViewerNumber != 9 ? 'flex' : 'none',background: buildViewerNumber==1 ? "rgba(0, 0, 0, 0.3)" : "rgb(0, 0, 0)",height: isMobile && buildViewerNumber == 1 ? '20vh' : buildViewerNumber == 1 ? '10vh' : '4vh', zIndex: 9999999}}>
            {buildViewerNumber == 0 ? (
                <>
                <div
                    className="dropdown-container"
                    onClick={() => setIsDropdownOpen((prev) => !prev)} 
                >
                    <div className={`selected-option ${isDropdownOpen ? "open" : ""}`}>
                        <span className="dot green-dot" /> 
                        {selectedOption}
                    </div>

                    {isDropdownOpen && (
                        <div className="dropdown-menu">
                            {options
                                .filter((option) => option !== selectedOption)
                                .map((option) => (
                                    <div
                                        key={option}
                                        className="dropdown-item"
                                        onClick={(e) => {
                                            e.stopPropagation(); 
                                            handleOptionClick(option);
                                        }}
                                    >
                                        <span className="dot red-dot" />
                                        <span className="dropdown-text"> {option} </span>
                                    </div>
                                ))}
                        </div>
                    )}
                </div>
                <span className="free-play" style={{color:"#FFEF8A", borderColor:"#FFEF8A", marginLeft:"0vw", width:"fit-content", paddingLeft:"10px", paddingRight:"10px", marginTop:"5vh", background:"black"}}>Supersize is an eat or be eaten multiplayer game, live on the Solana blockchain</span>
                </>
            ) : 
               (
                <div>
                <>
                    {buildViewerNumber ==1 ?
                        (   
                             <span className="titleText" style={{cursor:"pointer"}} onClick={(e) => {e.stopPropagation(); setbuildViewerNumber(0);}}> SUPERSIZE </span>
                        )     
                        : (        
                        <div>
                        <>
                        <div
                            style={{
                                width: '4vh',
                                height: '4vh',
                                display: 'flex',
                                cursor: "pointer",
                                alignItems : "center", 
                                justifyContent:"center",
                                marginLeft:"2vw",
                                marginTop:"4vh"
                            }}
                            onMouseEnter={() => setIsHovered([false,false,false,false,false,true])}
                            onMouseLeave={() => setIsHovered([false,false,false,false,false,false])}
                            onClick={() => {setbuildViewerNumber(0); setIsHovered([false,false,false,false,false]);}}
                            >
                            <img
                                src={`${process.env.PUBLIC_URL}/home.png`}
                                width="35px"
                                height="auto"
                                alt="Image"
                                style={{
                                    position: "absolute",
                                    opacity: isHovered[5] ? 0.2 : 0.8,
                                    transition: 'opacity 0.0s ease background 0.3s ease 0s, color 0.3s ease 0s',
                                }}
                            />
                            {isHovered[5] && (
                                <img
                                src={`${process.env.PUBLIC_URL}/homehighlight.png`}
                                width="35px"
                                height="auto"
                                alt="Highlighted Image"
                                style={{
                                    position: 'absolute',
                                    opacity: isHovered[5] ? 0.8 : 0.2,
                                    transition: 'opacity 0.3s ease',
                                }}
                                />
                            )}
                        </div>
                        </>
                        </div>)}
                    </>
                </div>)
            }
            <div className="left-side" style={{alignItems : "center", justifyContent:"center", display: 'flex', zIndex: 9999999 }}>
            <>
            {
                <span style={{color: "white", fontFamily: "terminus", height: "6vh", marginTop: "19vh", cursor: "pointer", right: "2.5vw", position: "absolute", display: buildViewerNumber == 1 ? "none" : "block"}} onMouseLeave={() => {}} onClick={() => { }} > share referral</span>
            }
            {
                  
                leaderBoardActive ?
                <img src="/leaderboardhighlight.png" alt="leaderboard" style={{width: "6vh", height: "6vh", marginTop: "4vh", cursor: "pointer", marginRight: "1rem", display: buildViewerNumber == 1 ? "none" : "block"}} onMouseLeave={() => setLeaderboardActive(false)} onClick={() => { setbuildViewerNumber(9); }} />
                :
                <img src="/leaderboard.png" alt="leaderboard" style={{width: "6vh", height: "6vh", marginTop: "4vh", cursor: "pointer", marginRight: "1rem", display: buildViewerNumber == 1 ? "none" : "block"}} onMouseEnter={() => setLeaderboardActive(true)} onClick={() => { setbuildViewerNumber(9); }} />
                
            }
            {buildViewerNumber != 1 ? (
                // <div className="wallet-buttons" style={{ marginTop:"0vh", zIndex: 9999999}}>
                <WalletConnectButton />
                // </div>
            ):(
                <div className="play" style={{display: footerVisible ? "none" : 'flex'}}>
                <Button buttonClass="playButton" title={"Play"} onClickFunction={() => {setbuildViewerNumber(0);}} args={[activeGames[0]]}/>
                </div>
            )}
            </>
            </div>
        </div>
        <>
        {buildViewerNumber==0 ? (
        <>
        <div className="game-select" style={{display: gameId == null && gameEnded == 0 ? 'flex' : 'none'}}>
            <div className="select-background">
            <img className="logo-image" src={`${process.env.PUBLIC_URL}/token.png`} width="30vw" height="auto" alt="Image"/>
            <h1 className="titleBackground"> SUPERSIZE </h1>
            </div>
            <div className="join-game">
                < div className="table">
                    <div className="playerName">
                        <input 
                            className="playerNameText"
                            type="text" 
                            value={playerName} 
                            onChange={handleNameChange} 
                            placeholder="Enter your name"
                        />
                    </div>
                    <div className="buyInField">
                    <div
                    style={{
                        display: "flex",
                        alignItems: "center", 
                        width: "100%", 
                        position: "relative", 
                    }}
                    >
                    <div
                        className="buyInInfo"
                        style={{
                        marginLeft: "5px",
                        width: "fit-content",
                        display: "flex",
                        alignItems: "center",
                        flexShrink: 1, 
                        overflow: "hidden", 
                        whiteSpace: "nowrap", 
                        textOverflow: "ellipsis",
                        }}
                    >
                        <img
                        src={activeGames[0] ? activeGames[0].image : `${process.env.PUBLIC_URL}/token.png`}
                        width="20px"
                        height="auto"
                        alt="Image"
                        style={{
                            flexShrink: 0, 
                            marginRight: "8px",
                        }}
                        />
                        <div
                        style={{
                            display: "inline-block",
                            height: "20px",
                            overflow: "hidden",
                            whiteSpace: "nowrap",
                            textOverflow: "ellipsis",
                            marginTop: "3px",
                            flexShrink: 1, 
                        }}
                        >
                        {activeGames[0] ? activeGames[0].token : "LOADING"}
                        </div>
                    </div>
                    <input
                        className="BuyInText"
                        type="number"
                        value={buyIn}
                        onChange={(e) => setBuyIn(parseFloat(e.target.value))}
                        placeholder={activeGames[0] ? activeGames[0].base_buyin.toString() : "0"}
                        step={activeGames[0] ? activeGames[0].min_buyin / 10 : 0}
                        min={activeGames[0] ? activeGames[0].min_buyin : 0}
                        max={activeGames[0] ? activeGames[0].max_buyin : 0}
                        style={{
                        flexGrow: 1, 
                        flexShrink: 0,
                        marginLeft: "10px",
                        marginRight: "0",
                        zIndex: 1,
                        position: "relative", 
                        }}
                    />
                    </div>
                    </div>
                    <div className="buyInSlider">
                    <input 
                        type="range" 
                        min={activeGames[0] ? activeGames[0].min_buyin : 0}  
                        max={activeGames[0] ? (activeGames[0].max_buyin + activeGames[0].min_buyin/10) : 0} 
                        step={activeGames[0] ? (activeGames[0].min_buyin/10) : 0} 
                        value={buyIn} 
                        onChange={handleSliderChange} 
                        className="slider" 
                    />
                    </div>
                    <div className="gameSelect">
                        <div className="gameSelectButton" style={{maxHeight: expandlist ?  "25vh" : "auto", height: expandlist ? "25vh" : "auto"}}>
                            <div style={{  display: "flex", flexDirection: "row", width:"100%", paddingBottom:"0.4em", paddingTop:"0.4em", borderBottom:"1px solid", background:"white", zIndex:"999", borderBottomLeftRadius: expandlist ? "0px" : "10px", borderBottomRightRadius: expandlist ? "0px" : "10px", borderTopLeftRadius: "10px", borderTopRightRadius:"10px", borderColor:"#5f5f5f"}}>
                            <div onClick={() => {handleClick(0);}} style={{ width: "4vw", paddingTop:"0.4em", alignItems: 'center', justifyContent: 'center', cursor: "pointer", alignSelf:"flex-start", display:"flex", fontSize: "20px", fontWeight:"700" }}>
                            {!openGameInfo[0] ? "+" : "-"}
                            </div>
                            <div className="gameInfo" style={{ display: "flex", flexDirection: "column", fontSize:"1rem", paddingTop:"0.2em", overflow:"hidden", width:"100%" }}>
                                    <span style={{ opacity: "0.7", fontSize: "0.7rem", marginBottom:"5px" }}></span>
                                    <span>{activeGames.length > 0 ? activeGames[0].name : "loading"} {/*<p style={{opacity: "0.7", fontSize:"10px", display:"inline-flex"}}>[demo]</p> */}</span>
                                    {openGameInfo[0] ? (
                                    <>
                                    <span style={{ opacity: "0.7", fontSize: "0.7rem", marginBottom:"5px" }}>players: {activeGames[0].active_players} / {activeGames[0].max_players}</span>
                                    <span style={{ opacity: "0.7", fontSize: "0.7rem", marginBottom:"5px" }}>token: {activeGames[0].token}</span>
                                    <span style={{ opacity: "0.7", fontSize: "0.7rem", marginBottom:"5px" }}>game id: {activeGames[0].worldId.toString()}</span>
                                    </>
                                    ): null}
                            </div>
                            <div style={{marginLeft: "auto", width:"2vw", paddingTop:"0.8em", alignItems:'center', alignSelf:"flex-start",justifyContent:'flex-end', marginRight:"1vw", cursor: "pointer", display:"flex"}} onClick={(e) => {setexpandlist(!expandlist); setOpenGameInfo(new Array(activeGames.length).fill(false));}}>
                            <svg width="15" height="9" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg" style={{width:"1vw", height:'auto', transform: expandlist ? "scaleY(-1)" : "scaleY(1)", transformOrigin: 'center'}}>
                            <path d="M5 6L9.33013 0H0.669873L5 6Z" fill="black"/>
                            </svg>
                            </div>
                            </div>
                            {expandlist ? (
                            <>
                            <div className="gameInfoContainer" style={{maxHeight: expandlist ? "20vh" : "auto", height: "20vh"}}>
                            {activeGames.map((item, index) => (
                            <>
                            <div style={{  display: "flex", flexDirection: "row", width:"100%", paddingTop: "0.4em",paddingBottom:!expandlist ?"0.4em":"0.15em", borderBottom:"1px solid", borderColor:"#5f5f5f", opacity:"0.5", cursor: "pointer"}}
                                                            onMouseEnter={(e) => {e.currentTarget.style.background = '#FFEF8A'; e.currentTarget.style.opacity = '1.0';}}
                                                            onMouseLeave={(e) => {e.currentTarget.style.background = 'white'; e.currentTarget.style.opacity = '0.5';}}>  
                            <div style={{width: "3.2vw", alignItems: 'center', justifyContent: 'center', cursor: "pointer", alignSelf:"flex-start", display: index == 0 ? 'flex' : 'flex' , marginTop:"0.7vh", fontSize: "20px", fontWeight:"700"}} onClick={() => {handleClick(index);}}>
                            {!openGameInfo[index] ? "+" : "-"}
                            </div>
                            <div className="gameInfo" style={{ display: "flex", flexDirection: "column", fontSize:"1rem", overflow:"hidden", marginBottom:"5px", marginTop:"0.15em", width:"100%" }} 
                            onClick={()=>{                                        
                                const copiedActiveGameIds: ActiveGame[] = [...activeGames];
                                const [item] = copiedActiveGameIds.splice(index, 1);
                                copiedActiveGameIds.unshift(item);
                                setActiveGames(copiedActiveGameIds);}}>
                                    <span style={{ opacity: "0.7", fontSize: "0.7rem", marginBottom:"5px" }}></span>
                                    <span> {item.name} {/* <p style={{opacity: "0.7", fontSize:"10px", display:"inline-flex"}}>[demo]</p> */}</span>
                                    {openGameInfo[index] ? (
                                    <>
                                    <span style={{ opacity: "0.7", fontSize: "0.7rem", marginBottom:"5px" }}>players: {item.active_players} / {item.max_players}</span>
                                    <span style={{ opacity: "0.7", fontSize: "0.7rem", marginBottom:"5px" }}>token: {activeGames[0].token}</span>
                                    <span style={{ opacity: "0.7", fontSize: "0.7rem", marginBottom:"5px" }}>game id: {item.worldId.toString()}</span>
                                    </>
                                    ): null}
                            </div>
                            <div style={{marginLeft: "auto", width:"2vw", height:"100%", display: index == 0 ? 'flex' : 'none', alignItems:'center', justifyContent:'flex-end', marginRight:"1vw", cursor: "pointer"}}>
                            <svg width="15" height="9" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg" style={{width:"1vw", height:'auto'}}>
                            <path d="M5 6L9.33013 0H0.669873L5 6Z" fill="black"/>
                            </svg>
                            </div>
                            </div>
                            </>
                            ))}
        
                            </div>
                            <div className="searchbox" style={{marginTop: "auto"}}>
                                <img src={`${process.env.PUBLIC_URL}/magnifying-glass.png`} width="20px" height="auto" alt="Image" style={{ marginLeft: "0.6vw", width: "1vw"}} onClick={handleImageClick} />
                                <input type="text" className="text-input" placeholder="Search by game id" style={{background:"none", border:"none",marginRight:"1vw", height:"80%", width:"100%"}}
                                value={inputValue}
                                onChange={handleInputChange}
                                onKeyDown={handleKeyPress}
                                >          
                                </input>
                            </div>
                            </> ) : null}
                        </div>
                    </div>
                    <div className="play">
                        <Button buttonClass="playButton" title={"Play"} onClickFunction={joinGameTx} args={[activeGames[0]]}/>
                    </div>
                    <div className="play">
                        <Button buttonClass="createGameButton" title={"Create Game"} onClickFunction={() => setbuildViewerNumber(5)}/>
                    </div>
                </div>
            </div>
            
        </div>
        </>): (
            <>
            {buildViewerNumber == 1 ? (
            <div className="info-container" style={{display: gameId == null && gameEnded == 0 ? 'flex' : 'none'}}>
            <div className="info-image-container" style={{display: footerVisible ? 'none' : 'flex', opacity: footerVisible ? "0" : "1", zIndex: "-1"}}>
              <img src={`${process.env.PUBLIC_URL}/supersizemaybe.png`} alt="Spinning" className="info-spinning-image" />
            </div>
            <div className="info-text-container" style={{width: footerVisible ? '100%' : '65%', paddingLeft: footerVisible ? '0' : '20px',  paddingRight: footerVisible ? '0' : '6vw'}}>
              <div className="info-scrolling-text">
                <p>Supersize is a live multiplayer feeding frenzy game. Players must eat or be eaten to become the biggest onchain. 
                <br></br>
                <br></br>
                Bigger players move slower than smaller players, but can expend tokens to boost forward and eat them. Click to boost. 
                <br></br>
                <br></br>
                Supersize is playable with any SPL token. Players can exit the game at any time to receive their score in tokens. <br></br>(2% tax on exit)              
                <br></br>
                <br></br>
                All game logic and state changes are securely recorded on the Solana blockchain in real-time, <br></br>powered by  {' '}
                <a href="https://www.magicblock.gg/" target="_blank" rel="noopener noreferrer">
                    <img src={`${process.env.PUBLIC_URL}/magicblock_white_copy.svg`} alt="Spinning" className="info-spinning-image" style={{width:"300px", marginTop:"50px", display:"inline-block"}}/>
                </a>   
                </p>
                <div className={`info-footer ${footerVisible ? 'visible' : ''}`}>
                <div style={{position:"absolute", top:"-50vh", left:"40vw", width:"fit-content", color: "white", fontFamily:"Terminus", fontSize:"0.5em", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column"}}>
                Join a game
                <div className="play" style={{marginTop:"1vw"}}>
                        <Button buttonClass="playNowButton" title={"Play Now"} onClickFunction={() => {setbuildViewerNumber(0);}} args={[activeGames[0]]}/>
                    </div>
                </div>
                <div className="footer-left">
                <span className="footer-name"><div className="csupersize">© Supersize Inc. 2024</div></span>
                </div>
                <div className="footer-right">
                <div
                    style={{
                        width: '35px',
                        height: '40px',
                        display: 'flex',
                        cursor: "pointer",
                        alignItems : "center", 
                        justifyContent:"center",
                        paddingLeft: "3px",
                        paddingRight:"0px",
                    }}
                    onMouseEnter={() => setIsHovered([false,false,true,false,false])}
                    onMouseLeave={() => setIsHovered([false,false,false,false,false])}
                    onClick={openDocs}
                    >
                    <img
                        src={`${process.env.PUBLIC_URL}/GitBook.png`}
                        width="30px"
                        height="auto"
                        alt="Image"
                        style={{
                            position: "absolute",
                            opacity: isHovered[2] ? 0.2 : 0.8,
                            transition: 'opacity 0.0s ease background 0.3s ease 0s, color 0.3s ease 0s',
                        }}
                    />
                    {isHovered[2] && (
                        <img
                        src={`${process.env.PUBLIC_URL}/GitBookhighlight.png`}
                        width="30px"
                        height="auto"
                        alt="Highlighted Image"
                        style={{
                            position: 'absolute',
                            opacity: isHovered[2] ? 0.8 : 0.2,
                            transition: 'opacity 0.3s ease',
                        }}
                        />
                    )}
                </div>
                <div
                    style={{
                        width: '35px',
                        height: '40px',
                        display: 'flex',
                        cursor: "pointer",
                        alignItems : "center", 
                        justifyContent:"center",
                        paddingLeft: "0px",
                        paddingRight:"0px",
                    }}
                    onMouseEnter={() => setIsHovered([false,false,false,true,false])}
                    onMouseLeave={() => setIsHovered([false,false,false,false,false])}
                    onClick={openX}
                    >
                    <img
                        src={`${process.env.PUBLIC_URL}/x-logo.png`}
                        width="23px"
                        height="auto"
                        alt="Image"
                        style={{
                            position: "absolute",
                            opacity: isHovered[3] ? 0.2 : 0.8,
                            transition: 'opacity 0.0s ease background 0.3s ease 0s, color 0.3s ease 0s',

                        }}
                    />
                    {isHovered[3] && (
                        <img
                        src={`${process.env.PUBLIC_URL}/x-logo-highlight.png`}
                        width="23px"
                        height="auto"
                        alt="Highlighted Image"
                        style={{
                            position: 'absolute',
                            opacity: isHovered[3] ? 0.8 : 0.2,
                            transition: 'opacity 0.3s ease',
                        }}
                        />
                    )}
                </div>
                <div
                    style={{
                        width: '35px',
                        height: '40px',
                        display: 'flex',
                        alignItems : "center", 
                        justifyContent:"center",
                        paddingRight:"10px",
                        cursor: "pointer",
                    }}
                    onMouseEnter={() => setIsHovered([false,false,false,false,true])}
                    onMouseLeave={() => setIsHovered([false,false,false,false,false])}
                    onClick={openTG}
                    >
                    <img
                        src={`${process.env.PUBLIC_URL}/tg2.png`}
                        width="23px"
                        height="auto"
                        alt="Image"
                        style={{
                            position: "absolute",
                            opacity: isHovered[4] ? 0.2 : 0.8,
                            transition: 'opacity 0.0s ease background 0.3s ease 0s, color 0.3s ease 0s',
                        }}
                    />
                    {isHovered[4] && (
                        <img
                        src={`${process.env.PUBLIC_URL}/tg.png`}
                        width="23px"
                        height="auto"
                        alt="Highlighted Image"
                        style={{
                            position: 'absolute',
                            opacity: isHovered[4] ? 0.8 : 0.2,
                            transition: 'opacity 0.3s ease',
                        }}
                        />
                    )}
                </div>
                </div>
            </div>
              </div>
            </div>
          </div>
            ):(
                <>
                {
                buildViewerNumber === 9 ? (
                <div>
                     <Leaderboard setbuildViewerNumber={setbuildViewerNumber} />
                </div>
                )
                : 
                (
                <div className="game-select" style={{display: gameId == null && gameEnded == 0 ? 'flex' : 'none', height: '86vh', alignItems: 'center', justifyContent: 'center', flexDirection:'column'}}>
                <CreateGameComponent 
                connection={connection}
                playerKey={playerKey}
                walletRef={walletRef}
                provider={provider}
                providerEphemeralRollup={providerEphemeralRollup}
                buildViewerNumber={buildViewerNumber}
                isSubmitting={isSubmitting}
                newGameCreated={newGameCreated}
                activeGames={activeGames}
                gamewallet={gamewallet}
                setTransactionError={setTransactionError}
                setTransactionSuccess={setTransactionSuccess}
                setIsSubmitting={setIsSubmitting}
                setActiveGames={setActiveGames}
                setbuildViewerNumber={setbuildViewerNumber}
                setNewGameCreated={setNewGameCreated}
                setGameWallet={setGameWallet}
                />
                </div>
                )}
            </>
            )}
            </>
        )}
        <div className="linksFooter" style={{display: gameId == null && gameEnded == 0  && buildViewerNumber !=1 ? 'flex' : 'none', alignItems:"center",justifyContent:"center"}}>
            <div style={{height: "40px", alignItems:"center",justifyContent:"center",display: !isMobile ? 'flex' : 'none', padding:"10px", marginLeft:"2vw", color:"white", fontFamily:"terminus"}}>
                <div className="tps">TPS: {currentTPS}</div>
                <div className="solprice"><img src={`${process.env.PUBLIC_URL}/solana-logo.png`} width="20px" height="auto" alt="Image" style={{ width: "1vw", marginRight: "10px"}}/> ${Math.round(price)}</div>
                {/*<div className="playercount">Active Players: 0</div>*/}
            </div>
            <div
            style={{
                height: "40px",
                position: "absolute",
                alignItems: "center",
                justifyContent: "center",
                display: buildViewerNumber == 0 ? "flex" : 'none',
                padding: "10px",
                marginLeft: "auto",
                marginRight: "auto",
                color: "white",
                fontFamily: "terminus",
                flexDirection: "column",
                cursor:"pointer"
            }}
            onClick={() => setbuildViewerNumber(1)}
            >
            Learn More
            <img
                src={`${process.env.PUBLIC_URL}/morearrow.png`}
                width="20px"
                height="auto"
                alt="Image"
                style={{
                marginTop: "0vh",
                animation: "bounce 2s infinite",
                }}
                onClick={() => setbuildViewerNumber(1)}
            />
            </div>
            <div className="solstats" style={{display: !isMobile ? 'flex' : 'none'}}>
                <div
                    style={{
                        width: '35px',
                        height: '40px',
                        display: 'flex',
                        cursor: "pointer",
                        alignItems : "center", 
                        justifyContent:"center",
                        borderRight: "1px solid #FFFFFF4D",
                        paddingLeft: "3px",
                        paddingRight:"3px",
                    }}
                    onMouseEnter={() => setIsHovered([false,false,true,false,false])}
                    onMouseLeave={() => setIsHovered([false,false,false,false,false])}
                    onClick={openDocs}
                    >
                    <img
                        src={`${process.env.PUBLIC_URL}/GitBook.png`}
                        width="20px"
                        height="auto"
                        alt="Image"
                        style={{
                            position: "absolute",
                            opacity: isHovered[2] ? 0.2 : 0.8,
                            transition: 'opacity 0.0s ease background 0.3s ease 0s, color 0.3s ease 0s',
                        }}
                    />
                    {isHovered[2] && (
                        <img
                        src={`${process.env.PUBLIC_URL}/GitBookhighlight.png`}
                        width="20px"
                        height="auto"
                        alt="Highlighted Image"
                        style={{
                            position: 'absolute',
                            opacity: isHovered[2] ? 0.8 : 0.2,
                            transition: 'opacity 0.3s ease',
                        }}
                        />
                    )}
                </div>
                <div
                    style={{
                        width: '35px',
                        height: '40px',
                        display: 'flex',
                        cursor: "pointer",
                        alignItems : "center", 
                        justifyContent:"center",
                        paddingLeft: "5px",
                        paddingRight:"5px",
                        borderRight: "1px solid #FFFFFF4D",
                    }}
                    onMouseEnter={() => setIsHovered([false,false,false,true,false])}
                    onMouseLeave={() => setIsHovered([false,false,false,false,false])}
                    onClick={openX}
                    >
                    <img
                        src={`${process.env.PUBLIC_URL}/x-logo.png`}
                        width="15px"
                        height="auto"
                        alt="Image"
                        style={{
                            position: "absolute",
                            opacity: isHovered[3] ? 0.2 : 0.8,
                            transition: 'opacity 0.0s ease background 0.3s ease 0s, color 0.3s ease 0s',

                        }}
                    />
                    {isHovered[3] && (
                        <img
                        src={`${process.env.PUBLIC_URL}/x-logo-highlight.png`}
                        width="15px"
                        height="auto"
                        alt="Highlighted Image"
                        style={{
                            position: 'absolute',
                            opacity: isHovered[3] ? 0.8 : 0.2,
                            transition: 'opacity 0.3s ease',
                        }}
                        />
                    )}
                </div>
                <div
                    style={{
                        width: '35px',
                        height: '40px',
                        display: 'flex',
                        alignItems : "center", 
                        justifyContent:"center",
                        borderRight: "1px solid #FFFFFF4D",
                        paddingLeft: "10px",
                        paddingRight:"10px",
                        cursor: "pointer",
                    }}
                    onMouseEnter={() => setIsHovered([false,false,false,false,true])}
                    onMouseLeave={() => setIsHovered([false,false,false,false,false])}
                    onClick={openTG}
                    >
                    <img
                        src={`${process.env.PUBLIC_URL}/tg2.png`}
                        width="23px"
                        height="auto"
                        alt="Image"
                        style={{
                            position: "absolute",
                            opacity: isHovered[4] ? 0.2 : 0.8,
                            transition: 'opacity 0.0s ease background 0.3s ease 0s, color 0.3s ease 0s',
                        }}
                    />
                    {isHovered[4] && (
                        <img
                        src={`${process.env.PUBLIC_URL}/tg.png`}
                        width="23px"
                        height="auto"
                        alt="Highlighted Image"
                        style={{
                            position: 'absolute',
                            opacity: isHovered[4] ? 0.8 : 0.2,
                            transition: 'opacity 0.3s ease',
                        }}
                        />
                    )}
                </div>
                <div className="csupersize">© Supersize Inc. 2024</div>
            </div>
        </div>
        
        </>
        <div className="gameWrapper">
        <div id="status" style={{display: gameId !== null ? 'block' : 'none', zIndex: 9999}}><span className="title">Leaderboard</span></div>
        <div style={{ display: gameId !== null ? 'flex' : 'none', alignItems: 'center', position: 'fixed', top: 0, left: 0, margin: '10px', zIndex: 9999}}
              onMouseEnter={() => {setExitHovered(true)}}
              onMouseLeave={() => {setExitHovered(false)}}>
            <Button buttonClass="exitButton" title={"X"} onClickFunction={handleExitClick} args={[]}/> 
            {playerExiting && countdown > 0 && (
                <div style={{ display: 'block', color: '#f07171', fontFamily: 'Terminus', fontSize: '20px', textAlign: 'right', marginLeft: '10px' }}>
                Disconnecting in {countdown} seconds
                </div>
            )}
        </div>
        <div style={{ 
            display: gameId !== null ? 'flex' : 'none', 
            alignItems: 'left', 
            position: 'fixed', 
            bottom: 0, 
            left: 0, 
            margin: '10px', 
            zIndex: 9999, 
            color: "white", 
            transform: "none", 
            fontSize: "1em", 
            fontFamily: "terminus", 
            flexDirection: 'column' // Add this to stack vertically
        }}>
            <div>
                <span style={{ opacity: 0.5 }}>Your size: </span>
                <span style={{ opacity: 1 }}>{currentPlayer ? currentPlayer.score : null}</span>
            </div>
        </div>

        <div className="game" style={{display: gameId !== null ? 'block' : 'none', height: screenSize.height*scale, width: screenSize.width*scale}}>
                <GameComponent
                gameId={gameId}
                players={players}
                visibleFood={visibleFood.flat()}
                currentPlayer={currentPlayer}
                screenSize={screenSize}
                scale={scale}
            />
        </div>

        <div className="gameEnded" style={{ display: gameId == null ? 'block' : 'none', height: "100%", width: "100%" }}>
            {gameEnded === 1 && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100vw',
                        height: '100vh',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        backgroundColor: 'rgb(0, 0, 0)',
                        zIndex: 9999,
                    }}
                >
                    <div className="exitBox" style={{ background: 'black', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <p className="superExitInfo">You got eaten!</p>
                        {/*
                        <div style={{display:"flex", alignItems:"center", justifyContent:"center"}}>
                        <a 
                            className="superExitInfo"
                            href={`https://explorer.solana.com/tx/${reclaimTx}?cluster=mainnet`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                        >
                            Reclaim SOL 
                        </a>
                        {reclaimTx != null ? (
                        <svg className="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52" style={{display:"inline", marginLeft:"5px", marginTop:"2px" }}>
                            <circle className="checkmark__circle" cx="26" cy="26" r="25" fill="none" />
                            <path className="checkmark__check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
                        </svg>     
                        ) : (            
                        <svg width="52" height="52" viewBox="0 0 38 38" xmlns="http://www.w3.org/2000/svg" stroke="#fff" style={{ display:"inline", marginLeft:"5px", marginTop:"2px", height:"20px", width:"20px"}}>
                            <g fill="none" fillRule="evenodd">
                                <g transform="translate(1 1)" strokeWidth="2">
                                    <circle strokeOpacity=".5" cx="18" cy="18" r="18" />
                                    <path d="M36 18c0-9.94-8.06-18-18-18">
                                        <animateTransform attributeName="transform" type="rotate" from="0 18 18" to="360 18 18" dur="1s" repeatCount="indefinite" />
                                    </path>
                                </g>
                            </g>
                        </svg>
                        )}
                        </div> */}
                        <button id="returnButton" onClick={() => window.location.reload()}>Return home</button>
                    </div>
                </div>
            )}
            {(gameEnded === 2 || gameEnded === 3) && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100vw',
                        height: '100vh',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        backgroundColor: 'rgb(0, 0, 0)',
                        zIndex: 9999,
                    }}
                >
                    <div className="exitBox" style={{ background: 'black', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', userSelect: 'text' }}>
                        <p className="superExitInfo">Final score: {playerCashout.current + playerTax}</p>
                        <p className="superExitInfo">Exit tax: {playerTax + playerCashout.current * 0.02}</p>
                        <p className="superExitInfo">Payout: {playerCashout.current * 0.98}</p>
                        <div style={{display:"flex", alignItems:"center", justifyContent:"center"}}>
                        <a 
                            className="superExitInfo"
                            href={`https://explorer.solana.com/tx/${cashoutTx}?cluster=mainnet`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                        >
                            Cashout transaction
                        </a>
                        {cashoutTx != null ? (
                        <>
                            {cashoutTx != 'error' ? (  
                            <svg className="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52" style={{display:"inline", marginLeft:"5px", marginTop:"2px" }}>
                                <circle className="checkmark__circle" cx="26" cy="26" r="25" fill="none" />
                                <path className="checkmark__check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
                            </svg>    
                            )
                            : (<Button buttonClass="retryButton" title={"Retry"} onClickFunction={cleanUp}/> )}
                        </> 
                        ) : (          
                        <svg width="52" height="52" viewBox="0 0 38 38" xmlns="http://www.w3.org/2000/svg" stroke="#fff" style={{ display:"inline", marginLeft:"5px", marginTop:"2px", height:"20px", width:"20px"}}>
                            <g fill="none" fillRule="evenodd">
                                <g transform="translate(1 1)" strokeWidth="2">
                                    <circle strokeOpacity=".5" cx="18" cy="18" r="18" />
                                    <path d="M36 18c0-9.94-8.06-18-18-18">
                                        <animateTransform attributeName="transform" type="rotate" from="0 18 18" to="360 18 18" dur="1s" repeatCount="indefinite" />
                                    </path>
                                </g>
                            </g>
                        </svg>
                        )}
                        </div>
                        {/*
                        <div style={{display:"flex", alignItems:"center", justifyContent:"center"}}>
                        <a 
                            className="superExitInfo"
                            href={`https://explorer.solana.com/tx/${reclaimTx}?cluster=mainnet`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                        >
                            Reclaim SOL 
                        </a>
                        {reclaimTx != null ? (
                        <svg className="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52" style={{display:"inline", marginLeft:"5px", marginTop:"2px" }}>
                            <circle className="checkmark__circle" cx="26" cy="26" r="25" fill="none" />
                            <path className="checkmark__check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
                        </svg>     
                        ) : (            
                        <svg width="52" height="52" viewBox="0 0 38 38" xmlns="http://www.w3.org/2000/svg" stroke="#fff" style={{ display:"inline", marginLeft:"5px", marginTop:"2px", height:"20px", width:"20px"}}>
                            <g fill="none" fillRule="evenodd">
                                <g transform="translate(1 1)" strokeWidth="2">
                                    <circle strokeOpacity=".5" cx="18" cy="18" r="18" />
                                    <path d="M36 18c0-9.94-8.06-18-18-18">
                                        <animateTransform attributeName="transform" type="rotate" from="0 18 18" to="360 18 18" dur="1s" repeatCount="indefinite" />
                                    </path>
                                </g>
                            </g>
                        </svg>
                        )}
                        </div> */}
                        <button id="returnButton" onClick={() => {window.location.reload();}}>Return home</button>
                    </div>
                </div>
            )}
            {gameEnded === 4 && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100vw',
                        height: '100vh',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        backgroundColor: 'rgb(0, 0, 0)',
                        zIndex: 9999,
                    }}
                >
                    <div className="exitBox" style={{ background: 'black', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', userSelect: 'text' }}>
                        <p className="superStartInfo" style={{ color: 'red' }}>Error encountered during payout</p>
                        <p className="superStartInfo" style={{ padding: '10px' }}>
                            <>If no transaction is received after a few minutes, contact @cheapnumbers on X</>
                            <br /><br />
                            Txn Receipt: {exitTxn}
                        </p>
                        <button id="returnButton" onClick={() => {window.location.reload();}}>Return home</button>
                    </div>
                </div>
            )}
        </div>

        </div>
        {(isSubmitting || isJoining) && (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'flex-end',
                position: 'fixed',
                bottom: '120px',
                left: 0,
                width: '100%',
                zIndex: 1000,
            }}>
                <div className="spinner"></div>
            </div>
        )}

        {transactionError && <Alert type="error" message={transactionError} onClose={() => setTransactionError(null) } />}

        {(transactionSuccess && !isJoining) && <Alert type="success" message={transactionSuccess} onClose={() => setTransactionSuccess(null) } />}
       
        {isReferrerModalOpen && buildViewerNumber==0 && (
            <div className="referrer-modal">
                <div className="referrer-modal-content">
                    <h1 className="referrer-modal-title">Join early access, use a referral to get $1 free</h1>
                    <div  style={{marginBottom: "10px"}}>
                        <span style={{fontFamily: "terminus", marginLeft: "10px", marginBottom: "10px"}}>Username:</span>
                        <input type="text" className="referrer-input" placeholder="Username" value={referrerInput} onChange={(e) => {setReferrerInput(e.currentTarget.value)}}/>
                    </div>
                    <div>
                        <span style={{fontFamily: "terminus", marginLeft: "10px", marginBottom: "10px"}}>Referrer:</span>
                        <input type="text" className="referrer-input" placeholder="Username or Wallet address" value={referrerInput} onChange={(e) => {setReferrerInput(e.currentTarget.value)}}/>
                    </div>
                    <div style={{display: "flex", justifyContent: "space-between", margin: "20px 20px"}}>
                        <button className="referrer-modal-btn" onClick={() => {setReferrerInput(""); setIsReferrerModalOpen(false)}}>Cancel</button>
                        <button className="referrer-modal-btn" onClick={() => getRefferal(publicKey)}>Ok</button>
                    </div>
                </div>
            </div>
        )}
        </div>
        </>
    );
};

export default Home;