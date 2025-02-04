import * as React from "react";
import { useMagicBlockEngine } from "../../engine/MagicBlockEngineProvider";

import { Button } from "../util/Button";
import { Text } from "../util/Text";
import { ForEach } from "../util/ForEach";
import "./MenuWallet.scss";

export function MenuWallet() {
  const engine = useMagicBlockEngine();
  const walletConnected = engine.getWalletConnected();

  return <div className="menu-wallet">{walletConnected ? <MenuWalletConnected /> : <MenuWalletDisconnected />}</div>;
}

function MenuWalletConnected() {
  const engine = useMagicBlockEngine();

  function truncateAddress(address: string): string {
    return address.slice(0, 4) + "..." + address.slice(-4);
  }

  const publicKey = engine.getWalletPayer();
  const addressBase58 = publicKey.toBase58();

  return (
    <div className="wallet-connected desktop-only">
      <div className="wallet-info">
        <Text value={truncateAddress(addressBase58)} />
      </div>
      <button
        className="wallet-disconnect-button"
        onClick={() => {
          engine.selectWalletAdapter(null);
        }}
      >
        <img src="/icons/logout.svg" className="logout-icon" alt="Disconnect" />
      </button>
    </div>
  );
}

function MenuWalletDisconnected() {
  const engine = useMagicBlockEngine();

  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);

  const openDrawer = () => setIsDrawerOpen(true);
  const closeDrawer = () => setIsDrawerOpen(false);

  return (
    <div className="wallet-disconnected">
      {!isDrawerOpen && <Button text="Connect Wallet" className="connect-wallet-button" onClick={openDrawer} />}

      {isDrawerOpen && (
        <div className="wallet-drawer-backdrop" onClick={closeDrawer}>
          <div className="wallet-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="wallet-drawer-header">
              <Text value="Select a Wallet" />
              <Button text="X" onClick={closeDrawer} />
            </div>
            <div className="wallet-drawer-body">
              <ForEach
                values={engine.listWalletAdapters()}
                renderer={(walletAdapter) => (
                  <Button
                    key={walletAdapter.name}
                    icon={walletAdapter.icon}
                    text={walletAdapter.name}
                    onClick={() => {
                      engine.selectWalletAdapter(walletAdapter);
                      closeDrawer();
                    }}
                  />
                )}
                placeholder={() => <Text value="No web wallet detected" />}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
