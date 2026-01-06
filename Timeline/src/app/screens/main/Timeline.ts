import { Container, Graphics, Text } from "pixi.js";

import { Label } from "../../ui/Label";
import { getDescriptionPreview } from "../../utils/markdown";

import type {
  TimelineEntryData,
  TimelineEventData,
  TimelineSpanData,
} from "./timelineData";

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

const timeWithSecondsFormatter = new Intl.DateTimeFormat("de-DE", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

const timeWithoutSecondsFormatter = new Intl.DateTimeFormat("de-DE", {
  hour: "2-digit",
  minute: "2-digit",
});

const dayFormatter = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const monthFormatter = new Intl.DateTimeFormat("de-DE", {
  month: "short",
  year: "numeric",
});

const yearFormatter = new Intl.DateTimeFormat("de-DE", {
  year: "numeric",
});

const formatSeconds = (date: Date) =>
  `${timeWithSecondsFormatter.format(date)} · Sek.`;
const formatMinutes = (date: Date) =>
  `${timeWithoutSecondsFormatter.format(date)} · Min.`;
const formatHours = (date: Date) =>
  `${timeWithoutSecondsFormatter.format(date)} · Std.`;
const formatDay = (date: Date) => `${dayFormatter.format(date)} · Tag`;
const formatDayPlural = (date: Date) => `${dayFormatter.format(date)} · Tage`;
const formatMonth = (date: Date) => `${monthFormatter.format(date)} · Monat`;
const formatMonthPlural = (date: Date) =>
  `${monthFormatter.format(date)} · Monate`;
const formatYear = (date: Date) => `${yearFormatter.format(date)} · Jahr`;
const formatYearPlural = (date: Date) =>
  `${yearFormatter.format(date)} · Jahre`;
const createSpanFormatter =
  (spanYears: number, label: string) => (date: Date) => {
    const year = date.getUTCFullYear();
    const startYear = Math.floor(year / spanYears) * spanYears;
    const endYear = startYear + spanYears - 1;
    const formattedStart = startYear.toLocaleString("de-DE");
    const formattedEnd = endYear.toLocaleString("de-DE");
    return `${formattedStart} – ${formattedEnd} · ${label}`;
  };
const formatDecade = (date: Date) => {
  const year = date.getUTCFullYear();
  const start = Math.floor(year / 10) * 10;
  return `${start}er · Jahrzehnt`;
};
const formatQuarterCentury = createSpanFormatter(25, "25 Jahre");
const formatHalfCentury = createSpanFormatter(50, "50 Jahre");
const formatCentury = (date: Date) => {
  const year = date.getUTCFullYear();
  const century = Math.floor((year - 1) / 100) + 1;
  return `${century.toLocaleString("de-DE")}. Jahrhundert`;
};
const formatQuarterMillennium = createSpanFormatter(250, "250 Jahre");
const formatHalfMillennium = createSpanFormatter(500, "500 Jahre");
const formatMillennium = (date: Date) => {
  const year = date.getUTCFullYear();
  const millennium = Math.floor((year - 1) / 1000) + 1;
  return `${millennium.toLocaleString("de-DE")}. Jahrtausend`;
};
const formatEra2500 = createSpanFormatter(2500, "Großes Zeitalter");
const formatEra5000 = createSpanFormatter(5000, "Epoche");
const formatEra10000 = createSpanFormatter(10000, "Große Epoche");
const formatEra25000 = createSpanFormatter(25000, "Ära");
const formatEra50000 = createSpanFormatter(50000, "Große Ära");
const formatEra100000 = createSpanFormatter(100000, "Äon");

const getIsoWeek = (date: Date): number => {
  const temp = new Date(date.getTime());
  const day = temp.getDay() || 7;
  temp.setHours(0, 0, 0, 0);
  temp.setDate(temp.getDate() + 4 - day);
  const yearStart = new Date(temp.getFullYear(), 0, 1);
  const diff = temp.getTime() - yearStart.getTime();
  return Math.ceil((diff / DAY + 1) / 7);
};

const formatWeek = (date: Date) =>
  `KW ${getIsoWeek(date).toString().padStart(2, "0")} · ${date.getFullYear()}`;

interface TimeScale {
  durationMs: number;
  formatter: (date: Date) => string;
}

const TIME_SCALES: TimeScale[] = [
  { durationMs: SECOND, formatter: formatSeconds },
  { durationMs: 5 * SECOND, formatter: formatSeconds },
  { durationMs: 10 * SECOND, formatter: formatSeconds },
  { durationMs: 30 * SECOND, formatter: formatSeconds },
  { durationMs: MINUTE, formatter: formatMinutes },
  { durationMs: 5 * MINUTE, formatter: formatMinutes },
  { durationMs: 15 * MINUTE, formatter: formatMinutes },
  { durationMs: HOUR, formatter: formatHours },
  { durationMs: 3 * HOUR, formatter: formatHours },
  { durationMs: 6 * HOUR, formatter: formatHours },
  { durationMs: 12 * HOUR, formatter: formatHours },
  { durationMs: DAY, formatter: formatDay },
  { durationMs: 3 * DAY, formatter: formatDayPlural },
  { durationMs: WEEK, formatter: formatWeek },
  { durationMs: 2 * WEEK, formatter: formatWeek },
  { durationMs: MONTH, formatter: formatMonth },
  { durationMs: 3 * MONTH, formatter: formatMonthPlural },
  { durationMs: 6 * MONTH, formatter: formatMonthPlural },
  { durationMs: YEAR, formatter: formatYear },
  { durationMs: 5 * YEAR, formatter: formatYearPlural },
  { durationMs: 10 * YEAR, formatter: formatDecade },
  { durationMs: 25 * YEAR, formatter: formatQuarterCentury },
  { durationMs: 50 * YEAR, formatter: formatHalfCentury },
  { durationMs: 100 * YEAR, formatter: formatCentury },
  { durationMs: 250 * YEAR, formatter: formatQuarterMillennium },
  { durationMs: 500 * YEAR, formatter: formatHalfMillennium },
  { durationMs: 1000 * YEAR, formatter: formatMillennium },
  { durationMs: 2500 * YEAR, formatter: formatEra2500 },
  { durationMs: 5000 * YEAR, formatter: formatEra5000 },
  { durationMs: 10000 * YEAR, formatter: formatEra10000 },
  { durationMs: 25000 * YEAR, formatter: formatEra25000 },
  { durationMs: 50000 * YEAR, formatter: formatEra50000 },
  { durationMs: 100000 * YEAR, formatter: formatEra100000 },
];

type InternalEvent = TimelineEventData & {
  timestamp: number;
  accentColor: number;
};

type InternalSpan = TimelineSpanData & {
  startTimestamp: number;
  endTimestamp: number;
  accentColor: number;
  hovered?: boolean;
};

interface TimelineEventView {
  container: Container;
  marker: Graphics;
  stem: Graphics;
  dateLabel: Label;
  titleLabel: Label;
  descriptionLabel: Text;
  data: InternalEvent;
  index: number;
}

interface TimelineSpanView {
  container: Container;
  glow: Graphics;
  ribbon: Graphics;
  titleLabel: Label;
  rangeLabel: Text;
  descriptionLabel: Text;
  data: InternalSpan;
}

const ACCENT_PALETTE = [0xec1561, 0xef6294, 0x7b88ff, 0xffc857];
const SPAN_ACCENT_PALETTE = [0x7b88ff, 0xec1561, 0x2ce6cf, 0xff8a5b];
type LabelVisibility = {
  date: boolean;
  title: boolean;
  description: boolean;
};

const LABEL_VISIBILITY_STEPS: LabelVisibility[] = [
  { date: true, title: true, description: true },
  { date: true, title: true, description: false },
  { date: false, title: false, description: false },
];
const LABEL_HORIZONTAL_PADDING = 24;
const BASE_LABEL_WIDTH = 36;
const MIN_LABEL_GAP = 24;

/**
 * Simple PIXI based timeline visualization with configurable zoom level.
 */
export class Timeline extends Container {
  private events: TimelineEventView[] = [];
  private spanViews: TimelineSpanView[] = [];
  private readonly axis: Graphics;
  private readonly spanLayer: Container;
  private readonly leftArrow: Graphics;
  private readonly rightArrow: Graphics;
  private readonly tickContainer: Container;
  private minTime = Date.now();
  private maxTime = this.minTime;
  private range = 1;
  private viewportWidth = 0;
  private viewportHeight = 0;
  private zoom = 1;
  private panOffset = 0;
  private readonly onSelectEntry?: (entry: TimelineEntryData) => void;
  private filterTags = new Set<string>();

  constructor(
    entries: TimelineEntryData[],
    onSelectEntry?: (entry: TimelineEntryData) => void,
  ) {
    super();
    this.onSelectEntry = onSelectEntry;

    this.spanLayer = new Container();
    this.spanLayer.sortableChildren = true;
    this.axis = new Graphics();
    this.leftArrow = new Graphics();
    this.rightArrow = new Graphics();
    this.tickContainer = new Container();

    this.addChild(this.spanLayer);
    this.addChild(this.axis);
    this.addChild(this.tickContainer);
    this.addChild(this.leftArrow);
    this.addChild(this.rightArrow);

    this.setEntries(entries);
  }

  public setFilter(tags: string[]): void {
    this.filterTags = new Set(tags);
    this.layout();
  }

  public setEntries(entries: TimelineEntryData[]): void {
    for (const view of this.events) {
      view.container.destroy({ children: true });
    }
    for (const view of this.spanViews) {
      view.container.destroy({ children: true });
    }
    this.spanLayer.removeChildren();
    this.events = [];
    this.spanViews = [];

    const normalizedEvents: InternalEvent[] = [];
    const normalizedSpans: InternalSpan[] = [];

    let spanIndex = 0;
    let eventIndex = 0;
    for (const entry of entries) {
      if (entry.type === "event") {
        const timestamp = new Date(entry.date).getTime();
        if (!Number.isFinite(timestamp)) continue;
        normalizedEvents.push({
          ...entry,
          timestamp,
          accentColor: ACCENT_PALETTE[eventIndex % ACCENT_PALETTE.length],
        });
        eventIndex += 1;
      } else {
        const startTimestamp = new Date(entry.startDate).getTime();
        const endTimestamp = new Date(entry.endDate).getTime();
        if (
          !Number.isFinite(startTimestamp) ||
          !Number.isFinite(endTimestamp)
        ) {
          continue;
        }
        normalizedSpans.push({
          ...entry,
          startTimestamp: Math.min(startTimestamp, endTimestamp),
          endTimestamp: Math.max(startTimestamp, endTimestamp),
          accentColor:
            SPAN_ACCENT_PALETTE[spanIndex % SPAN_ACCENT_PALETTE.length],
        });
        spanIndex += 1;
      }
    }

    normalizedEvents.sort((a, b) => a.timestamp - b.timestamp);
    normalizedSpans.sort((a, b) => a.startTimestamp - b.startTimestamp);

    const timestamps: number[] = [];
    for (const event of normalizedEvents) {
      if (Number.isFinite(event.timestamp)) {
        timestamps.push(event.timestamp);
      }
    }
    for (const span of normalizedSpans) {
      if (Number.isFinite(span.startTimestamp)) {
        timestamps.push(span.startTimestamp);
      }
      if (Number.isFinite(span.endTimestamp)) {
        timestamps.push(span.endTimestamp);
      }
    }

    const now = Date.now();
    if (timestamps.length === 0) {
      timestamps.push(now);
    }
    this.minTime = Math.min(...timestamps);
    this.maxTime = Math.max(...timestamps);
    this.range = Math.max(1, this.maxTime - this.minTime);

    this.events = normalizedEvents.map((event, index) =>
      this.createEventView(event, index),
    );
    this.spanViews = normalizedSpans.map((span) => this.createSpanView(span));
    this.layout();
  }

  /** Update layout whenever the viewport changes */
  public resize(width: number, height: number): void {
    this.viewportWidth = width;
    this.viewportHeight = height;
    this.layout();
  }

  /** Apply a zoom factor (1 = default scale) */
  public setZoom(zoomLevel: number): void {
    this.zoom = Math.max(Number.EPSILON, zoomLevel);
    this.layout();
  }

  /** Zoom keeping the focus point fixed in screen space */
  public zoomAt(focusX: number, zoomLevel: number): void {
    if (this.viewportWidth === 0) {
      this.setZoom(zoomLevel);
      return;
    }

    const baseWidth = this.getBaseWidth();
    const previousWidth = baseWidth * this.zoom;
    const nextZoom = Math.max(Number.EPSILON, zoomLevel);
    const nextWidth = baseWidth * nextZoom;

    if (!Number.isFinite(previousWidth) || previousWidth === 0) {
      this.zoom = nextZoom;
      this.layout();
      return;
    }

    const startBefore = -previousWidth / 2 + this.panOffset;
    const relative = (focusX - startBefore) / previousWidth;

    this.zoom = nextZoom;
    const tentativeStart = -nextWidth / 2 + this.panOffset;
    const desiredStart = focusX - relative * nextWidth;
    this.panOffset += desiredStart - tentativeStart;
    this.layout();
  }

  /** Translate the timeline horizontally in pixels */
  public pan(delta: number): void {
    if (!Number.isFinite(delta) || delta === 0) return;
    this.panOffset += delta;
    this.layout();
  }

  private layout(): void {
    if (this.viewportWidth === 0 || this.viewportHeight === 0) return;

    const baseWidth = this.getBaseWidth();
    const timelineWidth = baseWidth * this.zoom;
    const startX = -timelineWidth / 2;
    const offsetStart = startX + this.panOffset;
    const amplitude = Math.max(110, Math.min(this.viewportHeight * 0.18, 180));
    const arrowSize = 18;
    const visiblePadding = 60;
    const visibleMinX = -this.viewportWidth * 0.5 - visiblePadding;
    const visibleMaxX = this.viewportWidth * 0.5 + visiblePadding;

    this.axis
      .clear()
      .moveTo(visibleMinX, 0)
      .lineTo(visibleMaxX, 0)
      .stroke({ width: 6, color: 0xffffff, alpha: 0.12 });

    this.leftArrow
      .clear()
      .poly([0, 0, -arrowSize, arrowSize * 0.6, -arrowSize, -arrowSize * 0.6])
      .fill({ color: 0xffffff, alpha: 0.2 });
    this.leftArrow.position.set(visibleMinX, 0);

    this.rightArrow
      .clear()
      .poly([0, 0, arrowSize, arrowSize * 0.6, arrowSize, -arrowSize * 0.6])
      .fill({ color: 0xffffff, alpha: 0.2 });
    this.rightArrow.position.set(visibleMaxX, 0);

    const fallbackDivisor = Math.max(1, this.events.length - 1);
    const visibleViews: TimelineEventView[] = [];

    const showUntaggedOnly = this.filterTags.size === 0;
    for (const view of this.events) {
      const matchesFilter = showUntaggedOnly
        ? view.data.tags.length === 0
        : view.data.tags.some((tag) => this.filterTags.has(tag));
      const index = view.index;
      const normalizedValue =
        this.maxTime === this.minTime
          ? index / fallbackDivisor
          : (view.data.timestamp - this.minTime) / this.range;

      view.container.x = offsetStart + normalizedValue * timelineWidth;
      view.container.y = 0;
      const isVisible =
        matchesFilter &&
        view.container.x >= visibleMinX &&
        view.container.x <= visibleMaxX;
      view.container.visible = isVisible;
      if (isVisible) {
        visibleViews.push(view);
      }

      const direction = index % 2 === 0 ? -1 : 1;
      const stemLength = amplitude - 20;
      const textBaseY = direction * (stemLength + 32);

      view.stem
        .clear()
        .moveTo(0, 0)
        .lineTo(0, direction * stemLength)
        .stroke({ width: 1.6, color: 0xffffff, alpha: 0.35 });

      view.marker.y = 0;

      view.dateLabel.x = 0;
      view.dateLabel.y = textBaseY;

      view.titleLabel.x = 0;
      view.titleLabel.y = textBaseY + direction * 34;

      view.descriptionLabel.anchor.set(0.5, direction === 1 ? 0 : 1);
      view.descriptionLabel.x = 0;
      view.descriptionLabel.y = textBaseY + direction * 60;
    }

    this.applyLabelVisibility(visibleViews);
    this.layoutSpans(
      offsetStart,
      timelineWidth,
      visibleMinX,
      visibleMaxX,
      showUntaggedOnly,
    );
    this.layoutTicks(offsetStart, timelineWidth, visibleMinX, visibleMaxX);
  }

  private getBaseWidth(): number {
    return Math.max(320, this.viewportWidth * 0.8);
  }

  private applyLabelVisibility(visibleViews: TimelineEventView[]): void {
    const processed = new Set<TimelineEventView>();
    const buckets = new Map<number, TimelineEventView[]>();

    for (const view of visibleViews) {
      const direction = view.index % 2 === 0 ? -1 : 1;
      if (!buckets.has(direction)) {
        buckets.set(direction, []);
      }
      buckets.get(direction)!.push(view);
    }

    for (const bucket of buckets.values()) {
      bucket.sort((a, b) => a.container.x - b.container.x);
      let previousRight = Number.NEGATIVE_INFINITY;

      for (const view of bucket) {
        let selectedVisibility =
          LABEL_VISIBILITY_STEPS[LABEL_VISIBILITY_STEPS.length - 1];
        let selectedHalfWidth = this.getLabelHalfWidth(
          view,
          selectedVisibility,
        );

        for (const visibility of LABEL_VISIBILITY_STEPS) {
          const halfWidth = this.getLabelHalfWidth(view, visibility);
          const leftEdge = view.container.x - halfWidth;
          if (leftEdge >= previousRight + MIN_LABEL_GAP) {
            selectedVisibility = visibility;
            selectedHalfWidth = halfWidth;
            break;
          }
        }

        this.setLabelVisibility(view, selectedVisibility);
        processed.add(view);
        previousRight = Math.max(
          previousRight,
          view.container.x + selectedHalfWidth,
        );
      }
    }

    for (const view of this.events) {
      if (!processed.has(view)) {
        this.setLabelVisibility(view, LABEL_VISIBILITY_STEPS[0]);
      }
    }
  }

  private setLabelVisibility(
    view: TimelineEventView,
    visibility: LabelVisibility,
  ): void {
    view.dateLabel.visible = visibility.date;
    view.titleLabel.visible = visibility.title;
    view.descriptionLabel.visible = visibility.description;
    const hasAnyLabel =
      visibility.date || visibility.title || visibility.description;
    view.stem.visible = hasAnyLabel;
  }

  private getLabelHalfWidth(
    view: TimelineEventView,
    visibility: LabelVisibility,
  ): number {
    const widths: number[] = [];
    if (visibility.date) widths.push(view.dateLabel.width);
    if (visibility.title) widths.push(view.titleLabel.width);
    if (visibility.description) {
      widths.push(view.descriptionLabel.width);
    }

    if (widths.length === 0) {
      return BASE_LABEL_WIDTH * 0.5 + LABEL_HORIZONTAL_PADDING;
    }

    const measuredWidth = Math.max(BASE_LABEL_WIDTH, ...widths);
    return measuredWidth * 0.5 + LABEL_HORIZONTAL_PADDING;
  }

  private layoutTicks(
    startX: number,
    width: number,
    visibleMinX: number,
    visibleMaxX: number,
  ): void {
    this.tickContainer.removeChildren();

    if (!Number.isFinite(width) || width <= 0) return;

    const desiredSpacingPx = 160;
    const msPerPixel =
      this.range === 0 ? 0 : Math.abs(this.range / width) || Number.EPSILON;
    const targetSpacingMs = msPerPixel * desiredSpacingPx;
    const scale =
      TIME_SCALES.find((item) => item.durationMs >= targetSpacingMs) ??
      TIME_SCALES[TIME_SCALES.length - 1];
    const spacing = scale.durationMs;

    const normalizedVisibleMin = (visibleMinX - startX) / width;
    const normalizedVisibleMax = (visibleMaxX - startX) / width;
    const lowerTime =
      this.minTime +
      Math.min(normalizedVisibleMin, normalizedVisibleMax) * this.range;
    const upperTime =
      this.minTime +
      Math.max(normalizedVisibleMin, normalizedVisibleMax) * this.range;

    const padding = spacing * 2;
    const firstTick = Math.floor((lowerTime - padding) / spacing) * spacing;
    const lastTick = Math.ceil((upperTime + padding) / spacing) * spacing;

    for (let time = firstTick; time <= lastTick; time += spacing) {
      const normalizedValue =
        this.maxTime === this.minTime
          ? 0.5
          : (time - this.minTime) / this.range;
      const x = startX + normalizedValue * width;
      if (x < visibleMinX || x > visibleMaxX) continue;

      const tick = new Container();
      tick.x = x;

      const stem = new Graphics()
        .moveTo(0, -12)
        .lineTo(0, 12)
        .stroke({ width: 2, color: 0xffffff, alpha: 0.25 });
      tick.addChild(stem);

      const label = new Text({
        text: scale.formatter(new Date(time)),
        style: {
          fontFamily: "Inter, 'Arial Rounded MT Bold', sans-serif",
          fontSize: 16,
          fill: 0xcad0e0,
          align: "center",
        },
      });
      label.anchor.set(0.5, 0);
      label.y = 14;
      tick.addChild(label);

      this.tickContainer.addChild(tick);
    }
  }

  private layoutSpans(
    startX: number,
    width: number,
    visibleMinX: number,
    visibleMaxX: number,
    showUntaggedOnly: boolean,
  ): void {
    if (!Number.isFinite(width) || width <= 0) return;

    const capsuleHeight = 46;
    const radius = 22;
    const glowPadding = 10;

    for (const view of this.spanViews) {
      const matchesFilter = showUntaggedOnly
        ? view.data.tags.length === 0
        : view.data.tags.some((tag) => this.filterTags.has(tag));
      const normalizedStart =
        this.maxTime === this.minTime
          ? 0.45
          : (view.data.startTimestamp - this.minTime) / this.range;
      const normalizedEnd =
        this.maxTime === this.minTime
          ? 0.55
          : (view.data.endTimestamp - this.minTime) / this.range;
      const pxStart = startX + normalizedStart * width;
      const pxEnd = startX + normalizedEnd * width;
      const left = Math.min(pxStart, pxEnd);
      const right = Math.max(pxStart, pxEnd);
      const spanWidth = Math.max(32, right - left);
      view.container.x = left + spanWidth * 0.5;

      const isVisible = right >= visibleMinX && left <= visibleMaxX;
      view.container.visible = isVisible && matchesFilter;
      if (!view.container.visible) continue;

      view.container.y = 0;

      view.glow
        .clear()
        .roundRect(
          -spanWidth / 2 - glowPadding,
          -capsuleHeight / 2 - glowPadding * 0.25,
          spanWidth + glowPadding * 2,
          capsuleHeight + glowPadding * 0.5,
          radius + glowPadding,
        )
        .fill({ color: view.data.accentColor, alpha: 0.12 });

      view.ribbon
        .clear()
        .roundRect(
          -spanWidth / 2,
          -capsuleHeight / 2,
          spanWidth,
          capsuleHeight,
          radius,
        )
        .fill({ color: view.data.accentColor, alpha: 0.33 })
        .roundRect(
          -spanWidth / 2,
          -capsuleHeight / 2,
          spanWidth,
          capsuleHeight,
          radius,
        )
        .stroke({ width: 1.25, color: view.data.accentColor, alpha: 0.95 });

      const zoomGate = this.zoom >= 0.9;
      const showPrimaryLabels = spanWidth > 280 && zoomGate;
      const showDescription = spanWidth > 320 && this.zoom >= 1;

      const showHoverLabels =
        !showPrimaryLabels && view.data.hovered === true && this.zoom >= 0.6;

      view.titleLabel.visible = showPrimaryLabels || showHoverLabels;
      view.rangeLabel.visible = showPrimaryLabels || showHoverLabels;
      view.descriptionLabel.visible = showDescription;

      if (view.titleLabel.visible) {
        view.titleLabel.x = 0;
        view.titleLabel.y = -10;
        view.rangeLabel.x = 0;
        view.rangeLabel.y = 10;
      }

      if (showDescription) {
        view.descriptionLabel.x = 0;
        view.descriptionLabel.y = capsuleHeight / 2 + 12;
      }
    }
  }

  private formatSpanRange(span: InternalSpan): string {
    const duration = Math.abs(span.endTimestamp - span.startTimestamp);
    const startDate = new Date(span.startTimestamp);
    const endDate = new Date(span.endTimestamp);
    if (duration <= 45 * DAY) {
      return `${dayFormatter.format(startDate)} – ${dayFormatter.format(
        endDate,
      )}`;
    }
    if (duration <= 3 * YEAR) {
      return `${monthFormatter.format(startDate)} – ${monthFormatter.format(
        endDate,
      )}`;
    }
    return `${yearFormatter.format(startDate)} – ${yearFormatter.format(
      endDate,
    )}`;
  }

  private createSpanView(span: InternalSpan): TimelineSpanView {
    const container = new Container();
    container.alpha = 0.9;
    container.eventMode = "static";
    container.cursor = "pointer";
    const glow = new Graphics();
    const ribbon = new Graphics();
    container.addChild(glow);
    container.addChild(ribbon);

    const titleLabel = new Label({
      text: span.title,
      style: {
        fontSize: 26,
        fill: 0xffffff,
        fontWeight: "600",
      },
    });
    container.addChild(titleLabel);

    const rangeLabel = new Text({
      text: this.formatSpanRange(span),
      style: {
        fontFamily: "Inter, 'Arial Rounded MT Bold', sans-serif",
        fontSize: 16,
        fill: 0xf4f6ff,
        align: "center",
      },
    });
    rangeLabel.anchor.set(0.5);
    container.addChild(rangeLabel);

    const descriptionLabel = new Text({
      text: getDescriptionPreview(span.description),
      style: {
        fontFamily: "Inter, 'Arial Rounded MT Bold', sans-serif",
        fontSize: 16,
        fill: 0xffffff,
        wordWrap: true,
        wordWrapWidth: 360,
        lineHeight: 22,
        align: "center",
      },
    });
    descriptionLabel.anchor.set(0.5, 0);
    container.addChild(descriptionLabel);

    container.interactive = true;
    container.on("pointertap", () => {
      this.onSelectEntry?.(span);
    });
    container.on("pointerover", () => {
      container.alpha = 1;
      container.getChildAt(1).alpha = 1;
      span.hovered = true;
      this.layout();
    });
    container.on("pointerout", () => {
      container.alpha = 0.9;
      container.getChildAt(1).alpha = 1;
      span.hovered = false;
      this.layout();
    });
    this.spanLayer.addChild(container);

    return {
      container,
      glow,
      ribbon,
      titleLabel,
      rangeLabel,
      descriptionLabel,
      data: span,
    };
  }

  private createEventView(
    event: InternalEvent,
    index: number,
  ): TimelineEventView {
    const container = new Container();
    container.alpha = 0.92;
    container.eventMode = "static";
    container.cursor = "pointer";

    const stem = new Graphics();
    container.addChild(stem);

    const marker = new Graphics()
      .circle(0, 0, 11)
      .fill({ color: event.accentColor, alpha: 0.9 })
      .circle(0, 0, 5)
      .fill({ color: 0x0b0b0d })
      .circle(0, 0, 2.5)
      .fill({ color: 0xffffff });
    marker.y = 0;
    container.addChild(marker);

    const dateLabel = new Label({
      text: new Intl.DateTimeFormat("de-DE", {
        month: "short",
        year: "numeric",
      }).format(event.timestamp),
      style: {
        fontSize: 18,
        fill: 0x9aa0b1,
        fontWeight: "500",
      },
    });
    container.addChild(dateLabel);

    const titleLabel = new Label({
      text: event.title,
      style: {
        fontSize: 28,
        fill: 0xffffff,
        fontWeight: "600",
      },
    });
    container.addChild(titleLabel);

    const descriptionLabel = new Text({
      text: getDescriptionPreview(event.description),
      style: {
        fontFamily: "Inter, 'Arial Rounded MT Bold', sans-serif",
        fontSize: 16,
        fill: 0xdfe3f2,
        wordWrap: true,
        wordWrapWidth: 240,
        lineHeight: 24,
        align: "center",
      },
    });
    descriptionLabel.anchor.set(0.5, 0);
    container.addChild(descriptionLabel);

    container.on("pointertap", () => {
      this.onSelectEntry?.(event);
    });
    this.addChild(container);

    return {
      container,
      stem,
      marker,
      dateLabel,
      titleLabel,
      descriptionLabel,
      data: event,
      index,
    };
  }
}
