import { FancyButton } from "@pixi/ui";
import { animate } from "motion";
import type { AnimationPlaybackControls } from "motion/react";
import type { DestroyOptions, FederatedPointerEvent, Ticker } from "pixi.js";
import { Container, Graphics } from "pixi.js";

import { engine } from "../../getEngine";
import { PausePopup } from "../../popups/PausePopup";
import { SettingsPopup } from "../../popups/SettingsPopup";
import { Timeline } from "./Timeline";
import { timelineEvents } from "./timelineData";

/** The screen that holds the app */
export class MainScreen extends Container {
  /** Assets bundles required by this screen */
  public static assetBundles = ["main"];

  public mainContainer: Container;
  private pauseButton: FancyButton;
  private settingsButton: FancyButton;
  private timeline: Timeline;
  private paused = false;
  private zoomLevel = 1;
  private wheelCanvas?: HTMLCanvasElement;
  private panSurface: Graphics;
  private isPanning = false;
  private lastPanX = 0;
  private pointerAxisX = 0;
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
    this.timeline = new Timeline(timelineEvents);
    this.timeline.zIndex = 1;
    this.mainContainer.addChild(this.timeline);
    this.timeline.setZoom(this.zoomLevel);
    this.attachWheelListener();

    const buttonAnimations = {
      hover: {
        props: {
          scale: { x: 1.1, y: 1.1 },
        },
        duration: 100,
      },
      pressed: {
        props: {
          scale: { x: 0.9, y: 0.9 },
        },
        duration: 100,
      },
    };
    this.pauseButton = new FancyButton({
      defaultView: "icon-pause.png",
      anchor: 0.5,
      animations: buttonAnimations,
    });
    this.pauseButton.onPress.connect(() =>
      engine().navigation.presentPopup(PausePopup),
    );
    this.addChild(this.pauseButton);

    this.settingsButton = new FancyButton({
      defaultView: "icon-settings.png",
      anchor: 0.5,
      animations: buttonAnimations,
    });
    this.settingsButton.onPress.connect(() =>
      engine().navigation.presentPopup(SettingsPopup),
    );
    this.addChild(this.settingsButton);
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
    this.pauseButton.x = 30;
    this.pauseButton.y = 30;
    this.settingsButton.x = width - 30;
    this.settingsButton.y = 30;

    this.panSurface
      .clear()
      .rect(-width / 2, -height / 2, width, height)
      .fill({ color: 0xffffff, alpha: 0.0001 });

    this.timeline.resize(width, height);
  }

  /** Show screen with animations */
  public async show(): Promise<void> {
    engine().audio.bgm.play("main/sounds/bgm-main.mp3", { volume: 0.5 });

    const elementsToAnimate = [
      this.pauseButton,
      this.settingsButton,
      this.timeline,
    ];

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
  public blur() {
    if (!engine().navigation.currentPopup) {
      engine().navigation.presentPopup(PausePopup);
    }
  }

  public override destroy(options?: DestroyOptions): void {
    this.detachWheelListener();
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
}
