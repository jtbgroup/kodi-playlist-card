import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";

/**
 * Bouton thumbnail simplifié - reçoit l'URL déjà résolue et cachée du ThumbnailService.
 * Responsabilité: affichage uniquement, pas de chargement.
 */
@customElement("kodi-thumbnail-button")
export class KodiThumbnailButton extends LitElement {
  @property() thumbnailUrl?: string;
  @property() icon = "mdi:music";
  @property({ type: Boolean }) isPlaying = false;
  @property({ type: Boolean }) showImage = true;
  @property({ type: Boolean }) showBorder = false;
  @property({ type: Boolean }) showOverlay = true;
  @property() outlineColor = "var(--divider-color)";

  static styles = css`
    :host {
      display: block;
    }

    .thumbnail-button {
      position: relative;
      width: 60px;
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

  protected render() {
    const buttonStyle = this.showBorder ? `--outline-color: ${this.outlineColor}` : "";

    return html`
      <div
        class="thumbnail-button ${this.isPlaying ? "disabled" : ""} ${this.showBorder ? "with-border" : ""}"
        style="${buttonStyle}"
        @click="${this._handleClick}"
        title="${this.isPlaying ? "Currently playing" : "Play"}">

        ${this.showImage && this.thumbnailUrl
          ? html`<img class="track-thumb" src="${this.thumbnailUrl}" alt="Thumbnail" />`
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