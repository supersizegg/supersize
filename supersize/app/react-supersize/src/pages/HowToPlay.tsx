import React from "react";
import { MenuBar } from "@components/menu/MenuBar";
import Footer from "@components/Footer";
import "./HowToPlay.scss";

const HowToPlay: React.FC = () => {
  return (
    <div className="main-container">
      <MenuBar />

      <div className="how-to-play-container">
        <div className="head-block">
          <h1>Supersize is a high-stakes eat or be eaten multiplayer game on Solana</h1>
        </div>

        <div className="top-blocks-row">
          <div className="block block1">
            <h2>Join a Game</h2>
            <p>
              Every Supersize game has a token and a buy-in range. Choose your buy-in, pay, then spawn as a blob with
              size equal to your buy-in.
            </p>
          </div>

          <div className="block block2">
            <h2>Gameplay Basics</h2>
            <p>
              Your blob follows your mouse. Bigger players move slower than smaller players but can expend tokens to
              boost forward. Use the <b>left click to boost</b>.
            </p>
          </div>

          <div className="block block3">
            <div className="block3-text">
              <h2>Size Matters</h2>
              <p>Your size represents tokens. For example, if you have size 5 on the USDC map, you have $5.</p>
            </div>
            <div className="block3-image">
              <img src={`${process.env.PUBLIC_URL}/size-meme.png`} alt="Your size is not size" />
            </div>
          </div>
        </div>

        <div className="top-blocks-row">
          <div className="block block1">
            <h2>Eat Food</h2>
            <p>
              When a new player joins a game, free tokens are added to the map in the form of food. Eat food to grow.
            </p>
          </div>

          <div className="block block2">
            <h2>Eat Players</h2>
            <p>Bigger players can eat smaller players to gain their mass and steal their tokens.</p>
          </div>

          <div className="block block2">
            <h2>Cash Out</h2>
            <p>
              Exit the game anytime to cash out your tokens. There is a 5 second delay on exit and a 2% fee on cash out.
            </p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default HowToPlay;
