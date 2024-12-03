import * as anchor from "@coral-xyz/anchor";
import useSupersize from "@hooks/useSupersize";
import { Commitment, PublicKey, Transaction } from "@solana/web3.js";
import { ActiveGame, Blob, Food } from "@utils/types";
import { createContext, PropsWithChildren, SetStateAction, useContext, Dispatch, MutableRefObject } from "react";

const SupersizeContext = createContext<
| {
    savedPublicKey: anchor.web3.PublicKey | null,
    setSavedPublicKey: Dispatch<SetStateAction<anchor.web3.PublicKey | null>>,
    exitTxn: string,
    setExitTxn: Dispatch<SetStateAction<string>>,
    isReferrerModalOpen: boolean,
    setIsReferrerModalOpen: Dispatch<SetStateAction<boolean>>,
    referrerInput: string,
    setReferrerInput: Dispatch<SetStateAction<string>>,
    myReferralAccount: MutableRefObject<string>,
    myReferrer: MutableRefObject<string>,
    fastestEndpoint: string | null,
    setFastestEndpoint: Dispatch<SetStateAction<string | null>>,
    enpointDone: boolean,
    setEndpointDone: Dispatch<SetStateAction<boolean>>,
    wallet: anchor.web3.Keypair,
    setWallet: Dispatch<SetStateAction<anchor.web3.Keypair>>,
    playerKey: anchor.web3.PublicKey,
    setPlayerKey: Dispatch<SetStateAction<anchor.web3.PublicKey>>,
    walletRef: MutableRefObject<anchor.web3.Keypair>,
    foodwallet: anchor.web3.Keypair,
    foodKey: anchor.web3.PublicKey,
    setFoodKey: Dispatch<SetStateAction<anchor.web3.PublicKey>>,
    foodwalletRef: MutableRefObject<anchor.web3.Keypair>,
    players: Blob[],
    setPlayers: Dispatch<SetStateAction<Blob[]>>,
    playersLists: anchor.web3.PublicKey[][],
    setPlayersLists: Dispatch<SetStateAction<anchor.web3.PublicKey[][]>>,
    playersListsLen: number[],
    setPlayersListsLen: Dispatch<SetStateAction<number[]>>,
    allplayers: Blob[],
    setAllPlayers: Dispatch<SetStateAction<Blob[]>>,
    leaderboard: Blob[],
    setLeaderboard: Dispatch<SetStateAction<Blob[]>>,
    foodListLen: number[],
    setFoodListLen: Dispatch<SetStateAction<number[]>>,
    allFood: Food[][],
    setAllFood: Dispatch<SetStateAction<Food[][]>>,
    visibleFood: Food[][],
    setVisibleFood: Dispatch<SetStateAction<Food[][]>>,
    currentPlayer: Blob | null,
    setCurrentPlayer: Dispatch<SetStateAction<Blob | null>>,
    playerName: string,
    setPlayerName: Dispatch<SetStateAction<string>>,
    expandlist: boolean,
    setexpandlist: Dispatch<SetStateAction<boolean>>,
    subscribedToGame: boolean,
    setSubscribedToGame: Dispatch<SetStateAction<boolean>>,
    newGameCreated: ActiveGame | null,
    setNewGameCreated: Dispatch<SetStateAction<ActiveGame | null>>,
    currentTPS: number,
    setCurrentTPS: Dispatch<SetStateAction<number>>,
    price: number,
    setPrice: Dispatch<SetStateAction<number>>,
    screenSize: {
        width: number;
        height: number;
    },
    setScreenSize: Dispatch<SetStateAction<{
        width: number;
        height: number;
    }>>,
    mapSize: number,
    setMapSize: Dispatch<SetStateAction<number>>,
    isSubmitting: boolean,
    setIsSubmitting: Dispatch<SetStateAction<boolean>>,
    isJoining: boolean,
    setIsJoining: Dispatch<SetStateAction<boolean>>,
    moveSignature: string | null,
    setMoveSignature: Dispatch<SetStateAction<string | null>>,
    transactionError: string | null,
    setTransactionError: Dispatch<SetStateAction<string | null>>,
    transactionSuccess: string | null,
    setTransactionSuccess: Dispatch<SetStateAction<string | null>>,
    activeGames: ActiveGame[],
    setActiveGames: Dispatch<SetStateAction<ActiveGame[]>>,
    gamewallet: string,
    setGameWallet: Dispatch<SetStateAction<string>>,
    openGameInfo: boolean[],
    setOpenGameInfo: Dispatch<SetStateAction<boolean[]>>,
    entityMatch: MutableRefObject<anchor.web3.PublicKey | null>,
    playerEntities: MutableRefObject<anchor.web3.PublicKey[]>,
    foodEntities: MutableRefObject<anchor.web3.PublicKey[]>,
    currentPlayerEntity: MutableRefObject<anchor.web3.PublicKey | null>,
    currentWorldId: MutableRefObject<anchor.web3.PublicKey | null>,
    anteroomEntity: MutableRefObject<anchor.web3.PublicKey | null>,
    gameId: anchor.web3.PublicKey | null,
    setGameId: Dispatch<SetStateAction<anchor.web3.PublicKey | null>>,
    exitHovered: boolean,
    setExitHovered: Dispatch<SetStateAction<boolean>>,
    playersComponentSubscriptionId: MutableRefObject<number[] | null>,
    foodComponentSubscriptionId: MutableRefObject<number[] | null>,
    myplayerComponentSubscriptionId: MutableRefObject<number | null>,
    mapComponentSubscriptionId: MutableRefObject<number | null>,
    playersComponentClient: MutableRefObject<anchor.Program<anchor.Idl> | null>,
    mapComponentClient: MutableRefObject<anchor.Program<anchor.Idl> | null>,
    foodComponentClient: MutableRefObject<anchor.Program<anchor.Idl> | null>,
    isMouseDown: boolean,
    setIsMouseDown: Dispatch<SetStateAction<boolean>>,
    mousePosition: {
        x: number;
        y: number;
    },
    setMousePosition: Dispatch<SetStateAction<{
        x: number;
        y: number;
    }>>,
    panelContent: JSX.Element | null,
    setPanelContent: Dispatch<SetStateAction<JSX.Element | null>>,
    buildViewerNumber: number,
    setbuildViewerNumber: Dispatch<SetStateAction<number>>,
    leaderBoardActive: boolean,
    setLeaderboardActive: Dispatch<SetStateAction<boolean>>,
    isHovered: boolean[],
    setIsHovered: Dispatch<SetStateAction<boolean[]>>,
    gameEnded: number,
    setGameEnded: Dispatch<SetStateAction<number>>,
    playerCashout: MutableRefObject<number>,
    playerBuyIn: MutableRefObject<number>,
    playerTax: number,
    setPlayerTax: Dispatch<SetStateAction<number>>,
    playerRemovalTimeRef: MutableRefObject<anchor.BN | null>,
    cashoutTx: string | null,
    setCashoutTx: Dispatch<SetStateAction<string | null>>,
    reclaimTx: string | null,
    setReclaimTx: Dispatch<SetStateAction<string | null>>,
    cashingOut: boolean,
    setCashingOut: Dispatch<SetStateAction<boolean>>,
    playerCashoutAddy: anchor.web3.PublicKey | null,
    setPlayerCashoutAddy: Dispatch<SetStateAction<anchor.web3.PublicKey | null>>,
    nextFood: MutableRefObject<{
        x: number;
        y: number;
    }>,
    inputValue: string,
    setInputValue: Dispatch<SetStateAction<string>>,
    footerVisible: boolean,
    setFooterVisible: Dispatch<SetStateAction<boolean>>,
    playerExiting: boolean,
    setPlayerExiting: Dispatch<SetStateAction<boolean>>,
    countdown: number,
    setCountdown: Dispatch<SetStateAction<number>>,
    buyIn: number,
    setBuyIn: Dispatch<SetStateAction<number>>,
    isMobile: boolean,
    setIsMobile: Dispatch<SetStateAction<boolean>>,
    selectedOption: string,
    setSelectedOption: Dispatch<SetStateAction<string>>,
    isDropdownOpen: boolean,
    setIsDropdownOpen: Dispatch<SetStateAction<boolean>>,
    lastUpdateRef: MutableRefObject<number | null>,
    provider: anchor.AnchorProvider,
    providerEphemeralRollup: MutableRefObject<anchor.AnchorProvider>,
    handleNameChange: (event: React.ChangeEvent<HTMLInputElement>) => void,
    handleOptionClick: (option: any) => void,
    handleSliderChange: (event: any) => void,
    handleInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void,
    handleKeyPress: (event: React.KeyboardEvent<HTMLInputElement>) => void,
    joinGameTx: (selectGameId: ActiveGame) => Promise<void>,
    openDocs: () => void,
    openX: () => void,
    openTG: () => void,
    handleExitClick: () => void,
    cleanUp: () => Promise<void>,
    getRefferal: (inputKey: any) => Promise<void>,
    handleClick: (index: number) => void,
    handleImageClick: () => Promise<void>,
    submitTransactionUser: (transaction: Transaction) => Promise<string | null>,
    submitTransaction: (transaction: Transaction, commitmetLevel: Commitment, skipPre: boolean) => Promise<string | null>,
    retrySubmitTransaction: (transaction: Transaction, connection: anchor.web3.Connection, commitment: anchor.web3.Commitment, maxRetries?: number, delay?: number) => Promise<string | null>
    newGameTx: (game_size: number, max_buyin: number, min_buyin: number, game_owner_wallet_string: string, game_token_string: string, game_name: string) => Promise<void>,
    leaderBoardOptions: React.MutableRefObject<{
        icon: string;
        name: string;
    }[]>,
    season: {
        icon: string;
        name: string;
    },
    setSeason: React.Dispatch<React.SetStateAction<{
        icon: string;
        name: string;
    }>>
}
| undefined
>(undefined);

export const SupersizeProvider = ({children}: PropsWithChildren) => {
    const value = useSupersize();
    return <SupersizeContext.Provider value={value}>{children}</SupersizeContext.Provider>;
};

export const useSupersizeContext = () => {
    const context = useContext(SupersizeContext);
    if (!context) {
        throw new Error("useSupersizeContext must be used within a SupersizeProvider");
    }
    return context;
}