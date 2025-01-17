import * as React from "react";
import { useMagicBlockEngine } from "../../engine/MagicBlockEngineProvider";
import { Spinner } from "../util/Spinner";
import "./MenuSession.scss";

export function MenuSession() {
  const engine = useMagicBlockEngine();

  const sessionPayer = engine.getSessionPayer();
  const [sessionLamports, setSessionLamports] = React.useState<number | undefined>(undefined);
  const [isFunding, setIsFunding] = React.useState(false);
  const [isWithdrawing, setIsWithdrawing] = React.useState(false);

  React.useEffect(() => {
    return engine.subscribeToChainAccountInfo(sessionPayer, (accountInfo) => {
      setSessionLamports(accountInfo?.lamports);
    });
  }, [engine, sessionPayer]);

  const solBalance = sessionLamports !== undefined ? (sessionLamports / 1_000_000_000).toFixed(3) : "0";

  const needsFunding = sessionLamports !== undefined ? sessionLamports < engine.getSessionMinLamports() : true;

  const onFund = async () => {
    try {
      setIsFunding(true);
      await engine.fundSessionFromWallet();
      console.log("Session funded from wallet");
    } catch (err) {
      console.error("Funding error:", err);
    } finally {
      setIsFunding(false);
    }
  };

  const onWithdraw = async () => {
    try {
      setIsWithdrawing(true);
      await engine.defundSessionBackToWallet();
      console.log("Session funds withdrawn");
    } catch (err) {
      console.error("Withdraw error:", err);
    } finally {
      setIsWithdrawing(false);
    }
  };

  return (
    <div className="menu-session">
      <div className="session-bottom">
        <div className="session-top row-inline">
          <span className="session-label">Session Wallet</span>
          <span className="session-balance">{solBalance} SOL</span>
        </div>

        <input className="session-address" type="text" readOnly value={sessionPayer.toBase58()} />

        <div className="session-buttons">
          {needsFunding && (
            <button className="btn-fund" onClick={onFund} disabled={isFunding}>
              {isFunding ? <Spinner /> : "Fund"}
            </button>
          )}

          <button className="btn-withdraw" onClick={onWithdraw} disabled={isWithdrawing}>
            {isWithdrawing ? <Spinner /> : "Withdraw"}
          </button>
        </div>
      </div>
    </div>
  );
}
