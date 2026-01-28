/**
 * Map Grid data structures for MetroMap.io
 */

export type TileType = "LAND" | "WATER";
export type MapType = "RIVER" | "ARCHIPELAGO";

export interface GridSquare {
  x: number;
  y: number;
  type: TileType;
  homeDensity: number; // 0-100, for future use
  officeDensity: number; // 0-100, for future use
}

import { MAP_WIDTH, MAP_HEIGHT } from "../config";

export interface MapGrid {
  width: number;
  height: number;
  seed: number;
  mapType: MapType;
  squares: GridSquare[][];
}

export { MAP_WIDTH, MAP_HEIGHT };
