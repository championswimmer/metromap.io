/**
 * Passenger data model for MetroMap.io
 */

export interface Passenger {
  id: string; // Unique passenger ID
  sourceStationId: string; // ID of the station where the passenger spawned
  destinationStationId: string; // ID of the target station
  spawnTime: number; // Timestamp when the passenger appeared

  // Pathfinding
  path: string[]; // List of station IDs to traverse (including transfers/destination)
  nextWaypointIndex: number; // Index in path we are trying to reach next

  // State tracking
  currentStationId?: string; // If waiting at a station
  currentTrainId?: string; // If on a train
}

/**
 * Create a new passenger
 */
export function createPassenger(
  sourceId: string,
  destinationId: string,
  spawnTime: number,
): Passenger {
  return {
    id: `p-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    sourceStationId: sourceId,
    destinationStationId: destinationId,
    spawnTime,
    path: [],
    nextWaypointIndex: 0,
    currentStationId: sourceId,
  };
}
