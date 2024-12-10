import React, { useState, useEffect, useRef} from 'react';
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

const Leaderboard: React.FC<{ setbuildViewerNumber: (number: number) => void }> = ({ setbuildViewerNumber }) => {
    const network = "devnet"; //"mainnet"; 
    const [season, setSeason] = useState({
        icon: `${process.env.PUBLIC_URL}/token.png`,
        name: "LOADING"
    });
    const users= useRef<Player[]>([]);
    const usersLen = useRef(0);

    const [rank, setRank] = useState<number | null>(null);
    const { publicKey } = useWallet();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [homeHover, setHomeHover] = useState(false);

    const tokens = [{network: "devnet", token: "AsoX43Q5Y87RPRGFkkYUvu8CSksD9JXNEqWVGVsr8UEp"}, {network: "mainnet", token: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"}, {network: "mainnet", token: "7dnMwS2yE6NE1PX81B9Xpm7zUhFXmQABqUiHHzWXiEBn"}]
    //const options = [{ icon: "/usdc.png", name: "Magical Gem" }, { icon: "/usdc.png", name: "USDC" }, { icon: "/Solana_logo.png", name: "SOL" }];
    const options = useRef([{icon: `${process.env.PUBLIC_URL}/token.png`, name: "LOADING"}]);

    const [userInfo, setUserInfo] = useState<UserInfo>({
        position: 0,
        points: 0
    });
    const [toggle, setToggle] = useState(false);

    useEffect(() => {
        const loadTokenMetadata = async () => {
          try {
            const matchedTokens = tokens.filter(token => token.network === network);
            
            const promises = matchedTokens.map(async token => {
            if(token.token.toString() === "7dnMwS2yE6NE1PX81B9Xpm7zUhFXmQABqUiHHzWXiEBn"){
                return {
                    icon: `${process.env.PUBLIC_URL}/agld.jpg`,
                    name: "AGLD",
                };
            }else{
              const metadata = await fetchTokenMetadata(token.token, network);
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
      }, [network]);

    const fetchTokenMetadata = async (
        tokenAddress: string,
        network: string
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

    useEffect(() => {
        if (!publicKey) {
            return;
        }
        if(options.current[0].name === "LOADING"){
            return;
        }
        (async () => {
            try {
                let res = await axios.get(`https://supersize.lewisarnsten.workers.dev/get-user-position?walletAddress=${publicKey.toString()}&contestName=${season.name}`);
                let contestantFound = true;
                // Check if the response indicates an error
                if (res.data?.error === 'User not found in contest') {
                    console.log("User not found, retrying with fallback walletAddress...");
                    res = await axios.get(`https://supersize.lewisarnsten.workers.dev/get-user-position?walletAddress=DdGB1EpmshJvCq48W1LvB1csrDnC4uataLnQbUVhp6XB&contestName=${season.name}`);
                    contestantFound = false;
                }
                
                if(contestantFound){
                    setUserInfo({
                        position: res.data.position,
                        points: res.data.points
                    });
                }else{
                    setUserInfo({
                        position: 0,
                        points: 0
                    });
                }
                console.log("topParticipants:::::", res.data.topParticipants, res.data.totalCandidates);
        
                const participants = res.data.topParticipants.map((participant: any) => (
                    { 
                        name: participant.walletAddress, 
                        total: participant.winAmount
                    }
                ));
                users.current = participants;
                usersLen.current = res.data.totalCandidates;
            } catch (error) {
                console.error("An error occurred during the request:", error);
            }
        })();
    }, [publicKey, season]);

    return (
        <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: '4vh' }}>
            <div
                            style={{
                                width: '4vh',
                                height: '4vh',
                                display: 'flex',
                                cursor: "pointer",
                                alignItems : "center", 
                                justifyContent:"center",
                                marginLeft:"2vw",
                                marginTop:"4vh"
                            }}
                            onMouseEnter={() => setHomeHover(true)}
                            onMouseLeave={() => setHomeHover(false)}
                            onClick={() => {setbuildViewerNumber(0); setHomeHover(false);}}
                            >
                            <img
                                src={`${process.env.PUBLIC_URL}/home.png`}
                                width="35px"
                                height="auto"
                                alt="Image"
                                style={{
                                    position: "absolute",
                                    opacity: homeHover ? 0.2 : 0.8,
                                    transition: 'opacity 0.0s ease background 0.3s ease 0s, color 0.3s ease 0s',
                                }}
                            />
                            {homeHover && (
                                <img
                                src={`${process.env.PUBLIC_URL}/homehighlight.png`}
                                width="35px"
                                height="auto"
                                alt="Highlighted Image"
                                style={{
                                    position: 'absolute',
                                    opacity: homeHover ? 0.8 : 0.2,
                                    transition: 'opacity 0.3s ease',
                                }}
                                />
                            )}
                        </div>
                <div
                    className="dropdown-container"
                    onClick={() => {
                        console.log("Toggle")
                        setToggle(!toggle);
                        if(options.current.length > 1){
                        setIsDropdownOpen((prev: boolean) => !prev)
                        }
                    }
                    }
                    style={{marginRight: "2vw", width:"fit-content", marginTop: "5vh"}}
                >
                    <div className={`selected-option ${isDropdownOpen ? "open" : ""}`} style={{ display: "flex", alignItems: "center", textAlign:"center", whiteSpace:"nowrap", width:"90px" }}>
                        <img src={season.icon} alt={season.name} style={{ width: "24px", height: "24px", marginRight: "8px" }} />
                        {season.name.toString().slice(0,5)}
                    </div>

                    {isDropdownOpen &&  (
                        <div className="dropdown-menu" style={{width:"90px"}}>
                            {options.current
                                .filter((option) => option.name !== season.name)
                                .map((option) => (
                                    <div
                                        key={option.name}
                                        className="dropdown-item"
                                        style={{width:"90px", display: "flex", alignItems: "center" }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSeason({
                                                icon: option.icon,
                                                name: option.name
                                            });
                                        }}
                                    >
                                        <img src={option.icon} alt={option.name} style={{ width: "24px", height: "24px", marginRight: "8px" }} />
                                        <span className="dropdown-text" style={{width:"90px"}}> {option.name} </span>
                                    </div>
                                ))}
                        </div>
                    )}
                </div>
            </div>
        <div style={{
            backgroundColor: "black",
            color: "#fff",
            marginTop: "1vh",
            paddingInline: "100px",
            height: "100vh",
            display: "flex",
            flexDirection: "column",
            fontFamily: 'Terminus',
            fontWeight: 400,
            fontStyle: "normal"
        }}>
            <div style={{ position: "relative", marginTop: "60px" }}>
                <h2 style={{
                    position: "absolute",
                    top: "-30px",
                    left: "10px",
                    fontSize: "30px",
                    backgroundColor: "black",
                    padding: "10px",
                    color: "rgb(103, 244, 182)"
                }}>
                    MY RANKING
                </h2>
                <div style={{ border: "1px solid #fff", padding: "24px", marginBottom: "24px" }}>
                    <div style={{ display: "flex", gap: "32px" }}>
                        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", width: "50%" }}>
                            <div style={{ textAlign: "center", marginBottom: "16px" }}>
                                <div style={{ fontSize: "25px", opacity: 0.8, marginBottom: "4px", color: "gray" }}>Global Ranking</div>
                                <div style={{ fontSize: "40px", color: "rgb(103, 244, 182)" }}>
                                    {userInfo.position} <span style={{ fontSize: "16px", opacity: 0.8, color: "#fff" }}>/ {usersLen.current}</span>
                                </div>
                            </div>
                        </div>
                        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", width: "50%" }}>
                            <div style={{ textAlign: "center", marginBottom: "16px" }}>
                                <div style={{ fontSize: "25px", opacity: 0.8, marginBottom: "4px", color: "gray" }}>Total Winnings</div>
                                <div style={{ fontSize: "40px", color: "rgb(103, 244, 182)" }}>{userInfo.points.toFixed(3)}</div>
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
                    <thead style={{ width: "100%", borderBottom: "1px solid gray", fontSize: "24px", color: "rgb(103, 244, 182)" }}>
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
                            {users.current.map((player, i) => (
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
        </>
    );
};

export default Leaderboard;

