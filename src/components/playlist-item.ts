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
    @property() thumbnailUrl?: string;
    @property({ type: Boolean }) isPlaying = false;
    @property({ type: Boolean }) isDragging = false;
    @property({ type: Boolean }) isDragOver = false;
    @property({ type: Boolean }) showLineSeparator = false;
    @property({ type: String }) outlineColor = "var(--divider-color)";
    // @property({ type: Object }) config!: KodiPlaylistCardConfig;

    @property({ type: Boolean }) showThumbnailBorder = false;
    @property({ type: Boolean }) showThumbnailImage = false;
    @property({ type: Boolean }) showThumbnailOverlay = false;

    // @property() cachedThumbnail?: string;

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
    
    .track-title {
        color: var(--secondary-text-color);
        font-weight: 500;
        font-size: 0.95rem;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .track-genre {
        font-style: italic;
        margin-top: 2px;
        font-size: 0.8rem;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .track-subtext {
        color: var(--secondary-text-color);
        font-size: 0.8rem;
        margin-top: 2px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .track-duration {
        color: var(--secondary-text-color);
        font-size: 0.8rem;
        font-family: monospace;
        margin-left: 12px;
        flex-shrink: 0;
    }
          
   
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
        .remove-button:active {
                transform: scale(0.95);
            }

            .remove-button ha-icon {
                --icon-size: 20px;
            }
  `;

    protected render() {
        const icon = getItemIcon(this.item);
        const title = this.item.title || "";
        const genre = this.item.genre ? formatGenre(this.item.genre): "";
        const subtext = buildMetadataString(this.item);

        const classes = [
            "playlist-item",
            this.isPlaying ? "active" : "",
            this.isDragging ? "dragging" : "",
            this.isDragOver ? "drag-over" : "",
            this.showLineSeparator ? "with-separator" : "",
        ]
            .filter(Boolean)
            .join(" ");

        return html`
            <div class="${classes}" style="--outline-color: ${this.outlineColor || "var(--divider-color)"}">
                ${!this.isPlaying
                    ? html`<div class="drag-handle" title="Drag to reorder"><ha-icon icon="mdi:drag"></ha-icon></div>`
                    : ""}

                <kodi-thumbnail-button
                    .hass="${this.hass}"
                    .url="${this.thumbnailUrl}"
                    .icon="${icon}"
                    .isPlaying="${this.isPlaying}"
                    .showBorder="${this.showThumbnailBorder}"
                    .showImage="${this.showThumbnailImage}"
                    .showOverlay="${this.showThumbnailOverlay}"
                    .outlineColor="${this.outlineColor}"
                    @play="${this._dispatchPlay}">
                </kodi-thumbnail-button>

                <div class="track-info">
                    <div class="track-title">${title}</div>
                    <div class="track-genre">${genre}</div>
                    <div class="track-subtext">${subtext}</div>
                </div>

                ${this.item.duration
                    ? html`<span class="track-duration">${formatDuration(this.item.duration)}</span>`
                    : ""}

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
        this.dispatchEvent(
            new CustomEvent("play-item", { detail: { index: this.index }, bubbles: true, composed: true }),
        );
    }

    private _dispatchRemove() {
        this.dispatchEvent(
            new CustomEvent("remove-item", { detail: { index: this.index }, bubbles: true, composed: true }),
        );
    }
}

