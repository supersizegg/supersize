import React, { useEffect, useRef, useState } from 'react';
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

interface Food {
  x: number;
  y: number;
}

interface GameComponentProps {
  gameId: PublicKey | null;
  players: Blob[];
  visibleFood: Food[];
  currentPlayer: Blob | null;
  screenSize: { width: number; height: number };
  scale: number;
  chargeStart: number;
}

const GameComponent: React.FC<GameComponentProps> = ({ gameId, players, visibleFood, currentPlayer, screenSize, scale, chargeStart }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [lastTime, setLastTime] = useState<number>(0);

  useEffect(() => {
    if (gameId !== null) {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Set canvas size
          canvas.width = screenSize.width * scale;
          canvas.height = screenSize.height * scale;

          // Clear the canvas
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          // Draw players
          players.forEach(blob => {
            drawPlayer(ctx, blob, scale, 0);
          });

          // Draw food
          visibleFood.forEach(food => {
            drawFood(ctx, food, scale);
          });

          // Draw current player
          if (currentPlayer) {
            const centeredPlayer = {
              ...currentPlayer,
              x: screenSize.width / 2,
              y: screenSize.height / 2,
            };
            drawPlayer(ctx, centeredPlayer, scale, chargeStart);
            drawBorder(ctx, currentPlayer, screenSize, scale);
          }
        }
      }
    }
  }, [gameId, players, visibleFood, currentPlayer, screenSize, scale]);

  const drawPlayer = (ctx: CanvasRenderingContext2D, blob: Blob, scale: number, chargeStart: number) => {
    // Determine glow intensity based on speed
    let glowSize = 0;
    let glowIntensity = 'rgba(19, 241, 149, 0)'; // Default no glow
   // console.log(Date.now()/1000 - blob.charging, blob.charging)
    if (blob.speed > 10 || (Date.now()/1000 - blob.charging > 1 && blob.charging !=0)) {
        glowSize = 40 * scale; // Significant glow at speed 10
        glowIntensity = 'rgba(19, 241, 149, 0.5)';
    }
    if (blob.speed > 15 || (Date.now()/1000 - blob.charging > 2.3 && blob.charging !=0)) {
        glowSize = 70 * scale; // Brighter and bigger glow at speed 15
        glowIntensity = 'rgba(19, 241, 149, 0.7)';
    }
    if (blob.speed > 20 || (Date.now()/1000 - blob.charging > 3.6 && blob.charging !=0)) {
        glowSize = 100 * scale; // Even brighter and bigger glow at speed 20
        glowIntensity = 'rgba(19, 241, 149, 0.9)';
    }
    if (blob.speed > 25 || (Date.now()/1000 - blob.charging > 5 && blob.charging !=0)) {
        glowSize = 150 * scale; // Maximum glow at speed 25+
        glowIntensity = 'rgba(19, 241, 149, 1.0)';
    }

    ctx.shadowBlur = glowSize;
    ctx.shadowColor = glowIntensity;

    // Draw the player
    ctx.beginPath();
    ctx.arc(blob.x * scale, blob.y * scale, blob.radius * scale, 0, 2 * Math.PI);
    ctx.fillStyle = '#13F195'; // Player color
    ctx.fill();
    ctx.stroke();

    // Reset shadow for the next draw calls
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'rgba(0, 0, 0, 0)';

    // Draw the player's score at the center of the player
    ctx.fillStyle = 'black'; // Text color
    ctx.font = `${blob.radius * scale * 0.5}px Arial`; // Font size relative to the player radius
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(Math.round(blob.score).toString(), blob.x * scale, blob.y * scale);
};

  const drawFood = (ctx: CanvasRenderingContext2D, food: Food, scale: number) => {
    ctx.beginPath();
    ctx.arc(food.x * scale, food.y * scale, 10 * scale, 0, 2 * Math.PI);
    ctx.fillStyle = 'white'; // Change color as needed
    ctx.fill();
    ctx.stroke();
  };

  const drawBorder = (ctx: CanvasRenderingContext2D, currentPlayer: Blob, screenSize: { width: number; height: number }, scale: number) => {
    const gameSize = screenSize.width;
    //console.log(currentPlayer.x , currentPlayer.y )
    const offsetX = currentPlayer.x - screenSize.width / 2;
    const offsetY = currentPlayer.y - screenSize.height / 2;

    // Draw top border
    ctx.beginPath();
    ctx.moveTo((0 - offsetX) * scale, (0 - offsetY) * scale);
    ctx.lineTo((gameSize - offsetX) * scale, (0 - offsetY) * scale);
    ctx.strokeStyle = 'red';
    ctx.stroke();

    // Draw right border
    ctx.beginPath();
    ctx.moveTo((gameSize - offsetX) * scale, (0 - offsetY) * scale);
    ctx.lineTo((gameSize - offsetX) * scale, (gameSize - offsetY) * scale);
    ctx.strokeStyle = 'red';
    ctx.stroke();

    // Draw bottom border
    ctx.beginPath();
    ctx.moveTo((gameSize - offsetX) * scale, (gameSize - offsetY) * scale);
    ctx.lineTo((0 - offsetX) * scale, (gameSize - offsetY) * scale);
    ctx.strokeStyle = 'red';
    ctx.stroke();

    // Draw left border
    ctx.beginPath();
    ctx.moveTo((0 - offsetX) * scale, (gameSize - offsetY) * scale);
    ctx.lineTo((0 - offsetX) * scale, (0 - offsetY) * scale);
    ctx.strokeStyle = 'red';
    ctx.stroke();
};

  return (
      <canvas id="gamecanvas" ref={canvasRef} style={{ position: "relative", width: "100%", height: "100%",display: gameId !== null ? 'block' : 'none' }}></canvas>
  );
};

export default GameComponent;
