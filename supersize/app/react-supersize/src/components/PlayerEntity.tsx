import React from 'react';
import "./PlayerEntity.scss";
import { motion } from "framer-motion";
import {PublicKey} from "@solana/web3.js";

interface Blob {
    authority: PublicKey;
    x: number;
    y: number;
    radius: number;
    mass: number;
    score: number;
    speed: number;
    charging: number;
}

type PlayerProps = {
    blob: Blob;
    scale: number;
};

const PlayerEntity : React.FC<PlayerProps> = ({blob, scale}) => {
    return (
      <div style={{
        position: 'relative', //absolute for player 1 so long as on center, viewbox centered on player 1, relative for other players
        left: `${(blob.x - blob.radius)*scale}px`,
        top: `${(blob.y - blob.radius)*scale}px`,
        width: `${blob.radius*2*scale}px`,
        height: `${blob.radius*2*scale}px`,
        borderRadius: '50%',
        backgroundColor: 'blue', // Customize color as needed
        textAlign: 'center',
        lineHeight: `${blob.mass}px`,
        color: 'white'
      }}>
        {blob.score}
      </div>
    );
  };
  
export default PlayerEntity;
