import { LitElement, html, css, PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { HomeAssistant } from "custom-card-helpers";

@customElement("kodi-thumbnail-button")
export class KodiThumbnailButton extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistant;
  @property() url?: string;
  @property() icon = "mdi:music";
  @property({ type: Boolean }) isPlaying = false;
  @property({ type: Boolean }) showImage = true;
  @property({ type: Boolean }) showBorder = false;
  @property({ type: Boolean }) showOverlay = true;
  @property() outlineColor = "var(--divider-color)";

  @state() private _cachedUrl?: string;

  static styles = css`

    :host {
      display: block;
    }

    .thumbnail-button {
      position: relative;
      width:60px;
      height: 60px;
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

protected updated(changedProperties: PropertyValues) {
    if ((changedProperties.has("url") || changedProperties.has("hass")) && this.url && this.hass) {
      this._loadThumbnail();
    }
  }

  private async _loadThumbnail(): Promise<void> {
    if (!this.url || !this.hass) {
      this._cachedUrl = undefined;
      return;
    }

    if (this.url.startsWith("http")) {
      this._cachedUrl = this.url;
      return;
    }

    if (this.url.startsWith("/")) {
      try {
        const response = await this.hass.fetchWithAuth(this.url);
        
        if (!response.ok) {
          return;
        }

        const blob = await response.blob();
        
        this._cachedUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
             resolve(reader.result as string);
          };
          reader.onerror = (e) => {
             reject(e);
          };
          reader.readAsDataURL(blob);
        });
      } catch (err) {
        console.error(`[Thumbnail Debug] Exception raised during fetch :`, err);
      }
    }
  }

  protected render() {
    const buttonStyle = this.showBorder ? `--outline-color: ${this.outlineColor}` : "";

    return html`
      <div
        class="thumbnail-button ${this.isPlaying ? "disabled" : ""} ${this.showBorder ? "with-border" : ""}"
        style="${buttonStyle}"
        @click="${this._handleClick}"
        title="${this.isPlaying ? "Currently playing" : "Play"}">
        
        ${this.showImage && this._cachedUrl
          ? html`<img class="track-thumb" src="${this._cachedUrl}" alt="Art" />`
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