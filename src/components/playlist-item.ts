import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";
import { PlaylistItem as PlaylistItemType, KodiPlaylistCardConfig } from "../types";
import { buildMetadataString, formatDuration, formatGenre, getItemIcon } from "../utils";
import "./thumbnail-button";
import { HomeAssistant } from "custom-card-helpers";

@customElement("kodi-playlist-item")
export class KodiPlaylistItem extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistant; 
  @property({ type: Object }) item!: PlaylistItemType;
  @property({ type: Number }) index!: number;
  @property({ type: Boolean }) isPlaying = false;
  @property({ type: Boolean }) isDragging = false;
  @property({ type: Boolean }) isDragOver = false;
  @property({ type: Object }) config!: KodiPlaylistCardConfig;
  @property() cachedThumbnail?: string;

  static styles = css`
    :host { display: block; }
    .playlist-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 16px;
      border-bottom: 1px solid transparent;
      transition: all 0.2s ease;
      user-select: none;
    }
    .playlist-item:hover { background: var(--secondary-background-color); }
    .playlist-item.active {
      background: rgba(3, 169, 244, 0.1);
      border-left: 4px solid var(--accent-color);
      padding-left: 12px;
    }
    .playlist-item.dragging {
      opacity: 0.5;
      background: var(--secondary-background-color);
      border-left: 4px solid var(--warning-color);
      padding-left: calc(12px - 4px);
    }
    .playlist-item.drag-over {
      background: rgba(3, 169, 244, 0.15);
      border-top: 2px solid var(--primary-color);
      padding-top: calc(8px - 2px);
      margin-top: 2px;
    }
    .drag-handle {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 12px;
      height: 32px;
      cursor: grab;
      color: var(--secondary-text-color);
      opacity: 0;
      transition: opacity 0.2s;
      flex-shrink: 0;
    }
    .drag-handle:active { cursor: grabbing; }
    .playlist-item:not(.active):hover .drag-handle { opacity: 1; }
    .playlist-item.active .drag-handle { display: none; }
    .playlist-item.with-separator { border-bottom: 1px solid var(--outline-color); }
    .track-info { display: flex; flex-direction: column; flex-grow: 1; min-width: 0; }
    .track-title { font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .track-meta, .track-genre, .track-duration { font-size: 0.8rem; color: var(--secondary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .track-genre { font-style: italic; margin-top: 2px; }
    .track-duration { flex-shrink: 0; font-size: 0.85rem; }
    .item-action { display: flex; align-items: center; justify-content: center; width: 40px; margin-left: auto; }
    .playing-marker { color: var(--accent-color); animation: pulse-marker 1.5s infinite; }
    .remove-button {
      cursor: pointer; background: transparent; border: none; padding: 8px;
      display: flex; align-items: center; justify-content: center;
      color: var(--secondary-text-color); opacity: 0.5; border-radius: 4px; transition: all 0.2s;
    }
    .remove-button:hover { color: var(--error-color); background: rgba(255, 0, 0, 0.1); transform: scale(1.1); }
    @keyframes pulse-marker {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.1); opacity: 0.8; }
    }
  `;

  protected render() {
    const metadata = buildMetadataString(this.item);
    const icon = getItemIcon(this.item);
    const genre = formatGenre(this.item.genre);

    const classes = [
      "playlist-item",
      this.isPlaying ? "active" : "",
      this.isDragging ? "dragging" : "",
      this.isDragOver ? "drag-over" : "",
      this.config.show_line_separator ? "with-separator" : "",
    ].filter(Boolean).join(" ");

    return html`
      <div 
        class="${classes}"
        style="--outline-color: ${this.config.outline_color || "var(--divider-color)"}">
        
        ${!this.isPlaying
          ? html`<div class="drag-handle" title="Drag to reorder"><ha-icon icon="mdi:drag"></ha-icon></div>`
          : ""}

        <kodi-thumbnail-button
          .url="${this.config.show_thumbnail ? this.cachedThumbnail : undefined}"
          .icon="${icon}"
          .isPlaying="${this.isPlaying}"
          .showBorder="${this.config.show_thumbnail_border ?? false}"
          .showOverlay="${this.config.show_thumbnail_overlay ?? true}"
          .outlineColor="${this.config.outline_color || "var(--divider-color)"}"
          @play="${this._dispatchPlay}">
        </kodi-thumbnail-button>

        <div class="track-info">
          <span class="track-title">${this.item.title || "Unknown"}</span>
          ${genre ? html`<span class="track-genre">${genre}</span>` : ""}
          ${metadata ? html`<span class="track-meta">${metadata}</span>` : ""}
        </div>

        ${this.item.duration ? html`<span class="track-duration">${formatDuration(this.item.duration)}</span>` : ""}

        <div class="item-action">
          ${this.isPlaying
            ? html`<ha-icon icon="mdi:volume-high" class="playing-marker"></ha-icon>`
            : html`
                <div class="remove-button" @click="${this._dispatchRemove}" title="Remove">
                  <ha-icon icon="mdi:trash-can"></ha-icon>
                </div>
              `}
        </div>
      </div>
    `;
  }

  private _dispatchPlay() {
    this.dispatchEvent(new CustomEvent("play-item", { detail: { index: this.index }, bubbles: true, composed: true }));
  }

  private _dispatchRemove() {
    this.dispatchEvent(new CustomEvent("remove-item", { detail: { index: this.index }, bubbles: true, composed: true }));
  }
}