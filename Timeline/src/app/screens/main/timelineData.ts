export const AVAILABLE_TAGS = ["Urlaub", "Feiern", "Klassenstufen", "Konzerte"];

export interface TimelineEventData {
  type: "event";
  id: string;
  /** ISO date string used for ordering events */
  date: string;
  /** Headline displayed next to the marker */
  title: string;
  /** Supporting copy for a bit of story-telling */
  description: string;
  /** Predefined taxonomy entry tags */
  tags: string[];
  /** Optional preview image URL */
  imageUrl?: string;
}

export interface TimelineSpanData {
  type: "span";
  id: string;
  /** ISO start date string */
  startDate: string;
  /** ISO end date string */
  endDate: string;
  /** Headline displayed on the span ribbon */
  title: string;
  /** Supporting copy that is shown when there is enough room */
  description: string;
  /** Predefined taxonomy entry tags */
  tags: string[];
  /** Optional preview image URL */
  imageUrl?: string;
}

export type TimelineEntryData = TimelineEventData | TimelineSpanData;

const initialEntries: TimelineEntryData[] = [];
const LEGACY_ENTRY_IDS = new Set([
  "event-1",
  "event-2",
  "event-3",
  "event-4",
  "event-5",
  "span-1",
]);

type EntryListener = (entries: TimelineEntryData[]) => void;

let idCounter = initialEntries.length;
const STORAGE_KEY = "chronika_timeline_entries_v1";

const createId = (prefix: string) => {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter}`;
};

const hasLocalStorage = (): boolean =>
  typeof window !== "undefined" && typeof window.localStorage !== "undefined";

const sanitizeTags = (tags: string[]): string[] => {
  const allowed = new Set(AVAILABLE_TAGS);
  const unique: string[] = [];
  for (const tag of tags) {
    if (allowed.has(tag) && !unique.includes(tag)) {
      unique.push(tag);
    }
  }
  return unique;
};

const deserializeEntries = (): TimelineEntryData[] | undefined => {
  if (!hasLocalStorage()) return undefined;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return undefined;
    return parsed
      .map((entry) => {
        if (entry.type === "event") {
          return {
            ...entry,
            tags: sanitizeTags(entry.tags ?? []),
            imageUrl: entry.imageUrl ?? "",
          } satisfies TimelineEventData;
        }
        if (entry.type === "span") {
          return {
            ...entry,
            tags: sanitizeTags(entry.tags ?? []),
            imageUrl: entry.imageUrl ?? "",
          } satisfies TimelineSpanData;
        }
        return undefined;
      })
      .filter(Boolean) as TimelineEntryData[];
  } catch (error) {
    console.warn("Could not parse saved timeline entries", error);
    return undefined;
  }
};

const persistEntries = (entries: TimelineEntryData[]): void => {
  if (!hasLocalStorage()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch (error) {
    console.warn("Could not persist timeline entries", error);
  }
};

const stripLegacyEntries = (
  entries: TimelineEntryData[],
): TimelineEntryData[] => {
  const filtered = entries.filter((entry) => !LEGACY_ENTRY_IDS.has(entry.id));
  if (filtered.length !== entries.length) {
    persistEntries(filtered);
  }
  return filtered;
};

export class TimelineStore {
  private entries: TimelineEntryData[];
  private readonly listeners = new Set<EntryListener>();

  constructor(seed: TimelineEntryData[]) {
    const stored = deserializeEntries();
    this.entries = stripLegacyEntries(stored ?? seed.slice());
    idCounter = Math.max(idCounter, this.entries.length);
  }

  public getEntries(): TimelineEntryData[] {
    return this.entries.slice();
  }

  public subscribe(listener: EntryListener): () => void {
    this.listeners.add(listener);
    listener(this.getEntries());
    return () => {
      this.listeners.delete(listener);
    };
  }

  public addEvent(data: Omit<TimelineEventData, "id" | "type">): void {
    const entry: TimelineEventData = {
      ...data,
      type: "event",
      id: createId("event"),
      tags: sanitizeTags(data.tags ?? []),
      imageUrl: data.imageUrl ?? "",
    };
    this.setEntries([...this.entries, entry]);
  }

  public addSpan(data: Omit<TimelineSpanData, "id" | "type">): void {
    const entry: TimelineSpanData = {
      ...data,
      type: "span",
      id: createId("span"),
      tags: sanitizeTags(data.tags ?? []),
      imageUrl: data.imageUrl ?? "",
    };
    this.setEntries([...this.entries, entry]);
  }

  public deleteEntry(id: string): void {
    const next = this.entries.filter((entry) => entry.id !== id);
    if (next.length === this.entries.length) return;
    this.setEntries(next);
  }

  public updateEntry(
    id: string,
    payload: Partial<TimelineEventData> | Partial<TimelineSpanData>,
  ): void {
    const index = this.entries.findIndex((entry) => entry.id === id);
    if (index === -1) return;
    const current = this.entries[index];
    if (current.type === "event") {
      const eventPayload = payload as Partial<TimelineEventData>;
      const next: TimelineEventData = {
        ...current,
        ...eventPayload,
        type: "event",
        date:
          typeof eventPayload.date === "string" && eventPayload.date
            ? eventPayload.date
            : current.date,
        tags: sanitizeTags(
          "tags" in eventPayload
            ? (eventPayload.tags ?? current.tags)
            : current.tags,
        ),
        imageUrl:
          typeof eventPayload.imageUrl === "string"
            ? eventPayload.imageUrl
            : current.imageUrl,
      };
      this.entries[index] = next;
    } else {
      const spanPayload = payload as Partial<TimelineSpanData>;
      const next: TimelineSpanData = {
        ...current,
        ...spanPayload,
        type: "span",
        startDate:
          typeof spanPayload.startDate === "string" && spanPayload.startDate
            ? spanPayload.startDate
            : current.startDate,
        endDate:
          typeof spanPayload.endDate === "string" && spanPayload.endDate
            ? spanPayload.endDate
            : current.endDate,
        tags: sanitizeTags(
          "tags" in spanPayload
            ? (spanPayload.tags ?? current.tags)
            : current.tags,
        ),
        imageUrl:
          typeof spanPayload.imageUrl === "string"
            ? spanPayload.imageUrl
            : current.imageUrl,
      };
      this.entries[index] = next;
    }
    this.setEntries(this.entries);
  }

  private setEntries(entries: TimelineEntryData[]): void {
    this.entries = entries.slice();
    persistEntries(this.entries);
    for (const listener of this.listeners) {
      listener(this.getEntries());
    }
  }
}

export const timelineStore = new TimelineStore(initialEntries);
