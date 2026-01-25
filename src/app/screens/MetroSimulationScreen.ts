/**
 * Metro Simulation Screen for MetroMap.io
 * Runs the metro simulation with time progression and passenger movement
 */

import { Container, Graphics, Ticker } from "pixi.js";
import { animate } from "motion";

import { MapRenderer } from "../game/MapRenderer";
import type { GameState } from "../game/models/GameState";
import { saveGameState } from "../game/models/GameState";
import { FlatButton } from "../ui/FlatButton";
import { Label } from "../ui/Label";

const TILE_SIZE = 16;
const STATION_RADIUS = TILE_SIZE * 0.5;
const STATION_COLOR = 0xffffff;
const STATION_BORDER_COLOR = 0x000000;
const STATION_BORDER_WIDTH = 2;

// Time progression speeds (milliseconds per real second)
const SPEED_1X = 5 * 60 * 1000; // 5 minutes per second (12 seconds = 1 hour)
const SPEED_2X = 10 * 60 * 1000; // 10 minutes per second (6 seconds = 1 hour)
const SPEED_4X = 20 * 60 * 1000; // 20 minutes per second (3 seconds = 1 hour)
const SPEED_12X = 60 * 60 * 1000; // 60 minutes per second (1 second = 1 hour)

type SimulationSpeed = "1x" | "2x" | "4x" | "12x";

export class MetroSimulationScreen extends Container {
  /** Assets bundles required by this screen */
  public static assetBundles = ["main"];

  private titleLabel: Label;
  private clockLabel: Label;

  private stopButton: FlatButton;
  private speed1xButton: FlatButton;
  private speed2xButton: FlatButton;
  private speed4xButton: FlatButton;
  private speed12xButton: FlatButton;

  private mapRenderer: MapRenderer;
  private mapContainer: Container;
  private mapBackground: Graphics;
  private linesLayer: Graphics;
  private stationsLayer: Graphics;

  private gameState!: GameState;
  private isRunning: boolean = false;
  private currentSpeed: SimulationSpeed = "1x";
  private lastUpdateTime: number = 0;

  constructor() {
    super();

    // Title
    this.titleLabel = new Label({
      text: "Metro Simulation",
      style: {
        fontSize: 36,
        fill: 0xffffff,
      },
    });
    this.addChild(this.titleLabel);

    // Clock display
    this.clockLabel = new Label({
      text: this.formatDateTime(new Date("2025-01-01T08:00:00")),
      style: {
        fontSize: 24,
        fill: 0x88ccff,
        fontFamily: "monospace",
      },
    });
    this.addChild(this.clockLabel);

    // Stop simulation button
    this.stopButton = new FlatButton({
      text: "Stop Simulation",
      width: 160,
      height: 50,
      fontSize: 18,
      backgroundColor: 0xe74c3c,
    });
    this.stopButton.onPress.connect(() => this.stopSimulation());
    this.addChild(this.stopButton);

    // Speed control buttons
    this.speed1xButton = new FlatButton({
      text: "1x",
      width: 60,
      height: 50,
      fontSize: 18,
      backgroundColor: 0x4a90e2,
    });
    this.speed1xButton.onPress.connect(() => this.setSpeed("1x"));
    this.addChild(this.speed1xButton);

    this.speed2xButton = new FlatButton({
      text: "2x",
      width: 60,
      height: 50,
      fontSize: 18,
      backgroundColor: 0x555555,
    });
    this.speed2xButton.onPress.connect(() => this.setSpeed("2x"));
    this.addChild(this.speed2xButton);

    this.speed4xButton = new FlatButton({
      text: "4x",
      width: 60,
      height: 50,
      fontSize: 18,
      backgroundColor: 0x555555,
    });
    this.speed4xButton.onPress.connect(() => this.setSpeed("4x"));
    this.addChild(this.speed4xButton);

    this.speed12xButton = new FlatButton({
      text: "12x",
      width: 60,
      height: 50,
      fontSize: 18,
      backgroundColor: 0x555555,
    });
    this.speed12xButton.onPress.connect(() => this.setSpeed("12x"));
    this.addChild(this.speed12xButton);

    // Map display container
    this.mapContainer = new Container();
    this.addChild(this.mapContainer);

    // Map background
    this.mapBackground = new Graphics();
    this.mapContainer.addChild(this.mapBackground);

    // Map renderer
    this.mapRenderer = new MapRenderer();
    this.mapContainer.addChild(this.mapRenderer);

    // Lines layer
    this.linesLayer = new Graphics();
    this.mapContainer.addChild(this.linesLayer);

    // Stations layer
    this.stationsLayer = new Graphics();
    this.mapContainer.addChild(this.stationsLayer);
  }

  /**
   * Format date and time for display
   */
  private formatDateTime(date: Date): string {
    // Check if date is valid
    if (!date || isNaN(date.getTime())) {
      const defaultDate = new Date("2025-01-01T08:00:00");
      return this.formatDateTime(defaultDate);
    }

    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  }

  /**
   * Set simulation speed
   */
  private setSpeed(speed: SimulationSpeed): void {
    this.currentSpeed = speed;

    // Update button visual states
    // Use tint to change color (0xffffff = original, darker = inactive)
    if (speed === "1x") {
      this.speed1xButton.alpha = 1.0;
      (this.speed1xButton.defaultView as Graphics).tint = 0x4a90e2; // Blue
      this.speed2xButton.alpha = 0.7;
      (this.speed2xButton.defaultView as Graphics).tint = 0x888888; // Gray
      this.speed4xButton.alpha = 0.7;
      (this.speed4xButton.defaultView as Graphics).tint = 0x888888; // Gray
      this.speed12xButton.alpha = 0.7;
      (this.speed12xButton.defaultView as Graphics).tint = 0x888888; // Gray
    } else if (speed === "2x") {
      this.speed1xButton.alpha = 0.7;
      (this.speed1xButton.defaultView as Graphics).tint = 0x888888; // Gray
      this.speed2xButton.alpha = 1.0;
      (this.speed2xButton.defaultView as Graphics).tint = 0x4a90e2; // Blue
      this.speed4xButton.alpha = 0.7;
      (this.speed4xButton.defaultView as Graphics).tint = 0x888888; // Gray
      this.speed12xButton.alpha = 0.7;
      (this.speed12xButton.defaultView as Graphics).tint = 0x888888; // Gray
    } else if (speed === "4x") {
      this.speed1xButton.alpha = 0.7;
      (this.speed1xButton.defaultView as Graphics).tint = 0x888888; // Gray
      this.speed2xButton.alpha = 0.7;
      (this.speed2xButton.defaultView as Graphics).tint = 0x888888; // Gray
      this.speed4xButton.alpha = 1.0;
      (this.speed4xButton.defaultView as Graphics).tint = 0x4a90e2; // Blue
      this.speed12xButton.alpha = 0.7;
      (this.speed12xButton.defaultView as Graphics).tint = 0x888888; // Gray
    } else if (speed === "12x") {
      this.speed1xButton.alpha = 0.7;
      (this.speed1xButton.defaultView as Graphics).tint = 0x888888; // Gray
      this.speed2xButton.alpha = 0.7;
      (this.speed2xButton.defaultView as Graphics).tint = 0x888888; // Gray
      this.speed4xButton.alpha = 0.7;
      (this.speed4xButton.defaultView as Graphics).tint = 0x888888; // Gray
      this.speed12xButton.alpha = 1.0;
      (this.speed12xButton.defaultView as Graphics).tint = 0x4a90e2; // Blue
    }
  }

  /**
   * Stop simulation and return to building screen
   */
  private async stopSimulation(): Promise<void> {
    this.isRunning = false;

    // Save current state
    saveGameState(this.gameState);

    // Import and navigate to building screen
    const { MetroBuildingScreen } = await import("./MetroBuildingScreen");
    const { engine } = await import("../getEngine");

    await engine().navigation.showScreen(MetroBuildingScreen);
    const screen = engine().navigation.currentScreen as InstanceType<
      typeof MetroBuildingScreen
    >;
    if (screen && screen.setGameState) {
      screen.setGameState(this.gameState);
    }
  }

  /**
   * Update simulation - called every frame
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private updateSimulation = (_ticker: Ticker): void => {
    if (!this.isRunning) return;

    const currentTime = performance.now();
    const deltaSeconds = (currentTime - this.lastUpdateTime) / 1000;
    this.lastUpdateTime = currentTime;

    // Calculate time progression based on speed
    let timeMultiplier: number;
    switch (this.currentSpeed) {
      case "1x":
        timeMultiplier = SPEED_1X;
        break;
      case "2x":
        timeMultiplier = SPEED_2X;
        break;
      case "4x":
        timeMultiplier = SPEED_4X;
        break;
      case "12x":
        timeMultiplier = SPEED_12X;
        break;
    }

    // Update simulation time
    const timeIncrement = deltaSeconds * timeMultiplier;
    this.gameState.simulationTime += timeIncrement;

    // Update clock display
    const currentDate = new Date(this.gameState.simulationTime);
    this.clockLabel.text = this.formatDateTime(currentDate);

    // TODO: Update passengers, trains, etc.
  };

  /**
   * Start the simulation
   */
  public startSimulation(): void {
    this.isRunning = true;
    this.lastUpdateTime = performance.now();

    // Initialize button states
    this.setSpeed(this.currentSpeed);
  }

  /**
   * Set game state
   */
  public setGameState(gameState: GameState): void {
    this.gameState = gameState;

    // Ensure simulationTime is valid
    if (
      !this.gameState.simulationTime ||
      isNaN(this.gameState.simulationTime)
    ) {
      this.gameState.simulationTime = new Date("2025-01-01T08:00:00").getTime();
    }

    this.mapRenderer.renderMap(gameState.map);
    this.drawMapBackground();
    this.drawStations();
    this.drawLines();

    // Update clock display
    const currentDate = new Date(this.gameState.simulationTime);
    this.clockLabel.text = this.formatDateTime(currentDate);
  }

  /**
   * Draw map background
   */
  private drawMapBackground(): void {
    const mapWidth = this.gameState.map.width * TILE_SIZE;
    const mapHeight = this.gameState.map.height * TILE_SIZE;

    this.mapBackground.clear();
    this.mapBackground.rect(0, 0, mapWidth, mapHeight);
    this.mapBackground.stroke({ width: 2, color: 0x444444 });
  }

  /**
   * Draw all stations
   */
  private drawStations(): void {
    this.stationsLayer.clear();

    for (const station of this.gameState.stations) {
      const px = station.vertexX * TILE_SIZE;
      const py = station.vertexY * TILE_SIZE;

      this.stationsLayer.circle(px, py, STATION_RADIUS);
      this.stationsLayer.fill(STATION_COLOR);

      this.stationsLayer.circle(px, py, STATION_RADIUS);
      this.stationsLayer.stroke({
        width: STATION_BORDER_WIDTH,
        color: STATION_BORDER_COLOR,
      });
    }
  }

  /**
   * Draw all metro lines
   */
  private drawLines(): void {
    this.linesLayer.clear();

    // TODO: Implement line drawing (can copy from MetroBuildingScreen)
    // For now, just a placeholder
  }

  /**
   * Layout UI elements
   */
  public resize(width: number, height: number): void {
    const centerX = width * 0.5;

    // Title at top left
    this.titleLabel.x = 150;
    this.titleLabel.y = 30;

    // Clock at top right
    this.clockLabel.x = width - 250;
    this.clockLabel.y = 35;

    // Control buttons at bottom
    const bottomY = height - 80;

    this.stopButton.x = centerX - 280;
    this.stopButton.y = bottomY;

    this.speed1xButton.x = centerX + 100;
    this.speed1xButton.y = bottomY;

    this.speed2xButton.x = centerX + 170;
    this.speed2xButton.y = bottomY;

    this.speed4xButton.x = centerX + 240;
    this.speed4xButton.y = bottomY;

    this.speed12xButton.x = centerX + 310;
    this.speed12xButton.y = bottomY;

    // Map display - centered
    const mapWidth = this.mapRenderer.getMapWidth();
    const mapHeight = this.mapRenderer.getMapHeight();

    const mapStartY = 90;
    const availableHeight = height - mapStartY - 120;
    const availableWidth = width - 40;
    const scaleX = availableWidth / mapWidth;
    const scaleY = availableHeight / mapHeight;
    const mapScale = Math.min(1, scaleX, scaleY);

    this.mapContainer.scale.set(mapScale);
    this.mapContainer.x = centerX - (mapWidth * mapScale) / 2;
    this.mapContainer.y = mapStartY;
  }

  /** Show screen with animations */
  public async show(): Promise<void> {
    const elementsToAnimate = [
      this.titleLabel,
      this.clockLabel,
      this.stopButton,
      this.speed1xButton,
      this.speed2xButton,
      this.speed4xButton,
      this.speed12xButton,
      this.mapContainer,
    ];

    for (const element of elementsToAnimate) {
      element.alpha = 0;
    }

    await animate(elementsToAnimate, { alpha: [0, 1] }, { duration: 0.3 })
      .finished;
  }

  /** Called by navigation system every frame */
  public update(): void {
    // Delegate to our update simulation method
    this.updateSimulation(Ticker.shared);
  }

  /** Called when screen is removed */
  public onDestroy(): void {
    this.isRunning = false;
  }
}
