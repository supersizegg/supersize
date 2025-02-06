import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useWallet } from "@solana/wallet-adapter-react";
import { MenuBar } from "@components/menu/MenuBar";
import LeaderboardDropdown from "@components/LeaderboardDropdown";
import Footer from "@components/Footer";
import { fetchTokenMetadata } from "@utils/helper";
import { NETWORK } from "@utils/constants";
import "./Leaderboard.scss";

interface Player {
  name: string;
  total: number;
}
interface UserInfo {
  position: number;
  points: number;
}

const Leaderboard: React.FC = () => {
  const [season, setSeason] = useState({
    icon: `${process.env.PUBLIC_URL}/token.png`,
    name: "LOADING",
  });
  const users = useRef<Player[]>([]);
  const usersLen = useRef(0);

  const [rank, setRank] = useState<number | null>(null);
  const { publicKey } = useWallet();

  const tokens = [
    { network: "devnet", token: "AsoX43Q5Y87RPRGFkkYUvu8CSksD9JXNEqWVGVsr8UEp" },
    { network: "mainnet", token: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" },
    { network: "mainnet", token: "7dnMwS2yE6NE1PX81B9Xpm7zUhFXmQABqUiHHzWXiEBn" },
  ];
  //const options = [{ icon: "/usdc.png", name: "Magical Gem" }, { icon: "/usdc.png", name: "USDC" }, { icon: "/Solana_logo.png", name: "SOL" }];
  const options = useRef([{ icon: `${process.env.PUBLIC_URL}/token.png`, name: "LOADING" }]);

  const [userInfo, setUserInfo] = useState<UserInfo>({
    position: 0,
    points: 0,
  });

  useEffect(() => {
    const loadTokenMetadata = async () => {
      try {
        const matchedTokens = tokens.filter((token) => token.network === NETWORK);

        const promises = matchedTokens.map(async (token) => {
          if (token.token.toString() === "7dnMwS2yE6NE1PX81B9Xpm7zUhFXmQABqUiHHzWXiEBn") {
            return {
              icon: `${process.env.PUBLIC_URL}/agld.jpg`,
              name: "AGLD",
            };
          } else {
            const metadata = await fetchTokenMetadata(token.token);
            console.log(metadata);
            return {
              icon: metadata.image,
              name: metadata.name,
            };
          }
        });

        const optionsData = await Promise.all(promises);

        options.current = optionsData;
        setSeason(options.current[0]);
        console.log("Updated options:", options.current);
      } catch (error) {
        console.error("Error loading token metadata:", error);
      }
    };

    loadTokenMetadata();
  }, [NETWORK]);

  useEffect(() => {
    // if (!publicKey) {
    //     return;
    // }
    if (options.current[0].name === "LOADING") {
      return;
    }
    (async () => {
      try {
        console.log(season.name);
        let res = await axios.get(
          `https://supersize.lewisarnsten.workers.dev/get-user-position?walletAddress=${publicKey ? publicKey.toString() : "11111111111111111111111111111111"}&contestName=${season.name}`,
        );
        let contestantFound = true;

        if (res.data?.error === "User not found in contest") {
          console.log("User not found, retrying with fallback walletAddress...");
          res = await axios.get(
            `https://supersize.lewisarnsten.workers.dev/get-user-position?walletAddress=DdGB1EpmshJvCq48W1LvB1csrDnC4uataLnQbUVhp6XB&contestName=${season.name}`,
          );
          contestantFound = false;
        }

        if (contestantFound) {
          setUserInfo({
            position: res.data.position,
            points: res.data.points,
          });
        } else {
          setUserInfo({
            position: 0,
            points: 0,
          });
        }
        console.log("topParticipants:::::", contestantFound, res, res.data.topParticipants, res.data.totalCandidates);

        const participants = res.data.topParticipants.map(
          (participant: { walletAddress: string; winAmount: number }) => ({
            name: participant.walletAddress,
            total: participant.winAmount,
          }),
        );
        users.current = participants;
        usersLen.current = res.data.totalCandidates;
      } catch (error) {
        console.error("An error occurred during the request:", error);
      }
    })();
  }, [publicKey, season]);

  return (
    <div className="main-container">
      <MenuBar />

      <div className="leaderboard-container">
        <div className="top-stats-row">
          <div className="stat-box rank-box desktop-only">
            <p className="stat-label">Your Rank</p>
            <p className="stat-value">
              {userInfo.position} / {usersLen.current}
            </p>
          </div>

          <div className="stat-box winnings-box desktop-only">
            <p className="stat-label">Your Winnings</p>
            <p className="stat-value">{userInfo.points.toFixed(3)}</p>
          </div>

          <div className="dropdown-box">
            <p className="stat-label">Select Token</p>
            <LeaderboardDropdown season={season} setSeason={setSeason} />
          </div>
        </div>

        <div className="leaderboard-table">
          <table>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Player</th>
                <th className="text-right">Total</th>
              </tr>
            </thead>
          </table>

          <div className="table-scroll">
            <table>
              <tbody>
                {users.current.map((player, i) => {
                  const highlight = rank === i ? { background: "#3a3a3a" } : {};
                  return (
                    <tr key={i} style={highlight} onMouseEnter={() => setRank(i)} onMouseLeave={() => setRank(null)}>
                      <td>{i + 1}</td>
                      <td>{player.name}</td>
                      <td className="text-right">{player.total.toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Leaderboard;
