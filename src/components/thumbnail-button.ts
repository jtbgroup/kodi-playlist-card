import { LitElement, html, css, PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { ThumbnailService } from "../services/thumbnail.service";
import { PlaylistItem } from "../types";

/**
 * Bouton thumbnail intelligent - prend en charge son propre chargement d'image
 * via le ThumbnailService sans provoquer de re-rendu global du parent.
 */
@customElement("kodi-thumbnail-button")
export class KodiThumbnailButton extends LitElement {
  @property({ type: Object }) item?: PlaylistItem;
  @property({ type: Object }) thumbnailService?: ThumbnailService;

  @property() icon = "mdi:music";
  @property({ type: Boolean }) isPlaying = false;
  @property({ type: Boolean }) showImage = true;
  @property({ type: Boolean }) showBorder = false;
  @property({ type: Boolean }) showOverlay = true;
  @property() outlineColor = "var(--divider-color)";

  // États locaux isolés
  @state() private _thumbnailUrl?: string;
  @state() private _isLoaded = false;

  static styles = css`
    :host {
      display: block;
    }

    .thumbnail-button {
      position: relative;
      /* 💡 Les dimensions et le ratio sont injectés dynamiquement via l'attribut style */
      flex-shrink: 0;
      cursor: pointer;
      border-radius: 4px;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--secondary-background-color);
    }

    .thumbnail-button.disabled {
      cursor: not-allowed;
      opacity: 0.6;
    }

    .thumbnail-button.with-border {
      border: 1px solid var(--outline-color);
    }

    .track-thumb {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 4px;
    }

    .thumb-placeholder {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--secondary-background-color);
      border-radius: 4px;
    }

    .play-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.4);
      opacity: 0;
      transition: opacity 0.2s ease-in-out;
      border-radius: 4px;
    }

    .play-overlay ha-icon {
      --icon-size: 24px;
      color: white;
    }

    .thumbnail-button:not(.disabled):hover .play-overlay {
      opacity: 1;
    }
  `;

  protected willUpdate(changedProperties: PropertyValues) {
    super.willUpdate(changedProperties);
    
    if (
      changedProperties.has("item") || 
      changedProperties.has("thumbnailService") || 
      changedProperties.has("showImage")
    ) {
      this._loadImage();
    }
  }

  private async _loadImage() {
    this._thumbnailUrl = undefined;
    this._isLoaded = false;

    if (!this.showImage || !this.item || !this.thumbnailService) return;

    const url = this.thumbnailService.getThumbnailUrl(this.item);
    if (!url) return;

    const cachedUrl = this.thumbnailService.getFromCache(url);
    if (cachedUrl) {
      this._thumbnailUrl = cachedUrl;
      this._isLoaded = true;
      return;
    }

    const loadedUrl = await this.thumbnailService.load(url);
    if (loadedUrl) {
      this._thumbnailUrl = loadedUrl;
      this._isLoaded = true;
    }
  }

  private _getDimensionStyles(): string {
    if (!this.item || !this.item.type) {
      return "width: 60px; height: 60px; aspect-ratio: 1 / 1;";
    }

    switch (this.item.type) {
      case "movie":
        return "width: 60px; height: 90px; aspect-ratio: 2 / 3;";
      case "episode":
      case "musicvideo":
        return "width: 106px; height: 60px; aspect-ratio: 16 / 9;";
      default:
        return "width: 60px; height: 60px; aspect-ratio: 1 / 1;";
    }
  }

  protected render() {
    let buttonStyle = this._getDimensionStyles();
    
    if (this.showBorder) {
      buttonStyle += ` --outline-color: ${this.outlineColor};`;
    }

    return html`
      <div
        class="thumbnail-button ${this.isPlaying ? "disabled" : ""} ${this.showBorder ? "with-border" : ""}"
        style="${buttonStyle}"
        @click="${this._handleClick}"
        title="${this.isPlaying ? "Currently playing" : "Play"}">

        ${this._isLoaded && this._thumbnailUrl
          ? html`<img class="track-thumb" src="${this._thumbnailUrl}" alt="Thumbnail" />`
          : html`<div class="thumb-placeholder"><ha-icon icon="${this.icon}"></ha-icon></div>`}

        ${!this.isPlaying && this.showOverlay
          ? html`<div class="play-overlay"><ha-icon icon="mdi:play-circle"></ha-icon></div>`
          : ""}
      </div>
    `;
  }

  private _handleClick() {
    if (this.isPlaying) return;
    this.dispatchEvent(new CustomEvent("play", { bubbles: true, composed: true }));
  }
}