import { PublicKey } from '@solana/web3.js';
import React,  {useCallback, useEffect, useRef, useState} from 'react';
import Button from "./Button";
import "./SelectGame.scss";

type gameProps = {
    activeGameIds: PublicKey[];
    startFunction: (...args: any[]) => void;  // General function accepting any arguments
};

const SelectGame: React.FC<gameProps> = ({ activeGameIds, startFunction }) => {
    return (
        <div className="game-select">
            <div className="join-game">

            <div className="grid-container-TPX" style={{justifyContent: "left", padding: "5vw", paddingTop: "1vw"}}>
            {activeGameIds.map((item, index) => (
            <div key={index} className="grid-item-TPX">
                <div className="grid-item-claim switchsizes" style={{display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-around", zIndex: "1", marginTop: "1vw",  border: 'solid', borderColor: 'white'}}>
                <div className="titleArea" style={{marginTop: "1vw", marginBottom:"0.5vw"}}>
                    <svg style={{marginRight: "10px"}} stroke="#FFE85C" fill="#FFE85C" stroke-width="0" viewBox="0 0 16 16" focusable="false" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M2.866 14.85c-.078.444.36.791.746.593l4.39-2.256 4.389 2.256c.386.198.824-.149.746-.592l-.83-4.73 3.522-3.356c.33-.314.16-.888-.282-.95l-4.898-.696L8.465.792a.513.513 0 0 0-.927 0L5.354 5.12l-4.898.696c-.441.062-.612.636-.283.95l3.523 3.356-.83 4.73zm4.905-2.767-3.686 1.894.694-3.957a.565.565 0 0 0-.163-.505L1.71 6.745l4.052-.576a.525.525 0 0 0 .393-.288L8 2.223l1.847 3.658a.525.525 0 0 0 .393.288l4.052.575-2.906 2.77a.565.565 0 0 0-.163.506l.694 3.957-3.686-1.894a.503.503 0 0 0-.461 0z"></path></svg>
                    <div id="cardTitle">Supersize Classic</div>
                </div>
                <button onClick={() => {}} style={{border: "none"}}>
                <div className="TPX_card">
                    <img className="dynamic-image" src={`${process.env.PUBLIC_URL}/supersizemaybe.png`}alt="Image"/>
                </div>
                </button>
                    <div id="cardDescWrap" style={{display: "flex", height: "fit-content", marginBottom: "auto", color: "white"}}>
                    <p id="cardDesc" style={{display: "inline-block", float: "left", marginBottom: "0.5vw", marginTop: "0.5vw"}}>Game id: {String(item)}</p> 
                    <p id="cardDesc" style={{display: "inline-block", float: "left", marginBottom: "0.5vw", marginTop: "0.5vw"}}>Players: 0/100</p> 
                    </div>
                    <div className="claim-right-wrapper" style={{  justifyContent: "center"}}>
                    <>
                    <div className="claim-right">
                    <div style={{float: "left", display: "flex", alignItems: "center", justifyContent: "center", marginLeft: "0.1vw"}}>
                    <img id="tpxlogo" src={`${process.env.PUBLIC_URL}/supersizemaybe.png`}alt="Image"/>
                    <div id="tpxCost" style={{ display: "inline-block", textAlign: "center", color: 'black', fontStyle: 'normal', fontWeight: "700", letterSpacing: 'min(.1dvw,.1dvh)', fontFamily: "Terminus"}}>
                        <span style={{ color: "black" }}>0 </span>
                    </div>
                    </div>
                    <Button buttonClass="tpx_claim_button" title={"Play"} onClickFunction={startFunction} args={[item]}/>
                    </div>
                    </>
                    </div>
                </div>
                </div>
                ))}
            </div>
            </div>
        </div>
    );
  };
  
  export default SelectGame;
