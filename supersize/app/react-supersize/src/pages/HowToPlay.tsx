import React from "react";
import { MenuBar } from "@components/menu/MenuBar";
import Footer from "@components/Footer";
import "./HowToPlay.scss";

const HowToPlay: React.FC = () => {
  return (
    <div className="main-container">
      <MenuBar />

      <div className="how-to-play-container">
        <div className="top-blocks-row">
          <div className="block block1">
            <h2>About Supersize</h2>
            <p>
              Supersize is a high-stakes multiplayer game. Players must eat free food or other smaller players on the
              map. If you get eaten, you lose your buy-in.
            </p>
          </div>

          <div className="block block2">
            <h2>Size Matters</h2>
            <p>
              Bigger players move slower than smaller players but can expend tokens to boost forward and eat them. Use
              the <b>left click to boost</b>.
            </p>
            <div className="alert-box">
              <p>
                Your size represents the number of tokens. For example, if you have size 5 on the USDC map, that means
                you can withdraw $5 USDC minus fees.
              </p>
            </div>
          </div>
        </div>

        <div className="block block3">
          <div className="block3-text">
            <p>
              Supersize is playable with any SPL token. Players can exit the game at any time to receive their score in
              tokens.
            </p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default HowToPlay;
