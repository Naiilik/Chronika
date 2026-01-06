import { animate } from "motion";
import type { AnimationPlaybackControls } from "motion/react";
import type { DestroyOptions, FederatedPointerEvent, Ticker } from "pixi.js";
import { Container, Graphics } from "pixi.js";

import { engine } from "../../getEngine";
import { Label } from "../../ui/Label";
import { Timeline } from "./Timeline";
import { TimelineControls } from "./TimelineControls";
import { TimelineDetailsPanel } from "./TimelineDetailsPanel";
import {
  TimelineSearchControls,
  type TimelineFilterState,
} from "./TimelineSearchControls";
import type { TimelineEntryData } from "./timelineData";
import { timelineStore } from "./timelineData";

/** The screen that holds the app */
export class MainScreen extends Container {
  /** Assets bundles required by this screen */
  public static assetBundles = ["main"];

  public mainContainer: Container;
  private timeline: Timeline;
  private paused = false;
  private zoomLevel = 1;
  private wheelCanvas?: HTMLCanvasElement;
  private panSurface: Graphics;
  private isPanning = false;
  private lastPanX = 0;
  private pointerAxisX = 0;
  private timelineStoreUnsubscribe?: () => void;
  private controls?: TimelineControls;
  private searchControls?: TimelineSearchControls;
  private detailPanel: TimelineDetailsPanel;
  private addEntryButton: Container;
  private addEntryButtonBackground: Graphics;
  private searchButton: Container;
  private searchButtonBackground: Graphics;
  private stageWidth = 0;
  private filterState: TimelineFilterState = { tags: [] };
  private readonly onWheel = (event: WheelEvent) => {
    event.preventDefault();
    const zoomFactor = Math.exp(-event.deltaY * 0.001);
    const nextZoom = this.zoomLevel * zoomFactor;
    this.zoomLevel = Math.min(1e6, Math.max(1e-6, nextZoom));
    this.timeline.zoomAt(this.pointerAxisX, this.zoomLevel);
  };

  constructor() {
    super();

    this.mainContainer = new Container();
    this.mainContainer.sortableChildren = true;
    this.addChild(this.mainContainer);
    this.panSurface = new Graphics();
    this.panSurface.zIndex = -1;
    this.panSurface.alpha = 0;
    this.panSurface.eventMode = "static";
    this.panSurface.cursor = "grab";
    this.panSurface.on("pointerdown", this.handlePanStart);
    this.panSurface.on("pointermove", this.handlePointerHover);
    this.panSurface.on("pointerover", this.handlePointerHover);
    this.panSurface.on("pointerup", this.handlePanEnd);
    this.panSurface.on("pointerupoutside", this.handlePanEnd);
    this.panSurface.on("pointercancel", this.handlePanEnd);
    this.panSurface.on("globalpointermove", this.handlePanMove);
    this.panSurface.on("globalpointerup", this.handlePanEnd);
    this.mainContainer.addChild(this.panSurface);
    this.timeline = new Timeline([], this.handleEntrySelected);
    this.timeline.zIndex = 1;
    this.mainContainer.addChild(this.timeline);
    this.timeline.setZoom(this.zoomLevel);
    this.timelineStoreUnsubscribe = timelineStore.subscribe((entries) => {
      this.timeline.setEntries(entries);
      this.applyFilters();
    });
    this.controls = new TimelineControls();
    this.detailPanel = new TimelineDetailsPanel();
    this.searchControls = new TimelineSearchControls(this.handleFilterChange);
    this.searchControls.close();
    this.attachWheelListener();

    this.addEntryButton = new Container();
    this.addEntryButton.eventMode = "static";
    this.addEntryButton.cursor = "pointer";
    this.addEntryButtonBackground = new Graphics();
    this.addEntryButton.addChild(this.addEntryButtonBackground);
    const icon = new Label({
      text: "+",
      style: {
        fontSize: 42,
        fill: 0xffffff,
        fontWeight: "600",
      },
    });
    this.addEntryButton.addChild(icon);
    this.addEntryButton.on("pointertap", this.handleAddEntryButtonPress);
    this.addEntryButton.on("pointerover", this.handleAddEntryButtonOver);
    this.addEntryButton.on("pointerout", this.handleAddEntryButtonOut);
    this.addEntryButton.on("pointerupoutside", this.handleAddEntryButtonOut);
    this.addChild(this.addEntryButton);
    this.addEntryButton.alpha = 0.95;
    this.searchButton = new Container();
    this.searchButton.eventMode = "static";
    this.searchButton.cursor = "pointer";
    this.searchButtonBackground = new Graphics();
    this.searchButton.addChild(this.searchButtonBackground);
    const searchIcon = new Label({
      text: "⌕",
      style: {
        fontSize: 34,
        fill: 0xffffff,
        fontWeight: "600",
      },
    });
    this.searchButton.addChild(searchIcon);
    this.searchButton.on("pointertap", this.handleSearchButtonPress);
    this.searchButton.on("pointerover", this.handleSearchButtonOver);
    this.searchButton.on("pointerout", this.handleSearchButtonOut);
    this.searchButton.on("pointerupoutside", this.handleSearchButtonOut);
    this.searchButton.alpha = 0.95;
    this.addChild(this.searchButton);
    this.layoutActionButtons();
    this.updateSearchButtonState();
  }

  /** Prepare the screen just before showing */
  public prepare() {}

  /** Update the screen */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public update(_time: Ticker) {
    if (this.paused) return;
  }

  /** Pause gameplay - automatically fired when a popup is presented */
  public async pause() {
    this.mainContainer.interactiveChildren = false;
    this.paused = true;
  }

  /** Resume gameplay */
  public async resume() {
    this.mainContainer.interactiveChildren = true;
    this.paused = false;
  }

  /** Fully reset */
  public reset() {}

  /** Resize the screen, fired whenever window size changes */
  public resize(width: number, height: number) {
    const centerX = width * 0.5;
    const centerY = height * 0.5;

    this.mainContainer.x = centerX;
    this.mainContainer.y = centerY;
    this.layoutActionButtons(width);

    this.panSurface
      .clear()
      .rect(-width / 2, -height / 2, width, height)
      .fill({ color: 0xffffff, alpha: 0.0001 });

    this.timeline.resize(width, height);
  }

  /** Show screen with animations */
  public async show(): Promise<void> {
    const elementsToAnimate = [this.addEntryButton, this.timeline];

    let finalPromise!: AnimationPlaybackControls;
    for (const element of elementsToAnimate) {
      element.alpha = 0;
      finalPromise = animate(
        element,
        { alpha: 1 },
        { duration: 0.3, delay: 0.75, ease: "backOut" },
      );
    }

    await finalPromise;
  }

  /** Hide screen with animations */
  public async hide() {}

  /** Auto pause the app when window go out of focus */
  public blur() {}

  public override destroy(options?: DestroyOptions): void {
    this.detachWheelListener();
    if (this.timelineStoreUnsubscribe) {
      this.timelineStoreUnsubscribe();
      this.timelineStoreUnsubscribe = undefined;
    }
    if (this.controls) {
      this.controls.destroy();
      this.controls = undefined;
    }
    this.detailPanel.destroy();
    if (this.searchControls) {
      this.searchControls.destroy();
      this.searchControls = undefined;
    }
    this.addEntryButton.removeListener(
      "pointertap",
      this.handleAddEntryButtonPress,
    );
    this.addEntryButton.removeListener(
      "pointerover",
      this.handleAddEntryButtonOver,
    );
    this.addEntryButton.removeListener(
      "pointerout",
      this.handleAddEntryButtonOut,
    );
    this.addEntryButton.removeListener(
      "pointerupoutside",
      this.handleAddEntryButtonOut,
    );
    this.searchButton.removeListener(
      "pointertap",
      this.handleSearchButtonPress,
    );
    this.searchButton.removeListener(
      "pointerover",
      this.handleSearchButtonOver,
    );
    this.searchButton.removeListener("pointerout", this.handleSearchButtonOut);
    this.searchButton.removeListener(
      "pointerupoutside",
      this.handleSearchButtonOut,
    );
    this.panSurface.removeListener("pointerdown", this.handlePanStart);
    this.panSurface.removeListener("pointermove", this.handlePointerHover);
    this.panSurface.removeListener("pointerover", this.handlePointerHover);
    this.panSurface.removeListener("pointerup", this.handlePanEnd);
    this.panSurface.removeListener("pointerupoutside", this.handlePanEnd);
    this.panSurface.removeListener("pointercancel", this.handlePanEnd);
    this.panSurface.removeListener("globalpointermove", this.handlePanMove);
    this.panSurface.removeListener("globalpointerup", this.handlePanEnd);
    super.destroy(options);
  }

  private attachWheelListener(): void {
    const canvas = engine().canvas;
    if (!canvas || this.wheelCanvas === canvas) return;
    this.detachWheelListener();
    this.wheelCanvas = canvas;
    this.wheelCanvas.addEventListener("wheel", this.onWheel, {
      passive: false,
    });
  }

  private detachWheelListener(): void {
    if (!this.wheelCanvas) return;
    this.wheelCanvas.removeEventListener("wheel", this.onWheel);
    this.wheelCanvas = undefined;
  }

  private handlePanStart = (event: FederatedPointerEvent): void => {
    if (event.button !== 0) return;
    this.updatePointerAxis(event);
    this.isPanning = true;
    this.lastPanX = event.global.x;
    this.panSurface.cursor = "grabbing";
  };

  private handlePanMove = (event: FederatedPointerEvent): void => {
    this.updatePointerAxis(event);
    if (!this.isPanning) return;
    const delta = event.global.x - this.lastPanX;
    this.lastPanX = event.global.x;
    this.timeline.pan(delta);
  };

  private handlePanEnd = (): void => {
    if (!this.isPanning) return;
    this.isPanning = false;
    this.panSurface.cursor = "grab";
  };

  private handlePointerHover = (event: FederatedPointerEvent): void => {
    this.updatePointerAxis(event);
  };

  private updatePointerAxis(event: FederatedPointerEvent): void {
    const local = this.mainContainer.toLocal(event.global);
    this.pointerAxisX = local.x;
  }

  private handleFilterChange = (filter: TimelineFilterState): void => {
    this.filterState = filter;
    this.applyFilters();
  };

  private handleEntrySelected = (entry: TimelineEntryData): void => {
    this.detailPanel.open(entry);
  };

  private applyFilters(): void {
    this.timeline.setFilter(this.filterState.tags);
  }

  private layoutActionButtons(width?: number): void {
    if (width !== undefined) {
      this.stageWidth = width;
    }
    const targetWidth = width ?? (this.stageWidth || 1280);
    const anchorX = targetWidth - 80;
    this.addEntryButton.x = anchorX;
    this.addEntryButton.y = 70;
    this.addEntryButtonBackground
      .clear()
      .circle(0, 0, 32)
      .fill({ color: 0x10121b, alpha: 0.9 })
      .circle(0, 0, 32)
      .stroke({ width: 2, color: 0xffffff, alpha: 0.35 })
      .circle(0, 0, 32)
      .stroke({ width: 6, color: 0xec1561, alpha: 0.25 });
    this.searchButton.x = anchorX;
    this.searchButton.y = this.addEntryButton.y + 72;
    this.searchButtonBackground
      .clear()
      .circle(0, 0, 26)
      .fill({ color: 0x11121a, alpha: 0.9 })
      .circle(0, 0, 26)
      .stroke({ width: 1.6, color: 0xffffff, alpha: 0.3 })
      .circle(0, 0, 26)
      .stroke({ width: 5, color: 0x7b88ff, alpha: 0.25 });
  }

  private handleAddEntryButtonPress = (): void => {
    this.controls?.toggle();
  };

  private handleAddEntryButtonOver = (): void => {
    this.addEntryButton.scale.set(1.08);
    this.addEntryButton.alpha = 1;
  };

  private handleAddEntryButtonOut = (): void => {
    this.addEntryButton.scale.set(1);
    this.addEntryButton.alpha = 0.95;
  };

  private handleSearchButtonPress = (): void => {
    if (!this.searchControls) return;
    this.searchControls.toggle();
    this.updateSearchButtonState();
  };

  private handleSearchButtonOver = (): void => {
    this.searchButton.scale.set(1.08);
    this.searchButton.alpha = 1;
  };

  private handleSearchButtonOut = (): void => {
    this.searchButton.scale.set(1);
    this.updateSearchButtonState();
  };

  private updateSearchButtonState(): void {
    const isOpen = this.searchControls?.isOpen() ?? false;
    this.searchButton.alpha = isOpen ? 1 : 0.95;
  }
}
