import React, { useState } from "react";
import LanchGame from "@components/LaunchGame";
import EarnFees from "@components/EarnFees";
import ModGame from "@components/ModGame";
import { ActiveGame } from "@utils/types";
import { MenuBar } from "@components/menu/MenuBar";
import FooterLink from "@components/Footer";
import { FetchedGame } from "@utils/types";
import "./CreateGame.scss";

type CreateGameProps = {
  activeGamesLoaded: FetchedGame[];
  setActiveGamesLoaded: React.Dispatch<React.SetStateAction<FetchedGame[]>>;
};

const CreateGame: React.FC<CreateGameProps> = ({ activeGamesLoaded, setActiveGamesLoaded }) => {
  const tabs = [0, 1, 2];
  const [tab, setTab] = useState(0);

  return (
    <div className="main-container">
      <MenuBar />
      <div className="create-game-wrapper">
        <div className="create-game-card">
          {tab === 0 ? (
            <LanchGame activeGamesLoaded={activeGamesLoaded} setActiveGamesLoaded={setActiveGamesLoaded} />
          ) : tab === 1 ? (
            <EarnFees />
          ) : (
            <ModGame />
          )}
        </div>
        <div className="tab-selector">
          {tabs.map((tabIdx) => (
            <div
              key={tabIdx}
              className={`tab-dot ${tabIdx === tab ? "active" : ""}`}
              onClick={() => setTab(tabIdx)}
            ></div>
          ))}
        </div>
      </div>
      <FooterLink />
    </div>
  );
};

export default CreateGame;
