/**
 * Game State model for MetroMap.io
 * Stores all information about the current game state
 */

import type { MapGrid } from "./MapGrid";
import type { Station } from "./Station";

export interface GameState {
  seed: number;
  map: MapGrid;
  stations: Station[];
  // Future: lines, trains, passengers, score, etc.
}

/**
 * Create a new empty game state
 */
export function createGameState(seed: number, map: MapGrid): GameState {
  return {
    seed,
    map,
    stations: [],
  };
}

/**
 * Serialize game state to JSON
 */
export function serializeGameState(state: GameState): string {
  return JSON.stringify(state);
}

/**
 * Deserialize game state from JSON
 */
export function deserializeGameState(json: string): GameState {
  return JSON.parse(json);
}
