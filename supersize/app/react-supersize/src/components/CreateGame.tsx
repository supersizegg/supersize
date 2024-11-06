import { PublicKey } from '@solana/web3.js';
import React,  {useCallback, useEffect, useRef, useState} from 'react';
import Button from "./Button";
import "./CreateGame.scss";

type gameProps = {
    game_size: number,
    userKey: string,
    initFunction: (...args: any[]) => void;  // General function accepting any arguments
};

type FormData = [number, number, number, string, string, string];

const CreateGame: React.FC<gameProps> = ({ game_size, userKey, initFunction }) => {
    //game_size: number, max_buyin: number, min_buyin: number, game_owner_wallet_string: string, game_token_string: string, game_name: string
    const [formData, setFormData] = useState<FormData>([game_size, 10.0, 0.1, userKey, "AsoX43Q5Y87RPRGFkkYUvu8CSksD9JXNEqWVGVsr8UEp", "ffa"]);
    const handleChange = (index: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const { type, checked, value } = e.target;
      const updatedFormData = [...formData] as FormData;
      if (index > 2){
        updatedFormData[index] = value as string;
      }
      else{
        updatedFormData[index] = parseFloat(value) as number; 
      }
      setFormData(updatedFormData);
    };
  
    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      console.log('Form Data Submitted:', formData);
    };
      {/*<div className="container">*/}  
    return (
        <form className="form-box" onSubmit={handleSubmit}>
          <h2 className="form-title">Game Settings</h2>
          <label>
          <span style={{marginBottom:"5px", marginLeft:"10px" }}>Name</span>
            <input type="text"  id="forminput" name="game_name" value={String(formData[5])} onChange={handleChange(5)} />
          </label>
          <label>
          <span style={{marginBottom:"5px", marginLeft:"10px" }}>Max Buy-In</span>
            <input className="no-arrows"  id="forminput" type="number" name="buy_in_min" value={String(formData[1])} onChange={handleChange(1)} />
          </label>
          <label>
          <span style={{marginBottom:"5px", marginLeft:"10px" }}>Min Buy-In</span>
            <input className="no-arrows"  id="forminput" type="number" name="buy_in_max" value={String(formData[2])} onChange={handleChange(2)} />
          </label>
          <label>
          <span style={{marginBottom:"5px", marginLeft:"10px" }}>Token (mint address)</span>
            <input className="no-arrows"  id="forminput" type="text" name="game_token" value={String(formData[4])} onChange={handleChange(4)} />
          </label>
          <label style={{marginBottom:"5px"}}>
          <span style={{marginBottom:"5px", marginLeft:"10px" }}>Game Owner (wallet address)</span>
            <input className="no-arrows"  id="forminput" type="text" name="game_owner" value={String(formData[3])} onChange={handleChange(3)} />
          </label>
          <Button buttonClass="create-game-button" title={"Create Game"} onClickFunction={initFunction} args={formData}/>  
        </form>
    );
  };
  
  export default CreateGame;
