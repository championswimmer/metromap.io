# MetroMap.io

[![Deploy Status](https://github.com/championswimmer/metromap.io/actions/workflows/gh-pages.yml/badge.svg)](https://github.com/championswimmer/metromap.io/actions/workflows/gh-pages.yml)
![TypeScript](https://img.shields.io/badge/TypeScript-blue?logo=typescript&logoColor=white)
![PixiJS v8](https://img.shields.io/badge/PixiJS-v8-ff69b4)
![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)
![ESLint](https://img.shields.io/badge/ESLint-4B32C3?logo=eslint&logoColor=white)
![Prettier](https://img.shields.io/badge/Prettier-F7B93E?logo=prettier&logoColor=black)

Design and grow a minimalist metro system. Balance construction costs, train operations, and rider demand to complete as many journeys as possible on procedurally generated maps.

> Looking for code structure and implementation details? See [AGENTS.md](./AGENTS.md) for a developer‑oriented deep dive. This README focuses on what the game is and how it plays.

## What Is This Game?
A Mini Metro–style simulation where you place stations at grid intersections and connect them using metro lines restricted to clean 0°/45°/90° angles (Harry Beck style). Passengers spawn based on surrounding population, time‑of‑day, and land/water constraints. They ride your network using pathfinding, generating ticket revenue when they complete journeys. Your goal is to maximize completed trips while keeping infrastructure and running costs under control.

## How It Works
- Procedural maps via seeded RNG ensure the same seed always produces the same world.
- Stations snap to grid intersections; lines are straight segments at 0°/45°/90° and cannot be edited once placed.
- Passengers appear in catchment areas near stations, prefer destinations by time‑of‑day, and transfer between lines as needed.
- One train per line to start; trains accelerate/decelerate per segment and dwell at stations.
- Score climbs with completed journeys; finances track build costs, running costs, and ticket revenue.

## Map Types
- River: A meandering river (drunkard’s walk) divides landmasses. Crossing water is possible but expensive.
- Archipelago: Island clusters (noise‑based terrain) create multiple separated land tiles. Bridge/tunnel crossings are costlier here too.

## Population & Demand
- Density Grid: Each land tile has residential and commercial density (0–100). Water tiles block stations and reduce catchments.
- Catchments: A station draws passengers from a small radius (2 land tiles) around it.
- Time‑of‑Day:
  - Morning Rush: Homes → Offices dominate; higher spawn rates and destination weighting toward commercial areas.
  - Evening Rush: Offices → Homes dominate; higher spawn and reverse weighting.
  - Night: Greatly reduced spawn across the board.

## Building the Network
- Stations: Place only on grid intersections. Each has a queue where passengers wait.
- Lines: Draw immutable segments between stations using only 0°/45°/90°. Simple, readable geometry keeps layouts clean.
- Water Crossings: Segments over water cost more to build, so plan your bridges/tunnels carefully.

## Trains & Passenger Movement
- Initialization: Each line starts with a single train.
- Movement: Trains accelerate/decelerate per segment and dwell briefly at stations.
- Boarding/Alighting: Passengers board trains that move them toward their next waypoint; they transfer lines when necessary.
- Completion: Finishing a journey yields ticket revenue and increases your score.

## Economics & Scoring
- Build Costs: Pay for every station and each line segment; water crossings add significant premiums.
- Running Costs: Trains consume operating budget over time.
- Revenue: Earn tickets when passengers complete journeys.
- Objective: Maximize completed trips while keeping your network financially sustainable.

## Play Locally
1. npm install
2. npm run dev (start the Vite dev server)
3. npm run build (production build)
4. npm run lint (ESLint + Prettier)

## Codebase Guide
This project’s code and file structure, engine notes, and common development tasks are documented in ./AGENTS.md. Refer there when modifying game logic, renderers, or screens.

