import { PropsWithChildren, ComponentType, useState, useCallback } from "react";
import Dropdown from "@components/Dropdown";
import WalletConnectButton from "@components/WalletConnectButton";
import SolNetStats from "@components/SolNetStats";
import FooterLink from "@components/FooterLink";
import { useNavigate } from "react-router-dom";
import LeaderboardDropdown from "@components/LeaderboardDropdown";

const LeaderboardLayout = ({ children }: PropsWithChildren) => {
    const [homeHovered, setHomeHovered] = useState(false);
    const navigate = useNavigate();

    const handleClickHome = useCallback(() => {
        navigate("/");
    }, []);

    const handleLeaderboadClick = useCallback(() => {
        navigate("/leaderboard");
    }, []);

    return (
        <section className="">
            <div className="flex justify-between items-center">
                <LeaderboardDropdown />
            </div>
            {children}
        </section>
    );
};

export const withLeaderboardLayout =
    <P extends object>(Component: ComponentType<P>) =>
    (Props: P) => (
        <LeaderboardLayout>
            <Component {...Props} />
        </LeaderboardLayout>
    );
