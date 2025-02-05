import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";

export interface Food {
  x: number;
  y: number;
  size: number;
}

export interface Blob {
  name: string;
  authority: PublicKey | null;
  x: number;
  y: number;
  radius: number;
  mass: number;
  score: number;
  tax: number;
  buyIn: number;
  payoutTokenAccount: PublicKey | null;
  speed: number;
  removal: BN;
  target_x: number;
  target_y: number;
  timestamp: number;
}

export type ActiveGame = {
  isLoaded: boolean;
  worldPda: PublicKey;
  worldId: BN;
  name: string;
  active_players: number;
  max_players: number;
  size: number;
  image: string;
  token: string;
  tokenMint?: PublicKey;
  base_buyin: number;
  min_buyin: number;
  max_buyin: number;
  endpoint: string;
  ping: number;
};

export type PlayerInfo = {
  playerStatus: string;
  need_to_delegate: boolean;
  need_to_undelegate: boolean;
  newplayerEntityPda: PublicKey;
};
export type FetchedGame = {
  activeGame: ActiveGame;
  playerInfo: PlayerInfo;
};
