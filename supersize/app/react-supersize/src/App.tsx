import React from "react";
import { BrowserRouter } from "react-router-dom";
import AppRoutes from "./routes";
import { useWallet } from "@solana/wallet-adapter-react";
import { Connection } from "@solana/web3.js";
import { initBuddyState, initialBuddyLink, useInitBuddyLink, BUDDY_MINTS } from "buddy.link";
import { MagicBlockEngineProvider } from "./engine/MagicBlockEngineProvider";
import { RPC_CONNECTION } from "@utils/constants";

// eslint-disable-next-line
require("@solana/wallet-adapter-react-ui/styles.css");

const initialState = {
  [BUDDY_MINTS]: [
    "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC on mainnet
    "11111111111111111111111111111111", // SOL on mainnet
  ],
};

initBuddyState({ ...initialBuddyLink, ...initialState });

const InitBuddyLinkWrapper = () => {
  const connection = new Connection(RPC_CONNECTION["mainnet"]);

  const wallet = useWallet();

  // Note: Devnet SDK has an error that Wagg is fixing, contact him to find out when this can be removed
  const organization = "supersize";

  // TODO: Fix this
  // eslint-disable-next-line
  useInitBuddyLink(connection as any, wallet, organization, { debug: true });

  return null;
};

function App() {
  return (
    <BrowserRouter>
      <MagicBlockEngineProvider>
        <AppRoutes />
        <InitBuddyLinkWrapper />
      </MagicBlockEngineProvider>
    </BrowserRouter>
  );
}

export default App;
