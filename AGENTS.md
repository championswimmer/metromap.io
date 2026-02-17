# MetroMap.io - Agent Context Guide

## Game Concept

A Mini Metro-style simulation game where players design metro systems. Core gameplay loop:

1. **Map Generation**: Procedural maps with residential/commercial density zones and water features
2. **Infrastructure Building**: Place stations at grid intersections and draw metro lines (horizontal/vertical/diagonal only)
3. **Simulation**: Passengers spawn based on time-of-day and density, travel via pathfinding, complete journeys for score
4. **Optimization**: Minimize infrastructure cost while maximizing passenger journeys completed

## Tech Stack

- **Language**: TypeScript
- **Rendering**: Pixi.js v8 (2D Canvas/WebGL graphics engine)
- **Build Tool**: Vite
- **State Management**: Custom game loop with tick-based updates
- **UI Components**: @pixi/ui for interactive elements
- **Linting**: ESLint with Prettier

## Architecture Overview

The codebase follows a **separation of concerns** pattern with three main layers:

```
┌─────────────────────────────────────────────────────────────┐
│                     RENDERING LAYER                         │
│  (PixiJS-specific, handles all visual output and UI)        │
│  src/rendering/                                             │
├─────────────────────────────────────────────────────────────┤
│                     ENGINE LAYER                            │
│  (Infrastructure: navigation, audio, resize, storage)       │
│  src/engine/                                                │
├─────────────────────────────────────────────────────────────┤
│                     CORE GAME LAYER                         │
│  (Pure TypeScript, no rendering dependencies)               │
│  src/core/                                                  │
└─────────────────────────────────────────────────────────────┘
```

## Code Structure

### `/src/main.ts`

Entry point - initializes CreationEngine, shows LoadScreen → MapPickerScreen or restores saved game

### `/src/core/`

**Pure game logic** - no rendering dependencies, fully testable in isolation:

#### `/src/core/game/`

- `config.ts` - Game constants (tile size, speeds, costs)
- `GameController.ts` - Central coordinator for all game logic, manages state and managers
- `MapGenerator.ts` - Procedural map generation (terrain, density layers using seeded random)

#### `/src/core/game/models/`

Core data structures:

- `MapGrid.ts` - 48×32 grid with land/water and density data
- `Station.ts` - Metro stations at grid intersections
- `MetroLine.ts` - Metro lines connecting stations
- `Train.ts` - Rolling stock entities
- `Passenger.ts` - Rider entities
- `GameState.ts` - Overall game state container with save/load

#### `/src/core/game/managers/`

Business logic managers (called by GameController):

- `StationManager.ts` - Station placement, validation, passenger queues
- `LineManager.ts` - Line creation, station connections, building mode
- `TrainManager.ts` - Train initialization, movement state

#### `/src/core/game/simulation/`

Runtime simulation systems:

- `PassengerSpawner.ts` - Spawn riders using density and time-of-day catchments
- `PassengerMovement.ts` - Boarding/alighting, transfers, journey completion
- `TrainMovement.ts` - Train init, accel/decel, dwell, loop/pendulum motion
- `Economics.ts` - Build/running costs and ticket revenue

#### `/src/core/game/pathfinding/`

- `StationGraph.ts` - Graph representation of station network
- `LinePath.ts` - Direction, segment, and waypoint utilities for line routing

#### `/src/core/interfaces/`

Abstraction contracts for renderer/platform independence:

- `IRenderer.ts` - Renderer interface (renderMap, renderStations, renderLines, renderTrains)
- `IInputHandler.ts` - Input abstraction (click, drag, key events)
- `types.ts` - Shared types (Vector2, LineColor, GameAction, etc.)

### `/src/rendering/`

**Rendering layer** - PixiJS-specific implementations:

#### `/src/rendering/pixi/`

- `PixiMapRenderer.ts` - Renders map grid, land/water, density visualization
- `PixiMetroRenderer.ts` - Renders stations, lines, trains, passengers

#### `/src/rendering/screens/`

Game screens (Pixi containers managed by navigation system):

- `LoadScreen.ts` - Initial loading screen
- `MapPickerScreen.ts` - Seed input and map generation UI
- `MetroBuildingScreen.ts` - Main gameplay screen (station placement, line drawing)
- `MetroSimulationScreen.ts` - Time progression, passenger spawning, train movement, money UI
- `main/` - Additional screens (Logo, Bouncer, MainScreen)

#### `/src/rendering/components/`

Reusable UI components built on @pixi/ui:

- `Button.ts`, `FlatButton.ts` - Interactive buttons
- `Label.ts` - Text labels
- `RoundedBox.ts` - Container with rounded corners
- `VolumeSlider.ts` - Audio control
- `Footer.ts` - Footer component

#### `/src/rendering/popups/`

Modal dialogs and overlays:

- `StationDetailPopup.ts` - Station details view
- `PausePopup.ts` - Pause menu
- `SettingsPopup.ts` - Settings dialog

### `/src/engine/`

Core engine infrastructure (not game-specific):

- `engine.ts` - CreationEngine class (extends Pixi Application)
- `utils/` - Resolution, storage, maths, randomness, async helpers
- `navigation/` - Screen navigation system
- `resize/` - Canvas resize handling
- `audio/` - Sound management (@pixi/sound)

### `/src/app/`

Minimal app utilities:

- `utils/userSettings.ts` - Persistent user preferences
- `getEngine.ts` - Access shared CreationEngine instance

## Key Game Mechanics (from specs)

### Grid System

- **48×32 grid squares** for density data (land/water, residential/office values 0-100)
- **49×33 vertices** (grid intersections) for station placement
- Coordinates use top-left origin (0,0)

### Map Generation

- **Seeded RNG** ensures reproducibility (same seed = same map)
- **Terrain**: 50% chance River (drunkard's walk) or Archipelago (Perlin noise)
- **Density Layers**: Simplex noise for residential/commercial clustering with inverse correlation

### Infrastructure

- **Stations**: Placed on grid intersections, have passenger queues
- **Lines**: Connect stations with 0°/45°/90° segments (Harry Beck style), immutable once built
- **Cost Tracking**: Stations, line segments, water crossings

### Simulation

- **24-hour time cycle** (accelerated time)
- **Speed controls**: 1x/2x/4x with pause/resume in `MetroSimulationScreen`
- **Passenger spawning**: Catchment-based (radius 2 land tiles) using density and time-of-day multipliers
  - Morning rush: Residential → Commercial (higher spawn, destination weight favors offices)
  - Evening rush: Commercial → Residential (higher spawn, destination weight favors homes)
  - Night: Greatly reduced spawn
- **Passenger movement**: Boards trains heading to next waypoint, transfers, completes journey for revenue
- **Train simulation**: Initializes one train per line, accelerates/decelerates per segment, dwells at stations, supports loops and end reversals
- **Economics**: Deducts station/line build costs and train running costs; ticket revenue on journey completion
- **Pathfinding**: BFS/Dijkstra on station graph
- **Scoring**: Journey completions tracked (via passenger lifecycle)

## Development Workflow

### Running Locally

```bash
npm install
npm run dev       # Start dev server
npm run build     # Production build
npm run lint      # Run ESLint
```

### File Modification Guidelines

- **Game logic changes**: Work in `/src/core/game/`
- **New managers**: Add to `/src/core/game/managers/`
- **New models**: Add to `/src/core/game/models/`
- **Rendering changes**: Work in `/src/rendering/pixi/`
- **New screens**: Add to `/src/rendering/screens/`
- **UI components**: Extend `/src/rendering/components/`
- **Engine changes**: Only modify `/src/engine/` for infrastructure needs

### Common Tasks

- **Add station logic**: Modify `models/Station.ts` + `StationManager.ts`
- **Change map generation**: Edit `MapGenerator.ts` (uses seedrandom patterns)
- **Update pathfinding**: Work in `pathfinding/` directory
- **New UI screen**: Create in `rendering/screens/`, register with navigation
- **Tweak visuals**: Adjust Pixi graphics in `rendering/pixi/PixiMapRenderer.ts` or `PixiMetroRenderer.ts`
- **Add game action**: Add to `GameController.ts`, may need manager updates

## Important Constraints

- Lines must follow 0°/45°/90° angles (Harry Beck transit map style)
- Stations snap to grid intersections only
- Lines are immutable after placement (no deletion in current version)
- Water crossings cost more infrastructure points
- Passenger destinations are shape-coded (circle/square/triangle)
- Core layer (`/src/core/`) must have NO rendering dependencies

## Where to Find What

- **Map data structures**: `core/game/models/MapGrid.ts`
- **Game controller**: `core/game/GameController.ts`
- **Station management**: `core/game/managers/StationManager.ts`
- **Line management**: `core/game/managers/LineManager.ts`
- **Rendering logic**: `rendering/pixi/PixiMapRenderer.ts`, `PixiMetroRenderer.ts`
- **Generation algorithms**: `core/game/MapGenerator.ts`
- **Player interactions**: `rendering/screens/MetroBuildingScreen.ts`
- **Passenger simulation**: `core/game/simulation/PassengerSpawner.ts`, `PassengerMovement.ts`
- **Train simulation**: `core/game/simulation/TrainMovement.ts`
- **Line drawing UI**: `rendering/screens/MetroBuildingScreen.ts`
- **Pathfinding**: `core/game/pathfinding/`
- **Renderer interface**: `core/interfaces/IRenderer.ts`
