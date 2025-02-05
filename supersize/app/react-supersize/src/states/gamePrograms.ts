import { PublicKey } from "@solana/web3.js";

import { MagicBlockEngine } from "../engine/MagicBlockEngine";

import { Anteroom } from "../backend/target/types/anteroom";
import { Map } from "../backend/target/types/map";
import { Player } from "../backend/target/types/player";
import { Section } from "../backend/target/types/section";

import { BuyIn } from "../backend/target/types/buy_in";
import { CashOut } from "../backend/target/types/cash_out";
import { EatFood } from "../backend/target/types/eat_food";
import { EatPlayer } from "../backend/target/types/eat_player";
import { ExitGame } from "../backend/target/types/exit_game";
import { InitAnteroom } from "../backend/target/types/init_anteroom";
import { InitMap } from "../backend/target/types/init_map";
import { InitPlayer } from "../backend/target/types/init_player";
import { InitSection } from "../backend/target/types/init_section";
import { Movement } from "../backend/target/types/movement";
import { SpawnFood } from "../backend/target/types/spawn_food";
import { SpawnPlayer } from "../backend/target/types/spawn_player";

import * as AnteroomIdl from "../backend/target/idl/anteroom.json";
import * as MapIdl from "../backend/target/idl/map.json";
import * as PlayerIdl from "../backend/target/idl/player.json";
import * as SectionIdl from "../backend/target/idl/section.json";

import * as BuyInIdl from "../backend/target/idl/buy_in.json";
import * as CashOutIdl from "../backend/target/idl/cash_out.json";
import * as EatFoodIdl from "../backend/target/idl/eat_food.json";
import * as EatPlayerIdl from "../backend/target/idl/eat_player.json";
import * as ExitGameIdl from "../backend/target/idl/exit_game.json";
import * as InitAnteroomIdl from "../backend/target/idl/init_anteroom.json";
import * as InitMapIdl from "../backend/target/idl/init_map.json";
import * as InitPlayerIdl from "../backend/target/idl/init_player.json";
import * as InitSectionIdl from "../backend/target/idl/init_section.json";
import * as MovementIdl from "../backend/target/idl/movement.json";
import * as SpawnFoodIdl from "../backend/target/idl/spawn_food.json";
import * as SpawnPlayerIdl from "../backend/target/idl/spawn_player.json";

const componentAnteroom = AnteroomIdl as Anteroom;
const componentMap = MapIdl as Map;
const componentPlayer = PlayerIdl as Player;
const componentSection = SectionIdl as Section;

const systemBuyIn = BuyInIdl as BuyIn;
const systemCashOut = CashOutIdl as CashOut;
const systemEatFood = EatFoodIdl as EatFood;
const systemEatPlayer = EatPlayerIdl as EatPlayer;
const systemExitGame = ExitGameIdl as ExitGame;
const systemInitAnteroom = InitAnteroomIdl as InitAnteroom;
const systemInitMap = InitMapIdl as InitMap;
const systemInitPlayer = InitPlayerIdl as InitPlayer;
const systemInitSection = InitSectionIdl as InitSection;
const systemMovement = MovementIdl as Movement;
const systemSpawnFood = SpawnFoodIdl as SpawnFood;
const systemSpawnPlayer = SpawnPlayerIdl as SpawnPlayer;

export const COMPONENT_ANTEROOM_ID = new PublicKey(componentAnteroom.address);
export const COMPONENT_MAP_ID = new PublicKey(componentMap.address);
export const COMPONENT_PLAYER_ID = new PublicKey(componentPlayer.address);
export const COMPONENT_SECTION_ID = new PublicKey(componentSection.address);

export const SYSTEM_BUY_IN_ID = new PublicKey(systemBuyIn.address);
export const SYSTEM_CASH_OUT_ID = new PublicKey(systemCashOut.address);
export const SYSTEM_EAT_FOOD_ID = new PublicKey(systemEatFood.address);
export const SYSTEM_EAT_PLAYER_ID = new PublicKey(systemEatPlayer.address);
export const SYSTEM_EXIT_GAME_ID = new PublicKey(systemExitGame.address);
export const SYSTEM_INIT_ANTEROOM_ID = new PublicKey(systemInitAnteroom.address);
export const SYSTEM_INIT_MAP_ID = new PublicKey(systemInitMap.address);
export const SYSTEM_INIT_PLAYER_ID = new PublicKey(systemInitPlayer.address);
export const SYSTEM_INIT_SECTION_ID = new PublicKey(systemInitSection.address);
export const SYSTEM_MOVEMENT_ID = new PublicKey(systemMovement.address);
export const SYSTEM_SPAWN_FOOD_ID = new PublicKey(systemSpawnFood.address);
export const SYSTEM_SPAWN_PLAYER_ID = new PublicKey(systemSpawnPlayer.address);

export function getComponentAnteroomOnChain(engine: MagicBlockEngine) {
  return engine.getProgramOnChain<Anteroom>(componentAnteroom);
}

export function getComponentAnteroomOnEphem(engine: MagicBlockEngine) {
  return engine.getProgramOnEphem<Anteroom>(componentAnteroom);
}

export function getComponentMapOnChain(engine: MagicBlockEngine) {
  return engine.getProgramOnChain<Map>(componentMap);
}

export function getComponentMapOnEphem(engine: MagicBlockEngine) {
  return engine.getProgramOnEphem<Map>(componentMap);
}
export function getComponentPlayerOnChain(engine: MagicBlockEngine) {
  return engine.getProgramOnChain<Player>(componentPlayer);
}

export function getComponentPlayerOnEphem(engine: MagicBlockEngine) {
  return engine.getProgramOnEphem<Player>(componentPlayer);
}
export function getComponentSectionOnChain(engine: MagicBlockEngine) {
  return engine.getProgramOnChain<Section>(componentSection);
}

export function getComponentSectionOnEphem(engine: MagicBlockEngine) {
  return engine.getProgramOnEphem<Section>(componentSection);
}
