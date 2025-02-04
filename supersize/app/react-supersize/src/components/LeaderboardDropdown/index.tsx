import React, { useEffect, useRef, useState } from "react";
import { fetchTokenMetadata } from "@utils/helper";
import "./LeaderboardDropdown.scss";

const LeaderboardDropdown = () => {
  const network = "devnet"; //"mainnet";
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const tokens = [
    {
      network: "devnet",
      token: "AsoX43Q5Y87RPRGFkkYUvu8CSksD9JXNEqWVGVsr8UEp",
    },
    {
      network: "mainnet",
      token: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    },
  ];
  const leaderBoardOptions = useRef([{ icon: `${process.env.PUBLIC_URL}/token.png`, name: "LOADING" }]);
  const [season, setSeason] = useState({
    icon: `${process.env.PUBLIC_URL}/token.png`,
    name: "LOADING",
  });

  useEffect(() => {
    const loadTokenMetadata = async () => {
      try {
        const matchedTokens = tokens.filter((token) => token.network === network);

        const promises = matchedTokens.map(async (token) => {
          const metadata = await fetchTokenMetadata(token.token, network);
          return {
            icon: metadata.image,
            name: metadata.name,
          };
        });

        const optionsData = await Promise.all(promises);

        leaderBoardOptions.current = optionsData;
        setSeason(leaderBoardOptions.current[0]);
        console.log("Updated options:", leaderBoardOptions.current);
      } catch (error) {
        console.error("Error loading token metadata:", error);
      }
    };

    loadTokenMetadata();
  }, [network]);

  return (
    <div className="leaderboard-dropdown">
      <div className="dropdown-toggle" onClick={() => setIsDropdownOpen((prev) => !prev)}>
        <img src={season.icon} alt={season.name} />
        {season.name}
      </div>

      {isDropdownOpen && (
        <div className="dropdown-menu">
          {leaderBoardOptions.current
            .filter((option) => option.name !== season.name)
            .map((option) => (
              <div
                key={option.name}
                className="dropdown-item"
                onClick={(e) => {
                  e.stopPropagation();
                  setSeason({ icon: option.icon, name: option.name });
                  setIsDropdownOpen(false);
                }}
              >
                <img src={option.icon} alt={option.name} />
                {option.name}
              </div>
            ))}
        </div>
      )}
    </div>
  );
};

export default LeaderboardDropdown;
