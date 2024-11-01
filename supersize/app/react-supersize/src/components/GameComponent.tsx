import React, { useEffect, useRef, useState } from 'react';
import {PublicKey} from "@solana/web3.js";
import BN from 'bn.js';

const foodImage = new Image();
foodImage.src = `${process.env.PUBLIC_URL}/coin.png`; // Update with your image path

interface Blob {
    name: string;
    authority: PublicKey;
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

  const timeStep = 1000.0 / 60.0;  // Time step for 60 FPS in milliseconds

  let previousTime = 0.0;
  let delta = 0.0;
  let accumulator = 0.0;
  
  let previousPlayerPos = currentPlayerRef.current;  // Store previous player position
  let currentPlayerPos = currentPlayerRef.current;  // Current position being updated
  useEffect(() => {
    foodRef.current = visibleFood;
  }, [visibleFood]);
  useEffect(() => {
    playersRef.current = players;
  }, [players]);
  useEffect(() => {
    // Whenever currentPlayer updates, update the ref and reset the timer
    currentPlayerRef.current = currentPlayer;
    restartTimer();
  }, [currentPlayer]);
  
  const restartTimer = () => {
    previousTime = performance.now();  // Reset previousTime to the current time in milliseconds
    delta = 0.0;
    accumulator = 0.0;
  
    // Set the current player position based on the true position
    currentPlayerPos = currentPlayerRef.current;
  };
  
  const loop = (time: number) => {
    const dt = time - previousTime;  // Time delta in milliseconds
    previousTime = time;
    
    accumulator += dt;
  
    while (accumulator >= timeStep) {
      // Before updating, store the previous position for interpolation
      previousPlayerPos = currentPlayerPos;
  
      // Simulate updating the current player position based on the game logic
      if(currentPlayerPos){
        //maybe update target to prediction
        currentPlayerPos = updatePlayerPosition(currentPlayerPos, currentPlayerPos.target_x, currentPlayerPos.target_y, timeStep);
      }
      // Reduce accumulated time
      accumulator -= timeStep;
    }
  
    // Calculate interpolation factor (alpha)
    const alpha = accumulator / timeStep;
  
    // Interpolate between previous and current player positions
    if(previousPlayerPos && currentPlayerPos){
      renderWithInterpolation(previousPlayerPos, currentPlayerPos, alpha);
    }
  
    // Repeat the loop
    window.requestAnimationFrame(loop);
  };
  
  const updatePlayerPosition = (
    player: Blob,
    target_x: number,
    target_y: number,
    dt: number // Add dt to track the exact time delta
  ) => {
    const player_x = player.x;
    const player_y = player.y;
  
    // Calculate the difference between target and current position
    const dx = target_x - player_x;
    const dy = target_y - player_y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const deg = Math.atan2(dy, dx);
  
    // Determine slowdown based on mass
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
    // Calculate movement based on speed, direction, and slow_down factor
    const delta_y = (player.speed * scale_up * Math.sin(deg) * (dt / 1000)) / slow_down;
    const delta_x = (player.speed * scale_up * Math.cos(deg) * (dt / 1000)) / slow_down;
  
    // Update player position
    player.y = Math.round(player_y + delta_y);
    player.x = Math.round(player_x + delta_x);
  
    // Ensure player position stays within map bounds
    player.y = Math.max(0, Math.min(player.y, screenSize.height));
    player.x = Math.max(0, Math.min(player.x, screenSize.width));
  
    return player;
  };

  /*const updatePlayerPosition = (timeStep: number) => {
    // Update the current player position based on the game logic.
    // For example, apply movement, physics, etc.
    // This updates the position at each time step.
    currentPlayerPos.x += currentPlayerRef.current.speedX * (timeStep / 1000);  // Convert ms to seconds
    currentPlayerPos.y += currentPlayerRef.current.speedY * (timeStep / 1000);  // Convert ms to seconds
  };*/
  
  const renderWithInterpolation = (prevPos:Blob, currPos:Blob, alpha:number) => {
    // Interpolate the player's position for smooth rendering
    const interpolatedX = prevPos.x + (currPos.x - prevPos.x) * alpha;
    const interpolatedY = prevPos.y + (currPos.y - prevPos.y) * alpha;
    if(currentPlayerRef.current){
      currentPlayerRef.current.x = interpolatedX;
      currentPlayerRef.current.y = interpolatedY;
    }
    // Use the interpolated values to render smoothly
    //drawPlayer(interpolatedX, interpolatedY);
    if (gameId !== null && currentPlayerRef.current) {
      //const delat = (time - previousTime) / 1000;
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
          playersRef.current.forEach(blob => {
            drawPlayer(ctx, blob, scale);
          });

          // Draw food
          foodRef.current.forEach(food => {
            drawFood2(ctx, food, scale);
          });

          // Draw current player
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
  
  // Launch the loop initially
  useEffect(() => {
    // First requestAnimationFrame to set the initial previousTime
    window.requestAnimationFrame((time) => { 
      previousTime = time;

      // Start the loop with the second requestAnimationFrame
      window.requestAnimationFrame(loop);
    });
  }, [gameId]);

  // Update the ref whenever currentPlayerBlob changes
  /*
  useEffect(() => {
    currentPlayerRef.current = currentPlayer;
  }, [currentPlayer]);
  useEffect(() => {
    foodRef.current = visibleFood;
  }, [visibleFood]);
  useEffect(() => {
    playersRef.current = players;
  }, [players]);
  
  let previousTime = 0.0;
  let delta = 0.0;
  const timeStep = 1000.0 / 60.0; // Approximately 16.67 ms
  // The game loop function
  const loop = (time: number) => {
    // Compute the delta-time against the previous time
    const dt = time - previousTime;

    // Accumulate delta time
    delta += dt;

    // Update the previous time
    previousTime = time;

    // Update your game in fixed steps
    while (delta > timeStep) {
      delta -= timeStep;
    
    //console.log(currentPlayer, currentPlayerBlob)

    // Render your game
    if (gameId !== null && currentPlayerRef.current) {
      //const delat = (time - previousTime) / 1000;
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
          playersRef.current.forEach(blob => {
            drawPlayer(ctx, blob, scale, 0);
          });

          // Draw food
          foodRef.current.forEach(food => {
            drawFood2(ctx, food, scale);
          });

          // Draw current player
          if (currentPlayerRef.current) {
            const centeredPlayer = {
              ...currentPlayerRef.current,
              x: screenSize.width / 2,
              y: screenSize.height / 2,
            };
            drawPlayer(ctx, centeredPlayer, scale, chargeStart);
          }
        }
      }
    }
    }
    // Repeat
    window.requestAnimationFrame(loop);
  };*/

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
            drawPlayer(ctx, blob, scale);
          });

          // Draw food
          visibleFood.forEach(food => {
            drawFood2(ctx, food, scale);
          });

          // Draw current player
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
    // Determine glow intensity based on speed
    let glowSize = 0;
    let glowIntensity = 'rgba(19, 241, 149, 0)'; // Default no glow
   // console.log(Date.now()/1000 - blob.charging, blob.charging)
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
    ctx.font = `${blob.radius * scale * 0.3}px Arial`; // Font size relative to the player radius
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(blob.name, blob.x * scale, blob.y * scale);
};

  const drawFood = (ctx: CanvasRenderingContext2D, food: Food, scale: number) => {
    ctx.beginPath();
    ctx.arc(food.x * scale, food.y * scale, 10 * scale, 0, 2 * Math.PI);
    ctx.fillStyle = 'white'; // Change color as needed
    ctx.fill();
    ctx.stroke();
  };
  const drawFood2 = (ctx: CanvasRenderingContext2D, food: Food, scale: number) => {
    const diameter = 20 * scale; // The diameter of the circle which is used as the bounding box size
  
    if (foodImage.complete) {
      // Draw the image within the bounding box of the circle
      ctx.drawImage(
        foodImage, 
        food.x * scale - diameter / 2,  // Center the image on the food's x position
        food.y * scale - diameter / 2,  // Center the image on the food's y position
        diameter,                       // Width of the bounding box
        diameter                        // Height of the bounding box
      );
    } else {
      // Fallback to drawing a circle if the image is not loaded
      ctx.beginPath();
      ctx.arc(food.x * scale, food.y * scale, 10 * scale, 0, 2 * Math.PI); // Circle radius is 10 * scale
      ctx.fillStyle = 'white';
      ctx.fill();
      ctx.stroke();
    }
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
