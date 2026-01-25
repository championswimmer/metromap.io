# Harry Beck Style Metro Line Rendering - Technical Deep Dive

## 1. Core Concepts

### 1.1 Grid System
```typescript
interface GridSystem {
  // Grid squares: M×N (e.g., 32×48)
  // Vertices/Intersections: (M+1)×(N+1) (e.g., 33×49)
  // Stations placed at vertices
  
  gridWidth: number;    // N
  gridHeight: number;   // M
  cellSize: number;     // pixels per grid square
}

interface Station {
  x: number;  // 0 to N (vertex coordinates)
  y: number;  // 0 to M (vertex coordinates)
}
```

### 1.2 Allowed Directions
```typescript
enum Direction {
  EAST = 0,        // 0°
  SOUTHEAST = 45,  // 45°
  SOUTH = 90,      // 90°
  SOUTHWEST = 135, // 135°
  WEST = 180,      // 180°
  NORTHWEST = 225, // 225°
  NORTH = 270,     // 270°
  NORTHEAST = 315  // 315°
}

// Direction vectors (normalized)
const DIRECTION_VECTORS = {
  [Direction.EAST]:      { dx: 1,  dy: 0 },
  [Direction.SOUTHEAST]: { dx: 1,  dy: 1 },
  [Direction.SOUTH]:     { dx: 0,  dy: 1 },
  [Direction.SOUTHWEST]: { dx: -1, dy: 1 },
  [Direction.WEST]:      { dx: -1, dy: 0 },
  [Direction.NORTHWEST]: { dx: -1, dy: -1 },
  [Direction.NORTH]:     { dx: 0,  dy: -1 },
  [Direction.NORTHEAST]: { dx: 1,  dy: -1 },
};
```

## 2. Path Calculation Algorithm

### 2.1 Station-to-Station Segment Processing
```typescript
interface LineSegment {
  fromStation: Station;
  toStation: Station;
  entryAngle: number;    // angle line enters 'from' station
  exitAngle: number;     // angle line exits 'to' station
  waypoints: Waypoint[]; // intermediate points including bends
}

interface Waypoint {
  x: number;
  y: number;
  type: 'STATION' | 'BEND' | 'INTERMEDIATE';
  incomingAngle?: number;
  outgoingAngle?: number;
}

function calculateSegmentPath(
  from: Station, 
  to: Station,
  previousAngle: number | null, // angle arriving at 'from' station
  nextSegment: Station | null    // to determine exit angle constraint
): LineSegment {
  
  // Step 1: Determine ideal direct angle
  const directAngle = calculateSnapAngle(from, to);
  
  // Step 2: Determine entry angle at 'from' station
  const entryAngle = previousAngle ?? directAngle;
  
  // Step 3: Calculate waypoints with bends
  const waypoints = generateWaypoints(from, to, entryAngle, directAngle);
  
  // Step 4: Determine exit angle at 'to' station
  const exitAngle = waypoints[waypoints.length - 2]?.outgoingAngle ?? directAngle;
  
  return { fromStation: from, toStation: to, entryAngle, exitAngle, waypoints };
}
```

### 2.2 Angle Snapping
```typescript
function calculateSnapAngle(from: Station, to: Station): Direction {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  
  // Calculate raw angle in degrees
  const rawAngle = Math.atan2(dy, dx) * 180 / Math.PI;
  
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

function angleDifference(angle1: number, angle2: number): number {
  let diff = angle1 - angle2;
  // Normalize to -180 to 180 range
  while (diff > 180) diff -= 360;
  while (diff < -180) diff += 360;
  return diff;
}
```

### 2.3 Waypoint Generation
```typescript
function generateWaypoints(
  from: Station,
  to: Station,
  entryAngle: number,
  targetAngle: number
): Waypoint[] {
  
  const waypoints: Waypoint[] = [];
  
  // Start at 'from' station
  waypoints.push({
    x: from.x,
    y: from.y,
    type: 'STATION',
    outgoingAngle: entryAngle
  });
  
  // If entry angle matches target angle, straight line
  if (entryAngle === targetAngle) {
    waypoints.push({
      x: to.x,
      y: to.y,
      type: 'STATION',
      incomingAngle: targetAngle
    });
    return waypoints;
  }
  
  // Need to insert bend(s)
  const bends = calculateBendPoints(from, to, entryAngle, targetAngle);
  waypoints.push(...bends);
  
  // End at 'to' station
  const finalAngle = bends[bends.length - 1]?.outgoingAngle ?? targetAngle;
  waypoints.push({
    x: to.x,
    y: to.y,
    type: 'STATION',
    incomingAngle: finalAngle
  });
  
  return waypoints;
}
```

## 3. Bend Point Calculation

### 3.1 Single Bend Strategy
```typescript
function calculateBendPoints(
  from: Station,
  to: Station,
  entryAngle: number,
  targetAngle: number
): Waypoint[] {
  
  const angleDiff = normalizeAngle(targetAngle - entryAngle);
  
  // Calculate bend position along the path
  // Bend should be approximately midway but adjusted for aesthetics
  const bendPoint = calculateOptimalBendPosition(from, to, entryAngle, targetAngle);
  
  return [{
    x: bendPoint.x,
    y: bendPoint.y,
    type: 'BEND',
    incomingAngle: entryAngle,
    outgoingAngle: targetAngle
  }];
}

function calculateOptimalBendPosition(
  from: Station,
  to: Station,
  angle1: number,
  angle2: number
): { x: number, y: number } {
  
  // Travel from 'from' station in angle1 direction
  // Travel backward from 'to' station in angle2 direction
  // Find intersection point
  
  const dir1 = DIRECTION_VECTORS[angle1];
  const dir2 = DIRECTION_VECTORS[angle2];
  
  // Parametric line equations:
  // Line 1: (from.x, from.y) + t1 * (dir1.dx, dir1.dy)
  // Line 2: (to.x, to.y) + t2 * (-dir2.dx, -dir2.dy)
  
  // Solve for intersection
  const intersection = solveLineIntersection(
    from.x, from.y, dir1.dx, dir1.dy,
    to.x, to.y, -dir2.dx, -dir2.dy
  );
  
  if (intersection) {
    return { x: intersection.x, y: intersection.y };
  }
  
  // Fallback: midpoint with slight offset
  return {
    x: (from.x + to.x) / 2,
    y: (from.y + to.y) / 2
  };
}

function solveLineIntersection(
  x1: number, y1: number, dx1: number, dy1: number,
  x2: number, y2: number, dx2: number, dy2: number
): { x: number, y: number } | null {
  
  // Line 1: x = x1 + t1 * dx1, y = y1 + t1 * dy1
  // Line 2: x = x2 + t2 * dx2, y = y2 + t2 * dy2
  
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
    y: y1 + t1 * dy1
  };
}
```

### 3.2 Handling Multiple Bends
```typescript
// For complex paths requiring 2+ direction changes
function calculateMultipleBendPoints(
  from: Station,
  to: Station,
  entryAngle: number,
  targetAngle: number
): Waypoint[] {
  
  const totalAngleChange = normalizeAngle(targetAngle - entryAngle);
  
  // Determine if we need 1, 2, or 3 bends
  const bendCount = Math.ceil(Math.abs(totalAngleChange) / 90);
  
  if (bendCount === 1) {
    return calculateBendPoints(from, to, entryAngle, targetAngle);
  }
  
  // For 2+ bends, divide the path into segments
  const waypoints: Waypoint[] = [];
  const angleStep = totalAngleChange / bendCount;
  
  let currentAngle = entryAngle;
  let currentPos = { x: from.x, y: from.y };
  
  const totalDistance = Math.hypot(to.x - from.x, to.y - from.y);
  const segmentLength = totalDistance / (bendCount + 1);
  
  for (let i = 0; i < bendCount; i++) {
    const nextAngle = normalizeAngle(currentAngle + angleStep);
    
    // Calculate bend position
    const dir = DIRECTION_VECTORS[currentAngle];
    const bendPos = {
      x: currentPos.x + segmentLength * dir.dx,
      y: currentPos.y + segmentLength * dir.dy
    };
    
    waypoints.push({
      x: bendPos.x,
      y: bendPos.y,
      type: 'BEND',
      incomingAngle: currentAngle,
      outgoingAngle: nextAngle
    });
    
    currentAngle = nextAngle;
    currentPos = bendPos;
  }
  
  return waypoints;
}

function normalizeAngle(angle: number): number {
  angle = angle % 360;
  if (angle > 180) angle -= 360;
  if (angle < -180) angle += 360;
  return angle;
}
```

## 4. Bezier Curve Rendering for Smooth Bends

### 4.1 Corner Rounding Parameters
```typescript
interface BendRenderConfig {
  lineWidth: number;        // e.g., 3px
  cornerRadius: number;     // distance from bend point where curve starts
  tightness: number;        // 0-1, controls bezier curve tightness
}

// Calculate corner radius based on line width and bend angle
function calculateCornerRadius(
  lineWidth: number,
  angleDiff: number
): number {
  // Larger angles need larger radius for smooth appearance
  const baseRadius = lineWidth * 2;
  const angleFactor = Math.abs(angleDiff) / 90; // 0-2 range
  
  return baseRadius * (1 + angleFactor * 0.5);
}
```

### 4.2 Bezier Control Point Calculation
```typescript
interface BezierCurve {
  start: { x: number, y: number };
  control1: { x: number, y: number };
  control2: { x: number, y: number };
  end: { x: number, y: number };
}

function createBendCurve(
  waypoint: Waypoint,
  incomingAngle: number,
  outgoingAngle: number,
  config: BendRenderConfig
): BezierCurve {
  
  const radius = calculateCornerRadius(
    config.lineWidth,
    outgoingAngle - incomingAngle
  );
  
  // Calculate where curve starts (along incoming direction)
  const inDir = DIRECTION_VECTORS[incomingAngle];
  const curveStart = {
    x: waypoint.x - radius * inDir.dx,
    y: waypoint.y - radius * inDir.dy
  };
  
  // Calculate where curve ends (along outgoing direction)
  const outDir = DIRECTION_VECTORS[outgoingAngle];
  const curveEnd = {
    x: waypoint.x + radius * outDir.dx,
    y: waypoint.y + radius * outDir.dy
  };
  
  // Calculate control points for smooth curve
  const controlDistance = radius * config.tightness;
  
  const control1 = {
    x: curveStart.x + controlDistance * inDir.dx,
    y: curveStart.y + controlDistance * inDir.dy
  };
  
  const control2 = {
    x: curveEnd.x - controlDistance * outDir.dx,
    y: curveEnd.y - controlDistance * outDir.dy
  };
  
  return { start: curveStart, control1, control2, end: curveEnd };
}
```

### 4.3 Alternative: Circular Arc Rendering
```typescript
// For perfect 90° and 45° bends, use circular arcs instead of bezier
function createBendArc(
  waypoint: Waypoint,
  incomingAngle: number,
  outgoingAngle: number,
  radius: number
): { centerX: number, centerY: number, startAngle: number, endAngle: number, radius: number } {
  
  const angleDiff = normalizeAngle(outgoingAngle - incomingAngle);
  
  // Determine arc center
  // For 90° right turn: center is perpendicular to incoming direction
  const perpAngle = incomingAngle + (angleDiff > 0 ? 90 : -90);
  const perpDir = DIRECTION_VECTORS[perpAngle];
  
  const center = {
    x: waypoint.x + radius * perpDir.dx,
    y: waypoint.y + radius * perpDir.dy
  };
  
  // Calculate start and end angles for arc
  const startAngle = incomingAngle + 180; // Opposite of incoming
  const endAngle = outgoingAngle;
  
  return {
    centerX: center.x,
    centerY: center.y,
    startAngle,
    endAngle,
    radius
  };
}
```

## 5. SVG Path Generation

### 5.1 Complete Path Builder
```typescript
function buildSVGPath(
  segments: LineSegment[],
  config: BendRenderConfig
): string {
  
  let path = '';
  
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const waypoints = segment.waypoints;
    
    // Start at first station (or continue from previous segment)
    if (i === 0) {
      const start = waypoints[0];
      path += `M ${start.x} ${start.y}`;
    }
    
    // Process each waypoint pair
    for (let j = 0; j < waypoints.length - 1; j++) {
      const current = waypoints[j];
      const next = waypoints[j + 1];
      
      if (next.type === 'BEND' || current.type === 'BEND') {
        // Add curved segment
        const curve = createBendCurve(
          current.type === 'BEND' ? current : next,
          current.outgoingAngle!,
          next.incomingAngle!,
          config
        );
        
        // Line to curve start
        path += ` L ${curve.start.x} ${curve.start.y}`;
        
        // Cubic bezier curve
        path += ` C ${curve.control1.x} ${curve.control1.y}, `;
        path += `${curve.control2.x} ${curve.control2.y}, `;
        path += `${curve.end.x} ${curve.end.y}`;
        
      } else {
        // Straight line segment
        path += ` L ${next.x} ${next.y}`;
      }
    }
  }
  
  return path;
}
```

### 5.2 Alternative: Canvas Rendering
```typescript
function renderLineToCanvas(
  ctx: CanvasRenderingContext2D,
  segments: LineSegment[],
  config: BendRenderConfig,
  color: string
): void {
  
  ctx.strokeStyle = color;
  ctx.lineWidth = config.lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  ctx.beginPath();
  
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const waypoints = segment.waypoints;
    
    if (i === 0) {
      ctx.moveTo(waypoints[0].x, waypoints[0].y);
    }
    
    for (let j = 0; j < waypoints.length - 1; j++) {
      const current = waypoints[j];
      const next = waypoints[j + 1];
      
      if (next.type === 'BEND' || current.type === 'BEND') {
        const curve = createBendCurve(
          current.type === 'BEND' ? current : next,
          current.outgoingAngle!,
          next.incomingAngle!,
          config
        );
        
        ctx.lineTo(curve.start.x, curve.start.y);
        ctx.bezierCurveTo(
          curve.control1.x, curve.control1.y,
          curve.control2.x, curve.control2.y,
          curve.end.x, curve.end.y
        );
        
      } else {
        ctx.lineTo(next.x, next.y);
      }
    }
  }
  
  ctx.stroke();
}
```

## 6. Complete Example Implementation

```typescript
class MetroLineRenderer {
  private gridSize: number;
  private config: BendRenderConfig;
  
  constructor(gridSize: number, lineWidth: number) {
    this.gridSize = gridSize;
    this.config = {
      lineWidth,
      cornerRadius: lineWidth * 2,
      tightness: 0.5
    };
  }
  
  // Main rendering function
  renderLine(
    stations: Station[],
    color: string,
    ctx: CanvasRenderingContext2D
  ): void {
    
    if (stations.length < 2) return;
    
    // Convert stations to pixel coordinates
    const pixelStations = stations.map(s => ({
      x: s.x * this.gridSize,
      y: s.y * this.gridSize
    }));
    
    // Calculate all segments with waypoints
    const segments: LineSegment[] = [];
    let previousAngle: number | null = null;
    
    for (let i = 0; i < pixelStations.length - 1; i++) {
      const from = pixelStations[i];
      const to = pixelStations[i + 1];
      const nextStation = pixelStations[i + 2] ?? null;
      
      const segment = calculateSegmentPath(from, to, previousAngle, nextStation);
      segments.push(segment);
      
      previousAngle = segment.exitAngle;
    }
    
    // Render to canvas
    renderLineToCanvas(ctx, segments, this.config, color);
    
    // Render stations on top
    this.renderStations(ctx, pixelStations);
  }
  
  private renderStations(
    ctx: CanvasRenderingContext2D,
    stations: { x: number, y: number }[]
  ): void {
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    
    stations.forEach(station => {
      ctx.beginPath();
      ctx.arc(station.x, station.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });
  }
}
```

## 7. Advanced: Handling Edge Cases

### 7.1 Stations Too Close Together
```typescript
function handleCloseStations(
  from: Station,
  to: Station,
  minDistance: number
): Waypoint[] {
  
  const distance = Math.hypot(to.x - from.x, to.y - from.y);
  
  if (distance < minDistance) {
    // Just draw straight line, skip bend calculation
    return [
      { x: from.x, y: from.y, type: 'STATION' },
      { x: to.x, y: to.y, type: 'STATION' }
    ];
  }
  
  // Normal processing
  return generateWaypoints(from, to, 0, 0);
}
```

### 7.2 Line Passes Through Station Without Stopping
```typescript
// When line passes through but doesn't stop
function renderThroughStation(
  station: Station,
  incomingAngle: number,
  outgoingAngle: number
): Waypoint[] {
  
  if (incomingAngle === outgoingAngle) {
    // Straight through - no waypoints needed
    return [];
  }
  
  // Add bend at station
  return [{
    x: station.x,
    y: station.y,
    type: 'BEND',
    incomingAngle,
    outgoingAngle
  }];
}
```

### 7.3 Optimizing Bend Placement for Aesthetics
```typescript
function optimizeBendPlacement(
  bend: Waypoint,
  from: Station,
  to: Station
): Waypoint {
  
  // Ensure bend is not too close to either station
  const minDistanceFromStation = 0.3; // 30% of segment length
  const segmentLength = Math.hypot(to.x - from.x, to.y - from.y);
  
  const distFromStart = Math.hypot(bend.x - from.x, bend.y - from.y);
  const distFromEnd = Math.hypot(bend.x - to.x, bend.y - to.y);
  
  if (distFromStart < segmentLength * minDistanceFromStation ||
      distFromEnd < segmentLength * minDistanceFromStation) {
    
    // Recalculate at midpoint
    return {
      ...bend,
      x: (from.x + to.x) / 2,
      y: (from.y + to.y) / 2
    };
  }
  
  return bend;
}
```

## 8. Visual Examples of Bend Calculations

### Example 1: 90° Bend
```
Station A (0,0) → Station B (3,2)
Entry angle: 0° (East)
Target angle: 90° (South)

Waypoints:
1. (0,0) STATION - outgoing 0°
2. (3,0) BEND - incoming 0°, outgoing 90°
3. (3,2) STATION - incoming 90°

Bezier curve at (3,0):
- Curve start: (2.5, 0)
- Control1: (2.8, 0)
- Control2: (3, 0.3)
- Curve end: (3, 0.5)
```

### Example 2: 45° Bend
```
Station A (0,0) → Station B (4,2)
Entry angle: 0° (East)
Target angle: 45° (Southeast)

Waypoints:
1. (0,0) STATION - outgoing 0°
2. (2,0) BEND - incoming 0°, outgoing 45°
3. (4,2) STATION - incoming 45°

Bezier curve at (2,0):
- Curve start: (1.6, 0)
- Control1: (1.8, 0)
- Control2: (2, 0.2)
- Curve end: (2.4, 0.4)
```

This system ensures that:
1. ✅ Lines only follow 0°/45°/90°/135°/180°/225°/270°/315° angles
2. ✅ Lines pass through stations in straight directions
3. ✅ Bends occur between stations, not at them
4. ✅ Bends are smoothly rendered with bezier curves
5. ✅ Line width is consistent through curves