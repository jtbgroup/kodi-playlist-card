import { LitElement, html, css, CSSResultGroup } from "lit";
import { customElement, property } from "lit/decorators.js";
import { PlaylistItem as PlaylistItemType, KodiPlaylistCardConfig } from "../types";
import { buildMetadataString, formatDuration, formatGenre, getItemIcon } from "../utils/formatters";
import "./thumbnail-button";
import { HomeAssistant } from "custom-card-helpers";
import { ThumbnailService } from "../services";
import { playlistItemCSS } from "../styles/playlist-item.style";

@customElement("kodi-playlist-item")
export class KodiPlaylistItem extends LitElement {
    @property({ attribute: false }) hass?: HomeAssistant;
    @property({ type: Object }) item!: PlaylistItemType;
    @property({ type: Number }) index!: number;
    @property() cachedThumbnailUrl?: string;
    @property({ type: Boolean }) isPlaying = false;
    @property({ type: Boolean }) isDragging = false;
    @property({ type: Boolean }) isDragOver = false;
    @property({ type: Boolean }) showLineSeparator = false;
    @property({ type: String }) outlineColor = "var(--divider-color)";

    @property({ type: Boolean }) showThumbnailBorder = false;
    @property({ type: Boolean }) showThumbnailImage = false;
    @property({ type: Boolean }) showThumbnailOverlay = false;
    @property({ type: Object }) thumbnailService?: ThumbnailService;

    static get styles(): CSSResultGroup {
        return [playlistItemCSS];
    }

    protected render() {
        const icon = getItemIcon(this.item);
        const title = this.item.title || "";
        const genre = this.item.genre ? formatGenre(this.item.genre) : "";
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
                    .item="${this.item}"
                    .thumbnailService="${this.thumbnailService}"
                    .icon="${getItemIcon(this.item)}"
                    .isPlaying="${this.isPlaying}"
                    .showImage="${this.showThumbnailImage}"
                    .showBorder="${this.showThumbnailBorder}"
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

