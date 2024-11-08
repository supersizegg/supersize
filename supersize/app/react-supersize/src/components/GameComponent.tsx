import React, { useEffect, useRef, useState } from 'react';
import {PublicKey} from "@solana/web3.js";
import BN from 'bn.js';

const foodImage = new Image();
foodImage.src = `${process.env.PUBLIC_URL}/coin.png`; 

interface Blob {
    name: string;
    authority: PublicKey | null;
    x: number;
    y: number;
    radius: number;
    mass: number;
    score: number;
    speed: number;
    removal: BN;
    target_x: number;
    target_y: number;
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
}

const GameComponent: React.FC<GameComponentProps> = ({ gameId, players, visibleFood, currentPlayer, screenSize, scale }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [lastTime, setLastTime] = useState<number>(0);
  const currentPlayerRef = useRef(currentPlayer);
  const playersRef = useRef(players);
  const foodRef = useRef(visibleFood);

  const timeStep = 1000.0 / 60.0;  

  let previousTime = 0.0;
  let delta = 0.0;
  let accumulator = 0.0;
  
  let previousPlayerPos = currentPlayerRef.current;  
  let currentPlayerPos = currentPlayerRef.current; 
  useEffect(() => {
    foodRef.current = visibleFood;
  }, [visibleFood]);
  useEffect(() => {
    playersRef.current = players;
  }, [players]);
  useEffect(() => {
    currentPlayerRef.current = currentPlayer;
    restartTimer();
  }, [currentPlayer]);
  
  const restartTimer = () => {
    previousTime = performance.now();  
    delta = 0.0;
    accumulator = 0.0;  
    currentPlayerPos = currentPlayerRef.current;
  };
  
  const loop = (time: number) => {
    const dt = time - previousTime;  
    previousTime = time;
    
    accumulator += dt;
  
    while (accumulator >= timeStep) {
      previousPlayerPos = currentPlayerPos;
      
      if(currentPlayerPos){
        currentPlayerPos = updatePlayerPosition(currentPlayerPos, currentPlayerPos.target_x, currentPlayerPos.target_y, timeStep);
      }
      accumulator -= timeStep;
    }
    const alpha = accumulator / timeStep;
    if(previousPlayerPos && currentPlayerPos){
      renderWithInterpolation(previousPlayerPos, currentPlayerPos, alpha);
    }

    window.requestAnimationFrame(loop);
  };
  
  const updatePlayerPosition = (
    player: Blob,
    target_x: number,
    target_y: number,
    dt: number 
  ) => {
    const player_x = player.x;
    const player_y = player.y;
    const dx = target_x - player_x;
    const dy = target_y - player_y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const deg = Math.atan2(dy, dx);
  
    let effective_mass = 100.0;
    let true_mass  = player.mass / 10;
    if (true_mass > 100.0) {
      effective_mass = true_mass;
    }
    let slow_down = 1.0;
    if (player.speed <= 6.25) {
      slow_down = Math.log(effective_mass / 10) / 1.504 - 0.531;
    }
    
    let scale_up = 3.0;
    if (true_mass < 100.0) {
      scale_up = -0.01 * true_mass + 4.0;
    }
    const delta_y = (player.speed * scale_up * Math.sin(deg) * (dt / 1000)) / slow_down;
    const delta_x = (player.speed * scale_up * Math.cos(deg) * (dt / 1000)) / slow_down;
  
    player.y = Math.round(player_y + delta_y);
    player.x = Math.round(player_x + delta_x);
  
    player.y = Math.max(0, Math.min(player.y, screenSize.height));
    player.x = Math.max(0, Math.min(player.x, screenSize.width));
  
    return player;
  };
  
  const renderWithInterpolation = (prevPos:Blob, currPos:Blob, alpha:number) => {
    const interpolatedX = prevPos.x + (currPos.x - prevPos.x) * alpha;
    const interpolatedY = prevPos.y + (currPos.y - prevPos.y) * alpha;
    if(currentPlayerRef.current){
      currentPlayerRef.current.x = interpolatedX;
      currentPlayerRef.current.y = interpolatedY;
    }
    if (gameId !== null && currentPlayerRef.current) {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          
          canvas.width = screenSize.width * scale;
          canvas.height = screenSize.height * scale;

          ctx.clearRect(0, 0, canvas.width, canvas.height);

          playersRef.current.forEach(blob => {
            drawPlayer(ctx, blob, scale);
          });

          foodRef.current.forEach(food => {
            drawFood2(ctx, food, scale);
          });

          if (currentPlayerRef.current) {
            const centeredPlayer = {
              ...currentPlayerRef.current,
              x: screenSize.width / 2,
              y: screenSize.height / 2,
            };
            drawPlayer(ctx, centeredPlayer, scale);
            drawBorder(ctx, currentPlayerRef.current, screenSize, scale);
          }
        }
      }
    }
  };
  
  useEffect(() => {
    window.requestAnimationFrame((time) => { 
      previousTime = time;
      window.requestAnimationFrame(loop);
    });
  }, [gameId]);

  useEffect(() => {
    if (gameId !== null) {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          canvas.width = screenSize.width * scale;
          canvas.height = screenSize.height * scale;

          ctx.clearRect(0, 0, canvas.width, canvas.height);

          players.forEach(blob => {
            drawPlayer(ctx, blob, scale);
          });

          visibleFood.forEach(food => {
            drawFood2(ctx, food, scale);
          });

          if (currentPlayer) {
            const centeredPlayer = {
              ...currentPlayer,
              x: screenSize.width / 2,
              y: screenSize.height / 2,
            };
            drawPlayer(ctx, centeredPlayer, scale);
            drawBorder(ctx, currentPlayer, screenSize, scale);
          }
        }
      }
    }
  }, [gameId, players, visibleFood, currentPlayer, screenSize, scale]);

  const drawPlayer = (ctx: CanvasRenderingContext2D, blob: Blob, scale: number) => {
    let glowSize = 0;
    let glowIntensity = 'rgba(19, 241, 149, 0)'; 
   /*
    if (blob.speed > 10 || (Date.now()/1000 - blob.charging > 1 && blob.charging !=0)) {
        glowSize = 40 * scale; // Significant glow at speed 10
        glowIntensity = 'rgba(19, 241, 149, 0.5)';
    }
    if (blob.speed > 15 || (Date.now()/1000 - blob.charging > 2.3 && blob.charging !=0)) {
        glowSize = 70 * scale; // Brighter and bigger glow at speed 15
        glowIntensity = 'rgba(19, 241, 149, 0.7)';
    }
    if (blob.speed > 20 || (Date.now()/1000 - blob.charging > 3.6 && blob.charging !=0)) {
        glowSize = 85 * scale; // Even brighter and bigger glow at speed 20
        glowIntensity = 'rgba(19, 241, 149, 0.9)';
    }
    if (blob.speed > 25 || (Date.now()/1000 - blob.charging > 5 && blob.charging !=0)) {
        glowSize = 100 * scale; // Maximum glow at speed 25+
        glowIntensity = 'rgba(19, 241, 149, 1.0)';
    }
    */

    ctx.shadowBlur = glowSize;
    ctx.shadowColor = glowIntensity;

    ctx.beginPath();
    ctx.arc(blob.x * scale, blob.y * scale, blob.radius * scale, 0, 2 * Math.PI);
    ctx.fillStyle = '#13F195'; 
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.shadowColor = 'rgba(0, 0, 0, 0)';

    ctx.fillStyle = 'black'; 
    ctx.font = `${blob.radius * scale * 0.3}px Arial`; 
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(blob.name, blob.x * scale, blob.y * scale);
};

  const drawFood = (ctx: CanvasRenderingContext2D, food: Food, scale: number) => {
    ctx.beginPath();
    ctx.arc(food.x * scale, food.y * scale, 10 * scale, 0, 2 * Math.PI);
    ctx.fillStyle = 'white'; 
    ctx.fill();
    ctx.stroke();
  };
  const drawFood2 = (ctx: CanvasRenderingContext2D, food: Food, scale: number) => {
    const diameter = 20 * scale; 
    if (foodImage.complete) {
      ctx.drawImage(
        foodImage, 
        food.x * scale - diameter / 2,  
        food.y * scale - diameter / 2,  
        diameter,                       
        diameter                       
      );
    } else {
      ctx.beginPath();
      ctx.arc(food.x * scale, food.y * scale, 10, 0, 2 * Math.PI); 
      ctx.fillStyle = 'white';
      ctx.fill();
      ctx.stroke();
    }
  };

  const drawBorder = (ctx: CanvasRenderingContext2D, currentPlayer: Blob, screenSize: { width: number; height: number }, scale: number) => {
    const gameSize = screenSize.width;
    const offsetX = currentPlayer.x - screenSize.width / 2;
    const offsetY = currentPlayer.y - screenSize.height / 2;

    ctx.beginPath();
    ctx.moveTo((0 - offsetX) * scale, (0 - offsetY) * scale);
    ctx.lineTo((gameSize - offsetX) * scale, (0 - offsetY) * scale);
    ctx.strokeStyle = 'red';
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo((gameSize - offsetX) * scale, (0 - offsetY) * scale);
    ctx.lineTo((gameSize - offsetX) * scale, (gameSize - offsetY) * scale);
    ctx.strokeStyle = 'red';
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo((gameSize - offsetX) * scale, (gameSize - offsetY) * scale);
    ctx.lineTo((0 - offsetX) * scale, (gameSize - offsetY) * scale);
    ctx.strokeStyle = 'red';
    ctx.stroke();

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
