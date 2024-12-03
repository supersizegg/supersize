import React, { useMemo } from 'react';
import { BrowserRouter } from "react-router-dom";
import AppRoutes from "./routes";
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { PhantomWalletAdapter, SolflareWalletAdapter } from "@solana/wallet-adapter-wallets";
import { WalletModalProvider, } from '@solana/wallet-adapter-react-ui';
import { CONNECTION_STRING } from "@utils/constants";
import { SupersizeProvider } from '@contexts/SupersizeContext';

require('@solana/wallet-adapter-react-ui/styles.css');

function App() {
    const wallets = useMemo(() => [
        new PhantomWalletAdapter(),
        new SolflareWalletAdapter(),
    ], []);

    return (
    <ConnectionProvider endpoint={CONNECTION_STRING}>
        <WalletProvider wallets={wallets} autoConnect>
            <WalletModalProvider>
                <BrowserRouter>
                    <SupersizeProvider>
                        <AppRoutes />
                    </SupersizeProvider>
                </BrowserRouter>
            </WalletModalProvider>
        </WalletProvider>
    </ConnectionProvider>
    );
}

export default App;
