import { renderMarkdown } from "../../utils/markdown";
import { AVAILABLE_TAGS, timelineStore } from "./timelineData";
import type { TimelineEntryData } from "./timelineData";

export class TimelineDetailsPanel {
  private readonly container: HTMLDivElement;
  private readonly form: HTMLFormElement;
  private readonly previewView: HTMLDivElement;
  private readonly previewTitle: HTMLHeadingElement;
  private readonly previewMeta: HTMLParagraphElement;
  private readonly previewDescription: HTMLDivElement;
  private readonly previewTags: HTMLDivElement;
  private readonly previewEditButton: HTMLButtonElement;
  private readonly backToPreviewButton: HTMLButtonElement;
  private readonly titleInput: HTMLInputElement;
  private readonly descriptionInput: HTMLTextAreaElement;
  private readonly descriptionPreview: HTMLDivElement;
  private readonly dateInput: HTMLInputElement;
  private readonly startInput: HTMLInputElement;
  private readonly endInput: HTMLInputElement;
  private readonly imageInput: HTMLInputElement;
  private readonly previewImage: HTMLImageElement;
  private readonly tagWrapper: HTMLDivElement;
  private readonly tagButtons = new Map<string, HTMLButtonElement>();
  private readonly tagHandlers = new Map<string, () => void>();
  private readonly selectedTags = new Set<string>();
  private readonly status: HTMLParagraphElement;
  private readonly typeLabel: HTMLSpanElement;
  private readonly eventDateField: HTMLDivElement;
  private readonly spanRow: HTMLDivElement;
  private readonly onImageInput = () => this.updatePreview();
  private readonly deleteButton: HTMLButtonElement;
  private currentEntry?: TimelineEntryData;
  private isEditing = false;
  private initialSnapshot = "";
  private readonly updateDescriptionPreview = (): void => {
    const value = this.descriptionInput.value;
    if (!value.trim()) {
      this.descriptionPreview.dataset.empty = "true";
      this.descriptionPreview.textContent =
        "Noch keine Beschreibung. Markdown ist erlaubt.";
      return;
    }
    this.descriptionPreview.dataset.empty = "false";
    this.descriptionPreview.innerHTML = renderMarkdown(value);
  };

  constructor() {
    this.container = document.createElement("div");
    this.container.className = "timeline-details timeline-details--hidden";

    const header = document.createElement("div");
    header.className = "timeline-details__header";
    this.typeLabel = document.createElement("span");
    header.appendChild(this.typeLabel);
    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.textContent = "Schließen";
    closeButton.className = "timeline-details__close";
    closeButton.addEventListener("click", () => this.close());
    header.appendChild(closeButton);
    this.container.appendChild(header);

    this.previewImage = document.createElement("img");
    this.previewImage.className = "timeline-details__image";
    this.container.appendChild(this.previewImage);

    this.previewView = document.createElement("div");
    this.previewView.className = "timeline-details__preview-view";
    this.previewTitle = document.createElement("h2");
    this.previewTitle.className = "timeline-details__preview-title";
    this.previewMeta = document.createElement("p");
    this.previewMeta.className = "timeline-details__preview-meta";
    this.previewDescription = document.createElement("div");
    this.previewDescription.className = "timeline-details__preview-body";
    this.previewTags = document.createElement("div");
    this.previewTags.className = "timeline-details__preview-tags";
    this.previewEditButton = document.createElement("button");
    this.previewEditButton.type = "button";
    this.previewEditButton.textContent = "Bearbeiten";
    this.previewEditButton.className = "timeline-details__edit-button";
    this.previewEditButton.addEventListener("click", this.enterEditMode);
    this.previewView.appendChild(this.previewTitle);
    this.previewView.appendChild(this.previewMeta);
    this.previewView.appendChild(this.previewDescription);
    this.previewView.appendChild(this.previewTags);
    this.previewView.appendChild(this.previewEditButton);
    this.container.appendChild(this.previewView);

    this.form = document.createElement("form");
    this.form.className = "timeline-details__form";
    this.container.appendChild(this.form);

    this.titleInput = document.createElement("input");
    this.titleInput.type = "text";
    this.form.appendChild(
      this.createField("Titel", this.titleInput, "timeline-details__field"),
    );

    this.backToPreviewButton = document.createElement("button");
    this.backToPreviewButton.type = "button";
    this.backToPreviewButton.textContent = "Zurück zur Vorschau";
    this.backToPreviewButton.className = "timeline-details__back-button";
    this.backToPreviewButton.addEventListener(
      "click",
      this.handleBackToPreview,
    );
    this.form.insertBefore(this.backToPreviewButton, this.form.firstChild);

    this.descriptionInput = document.createElement("textarea");
    this.descriptionInput.rows = 5;
    this.descriptionInput.placeholder = "Markdown erlaubt";
    const descriptionField = this.createField(
      "Beschreibung",
      this.descriptionInput,
      "timeline-details__field",
    );
    this.descriptionPreview = document.createElement("div");
    this.descriptionPreview.className =
      "timeline-details__preview timeline-details__preview--compact";
    this.descriptionPreview.dataset.empty = "true";
    descriptionField.appendChild(this.descriptionPreview);
    this.form.appendChild(descriptionField);

    this.dateInput = document.createElement("input");
    this.dateInput.type = "date";
    this.eventDateField = this.createField(
      "Datum",
      this.dateInput,
      "timeline-details__field",
    );
    this.form.appendChild(this.eventDateField);

    const spanRow = document.createElement("div");
    spanRow.className = "timeline-details__row";
    this.spanRow = spanRow;
    this.startInput = document.createElement("input");
    this.startInput.type = "date";
    spanRow.appendChild(
      this.createField("Start", this.startInput, "timeline-details__field"),
    );
    this.endInput = document.createElement("input");
    this.endInput.type = "date";
    spanRow.appendChild(
      this.createField("Ende", this.endInput, "timeline-details__field"),
    );
    this.form.appendChild(spanRow);

    this.imageInput = document.createElement("input");
    this.imageInput.type = "url";
    this.imageInput.placeholder = "https://...";
    this.form.appendChild(
      this.createField("Bild URL", this.imageInput, "timeline-details__field"),
    );

    this.tagWrapper = document.createElement("div");
    this.tagWrapper.className = "timeline-details__taglist";
    const tagLabel = document.createElement("label");
    tagLabel.textContent = "Tags";
    tagLabel.className = "timeline-details__taglabel";
    this.form.appendChild(tagLabel);
    this.form.appendChild(this.tagWrapper);
    for (const tag of AVAILABLE_TAGS) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = tag;
      button.className = "timeline-tag";
      const handler = () => this.toggleTag(tag);
      button.addEventListener("click", handler);
      this.tagWrapper.appendChild(button);
      this.tagButtons.set(tag, button);
      this.tagHandlers.set(tag, handler);
    }

    const buttonRow = document.createElement("div");
    buttonRow.className = "timeline-details__actions";
    this.deleteButton = document.createElement("button");
    this.deleteButton.type = "button";
    this.deleteButton.textContent = "Löschen";
    this.deleteButton.className = "timeline-details__delete";
    this.deleteButton.addEventListener("click", this.handleDelete);
    buttonRow.appendChild(this.deleteButton);
    const saveButton = document.createElement("button");
    saveButton.type = "submit";
    saveButton.textContent = "Speichern";
    buttonRow.appendChild(saveButton);
    this.form.appendChild(buttonRow);

    this.status = document.createElement("p");
    this.status.className = "timeline-details__status";
    this.form.appendChild(this.status);

    document.body.appendChild(this.container);

    this.form.addEventListener("submit", this.handleSubmit);
    this.imageInput.addEventListener("input", this.onImageInput);
    this.descriptionInput.addEventListener(
      "input",
      this.updateDescriptionPreview,
    );
    this.updateDescriptionPreview();
    this.setEditingMode(false);
  }

  public open(entry: TimelineEntryData): void {
    if (this.currentEntry && !this.confirmDiscardChanges()) {
      return;
    }
    this.currentEntry = entry;
    this.container.classList.remove("timeline-details--hidden");
    this.typeLabel.textContent =
      entry.type === "event" ? "Ereignis" : "Zeitabschnitt";
    this.populateForm(entry);
    this.updatePreviewView(entry);
    this.status.textContent = "";
    this.setEditingMode(false);
    this.syncSnapshot();
  }

  public close(force = false): void {
    if (!force && !this.confirmDiscardChanges()) {
      return;
    }
    this.container.classList.add("timeline-details--hidden");
    this.currentEntry = undefined;
    this.status.textContent = "";
    this.setEditingMode(false);
  }

  public destroy(): void {
    this.form.removeEventListener("submit", this.handleSubmit);
    this.imageInput.removeEventListener("input", this.onImageInput);
    this.descriptionInput.removeEventListener(
      "input",
      this.updateDescriptionPreview,
    );
    this.previewEditButton.removeEventListener("click", this.enterEditMode);
    this.backToPreviewButton.removeEventListener(
      "click",
      this.handleBackToPreview,
    );
    this.deleteButton.removeEventListener("click", this.handleDelete);
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

  private handleSubmit = (event: SubmitEvent): void => {
    event.preventDefault();
    if (!this.currentEntry) return;
    try {
      if (this.currentEntry.type === "event") {
        if (!this.dateInput.value) {
          throw new Error("Bitte ein Datum eintragen.");
        }
        timelineStore.updateEntry(this.currentEntry.id, {
          title: this.titleInput.value,
          description: this.descriptionInput.value,
          date: this.dateInput.value,
          tags: Array.from(this.selectedTags),
          imageUrl: this.imageInput.value,
        });
      } else {
        if (!this.startInput.value || !this.endInput.value) {
          throw new Error("Start und Ende erforderlich.");
        }
        timelineStore.updateEntry(this.currentEntry.id, {
          title: this.titleInput.value,
          description: this.descriptionInput.value,
          startDate: this.startInput.value,
          endDate: this.endInput.value,
          tags: Array.from(this.selectedTags),
          imageUrl: this.imageInput.value,
        });
      }
      this.status.textContent = "Gespeichert.";
      this.status.dataset.variant = "success";
      this.reloadCurrentEntry();
      if (this.currentEntry) {
        this.populateForm(this.currentEntry);
        this.updatePreviewView(this.currentEntry);
      }
      this.syncSnapshot();
      this.setEditingMode(false);
    } catch (error) {
      this.status.textContent =
        error instanceof Error ? error.message : "Konnte nicht speichern.";
      this.status.dataset.variant = "error";
    }
  };

  private createField(
    label: string,
    input: HTMLElement,
    className: string,
  ): HTMLDivElement {
    const wrapper = document.createElement("div");
    wrapper.className = className;
    const title = document.createElement("label");
    title.textContent = label;
    wrapper.appendChild(title);
    wrapper.appendChild(input);
    return wrapper;
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

  private handleDelete = (): void => {
    if (!this.currentEntry) return;
    timelineStore.deleteEntry(this.currentEntry.id);
    this.close(true);
  };

  private updatePreview(): void {
    const url = this.imageInput.value.trim();
    this.previewImage.src = url
      ? url
      : "https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=600&q=80";
  }

  private populateForm(entry: TimelineEntryData): void {
    this.titleInput.value = entry.title;
    this.descriptionInput.value = entry.description;
    this.updateDescriptionPreview();
    if (entry.type === "event") {
      this.dateInput.value = entry.date;
      this.eventDateField.classList.remove("timeline-details__hidden");
      this.spanRow.classList.add("timeline-details__hidden");
      this.startInput.value = "";
      this.endInput.value = "";
    } else {
      this.startInput.value = entry.startDate;
      this.endInput.value = entry.endDate;
      this.spanRow.classList.remove("timeline-details__hidden");
      this.dateInput.value = "";
      this.eventDateField.classList.add("timeline-details__hidden");
    }
    this.imageInput.value = entry.imageUrl ?? "";
    this.updatePreview();
    this.selectedTags.clear();
    for (const tag of entry.tags) {
      this.selectedTags.add(tag);
    }
    this.updateTagButtons();
  }

  private updatePreviewView(entry: TimelineEntryData): void {
    this.previewTitle.textContent = entry.title || "Ohne Titel";
    this.previewMeta.textContent = this.formatPreviewMeta(entry);
    if (entry.description.trim()) {
      this.previewDescription.dataset.empty = "false";
      this.previewDescription.innerHTML = renderMarkdown(entry.description);
    } else {
      this.previewDescription.dataset.empty = "true";
      this.previewDescription.textContent = "Keine Beschreibung vorhanden.";
    }
    this.previewTags.innerHTML = "";
    if (entry.tags.length === 0) {
      const emptyTag = document.createElement("span");
      emptyTag.className =
        "timeline-details__preview-tag timeline-details__preview-tag--empty";
      emptyTag.textContent = "Keine Tags";
      this.previewTags.appendChild(emptyTag);
    } else {
      for (const tag of entry.tags) {
        const chip = document.createElement("span");
        chip.className = "timeline-details__preview-tag";
        chip.textContent = tag;
        this.previewTags.appendChild(chip);
      }
    }
  }

  private formatPreviewMeta(entry: TimelineEntryData): string {
    if (entry.type === "event") {
      const date = new Date(entry.date);
      return new Intl.DateTimeFormat("de-DE", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }).format(date);
    }
    const start = new Date(entry.startDate);
    const end = new Date(entry.endDate);
    const formatter = new Intl.DateTimeFormat("de-DE", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    return `${formatter.format(start)} – ${formatter.format(end)}`;
  }

  private enterEditMode = (): void => {
    if (!this.currentEntry) return;
    this.setEditingMode(true);
    this.titleInput.focus();
  };

  private handleBackToPreview = (): void => {
    this.exitEditMode();
  };

  private setEditingMode(editing: boolean): void {
    this.isEditing = editing;
    this.previewView.hidden = editing;
    this.form.hidden = !editing;
  }

  private exitEditMode(): void {
    if (!this.isEditing) return;
    if (this.hasUnsavedChanges()) {
      const shouldDiscard = window.confirm(
        "Ungespeicherte Änderungen verwerfen?",
      );
      if (!shouldDiscard) {
        return;
      }
      if (this.currentEntry) {
        this.populateForm(this.currentEntry);
        this.syncSnapshot();
      }
    }
    this.setEditingMode(false);
  }

  private reloadCurrentEntry(): void {
    if (!this.currentEntry) return;
    const latest = timelineStore
      .getEntries()
      .find((entry) => entry.id === this.currentEntry?.id);
    if (latest) {
      this.currentEntry = latest;
    }
  }

  private getFormSnapshot(): string {
    const payload = {
      title: this.titleInput.value.trim(),
      description: this.descriptionInput.value,
      date: this.dateInput.value,
      start: this.startInput.value,
      end: this.endInput.value,
      image: this.imageInput.value.trim(),
      tags: Array.from(this.selectedTags).sort(),
      type: this.currentEntry?.type ?? "",
    };
    return JSON.stringify(payload);
  }

  private syncSnapshot(): void {
    this.initialSnapshot = this.getFormSnapshot();
  }

  private hasUnsavedChanges(): boolean {
    if (!this.currentEntry) {
      return false;
    }
    return this.initialSnapshot !== this.getFormSnapshot();
  }

  private confirmDiscardChanges(): boolean {
    if (!this.hasUnsavedChanges()) {
      return true;
    }
    return window.confirm(
      "Es gibt ungespeicherte Änderungen. Trotzdem fortfahren?",
    );
  }
}
