import { AVAILABLE_TAGS } from "./timelineData";

export type TimelineFilterState = {
  tags: string[];
};

export class TimelineSearchControls {
  private static readonly FILTER_COOKIE = "chronika_filters";
  private static readonly FILTER_COOKIE_TTL = 30 * 24 * 60 * 60; // 30 days
  private readonly container: HTMLDivElement;
  private readonly tagButtons = new Map<string, HTMLButtonElement>();
  private readonly tagHandlers = new Map<string, () => void>();
  private readonly selectedTags = new Set<string>();
  private visible = false;

  constructor(
    private readonly onChange: (filter: TimelineFilterState) => void,
  ) {
    this.container = document.createElement("div");
    this.container.className = "timeline-search";
    this.container.classList.add("timeline-search--hidden");

    const label = document.createElement("div");
    label.className = "timeline-search__label";
    label.textContent = "Filter Tags";
    this.container.appendChild(label);

    const tagWrapper = document.createElement("div");
    tagWrapper.className = "timeline-search__tags";
    for (const tag of AVAILABLE_TAGS) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = tag;
      button.className = "timeline-tag";
      const handler = () => this.toggleTag(tag);
      button.addEventListener("click", handler);
      tagWrapper.appendChild(button);
      this.tagButtons.set(tag, button);
      this.tagHandlers.set(tag, handler);
    }
    this.container.appendChild(tagWrapper);

    document.body.appendChild(this.container);

    this.restoreFilters();
    this.updateButtons();
    this.emitChange();
  }

  public destroy(): void {
    for (const [tag, button] of this.tagButtons) {
      const handler = this.tagHandlers.get(tag);
      if (handler) {
        button.removeEventListener("click", handler);
      }
    }
    this.container.remove();
    this.tagButtons.clear();
    this.tagHandlers.clear();
  }

  public open(): void {
    if (this.visible) return;
    this.visible = true;
    this.container.classList.remove("timeline-search--hidden");
  }

  public close(): void {
    if (!this.visible) return;
    this.visible = false;
    this.container.classList.add("timeline-search--hidden");
  }

  public toggle(): void {
    if (this.visible) {
      this.close();
    } else {
      this.open();
    }
  }

  public isOpen(): boolean {
    return this.visible;
  }

  private toggleTag(tag: string): void {
    if (this.selectedTags.has(tag)) {
      this.selectedTags.delete(tag);
    } else {
      this.selectedTags.add(tag);
    }
    this.updateButtons();
    this.emitChange();
    this.persistFilters();
  }

  private updateButtons(): void {
    for (const [tag, button] of this.tagButtons) {
      if (this.selectedTags.has(tag)) {
        button.classList.add("timeline-tag--selected");
      } else {
        button.classList.remove("timeline-tag--selected");
      }
    }
  }

  private emitChange(): void {
    this.onChange({
      tags: Array.from(this.selectedTags),
    });
  }

  private restoreFilters(): void {
    const stored = this.getCookie(TimelineSearchControls.FILTER_COOKIE);
    if (!stored) return;
    try {
      const parsed = JSON.parse(decodeURIComponent(stored));
      if (Array.isArray(parsed)) {
        this.selectedTags.clear();
        for (const tag of parsed) {
          if (typeof tag === "string" && AVAILABLE_TAGS.includes(tag)) {
            this.selectedTags.add(tag);
          }
        }
      }
    } catch (error) {
      console.warn("Could not parse saved filter cookie", error);
    }
  }

  private persistFilters(): void {
    const serialized = encodeURIComponent(
      JSON.stringify(Array.from(this.selectedTags)),
    );
    document.cookie = `${TimelineSearchControls.FILTER_COOKIE}=${serialized};path=/;max-age=${TimelineSearchControls.FILTER_COOKIE_TTL}`;
  }

  private getCookie(name: string): string | undefined {
    const cookies = document.cookie.split(";").map((cookie) => cookie.trim());
    for (const cookie of cookies) {
      if (cookie.startsWith(`${name}=`)) {
        return cookie.substring(name.length + 1);
      }
    }
    return undefined;
  }
}
