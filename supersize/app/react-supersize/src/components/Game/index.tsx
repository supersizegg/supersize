import React, { useEffect, useRef } from 'react';
import {PublicKey} from "@solana/web3.js";
import BN from 'bn.js';

const foodImage = new Image();
const foodImage2 = new Image();
const foodImage3 = new Image();
const foodImage4 = new Image();
const foodImage5 = new Image();
const foodImage6 = new Image();
const foodImage7 = new Image();
const foodImage8 = new Image();
const foodImage9 = new Image();
const foodImage10 = new Image();
const foodImage11 = new Image();
const foodImage12 = new Image();
const foodImage13 = new Image();
const foodImage14 = new Image();
const foodImage15 = new Image();

foodImage.src = `${process.env.PUBLIC_URL}/coin.png`; 
foodImage2.src = `${process.env.PUBLIC_URL}/coin2o.png`; 
foodImage3.src = `${process.env.PUBLIC_URL}/coin3o.png`; 
foodImage4.src = `${process.env.PUBLIC_URL}/coin4o.png`; 
foodImage5.src = `${process.env.PUBLIC_URL}/coin5o.png`; 
foodImage6.src = `${process.env.PUBLIC_URL}/coin6o.png`; 
foodImage7.src = `${process.env.PUBLIC_URL}/coin7o.png`; 
foodImage8.src = `${process.env.PUBLIC_URL}/coin8o.png`; 
foodImage9.src = `${process.env.PUBLIC_URL}/coin9o.png`; 
foodImage10.src = `${process.env.PUBLIC_URL}/coin10o.png`; 
foodImage11.src = `${process.env.PUBLIC_URL}/coin11o.png`; 
foodImage12.src = `${process.env.PUBLIC_URL}/coin12o.png`; 
foodImage13.src = `${process.env.PUBLIC_URL}/coin13o.png`; 
foodImage14.src = `${process.env.PUBLIC_URL}/coin14o.png`; 
foodImage15.src = `${process.env.PUBLIC_URL}/coin15o.png`; 

const foodImages = [
  foodImage,  // Size 1
  foodImage2, // Size 2
  foodImage3, // Size 3
  foodImage4, // Size 4
  foodImage5, // Size 5
  foodImage6, // Size 6
  foodImage7, // Size 7
  foodImage8, // Size 8
  foodImage9, // Size 9
  foodImage10, // Size 10
  foodImage11, // Size 11
  foodImage12, // Size 12
  foodImage13, // Size 13
  foodImage14, // Size 14
  foodImage15, // Size 15
];

const playerImage = new Image();
const playerImage2 = new Image();
const playerImage3 = new Image();
const playerImage4 = new Image();
const playerImage5 = new Image();
const playerImage6 = new Image();
const playerImage7 = new Image();
const playerImage8 = new Image();

playerImage.src = `${process.env.PUBLIC_URL}/up.png`; 
playerImage2.src = `${process.env.PUBLIC_URL}/down.png`; 
playerImage3.src = `${process.env.PUBLIC_URL}/up-right.png`; 
playerImage4.src = `${process.env.PUBLIC_URL}/up-left.png`; 
playerImage5.src = `${process.env.PUBLIC_URL}/down-right.png`; 
playerImage6.src = `${process.env.PUBLIC_URL}/down-left.png`; 
playerImage7.src = `${process.env.PUBLIC_URL}/side-right3.png`; 
playerImage8.src = `${process.env.PUBLIC_URL}/side-left3.png`; 

const playerImages = [
  playerImage,  
  playerImage2, 
  playerImage3, 
  playerImage4, 
  playerImage5, 
  playerImage6, 
  playerImage7, 
  playerImage8, 
];

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
  size: number;
}

interface GameComponentProps {
  players: Blob[];
  visibleFood: Food[];
  currentPlayer: Blob | null;
  screenSize: {width: number, height: number};
  gameSize: number;
  newTarget: { x: number; y: number, boost: boolean };
}

const SMOOTHING_FACTOR = 0.03; 

const GameComponent: React.FC<GameComponentProps> = ({ players, visibleFood, currentPlayer, screenSize, gameSize, newTarget}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const playersRef = useRef(players);
  const foodRef = useRef(visibleFood);
  const newTargetRef = useRef(newTarget);

  const timeStep = 60.0; // any value >50 works, testing ~90 

  const previousTime = useRef(0.0);
  const accumulator = useRef(0.0);
  
  const currentPlayerRef = useRef<Blob | null>(null);
  const previousPlayerPos = useRef(currentPlayerRef.current);

  const currentPlayerOnchainRef = useRef<Blob | null>(null);

  useEffect(() => {
    foodRef.current = visibleFood; 
  }, [visibleFood]);

  useEffect(() => {
    newTargetRef.current = newTarget;
  }, [newTarget]);

  useEffect(() => {
    if (players.length > 0) {
      playersRef.current = players;
    }
  }, [players]);
  
  useEffect(() => {
    currentPlayerOnchainRef.current = currentPlayer;
    if(currentPlayerRef.current == null){
      currentPlayerRef.current = currentPlayer;
    }
    if(currentPlayerRef.current && currentPlayer){
      currentPlayerRef.current.radius = currentPlayer.radius;
    }
    playersRef.current = players;
    foodRef.current = visibleFood;
  }, [currentPlayer]);
  
  const updatePlayerPosition = (
    player: Blob,
    target_x: number,
    target_y: number,
    boost: boolean,
  ) => {
    const player_x = player.x;
    const player_y = player.y;
  
    const dx = target_x - player_x;
    const dy = target_y - player_y;
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

    if(boost){
      if (player.mass > 100.0){
        let boosted_speed = 12.0;
        if (true_mass > 100.0) {
          boosted_speed = -0.00008 * true_mass + 12.0; 
        }
        player.speed = boosted_speed;
      }
    }

    const delta_y = (player.speed * scale_up * Math.sin(deg)) / slow_down;
    const delta_x = (player.speed * scale_up * Math.cos(deg)) / slow_down;
  
    player.y = Math.round(player_y + delta_y);
    player.x = Math.round(player_x + delta_x);
  
    player.y = Math.max(0, Math.min(player.y, gameSize));
    player.x = Math.max(0, Math.min(player.x, gameSize));
  
    return player;
  };

  const loop = (time: number) => {
    const dt = time - previousTime.current;
    previousTime.current = time;

    accumulator.current += dt;

    while (accumulator.current >= timeStep) {
      if (currentPlayerRef.current) {
        previousPlayerPos.current = { ...currentPlayerRef.current };
        currentPlayerRef.current = updatePlayerPosition(currentPlayerRef.current, newTargetRef.current.x, newTargetRef.current.y, newTargetRef.current.boost);
      }
      accumulator.current -= timeStep;
    }

    const alpha = accumulator.current / timeStep;

    if (previousPlayerPos.current && currentPlayerRef.current) {
      if(currentPlayerRef.current && currentPlayerOnchainRef.current){
        currentPlayerRef.current.x += SMOOTHING_FACTOR * (currentPlayerOnchainRef.current.x - currentPlayerRef.current.x);
        currentPlayerRef.current.y += SMOOTHING_FACTOR * (currentPlayerOnchainRef.current.y - currentPlayerRef.current.y);
      }
      renderWithInterpolation(previousPlayerPos.current, currentPlayerRef.current, alpha);
    }

    window.requestAnimationFrame(loop);
  };

  const renderWithInterpolation = (prevPos: Blob, currPos: Blob, alpha: number) => {
    if (currentPlayerRef.current) {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          canvas.width = screenSize.width; 
          canvas.height = screenSize.height;

          ctx.clearRect(0, 0, canvas.width, canvas.height);

          const interpolatedX = prevPos.x + (currPos.x - prevPos.x) * alpha;
          const interpolatedY = prevPos.y + (currPos.y - prevPos.y) * alpha;

          playersRef.current.forEach((blob) => {
            const adjustedX =
              blob.x - interpolatedX + screenSize.width / 2;
            const adjustedY =
              blob.y - interpolatedY + screenSize.height / 2;
            if(currentPlayerRef.current){
              drawOpponentPlayer(ctx, { ...blob, x: adjustedX, y: adjustedY }, { ...currentPlayerRef.current, x: interpolatedX, y: interpolatedY });
            }
          });
          
          foodRef.current.forEach((food) => {
            drawFood(ctx, {...food, 
               x: food.x - interpolatedX + screenSize.width / 2,
               y: food.y - interpolatedY + screenSize.height / 2,});
          });

          const centeredPlayer = {
            ...currentPlayerRef.current,
            x: screenSize.width / 2,
            y: screenSize.height / 2,
          };

          drawMyPlayer(ctx, { ...centeredPlayer, x: centeredPlayer.x, y: centeredPlayer.y }, { ...currentPlayerRef.current, x: interpolatedX, y: interpolatedY });
          drawBorder(ctx, { ...currentPlayerRef.current, x: interpolatedX, y: interpolatedY }, screenSize, gameSize);
        }
      }
    }
  };
  
  useEffect(() => {
    window.requestAnimationFrame((time) => { 
      previousTime.current = time;
      window.requestAnimationFrame(loop);
    });
  }, []);

  const drawOpponentPlayer = (ctx: CanvasRenderingContext2D, blob: Blob, myblob: Blob) => {
    let glowSize = 0;
    let glowIntensity = 'rgba(19, 241, 149, 0)'; 

    if(blob.mass > myblob.mass * 1.05){
      glowSize = 50;
      glowIntensity = 'rgba(240, 113, 113, 0.5)'

    }
    else if(myblob.mass > blob.mass * 1.05){
      glowSize = 50;
      glowIntensity = 'rgba(19, 241, 149, 0.5)'; 
    }
    else{
      glowSize = 50;
      glowIntensity = 'rgba(255, 239, 138, 0.5)';
    }

    const diameter = blob.radius * 2;
    const dx = blob.target_x - blob.x; 
    const dy = blob.target_y - blob.y; 
    const angle = Math.atan2(dy, dx);

    let imageIndex = 0;
    if (angle >= -Math.PI / 8 && angle < Math.PI / 8) {
      imageIndex = 6; // Side-right
    } else if (angle >= Math.PI / 8 && angle < 3 * Math.PI / 8) {
      imageIndex = 4; // Down-right
    } else if (angle >= 3 * Math.PI / 8 && angle < 5 * Math.PI / 8) {
      imageIndex = 1; // Down
    } else if (angle >= 5 * Math.PI / 8 && angle < 7 * Math.PI / 8) {
      imageIndex = 5; // Down-left
    } else if (angle >= 7 * Math.PI / 8 || angle < -7 * Math.PI / 8) {
      imageIndex = 7; // Side-left
    } else if (angle >= -7 * Math.PI / 8 && angle < -5 * Math.PI / 8) {
      imageIndex = 3; // Up-left
    } else if (angle >= -5 * Math.PI / 8 && angle < -3 * Math.PI / 8) {
      imageIndex = 0; // Up
    } else if (angle >= -3 * Math.PI / 8 && angle < -Math.PI / 8) {
      imageIndex = 2; // Up-right
    }
  
    const selectedImage = playerImages[imageIndex];
    
    if (selectedImage && selectedImage.complete) {
      ctx.save();
      ctx.shadowBlur = glowSize;
      ctx.shadowColor = glowIntensity;
      ctx.drawImage(
        selectedImage, 
        blob.x - diameter / 2,  
        blob.y - diameter / 2,  
        diameter,                       
        diameter                       
      );
      ctx.restore();
    } else {
      ctx.beginPath();
      ctx.arc(blob.x, blob.y, blob.radius, 0, 2 * Math.PI);
      ctx.fillStyle = '#13F195';
      ctx.fill();
      ctx.stroke();
    }
  };

  const drawMyPlayer = (ctx: CanvasRenderingContext2D, blob: Blob, currentblob: Blob) => {
    const diameter = blob.radius * 2;
    const dx = newTargetRef.current.x - currentblob.x; //currentblob.target_x - currentblob.x; 
    const dy = newTargetRef.current.y - currentblob.y; //currentblob.target_y - currentblob.y; 
    const angle = Math.atan2(dy, dx);

    let imageIndex = 0;
    if (angle >= -Math.PI / 8 && angle < Math.PI / 8) {
      imageIndex = 6; // Side-right
    } else if (angle >= Math.PI / 8 && angle < 3 * Math.PI / 8) {
      imageIndex = 4; // Down-right
    } else if (angle >= 3 * Math.PI / 8 && angle < 5 * Math.PI / 8) {
      imageIndex = 1; // Down
    } else if (angle >= 5 * Math.PI / 8 && angle < 7 * Math.PI / 8) {
      imageIndex = 5; // Down-left
    } else if (angle >= 7 * Math.PI / 8 || angle < -7 * Math.PI / 8) {
      imageIndex = 7; // Side-left
    } else if (angle >= -7 * Math.PI / 8 && angle < -5 * Math.PI / 8) {
      imageIndex = 3; // Up-left
    } else if (angle >= -5 * Math.PI / 8 && angle < -3 * Math.PI / 8) {
      imageIndex = 0; // Up
    } else if (angle >= -3 * Math.PI / 8 && angle < -Math.PI / 8) {
      imageIndex = 2; // Up-right
    }
  
    const selectedImage = playerImages[imageIndex];
  
    if (selectedImage && selectedImage.complete) {
      ctx.drawImage(
        selectedImage, 
        blob.x - diameter / 2,  
        blob.y - diameter / 2,  
        diameter,                       
        diameter                       
      );
    } else {
      ctx.beginPath();
      ctx.arc(blob.x, blob.y, blob.radius, 0, 2 * Math.PI);
      ctx.fillStyle = '#13F195';
      ctx.fill();
      ctx.stroke();
    }
  };

  const drawFood = (ctx: CanvasRenderingContext2D, food: Food) => {
    const diameter = 20; 
    const sizeIndex = food.size - 1;
    const selectedImage = foodImages[sizeIndex]; 
  
    if (selectedImage && selectedImage.complete) {
      ctx.drawImage(
        selectedImage, 
        food.x - diameter / 2,  
        food.y - diameter / 2,  
        diameter,                       
        diameter                       
      );
    } else {
      ctx.beginPath();
      ctx.arc(food.x, food.y, diameter / 2, 0, 2 * Math.PI);
      ctx.fillStyle = 'white';
      ctx.fill();
      ctx.stroke();
    }
  };

  const drawBorder = (ctx: CanvasRenderingContext2D, currentPlayer: Blob, screenSize: { width: number; height: number }, gameSize: number) => {
    const offsetX = currentPlayer.x - screenSize.width / 2;
    const offsetY = currentPlayer.y - screenSize.height / 2;

    ctx.beginPath();
    ctx.moveTo((0 - offsetX), (0 - offsetY));
    ctx.lineTo((gameSize - offsetX), (0 - offsetY));
    ctx.strokeStyle = 'red';
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo((gameSize - offsetX), (0 - offsetY));
    ctx.lineTo((gameSize - offsetX), (gameSize - offsetY));
    ctx.strokeStyle = 'red';
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo((gameSize - offsetX), (gameSize - offsetY));
    ctx.lineTo((0 - offsetX), (gameSize - offsetY));
    ctx.strokeStyle = 'red';
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo((0 - offsetX), (gameSize - offsetY));
    ctx.lineTo((0 - offsetX), (0 - offsetY));
    ctx.strokeStyle = 'red';
    ctx.stroke();
};

  return (
      <canvas id="gamecanvas" ref={canvasRef} style={{ position: "relative", width: "100%", height: "100%",display: "block", backgroundImage: "url('/space-bg.jpg')", backgroundSize: "cover" }}></canvas>
  );
};

export default GameComponent;
