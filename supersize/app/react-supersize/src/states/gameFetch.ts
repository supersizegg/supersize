import { PublicKey } from "@solana/web3.js";
import { MagicBlockEngine } from "../engine/MagicBlockEngine";
import {
  getComponentAnteroomOnEphem,
  getComponentAnteroomOnChain,
  getComponentMapOnChain,
  getComponentMapOnEphem,
  getComponentPlayerOnChain,
  getComponentPlayerOnEphem,
  getComponentSectionOnChain,
  getComponentSectionOnEphem,
} from "./gamePrograms";

export async function anteroomFetchOnChain(engine: MagicBlockEngine, gamePda: PublicKey) {
  const componentAnteroom = getComponentAnteroomOnChain(engine);
  return componentAnteroom.account.anteroom.fetchNullable(gamePda);
}

export async function anteroomFetchOnEphem(engine: MagicBlockEngine, gamePda: PublicKey) {
  const componentAnteroom = getComponentAnteroomOnEphem(engine);
  return componentAnteroom.account.anteroom.fetchNullable(gamePda);
}

export async function mapFetchOnChain(engine: MagicBlockEngine, gamePda: PublicKey) {
  const componentMap = getComponentMapOnChain(engine);
  return componentMap.account.map.fetchNullable(gamePda);
}

export async function mapFetchOnEphem(engine: MagicBlockEngine, gamePda: PublicKey) {
  const componentMap = getComponentMapOnEphem(engine);
  return componentMap.account.map.fetchNullable(gamePda);
}

export async function playerFetchOnChain(engine: MagicBlockEngine, gamePda: PublicKey) {
  const componentPlayer = getComponentPlayerOnChain(engine);
  return componentPlayer.account.player.fetchNullable(gamePda);
}

export async function playerFetchOnEphem(engine: MagicBlockEngine, gamePda: PublicKey) {
  const componentPlayer = getComponentPlayerOnEphem(engine);
  return componentPlayer.account.player.fetchNullable(gamePda);
}

export async function sectionFetchOnChain(engine: MagicBlockEngine, gamePda: PublicKey) {
  const componentSection = getComponentSectionOnChain(engine);
  return componentSection.account.section.fetchNullable(gamePda);
}

export async function sectionFetchOnEphem(engine: MagicBlockEngine, gamePda: PublicKey) {
  const componentSection = getComponentSectionOnEphem(engine);
  return componentSection.account.section.fetchNullable(gamePda);
}
