import { useState } from "react";

type LeaderboardButtonProps = {
    handleLeaderboadClick: () => void;
};
const LeaderboardButton: React.FC<LeaderboardButtonProps> = ({
    handleLeaderboadClick,
}) => {
    const [leaderBoardActive, setLeaderboardActive] = useState(false);
    return (
        <>
            {leaderBoardActive ? (
                <span className="text-[#eee] font-[terminus] text-[1.5vh] mt-[2vh] cursor-pointer mr-4" onMouseLeave={() => setLeaderboardActive(false)} onClick={handleLeaderboadClick}>
                    Leaderboard
                </span>
            ) : (
                <span className="text-[#eee] font-[terminus] text-[1.5vh] mt-[2vh] cursor-pointer mr-4"  onMouseEnter={() => setLeaderboardActive(true)}
                onClick={handleLeaderboadClick}>
                Leaderboard
                </span>
            )}
        </>
    );
};

export default LeaderboardButton;
