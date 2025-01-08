import { PropsWithChildren, ComponentType, useState, useCallback } from "react";
import Dropdown from "@components/Dropdown";
import WalletConnectButton from "@components/WalletConnectButton";
import SolNetStats from "@components/SolNetStats";
import FooterLink from "@components/FooterLink";
import { useNavigate } from "react-router-dom";
import LeaderboardButton from "@components/LeaderboardButton";

const GameLayout = ({ children }: PropsWithChildren) => {
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
            {children}
            <div className="flex justify-between items-center">
                <SolNetStats tps={238722} price={239} />
                <FooterLink />
            </div>
        </section>
    );
};

export const withGameLayout =
    <P extends object>(Component: ComponentType<P>) =>
    (Props: P) => (
        <GameLayout>
            <Component {...Props} />
        </GameLayout>
    );
