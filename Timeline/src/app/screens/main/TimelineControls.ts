import { AVAILABLE_TAGS, timelineStore } from "./timelineData";

type TimelineFormType = "event" | "span";

/** Small DOM based helper that exposes a form for adding timeline entries */
export class TimelineControls {
  private readonly container: HTMLDivElement;
  private readonly form: HTMLFormElement;
  private readonly typeSelect: HTMLSelectElement;
  private readonly titleInput: HTMLInputElement;
  private readonly descriptionInput: HTMLTextAreaElement;
  private readonly dateRow: HTMLDivElement;
  private readonly dateInput: HTMLInputElement;
  private readonly spanRow: HTMLDivElement;
  private readonly startInput: HTMLInputElement;
  private readonly endInput: HTMLInputElement;
  private readonly imageInput: HTMLInputElement;
  private readonly status: HTMLParagraphElement;
  private readonly closeButton: HTMLButtonElement;
  private readonly tagRow: HTMLDivElement;
  private readonly tagList: HTMLDivElement;
  private readonly tagButtons = new Map<string, HTMLButtonElement>();
  private readonly tagHandlers = new Map<string, () => void>();
  private isVisible = false;
  private readonly selectedTags = new Set<string>();

  constructor() {
    this.container = document.createElement("div");
    this.container.className = "timeline-controls timeline-controls--hidden";

    this.form = document.createElement("form");
    this.form.className = "timeline-form";
    this.container.appendChild(this.form);

    const header = document.createElement("div");
    header.className = "timeline-form__header";
    const heading = document.createElement("span");
    heading.textContent = "Neuer Timeline-Eintrag";
    header.appendChild(heading);
    this.closeButton = document.createElement("button");
    this.closeButton.type = "button";
    this.closeButton.textContent = "Fenster schließen";
    this.closeButton.className = "timeline-form__close";
    header.appendChild(this.closeButton);
    this.form.appendChild(header);

    this.typeSelect = document.createElement("select");
    this.typeSelect.name = "entryType";
    this.typeSelect.innerHTML = `
      <option value="event">Event</option>
      <option value="span">Zeitabschnitt</option>
    `;
    this.form.appendChild(this.createField("Typ", this.typeSelect));

    this.titleInput = document.createElement("input");
    this.titleInput.type = "text";
    this.titleInput.required = true;
    this.titleInput.placeholder = "Titel...";
    this.form.appendChild(this.createField("Titel", this.titleInput));

    this.dateInput = document.createElement("input");
    this.dateInput.type = "date";
    this.dateInput.required = true;
    this.dateRow = this.createField("Datum", this.dateInput);
    this.form.appendChild(this.dateRow);

    this.startInput = document.createElement("input");
    this.startInput.type = "date";
    this.startInput.required = true;
    this.endInput = document.createElement("input");
    this.endInput.type = "date";
    this.endInput.required = true;
    this.spanRow = document.createElement("div");
    this.spanRow.className = "timeline-form__row timeline-form__row--split";
    const startField = this.createField("Start", this.startInput);
    const endField = this.createField("Ende", this.endInput);
    startField.classList.add("timeline-form__row--inline");
    endField.classList.add("timeline-form__row--inline");
    this.spanRow.appendChild(startField);
    this.spanRow.appendChild(endField);
    this.form.appendChild(this.spanRow);

    this.descriptionInput = document.createElement("textarea");
    this.descriptionInput.rows = 3;
    this.descriptionInput.placeholder = "Beschreibung... (Markdown erlaubt)";
    this.form.appendChild(
      this.createField("Beschreibung", this.descriptionInput),
    );

    this.imageInput = document.createElement("input");
    this.imageInput.type = "url";
    this.imageInput.placeholder = "Bild URL (optional)";
    this.form.appendChild(this.createField("Bild", this.imageInput));

    this.tagRow = document.createElement("div");
    this.tagRow.className = "timeline-form__row";
    const tagLabel = document.createElement("label");
    tagLabel.textContent = "Tags";
    this.tagRow.appendChild(tagLabel);
    this.tagList = document.createElement("div");
    this.tagList.className = "timeline-tags";
    for (const tag of AVAILABLE_TAGS) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = tag;
      button.className = "timeline-tag";
      const handler = () => this.toggleTag(tag);
      button.addEventListener("click", handler);
      this.tagList.appendChild(button);
      this.tagButtons.set(tag, button);
      this.tagHandlers.set(tag, handler);
    }
    this.tagRow.appendChild(this.tagList);
    this.form.appendChild(this.tagRow);

    const submitButton = document.createElement("button");
    submitButton.type = "submit";
    submitButton.textContent = "Eintrag hinzufügen";
    submitButton.className = "timeline-form__submit";
    this.form.appendChild(submitButton);

    this.status = document.createElement("p");
    this.status.className = "timeline-form__status";
    this.form.appendChild(this.status);

    document.body.appendChild(this.container);

    this.closeButton.addEventListener("click", this.close);
    this.typeSelect.addEventListener("change", this.handleTypeChange);
    this.form.addEventListener("submit", this.handleSubmit);
    this.updateVisibleFields();
  }

  public destroy(): void {
    this.closeButton.removeEventListener("click", this.close);
    this.typeSelect.removeEventListener("change", this.handleTypeChange);
    this.form.removeEventListener("submit", this.handleSubmit);
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
    if (this.isVisible) return;
    this.isVisible = true;
    this.container.classList.remove("timeline-controls--hidden");
    requestAnimationFrame(() => {
      this.titleInput.focus();
    });
  }

  public close = (): void => {
    if (!this.isVisible) return;
    this.isVisible = false;
    this.container.classList.add("timeline-controls--hidden");
    this.showStatus("");
  };

  public toggle(): void {
    if (this.isVisible) {
      this.close();
    } else {
      this.open();
    }
  }

  private createField(labelText: string, control: HTMLElement): HTMLDivElement {
    const wrapper = document.createElement("div");
    wrapper.className = "timeline-form__row";
    const label = document.createElement("label");
    label.textContent = labelText;
    wrapper.appendChild(label);
    wrapper.appendChild(control);
    return wrapper;
  }

  private getCurrentType(): TimelineFormType {
    return (this.typeSelect.value as TimelineFormType) ?? "event";
  }

  private handleTypeChange = (): void => {
    this.updateVisibleFields();
  };

  private handleSubmit = (event: SubmitEvent): void => {
    event.preventDefault();
    const type = this.getCurrentType();
    const title = this.titleInput.value.trim();
    const description = this.descriptionInput.value.trim();
    if (!title) {
      this.showStatus("Titel darf nicht leer sein.", "error");
      return;
    }

    try {
      if (type === "event") {
        this.submitEvent({ title, description });
      } else {
        this.submitSpan({ title, description });
      }
      this.resetForm();
      this.showStatus("Gespeichert!", "success");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Konnte nicht speichern.";
      this.showStatus(message, "error");
    } finally {
      this.updateVisibleFields();
    }
  };

  private submitEvent(data: { title: string; description: string }): void {
    if (!this.dateInput.value) {
      throw new Error("Bitte gib ein Datum ein.");
    }
    timelineStore.addEvent({
      title: data.title,
      description: data.description,
      date: this.dateInput.value,
      tags: Array.from(this.selectedTags),
      imageUrl: this.imageInput.value.trim(),
    });
  }

  private submitSpan(data: { title: string; description: string }): void {
    if (!this.startInput.value || !this.endInput.value) {
      throw new Error("Start und Ende werden benötigt.");
    }
    timelineStore.addSpan({
      title: data.title,
      description: data.description,
      startDate: this.startInput.value,
      endDate: this.endInput.value,
      tags: Array.from(this.selectedTags),
      imageUrl: this.imageInput.value.trim(),
    });
  }

  private updateVisibleFields(): void {
    const type = this.getCurrentType();
    const isEvent = type === "event";
    this.dateRow.style.display = isEvent ? "" : "none";
    this.dateInput.required = isEvent;
    this.spanRow.style.display = isEvent ? "none" : "flex";
    this.startInput.required = !isEvent;
    this.endInput.required = !isEvent;
  }

  private showStatus(message: string, variant?: "success" | "error"): void {
    this.status.textContent = message;
    if (variant) {
      this.status.dataset.variant = variant;
    } else {
      delete this.status.dataset.variant;
    }
  }

  private toggleTag(tag: string): void {
    if (this.selectedTags.has(tag)) {
      this.selectedTags.delete(tag);
    } else {
      this.selectedTags.add(tag);
    }
    this.updateTagButtons();
  }

  private updateTagButtons(): void {
    for (const [tag, button] of this.tagButtons) {
      if (this.selectedTags.has(tag)) {
        button.classList.add("timeline-tag--selected");
      } else {
        button.classList.remove("timeline-tag--selected");
      }
    }
  }

  private resetForm(): void {
    this.form.reset();
    this.selectedTags.clear();
    this.updateTagButtons();
    this.updateVisibleFields();
    this.showStatus("");
    this.imageInput.value = "";
  }
}
