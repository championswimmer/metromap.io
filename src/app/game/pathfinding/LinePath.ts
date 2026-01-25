/**
 * Harry Beck style pathfinding for metro lines
 * Lines follow grid or 45-degree diagonals with smooth bezier curves at bends
 */

import type { Station } from "../models/Station";

export enum Direction {
  EAST = 0, // 0°
  SOUTHEAST = 45, // 45°
  SOUTH = 90, // 90°
  SOUTHWEST = 135, // 135°
  WEST = 180, // 180°
  NORTHWEST = 225, // 225°
  NORTH = 270, // 270°
  NORTHEAST = 315, // 315°
}

export interface DirectionVector {
  dx: number;
  dy: number;
}

export const DIRECTION_VECTORS: Record<Direction, DirectionVector> = {
  [Direction.EAST]: { dx: 1, dy: 0 },
  [Direction.SOUTHEAST]: { dx: 1, dy: 1 },
  [Direction.SOUTH]: { dx: 0, dy: 1 },
  [Direction.SOUTHWEST]: { dx: -1, dy: 1 },
  [Direction.WEST]: { dx: -1, dy: 0 },
  [Direction.NORTHWEST]: { dx: -1, dy: -1 },
  [Direction.NORTH]: { dx: 0, dy: -1 },
  [Direction.NORTHEAST]: { dx: 1, dy: -1 },
};

export interface Waypoint {
  x: number;
  y: number;
  type: "STATION" | "BEND";
  incomingAngle?: Direction;
  outgoingAngle?: Direction;
}

export interface LineSegment {
  fromStation: Station;
  toStation: Station;
  entryAngle: Direction;
  exitAngle: Direction;
  waypoints: Waypoint[];
}

/**
 * Calculate angle difference normalized to -180 to 180 range
 */
function angleDifference(angle1: number, angle2: number): number {
  let diff = angle1 - angle2;
  while (diff > 180) diff -= 360;
  while (diff < -180) diff += 360;
  return diff;
}

/**
 * Normalize angle to 0-360 range
 */
export function normalizeAngle(angle: number): number {
  angle = angle % 360;
  if (angle < 0) angle += 360;
  return angle;
}

/**
 * Calculate the snapped angle between two stations
 */
export function calculateSnapAngle(from: Station, to: Station): Direction {
  const dx = to.vertexX - from.vertexX;
  const dy = to.vertexY - from.vertexY;

  // Calculate raw angle in degrees
  const rawAngle = (Math.atan2(dy, dx) * 180) / Math.PI;

  // Snap to nearest 45-degree increment
  const possibleAngles = [0, 45, 90, 135, 180, 225, 270, 315];

  let snappedAngle = possibleAngles[0];
  let minDiff = Math.abs(angleDifference(rawAngle, possibleAngles[0]));

  for (const angle of possibleAngles) {
    const diff = Math.abs(angleDifference(rawAngle, angle));
    if (diff < minDiff) {
      minDiff = diff;
      snappedAngle = angle;
    }
  }

  return snappedAngle as Direction;
}

/**
 * Solve line intersection point
 */
function solveLineIntersection(
  x1: number,
  y1: number,
  dx1: number,
  dy1: number,
  x2: number,
  y2: number,
  dx2: number,
  dy2: number,
): { x: number; y: number } | null {
  const denominator = dx1 * dy2 - dy1 * dx2;

  if (Math.abs(denominator) < 0.0001) {
    return null; // Parallel lines
  }

  const t1 = ((x2 - x1) * dy2 - (y2 - y1) * dx2) / denominator;

  // Check if t1 is positive (bend is ahead of 'from' station)
  if (t1 < 0.5) {
    return null; // Too close to station
  }

  return {
    x: x1 + t1 * dx1,
    y: y1 + t1 * dy1,
  };
}

/**
 * Calculate optimal bend position between two stations
 */
function calculateOptimalBendPosition(
  from: Station,
  to: Station,
  angle1: Direction,
  angle2: Direction,
): { x: number; y: number } {
  const dir1 = DIRECTION_VECTORS[angle1];
  const dir2 = DIRECTION_VECTORS[angle2];

  // Try to find intersection of two rays
  const intersection = solveLineIntersection(
    from.vertexX,
    from.vertexY,
    dir1.dx,
    dir1.dy,
    to.vertexX,
    to.vertexY,
    -dir2.dx,
    -dir2.dy,
  );

  if (intersection) {
    // Verify bend isn't too far from path
    const distToFrom = Math.hypot(
      intersection.x - from.vertexX,
      intersection.y - from.vertexY,
    );
    const distToTo = Math.hypot(
      intersection.x - to.vertexX,
      intersection.y - to.vertexY,
    );
    const directDist = Math.hypot(
      to.vertexX - from.vertexX,
      to.vertexY - from.vertexY,
    );

    // If bend is reasonable, use it
    if (distToFrom + distToTo < directDist * 2) {
      return intersection;
    }
  }

  // Fallback: create bend at midpoint
  return {
    x: (from.vertexX + to.vertexX) / 2,
    y: (from.vertexY + to.vertexY) / 2,
  };
}

/**
 * Generate waypoints between two stations
 */
function generateWaypoints(
  from: Station,
  to: Station,
  entryAngle: Direction,
  targetAngle: Direction,
): Waypoint[] {
  const waypoints: Waypoint[] = [];

  // Start at 'from' station
  waypoints.push({
    x: from.vertexX,
    y: from.vertexY,
    type: "STATION",
    outgoingAngle: entryAngle,
  });

  // If entry angle matches target angle, straight line
  if (entryAngle === targetAngle) {
    waypoints.push({
      x: to.vertexX,
      y: to.vertexY,
      type: "STATION",
      incomingAngle: targetAngle,
    });
    return waypoints;
  }

  // Need to insert bend
  const bendPoint = calculateOptimalBendPosition(
    from,
    to,
    entryAngle,
    targetAngle,
  );

  waypoints.push({
    x: bendPoint.x,
    y: bendPoint.y,
    type: "BEND",
    incomingAngle: entryAngle,
    outgoingAngle: targetAngle,
  });

  // End at 'to' station
  waypoints.push({
    x: to.vertexX,
    y: to.vertexY,
    type: "STATION",
    incomingAngle: targetAngle,
  });

  return waypoints;
}

/**
 * Calculate path segment between two stations
 */
export function calculateSegmentPath(
  from: Station,
  to: Station,
  previousAngle: Direction | null,
): LineSegment {
  // Determine ideal direct angle
  const directAngle = calculateSnapAngle(from, to);

  // Entry angle at 'from' station
  const entryAngle = previousAngle ?? directAngle;

  // Generate waypoints with bends
  const waypoints = generateWaypoints(from, to, entryAngle, directAngle);

  // Exit angle at 'to' station
  const exitAngle = directAngle;

  return {
    fromStation: from,
    toStation: to,
    entryAngle,
    exitAngle,
    waypoints,
  };
}
