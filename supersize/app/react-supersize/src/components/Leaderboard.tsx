import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import axios from 'axios';
interface Player {
    name: string;
    total: number;
}
interface UserInfo {
    position: number;
    points: number;
}

interface Users {
    id: string;
    walletAddress: string;
    name: string;
    contestId: string;
    winning: {
        id: string;
        userWalletAddress: string;
        usdc: number;
        sol: number;
        agld: number;
    }
}

const players: Player[] = [
    { name: "Top1VM", total: 228897624 },
    { name: "oRCNLD...DohgjM", total: 17436402 },
    { name: "f×r", total: 14711066 },
    { name: "CL888P...ENthbj", total: 11188228 },
    { name: "tenko", total: 10392967 },
    { name: "DEG", total: 10088151 },
    { name: "maff", total: 9438682 },
    { name: "moropy", total: 8921661 },
    { name: "woo", total: 5942167 },
];

const Leaderboard: React.FC<{ setbuildViewerNumber: (number: number) => void }> = ({ setbuildViewerNumber }) => {
    const [season, setSeason] = useState({
        icon: "/usdc.png",
        name: "USDC"
    });
    const [users, setUsers] = useState<Player[]>([]);
    const [rank, setRank] = useState<number | null>(null);
    const { publicKey } = useWallet();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const options = [{ icon: "/usdc.png", name: "USDC" }, { icon: "/Solana_logo.png", name: "SOL" }];
    const [userInfo, setUserInfo] = useState<UserInfo>({
        position: 0,
        points: 0
    });
    const [toggle, setToggle] = useState(false);
    useEffect(() => {
        if (!publicKey) {
            return;
        }
        (async () => {
            const res = await axios.get(`http://localhost:3001/get-user-position?walletAddress=${publicKey.toString()}&contestName=${season.name}`)
            console.log(res.data)

            setUserInfo({
                position: res.data.position,
                points: res.data.points
            })


            const participants = res.data.topParticipants.map((participant: any) => (
                { 
                    name: participant.name, 
                    total: participant.winning.usdc
                }
            ))

            setUsers(participants)

        })()
    }, [publicKey, season.name]);

    return (
        <div style={{
            backgroundColor: "#141A17",
            color: "#fff",
            padding: "50px",
            paddingInline: "100px",
            height: "100vh",
            display: "flex",
            flexDirection: "column",
            fontFamily: '"VT323", monospace',
            fontWeight: 400,
            fontStyle: "normal"
        }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <svg
                    viewBox="0 0 1024 1024"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="#fff"
                    style={{ width: "24px", height: "24px", cursor: "pointer" }}
                    onClick={() => {
                        setbuildViewerNumber(0);
                    }}
                >
                    <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
                    <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
                    <g id="SVGRepo_iconCarrier">
                        <path fill="#fff" d="M224 480h640a32 32 0 1 1 0 64H224a32 32 0 0 1 0-64z"></path>
                        <path fill="#fff" d="m237.248 512 265.408 265.344a32 32 0 0 1-45.312 45.312l-288-288a32 32 0 0 1 0-45.312l288-288a32 32 0 1 1 45.312 45.312L237.248 512z"></path>
                    </g>
                </svg>
                <div
                    className="dropdown-container"
                    onClick={() => {
                        console.log("Toggle")
                        setToggle(!toggle);
                        setIsDropdownOpen((prev: boolean) => !prev)
                    }
                    }
                >
                    <div className={`selected-option ${isDropdownOpen ? "open" : ""}`} style={{ display: "flex", alignItems: "center" }}>
                        <img src={season.icon} alt={season.name} style={{ width: "24px", height: "24px", marginRight: "8px" }} />
                        {season.name}
                    </div>

                    {isDropdownOpen && (
                        <div className="dropdown-menu">
                            {options
                                .filter((option) => option.name !== season.name)
                                .map((option) => (
                                    <div
                                        key={option.name}
                                        className="dropdown-item"
                                        style={{ display: "flex", alignItems: "center" }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSeason({
                                                icon: option.icon,
                                                name: option.name
                                            });
                                        }}
                                    >
                                        <img src={option.icon} alt={option.name} style={{ width: "24px", height: "24px", marginRight: "8px" }} />
                                        <span className="dropdown-text"> {option.name} </span>
                                    </div>
                                ))}
                        </div>
                    )}
                </div>
            </div>
            <div style={{ position: "relative", marginTop: "60px" }}>
                <h2 style={{
                    position: "absolute",
                    top: "-36px",
                    left: "10px",
                    fontSize: "30px",
                    backgroundColor: "#141A17",
                    padding: "10px",
                    color: "#3BAC71"
                }}>
                    MY RANKING
                </h2>
                <div style={{ border: "1px solid #fff", padding: "24px", marginBottom: "24px" }}>
                    <div style={{ display: "flex", gap: "32px" }}>
                        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", width: "50%" }}>
                            <div style={{ textAlign: "center", marginBottom: "16px" }}>
                                <div style={{ fontSize: "25px", opacity: 0.8, marginBottom: "4px", color: "gray" }}>Global Ranking</div>
                                <div style={{ fontSize: "40px", color: "#3BAC71" }}>
                                    {userInfo.position} <span style={{ fontSize: "16px", opacity: 0.8, color: "#fff" }}>/ {users.length}</span>
                                </div>
                            </div>
                        </div>
                        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", width: "50%" }}>
                            <div style={{ textAlign: "center", marginBottom: "16px" }}>
                                <div style={{ fontSize: "25px", opacity: 0.8, marginBottom: "4px", color: "gray" }}>Total Points</div>
                                <div style={{ fontSize: "40px", color: "#3BAC71" }}>{userInfo.points}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div style={{
                flex: 1,
                overflow: "hidden",
                marginTop: "20px",
                display: "flex",
                flexDirection: "column"
            }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead style={{ width: "100%", borderBottom: "1px solid gray", fontSize: "24px", color: "#00FF00" }}>
                        <tr>
                            <th style={{ textAlign: "left", padding: "12px", opacity: 0.8 }}>Rank</th>
                            <th style={{ textAlign: "left", padding: "12px", opacity: 0.8 }}>Player</th>
                            <th style={{ textAlign: "right", padding: "12px", opacity: 0.8 }}>Total</th>
                        </tr>
                    </thead>
                </table>
                <div style={{ overflowY: "auto", flex: 1 }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <tbody>
                            {users.map((player, i) => (
                                <tr key={i} onMouseEnter={() => setRank(i)} onMouseLeave={() => setRank(null)} style={{ backgroundColor: rank === i ? "#002200" : "transparent" }}>
                                    <td style={{ textAlign: "left", padding: "12px", fontSize: "25px" }}>{i + 1}</td>
                                    <td style={{ textAlign: "left", padding: "12px", fontSize: "25px" }}>
                                        <div style={{ display: "flex", marginRight: "-50px" }}>
                                            <span style={{ fontSize: "25px" }}>{player.name}</span>
                                        </div>
                                    </td>

                                    <td style={{ textAlign: "right", padding: "12px", fontSize: "18px" }}>{player.total.toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Leaderboard;

