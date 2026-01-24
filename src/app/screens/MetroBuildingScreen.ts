/**
 * Metro Building Screen for MetroMap.io
 * Allows users to place stations and build metro lines
 */

import { animate } from "motion";
import { Container, Graphics, FederatedPointerEvent } from "pixi.js";

import { MapRenderer } from "../game/MapRenderer";
import type { MapGrid } from "../game/models/MapGrid";
import type { Station } from "../game/models/Station";
import { generateStationId } from "../game/models/Station";
import type { GameState } from "../game/models/GameState";
import { createGameState } from "../game/models/GameState";
import { FlatButton } from "../ui/FlatButton";
import { Label } from "../ui/Label";

const TILE_SIZE = 16;
const STATION_RADIUS = TILE_SIZE * 0.5; // 50% of square side
const STATION_COLOR = 0xffffff;
const STATION_BORDER_COLOR = 0x000000;
const STATION_BORDER_WIDTH = 2;

type StationMode = "NONE" | "ADDING" | "REMOVING";

export class MetroBuildingScreen extends Container {
  /** Assets bundles required by this screen */
  public static assetBundles = ["main"];

  private titleLabel: Label;
  private instructionLabel: Label;

  private addStationButton: FlatButton;
  private removeStationButton: FlatButton;
  private showResidentialButton: FlatButton;
  private showOfficeButton: FlatButton;
  private showDefaultButton: FlatButton;
  private showBothButton: FlatButton;

  private mapRenderer: MapRenderer;
  private mapContainer: Container;
  private mapBackground: Graphics;
  private stationsLayer: Graphics;

  private gameState!: GameState;
  private stationMode: StationMode = "NONE";

  constructor() {
    super();

    // Title
    this.titleLabel = new Label({
      text: "Build Your Metro",
      style: {
        fontSize: 36,
        fill: 0xffffff,
      },
    });
    this.addChild(this.titleLabel);

    // Instructions
    this.instructionLabel = new Label({
      text: "Click + Station to add stations at grid vertices",
      style: {
        fontSize: 18,
        fill: 0xcccccc,
      },
    });
    this.addChild(this.instructionLabel);

    // Map display container
    this.mapContainer = new Container();
    this.addChild(this.mapContainer);

    // Map background (border)
    this.mapBackground = new Graphics();
    this.mapContainer.addChild(this.mapBackground);

    // Map renderer
    this.mapRenderer = new MapRenderer();
    this.mapContainer.addChild(this.mapRenderer);

    // Stations layer (drawn on top of map)
    this.stationsLayer = new Graphics();
    this.mapContainer.addChild(this.stationsLayer);

    // Make map interactive
    this.mapContainer.eventMode = "static";
    this.mapContainer.on("pointerdown", this.onMapClick.bind(this));

    // Add station button
    this.addStationButton = new FlatButton({
      text: "+ Station",
      width: 120,
      height: 50,
      fontSize: 18,
      backgroundColor: 0x4a90e2,
    });
    this.addStationButton.onPress.connect(() =>
      this.toggleStationMode("ADDING"),
    );
    this.addChild(this.addStationButton);

    // Remove station button
    this.removeStationButton = new FlatButton({
      text: "- Station",
      width: 120,
      height: 50,
      fontSize: 18,
      backgroundColor: 0xe74c3c,
    });
    this.removeStationButton.onPress.connect(() =>
      this.toggleStationMode("REMOVING"),
    );
    this.addChild(this.removeStationButton);

    // Visualization mode buttons
    this.showDefaultButton = new FlatButton({
      text: "Default",
      width: 100,
      height: 40,
      fontSize: 16,
      backgroundColor: 0x666666,
    });
    this.showDefaultButton.onPress.connect(() =>
      this.setVisualizationMode("DEFAULT"),
    );
    this.addChild(this.showDefaultButton);

    this.showResidentialButton = new FlatButton({
      text: "Residential",
      width: 120,
      height: 40,
      fontSize: 16,
      backgroundColor: 0x44aa44,
    });
    this.showResidentialButton.onPress.connect(() =>
      this.setVisualizationMode("RESIDENTIAL"),
    );
    this.addChild(this.showResidentialButton);

    this.showOfficeButton = new FlatButton({
      text: "Office",
      width: 100,
      height: 40,
      fontSize: 16,
      backgroundColor: 0xcc4444,
    });
    this.showOfficeButton.onPress.connect(() =>
      this.setVisualizationMode("OFFICE"),
    );
    this.addChild(this.showOfficeButton);

    this.showBothButton = new FlatButton({
      text: "Both",
      width: 100,
      height: 40,
      fontSize: 16,
      backgroundColor: 0x8855aa,
    });
    this.showBothButton.onPress.connect(() =>
      this.setVisualizationMode("BOTH"),
    );
    this.addChild(this.showBothButton);
  }

  /**
   * Set the map to display
   */
  public setMap(map: MapGrid): void {
    // Initialize game state
    this.gameState = createGameState(map.seed, map);
    this.mapRenderer.renderMap(map);
    this.drawMapBackground();
  }

  /**
   * Toggle station mode (adding/removing)
   */
  private toggleStationMode(mode: "ADDING" | "REMOVING"): void {
    // If clicking the same mode, turn it off
    if (this.stationMode === mode) {
      this.stationMode = "NONE";
      this.addStationButton.alpha = 0.8;
      this.removeStationButton.alpha = 0.8;
      this.addStationButton.textView = "+ Station";
      this.removeStationButton.textView = "- Station";
      this.instructionLabel.text = "Click + or - to add or remove stations";
    } else {
      this.stationMode = mode;

      if (mode === "ADDING") {
        this.addStationButton.alpha = 1.0;
        this.removeStationButton.alpha = 0.8;
        this.addStationButton.textView = "✓ Adding...";
        this.removeStationButton.textView = "- Station";
        this.instructionLabel.text = "Click on grid vertices to place stations";
      } else {
        this.addStationButton.alpha = 0.8;
        this.removeStationButton.alpha = 1.0;
        this.addStationButton.textView = "+ Station";
        this.removeStationButton.textView = "✓ Removing...";
        this.instructionLabel.text =
          "Click on existing stations to remove them";
      }
    }
  }

  /**
   * Handle map click to add or remove stations
   */
  private onMapClick(event: FederatedPointerEvent): void {
    if (this.stationMode === "NONE") return;

    // Get click position relative to map renderer
    const localPos = this.mapRenderer.toLocal(event.global);

    // Convert to vertex coordinates
    // Vertices are at the intersections, so we round to nearest vertex
    const vertexX = Math.round(localPos.x / TILE_SIZE);
    const vertexY = Math.round(localPos.y / TILE_SIZE);

    // Validate vertex is within bounds
    if (
      vertexX < 0 ||
      vertexX > this.gameState.map.width ||
      vertexY < 0 ||
      vertexY > this.gameState.map.height
    ) {
      return;
    }

    if (this.stationMode === "ADDING") {
      this.handleAddStation(vertexX, vertexY);
    } else if (this.stationMode === "REMOVING") {
      this.handleRemoveStation(vertexX, vertexY);
    }
  }

  /**
   * Handle adding a station
   */
  private handleAddStation(vertexX: number, vertexY: number): void {
    // Check if station already exists at this vertex
    if (this.hasStationAt(vertexX, vertexY)) {
      console.log("Station already exists at this vertex");
      return;
    }

    // Check if any adjacent vertex has a station (minimum spacing rule)
    if (this.hasAdjacentStation(vertexX, vertexY)) {
      console.log("Cannot place station adjacent to another station");
      return;
    }

    // Add the station
    this.addStation(vertexX, vertexY);
  }

  /**
   * Handle removing a station
   */
  private handleRemoveStation(vertexX: number, vertexY: number): void {
    const stationId = generateStationId(vertexX, vertexY);
    const index = this.gameState.stations.findIndex((s) => s.id === stationId);

    if (index === -1) {
      console.log("No station at this vertex");
      return;
    }

    // Remove the station
    this.gameState.stations.splice(index, 1);
    console.log(`Removed station at vertex (${vertexX}, ${vertexY})`);

    // Redraw stations
    this.drawStations();
  }

  /**
   * Check if a station exists at given vertex
   */
  private hasStationAt(vertexX: number, vertexY: number): boolean {
    const stationId = generateStationId(vertexX, vertexY);
    return this.gameState.stations.some((s) => s.id === stationId);
  }

  /**
   * Check if any adjacent vertex (4-connected) has a station
   */
  private hasAdjacentStation(vertexX: number, vertexY: number): boolean {
    const adjacentVertices = [
      { x: vertexX - 1, y: vertexY }, // left
      { x: vertexX + 1, y: vertexY }, // right
      { x: vertexX, y: vertexY - 1 }, // up
      { x: vertexX, y: vertexY + 1 }, // down
    ];

    return adjacentVertices.some((v) => this.hasStationAt(v.x, v.y));
  }

  /**
   * Add a station at the given vertex
   */
  private addStation(vertexX: number, vertexY: number): void {
    const station: Station = {
      id: generateStationId(vertexX, vertexY),
      vertexX,
      vertexY,
    };

    this.gameState.stations.push(station);
    console.log(
      `Added station ${station.id} at vertex (${vertexX}, ${vertexY})`,
    );

    // Redraw stations
    this.drawStations();
  }

  /**
   * Draw all stations
   */
  private drawStations(): void {
    this.stationsLayer.clear();

    for (const station of this.gameState.stations) {
      const px = station.vertexX * TILE_SIZE;
      const py = station.vertexY * TILE_SIZE;

      // Draw station circle
      this.stationsLayer.circle(px, py, STATION_RADIUS);
      this.stationsLayer.fill(STATION_COLOR);

      // Draw border
      this.stationsLayer.circle(px, py, STATION_RADIUS);
      this.stationsLayer.stroke({
        width: STATION_BORDER_WIDTH,
        color: STATION_BORDER_COLOR,
      });
    }
  }

  /**
   * Set visualization mode
   */
  private setVisualizationMode(
    mode: "DEFAULT" | "RESIDENTIAL" | "OFFICE" | "BOTH",
  ): void {
    this.mapRenderer.setVisualizationMode(mode);

    // Update button styles to show active state
    const activeOpacity = 1.0;
    const inactiveOpacity = 0.6;

    this.showDefaultButton.alpha =
      mode === "DEFAULT" ? activeOpacity : inactiveOpacity;
    this.showResidentialButton.alpha =
      mode === "RESIDENTIAL" ? activeOpacity : inactiveOpacity;
    this.showOfficeButton.alpha =
      mode === "OFFICE" ? activeOpacity : inactiveOpacity;
    this.showBothButton.alpha =
      mode === "BOTH" ? activeOpacity : inactiveOpacity;
  }

  /**
   * Draw background/border for the map
   */
  private drawMapBackground(): void {
    this.mapBackground.clear();

    const mapWidth = this.mapRenderer.getMapWidth();
    const mapHeight = this.mapRenderer.getMapHeight();
    const padding = 4;

    // Border
    this.mapBackground.roundRect(
      -padding,
      -padding,
      mapWidth + padding * 2,
      mapHeight + padding * 2,
      4,
    );
    this.mapBackground.fill({ color: 0x333333 });
  }

  /** Prepare the screen just before showing */
  public prepare() {
    // Reset to initial state if needed
  }

  /** Update the screen */
  public update() {
    // No per-frame updates needed for this screen
  }

  /** Pause gameplay */
  public async pause() {}

  /** Resume gameplay */
  public async resume() {}

  /** Fully reset */
  public reset() {}

  /** Resize the screen */
  public resize(width: number, height: number) {
    const centerX = width * 0.5;

    // Title at top
    this.titleLabel.x = centerX;
    this.titleLabel.y = 30;

    // Instructions below title
    this.instructionLabel.x = centerX;
    this.instructionLabel.y = 70;

    // Control buttons at bottom
    const bottomY = height - 100;

    // Station control buttons on left
    this.addStationButton.x = centerX - 310;
    this.addStationButton.y = bottomY;

    this.removeStationButton.x = centerX - 180;
    this.removeStationButton.y = bottomY;

    // Visualization mode buttons on right
    this.showDefaultButton.x = centerX - 45;
    this.showDefaultButton.y = bottomY;

    this.showResidentialButton.x = centerX + 65;
    this.showResidentialButton.y = bottomY;

    this.showOfficeButton.x = centerX + 185;
    this.showOfficeButton.y = bottomY;

    this.showBothButton.x = centerX + 295;
    this.showBothButton.y = bottomY;

    // Map display - centered
    const mapWidth = this.mapRenderer.getMapWidth();
    const mapHeight = this.mapRenderer.getMapHeight();

    // Scale map to fit if needed
    const mapStartY = 110;
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
    // Fade in all elements
    const elementsToAnimate = [
      this.titleLabel,
      this.instructionLabel,
      this.addStationButton,
      this.removeStationButton,
      this.showDefaultButton,
      this.showResidentialButton,
      this.showOfficeButton,
      this.showBothButton,
      this.mapContainer,
    ];

    for (const element of elementsToAnimate) {
      element.alpha = 0;
    }

    await animate(
      elementsToAnimate,
      { alpha: 1 },
      { duration: 0.4, ease: "easeOut" },
    );
  }

  /** Hide screen with animations */
  public async hide() {
    // Navigation handles cleanup
  }

  /** Handle window blur */
  public blur() {}

  /** Handle window focus */
  public focus() {}

  /**
   * Get the current game state
   */
  public getGameState(): GameState {
    return this.gameState;
  }
}
