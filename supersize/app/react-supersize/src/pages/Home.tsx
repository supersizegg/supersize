import React from "react";
import { useNavigate } from "react-router-dom";

import FooterLink from "@components/Footer";
import "./Home.scss";

interface GameRow {
  server: string;
  gameId: string;
  token: string;
  buyIn: number;
  players: string;
  ping: number;
}

function getPingColor(ping: number) {
  if (ping <= 100) return "green";
  if (ping <= 800) return "yellow";
  return "red";
}

const Home = () => {
  const navigate = useNavigate();

  // @todo: fetch all available servers from on-chain programs
  const gameRows: GameRow[] = [
    { server: "Server 1", gameId: "000001", token: "Token A", buyIn: 100, players: "0/20", ping: 50 },
    { server: "Server 2", gameId: "000002", token: "Token A", buyIn: 100, players: "0/20", ping: 400 },
    { server: "Server 3", gameId: "000003", token: "Token B", buyIn: 10000, players: "2/20", ping: 1200 },
  ];

  return (
    <div>
      <div className="home-container">
        <div className="home-header">
          <input className="search-game-input" type="text" placeholder="Search Game" />
          <div className="header-buttons">
            <button className="btn-outlined btn-orange" disabled>How to Play</button>
            <button className="btn-outlined btn-green" onClick={() => navigate("/create-game")}>
              + Create Game
            </button>
          </div>
        </div>

        <div className="table-container">
          <table className="lobby-table">
            <thead>
              <tr>
                <th>Server</th>
                <th>Game ID</th>
                <th>Token</th>
                <th>Buy In</th>
                <th>Players</th>
                <th>Ping</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {gameRows.map((row, idx) => (
                <tr key={idx}>
                  <td>{row.server}</td>
                  <td>{row.gameId}</td>
                  <td>{row.token}</td>
                  <td>{row.buyIn}</td>
                  <td>{row.players}</td>
                  <td>
                    <div className="ping-cell">
                      <span className="ping-circle" style={{ backgroundColor: getPingColor(row.ping) }} />
                      {row.ping}ms
                    </div>
                  </td>
                  <td>
                    <button className="btn-play">Play</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <FooterLink />
    </div>
  );
};

export default Home;
