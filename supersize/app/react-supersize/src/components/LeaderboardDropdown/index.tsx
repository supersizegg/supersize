import React, { useEffect, useRef, useState } from "react";
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

  const fetchTokenMetadata = async (
    tokenAddress: string,
    network: string,
  ): Promise<{ name: string; image: string }> => {
    try {
      const rpcEndpoint = `https://${network}.helius-rpc.com/?api-key=07a045b7-c535-4d6f-852b-e7290408c937`;

      const response = await fetch(rpcEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "getAsset",
          params: [tokenAddress],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error fetching asset:", errorText);
        throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error.message);
      }

      const content = data.result?.content;
      if (!content) {
        throw new Error("Content not found in response");
      }

      const jsonUri = content.json_uri;
      if (jsonUri) {
        const metadataResponse = await fetch(jsonUri);
        if (!metadataResponse.ok) {
          const errorText = await metadataResponse.text();
          console.error("Error fetching metadata from json_uri:", errorText);
          throw new Error(`HTTP Error: ${metadataResponse.status} ${metadataResponse.statusText}`);
        }
        const metadataJson = await metadataResponse.json();
        return {
          name: metadataJson.name || "Unknown",
          image: metadataJson.image || "",
        };
      }

      const name = content.metadata?.symbol || "Unknown";
      const image = content.links?.image || content.files?.[0]?.uri || "";

      if (!image) {
        throw new Error("Image URI not found");
      }

      return { name, image };
    } catch (error) {
      console.error("Error fetching token metadata:", error);
      throw error;
    }
  };

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
