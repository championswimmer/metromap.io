/**
 * Game State model for MetroMap.io
 * Stores all information about the current game state
 */

import type { MapGrid } from "./MapGrid";
import type { Station } from "./Station";
import type { MetroLine } from "./MetroLine";

export interface GameState {
  seed: number;
  map: MapGrid;
  stations: Station[];
  lines: MetroLine[];
  // Future: trains, passengers, score, etc.
}

/**
 * Create a new empty game state
 */
export function createGameState(seed: number, map: MapGrid): GameState {
  return {
    seed,
    map,
    stations: [],
    lines: [],
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
