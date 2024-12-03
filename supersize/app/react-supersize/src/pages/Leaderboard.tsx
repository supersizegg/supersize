import { withLeaderboardLayout } from "@layouts/LeaderboardLayout"
import { useEffect, useState } from "react";
import axios from 'axios';
import { useWallet } from "@solana/wallet-adapter-react";
import useSupersize from "@hooks/useSupersize";

interface Player {
    name: string;
    total: number;
}
interface UserInfo {
    position: number;
    points: number;
}


const Leaderboard = () => {
    const { publicKey } = useWallet();
    const [userInfo, setUserInfo] = useState<UserInfo>({
        position: 0,
        points: 0
    });
    const [users, setUsers] = useState<Player[]>([]);
    const [rank, setRank] = useState<number | null>(null);

    const {leaderBoardOptions, season} = useSupersize();


    useEffect(() => {
        if (!publicKey) {
            return;
        }
        if(leaderBoardOptions.current[0].name === "LOADING"){
            return;
        }
        (async () => {
            const res = await axios.get(`https://supersize.lewisarnsten.workers.dev/get-user-position?walletAddress=${publicKey.toString()}&contestName=${season.name}`)
            console.log(res.data)

            setUserInfo({
                position: res.data.position,
                points: res.data.points
            })
            console.log("topParticipants:::::",res.data.topParticipants)
            const participants = res.data.topParticipants.map((participant: any) => (
                { 
                    name: participant.name, 
                    total: participant.winAmount
                }
            ))
            setUsers(participants)

        })()
    }, [publicKey, season.name]);

    return (
        <div className="bg-black text-white mt-[1vh] px-[100px] h-screen flex flex-col font-['Terminus'] font-normal">
            <div className="relative mt-[60px]">
                <h2 className="absolute top-[-30px] left-[10px] text-[30px] bg-black p-2 text-[rgb(103,244,182)]">
                    MY RANKING
                </h2>
                <div className="border border-white p-6 mb-6">
                    <div className='flex gap-[32px]'>
                        <div className='flex justify-center items-center w-[50%]'>
                            <div className='text-center mb-4'>
                                <div className='text-[25px] opacity-80 mb-1 text-gray-500'>Global Ranking</div>
                                <div className='text-[40px] text-[rgb(103,244,182)]'>
                                    {userInfo.position} <span className='text-[16px] opacity-80 text-white'>/ {users.length}</span>
                                </div>
                            </div>
                        </div>

                        <div className='flex justify-center items-center w-[50%]'>
                            <div className='text-center mb-4'>
                                <div className='text-[25px] opacity-80 mb-1 text-gray-500'>Total Winnings</div>
                                <div className='text-[40px] text-[rgb(103,244,182)]'>{userInfo.points}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className='flex-1 overflow-hidden mt-5 flex flex-col'>
                <table className='w-full border-collapse'>
                    <thead className='w-full border-b border-gray-500 text-[24px] text-[rgb(103,244,182)]'>
                        <tr>
                            <th className='text-left p-3 opacity-80'>Rank</th>
                            <th className='text-left p-3 opacity-80'>Player</th>
                            <th className='text-right p-3 opacity-80'>Total</th>
                        </tr>
                    </thead>
                </table>
                <div className='overflow-y-auto flex-1'>
                    <table className='w-full border-collapse'>
                        <tbody>
                            {users.map((player, i) => (
                                <tr key={i} onMouseEnter={() => setRank(i)} onMouseLeave={() => setRank(null)} className={`bg-${rank === i ? 'custom-green' : 'transparent'}`}>
                                    <td className='text-left p-3 text-[25px]'>{i + 1}</td>
                                    <td className='text-left p-3 text-[25px]'>
                                        <div className='flex mr-[-50px]'>
                                            <span className='text-[25px]'>{player.name}</span>
                                        </div>
                                    </td>

                                    <td className='text-right p-3 text-[18px]'>{player.total.toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

export default withLeaderboardLayout(Leaderboard);